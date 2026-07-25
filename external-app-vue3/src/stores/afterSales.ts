import { defineStore } from 'pinia'
import { genId } from '@/utils/id'
import type { ImpactSnapshot, ReverseSeverity } from '@/types/reverseFlow'
import type { RefundScope, PaymentAmbiguityCase, PaymentAmbiguityAction } from '@/types/afterSales'
import { resolvePaymentAmbiguity } from '@/domain/paymentReconciliation'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import { useRefundStore } from './refunds'
import { useContractStore } from './contracts'
import { useOrderStore } from './orders'

export interface AfterSalesAuditEntry {
  id: string
  subjectType: 'order' | 'contract'
  subjectId: string
  action: string
  actor: string
  detail: string
  createdAt: string
}

function impactFor(subjectId: string, customerIds: string[], orderIds: string[] = [], entitlementIds: string[] = []): ImpactSnapshot {
  return {
    id: genId('impact'),
    productId: subjectId,
    createdAt: new Date().toISOString(),
    customerIds: [...new Set(customerIds)],
    inFlightOrderIds: [...orderIds],
    activeEntitlementIds: [...entitlementIds],
    enterpriseMemberIds: [],
    trialIds: [],
    listingRequestIds: [],
    catalogReferenceIds: [],
    contractIds: [],
    isComplete: true
  }
}

export interface CustomerRefundInput {
  orderId: string
  customerId: string
  entitlementId?: string
  reason: string
  scope: RefundScope
  amount: number
  actor: string
  owner: string
  reviewAt: string
}

