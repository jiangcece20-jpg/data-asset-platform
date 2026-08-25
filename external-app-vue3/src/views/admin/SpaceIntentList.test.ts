import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SpaceIntentList from './SpaceIntentList.vue'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'

async function mountList() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/space-intents', name: 'admin-space-intents', component: SpaceIntentList },
      { path: '/admin/space-intents/:id', name: 'admin-space-intents-detail', component: { template: '<div />' } }
    ]
  })
  await router.push('/admin/space-intents')
  await router.isReady()
  return mount(SpaceIntentList, { global: { plugins: [router] } })
}

describe('SpaceIntentList', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows purchasing enterprise name and operator contact on each row', async () => {
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验',
      requestedEnterpriseName: '希望落到的物流公司'
    })
    const wrapper = await mountList()
    expect(wrapper.get('[data-testid="buyer-enterprise"]').text()).toBe('希望落到的物流公司')
    expect(wrapper.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
    expect(wrapper.get('[data-testid="product-type"]').text()).toBe('API')
  })

  it('shows the authenticated enterprise name after the intent is converted', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    store.confirmOfflinePayment(intent.id, user.enterprise.id)
    const wrapper = await mountList()
    await flushPromises()
    expect(wrapper.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(wrapper.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
  })
})
