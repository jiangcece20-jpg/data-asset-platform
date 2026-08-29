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
  spaceIntentCard,
  spaceOrderCard,
  type MyOrderCard,
  type MyOrderFilter
} from '@/domain/myCenter'
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
 * 买数订单列表：数据集订单、空间试用意向（状态=意向单）、空间意向转入订单、空间镜像。
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

function isBuyDataCard(order: MyOrderCard): boolean {
  return (
    order.source === 'intent'
    || order.status === 'intent'
    || order.productType === 'dataset'
    || Boolean(order.spaceIntentId)
    || order.source === 'space'
  )
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

    const intentCards = spaceIntents
      .userVisibleByOwner(user.context.currentMemberId)
      .map((intent) =>
        spaceIntentCard(
          intent,
          catalog.byId(intent.productId)?.name ?? intent.productId,
          user.enterprise.name
        )
      )

    return [...appCards, ...spaceCards, ...intentCards].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  function filterBuyDataOrders(opts: FilterBuyDataOrdersOptions): MyOrderCard[] {
    const { orderFilter, subjectFilter, channelFilter, operatorFilter, createdAfter } = opts
    return allOrders.value.filter((order) => (
      isBuyDataCard(order)
      && (orderFilter === 'all' || order.filter === orderFilter)
      && (subjectFilter === 'all' || order.ownerType === subjectFilter)
      && (channelFilter === 'all'
        || (channelFilter === 'app' && (order.source === 'app' || order.source === 'intent'))
        || (channelFilter === 'space' && order.source === 'space'))
      && (!operatorFilter || operatorFilter === 'all' || order.operatorMemberId === operatorFilter)
      && (!createdAfter || new Date(order.createdAt).getTime() >= createdAfter)
    ))
  }

  function findOrder(source: string, id: string): MyOrderCard | undefined {
    return allOrders.value.find((order) => order.source === source && order.id === id)
  }

  return { allOrders, filterBuyDataOrders, findOrder }
}
