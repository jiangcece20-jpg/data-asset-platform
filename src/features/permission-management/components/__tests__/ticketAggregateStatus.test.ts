import {
  aggregateStatusLabels,
  countChildApprovalStatuses,
  deriveMainTicketAggregateStatus,
} from '../ticketAggregateStatus';

describe('deriveMainTicketAggregateStatus', () => {
  it('returns partial_approved_in_progress when approved and pending child orders coexist', () => {
    expect(deriveMainTicketAggregateStatus(['approved', 'pending'])).toBe('partial_approved_in_progress');
  });

  it('keeps mixed approved/rejected/pending work orders in progress until pending finishes', () => {
    expect(deriveMainTicketAggregateStatus(['approved', 'rejected', 'withdrawn', 'pending'])).toBe('partial_approved_in_progress');
  });

  it('returns all_approved when every child order is approved', () => {
    expect(deriveMainTicketAggregateStatus(['approved', 'approved'])).toBe('all_approved');
  });

  it('returns partial_approved_with_rejected_or_withdrawn for final mixed outcomes', () => {
    expect(deriveMainTicketAggregateStatus(['approved', 'rejected', 'withdrawn'])).toBe('partial_approved_with_rejected_or_withdrawn');
  });

  it('returns all_rejected_or_withdrawn when nothing passed and nothing is pending', () => {
    expect(deriveMainTicketAggregateStatus(['rejected', 'withdrawn'])).toBe('all_rejected_or_withdrawn');
  });

  it('returns withdrawn when every child order is withdrawn', () => {
    expect(deriveMainTicketAggregateStatus(['withdrawn', 'withdrawn'])).toBe('withdrawn');
  });

  it('returns unknown for empty child order lists', () => {
    expect(deriveMainTicketAggregateStatus([])).toBe('unknown');
  });

  it('returns withdrawn when main work order withdrawal is explicit', () => {
    expect(deriveMainTicketAggregateStatus(['approved', 'pending'], { mainWithdrawn: true })).toBe('withdrawn');
  });
});

describe('countChildApprovalStatuses', () => {
  it('counts every child status for progress rendering', () => {
    expect(countChildApprovalStatuses(['approved', 'rejected', 'pending', 'withdrawn', 'approved'])).toEqual({
      total: 5,
      approved: 2,
      rejected: 1,
      pending: 1,
      withdrawn: 1,
    });
  });
});

describe('aggregateStatusLabels', () => {
  it('uses the approved product labels', () => {
    expect(aggregateStatusLabels.partial_approved_with_rejected_or_withdrawn).toBe('部分通过，部分拒绝/撤回');
  });
});
