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
      { path: '/portal/payment/dataset/:id', component: Dummy },
      { path: '/app/mine/orders/:source/:id', component: Dummy },
      { path: '/portal/mine/orders/:source/:id', component: Dummy }
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

describe('MineShell defaults & placeholders', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('defaults to buy-data orders', async () => {
    const { wrapper } = await mountMineShell('mobile', '/app/mine')
    expect(wrapper.find('[data-testid="order-tab-buy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-orders"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mine-placeholder"]').exists()).toBe(false)
  })

  it('shows placeholder for VIP menu entry', async () => {
    const { wrapper } = await mountMineShell('mobile', '/app/mine?menu=vip')
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
  })

  it('shows purchased data by default when switching to the data menu', async () => {
    const { wrapper } = await mountMineShell('mobile', '/app/mine?menu=data')
    expect(wrapper.find('[data-testid="data-tab-purchased"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mine-placeholder"]').exists()).toBe(false)
  })

  it('resolves legacy ?tab=我的数据 to the data menu', async () => {
    const { wrapper } = await mountMineShell('mobile', '/app/mine?tab=我的数据')
    expect(wrapper.find('[data-testid="mine-menu-data"]').classes().join(' ')).toContain('text-brand-600')
    expect(wrapper.find('[data-testid="my-datasets"]').exists()).toBe(true)
  })

  it('shows seller panel with function tabs on mobile and portal', async () => {
    const mobile = await mountMineShell('mobile', '/app/mine?menu=seller')
    expect(mobile.wrapper.find('[data-testid="mine-menu-seller"]').exists()).toBe(true)
    expect(mobile.wrapper.find('[data-testid="seller-panel"]').exists()).toBe(true)
    expect(mobile.wrapper.find('[data-testid="seller-tab-listings"]').exists()).toBe(true)
    expect(mobile.wrapper.find('[data-testid="seller-center-entry"]').exists()).toBe(false)

    const portal = await mountMineShell('portal', '/portal/mine?menu=seller&sellerTab=apply')
    expect(portal.wrapper.find('[data-testid="mine-menu-seller"]').exists()).toBe(true)
    expect(portal.wrapper.find('[data-testid="seller-panel"]').exists()).toBe(true)
    expect(portal.wrapper.find('[data-testid="seller-tab-apply"]').classes().join(' ')).toContain('text-brand-600')
  })

  it('shows demands panel from mine menu', async () => {
    const { wrapper } = await mountMineShell('mobile', '/app/mine?menu=demands')
    expect(wrapper.find('[data-testid="mine-menu-demands"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="demands-tab-list"]').exists()).toBe(true)
  })

  it('shows personal report list action that deep-links to seller listing', async () => {
    const { wrapper, router } = await mountMineShell('mobile', '/app/mine?menu=data')
    const listBtn = wrapper.find('[data-testid="list-personal-report"]')
    expect(listBtn.exists()).toBe(true)
    await listBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      menu: 'seller',
      sellerTab: 'listing',
      productId: 'prod-logistics-monthly'
    })
  })
})
