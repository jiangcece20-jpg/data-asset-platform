import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import DiscoverHome from './DiscoverHome.vue'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useDemoConversation } from '@/components/ai-v104/demoConversation'

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
    localStorage.removeItem('ai-v104-mobile-mode')
    vi.useFakeTimers()
    useDemoConversation('mobile').newSession()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('shows keyword search panel by default with showcase cards', async () => {
    const { wrapper } = await mountDiscover()
    expect(wrapper.get('[data-testid="discover-keyword-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discover-ai-panel"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('数据来源样例')
    expect(wrapper.text()).toContain('全国货运价格指数')
  })

  it('uses the unified self-operated product label in source filters', async () => {
    const { wrapper } = await mountDiscover()
    await wrapper.get('[data-testid="discover-filter-button"]').trigger('click')
    expect(wrapper.text()).toContain('自营产品')
    expect(wrapper.text()).not.toContain('App自有内容')
  })

  it('filters to products usable by the current enterprise', async () => {
    useUserStore().completeEnterpriseAuth()
    useEntitlementStore().grantTeamMember()
    const user = useUserStore()
    useEntitlementStore().list.push({ id: 'snapshot-only', productId: 'prod-private-zero-dataset', type: 'dataset',
      source: 'enterprise', ownerId: user.context.currentEnterpriseId!, enterpriseId: user.context.currentEnterpriseId!,
      status: 'active', validFrom: '1999-01-01', updateValidTo: '2000-01-01', accessScope: 'enterprise_wide' })
    const { wrapper } = await mountDiscover()
    expect(wrapper.text()).toContain('全国货运公开数据集')
    expect(wrapper.text()).toContain('企业货运指标体验数据集')
    expect(wrapper.find('[data-testid="discover-usable-filter"]').exists()).toBe(false)
    await wrapper.get('[data-testid="discover-filter-button"]').trigger('click')
    expect(document.body.textContent).toContain('使用范围')
    expect(document.body.textContent).not.toContain('类型全部数据集')
    document.body.querySelector<HTMLElement>('[data-testid="discover-usable-only"]')!.click()
    document.body.querySelector<HTMLElement>('[data-testid="discover-filter-apply"]')!.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('全国货运公开数据集')
    expect(wrapper.text()).not.toContain('企业货运指标体验数据集')
    expect(wrapper.get('[data-testid="discover-filter-count"]').text()).toBe('1')
  })

  it('opens the interactive AI prototype inside discover without navigating', async () => {
    const { wrapper, router } = await mountDiscover()
    await wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    expect(router.currentRoute.value.path).toBe('/app/discover')
    expect(wrapper.get('[data-testid="discover-ai-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="discover-keyword-panel"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="prototype-user-screen"]').text()).toContain('你想找什么数据')
    expect(wrapper.text()).not.toContain('数据来源样例')
  })

  it('carries the usable filter and type into keyword results', async () => {
    const { wrapper, router } = await mountDiscover()
    await wrapper.get('[data-testid="discover-filter-button"]').trigger('click')
    document.body.querySelector<HTMLElement>('[data-testid="discover-usable-only"]')!.click()
    document.body.querySelector<HTMLElement>('[data-testid="discover-filter-apply"]')!.click()
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button').find((button) => button.text() === '数据集')!.trigger('click')
    const input = wrapper.get('input[placeholder="搜索商品名称、场景或关键词"]')
    await input.setValue('货运')
    await input.trigger('keydown.enter')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/search')
    expect(router.currentRoute.value.query).toMatchObject({ q: '货运', type: 'dataset', usable: '1' })
  })

  it('does not auto-send keyword text and preserves it when returning', async () => {
    const { wrapper, router } = await mountDiscover()
    await wrapper.get('input[placeholder="搜索商品名称、场景或关键词"]').setValue('煤炭运价')
    await wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    expect(wrapper.find('[data-testid="prototype-user-question"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="prototype-product-list"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="返回关键词找数"]').trigger('click')
    expect(router.currentRoute.value.path).toBe('/app/discover')
    expect(wrapper.get<HTMLInputElement>('input[placeholder="搜索商品名称、场景或关键词"]').element.value).toBe('煤炭运价')
  })

  it('supports optional review scenes alongside the interactive conversation', async () => {
    const { wrapper } = await mountDiscover()
    await wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    await wrapper.get('[data-testid="prototype-scene-select"]').setValue('timeout')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.get('[data-testid="prototype-user-screen"]').text()).toContain('本批未完成')
    expect(wrapper.find('[data-testid="prototype-product-list"]').exists()).toBe(false)
    await wrapper.get('[data-testid="prototype-scene-select"]').setValue('result')
    await vi.runAllTimersAsync()
    await flushPromises()
    expect(wrapper.get('[data-testid="prototype-product-list"]').text()).toContain('煤炭公路运价明细数据集')
  })
  it('restores AI mode and the same conversation after remount without sending again', async () => {
    const first = await mountDiscover()
    await first.wrapper.get('[data-testid="discover-mode-ai"]').trigger('click')
    await first.wrapper.get('textarea[aria-label="描述数据需求"]').setValue('找2025年煤炭运价')
    await first.wrapper.get('form.composer-box').trigger('submit')
    const sessionId = useDemoConversation('mobile').session.id
    first.wrapper.unmount()
    const next = await mountDiscover()
    expect(next.wrapper.find('[data-testid="discover-ai-panel"]').exists()).toBe(true)
    expect(useDemoConversation('mobile').session.id).toBe(sessionId)
    expect(useDemoConversation('mobile').session.frames).toHaveLength(1)
    await vi.runAllTimersAsync(); await flushPromises()
    await next.wrapper.get('[aria-label="返回关键词找数"]').trigger('click')
    next.wrapper.unmount()
    const last = await mountDiscover()
    expect(last.wrapper.find('[data-testid="discover-keyword-panel"]').exists()).toBe(true)
    last.wrapper.unmount()
  })

})
