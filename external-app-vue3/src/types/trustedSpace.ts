import type { EnterpriseAuthStatus, ProductPrice, ProductType } from './domain'

export type SnapshotSyncState = 'current' | 'stale' | 'sync_failed' | 'unavailable'
export type SpaceProductSaleStatus = 'published' | 'paused' | 'delisted' | 'unknown'
export type SpaceBindingStatus = 'unbound' | 'pending' | 'active' | 'failed'
export type PurchaseIntentStatus =
  | 'validating' | 'ready' | 'redirected' | 'returned_pending_sync'
  | 'linked' | 'failed' | 'expired'
export type SpaceOrderDisplayStatus =
  | 'accepted' | 'pending_payment' | 'paid' | 'delivering'
  | 'delivered' | 'failed' | 'cancelled' | 'unknown_processing'

export interface TrustedProductSnapshot {
  appProductId: string
  spaceProductId: string
  spaceProductNo: string
  name: string
  type: ProductType
  provider: string
  saleStatus: SpaceProductSaleStatus
  price: ProductPrice
  currency: string
  version: number
  spaceUpdatedAt: string
  syncedAt: string
  syncState: SnapshotSyncState
}

export interface EnterpriseSpaceBinding {
  appEnterpriseId: string
  spaceEnterpriseId?: string
  status: SpaceBindingStatus
  syncedAt?: string
  failureReason?: string
}

export interface SpacePurchaseIntent {
  id: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  spaceProductNo: string
  returnUrl: string
  idempotencyKey: string
  correlationId: string
  status: PurchaseIntentStatus
  createdAt: string
  expiresAt: string
  purchaseUrl?: string
  purchaseLinkExpiresAt?: string
  failureReason?: string
}

export interface SpaceOrderEvent {
  eventId: string
  idempotencyKey: string
  eventVersion: number
  signatureValid: boolean
  spaceOrderId: string
  purchaseIntentId: string
  spaceEnterpriseId: string
  spaceProductNo: string
  rawStatus: string
  amount: number
  currency: string
  occurredAt: string
  deliverySummary?: string
  detailUrl?: string
}

export interface SpaceOrderEventAssociation {
  spaceOrderId: string
  purchaseIntentId: string
  spaceEnterpriseId: string
  spaceProductNo: string
}

export interface SpaceOrderMirror {
  spaceOrderId: string
  purchaseIntentId: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  operatorMemberId: string
  appProductId: string
  spaceProductNo: string
  productName: string
  rawStatus: string
  displayStatus: SpaceOrderDisplayStatus
  amount: number
  currency: string
  eventVersion: number
  spaceUpdatedAt: string
  syncedAt: string
  deliverySummary?: string
  detailUrl?: string
}

export interface ApiUsageBillLine {
  id: string
  date: string
  apiName: string
  appCredentialId: string
  ownerMemberId: string
  calls: number
  successCalls: number
  dataVolume: string
  amount: number
}

export interface ApiUsageBillMirror {
  spaceBillId: string
  appEnterpriseId: string
  spaceEnterpriseId: string
  billingMonth: string
  currency: string
  rawStatus: string
  totalCalls: number
  successCalls: number
  totalAmount: number
  lines: ApiUsageBillLine[]
  version: number
  spaceUpdatedAt: string
  syncedAt: string
  downloadLocator: string
  supportLocator: string
}

export interface TrustedPurchaseCheckInput {
  enterpriseAuthStatus: EnterpriseAuthStatus
  bindingStatus: SpaceBindingStatus
  snapshot?: TrustedProductSnapshot
  now: string
  maxAgeMs: number
}

export type TrustedPurchaseBlockReason =
  | 'enterprise_required' | 'binding_required' | 'product_unavailable'
  | 'product_stale' | 'product_not_for_sale'

export type TrustedPurchaseCheck =
  | { allowed: true }
  | { allowed: false; reason: TrustedPurchaseBlockReason }
