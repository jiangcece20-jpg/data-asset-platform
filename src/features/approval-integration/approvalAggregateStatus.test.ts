import { describe, expect, it } from 'vitest';
import {
  batchEffectAggregateStatusLabels,
  deriveBatchEffectAggregateStatus,
} from './approvalAggregateStatus';

const effectInstances = (...statuses: string[]) => statuses.map(effectStatus => ({ effectStatus }));

describe('deriveBatchEffectAggregateStatus', () => {
  it('returns all_effective when every child is effective', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effective'))).toBe('all_effective');
  });

  it('returns not_effective when every child is not effective', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('not_effective', 'not_effective'))).toBe('not_effective');
  });

  it('returns effecting when children are only effecting', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effecting', 'effecting'))).toBe('effecting');
  });

  it('returns partial_effective_effecting when effective and effecting children coexist', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting'))).toBe('partial_effective_effecting');
  });

  it('prioritizes effecting over failed or not effective children', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effecting', 'effect_failed', 'not_effective'))).toBe('effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'effect_failed'))).toBe('partial_effective_effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'not_effective'))).toBe('partial_effective_effecting');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effecting', 'effect_failed', 'not_effective'))).toBe('partial_effective_effecting');
  });

  it('returns partial_effective_with_failed_or_not_effective when effective children coexist with failed or not effective children', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'effect_failed'))).toBe('partial_effective_with_failed_or_not_effective');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effective', 'not_effective'))).toBe('partial_effective_with_failed_or_not_effective');
  });

  it('returns all_failed_or_not_effective when no child is effective or effecting and at least one failed or not effective child exists', () => {
    expect(deriveBatchEffectAggregateStatus(effectInstances('effect_failed', 'effect_failed'))).toBe('all_failed_or_not_effective');
    expect(deriveBatchEffectAggregateStatus(effectInstances('effect_failed', 'not_effective'))).toBe('all_failed_or_not_effective');
  });

  it('returns unknown for empty input or unrecognized effect statuses', () => {
    expect(deriveBatchEffectAggregateStatus([])).toBe('unknown');
    expect(deriveBatchEffectAggregateStatus(effectInstances('paused', 'cancelled'))).toBe('unknown');
  });
});

describe('batchEffectAggregateStatusLabels', () => {
  it('keeps product copy for every effect aggregate status', () => {
    expect(batchEffectAggregateStatusLabels).toEqual({
      not_effective: '未生效',
      effecting: '生效中',
      partial_effective_effecting: '部分生效，生效中',
      all_effective: '全部生效',
      partial_effective_with_failed_or_not_effective: '部分生效，部分失败/未生效',
      all_failed_or_not_effective: '全部失败/未生效',
      unknown: '未知',
    });
  });
});
