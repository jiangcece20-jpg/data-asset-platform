type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'red' | 'purple'

interface Meta {
  label: string
  tone: Tone
}

const toneClass: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600'
}

const dictionaries: Record<string, Record<string, Meta>> = {
  availability: {
    candidate: { label: '候选资产', tone: 'slate' },
    preparing: { label: '上架准备中', tone: 'amber' },
    published: { label: '已上架', tone: 'green' },
    paused: { label: '暂停销售', tone: 'amber' },
    delisted: { label: '已下架', tone: 'slate' }
  },
  product: {
    draft: { label: '草稿', tone: 'slate' },
    pending_approval: { label: '待审批', tone: 'amber' },
    rejected: { label: '已驳回', tone: 'red' },
    pending_publish: { label: '待发布', tone: 'blue' },
    published: { label: '已发布', tone: 'green' },
    paused: { label: '暂停销售', tone: 'amber' },
    delisted: { label: '已下架', tone: 'slate' }
  },
  appOrder: {
    pending_payment: { label: '待支付', tone: 'amber' },
    payment_cancelled: { label: '支付取消', tone: 'slate' },
    payment_failed: { label: '支付失败', tone: 'red' },
    paid: { label: '已支付', tone: 'blue' },
    refunded: { label: '已退款', tone: 'slate' },
    entitlement_active: { label: '权益已生效', tone: 'green' }
  },
  spaceOrder: {
    pending_redirect: { label: '待跳转', tone: 'slate' },
    space_processing: { label: '空间处理中', tone: 'amber' },
    purchase_success: { label: '购买成功', tone: 'blue' },
    callback_delayed: { label: '状态同步中', tone: 'amber' },
    delivering: { label: '交付中', tone: 'blue' },
    delivered: { label: '已交付', tone: 'green' }
  },
  trial: {
    not_applied: { label: '未申请', tone: 'slate' },
    pending: { label: '待审批', tone: 'amber' },
    approved: { label: '已通过', tone: 'green' },
    rejected: { label: '已驳回', tone: 'red' },
    exhausted: { label: '额度用尽', tone: 'slate' },
    expired: { label: '已过期', tone: 'slate' }
  },
  enterprise: {
    pending: { label: '待开通', tone: 'amber' },
    active: { label: '有效', tone: 'green' },
    seats_full: { label: '席位已满', tone: 'amber' },
    expired: { label: '已到期', tone: 'red' }
  },
  demand: {
    new: { label: '待处理', tone: 'amber' },
    assigned: { label: '已分派', tone: 'blue' },
    recommended: { label: '已推荐现有商品', tone: 'green' },
    custom_required: { label: '需要定制', tone: 'purple' },
    not_supported: { label: '暂不支持', tone: 'slate' },
    closed: { label: '已关闭', tone: 'slate' }
  },
  approval: {
    approved: { label: '审批通过', tone: 'green' },
    rejected: { label: '已驳回', tone: 'red' },
    pending: { label: '待审批', tone: 'amber' }
  },
  contract: {
    quoting: { label: '报价中', tone: 'amber' },
    contract_signed: { label: '合同已签署', tone: 'blue' },
    payment_confirmed: { label: '付款已确认', tone: 'green' },
    not_required: { label: '无需合同', tone: 'slate' }
  },
  listingRequest: {
    submitted: { label: '已提交', tone: 'blue' },
    evaluating: { label: '评估中', tone: 'amber' },
    preparing: { label: '上架准备中', tone: 'amber' },
    published: { label: '已上架', tone: 'green' },
    unsupported: { label: '暂不支持', tone: 'slate' }
  },
  reverseWo: {
    pending_assessment: { label: '待评估', tone: 'amber' },
    impact_analysis: { label: '影响分析', tone: 'blue' },
    plan_confirmation: { label: '方案确认', tone: 'blue' },
    executing: { label: '执行中', tone: 'amber' },
    customer_handling: { label: '客户处置', tone: 'amber' },
    cross_system_verification: { label: '跨系统核验', tone: 'purple' },
    closed: { label: '已关闭', tone: 'slate' },
    cancelled: { label: '已取消', tone: 'slate' },
  },
  reverseSeverity: {
    S1: { label: 'S1', tone: 'red' },
    S2: { label: 'S2', tone: 'amber' },
    S3: { label: 'S3', tone: 'slate' },
  },
  serviceStatus: {
    normal: { label: '正常', tone: 'green' },
    degraded: { label: '降级', tone: 'amber' },
    suspended: { label: '暂停服务', tone: 'red' },
    terminated: { label: '终止服务', tone: 'slate' },
  },
  noticeStatus: {
    pending: { label: '待发送', tone: 'amber' },
    delivered: { label: '已送达', tone: 'green' },
    failed: { label: '发送失败', tone: 'red' },
    manual_confirmed: { label: '手动确认', tone: 'blue' },
  },
  compStatus: {
    proposed: { label: '待处理', tone: 'amber' },
    approved: { label: '已批准', tone: 'blue' },
    completed: { label: '已完成', tone: 'green' },
    rejected: { label: '已拒绝', tone: 'red' },
  }
}

export function statusMeta(dict: string, key: string): Meta {
  return dictionaries[dict]?.[key] || { label: key, tone: 'slate' }
}

export function statusClass(dict: keyof typeof dictionaries, key: string): string {
  return toneClass[statusMeta(dict, key).tone]
}
