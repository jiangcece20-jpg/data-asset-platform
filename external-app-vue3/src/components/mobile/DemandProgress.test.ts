import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DemandProgress from './DemandProgress.vue'
import type { DemandLead } from '@/types/domain'
import type { DemandCallback } from '@/types/demandFlow'

function demand(over: Partial<DemandLead> & { id: string; ownerId: string }): DemandLead {
  return {
    question: '港口吞吐量数据', filters: [], browsedProductIds: [],
    objectDesc: '港口吞吐量', region: '长三角', timeRange: '近12个月',
    updateFreq: '每月', scenario: '产能评估', expectedDelivery: '2026-09',
    status: 'new', recommendedProductIds: [], feedbackMessage: '', createdAt: '2026-07-17 09:00',
    source: 'search_miss', subscribed: true, ...over
  }
}

function callback(over: Partial<DemandCallback> & { id: string; demandId: string }): DemandCallback {
  return {
    supplyTaskId: 'st-1', customerId: 'mem-1', status: 'delivered', outcome: 'none',
    content: '已上架', attempts: 0, ...over
  }
}

describe('DemandProgress', () => {
  it('renders only the demands passed in', () => {
    const wrapper = mount(DemandProgress, {
      props: { demands: [demand({ id: 'd1', ownerId: 'mem-1' })], callbacks: [] }
    })
    expect(wrapper.findAll('[data-testid="demand-item"]')).toHaveLength(1)
  })

  it('shows a withdrawn demand as closed', () => {
    const wrapper = mount(DemandProgress, {
      props: { demands: [demand({ id: 'd1', ownerId: 'mem-1', status: 'withdrawn' })], callbacks: [] }
    })
    expect(wrapper.text()).toContain('已撤回')
  })

  it('shows aggregated demand as processing without exposing other detail', () => {
    const wrapper = mount(DemandProgress, {
      props: { demands: [demand({ id: 'd1', ownerId: 'mem-1', status: 'aggregated' })], callbacks: [] }
    })
    expect(wrapper.text()).toContain('处理中')
  })

  it('shows a delivered callback with a product entry', () => {
    const wrapper = mount(DemandProgress, {
      props: {
        demands: [demand({ id: 'd1', ownerId: 'mem-1', status: 'aggregated' })],
        callbacks: [callback({ id: 'cb1', demandId: 'd1', status: 'delivered' })]
      }
    })
    expect(wrapper.find('[data-testid="demand-callback"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-product"]').exists()).toBe(true)
  })

  it('does not show a pending callback as delivered', () => {
    const wrapper = mount(DemandProgress, {
      props: {
        demands: [demand({ id: 'd1', ownerId: 'mem-1', status: 'aggregated' })],
        callbacks: [callback({ id: 'cb1', demandId: 'd1', status: 'pending' })]
      }
    })
    expect(wrapper.find('[data-testid="demand-callback"]').exists()).toBe(false)
  })
})
