import { Category } from '@/modules/category/entities/category.entity'
import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator'

export class CreateTransactionDto {
  @IsNotEmpty()
  title: string

  @IsNotEmpty()
  @IsNumber()
  amount: number

  @IsString()
  @MinLength(6)
  type: 'income' | 'expense'

  @IsNotEmpty()
  category: Category
}
