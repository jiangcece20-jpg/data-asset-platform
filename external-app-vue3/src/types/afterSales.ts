// 交易售后契约 —— 对应设计规格 §9、§10
// 复用 ReverseWorkOrder（subjectType='order'|'contract'）；此处仅定义售后专属对象。

export interface PaymentLedgerEntry {
  id: string
  orderId: string
  type: 'charge' | 'refund' | 'reconcile'
  status: 'pending' | 'confirmed' | 'failed'
  idempotencyKey: string
  amount: number
  createdAt: string
}

export type RefundStatus = 'not_requested' | 'reviewing' | 'processing' | 'succeeded' | 'failed' | 'rejected'
export type RefundScope = 'full' | 'partial' | 'none'

export interface RefundRecord {
  id: string
  orderId: string
  customerId: string
  entitlementId?: string
  reason: string
  status: RefundStatus
  scope: RefundScope
  amount: number
  idempotencyKey: string
  workOrderId?: string
  createdAt: string
  updatedAt: string
}

export type ContractStatus = 'active' | 'terminating' | 'terminated'

export interface EnterpriseContract {
  id: string
  enterpriseId: string
  productId: string
  status: ContractStatus
  effectiveFrom: string
  effectiveTo?: string
  seatIds: string[]
}

// 支付歧义 / 空间回调对账决策（§9.5）
export type PaymentAmbiguityCase =
  | 'space_success_app_stale'
  | 'space_failed_app_processing'
  | 'space_charged_delivery_failed'
  | 'identity_mismatch'
  | 'product_delisted'

export type PaymentAmbiguityAction =
  | 'backfill_order'
  | 'close_and_allow_retry'
  | 'continue_or_refund'
  | 'suspend_and_fix_binding'
  | 'special_disposition'
