import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import SearchResult from './SearchResult.vue'

async function mountSearch(query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/search', component: SearchResult }]
  })
  await router.push({ path: '/app/search', query })
  await router.isReady()
  return mount(SearchResult, { global: { plugins: [router] } })
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
