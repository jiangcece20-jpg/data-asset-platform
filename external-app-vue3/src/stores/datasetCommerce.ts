import { defineStore } from 'pinia'
import type { DatasetOffer, Order, PaymentMethod, Product } from '@/types/domain'
import type { BiDatasetDelivery, DatasetPurchaseApprovalRequest } from '@/types/datasetCommerce'
import { genId, now } from '@/utils/id'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useUserStore } from './user'
import { mockBiDeliveryAdapter } from '@/services/bi/mockBiDeliveryAdapter'
import { seedBiDatasetDeliveries } from '@/data/datasetCommerce'
import { commerceOffersOf, datasetOfferToCommerce, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { purchasePrice, type PurchasePricePath } from '@/domain/portalPurchase'
import { isPurchasedDataset } from '@/domain/datasetEntry'
import { shanghaiDate } from '@/utils/businessDate'

function plusMonthsFrom(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function requireDatasetProduct(productId: string): Product {
  const product = useCatalogStore().byId(productId)
  if (!product || product.type !== 'dataset' || product.origin !== 'asset_platform' || product.dealChannel !== 'app_payment') {
    throw new Error('仅支持资产平台来源的 APP 自营数据集购买')
  }
  if (product.status !== 'published' || product.availability !== 'published' || product.assetSnapshot?.changeRisk === 'high') {
    throw new Error('该数据集当前不可购买，请核对上下架状态及交付条件')
  }
  return product
}

function requireOffer(product: Product, subject: 'personal' | 'enterprise', offerId?: string): DatasetOffer {
  const offers = product.datasetOffers?.filter((offer) => offer.subject === subject) ?? []
  const offer = offerId ? offers.find((item) => item.id === offerId) : offers[0]
  if (!offer) throw new Error(subject === 'personal' ? '未配置个人销售方案' : '未配置企业销售方案')
  return offer
}

function fixedOffer(product: Product, subject: 'personal' | 'enterprise', includeMemberOnly = false): DatasetOffer {
  const fixed = commerceOffersOf(product, includeMemberOnly).find((offer) => offer.subject === subject)
  const offer = product.datasetOffers?.find((item) => item.id === fixed?.id)
  if (!offer) throw new Error(subject === 'personal' ? '未配置个人单品价' : '未配置企业单品价')
  return offer
}

const paymentMethodsBySubject: Record<'personal' | 'enterprise', PaymentMethod[]> = {
  personal: ['personal_online'],
  enterprise: ['enterprise_balance', 'enterprise_contract', 'enterprise_bank_transfer']
}

export const useDatasetCommerceStore = defineStore('datasetCommerce', {
  state: () => ({
    approvalRequests: [] as DatasetPurchaseApprovalRequest[],
    deliveries: seedBiDatasetDeliveries.map((item) => ({ ...item })) as BiDatasetDelivery[]
  }),
  getters: {
    canUsePurchasedDataset() {
      return (product: Product): boolean => {
        const user = useUserStore()
        const member = user.currentEnterpriseMember
        if (!isPurchasedDataset(product) || !user.context.loggedIn || !user.isEnterpriseAuthenticated || !member) return false
        if (product.serviceStatus === 'terminated' || product.serviceStatus === 'suspended') return false
        const today = shanghaiDate()
        // Update expiry stops updates; only actual access expiry/revocation stops retained data access.
        return useEntitlementStore().list.some(item => item.type === 'dataset' && item.source === 'enterprise'
          && item.productId === product.id && item.ownerId === user.context.currentEnterpriseId
          && item.enterpriseId === user.context.currentEnterpriseId && item.status === 'active'
          && item.validFrom.slice(0, 10) <= today && (!item.validTo || item.validTo.slice(0, 10) >= today)
          && (item.accessScope === 'enterprise_wide' || member.role === 'admin' || item.assignedMemberIds?.includes(member.id)))
      }
    },
    pendingEnterpriseApprovals(state): DatasetPurchaseApprovalRequest[] {
      const user = useUserStore()
      if (user.currentEnterpriseMember?.role !== 'admin') return []
      return state.approvalRequests.filter((item) =>
        item.enterpriseId === user.context.currentEnterpriseId && item.status === 'pending',
      )
    },
    visibleDeliveries(state): BiDatasetDelivery[] {
      const user = useUserStore()
      return state.deliveries.filter((delivery) => {
        if (delivery.ownerType === 'personal') return delivery.ownerId === user.context.currentMemberId
        if (delivery.ownerId !== user.context.currentEnterpriseId) return false
        return user.currentEnterpriseMember?.role === 'admin' || delivery.operatorMemberId === user.context.currentMemberId
      })
    }
  },
  actions: {
    fulfillSellerOrder(orderId: string) {
      const order = useOrderStore().list.find((item) => item.id === orderId)
      if (!order?.sellerId || !['paid', 'pending_activation', 'entitlement_active'].includes(order.status)) {
        throw new Error('仅已收款商家订单可交付')
      }
      const existing = this.deliveries.find((item) => item.orderId === orderId)
      if (existing) return this.provision(existing.id)
      const product = useCatalogStore().byId(order.productId)
      if (!product || product.type !== 'dataset' || product.origin !== 'seller_market') throw new Error('商家数据集不存在')
      const offer = commerceOffersOf(product).find((item) => item.id === order.commerceOfferId)
      if (!offer) throw new Error('商家销售方案不存在')
      const entitlements = useEntitlementStore()
      const entitlement = entitlements.list.find((item) => item.orderId === orderId)
        ?? entitlements.grantSellerDataset({
          product, orderId, ownerType: order.ownerType, ownerId: order.ownerId,
          operatorMemberId: order.operatorMemberId || (order.ownerType === 'personal' ? order.ownerId : ''),
          offerId: offer.id, selectedTermMonths: order.selectedTermMonths
        })
      entitlement.status = 'pending'
      const delivery: BiDatasetDelivery = {
        id: genId('bi-delivery'), orderId, entitlementId: entitlement.id, productId: product.id,
        ownerType: order.ownerType, ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || (order.ownerType === 'personal' ? order.ownerId : ''),
        dataVersionUpdatedAt: order.dataVersionUpdatedAt,
        status: 'pending', attemptCount: 0, createdAt: now(), updatedAt: now()
      }
      this.deliveries.push(delivery)
      order.entitlementId = entitlement.id
      order.biDeliveryId = delivery.id
      order.entitlementPendingManual = false
      return this.provision(delivery.id)
    },
    createOrder(productId: string, subject: 'personal' | 'enterprise', _offerId?: string, _selectedTermMonths?: number, pricePath?: PurchasePricePath) {
      const product = requireDatasetProduct(productId)
      const offer = fixedOffer(product, subject, !!pricePath)
      const commerceOffer = datasetOfferToCommerce(offer)
      const termMonths = salePeriodMonthsOf(product)
      const amount = pricePath ? purchasePrice(product, subject, pricePath, useEntitlementStore().currentMemberTier) : offer.price
      const user = useUserStore()
      const orders = useOrderStore()
      let ownerId = user.context.currentMemberId
      let status: Order['status'] = 'pending_payment'
      let approvalRequest: DatasetPurchaseApprovalRequest | undefined

      if (subject === 'enterprise') {
        if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId || !user.currentEnterpriseMember) {
          throw new Error('企业购买需要先完成企业认证')
        }
        const isAdmin = user.currentEnterpriseMember.role === 'admin'
        if (!pricePath && !isAdmin && !user.enterprise.purchasePolicy.memberPurchaseAllowed) throw new Error('企业策略不允许普通成员发起采购')
        ownerId = user.context.currentEnterpriseId
        if (amount > 0 && !pricePath && !isAdmin && user.enterprise.purchasePolicy.memberPurchaseApprovalRequired) status = 'pending_approval'
      }

      const existingOrder = orders.list.find((item) => item.productId === product.id
        && item.ownerType === subject
        && item.ownerId === ownerId
        && ['pending_payment', 'pending_approval', 'payment_pending_confirmation', 'paid', 'pending_activation'].includes(item.status))
      if (existingOrder) {
        return {
          order: existingOrder,
          approvalRequest: this.approvalRequests.find((item) => item.orderId === existingOrder.id && item.status === 'pending')
        }
      }

      const order: Order = {
        id: genId('order-dataset'),
        channel: 'app',
        ownerType: subject,
        ownerId,
        productId: product.id,
        productName: product.name,
        productType: 'dataset',
        operatorMemberId: user.context.currentMemberId,
        datasetOfferId: offer.id,
        commerceOfferId: offer.id,
        serviceMode: commerceOffer.serviceMode,
        selectedTermMonths: termMonths,
        paymentMethod: subject === 'personal' ? 'personal_online' : 'enterprise_balance',
        amount,
        status,
        createdAt: now(),
        dataVersionUpdatedAt: product.typeDetail.dataset?.dataUpdatedAt,
        updateFrequencyAtPurchase: product.updateFrequency,
        contractStatus: 'not_required'
      }
      orders.list.push(order)

      if (amount === 0) this.pay(order.id)

      if (status === 'pending_approval') {
        approvalRequest = {
          id: genId('purchase-approval'),
          orderId: order.id,
          enterpriseId: ownerId,
          applicantMemberId: user.context.currentMemberId,
          productId: product.id,
          productName: product.name,
          amount,
          status: 'pending',
          submittedAt: now()
        }
        this.approvalRequests.push(approvalRequest)
        order.approvalRequestId = approvalRequest.id
      }
      return { order, approvalRequest }
    },
    approve(requestId: string) {
      const user = useUserStore()
      if (user.currentEnterpriseMember?.role !== 'admin') throw new Error('仅企业管理员可审批采购')
      const request = this.approvalRequests.find((item) => item.id === requestId && item.enterpriseId === user.context.currentEnterpriseId)
      if (!request || request.status !== 'pending') throw new Error('待审批采购不存在')
      request.status = 'approved'
      request.decidedAt = now()
      request.decidedBy = user.context.currentMemberId
      const order = useOrderStore().list.find((item) => item.id === request.orderId)
      if (!order) throw new Error('采购订单不存在')
      order.status = 'pending_payment'
      return order
    },
    reject(requestId: string, reason = '企业管理员驳回') {
      const user = useUserStore()
      if (user.currentEnterpriseMember?.role !== 'admin') throw new Error('仅企业管理员可审批采购')
      const request = this.approvalRequests.find((item) => item.id === requestId && item.enterpriseId === user.context.currentEnterpriseId)
      if (!request || request.status !== 'pending') throw new Error('待审批采购不存在')
      request.status = 'rejected'
      request.reason = reason
      request.decidedAt = now()
      request.decidedBy = user.context.currentMemberId
      const order = useOrderStore().list.find((item) => item.id === request.orderId)
      if (order) order.status = 'approval_rejected'
      return order
    },
    selectPaymentMethod(orderId: string, paymentMethod: PaymentMethod) {
      const order = useOrderStore().list.find((item) => item.id === orderId && item.productType === 'dataset')
      if (!order) throw new Error('数据集订单不存在')
      if (order.status !== 'pending_payment') throw new Error('订单当前不可修改支付方式')
      if (!paymentMethodsBySubject[order.ownerType].includes(paymentMethod)) {
        throw new Error('支付方式与购买主体不匹配')
      }
      order.paymentMethod = paymentMethod
      order.contractStatus = paymentMethod === 'enterprise_contract' ? 'quoting' : 'not_required'
      return order
    },
    pay(orderId: string, simulateDeliveryFailure = false) {
      const orders = useOrderStore()
      const order = orders.list.find((item) => item.id === orderId)
      if (!order || order.productType !== 'dataset') throw new Error('数据集订单不存在')
      if (order.status !== 'pending_payment') {
        if (order.entitlementId) return order
        throw new Error('订单当前不可支付')
      }
      if (order.sellerId) {
        const product = useCatalogStore().byId(order.productId)
        if (!product || product.origin !== 'seller_market' || product.status !== 'published'
          || product.availability !== 'published' || ['suspended', 'terminated'].includes(product.serviceStatus)) {
          throw new Error('该商品当前不可购买，请返回详情核对在售状态')
        }
        if (!order.paymentMethod || !paymentMethodsBySubject[order.ownerType].includes(order.paymentMethod)) {
          throw new Error('支付方式与购买主体不匹配')
        }
        if (['enterprise_contract', 'enterprise_bank_transfer'].includes(order.paymentMethod)) {
          order.status = 'payment_pending_confirmation'
          return order
        }
        orders.applyCharge(order.id, order.amount, `dataset-charge-${order.id}`)
        order.status = 'paid'
        order.paidAt ||= now()
        this.fulfillSellerOrder(order.id)
        return order
      }
     const product = requireDatasetProduct(order.productId)
     const offer = requireOffer(product, order.ownerType, order.datasetOfferId)
     if (!order.paymentMethod || !paymentMethodsBySubject[order.ownerType].includes(order.paymentMethod)) {
       throw new Error('支付方式与购买主体不匹配')
     }

     if (order.amount === 0) {
       order.status = 'paid'
       order.completedAt = now()
     } else {
       orders.applyCharge(order.id, order.amount, `dataset-charge-${order.id}`)
     }
     // 公对公转账和合同支付走线下确认：提交后进入付款确认中，等运营确认到账
     const isOffline = order.paymentMethod === 'enterprise_bank_transfer' || order.paymentMethod === 'enterprise_contract'
     if (isOffline) {
       order.status = 'payment_pending_confirmation'
       if (order.paymentMethod === 'enterprise_contract') order.contractStatus = 'payment_confirmed'
       return order
     }
     // 企业余额和个人在线支付：即时确认，直接创建权益和交付
     if (order.paymentMethod === 'enterprise_contract') order.contractStatus = 'payment_confirmed'
      const entitlement = useEntitlementStore().grantDatasetPending({
        product,
        orderId: order.id,
        ownerType: order.ownerType,
        ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || useUserStore().context.currentMemberId,
        offerId: offer.id,
        selectedTermMonths: order.selectedTermMonths
      })
      const delivery: BiDatasetDelivery = {
        id: genId('bi-delivery'),
        orderId: order.id,
        entitlementId: entitlement.id,
        productId: product.id,
        ownerType: order.ownerType,
        ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || useUserStore().context.currentMemberId,
        status: 'pending',
        attemptCount: 0,
        createdAt: now(),
        updatedAt: now()
      }
      this.deliveries.push(delivery)
      order.entitlementId = entitlement.id
      order.biDeliveryId = delivery.id
      if (simulateDeliveryFailure) mockBiDeliveryAdapter.failNext()
     this.provision(delivery.id)
     return order
   },
    // 运营后台：确认线下付款到账，创建权益和交付
    confirmOfflinePayment(orderId: string, options?: { activationDate?: string; simulateDeliveryFailure?: boolean }) {
      const orders = useOrderStore()
      const order = orders.list.find((item) => item.id === orderId)
      if (!order || order.productType !== 'dataset') throw new Error('数据集订单不存在')
      if (order.status !== 'payment_pending_confirmation') throw new Error('仅付款确认中订单可确认到账')
      const product = requireDatasetProduct(order.productId)
      const offer = requireOffer(product, order.ownerType, order.datasetOfferId)
      const user = useUserStore()
      const entitlement = useEntitlementStore().grantDatasetPending({
        product,
        orderId: order.id,
        ownerType: order.ownerType,
        ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || user.context.currentMemberId,
        offerId: offer.id,
        selectedTermMonths: order.selectedTermMonths
      })
      // 运营可配置生效时间：覆盖权益 validFrom 并重算 updateValidTo
      if (options?.activationDate) {
        entitlement.validFrom = options.activationDate
        if (entitlement.updateValidTo) {
          const months = order.selectedTermMonths || offer.termMonths || 12
          entitlement.updateValidTo = plusMonthsFrom(options.activationDate, months)
        }
        order.activationDate = options.activationDate
      }
      const delivery: BiDatasetDelivery = {
        id: genId('bi-delivery'),
        orderId: order.id,
        entitlementId: entitlement.id,
        productId: product.id,
        ownerType: order.ownerType,
        ownerId: order.ownerId,
        operatorMemberId: order.operatorMemberId || user.context.currentMemberId,
        status: 'pending',
        attemptCount: 0,
        createdAt: now(),
        updatedAt: now()
      }
      this.deliveries.push(delivery)
      order.entitlementId = entitlement.id
      order.biDeliveryId = delivery.id
      order.status = 'paid'
      if (options?.simulateDeliveryFailure) mockBiDeliveryAdapter.failNext()
      this.provision(delivery.id)
      return order
    },
    provision(deliveryId: string) {
      const delivery = this.deliveries.find((item) => item.id === deliveryId)
      if (!delivery) throw new Error('用数模块交付任务不存在')
      if (delivery.status === 'delivered') return delivery
      const catalogProduct = useCatalogStore().byId(delivery.productId)
      // 已收款商家订单在下架后仍须履约，交付不再使用新购的在售条件。
      const product = catalogProduct?.origin === 'seller_market' && catalogProduct.type === 'dataset'
        ? catalogProduct : requireDatasetProduct(delivery.productId)
      const order = useOrderStore().list.find((item) => item.id === delivery.orderId)
      const entitlement = useEntitlementStore().list.find((item) => item.id === delivery.entitlementId)
      const offer = product.datasetOffers?.find((item) => item.id === entitlement?.datasetOfferId)
      const sellerOffer = product.origin === 'seller_market'
        ? commerceOffersOf(product).find((item) => item.id === entitlement?.commerceOfferId) : undefined
      if (!order || !entitlement || (!offer && !sellerOffer)) throw new Error('用数模块交付上下文不完整')
      delivery.status = 'provisioning'
      delivery.attemptCount += 1
      delivery.failureReason = undefined
      delivery.updatedAt = now()
      try {
        const result = mockBiDeliveryAdapter.provision({
          productId: product.id,
          resourceId: product.assetSnapshot?.resourceId || product.resourceId,
          assetVersion: product.assetSnapshot?.assetVersion || 'unknown',
          ownerType: delivery.ownerType,
          ownerId: delivery.ownerId,
          operatorMemberId: delivery.operatorMemberId,
          licenseKind: offer?.licenseKind ?? (sellerOffer?.serviceMode === 'continuous' ? 'subscription' : 'snapshot'),
          accessScope: offer?.accessScope ?? sellerOffer?.accessScope ?? (delivery.ownerType === 'enterprise' ? 'enterprise_wide' : 'personal'),
          termMonths: order.selectedTermMonths || offer?.termMonths,
          seats: offer?.seats,
          allowDownload: offer?.allowDownload ?? sellerOffer?.allowDownload ?? false
        })
       delivery.datasetInstanceId = result.datasetInstanceId
       delivery.biEntryUrl = result.biEntryUrl
       delivery.downloadUrl = result.downloadUrl
       delivery.deliveredAt = result.deliveredAt
       delivery.lastSuccessfulRefreshAt = result.lastSuccessfulRefreshAt
       delivery.status = 'delivered'
        delivery.updatedAt = now()
        useEntitlementStore().activateDataset(entitlement.id, delivery.id)
        order.status = 'entitlement_active'
        order.entitlementGranted = true
        order.entitlementPendingManual = false
        order.completedAt = result.deliveredAt
        if (sellerOffer) order.note = '付款完成，已交付当前数据版本；后续按商品约定更新'
      } catch (error) {
        delivery.status = 'failed'
        delivery.failureReason = error instanceof Error ? error.message : '用数模块交付失败'
        delivery.updatedAt = now()
        order.status = 'paid'
        order.entitlementGranted = false
        if (sellerOffer) order.note = '平台已收款，数据交付处理中'
      }
      return delivery
    },
    retryDelivery(deliveryId: string) {
      const delivery = this.deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status !== 'failed') throw new Error('仅失败的交付任务可重试')
      return this.provision(deliveryId)
    }
  }
})
