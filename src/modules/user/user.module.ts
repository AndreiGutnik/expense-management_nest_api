import { Module } from '@nestjs/common'
import { UserService } from '@/modules/user/user.service'
import { UserController } from '@/modules/user/user.controller'
import { User } from '@/modules/user/entities/user.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TokenModule } from '../token/token.module'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [TypeOrmModule.forFeature([User]), TokenModule, MailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
