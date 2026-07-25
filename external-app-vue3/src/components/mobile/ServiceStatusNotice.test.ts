import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ServiceStatusNotice from './ServiceStatusNotice.vue'
import type { AvailabilityStatus } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'

describe('ServiceStatusNotice', () => {
  function mountNotice(props: Partial<{ availability: AvailabilityStatus; serviceStatus: ServiceStatus; hasAccess: boolean }> = {}) {
    return mount(ServiceStatusNotice, {
      props: {
        availability: 'published',
        serviceStatus: 'normal',
        hasAccess: false,
        ...props,
      },
    })
  }

  it('renders nothing when service is normal and availability is published', () => {
    const wrapper = mountNotice({ availability: 'published', serviceStatus: 'normal' })
    expect(wrapper.text()).toBe('')
  })

  it('shows terminated message with highest priority even when paused', () => {
    const wrapper = mountNotice({ availability: 'paused', serviceStatus: 'terminated', hasAccess: true })
    expect(wrapper.text()).toContain('已停止服务')
    expect(wrapper.text()).not.toContain('暂停新购')
  })

  it('shows suspended message with higher priority than paused', () => {
    const wrapper = mountNotice({ availability: 'paused', serviceStatus: 'suspended', hasAccess: true })
    expect(wrapper.text()).toContain('风险处置')
    expect(wrapper.text()).not.toContain('暂停新购')
  })

  it('shows degraded message when service is degraded', () => {
    const wrapper = mountNotice({ availability: 'paused', serviceStatus: 'degraded', hasAccess: true })
    expect(wrapper.text()).toContain('服务降级')
    expect(wrapper.text()).toContain('补偿')
  })

  it('shows paused-owned message when paused, normal service, and has access', () => {
    const wrapper = mountNotice({ availability: 'paused', serviceStatus: 'normal', hasAccess: true })
    expect(wrapper.text()).toContain('暂停新购')
    expect(wrapper.text()).toContain('有效权益不受影响')
  })

  it('shows paused-unowned message when paused, normal service, and no access', () => {
    const wrapper = mountNotice({ availability: 'paused', serviceStatus: 'normal', hasAccess: false })
    expect(wrapper.text()).toContain('暂停新购')
    expect(wrapper.text()).not.toContain('有效权益')
  })

  it('shows delisted message when delisted with normal service', () => {
    const wrapper = mountNotice({ availability: 'delisted', serviceStatus: 'normal', hasAccess: false })
    expect(wrapper.text()).toContain('已下架')
  })
})
