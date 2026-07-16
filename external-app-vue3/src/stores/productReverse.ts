import { defineStore } from 'pinia'
import { genId, now } from '@/utils/id'
import { resolveProductReversePolicy } from '@/domain/productReversePolicy'
import { buildProductImpactSnapshot, type ProductImpactTrial, type ProductImpactListingRequest, type ProductImpactEnterpriseMember, type ProductImpactReference, type ProductImpactContract } from '@/domain/productImpact'
import type {
  ProductReverseAction,
  ReverseReasonCode,
  ReverseSeverity,
  ProductReversePolicy,
  ImpactSnapshot,
  ProductReverseAuditEntry,
} from '@/types/reverseFlow'
import { useCatalogStore } from './catalog'
import { useEntitlementStore } from './entitlements'
import { useOrderStore } from './orders'
import { useTrialStore } from './trials'
import { useListingRequestStore } from './listingRequests'
import { useUserStore } from './user'
import { useReverseWorkOrderStore } from './reverseWorkOrders'

export interface ProductReversePreview {
  productId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  policy: ProductReversePolicy
  impact: ImpactSnapshot
}

interface PreviewProductReverseInput {
  productId: string
  action: ProductReverseAction
  reason: ReverseReasonCode
  reasonDetail: string
}

interface ExecuteProductReverseInput extends PreviewProductReverseInput {
  preview: ProductReversePreview
  actor: string
  owner: string
  reviewAt: string
}

const NOTICE_CONTENTS: Record<string, string> = {
  'pause/commercial_adjustment': '您购买的商品因商业调整暂停销售，历史权益不受影响。',
  'pause/quality_issue': '您购买的商品因质量问题暂停销售，我们正在处理中。',
  'recall/quality_issue': '您购买的商品因质量问题被召回，权益已冻结，请关注后续处置。',
  'recall/compliance_risk': '您购买的商品因合规风险被召回，权益已冻结，请关注后续处置。',
  'delist/upstream_stop': '您购买的商品因供应方停供已下架，我们将为您的权益进行迁移或退款处理。',
  'delist/commercial_adjustment': '您购买的商品因商业调整已下架，历史权益不受影响。',
}

function buildImpact(productId: string): ImpactSnapshot {
  const orders = useOrderStore().list
  const entitlements = useEntitlementStore().list
  const trials = useTrialStore().list
  const listingRequests = useListingRequestStore().list
  const user = useUserStore()
  const catalog = useCatalogStore()

  const trialInputs: ProductImpactTrial[] = trials.map((t) => ({
    id: t.id,
    productId: t.productId,
    ownerId: t.ownerId,
    status: t.status,
  }))

  const listingInputs: ProductImpactListingRequest[] = listingRequests.map((r) => ({
    id: r.id,
    productId: r.productId,
    userId: r.userId,
    status: r.status,
  }))

  // Enterprise members with seats for this product
  const memberInputs: ProductImpactEnterpriseMember[] = []
  if (user.enterprise.entitledProductIds.includes(productId)) {
    user.enterprise.members
      .filter((m) => m.seatAssigned && m.status === 'active')
      .forEach((m) => {
        memberInputs.push({
          id: m.id,
          enterpriseId: user.enterprise.id,
          productId,
          status: 'active',
        })
      })
  }

  // Catalog references
  const refInputs: ProductImpactReference[] = []
  const enh = catalog.enhancementOf(productId)
  if (enh?.recommendSlot) {
    refInputs.push({ id: `enh-${productId}`, productId, type: 'recommendation' })
  }
  const product = catalog.byId(productId)
  if (product?.tags.includes('热门')) {
    refInputs.push({ id: `tag-${productId}`, productId, type: 'content' })
  }
  if (product && ['candidate', 'preparing', 'published'].includes(product.availability)) {
    refInputs.push({ id: `search-${productId}`, productId, type: 'search_index' })
  }

  // Contracts from enterprise orders
  const contractInputs: ProductImpactContract[] = orders
    .filter((o) => o.ownerType === 'enterprise'
      && o.productId === productId
      && (o.contractStatus === 'contract_signed' || o.contractStatus === 'payment_confirmed'))
    .map((o) => ({
      id: o.id,
      productId: o.productId,
      customerId: o.ownerId,
      status: 'active',
    }))

  return buildProductImpactSnapshot({
    id: genId('impact'),
    productId,
    createdAt: new Date().toISOString(),
    orders,
    entitlements,
    trials: trialInputs,
    listingRequests: listingInputs,
    enterpriseMembers: memberInputs,
    catalogReferences: refInputs,
    contracts: contractInputs,
  })
}

