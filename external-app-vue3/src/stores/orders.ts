import { defineStore } from 'pinia'
import { seedOrders } from '@/data/seed'
import type { CommerceServiceMode, Order, Product } from '@/types/domain'
import type { PaymentLedgerEntry } from '@/types/afterSales'
import { genId, now } from '@/utils/id'
import { useEntitlementStore } from './entitlements'
import { useCatalogStore } from './catalog'
import { useUserStore } from './user'
import { commerceOffersOf, normalizeOfferTerm, offerAmount } from '@/domain/commerceOffers'

const MAX_GRANT_ATTEMPTS = 3

export type PurchaseSubject = 'personal' | 'enterprise'
export type EnterprisePurchaseMode = 'online' | 'contract'

export interface EnterpriseReportCheckoutIntent {
  id: string
  productId: string
  ownerType: 'enterprise'
  ownerId: string
  mode: EnterprisePurchaseMode
  commerceOfferId?: string
  serviceMode?: CommerceServiceMode
  selectedTermMonths?: number
  amount?: number
  createdAt: string
  expiresAt: string
  consumedAt?: string
  invalidatedAt?: string
}

const CHECKOUT_INTENT_TTL_MS = 10 * 60 * 1000

function requireAppOwnedReport(productId: string): Product {
  const product = useCatalogStore().byId(productId)
  if (!product || product.type !== 'report' || product.dealChannel !== 'app_payment') {
    throw new Error('仅支持 APP 自营报告购买')
  }
  return product
}

function requireAppOwnedPersonalPurchasableProduct(productId: string): Product {
  const product = useCatalogStore().byId(productId)
  if (!product || product.dealChannel !== 'app_payment' || !product.acquisitions.includes('item_purchase')) {
    throw new Error('仅支持 APP 自营个人单品购买')
  }
  return product
}

function requireAppOwnedEnterprisePurchasableProduct(productId: string): Product {
  const product = useCatalogStore().byId(productId)
  if (!product || product.type === 'dataset' || product.dealChannel !== 'app_payment' || !product.acquisitions.includes('item_purchase')) {
    // 保留旧报告接口的错误语义，避免可信空间商品从历史深链绕过购买边界。
    throw new Error('仅支持 APP 自营报告购买')
  }
  return product
}

function requireCurrentAuthenticatedEnterprise(): string {
  const user = useUserStore()
  if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId || !user.currentEnterpriseMember) {
    throw new Error('企业购买需要先完成企业认证')
  }
  return user.context.currentEnterpriseId
}

