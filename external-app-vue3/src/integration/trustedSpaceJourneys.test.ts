import { readFileSync } from 'node:fs'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockTrustedSpaceAdapter } from '@/services/trusted-space/mockTrustedSpaceAdapter'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useEntitlementStore } from '@/stores/entitlements'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'

describe('trusted-space end-to-end journeys', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-27T10:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('keeps a certified enterprise purchase outside APP orders through SSO return, mirror sync, and bill access', async () => {
    const adapter = new MockTrustedSpaceAdapter(() => '2026-07-27T10:00:00.000Z')
    const user = useUserStore()
    const orders = useOrderStore()
    const entitlements = useEntitlementStore()
    const catalog = useTrustedSpaceCatalogStore()
    const purchases = useTrustedSpacePurchaseStore()
    const spaceOrders = useSpaceOrderStore()
    const bills = useApiUsageBillsStore()
    const appOrderCount = orders.list.length
    const entitlementCount = entitlements.list.length

    user.completeEnterpriseAuth()
    await catalog.syncAll(adapter)
    const intent = await purchases.preparePurchase({
      appEnterpriseId: user.context.currentEnterpriseId!,
      operatorMemberId: user.context.currentMemberId,
      appProductId: 'prod-qualification-api',
      enterpriseAuthStatus: user.context.enterpriseAuthStatus,
      returnUrl: '/app/product/prod-qualification-api'
    }, adapter)
    const ssoUrl = await purchases.createLink(intent.id, adapter, new Date('2026-07-27T10:00:00.000Z'))

    expect(ssoUrl).toContain(`intent=${intent.id}`)
    expect(intent).toMatchObject({
      appEnterpriseId: 'ent-wanlian-logistics',
      spaceEnterpriseId: 'space-ent-wanlian',
      operatorMemberId: 'mem-1'
    })

    purchases.markRedirected(intent.id)
    purchases.markReturned(intent.id)
    expect(intent.status).toBe('returned_pending_sync')

    adapter.findOrderByIntent = async (intentId) => intentId === intent.id ? {
      eventId: 'space-event-e2e-001',
      idempotencyKey: 'space-order-e2e-001',
      eventVersion: 1,
      signatureValid: true,
      spaceOrderId: 'space-order-e2e-001',
      purchaseIntentId: intent.id,
      spaceEnterpriseId: intent.spaceEnterpriseId,
      spaceProductNo: intent.spaceProductNo,
      rawStatus: 'DELIVERED',
      amount: 1280,
      currency: 'CNY',
      occurredAt: '2026-07-27T10:01:00.000Z',
      deliverySummary: '资格核验 API 已开通',
      detailUrl: 'https://trusted-space.mock/orders/space-order-e2e-001'
    } : undefined
    const mirror = await spaceOrders.reconcileIntent(intent.id, adapter)

    expect(mirror).toMatchObject({
      spaceOrderId: 'space-order-e2e-001',
      appEnterpriseId: 'ent-wanlian-logistics',
      operatorMemberId: 'mem-1',
      displayStatus: 'delivered'
    })
    expect(spaceOrders.visibleFor(user.context)).toHaveLength(1)
    expect(orders.list).toHaveLength(appOrderCount)
    expect(entitlements.list).toHaveLength(entitlementCount)

    await bills.syncBills(intent.appEnterpriseId, intent.spaceEnterpriseId, adapter)
    const adminBill = bills.visibleBills(intent.operatorMemberId, 'admin')[0]
    expect(adminBill).toMatchObject({ totalAmount: 1840, visibleCalls: 1840 })
    await expect(bills.download(adminBill.spaceBillId, intent.operatorMemberId, 'admin', adapter)).resolves.toContain('/download')
    await expect(bills.support(adminBill.spaceBillId, intent.operatorMemberId, 'admin', '/app/mine/enterprise/bills')).resolves.toContain('/support')
  })

  it('creates APP report orders and entitlements for the selected personal or enterprise subject only', () => {
    const orders = useOrderStore()
    const entitlements = useEntitlementStore()

    const personalOrder = orders.purchaseReportForSubject('prod-logistics-monthly', 'personal')
    expect(personalOrder).toMatchObject({ ownerType: 'personal', ownerId: 'mem-1', entitlementGranted: true })
    expect(entitlements.list.some((item) => item.productId === personalOrder.productId && item.ownerId === 'mem-1')).toBe(true)

    useUserStore().completeEnterpriseAuth()
    const checkout = orders.createEnterpriseReportCheckoutIntent('prod-logistics-monthly', 'online')
    const enterpriseOrder = orders.purchaseReportForSubject('prod-logistics-monthly', 'enterprise', 'online', checkout.id)

    expect(enterpriseOrder).toMatchObject({ ownerType: 'enterprise', ownerId: 'ent-wanlian-logistics', entitlementGranted: true })
    expect(entitlements.list.some((item) => item.productId === enterpriseOrder.productId && item.ownerId === 'ent-wanlian-logistics')).toBe(true)
  })
})

describe('trusted-space README demo contract', () => {
  it('documents the direct routes, role switching, authority boundaries, and report purchase subjects', () => {
    const readme = readFileSync('README.md', 'utf8')

    for (const route of [
      '/#/app/product/prod-qualification-api',
      '/#/app/mine?tab=企业订单',
      '/#/app/mine/enterprise/bills',
      '/#/admin/products',
      '/#/admin/orders',
      '/#/admin/approval/integration'
    ]) expect(readme).toContain(route)

    for (const statement of [
      '可信空间是数据集/API 商品、订单、交付和账单的事实权威',
      'APP 不创建空间权益',
      '账单疑问回可信空间处理',
      '个人/企业购买主体'
    ]) expect(readme).toContain(statement)
  })
})
