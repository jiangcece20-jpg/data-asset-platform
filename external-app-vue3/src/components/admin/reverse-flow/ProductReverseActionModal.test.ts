import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductReverseActionModal from './ProductReverseActionModal.vue'
import type { ProductReversePreview } from '@/stores/productReverse'
import type { ProductReverseAction, ReverseReasonCode } from '@/types/reverseFlow'

const FIXED_TIME = new Date('2026-07-17T10:00:00.000Z')

function makePreview(overrides: Partial<ProductReversePreview> = {}): ProductReversePreview {
  return {
    productId: 'prod-test',
    action: 'pause',
    reason: 'commercial_adjustment',
    policy: {
      availability: 'paused',
      service: 'normal',
      entitlement: 'keep',
      severity: 'S3',
      createsWorkOrder: true,
      requiresCustomerNotice: true,
      requiresReview: true,
    },
    impact: {
      id: 'impact-test',
      productId: 'prod-test',
      createdAt: '2026-07-17T10:00:00.000Z',
      customerIds: ['mem-1', 'mem-2'],
      inFlightOrderIds: ['ord-1'],
      activeEntitlementIds: ['ent-1'],
      enterpriseMemberIds: ['em-1'],
      trialIds: ['trial-1'],
      listingRequestIds: ['lr-1'],
      catalogReferenceIds: ['ref-1', 'ref-2'],
      contractIds: ['contract-1'],
      isComplete: true,
    },
    ...overrides,
  }
}

function mountModal(props: Partial<{ open: boolean; productName: string; preview?: ProductReversePreview }> = {}) {
  return mount(ProductReverseActionModal, {
    props: {
      open: true,
      productName: '测试商品',
      ...props,
    },
  })
}

describe('ProductReverseActionModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_TIME)
  })
  afterEach(() => vi.useRealTimers())

  it('exposes pause, delist, and recall actions', () => {
    const wrapper = mountModal()
    const actionButtons = wrapper.findAll('[data-testid="action-btn"]')
    const actions = actionButtons.map((b) => b.attributes('data-value'))
    expect(actions).toEqual(['pause', 'delist', 'recall'])
  })

  it('shows exact reason choices for each action', async () => {
    const wrapper = mountModal()

    // pause = commercial/quality
    wrapper.find('[data-testid="action-btn"][data-value="pause"]').trigger('click')
    await wrapper.vm.$nextTick()
    let reasons = wrapper.findAll('[data-testid="reason-option"]').map((o) => o.attributes('data-value'))
    expect(reasons).toEqual(['commercial_adjustment', 'quality_issue'])

    // delist = commercial/upstream_stop
    wrapper.find('[data-testid="action-btn"][data-value="delist"]').trigger('click')
    await wrapper.vm.$nextTick()
    reasons = wrapper.findAll('[data-testid="reason-option"]').map((o) => o.attributes('data-value'))
    expect(reasons).toEqual(['commercial_adjustment', 'upstream_stop'])

    // recall = quality/compliance
    wrapper.find('[data-testid="action-btn"][data-value="recall"]').trigger('click')
    await wrapper.vm.$nextTick()
    reasons = wrapper.findAll('[data-testid="reason-option"]').map((o) => o.attributes('data-value'))
    expect(reasons).toEqual(['quality_issue', 'compliance_risk'])
  })

  it('confirm is disabled until a preview is returned', () => {
    const wrapper = mountModal()
    const confirmBtn = wrapper.find('[data-testid="confirm-btn"]')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })

  it('changing action or reason invalidates the previous preview', async () => {
    const wrapper = mountModal({ preview: makePreview() })
    // Confirm should be enabled with matching preview
    expect(wrapper.find('[data-testid="confirm-btn"]').attributes('disabled')).toBeUndefined()

    // Change action
    wrapper.find('[data-testid="action-btn"][data-value="delist"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="confirm-btn"]').attributes('disabled')).toBeDefined()
  })

  it('impact output shows all category counts', () => {
    const wrapper = mountModal({ preview: makePreview() })
    const impact = wrapper.find('[data-testid="impact-panel"]')
    expect(impact.text()).toContain('客户')
    expect(impact.text()).toContain('2')
    expect(impact.text()).toContain('在途订单')
    expect(impact.text()).toContain('权益')
    expect(impact.text()).toContain('企业成员')
    expect(impact.text()).toContain('试用')
    expect(impact.text()).toContain('求上架')
    expect(impact.text()).toContain('目录引用')
    expect(impact.text()).toContain('合同')
  })

  it('renders the exact policy outcome', () => {
    const wrapper = mountModal({ preview: makePreview() })
    const policy = wrapper.find('[data-testid="policy-outcome"]')
    expect(policy.text()).toContain('暂停销售') // availability: paused
    expect(policy.text()).toContain('正常') // service: normal
    expect(policy.text()).toContain('保留现有权益') // entitlement: keep
    expect(policy.text()).toContain('S3') // severity
    expect(policy.text()).toContain('需通知客户') // requiresCustomerNotice
  })

  it('confirm emits the displayed preview object', async () => {
    const preview = makePreview()
    const wrapper = mountModal({ preview })
    await wrapper.vm.$nextTick()
    wrapper.find('[data-testid="confirm-btn"]').trigger('click')
    const confirmEvent = wrapper.emitted('confirm')
    expect(confirmEvent).toBeTruthy()
    expect(confirmEvent![0][0]).toMatchObject({
      preview,
      reasonDetail: expect.any(String),
      owner: expect.any(String),
      reviewAt: expect.any(String),
    })
  })

  it('blank owner blocks preview and shows validation message', async () => {
    const wrapper = mountModal()
    // Fill reason detail but leave owner blank
    await wrapper.find('[data-testid="reason-detail-input"]').setValue('Test reason')
    await wrapper.find('[data-testid="review-at-input"]').setValue('2026-07-18T10:00')
    await wrapper.find('[data-testid="preview-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('requestPreview')).toBeFalsy()
    expect(wrapper.find('[data-testid="validation-error"]').text()).toContain('负责人')
  })

  it('review time not later than now blocks preview', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-testid="reason-detail-input"]').setValue('Test reason')
    await wrapper.find('[data-testid="owner-input"]').setValue('operator-a')
    // Set review time in the past
    await wrapper.find('[data-testid="review-at-input"]').setValue('2026-07-16T10:00')
    await wrapper.find('[data-testid="preview-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('requestPreview')).toBeFalsy()
    expect(wrapper.find('[data-testid="validation-error"]').text()).toContain('复核时间')
  })
})
