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
      { name: 'activity_level', dataType: 'string', meaning: '活跃等级', description: '', primaryKey: false, nullable: false, profilingEnabled: true },
      { name: 'register_date', dataType: 'date', meaning: '注册日期', description: '', primaryKey: false, nullable: false, profilingEnabled: true },
      { name: 'is_verified', dataType: 'boolean', meaning: '是否认证', description: '', primaryKey: false, nullable: false, profilingEnabled: true }
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
        kind: 'numeric' as const,
        nullRate: '0%',
        distinctCount: 412,
        min: '1',
        max: '2,180',
        avg: '76.4',
        median: '52',
        histogram: [
          { label: '1-20 次', count: 894000, percent: 34 },
          { label: '21-60 次', count: 754000, percent: 29 }
        ],
        updatedAt: '2026-07-01'
      },
      {
        fieldName: 'activity_level',
        kind: 'string' as const,
        nullRate: '0%',
        distinctCount: 4,
        uniqueness: '低基数',
        topValues: [
          { label: 'C', count: 988000, percent: 38 },
          { label: 'B', count: 728000, percent: 28 }
        ],
        updatedAt: '2026-07-01'
      },
      {
        fieldName: 'register_date',
        kind: 'datetime' as const,
        nullRate: '0%',
        distinctCount: 730,
        minDate: '2024-01-01',
        maxDate: '2026-06-30',
        span: '2 年 6 个月',
        distributionYear: [
          { label: '2024', count: 8000, percent: 67 },
          { label: '2025', count: 3000, percent: 25 },
          { label: '2026', count: 1000, percent: 8 }
        ],
        distributionQuarter: [
          { label: '2024Q1', count: 4000, percent: 33 },
          { label: '2024Q2', count: 4000, percent: 33 },
          { label: '2025Q1', count: 4000, percent: 34 }
        ],
        distributionMonth: [
          { label: '2024年01月', count: 2000, percent: 17 },
          { label: '2024年06月', count: 2000, percent: 17 },
          { label: '2025年01月', count: 2000, percent: 16 },
          { label: '2025年06月', count: 2000, percent: 16 },
          { label: '2026年01月', count: 2000, percent: 17 },
          { label: '2026年06月', count: 2000, percent: 17 }
        ],
        updatedAt: '2026-07-01'
      },
      {
        fieldName: 'is_verified',
        kind: 'boolean' as const,
        nullRate: '0%',
        distinctCount: 2,
        trueCount: 700,
        falseCount: 300,
        truePercent: 70,
        updatedAt: '2026-07-01'
      }
      // enterprise_id 未开启 profiling，不应出现
    ],
    ...overrides
  }
}

describe('FieldProfilingPanel', () => {
  it('only offers field dimensions (no table overview)', () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    const labels = wrapper.findAll('[data-dim]').map((n) => n.text())
    expect(labels).toEqual(['发单频次', '活跃等级', '注册日期', '是否认证'])
  })

  it('defaults to the first field dimension', () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    expect(wrapper.find('[data-dim][aria-selected="true"]').text()).toBe('发单频次')
    expect(wrapper.text()).toContain('数值型')
    expect(wrapper.text()).toContain('2,180')
  })

  it('renders numeric histogram when a numeric field is active', () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    expect(wrapper.text()).toContain('区间分布直方图')
    expect(wrapper.text()).toContain('1-20 次')
  })

  it('switches to a string field and shows uniqueness plus top values', async () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    await wrapper.get('[data-dim="activity_level"]').trigger('click')
    expect(wrapper.find('[data-dim][aria-selected="true"]').text()).toBe('活跃等级')
    expect(wrapper.text()).toContain('字符串')
    expect(wrapper.text()).toContain('唯一性')
    expect(wrapper.text()).toContain('TOP 值分布')
    expect(wrapper.text()).toContain('988,000')
  })

  it('renders datetime scrollable chart with month grain by default', async () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    await wrapper.get('[data-dim="register_date"]').trigger('click')
    expect(wrapper.find('[data-dim][aria-selected="true"]').text()).toBe('注册日期')
    expect(wrapper.text()).toContain('时间型')
    expect(wrapper.text()).toContain('最早日期')
    expect(wrapper.text()).toContain('2024-01-01')
    expect(wrapper.get('[data-testid="time-distribution-chart"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="time-distribution-scroll"]').exists()).toBe(true)
    expect(wrapper.get('[data-grain="month"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('2024年01月')
    expect(wrapper.text()).toContain('2,000')
    expect(wrapper.text()).toContain('17%')
  })

  it('switches datetime grain to year and quarter label formats', async () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    await wrapper.get('[data-dim="register_date"]').trigger('click')
    await wrapper.get('[data-grain="year"]').trigger('click')
    expect(wrapper.get('[data-grain="year"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('8,000')
    expect(wrapper.text()).toContain('2024')
    expect(wrapper.text()).not.toContain('2024年01月')

    await wrapper.get('[data-grain="quarter"]').trigger('click')
    expect(wrapper.get('[data-grain="quarter"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('2024Q1')
  })

  it('renders boolean TRUE/FALSE ratio bar', async () => {
    const wrapper = mount(FieldProfilingPanel, { props: { detail: makeDetail() } })
    await wrapper.get('[data-dim="is_verified"]').trigger('click')
    expect(wrapper.find('[data-dim][aria-selected="true"]').text()).toBe('是否认证')
    expect(wrapper.text()).toContain('布尔型')
    expect(wrapper.text()).toContain('TRUE / FALSE 占比')
    expect(wrapper.text()).toContain('700')
  })

  it('shows placeholder when no field is enabled', () => {
    const detail = makeDetail({
      fields: [
        { name: 'enterprise_id', dataType: 'string', meaning: '企业标识', description: '', primaryKey: true, nullable: false }
      ]
    })
    const wrapper = mount(FieldProfilingPanel, { props: { detail } })
    expect(wrapper.findAll('[data-dim]')).toHaveLength(0)
    expect(wrapper.text()).toContain('暂无可探查字段')
  })
})
