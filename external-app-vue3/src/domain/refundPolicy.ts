// 退款政策纯函数 —— 对应设计规格 §9.3
import type { RefundScope } from '@/types/afterSales'
import type { ProductType } from '@/types/domain'

export interface RefundPolicyInput {
  productType: ProductType
  entitlementKind: 'term' | 'report_version'
  used: boolean // 是否已发生不可逆使用（下载 / API 调用 / 报告版本已交付）
  complianceRecall: boolean
}

/**
 * 退款范围决策：
 * - 合规召回：支持批量主动全额退款；
 * - 未使用的期限权益：全额；
 * - 已交付的报告版本：不可逆，不退；
 * - 其他已使用（数据下载、API 调用、看板期限）：按已用范围部分退。
 */
export function resolveRefundScope(input: RefundPolicyInput): RefundScope {
  if (input.complianceRecall) return 'full'
  if (!input.used) return 'full'
  if (input.entitlementKind === 'report_version') return 'none'
  return 'partial'
}
