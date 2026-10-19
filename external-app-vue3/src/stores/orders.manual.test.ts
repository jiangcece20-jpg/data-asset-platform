import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrderStore } from './orders'
import { useEntitlementStore } from './entitlements'
import type { Order } from '@/types/domain'
import { appOrderCard } from '@/domain/myCenter'
import { useAdminOrderHistoryStore } from './adminOrderHistory'

function pendingOrder(): Order {
  return {
    id: 'order-manual-1',
    channel: 'app',
    ownerType: 'personal',
    ownerId: 'mem-1',
    productId: 'prod-freight-index',
    productName: '全国货运价格指数',
    productType: 'dashboard',
    amount: 99,
    status: 'pending_payment',
    createdAt: '2026-09-08 10:00'
  }
}

describe('normal order manual actions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('marks a pending order paid and activates entitlement in one action', () => {
    const store = useOrderStore()
    store.list = [pendingOrder()]
    store.manualConfirmPayment('order-manual-1', '财务已核对到账')
    expect(store.list[0]).toMatchObject({ status: 'paid', entitlementGranted: true, processNote: '财务已核对到账' })
    expect(useEntitlementStore().list.some((item) => item.orderId === 'order-manual-1' && item.status === 'active')).toBe(true)
  })

  it('requires a reason and only cancels pending orders', () => {
    const store = useOrderStore()
    store.list = [pendingOrder()]
    expect(() => store.manualCancel('order-manual-1', '')).toThrow('取消订单必须填写原因')
    store.manualCancel('order-manual-1', '客户明确放弃')
    expect(store.list[0]).toMatchObject({ status: 'cancelled', cancelReason: '客户明确放弃' })
    expect(appOrderCard(store.list[0], '核对企业').filter).toBe('cancelled')
    expect(useAdminOrderHistoryStore().forOrder('order-manual-1').at(-1)).toMatchObject({ action: 'cancelled', label: '订单取消', note: '客户明确放弃' })
    expect(store.list[0].terminationKind).toBe('cancelled')
    expect(() => store.manualConfirmPayment('order-manual-1', '再次确认')).toThrow('仅待支付订单可人工确认支付成功')
  })

  it('keeps automatic closure separate from a customer cancellation', () => {
    const store = useOrderStore()
    store.list = [pendingOrder()]
    store.closeOnlinePendingForProducts(['prod-freight-index'], '商品已下架')
    expect(appOrderCard(store.list[0], '核对企业').filter).toBe('closed')
    expect(useAdminOrderHistoryStore().forOrder('order-manual-1').at(-1)).toMatchObject({ action: 'closed', label: '订单关闭', note: '商品已下架' })
    expect(store.list[0].terminationKind).toBe('closed')
  })
})
