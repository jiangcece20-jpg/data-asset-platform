import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { portalPurchaseActions, purchaseMemberBenefit, purchasePrice, type PortalPurchaseKey, type PurchasePricePath } from '@/domain/portalPurchase'
import { useUserStore } from './user'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useSpaceIntentStore } from './spaceIntents'
import { genId, now } from '@/utils/id'
import { salePeriodMonthsOf } from '@/domain/commerceOffers'

export const usePortalPurchaseStore = defineStore('portalPurchase', () => {
  const user = useUserStore()
  const catalog = useCatalogStore()
  const entitlements = useEntitlementStore()
  const orders = useOrderStore()
  const intents = useSpaceIntentStore()
  const subject = computed(() => currentPurchaseSubject(user))
  const ownerId = computed(() => subject.value === 'enterprise' ? user.context.currentEnterpriseId! : user.context.currentMemberId)
  const context = computed(() => ({ loggedIn: user.context.loggedIn, subject: subject.value, memberTier: entitlements.currentMemberTier }))
  const actions = (product: Product) => portalPurchaseActions(product, context.value)
  const amount = (product: Product, path: PurchasePricePath) => purchasePrice(product, subject.value, path, entitlements.currentMemberTier)
  const groupIds = (product: Product) => new Set(catalog.groupMembersOf(product.id).map((item) => item.id))

  function hasItem(product: Product) {
    const ids = groupIds(product)
    const today = now().slice(0, 10)
    return entitlements.list.some((item) => item.type !== 'member'
      && item.source === subject.value && item.ownerId === ownerId.value
      && item.productId != null && ids.has(item.productId)
      && item.status === 'active' && item.validFrom.slice(0, 10) <= today && (!item.validTo || item.validTo >= today)
      && (!item.orderId || !orders.list.some((order) => order.id === item.orderId && ['refunded', 'payment_failed', 'payment_cancelled', 'closed'].includes(order.status))))
  }

  function memberFree(product: Product) {
    return product.origin !== 'seller_market' && product.dealChannel !== 'space_purchase'
      && product.acquisitions.includes('member') && !!entitlements.currentMemberTier
      && purchaseMemberBenefit(product, entitlements.currentMemberTier).mode === 'free'
  }

  function blockingReason(product: Product, key: PortalPurchaseKey): string | undefined {
    if (product.availability === 'delisted' || product.status === 'delisted') return '商品已下架，暂不可操作'
    if (!user.context.loggedIn) return '请先登录'
    if (key === 'subscribe') return undefined
    if (key === 'trial' && intents.list.some((item) => item.productId === product.id
      && (subject.value === 'enterprise' ? item.enterpriseId === ownerId.value : !item.enterpriseId && item.ownerMemberId === ownerId.value)
      && ['unclaimed', 'processing'].includes(item.opsStatus))) return '您已提交过试用申请，请勿重复提交'
    if (orders.list.some((order) => order.productId === product.id
      && order.ownerType === subject.value && order.ownerId === ownerId.value
      && ['pending_payment', 'pending_approval', 'payment_pending_confirmation', 'paid', 'pending_activation'].includes(order.status))) {
      return '您有进行中的订单，请勿重复下单'
    }
    if (hasItem(product)) return '您已拥有该商品权益，无需重复获取'
    if (key === 'member' && memberFree(product)) return '您已享会员免费权益，无需重复获取'
    return undefined
  }

  function claimFree(product: Product) {
    const reason = blockingReason(product, 'free')
    if (reason) throw new Error(reason)
    if (!product.acquisitions.includes('free') || product.dealChannel === 'space_purchase') throw new Error('非免费商品')
    const end = new Date()
    end.setMonth(end.getMonth() + salePeriodMonthsOf(product))
    for (const target of catalog.groupMembersOf(product.id)) {
      if (target.type === 'dataset') {
        entitlements.list.push({
          id: genId('ent-free'), type: 'dataset', source: subject.value, ownerId: ownerId.value,
          enterpriseId: subject.value === 'enterprise' ? ownerId.value : undefined,
          productId: target.id, status: 'active', validFrom: now(), validTo: end.toISOString().slice(0, 10),
          accessScope: subject.value === 'enterprise' ? 'enterprise_wide' : 'personal',
          assignedMemberIds: [user.context.currentMemberId], allowDownload: true
        })
        if (subject.value === 'enterprise') user.grantEnterpriseEntitlement(target.id)
      } else if (subject.value === 'enterprise') {
        entitlements.grantEnterpriseSeat(target.id, ownerId.value, { termMonths: salePeriodMonthsOf(target) })
      } else {
        entitlements.grantSingleItem(target, ownerId.value)
      }
    }
  }

  return { subject, ownerId, actions, amount, hasItem, memberFree, blockingReason, claimFree }
})
