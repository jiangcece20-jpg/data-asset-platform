import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore, guideQuestions, guideScenarios } from './ai'
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

  describe('mixed content generation', () => {
    it('produces structured answer + table + product-card for qaBank match', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      const blockTypes = aiMsg.blocks.map((b) => b.type)
      expect(blockTypes).toContain('product-card')
      expect(blockTypes).toContain('route-badge')
      expect(blockTypes).toContain('text')
      expect(blockTypes).toContain('metric')
      expect(blockTypes).toContain('table')
    })

    it('attaches process steps to the ai message', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      expect(aiMsg.steps?.length).toBeGreaterThan(0)
      expect(aiMsg.steps?.[0].label).toBe('解析问题意图')
    })

    it('uses short route labels without role wording', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      const badge = ai.chatMessages[1].blocks.find((b) => b.type === 'route-badge')
      expect(badge && badge.type === 'route-badge' && badge.label).toBe('平台内')
    })

    it('shows metric blocks and table for metric_query', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格指数是多少')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      expect(aiMsg.blocks.filter((b) => b.type === 'metric').length).toBeGreaterThan(0)
      expect(aiMsg.blocks.some((b) => b.type === 'table')).toBe(true)
      expect(aiMsg.blocks.some((b) => b.type === 'product-card')).toBe(true)
    })

    it('returns a compare block for compare intent', () => {
      const ai = useAiStore()
      ai.sendQuestion('对比两款资质核验 API')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      expect(aiMsg.intent).toBe('compare')
      const cmp = aiMsg.blocks.find((b) => b.type === 'product-compare')
      expect(cmp).toBeTruthy()
      expect(cmp && cmp.type === 'product-compare' && cmp.productIds).toHaveLength(2)
    })

    it('falls back to product recommendations when qaBank misses', () => {
      const ai = useAiStore()
      ai.sendQuestion('活跃度')
      ai.flushResponse()
      const aiMsg = ai.chatMessages[1]
      const blockTypes = aiMsg.blocks.map((b) => b.type)
      expect(blockTypes).not.toContain('text')
      const productCards = aiMsg.blocks.filter((b) => b.type === 'product-card')
      expect(productCards.length).toBeGreaterThan(0)
    })

    it('uses generic follow-ups when qaBank misses', () => {
      const ai = useAiStore()
      ai.sendQuestion('活跃度')
      ai.flushResponse()
      expect(ai.chatFollowUps).toContain('换个问法')
      expect(ai.chatFollowUps).toContain('提交需求')
    })

    it('shows external zone for external_exploration', () => {
      const ai = useAiStore()
      ai.sendQuestion('PVC 行业最新限产政策')
      ai.flushResponse()
      const types = ai.chatMessages[1].blocks.map((b) => b.type)
      expect(types).toContain('external-zone')
      const badge = ai.chatMessages[1].blocks.find((b) => b.type === 'route-badge')
      expect(badge && badge.type === 'route-badge' && badge.label).toBe('含外网')
    })
  })

  describe('regenerateLast', () => {
    it('replaces the last ai message and re-enters typing', () => {
      const ai = useAiStore()
      ai.sendQuestion('货运价格趋势如何')
      ai.flushResponse()
      expect(ai.regenerateLast()).toBe(true)
      expect(ai.chatTyping).toBe(true)
      expect(ai.chatMessages.filter((m) => m.role === 'ai')).toHaveLength(0)
      ai.flushResponse()
      expect(ai.chatMessages.filter((m) => m.role === 'ai')).toHaveLength(1)
    })

    it('returns false when the last message is not ai', () => {
      const ai = useAiStore()
      ai.sendQuestion('测试')
      expect(ai.regenerateLast()).toBe(false)
      expect(ai.chatTyping).toBe(true)
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
    it('guideScenarios cover find/market/compare and flatten to guideQuestions', () => {
      expect(guideScenarios.map((s) => s.key)).toEqual(['find', 'market', 'compare'])
      expect(guideQuestions.length).toBe(7)
      expect(guideQuestions[0]).toMatchObject({ icon: '🪪', text: '司机资格核验 API', intent: 'search' })
      expect(guideQuestions.some((g) => g.intent === 'compare')).toBe(true)
    })
  })
})
