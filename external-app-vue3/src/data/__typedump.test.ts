// 扩充 mock 商品覆盖四种类型，保证「找数结果」列表能展示各类产品卡样式。
import { describe, expect, it } from 'vitest'
import { mockProducts } from './mockProducts'

describe('mockProducts', () => {
  it('covers all four product types', () => {
    expect(new Set(mockProducts.map((p) => p.type))).toEqual(
      new Set(['dataset', 'api', 'report', 'dashboard'])
    )
  })

  it('routes every mock dataset/api to trusted-space purchase (与商品规则一致)', () => {
    for (const p of mockProducts.filter((m) => m.type === 'dataset' || m.type === 'api')) {
      expect(p.dealChannel).toBe('space_purchase')
      expect(p.acquisitions).toEqual(['space_purchase'])
    }
  })
})
