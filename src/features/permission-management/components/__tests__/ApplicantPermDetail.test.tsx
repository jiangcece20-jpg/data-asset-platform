import { render, screen } from '@testing-library/react';
import { ApplicantPermDetail } from '../ApplicantPermDetail';
import type { Ticket } from '../../PermissionManagementPage';

const baseTicket: Ticket = {
  id: 'PA-2026032500008',
  type: '权限申请',
  category: 'perm',
  feishuDefinition: '权限申请审批',
  approvalCode: 'APPROVAL_PERMISSION',
  batchId: 'BATCH-20260603-003',
  instanceCode: 'FS-PERM-0003',
  feishuUrl: '',
  syncText: '轮询补偿完成',
  syncMode: 'polling',
  assetName: 'api_logistics_track',
  assetDisplay: '物流追踪接口',
  assetType: 'API',
  applyTime: '2026-03-25 16:40',
  status: 'rejected',
  applicant: '张三',
  reason: '用于物流系统集成',
};

const subOrders = [
  { assetName: 'api_logistics_track', assetDisplay: '物流追踪接口', status: 'rejected' as const, rejectReason: 'S3 等级超出申请范围', timeline: [] },
  { assetName: 'api_logistics_callback', assetDisplay: '物流回调', status: 'pending' as const, timeline: [] },
];

describe('ApplicantPermDetail', () => {
  it('renders title with id, six info fields, and applicant reason', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={subOrders}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText(/权限申请详情 — PA-2026032500008/)).toBeInTheDocument();
    expect(screen.getByText('PA-2026032500008')).toBeInTheDocument();
    expect(screen.getByText('权限申请')).toBeInTheDocument();
    expect(screen.getByText('BATCH-20260603-003 / FS-PERM-0003')).toBeInTheDocument();
    expect(screen.getByText('2026-03-25 16:40')).toBeInTheDocument();
    expect(screen.getByText('审批中')).toBeInTheDocument();
    expect(screen.getByText('用于物流系统集成')).toBeInTheDocument();
  });

  it('renders partial approved in-progress aggregate status', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={[
          { assetName: 'a', status: 'approved' as const, timeline: [] },
          { assetName: 'b', status: 'pending' as const, timeline: [] },
          { assetName: 'c', status: 'rejected' as const, timeline: [] },
        ]}
        actions={[]}
      />
    );
    expect(screen.getByText('部分通过，审批中')).toBeInTheDocument();
  });

  it('renders final partial approved rejected-or-withdrawn aggregate status', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={[
          { assetName: 'a', status: 'approved' as const, timeline: [] },
          { assetName: 'b', status: 'withdrawn' as const, timeline: [] },
        ]}
        actions={[]}
      />
    );
    expect(screen.getByText('部分通过，部分拒绝/撤回')).toBeInTheDocument();
  });

  it('renders the progress bar and legend based on subOrders counts including withdrawn', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={[
          ...subOrders,
          { assetName: 'api_logistics_cancelled', assetDisplay: '物流取消接口', status: 'withdrawn' as const, timeline: [] },
        ]}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText(/已通过 0/)).toBeInTheDocument();
    expect(screen.getByText(/已驳回 1/)).toBeInTheDocument();
    expect(screen.getByText(/审批中 1/)).toBeInTheDocument();
    expect(screen.getByText(/已撤回 1/)).toBeInTheDocument();
  });

  it('renders N sub-order cards under "审批流明细"', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={subOrders}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText(/审批流明细（2 个子单）/)).toBeInTheDocument();
    expect(screen.getByText('api_logistics_track')).toBeInTheDocument();
    expect(screen.getByText('api_logistics_callback')).toBeInTheDocument();
    expect(screen.getByText('S3 等级超出申请范围')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={subOrders}
        actions={[<button key="w" type="button">撤回所有未完成审批</button>]}
      />
    );
    expect(screen.getByRole('button', { name: '撤回所有未完成审批' })).toBeInTheDocument();
  });

  it('uses the red title color when redTitle prop is true', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={subOrders}
        actions={[<button key="w" type="button">撤回</button>]}
        redTitle
      />
    );
    const title = screen.getByText(/权限申请详情 — PA-2026032500008/);
    expect(title.className).toContain('permission-management__detail-title--red');
  });

  it('does not crash on empty subOrders', () => {
    render(
      <ApplicantPermDetail
        ticket={baseTicket}
        subOrders={[]}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.getByText('未知')).toBeInTheDocument();
    expect(screen.getByText(/审批流明细（0 个子单）/)).toBeInTheDocument();
  });

  it('hides the reason block when ticket.reason is undefined', () => {
    const { reason: _omit, ...noReason } = baseTicket;
    render(
      <ApplicantPermDetail
        ticket={noReason}
        subOrders={subOrders}
        actions={[<button key="w" type="button">撤回</button>]}
      />
    );
    expect(screen.queryByText('用于物流系统集成')).not.toBeInTheDocument();
  });
});
