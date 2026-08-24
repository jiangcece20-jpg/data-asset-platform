import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { OWNED_SPACE_NAME } from '@/domain/spaceIntent'
import SearchResult from './SearchResult.vue'

async function mountSearch() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/search', component: SearchResult }]
  })
  await router.push('/app/search')
  await router.isReady()
  return mount(SearchResult, { global: { plugins: [router] } })
}

describe('SearchResult space filters', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists space names for users and never 自有/互联', async () => {
    const wrapper = await mountSearch()
    await flushPromises()
    const chips = wrapper.get('[data-testid="filter-space-names"]')
    expect(chips.text()).toContain(OWNED_SPACE_NAME)
    expect(chips.text()).not.toContain('自有')
    expect(chips.text()).not.toContain('互联')
  })

  it('shows sample filter only for datasets and trial-api filter only for APIs', async () => {
    const wrapper = await mountSearch()
    await flushPromises()
    expect(wrapper.find('[data-testid="filter-has-sample"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="filter-has-trial-api"]').exists()).toBe(false)

    await wrapper.findAll('button').find((b) => b.text().includes('数据集'))!.trigger('click')
    expect(wrapper.get('[data-testid="filter-has-sample"]').text()).toContain('有样例')
    expect(wrapper.find('[data-testid="filter-has-trial-api"]').exists()).toBe(false)

    await wrapper.findAll('button').find((b) => b.text().includes('API')).trigger('click')
    expect(wrapper.get('[data-testid="filter-has-trial-api"]').text()).toContain('有试用接口')
    expect(wrapper.find('[data-testid="filter-has-sample"]').exists()).toBe(false)
  })
})
