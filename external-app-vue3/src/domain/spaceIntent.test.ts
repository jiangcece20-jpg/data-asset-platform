import { describe, expect, it } from 'vitest'
import {
  canConfirmPayment,
  nextOpsStatus,
  userStatusOf
} from './spaceIntent'

describe('spaceIntent domain', () => {
  it('maps ops status to user-facing intent statuses without converted', () => {
    expect(userStatusOf('unclaimed')).toBe('submitted')
    expect(userStatusOf('processing')).toBe('processing')
    expect(userStatusOf('converted')).toBe('processing')
    expect(userStatusOf('closed')).toBe('closed')
  })

  it('blocks payment confirmation until an enterprise is attached', () => {
    expect(canConfirmPayment({})).toBe(false)
    expect(canConfirmPayment({ enterpriseId: 'ent-1' })).toBe(true)
  })

  it('converts processing intents to orders and forbids closing converted ones', () => {
    expect(nextOpsStatus('unclaimed', 'claim')).toBe('processing')
    expect(nextOpsStatus('processing', 'confirm_payment')).toBe('converted')
    expect(nextOpsStatus('unclaimed', 'confirm_payment')).toBe('converted')
    expect(() => nextOpsStatus('converted', 'close')).toThrow('已转订单不可关闭')
    expect(nextOpsStatus('processing', 'close')).toBe('closed')
  })
})
