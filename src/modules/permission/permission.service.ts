import { BadRequestException, Injectable } from '@nestjs/common'
import { CreatePermissionDto } from './dto/create-permission.dto'
import { UpdatePermissionDto } from './dto/update-permission.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Permission } from './entities/permission.entity'
import { Not, Repository } from 'typeorm'

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const { action, resource } = createPermissionDto
    const isExist = await this.permissionRepository.findOne({
      where: {
        resource,
        action,
      },
    })
    if (isExist) {
      throw new BadRequestException('Permission already exists')
    }
    const newPermission =
      await this.permissionRepository.create(createPermissionDto)
    return this.permissionRepository.save(newPermission)
  }

  async findAll() {
    return await this.permissionRepository.find()
  }

  async findOne(id: number) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    })
    if (!permission) {
      throw new BadRequestException('Permission not found')
    }
    return permission
  }

  async update(id: number, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    })
    if (!permission) {
      throw new BadRequestException('Permission not found')
    }
    const updatedPermission = {
      ...permission,
      ...updatePermissionDto,
    }
    const { action, resource } = updatedPermission
    const isExist = await this.permissionRepository.findOne({
      where: {
        resource,
        action,
        id: Not(id),
      },
    })
    if (isExist) {
      throw new BadRequestException('Permission already exists')
    }
    return await this.permissionRepository.save(updatedPermission)
  }

  async remove(id: number) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    })
    if (!permission) {
      throw new BadRequestException('Permission not found')
    }
    return await this.permissionRepository.remove(permission)
  }
}
