import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useCatalogStore } from '@/stores/catalog'
import { appOrderCard, spaceOrderCard, type MyOrderCard, type MyOrderFilter } from '@/domain/myCenter'

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
 * 买数订单列表（会员/VIP 之外的全部商品订单）由 allOrders 提供；
 * filterBuyDataOrders 在此基础上恒定追加 productType === 'dataset'，
 * 确保会员权益订单（productId === 'membership'，无 productType）永不出现在买数列表。
 */
export function useMineOrders() {
  const user = useUserStore()
  const orders = useOrderStore()
  const spaceOrders = useSpaceOrderStore()
  const catalog = useCatalogStore()

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
      && (orderFilter === 'all' || order.filter === orderFilter)
      && (subjectFilter === 'all' || order.ownerType === subjectFilter)
      && (channelFilter === 'all' || order.source === channelFilter)
      && (!operatorFilter || operatorFilter === 'all' || order.operatorMemberId === operatorFilter)
      && (!createdAfter || new Date(order.createdAt).getTime() >= createdAfter)
    ))
  }

  return { allOrders, filterBuyDataOrders }
}
