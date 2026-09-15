export type SpaceKind = 'owned' | 'federated'

export type SpaceIntentOpsStatus =
  | 'unclaimed'
  | 'processing'
  | 'entitled'
  | 'closed'

export type SpaceIntentUserStatus = SpaceIntentOpsStatus

export interface SpaceIntentOrder {
  id: string
  productId: string
  productType: 'dataset' | 'api'
  ownerMemberId: string
  contactName: string
  contactPhone: string
  scenario: string
  requestedEnterpriseName?: string
  enterpriseId?: string
  opsStatus: SpaceIntentOpsStatus
  processNote?: string
  closeReason?: string
  createdAt: string
  updatedAt: string
}
