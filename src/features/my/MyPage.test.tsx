import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { approvalScenarioSummaries } from '../approval-integration/approvalData';
import { MyPage } from './MyPage';

const ticketTypes = ['权限申请', '上架审批', '下架审批', '目录修改', '目录编辑审批', '负责人交接', '血缘修正'];

const statusLabels = [
  ['pending', '审批中'],
  ['approved', '已通过'],
  ['rejected', '已拒绝'],
  ['withdrawn', '已撤回'],
] as const;

describe('MyPage approval entries', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps personal asset sections and opens the new application cart from hash', () => {
    window.location.hash = 'my?section=cart';
    render(<MyPage />);

    expect(screen.getByRole('button', { name: /我收藏的/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /我申请的/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /我有权限的/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /我负责的/ })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: '我的导航' })).getByRole('button', { name: /申请单/ })).toBeInTheDocument();

    expect(screen.getByText('权限申请单')).toBeInTheDocument();
    expect(screen.getByText(/系统根据资产属性自动拆分为以下审批流/)).toBeInTheDocument();
    expect(screen.getAllByText(/匹配路由/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '提交申请' })).toBeInTheDocument();
  });

  it('shows asset-view application progress in My applications', async () => {
    const user = userEvent.setup();
    render(<MyPage />);

    await user.click(screen.getByRole('button', { name: /我申请的/ }));

    expect(screen.getAllByText('我申请的').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/按资产查看我发起的权限申请过程/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '资产名称' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '工单' })).toBeInTheDocument();
    expect(screen.getAllByText('dwd_trade_order').length).toBeGreaterThan(0);

    const row = screen.getByRole('row', { name: /PA-20260609-001-01/ });
    await user.click(within(row).getByRole('button', { name: '查看详情' }));

    expect(screen.getByText(/权限申请详情/)).toBeInTheDocument();
    expect(screen.getByText(/子单审批进度/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看工单视图' })).toHaveAttribute('href', '#my?section=submitted');
  });

  it('shows all approval ticket types and multiple application statuses', async () => {
    const user = userEvent.setup();
    render(<MyPage />);

    await user.click(screen.getByRole('button', { name: /我申请的/ }));

    for (const ticketType of ticketTypes) {
      const summary = approvalScenarioSummaries.find(item => item.ticketType === ticketType);
      expect(summary).toBeDefined();

      await user.selectOptions(screen.getByLabelText('工单类型筛选'), ticketType);

      const row = screen.getByRole('row', { name: new RegExp(summary!.ticketId) });
      expect(within(row).getAllByText(summary!.assetName).length).toBeGreaterThan(0);
      expect(within(row).getByText(summary!.reason)).toBeInTheDocument();
    }

    await user.selectOptions(screen.getByLabelText('工单类型筛选'), 'all');

    for (const [status, label] of statusLabels) {
      const summary = approvalScenarioSummaries.find(item => item.status === status);
      expect(summary).toBeDefined();

      await user.click(screen.getByRole('button', { name: label }));

      const row = screen.getByRole('row', { name: new RegExp(summary!.ticketId) });
      expect(within(row).getAllByText(summary!.assetName).length).toBeGreaterThan(0);
      expect(within(row).getByText(label)).toBeInTheDocument();
    }
  });

  it('prefills the cart with a known asset and reason when arriving via reapply hash', () => {
    window.location.hash = 'my?section=cart&assetName=dwd_trade_order&reason=月度复盘需要';
    render(<MyPage />);

    expect(screen.getByText(/已预填「交易订单宽表」到申请单/)).toBeInTheDocument();
    const reasonBox = screen.getByPlaceholderText(/请填写申请理由/) as HTMLTextAreaElement;
    expect(reasonBox.value).toBe('月度复盘需要');
  });

  it('shows a fallback notice when the reapply asset is not in the cart catalog', () => {
    window.location.hash = 'my?section=cart&assetName=unknown_asset_xyz';
    render(<MyPage />);

    expect(screen.getByText(/暂未配置资产「unknown_asset_xyz」/)).toBeInTheDocument();
  });
});
