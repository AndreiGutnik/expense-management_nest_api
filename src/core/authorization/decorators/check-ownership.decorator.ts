import { SetMetadata } from '@nestjs/common'

export const OWNERSHIP_KEY = 'ownership'

export interface OwnershipOptions {
  param?: string
  ownerField?: string
}

export interface OwnershipMetadata {
  entity: any
  param: string
  ownerField: string
}

export const CheckOwnership = (entity: any, options?: OwnershipOptions) => {
  const metadata: OwnershipMetadata = {
    entity,
    param: options?.param || 'id',
    ownerField: options?.ownerField || 'user',
  }

  return SetMetadata(OWNERSHIP_KEY, metadata)
}
