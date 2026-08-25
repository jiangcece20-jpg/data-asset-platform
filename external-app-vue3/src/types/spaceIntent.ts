export type SpaceKind = 'owned' | 'federated'

export type SpaceIntentOpsStatus =
  | 'unclaimed'
  | 'processing'
  | 'converted'
  | 'closed'

export type SpaceIntentUserStatus = 'submitted' | 'processing' | 'closed'

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
  orderId?: string
  closeReason?: string
  createdAt: string
  updatedAt: string
}
