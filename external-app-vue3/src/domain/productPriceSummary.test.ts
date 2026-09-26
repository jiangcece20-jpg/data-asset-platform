import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { productPriceSummary } from './productPriceSummary'
import { useCatalogStore } from '@/stores/catalog'
import type { Product } from '@/types/domain'

function baseProduct(over: Partial<Product>): Product {
  return {
    id: 'p-test',
    resourceId: 'r-test',
    name: '测试商品',
    subtitle: '',
    type: 'dataset',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'available',
    status: 'listed',
    acquisitions: ['item_purchase'],
    scenarios: [],
    provider: '测试提供方',
    coverage: '全国',
    updateFrequency: '月度',
    qualityPromise: '',
    complianceNote: '',
    price: { model: 'fixed', itemPrice: 99 },
    tags: [],
    description: '',
    valueProposition: '',
    deliveryMethod: '',
    memberIncluded: false,
    typeDetail: {},
    ...over
  } as Product
}

describe('productPriceSummary', () => {
  it('shows delisted / candidate states', () => {
    expect(productPriceSummary(baseProduct({ availability: 'delisted' })).text).toBe('已下架')
    expect(productPriceSummary(baseProduct({ availability: 'candidate' })).text).toBe('暂未定价')
  })

  it('shows free for free-only products', () => {
    const s = productPriceSummary(baseProduct({ acquisitions: ['free'] }))
    expect(s).toMatchObject({ kind: 'free', text: '免费' })
  })

  it('shows personal starting price with 起 suffix', () => {
    const s = productPriceSummary(baseProduct({
      price: { model: 'fixed', itemPrice: 99 },
      commerceOffers: [
        { id: 'a', name: '个人单品', subject: 'personal', price: 99, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'personal' },
        { id: 'b', name: '企业单品', subject: 'enterprise', price: 990, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'enterprise_wide' }
      ]
    }))
    expect(s.kind).toBe('money')
    expect(s.text).toBe('¥99')
    expect(s.suffix).toContain('起')
    expect(s.hint).toBe('企业版价格另询')
  })

  it('shows yearly suffix for continuous subscription offer', () => {
    const s = productPriceSummary(baseProduct({
      commerceOffers: [
        { id: 'a', name: '年付', subject: 'personal', price: 299, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', accessScope: 'personal', billingPeriodMonths: 12 }
      ]
    }))
    expect(s.suffix).toContain('/年')
  })

  it('shows quote for space products without offers', () => {
    const s = productPriceSummary(baseProduct({
      dealChannel: 'space_purchase',
      acquisitions: ['trial']
    }))
    expect(s).toMatchObject({ kind: 'quote', text: '待报价' })
  })

  it('shows cheapest space offer with multi-plan hint', () => {
    const s = productPriceSummary(baseProduct({
      dealChannel: 'space_purchase',
      commerceOffers: [
        { id: 'a', name: '基础', subject: 'enterprise', price: 199, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_service', accessScope: 'enterprise_wide', billingPeriodMonths: 12 },
        { id: 'b', name: '高级', subject: 'enterprise', price: 399, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_service', accessScope: 'enterprise_wide', billingPeriodMonths: 12 }
      ]
    }))
    expect(s).toMatchObject({ kind: 'money', text: '¥199', hint: '多方案可选' })
    expect(s.suffix).toContain('起')
  })

  it('parses seeded catalog products without throwing', () => {
    setActivePinia(createPinia())
    const catalog = useCatalogStore()
    expect(catalog.products.length).toBeGreaterThan(0)
    for (const product of catalog.products) {
      const s = productPriceSummary(product)
      expect(['free', 'money', 'quote', 'none']).toContain(s.kind)
      expect(s.text).toBeTruthy()
    }
  })
})
