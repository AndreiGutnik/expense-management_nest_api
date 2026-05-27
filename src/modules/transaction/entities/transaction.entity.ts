import { Category } from '@/modules/category/entities/category.entity'
import { User } from '@/modules/user/entities/user.entity'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Column } from 'typeorm/browser'

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn({ name: 'transaction_id' })
  id: number

  @Column()
  title: string

  @Column({ nullable: true })
  type: string

  @Column()
  amount: number

  @ManyToOne(() => User, user => user.transactions)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Category, category => category.transactions)
  @JoinColumn({ name: 'category_id' })
  category: Category

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
