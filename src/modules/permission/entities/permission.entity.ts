import { Role } from '@/modules/role/entities/role.entity'
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  resource: string

  @Column()
  action: string

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
