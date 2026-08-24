import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import {
  OWNED_SPACE_NAME,
  canEnterSpaceDealing,
  nextOpsStatus,
  publicSpaceChips,
  userStatusOf
} from './spaceIntent'

function product(over: Partial<Product>): Product {
  return { type: 'dataset', dealChannel: 'space_purchase', tags: [], ...over } as Product
}

describe('spaceIntent domain', () => {
  it('maps ops status to three user statuses', () => {
    expect(userStatusOf('unclaimed')).toBe('submitted')
    expect(userStatusOf('pending_enterprise')).toBe('processing')
    expect(userStatusOf('space_dealing')).toBe('processing')
    expect(userStatusOf('pending_delivery')).toBe('processing')
    expect(userStatusOf('completed')).toBe('completed')
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

  it('blocks space dealing until an enterprise is attached', () => {
    expect(canEnterSpaceDealing({})).toBe(false)
    expect(canEnterSpaceDealing({ enterpriseId: 'ent-1' })).toBe(true)
  })

  it('routes dataset completion through pending_delivery', () => {
    expect(nextOpsStatus('space_dealing', 'mark_space_deal', 'dataset')).toBe('pending_delivery')
    expect(nextOpsStatus('space_dealing', 'mark_space_deal', 'api')).toBe('completed')
    expect(() => nextOpsStatus('unclaimed', 'mark_space_deal', 'dataset')).toThrow()
  })
})
