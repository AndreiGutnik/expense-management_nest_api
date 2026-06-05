import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Token } from './entities/token.entity'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { IJwtPayload } from '../user/types/types'
import * as argon2 from 'argon2'

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a JWT access token
   * @param user User object with id and email fields
   * @returns access token
   */
  async generateAccessToken(user: IJwtPayload) {
    const payload = { email: user.email, id: user.id }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    })

    return accessToken
  }

  /**
   * Generates a JWT refresh token and saves its hashed version in the database
   * @param user User object with id and email fields
   * @returns refresh token
   */
  async generateRefreshToken(user: IJwtPayload) {
    const payload = { email: user.email, id: user.id }

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    })
    const hashedRefreshToken = await argon2.hash(refreshToken)

    await this.saveRefreshToken(user.id, hashedRefreshToken)

    return refreshToken
  }

  /**
   * Updates both tokens with rotation: verifies the existing refresh token, removes it from the database, and generates a new pair of tokens
   * @param user User object with id and email fields
   * @param refreshToken Existing refresh token
   * @returns New pair of tokens { accessToken, refreshToken }
   */
  async refreshTokens(user: IJwtPayload, refreshToken: string) {
    await this.verifyRefreshToken(user.id, refreshToken)
    await this.removeRefreshToken(user.id)
    const tokens = await this.generateTokenPair(user)
    return tokens
  }

  /**
   * Removes the refresh token for a user
   * @param userId User ID
   * @returns void
   */
  async removeRefreshToken(userId: number) {
    const existingToken = await this.tokenRepository.findOne({
      where: {
        user: { id: userId },
      },
    })
    if (!existingToken) {
      throw new BadRequestException('No refresh token found for user')
    }
    await this.tokenRepository.remove(existingToken)
  }

  /**
   * Saves the hashed refresh token for a user
   * @param userId User ID
   * @param hashedRefreshToken Hashed refresh token
   * @returns The saved token entity
   */
  private async saveRefreshToken(userId: number, hashedRefreshToken: string) {
    const existingToken = await this.tokenRepository.findOne({
      where: { user: { id: userId } },
    })

    if (existingToken) {
      existingToken.refreshToken = hashedRefreshToken
      return this.tokenRepository.save(existingToken)
    }

    const newToken = this.tokenRepository.create({
      user: { id: userId },
      refreshToken: hashedRefreshToken,
    })
    return this.tokenRepository.save(newToken)
  }

  /**
   * Verifies the provided refresh token against the stored hashed token for the user
   * @param userId User ID
   * @param refreshToken Refresh token to verify
   * @returns true if the token is valid, otherwise throws an exception
   */
  private async verifyRefreshToken(userId: number, refreshToken: string) {
    try {
      const secret = this.configService.get<string>('JWT_REFRESH_SECRET')
      this.jwtService.verify(refreshToken, { secret })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      throw new BadRequestException('Invalid refresh token')
    }

    const existingToken = await this.tokenRepository.findOne({
      where: {
        user: { id: userId },
      },
    })
    if (!existingToken) {
      throw new BadRequestException('No refresh token found for user')
    }
    const isTokenValid = await argon2.verify(
      existingToken.refreshToken,
      refreshToken,
    )
    if (!isTokenValid) {
      await this.removeRefreshToken(userId)
      throw new BadRequestException('Invalid refresh token')
    }

    return true
  }

  /**
   * Generates a new pair of access and refresh tokens for a user
   * @param user User object with id and email fields
   * @returns An object containing the new access token and refresh token
   */
  async generateTokenPair(user: IJwtPayload) {
    const accessToken = await this.generateAccessToken(user)
    const refreshToken = await this.generateRefreshToken(user)

    return { accessToken, refreshToken }
  }
}
