import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useUserStore } from '@/stores/user'
import ProductDetail from './ProductDetail.vue'

async function mountProductDetail() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/app/product/:id', name: 'product-detail', component: ProductDetail }]
  })
  await router.push('/app/product/prod-qualification-api')
  await router.isReady()
  const wrapper = mount(ProductDetail, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('ProductDetail trusted-space purchase guard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('unlocks trusted-space purchase only after the adapter returns an active binding', async () => {
    useUserStore().completeEnterpriseAuth()
    const wrapper = await mountProductDetail()
    const trustedCatalog = useTrustedSpaceCatalogStore()
    trustedCatalog.snapshots = seedTrustedProductSnapshots.map((snapshot) => ({
      ...snapshot,
      syncedAt: new Date().toISOString(),
      syncState: 'current' as const
    }))
    await nextTick()

    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('前往可信空间购买')
    expect(primary.attributes('disabled')).toBeUndefined()
  })
})
