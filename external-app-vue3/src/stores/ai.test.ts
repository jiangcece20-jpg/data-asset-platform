import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore, guideQuestions, roleOptions } from './ai'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { seedProducts } from '@/data/products'
import { seedEntitlements } from '@/data/seed'

describe('AI Store — chat functionality', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const catalog = useCatalogStore()
    catalog.products = JSON.parse(JSON.stringify(seedProducts))
    const ent = useEntitlementStore()
    ent.list = JSON.parse(JSON.stringify(seedEntitlements))
  })

  describe('sendQuestion', () => {
    it('adds a user message', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      expect(ai.chatMessages).toHaveLength(1)
      expect(ai.chatMessages[0].role).toBe('user')
      expect(ai.chatMessages[0].blocks[0]).toMatchObject({ type: 'text', content: '货运价格趋势如何' })
    })

    it('sets typing to true', () => {
      const ai = useAiStore()
      ai.sendQuestion('测试问题')
      expect(ai.chatTyping).toBe(true)
    })

    it('clears follow-ups during typing', () => {
      const ai = useAiStore()
      ai.sendQuestion('测试问题')
      expect(ai.chatFollowUps).toHaveLength(0)
    })

    it('stores pending blocks for flushResponse', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      expect(ai._pendingBlocks).not.toBeNull()
      expect(ai._pendingBlocks!.length).toBeGreaterThan(0)
    })

    it('does nothing for empty input', () => {
      const ai = useAiStore()
      ai.sendQuestion('   ')
      expect(ai.chatMessages).toHaveLength(0)
      expect(ai.chatTyping).toBe(false)
    })
  })

  describe('flushResponse', () => {
    it('adds AI message with pending blocks', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      expect(ai.chatMessages).toHaveLength(2)
      expect(ai.chatMessages[1].role).toBe('ai')
      expect(ai.chatMessages[1].blocks.length).toBeGreaterThan(0)
    })

    it('sets typing to false', () => {
      const ai = useAiStore()
      ai.sendQuestion('测试')
      ai.flushResponse()
      expect(ai.chatTyping).toBe(false)
    })

    it('sets follow-ups from matched qaBank', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      expect(ai.chatFollowUps.length).toBeGreaterThan(0)
      expect(ai.chatFollowUps).toContain('近 3 个月华东区域的详细走势是什么？')
    })

    it('does nothing when no pending response', () => {
      const ai = useAiStore()
      ai.flushResponse()
      expect(ai.chatMessages).toHaveLength(0)
    })
  })

  describe('resetChat', () => {
    it('clears all chat state', () => {
      const ai = useAiStore()
      ai.sendQuestion('测试')
      ai.flushResponse()
      ai.resetChat()
      expect(ai.chatMessages).toHaveLength(0)
      expect(ai.chatTyping).toBe(false)
      expect(ai.chatFollowUps).toHaveLength(0)
      expect(ai._pendingBlocks).toBeNull()
    })
  })

  describe('setRole', () => {
    it('changes current role', () => {
      const ai = useAiStore()
      expect(ai.currentRole).toBe('业务运营')
      ai.setRole('数据分析师')
      expect(ai.currentRole).toBe('数据分析师')
    })
  })

  describe('intent recognition (via sendQuestion + flushResponse)', () => {
    it('recognizes metric_query intent for numeric questions', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格指数是多少')
      ai.flushResponse()
      expect(ai.chatMessages[1].intent).toBe('metric_query')
    })

    it('recognizes answer intent for trend questions', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      expect(ai.chatMessages[1].intent).toBe('answer')
    })

    it('recognizes search intent for product search', () => {
      const ai = useAiStore()
      ai.sendQuestion('有没有看板推荐')
      ai.flushResponse()
      expect(ai.chatMessages[1].intent).toBe('search')
    })
  })

  describe('mixed content generation (答案与商品混排)', () => {
    it('produces text + product-card + source blocks for qaBank match', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      const blockTypes = aiMsg.blocks.map((b) => b.type)
      expect(blockTypes).toContain('text')
      expect(blockTypes).toContain('product-card')
      expect(blockTypes).toContain('source')
    })

    it('produces metric blocks for metric_query intent with qaBank match', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格指数是多少')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      expect(aiMsg.blocks.filter((b) => b.type === 'metric').length).toBeGreaterThan(0)
    })

    it('produces step blocks for process indication', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      expect(aiMsg.blocks.filter((b) => b.type === 'step').length).toBeGreaterThan(0)
    })

    it('falls back to product recommendations when qaBank misses', () => {
      const ai = useAiStore()
      ai.sendQuestion('活跃度')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      const blockTypes = aiMsg.blocks.map((b) => b.type)
      expect(blockTypes).toContain('text')
      // Should have at least one product-card from catalog search
      const productCards = aiMsg.blocks.filter((b) => b.type === 'product-card')
      expect(productCards.length).toBeGreaterThan(0)
    })

    it('uses generic follow-ups when qaBank misses', () => {
      const ai = useAiStore()
      ai.sendQuestion('活跃度')
      ai.flushResponse()
      expect(ai.chatFollowUps).toContain('查看全部商品')
    })

    it('includes role context in AI response text', () => {
      const ai = useAiStore()
      ai.setRole('数据分析师')
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const textBlocks = ai.chatMessages[1].blocks.filter((b) => b.type === 'text')
      expect(textBlocks.some((b) => b.content.includes('数据分析师'))).toBe(true)
    })
  })

  describe('backward compatibility', () => {
    it('ask() still works for old AnswerSession flow', () => {
      const ai = useAiStore()
      const session = ai.ask('货运价格趋势如何', 'auto')
      expect(session.id).toBeDefined()
      expect(session.question).toBe('货运价格趋势如何')
      expect(ai.sessions).toHaveLength(1)
    })

    it('unlock() still works for old session flow', () => {
      const ai = useAiStore()
      const session = ai.ask('货运价格趋势如何', 'auto')
      expect(session.paywalled).toBe(true)
      ai.unlock(session.id)
      const updated = ai.byId(session.id)
      expect(updated?.paywalled).toBe(false)
    })
  })

  describe('exported constants', () => {
    it('guideQuestions covers the eight data-finding scenarios', () => {
      expect(guideQuestions).toHaveLength(8)
      expect(guideQuestions[0]).toMatchObject({ icon: '📈', text: '货运价格趋势如何', intent: 'answer' })
    })

    it('roleOptions has 5 roles', () => {
      expect(roleOptions).toHaveLength(5)
      expect(roleOptions.map((r) => r.value)).toContain('业务运营')
      expect(roleOptions.map((r) => r.value)).toContain('数仓开发')
    })
  })
})
