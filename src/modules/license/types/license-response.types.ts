export type LicensePayload = {
  valid: true
  licenseId: number
  licenseName: string
  deviceId: string
  expiresAt: string | null
  checkedAt: string
  graceUntil: string
}

export type SignedLicenseResponse = {
  payload: LicensePayload
  signature: string
}