export const useProductReverseStore = defineStore('productReverse', {
  state: () => ({
    auditEntries: [] as ProductReverseAuditEntry[],
  }),

  actions: {
    previewProductReverse(input: PreviewProductReverseInput): ProductReversePreview {
      const impact = buildImpact(input.productId)
      const hasCustomerImpact = impact.customerIds.length > 0
      const policy = resolveProductReversePolicy({
        action: input.action,
        reason: input.reason,
        hasCustomerImpact,
      })

      return {
        productId: input.productId,
        action: input.action,
        reason: input.reason,
        policy,
        impact,
      }
    },

    executeProductReverse(input: ExecuteProductReverseInput): { workOrderId?: string } {
      // Step 1: Reject mismatched preview
      if (
        input.preview.productId !== input.productId
        || input.preview.action !== input.action
        || input.preview.reason !== input.reason
      ) {
        throw new Error('预览与请求不匹配')
      }

      const catalog = useCatalogStore()
      const entitlements = useEntitlementStore()
      const woStore = useReverseWorkOrderStore()

      const policy = input.preview.policy
      const impact = input.preview.impact

      // Step 2: Escalate severity
      let severity: ReverseSeverity = policy.severity
      if (severity === 'S3' && impact.customerIds.length > 1) {
        severity = 'S2'
      }

      // Step 3: Create work order if needed
      let workOrderId: string | undefined
      if (policy.createsWorkOrder) {
        const noticeKey = `${input.action}/${input.reason}`
        const result = woStore.createProductWorkOrder({
          subjectId: input.productId,
          action: input.action,
          reason: input.reason,
          reasonDetail: input.reasonDetail,
          severity,
          impact,
          entitlementTreatment: policy.entitlement,
          treatmentSummary: `${input.action} - ${input.reason}`,
          createdBy: input.actor,
          owner: input.owner,
          reviewAt: input.reviewAt,
          customerNoticeContent: NOTICE_CONTENTS[noticeKey] || '商品状态发生变化，请关注后续通知。',
        })
        workOrderId = result.workOrder.id
      }

      // Step 4: Update availability and service state
      catalog.updateAvailability(input.productId, policy.availability)
      catalog.updateServiceStatus(input.productId, policy.service)

      // Step 5: Clear recommendation/catalog promotion
      catalog.clearRecommendation(input.productId)

      // Step 6: Freeze/migrate entitlements
      if (policy.entitlement === 'freeze' && workOrderId) {
        entitlements.freezeByProduct(input.productId, workOrderId)
      } else if (policy.entitlement === 'migrate_or_refund' && workOrderId) {
        entitlements.markMigratingByProduct(input.productId, workOrderId)
      }
      // keep and keep_and_compensate: leave entitlements active

      // Step 7: Store owner and review time, append audit
      catalog.setSalesReview(input.productId, input.owner, input.reviewAt)
      this.auditEntries.push({
        id: genId('audit'),
        productId: input.productId,
        workOrderId,
        action: input.action,
        actor: input.actor,
        detail: `${input.action} / ${input.reason}: ${input.reasonDetail}`,
        createdAt: now(),
      })

      // Step 8: Complete stop_new_sales and remove_references tasks
      if (workOrderId) {
        const tasks = woStore.tasksFor(workOrderId)
        tasks.forEach((t) => {
          if (t.type === 'stop_new_sales' || t.type === 'remove_references') {
            if (!t.completedAt) {
              woStore.completeTask(workOrderId!, t.id, input.actor)
            }
          }
        })

        // Step 9: Move to impact_analysis
        woStore.transition(workOrderId, 'impact_analysis', input.actor)
      }

      // Step 10: Return
      return { workOrderId }
    },

    resumeSales(productId: string, actor: string): void {
      const catalog = useCatalogStore()
      const woStore = useReverseWorkOrderStore()
      const product = catalog.byId(productId)
      if (!product) throw new Error('商品不存在')

      // Check service is normal
      if (product.serviceStatus !== 'normal') {
        throw new Error('服务状态异常，不能恢复销售')
      }

      // Check no open S1/S2 work orders
      const openOrders = woStore.openForProduct(productId)
      if (openOrders.some((w) => w.severity === 'S1' || w.severity === 'S2')) {
        throw new Error('存在未关闭的 S1/S2 逆向工单，不能恢复销售')
      }

      catalog.updateAvailability(productId, 'published')
      catalog.clearSalesReview(productId)

      this.auditEntries.push({
        id: genId('audit'),
        productId,
        action: 'resume_sales',
        actor,
        detail: '恢复销售',
        createdAt: now(),
      })
    },

    restoreService(productId: string, workOrderId: string, actor: string): void {
      const catalog = useCatalogStore()
      const entitlements = useEntitlementStore()
      const woStore = useReverseWorkOrderStore()

      const wo = woStore.byId(workOrderId)
      if (!wo) throw new Error('工单不存在')
      if (wo.status !== 'cross_system_verification') {
        throw new Error('工单尚未进入跨系统核验阶段')
      }

      // Restore only frozen entitlements for this work order
      entitlements.restoreByWorkOrder(workOrderId)

      // Set service to normal
      catalog.updateServiceStatus(productId, 'normal')

      // Record reconciliation
      woStore.markCrossSystemReconciled(workOrderId, actor)

      this.auditEntries.push({
        id: genId('audit'),
        productId,
        workOrderId,
        action: 'restore_service',
        actor,
        detail: '恢复服务',
        createdAt: now(),
      })
    },
  },
})
