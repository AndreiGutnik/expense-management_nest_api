import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Category } from '@/modules/category/entities/category.entity'
import { Transaction } from '@/modules/transaction/entities/transaction.entity'
import { Exclude } from 'class-transformer'
import { Token } from '@/modules/token/entities/token.entity'

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

  @Exclude()
  @Column({ nullable: true })
  verificationLink: string

  @OneToMany(() => Category, category => category.user, { onDelete: 'CASCADE' })
  categories: Category[]

  @OneToMany(() => Transaction, transaction => transaction.user, {
    onDelete: 'CASCADE',
  })
  transactions: Transaction[]

  @OneToOne(() => Token, token => token.user, { onDelete: 'CASCADE' })
  refreshToken: Token

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
