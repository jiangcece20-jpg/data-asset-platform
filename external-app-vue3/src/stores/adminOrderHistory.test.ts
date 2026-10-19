import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from './orders'
import { useAfterSalesStore } from './afterSales'
import { useUserStore } from './user'
import { useReverseWorkOrderStore } from './reverseWorkOrders'
import { useAdminOrderHistoryStore } from './adminOrderHistory'

describe('admin order operation records', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useOrderStore().list = [{ id: 'audit-order', channel: 'app', ownerType: 'personal', ownerId: 'buyer', productId: 'prod-freight-index', productName: '货运指数', amount: 99, status: 'pending_payment', createdAt: '2026-09-01 09:00' }]
  })
  afterEach(() => vi.useRealTimers())

  it('appends manual payment records with immutable actor and exact execution time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T09:00:12.345Z'))
    const user = useUserStore()
    user.context.name = '运营王芳'
    user.context.currentMemberId = 'ops-1'
    const orders = useOrderStore()
    orders.manualConfirmPayment('audit-order', ' 财务核对到账 ')
    const entries = useAfterSalesStore().auditEntries
    expect(entries.find((entry) => entry.action === 'manual_payment')).toMatchObject({ subjectId: 'audit-order', actor: '运营王芳（ops-1）', createdAt: '2026-10-12T09:00:12.345Z', detail: '财务核对到账' })
    const original = JSON.stringify(entries)
    user.context.name = '另一操作人'
    orders.list[0]!.processNote = '字段被覆盖'
    expect(JSON.stringify(entries)).toBe(original)
    expect(() => orders.manualCancel('audit-order', '无效关闭')).toThrow()
    expect(JSON.stringify(entries)).toBe(original)
  })

  it('preserves the legacy snapshot and appends a cancellation without rewriting earlier records', () => {
    const orders = useOrderStore()
    orders.list[0]!.processNote = '旧说明'
    const history = useAdminOrderHistoryStore()
    history.captureLegacy(orders.list[0]!)
    orders.manualCancel('audit-order', '客户放弃付款')
    orders.list[0]!.processNote = '覆盖旧说明'
    history.captureLegacy(orders.list[0]!)
    const events = history.forOrder('audit-order')
    expect(events.filter((event) => event.action === 'cancelled')).toHaveLength(1)
    expect(events.find((event) => event.note === '旧说明')).toMatchObject({ actor: '未记录（历史数据）', createdAt: undefined })
    expect(events.at(-1)).toMatchObject({ action: 'cancelled', label: '订单取消', note: '客户放弃付款', actor: '陈静（mem-1）' })
    expect(events.some((event) => event.note === '覆盖旧说明')).toBe(false)
  })

  it.each([
    ['cancelled', 'cancelled', '订单取消'],
    ['closed', 'closed', '订单关闭'],
    [undefined, 'closed', '订单关闭']
  ] as const)('captures the explicit legacy termination kind %s without rewriting order facts', (terminationKind, action, label) => {
    const order = useOrderStore().list[0]!
    Object.assign(order, { status: 'cancelled', terminationKind, closedAt: '2026-10-12T09:00:00Z', cancelReason: '历史终止原因' })
    const original = JSON.stringify(order)
    const history = useAdminOrderHistoryStore()
    history.captureLegacy(order)
    expect(history.forOrder(order.id).at(-1)).toMatchObject({ action, label, note: '历史终止原因', actor: '未记录（历史数据）' })
    expect(JSON.stringify(order)).toBe(original)
  })

  it('reads existing audit and related work-order records without rewriting or deduplicating them', () => {
    const after = useAfterSalesStore()
    after.auditEntries = [
      { id: 'existing-1', subjectType: 'order', subjectId: 'audit-order', action: 'complete_refund', actor: 'finance-1', detail: '原有审计记录一', createdAt: '2026-10-12T09:00:00Z' },
      { id: 'existing-2', subjectType: 'order', subjectId: 'audit-order', action: 'complete_refund', actor: 'finance-2', detail: '原有审计记录二', createdAt: '2026-10-12T09:01:00Z' }
    ]
    const reverse = useReverseWorkOrderStore()
    const { workOrder } = reverse.createWorkOrder({ subjectId: 'audit-order', subjectType: 'order', action: 'refund', reason: 'compliance_risk', reasonDetail: '已有工单原因', severity: 'S1', impact: { id: 'impact', productId: 'prod-freight-index', createdAt: '2026-10-12T09:00:00Z', customerIds: [], inFlightOrderIds: ['audit-order'], activeEntitlementIds: [], enterpriseMemberIds: [], trialIds: [], listingRequestIds: [], catalogReferenceIds: [], contractIds: [], isComplete: true }, entitlementTreatment: 'keep', treatmentSummary: '已有工单', createdBy: 'risk-1', owner: 'risk-1', reviewAt: '2026-10-13', customerNoticeContent: '处理中' })
    reverse.acknowledge(workOrder.id, 'risk-2')
    const before = JSON.stringify({ audit: after.auditEntries, timeline: reverse.timeline, orders: useOrderStore().list })
    const history = useAdminOrderHistoryStore()
    expect(history.forOrder('audit-order').filter((event) => event.action === 'complete_refund').map((event) => event.note)).toEqual(['原有审计记录一', '原有审计记录二'])
    expect(history.forOrder('audit-order').find((event) => event.label === '风控处置')).toMatchObject({ actor: 'risk-1', note: reverse.timeline[0].detail })
    expect(history.forOrder('audit-order').some((event) => event.actor === 'risk-2')).toBe(true)
    expect(history.forOrder('unrelated')).toEqual([])
    expect(JSON.stringify({ audit: after.auditEntries, timeline: reverse.timeline, orders: useOrderStore().list })).toBe(before)
  })

  it('requires closure notes before changing orders or appending audit records', () => {
    expect(() => useOrderStore().cancelOrder('audit-order', '  ')).toThrow('关闭')
    expect(() => useOrderStore().manualCancel('audit-order', '  ')).toThrow('原因')
    expect(useOrderStore().list[0].status).toBe('pending_payment')
    expect(useAfterSalesStore().auditEntries).toEqual([])
  })
})
