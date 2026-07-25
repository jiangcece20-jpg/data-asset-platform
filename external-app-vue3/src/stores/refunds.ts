import { defineStore } from 'pinia'
import { genId, now } from '@/utils/id'
import type { RefundRecord, RefundScope } from '@/types/afterSales'
import { useEntitlementStore } from './entitlements'

export interface RequestRefundInput {
  orderId: string
  customerId: string
  reason: string
  amount: number
  scope: RefundScope
  entitlementId?: string
  idempotencyKey: string
  workOrderId?: string
}

const TERMINAL = new Set(['succeeded', 'failed', 'rejected'])

export const useRefundStore = defineStore('refunds', {
  state: () => ({
    list: [] as RefundRecord[]
  }),
  getters: {
    byId(state) {
      return (id: string) => state.list.find((r) => r.id === id)
    },
    forOrder(state) {
      return (orderId: string) => state.list.filter((r) => r.orderId === orderId)
    },
    forCustomer(state) {
      return (customerId: string) => state.list.filter((r) => r.customerId === customerId)
    }
  },
  actions: {
    // 发起退款：冻结权益并进入审核。
    requestRefund(input: RequestRefundInput): RefundRecord {
      const existing = this.list.find((r) => r.idempotencyKey === input.idempotencyKey)
      if (existing) return existing
      const record: RefundRecord = {
        id: genId('refund'),
        orderId: input.orderId,
        customerId: input.customerId,
        entitlementId: input.entitlementId,
        reason: input.reason,
        status: input.scope === 'none' ? 'reviewing' : 'reviewing',
        scope: input.scope,
        amount: input.amount,
        idempotencyKey: input.idempotencyKey,
        workOrderId: input.workOrderId,
        createdAt: now(),
        updatedAt: now()
      }
      this.list.push(record)
      if (input.entitlementId) {
        useEntitlementStore().freezeForRefund(input.entitlementId, record.id)
      }
      return record
    },

    // 执行退款：processing → 成功后才撤销权益；失败/驳回恢复（除非独立合规冻结）。
    executeRefund(refundId: string, outcome: 'succeeded' | 'failed' | 'rejected'): { applied: boolean } {
      const record = this.list.find((r) => r.id === refundId)
      if (!record) throw new Error('退款记录不存在')
      if (TERMINAL.has(record.status)) return { applied: false } // 幂等：已终态不重复执行

      const entitlements = useEntitlementStore()
      record.status = 'processing'
      record.updatedAt = now()

      if (outcome === 'succeeded') {
        record.status = 'succeeded'
        if (record.id) entitlements.revokeByRefund(record.id)
      } else {
        record.status = outcome
        entitlements.restoreForRefund(record.id)
      }
      record.updatedAt = now()
      return { applied: true }
    }
  }
})
