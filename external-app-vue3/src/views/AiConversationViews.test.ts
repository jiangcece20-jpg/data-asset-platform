import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAiStore } from '@/stores/ai'
import AIFindData from './mobile/AIFindData.vue'
import PortalAiChat from './portal/PortalAiChat.vue'

async function mountAi(path: string, component: typeof AIFindData | typeof PortalAiChat, query?: Record<string, string>) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path, component }] })
  await router.push({ path, query })
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('V1.0.2 AI conversation views', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('opens an earlier conversation from the mobile history drawer', async () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('货运价格趋势如何')
    ai.flushResponse()
    const firstId = ai.activeConversationId
    ai.startNewConversation()
    const wrapper = await mountAi('/app/ai-find', AIFindData)
    await wrapper.get('[data-testid="ai-history-open"]').trigger('click')
    await wrapper.get(`[data-testid="ai-history-${firstId}"]`).trigger('click')
    expect(wrapper.text()).toContain('货运价格趋势如何')
    expect(ai.activeConversationId).toBe(firstId)
  })

  it('uses new conversation rather than clear history on PC', async () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('港口吞吐量看板')
    ai.flushResponse()
    const wrapper = await mountAi('/portal/ai-chat', PortalAiChat)
    expect(wrapper.text()).not.toContain('清空对话')
    await wrapper.get('[data-testid="new-chat"]').trigger('click')
    expect(ai.conversations).toHaveLength(1)
    expect(ai.chatMessages).toHaveLength(0)
    expect(ai.chatMessages).toHaveLength(0)
  })

  it('opens the same account conversation on PC after it was started in App', async () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('货运价格趋势如何')
    ai.flushResponse()
    const firstId = ai.activeConversationId
    ai.startNewConversation()

    const wrapper = await mountAi('/portal/ai-chat', PortalAiChat)
    await wrapper.get('[data-testid="ai-history-open"]').trigger('click')
    await wrapper.get(`[data-testid="ai-history-${firstId}"]`).trigger('click')
    expect(ai.activeConversationId).toBe(firstId)
    expect(wrapper.text()).toContain('货运价格趋势如何')
  })

  it('starts a separate conversation for a new search question without replacing history', async () => {
    const ai = useAiStore()
    ai.activateOwner('mem-1')
    ai.sendQuestion('港口吞吐量看板')
    ai.flushResponse()
    const previousId = ai.activeConversationId

    await mountAi('/app/ai-find', AIFindData, { q: '货运价格趋势如何' })
    expect(ai.conversations).toHaveLength(2)
    expect(ai.activeConversationId).not.toBe(previousId)
    expect(ai.chatMessages[0]?.blocks[0]).toMatchObject({ type: 'text', content: '货运价格趋势如何' })
    ai.flushResponse()
    ai.openConversation(previousId)
    expect(ai.chatMessages[0]?.blocks[0]).toMatchObject({ type: 'text', content: '港口吞吐量看板' })
  })
})
