import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import { productCardSummary } from './productCardSummary'

const product = (id: string) => seedProducts.find((item) => item.id === id)!

describe('productCardSummary', () => {
  it('summarizes dataset business content without field samples', () => {
    const summary = productCardSummary(product('prod-truck-trajectory'))

    expect(summary.lead).toContain('货车轨迹')
    expect(summary.facts).toContain('区县 × 小时')
    expect(`${summary.lead} ${summary.facts.join(' ')}`).not.toContain('district_code')
  })

  it('summarizes API capability without endpoint details', () => {
    const summary = productCardSummary(product('prod-qualification-api'))

    expect(summary.lead).toContain('核验')
    expect(summary.facts.join(' ')).toContain('证件是否有效')
    expect(`${summary.lead} ${summary.facts.join(' ')}`).not.toContain('/api/')
  })

  it('falls back to subtitle and then preparation copy', () => {
    const source = product('prod-truck-trajectory')

    expect(productCardSummary({ ...source, description: '' }).lead).toBe(source.subtitle)
    expect(productCardSummary({ ...source, description: '', subtitle: '' }).lead).toBe('内容说明准备中')
  })
})
