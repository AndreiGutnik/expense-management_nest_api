import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { DataSource } from 'typeorm'
import {
  OWNERSHIP_KEY,
  OwnershipMetadata,
} from '@/core/authorization/decorators/check-ownership.decorator'

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    const userId = request.user.id

    const ownership = this.reflector.getAllAndOverride<OwnershipMetadata>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!ownership) {
      return true
    }

    const repository = this.dataSource.getRepository(ownership.entity)

    const entityId = +request.params[ownership.param]

    const entity = await repository.findOne({
      where: {
        id: entityId,
      },
      relations: {
        [ownership.ownerField]: true,
      },
    })

    if (!entity) {
      throw new NotFoundException('Entity not found')
    }

    if (entity[ownership.ownerField].id !== userId) {
      throw new ForbiddenException('Access denied')
    }

    request.entity = entity

    return true
  }
}
