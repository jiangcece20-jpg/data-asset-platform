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
    pending_approval: { label: '待企业审批', tone: 'amber' },
    approval_rejected: { label: '审批驳回', tone: 'red' },
    pending_payment: { label: '待支付', tone: 'amber' },
    payment_cancelled: { label: '支付取消', tone: 'slate' },
    payment_failed: { label: '支付失败', tone: 'red' },
    paid: { label: '已支付', tone: 'blue' },
    refunded: { label: '已退款', tone: 'slate' },
    entitlement_active: { label: '权益已生效', tone: 'green' }
  },
  biDelivery: {
    pending: { label: '待创建', tone: 'slate' },
    provisioning: { label: '交付中', tone: 'blue' },
    delivered: { label: '已交付', tone: 'green' },
    failed: { label: '交付失败', tone: 'red' },
    suspended: { label: '已暂停', tone: 'amber' },
    expired: { label: '已到期', tone: 'slate' }
  },
  entitlementStatus: {
    pending: { label: '待交付', tone: 'amber' },
    active: { label: '已生效', tone: 'green' },
    frozen: { label: '已冻结', tone: 'red' },
    migrating: { label: '迁移中', tone: 'blue' },
    expired: { label: '已到期', tone: 'slate' },
    revoked: { label: '已撤销', tone: 'slate' }
  },
  spaceOrder: {
    accepted: { label: '已受理', tone: 'blue' },
    pending_payment: { label: '待支付', tone: 'amber' },
    paid: { label: '已支付', tone: 'blue' },
    delivering: { label: '交付中', tone: 'blue' },
    delivered: { label: '已交付', tone: 'green' },
    failed: { label: '失败', tone: 'red' },
    cancelled: { label: '已取消', tone: 'slate' },
    unknown_processing: { label: '处理中', tone: 'amber' }
  },
  snapshotSync: {
    current: { label: '同步正常', tone: 'green' },
    stale: { label: '同步已过期', tone: 'amber' },
    sync_failed: { label: '同步失败', tone: 'red' },
    unavailable: { label: '暂不可用', tone: 'slate' }
  },
  purchaseIntent: {
    validating: { label: '资格校验中', tone: 'amber' },
    ready: { label: '待跳转', tone: 'blue' },
    redirected: { label: '已跳转', tone: 'blue' },
    returned_pending_sync: { label: '等待状态同步', tone: 'amber' },
    linked: { label: '已关联订单', tone: 'green' },
    failed: { label: '发起失败', tone: 'red' },
    expired: { label: '已过期', tone: 'slate' }
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
    aggregated: { label: '处理中', tone: 'blue' },
    recommended: { label: '已推荐现有商品', tone: 'green' },
    custom_required: { label: '需要定制', tone: 'purple' },
    not_supported: { label: '暂不支持', tone: 'slate' },
    closed: { label: '已关闭', tone: 'slate' },
    withdrawn: { label: '已撤回', tone: 'slate' },
    reopened: { label: '已重开', tone: 'amber' }
  },
  supplyTask: {
    evaluating: { label: '评估中', tone: 'amber' },
    planned: { label: '已规划', tone: 'blue' },
    in_production: { label: '加工中', tone: 'blue' },
    published: { label: '已发布', tone: 'green' },
    cancelled: { label: '已取消', tone: 'slate' }
  },
  supplyDecision: {
    recommend_existing: { label: '推荐现有', tone: 'green' },
    link_preparing: { label: '关联准备中', tone: 'blue' },
    initiate_product: { label: '商品立项', tone: 'purple' },
    custom_project: { label: '定制项目', tone: 'purple' },
    unsupported: { label: '暂不支持', tone: 'slate' }
  },
  callbackStatus: {
    pending: { label: '待回告', tone: 'amber' },
    delivered: { label: '已送达', tone: 'green' },
    failed: { label: '发送失败', tone: 'red' },
    manual_confirmed: { label: '手动确认', tone: 'blue' }
  },
  callbackOutcome: {
    none: { label: '未反馈', tone: 'slate' },
    viewed: { label: '已查看', tone: 'blue' },
    trialed: { label: '已试用', tone: 'blue' },
    purchased: { label: '已购买', tone: 'green' },
    abandoned: { label: '已放弃', tone: 'slate' }
  },
  refund: {
    not_requested: { label: '未申请', tone: 'slate' },
    reviewing: { label: '退款审核中', tone: 'amber' },
    processing: { label: '退款执行中', tone: 'blue' },
    succeeded: { label: '退款成功', tone: 'green' },
    failed: { label: '退款失败', tone: 'red' },
    rejected: { label: '退款驳回', tone: 'red' }
  },
  refundScope: {
    full: { label: '全额', tone: 'green' },
    partial: { label: '部分', tone: 'amber' },
    none: { label: '不退款', tone: 'slate' }
  },
  contractStatus: {
    active: { label: '生效中', tone: 'green' },
    terminating: { label: '终止处理中', tone: 'amber' },
    terminated: { label: '已终止', tone: 'slate' }
  },
  configVersion: {
    draft: { label: '草稿', tone: 'slate' },
    reviewing: { label: '审核中', tone: 'amber' },
    published: { label: '已发布', tone: 'green' },
    rolled_back: { label: '已回滚', tone: 'red' },
    superseded: { label: '已被替代', tone: 'slate' }
  },
  reviewRequirement: {
    single_confirm: { label: '单人二次确认', tone: 'blue' },
    two_person: { label: '双人审核', tone: 'purple' }
  },
  connectorEvent: {
    received: { label: '已接收', tone: 'slate' },
    processed: { label: '已处理', tone: 'green' },
    retrying: { label: '重试中', tone: 'amber' },
    dead_letter: { label: '死信', tone: 'red' }
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
