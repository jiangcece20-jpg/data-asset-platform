import { describe, expect, it } from 'vitest'
import {
  groupSimilarDemands,
  canMergeDemand,
  canSplitSupplyTask,
  resolveReopen,
  resolveWithdrawal
} from './demandNormalization'
import type { DemandLike } from '@/types/demandFlow'

function demand(
  over: Partial<DemandLike> & { id: string; feedbackMessage?: string }
): DemandLike & { feedbackMessage?: string } {
  return {
    objectDesc: '港口吞吐量',
    region: '长三角',
    timeRange: '近12个月',
    status: 'new',
    ...over
  }
}

describe('groupSimilarDemands', () => {
  it('buckets demands sharing object + region + time range', () => {
    const groups = groupSimilarDemands([
      demand({ id: 'd1' }),
      demand({ id: 'd2', objectDesc: '  港口吞吐量 ' }),
      demand({ id: 'd3', objectDesc: '航运运价' })
    ])
    const big = groups.find((g) => g.demandIds.length === 2)
    expect(big?.demandIds.sort()).toEqual(['d1', 'd2'])
    expect(groups.some((g) => g.demandIds.length === 1 && g.demandIds[0] === 'd3')).toBe(true)
  })
})

describe('canMergeDemand', () => {
  it('rejects a demand already linked to another task', () => {
    expect(canMergeDemand(demand({ id: 'd1', supplyTaskId: 'st-other' }), 'st-1')).toBe(false)
  })
  it('allows a demand linked to the same target task', () => {
    expect(canMergeDemand(demand({ id: 'd1', supplyTaskId: 'st-1' }), 'st-1')).toBe(true)
  })
  it('rejects a withdrawn or closed demand', () => {
    expect(canMergeDemand(demand({ id: 'd1', status: 'withdrawn' }), 'st-1')).toBe(false)
    expect(canMergeDemand(demand({ id: 'd2', status: 'closed' }), 'st-1')).toBe(false)
  })
})

describe('canSplitSupplyTask', () => {
  it('requires at least two demands and a valid subset', () => {
    expect(canSplitSupplyTask(['d1', 'd2', 'd3'], ['d1'])).toBe(true)
    expect(canSplitSupplyTask(['d1'], ['d1'])).toBe(false)
    expect(canSplitSupplyTask(['d1', 'd2'], ['d3'])).toBe(false)
  })
})

describe('resolveReopen', () => {
  it('preserves the prior conclusion for a terminal demand', () => {
    expect(
      resolveReopen(demand({ id: 'd1', status: 'not_supported', feedbackMessage: '暂无供给' }))
    ).toEqual({ sourceDemandId: 'd1', priorConclusion: '暂无供给' })
  })
  it('throws for a non-terminal demand', () => {
    expect(() => resolveReopen(demand({ id: 'd1', status: 'new' }))).toThrow('仅终态需求可重开')
  })
})

describe('resolveWithdrawal', () => {
  it('closes subscription only when siblings remain on a shared task', () => {
    expect(resolveWithdrawal(demand({ id: 'd1', supplyTaskId: 'st-1' }), 2)).toBe('close_subscription_only')
  })
  it('releases the task when it is the sole demand', () => {
    expect(resolveWithdrawal(demand({ id: 'd1', supplyTaskId: 'st-1' }), 0)).toBe('close_and_release')
  })
  it('releases when the demand has no task', () => {
    expect(resolveWithdrawal(demand({ id: 'd1' }), 0)).toBe('close_and_release')
  })
})
