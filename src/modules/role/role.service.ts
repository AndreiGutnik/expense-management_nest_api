import { BadRequestException, Injectable } from '@nestjs/common'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { Role } from './entities/role.entity'
import { In, QueryFailedError, Repository } from 'typeorm'
import { Permission } from '../permission/entities/permission.entity'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const permissions = await this.permissionRepository.findBy({
      id: In(createRoleDto.permissions),
    })

    if (permissions.length !== createRoleDto.permissions.length) {
      throw new BadRequestException('One or more permissions not found')
    }

    const newRole = this.roleRepository.create({
      ...createRoleDto,
      permissions,
    })

    try {
      return await this.roleRepository.save(newRole)
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        throw new BadRequestException('Role already exists')
      }

      throw error
    }
  }

  async findAll() {
    return await this.roleRepository.find()
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        permissions: true,
      },
      order: {
        permissions: {
          resource: 'ASC',
          action: 'ASC',
        },
      },
    })
    if (!role) {
      throw new BadRequestException('Role not found')
    }
    return role
  }

  async addPermissions(id: number, permissionIds: number[]) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        permissions: true,
      },
      order: {
        permissions: {
          resource: 'ASC',
          action: 'ASC',
        },
      },
    })

    if (!role) {
      throw new BadRequestException('Role not found')
    }

    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    })

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found')
    }

    const existingIds = new Set(
      role.permissions.map(permission => permission.id),
    )

    const permissionsToAdd = permissions.filter(
      permission => !existingIds.has(permission.id),
    )

    if (!permissionsToAdd.length) {
      throw new BadRequestException(
        'All permissions are already assigned to role',
      )
    }

    role.permissions.push(...permissionsToAdd)

    return this.roleRepository.save(role)
  }

  async removePermission(id: number, permissionId: number) {
    const role = await this.roleRepository.exists({
      where: { id },
    })

    if (!role) {
      throw new BadRequestException('Role not found')
    }

    await this.roleRepository
      .createQueryBuilder()
      .relation(Role, 'permissions')
      .of(id)
      .remove(permissionId)

    return { message: 'Permission removed successfully' }
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        permissions: true,
      },
      order: {
        permissions: {
          resource: 'ASC',
          action: 'ASC',
        },
      },
    })

    if (!role) {
      throw new BadRequestException('Role not found')
    }

    const updatedRole = {
      ...role,
      ...updateRoleDto,
    }

    if (updateRoleDto.permissions) {
      const permissions = await this.permissionRepository.findBy({
        id: In(updateRoleDto.permissions),
      })

      if (permissions.length !== updateRoleDto.permissions.length) {
        throw new BadRequestException('One or more permissions not found')
      }

      updatedRole.permissions = permissions
    }

    try {
      return await this.roleRepository.save(updatedRole as Role)
    } catch (error: any) {
      if (error.code === '23505') {
        throw new BadRequestException('Role already exists')
      }

      throw error
    }
  }

  async remove(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
    })
    if (!role) {
      throw new BadRequestException('Role not found')
    }
    return await this.roleRepository.remove(role)
  }
}
