import type { AcquisitionOption, AppOrderStatus, AvailabilityStatus, Order, ProductOrigin, StandardProductType } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedPurchaseCheck } from '@/types/trustedSpace'
import type { SpaceIntentOrder, SpaceIntentUserStatus } from '@/types/spaceIntent'
import type { PurchaseIdentitySubject } from '@/domain/purchaseIdentity'
import { formatYuan, type ProductMemberBenefit } from '@/domain/membership'
import { SPACE_TRIAL_APPLY_LABEL, userStatusOf } from '@/domain/spaceIntent'

export type ProductActionKey =
  | 'view'
  | 'request_listing'
  | 'listing_progress'
  | 'enterprise_auth'
  | 'space_purchase'
  | 'submit_space_intent'
  | 'free_view'
  | 'member_purchase'
  | 'item_purchase'
  | 'dataset_purchase'
  | 'continue_payment'
  | 'delivery_progress'
  | 'intent_progress'
  | 'unavailable'

export interface ProductAction {
  key: ProductActionKey
  label: string
  disabled?: boolean
}

/** 购买中：已下单未发权，或空间意向未转买数。 */
export type PurchaseInProgress =
  | { phase: 'pending_payment'; orderId: string; canPay: boolean }
  | { phase: 'fulfilling'; orderId: string; status: AppOrderStatus }
  | { phase: 'space_intent'; intentId: string; userStatus: Extract<SpaceIntentUserStatus, 'submitted' | 'processing'> }

export interface ProductActionContext {
  type: StandardProductType
  availability: AvailabilityStatus
  acquisitions: AcquisitionOption[]
  hasAccess: boolean
  hasOpenListingRequest: boolean
  enterpriseAuthenticated: boolean
  serviceStatus?: ServiceStatus
  trustedPurchaseCheck?: TrustedPurchaseCheck
  identitySubject?: PurchaseIdentitySubject
  memberBenefit?: ProductMemberBenefit
  hasEffectiveMembership?: boolean
  canPurchaseMembership?: boolean
  itemPrice?: number
  memberItemPrice?: number
  discountZhe?: number
  origin?: ProductOrigin
  /** 当前主体对该商品的进行中订单/意向；有则详情底栏进「购买中」文案 */
  purchaseInProgress?: PurchaseInProgress | null
}

const FULFILLING_ORDER_STATUSES: AppOrderStatus[] = [
  'pending_approval',
  'payment_pending_confirmation',
  'paid',
  'pending_activation'
]

/**
 * 从订单与意向单推导「购买中」相位。优先最近一笔未完成 APP 订单，再看未转单的空间意向。
 */