export const useAfterSalesStore = defineStore('afterSales', {
  state: () => ({
    auditEntries: [] as AfterSalesAuditEntry[]
  }),
  actions: {
    _audit(subjectType: 'order' | 'contract', subjectId: string, action: string, actor: string, detail: string) {
      this.auditEntries.push({ id: genId('asaudit'), subjectType, subjectId, action, actor, detail, createdAt: new Date().toISOString() })
    },

    // 客户退款：开单 → 冻结（requestRefund）→ 执行成功后撤销（executeRefund）。
    initiateCustomerRefund(input: CustomerRefundInput): { workOrderId: string; refundId: string } {
      const wo = useReverseWorkOrderStore()
      const refunds = useRefundStore()
      const impact = impactFor(input.orderId, [input.customerId], [input.orderId], input.entitlementId ? [input.entitlementId] : [])
      const result = wo.createWorkOrder({
        subjectId: input.orderId,
        subjectType: 'order',
        action: 'refund',
        reason: 'customer_request',
        reasonDetail: input.reason,
        severity: 'S3',
        impact,
        entitlementTreatment: 'keep',
        treatmentSummary: '客户退款处置',
        createdBy: input.actor,
        owner: input.owner,
        reviewAt: input.reviewAt,
        customerNoticeContent: '您的退款申请正在处理',
        taskTemplate: ['process_refund', 'revoke_entitlement', 'notify_customers', 'reconcile_payment']
      })
      const refund = refunds.requestRefund({
        orderId: input.orderId,
        customerId: input.customerId,
        reason: input.reason,
        amount: input.amount,
        scope: input.scope,
        entitlementId: input.entitlementId,
        idempotencyKey: genId('refkey'),
        workOrderId: result.workOrder.id
      })
      this._audit('order', input.orderId, 'initiate_refund', input.actor, `开单并冻结权益，退款 ${refund.id}`)
      return { workOrderId: result.workOrder.id, refundId: refund.id }
    },

    completeCustomerRefund(refundId: string, outcome: 'succeeded' | 'failed' | 'rejected', actor: string) {
      const refunds = useRefundStore()
      const record = refunds.byId(refundId)
      refunds.executeRefund(refundId, outcome)
      if (record) this._audit('order', record.orderId, 'complete_refund', actor, `退款 ${refundId} → ${outcome}`)
    },

    // 合规批量主动退款：一个工单下对所有受影响客户 fan-out 全额退款。
    initiateComplianceBatchRefund(
      productId: string,
      pairs: Array<{ orderId: string; customerId: string; entitlementId?: string; amount: number }>,
      opts: { actor: string; owner: string; reviewAt: string }
    ): { workOrderId: string; refundIds: string[] } {
      const wo = useReverseWorkOrderStore()
      const refunds = useRefundStore()
      const impact = impactFor(
        productId,
        pairs.map((p) => p.customerId),
        pairs.map((p) => p.orderId),
        pairs.flatMap((p) => (p.entitlementId ? [p.entitlementId] : []))
      )
      const result = wo.createWorkOrder({
        subjectId: productId,
        subjectType: 'order',
        action: 'batch_refund',
        reason: 'compliance_risk',
        reasonDetail: '合规召回批量主动退款',
        severity: 'S1',
        impact,
        entitlementTreatment: 'keep',
        treatmentSummary: '批量主动退款',
        createdBy: opts.actor,
        owner: opts.owner,
        reviewAt: opts.reviewAt,
        customerNoticeContent: '因合规原因我们将为您主动退款',
        taskTemplate: ['process_refund', 'revoke_entitlement', 'notify_customers', 'reconcile_payment']
      })
      const refundIds = pairs.map((p) => {
        const r = refunds.requestRefund({
          orderId: p.orderId,
          customerId: p.customerId,
          reason: '合规召回',
          amount: p.amount,
          scope: 'full',
          entitlementId: p.entitlementId,
          idempotencyKey: genId('refkey'),
          workOrderId: result.workOrder.id
        })
        refunds.executeRefund(r.id, 'succeeded')
        return r.id
      })
      this._audit('order', productId, 'batch_refund', opts.actor, `批量退款 ${refundIds.length} 笔`)
      return { workOrderId: result.workOrder.id, refundIds }
    },

    // 支付歧义对账：按域决策执行，绝不产生重复权益。
    reconcilePayment(orderId: string, scenario: PaymentAmbiguityCase, actor: string): { action: PaymentAmbiguityAction } {
      const action = resolvePaymentAmbiguity(scenario)
      const orders = useOrderStore()
      if (action === 'backfill_order') {
        orders.applyCharge(orderId, orders.list.find((o) => o.id === orderId)?.amount ?? 0, genId('idem'))
        orders.grantEntitlementForOrder(orderId, true)
      } else if (action === 'close_and_allow_retry') {
        orders.cancelOrder(orderId)
      }
      this._audit('order', orderId, 'reconcile_payment', actor, `对账决策：${action}`)
      return { action }
    },

    // 企业合同终止：开合同工单，收回席位，需双层通知。
    terminateEnterpriseContract(
      contractId: string,
      opts: { effectiveTo: string; enterpriseId: string; actor: string; owner: string; reviewAt: string; severity?: ReverseSeverity }
    ): { workOrderId: string; requiresTwoLayerNotice: boolean } {
      const wo = useReverseWorkOrderStore()
      const contracts = useContractStore()
      const impact = impactFor(contractId, [opts.enterpriseId])
      const result = wo.createWorkOrder({
        subjectId: contractId,
        subjectType: 'contract',
        action: 'contract_termination',
        reason: 'commercial_adjustment',
        reasonDetail: '企业合同终止',
        severity: opts.severity ?? 'S2',
        impact,
        entitlementTreatment: 'keep',
        treatmentSummary: '合同终止与席位收回',
        createdBy: opts.actor,
        owner: opts.owner,
        reviewAt: opts.reviewAt,
        customerNoticeContent: '企业合同将于终止日到期',
        taskTemplate: ['reclaim_seats', 'notify_customers', 'reconcile_state']
      })
      contracts.terminateContract(contractId, opts.effectiveTo)
      const fin = contracts.finalizeContract(contractId)
      this._audit('contract', contractId, 'terminate', opts.actor, '终止合同并批量收回席位')
      return { workOrderId: result.workOrder.id, requiresTwoLayerNotice: fin.requiresTwoLayerNotice }
    },

    removeEnterpriseMember(contractId: string, seatEntitlementId: string, actor: string) {
      useContractStore().removeMember(contractId, seatEntitlementId)
      this._audit('contract', contractId, 'remove_member', actor, `收回席位 ${seatEntitlementId}`)
    }
  }
})
