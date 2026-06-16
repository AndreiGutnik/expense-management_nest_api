import { Module } from '@nestjs/common'
import { LicenseService } from './license.service'
import { LicenseGuard } from './guards/license.guard'

@Module({
  providers: [LicenseService, LicenseGuard],
  exports: [LicenseGuard],
})
export class LicenseModule {}
