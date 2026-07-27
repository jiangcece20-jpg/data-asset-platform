// 集成管线纯决策 —— 对应设计规格 §13.1
import type { PipelineDecision } from '@/types/configGovernance'

export interface PipelineInput {
  signatureValid: boolean
  eventVersion: number
  currentProcessingVersion?: number
  idempotencyKeySeen: boolean
}

export function decideEvent(input: PipelineInput): PipelineDecision {
  if (!input.signatureValid) return 'signature_rejected'
  if (input.idempotencyKeySeen) return 'duplicate_noop'
  // 旧事件版本不得覆盖更新状态（同步超时不会被误判为下架，只是被丢弃）。
  if (
    input.currentProcessingVersion !== undefined &&
    input.eventVersion <= input.currentProcessingVersion
  ) return 'stale_dropped'
  return 'process'
}

const MAX_RETRIES = 3

// 首次失败后最多重试 3 次，超过进入死信队列。
export function decideAfterFailure(attempts: number, maxRetries = MAX_RETRIES): 'retry' | 'dead_letter' {
  return attempts > maxRetries ? 'dead_letter' : 'retry'
}
