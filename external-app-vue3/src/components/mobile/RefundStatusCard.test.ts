import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RefundStatusCard from './RefundStatusCard.vue'
import type { RefundRecord } from '@/types/afterSales'

function refund(over: Partial<RefundRecord> & { id: string }): RefundRecord {
  return {
    orderId: 'o1', customerId: 'mem-1', reason: 'x', status: 'reviewing', scope: 'full',
    amount: 99, idempotencyKey: 'k1', createdAt: '2026-07-17', updatedAt: '2026-07-17', ...over
  }
}

describe('RefundStatusCard', () => {
  it('renders only the refunds passed in', () => {
    const wrapper = mount(RefundStatusCard, { props: { refunds: [refund({ id: 'r1' })] } })
    expect(wrapper.findAll('[data-testid="refund-card"]')).toHaveLength(1)
  })

  it('does not promise access while reviewing', () => {
    const wrapper = mount(RefundStatusCard, { props: { refunds: [refund({ id: 'r1', status: 'reviewing' })] } })
    expect(wrapper.text()).toContain('冻结')
    expect(wrapper.text()).not.toContain('仍可使用')
  })

  it('states revocation on success', () => {
    const wrapper = mount(RefundStatusCard, { props: { refunds: [refund({ id: 'r1', status: 'succeeded' })] } })
    expect(wrapper.text()).toContain('已撤销')
  })
})
