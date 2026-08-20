import type { DealChannel, Product } from '@/types/domain'
import type { Resource } from '@/types/resource'

export type SalesState = 'unlisted' | 'draft' | 'published' | 'paused' | 'delisted'

export const SALES_STATE_LABELS: Record<SalesState, string> = {
  unlisted: '未上架',
  draft: '草稿',
  published: '已上架',
  paused: '暂停新购',
  delisted: '已下架'
}

export function salesStateOf(product: Product | undefined): SalesState {
  if (!product) return 'unlisted'
  if (product.availability === 'published') return 'published'
  if (product.availability === 'paused') return 'paused'
  if (product.availability === 'delisted') return 'delisted'
  return 'draft'
}

export function listingBlockReason(resource: Resource): string | undefined {
  if (resource.type === 'user_view') return '用数视图不可上架'
  if (resource.origin === 'asset_platform' && (resource.assetStatus !== 'published' || !resource.commercializable)) {
    return '仅已发布且允许商业化的资产可上架'
  }
  return undefined
}

export interface PublishForm {
  name: string
  dealChannel: DealChannel
  isFree: boolean
  salePeriodMonths: number
  personalEnabled: boolean
  personalPrice: number
  enterpriseEnabled: boolean
  enterprisePrice: number
  standardMemberMode: 'none' | 'free' | 'discount'
  standardMemberZhe: number
  premiumMemberMode: 'none' | 'free' | 'discount'
  premiumMemberZhe: number
  hasSpacePrice: boolean
  dashboardMetrics: { name: string; definition: string }[]
}

export interface FieldError {
  field: string
  message: string
}

function zheOk(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 9.9
}

function salePeriodOk(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 1
}

export function validateDraftSave(form: PublishForm): FieldError[] {
  const errors: FieldError[] = []
  if (!form.name.trim()) errors.push({ field: 'name', message: '请填写商品名称' })
  if (!form.isFree && form.dealChannel === 'app_payment' && !salePeriodOk(form.salePeriodMonths)) {
    errors.push({ field: 'salePeriod', message: '可售卖周期须为正整数' })
  }
  if (form.standardMemberMode === 'discount' && !zheOk(form.standardMemberZhe)) {
    errors.push({ field: 'memberZhe', message: '普通会员折扣须为 1–9.9 折' })
  }
  if (form.premiumMemberMode === 'discount' && !zheOk(form.premiumMemberZhe)) {
    errors.push({ field: 'memberZhe', message: '高级会员折扣须为 1–9.9 折' })
  }
  return errors
}

export function validatePublish(form: PublishForm): FieldError[] {
  const errors = validateDraftSave(form)
  if (form.dashboardMetrics.some((m) => !m.name.trim() || !m.definition.trim())) {
    errors.push({ field: 'dashboardMetrics', message: '每条看板指标须有名称和定义' })
  }
  if (form.dealChannel === 'space_purchase') {
    if (!form.hasSpacePrice) errors.push({ field: 'pricing', message: '可信空间价格尚未同步，不能上架' })
    return errors
  }
  if (form.isFree) return errors
  if (!salePeriodOk(form.salePeriodMonths)) {
    if (!errors.some((e) => e.field === 'salePeriod')) {
      errors.push({ field: 'salePeriod', message: '付费商品须填写可售卖周期' })
    }
  }
  const hasMember = form.standardMemberMode !== 'none' || form.premiumMemberMode !== 'none'
  if (!form.personalEnabled && !form.enterpriseEnabled && !hasMember) {
    errors.push({ field: 'pricing', message: '请启用免费，或至少配置一种可售方式' })
  }
  if (form.personalEnabled && !Number.isFinite(form.personalPrice)) {
    errors.push({ field: 'itemPrice', message: '请填写个人单品价格' })
  }
  if (form.enterpriseEnabled && !Number.isFinite(form.enterprisePrice)) {
    errors.push({ field: 'itemPrice', message: '请填写企业单品价格' })
  }
  return errors
}
