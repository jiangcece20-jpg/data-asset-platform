import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { seedTrustedProductSnapshots } from '@/data/trustedSpace'
import { useOrderStore } from '@/stores/orders'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'
import SpaceBridge from './SpaceBridge.vue'

type SnapshotState = 'missing' | 'stale' | 'sync_failed' | 'unbound'

async function mountDirectBridge(state: SnapshotState) {
  const user = useUserStore()
  user.completeEnterpriseAuth()
  const trustedCatalog = useTrustedSpaceCatalogStore()
  const snapshot = seedTrustedProductSnapshots[0]
  if (state !== 'missing') {
    trustedCatalog.snapshots = [{
      ...snapshot,
      syncedAt: state === 'stale' ? '2026-07-27T09:00:00.000Z' : '2026-07-27T10:00:00.000Z',
      syncState: state === 'sync_failed' ? 'sync_failed' : 'current'
    }]
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/space-bridge/:id', name: 'space-bridge', component: SpaceBridge },
      { path: '/app/product/:id', name: 'product-detail', component: { template: '<div>详情页</div>' } }
    ]
  })
  await router.push('/app/space-bridge/prod-qualification-api')
  await router.isReady()
  const before = useOrderStore().list.length
  const wrapper = mount(SpaceBridge, { global: { plugins: [router] } })
  await flushPromises()
  return { router, before, orders: useOrderStore(), wrapper }
}

describe('SpaceBridge direct-entry guard', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each<SnapshotState>(['missing', 'stale', 'sync_failed', 'unbound'])(
    'redirects direct %s access to details without creating a local space order',
    async (state) => {
      const { router, before, orders, wrapper } = await mountDirectBridge(state)

      expect(router.currentRoute.value.path).toBe('/app/product/prod-qualification-api')
      expect(orders.list).toHaveLength(before)
      wrapper.unmount()
    }
  )

  it('rejects an unvalidated intent query without creating a local order', async () => {
    useUserStore().completeEnterpriseAuth()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/space-bridge/:id', name: 'space-bridge', component: SpaceBridge },
        { path: '/app/product/:id', name: 'product-detail', component: { template: '<div>详情页</div>' } }
      ]
    })
    await router.push('/app/space-bridge/prod-qualification-api?intent=intent-placeholder')
    await router.isReady()
    const before = useOrderStore().list.length
    const wrapper = mount(SpaceBridge, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/app/product/prod-qualification-api')
    expect(wrapper.text()).not.toContain('进入可信空间')
    expect(useOrderStore().list).toHaveLength(before)
  })

  it('reconciles a returned intent and displays its trusted-space mirror instead of a purchase success claim', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    useTrustedSpaceCatalogStore().snapshots = [{
      ...seedTrustedProductSnapshots[0],
      syncedAt: new Date().toISOString(),
      syncState: 'current'
    }]
    const purchases = useTrustedSpacePurchaseStore()
    purchases.bindings = [{
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      status: 'active'
    }]
    purchases.intents = [{
      id: 'intent-qualification-001',
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      operatorMemberId: 'mem-1',
      appProductId: 'prod-qualification-api',
      spaceProductNo: 'SPACE-API-20415',
      productSnapshotVersion: 12,
      returnUrl: '/app/product/prod-qualification-api',
      idempotencyKey: 'intent-key-1',
      correlationId: 'intent-correlation-1',
      authorizationGeneration: purchases.authorizationGeneration,
      enterpriseContextGeneration: user.enterpriseContextGeneration,
      status: 'redirected',
      createdAt: '2026-07-27T09:00:00.000Z',
      expiresAt: '2026-07-27T10:30:00.000Z'
    }]
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/space-bridge/:id', name: 'space-bridge', component: SpaceBridge },
        { path: '/app/product/:id', name: 'product-detail', component: { template: '<div>详情页</div>' } }
      ]
    })
    await router.push('/app/space-bridge/prod-qualification-api?intent=intent-qualification-001&returned=1')
    await router.isReady()

    const wrapper = mount(SpaceBridge, { global: { plugins: [router] } })
    await flushPromises()

    expect(useTrustedSpacePurchaseStore().byId('intent-qualification-001')?.status).toBe('linked')
    expect(wrapper.text()).toContain('空间订单状态：已交付')
    expect(wrapper.text()).not.toContain('购买成功')
  })

  it('keeps ops-prefixed intents on SpaceBridge instead of product detail', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/app/space-bridge/:id', name: 'space-bridge', component: SpaceBridge },
        { path: '/app/product/:id', name: 'product-detail', component: { template: '<div>详情页</div>' } }
      ]
    })
    await router.push('/app/space-bridge/prod-enterprise-activity?intent=ops-intent-123')
    await router.isReady()
    const wrapper = mount(SpaceBridge, { global: { plugins: [router] } })
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('space-bridge')
    expect(router.currentRoute.value.path).toBe('/app/space-bridge/prod-enterprise-activity')
    expect(router.currentRoute.value.path).not.toContain('/app/product/')
    expect(wrapper.text()).toContain('运营代办处理中')
    expect(wrapper.text()).toContain('这是运营入口，不是用户购买跳转')
    expect(wrapper.text()).not.toContain('前往可信空间购买')
    wrapper.unmount()
  })
})
