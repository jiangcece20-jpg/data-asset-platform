import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from './orders'
import { useUserStore } from './user'
import { useEntitlementStore } from './entitlements'
import type { Order } from '@/types/domain'

function seedOrder(over: Partial<Order> & { id: string }): Order {
  return {
    channel: 'app', ownerType: 'personal', ownerId: 'mem-1',
    productId: 'prod-logistics-monthly', productName: '物流月报', amount: 99,
    status: 'pending_payment', createdAt: '2026-07-17 09:00', ...over
  }
}

describe('orders after-sales', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('applyCharge is idempotent on repeated callbacks with the same key', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1' })]
    const first = store.applyCharge('o1', 99, 'key-1')
    const second = store.applyCharge('o1', 99, 'key-1')
    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(store.ledger.filter((e) => e.type === 'charge')).toHaveLength(1)
    expect(store.list[0].status).toBe('paid')
  })

  it('failed entitlement grant retries up to threshold then flags manual without reverting to unpaid', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1', status: 'paid', paidAt: '2026-07-17 09:01' })]
    let last = { granted: false, needsWorkOrder: false }
    for (let i = 0; i < 3; i++) last = store.grantEntitlementForOrder('o1', false)
    expect(last.needsWorkOrder).toBe(true)
    expect(store.list[0].entitlementPendingManual).toBe(true)
    expect(store.list[0].status).toBe('paid') // never reverts to unpaid
    expect(store.list[0].entitlementGrantAttempts).toBe(3)
  })

  it('successful grant is idempotent and does not double-grant', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'o1', status: 'paid' })]
    const a = store.grantEntitlementForOrder('o1', true)
    const b = store.grantEntitlementForOrder('o1', true)
    expect(a.granted).toBe(true)
    expect(b.granted).toBe(true)
    expect(store.list[0].entitlementGranted).toBe(true)
    expect(store.list[0].status).toBe('entitlement_active')
  })

  it('creates a personal report order and entitlement', () => {
    const store = useOrderStore()

    const order = store.purchaseReportForSubject('prod-logistics-monthly', 'personal')

    expect(order.ownerType).toBe('personal')
    expect(order.ownerId).toBe('mem-1')
    expect(useEntitlementStore().list.some((entitlement) =>
      entitlement.source === 'personal' && entitlement.ownerId === 'mem-1' && entitlement.productId === 'prod-logistics-monthly'
    )).toBe(true)
  })

  it('creates an enterprise report order owned by the authenticated enterprise', () => {
    const store = useOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const intent = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')

    const order = store.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online', intent.id)

    expect(order.ownerType).toBe('enterprise')
    expect(order.ownerId).toBe('ent-wanlian-logistics')
    expect(user.enterprise.entitledProductIds).toContain('prod-logistics-monthly')
    expect(useEntitlementStore().list.some((entitlement) =>
      entitlement.source === 'enterprise' && entitlement.ownerId === 'ent-wanlian-logistics' && entitlement.enterpriseId === 'ent-wanlian-logistics'
    )).toBe(true)
  })

  it('rejects enterprise report purchases without an authenticated current enterprise membership', () => {
    const store = useOrderStore()
    const user = useUserStore()

    expect(() => store.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online'))
      .toThrow('企业购买需要先完成企业认证')

    user.completeEnterpriseAuth()
    user.context.currentMemberId = 'mem-not-in-enterprise'

    expect(() => store.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online'))
      .toThrow('企业购买需要先完成企业认证')
  })

  it('rejects trusted-space APIs and datasets from every APP report order entry without granting an entitlement', () => {
    const store = useOrderStore()
    const entitlements = useEntitlementStore()
    const beforeOrders = store.list.length
    const beforeEntitlements = entitlements.list.length
    const user = useUserStore()
    user.completeEnterpriseAuth()

    expect(() => store.purchaseItem('prod-qualification-api', 1280)).toThrow('仅支持 APP 自营报告购买')
    expect(() => store.purchaseReportForSubject('prod-enterprise-activity', 'personal')).toThrow('仅支持 APP 自营报告购买')
    expect(() => store.submitEnterpriseOrder('prod-qualification-api', 1280, 'online', 'forged-intent')).toThrow('仅支持 APP 自营报告购买')

    expect(store.list).toHaveLength(beforeOrders)
    expect(entitlements.list).toHaveLength(beforeEntitlements)
  })

  it('rejects direct enterprise orders without an authenticated current enterprise member', () => {
    const store = useOrderStore()
    const user = useUserStore()

    expect(() => store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'online', 'any')).toThrow('企业购买需要先完成企业认证')

    user.context.enterpriseAuthStatus = 'authenticated'
    expect(() => store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'online', 'any')).toThrow('企业购买需要先完成企业认证')

    user.completeEnterpriseAuth()
    user.context.currentMemberId = 'mem-not-in-enterprise'
    expect(() => store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'online', 'any')).toThrow('企业购买需要先完成企业认证')
  })

  it('consumes an enterprise checkout intent once so repeated submission cannot create another order', () => {
    const store = useOrderStore()
    useUserStore().completeEnterpriseAuth()
    const intent = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')

    const first = store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'online', intent.id)

    expect(first.ownerId).toBe('ent-wanlian-logistics')
    expect(() => store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'online', intent.id)).toThrow('企业报告结算意图无效')
    expect(store.list.filter((order) => order.id === first.id)).toHaveLength(1)
  })

  it('grants a contract report entitlement to the enterprise recorded on the order after its context is cleared', () => {
    const store = useOrderStore()
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const intent = store.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'contract')
    const order = store.submitEnterpriseOrder('prod-logistics-monthly', 1990, 'contract', intent.id)

    user.clearEnterpriseContext()
    store.confirmEnterpriseContract(order.id)

    expect(useEntitlementStore().list.some((entitlement) =>
      entitlement.productId === order.productId
      && entitlement.source === 'enterprise'
      && entitlement.ownerId === order.ownerId
      && entitlement.enterpriseId === order.ownerId
    )).toBe(true)
  })

  it('rejects contract confirmation for a personal order', () => {
    const store = useOrderStore()
    store.list = [seedOrder({ id: 'personal-contract' })]

    expect(() => store.confirmEnterpriseContract('personal-contract')).toThrow('仅企业订单可确认合同付款')
  })
})
