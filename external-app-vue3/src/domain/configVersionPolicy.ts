// 配置复核要求与回滚规则纯函数 —— 对应设计规格 §12
import type {
  ReviewRequirement,
  ReviewRequirementInput,
  RollbackScenario,
  RollbackAction
} from '@/types/configGovernance'

// 价格 / 会员范围 / AI 来源约束类配置需双人审核；批量≥100 商品或全用户入口一律双人。
const TWO_PERSON_DOMAINS = new Set(['member_price', 'ai_guide'])

export function resolveReviewRequirement(input: ReviewRequirementInput): ReviewRequirement {
  if (TWO_PERSON_DOMAINS.has(input.domain)) return 'two_person'
  if (input.affectedProductCount >= 100) return 'two_person'
  if (input.allUserEntrance) return 'two_person'
  return 'single_confirm'
}

const ROLLBACK_MAP: Record<RollbackScenario, RollbackAction> = {
  paused_recommended_product: 'withdraw_and_backup',
  no_result_hot_word: 'stop_or_switch_demand',
  invalid_ai_reference: 'safe_fallback',
  mispriced: 'stop_new_and_dispose_by_time',
  wrong_channel: 'rollback_keep_erroneous'
}

export function resolveRollbackRule(scenario: RollbackScenario): RollbackAction {
  return ROLLBACK_MAP[scenario]
}
