import { User } from '@/modules/user/entities/user.entity'
import { IsNotEmpty, IsOptional } from 'class-validator'

export class CreateTokenDto {
  @IsNotEmpty()
  refreshToken: string

  @IsOptional()
  user?: User
}
