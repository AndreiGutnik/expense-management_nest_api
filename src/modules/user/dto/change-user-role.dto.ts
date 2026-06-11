import { IsInt, IsNotEmpty } from 'class-validator'

export class ChangeUserRoleDto {
  @IsNotEmpty()
  @IsInt()
  roleId: number
}
