import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useResponsiveNow } from './useResponsiveNow'

describe('useResponsiveNow', () => {
  afterEach(() => vi.useRealTimers())

  it('updates on its cadence and clears its timer when unmounted', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-27T10:14:59.000Z'))
    const Probe = defineComponent({
      setup: () => {
        const now = useResponsiveNow()
        return () => h('span', now.value.toISOString())
      },
    })

    const wrapper = mount(Probe)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(wrapper.text()).toBe('2026-07-27T10:15:29.000Z')

    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
