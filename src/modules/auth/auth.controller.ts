import {
  Controller,
  Post,
  UseGuards,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common'
import { AuthService } from '@/modules/auth/auth.service'
import { LocalAuthGuard } from '@/modules/auth/guards/local-auth.guard'
import { Response, Request } from 'express'
import { TokenService } from '../token/token.service'
import { IJwtPayload } from '../user/types/types'
import { JwtRefreshGuard } from './guards/jwt-refresh.guard'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userPayload = req.user as IJwtPayload
    const { user, accessToken, refreshToken } =
      await this.authService.login(userPayload)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      // secure: true, // для production через HTTPS
    })

    return {
      user,
      accessToken: accessToken,
    }
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, cookies } = req
    const refreshToken = cookies?.refreshToken
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is missing')
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await this.tokenService.refreshTokens(user as IJwtPayload, refreshToken)
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      // secure: true, // включить для HTTPS
    })
    return {
      user,
      accessToken,
    }
  }
}
