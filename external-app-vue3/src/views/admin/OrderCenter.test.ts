import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OrderCenter from './OrderCenter.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import type { Order } from '@/types/domain'
import type { SpaceOrderMirror } from '@/types/trustedSpace'

function order(over: Partial<Order> & { id: string }): Order {
  return {
    channel: 'app', ownerType: 'personal', ownerId: 'mem-1', productId: 'p1', productName: '货运指数',
    amount: 99, status: 'entitlement_active', createdAt: '2026-07-17 09:00', ...over
  }
}

function spaceMirror(over: Partial<SpaceOrderMirror> & { spaceOrderId: string }): SpaceOrderMirror {
  return {
    purchaseIntentId: 'intent-1', appEnterpriseId: 'ent-1', spaceEnterpriseId: 'space-ent-1', operatorMemberId: 'mem-1',
    appProductId: 'p1', spaceProductNo: 'space-p1', productName: '可信空间商品', rawStatus: 'DELIVERING', displayStatus: 'delivering',
    amount: 199, currency: 'CNY', eventVersion: 1, spaceUpdatedAt: '2026-07-17 09:00', syncedAt: '2026-07-17 09:01', ...over,
  }
}

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/admin/orders', name: 'admin-orders', component: OrderCenter }] })
}

async function mountView() {
  const router = makeRouter()
  router.push('/admin/orders')
  await router.isReady()
  return mount(OrderCenter, { global: { plugins: [router] } })
}

describe('OrderCenter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('registers the orders route', () => {
    expect(makeRouter().hasRoute('admin-orders')).toBe(true)
  })

  it('lists all orders and filters by owner type', async () => {
    const store = useOrderStore()
   store.list = [
     order({ id: 'o1', ownerType: 'personal' }),
     order({ id: 'o2', ownerType: 'enterprise', channel: 'app', contractStatus: 'quoting', status: 'pending_payment' })
   ]
   useSpaceOrderStore().clearMirrors()
   const wrapper = await mountView()
   expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
    await wrapper.find('[data-testid="filter-owner"]').setValue('enterprise')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(1)
  })

  it('confirms an enterprise contract payment', async () => {
    const store = useOrderStore()
    store.list = [order({ id: 'o2', ownerType: 'enterprise', contractStatus: 'contract_signed', status: 'pending_payment' })]
    const wrapper = await mountView()
    await wrapper.find('[data-testid="confirm-pay"]').trigger('click')
    await flushPromises()
    expect(store.list[0].contractStatus).toBe('payment_confirmed')
    expect(store.list[0].status).toBe('entitlement_active')
  })

  it('lists APP orders and trusted-space mirrors without enabling APP contract actions on space orders', async () => {
    useOrderStore().list = [order({ id: 'app-1' })]
    useSpaceOrderStore().mirrors = [spaceMirror({ spaceOrderId: 'space-1', displayStatus: 'delivering' })]

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-id="space-1"]').text()).toContain('可信空间')
    expect(wrapper.find('[data-id="space-1"] [data-testid="confirm-pay"]').exists()).toBe(false)
  })
})
