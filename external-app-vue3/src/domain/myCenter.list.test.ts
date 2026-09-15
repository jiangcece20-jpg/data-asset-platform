import { describe, expect, it } from 'vitest'
import {
  matchesBuyDataStatusFilter,
  orderAmountCaption,
  orderFilterLabel,
  orderListStatusLabel,
  type MyOrderCard,
  type MyOrderFilter
} from './myCenter'

function card(filter: MyOrderFilter, amountText = '¥599'): MyOrderCard {
  return {
    source: 'app',
    id: 'order-1',
    productId: 'prod-1',
    productName: '示例',
    ownerType: 'personal',
    ownerLabel: '个人',
    channelLabel: 'APP 内购买',
    status: 'paid',
    statusDict: 'appOrder',
    filter,
    planSummary: '',
    amountText,
    createdAt: '2026-07-18T10:00:00.000Z',
    paymentLabel: '—',
    progressSummary: '',
    canPay: false
  }
}

describe('buy-data list status mapping', () => {
  it('uses the temporary four filter labels', () => {
    expect(orderFilterLabel('all')).toBe('全部')
    expect(orderFilterLabel('pending_payment')).toBe('待付款')
    expect(orderFilterLabel('paid')).toBe('已支付')
    expect(orderFilterLabel('cancelled')).toBe('已取消')
    expect(orderFilterLabel('closed')).toBe('已关闭')
  })

  it('keeps unclaimed and processing as card-only labels', () => {
    expect(orderListStatusLabel(card('unclaimed'))).toBe('待领取')
    expect(orderListStatusLabel(card('processing'))).toBe('处理中')
    expect(orderListStatusLabel(card('entitled'))).toBe('已支付')
    expect(orderListStatusLabel(card('pending_payment'))).toBe('待付款')
  })

  it('does not put unclaimed or processing into the four status chips', () => {
    expect(matchesBuyDataStatusFilter(card('unclaimed'), 'pending_payment')).toBe(false)
    expect(matchesBuyDataStatusFilter(card('processing'), 'paid')).toBe(false)
    expect(matchesBuyDataStatusFilter(card('unclaimed'), 'all')).toBe(true)
    expect(matchesBuyDataStatusFilter(card('processing'), 'all')).toBe(true)
  })

  it('groups entitled orders into 已支付', () => {
    expect(matchesBuyDataStatusFilter(card('entitled'), 'paid')).toBe(true)
    expect(matchesBuyDataStatusFilter(card('paid'), 'paid')).toBe(true)
    expect(matchesBuyDataStatusFilter(card('pending_payment'), 'paid')).toBe(false)
  })

  it('captions paid amounts as 实付款 and unpaid amounts as 应付款', () => {
    expect(orderAmountCaption(card('paid'))).toBe('实付款')
    expect(orderAmountCaption(card('entitled'))).toBe('实付款')
    expect(orderAmountCaption(card('pending_payment'))).toBe('应付款')
    expect(orderAmountCaption(card('cancelled'))).toBe('应付款')
    expect(orderAmountCaption(card('unclaimed', '—'))).toBeUndefined()
  })
})
