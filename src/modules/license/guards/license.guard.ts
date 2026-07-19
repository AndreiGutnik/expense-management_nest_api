import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { LicenseService } from '../license.service'

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private readonly licenseService: LicenseService) {}

  async canActivate(_: ExecutionContext): Promise<boolean> {
    await this.licenseService.checkLicense()
    return true
  }
}
