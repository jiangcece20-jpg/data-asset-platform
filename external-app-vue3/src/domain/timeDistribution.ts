import type { DistributionBucket } from '@/types/domain'

export type TimeGrain = 'year' | 'quarter' | 'month'

/** 时间分布横轴标签口径：年=2026；年季=2026Q1；年月=2026年01月 */
export function formatTimeDistributionLabel(label: string, grain: TimeGrain): string {
  if (grain === 'year') {
    const match = label.match(/(\d{4})/)
    return match ? match[1] : label
  }
  if (grain === 'quarter') {
    const match =
      label.match(/(\d{4})\s*[Qq](\d)/) ||
      label.match(/(\d{4})\s*第?\s*([1-4])\s*季/) ||
      label.match(/(\d{4})\s+([1-4])/)
    if (match) return `${match[1]}Q${match[2]}`
    return label.replace(/\s+/g, '')
  }
  const match = label.match(/(\d{4})[-/.年]?\s*(\d{1,2})/)
  if (match) return `${match[1]}年${match[2].padStart(2, '0')}月`
  return label
}

export function withFormattedTimeLabels(
  buckets: DistributionBucket[],
  grain: TimeGrain
): DistributionBucket[] {
  return buckets.map((bucket) => ({
    ...bucket,
    label: formatTimeDistributionLabel(bucket.label, grain)
  }))
}

export const TIME_GRAIN_OPTIONS: { key: TimeGrain; label: string }[] = [
  { key: 'year', label: '按年' },
  { key: 'quarter', label: '按年季' },
  { key: 'month', label: '按年月' }
]
