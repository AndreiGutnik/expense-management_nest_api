import { IUser } from '@/types/types'
import { UserService } from '@/user/user.service'
import { BadRequestException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOne(email)
    if (user) {
      const passwordIsMatch = await argon2.verify(user.password, password)
      if (passwordIsMatch) {
        return user
      }
    }

    throw new BadRequestException('Invalid email or password')
  }

  async login(user: IUser) {
    const { id, email } = user
    return {
      id,
      email,
      access_token: this.jwtService.sign({ id, email }),
    }
  }
}
