import type { AppOrderStatus, Order, PaymentMethod, ProductType } from '@/types/domain'
import type { SpaceOrderDisplayStatus, SpaceOrderMirror } from '@/types/trustedSpace'

export type MyOrderFilter = 'all' | 'pending_payment' | 'processing' | 'completed' | 'closed'

export interface MyOrderCard {
  source: 'app' | 'space'
  id: string
  productId: string
  productName: string
  productType?: ProductType
  ownerType: 'personal' | 'enterprise'
  ownerLabel: string
  operatorMemberId?: string
  channelLabel: string
  status: AppOrderStatus | SpaceOrderDisplayStatus
  statusDict: 'appOrder' | 'spaceOrder'
  filter: MyOrderFilter
  planSummary: string
  amountText: string
  createdAt: string
  paidAt?: string
  paymentLabel: string
  progressSummary: string
  entitlementId?: string
  canPay: boolean
 paymentPath?: string
 detailUrl?: string
 downloadUrl?: string
 syncedAt?: string
 spaceProductNo?: string
}

export const productTypeLabels: Record<ProductType, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板'
}

const paymentLabels: Record<PaymentMethod, string> = {
  personal_online: '个人在线支付',
  enterprise_balance: '企业余额',
  enterprise_contract: '合同支付',
  enterprise_bank_transfer: '公对公转账'
}

export function formatOrderTime(value?: string): string {
  if (!value) return '—'
  return value.replace('T', ' ').replace('.000Z', '').slice(0, 16)
}

export function orderFilterLabel(filter: MyOrderFilter): string {
  return ({
    all: '全部',
    pending_payment: '待付款',
    processing: '处理中',
    completed: '已完成',
    closed: '已关闭'
  } as const)[filter]
}

export function appOrderCard(order: Order, enterpriseName: string): MyOrderCard {
  const planSummary = order.serviceMode === 'continuous'
    ? `持续更新 · ${order.selectedTermMonths || '—'} 个月`
    : order.serviceMode === 'one_time'
      ? '一次性交付'
      : '按商品订单约定'
  const isDataset = order.productType === 'dataset'
  return {
    source: 'app',
    id: order.id,
    productId: order.productId,
    productName: order.productName,
    productType: order.productType,
    ownerType: order.ownerType,
    ownerLabel: order.ownerType === 'enterprise' ? enterpriseName : '个人',
    operatorMemberId: order.operatorMemberId,
    channelLabel: 'APP 内购买',
    status: order.status,
    statusDict: 'appOrder',
    filter: appOrderFilter(order.status),
    planSummary,
    amountText: `¥${order.amount.toLocaleString()}`,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    paymentLabel: order.paymentMethod ? paymentLabels[order.paymentMethod] : order.status === 'pending_payment' ? '待选择' : '—',
    progressSummary: appProgress(order.status, isDataset),
    entitlementId: order.entitlementId,
    canPay: order.status === 'pending_payment',
    paymentPath: isDataset ? `/app/payment/dataset/${order.id}` : undefined
  }
}

export function spaceOrderCard(order: SpaceOrderMirror, productType: ProductType | undefined, enterpriseName: string): MyOrderCard {
  return {
    source: 'space',
    id: order.spaceOrderId,
    productId: order.appProductId,
    productName: order.productName,
    productType,
    ownerType: 'enterprise',
    ownerLabel: enterpriseName,
    operatorMemberId: order.operatorMemberId,
    channelLabel: '可信空间购买',
    status: order.displayStatus,
    statusDict: 'spaceOrder',
    filter: spaceOrderFilter(order.displayStatus),
    planSummary: '空间成交方案（以空间订单为准）',
    amountText: `${order.currency === 'CNY' ? '¥' : `${order.currency} `}${order.amount.toLocaleString()}`,
    createdAt: order.spaceUpdatedAt,
    paymentLabel: '空间侧支付',
    progressSummary: order.deliverySummary || spaceProgress(order.displayStatus),
   canPay: false,
   detailUrl: order.detailUrl,
   downloadUrl: order.downloadUrl,
   syncedAt: order.syncedAt,
   spaceProductNo: order.spaceProductNo
  }
}

function appOrderFilter(status: AppOrderStatus): MyOrderFilter {
  if (status === 'pending_payment') return 'pending_payment'
  if (['pending_approval', 'paid'].includes(status)) return 'processing'
  if (status === 'entitlement_active') return 'completed'
  return 'closed'
}

function spaceOrderFilter(status: SpaceOrderDisplayStatus): MyOrderFilter {
  if (status === 'pending_payment') return 'pending_payment'
  if (['accepted', 'paid', 'delivering', 'unknown_processing'].includes(status)) return 'processing'
  if (status === 'delivered') return 'completed'
  return 'closed'
}

function appProgress(status: AppOrderStatus, isDataset: boolean): string {
  const labels: Record<AppOrderStatus, string> = {
    pending_approval: '采购审批待处理，尚未进入付款',
    approval_rejected: '采购审批未通过，订单已关闭',
   pending_payment: '订单待付款，付款后开始权益与交付处理',
    payment_pending_confirmation: '企业线下付款待运营确认到账',
   payment_cancelled: '付款已取消，未形成权益',
    payment_failed: '付款失败，未形成权益',
    paid: isDataset ? '付款成功，数据权益与用数交付处理中' : '付款成功，权益开通处理中',
    refunded: '订单已退款，相关权益按售后结果处理',
    entitlement_active: isDataset ? '付款成功 · 权益已生效 · 数据已交付' : '付款成功 · 权益已生效'
  }
  return labels[status]
}

function spaceProgress(status: SpaceOrderDisplayStatus): string {
  const labels: Record<SpaceOrderDisplayStatus, string> = {
    accepted: '空间已受理，等待后续状态同步',
    pending_payment: '空间订单待付款',
    paid: '空间已确认付款，等待交付',
    delivering: '空间正在交付商品',
    delivered: '空间已完成交付',
    failed: '空间订单处理失败',
    cancelled: '空间订单已取消',
    unknown_processing: '空间状态同步中'
  }
  return labels[status]
}
