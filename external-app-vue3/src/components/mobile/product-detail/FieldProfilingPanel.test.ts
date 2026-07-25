import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FieldProfilingPanel from './FieldProfilingPanel.vue'
import type { DatasetDetail } from '@/types/domain'

function makeDetail(overrides: Partial<DatasetDetail> = {}): DatasetDetail {
  return {
    granularity: '企业 × 月',
    timeRange: '2024-01 至 2026-06',
    rowCount: 1000,
    classification: 'L2',
    qualityUpdatedAt: '2026-07-01',
    fields: [
      { name: 'enterprise_id', dataType: 'string', meaning: '企业标识', description: '', primaryKey: true, nullable: false, sensitivity: 'L2' },
      { name: 'order_frequency', dataType: 'integer', meaning: '发单频次', description: '', primaryKey: false, nullable: false, profilingEnabled: true },
      { name: 'activity_level', dataType: 'string', meaning: '活跃等级', description: '', primaryKey: false, nullable: false, profilingEnabled: true }
    ],
    sampleColumns: [],
    sampleRows: [],
    sampleGeneratedAt: '2026-07-01',
    profiling: {
      completeness: '97.2%',
      uniqueness: '100%',
      nullRate: '2.8%',
      distribution: '分布正常',
      anomalies: '未发现异常',
      conclusion: '质量优良',
      updatedAt: '2026-07-01'
    },
    fieldProfiling: [
      {
        fieldName: 'order_frequency',
        nullRate: '0%',
        distinctCount: 412,
        min: '1',
        max: '2180',
        avg: '76.4',
        topValues: [{ value: '1-20 次', count: 894000, percent: 34 }],
        updatedAt: '2026-07-01'
      }
      // activity_level 开了开关但没有探查结果，不应出现在维度里
    ],
    ...overrides
  }
}

describe('FieldProfilingPanel', () => {
  it('only offers dimensions for fields enabled in admin and having stats', () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    const labels = wrapper.findAll('[role="tab"]').map((n) => n.text())
    // 整表概览 + 发单频次；企业标识未开启、活跃等级无结果，均被过滤
    expect(labels).toEqual(['整表概览', '发单频次'])
  })

  it('shows the table-level overview by default', () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    expect(wrapper.find('[aria-selected="true"]').text()).toBe('整表概览')
    expect(wrapper.text()).toContain('97.2%')
  })

  it('switches to a single field profiling view with its top-value distribution', async () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    await wrapper.get('[data-dim="order_frequency"]').trigger('click')
    expect(wrapper.find('[aria-selected="true"]').text()).toBe('发单频次')
    expect(wrapper.text()).toContain('TOP 值分布')
    expect(wrapper.text()).toContain('1-20 次')
    expect(wrapper.text()).toContain('412')
  })

  it('degrades to the overview only when no field is enabled', () => {
    const detail = makeDetail({
      fields: [
        { name: 'enterprise_id', dataType: 'string', meaning: '企业标识', description: '', primaryKey: true, nullable: false }
      ]
    })
    const wrapper = mount(FieldProfilingPanel, { props: { detail } })
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(1)
  })
})
