import { Module } from '@nestjs/common'
import { RoleService } from './role.service'
import { Role } from './entities/role.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RoleController } from './role.controller'
import { Permission } from '../permission/entities/permission.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
