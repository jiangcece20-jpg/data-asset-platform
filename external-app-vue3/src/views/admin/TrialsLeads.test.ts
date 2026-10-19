import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDemandStore } from '@/stores/demand'
import { useCollectionDispatchStore } from '@/stores/collectionDispatch'
import TrialsLeads from './TrialsLeads.vue'

async function finishCustomSubmission() {
  await new Promise((resolve) => setTimeout(resolve, 470))
  await flushPromises()
}

describe('TrialsLeads', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.restoreAllMocks())

  it('keeps demand leads and omits trial approval and listing requests', () => {
    const wrapper = mount(TrialsLeads)

    expect(wrapper.text()).toContain('需求线索')
    expect(wrapper.text()).toContain('企业名称')
    expect(wrapper.text()).toContain('万联供应链管理有限公司')
    expect(wrapper.text()).toContain('需求描述')
    expect(wrapper.text()).toContain('期望价格区间')
    expect(wrapper.text()).toContain('联系方式')
    expect(wrapper.text()).toContain('联系人')
    expect(wrapper.text()).toContain('陈静')
    expect(wrapper.text()).toContain('提交人账号')
    expect(wrapper.text()).toContain('13800002201')
    expect(wrapper.text()).toContain('13900007710')
    expect(wrapper.text()).not.toContain('138****2201')
    expect(wrapper.text()).not.toContain('139****7710')
    expect(wrapper.text()).toContain('用户ID')
    expect(wrapper.text()).toContain('mem-1')
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

  it('keeps a failed creation unprocessed with its inputs and lets the operator process it again', async () => {
    const wrapper = mount(TrialsLeads)
    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('failure')
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.findAll('button').find((button) => button.text() === '处理')!.trigger('click')
    const modal = wrapper.get('[data-testid="process-dialog"]')
    await modal.findAll('textarea')[0]!.setValue('已沟通，准备定制')
    await modal.findAll('textarea')[1]!.setValue('核实预算后提交')
    await modal.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    expect(modal.text()).toContain('处理中…')
    expect(modal.findAll('button').find((button) => button.text() === '处理中…')!.attributes('disabled')).toBeDefined()
    await finishCustomSubmission()
    const lead = useDemandStore().byId('demand-seed-1')!
    expect(lead.status).toBe('new')
    expect(lead.processedAt).toBeUndefined()
    expect(lead.internalNote).toBeUndefined()
    expect(wrapper.get('[data-testid="process-dialog"]').isVisible()).toBe(true)
    expect(wrapper.get('[role="alert"]').text()).toContain('采数据')
    expect(wrapper.text()).not.toContain('下发失败')
    expect(wrapper.text()).not.toContain('全部异常')
    await modal.findAll('button').find((button) => button.text() === '取消')!.trigger('click')
    await row.findAll('button').find((button) => button.text() === '处理')!.trigger('click')
    const reopened = wrapper.get('[data-testid="process-dialog"]')
    expect((reopened.findAll('textarea')[0]!.element as HTMLTextAreaElement).value).toBe('已沟通，准备定制')
    expect((reopened.findAll('textarea')[1]!.element as HTMLTextAreaElement).value).toBe('核实预算后提交')
    expect(reopened.get('[role="alert"]').text()).toContain('采数据')
    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('success')
    await reopened.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    await finishCustomSubmission()
    expect(lead).toMatchObject({ status: 'custom_required', feedbackMessage: '已沟通，准备定制', internalNote: '核实预算后提交', processedBy: '平台运营' })
    expect(lead.processedAt).toBeTruthy()
    expect(wrapper.find('[data-testid="process-dialog"]').exists()).toBe(false)
    expect(row.text()).toContain('委托状态：未承接')
    expect(wrapper.find('[data-testid="retry-dispatch"]').exists()).toBe(false)
    expect(useCollectionDispatchStore().commissions).toHaveLength(1)
  })

  it('reconciles an ambiguous receipt within the same loading submission', async () => {
    const wrapper = mount(TrialsLeads)
    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('unknown')
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.findAll('button').find((button) => button.text() === '处理')!.trigger('click')
    const modal = wrapper.get('[data-testid="process-dialog"]')
    await modal.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    expect(modal.text()).toContain('处理中…')
    expect(useDemandStore().byId('demand-seed-1')!.status).toBe('new')
    await finishCustomSubmission()
    const lead = useDemandStore().byId('demand-seed-1')!
    const dispatch = useCollectionDispatchStore()
    const originalId = dispatch.commissions[0]!.id
    expect(lead.status).toBe('custom_required')
    expect(dispatch.commissions).toEqual([{ leadId: lead.id, id: originalId, status: '未承接' }])
    expect(wrapper.find('[data-testid="process-dialog"]').exists()).toBe(false)
  })

  it.each(['推荐现有商品', '暂不支持'])('preserves an unresolved creation and blocks changing it to %s', async (decision) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(TrialsLeads)
    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('unresolved')
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.findAll('button').find((button) => button.text() === '处理')!.trigger('click')
    const modal = wrapper.get('[data-testid="process-dialog"]')
    await modal.findAll('textarea')[0]!.setValue('原委托的用户反馈')
    await modal.findAll('textarea')[1]!.setValue('等待核对原委托')
    await modal.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    await finishCustomSubmission()
    const lead = useDemandStore().byId('demand-seed-1')!
    const dispatch = useCollectionDispatchStore()

    await modal.findAll('button').find((button) => button.text() === decision)!.trigger('click')

    expect(lead.status).toBe('new')
    expect(lead.processedAt).toBeUndefined()
    expect(wrapper.get('[data-testid="process-dialog"]').isVisible()).toBe(true)
    expect(modal.get('[role="alert"]').text()).toContain('需要定制')
    expect(modal.get('[role="alert"]').text()).toContain('结果尚未确认')
    expect((modal.findAll('textarea')[0]!.element as HTMLTextAreaElement).value).toBe('原委托的用户反馈')
    expect((modal.findAll('textarea')[1]!.element as HTMLTextAreaElement).value).toBe('等待核对原委托')
    expect(dispatch.byLead(lead.id)).toMatchObject({ status: 'unknown', attempts: 1 })
    expect(dispatch.commissions).toHaveLength(0)

    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('success')
    await modal.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    await finishCustomSubmission()
    expect(lead).toMatchObject({ status: 'custom_required', feedbackMessage: '原委托的用户反馈', internalNote: '等待核对原委托' })
    expect(dispatch.commissions).toHaveLength(1)
    expect(wrapper.find('[data-testid="process-dialog"]').exists()).toBe(false)
  })

  it.each([
    { decision: '推荐现有商品', status: 'recommended' },
    { decision: '暂不支持', status: 'not_supported' }
  ])('allows $decision after a confirmed failure with no commission', async ({ decision, status }) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(TrialsLeads)
    await wrapper.get('[data-testid="dispatch-outcome"]').setValue('failure')
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.findAll('button').find((button) => button.text() === '处理')!.trigger('click')
    const modal = wrapper.get('[data-testid="process-dialog"]')
    await modal.findAll('button').find((button) => button.text() === '需要定制')!.trigger('click')
    await finishCustomSubmission()
    await modal.findAll('button').find((button) => button.text() === decision)!.trigger('click')

    expect(useDemandStore().byId('demand-seed-1')!.status).toBe(status)
    expect(useDemandStore().byId('demand-seed-1')!.processedAt).toBeTruthy()
    expect(useCollectionDispatchStore().commissions).toHaveLength(0)
    expect(wrapper.find('[data-testid="process-dialog"]').exists()).toBe(false)
  })

  it.each([undefined, '', ' \t '])('uses 未处理 for an unavailable commission status (%s) in the list, details and filter', async (status) => {
    const wrapper = mount(TrialsLeads)
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.get('[data-testid="lead-action-custom_required"]').trigger('click')
    await finishCustomSubmission()
    const dispatch = useCollectionDispatchStore()
    const lead = useDemandStore().byId('demand-seed-1')!
    const processedAt = lead.processedAt
    dispatch.commissions[0]!.status = status
    await flushPromises()

    expect(row.text()).toContain('委托状态：未处理')
    expect(lead.status).toBe('custom_required')
    expect(lead.processedAt).toBe(processedAt)
    expect(dispatch.byLead(lead.id)!.status).toBe('sent')
    expect(row.findAll('button').find((button) => button.text() === '处理')).toBeUndefined()
    await row.findAll('button').find((button) => button.text() === '查看')!.trigger('click')
    expect(wrapper.get('[data-testid="dispatch-detail"]').text()).toContain('委托状态未处理')
    expect(wrapper.get('[data-testid="dispatch-filter"]').findAll('option').map((option) => option.text())).toContain('未处理')
    await wrapper.get('[data-testid="dispatch-filter"]').setValue('未处理')
    expect(wrapper.find('[data-testid="lead-demand-seed-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lead-demand-seed-2"]').exists()).toBe(false)

    dispatch.commissions[0]!.status = '采数据当前实际状态'
    await flushPromises()
    expect(wrapper.find('[data-testid="lead-demand-seed-1"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dispatch-detail"]').text()).toContain('委托状态采数据当前实际状态')
  })

  it('shows and filters the current status reported by the commission receiver', async () => {
    const wrapper = mount(TrialsLeads)
    const row = wrapper.get('[data-testid="lead-demand-seed-1"]')
    await row.get('[data-testid="lead-action-custom_required"]').trigger('click')
    await finishCustomSubmission()
    const dispatch = useCollectionDispatchStore()
    dispatch.commissions[0]!.status = '采数据返回的处理中状态'
    await flushPromises()
    expect(row.text()).toContain('委托状态：采数据返回的处理中状态')
    expect(wrapper.text()).not.toContain('已下发')
    await row.findAll('button').find((button) => button.text() === '查看')!.trigger('click')
    expect(wrapper.get('[data-testid="dispatch-detail"]').text()).toContain('委托状态采数据返回的处理中状态')
    await wrapper.get('[data-testid="dispatch-filter"]').setValue('采数据返回的处理中状态')
    expect(wrapper.find('[data-testid="lead-demand-seed-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lead-demand-seed-2"]').exists()).toBe(false)
    dispatch.commissions[0]!.status = '采数据返回的另一状态'
    await flushPromises()
    expect(wrapper.find('[data-testid="lead-demand-seed-1"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="dispatch-detail"]').text()).toContain('采数据返回的另一状态')
  })
})
