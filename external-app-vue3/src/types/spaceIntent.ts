export type SpaceKind = 'owned' | 'federated'

export type SpaceIntentOpsStatus =
  | 'unclaimed'
  | 'pending_enterprise'
  | 'space_dealing'
  | 'pending_delivery'
  | 'completed'
  | 'closed'

export type SpaceIntentUserStatus = 'submitted' | 'processing' | 'completed' | 'closed'

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
  spaceOrderNo?: string
  spaceDealNote?: string
  closeReason?: string
  createdAt: string
  updatedAt: string
}
