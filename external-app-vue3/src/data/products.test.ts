import { describe, expect, it } from 'vitest'
import { seedProducts } from './products'

describe('four-type product catalog', () => {
  it('contains only the four approved public types', () => {
    expect(new Set(seedProducts.map((product) => product.type))).toEqual(
      new Set(['dataset', 'api', 'report', 'dashboard'])
    )
  })

  it('routes every dataset and API to trusted-space purchase', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' || item.type === 'api')) {
      expect(product.dealChannel).toBe('space_purchase')
      expect(product.acquisitions).toEqual(['space_purchase'])
    }
  })

  it('keeps candidate assets free of samples and real responses', () => {
    for (const product of seedProducts.filter((item) => item.availability === 'candidate')) {
      expect(product.typeDetail.dataset?.sampleRows ?? []).toHaveLength(0)
      expect(product.typeDetail.api?.sandbox.fixedResponse ?? {}).toEqual({})
    }
  })

  it('limits published dataset samples to ten rows', () => {
    for (const product of seedProducts.filter((item) => item.type === 'dataset' && item.availability === 'published')) {
      expect(product.typeDetail.dataset?.sampleRows.length).toBeLessThanOrEqual(10)
    }
  })
})
