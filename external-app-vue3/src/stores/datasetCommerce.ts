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
import { datasetOfferToCommerce, normalizeOfferTerm, offerAmount } from '@/domain/commerceOffers'

function requireDatasetProduct(productId: string): Product {
  const product = useCatalogStore().byId(productId)
  if (!product || product.type !== 'dataset' || product.origin !== 'asset_platform' || product.dealChannel !== 'app_payment') {
    throw new Error('仅支持资产平台来源的 APP 自营数据集购买')
  }
  if (product.status !== 'published' || product.availability !== 'published' || product.assetSnapshot?.changeRisk === 'high') {
    throw new Error('该数据集当前暂停新购')
  }
  return product
}

function requireOffer(product: Product, subject: 'personal' | 'enterprise', offerId?: string): DatasetOffer {
  const offers = product.datasetOffers?.filter((offer) => offer.subject === subject) ?? []
  const offer = offerId ? offers.find((item) => item.id === offerId) : offers[0]
  if (!offer) throw new Error(subject === 'personal' ? '未配置个人销售方案' : '未配置企业销售方案')
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
    createOrder(productId: string, subject: 'personal' | 'enterprise', offerId?: string, selectedTermMonths?: number) {
      const product = requireDatasetProduct(productId)
      const offer = requireOffer(product, subject, offerId)
      const commerceOffer = datasetOfferToCommerce(offer)
      const termMonths = normalizeOfferTerm(commerceOffer, selectedTermMonths)
      const amount = offerAmount(commerceOffer, termMonths)
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
        if (!isAdmin && !user.enterprise.purchasePolicy.memberPurchaseAllowed) throw new Error('企业策略不允许普通成员发起采购')
        ownerId = user.context.currentEnterpriseId
        if (!isAdmin && user.enterprise.purchasePolicy.memberPurchaseApprovalRequired) status = 'pending_approval'
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
        contractStatus: 'not_required'
      }
      orders.list.push(order)

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
      const product = requireDatasetProduct(order.productId)
      const offer = requireOffer(product, order.ownerType, order.datasetOfferId)
      if (!order.paymentMethod || !paymentMethodsBySubject[order.ownerType].includes(order.paymentMethod)) {
        throw new Error('支付方式与购买主体不匹配')
      }

      orders.applyCharge(order.id, order.amount, `dataset-charge-${order.id}`)
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
    provision(deliveryId: string) {
      const delivery = this.deliveries.find((item) => item.id === deliveryId)
      if (!delivery) throw new Error('用数模块交付任务不存在')
      const product = requireDatasetProduct(delivery.productId)
      const order = useOrderStore().list.find((item) => item.id === delivery.orderId)
      const entitlement = useEntitlementStore().list.find((item) => item.id === delivery.entitlementId)
      const offer = product.datasetOffers?.find((item) => item.id === entitlement?.datasetOfferId)
      if (!order || !entitlement || !offer) throw new Error('用数模块交付上下文不完整')
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
          licenseKind: offer.licenseKind,
          accessScope: offer.accessScope,
          termMonths: order.selectedTermMonths || offer.termMonths,
          seats: offer.seats,
          allowDownload: offer.allowDownload
        })
        delivery.datasetInstanceId = result.datasetInstanceId
        delivery.biEntryUrl = result.biEntryUrl
        delivery.deliveredAt = result.deliveredAt
        delivery.lastSuccessfulRefreshAt = result.lastSuccessfulRefreshAt
        delivery.status = 'delivered'
        delivery.updatedAt = now()
        useEntitlementStore().activateDataset(entitlement.id, delivery.id)
        order.status = 'entitlement_active'
        order.entitlementGranted = true
      } catch (error) {
        delivery.status = 'failed'
        delivery.failureReason = error instanceof Error ? error.message : '用数模块交付失败'
        delivery.updatedAt = now()
        order.status = 'paid'
        order.entitlementGranted = false
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
