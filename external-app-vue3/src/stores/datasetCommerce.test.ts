import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDatasetCommerceStore } from './datasetCommerce'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useUserStore } from './user'
import { mockBiDeliveryAdapter } from '@/services/bi/mockBiDeliveryAdapter'

describe('dataset commerce closed loop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockBiDeliveryAdapter.reset()
  })

  it('personal purchase pays online and activates a BI dataset entitlement', () => {
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'personal')
    expect(order.status).toBe('pending_payment')
    expect(order.paymentMethod).toBe('personal_online')

    commerce.pay(order.id)

    expect(order.status).toBe('entitlement_active')
    expect(commerce.deliveries.at(-1)?.status).toBe('delivered')
    expect(useEntitlementStore().list.find((item) => item.id === order.entitlementId)?.status).toBe('active')
  })

  it('prices a finite personal continuous-update term and persists it to order and entitlement', () => {
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'personal', 'offer-truck-personal-updates', 36)

    expect(order).toMatchObject({
      serviceMode: 'continuous',
      selectedTermMonths: 36,
      amount: 2997
    })
    commerce.pay(order.id)
    expect(useEntitlementStore().list.find((item) => item.id === order.entitlementId)).toMatchObject({
      serviceMode: 'continuous',
      selectedTermMonths: 36,
      updateValidTo: expect.any(String)
    })
    expect(useEntitlementStore().list.find((item) => item.id === order.entitlementId)?.validTo).toBeUndefined()
  })

  it('rejects a continuous-update duration beyond the configured maximum', () => {
    expect(() => useDatasetCommerceStore().createOrder(
      'prod-truck-trajectory',
      'personal',
      'offer-truck-personal-updates',
      48
    )).toThrow('最长 36 个月')
  })

 it('ordinary enterprise member submits approval before enterprise-balance payment', () => {
   const user = useUserStore()
   user.context.currentMemberId = 'mem-2'
   user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = true
    const commerce = useDatasetCommerceStore()
    const { order, approvalRequest } = commerce.createOrder('prod-truck-trajectory', 'enterprise')
    expect(order.status).toBe('pending_approval')
    expect(order.paymentMethod).toBe('enterprise_balance')
    expect(approvalRequest?.status).toBe('pending')
    expect(() => commerce.pay(order.id)).toThrow('订单当前不可支付')

    user.context.currentMemberId = 'mem-1'
    user.context.role = 'admin'
    commerce.approve(approvalRequest!.id)
    expect(order.status).toBe('pending_payment')
    commerce.pay(order.id)
    expect(order.status).toBe('entitlement_active')
    expect(order.ownerType).toBe('enterprise')
  })

  it('ordinary member may pay directly when enterprise disables approval', () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = false
    const { order } = useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'enterprise')
    expect(order.status).toBe('pending_payment')
  })

  it('supports three enterprise payment methods and blocks personal payment', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const commerce = useDatasetCommerceStore()

    for (const method of ['enterprise_balance', 'enterprise_contract', 'enterprise_bank_transfer'] as const) {
      const { order } = commerce.createOrder('prod-truck-trajectory', 'enterprise')
      commerce.selectPaymentMethod(order.id, method)
      expect(order.paymentMethod).toBe(method)
    }

    const { order } = commerce.createOrder('prod-truck-trajectory', 'enterprise')
    expect(() => commerce.selectPaymentMethod(order.id, 'personal_online')).toThrow('支付方式与购买主体不匹配')
  })

  it('blocks an ordinary member when enterprise purchasing is disabled', () => {
    const user = useUserStore()
    user.context.currentMemberId = 'mem-2'
    user.completeEnterpriseAuth()
    user.enterprise.purchasePolicy.memberPurchaseAllowed = false
    expect(() => useDatasetCommerceStore().createOrder('prod-truck-trajectory', 'enterprise')).toThrow('不允许普通成员')
  })

  it('lets an admin assign named enterprise dataset rights to employees', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'enterprise')
    commerce.pay(order.id)
    const entitlement = useEntitlementStore().list.find((item) => item.id === order.entitlementId)!
    useEntitlementStore().assignDatasetMembers(entitlement.id, ['mem-1', 'mem-2'])
    expect(entitlement.assignedMemberIds).toEqual(['mem-1', 'mem-2'])
    user.switchMockEnterpriseMember('mem-2')
    expect(useEntitlementStore().hasDatasetAccess('prod-truck-trajectory')).toBe('enterprise')
  })

  it('keeps order paid and entitlement pending when BI delivery fails, then retries', () => {
    const commerce = useDatasetCommerceStore()
    const { order } = commerce.createOrder('prod-truck-trajectory', 'personal')
    commerce.pay(order.id, true)
    const delivery = commerce.deliveries.at(-1)!
    expect(order.status).toBe('paid')
    expect(delivery.status).toBe('failed')
    expect(useEntitlementStore().list.find((item) => item.id === order.entitlementId)?.status).toBe('pending')

    commerce.retryDelivery(delivery.id)
    expect(delivery.status).toBe('delivered')
    expect(order.status).toBe('entitlement_active')
  })

  it('does not route trusted-space datasets through APP payment', () => {
    expect(() => useDatasetCommerceStore().createOrder('prod-enterprise-activity', 'enterprise')).toThrow('仅支持资产平台来源')
    expect(useOrderStore().list.some((order) => order.productId === 'prod-enterprise-activity')).toBe(false)
  })

  it('pauses new purchases for high-risk asset changes', () => {
    expect(() => useDatasetCommerceStore().createOrder('prod-warehouse-turnover-risk', 'personal')).toThrow('暂停新购')
  })
})
