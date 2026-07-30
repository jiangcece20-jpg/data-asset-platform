import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
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
  afterEach(() => vi.restoreAllMocks())

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

  it('keeps purchase closed when an active binding belongs to another enterprise', async () => {
    vi.spyOn(trustedSpaceAdapter, 'ensureEnterpriseBinding').mockResolvedValue({
      appEnterpriseId: 'ent-another-enterprise',
      spaceEnterpriseId: 'space-ent-another',
      status: 'active'
    })
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
    expect(primary.text()).toBe('企业信息同步中')
    expect(primary.attributes('disabled')).toBeDefined()
  })

  it('discards a late binding from an earlier authentication generation', async () => {
    let signalBindingStarted: (() => void) | undefined
    const bindingStarted = new Promise<void>((resolve) => { signalBindingStarted = resolve })
    let releaseBinding: ((binding: {
      appEnterpriseId: string
      spaceEnterpriseId: string
      status: 'active'
    }) => void) | undefined
    vi.spyOn(trustedSpaceAdapter, 'ensureEnterpriseBinding').mockImplementation(
      () => {
        signalBindingStarted!()
        return new Promise((resolve) => { releaseBinding = resolve })
      }
    )
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const mounting = mountProductDetail()
    await bindingStarted
    user.clearEnterpriseContext()
    user.completeEnterpriseAuth()
    releaseBinding!({
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      status: 'active'
    })
    const wrapper = await mounting
    await flushPromises()

    expect(useTrustedSpacePurchaseStore().bindings).toEqual([])
    const primary = wrapper.find('button.w-full')
    expect(primary.text()).toBe('企业信息同步中')
    expect(primary.attributes('disabled')).toBeDefined()
  })
})
