import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePortalPurchaseStore } from './portalPurchase'
import { useCatalogStore } from './catalog'
import { useUserStore } from './user'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useSpaceIntentStore } from './spaceIntents'
import { useDatasetCommerceStore } from './datasetCommerce'
import { startDatasetPayment } from '@/domain/purchaseIdentity'
import { commerceOffersOf } from '@/domain/commerceOffers'

describe('PC purchase V1.0.0', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useEntitlementStore().list = []
    useOrderStore().list = []
    useSpaceIntentStore().list = []
  })
  const dataset = () => useCatalogStore().byId('prod-truck-trajectory')!
  const report = () => useCatalogStore().byId('prod-logistics-monthly')!

  it.each([
    [false, false, 'free', ['开通会员｜会员价 ¥0']],
    [false, true, 'free', ['会员价｜¥0']],
    [true, false, 'free', ['单品购买｜¥199.99', '开通会员｜会员价 ¥0']],
    [true, true, 'free', ['单品购买｜¥199.99', '会员价｜¥0']],
    [false, false, 'discount', ['开通会员｜会员价 ¥119.99']],
    [false, true, 'discount', ['会员价｜¥119.99']],
    [true, false, 'discount', ['单品购买｜¥199.99', '开通会员｜会员价 ¥119.99']],
    [true, true, 'discount', ['单品购买｜¥199.99', '会员价｜¥119.99']]
  ] as const)('renders item=%s member=%s benefit=%s', (item, member, benefit, labels) => {
    const p = report()
    p.acquisitions = item ? ['item_purchase', 'member'] : ['member']
    p.commerceOffers = undefined
    p.price.itemPrice = 199.99
    p.memberBenefits = [{ tier: 'standard', mode: benefit, discount: 0.6 }]
    if (member) useEntitlementStore().grantMember()
    expect(usePortalPurchaseStore().actions(p).map((action) => action.label)).toEqual(labels)
  })

  it('charges the selected item/member price for reports including member-only offers', () => {
    const p = report()
    p.acquisitions = ['item_purchase', 'member']
    p.memberBenefits = [{ tier: 'standard', mode: 'discount', discount: 0.6 }]
    useEntitlementStore().grantMember()
    const offer = commerceOffersOf(p, true)[0]!
    const orders = useOrderStore()
    const direct = orders.purchaseCommerceProductForSubject(p.id, 'personal', offer.id, undefined, 'online', undefined, 'item')
    expect(direct.amount).toBe(offer.price)
    p.acquisitions = ['member']
    const discounted = orders.purchaseCommerceProductForSubject(p.id, 'personal', offer.id, undefined, 'online', undefined, 'member')
    expect(discounted.amount).toBe(Math.round(offer.price * 0.6 * 100) / 100)
  })

  it('creates and fulfills a zero-price dataset order', () => {
    const p = dataset()
    p.acquisitions = ['item_purchase']
    const personal = p.datasetOffers!.filter((offer) => offer.subject === 'personal')
    personal.forEach((offer) => { offer.price = 0 })
    p.commerceOffers = undefined
    expect(usePortalPurchaseStore().actions(p)[0]!.label).toBe('单品购买｜¥0')
    const { order } = startDatasetPayment(p.id, true, 'item')
    expect(order.amount).toBe(0)
    useDatasetCommerceStore().pay(order.id)
    expect(order.entitlementId).toBeTruthy()
    expect(useDatasetCommerceStore().deliveries.some((delivery) => delivery.orderId === order.id && delivery.status === 'delivered')).toBe(true)
  })

  it('uses member dataset price and lets ordinary enterprise members buy without approval', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const member = user.enterprise.members.find((item) => item.role === 'member' && item.status === 'active')!
    user.context.currentMemberId = member.id
    user.enterprise.purchasePolicy.memberPurchaseAllowed = false
    user.enterprise.purchasePolicy.memberPurchaseApprovalRequired = true
    useEntitlementStore().grantTeamMember()
    const p = dataset()
    p.acquisitions = ['item_purchase', 'member']
    p.memberBenefits = [{ tier: 'standard', mode: 'discount', discount: 0.6 }]
    const expected = usePortalPurchaseStore().amount(p, 'member')
    const { order, approvalRequest } = startDatasetPayment(p.id, true, 'member')
    expect(order.ownerType).toBe('enterprise')
    expect(order.amount).toBe(expected)
    expect(order.status).toBe('pending_payment')
    expect(approvalRequest).toBeUndefined()
  })

  it('grants free datasets without an order and blocks a second claim', () => {
    const p = dataset()
    p.acquisitions = ['free']
    const purchase = usePortalPurchaseStore()
    purchase.claimFree(p)
    expect(useOrderStore().list).toHaveLength(0)
    expect(useEntitlementStore().visibleDatasetEntitlements.some((item) => item.productId === p.id && item.status === 'active')).toBe(true)
    expect(purchase.blockingReason(p, 'free')).toBe('您已拥有该商品权益，无需重复获取')
  })

  it('scopes duplicate orders and entitlements to the current subject', () => {
    const p = dataset()
    useEntitlementStore().grantSingleItem(p, useUserStore().context.currentMemberId)
    const purchase = usePortalPurchaseStore()
    expect(purchase.blockingReason(p, 'item')).toBe('您已拥有该商品权益，无需重复获取')
    useUserStore().completeEnterpriseAuth()
    expect(purchase.blockingReason(p, 'item')).toBeUndefined()
    const { order } = startDatasetPayment(p.id, true, 'item')
    expect(purchase.blockingReason(p, 'item')).toBe('您有进行中的订单，请勿重复下单')
    order.status = 'payment_cancelled'
    expect(purchase.blockingReason(p, 'item')).toBeUndefined()
  })

  it('blocks enterprise trial duplicates across operators and allows closed applications', () => {
    const user = useUserStore()
    user.completeEnterpriseAuth()
    const p = useCatalogStore().byId('prod-space-port-throughput')!
    const intent = useSpaceIntentStore().submit({ productId: p.id, contactName: '测试', contactPhone: '13800000000', scenario: '测试', enterpriseId: user.context.currentEnterpriseId })
    user.context.currentMemberId = user.enterprise.members.find((item) => item.role === 'member' && item.status === 'active')!.id
    expect(usePortalPurchaseStore().blockingReason(p, 'trial')).toBe('您已提交过试用申请，请勿重复提交')
    intent.opsStatus = 'closed'
    expect(usePortalPurchaseStore().blockingReason(p, 'trial')).toBeUndefined()
  })
})
