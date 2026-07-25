import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OperationsConfig from './OperationsConfig.vue'
import { useConfigVersionStore } from '@/stores/configVersions'

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin/operations', name: 'admin-operations', component: OperationsConfig }] })
}

describe('config versioning in OperationsConfig', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('blocks a two-person price publish without a reviewer and shows the error', async () => {
    const router = makeRouter()
    router.push('/admin/operations')
    await router.isReady()
    const wrapper = mount(OperationsConfig, { global: { plugins: [router] } })
    await wrapper.find('[data-testid="publish-price"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="config-error"]').text()).toContain('第二名审核人')
    expect(useConfigVersionStore().forDomain('member_price')).toHaveLength(0)
  })

  it('publishes with a reviewer then rolls back keeping the erroneous version', async () => {
    const store = useConfigVersionStore()
    store.publish({ domain: 'member_price', before: { price: 299 }, after: { price: 199 }, editor: 'op-1', reviewer: 'op-2', effectiveScope: '全部', affectedProductIds: ['membership'] })
    store.publish({ domain: 'member_price', before: { price: 199 }, after: { price: 1 }, editor: 'op-1', reviewer: 'op-2', effectiveScope: '全部', affectedProductIds: ['membership'] })
    const router = makeRouter()
    router.push('/admin/operations')
    await router.isReady()
    const wrapper = mount(OperationsConfig, { global: { plugins: [router] } })
    // roll back to v1 via the first non-published (superseded) version's button
    const rows = wrapper.findAll('[data-testid="rollback-btn"]')
    expect(rows.length).toBeGreaterThan(0)
    await rows[rows.length - 1].trigger('click')
    await flushPromises()
    const current = store.currentPublished('member_price')
    expect((current?.after as any).price).toBe(199)
    // erroneous v2 preserved as rolled_back
    expect(store.forDomain('member_price').some((v) => v.status === 'rolled_back')).toBe(true)
  })
})
