import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import DemandsPanel from './DemandsPanel.vue'
import { useDemandStore } from '@/stores/demand'

describe('DemandsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists current member demands and supports submit', async () => {
    const wrapper = mount(DemandsPanel, { props: { variant: 'mobile' } })
    const demand = useDemandStore()
    const beforeCount = demand.byOwner('mem-1').length

    expect(wrapper.get('[data-testid="demands-tab-list"]').text()).toContain('我的提报')

    await wrapper.get('[data-testid="demands-tab-form"]').trigger('click')
    await wrapper.get('[data-testid="demand-title"]').setValue('需要华东 PVC 月度数据')
    await wrapper.get('[data-testid="demand-submit"]').trigger('click')
    await flushPromises()

    expect(demand.byOwner('mem-1').length).toBe(beforeCount + 1)
    await wrapper.get('[data-testid="demands-tab-list"]').trigger('click')
    expect(wrapper.text()).toContain('需要华东 PVC 月度数据')
  })
})
