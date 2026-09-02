import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import DemandsPanel from './DemandsPanel.vue'
import { useDemandStore } from '@/stores/demand'
import { useUserStore } from '@/stores/user'

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

  it('echoes login name as editable contact name and snapshots login account', async () => {
    const wrapper = mount(DemandsPanel, { props: { variant: 'mobile' } })
    const demand = useDemandStore()
    const user = useUserStore()

    await wrapper.get('[data-testid="demands-tab-form"]').trigger('click')
    expect((wrapper.get('[data-testid="demand-contact-name"]').element as HTMLInputElement).value).toBe(user.context.name)

    await wrapper.get('[data-testid="demand-title"]').setValue('需要港口月度数据')
    await wrapper.get('[data-testid="demand-contact-name"]').setValue('张三')
    await wrapper.get('[data-testid="demand-submit"]').trigger('click')
    await flushPromises()

    const submitted = demand.list.find((item) => item.question === '需要港口月度数据')
    expect(submitted).toMatchObject({
      contactName: '张三',
      submitterAccount: '13800002201'
    })
  })

  it('only keeps digits and one hyphen in expected price range', async () => {
    const wrapper = mount(DemandsPanel, { props: { variant: 'mobile' } })
    await wrapper.get('[data-testid="demands-tab-form"]').trigger('click')
    const input = wrapper.get('[data-testid="demand-price-range"]')
    await input.setValue('约0-5000元')
    expect((input.element as HTMLInputElement).value).toBe('0-5000')
  })
})
