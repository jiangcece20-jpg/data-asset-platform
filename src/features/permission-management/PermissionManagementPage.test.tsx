import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermissionManagementPage } from './PermissionManagementPage';

describe('PermissionManagementPage', () => {
  it('renders ticket query workspace by default', () => {
    render(<PermissionManagementPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('审批中心');
    expect(screen.getByRole('navigation', { name: '审批中心导航' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /工单查询/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /待我审批 3/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审批管理/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审批记录/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '工单查询' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '审批中' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '工单分类' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '申请类型' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索资产名称…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索申请人…')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '编号' })).toBeInTheDocument();
    expect(screen.getByText('PA-2026033100001')).toBeInTheDocument();
    expect(screen.getByText('dwd_trade_order')).toBeInTheDocument();
    expect(screen.getByText('GA-2026033100042')).toBeInTheDocument();
  });

  it('shows Feishu approval mapping and sync fields in ticket query', () => {
    render(<PermissionManagementPage />);

    expect(screen.getByRole('columnheader', { name: '飞书定义' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '批次/实例' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '同步' })).toBeInTheDocument();
    expect(screen.getAllByText('资源治理审批')).toHaveLength(3);
    expect(screen.getAllByText('权限申请审批')).toHaveLength(4);
    expect(screen.getByText('BATCH-20260603-001')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '飞书审批单' })[0]).toHaveAttribute('href', expect.stringContaining('applink.feishu.cn'));
    expect(screen.getAllByText('事件同步正常').length).toBeGreaterThan(0);
  });

  it('filters ticket query by status, category and keyword', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('tab', { name: '审批中' }));
    expect(screen.getByText('PA-2026033100001')).toBeInTheDocument();
    expect(screen.getByText('GA-2026033100042')).toBeInTheDocument();
    expect(screen.queryByText('PA-2026032800012')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '工单分类' }), 'gov');
    expect(screen.getByText('GA-2026033100042')).toBeInTheDocument();
    expect(screen.queryByText('PA-2026033100001')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('搜索资产名称…'));
    await user.type(screen.getByPlaceholderText('搜索资产名称…'), 'behavior');
    expect(screen.getByText('dwd_user_behavior')).toBeInTheDocument();
    expect(screen.queryByText('dwd_order_legacy')).not.toBeInTheDocument();
  });

  it('shows pending approvals with status-based tabs', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /待我审批 3/ }));

    expect(screen.getByRole('heading', { name: '待我审批' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /全部 6/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '待审批' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已通过' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已拒绝' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '已过期' })).toBeInTheDocument();
    expect(screen.getByText('PA-2026040100003-S2')).toBeInTheDocument();
    expect(screen.getByText('dwd_trade_payment', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('GA-2026040100044')).toBeInTheDocument();
    expect(screen.getByText('GA-2026040100045')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '查看详情' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '通过' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '确认接收' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '待审批' }));
    expect(screen.getByText('PA-2026040100003-S2')).toBeInTheDocument();
    expect(screen.getByText('GA-2026040100044')).toBeInTheDocument();
    expect(screen.getByText('GA-2026040100045')).toBeInTheDocument();
    expect(screen.queryByText('GA-2026040100046')).not.toBeInTheDocument();
  });

  it('shows the redesigned approval management workspace with five configuration tabs', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批管理/ }));

    expect(screen.getByRole('heading', { name: '审批管理' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '工单类型' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '飞书流程库' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '审批路由' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '审批人规则' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '同步监控' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '审批模板' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '审批角色' })).not.toBeInTheDocument();
    expect(screen.getByText('业务审批工单注册表')).toBeInTheDocument();
    expect(screen.getByText('WORK_ORDER_PUBLISH')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '飞书流程库' }));

    expect(screen.getByText('可被审批路由选择的飞书 approval_code')).toBeInTheDocument();
    expect(screen.getByText('资源治理审批')).toBeInTheDocument();
    expect(screen.getByText('权限申请审批')).toBeInTheDocument();
    expect(screen.getByText('负责人交接审批')).toBeInTheDocument();
    expect(screen.getByText('血缘修正审批')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '表单控件映射' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '流程节点同步' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '字段映射' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同步表单控件' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '同步流程节点' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '手动维护节点' })).toBeInTheDocument();
    expect(screen.getByText('APPROVAL_PERMISSION')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '审批路由' }));

    expect(screen.getByRole('button', { name: '+ 新建路由规则' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '条件摘要' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '飞书流程' })).toBeInTheDocument();
    expect(screen.getByText('资源治理：上架/下架/目录修改')).toBeInTheDocument();
    expect(screen.getByText('权限申请：S5 高敏授权')).toBeInTheDocument();
    expect(screen.getByText('按审批人分组')).toBeInTheDocument();
    expect(screen.getByText(/按优先级从小到大命中第一条/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '审批人规则' }));

    expect(screen.getByText('资源技术负责人')).toBeInTheDocument();
    expect(screen.getByText('从资产 technicalOwner 字段解析')).toBeInTheDocument();
    expect(screen.getByText('金融业务线审批人')).toBeInTheDocument();
    expect(screen.getAllByText('员工接口').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: '同步监控' }));

    expect(screen.getByText('事件订阅正常')).toBeInTheDocument();
    expect(screen.getByText('待同步实例')).toBeInTheDocument();
    expect(screen.getByText('审批人异常')).toBeInTheDocument();
    expect(screen.getByText('平台与飞书状态冲突')).toBeInTheDocument();
  });

  it('creates and toggles a work order type in approval management', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批管理/ }));
    await user.click(screen.getByRole('button', { name: '+ 新建工单类型' }));

    expect(screen.getByRole('heading', { name: '新建工单类型' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await user.type(screen.getByLabelText('工单类型名称'), '数据质量整改');
    await user.type(screen.getByLabelText('工单类型编码'), 'WORK_ORDER_DATA_QUALITY');
    await user.selectOptions(screen.getByLabelText('业务分类'), '治理');
    await user.type(screen.getByLabelText('适用场景说明'), '数据质量问题整改闭环');

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.queryByRole('heading', { name: '新建工单类型' })).not.toBeInTheDocument();
    expect(screen.getByText('数据质量整改')).toBeInTheDocument();
    expect(screen.getByText('WORK_ORDER_DATA_QUALITY')).toBeInTheDocument();

    const row = screen.getByRole('row', { name: /WORK_ORDER_DATA_QUALITY/ });
    await user.click(within(row).getByRole('button', { name: '停用' }));
    expect(within(row).getByText('停用')).toBeInTheDocument();
  });

  it('creates a Feishu flow and prevents duplicate approval codes', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批管理/ }));
    await user.click(screen.getByRole('tab', { name: '飞书流程库' }));
    await user.click(screen.getByRole('button', { name: '+ 绑定飞书流程' }));

    await user.type(screen.getByLabelText('飞书流程名称'), '数据质量整改审批');
    await user.type(screen.getByLabelText('approval_code'), 'APPROVAL_RESOURCE_GOV');
    expect(screen.getByText('approval_code 已存在')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await user.clear(screen.getByLabelText('approval_code'));
    await user.type(screen.getByLabelText('approval_code'), 'APPROVAL_DATA_QUALITY');
    await user.type(screen.getByLabelText('流程说明'), '承载数据质量整改工单');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('数据质量整改审批')).toBeInTheDocument();
    expect(screen.getByText('APPROVAL_DATA_QUALITY')).toBeInTheDocument();
  });

  it('creates an approval route rule through the structured drawer', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批管理/ }));
    await user.click(screen.getByRole('tab', { name: '审批路由' }));
    await user.click(screen.getByRole('button', { name: '+ 新建路由规则' }));

    expect(screen.getByRole('heading', { name: '新建审批路由' })).toBeInTheDocument();
    expect(screen.getByText('基础信息')).toBeInTheDocument();
    expect(screen.getByText('命中条件')).toBeInTheDocument();
    expect(screen.getByText('路由结果')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await user.type(screen.getByLabelText('规则名称'), '权限申请：金融 S5');
    await user.selectOptions(screen.getByLabelText('工单类型'), '权限申请');
    await user.clear(screen.getByLabelText('优先级'));
    await user.type(screen.getByLabelText('优先级'), '8');
    await user.selectOptions(screen.getByLabelText('对象类型'), ['表', 'API']);
    await user.selectOptions(screen.getByLabelText('安全等级'), ['S5']);
    await user.type(screen.getByLabelText('业务域'), '金融');
    await user.selectOptions(screen.getByLabelText('飞书流程'), 'APPROVAL_PERMISSION');
    await user.selectOptions(screen.getByLabelText('审批人规则'), '治理负责人');
    await user.selectOptions(screen.getByLabelText('拆分方式'), '按审批人分组');

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.queryByRole('heading', { name: '新建审批路由' })).not.toBeInTheDocument();
    expect(screen.getByText('权限申请：金融 S5')).toBeInTheDocument();
    expect(screen.getByText(/安全等级 in S5/)).toBeInTheDocument();
  });

  it('creates an approver rule with fallback strategy and shows sync monitor feedback', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批管理/ }));
    await user.click(screen.getByRole('tab', { name: '审批人规则' }));
    await user.click(screen.getByRole('button', { name: '+ 新建审批人规则' }));

    expect(screen.getByRole('heading', { name: '新建审批人规则' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();

    await user.type(screen.getByLabelText('规则名称'), '质量负责人');
    await user.selectOptions(screen.getByLabelText('解析方式'), '指定角色');
    await user.selectOptions(screen.getByLabelText('审批方式'), '或签');
    await user.click(screen.getByLabelText('启用兜底'));
    await user.selectOptions(screen.getByLabelText('兜底类型'), '指定角色');
    await user.type(screen.getByLabelText('兜底对象'), '数据管理员');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('质量负责人')).toBeInTheDocument();
    expect(screen.getAllByText('数据管理员').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: '同步监控' }));
    await user.click(screen.getByRole('button', { name: '批量补偿同步' }));
    expect(screen.getByText('已触发批量补偿同步')).toBeInTheDocument();
  });

  it('shows approval records', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);

    await user.click(screen.getByRole('button', { name: /审批记录/ }));

    expect(screen.getByRole('heading', { name: '审批记录' })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: '审批记录列表' });
    expect(within(table).getByRole('columnheader', { name: '审批编号' })).toBeInTheDocument();
    expect(screen.getByText('PA-2026033100001-S1')).toBeInTheDocument();
    expect(screen.getByText('rpt_finance_monthly + weekly')).toBeInTheDocument();
    expect(screen.getByText('GA-2026033000038')).toBeInTheDocument();
  });
});
