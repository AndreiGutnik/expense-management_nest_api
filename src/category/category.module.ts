import { Module } from '@nestjs/common'
import { CategoryService } from '@/category/category.service'
import { CategoryController } from '@/category/category.controller'
import { Category } from '@/category/entities/category.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
