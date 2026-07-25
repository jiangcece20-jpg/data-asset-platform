import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from '@/stores/catalog'
import { guideQuestions } from '@/stores/ai'

describe('每个热门问题都能带出多种类型的商品', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(guideQuestions.map((g) => [g.text]))('“%s” 全文搜索结果覆盖 ≥ 2 种类型', (text) => {
    const catalog = useCatalogStore()
    const results = catalog.search(text)
    const types = new Set(results.map((p) => p.type))
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(types.size).toBeGreaterThanOrEqual(2)
  })
})
