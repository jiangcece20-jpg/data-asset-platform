import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceManagementPage } from './ResourceManagementPage';

describe('ResourceManagementPage', () => {
  it('renders management workbench by default', () => {
    render(<ResourceManagementPage />);

    expect(screen.getByRole('navigation', { name: '资源管理导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▦ 工作台' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '▣ 资源列表' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📁 目录管理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument();
    expect(screen.getByText('我负责的资源')).toBeInTheDocument();
    expect(screen.getAllByText('待处理事项').length).toBeGreaterThan(0);
    expect(screen.getByText('本周变更')).toBeInTheDocument();
    expect(screen.getByText('资源健康度')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今日操作记录' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '我的申请（进行中）' })).toBeInTheDocument();
  });

  it('shows resource list panel with status tabs and toolbar', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '▣ 资源列表' }));

    expect(screen.getByRole('heading', { name: '资源列表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /待维护/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已上架' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '不上架' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /异常/ })).toBeInTheDocument();
    expect(screen.getByText('未选择')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索资源名称…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 未归属' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 仅我负责' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 新增资源' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📝 操作记录' })).toBeInTheDocument();
    expect(screen.getByText('共 8 条资源')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '资源名称' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '订单明细表 dwd_trade_order' })).toBeInTheDocument();
  });

  it('filters managed resources by search keyword and status', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '▣ 资源列表' }));
    await user.type(screen.getByPlaceholderText('搜索资源名称…'), '库存');

    expect(screen.getByText('共 2 条资源')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '商品库存看板 dashboard_inventory_overview' })).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('搜索资源名称…'));
    await user.click(screen.getByRole('tab', { name: /待维护/ }));

    expect(screen.getByText('共 3 条资源')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '行业资讯原始表 wlyd_industry_news_info_di' })).toBeInTheDocument();
  });

  it('shows catalog management panel', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    expect(screen.getByRole('heading', { name: '目录管理' })).toBeInTheDocument();
    expect(screen.getByText('目录结构')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '➕ 新增一级' })).toBeInTheDocument();
    expect(screen.getByText('交易域')).toBeInTheDocument();
    expect(screen.getByText('请在左侧选择目录节点')).toBeInTheDocument();

    const tree = screen.getByRole('tree', { name: '目录结构' });
    await user.click(within(tree).getByRole('treeitem', { name: '供应链' }));

    expect(screen.getByRole('heading', { name: '供应链' })).toBeInTheDocument();
    expect(screen.getByText('当前目录资源 2 个')).toBeInTheDocument();
  });
});
