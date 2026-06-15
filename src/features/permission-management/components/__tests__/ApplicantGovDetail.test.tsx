import { render, screen } from '@testing-library/react';
import { ApplicantGovDetail } from '../ApplicantGovDetail';
import type { Ticket } from '../../PermissionManagementPage';

const baseTicket: Ticket = {
  id: 'GA-2026032900035',
  type: '目录修改',
  category: 'gov',
  feishuDefinition: '资源治理审批',
  approvalCode: 'APPROVAL_RESOURCE_GOV',
  instanceCode: 'FS-GOV-0035',
  feishuUrl: '',
  syncText: '轮询补偿完成',
  syncMode: 'polling',
  assetName: 'dwd_click_stream',
  assetDisplay: '点击流日志表',
  assetType: '数据表',
  applyTime: '2026-03-29 11:30',
  status: 'rejected',
  applicant: '张三',
};

const timeline = [
  { label: '张三 提交目录修改', time: '2026-03-29 11:30', status: 'done' as const },
  { label: '张三（数据管理员）', time: '等待审批中...', status: 'waiting' as const },
];

describe('ApplicantGovDetail', () => {
  it('renders title with type and id, plus 8 info fields', () => {
    render(
      <ApplicantGovDetail
        ticket={baseTicket}
        actions={[<button key="w" type="button">撤回申请</button>]}
        timeline={timeline}
      />
    );
    expect(screen.getByText(/目录修改详情 — GA-2026032900035/)).toBeInTheDocument();
    expect(screen.getByText('GA-2026032900035')).toBeInTheDocument();
    expect(screen.getAllByText('张三（数据管理员）')).toHaveLength(2);
  });

  it('renders the asset object card and timeline', () => {
    render(
      <ApplicantGovDetail
        ticket={baseTicket}
        actions={[<button key="w" type="button">撤回申请</button>]}
        timeline={timeline}
      />
    );
    expect(screen.getByText('dwd_click_stream')).toBeInTheDocument();
    expect(screen.getByText('点击流日志表')).toBeInTheDocument();
    expect(screen.getByText('数据表')).toBeInTheDocument();
    expect(screen.getByText('张三 提交目录修改')).toBeInTheDocument();
  });

  it('renders the diff field when diff prop is provided', () => {
    render(
      <ApplicantGovDetail
        ticket={baseTicket}
        actions={[<button key="w" type="button">撤回申请</button>]}
        timeline={timeline}
        diff={{ label: '当前目录', before: '用户域/行为/行为日志', after: '用户域/行为/点击流' }}
      />
    );
    expect(screen.getByText('当前目录')).toBeInTheDocument();
    expect(screen.getByText('用户域/行为/行为日志')).toBeInTheDocument();
    expect(screen.getByText('用户域/行为/点击流')).toBeInTheDocument();
  });

  it('does not render the diff card when diff prop is omitted', () => {
    render(
      <ApplicantGovDetail
        ticket={baseTicket}
        actions={[<button key="w" type="button">撤回申请</button>]}
        timeline={timeline}
      />
    );
    expect(screen.queryByText('当前目录')).not.toBeInTheDocument();
  });

  it('applies redTitle class when prop is true', () => {
    render(
      <ApplicantGovDetail
        ticket={baseTicket}
        actions={[<button key="w" type="button">撤回</button>]}
        timeline={timeline}
        redTitle
      />
    );
    const title = screen.getByText(/目录修改详情 — GA-2026032900035/);
    expect(title.className).toContain('permission-management__detail-title--red');
  });
});
