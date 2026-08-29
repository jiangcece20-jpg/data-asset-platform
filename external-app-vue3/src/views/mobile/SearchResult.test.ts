import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import SearchResult from './SearchResult.vue'
import AnswerResult from './AnswerResult.vue'

async function mountSearch(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/search', component: SearchResult }]
  })
  await router.push({ path: '/app/search', query })
  await router.isReady()
  return mount(SearchResult, { global: { plugins: [router] } })
}

async function mountAnswer(query: Record<string, string>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/answer', component: AnswerResult },
      { path: '/app/search', component: SearchResult }
    ]
  })
  await router.push({ path: '/app/answer', query })
  await router.isReady()
  return mount(AnswerResult, { global: { plugins: [router] } })
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
    expect(venues.text()).toContain('本平台')
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
})

describe('SearchResult routing phase 1', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows route 1 badge and match explain for keyword search', async () => {
    const wrapper = await mountSearch({ q: '货运', entry: 'keyword' })
    await flushPromises()
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('路由 1')
    expect(wrapper.find('[data-testid="match-explain"]').exists()).toBe(true)
  })

  it('offers AI upgrade when keyword search is empty', async () => {
    const wrapper = await mountSearch({ q: 'zzzznotfound999', entry: 'keyword' })
    await flushPromises()
    expect(wrapper.get('[data-testid="upgrade-ai-cta"]').text()).toContain('AI 问答')
  })
})

describe('AnswerResult routing phase 1', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows route 2 badge for processing queries from AI entry', async () => {
    const wrapper = await mountAnswer({ q: '近三个月货运价格趋势如何', entry: 'ai' })
    await flushPromises()
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('路由 2')
  })

  it('shows route 3 external zone for policy-style queries', async () => {
    const wrapper = await mountAnswer({ q: 'PVC 行业最新限产政策', entry: 'ai' })
    await flushPromises()
    expect(wrapper.get('[data-testid="route-badge"]').text()).toContain('路由 3')
    expect(wrapper.get('[data-testid="external-banner"]').text()).toContain('数据出域')
  })

  it('downgrades to keyword search via platform-only button', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/answer', component: AnswerResult },
        { path: '/app/search', component: SearchResult }
      ]
    })
    await router.push({ path: '/app/answer', query: { q: '货运价格', entry: 'ai' } })
    await router.isReady()
    const wrapper = mount(AnswerResult, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('[data-testid="downgrade-keyword"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/search')
    expect(router.currentRoute.value.query.entry).toBe('keyword')
  })
})
