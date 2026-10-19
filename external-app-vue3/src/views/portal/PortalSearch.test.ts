import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import PortalSearch from './PortalSearch.vue'
import PortalAiChat from './PortalAiChat.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'

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

  it('uses the unified self-operated product label in source filters', async () => {
    const { wrapper } = await mountSearch()
    await wrapper.findAll('button').find((button) => button.text().trim() === '来源')!.trigger('click')
    expect(wrapper.text()).toContain('自营产品')
    expect(wrapper.text()).not.toContain('本平台')
  })

  it.each(['长卡视图', '豆腐块视图'])('hides trusted dataset samples and keeps real self/merchant samples in %s', async (view) => {
    const catalog = useCatalogStore()
    const base = catalog.byId('prod-public-freight-dataset')!
    catalog.products = [
      { ...base, id: 'trusted-sample', name: '可信测试数据集', origin: 'trusted_space', dealChannel: 'space_purchase', hasSampleData: true },
      { ...base, id: 'self-sample', name: '自营测试数据集', origin: 'asset_platform', dealChannel: 'app_payment', hasSampleData: true },
      { ...base, id: 'seller-sample', name: '商家测试数据集', origin: 'seller_market', dealChannel: 'app_payment', hasSampleData: true },
      { ...base, id: 'no-sample', name: '无样例测试数据集', origin: 'app_content', dealChannel: 'app_payment', hasSampleData: false }
    ]
    catalog.resources = []
    const { wrapper } = await mountSearch()
    await wrapper.get(`button[aria-label="${view}"]`).trigger('click')
    const cards = wrapper.findAll('.group')
    expect(cards).toHaveLength(4)
    for (const [name, expected] of [['可信测试数据集', false], ['自营测试数据集', true], ['商家测试数据集', true], ['无样例测试数据集', false]] as const) {
      expect(cards.find((card) => card.text().includes(name))!.text().includes('有样例')).toBe(expected)
    }
  })

  it('keeps only the useful discovery filters and price sorting', async () => {
    const { wrapper } = await mountSearch()
    const toolbar = wrapper.get('[data-testid="portal-filter-toolbar"]')
    const buttonLabels = toolbar.findAll('button').map((button) => button.text().trim())
    expect(toolbar.text()).not.toContain('业务目录')
    expect(toolbar.text()).toContain('来源')
    expect(toolbar.text()).toContain('我可使用')
    expect(buttonLabels).not.toContain('价格')
    expect(buttonLabels).not.toContain('数据规模')
    expect(buttonLabels).not.toContain('更新频率')
    expect(buttonLabels).not.toContain('供应商')
    expect(wrapper.text()).toContain('价格 ↑')
  })

  it('filters to products usable by the current enterprise', async () => {
    useUserStore().completeEnterpriseAuth()
    useEntitlementStore().grantTeamMember()
    const user = useUserStore()
    useEntitlementStore().list.push({ id: 'snapshot-only', productId: 'prod-private-zero-dataset', type: 'dataset',
      source: 'enterprise', ownerId: user.context.currentEnterpriseId!, enterpriseId: user.context.currentEnterpriseId!,
      status: 'active', validFrom: '1999-01-01', updateValidTo: '2000-01-01', accessScope: 'enterprise_wide' })
    const catalog = useCatalogStore()
    catalog.products = catalog.products.filter((product) =>
      product.id === 'prod-public-freight-dataset' || product.id === 'prod-private-zero-dataset'
    )
    const { wrapper } = await mountSearch()
    expect(wrapper.text()).toContain('全国货运公开数据集')
    expect(wrapper.text()).toContain('企业货运指标体验数据集')
    await wrapper.get('[data-testid="portal-usable-filter"]').trigger('click')
    expect(wrapper.text()).toContain('全国货运公开数据集')
    expect(wrapper.text()).not.toContain('企业货运指标体验数据集')
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
