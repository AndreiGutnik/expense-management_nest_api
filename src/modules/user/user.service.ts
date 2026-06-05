import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const user = await this.userRepository.save({
      email: createUserDto.email,
      password: await argon2.hash(createUserDto.password),
      verificationLink,
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
    return { user }
  }

  async findAll() {
    return await this.userRepository.find()
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    })
  }

  async update(id: number, updateUserDto: Partial<CreateUserDto>) {
    const user = await this.findUserById(id)

    const updatedUser = {
      ...user,
      email: updateUserDto.email ?? user.email,
      password: updateUserDto.password
        ? await argon2.hash(updateUserDto.password)
        : user.password,
    }
    return await this.userRepository.save(updatedUser)
  }

  async verifyMail(verificationLink: string) {
    const user = await this.userRepository.findOne({
      where: {
        verificationLink,
      },
    })
    if (!user) {
      throw new ConflictException('Verification link is not correct')
    }
    await this.userRepository.update(user.id, {
      verify: true,
      verificationLink: '',
    })
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
