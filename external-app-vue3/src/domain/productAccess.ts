import type { AcquisitionOption, AvailabilityStatus, ProductOrigin, StandardProductType } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedPurchaseCheck } from '@/types/trustedSpace'
import type { PurchaseIdentitySubject } from '@/domain/purchaseIdentity'
import { formatYuan, type ProductMemberBenefit } from '@/domain/membership'
import { SPACE_TRIAL_APPLY_LABEL } from '@/domain/spaceIntent'

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
  | 'unavailable'

export interface ProductAction {
  key: ProductActionKey
  label: string
  disabled?: boolean
}

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
    return { primary: { key: 'dataset_purchase', label: '购买数据集' } }
  }
  if (context.acquisitions.includes('member')) {
    return resolveMemberAwareActions(context)
  }
  return { primary: { key: 'item_purchase', label: itemPurchaseLabel(context, '单品购买') } }
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
    const primaryLabel = benefit === 'discount'
      ? `开通${memberName}，享${context.discountZhe ?? 6}折`
      : `开通${memberName}，免费看本商品`
    const secondaryLabel = benefit === 'discount'
      ? `原价购买${itemPriceText(context.itemPrice)}`.trim()
      : itemPurchaseLabel(context, '单品购买')
    return {
      primary: { key: 'member_purchase', label: primaryLabel },
      secondary: hasItem ? { key: 'item_purchase', label: secondaryLabel } : undefined
    }
  }

  return {
    primary: { key: 'item_purchase', label: itemPurchaseLabel(context, '单品购买') }
  }
}
