import type { SpaceIntentOpsStatus, SpaceIntentUserStatus } from '@/types/spaceIntent'

export const OWNED_SPACE_NAME = '万联易达可信空间'

/** 详情页报价按钮文案；提交后仍生成运营侧意向单。 */
export const SPACE_TRIAL_APPLY_LABEL = '提交试用申请'

export const USER_INTENT_HINT =
  '提交后先不付款。确认企业、确认方案、线下试用都在线下完成，系统不记录这些节点。运营确认到账后会出现在「买数」订单里。'

export const USER_STATUS_LABELS: Record<SpaceIntentUserStatus, string> = {
  submitted: '已提交',
  processing: '处理中',
  closed: '已关闭'
}

export const OPS_STATUS_LABELS: Record<SpaceIntentOpsStatus, string> = {
  unclaimed: '待领取',
  processing: '处理中',
  converted: '已转订单',
  closed: '关闭'
}

export function userStatusOf(ops: SpaceIntentOpsStatus): SpaceIntentUserStatus {
  if (ops === 'unclaimed') return 'submitted'
  if (ops === 'closed') return 'closed'
  return 'processing'
}

export function canConfirmPayment(intent: { enterpriseId?: string }): boolean {
  return Boolean(intent.enterpriseId)
}

export type SpaceIntentOpsAction = 'claim' | 'confirm_payment' | 'close'

export function nextOpsStatus(
  current: SpaceIntentOpsStatus,
  action: SpaceIntentOpsAction
): SpaceIntentOpsStatus {
  if (action === 'close') {
    if (current === 'converted') throw new Error('已转订单不可关闭')
    return 'closed'
  }
  if (action === 'claim') {
    if (current !== 'unclaimed') throw new Error('仅待领取可领取')
    return 'processing'
  }
  if (action === 'confirm_payment') {
    if (current !== 'unclaimed' && current !== 'processing') throw new Error('仅处理中可确认到账')
    return 'converted'
  }
  throw new Error('未知动作')
}
