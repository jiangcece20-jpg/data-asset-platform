// 配置与集成治理契约 —— 对应设计规格 §12、§13
// 复用 ReverseWorkOrder（subjectType='config'|'integration'）。

export type ConfigDomain = 'hot_word' | 'recommend_slot' | 'channel' | 'ai_guide' | 'member_price'
export type ReviewRequirement = 'single_confirm' | 'two_person'
export type ConfigVersionStatus = 'draft' | 'reviewing' | 'published' | 'rolled_back' | 'superseded'

export interface ConfigVersion {
  id: string
  domain: ConfigDomain
  version: number
  before: unknown
  after: unknown
  editor: string
  reviewer?: string
  reviewRequirement: ReviewRequirement
  effectiveScope: string
  affectedProductIds: string[]
  publishedAt?: string
  rolledBackFromVersion?: number
  rollbackReason?: string
  status: ConfigVersionStatus
  createdAt: string
}

export type ConnectorEventStatus = 'received' | 'processed' | 'retrying' | 'dead_letter' | 'repaired'
export type Connector = 'trusted_space' | 'payment' | 'finance'

export interface ConnectorEvent {
  id: string
  connector: Connector
  subjectId: string
  eventType: string
  eventVersion: number
  idempotencyKey: string
  signatureValid: boolean
  purchaseIntentId?: string
  spaceEnterpriseId?: string
  spaceProductNo?: string
  status: ConnectorEventStatus
  attempts: number
  processingVersion: number
  workOrderId?: string
  createdAt: string
}

// 复核要求决策输入（§12.1）
export interface ReviewRequirementInput {
  domain: ConfigDomain
  affectedProductCount: number
  allUserEntrance: boolean
}

// 回滚规则场景与动作（§12.2）
export type RollbackScenario =
  | 'paused_recommended_product'
  | 'no_result_hot_word'
  | 'invalid_ai_reference'
  | 'mispriced'
  | 'wrong_channel'

export type RollbackAction =
  | 'withdraw_and_backup'
  | 'stop_or_switch_demand'
  | 'safe_fallback'
  | 'stop_new_and_dispose_by_time'
  | 'rollback_keep_erroneous'

// 集成管线决策（§13.1）
export type PipelineDecision = 'process' | 'stale_dropped' | 'duplicate_noop' | 'signature_rejected' | 'retry' | 'dead_letter'
