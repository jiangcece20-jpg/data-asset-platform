export type SpaceKind = 'owned' | 'federated'

export type SpaceIntentOpsStatus =
  | 'unclaimed'
  | 'processing'
  | 'entitled'
  | 'closed'

export type SpaceIntentUserStatus = SpaceIntentOpsStatus

export type SpaceIntentOperationAction = 'submitted' | 'claimed' | 'entitled' | 'closed'

export interface SpaceIntentOperation {
  id: string
  action: SpaceIntentOperationAction
  label: string
  actor: string
  note: string
  createdAt: string
}

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
  operations?: SpaceIntentOperation[]
  createdAt: string
  updatedAt: string
}
