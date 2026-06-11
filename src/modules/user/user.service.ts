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
import { instanceToPlain } from 'class-transformer'

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
    const newUser = await this.userRepository.save({
      email: createUserDto.email,
      password: await argon2.hash(createUserDto.password),
      verificationLink,
      role: defaultRole,
    })

    await this.mailService.sendVerifyMail(
      createUserDto.email,
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
    const user = await this.userRepository.findOne({
      where: { id: newUser.id },
      relations: {
        role: true,
      },
    })
    return user
  }

  async findAll() {
    return await this.userRepository.find()
  }

  async changeRole(currentUserId: number, newUserId: number, roleId: number) {
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

    if (user.pendingEmail) {
      await this.userRepository.update(user.id, {
        email: user.pendingEmail,
        pendingEmail: null,
        verificationLink: '',
        verify: true,
      })
      return { message: 'Email change verified successfully' }
    }

    const adminVerificationLink = generateKey()
    await this.userRepository.update(user.id, {
      verificationLink: adminVerificationLink,
      verify: false,
    })

    await this.mailService.sendAdminApprovalMail(
      this.configService.getOrThrow<string>('ADMIN_EMAIL'),
      user.email,
      `${this.configService.get<string>('API_URL')}/api/user/verify-admin/${adminVerificationLink}`,
    )
    return { message: 'Registration successful, pending admin approval' }
  }

  async verifyAdmin(adminVerificationLink: string) {
    const user = await this.userRepository.findOne({
      where: {
        verificationLink: adminVerificationLink,
      },
    })
    if (!user) {
      throw new ConflictException('Verification link is not correct')
    }
    await this.userRepository.update(user.id, {
      verificationLink: '',
      verify: true,
    })
    await this.mailService.sendRegistrationApprovedMail(user.email)

    return { message: 'Admin approval successful, you can now log in' }
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
