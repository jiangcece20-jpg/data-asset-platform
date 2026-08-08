import type { DatasetDetail } from '@/types/domain'

export interface DatasetMetricItem {
  label: string
  value: string | number
}

function hasText(v?: string | null): v is string {
  return Boolean(v && v.trim())
}

/** 前台关键指标：仅返回已配置项；空值不进入列表 */
export function datasetKeyMetrics(detail?: DatasetDetail | null): DatasetMetricItem[] {
  if (!detail) return []
  const items: DatasetMetricItem[] = []
  if (hasText(detail.granularity)) items.push({ label: '数据粒度', value: detail.granularity.trim() })
  if (hasText(detail.timeRange)) items.push({ label: '时间范围', value: detail.timeRange.trim() })
  if (detail.rowCount != null && !Number.isNaN(detail.rowCount)) {
    items.push({ label: '数据行数', value: detail.rowCount })
  }
  const fieldCount =
    detail.fieldCount === null
      ? undefined
      : detail.fieldCount != null && !Number.isNaN(detail.fieldCount)
        ? detail.fieldCount
        : detail.fields?.length
          ? detail.fields.length
          : undefined
  if (fieldCount != null && fieldCount > 0) {
    items.push({ label: '字段数', value: `${fieldCount} 个` })
  }
  return items
}
