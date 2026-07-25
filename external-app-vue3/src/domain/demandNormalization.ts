// 需求规范化纯函数 —— 对应设计规格 §7.3、§7.4、§11.2
// 无 store 依赖：去重分组、合并/拆分校验、终态重开、撤回语义。

import type {
  DemandLike,
  SimilarityGroup,
  WithdrawalDecision,
  ReopenResolution
} from '@/types/demandFlow'

const TERMINAL_REOPENABLE = new Set(['not_supported', 'recommended', 'closed'])
const MERGE_BLOCKED_STATUS = new Set(['withdrawn', 'closed'])

function similarityKey(demand: Pick<DemandLike, 'objectDesc' | 'region' | 'timeRange'>): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  return [norm(demand.objectDesc), norm(demand.region), norm(demand.timeRange)].join('|')
}

/** 将对象/地域/时间范围一致的需求归为一组；单条独占的组也会返回。 */
export function groupSimilarDemands(demands: DemandLike[]): SimilarityGroup[] {
  const buckets = new Map<string, string[]>()
  for (const demand of demands) {
    const key = similarityKey(demand)
    const list = buckets.get(key) ?? []
    list.push(demand.id)
    buckets.set(key, list)
  }
  return [...buckets.entries()].map(([key, demandIds]) => ({ key, demandIds }))
}

/** 是否可将需求并入目标供给任务。已归入其他任务或处于终态的需求不可合并。 */
export function canMergeDemand(demand: DemandLike, targetSupplyTaskId: string): boolean {
  if (MERGE_BLOCKED_STATUS.has(demand.status)) return false
  if (demand.supplyTaskId && demand.supplyTaskId !== targetSupplyTaskId) return false
  return true
}

/** 供给任务拆分：拆出的需求数需 ≥1，且拆分后原任务仍需保留 ≥1 个需求。 */
export function canSplitSupplyTask(currentDemandIds: string[], splitDemandIds: string[]): boolean {
  if (splitDemandIds.length < 1) return false
  if (currentDemandIds.length < 2) return false
  const remaining = currentDemandIds.filter((id) => !splitDemandIds.includes(id))
  return remaining.length >= 1 && splitDemandIds.every((id) => currentDemandIds.includes(id))
}

/** 终态需求重开：保留原结论，返回重开来源。非终态抛错。 */
export function resolveReopen(demand: DemandLike & { feedbackMessage?: string }): ReopenResolution {
  if (!TERMINAL_REOPENABLE.has(demand.status)) {
    throw new Error('仅终态需求可重开')
  }
  return {
    sourceDemandId: demand.id,
    priorConclusion: demand.feedbackMessage ?? ''
  }
}

/**
 * 撤回语义：需求若与其他活跃需求共享供给任务，只关闭该客户订阅；
 * 若为供给任务中唯一需求（或未归入任务），则连带释放任务。
 */
export function resolveWithdrawal(
  demand: DemandLike,
  siblingActiveDemandCount: number
): WithdrawalDecision {
  if (demand.supplyTaskId && siblingActiveDemandCount > 0) {
    return 'close_subscription_only'
  }
  return 'close_and_release'
}
