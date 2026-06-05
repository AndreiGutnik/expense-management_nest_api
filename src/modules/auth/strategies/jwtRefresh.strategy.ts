import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { IJwtPayload } from '@/modules/user/types/types'
import { Request } from 'express'

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.refreshToken
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
    })
  }

  async validate(payload: IJwtPayload) {
    return {
      id: payload.id,
      email: payload.email,
    }
  }
}
