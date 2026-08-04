import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { pricingPresentation } from './pricingPresentation'

function product(id: string) {
  return seedProducts.find((item) => item.id === id)!
}

describe('pricingPresentation', () => {
  it('distinguishes APP fixed pricing from trusted-space plans', () => {
    expect(pricingPresentation(product('prod-truck-trajectory')).label).toBe('一次性 / 持续更新')
    expect(pricingPresentation(product('prod-enterprise-activity')).label).toBe('多方案报价')
    expect(pricingPresentation(product('prod-qualification-api')).label).toBe('按量 / 套餐')
  })

  it('keeps trusted-space price authority explicit', () => {
    expect(pricingPresentation(product('prod-enterprise-activity')).note).toContain('只展示、不改价')
  })
})
