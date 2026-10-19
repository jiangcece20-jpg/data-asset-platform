import { describe, expect, it } from 'vitest'
import { datasetOverviewMetrics } from './datasetMetrics'

describe('datasetOverviewMetrics', () => {
  it('keeps all four facts visible when they have not been configured', () => {
    expect(datasetOverviewMetrics()).toEqual([
      { label: '数据粒度', value: '—' },
      { label: '时间范围', value: '—' },
      { label: '数据行数', value: '—' },
      { label: '字段数', value: '—' }
    ])
  })
})
