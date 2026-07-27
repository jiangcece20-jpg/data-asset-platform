import { defineStore } from 'pinia'
import { seedOrders } from '@/data/seed'
import type { Order } from '@/types/domain'
import type { PaymentLedgerEntry } from '@/types/afterSales'
import { genId, now } from '@/utils/id'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'
import { useUserStore } from './user'

const MAX_GRANT_ATTEMPTS = 3

export const useOrderStore = defineStore('orders', {
  state: () => ({
    list: seedOrders.map((o) => ({ ...o })) as Order[],
    ledger: [] as PaymentLedgerEntry[]
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
    },

    // ── 交易售后（§9.1、§9.2）──────────────────────────────────
    // 幂等入账：同一 idempotencyKey 的重复回调不产生第二条流水，也不重复置状态。
    applyCharge(orderId: string, amount: number, idempotencyKey: string): { duplicate: boolean } {
      const existing = this.ledger.find((e) => e.idempotencyKey === idempotencyKey && e.type === 'charge')
      if (existing) return { duplicate: true }
      this.ledger.push({
        id: genId('ledger'),
        orderId,
        type: 'charge',
        status: 'confirmed',
        idempotencyKey,
        amount,
        createdAt: new Date().toISOString()
      })
      const order = this.list.find((o) => o.id === orderId)
      if (order) {
        order.idempotencyKey = idempotencyKey
        order.status = 'paid'
        order.paidAt = now()
      }
      return { duplicate: false }
    },

    // 幂等发放权益，失败按阈值重试；超阈值标记需人工，绝不回退为“未支付”。
    grantEntitlementForOrder(orderId: string, succeed: boolean): { granted: boolean; needsWorkOrder: boolean } {
      const order = this.list.find((o) => o.id === orderId)
      if (!order) return { granted: false, needsWorkOrder: false }
      if (order.entitlementGranted) return { granted: true, needsWorkOrder: false }

      if (succeed) {
        order.entitlementGranted = true
        order.entitlementPendingManual = false
        order.status = 'entitlement_active'
        const catalog = useCatalogStore()
        const entitlements = useEntitlementStore()
        const product = catalog.byId(order.productId)
        if (product) entitlements.grantItem(product)
        return { granted: true, needsWorkOrder: false }
      }

      order.entitlementGrantAttempts = (order.entitlementGrantAttempts ?? 0) + 1
      // 支付成功记录不因权益发放失败回退。
      if (order.status === 'paid' || order.status === 'entitlement_active') {
        order.status = 'paid'
      }
      const needsWorkOrder = order.entitlementGrantAttempts >= MAX_GRANT_ATTEMPTS
      if (needsWorkOrder) order.entitlementPendingManual = true
      return { granted: false, needsWorkOrder }
    }
  }
})
