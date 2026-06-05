import { Module } from '@nestjs/common'
import { AuthService } from '@/modules/auth/auth.service'
import { AuthController } from '@/modules/auth/auth.controller'
import { UserModule } from '@/modules/user/user.module'
import { PassportModule } from '@nestjs/passport'
import { LocalStrategy } from '@/modules/auth/strategies/local.strategy'
import { JwtAccessStrategy } from './strategies/jwtAccess.strategy'
import { JwtRefreshStrategy } from './strategies/jwtRefresh.strategy'
import { TokenModule } from '../token/token.module'

@Module({
  imports: [UserModule, PassportModule, TokenModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
  ],
})
export class AuthModule {}
