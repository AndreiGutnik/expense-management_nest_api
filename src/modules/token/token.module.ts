import { Module } from '@nestjs/common'
import { TokenService } from './token.service'
import { Token } from './entities/token.entity'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
