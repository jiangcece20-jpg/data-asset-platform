import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { DISCOVER_SHOWCASE_PRODUCT_IDS, discoverShowcaseProducts } from './discoverShowcase'

describe('discoverShowcase', () => {
  it('keeps space API and mixed source types on the discover page', () => {
    const showcase = discoverShowcaseProducts(seedProducts)

    expect(showcase.map((item) => item.id)).toEqual([...DISCOVER_SHOWCASE_PRODUCT_IDS])
    expect(showcase.find((item) => item.id === 'prod-qualification-api')?.dealChannel).toBe('space_purchase')
    expect(showcase.find((item) => item.id === 'prod-enterprise-activity')?.dealChannel).toBe('space_purchase')
    expect(showcase.find((item) => item.id === 'prod-personal-waybill-dataset')?.tags).toContain('个人数据集')
  })
})
