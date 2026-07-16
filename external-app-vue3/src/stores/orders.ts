import { defineStore } from 'pinia'
import { seedOrders } from '@/data/seed'
import type { Order } from '@/types/domain'
import { genId, now } from '@/utils/id'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'
import { useUserStore } from './user'

export const useOrderStore = defineStore('orders', {
  state: () => ({
    list: seedOrders.map((o) => ({ ...o })) as Order[]
  }),
  getters: {
    appOrders(state): Order[] {
      return state.list.filter((o) => o.channel === 'app')
    },
    spaceOrders(state): Order[] {
      return state.list.filter((o) => o.channel === 'space')
    },
    enterpriseOrders(state): Order[] {
      return state.list.filter((o) => o.ownerType === 'enterprise')
    }
  },
  actions: {
    // 会员购买（即时支付成功，简化收银台）
    purchaseMember(months = 12) {
      const entitlements = useEntitlementStore()
      const user = useUserStore()
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId: 'membership',
        productName: `个人会员 · ${months} 个月`,
        amount: months === 12 ? 299 : 39,
        status: 'entitlement_active',
        createdAt: now(),
        paidAt: now()
      }
      this.list.push(order)
      entitlements.grantMember(months)
      return order
    },
    // 单品购买
    purchaseItem(productId: string, amount: number) {
      const catalog = useCatalogStore()
      const entitlements = useEntitlementStore()
      const user = useUserStore()
      const product = catalog.byId(productId)
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId,
        productName: product?.name || productId,
        amount,
        status: 'entitlement_active',
        createdAt: now(),
        paidAt: now()
      }
      this.list.push(order)
      if (product) entitlements.grantItem(product)
      return order
    },
    // 企业采购：小额可在线支付，大额走报价合同
    submitEnterpriseOrder(productId: string, amount: number, mode: 'online' | 'contract') {
      const catalog = useCatalogStore()
      const user = useUserStore()
      const product = catalog.byId(productId)
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'enterprise',
        ownerId: user.context.currentEnterpriseId || user.enterprise.id,
        productId,
        productName: product?.name || productId,
        amount,
        status: mode === 'online' ? 'entitlement_active' : 'pending_payment',
        contractStatus: mode === 'online' ? 'not_required' : 'quoting',
        createdAt: now(),
        paidAt: mode === 'online' ? now() : undefined
      }
      this.list.push(order)
      if (mode === 'online') {
        const entitlements = useEntitlementStore()
        entitlements.grantEnterpriseSeat(productId)
      }
      return order
    },
    // 空间购买：先创建“待跳转”，随后模拟处理中 -> 成功/延迟
    createSpaceOrder(productId: string) {
      const catalog = useCatalogStore()
      const user = useUserStore()
      const product = catalog.byId(productId)
      const order: Order = {
        id: genId('order'),
        channel: 'space',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId,
        productName: product?.name || productId,
        amount: 0,
        status: 'pending_redirect',
        createdAt: now()
      }
      this.list.push(order)
      return order
    },
    advanceSpaceOrder(orderId: string, outcome: 'success' | 'delayed') {
      const order = this.list.find((o) => o.id === orderId)
      if (!order) return
      order.status = outcome === 'success' ? 'purchase_success' : 'callback_delayed'
      if (outcome === 'success') {
        setStatusChain(order)
      }
    },
    retryCallback(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (!order) return
      order.status = 'purchase_success'
      setStatusChain(order)
    },
    // 后台：确认企业合同付款
    confirmEnterpriseContract(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (!order) return
      order.contractStatus = 'payment_confirmed'
      order.status = 'entitlement_active'
      order.paidAt = now()
      const entitlements = useEntitlementStore()
      entitlements.grantEnterpriseSeat(order.productId)
    },
    signContract(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (order) order.contractStatus = 'contract_signed'
    },
    cancelOrder(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (order) order.status = 'payment_cancelled'
    },
    refundOrder(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (order) order.status = 'refunded'
    }
  }
})

function setStatusChain(order: Order) {
  // 演示：购买成功后进入交付中，2 秒后变为已交付
  order.status = 'delivering'
  setTimeout(() => {
    order.status = 'delivered'
  }, 2000)
}
