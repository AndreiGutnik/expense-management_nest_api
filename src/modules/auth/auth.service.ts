import { UserService } from '@/modules/user/user.service'
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import * as argon2 from 'argon2'
import { TokenService } from '../token/token.service'
import { IJwtPayload } from '../user/types/types'

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findOneByEmail(email)
    if (!user) throw new BadRequestException('Invalid email or password')
    if (!user.verify) throw new UnauthorizedException('Email not verified')

    const passwordIsMatch = await argon2.verify(user.password, password)
    if (passwordIsMatch) {
      return user
    }
  }

  async login(user: IJwtPayload) {
    const { accessToken, refreshToken } =
      await this.tokenService.generateTokenPair(user)
    return {
      user,
      accessToken,
      refreshToken,
    }
  }
}
