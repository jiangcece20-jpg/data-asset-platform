import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import {
  buildRetrievalHits,
  computeCompleteness,
  computeConfidence,
  decideRoute,
  explainProductMatch,
  isExternalSceneQuery
} from './discoverRouting'

describe('discoverRouting', () => {
  const freightProduct = seedProducts.find((p) => p.id === 'prod-freight-index')!

  it('keyword entry always routes to known lookup', () => {
    const hits = buildRetrievalHits(seedProducts, '货运价格')
    const decision = decideRoute({
      entry: 'keyword',
      query: '货运价格',
      retrievalHits: hits,
      dataCompleteness: computeCompleteness(hits)
    })
    expect(decision.route).toBe('known_lookup')
    expect(decision.path).toBe('entry_keyword')
  })

  it('ai entry defaults to processing when confidence and completeness are high', () => {
    const hits = buildRetrievalHits(seedProducts, '货运价格趋势')
    const decision = decideRoute({
      entry: 'ai',
      query: '近三个月货运价格趋势如何',
      retrievalHits: hits,
      dataCompleteness: computeCompleteness(hits)
    })
    expect(decision.route).toBe('processing_query')
    expect(decision.path).toBe('entry_ai_default')
  })

  it('ai entry upgrades to external for policy-style queries', () => {
    const hits = buildRetrievalHits(seedProducts, 'PVC 限产政策')
    const decision = decideRoute({
      entry: 'ai',
      query: 'PVC 行业最新限产政策',
      retrievalHits: hits,
      dataCompleteness: computeCompleteness(hits)
    })
    expect(decision.route).toBe('external_exploration')
    expect(decision.path).toBe('external_direct')
    expect(isExternalSceneQuery('PVC 行业最新限产政策')).toBe(true)
  })

  it('ai entry upgrades when platform data is insufficient', () => {
    const decision = decideRoute({
      entry: 'ai',
      query: '完全不存在的冷门指标 xyz',
      retrievalHits: [],
      dataCompleteness: 0
    })
    expect(decision.route).toBe('external_exploration')
    expect(decision.reasons.some((r) => r.includes('完整性'))).toBe(true)
  })

  it('explainProductMatch returns matched fields and score', () => {
    const explain = explainProductMatch(freightProduct, '货运价格')
    expect(explain.matchedFields.length).toBeGreaterThan(0)
    expect(explain.score).toBeGreaterThan(0.5)
  })

  it('computeConfidence increases when top hit aligns with query', () => {
    const hits = buildRetrievalHits(seedProducts, '货运价格')
    expect(computeConfidence('货运价格', hits)).toBeGreaterThan(0.6)
    expect(computeConfidence('完全不相关', [])).toBe(0)
    expect(
      computeConfidence('完全不相关', [
        { id: 'x', kind: 'product', title: '无关商品', score: 0.3, matchedFields: ['模糊匹配'] }
      ])
    ).toBeLessThan(0.6)
  })
})
