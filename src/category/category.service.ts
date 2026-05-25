import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateCategoryDto } from '@/category/dto/create-category.dto'
import { UpdateCategoryDto } from '@/category/dto/update-category.dto'
import { Category } from '@/category/entities/category.entity'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private async findCategoryById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    return category
  }

  async create(createCategoryDto: CreateCategoryDto, id: number) {
    const isExist = await this.categoryRepository.findOne({
      where: {
        user: { id },
        title: createCategoryDto.title,
      },
    })

    if (isExist) {
      throw new BadRequestException('Category already exists')
    }

    const newCategory = {
      title: createCategoryDto.title,
      user: { id },
    }
    return this.categoryRepository.save(newCategory)
  }

  async findAll(id: number) {
    return await this.categoryRepository.find({
      where: {
        user: { id },
      },
      relations: {
        transactions: true,
      },
    })
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: {
        user: true,
        transactions: true,
      },
    })
    if (!category) throw new NotFoundException('Category not found')

    return category
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findCategoryById(id)

    const updatedCategory = {
      ...category,
      ...updateCategoryDto,
    }
    return await this.categoryRepository.save(updatedCategory)

    //return await this.categoryRepository.update(id, updateCategoryDto)
  }

  async remove(id: number) {
    const category = await this.findCategoryById(id)

    await this.categoryRepository.remove(category)

    return category
  }
}
