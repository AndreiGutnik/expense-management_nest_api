import { CategoryService } from '@/modules/category/category.service'
import { TransactionService } from '@/modules/transaction/transaction.service'
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

@Injectable()
export class AuthorGuard implements CanActivate {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly categoryService: CategoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const { id, type } = request.params
    const user = request.user

    let entity

    switch (type) {
      case 'transaction':
        entity = await this.transactionService.findOne(id)
        break
      case 'category':
        entity = await this.categoryService.findOne(id)
        break
      default:
        throw new NotFoundException('Something went wrong ...')
    }

    if (entity && user && entity.userId === user.id) {
      return true
    }

    if (!entity) {
      throw new NotFoundException(`${type} not found`)
    }

    return false
  }
}
