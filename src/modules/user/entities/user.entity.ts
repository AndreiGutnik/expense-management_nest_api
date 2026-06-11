import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Category } from '@/modules/category/entities/category.entity'
import { Transaction } from '@/modules/transaction/entities/transaction.entity'
import { Exclude } from 'class-transformer'
import { Token } from '@/modules/token/entities/token.entity'
import { Role } from '@/modules/role/entities/role.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  email: string

  @Exclude()
  @Column()
  password: string

  @Column({ default: false })
  verify: boolean

  @Column({ nullable: true })
  verificationLink: string

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role

  @OneToMany(() => Category, category => category.user, { onDelete: 'CASCADE' })
  categories: Category[]

  @OneToMany(() => Transaction, transaction => transaction.user, {
    onDelete: 'CASCADE',
  })
  transactions: Transaction[]

  @OneToOne(() => Token, token => token.user, { onDelete: 'CASCADE' })
  refreshToken: Token

  @Column({ nullable: true })
  pendingEmail: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
