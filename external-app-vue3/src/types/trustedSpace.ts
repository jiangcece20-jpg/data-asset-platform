import type { DatasetOffer, EnterpriseAuthStatus, ProductPrice, ProductType } from './domain'

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
  datasetOffers?: DatasetOffer[]
  currency: string
  version: number
  spaceUpdatedAt: string
  syncedAt: string
  syncState: SnapshotSyncState
  // --- 空间基本信息同步（覆盖本地对应字段） ---
  /** 覆盖时间范围（如 "2024-01 至 2026-06"） */
  timeRange?: string
  /** 更新频率（如 "次/天"） */
  updateFrequency?: string
  /** 交付方式（如 "文件传输"） */
  deliveryMethod?: string
  /** 产品简介 → 覆盖 description */
  description?: string
  /** 应用场景（空间侧单值，映射为数组第一项） */
  scenarios?: string[]
  /** 覆盖时间范围（如 "2026-07-30 至 2026-08-31"） */
  coverage?: string
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
  productSnapshotVersion: number
  returnUrl: string
  idempotencyKey: string
  correlationId: string
  authorizationGeneration: number
  enterpriseContextGeneration: number
  status: PurchaseIntentStatus
  createdAt: string
  returnedAt?: string
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

export interface SpaceOrderReconciliationAudit {
  id: string
  intentId: string
  status: 'applied' | 'noop' | 'failed'
  reason:
    | 'process'
    | 'duplicate_noop'
    | 'stale_dropped'
    | 'intent_missing'
    | 'context_rejected'
    | 'context_changed'
    | 'order_not_found'
    | 'intent_mismatch'
    | 'query_failed'
    | 'retry'
    | 'dead_letter'
    | 'signature_rejected'
    | 'retry_payload_rejected'
  eventId?: string
  detail?: string
  createdAt: string
}

export interface ApiUsageBillLine {
  id: string
  date: string
  /** APP 商品，用于从费用明细返回商品与订单上下文。 */
  appProductId: string
  /** 可信空间商品编号。 */
  spaceProductNo: string
  /** 产生本次调用额度的可信空间采购订单。 */
  spaceOrderId: string
  apiName: string
  pricingPlan: string
  unitPrice: number
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
