import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common'
import { TransactionService } from '@/modules/transaction/transaction.service'
import { CreateTransactionDto } from '@/modules/transaction/dto/create-transaction.dto'
import { UpdateTransactionDto } from '@/modules/transaction/dto/update-transaction.dto'
import { JwtAccessGuard } from '@/modules/auth/guards/jwt-access.guard'
import { OwnershipGuard } from '@/core/authorization/guards/ownership.guard'
import { CheckOwnership } from '@/core/authorization/decorators/check-ownership.decorator'
import { Transaction } from '@/modules/transaction/entities/transaction.entity'

@Controller('transactions')
@CheckOwnership(Transaction)
// @CheckOwnership(Transaction, {
//   param: 'id',
//   ownerField: 'user',
// })
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAccessGuard)
  create(@Body() createTransactionDto: CreateTransactionDto, @Req() req) {
    return this.transactionService.create(createTransactionDto, +req.user.id)
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  findAll(@Req() req) {
    return this.transactionService.findAll(+req.user.id)
  }

  @Get(':type/find')
  @UseGuards(JwtAccessGuard)
  findAllByType(@Req() req, @Param('type') type: string) {
    return this.transactionService.findAllByType(+req.user.id, type)
  }

  @Get('pagination')
  @UseGuards(JwtAccessGuard)
  findAllWithPagination(
    @Req() req,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.transactionService.findAllWithPagination(
      +req.user.id,
      +page,
      +limit,
    )
  }

  @Get(':id')
  @UseGuards(JwtAccessGuard, OwnershipGuard)
  findOne(@Param('id') id: string) {
    return this.transactionService.findOne(+id)
  }

  @Patch(':id')
  @UseGuards(JwtAccessGuard, OwnershipGuard)
  update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(+id, updateTransactionDto)
  }

  @Delete(':id')
  @UseGuards(JwtAccessGuard, OwnershipGuard)
  remove(@Param('id') id: string) {
    return this.transactionService.remove(+id)
  }
}
