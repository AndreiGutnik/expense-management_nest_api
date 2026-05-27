import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateTransactionDto } from './dto/create-transaction.dto'
import { UpdateTransactionDto } from './dto/update-transaction.dto'
import { Repository } from 'typeorm'
import { Transaction } from './entities/transaction.entity'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  private async findTransactionById(id: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: {
        user: true,
        category: true,
      },
    })

    if (!transaction) {
      throw new NotFoundException('Transaction not found')
    }

    return transaction
  }

  async create(createTransactionDto: CreateTransactionDto, id: number) {
    const newTransaction = {
      title: createTransactionDto.title,
      amount: createTransactionDto.amount,
      type: createTransactionDto.type,
      category: { id: +createTransactionDto.category },
      user: { id },
    }
    if (!newTransaction)
      throw new BadRequestException('Invalid transaction data')
    return await this.transactionRepository.save(newTransaction)
  }

  async findAll(id: number) {
    const transactions = await this.transactionRepository.find({
      where: {
        user: { id },
      },
      order: {
        createdAt: 'DESC',
      },
      relations: {
        user: true,
        category: true,
      },
    })
    return transactions
  }

  async findOne(id: number) {
    const transaction = await this.findTransactionById(id)
    return transaction
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.findTransactionById(id)
    await this.transactionRepository.update(id, updateTransactionDto)
    return transaction
  }

  async remove(id: number) {
    const transaction = await this.findTransactionById(id)
    await this.transactionRepository.remove(transaction)
    return transaction
  }

  async findAllWithPagination(id: number, page: number, limit: number) {
    const transactions = await this.transactionRepository.find({
      where: {
        user: { id },
      },
      relations: {
        user: true,
        category: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    })
    return transactions
  }

  async findAllByType(id: number, type: string) {
    const transactions = await this.transactionRepository.find({
      where: {
        user: { id },
        type,
      },
    })
    const total = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    )
    return total
  }
}
