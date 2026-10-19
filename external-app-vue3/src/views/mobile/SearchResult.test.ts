import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { useEntitlementStore } from '@/stores/entitlements'
import ProductCard from '@/components/mobile/ProductCard.vue'
import SearchResult from './SearchResult.vue'
import AIFindData from './AIFindData.vue'

async function mountSearch(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/search', component: SearchResult },
      { path: '/app/ai-find', component: AIFindData }
    ]
  })
  await router.push({ path: '/app/search', query })
  await router.isReady()
  return mount(SearchResult, { global: { plugins: [router] } })
}

async function mountAiFind(query: Record<string, string> = {}) {
  vi.useFakeTimers()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/ai-find', component: AIFindData },
      { path: '/app/search', component: SearchResult }
    ]
  })
  await router.push({ path: '/app/ai-find', query })
  await router.isReady()
  const wrapper = mount(AIFindData, { global: { plugins: [router] } })
  await flushPromises()
  vi.advanceTimersByTime(700)
  await flushPromises()
  return { wrapper, router }
}

describe('SearchResult filters', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('uses two dropdowns for type and venue', async () => {
    const wrapper = await mountSearch()
    await flushPromises()
    const types = wrapper.get('[data-testid="filter-types"]')
    const venues = wrapper.get('[data-testid="filter-venues"]')

    expect(types.element.tagName).toBe('SELECT')
    expect(venues.element.tagName).toBe('SELECT')
    expect(wrapper.find('[data-testid="filter-ops"]').exists()).toBe(false)
    expect(venues.text()).toContain(OWNED_SPACE_NAME)
    expect(venues.text()).toContain('自营产品')
    expect(venues.text()).toContain('陈静')
    expect(venues.text()).not.toContain('自有')
    expect(venues.text()).not.toContain('互联')
    expect(wrapper.text()).not.toContain('全部运营')
    expect(wrapper.text()).not.toContain('全部归属')
    expect(wrapper.text()).not.toContain('APP 支付')
    expect(wrapper.text()).not.toContain('全部来源')
    expect(wrapper.find('[data-testid="filter-has-sample"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filter-has-trial-api"]').exists()).toBe(false)
  })

  it('does not bring sample filters back after choosing a type', async () => {
    const wrapper = await mountSearch()
    await flushPromises()
    await wrapper.get('[data-testid="filter-types"]').setValue('dataset')
    expect(wrapper.find('[data-testid="filter-has-sample"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filter-has-trial-api"]').exists()).toBe(false)
  })

  it.each(['asset_platform', 'app_content'])('uses one self-operated label and query for legacy origin %s', async (origin) => {
    const catalog = useCatalogStore()
    const base = catalog.byId('prod-public-freight-dataset')!
    catalog.products = [
      { ...base, id: 'asset-origin', origin: 'asset_platform' },
      { ...base, id: 'content-origin', origin: 'app_content' },
      { ...base, id: 'trusted-origin', origin: 'trusted_space', dealChannel: 'space_purchase' }
    ]
    catalog.resources = []
    const wrapper = await mountSearch({ origin })
    expect(wrapper.text()).toContain('来源：自营产品')
    expect(wrapper.text()).not.toContain('资产平台')
    expect(wrapper.findAllComponents(ProductCard).map((card) => card.props('product').id).sort()).toEqual(['asset-origin', 'content-origin'])
  })

  it('ignores the excluded directory filter and retains usable, keyword, type and source filters', async () => {
    useUserStore().completeEnterpriseAuth()
    useEntitlementStore().grantTeamMember()
    const user = useUserStore()
    useEntitlementStore().list.push({ id: 'snapshot-only', productId: 'prod-private-zero-dataset', type: 'dataset',
      source: 'enterprise', ownerId: user.context.currentEnterpriseId!, enterpriseId: user.context.currentEnterpriseId!,
      status: 'active', validFrom: '1999-01-01', updateValidTo: '2000-01-01', accessScope: 'enterprise_wide' })
    const wrapper = await mountSearch({ q: '货运', type: 'dataset', venue: 'platform', usable: '1', directory: '不存在的目录' })
    await flushPromises()
    expect(wrapper.find('[data-testid="mobile-business-directory"]').exists()).toBe(false)
    expect((wrapper.get('[data-testid="mobile-usable-filter"]').element as HTMLInputElement).checked).toBe(true)
    const cards = wrapper.findAllComponents(ProductCard)
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.some((card) => card.props('product').id === 'prod-public-freight-dataset')).toBe(true)
    expect(cards.some((card) => card.props('product').id === 'prod-private-zero-dataset')).toBe(false)
    expect(cards.every((card) => card.props('product').type === 'dataset')).toBe(true)
    await wrapper.get('[data-testid="mobile-usable-filter"]').setValue(false)
    await flushPromises()
    expect(wrapper.findAllComponents(ProductCard).some((card) => card.props('product').id === 'prod-private-zero-dataset')).toBe(true)
  })
})

describe('SearchResult routing phase 1', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows route 1 badge and match explain for keyword search', async () => {
    const wrapper = await mountSearch({ q: '货运', entry: 'keyword' })
    await flushPromises()
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('关键词')
    expect(wrapper.find('[data-testid="match-explain"]').exists()).toBe(true)
  })

  it('offers AI upgrade when keyword search is empty', async () => {
    const wrapper = await mountSearch({ q: 'zzzznotfound999', entry: 'keyword' })
    await flushPromises()
    expect(wrapper.get('[data-testid="upgrade-ai-cta"]').text()).toContain('AI 问答')
  })
})

describe('AIFindData dedicated chat page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-asks and shows route 2 badge for processing queries', async () => {
    const { wrapper } = await mountAiFind({ q: '近三个月货运价格趋势如何', entry: 'ai' })
    expect(wrapper.get('[data-testid="ai-find-page"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('平台内')
  })

  it('shows route 3 external zone for policy-style queries', async () => {
    const { wrapper } = await mountAiFind({ q: 'PVC 行业最新限产政策', entry: 'ai' })
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('含外网')
    expect(wrapper.get('[data-testid="external-zone"]').text()).toContain('来自外网')
  })

  it('downgrades to keyword search via platform-only button', async () => {
    const { wrapper, router } = await mountAiFind({ q: '货运价格', entry: 'ai' })
    await wrapper.get('[data-testid="downgrade-keyword"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/search')
    expect(router.currentRoute.value.query.entry).toBe('keyword')
  })
})
