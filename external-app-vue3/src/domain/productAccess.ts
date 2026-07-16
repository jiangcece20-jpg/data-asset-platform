import type { AcquisitionOption, AvailabilityStatus, StandardProductType } from '@/types/domain'

export type ProductActionKey =
  | 'view'
  | 'request_listing'
  | 'listing_progress'
  | 'enterprise_auth'
  | 'space_purchase'
  | 'free_view'
  | 'member_purchase'
  | 'item_purchase'
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
}

export function resolveProductActions(context: ProductActionContext): {
  primary: ProductAction
  secondary?: ProductAction
} {
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
    return {
      primary: context.enterpriseAuthenticated
        ? { key: 'space_purchase', label: '前往可信空间购买' }
        : { key: 'enterprise_auth', label: '完成企业认证' }
    }
  }
  if (context.acquisitions.includes('free')) return { primary: { key: 'free_view', label: '免费查看' } }
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
