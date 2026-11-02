import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCatalogStore } from './catalog'

describe('商品收藏本地恢复', () => {
  beforeEach(() => { localStorage.clear(); setActivePinia(createPinia()) })
  it('收藏后新建会话仍能恢复，取消后也保存', () => {
    const catalog = useCatalogStore()
    const id = 'prod-port-dashboard-free'
    catalog.toggleFavorite(id)
    expect(catalog.byId(id)?.favorite).toBe(true)
    setActivePinia(createPinia())
    const restored = useCatalogStore()
    expect(restored.byId(id)?.favorite).toBe(true)
    restored.toggleFavorite(id)
    setActivePinia(createPinia())
    expect(useCatalogStore().byId(id)?.favorite).toBe(false)
  })
  it('不同成员隔离收藏，切回原成员及刷新仍恢复', () => {
    const catalog = useCatalogStore()
    catalog.activateFavoriteOwner('mem-2')
    catalog.toggleFavorite('prod-port-dashboard-free')
    catalog.activateFavoriteOwner('mem-1')
    expect(catalog.byId('prod-port-dashboard-free')?.favorite).toBe(false)
    catalog.activateFavoriteOwner('mem-2')
    expect(catalog.byId('prod-port-dashboard-free')?.favorite).toBe(true)
    setActivePinia(createPinia())
    const restored = useCatalogStore()
    restored.activateFavoriteOwner('mem-2')
    expect(restored.byId('prod-port-dashboard-free')?.favorite).toBe(true)
  })
})
