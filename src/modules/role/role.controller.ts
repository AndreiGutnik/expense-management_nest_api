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
import { RoleService } from './role.service'
import { CreateRoleDto } from './dto/create-role.dto'
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard'
import { UpdateRoleDto } from './dto/update-role.dto'
import { AddPermissionsToRoleDto } from './dto/add-permissions.dto'
import { PermissionsGuard } from '@/core/authorization/guards/permissions.guard'
import { Permissions } from '@/core/authorization/decorators/permissions.decorator'

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto)
  }

  @Get()
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:read')
  findAll() {
    return this.roleService.findAll()
  }

  @Post(':id/permissions')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:update')
  addPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPermissionsDto: AddPermissionsToRoleDto,
  ) {
    return this.roleService.addPermissions(id, addPermissionsDto.permissions)
  }

  @Delete(':id/permissions/:permissionId')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:update')
  removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    return this.roleService.removePermission(id, permissionId)
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto)
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, PermissionsGuard)
  @Permissions('role:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id)
  }
}
