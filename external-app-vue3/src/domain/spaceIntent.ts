import type { Product } from '@/types/domain'
import type { SpaceIntentOpsStatus, SpaceIntentUserStatus } from '@/types/spaceIntent'

export const OWNED_SPACE_NAME = '万联易达可信空间'

export const USER_STATUS_LABELS: Record<SpaceIntentUserStatus, string> = {
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  closed: '已关闭'
}

export const OPS_STATUS_LABELS: Record<SpaceIntentOpsStatus, string> = {
  unclaimed: '待领取',
  pending_enterprise: '待确认企业',
  space_dealing: '空间成交中',
  pending_delivery: '待接入交付',
  completed: '已完成',
  closed: '关闭'
}

export function userStatusOf(ops: SpaceIntentOpsStatus): SpaceIntentUserStatus {
  if (ops === 'unclaimed') return 'submitted'
  if (ops === 'completed') return 'completed'
  if (ops === 'closed') return 'closed'
  return 'processing'
}

export function publicSpaceChips(product: Product): string[] {
  const chips: string[] = []
  if (product.dealChannel === 'space_purchase' && product.spaceName) chips.push(product.spaceName)
  if (product.type === 'dataset' && product.hasSampleData) chips.push('有样例')
  if (product.type === 'api' && product.hasTrialApi) chips.push('有试用接口')
  return chips
}

export function canEnterSpaceDealing(intent: { enterpriseId?: string }): boolean {
  return Boolean(intent.enterpriseId)
}

export type SpaceIntentOpsAction = 'claim' | 'confirm_enterprise' | 'mark_space_deal' | 'complete_delivery' | 'close'

export function nextOpsStatus(
  current: SpaceIntentOpsStatus,
  action: SpaceIntentOpsAction,
  productType: 'dataset' | 'api'
): SpaceIntentOpsStatus {
  if (action === 'close') {
    if (current === 'completed') throw new Error('已完成不可关闭')
    return 'closed'
  }
  if (action === 'claim') {
    if (current !== 'unclaimed') throw new Error('仅待领取可领取')
    return 'pending_enterprise'
  }
  if (action === 'confirm_enterprise') {
    if (current !== 'unclaimed' && current !== 'pending_enterprise') throw new Error('企业未确认')
    return 'space_dealing'
  }
  if (action === 'mark_space_deal') {
    if (current !== 'space_dealing') throw new Error('未在空间成交中')
    return productType === 'dataset' ? 'pending_delivery' : 'completed'
  }
  if (action === 'complete_delivery') {
    if (current !== 'pending_delivery') throw new Error('仅待接入交付可完成接入')
    return 'completed'
  }
  throw new Error('未知动作')
}
