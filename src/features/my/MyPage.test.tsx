import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyPage } from './MyPage';

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

    const row = screen.getByRole('row', { name: /PA-2026040100003/ });
    await user.click(within(row).getByRole('button', { name: '查看详情' }));

    expect(screen.getByText(/权限申请详情/)).toBeInTheDocument();
    expect(screen.getByText(/子单审批进度/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看工单视图' })).toHaveAttribute('href', '#my?section=submitted');
  });
});
