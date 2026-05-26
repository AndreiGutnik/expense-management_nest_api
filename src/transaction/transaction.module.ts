import { Module } from '@nestjs/common'
import { TransactionService } from '@/transaction/transaction.service'
import { TransactionController } from '@/transaction/transaction.controller'
import { Transaction } from '@/transaction/entities/transaction.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
