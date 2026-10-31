import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FavoritesPanel from './FavoritesPanel.vue'
import { useCatalogStore } from '@/stores/catalog'

describe('我的收藏', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
  it('展示已收藏商品、提供详情入口并能取消收藏', async () => {
    const catalog = useCatalogStore()
    catalog.toggleFavorite('prod-port-dashboard-free')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: FavoritesPanel }] })
    await router.push('/')
    const wrapper = mount(FavoritesPanel, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('港口吞吐量免费看板')
    expect(wrapper.find('a.favorite-title').attributes('href')).toBe('/portal/product/prod-port-dashboard-free')
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('还没有收藏商品')
    expect(catalog.byId('prod-port-dashboard-free')?.favorite).toBe(false)
  })
})
