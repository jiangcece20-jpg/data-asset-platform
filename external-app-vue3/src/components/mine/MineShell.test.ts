import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MineShell from './MineShell.vue'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'

const Dummy = { template: '<div />' }

async function mountMineShell(layout: 'mobile' | 'portal', initialPath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine', component: Dummy },
      { path: '/portal/mine', component: Dummy },
      { path: '/app/payment/dataset/:id', component: Dummy },
      { path: '/portal/payment/dataset/:id', component: Dummy }
    ]
  })
  router.push(initialPath)
  await router.isReady()
  const wrapper = mount(MineShell, { props: { layout }, global: { plugins: [router] } })
  return { wrapper, router }
}

describe('MineShell pay callback', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('navigates to the portal payment path instead of the raw app paymentPath when layout is portal', async () => {
    useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountMineShell('portal', '/portal/mine?menu=orders')

    const payButton = wrapper.findAll('button').find((btn) => btn.text() === '继续付款')
    expect(payButton).toBeTruthy()
    await payButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toMatch(/^\/portal\/payment\/dataset\//)
    expect(router.currentRoute.value.path).not.toContain('/app/payment')
  })

  it('keeps the raw app paymentPath when layout is mobile', async () => {
    useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountMineShell('mobile', '/app/mine?menu=orders')

    const payButton = wrapper.findAll('button').find((btn) => btn.text() === '继续付款')
    expect(payButton).toBeTruthy()
    await payButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toMatch(/^\/app\/payment\/dataset\//)
  })

  it('exposes both legacy portal testids and mine-menu testids on the same clickable orders/data buttons', () => {
    const orders = mount(MineShell, {
      props: { layout: 'portal' },
      global: { plugins: [createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Dummy }] })] }
    })
    const ordersButton = orders.find('[data-testid="portal-my-orders-tab"]')
    const dataButton = orders.find('[data-testid="portal-my-data-tab"]')
    expect(ordersButton.exists()).toBe(true)
    expect(dataButton.exists()).toBe(true)
    expect(ordersButton.find('[data-testid="mine-menu-orders"]').exists()).toBe(true)
    expect(dataButton.find('[data-testid="mine-menu-data"]').exists()).toBe(true)
  })
})
