import { defineStore } from 'pinia'
import type { Order } from '@/types/domain'
import { useAfterSalesStore } from './afterSales'
import { useEntitlementStore } from './entitlements'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import { useUserStore } from './user'

export interface AdminOrderEvent {
  id: string
  action: string
  label: string
  actor: string
  createdAt?: string
  note: string
  keyOperation: boolean
}

const labels: Record<string, string> = {
  created: '订单创建', paid: '支付成功', manual_payment: '人工确认支付成功',
  entitlement_active: '权益生效', cancelled: '订单取消', closed: '订单关闭', refund: '退款处理',
  initiate_refund: '发起退款', complete_refund: '退款处理', batch_refund: '批量退款',
  reconcile_payment: '支付对账', contract_signed: '合同签署'
}

export const useAdminOrderHistoryStore = defineStore('adminOrderHistory', {
  state: () => ({ legacy: {} as Record<string, AdminOrderEvent[]> }),
  getters: {
    forOrder(state) {
      return (orderId: string): AdminOrderEvent[] => {
        const audit = useAfterSalesStore().auditEntries
          .filter((entry) => entry.subjectType === 'order' && entry.subjectId === orderId)
          .map((entry) => ({ id: entry.id, action: entry.action, label: labels[entry.action] ?? entry.action, actor: entry.actor || '未记录', createdAt: entry.createdAt, note: entry.detail, keyOperation: !['created', 'entitlement_active'].includes(entry.action) }))
        const reverse = useReverseWorkOrderStore()
        const relatedIds = new Set(reverse.workOrders.filter((workOrder) =>
          (workOrder.subjectType === 'order' && workOrder.subjectId === orderId)
          || reverse.impactFor(workOrder.id)?.inFlightOrderIds.includes(orderId)
        ).map((workOrder) => workOrder.id))
        const workEvents = reverse.timeline.filter((entry) => relatedIds.has(entry.workOrderId)).map((entry) => ({
          id: entry.id, action: entry.type, label: reverse.byId(entry.workOrderId)?.reason === 'compliance_risk' ? '风控处置' : '售后工单',
          actor: entry.actor || '未记录', createdAt: entry.createdAt, note: entry.detail,
          keyOperation: ['created', 'plan_confirmed', 'plan_rejected', 'cancelled', 'closure_review_recorded'].includes(entry.type)
        }))
        return [...(state.legacy[orderId] ?? []), ...workEvents, ...audit].sort((a, b) =>
          (a.createdAt ? Date.parse(a.createdAt) : 0) - (b.createdAt ? Date.parse(b.createdAt) : 0)
        )
      }
    }
  },
  actions: {
    // Snapshot only once: legacy fields cannot recover missing actors or overwritten notes.
    captureLegacy(order: Order) {
      if (this.legacy[order.id]) return
      const events: AdminOrderEvent[] = []
      const append = (action: string, createdAt: string | undefined, note = '') => {
        events.push({ id: `legacy-${order.id}-${action}`, action, label: labels[action]!, actor: '未记录（历史数据）', createdAt, note, keyOperation: !['created', 'entitlement_active'].includes(action) })
      }
      append('created', order.createdAt, order.note)
      if (order.paidAt) append('paid', order.paidAt, order.processNote)
      else if (order.processNote) append('manual_payment', undefined, order.processNote)
      const entitlement = useEntitlementStore().list.find((item) => item.orderId === order.id)
      if (entitlement) append('entitlement_active', entitlement.validFrom)
      if (order.closedAt || order.cancelReason) append(order.terminationKind === 'cancelled' ? 'cancelled' : 'closed', order.closedAt, order.cancelReason)
      this.legacy[order.id] = events
    },
    record(order: Order, action: string, note: string, actor?: string) {
      const user = useUserStore().context
      useAfterSalesStore()._audit('order', order.id, action, actor ?? `${user.name}（${user.currentMemberId}）`, note.trim())
    }
  }
})
