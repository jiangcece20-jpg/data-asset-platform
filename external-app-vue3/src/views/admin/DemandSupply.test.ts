import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import DemandSupplyList from './DemandSupplyList.vue'
import DemandSupplyDetail from './DemandSupplyDetail.vue'
import ApprovalIntegration from './ApprovalIntegration.vue'
import { useDemandStore } from '@/stores/demand'
import { useSupplyTaskStore } from '@/stores/supplyTasks'
import type { DemandLead } from '@/types/domain'

function seedDemand(over: Partial<DemandLead> & { id: string; ownerId: string }): DemandLead {
  return {
    question: '港口吞吐量数据', filters: [], browsedProductIds: [],
    objectDesc: '港口吞吐量', region: '长三角', timeRange: '近12个月',
    updateFreq: '每月', scenario: '产能评估', expectedDelivery: '2026-09',
    status: 'new', recommendedProductIds: [], feedbackMessage: '', createdAt: '2026-07-17 09:00',
    source: 'search_miss', subscribed: true, ...over
  }
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/approval/demand-supply', name: 'admin-demand-supply', component: DemandSupplyList },
      { path: '/admin/approval/demand-supply/:id', name: 'admin-demand-supply-detail', component: DemandSupplyDetail }
    ]
  })
}

describe('DemandSupply admin pages', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('registers list and detail routes', () => {
    const router = makeRouter()
    expect(router.hasRoute('admin-demand-supply')).toBe(true)
    expect(router.hasRoute('admin-demand-supply-detail')).toBe(true)
  })

  it('groups similar demands and aggregates them into a supply task', async () => {
    const demand = useDemandStore()
    demand.list = [
      seedDemand({ id: 'd1', ownerId: 'mem-1' }),
      seedDemand({ id: 'd2', ownerId: 'mem-2' })
    ]
    const router = makeRouter()
    router.push('/admin/approval/demand-supply')
    await router.isReady()
    const wrapper = mount(DemandSupplyList, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="demand-group"]').exists()).toBe(true)
    await wrapper.find('[data-testid="aggregate-btn"]').trigger('click')
    await flushPromises()
    const supply = useSupplyTaskStore()
    expect(supply.tasks).toHaveLength(1)
    expect(supply.tasks[0].demandIds.sort()).toEqual(['d1', 'd2'])
  })

  it('publishes a task and generates callbacks in the detail page', async () => {
    const demand = useDemandStore()
    demand.list = [seedDemand({ id: 'd1', ownerId: 'mem-1' }), seedDemand({ id: 'd2', ownerId: 'mem-2' })]
    const supply = useSupplyTaskStore()
    const task = supply.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', '港口吞吐量')
    const router = makeRouter()
    router.push(`/admin/approval/demand-supply/${task.id}`)
    await router.isReady()
    const wrapper = mount(DemandSupplyDetail, { global: { plugins: [router] } })
    await wrapper.find('[data-testid="btn-plan"]').trigger('click')
    await wrapper.find('[data-testid="btn-produce"]').trigger('click')
    await wrapper.find('[data-testid="btn-publish"]').trigger('click')
    await flushPromises()
    expect(supply.callbacksFor(task.id)).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="callback-row"]')).toHaveLength(2)
  })

  it('withdrawing one demand keeps the shared task and siblings', async () => {
    const demand = useDemandStore()
    demand.list = [seedDemand({ id: 'd1', ownerId: 'mem-1' }), seedDemand({ id: 'd2', ownerId: 'mem-2' })]
    const supply = useSupplyTaskStore()
    const task = supply.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', 'A')
    const router = makeRouter()
    router.push(`/admin/approval/demand-supply/${task.id}`)
    await router.isReady()
    const wrapper = mount(DemandSupplyDetail, { global: { plugins: [router] } })
    await wrapper.find('[data-testid="btn-withdraw"]').trigger('click')
    await flushPromises()
    expect(supply.byId(task.id)?.status).toBe('evaluating')
    expect(demand.byId('d1')?.status).toBe('withdrawn')
    expect(demand.byId('d2')?.status).toBe('aggregated')
  })

  it('ApprovalIntegration links to demand-supply with counts', async () => {
    const demand = useDemandStore()
    demand.list = [seedDemand({ id: 'd1', ownerId: 'mem-1' })]
    const router = makeRouter()
    router.addRoute({ path: '/admin/approval', name: 'admin-approval', component: ApprovalIntegration })
    router.push('/admin/approval')
    await router.isReady()
    const wrapper = mount(ApprovalIntegration, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="demand-supply-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="demand-supply-link"]').exists()).toBe(true)
  })
})
