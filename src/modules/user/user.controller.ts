import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common'
import { Response } from 'express'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { JwtAccessGuard } from '@/modules/auth/guards/jwt-access.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { ConfigService } from '@nestjs/config'

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @UsePipes(new ValidationPipe()) // middleware for validation
  async create(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // const { user, accessToken, refreshToken } =
    //   await this.userService.create(createUserDto)

    // res.cookie('refreshToken', refreshToken, {
    //   httpOnly: true,
    //   sameSite: 'strict',
    //   maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    //   // secure: true, // для production через HTTPS
    // })

    // return {
    //   user,
    //   accessToken: accessToken,
    // }
    const { user } = await this.userService.create(createUserDto)
    return { user }
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  findAll() {
    return this.userService.findAll()
  }

  @Get('email')
  @UseGuards(JwtAccessGuard)
  findOneByEmail(@Query('email') email: string) {
    return this.userService.findOneByEmail(email)
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto)
  }

  @Get('/verify/:link')
  async verifyMail(@Param('link') link: string, @Res() res: Response) {
    await this.userService.verifyMail(link)
    res.redirect(this.configService.get<string>('CLIENT_URL'))
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(+id)
  }
}
