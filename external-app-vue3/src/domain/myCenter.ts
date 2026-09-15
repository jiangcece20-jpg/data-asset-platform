import type { AppOrderStatus, Order, PaymentMethod, ProductType } from '@/types/domain'
import type { SpaceIntentOpsStatus, SpaceIntentOrder } from '@/types/spaceIntent'
import type { SpaceOrderDisplayStatus, SpaceOrderMirror } from '@/types/trustedSpace'
import { USER_STATUS_LABELS, userStatusOf } from '@/domain/spaceIntent'

export type NormalOrderStatus = 'pending_payment' | 'paid' | 'cancelled'
export type MyOrderFilter = 'all' | SpaceIntentOpsStatus | NormalOrderStatus

export interface RenewalInfo {
  /** 续订入口路径 */
  renewalPath: string
  /** 距到期天数：正数为即将到期，0 为当天到期，负数为已过期 */
  daysUntilExpiry: number
  /** 到期日期文本 */
  expiryDate: string
  /** 续订状态 */
  status: 'expiring' | 'expired'
}

export interface MyOrderCard {
  source: 'app' | 'space' | 'intent'
  id: string
  productId: string
  productName: string
  productType?: ProductType
  ownerType: 'personal' | 'enterprise'
  ownerLabel: string
  operatorMemberId?: string
  channelLabel: string
  status: AppOrderStatus | SpaceOrderDisplayStatus | SpaceIntentOpsStatus
  statusDict: 'appOrder' | 'spaceOrder' | 'spaceIntentOrder'
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
  biEntryUrl?: string
  detailUrl?: string
  downloadUrl?: string
  syncedAt?: string
  spaceProductNo?: string
  spaceIntentId?: string
  /** 到期日期展示；会员免费商品为会员到期日 */
  expiryText?: string
  /** 续订提示信息（仅持续更新且含有效期的数据集展示） */
  renewalInfo?: RenewalInfo
  /** 订单备注，如卖家待开通说明 */
  note?: string
}

export const productTypeLabels: Record<ProductType, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板'
}

export const buyDataTypeFilterOptions: Array<{ value: 'all' | ProductType; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'dataset', label: '数据集' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '行业报告' },
  { value: 'dashboard', label: '自有看板' }
]

export const buyDataStatusFilters: MyOrderFilter[] = ['all', 'pending_payment', 'paid', 'cancelled', 'closed']

export const buyDataTypeFilterLabels: Record<'all' | ProductType, string> = {
  all: '全部类型',
  dataset: '数据集',
  api: 'API',
  report: '行业报告',
  dashboard: '自有看板'
}

export type BuyDataStatusChip = 'all' | 'pending_payment' | 'paid' | 'cancelled' | 'closed'
export type BuyDataTypeFilter = 'all' | ProductType

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
    unclaimed: '待领取',
    processing: '处理中',
    entitled: '已支付',
    closed: '已关闭',
    pending_payment: '待付款',
    paid: '已支付',
    cancelled: '已取消'
  } as const)[filter]
}

export function orderListStatusLabel(order: Pick<MyOrderCard, 'filter'>): string {
  if (order.filter === 'unclaimed') return '待领取'
  if (order.filter === 'processing') return '处理中'
  if (order.filter === 'pending_payment') return '待付款'
  if (order.filter === 'cancelled') return '已取消'
  if (order.filter === 'closed') return '已关闭'
  return '已支付'
}

export function orderListStatusClass(order: Pick<MyOrderCard, 'filter'>): string {
  if (order.filter === 'unclaimed' || order.filter === 'pending_payment') return 'bg-amber-50 text-amber-700'
  if (order.filter === 'processing') return 'bg-blue-50 text-blue-600'
  if (order.filter === 'cancelled' || order.filter === 'closed') return 'bg-slate-100 text-slate-600'
  return 'bg-emerald-50 text-emerald-600'
}

export function matchesBuyDataStatusFilter(
  order: Pick<MyOrderCard, 'filter'>,
  filter: MyOrderFilter
): boolean {
  if (filter === 'all') return true
  if (filter === 'paid') return order.filter === 'paid' || order.filter === 'entitled'
  if (filter === 'unclaimed' || filter === 'processing' || filter === 'entitled') return false
  return order.filter === filter
}

export function orderAmountCaption(order: Pick<MyOrderCard, 'filter' | 'amountText'>): string | undefined {
  if (!order.amountText || order.amountText === '—') return undefined
  if (order.filter === 'paid' || order.filter === 'entitled') return '实付款'
  return '应付款'
}

export function buyDataProductTypeLabel(type: ProductType | undefined): string {
  if (!type) return '商品'
  return buyDataTypeFilterLabels[type]
}

