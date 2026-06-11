import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common'
import { CreateUserDto } from '@/modules/user/dto/create-user.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '@/modules/user/entities/user.entity'
import { Repository } from 'typeorm'
import * as argon2 from 'argon2'
import { TokenService } from '../token/token.service'
import { generateKey } from '@/utils/generateKey'
import { MailService } from '../mail/mail.service'
import { ConfigService } from '@nestjs/config'
import { Role } from '../role/entities/role.entity'
import { ChangePasswordDto } from './dto/change-password.dto'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existUser = await this.userRepository.findOne({
      where: {
        email: createUserDto.email,
      },
    })
    if (existUser) {
      throw new BadRequestException('User with this email already exists')
    }
    const verificationLink = generateKey()
    const defaultRole = await this.roleRepository.findOneBy({ name: 'user' })
    if (!defaultRole) {
      throw new InternalServerErrorException('Default user role not configured')
    }
    const user = await this.userRepository.save({
      email: createUserDto.email,
      password: await argon2.hash(createUserDto.password),
      verificationLink,
      role: defaultRole,
    })

    await this.mailService.sendVerifyMail(
      user.email,
      `${this.configService.get<string>('API_URL')}/api/user/verify/${verificationLink}`,
    )

    // const { accessToken, refreshToken } =
    //   await this.tokenService.generateTokenPair({
    //     id: user.id,
    //     email: user.email,
    //   })

    // return {
    //   user,
    //   accessToken,
    //   refreshToken,
    // }
    return user
  }

  async findAll() {
    return await this.userRepository.find()
  }

  async changeUserRole(
    currentUserId: number,
    newUserId: number,
    roleId: number,
  ) {
    if (currentUserId === newUserId) {
      throw new BadRequestException('You cannot change your own role')
    }
    const currentUser = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: { role: true },
    })
    const newUser = await this.userRepository.findOne({
      where: { id: newUserId },
      relations: { role: true },
    })
    const role = await this.roleRepository.findOneBy({ id: roleId })

    if (!currentUser || !newUser || !role) {
      throw new BadRequestException('Current user, New user, or role not found')
    }

    if (!currentUser.role) {
      throw new BadRequestException('Current user has no role assigned')
    }

    const currentRoleId = currentUser.role.id
    const newUserRoleId = newUser.role?.id ?? 0

    if (currentRoleId !== 1 && currentRoleId !== 2) {
      throw new BadRequestException(
        'Only admin or super-admin can change roles',
      )
    }

    if (currentRoleId === 2) {
      if (newUserRoleId <= 2) {
        throw new BadRequestException('You cannot change role')
      }

      if (roleId <= 2) {
        throw new BadRequestException('Admin cannot assign this role')
      }
    }

    if (currentUserId === newUserId && currentRoleId === 2 && roleId <= 2) {
      throw new BadRequestException('Admin cannot assign newrole to self')
    }

    newUser.role = role
    return this.userRepository.save(newUser)
  }

  async findOneByEmail(email: string) {
    return this.userRepository.findOne({
      where: {
        email,
      },
      relations: {
        role: {
          permissions: true,
        },
      },
      order: {
        role: {
          permissions: {
            resource: 'ASC',
            action: 'ASC',
          },
        },
      },
    })
  }

  async changeEmail(userId: number, newEmail: string) {
    const existEmail = await this.userRepository.findOne({
      where: [{ email: newEmail }, { pendingEmail: newEmail }],
    })
    if (existEmail) {
      throw new BadRequestException('User with this email already exists')
    }
    const verificationLink = generateKey()
    await this.userRepository.update(userId, {
      pendingEmail: newEmail,
      verificationLink,
    })

    await this.mailService.sendVerifyMail(
      newEmail,
      `${this.configService.get<string>('API_URL')}/api/user/verify/${verificationLink}`,
    )
    return await this.findUserById(userId)
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.findUserById(userId)
    const isPasswordValid = await argon2.verify(
      user.password,
      dto.currentPassword,
    )
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect')
    }
    user.password = await argon2.hash(dto.newPassword)
    await this.userRepository.save(user)
    return { message: 'Password changed successfully' }
  }

  // async update(id: number, updateUserDto: Partial<CreateUserDto>) {
  //   const user = await this.findUserById(id)

  //   const updatedUser = {
  //     ...user,
  //     email: updateUserDto.email ?? user.email,
  //     password: updateUserDto.password
  //       ? await argon2.hash(updateUserDto.password)
  //       : user.password,
  //   }
  //   return await this.userRepository.save(updatedUser)
  // }

  async verifyMail(verificationLink: string) {
    const user = await this.userRepository.findOne({
      where: {
        verificationLink,
      },
    })
    if (!user) {
      throw new ConflictException('Verification link is not correct')
    }
    const updateData: Partial<User> = {
      verify: true,
      verificationLink: '',
    }

    if (user.pendingEmail) {
      updateData.email = user.pendingEmail
      updateData.pendingEmail = null
    }

    await this.userRepository.update(user.id, updateData)
  }

  async remove(id: number) {
    const user = await this.findUserById(id)
    await this.tokenService.removeRefreshToken(user.id)
    await this.userRepository.delete(id)
    return user
  }

  private async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user
  }
}
