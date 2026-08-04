import type { AcquisitionOption, AvailabilityStatus, StandardProductType } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'
import type { TrustedPurchaseCheck, TrustedPurchaseBlockReason } from '@/types/trustedSpace'

export type ProductActionKey =
  | 'view'
  | 'request_listing'
  | 'listing_progress'
  | 'enterprise_auth'
  | 'space_purchase'
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
}

const trustedPurchaseBlockLabels: Record<TrustedPurchaseBlockReason, string> = {
  enterprise_required: '认证企业后购买',
  binding_required: '企业信息同步中',
  product_unavailable: '商品信息暂不可用',
  product_stale: '商品信息待更新',
  product_not_for_sale: '暂不可购买'
}

function isTrustedPurchaseBlocked(
  check: TrustedPurchaseCheck
): check is Extract<TrustedPurchaseCheck, { allowed: false }> {
  return !check.allowed
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
    const trustedCheck = context.trustedPurchaseCheck
    if (trustedCheck && isTrustedPurchaseBlocked(trustedCheck)) {
      return {
        primary: {
          key: 'unavailable',
          label: trustedPurchaseBlockLabels[trustedCheck.reason],
          disabled: true
        }
      }
    }
    return {
      primary: context.enterpriseAuthenticated
        ? { key: 'space_purchase', label: '前往可信空间购买' }
        : { key: 'enterprise_auth', label: '完成企业认证' }
    }
  }
  if (context.acquisitions.includes('free')) return { primary: { key: 'free_view', label: '免费查看' } }
  if (context.type === 'dataset' && context.acquisitions.includes('item_purchase')) {
    return { primary: { key: 'dataset_purchase', label: '购买数据集' } }
  }
  if (context.acquisitions.includes('member')) {
    return {
      primary: { key: 'member_purchase', label: '开通会员' },
      secondary: context.acquisitions.includes('item_purchase')
        ? { key: 'item_purchase', label: '单品购买' }
        : undefined
    }
  }
  return { primary: { key: 'item_purchase', label: '单品购买' } }
}
