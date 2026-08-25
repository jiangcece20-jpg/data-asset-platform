import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useCatalogStore } from '@/stores/catalog'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useEntitlementStore } from '@/stores/entitlements'
import { appOrderCard, spaceOrderCard, type MyOrderCard, type MyOrderFilter } from '@/domain/myCenter'
import { orderExpiryText } from '@/domain/orderExpiry'
import type { Entitlement } from '@/types/domain'

export type MineOrderSubjectFilter = 'all' | 'personal' | 'enterprise'
export type MineOrderChannelFilter = 'all' | 'app' | 'space'

export interface FilterBuyDataOrdersOptions {
  orderFilter: MyOrderFilter
  subjectFilter: MineOrderSubjectFilter
  channelFilter: MineOrderChannelFilter
  /** portal 经办人筛选，'all' 或未传表示不过滤 */
  operatorFilter?: string
  /** portal 下单时间筛选的起始时间戳（毫秒），未传表示不过滤 */
  createdAfter?: number
}

/**
 * 迁出自 Mine.vue / PortalMine.vue 的订单聚合与过滤逻辑。
 * 买数订单列表（会员/VIP 之外）由 allOrders 提供；
 * filterBuyDataOrders 展示数据集，以及由空间意向单转入的 API 订单。
 */
/**
 * 注入续订信息（持续更新数据集 + 有有效期 → 显示续订提示）
 */
function injectRenewalInfo(card: MyOrderCard, entitlement: Entitlement | undefined): MyOrderCard {
  if (!card.productType || card.productType !== 'dataset') return card
  if (!entitlement?.validTo) return card
  const today = new Date().toISOString().slice(0, 10)
  const expiryDate = entitlement.validTo
  const daysUntilExpiry = Math.floor(
    (new Date(expiryDate).getTime() - new Date(today).getTime()) / 86_400_000,
  )
  card.renewalInfo = {
    renewalPath: `/portal/product/${card.productId}?action=renewal`,
    daysUntilExpiry,
    expiryDate,
    status: daysUntilExpiry < 0 ? 'expired' : 'expiring'
  }
  return card
}

export function useMineOrders() {
  const user = useUserStore()
  const orders = useOrderStore()
  const spaceOrders = useSpaceOrderStore()
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
        card.expiryText = orderExpiryText({
          order,
          product: catalog.byId(order.productId),
          entitlements: entitlements.list,
          memberExpiresAt: order.ownerId === user.context.currentMemberId ? user.context.memberExpiresAt : undefined,
          enterpriseExpiresAt: order.ownerId === user.enterprise.id ? user.enterprise.expiresAt : undefined
        })
        if (order.productType === 'dataset' && order.entitlementId) {
          const delivery = datasetCommerce.deliveries.find((item) => item.entitlementId === order.entitlementId)
          if (delivery?.downloadUrl) card.downloadUrl = delivery.downloadUrl
        }
        if (order.productType === 'dataset') {
          const entitlement = entitlements.list.find((e) => e.id === order.entitlementId)
          injectRenewalInfo(card, entitlement)
        }
        return card
      })

    const spaceCards = enterpriseContext
      ? spaceOrders.visibleFor(enterpriseContext).map((order) => spaceOrderCard(order, catalog.byId(order.appProductId)?.type, user.enterprise.name))
      : []

    return [...appCards, ...spaceCards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  function filterBuyDataOrders(opts: FilterBuyDataOrdersOptions): MyOrderCard[] {
    const { orderFilter, subjectFilter, channelFilter, operatorFilter, createdAfter } = opts
    return allOrders.value.filter((order) => (
      order.productType === 'dataset'
      || Boolean(order.spaceIntentId)
      && (orderFilter === 'all' || order.filter === orderFilter)
      && (subjectFilter === 'all' || order.ownerType === subjectFilter)
      && (channelFilter === 'all' || order.source === channelFilter)
      && (!operatorFilter || operatorFilter === 'all' || order.operatorMemberId === operatorFilter)
      && (!createdAfter || new Date(order.createdAt).getTime() >= createdAfter)
    ))
  }

  return { allOrders, filterBuyDataOrders }
}
