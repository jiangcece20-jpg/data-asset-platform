import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAiStore, guideQuestions, guideScenarios } from './ai'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { seedProducts } from '@/data/products'
import { seedEntitlements } from '@/data/seed'
import { useUserStore } from './user'
import type { AiConversation } from './ai'

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

describe('V1.0.2 AI conversation history', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const storageKey = (ownerId = 'mem-1') => `v102-ai-conversations:${encodeURIComponent(ownerId)}`
  const savedConversation = (index: number, ownerMemberId = 'mem-1'): AiConversation => {
    const stamp = `2026-10-01T00:${String(index).padStart(2, '0')}:00.000Z`
    return {
      id: `conversation-${index}`, ownerMemberId, title: `Question ${index}`,
      createdAt: stamp, updatedAt: stamp,
      messages: [{ id: `message-${index}`, role: 'user', createdAt: stamp, blocks: [{ type: 'text', content: `Question ${index}` }] }],
      followUps: [`Follow-up ${index}`]
    }
  }
  const storedHistory = (ownerId = 'mem-1'): { conversations: AiConversation[]; activeId: string } =>
    JSON.parse(localStorage.getItem(storageKey(ownerId)) || '{}')

  it.each([0, 1000])('retains the most recent 50 sent conversations with %i ms between sends', (interval) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T00:00:00.000Z'))
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    const ids: string[] = []
    for (let index = 0; index < 51; index += 1) {
      vi.advanceTimersByTime(interval)
      ai.startNewConversation()
      ai.sendQuestion(`Question ${index}`)
      ids.push(ai.activeConversationId)
      ai.flushResponse()
      expect(ai.conversations).toHaveLength(Math.min(index + 1, 50))
    }

    expect(ai.conversationList.map((item) => item.id)).toEqual(ids.slice(1).reverse())
    expect(storedHistory().conversations.map((item) => item.id)).toEqual(ids.slice(1).reverse())
    expect(storedHistory().activeId).toBe(ids[50])
    ai.openConversation(ids[0])
    expect(ai.activeConversationId).toBe(ids[50])

    setActivePinia(createPinia())
    const reloaded = useAiStore()
    reloaded.activateOwner('mem-1')
    expect(reloaded.conversations).toHaveLength(50)
    expect(reloaded.activeConversationId).toBe(ids[50])
  })

  it('trims old saved history by activity on load and rewrites an evicted active selection', () => {
    const conversations = Array.from({ length: 53 }, (_, index) => savedConversation(index))
    conversations[0].updatedAt = '2026-10-02T00:00:00.000Z'
    const empty = { ...savedConversation(54), messages: [], updatedAt: '2026-10-03T00:00:00.000Z' }
    localStorage.setItem(storageKey(), JSON.stringify({
      conversations: [empty, savedConversation(55, 'mem-2'), ...conversations], activeId: 'conversation-1'
    }))

    const ai = useAiStore()
    ai.activateOwner('mem-1')
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversationList[0].id).toBe('conversation-0')
    expect(ai.conversationList[49].id).toBe('conversation-4')
    expect(ai.conversations.some((item) => ['conversation-1', 'conversation-2', 'conversation-3', 'conversation-54', 'conversation-55'].includes(item.id))).toBe(false)
    expect(ai.activeConversationId).toBe('conversation-0')
    expect(ai.chatMessages).toEqual(conversations[0].messages)
    expect(ai.chatFollowUps).toEqual(conversations[0].followUps)
    expect(storedHistory().conversations).toEqual(ai.conversationList)
    expect(storedHistory().activeId).toBe('conversation-0')
  })

  it.each(['conversation-0', 'conversation-51'])('trims on persist without leaving an evicted active record: %s', (activeId) => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.conversations = Array.from({ length: 52 }, (_, index) => savedConversation(index))
    const active = ai.conversations.find((item) => item.id === activeId)!
    ai.activeConversationId = activeId
    ai.chatMessages = [...active.messages]
    ai.chatFollowUps = [...active.followUps]
    ai.persistHistory()

    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversationList[0].id).toBe('conversation-51')
    expect(ai.conversationList[49].id).toBe('conversation-2')
    const evicted = activeId === 'conversation-0'
    expect(ai.activeConversationId).toBe(evicted ? '' : activeId)
    expect(ai.chatMessages).toEqual(evicted ? [] : active.messages)
    expect(ai.chatFollowUps).toEqual(evicted ? [] : active.followUps)
    expect(storedHistory().conversations).toEqual(ai.conversationList)
    expect(storedHistory().activeId).toBe(ai.activeConversationId)
  })

  it('does not count or evict history for an empty unsent new conversation at capacity', () => {
    localStorage.setItem(storageKey(), JSON.stringify({
      conversations: Array.from({ length: 50 }, (_, index) => savedConversation(index)), activeId: 'conversation-49'
    }))
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    for (let index = 0; index < 3; index += 1) {
      ai.startNewConversation()
      ai.sendQuestion('   ')
    }
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversations.some((item) => item.id === 'conversation-0')).toBe(true)
    expect(ai.activeConversationId).toBe('')
    expect(ai.chatMessages).toHaveLength(0)
    expect(storedHistory().conversations).toHaveLength(50)
    expect(storedHistory().activeId).toBe('')

    ai.sendQuestion('First sent question')
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversations.some((item) => item.id === 'conversation-0')).toBe(false)
    expect(ai.conversations.some((item) => item.id === ai.activeConversationId)).toBe(true)
    ai.flushResponse()
  })

  it('limits conversations rather than messages in a continued conversation', () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    for (let index = 0; index < 60; index += 1) {
      ai.sendQuestion(`Question ${index}`)
      ai.flushResponse()
    }
    expect(ai.conversations).toHaveLength(1)
    expect(ai.chatMessages).toHaveLength(120)
    expect(storedHistory().conversations[0].messages).toHaveLength(120)
  })

  it('refreshes old conversation activity within the same minute and evicts the next oldest', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-14T00:00:55.000Z'))
    const conversations = Array.from({ length: 50 }, (_, index) => savedConversation(index))
    conversations.forEach((item, index) => {
      item.updatedAt = new Date(Date.UTC(2026, 9, 14, 0, 0, index)).toISOString()
    })
    const legacyTime = new Date('2026-10-14T00:00:00.000Z')
    const pad = (value: number) => String(value).padStart(2, '0')
    conversations[0].updatedAt = `${legacyTime.getFullYear()}-${pad(legacyTime.getMonth() + 1)}-${pad(legacyTime.getDate())} ${pad(legacyTime.getHours())}:${pad(legacyTime.getMinutes())}`
    localStorage.setItem(storageKey(), JSON.stringify({ conversations, activeId: 'conversation-49' }))
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.openConversation('conversation-0')
    expect(ai.conversations.find((item) => item.id === 'conversation-0')!.updatedAt).toBe(conversations[0].updatedAt)
    ai.sendQuestion('Continue old conversation')
    expect(new Date(ai.conversations.find((item) => item.id === 'conversation-0')!.updatedAt).getTime()).toBe(Date.now())
    expect(ai.conversationList[0].id).toBe('conversation-0')
    ai.flushResponse()

    vi.advanceTimersByTime(1000)
    ai.startNewConversation()
    ai.sendQuestion('New conversation')
    ai.flushResponse()
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversations.some((item) => item.id === 'conversation-1')).toBe(false)
    expect(ai.conversations.find((item) => item.id === 'conversation-0')!.messages).toHaveLength(3)
    expect(storedHistory().conversations.some((item) => item.id === 'conversation-0')).toBe(true)
  })

  it('applies the cap separately to each account without rewriting another account history', () => {
    for (const ownerId of ['mem-1', 'mem-2']) {
      localStorage.setItem(storageKey(ownerId), JSON.stringify({
        conversations: Array.from({ length: 51 }, (_, index) => savedConversation(index, ownerId)),
        activeId: 'conversation-50'
      }))
    }
    const secondAccountHistory = localStorage.getItem(storageKey('mem-2'))
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    expect(ai.conversations).toHaveLength(50)
    expect(localStorage.getItem(storageKey('mem-2'))).toBe(secondAccountHistory)
    ai.startNewConversation()
    ai.sendQuestion('Account one question')
    ai.flushResponse()
    const firstAccountHistory = localStorage.getItem(storageKey())

    ai.activateOwner('mem-2')
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversations.every((item) => item.ownerMemberId === 'mem-2')).toBe(true)
    expect(ai.chatMessages[0].blocks[0]).toMatchObject({ content: 'Question 50' })
    ai.startNewConversation()
    ai.sendQuestion('Account two question')
    ai.flushResponse()
    expect(localStorage.getItem(storageKey())).toBe(firstAccountHistory)

    ai.activateOwner('mem-1')
    expect(ai.conversations).toHaveLength(50)
    expect(ai.conversations.every((item) => item.ownerMemberId === 'mem-1')).toBe(true)
    expect(ai.chatMessages[0].blocks[0]).toMatchObject({ content: 'Account one question' })
  })

  it('keeps prior conversations when starting a new one and resumes follow-up in the selected conversation', () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('货运价格趋势如何')
    ai.flushResponse()
    const firstId = ai.activeConversationId

    ai.startNewConversation()
    expect(ai.chatMessages).toHaveLength(0)
    expect(ai.conversations).toHaveLength(1)
    ai.sendQuestion('港口吞吐量看板')
    ai.flushResponse()
    expect(ai.conversations).toHaveLength(2)

    ai.openConversation(firstId)
    expect(ai.chatMessages[0].blocks[0]).toMatchObject({ type: 'text', content: '货运价格趋势如何' })
    ai.sendQuestion('近三个月呢')
    ai.flushResponse()
    expect(ai.chatMessages.filter((message) => message.role === 'user')).toHaveLength(2)
  })

  it('restores the same account after reload and does not expose it to another account', () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('我的历史问题')
    ai.flushResponse()

    setActivePinia(createPinia())
    const reloaded = useAiStore()
    reloaded.activateOwner('mem-1')
    expect(reloaded.conversations).toHaveLength(1)
    expect(reloaded.chatMessages[0].blocks[0]).toMatchObject({ type: 'text', content: '我的历史问题' })

    useUserStore().context.currentMemberId = 'mem-2'
    reloaded.activateOwner('mem-2')
    expect(reloaded.conversations).toHaveLength(0)
    expect(reloaded.chatMessages).toHaveLength(0)
    reloaded.activateOwner('mem-1')
    expect(reloaded.conversations).toHaveLength(1)
  })
})
