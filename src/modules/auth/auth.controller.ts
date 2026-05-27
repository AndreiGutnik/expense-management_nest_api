import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common'
import { AuthService } from '@/modules/auth/auth.service'
import { LocalAuthGuard } from '@/modules/auth/guards/local-auth.guard'
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(@Request() req) {
    return this.authService.login(req.user)
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user
  }
}
