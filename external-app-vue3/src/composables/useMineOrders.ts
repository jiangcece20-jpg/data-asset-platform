import { dashboardEntryPath } from '@/domain/dashboardEntry'
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useCatalogStore } from '@/stores/catalog'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useEntitlementStore } from '@/stores/entitlements'
import {
  appOrderCard,
  matchesBuyDataStatusFilter,
  spaceIntentCard,
  spaceOrderCard,
  type MyOrderCard,
  type MyOrderFilter
} from '@/domain/myCenter'
import { orderExpiryText } from '@/domain/orderExpiry'
import { addMonthsDate } from '@/domain/orderExpiry'
import type { Entitlement, ProductOrigin, ProductType } from '@/types/domain'
import { shanghaiDate } from '@/utils/businessDate'

export type MineOrderSubjectFilter = 'all' | 'personal' | 'enterprise'
export type MineOrderChannelFilter = 'all' | 'app' | 'space'
export type MineOrderTypeFilter = 'all' | ProductType
export type MineOrderOriginFilter = 'all' | ProductOrigin

export interface FilterBuyDataOrdersOptions {
  orderFilter: MyOrderFilter
  subjectFilter: MineOrderSubjectFilter
  channelFilter?: MineOrderChannelFilter
  typeFilter?: MineOrderTypeFilter
  originFilter?: MineOrderOriginFilter
  productName?: string
  /** portal 经办人筛选，'all' 或未传表示不过滤 */
  operatorFilter?: string
  /** portal 下单时间筛选的起始时间戳（毫秒），未传表示不过滤 */
  createdAfter?: number
  createdBefore?: number
}

/**
 * 迁出自 Mine.vue / PortalMine.vue 的订单聚合与过滤逻辑。
 * 买数订单列表：数据集 / API / 报告 / 看板订单、空间试用意向、空间镜像。不含 VIP 会员单。
 */
function injectExpiryInfo(card: MyOrderCard, entitlement: Entitlement | undefined): MyOrderCard {
  if (!card.productType || card.productType !== 'dataset') return card
  const expiryDate = entitlement?.updateValidTo || entitlement?.validTo
  if (!expiryDate) return card
  const today = shanghaiDate()
  const daysUntilExpiry = Math.floor(
    (new Date(expiryDate).getTime() - new Date(today).getTime()) / 86_400_000,
  )
  card.expiryInfo = {
    daysUntilExpiry,
    expiryDate,
    status: daysUntilExpiry < 0 ? 'expired' : 'expiring'
  }
  return card
}

const BUY_DATA_TYPES = new Set(['dataset', 'api', 'report', 'dashboard'])

function isBuyDataCard(order: MyOrderCard): boolean {
  return (
    order.source === 'intent'
    || order.source === 'space'
    || Boolean(order.spaceIntentId)
    || (order.productType != null && BUY_DATA_TYPES.has(order.productType))
  )
}

function usableSourceDeliveryUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function useMineOrders() {
  const user = useUserStore()
  const orders = useOrderStore()
  const spaceOrders = useSpaceOrderStore()
  const spaceIntents = useSpaceIntentStore()
  const catalog = useCatalogStore()
  const datasetCommerce = useDatasetCommerceStore()
  const entitlements = useEntitlementStore()

  const enterpriseMember = computed(() => user.currentEnterpriseMember)
  const enterpriseOrderUser = computed(() => {
    if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId || !enterpriseMember.value) return undefined
    return {
      currentEnterpriseId: user.context.currentEnterpriseId,
      currentMemberId: user.context.currentMemberId,
      enterpriseAuthStatus: user.context.enterpriseAuthStatus,
      role: enterpriseMember.value.role
    }
  })

  const allOrders = computed<MyOrderCard[]>(() => {
    const enterpriseContext = enterpriseOrderUser.value
    const appCards = orders.appOrders
      .filter((order) => {
        if (order.ownerType === 'personal') return order.ownerId === user.context.currentMemberId
        if (!enterpriseContext || order.ownerId !== enterpriseContext.currentEnterpriseId) return false
        return enterpriseContext.role === 'admin' || order.operatorMemberId === enterpriseContext.currentMemberId
      })
      .map((order) => {
        const card = appOrderCard(order, user.enterprise.name)
        card.productType ||= catalog.byId(order.productId)?.type
        const currentProduct = catalog.byId(order.productId)
        if (currentProduct) card.productName = currentProduct.name
        if (order.productType === 'dataset') {
          card.updateFrequency ||= currentProduct?.updateFrequency
          card.servicePeriodMonths ||= order.selectedTermMonths ?? currentProduct?.salePeriodMonths
          const entitlement = entitlements.list.find((item) => item.orderId === order.id)
          card.serviceStart = entitlement?.validFrom ?? order.paidAt
          card.entitlementEffectiveAt = entitlement?.validFrom
          card.serviceEnd = entitlement?.updateValidTo
            ?? entitlement?.validTo
            ?? (card.serviceStart && card.servicePeriodMonths ? addMonthsDate(card.serviceStart, card.servicePeriodMonths) : undefined)
        }
        if (currentProduct?.availability === 'delisted' || currentProduct?.status === 'delisted') {
          card.canPay = false
          card.paymentPath = undefined
        }
        card.expiryText = order.status === 'cancelled' || order.status === 'payment_cancelled' ? undefined : orderExpiryText({
          order,
          product: catalog.byId(order.productId),
          entitlements: entitlements.list,
          memberExpiresAt: order.ownerId === user.context.currentMemberId ? user.context.memberExpiresAt : undefined,
          enterpriseExpiresAt: order.ownerId === user.enterprise.id ? user.enterprise.expiresAt : undefined
        })
        if (order.productType === 'dataset' && order.entitlementId) {
          const delivery = datasetCommerce.deliveries.find((item) => item.entitlementId === order.entitlementId && item.orderId === order.id)
          const entitlement = entitlements.list.find((item) => item.id === order.entitlementId)
          card.firstDeliveredAt = delivery?.deliveredAt
          card.deliveryStatus = delivery ? ({ pending: '待交付', provisioning: '交付中', delivered: '已交付', failed: '交付失败，处理中', suspended: '交付暂停', expired: '已停止更新' } as const)[delivery.status] : '未交付'
          card.canUseDataset = Boolean(delivery?.status === 'delivered' && entitlement
            && ['active', 'expired'].includes(entitlement.status)
            && entitlement.orderId === order.id && entitlement.productId === order.productId
            && entitlement.ownerId === order.ownerId && entitlement.source === order.ownerType
            && (order.ownerType === 'personal' || enterpriseContext?.role === 'admin'
              || entitlement.accessScope === 'enterprise_wide' || entitlement.assignedMemberIds?.includes(user.context.currentMemberId))
            && ['entitlement_active', 'refunded'].includes(order.status))
          if (card.canUseDataset && delivery) {
            card.biEntryUrl = delivery.biEntryUrl
            card.downloadUrl = delivery.downloadUrl
          }
        }
        if (order.productType === 'dataset') {
          const entitlement = entitlements.list.find((e) => e.id === order.entitlementId)
          injectExpiryInfo(card, entitlement)
          card.serviceStatus = entitlement && ['frozen', 'revoked', 'migrating'].includes(entitlement.status)
            ? '使用受限' : card.expiryInfo?.status === 'expired' || entitlement?.status === 'expired'
              ? '服务已到期' : entitlement?.status === 'active' ? '权益已生效' : '待开通'
          card.deliveryStatus ||= '未交付'
        }
        if (currentProduct?.type === 'dashboard') {
          const today = shanghaiDate()
          const matching = entitlements.list.filter(entitlement => entitlement.orderId === order.id
            && entitlement.productId === order.productId && entitlement.ownerId === order.ownerId
            && entitlement.source === order.ownerType)
          const active = matching.some(entitlement => entitlement.status === 'active'
            && entitlement.validFrom.slice(0, 10) <= today
            && (!entitlement.validTo || entitlement.validTo.slice(0, 10) >= today)
            && (!entitlement.updateValidTo || entitlement.updateValidTo.slice(0, 10) >= today)
            && (enterpriseContext?.role === 'admin' || entitlement.accessScope === 'enterprise_wide'
              || entitlement.assignedMemberIds?.includes(user.context.currentMemberId)
              || (entitlement.type === 'seat' && user.currentEnterpriseMember?.seatAssigned)))
          const expired = matching.some(entitlement => ['active', 'expired'].includes(entitlement.status)
            && (entitlement.status === 'expired'
              || (!!entitlement.validTo && entitlement.validTo.slice(0, 10) < today)
              || (!!entitlement.updateValidTo && entitlement.updateValidTo.slice(0, 10) < today))
            && (enterpriseContext?.role === 'admin' || entitlement.accessScope === 'enterprise_wide'
              || entitlement.assignedMemberIds?.includes(user.context.currentMemberId)
              || (entitlement.type === 'seat' && user.currentEnterpriseMember?.seatAssigned)))
          const entryAvailable = order.status === 'entitlement_active'
            && currentProduct.availability === 'published' && currentProduct.status === 'published'
            && !['suspended', 'terminated'].includes(currentProduct.serviceStatus)
          card.canUseDashboard = active && entryAvailable
          card.canOpenDashboard = (active || expired) && entryAvailable
          card.serviceStatus = active ? '权益有效' : expired ? '权益已到期' : '暂无可用权益'
          if (card.canOpenDashboard) card.dashboardPath = dashboardEntryPath(currentProduct, 'app')
        }
        return card
      })

    const spaceCards = enterpriseContext
      ? spaceOrders.visibleFor(enterpriseContext).map((order) => {
        const card = spaceOrderCard(order, catalog.byId(order.appProductId)?.type, user.enterprise.name)
        card.productName = catalog.byId(order.appProductId)?.name ?? card.productName
        const today = shanghaiDate()
        const matching = entitlements.list.filter(entitlement =>
          entitlement.type === 'dataset' && entitlement.source === 'enterprise'
          && entitlement.orderId === order.spaceOrderId && entitlement.productId === order.appProductId
          && entitlement.ownerId === enterpriseContext.currentEnterpriseId
          && entitlement.enterpriseId === enterpriseContext.currentEnterpriseId)
        const currentAuthorization = matching.find(entitlement => entitlement.status === 'active'
          && entitlement.validFrom.slice(0, 10) <= today
          && (!entitlement.validTo || entitlement.validTo.slice(0, 10) >= today)
          && (!entitlement.updateValidTo || entitlement.updateValidTo.slice(0, 10) >= today))
        const hasCurrentAuthorization = !!currentAuthorization && (currentAuthorization.accessScope === 'enterprise_wide'
          || enterpriseContext.role === 'admin'
          || currentAuthorization.assignedMemberIds?.includes(enterpriseContext.currentMemberId))
        const expiredAuthorization = matching.find(entitlement => ['active', 'expired'].includes(entitlement.status)
          && (entitlement.status === 'expired'
            || (!!entitlement.validTo && entitlement.validTo.slice(0, 10) < today)
            || (!!entitlement.updateValidTo && entitlement.updateValidTo.slice(0, 10) < today)))
        if (card.productType === 'dataset') {
          card.serviceStatus = currentAuthorization ? '权益有效' : expiredAuthorization ? '权益已到期' : '暂无可用权益'
          const authorization = currentAuthorization || expiredAuthorization
          if (authorization) {
            const ends = [authorization.validTo, authorization.updateValidTo].filter(Boolean).sort() as string[]
            injectExpiryInfo(card, { ...authorization, updateValidTo: ends[0] })
          }
        }
        card.canUseDataset = card.productType === 'dataset'
          && order.displayStatus === 'delivered'
          && usableSourceDeliveryUrl(order.downloadUrl)
          && hasCurrentAuthorization
        if (!card.canUseDataset && card.productType === 'dataset') card.downloadUrl = undefined
        if (card.productType === 'dataset') card.deliveryStatus = order.displayStatus !== 'delivered' ? '以源端交付为准'
          : currentAuthorization && !usableSourceDeliveryUrl(order.downloadUrl) ? '交付链接暂不可用' : '已交付（源端）'
        return card
      })
      : []

    const intentCards = spaceIntents
      .userVisibleByOwner(user.context.currentMemberId)
      .map((intent) =>
        spaceIntentCard(
          intent,
          catalog.byId(intent.productId)?.name ?? intent.productId,
          user.enterprise.name
        )
      )

    return [...appCards, ...spaceCards, ...intentCards].map(card => {
      const product = catalog.byId(card.productId)
      card.productDelisted = !!product && [product.availability, product.status].some(status => ['delisted', 'paused'].includes(status))
      return card
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  function filterBuyDataOrders(opts: FilterBuyDataOrdersOptions): MyOrderCard[] {
    const { orderFilter, subjectFilter, channelFilter, typeFilter, originFilter, productName, operatorFilter, createdAfter, createdBefore } = opts
    const normalizedOrigin = (origin: ProductOrigin) => origin === 'asset_platform' ? 'app_content' : origin
    return allOrders.value.filter((order) => (
      isBuyDataCard(order)
      && matchesBuyDataStatusFilter(order, orderFilter)
      && (subjectFilter === 'all' || order.ownerType === subjectFilter)
      && (typeFilter === undefined || typeFilter === 'all' || order.productType === typeFilter)
      && (!originFilter || originFilter === 'all'
        || normalizedOrigin(catalog.byId(order.productId)?.origin ?? (order.source === 'space' || order.source === 'intent' ? 'trusted_space' : 'app_content')) === normalizedOrigin(originFilter))
      && (!productName?.trim() || order.productName.toLocaleLowerCase().includes(productName.trim().toLocaleLowerCase()))
      && (!channelFilter || channelFilter === 'all'
        || (channelFilter === 'app' && (order.source === 'app' || order.source === 'intent'))
        || (channelFilter === 'space' && order.source === 'space'))
      && (!operatorFilter || operatorFilter === 'all' || order.operatorMemberId === operatorFilter)
      && (!createdAfter || new Date(order.createdAt).getTime() >= createdAfter)
      && (!createdBefore || new Date(order.createdAt).getTime() <= createdBefore)
    ))
  }

  function findOrder(source: string, id: string): MyOrderCard | undefined {
    return allOrders.value.find((order) => order.source === source && order.id === id)
  }

  return { allOrders, filterBuyDataOrders, findOrder }
}