export function resolvePurchaseInProgress(input: {
  productId: string
  orders: Order[]
  intents: SpaceIntentOrder[]
  ownerMemberId: string
  enterpriseId?: string
}): PurchaseInProgress | null {
  const { productId, orders, intents, ownerMemberId, enterpriseId } = input
  const openOrders = orders
    .filter((order) => {
      if (order.productId !== productId) return false
      if (order.ownerType === 'personal') return order.ownerId === ownerMemberId
      return Boolean(enterpriseId) && order.ownerId === enterpriseId
    })
    .filter((order) =>
      order.status === 'pending_payment' || FULFILLING_ORDER_STATUSES.includes(order.status)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const order = openOrders[0]
  if (order) {
    if (order.status === 'pending_payment') {
      const canPay = !order.spaceIntentId && !order.sellerId
      return { phase: 'pending_payment', orderId: order.id, canPay }
    }
    return { phase: 'fulfilling', orderId: order.id, status: order.status }
  }

  const intent = intents
    .filter((item) =>
      item.productId === productId
      && item.ownerMemberId === ownerMemberId
      && (item.opsStatus === 'unclaimed' || item.opsStatus === 'processing')
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  if (!intent) return null
  const userStatus = userStatusOf(intent.opsStatus)
  if (userStatus !== 'submitted' && userStatus !== 'processing') return null
  return { phase: 'space_intent', intentId: intent.id, userStatus }
}

export function resolveProductActions(context: ProductActionContext): {
  primary: ProductAction
  secondary?: ProductAction
} {
  const service = context.serviceStatus ?? 'normal'

  // Service-level blocks override everything, even existing access
  if (service === 'suspended') {
    return { primary: { key: 'unavailable', label: '服务风险处置中', disabled: true } }
  }
  if (service === 'terminated') {
    return { primary: { key: 'unavailable', label: '服务已终止', disabled: true } }
  }

  if (context.hasAccess) return { primary: { key: 'view', label: '立即查看' } }

  const inProgress = resolveInProgressAction(context.purchaseInProgress)
  if (inProgress) return inProgress

  if (context.availability === 'candidate') {
    return {
      primary: context.hasOpenListingRequest
        ? { key: 'listing_progress', label: '查看上架进度' }
        : { key: 'request_listing', label: '求上架' }
    }
  }
  if (context.availability === 'preparing') return { primary: { key: 'listing_progress', label: '查看上架进度' } }
  if (context.availability === 'paused' || context.availability === 'delisted') {
    return { primary: { key: 'unavailable', label: context.availability === 'paused' ? '暂停销售' : '已下架', disabled: true } }
  }
  if (context.acquisitions.includes('space_purchase')) {
    return { primary: { key: 'submit_space_intent', label: SPACE_TRIAL_APPLY_LABEL } }
  }
  if (context.acquisitions.includes('free')) return { primary: { key: 'free_view', label: '免费查看' } }
  if (context.type === 'dataset' && context.acquisitions.includes('item_purchase')) {
    if (context.origin === 'seller_market') {
      return { primary: { key: 'item_purchase', label: '购买数据集' } }
    }
    if (context.acquisitions.includes('member')) {
      return resolveMemberAwareActions(context)
    }
    return { primary: { key: 'dataset_purchase', label: '购买数据集' } }
  }
  if (context.acquisitions.includes('member')) {
    return resolveMemberAwareActions(context)
  }
  return { primary: { key: 'item_purchase', label: itemPurchaseLabel(context, '单品购买') } }
}

function resolveInProgressAction(phase: PurchaseInProgress | null | undefined): {
  primary: ProductAction
  secondary?: ProductAction
} | null {
  if (!phase) return null
  if (phase.phase === 'pending_payment') {
    return { primary: { key: 'continue_payment', label: '继续付款' } }
  }
  if (phase.phase === 'fulfilling') {
    const label =
      phase.status === 'pending_activation' ? '待开通'
        : phase.status === 'payment_pending_confirmation' ? '付款确认中'
          : '查看交付进度'
    return { primary: { key: 'delivery_progress', label } }
  }
  return {
    primary: {
      key: 'intent_progress',
      label: phase.userStatus === 'submitted' ? '查看订单' : '意向处理中'
    }
  }
}

function itemPriceText(amount?: number): string {
  return amount != null ? ` ${formatYuan(amount)}` : ''
}

function itemPurchaseLabel(context: ProductActionContext, fallback: string): string {
  return `${fallback}${itemPriceText(context.itemPrice)}`.trim()
}

function resolveMemberAwareActions(context: ProductActionContext): {
  primary: ProductAction
  secondary?: ProductAction
} {
  const subject = context.identitySubject ?? 'personal'
  const memberName = subject === 'enterprise' ? '团队会员' : '个人会员'
  const benefit = context.memberBenefit ?? 'free'
  const hasMember = Boolean(context.hasEffectiveMembership)
  const canBuyMember = context.canPurchaseMembership !== false
  const hasItem = context.acquisitions.includes('item_purchase')

  if (hasMember && benefit === 'discount' && hasItem) {
    return {
      primary: {
        key: 'item_purchase',
        label: `会员价购买${itemPriceText(context.memberItemPrice)}`.trim()
      }
    }
  }

  if (canBuyMember) {
    if (hasItem) {
      return {
        primary: { key: 'item_purchase', label: '立即购买' }
      }
    }
    const primaryLabel = benefit === 'discount'
      ? `开通${memberName}，享${context.discountZhe ?? 6}折`
      : `开通${memberName}，免费看本商品`
    return {
      primary: { key: 'member_purchase', label: primaryLabel }
    }
  }

  return {
    primary: { key: 'item_purchase', label: itemPurchaseLabel(context, '单品购买') }
  }
}

const listActionLabelByKey: Record<ProductActionKey, string> = {
  view: '立即查看',
  request_listing: '可申请上架',
  listing_progress: '查看进度',
  enterprise_auth: '企业认证',
  space_purchase: '提交试用申请',
  submit_space_intent: '提交试用申请',
  free_view: '免费查看',
  member_purchase: '开通会员',
  item_purchase: '购买',
  dataset_purchase: '购买数据集',
  continue_payment: '继续付款',
  delivery_progress: '查看交付进度',
  intent_progress: '查看订单',
  unavailable: '暂不可购'
}

/** 列表卡片右下角轻量按钮文案，与详情 §3.1 主动作一致但省略价格。 */
export function resolveProductListActionHint(context: ProductActionContext): string {
  const { primary } = resolveProductActions(context)
  if (primary.key === 'unavailable') return primary.label
  if (primary.key === 'item_purchase') {
    if (primary.label.startsWith('会员价购买')) return '会员价购买'
    if (context.type === 'dataset') return '购买数据集'
    return '购买'
  }
  if (primary.key === 'delivery_progress') return primary.label
  if (primary.key === 'intent_progress') return primary.label
  return listActionLabelByKey[primary.key] ?? primary.label
}
