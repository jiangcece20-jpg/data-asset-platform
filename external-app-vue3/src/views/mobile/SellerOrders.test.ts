import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import SellerOrders from './SellerOrders.vue'
import { useOrderStore } from '@/stores/orders'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'

describe('SellerOrders V1.0.2', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows delivery and service facts for seller orders', async () => {
    const orders = useOrderStore()
    orders.list.unshift({
      id: 'seller-v102-order', channel: 'app', ownerType: 'enterprise', ownerId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1', productId: 'prod-seller-route-board', productName: '商家数据集',
      productType: 'dataset', sellerId: 'seller-chenjing', amount: 1990, status: 'entitlement_active',
      createdAt: '2026-10-01 10:00', paidAt: '2026-10-01 10:05', dataVersionUpdatedAt: '2026-09-30',
      selectedTermMonths: 12
    })
    orders.list.unshift({ ...orders.list[0]!, id: 'other-seller-order', sellerId: 'another-seller', note: '他店内部备注' })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/app/product/:id', component: { template: '<div />' } }] })
    const wrapper = mount(SellerOrders, { props: { embedded: true }, global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="seller-order-other-seller-order"]').exists()).toBe(false)
    const card = wrapper.get('[data-testid="seller-order-seller-v102-order"]')
    expect(card.text()).toContain('订单时间')
    expect(card.text()).toContain('付款时间')
    expect(card.text()).toContain('数据版本时间')
    expect(card.text()).toContain('2026-09-30')
    expect(card.text()).toContain('服务周期')
    expect(card.text()).toContain('退款状态')
    expect(card.text()).toContain('服务风险')
    await card.get('[data-testid="seller-order-detail-open"]').trigger('click')
    const detail = wrapper.get('[data-testid="seller-order-detail"]')
    expect(detail.text()).toContain('服务起止')
    expect(detail.text()).toContain('最近成功交付版本时间')
    expect(detail.text()).toContain('未返回')
    expect(detail.text()).not.toContain('2026-09-30')
    useDatasetCommerceStore().deliveries.push({
      id: 'delivery-seller-test', orderId: 'seller-v102-order', entitlementId: 'ent-test', productId: 'prod-seller-route-board',
      ownerType: 'enterprise', ownerId: 'ent-wanlian-logistics', operatorMemberId: 'mem-1',
      status: 'delivered', attemptCount: 1, createdAt: '2026-10-01', updatedAt: '2026-10-02',
      lastSuccessfulRefreshAt: '2026-10-02 08:00'
    })
    await wrapper.vm.$nextTick()
    expect(detail.text()).not.toContain('2026-10-02 08:00')
    expect(detail.text()).toContain('未返回')
    useDatasetCommerceStore().deliveries.at(-1)!.dataVersionUpdatedAt = '2026-09-29 12:00'
    await wrapper.vm.$nextTick()
    expect(detail.text()).toContain('2026-09-29 12:00')
    expect(detail.text()).not.toContain('内部备注')
    expect(detail.findAll('button').map(button => button.text())).not.toContain('退款')
  })
})
