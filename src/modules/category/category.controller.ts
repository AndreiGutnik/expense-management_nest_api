import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { CategoryService } from './category.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard'
import { Category } from '@/modules/category/entities/category.entity'
import { CheckOwnership } from '@/core/authorization/decorators/check-ownership.decorator'
import { OwnershipGuard } from '@/core/authorization/guards/ownership.guard'

@Controller('categories')
@CheckOwnership(Category)
// @CheckOwnership(Category, {
//   param: 'id',
//   ownerField: 'user',
// })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(ValidationPipe)
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() req) {
    return this.categoryService.create(createCategoryDto, +req.user.id)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    return this.categoryService.findAll(+req.user.id)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(+id, updateCategoryDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id)
  }
}
