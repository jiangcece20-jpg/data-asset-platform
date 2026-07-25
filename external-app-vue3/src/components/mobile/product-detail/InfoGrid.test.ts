import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import InfoGrid from './InfoGrid.vue'

describe('InfoGrid', () => {
  it('renders label above value for each item', () => {
    const wrapper = mount(InfoGrid, {
      props: {
        items: [
          { label: '发布日期', value: '2026-07-05' },
          { label: '报告页数', value: '28 页' }
        ]
      }
    })
    expect(wrapper.findAll('dt').map((n) => n.text())).toEqual(['发布日期', '报告页数'])
    expect(wrapper.findAll('dd').map((n) => n.text())).toEqual(['2026-07-05', '28 页'])
  })

  it('falls back to a dash for empty values', () => {
    const wrapper = mount(InfoGrid, {
      props: {
        items: [
          { label: '空字符串', value: '' },
          { label: '未定义' },
          { label: '空值', value: null }
        ]
      }
    })
    expect(wrapper.findAll('dd').map((n) => n.text())).toEqual(['—', '—', '—'])
  })

  it('formats numbers with thousand separators', () => {
    const wrapper = mount(InfoGrid, {
      props: { items: [{ label: '数据行数', value: 120000 }] }
    })
    expect(wrapper.get('dd').text()).toBe('120,000')
  })

  it('spans the full row when full is set, and skips items without a label', () => {
    const wrapper = mount(InfoGrid, {
      props: {
        items: [
          { label: '路径示例', value: '/api/v1/query', full: true },
          { label: '', value: '脏数据' }
        ]
      }
    })
    const cells = wrapper.findAll('.info-grid__cell')
    expect(cells).toHaveLength(1)
    expect(cells[0].classes()).toContain('info-grid__cell--full')
  })
})
