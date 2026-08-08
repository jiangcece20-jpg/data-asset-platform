import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaceholderPanel from './PlaceholderPanel.vue'

describe('PlaceholderPanel', () => {
  it('renders unified ownership copy', () => {
    const wrapper = mount(PlaceholderPanel, { props: { title: 'VIP' } })
    expect(wrapper.find('[data-testid="mine-placeholder"]').text()).toContain('该模块由其它产品负责')
    expect(wrapper.text()).toContain('VIP')
  })
})
