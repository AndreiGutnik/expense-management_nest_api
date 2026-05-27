import { Module } from '@nestjs/common'
import { TransactionService } from '@/modules/transaction/transaction.service'
import { TransactionController } from '@/modules/transaction/transaction.controller'
import { Transaction } from '@/modules/transaction/entities/transaction.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
