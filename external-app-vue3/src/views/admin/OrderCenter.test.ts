import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import OrderCenter from './OrderCenter.vue'
import BuyerOrderDetail from '@/views/shared/OrderDetail.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useUserStore } from '@/stores/user'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useAfterSalesStore } from '@/stores/afterSales'
import { useCatalogStore } from '@/stores/catalog'
import { seedSpaceIntents } from '@/data/seed'
import type { Order } from '@/types/domain'
import type { SpaceOrderMirror } from '@/types/trustedSpace'

function order(over: Partial<Order> & { id: string }): Order {
  return {
    channel: 'app', ownerType: 'personal', ownerId: 'mem-1', productId: 'prod-freight-index', productName: '货运指数',
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
    useUserStore().completeEnterpriseAuth()
    useSpaceIntentStore().list = []
  })

  it('registers the orders route', () => {
    expect(makeRouter().hasRoute('admin-orders')).toBe(true)
  })

  it('replaces customer type with purchasing enterprise name and combines filters', async () => {
    const store = useOrderStore()
   store.list = [
     order({ id: 'o1', ownerType: 'personal' }),
     order({ id: 'o2', ownerType: 'enterprise', ownerId: 'ent-wanlian-logistics', channel: 'app', contractStatus: 'quoting', status: 'pending_payment' })
   ]
   useSpaceOrderStore().clearMirrors()
   const wrapper = await mountView()
   expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="filter-owner"]').exists()).toBe(false)
    await wrapper.get('[data-testid="filter-enterprise-name"]').setValue('万联供应链')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('o2')
    await wrapper.get('[data-testid="filter-enterprise-name"]').setValue('陈静')
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(0)
    await wrapper.get('[data-testid="filter-enterprise-name"]').setValue('万联')
    await wrapper.get('[data-testid="filter-status"]').setValue('paid')
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(0)
    await wrapper.get('[data-testid="filter-status"]').setValue('')
    await wrapper.get('[data-testid="clear-enterprise-name"]').trigger('click')
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
  })

  it('merges self-operated origins while preserving merchant, trusted and historical orders', async () => {
    const catalog = useCatalogStore()
    catalog.products.push({ ...catalog.byId('prod-freight-index')!, id: 'historical-user-product', origin: 'user_created' })
    useOrderStore().list = [order({
      id: 'o-paid',
      status: 'paid',
      paidAt: '2026-09-08T10:30:00.000Z',
      selectedTermMonths: 18
    }), order({ id: 'o-asset', productId: 'prod-public-freight-dataset' }),
    order({ id: 'o-seller', productId: 'prod-seller-route-board' }),
    order({ id: 'o-historical', productId: 'historical-user-product' })]
    useSpaceOrderStore().mirrors = [spaceMirror({ spaceOrderId: 'space-origin' })]
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="filter-channel"]').exists()).toBe(false)
    const originFilter = wrapper.get('[data-testid="filter-origin"]')
    expect(originFilter.findAll('option').map((option) => option.attributes('value'))).toEqual([
      '', 'app_content', 'trusted_space', 'seller_market'
    ])
    expect(wrapper.text()).toContain('资源来源')
    expect(wrapper.text()).toContain('支付成功时间')
    expect(wrapper.text()).toContain('购买时长')
    expect(wrapper.get('[data-id="o-paid"] [data-testid="resource-origin"]').text()).toBe('自营产品')
    expect(wrapper.get('[data-id="o-asset"] [data-testid="resource-origin"]').text()).toBe('自营产品')
    expect(wrapper.get('[data-id="o-paid"] [data-testid="paid-at"]').text()).toBe('2026-09-08 18:30')
    expect(wrapper.get('[data-id="o-paid"] [data-testid="purchase-duration"]').text()).toBe('18 个月')
    expect(wrapper.get('[data-id="space-origin"] [data-testid="resource-origin"]').text()).toBe('可信空间')
    expect(wrapper.get('[data-id="space-origin"] [data-testid="paid-at"]').text()).toBe('—')

    await originFilter.setValue('app_content')
    await flushPromises()
    expect(wrapper.findAll('[data-testid="order-row"]').map((row) => row.attributes('data-id')).sort()).toEqual(['o-asset', 'o-paid'])
    await originFilter.setValue('trusted_space')
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('space-origin')
    await originFilter.setValue('seller_market')
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('o-seller')
    await originFilter.setValue('')
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(5)
    expect(wrapper.find('[data-id="o-historical"]').exists()).toBe(true)
  })

  it.each([
    ['pending_approval', 'processing', '处理中'],
    ['entitlement_active', 'entitled', '权益生效'],
    ['refunded', 'refunded', '已退款']
  ] as const)('shows and filters the actual ops status for %s', async (status, filter, label) => {
    useOrderStore().list = [order({ id: 'actual-status', status }), order({ id: 'paid-control', status: 'paid' })]
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    expect(wrapper.get('[data-id="actual-status"]').text()).toContain(label)
    await wrapper.get('[data-testid="filter-status"]').setValue(filter)
    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('actual-status')
    expect(useOrderStore().list[0]!.status).toBe(status)
  })

  it('shows automatic delisting closure separately from cancellation', async () => {
    useOrderStore().list = [order({ id: 'auto-close', status: 'cancelled', terminationKind: 'closed' })]
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    expect(wrapper.get('[data-id="auto-close"]').text()).toContain('已关闭')
    await wrapper.get('[data-testid="filter-status"]').setValue('closed')
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('auto-close')
  })

  it('preserves a refund fact even when the order retains an earlier termination kind', async () => {
    useOrderStore().list = [order({ id: 'refunded-after-close', status: 'refunded', terminationKind: 'closed' })]
    useSpaceOrderStore().clearMirrors()
    const wrapper = await mountView()
    expect(wrapper.get('[data-id="refunded-after-close"]').text()).toContain('已退款')
    await wrapper.get('[data-testid="filter-status"]').setValue('refunded')
    expect(wrapper.get('[data-testid="order-row"]').attributes('data-id')).toBe('refunded-after-close')
  })

  it('confirms cancellation without exposing the intent-only detail on a normal order', async () => {
    useOrderStore().list = [order({ id: 'cancel-me', status: 'pending_payment' })]
    const wrapper = await mountView()
    await wrapper.get('[data-id="cancel-me"] [data-testid="manual-cancel-order"]').trigger('click')
    expect(wrapper.get('[data-testid="manual-order-modal"]').text()).toContain('确认后订单将取消')
    await wrapper.get('[data-testid="manual-order-note"]').setValue('客户主动取消')
    await wrapper.get('[data-testid="submit-manual-order"]').trigger('click')
    const row = wrapper.get('[data-id="cancel-me"]')
    expect(row.get('[data-testid="operation-note"]').text()).toBe('客户主动取消')
    expect(row.find('[data-testid="view-order-detail"]').exists()).toBe(false)
  })

  it('shows order category before transaction status without summary cards or workflow column', async () => {
    useOrderStore().list = [order({ id: 'normal-order' })]
    useSpaceOrderStore().mirrors = [spaceMirror({ spaceOrderId: 'space-order' })]
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    const wrapper = await mountView()

    const headers = wrapper.findAll('th').map((header) => header.text())
    expect(headers).not.toContain('审批/权益/交付')
    expect(headers.indexOf('订单状态')).toBe(headers.indexOf('交易状态') - 1)
    expect(wrapper.text()).not.toContain('订单总数')
    expect(wrapper.text()).not.toContain('累计金额')
    expect(wrapper.text()).not.toContain('待支付订单')
    expect(wrapper.text()).not.toContain('待处理意向')
    expect(wrapper.get('[data-row-kind="space_intent"] [data-testid="order-category"]').text()).toBe('意向单')
    expect(wrapper.get('[data-id="normal-order"] [data-testid="order-category"]').text()).toBe('订单')
    expect(wrapper.get('[data-id="space-order"] [data-testid="order-category"]').text()).toBe('订单')
  })

  it('shows only the two manual actions for a pending normal order', async () => {
    const store = useOrderStore()
    store.list = [order({ id: 'o2', ownerType: 'enterprise', contractStatus: 'contract_signed', status: 'pending_payment' })]
    const wrapper = await mountView()
    const row = wrapper.get('[data-id="o2"]')
    expect(row.find('[data-testid="manual-pay-success"]').exists()).toBe(true)
    expect(row.find('[data-testid="manual-cancel-order"]').exists()).toBe(true)
    expect(row.text()).not.toContain('标记合同已签署')
  })

  it('opens the operation detail from an intent row and not from a normal order', async () => {
    useOrderStore().list = [order({ id: 'normal-order', status: 'paid' })]
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    store.claim(intent.id, useUserStore().enterprise.id)
    store.effect(intent.id, '空间已完成开通')
    const wrapper = await mountView()

    expect(wrapper.get('[data-id="normal-order"]').find('[data-testid="view-order-detail"]').exists()).toBe(false)
    const intentRow = wrapper.get(`[data-id="${intent.id}"]`)
    await intentRow.get('[data-testid="view-intent-detail"]').trigger('click')
    const detail = wrapper.get('[data-testid="admin-intent-detail"]')
    expect(detail.text()).toContain('意向单详情')
    expect(detail.text()).toContain(intent.id)
    expect(detail.text()).toContain('道路运输从业人员资格核验 API')
    expect(detail.text()).toContain('意向单创建')
    expect(detail.text()).toContain('运营领取')
    expect(detail.text()).toContain('权益生效')
    expect(detail.text()).toContain('空间已完成开通')
  })

  it('requires a note before manually confirming payment success', async () => {
    const store = useOrderStore()
    store.list = [order({ id: 'o-pay', status: 'pending_payment' })]
    const wrapper = await mountView()
    await wrapper.get('[data-id="o-pay"] [data-testid="manual-pay-success"]').trigger('click')
    expect(wrapper.find('[data-testid="manual-order-modal"]').exists()).toBe(true)
    await wrapper.get('[data-testid="submit-manual-order"]').trigger('click')
    expect(wrapper.get('[data-testid="intent-error"]').text()).toContain('请填写到账依据或处理说明')
    await wrapper.get('[data-testid="manual-order-note"]').setValue('财务已核对到账')
    await wrapper.get('[data-testid="submit-manual-order"]').trigger('click')
    await flushPromises()
    expect(store.list[0]).toMatchObject({ status: 'paid', processNote: '财务已核对到账' })
    expect(wrapper.get('[data-id="o-pay"] [data-testid="operation-note"]').text()).toBe('财务已核对到账')
    expect(wrapper.find('[data-testid="intent-error"]').exists()).toBe(false)
  })

  it('shows the latest operation note or a dash for each order', async () => {
    useOrderStore().list = [
      order({ id: 'o-closed', status: 'cancelled', cancelReason: '商品已下架', processNote: '旧处理说明' }),
      order({ id: 'o-open', status: 'paid' })
    ]
    const wrapper = await mountView()
    expect(wrapper.findAll('th').map((header) => header.text())).toContain('操作说明')
    expect(wrapper.get('[data-id="o-closed"] [data-testid="operation-note"]').text()).toBe('商品已下架')
    expect(wrapper.get('[data-id="o-open"] [data-testid="operation-note"]').text()).toBe('—')
  })

  it('uses the latest audit note in the normal order list without exposing internal detail', async () => {
    useOrderStore().list = [order({ id: 'audited', status: 'cancelled', cancelReason: '旧关闭原因' })]
    useAfterSalesStore().auditEntries = [
      { id: 'a2', subjectType: 'order', subjectId: 'audited', action: 'complete_refund', actor: '财务李明', detail: '已退还 99 元', createdAt: '2026-10-12T09:02:45.123Z' },
      { id: 'a1', subjectType: 'order', subjectId: 'audited', action: 'initiate_refund', actor: '运营王芳', detail: '客户重复购买，申请退款', createdAt: '2026-10-12T09:01:12.456Z' },
      { id: 'other', subjectType: 'order', subjectId: 'another', action: 'complete_refund', actor: '其他人', detail: '其他订单内部说明', createdAt: '2026-10-12T10:00:00.000Z' }
    ]
    const wrapper = await mountView()
    expect(wrapper.get('[data-id="audited"] [data-testid="operation-note"]').text()).toBe('已退还 99 元')
    expect(wrapper.get('[data-id="audited"]').find('[data-testid="view-order-detail"]').exists()).toBe(false)
  })

  it.each(['/app', '/portal'])('keeps internal operation records out of the buyer detail on %s', async (base) => {
    useUserStore().switchMockPurchaseIdentity('personal')
    useOrderStore().list = [order({ id: 'buyer-order', status: 'paid', processNote: '内部到账凭据', paidAt: '2026-10-12T09:00:00Z' })]
    useAfterSalesStore()._audit('order', 'buyer-order', 'complete_refund', '内部操作人', '内部风控备注')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: `${base}/mine/orders/:source/:id`, component: BuyerOrderDetail }] })
    await router.push(`${base}/mine/orders/app/buyer-order`)
    await router.isReady()
    const wrapper = mount(BuyerOrderDetail, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('buyer-order')
    for (const hidden of ['内部到账凭据', '内部操作人', '内部风控备注', '操作时间线']) expect(wrapper.text()).not.toContain(hidden)
  })

  it('lists APP orders and trusted-space mirrors without enabling APP contract actions on space orders', async () => {
    useOrderStore().list = [order({ id: 'app-1', selectedTermMonths: 18 })]
    useSpaceOrderStore().mirrors = [spaceMirror({ spaceOrderId: 'space-1', displayStatus: 'delivering' })]

    const wrapper = await mountView()

    expect(wrapper.findAll('[data-testid="order-row"]')).toHaveLength(2)
    expect(wrapper.find('[data-id="space-1"]').text()).toContain('可信空间')
    expect(wrapper.find('[data-id="space-1"] [data-testid="confirm-pay"]').exists()).toBe(false)
    expect(wrapper.find('[data-id="app-1"] [data-testid="purchase-duration"]').text()).toBe('18 个月')
    expect(wrapper.find('[data-id="space-1"] [data-testid="purchase-duration"]').text()).toBe('—')
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
    expect(wrapper.text()).toContain('待领取')
    expect(wrapper.text()).toContain('道路运输从业人员资格核验 API')
    expect(wrapper.text()).toContain('企业物流活跃度数据集')
  })

  it('lists space purchase intents with their actual lifecycle status', async () => {
    useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验',
      requestedEnterpriseName: '希望落到的物流公司'
    })
    const wrapper = await mountView()
    const row = wrapper.get('[data-row-kind="space_intent"]')
    expect(row.text()).toContain('待领取')
    expect(row.get('[data-testid="resource-origin"]').text()).toBe('可信空间')
    expect(row.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(row.get('[data-testid="operator-contact"]').text()).toBe('陈静 · 13800000000')
    expect(row.get('[data-testid="product-type"]').text()).toBe('API')
  })

  it('handles intent claiming and entitlement activation without leaving the list', async () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const store = useSpaceIntentStore()
    const intent = store.submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    const wrapper = await mountView()
    await wrapper.get(`[data-id="${intent.id}"] [data-testid="claim-intent"]`).trigger('click')
    await flushPromises()
    const row = wrapper.get(`[data-id="${intent.id}"]`)
    expect(row.get('[data-testid="buyer-enterprise"]').text()).toBe('万联供应链管理有限公司')
    expect(row.text()).toContain('处理中')
    expect(row.find('[data-testid="effect-intent"]').exists()).toBe(true)
    expect(row.find('[data-testid="close-intent"]').exists()).toBe(true)
    expect(row.find('[data-testid="view-intent-detail"]').exists()).toBe(true)

    await row.get('[data-testid="effect-intent"]').trigger('click')
    expect(wrapper.find('[data-testid="intent-action-modal"]').exists()).toBe(true)
    await wrapper.get('[data-testid="intent-action-note"]').setValue('空间已完成开通')
    await wrapper.get('[data-testid="submit-intent-action"]').trigger('click')
    await flushPromises()
    expect(intent).toMatchObject({ opsStatus: 'entitled', processNote: '空间已完成开通' })
    expect(wrapper.get(`[data-id="${intent.id}"]`).text()).toContain('权益生效')
  })

  it('closes an intent from the list with a required reason', async () => {
    const intent = useSpaceIntentStore().submit({
      productId: 'prod-qualification-api',
      contactName: '陈静',
      contactPhone: '13800000000',
      scenario: '司机核验'
    })
    const wrapper = await mountView()
    await wrapper.get(`[data-id="${intent.id}"] [data-testid="close-intent"]`).trigger('click')
    await wrapper.get('[data-testid="intent-action-note"]').setValue('用户放弃')
    await wrapper.get('[data-testid="submit-intent-action"]').trigger('click')
    await flushPromises()
    expect(intent).toMatchObject({ opsStatus: 'closed', closeReason: '用户放弃' })
  })
})
