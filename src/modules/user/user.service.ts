import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateUserDto } from '@/modules/user/dto/create-user.dto'
// import { UpdateUserDto } from '@/modules/user/dto/update-user.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from '@/modules/user/entities/user.entity'
import { Repository } from 'typeorm'
import * as argon2 from 'argon2'
import { plainToInstance } from 'class-transformer'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
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
    const user = await this.userRepository.save({
      email: createUserDto.email,
      password: await argon2.hash(createUserDto.password),
    })

    const access_token = this.jwtService.sign({ email: createUserDto.email })

    return plainToInstance(User, { ...user, access_token })
  }

  async findAll() {
    return await this.userRepository.find()
  }

  async findOne(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
    })
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} user`
  // }
}
