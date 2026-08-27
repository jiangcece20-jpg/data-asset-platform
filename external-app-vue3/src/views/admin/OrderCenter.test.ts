import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OrderCenter from './OrderCenter.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useUserStore } from '@/stores/user'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { seedSpaceIntents } from '@/data/seed'
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
  beforeEach(() => {
    setActivePinia(createPinia())
    useSpaceIntentStore().list = []
  })

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
    useOrderStore().list = [order({ id: 'app-1', selectedTermMonths: 18 })]
    useSpaceOrderStore().mirrors = [spaceMirror({ spaceOrderId: 'space-1', displayStatus: 'delivering' })]

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-id="space-1"]').text()).toContain('可信空间')
    expect(wrapper.find('[data-id="space-1"] [data-testid="confirm-pay"]').exists()).toBe(false)
    expect(wrapper.find('[data-id="app-1"] [data-testid="purchase-period"]').text()).toBe('18 个月')
    expect(wrapper.find('[data-id="space-1"] [data-testid="purchase-period"]').text()).toBe('—')
  })

  it('shows purchasing enterprise name and operator contact', async () => {
    useOrderStore().list = [order({
      id: 'o-ent',
      ownerType: 'enterprise',
      ownerId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      productType: 'dataset'
    })]
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    const row = wrapper.get('[data-id="o-ent"]')
    expect(row.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(row.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 138****2201')
    expect(row.get('[data-testid="product-type"]').text()).toBe('数据集')
  })

  it('shows entitlement expiry and membership expiry for member-free products', async () => {
    useOrderStore().list = [order({
      id: 'o-exp',
      productType: 'dataset',
      entitlementId: 'ent-renewal-expiring'
    })]
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    expect(wrapper.get('[data-id="o-exp"] [data-testid="order-expiry"]').text()).toBe('2026-08-17')

    useUserStore().grantPersonalMember(12)
    useOrderStore().list = [order({
      id: 'o-free',
      ownerId: 'mem-1',
      productId: 'prod-freight-index',
      productName: '全国货运价格指数',
      productType: 'dashboard'
    })]
    const free = await mountView()
    expect(free.get('[data-id="o-free"] [data-testid="order-expiry"]').text()).toMatch(/^会员到期 /)
  })

  it('shows seed space intents by default in the order center', async () => {
    useSpaceIntentStore().list = seedSpaceIntents.map((item) => ({ ...item }))
    useOrderStore().list = []
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    const intentRows = wrapper.findAll('[data-row-kind="space_intent"]')
    expect(intentRows.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text()).toContain('意向单')
    expect(wrapper.text()).toContain('道路运输从业人员资格核验 API')
    expect(wrapper.text()).toContain('企业物流活跃度数据集')
    expect(wrapper.text()).toContain('待处理意向')
  })

  it('lists space purchase intents in the order center with intent transaction status', async () => {
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验',
      requestedEnterpriseName: '希望落到的物流公司'
    })
    const wrapper = await mountView()
    const row = wrapper.get('[data-row-kind="space_intent"]')
    expect(row.text()).toContain('意向单')
    expect(row.text()).toContain('空间购买（意向）')
    expect(row.get('[data-testid="buyer-enterprise"]').text()).toBe('希望落到的物流公司')
    expect(row.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
    expect(row.get('[data-testid="product-type"]').text()).toBe('API')
  })

  it('shows the authenticated enterprise name after an intent is claimed from the order center', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    store.claim(intent.id, user.enterprise.id)
    const wrapper = await mountView()
    await flushPromises()
    const row = wrapper.get(`[data-id="${intent.id}"]`)
    expect(row.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(row.text()).toContain('处理中')
    expect(wrapper.find('[data-testid="close-reason"]').exists()).toBe(false)
  })
})