export const useOrderStore = defineStore('orders', {
  state: () => ({
    list: seedOrders.map((o) => ({ ...o })) as Order[],
    ledger: [] as PaymentLedgerEntry[],
    checkoutIntents: [] as EnterpriseReportCheckoutIntent[]
  }),
  getters: {
    appOrders(state): Order[] {
      return state.list.filter((o) => o.channel === 'app')
    },
    enterpriseOrders(state): Order[] {
      return state.list.filter((o) => o.ownerType === 'enterprise')
    }
  },
  actions: {
    // 会员购买（即时支付成功，简化收银台）
    purchaseMember(months = 12, tier: 'standard' | 'premium' = 'standard') {
      const entitlements = useEntitlementStore()
      const user = useUserStore()
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId: 'membership',
        productName: `${tier === 'premium' ? '高级' : '普通'}会员 · ${months} 个月`,
        amount: tier === 'premium'
          ? (months === 12 ? 599 : 79)
          : (months === 12 ? 299 : 39),
        status: 'entitlement_active',
        createdAt: now(),
        paidAt: now()
      }
      this.list.push(order)
      entitlements.grantMember(months, tier)
      return order
    },
    // 单品购买
    purchaseItem(productId: string, amount: number) {
      const product = requireAppOwnedPersonalPurchasableProduct(productId)
      const entitlements = useEntitlementStore()
      const user = useUserStore()
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId,
        productName: product.name,
        amount,
        status: 'entitlement_active',
        entitlementGranted: true,
        createdAt: now(),
        paidAt: now()
      }
      this.list.push(order)
      entitlements.grantItem(product, user.context.currentMemberId)
      return order
    },
    /** 报告、看板、API 的统一 APP 购买入口；数据集仍走专用交付链路。 */
    purchaseCommerceProductForSubject(
      productId: string,
      subject: PurchaseSubject,
      offerId: string,
      selectedTermMonths?: number,
      mode: EnterprisePurchaseMode = 'online',
      checkoutIntentId?: string
    ) {
      const product = requireAppOwnedEnterprisePurchasableProduct(productId)
      const offer = commerceOffersOf(product).find((item) => item.id === offerId && item.subject === subject)
      if (!offer) throw new Error(subject === 'personal' ? '未配置个人价格方案' : '未配置企业价格方案')
      const termMonths = normalizeOfferTerm(offer, selectedTermMonths)
      const amount = offerAmount(offer, termMonths)
      if (subject === 'enterprise') {
        return this.submitEnterpriseOrder(productId, amount, mode, checkoutIntentId)
      }

      const user = useUserStore()
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'personal',
        ownerId: user.context.currentMemberId,
        productId,
        productName: product.name,
        productType: product.type,
        amount,
        status: 'entitlement_active',
        entitlementGranted: true,
        commerceOfferId: offer.id,
        serviceMode: offer.serviceMode,
        selectedTermMonths: termMonths,
        createdAt: now(),
        paidAt: now()
      }
      this.list.push(order)
      useEntitlementStore().grantItem(product, user.context.currentMemberId, {
        offerId: offer.id,
        serviceMode: offer.serviceMode,
        termMonths,
        orderId: order.id
      })
      return order
    },
    // APP 自营报告可按个人或已认证企业购买；可信空间商品不走此入口。
    purchaseReportForSubject(
      productId: string,
      subject: PurchaseSubject,
      mode: EnterprisePurchaseMode = 'online',
      checkoutIntentId?: string
    ) {
      const product = requireAppOwnedReport(productId)
      if (subject === 'personal') return this.purchaseItem(productId, product.price.itemPrice ?? 0)
      return this.submitEnterpriseOrder(productId, (product.price.itemPrice ?? 0) * 10, mode, checkoutIntentId)
    },
    createEnterpriseReportCheckoutIntent(
      productId: string,
      mode: EnterprisePurchaseMode,
      options?: { offerId?: string; selectedTermMonths?: number; amount?: number; serviceMode?: CommerceServiceMode }
    ) {
      requireAppOwnedEnterprisePurchasableProduct(productId)
      const enterpriseId = requireCurrentAuthenticatedEnterprise()
      const createdAt = new Date().toISOString()
      this.checkoutIntents
        .filter((intent) => intent.productId === productId && intent.ownerId === enterpriseId && !intent.consumedAt && !intent.invalidatedAt)
        .forEach((intent) => { intent.invalidatedAt = createdAt })
      const intent: EnterpriseReportCheckoutIntent = {
        id: genId('checkout'),
        productId,
        ownerType: 'enterprise',
        ownerId: enterpriseId,
        mode,
        commerceOfferId: options?.offerId,
        selectedTermMonths: options?.selectedTermMonths,
        amount: options?.amount,
        serviceMode: options?.serviceMode,
        createdAt,
        expiresAt: new Date(Date.now() + CHECKOUT_INTENT_TTL_MS).toISOString()
      }
      this.checkoutIntents.push(intent)
      return intent
    },
    invalidateEnterpriseReportCheckoutIntents(productId: string) {
      const enterpriseId = useUserStore().context.currentEnterpriseId
      const invalidatedAt = new Date().toISOString()
      this.checkoutIntents
        .filter((intent) => intent.productId === productId && intent.ownerId === enterpriseId && !intent.consumedAt && !intent.invalidatedAt)
        .forEach((intent) => { intent.invalidatedAt = invalidatedAt })
    },
    getEnterpriseReportCheckoutIntent(intentId: string, productId: string, mode?: EnterprisePurchaseMode) {
      let enterpriseId: string
      try {
        requireAppOwnedEnterprisePurchasableProduct(productId)
        enterpriseId = requireCurrentAuthenticatedEnterprise()
      } catch {
        return undefined
      }
      const intent = this.checkoutIntents.find((item) => item.id === intentId)
      if (!intent || intent.productId !== productId || intent.ownerType !== 'enterprise' || intent.ownerId !== enterpriseId) return undefined
      if (mode && intent.mode !== mode) return undefined
      if (intent.consumedAt || intent.invalidatedAt || Date.parse(intent.expiresAt) <= Date.now()) return undefined
      return intent
    },
    consumeEnterpriseReportCheckoutIntent(intentId: string | undefined, productId: string, mode: EnterprisePurchaseMode) {
      const intent = this.getEnterpriseReportCheckoutIntent(intentId || '', productId, mode)
      if (!intent) throw new Error('企业报告结算意图无效')
      intent.consumedAt = new Date().toISOString()
      return intent
    },
    // 企业采购：小额可在线支付，大额走报价合同
    submitEnterpriseOrder(productId: string, amount: number, mode: EnterprisePurchaseMode, checkoutIntentId?: string) {
      const product = requireAppOwnedEnterprisePurchasableProduct(productId)
      const enterpriseId = requireCurrentAuthenticatedEnterprise()
      const intent = this.consumeEnterpriseReportCheckoutIntent(checkoutIntentId, productId, mode)
      const order: Order = {
        id: genId('order'),
        channel: 'app',
        ownerType: 'enterprise',
        ownerId: enterpriseId,
        productId,
        productName: product.name,
        amount: intent.amount ?? amount,
        status: mode === 'online' ? 'entitlement_active' : 'pending_payment',
        contractStatus: mode === 'online' ? 'not_required' : 'quoting',
        productType: product.type,
        commerceOfferId: intent.commerceOfferId,
        serviceMode: intent.serviceMode,
        selectedTermMonths: intent.selectedTermMonths,
        createdAt: now(),
        paidAt: mode === 'online' ? now() : undefined
      }
      this.list.push(order)
      if (mode === 'online') {
        const entitlements = useEntitlementStore()
        entitlements.grantEnterpriseSeat(productId, enterpriseId, {
          offerId: intent.commerceOfferId,
          serviceMode: intent.serviceMode,
          termMonths: intent.selectedTermMonths,
          orderId: order.id
        })
        order.entitlementGranted = true
      }
      return order
    },
    // 后台：确认企业合同付款
    confirmEnterpriseContract(orderId: string) {
      const order = this.list.find((o) => o.id === orderId)
      if (!order || order.ownerType !== 'enterprise') throw new Error('仅企业订单可确认合同付款')
      if (order.entitlementGranted) return order
      order.contractStatus = 'payment_confirmed'
      order.status = 'entitlement_active'
      order.paidAt = now()
      const entitlements = useEntitlementStore()
      entitlements.grantEnterpriseSeat(order.productId, order.ownerId, {
        offerId: order.commerceOfferId,
        serviceMode: order.serviceMode,
        termMonths: order.selectedTermMonths,
        orderId: order.id
      })
      order.entitlementGranted = true
      return order
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
        if (product) {
          if (order.ownerType === 'enterprise') entitlements.grantEnterpriseSeat(product.id, order.ownerId)
          else entitlements.grantItem(product, order.ownerId)
        }
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
