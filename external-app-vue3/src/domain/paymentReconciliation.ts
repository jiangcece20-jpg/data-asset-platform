// 支付歧义 / 空间回调对账纯决策 —— 对应设计规格 §9.5
import type { PaymentAmbiguityCase, PaymentAmbiguityAction } from '@/types/afterSales'

const MAP: Record<PaymentAmbiguityCase, PaymentAmbiguityAction> = {
  space_success_app_stale: 'backfill_order',
  space_failed_app_processing: 'close_and_allow_retry',
  space_charged_delivery_failed: 'continue_or_refund',
  identity_mismatch: 'suspend_and_fix_binding',
  product_delisted: 'special_disposition'
}

export function resolvePaymentAmbiguity(scenario: PaymentAmbiguityCase): PaymentAmbiguityAction {
  return MAP[scenario]
}
