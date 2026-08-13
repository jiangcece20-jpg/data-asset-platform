import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDemandStore } from '@/stores/demand'
import TrialsLeads from './TrialsLeads.vue'

describe('TrialsLeads', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps demand leads and omits trial approval and listing requests', () => {
    const wrapper = mount(TrialsLeads)

    expect(wrapper.text()).toContain('需求线索')
    expect(wrapper.text()).not.toContain('试用审批')
    expect(wrapper.text()).not.toContain('求上架')
  })

  it('only keeps the three product response decisions and saves the selected result', async () => {
    const wrapper = mount(TrialsLeads)
    const demand = useDemandStore()

    expect(wrapper.text()).not.toContain('分派')
    expect(wrapper.text()).not.toContain('关闭')
    expect(wrapper.findAll('[data-testid="lead-action-recommended"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="lead-action-custom_required"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="lead-action-not_supported"]')).toHaveLength(3)

    const firstRecommended = wrapper.find('[data-testid="lead-action-recommended"]')
    await firstRecommended.trigger('click')

    expect(demand.byId('demand-seed-1')).toMatchObject({
      status: 'recommended',
      feedbackMessage: '已为你推荐相关现有商品，请查看详情'
    })
    expect(firstRecommended.attributes('aria-pressed')).toBe('true')
  })
})
