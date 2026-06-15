import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ApprovalIntegrationPage } from '../approval-integration/ApprovalIntegrationPage';
import { MyPage } from '../my/MyPage';
import { resetLineageApprovalStore, submitLineageApproval } from './lineageApprovalStore';

describe('lineage approval cross page projections', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    resetLineageApprovalStore();
  });

  it('shows submitted lineage approvals in My applications', () => {
    const approval = submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '补齐订单链路',
      changes: [],
    });
    window.location.hash = 'my?section=applies';

    render(<MyPage />);

    expect(screen.getByText(approval.approvalNo)).toBeInTheDocument();
    expect(screen.getByText('订单明细宽表')).toBeInTheDocument();
    expect(screen.getAllByText('血缘修正').length).toBeGreaterThan(0);
  });

  it('shows lineage approvals in the approval pending queue', () => {
    const approval = submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '补齐订单链路',
      changes: [],
    });
    window.location.hash = 'approval?section=pending';

    render(<ApprovalIntegrationPage />);

    expect(screen.getByText(approval.approvalNo)).toBeInTheDocument();
    expect(screen.getByText('订单明细宽表')).toBeInTheDocument();
    expect(screen.getAllByText('血缘修正').length).toBeGreaterThan(0);
  });
});
