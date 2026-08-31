import { describe, expect, it } from 'vitest'
import { formatTimeDistributionLabel, withFormattedTimeLabels } from './timeDistribution'

describe('formatTimeDistributionLabel', () => {
  it('formats year labels', () => {
    expect(formatTimeDistributionLabel('2026', 'year')).toBe('2026')
    expect(formatTimeDistributionLabel('年 2025', 'year')).toBe('2025')
  })

  it('formats quarter labels as YYYYQn', () => {
    expect(formatTimeDistributionLabel('2026Q1', 'quarter')).toBe('2026Q1')
    expect(formatTimeDistributionLabel('2026 Q1', 'quarter')).toBe('2026Q1')
    expect(formatTimeDistributionLabel('2026 第1季', 'quarter')).toBe('2026Q1')
  })

  it('formats month labels as YYYY年MM月', () => {
    expect(formatTimeDistributionLabel('2026-01', 'month')).toBe('2026年01月')
    expect(formatTimeDistributionLabel('2026年1月', 'month')).toBe('2026年01月')
    expect(formatTimeDistributionLabel('2026/1', 'month')).toBe('2026年01月')
  })
})

describe('withFormattedTimeLabels', () => {
  it('maps bucket labels for the active grain', () => {
    expect(
      withFormattedTimeLabels([{ label: '2025 Q2', count: 10, percent: 50 }], 'quarter')
    ).toEqual([{ label: '2025Q2', count: 10, percent: 50 }])
  })
})
