import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'
import OrderDetail from './OrderDetail.vue'

const Dummy = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/app/mine/orders/:source/:id', name: 'order-detail', component: OrderDetail },
      { path: '/portal/mine/orders/:source/:id', name: 'portal-order-detail', component: OrderDetail },
      { path: '/app/mine', component: Dummy },
      { path: '/portal/mine', component: Dummy },
      { path: '/app/product/:id', component: Dummy },
      { path: '/portal/product/:id', component: Dummy },
      { path: '/app/payment/dataset/:orderId', component: Dummy },
      { path: '/portal/payment/dataset/:orderId', component: Dummy }
    ]
  })
}

async function mountOrderDetail(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(OrderDetail, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('OrderDetail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows order fields and data actions for a completed enterprise dataset order', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountOrderDetail('/app/mine/orders/app/order-enterprise-dataset-001')

    expect(wrapper.get('[data-testid="order-detail"]').text()).toContain('全国货车轨迹热力数据集')
    expect(wrapper.text()).toContain('order-enterprise-dataset-001')
    expect(wrapper.text()).toContain('购买主体')
    expect(wrapper.text()).toContain('成交渠道')
    expect(wrapper.text()).toContain('购买方案')
    expect(wrapper.text()).toContain('付款方式')
    expect(wrapper.text()).toContain('下单时间')
    expect(wrapper.text()).toContain('付款时间')
    expect(wrapper.text()).toContain('到期时间')
    expect(wrapper.text()).toContain('订单金额')
    expect(wrapper.text()).toContain('¥3,800')
    expect(wrapper.text()).toContain('查看商品')
    expect(wrapper.text()).toContain('查看我的数据')
  })

  it('offers download on the portal detail of a delivered dataset order', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper } = await mountOrderDetail('/portal/mine/orders/app/order-enterprise-dataset-001')

    const downloadLink = wrapper.findAll('a').find((link) => link.text() === '下载数据')
    expect(downloadLink).toBeTruthy()
    expect(downloadLink!.attributes('href')).toContain('/download/dataset/')
  })

  it('navigates to the product and my-data from detail actions', async () => {
    useUserStore().completeEnterpriseAuth()
    const { wrapper, router } = await mountOrderDetail('/app/mine/orders/app/order-enterprise-dataset-001')

    await wrapper.findAll('button').find((btn) => btn.text() === '查看商品')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/product/prod-truck-trajectory')

    await router.push('/app/mine/orders/app/order-enterprise-dataset-001')
    await flushPromises()
    const remount = mount(OrderDetail, { global: { plugins: [router] } })
    await remount.findAll('button').find((btn) => btn.text() === '查看我的数据')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/app/mine')
    expect(router.currentRoute.value.query).toMatchObject({ menu: 'data' })
  })

  it('continues payment from a pending dataset order', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountOrderDetail(`/app/mine/orders/app/${order.id}`)

    await wrapper.findAll('button').find((btn) => btn.text() === '继续付款')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/app/payment/dataset/${order.id}`)
  })

  it('rewrites paymentPath to the portal prefix on portal detail', async () => {
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'personal')
    const { wrapper, router } = await mountOrderDetail(`/portal/mine/orders/app/${order.id}`)

    await wrapper.findAll('button').find((btn) => btn.text() === '继续付款')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(`/portal/payment/dataset/${order.id}`)
  })

  it('shows an empty state when the order is missing or not visible', async () => {
    const { wrapper } = await mountOrderDetail('/app/mine/orders/app/order-does-not-exist')
    expect(wrapper.text()).toContain('未找到该订单')
  })
})
