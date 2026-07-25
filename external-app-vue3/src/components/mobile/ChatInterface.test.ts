import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ChatInterface from './ChatInterface.vue'
import { useCatalogStore } from '@/stores/catalog'
import { seedProducts } from '@/data/products'
import type { ChatMessage, GuideQuestion, RoleOption } from '@/types/aiChat'

const guides: GuideQuestion[] = [
  { icon: '📈', text: '货运价格趋势如何', intent: 'answer' },
  { icon: '🔍', text: '有没有资格核验类的数据产品', intent: 'search' },
]

const roleOptions: RoleOption[] = [
  { value: '业务运营', label: '业务运营', icon: '📊' },
  { value: '数据分析师', label: '数据分析师', icon: '🔬' },
]

function makeMessage(role: 'user' | 'ai', blocks: ChatMessage['blocks']): ChatMessage {
  return { id: `msg-${Math.random()}`, role, blocks, createdAt: '2026-07-17 10:00' }
}

function mountChat(props: Partial<InstanceType<typeof ChatInterface>['$props']> = {}) {
  return mount(ChatInterface, {
    props: {
      messages: [],
      guides,
      followUps: [],
      typing: false,
      role: '业务运营',
      roleOptions,
      ...props,
    },
  })
}

describe('ChatInterface', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const catalog = useCatalogStore()
    catalog.products = JSON.parse(JSON.stringify(seedProducts))
  })

  describe('empty state', () => {
    it('renders guide questions when no messages', () => {
      const wrapper = mountChat()
      expect(wrapper.text()).toContain('用自然语言找数据')
      expect(wrapper.text()).toContain('货运价格趋势如何')
      expect(wrapper.text()).toContain('有没有资格核验类的数据产品')
    })

    it('emits selectGuide when a guide is clicked', async () => {
      const wrapper = mountChat()
      const guideButtons = wrapper.findAll('button')
      const guideBtn = guideButtons.find((b) => b.text().includes('货运价格趋势如何'))
      await guideBtn?.trigger('click')
      expect(wrapper.emitted('selectGuide')).toBeTruthy()
      expect(wrapper.emitted('selectGuide')![0]).toEqual(['货运价格趋势如何'])
    })
  })

  describe('role selector', () => {
    it('renders role options', () => {
      const wrapper = mountChat()
      expect(wrapper.text()).toContain('📊 业务运营')
      expect(wrapper.text()).toContain('🔬 数据分析师')
    })

    it('emits changeRole when role is clicked', async () => {
      const wrapper = mountChat()
      const roleBtn = wrapper.findAll('button').find((b) => b.text().includes('数据分析师'))
      await roleBtn?.trigger('click')
      expect(wrapper.emitted('changeRole')).toBeTruthy()
      expect(wrapper.emitted('changeRole')![0]).toEqual(['数据分析师'])
    })
  })

  describe('messages rendering', () => {
    it('renders user message', () => {
      const msg = makeMessage('user', [{ type: 'text', content: '你好' }])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('你好')
    })

    it('renders AI text block', () => {
      const msg = makeMessage('ai', [{ type: 'text', content: '这是AI回答' }])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('这是AI回答')
    })

    it('renders step blocks', () => {
      const msg = makeMessage('ai', [
        { type: 'step', label: '解析问题', status: 'done' },
        { type: 'step', label: '检索元数据', status: 'done' },
      ])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('解析问题')
      expect(wrapper.text()).toContain('检索元数据')
    })

    it('renders metric blocks', () => {
      const msg = makeMessage('ai', [
        { type: 'metric', label: '货运价格指数', value: '108.6', change: '+0.4%', dir: 'up', period: '环比' },
      ])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('货运价格指数')
      expect(wrapper.text()).toContain('108.6')
      expect(wrapper.text()).toContain('+0.4%')
    })

    it('renders product-card block and emits navigateProduct on click', async () => {
      const msg = makeMessage('ai', [
        { type: 'product-card', productId: 'prod-freight-index', reason: '匹配"货运"关键词' },
      ])
      const wrapper = mountChat({ messages: [msg] })
      const product = seedProducts.find((p) => p.id === 'prod-freight-index')!
      expect(wrapper.text()).toContain(product.name)
      expect(wrapper.text()).toContain('匹配"货运"关键词')
      // Click the product card
      const card = wrapper.find('[class*="cursor-pointer"]')
      await card.trigger('click')
      expect(wrapper.emitted('navigateProduct')).toBeTruthy()
      expect(wrapper.emitted('navigateProduct')![0]).toEqual(['prod-freight-index'])
    })

    it('renders source block', () => {
      const msg = makeMessage('ai', [
        { type: 'source', title: '全国货运价格指数', productId: 'prod-freight-index', locked: false },
      ])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('全国货运价格指数')
      expect(wrapper.text()).toContain('📄')
    })

    it('renders locked source with lock icon', () => {
      const msg = makeMessage('ai', [
        { type: 'source', title: '锁定来源', locked: true },
      ])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('🔒')
      expect(wrapper.text()).toContain('锁定来源')
    })

    it('renders mixed content in a single AI message (答案与商品混排)', () => {
      const msg = makeMessage('ai', [
        { type: 'step', label: '解析问题', status: 'done' },
        { type: 'text', content: '根据你的角色，为你找到了以下分析结果：' },
        { type: 'text', content: '货运价格指数呈上涨趋势。' },
        { type: 'metric', label: '货运价格指数', value: '108.6', change: '+0.4%', dir: 'up', period: '环比' },
        { type: 'product-card', productId: 'prod-freight-index', reason: '匹配"货运"关键词' },
        { type: 'source', title: '全国货运价格指数', productId: 'prod-freight-index', locked: false },
      ])
      const wrapper = mountChat({ messages: [msg] })
      const text = wrapper.text()
      expect(text).toContain('解析问题')
      expect(text).toContain('根据你的角色')
      expect(text).toContain('货运价格指数呈上涨趋势')
      expect(text).toContain('108.6')
      expect(text).toContain('全国货运价格指数')
    })
  })

  describe('typing animation', () => {
    it('shows typing dots when typing is true', () => {
      const wrapper = mountChat({ typing: true })
      const typingEl = wrapper.find('.animate-bounce')
      expect(typingEl.exists()).toBe(true)
    })

    it('does not show typing dots when typing is false', () => {
      const wrapper = mountChat({ typing: false })
      const typingEl = wrapper.find('.animate-bounce')
      expect(typingEl.exists()).toBe(false)
    })
  })

  describe('follow-up chips', () => {
    it('renders follow-up chips when provided and not typing', () => {
      const wrapper = mountChat({ followUps: ['加上环比', '只看华东区'] })
      expect(wrapper.text()).toContain('加上环比')
      expect(wrapper.text()).toContain('只看华东区')
    })

    it('does not render follow-ups when typing', () => {
      const wrapper = mountChat({ followUps: ['加上环比'], typing: true })
      expect(wrapper.text()).not.toContain('加上环比')
    })

    it('emits selectFollowUp when a follow-up is clicked', async () => {
      const wrapper = mountChat({ followUps: ['加上环比'] })
      const fuBtn = wrapper.findAll('button').find((b) => b.text().includes('加上环比'))
      await fuBtn?.trigger('click')
      expect(wrapper.emitted('selectFollowUp')).toBeTruthy()
      expect(wrapper.emitted('selectFollowUp')![0]).toEqual(['加上环比'])
    })
  })

  describe('input area', () => {
    it('emits send when button is clicked with text', async () => {
      const wrapper = mountChat()
      const textarea = wrapper.find('textarea')
      await textarea.setValue('测试问题')
      const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('➤'))
      await sendBtn?.trigger('click')
      expect(wrapper.emitted('send')).toBeTruthy()
      expect(wrapper.emitted('send')![0]).toEqual(['测试问题'])
    })

    it('does not emit send when input is empty', async () => {
      const wrapper = mountChat()
      const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('➤'))
      await sendBtn?.trigger('click')
      expect(wrapper.emitted('send')).toBeFalsy()
    })

    it('clears input after send', async () => {
      const wrapper = mountChat()
      const textarea = wrapper.find('textarea')
      await textarea.setValue('测试问题')
      const sendBtn = wrapper.findAll('button').find((b) => b.text().includes('➤'))
      await sendBtn?.trigger('click')
      expect((textarea.element as HTMLTextAreaElement).value).toBe('')
    })
  })

  describe('reset button', () => {
    it('shows reset button when there are messages', () => {
      const msg = makeMessage('user', [{ type: 'text', content: '测试' }])
      const wrapper = mountChat({ messages: [msg] })
      expect(wrapper.text()).toContain('新对话')
    })

    it('emits reset when reset button is clicked', async () => {
      const msg = makeMessage('user', [{ type: 'text', content: '测试' }])
      const wrapper = mountChat({ messages: [msg] })
      const resetBtn = wrapper.findAll('button').find((b) => b.text().includes('新对话'))
      await resetBtn?.trigger('click')
      expect(wrapper.emitted('reset')).toBeTruthy()
    })
  })
})
