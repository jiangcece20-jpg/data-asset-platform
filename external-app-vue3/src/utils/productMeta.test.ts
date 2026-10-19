import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { datasetResourceInfoFields } from '@/domain/productDetailFields'

describe('shared product source labels', () => {
  it.each([
    ['asset_platform', '自营产品'],
    ['app_content', '自营产品'],
    ['trusted_space', '可信空间'],
    ['seller_market', '入驻商家']
  ] as const)('displays %s consistently in dataset resource information', (origin, label) => {
    const base = seedProducts.find((product) => product.id === 'prod-public-freight-dataset')!
    expect(datasetResourceInfoFields({ ...base, origin }).find((field) => field.label === '来源')?.value).toBe(label)
  })
})
