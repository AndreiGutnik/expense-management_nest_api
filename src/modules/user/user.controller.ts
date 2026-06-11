import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
  Query,
  Req,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { JwtAccessGuard } from '@/modules/auth/guards/jwt-access.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { ConfigService } from '@nestjs/config'
import { Permissions } from '@/core/authorization/decorators/permissions.decorator'
import { PermissionsGuard } from '@/core/authorization/guards/permissions.guard'
import { ChangeUserRoleDto } from './dto/change-user-role.dto'
import { IJwtPayload } from './types/types'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ChangeEmailDto } from './dto/change-email.dto'

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
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
    const user = await this.userService.create(createUserDto)
    return user
  }

  @Get()
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:read')
  findAll() {
    return this.userService.findAll()
  }

  @Get('email')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:read')
  findOneByEmail(@Query('email') email: string) {
    return this.userService.findOneByEmail(email)
  }

  @Patch(':id/role')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:updateRole')
  changeUserRole(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeUserRoleDto,
  ) {
    return this.userService.changeUserRole(req.user.id, id, dto.roleId)
  }

  @Patch('email')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:updateEmail')
  changeEmail(
    @Req() req: Request & { user: IJwtPayload },
    @Body() dto: ChangeEmailDto,
  ) {
    return this.userService.changeEmail(req.user.id, dto.newEmail)
  }

  @Patch('password')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:updatePassword')
  changePassword(
    @Req() req: Request & { user: IJwtPayload },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req.user.id, dto)
  }

  // @Patch(':id')
  // @UseGuards(JwtAccessGuard, PermissionsGuard)
  // @Permissions('user:update')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.userService.update(+id, updateUserDto)
  // }

  @Get('/verify/:link')
  async verifyMail(@Param('link') link: string, @Res() res: Response) {
    await this.userService.verifyMail(link)
    res.redirect(this.configService.get<string>('CLIENT_URL'))
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('user:delete')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id)
  }
}
