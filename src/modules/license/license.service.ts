import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'

type LicenseRow = {
  expires_at: Date
  is_active: boolean
}

@Injectable()
export class LicenseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicenseService.name)
  private pool: Pool
  private licenseName: string

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const licenseName = this.configService.get<string>('LICENSE_NAME')

    if (!licenseName) {
      throw new Error('LICENSE_NAME is not defined')
    }

    this.licenseName = licenseName

    this.pool = new Pool({
      host: this.configService.get<string>('LICENSE_DB_HOST'),
      port: Number(this.configService.get<string>('LICENSE_DB_PORT') || 5432),
      user: this.configService.get<string>('LICENSE_DB_USERNAME'),
      password: this.configService.get<string>('LICENSE_DB_PASSWORD'),
      database: this.configService.get<string>('LICENSE_DB_NAME'),
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
    })
  }

  async onModuleDestroy() {
    await this.pool?.end()
  }

  async checkLicense(): Promise<void> {
    try {
      const result = await this.pool.query<LicenseRow>(
        `
          SELECT expires_at, is_active
          FROM licenses
          WHERE name = $1
          LIMIT 1
        `,
        [this.licenseName],
      )

      const license = result.rows[0]

      if (!license) {
        this.logger.warn(`License not found: ${this.licenseName}`)
        throw new UnauthorizedException()
      }

      if (!license.is_active) {
        this.logger.warn(`License disabled: ${this.licenseName}`)
        throw new UnauthorizedException()
      }

      const expiresAt = new Date(license.expires_at)

      if (expiresAt < new Date()) {
        this.logger.warn(
          `License expired: ${this.licenseName}, expired at ${expiresAt.toISOString()}`,
        )
        throw new UnauthorizedException()
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`License check failed: ${message}`)
      throw new UnauthorizedException()
    }
  }
}
