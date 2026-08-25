import readme from '../../README.md?raw'
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
    const adminBill = bills.visibleBills()[0]
    expect(adminBill).toMatchObject({ totalAmount: 1840, visibleCalls: 1840 })
    await expect(bills.download(adminBill.spaceBillId, adapter)).resolves.toContain('/download')
    await expect(bills.support(
      adminBill.spaceBillId,
      '/app/mine/enterprise/bills',
      adapter,
      () => new Date('2026-07-27T10:00:00.000Z')
    )).resolves.toContain('/support')
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
    for (const route of [
      '/#/app/product/prod-qualification-api',
      '/#/admin/space-intents',
      '/#/app/mine?tab=orders&subject=enterprise',
      '/#/app/mine/enterprise/bills',
      '/#/admin/products',
      '/#/admin/approval/integration'
    ]) expect(readme).toContain(route)

    for (const statement of [
      '提交意向单',
      '万联易达可信空间',
      '数据集接到本平台用数',
      'API 仍在空间使用',
      '个人/企业购买主体',
      '`mem-1`',
      '**管理员**',
      '`mem-2`',
      '**普通成员**',
      '成员只能看到本人经办的空间订单与本人账单范围，页面不显示企业总额。',
      '“原型身份”开关切换管理员/普通成员'
    ]) expect(readme).toContain(statement)
  })
})
