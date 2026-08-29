import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PortalSearch from './PortalSearch.vue'
import PortalAiChat from './PortalAiChat.vue'

async function mountSearch(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/portal/search', component: PortalSearch },
      { path: '/portal/ai-chat', component: PortalAiChat }
    ]
  })
  await router.push({ path: '/portal/search', query })
  await router.isReady()
  return { wrapper: mount(PortalSearch, { global: { plugins: [router] } }), router }
}

describe('PortalSearch keyword-only', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows route 1 badge and no inline AI answer panel', async () => {
    const { wrapper } = await mountSearch({ q: '货运' })
    await flushPromises()
    expect(wrapper.get('[data-testid="portal-keyword-search"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('关键词')
    expect(wrapper.text()).not.toContain('🤖 AI回答')
  })

  it('redirects legacy mode=ai to portal ai-chat', async () => {
    const { router } = await mountSearch({ mode: 'ai', q: '货运价格' })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/ai-chat')
  })

  it('offers AI upgrade when keyword empty', async () => {
    const { wrapper } = await mountSearch({ q: 'zzzznotfound999' })
    await flushPromises()
    expect(wrapper.get('[data-testid="upgrade-ai-cta"]').text()).toContain('AI 问答')
  })

  it('lists products by default when query is empty', async () => {
    const { wrapper } = await mountSearch()
    await flushPromises()
    expect(wrapper.text()).toMatch(/共 \d+ 条结果/)
  })
})

describe('PortalAiChat', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders dedicated chat shell and can downgrade to keyword search', async () => {
    vi.useFakeTimers()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/portal/ai-chat', component: PortalAiChat },
        { path: '/portal/search', component: PortalSearch }
      ]
    })
    await router.push({ path: '/portal/ai-chat', query: { q: '货运价格', entry: 'ai' } })
    await router.isReady()
    const wrapper = mount(PortalAiChat, { global: { plugins: [router] } })
    await flushPromises()
    vi.advanceTimersByTime(700)
    await flushPromises()

    expect(wrapper.get('[data-testid="portal-ai-chat"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="route-badge"]').text()).toMatch(/平台内|含外网/)
    await wrapper.get('[data-testid="downgrade-keyword"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/portal/search')
    vi.useRealTimers()
  })
})
