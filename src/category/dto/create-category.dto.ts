import { User } from '@/user/entities/user.entity'
import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateCategoryDto {
  @IsNotEmpty()
  title: string

  @IsOptional()
  user?: User
}
