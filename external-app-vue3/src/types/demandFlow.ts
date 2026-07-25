// 需求回流闭环契约 —— 对应设计规格 §7、§11.2
// 复用逆向工单对象（CustomerNotice 语义在此以 DemandCallback 表达），
// 供给任务跨入逆向处置时通过 ReverseWorkOrder.subjectType='supply_task' 关联。

export type DemandSource =
  | 'search_miss'
  | 'inquiry'
  | 'listing_request'
  | 'trial_feedback'
  | 'recommend_mismatch'
  | 'post_delist_alt'

export type SupplyTaskStatus =
  | 'evaluating'
  | 'planned'
  | 'in_production'
  | 'published'
  | 'cancelled'

export type SupplyDecision =
  | 'recommend_existing'
  | 'link_preparing'
  | 'initiate_product'
  | 'custom_project'
  | 'unsupported'

export type CallbackStatus = 'pending' | 'delivered' | 'failed' | 'manual_confirmed'

export type CallbackOutcome = 'none' | 'viewed' | 'trialed' | 'purchased' | 'abandoned'

export interface SupplyTask {
  id: string
  title: string
  status: SupplyTaskStatus
  decision: SupplyDecision
  demandIds: string[]
  publishedProductId?: string
  owner: string
  reverseWorkOrderId?: string
  createdAt: string
  updatedAt: string
}

export interface DemandCallback {
  id: string
  supplyTaskId: string
  demandId: string
  customerId: string
  status: CallbackStatus
  outcome: CallbackOutcome
  content: string
  attempts: number
  deliveredAt?: string
  manualResult?: string
}

export interface SupplyTimelineEntry {
  id: string
  supplyTaskId: string
  type:
    | 'created'
    | 'demand_linked'
    | 'demand_unlinked'
    | 'split'
    | 'decision_changed'
    | 'status_changed'
    | 'published'
    | 'callback_delivered'
    | 'callback_outcome'
    | 'cancelled'
  actor: string
  detail: string
  createdAt: string
}

// ── 纯规范化决策的输入/输出契约 ───────────────────────────────
export interface DemandLike {
  id: string
  objectDesc: string
  region: string
  timeRange: string
  status: string
  supplyTaskId?: string
}

export interface SimilarityGroup {
  key: string
  demandIds: string[]
}

export type WithdrawalDecision = 'close_subscription_only' | 'close_and_release'

export interface ReopenResolution {
  sourceDemandId: string
  priorConclusion: string
}
