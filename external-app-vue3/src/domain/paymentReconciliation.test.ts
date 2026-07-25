import { describe, expect, it } from 'vitest'
import { resolvePaymentAmbiguity } from './paymentReconciliation'

describe('resolvePaymentAmbiguity', () => {
  it('maps each §9.5 case to its action', () => {
    expect(resolvePaymentAmbiguity('space_success_app_stale')).toBe('backfill_order')
    expect(resolvePaymentAmbiguity('space_failed_app_processing')).toBe('close_and_allow_retry')
    expect(resolvePaymentAmbiguity('space_charged_delivery_failed')).toBe('continue_or_refund')
    expect(resolvePaymentAmbiguity('identity_mismatch')).toBe('suspend_and_fix_binding')
    expect(resolvePaymentAmbiguity('product_delisted')).toBe('special_disposition')
  })
})
