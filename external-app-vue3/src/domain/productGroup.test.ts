import { describe, expect, it } from 'vitest'
import type { Product } from '@/types/domain'
import { groupMembers, isPackagedProduct, packCandidates, packagingStatusLabel } from './productGroup'

function product(id: string, name: string, groupId?: string): Product {
  return {
    id,
    productGroupId: groupId,
    resourceId: `res-${id}`,
    name,
    subtitle: '',
    type: 'dashboard',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['item_purchase'],
    scenarios: [],
    provider: '',
    coverage: '',
    updateFrequency: '',
    qualityPromise: '',
    complianceNote: '',
    price: { model: 'item_only', itemPrice: 100 },
    status: 'published',
    tags: [],
    description: '',
    valueProposition: '',
    deliveryMethod: '',
    memberIncluded: false,
    updatedAt: '',
    typeDetail: {},
    serviceStatus: 'normal'
  }
}

describe('productGroup', () => {
  it('marks available, linked-here, and linked-elsewhere candidates', () => {
    const products = [
      product('a', '看板 A', 'g1'),
      product('b', '看板 B', 'g1'),
      product('c', '看板 C', 'g2'),
      product('d', '看板 D', 'g2'),
      product('e', '看板 E', 'g3')
    ]
    const candidates = packCandidates(products, 'a')
    const byId = Object.fromEntries(candidates.map((item) => [item.product.id, item]))

    expect(byId.b?.selectable).toBe(false)
    expect(byId.b?.packagingStatus).toBe('linked_here')
    expect(packagingStatusLabel(byId.b!)).toBe('已关联')

    expect(byId.e?.selectable).toBe(true)
    expect(byId.e?.packagingStatus).toBe('available')

    expect(byId.c?.selectable).toBe(false)
    expect(byId.c?.packagingStatus).toBe('linked_elsewhere')
    expect(byId.c?.linkedToLabel).toBe('看板 D')
    expect(packagingStatusLabel(byId.c!)).toBe('已关联至「看板 D」')
  })

  it('detects packaged groups', () => {
    const products = [product('a', 'A', 'g1'), product('b', 'B', 'g1'), product('c', 'C', 'g2')]
    expect(isPackagedProduct(products, 'a')).toBe(true)
    expect(isPackagedProduct(products, 'c')).toBe(false)
    expect(groupMembers(products, 'a').map((item) => item.id)).toEqual(['a', 'b'])
  })
})
