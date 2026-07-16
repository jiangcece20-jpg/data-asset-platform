import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContentGate from './ContentGate.vue'

describe('ContentGate', () => {
  it('shows visible content', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'visible', unlocked: false }, slots: { default: '完整内容' } })
    expect(wrapper.text()).toContain('完整内容')
  })

  it('masks restricted content without leaking slot text', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'masked', unlocked: false }, slots: { default: '关键数字 108.6' } })
    expect(wrapper.text()).not.toContain('108.6')
    expect(wrapper.text()).toContain('解锁后查看')
  })

  it('reveals masked content after entitlement', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'masked', unlocked: true }, slots: { default: '关键数字 108.6' } })
    expect(wrapper.text()).toContain('108.6')
  })

  it('never renders locked slot content before entitlement', () => {
    const wrapper = mount(ContentGate, { props: { mode: 'locked', unlocked: false }, slots: { default: '隐藏正文' } })
    expect(wrapper.text()).not.toContain('隐藏正文')
  })
})
