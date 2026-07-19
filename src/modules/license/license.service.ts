import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPublicKey, verify } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  LicensePayload,
  SignedLicenseResponse,
} from './types/license-response.types'

class LicenseServerUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = LicenseServerUnavailableError.name
  }
}

@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name)

  private licenseServerUrl: string
  private licenseKey: string
  private deviceId: string
  private publicKey: ReturnType<typeof createPublicKey>
  private cachePath: string
  private timeoutMs: number

  private pendingCheck: Promise<void> | null = null

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.licenseServerUrl = this.getRequiredConfig('LICENSE_SERVER_URL')
    this.licenseKey = this.getRequiredConfig('LICENSE_KEY')
    this.deviceId = this.getRequiredConfig('LICENSE_DEVICE_ID')

    const publicKeyPath = resolve(
      process.cwd(),
      this.getRequiredConfig('LICENSE_PUBLIC_KEY_PATH'),
    )

    this.cachePath = resolve(
      process.cwd(),
      this.getRequiredConfig('LICENSE_CACHE_PATH'),
    )

    const timeoutValue =
      this.configService.get<string>('LICENSE_CHECK_TIMEOUT_MS') ?? '3000'

    this.timeoutMs = Number(timeoutValue)

    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new Error('LICENSE_CHECK_TIMEOUT_MS must be a positive integer')
    }

    const publicKeyPem = await fs.readFile(publicKeyPath, 'utf8')

    this.publicKey = createPublicKey(publicKeyPem)
  }

  checkLicense(): Promise<void> {
    if (this.pendingCheck) {
      return this.pendingCheck
    }

    this.pendingCheck = this.performLicenseCheck().finally(() => {
      this.pendingCheck = null
    })

    return this.pendingCheck
  }

  private async performLicenseCheck(): Promise<void> {
    try {
      const response = await this.requestLicenseServer()

      this.assertSignedResponse(response)
      this.assertPayload(response.payload)
      this.verifySignature(response)

      await this.writeCache(response)

      return
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      if (!(error instanceof LicenseServerUnavailableError)) {
        const message = error instanceof Error ? error.message : String(error)

        this.logger.error(`License response rejected: ${message}`)

        throw new UnauthorizedException()
      }

      this.logger.warn(
        `License server unavailable: ${error.message}. ` +
          'Trying signed local cache.',
      )

      await this.checkCachedLicense()
    }
  }

  private async requestLicenseServer(): Promise<unknown> {
    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, this.timeoutMs)

    try {
      const response = await fetch(this.licenseServerUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          key: this.licenseKey,
          deviceId: this.deviceId,
        }),
        signal: controller.signal,
      })

      if (response.status === 401 || response.status === 403) {
        this.logger.warn('License server rejected the license')
        throw new UnauthorizedException()
      }

      if (response.status >= 400 && response.status < 500) {
        this.logger.warn(
          `License request rejected with HTTP ${response.status}`,
        )

        throw new UnauthorizedException()
      }

      if (!response.ok) {
        throw new LicenseServerUnavailableError(`HTTP ${response.status}`)
      }

      try {
        return await response.json()
      } catch {
        throw new Error('License server returned invalid JSON')
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      if (error instanceof LicenseServerUnavailableError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LicenseServerUnavailableError(
          `request timed out after ${this.timeoutMs} ms`,
        )
      }

      const message = error instanceof Error ? error.message : String(error)

      throw new LicenseServerUnavailableError(message)
    } finally {
      clearTimeout(timeout)
    }
  }

  private async checkCachedLicense(): Promise<void> {
    let cachedResponse: unknown

    try {
      const cache = await fs.readFile(this.cachePath, 'utf8')
      cachedResponse = JSON.parse(cache)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      this.logger.warn(`License cache is unavailable: ${message}`)
      throw new UnauthorizedException()
    }

    try {
      this.assertSignedResponse(cachedResponse)
      this.assertPayload(cachedResponse.payload)
      this.verifySignature(cachedResponse)

      const graceUntil = Date.parse(cachedResponse.payload.graceUntil)

      if (graceUntil <= Date.now()) {
        this.logger.warn('License cache grace period has expired')
        throw new UnauthorizedException()
      }

      if (cachedResponse.payload.expiresAt) {
        const expiresAt = Date.parse(cachedResponse.payload.expiresAt)

        if (expiresAt <= Date.now()) {
          this.logger.warn('Cached license has expired')
          throw new UnauthorizedException()
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)

      this.logger.error(`License cache rejected: ${message}`)
      throw new UnauthorizedException()
    }
  }

  private verifySignature(response: SignedLicenseResponse): void {
    const serializedPayload = this.stableStringify(response.payload)

    const signatureValue = response.signature

    const isStrictBase64 =
      signatureValue.length % 4 === 0 &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(signatureValue)

    if (!isStrictBase64) {
      throw new Error('Invalid signature encoding')
    }

    const signature = Buffer.from(signatureValue, 'base64')

    // Ed25519 signature всегда содержит 64 байта.
    if (signature.length !== 64) {
      throw new Error('Invalid signature length')
    }

    // Node.js Base64 decoder может игнорировать лишние символы.
    // Повторное кодирование гарантирует канонический Base64.
    if (signature.toString('base64') !== signatureValue) {
      throw new Error('Non-canonical signature encoding')
    }

    const signatureIsValid = verify(
      null,
      Buffer.from(serializedPayload),
      this.publicKey,
      signature,
    )

    if (!signatureIsValid) {
      throw new Error('Invalid license response signature')
    }
  }

  private assertSignedResponse(
    value: unknown,
  ): asserts value is SignedLicenseResponse {
    if (!value || typeof value !== 'object') {
      throw new Error('License response must be an object')
    }

    const response = value as Record<string, unknown>

    if (!response.payload || typeof response.payload !== 'object') {
      throw new Error('License response payload is missing')
    }

    if (
      typeof response.signature !== 'string' ||
      response.signature.length === 0
    ) {
      throw new Error('License response signature is missing')
    }
  }

  private assertPayload(payload: LicensePayload): void {
    if (payload.valid !== true) {
      throw new UnauthorizedException()
    }

    if (
      typeof payload.licenseId !== 'number' ||
      !Number.isInteger(payload.licenseId)
    ) {
      throw new Error('Invalid licenseId')
    }

    if (
      typeof payload.licenseName !== 'string' ||
      payload.licenseName.length === 0
    ) {
      throw new Error('Invalid licenseName')
    }

    if (payload.deviceId !== this.deviceId) {
      throw new Error('License response belongs to another device')
    }

    const checkedAt = Date.parse(payload.checkedAt)
    const graceUntil = Date.parse(payload.graceUntil)

    if (!Number.isFinite(checkedAt) || !Number.isFinite(graceUntil)) {
      throw new Error('Invalid license response dates')
    }

    if (graceUntil < checkedAt) {
      throw new Error('graceUntil is earlier than checkedAt')
    }

    if (payload.expiresAt !== null) {
      const expiresAt = Date.parse(payload.expiresAt)

      if (!Number.isFinite(expiresAt)) {
        throw new Error('Invalid expiresAt')
      }

      if (graceUntil > expiresAt) {
        throw new Error('graceUntil exceeds expiresAt')
      }
    }
  }

  private async writeCache(response: SignedLicenseResponse): Promise<void> {
    const cacheDirectory = dirname(this.cachePath)
    const temporaryPath = `${this.cachePath}.tmp`

    await fs.mkdir(cacheDirectory, {
      recursive: true,
      mode: 0o700,
    })

    await fs.writeFile(temporaryPath, JSON.stringify(response), {
      encoding: 'utf8',
      mode: 0o600,
    })

    await fs.rename(temporaryPath, this.cachePath)
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value)
    }

    if (Array.isArray(value)) {
      return `[${value.map(item => this.stableStringify(item)).join(',')}]`
    }

    const object = value as Record<string, unknown>
    const keys = Object.keys(object).sort()

    return `{${keys
      .map(key => `${JSON.stringify(key)}:${this.stableStringify(object[key])}`)
      .join(',')}}`
  }

  private getRequiredConfig(name: string): string {
    const value = this.configService.get<string>(name)

    if (!value || value.trim().length === 0) {
      throw new Error(`${name} is not defined`)
    }

    return value.trim()
  }
}
