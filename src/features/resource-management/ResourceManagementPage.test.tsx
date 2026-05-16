import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceManagementPage } from './ResourceManagementPage';

describe('ResourceManagementPage', () => {
  it('renders management workbench by default', () => {
    render(<ResourceManagementPage />);

    expect(screen.getByRole('navigation', { name: '资源管理导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /工作台/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /资源列表/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📁 目录管理' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '工作台' })).toBeInTheDocument();
    expect(screen.getByText('我负责的资源')).toBeInTheDocument();
    expect(screen.getAllByText('待处理事项').length).toBeGreaterThan(0);
    expect(screen.getByText('本周变更')).toBeInTheDocument();
    expect(screen.getByText('资源健康度')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '数据识别类（2）' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '数据管理类（6）' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '数据退役类（2）' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '负责人异常类（2）' })).toBeInTheDocument();
    expect(screen.getByText('数据无分类分级')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '联系管理员' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '今日操作记录' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '我的申请（进行中）' })).toBeInTheDocument();
  });

  it('shows resource list panel with status tabs, toolbar and batch actions', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));

    expect(screen.getByRole('heading', { name: '资源列表' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '待维护 6' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已上架' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '不上架' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '异常 4' })).toBeInTheDocument();
    expect(screen.getByText('未选择')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索资源名称…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 未归属' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 仅我负责' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '＋ 新增资源' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📝 操作记录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量提交上架' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '批量修改目录' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '批量交接' })).toBeDisabled();
    expect(screen.getByText('共 11 条资源')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '资源名称' })).toBeInTheDocument();
    expect(screen.getByText('wlyd_industry_beijing.')).toBeInTheDocument();
    expect(screen.getByText('ods_wlyd_industry_news_industrial_info_di')).toBeInTheDocument();

    await user.click(screen.getByLabelText('选择 kafka_user_click_raw'));

    expect(screen.getByText('已选 1 条')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量提交上架' })).toBeEnabled();
  });

  it('filters managed resources by search keyword and status', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.type(screen.getByPlaceholderText('搜索资源名称…'), '库存');

    expect(screen.getByText('共 1 条资源')).toBeInTheDocument();
    expect(screen.getByText('api_inventory_check')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('搜索资源名称…'));
    await user.click(screen.getByRole('tab', { name: '待维护 6' }));

    expect(screen.getByText('共 6 条资源')).toBeInTheDocument();
    expect(screen.getByText('撤回上架申请')).toBeInTheDocument();
    expect(screen.getAllByText('提交上架').length).toBeGreaterThan(0);
  });

  it('switches resource list into exception handling mode', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.click(screen.getByRole('tab', { name: '异常 4' }));

    expect(screen.getByRole('columnheader', { name: '异常类型' })).toBeInTheDocument();
    expect(screen.getAllByText('信息缺失').length).toBeGreaterThan(0);
    expect(screen.getAllByText('资源失效').length).toBeGreaterThan(0);
    expect(screen.getByText('无主资源')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '设置负责人' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '忽略' }).length).toBeGreaterThan(0);
  });

  it('shows catalog management panel', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    expect(screen.getByRole('heading', { name: '目录管理' })).toBeInTheDocument();
    expect(screen.getByText('目录结构')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '➕ 新增一级' })).toBeInTheDocument();
    expect(screen.getByText('交易域')).toBeInTheDocument();
    expect(screen.getByText('订单明细')).toBeInTheDocument();
    expect(screen.getByText('请在左侧选择目录节点')).toBeInTheDocument();

    const tree = screen.getByRole('tree', { name: '目录结构' });
    await user.click(within(tree).getByRole('treeitem', { name: '交易域 / 订单 / 订单明细' }));

    expect(screen.getByText('交易域 / 订单 / 订单明细')).toBeInTheDocument();
    expect(screen.getByText('目录层级')).toBeInTheDocument();
    expect(screen.getByText('3 级')).toBeInTheDocument();
    expect(screen.getByText('挂载资源数')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📥 批量挂载' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📦 批量迁移' })).toBeDisabled();
    expect(screen.getByText('挂载资源列表')).toBeInTheDocument();
    expect(screen.getByText('wlyd_mc_beijing.dwd_ctps_product_browsered_company_shop_device_product_d1')).toBeInTheDocument();
  });
});
