import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TimeDistributionChart from './TimeDistributionChart.vue'

describe('TimeDistributionChart', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses content-width track and scrolls latest bar into view', async () => {
    const wrapper = mount(TimeDistributionChart, {
      props: {
        grain: 'month',
        buckets: [
          { label: '2024年01月', count: 100, percent: 10 },
          { label: '2025年01月', count: 200, percent: 20 },
          { label: '2026年06月', count: 700, percent: 70 }
        ]
      },
      attachTo: document.body
    })

    await flushPromises()
    expect(wrapper.get('[data-testid="time-distribution-scroll"] .inline-flex').classes()).toContain('inline-flex')
    expect(scrollIntoView).toHaveBeenCalled()

    scrollIntoView.mockClear()
    await wrapper.setProps({
      grain: 'quarter',
      buckets: [
        { label: '2025Q1', count: 100, percent: 25 },
        { label: '2025Q2', count: 100, percent: 25 },
        { label: '2026Q1', count: 100, percent: 25 },
        { label: '2026Q2', count: 100, percent: 25 }
      ]
    })
    await flushPromises()

    expect(scrollIntoView).toHaveBeenCalled()
    expect(wrapper.findAll('[data-testid="time-distribution-bar"]').at(-1)!.text()).toContain('2026Q2')
    wrapper.unmount()
  })
})
