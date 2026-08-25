import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import {
  OWNED_SPACE_NAME,
  canConfirmPayment,
  nextOpsStatus,
  publicSpaceChips,
  userStatusOf
} from './spaceIntent'

function product(over: Partial<Product>): Product {
  return { type: 'dataset', dealChannel: 'space_purchase', tags: [], ...over } as Product
}

describe('spaceIntent domain', () => {
  it('maps ops status to user-facing intent statuses without converted', () => {
    expect(userStatusOf('unclaimed')).toBe('submitted')
    expect(userStatusOf('processing')).toBe('processing')
    expect(userStatusOf('converted')).toBe('processing')
    expect(userStatusOf('closed')).toBe('closed')
  })

  it('shows space name and sample chip to users, never owned/federated', () => {
    const chips = publicSpaceChips(product({
      spaceName: OWNED_SPACE_NAME,
      spaceKind: 'owned',
      hasSampleData: true,
      type: 'dataset'
    }))
    expect(chips).toEqual([OWNED_SPACE_NAME, '有样例'])
    expect(chips.join()).not.toContain('自有')
    expect(chips.join()).not.toContain('互联')
  })

  it('shows trial-api chip only for APIs', () => {
    expect(publicSpaceChips(product({
      type: 'dataset',
      spaceName: OWNED_SPACE_NAME,
      hasTrialApi: true,
      hasSampleData: false
    }))).toEqual([OWNED_SPACE_NAME])
    expect(publicSpaceChips(product({
      type: 'api',
      spaceName: '某省互联空间',
      hasTrialApi: true
    }))).toEqual(['某省互联空间', '有试用接口'])
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
