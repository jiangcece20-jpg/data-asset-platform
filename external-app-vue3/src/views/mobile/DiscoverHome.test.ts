import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import DiscoverHome from './DiscoverHome.vue'

async function mountDiscover() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/discover', component: DiscoverHome },
      { path: '/app/search', component: { template: '<div />' } },
      { path: '/app/product/:id', component: { template: '<div />' } }
    ]
  })
  await router.push('/app/discover')
  await router.isReady()
  return { wrapper: mount(DiscoverHome, { global: { plugins: [router] } }), router }
}

describe('DiscoverHome', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows keyword search panel by default with showcase cards', async () => {
    const { wrapper } = await mountDiscover()
    expect(wrapper.get('[data-testid="discover-keyword-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discover-ai-panel"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('数据来源样例')
    expect(wrapper.text()).toContain('全国货运价格指数')
  })

  it('switches to embedded chat panel in AI mode', async () => {
    const { wrapper } = await mountDiscover()
    await wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    expect(wrapper.get('[data-testid="discover-ai-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discover-keyword-panel"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('用自然语言找数')
    expect(wrapper.text()).not.toContain('数据来源样例')
  })

  it('sends AI question inline without leaving discover tab', async () => {
    const { wrapper } = await mountDiscover()
    await wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    const textarea = wrapper.get('[data-testid="discover-ai-panel"] textarea')
    await textarea.setValue('近三个月货运价格趋势如何')
    await wrapper.get('[data-testid="chat-send"]').trigger('click')
    vi.advanceTimersByTime(700)
    await flushPromises()
    expect(wrapper.get('[data-testid="user-message"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('平台内')
  })
})
