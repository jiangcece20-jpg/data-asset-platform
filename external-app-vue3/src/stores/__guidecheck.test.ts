// 场景化引导问题回归测试：确保每条示例问题都能在演示中返回内容（答案/指标/商品卡），不出现死路。
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAiStore, guideQuestions } from '@/stores/ai'
import { useCatalogStore } from '@/stores/catalog'
import { seedProducts } from '@/data/products'

describe('guideQuestions resolve to content for every scenario', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCatalogStore().products = JSON.parse(JSON.stringify(seedProducts))
  })

  it.each(guideQuestions.map((g) => [g.text]))('“%s” returns an answer/metric/product card and no dead end', (text) => {
    const ai = useAiStore()
    ai.sendQuestion(text)
    ai.flushResponse()
    const msg = ai.chatMessages[1]
    const hasCard = msg.blocks.some((b) => b.type === 'product-card')
    const hasAnswer = msg.blocks.some(
      (b) => (b.type === 'text' && ((b as any).content?.length ?? 0) > 0) || b.type === 'metric'
    )
    const deadEnd = msg.blocks.some((b) => b.type === 'text' && (b as any).content?.includes('暂未找到'))
    expect(hasCard || hasAnswer).toBe(true)
    expect(deadEnd).toBe(false)
  })
})
