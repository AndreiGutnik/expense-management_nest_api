import { Module } from '@nestjs/common'
import { CategoryService } from '@/modules/category/category.service'
import { CategoryController } from '@/modules/category/category.controller'
import { Category } from '@/modules/category/entities/category.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
