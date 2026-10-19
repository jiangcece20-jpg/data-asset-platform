import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AiConversationHistory from './AiConversationHistory.vue'

const conversation = {
  id: 'conversation-1', ownerMemberId: 'mem-1', title: '货运价格趋势如何',
  createdAt: '2026-10-09T09:00:00.000Z', updatedAt: '2026-10-09T09:01:00.000Z',
  messages: [], followUps: []
}

describe('AI conversation history drawer', () => {
  it('offers new and resume actions without a clear-history action', async () => {
    const wrapper = mount(AiConversationHistory, {
      props: { open: true, conversations: [conversation], activeId: 'conversation-1', busy: false }
    })
    expect(wrapper.text()).toContain('历史对话')
    expect(wrapper.text()).toContain('货运价格趋势如何')
    expect(wrapper.text()).not.toContain('清空')
    await wrapper.get('[data-testid="ai-history-new"]').trigger('click')
    expect(wrapper.emitted('new')).toHaveLength(1)
    await wrapper.get('[data-testid="ai-history-conversation-1"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['conversation-1'])
  })
})
