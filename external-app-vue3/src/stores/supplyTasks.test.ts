import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSupplyTaskStore } from './supplyTasks'
import { useDemandStore } from './demand'
import type { DemandLead } from '@/types/domain'

function seedDemand(over: Partial<DemandLead> & { id: string; ownerId: string }): DemandLead {
  return {
    question: '港口吞吐量数据',
    filters: [],
    browsedProductIds: [],
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    updateFreq: '每月',
    scenario: '产能评估',
    expectedDelivery: '2026-09',
    status: 'new',
    recommendedProductIds: [],
    feedbackMessage: '',
    createdAt: '2026-07-17 09:00',
    source: 'search_miss',
    subscribed: true,
    ...over
  }
}

describe('supplyTasks store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const demand = useDemandStore()
    demand.list = [
      seedDemand({ id: 'd1', ownerId: 'mem-1' }),
      seedDemand({ id: 'd2', ownerId: 'mem-2' }),
      seedDemand({ id: 'd3', ownerId: 'mem-3' })
    ]
    return { demand, store: useSupplyTaskStore() }
  }

  it('aggregates demands into one task and links each demand', () => {
    const { demand, store } = setup()
    const task = store.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', '港口吞吐量月报')
    expect(task.demandIds).toEqual(['d1', 'd2'])
    expect(demand.byId('d1')?.supplyTaskId).toBe(task.id)
    expect(demand.byId('d1')?.status).toBe('aggregated')
    expect(store.timelineFor(task.id).filter((e) => e.type === 'demand_linked')).toHaveLength(2)
  })

  it('refuses to merge a demand already on another open task', () => {
    const { store } = setup()
    store.aggregateDemands(['d1'], 'initiate_product', 'op-1', 'A')
    expect(() => store.aggregateDemands(['d1'], 'initiate_product', 'op-1', 'B')).toThrow('需求已归入其他供给任务')
  })

  it('splits a task and keeps at least one demand on each side', () => {
    const { demand, store } = setup()
    const task = store.aggregateDemands(['d1', 'd2', 'd3'], 'initiate_product', 'op-1', 'A')
    const split = store.splitSupplyTask(task.id, ['d3'], 'op-1', 'B')
    expect(store.byId(task.id)?.demandIds).toEqual(['d1', 'd2'])
    expect(split.demandIds).toEqual(['d3'])
    expect(demand.byId('d3')?.supplyTaskId).toBe(split.id)
    expect(() => store.splitSupplyTask(split.id, ['d3'], 'op-1', 'C')).toThrow('至少保留两个需求')
  })

  it('publishes and generates one callback per subscribed demand', () => {
    const { store } = setup()
    const task = store.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', 'A')
    store.advanceStatus(task.id, 'in_production', 'op-1')
    store.publish(task.id, 'prod-new-001', 'op-1')
    expect(store.byId(task.id)?.status).toBe('published')
    expect(store.callbacksFor(task.id)).toHaveLength(2)
    expect(store.callbacksFor(task.id).every((c) => c.status === 'pending')).toBe(true)
  })

  it('does not generate a callback for a withdrawn demand', () => {
    const { store } = setup()
    const task = store.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', 'A')
    store.withdrawDemand('d2', 'op-1')
    store.advanceStatus(task.id, 'in_production', 'op-1')
    store.publish(task.id, 'prod-new-001', 'op-1')
    expect(store.callbacksFor(task.id)).toHaveLength(1)
    expect(store.callbacksFor(task.id)[0].customerId).toBe('mem-1')
  })

  it('callback delivery fails at most 3 retries then needs manual confirm', () => {
    const { store } = setup()
    const task = store.aggregateDemands(['d1'], 'initiate_product', 'op-1', 'A')
    store.advanceStatus(task.id, 'planned', 'op-1')
    store.publish(task.id, 'prod-new-001', 'op-1')
    const cb = store.callbacksFor(task.id)[0]
    for (let i = 0; i < 4; i++) store.markCallbackFailed(cb.id, 'op-1')
    expect(() => store.markCallbackFailed(cb.id, 'op-1')).toThrow('已达上限')
    store.markCallbackManualConfirmed(cb.id, 'op-1', '电话已联系')
    expect(store.callbacksFor(task.id)[0].status).toBe('manual_confirmed')
  })

  it('records outcome without rewriting the demand', () => {
    const { demand, store } = setup()
    const task = store.aggregateDemands(['d1'], 'initiate_product', 'op-1', 'A')
    store.advanceStatus(task.id, 'planned', 'op-1')
    store.publish(task.id, 'prod-new-001', 'op-1')
    const cb = store.callbacksFor(task.id)[0]
    store.markCallbackDelivered(cb.id, 'op-1')
    store.recordOutcome(cb.id, 'purchased', 'op-1')
    expect(store.callbacksFor(task.id)[0].outcome).toBe('purchased')
    expect(demand.byId('d1')?.status).toBe('aggregated')
  })

  it('withdrawing one demand on a shared task keeps the task and siblings', () => {
    const { demand, store } = setup()
    const task = store.aggregateDemands(['d1', 'd2'], 'initiate_product', 'op-1', 'A')
    const decision = store.withdrawDemand('d1', 'op-1')
    expect(decision).toBe('close_subscription_only')
    expect(store.byId(task.id)?.status).toBe('evaluating')
    expect(demand.byId('d1')?.status).toBe('withdrawn')
    expect(demand.byId('d2')?.status).toBe('aggregated')
  })

  it('withdrawing the sole demand releases the task', () => {
    const { store } = setup()
    const task = store.aggregateDemands(['d1'], 'initiate_product', 'op-1', 'A')
    const decision = store.withdrawDemand('d1', 'op-1')
    expect(decision).toBe('close_and_release')
    expect(store.byId(task.id)?.status).toBe('cancelled')
  })

  it('reopens a terminal demand as a new demand preserving the prior conclusion', () => {
    const { demand, store } = setup()
    demand.updateStatus('d1', 'not_supported', '暂无供给')
    const reopened = store.reopenDemand('d1', 'op-1')
    expect(reopened?.reopenedFromId).toBe('d1')
    expect(reopened?.priorConclusion).toBe('暂无供给')
    expect(reopened?.status).toBe('reopened')
    expect(demand.byId('d1')?.status).toBe('not_supported')
  })
})
