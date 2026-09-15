import type { SpaceIntentOpsStatus, SpaceIntentUserStatus } from '@/types/spaceIntent'

export const OWNED_SPACE_NAME = '万联易达可信空间'

/** 详情页报价按钮文案；提交后仍生成运营侧意向单。 */
export const SPACE_TRIAL_APPLY_LABEL = '提交试用申请'

export const USER_INTENT_HINT =
  '提交后无需付款。运营领取并处理后，可直接确认权益生效；进度可在「我的订单 · 买数」查看。'

export const USER_STATUS_LABELS: Record<SpaceIntentUserStatus, string> = {
  unclaimed: '待领取',
  processing: '处理中',
  entitled: '权益生效',
  closed: '已关闭'
}

export const OPS_STATUS_LABELS: Record<SpaceIntentOpsStatus, string> = {
  unclaimed: '待领取',
  processing: '处理中',
  entitled: '权益生效',
  closed: '已关闭'
}

export function userStatusOf(ops: SpaceIntentOpsStatus): SpaceIntentUserStatus {
  return ops
}

export type SpaceIntentOpsAction = 'claim' | 'effect' | 'close'

export function nextOpsStatus(
  current: SpaceIntentOpsStatus,
  action: SpaceIntentOpsAction
): SpaceIntentOpsStatus {
  if (action === 'close') {
    if (current !== 'unclaimed' && current !== 'processing') throw new Error('终态意向单不可关闭')
    return 'closed'
  }
  if (action === 'claim') {
    if (current !== 'unclaimed') throw new Error('仅待领取可领取')
    return 'processing'
  }
  if (action === 'effect') {
    if (current !== 'processing') throw new Error('仅处理中可确认权益生效')
    return 'entitled'
  }
  throw new Error('未知动作')
}
