import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PrototypeProductCard from './PrototypeProductCard.vue'
import { coal, shared, type ProductPreview } from './prototypeScenes'

describe('商品卡片的条件与风险分区', () => {
  it('keeps scopes in the actual shared preset', () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: shared } })
    expect(wrapper.get('.match-summary').text()).toBe('需求 1 · 煤炭运价：包含 2025 年榆林至天津港的煤炭公路运价，支持按月查看；需求 2 · 货运路线：提供地市间路线与运力信息。')
  })

  it('keeps ownership when a shared product confirms different scopes', () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: {...coal, coverage:['运价需求','路线需求'], evidence:[
      {label:'数据内容',fact:'包含煤炭运价',state:'met',demand:'运价需求'},
      {label:'时间范围',fact:'覆盖 2024 年',state:'met',demand:'运价需求'},
      {label:'数据内容',fact:'包含货运路线',state:'met',demand:'路线需求'},
      {label:'时间范围',fact:'覆盖 2025 年',state:'met',demand:'路线需求'}
    ]} } })
    expect(wrapper.get('.match-summary').text()).toBe('运价需求：包含 2024 年煤炭运价；路线需求：包含 2025 年货运路线。')
  })

  it('rebuilds summary when facts change without claiming unknown coverage', async () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: coal } })
    await wrapper.setProps({ product: { ...coal, evidence: [coal.evidence[0], {label:'时间范围',fact:'覆盖 2024 年',state:'met'}, {label:'线路方向',fact:'指定路线资料未说明',state:'unknown'}] } })
    const summary = wrapper.get('[data-evidence-group="satisfied"]').text()
    expect(summary).toContain('2024')
    expect(summary).not.toContain('2025')
    expect(summary).not.toContain('榆林')
    expect(summary).not.toContain('按月')
    expect(wrapper.get('[data-evidence-group="unknown"]').text()).toContain('指定路线资料未说明')
    expect(wrapper.find('[data-evidence-group="satisfied"] li').exists()).toBe(false)
  })

  it('shows only satisfied conditions when all supplied evidence is met', () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: coal } })
    expect(wrapper.get('[data-evidence-group="satisfied"]').text()).toContain('匹配说明')
    expect(wrapper.get('[data-evidence-group="satisfied"] p').text()).toBe('包含 2025 年榆林至天津港的煤炭公路运价，支持按月查看。')
    expect(wrapper.find('[data-evidence-group="satisfied"] li').exists()).toBe(false)
    expect(wrapper.find('[data-evidence-group="risks"]').exists()).toBe(false)
    expect(wrapper.find('[data-evidence-group="unknown"]').exists()).toBe(false)
    expect(wrapper.find('[data-evidence-group="differences"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('暂无风险')
  })

  it('separates satisfied conditions, differences, known risks and missing facts', () => {
    const product: ProductPreview = {
      ...coal,
      evidence: [
        coal.evidence[0],
        { label: '更新频率', fact: '每周更新，低于每日更新偏好', state: 'partial' },
        { label: '区域明细', fact: '仅提供地市明细，不支持区县', state: 'unmet' },
        { label: '查看方式', fact: '商品未说明是否支持按天查看', state: 'unknown' }
      ],
      risks: [{ fact: '2025 年 12 月有 2 条明细记录缺失', impact: '该月汇总可能存在偏差', demand: '煤炭运价' }]
    }
    const wrapper = mount(PrototypeProductCard, { props: { product } })
    expect(wrapper.get('[data-evidence-group="satisfied"]').text()).not.toContain('更新频率')
    const differences = wrapper.get('[data-evidence-group="differences"]')
    expect(differences.text()).toContain('部分满足')
    expect(differences.text()).toContain('不满足')
    expect(differences.text()).not.toContain('商品未说明')
    const risk = wrapper.get('[data-evidence-group="risks"]')
    expect(risk.text()).toContain('2 条明细记录缺失')
    expect(risk.text()).toContain('该月汇总可能存在偏差')
    expect(risk.text()).toContain('煤炭运价')
    expect(risk.text()).not.toContain('商品未说明')
    const unknown = wrapper.get('[data-evidence-group="unknown"]')
    expect(unknown.text()).toContain('待核实')
    expect(unknown.text()).not.toContain('每周更新')
  })

  it('does not turn missing evidence into a risk or a confirmed difference', () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: { ...coal, evidence: [{ label: '按天查看', fact: '资料未说明', state: 'unknown' }] } } })
    expect(wrapper.findAll('[data-evidence-group]')).toHaveLength(1)
    expect(wrapper.get('[data-evidence-group="unknown"]').text()).toContain('资料未说明')
  })

  it('preserves product actions while evidence groups change', async () => {
    const wrapper = mount(PrototypeProductCard, { props: { product: coal } })
    await wrapper.get('.favorite').trigger('click')
    await wrapper.get('.primary-action').trigger('click')
    await wrapper.get('.secondary-action').trigger('click')
    expect(wrapper.emitted('favorite')).toHaveLength(1)
    expect(wrapper.emitted('action')).toHaveLength(1)
    expect(wrapper.emitted('details')).toHaveLength(1)
    await wrapper.setProps({ product: { ...coal, evidence: [], risks: [{ fact: '历史记录缺失', impact: '影响完整性' }] } })
    expect(wrapper.find('[data-evidence-group="satisfied"]').exists()).toBe(false)
    expect(wrapper.get('[data-evidence-group="risks"]').text()).toContain('影响完整性')
  })
})