/** 意向单始终保留在自身生命周期中，不转为普通订单。 */
export function spaceIntentCard(
  intent: SpaceIntentOrder,
  productName: string,
  enterpriseName: string
): MyOrderCard {
  const userStatus = userStatusOf(intent.opsStatus)
  const isEnterprise = Boolean(intent.enterpriseId)
  return {
    source: 'intent',
    id: intent.id,
    productId: intent.productId,
    productName,
    productType: intent.productType,
    ownerType: isEnterprise ? 'enterprise' : 'personal',
    ownerLabel: isEnterprise ? enterpriseName : '个人',
    operatorMemberId: intent.ownerMemberId,
    channelLabel: '空间试用 · 意向单',
    status: intent.opsStatus,
    statusDict: 'spaceIntentOrder',
    filter: userStatus,
    planSummary: intent.scenario || '提交试用申请',
    amountText: '—',
    createdAt: intent.createdAt,
    paymentLabel: '提交后不付款',
    progressSummary: USER_STATUS_LABELS[userStatus],
    canPay: false,
    spaceIntentId: intent.id,
    note: intent.contactName ? `联系人 ${intent.contactName}` : undefined
  }
}

export function appOrderCard(order: Order, enterpriseName: string): MyOrderCard {
  const planSummary = order.selectedTermMonths
    ? `购买周期 · ${order.selectedTermMonths} 个月`
    : '按商品订单约定'
  const isDataset = order.productType === 'dataset'
  const isSellerOrder = Boolean(order.sellerId)
  const isSpaceIntent = Boolean(order.spaceIntentId)
  return {
    source: 'app',
    id: order.id,
    productId: order.productId,
    productName: order.productName,
    productType: order.productType,
    ownerType: order.ownerType,
    ownerLabel: order.ownerType === 'enterprise' ? enterpriseName : '个人',
    operatorMemberId: order.operatorMemberId,
    channelLabel: isSpaceIntent ? '平台成交 · 线下付款' : isSellerOrder ? '入驻商家 · 平台成交' : 'APP 内购买',
    status: normalOrderStatusOf(order.status),
    statusDict: 'appOrder',
    filter: appOrderFilter(order.status),
    planSummary,
    amountText: `¥${order.amount.toLocaleString()}`,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    paymentLabel: order.paymentMethod
      ? paymentLabels[order.paymentMethod]
      : isSellerOrder && order.status === 'pending_activation'
        ? '待运营开通'
        : isSellerOrder && (order.status === 'pending_payment' || order.status === 'payment_pending_confirmation')
        ? '待平台确认到账'
        : order.status === 'pending_payment'
          ? '待选择'
          : '—',
    progressSummary: appProgress(order.status, isDataset, isSellerOrder, isSpaceIntent),
    entitlementId: order.entitlementId,
    canPay: order.status === 'pending_payment' && !isSpaceIntent && !isSellerOrder,
    paymentPath: isDataset && !isSpaceIntent && !isSellerOrder ? `/app/payment/dataset/${order.id}` : undefined,
    spaceIntentId: order.spaceIntentId,
    note: order.note
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

export function normalOrderStatusOf(status: AppOrderStatus): NormalOrderStatus {
  if (['approval_rejected', 'payment_cancelled', 'payment_failed', 'refunded', 'cancelled'].includes(status)) return 'cancelled'
  if (['pending_approval', 'pending_payment', 'payment_pending_confirmation'].includes(status)) return 'pending_payment'
  return 'paid'
}

function appOrderFilter(status: AppOrderStatus): MyOrderFilter {
  return normalOrderStatusOf(status)
}

function spaceOrderFilter(status: SpaceOrderDisplayStatus): MyOrderFilter {
  if (status === 'pending_payment') return 'pending_payment'
  if (['accepted', 'paid', 'delivering', 'unknown_processing'].includes(status)) return 'processing'
  if (status === 'delivered') return 'paid'
  return 'cancelled'
}

function appProgress(status: AppOrderStatus, isDataset: boolean, isSellerOrder = false, isSpaceIntent = false): string {
  if (isSpaceIntent && status === 'paid') {
    return isDataset ? '线下已到账，空间数据接入中' : '线下已到账，空间开通调用中'
  }
  if (isSpaceIntent && status === 'entitlement_active') {
    return isDataset ? '数据已接入本平台，可在我的订单进入用数模块' : '空间已开通调用。请按订单说明在空间使用，本平台不代调用'
  }
  if (isSellerOrder && (status === 'pending_payment' || status === 'payment_pending_confirmation')) {
    return '企业合同采购，待平台确认到账'
  }
  if (isSellerOrder && status === 'pending_activation') {
    return '平台已收款，待运营开通数据集查看'
  }
  if (isSellerOrder && status === 'entitlement_active') {
    return '运营已开通 · 数据集权益已生效 · 按合同与卖家结算'
  }
  const labels: Record<AppOrderStatus, string> = {
    intent: '试用意向已提交，运营跟进中，提交后不付款',
    pending_approval: '采购审批待处理，尚未进入付款',
    approval_rejected: '采购审批未通过，订单已关闭',
    pending_payment: '订单待付款，付款后开始权益与交付处理',
    payment_pending_confirmation: '企业线下付款待运营确认到账',
    payment_cancelled: '付款已取消，未形成权益',
    payment_failed: '付款失败，未形成权益',
    paid: isDataset ? '付款成功，数据权益与用数交付处理中' : '付款成功，权益开通处理中',
    pending_activation: '平台已收款，待运营开通',
    refunded: '订单已退款，相关权益按售后结果处理',
    cancelled: '订单已取消，未形成权益',
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
