import { Module } from '@nestjs/common'
import { UserService } from '@/user/user.service'
import { UserController } from '@/user/user.controller'
import { User } from '@/user/entities/user.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
