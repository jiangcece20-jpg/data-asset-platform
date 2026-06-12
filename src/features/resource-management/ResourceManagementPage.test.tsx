import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    expect(screen.getByRole('tab', { name: '全部 8' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '待维护 5' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已上架 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '不上架 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '异常 3' })).toBeInTheDocument();
    expect(screen.getByText('未选择')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索资源名称…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 未归属' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '☐ 仅我负责' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增资源/ })).toBeInTheDocument();
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
    await user.click(screen.getByRole('tab', { name: '待维护 5' }));

    expect(screen.getByText('共 6 条资源')).toBeInTheDocument();
    expect(screen.getByText('撤回上架申请')).toBeInTheDocument();
    const moreButtons = screen.getAllByRole('button', { name: '⋯' });
    expect(moreButtons.length).toBeGreaterThan(0);
  });

  it('switches resource list into exception handling mode', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.click(screen.getByRole('tab', { name: '异常 3' }));

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
    expect(screen.getByText('直接挂载')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📥 批量挂载' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '📦 批量迁移' })).toBeDisabled();
    expect(screen.getByText('挂载资源')).toBeInTheDocument();
    expect(screen.getByText('wlyd_mc_beijing.dwd_ctps_product_browsered_company_shop_device_product_d1')).toBeInTheDocument();
  });

  it('submits catalog structure changes through directory-change approval confirmations', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    await user.click(screen.getByRole('button', { name: '➕ 新增一级' }));
    await user.type(screen.getByPlaceholderText('请输入目录名称'), '测试域');
    await user.click(screen.getByRole('button', { name: '确认' }));

    expect(screen.getByRole('dialog', { name: '确认目录修改审批' })).toBeInTheDocument();
    expect(screen.getByText('新增目录')).toBeInTheDocument();
    expect(screen.getByText(/将发起目录修改审批/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认提交' }));

    expect(screen.queryByRole('treeitem', { name: '测试域' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('catalog-global-approval-notice')).not.toBeInTheDocument();

    const tree = screen.getByRole('tree', { name: '目录结构' });
    const orderNode = within(tree).getByRole('treeitem', { name: '交易域 / 订单' });
    await user.click(within(orderNode).getByText('✎'));

    const editDialog = screen.getByRole('dialog', { name: '编辑目录' });
    const nameInput = within(editDialog).getByPlaceholderText('请输入目录名称');
    await user.clear(nameInput);
    await user.type(nameInput, '订单目录');
    await user.click(within(editDialog).getByRole('button', { name: '确认' }));

    expect(screen.getByRole('dialog', { name: '确认目录修改审批' })).toBeInTheDocument();
    expect(screen.getByText('编辑目录')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    await user.click(within(orderNode).getByText('↓'));
    expect(screen.getByRole('dialog', { name: '确认目录修改审批' })).toBeInTheDocument();
    expect(screen.getByText('调整目录层级/排序')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    const emptyDeleteNode = within(tree).getByRole('treeitem', { name: '交易域 / 订单 / 历史订单' });
    await user.click(within(emptyDeleteNode).getByText('×'));
    expect(screen.getByRole('dialog', { name: '删除目录' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(screen.getByRole('dialog', { name: '确认目录修改审批' })).toBeInTheDocument();
    expect(screen.getByText('删除目录')).toBeInTheDocument();
  });

  it('turns drag-drop catalog movement into a directory-change approval request', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    const tree = screen.getByRole('tree', { name: '目录结构' });
    const source = within(tree).getByRole('treeitem', { name: '交易域 / 订单 / 订单明细' });
    const target = within(tree).getByRole('treeitem', { name: '交易域 / 支付' });

    fireEvent.dragStart(source, { dataTransfer: { effectAllowed: 'move', setData: () => undefined } });
    fireEvent.dragOver(target, { preventDefault: () => undefined });
    fireEvent.drop(target, { preventDefault: () => undefined });

    expect(screen.getByRole('dialog', { name: '确认拖拽目录' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认移动' }));

    expect(screen.getByRole('dialog', { name: '确认目录修改审批' })).toBeInTheDocument();
    expect(screen.getByText('调整目录层级/排序')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认提交' }));

    expect(screen.queryByRole('dialog', { name: '确认目录修改审批' })).not.toBeInTheDocument();
    await user.click(source);
    const detail = screen.getByTestId('catalog-detail-approval-notice');
    expect(within(detail).getByText('目录修改')).toBeInTheDocument();
    expect(within(detail).getByText('待审批')).toBeInTheDocument();
    expect(within(source).getByText('审批中')).toBeInTheDocument();
  });

  it('shows directory approval status inside the selected catalog detail and marks the tree node', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    const tree = screen.getByRole('tree', { name: '目录结构' });
    const userDomainNode = within(tree).getByRole('treeitem', { name: '用户域' });
    const orderHistoryNode = within(tree).getByRole('treeitem', { name: '交易域 / 订单 / 历史订单' });

    fireEvent.dragStart(userDomainNode, { dataTransfer: { effectAllowed: 'move', setData: () => undefined } });
    fireEvent.dragOver(orderHistoryNode, { preventDefault: () => undefined });
    fireEvent.drop(orderHistoryNode, { preventDefault: () => undefined });
    await user.click(screen.getByRole('button', { name: '确认移动' }));
    await user.click(screen.getByRole('button', { name: '确认提交' }));

    expect(screen.queryByTestId('catalog-global-approval-notice')).not.toBeInTheDocument();

    await user.click(userDomainNode);

    const detail = screen.getByTestId('catalog-detail-approval-notice');
    expect(within(detail).getByText('目录修改')).toBeInTheDocument();
    expect(within(detail).getByText(/用户域/)).toBeInTheDocument();
    expect(within(detail).getByText('待审批')).toBeInTheDocument();
    expect(within(userDomainNode).getByText('审批中')).toBeInTheDocument();
  });

  it('opens batch mount and batch migrate from catalog detail and submits directory-change approval', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: '📁 目录管理' }));

    const tree = screen.getByRole('tree', { name: '目录结构' });
    await user.click(within(tree).getByRole('treeitem', { name: '交易域 / 订单 / 订单明细' }));

    await user.click(screen.getByRole('button', { name: '📥 批量挂载' }));
    expect(screen.getByRole('dialog', { name: '批量挂载未归属资源' })).toBeInTheDocument();

    const mountDialog = screen.getByRole('dialog', { name: '批量挂载未归属资源' });
    await user.click(within(mountDialog).getByLabelText('选择 kafka_user_click_raw'));
    await user.click(within(mountDialog).getByRole('button', { name: '提交审批' }));

    expect(screen.getByRole('dialog', { name: '确认提交批量挂载审批' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认提交' }));
    expect(screen.getByText('提交批量挂载审批')).toBeInTheDocument();
    expect(screen.getByText('1条资源')).toBeInTheDocument();

    await user.click(within(tree).getByRole('treeitem', { name: '用户域 / 行为 / 行为日志' }));
    await user.click(screen.getByLabelText('选择 wlyd_mc_beijing.ads_difp_bi_mt_pay_match_pay_trend_chart_success_account_open_rate_df'));
    await user.click(screen.getByRole('button', { name: '📦 批量迁移' }));

    const migrateDialog = screen.getByRole('dialog', { name: '批量迁移资源（提交审批）' });
    expect(migrateDialog).toBeInTheDocument();
    const tradeDomainOptions = within(migrateDialog).getAllByText('交易域');
    await user.click(tradeDomainOptions[tradeDomainOptions.length - 1]);
    await user.click(screen.getByRole('button', { name: '提交审批' }));

    expect(screen.getByRole('dialog', { name: '确认提交目录迁移审批' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提交审批' }));

    const tradeDomainNode = within(tree).getByRole('treeitem', { name: '交易域' });
    await user.click(tradeDomainNode);
    const detail = screen.getByTestId('catalog-detail-approval-notice');
    expect(within(detail).getByText('提交目录迁移审批')).toBeInTheDocument();
    expect(within(detail).getByText('目标目录「交易域」')).toBeInTheDocument();
    expect(within(tradeDomainNode).getByText('审批中')).toBeInTheDocument();
  });

  it('filters by mine-only on non-all tabs', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.click(screen.getByRole('tab', { name: '待维护 5' }));
    await user.click(screen.getByRole('button', { name: '☐ 仅我负责' }));

    expect(screen.getByText('共 5 条资源')).toBeInTheDocument();
  });

  it('opens add-resource dropdown menu', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.click(screen.getByRole('button', { name: /新增资源/ }));

    expect(screen.getByRole('button', { name: '指标' })).toBeInTheDocument();
  });

  it('shows tag action for published and no-list resources inline', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));

    const allTagButtons = screen.getAllByRole('button', { name: '标签' });
    expect(allTagButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('opens action more dropdown and shows hidden actions', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));

    const moreButtons = screen.getAllByRole('button', { name: '⋯' });
    expect(moreButtons.length).toBeGreaterThan(0);

    await user.click(moreButtons[0]);

    const dropdownTagButtons = screen.getAllByRole('button', { name: '标签' });
    expect(dropdownTagButtons.length).toBeGreaterThan(0);
  });

  it('renders SVG resource icons instead of emoji', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));

    const iconSpans = document.querySelectorAll('.resource-management__resource-icon svg');
    expect(iconSpans.length).toBeGreaterThan(0);
  });

  it('opens edit dialog when clicking edit action', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    const editButtons = screen.getAllByRole('button', { name: '编辑' });
    await user.click(editButtons[0]);

    const dialog = screen.getByRole('dialog', { name: '编辑资源' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('摘要描述')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
  });

  it('opens confirm dialog for submit listing action', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    const moreButtons = screen.getAllByRole('button', { name: '⋯' });
    await user.click(moreButtons[0]);

    const submitButtons = screen.getAllByRole('button', { name: '提交上架' });
    await user.click(submitButtons[0]);

    expect(screen.getByRole('dialog', { name: '确认提交上架' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
  });

  it('withdraws listing application directly with toast', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    await user.click(screen.getByRole('tab', { name: '待维护 5' }));

    const withdrawButtons = screen.getAllByRole('button', { name: '撤回上架申请' });
    await user.click(withdrawButtons[0]);

    // Status should change - resource moves out of reviewing
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '撤回上架申请' })).not.toBeInTheDocument();
    });
  });

  it('opens tag edit dialog', async () => {
    const user = userEvent.setup();
    render(<ResourceManagementPage />);

    await user.click(screen.getByRole('button', { name: /资源列表/ }));
    const tagButtons = screen.getAllByRole('button', { name: '标签' });
    await user.click(tagButtons[0]);

    expect(screen.getByRole('dialog', { name: '编辑标签' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入新标签')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));
  });
});
