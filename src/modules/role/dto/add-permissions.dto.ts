import { Type } from 'class-transformer'
import { ArrayNotEmpty, ArrayUnique, IsArray, IsInt } from 'class-validator'

export class AddPermissionsToRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  permissions: number[]
}
