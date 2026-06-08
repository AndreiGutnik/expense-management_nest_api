import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { PermissionService } from './permission.service'
import { CreatePermissionDto } from './dto/create-permission.dto'
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard'
import { UpdatePermissionDto } from './dto/update-permission.dto'

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @UseGuards(JwtAccessGuard)
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.create(createPermissionDto)
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  findAll() {
    return this.permissionService.findAll()
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, updatePermissionDto)
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionService.remove(id)
  }
}
