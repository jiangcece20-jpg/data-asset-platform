import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalIntegrationPage, matchesCatalogConditionValue } from './ApprovalIntegrationPage';
import { PendingPanel } from './components/PendingPanel';
import type { PendingTask } from './approvalData';
import { resetLineageApprovalStore, submitLineageApproval } from '../lineage/lineageApprovalStore';

describe('ApprovalIntegrationPage flows prototype alignment', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.location.hash = 'permissions?section=flows';
    resetLineageApprovalStore();
  });

  it('opens flow detail from flow name and supports detail tabs', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    expect(screen.getByRole('heading', { name: '飞书流程库' })).toBeInTheDocument();
    expect(screen.queryByText('当前用户：刘数据（数据分析部）')).not.toBeInTheDocument();
    expect(screen.queryByText('配置完整率')).not.toBeInTheDocument();
    expect(screen.queryByText('待治理项')).not.toBeInTheDocument();
    expect(screen.queryByText('路由命中顺序')).not.toBeInTheDocument();
    expect(screen.queryByText('匹配逻辑')).not.toBeInTheDocument();
    expect(screen.getAllByText('优先级').length).toBeGreaterThan(0);
    expect(screen.getAllByText('路由规则名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('责任人').length).toBeGreaterThan(0);
    expect(screen.queryByText('责任团队')).not.toBeInTheDocument();
    expect(screen.getAllByText('P1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('高安全等级专项审批').length).toBeGreaterThan(0);
    expect(screen.getAllByText('P2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('跨部门申请审批').length).toBeGreaterThan(0);
    expect(screen.getAllByText('P3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('交易域数仓授权').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/标准权限申请（兜底）/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /目录修改/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /负责人交接/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /血缘修正/ }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '权限申请_统一版' }));

    expect(window.location.hash).toContain('section=flow-detail');
    expect(screen.getByText('返回流程库')).toBeInTheDocument();
    expect(screen.getAllByText('7C468A54-PER-2024').length).toBeGreaterThan(0);
    expect(screen.getAllByText('最近校验').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-06-09 14:32:00').length).toBeGreaterThan(0);
    expect(screen.getByText('路由命中链')).toBeInTheDocument();
    expect(screen.getByText(/标准权限申请（兜底）/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /配置详情/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /映射表/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /节点表/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /路由规则/ })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /映射表/ }));
    expect(screen.getByRole('button', { name: '新增映射' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览 JSON' })).toBeInTheDocument();
  });

  it('creates a flow and enters its detail page', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    expect(screen.getByRole('button', { name: '新增流程' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新增流程' }));
    await user.type(screen.getByPlaceholderText('如：权限申请_高安全等级版'), '权限申请_临时测试版');
    await user.type(screen.getByPlaceholderText('飞书审批定义 Code'), '7C468A54-TEMP-2026');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(window.location.hash).toContain('section=flow-detail');
    expect(screen.getAllByText('权限申请_临时测试版').length).toBeGreaterThan(0);
    expect(screen.getAllByText('7C468A54-TEMP-2026').length).toBeGreaterThan(0);
  });

  it('manages approval roles with drawer member editing', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: '审批角色管理' }));
    await user.click(screen.getByRole('button', { name: '新增角色' }));
    await user.type(screen.getByPlaceholderText('如：安全管理员'), '测试审批人');
    await user.type(screen.getByPlaceholderText('如：security_admin'), 'test_approver');
    expect(screen.queryByPlaceholderText('open_id')).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('输入姓名搜索成员'), '测试');
    await user.click(screen.getByRole('option', { name: /测试同学 test@example.com/ }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('测试审批人')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('adds form mappings and route rules in flow detail', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(screen.getByRole('button', { name: '权限申请_统一版' }));
    await user.click(screen.getByRole('tab', { name: /映射表/ }));
    await user.click(screen.getByRole('button', { name: '新增映射' }));
    await user.type(screen.getByPlaceholderText('如：安全等级'), '业务用途');
    await user.type(screen.getByPlaceholderText('如：security_level'), 'business_reason');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('业务用途')).toBeInTheDocument();
    expect(screen.getByText('business_reason')).toBeInTheDocument();

    await user.click(screen.getByText('返回流程库'));
    await user.click(screen.getByRole('button', { name: '新增流程' }));
    await user.type(screen.getByPlaceholderText('如：权限申请_高安全等级版'), '权限申请_空路由测试版');
    await user.type(screen.getByPlaceholderText('飞书审批定义 Code'), '7C468A54-ROUTE-2026');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('tab', { name: /路由规则/ }));
    await user.click(screen.getByRole('button', { name: '新增路由规则' }));
    await user.type(screen.getByLabelText('规则名称'), '测试路由规则');
    await user.click(screen.getByRole('button', { name: '添加条件' }));
    await user.click(screen.getByLabelText('S3'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('测试路由规则')).toBeInTheDocument();
    expect(screen.getByText(/安全等级 属于 S3/)).toBeInTheDocument();
  });

  it('supports catalog and source condition editors', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(screen.getByRole('button', { name: '新增流程' }));
    await user.type(screen.getByPlaceholderText('如：权限申请_高安全等级版'), '权限申请_目录路由测试版');
    await user.type(screen.getByPlaceholderText('飞书审批定义 Code'), '7C468A54-CATALOG-2026');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('tab', { name: /路由规则/ }));
    await user.click(screen.getByRole('button', { name: '新增路由规则' }));
    await user.type(screen.getByLabelText('规则名称'), '目录来源组合路由');
    await user.click(screen.getByRole('button', { name: '添加条件' }));
    await user.selectOptions(screen.getByLabelText('条件字段'), 'catalog_path');
    const catalogPicker = screen.getByLabelText('目录多选');
    await user.click(within(catalogPicker).getByLabelText('交易域'));
    expect(within(catalogPicker).getByLabelText('交易域')).toBeChecked();
    expect(within(catalogPicker).getByLabelText('交易域/订单')).toBeChecked();
    expect(within(catalogPicker).getByLabelText('交易域/支付')).toBeChecked();
    expect(within(catalogPicker).getByLabelText('交易域/API')).toBeChecked();
    expect(within(catalogPicker).getAllByText('随父目录命中').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '添加条件' }));
    await user.selectOptions(screen.getAllByLabelText('条件字段')[1], 'source_system');
    await user.click(screen.getByLabelText('MaxCompute'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('目录来源组合路由')).toBeInTheDocument();
    expect(screen.getByText(/^目录 属于 交易域（含子目录）$/)).toBeInTheDocument();
    expect(screen.getByText(/来源系统 属于 MaxCompute/)).toBeInTheDocument();
  });

  it('limits each flow to one route rule', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(screen.getByRole('button', { name: '权限申请_统一版' }));
    await user.click(screen.getByRole('tab', { name: /路由规则/ }));

    expect(screen.queryByRole('button', { name: '新增路由规则' })).not.toBeInTheDocument();
    expect(screen.getByText('当前流程已配置路由规则，如需调整请编辑现有规则。')).toBeInTheDocument();
  });

  it('requires validation before enabling a flow', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(screen.getByRole('button', { name: '新增流程' }));
    await user.type(screen.getByPlaceholderText('如：权限申请_高安全等级版'), '权限申请_待校验测试版');
    await user.type(screen.getByPlaceholderText('飞书审批定义 Code'), '7C468A54-NOT-VALIDATED');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await user.click(screen.getByText('返回流程库'));
    const row = screen.getByRole('row', { name: /权限申请_待校验测试版/ });
    await user.click(within(row).getByRole('button', { name: '启用' }));

    expect(screen.getByRole('status')).toHaveTextContent('启用前必须先校验通过');
    expect(within(row).getByText('已停用')).toBeInTheDocument();
  });

  it('requires a fixed approval role when node mapping uses fixed role', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(screen.getByRole('button', { name: '权限申请_统一版' }));
    await user.click(screen.getByRole('tab', { name: /节点表/ }));
    expect(screen.getByText('节点类型')).toBeInTheDocument();
    expect(screen.queryByText('审批方式')).not.toBeInTheDocument();
    expect(screen.queryByText('缺失处理')).not.toBeInTheDocument();
    expect(screen.getAllByText('动态节点').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '新增节点映射' }));
    await user.type(screen.getByLabelText('飞书节点名称'), '固定角色测试节点');
    await user.type(screen.getByLabelText('飞书节点 ID'), 'fixed_role_test_node');
    await user.selectOptions(screen.getByLabelText('节点类型'), 'fixed');
    await user.selectOptions(screen.getByLabelText('审批人规则'), 'fixed_role');
    expect(screen.queryByLabelText('审批方式')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('缺失处理')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByRole('status')).toHaveTextContent('选择固定角色时必须指定审批角色');
    await user.selectOptions(screen.getByLabelText('固定审批角色'), 'security_admin');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('固定角色测试节点')).toBeInTheDocument();
    expect(screen.getByText('固定节点')).toBeInTheDocument();
    expect(screen.getByText('固定角色：安全管理员')).toBeInTheDocument();

    await user.click(within(screen.getByRole('row', { name: /固定角色测试节点/ })).getByRole('button', { name: '编辑' }));
    await user.selectOptions(screen.getByLabelText('节点类型'), 'dynamic');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(within(screen.getByRole('row', { name: /固定角色测试节点/ })).getByText('动态节点')).toBeInTheDocument();
  });

  it('blocks disabling or deleting roles used by node mappings', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: '审批角色管理' }));
    const roleCard = screen.getByRole('article', { name: /CTO/ });
    await user.click(within(roleCard).getByRole('button', { name: '停用' }));
    expect(screen.getByRole('status')).toHaveTextContent('角色正在被审批节点引用');

    await user.click(within(roleCard).getByRole('button', { name: '删除' }));
    expect(screen.getByRole('status')).toHaveTextContent('角色正在被审批节点引用');
    expect(screen.getByText('CTO')).toBeInTheDocument();
  });

  it('matches future catalog descendants for include-descendants route conditions', () => {
    expect(matchesCatalogConditionValue({ value: ['交易域'], matchMode: 'include_descendants' }, '交易域/未来新增目录')).toBe(true);
    expect(matchesCatalogConditionValue({ value: ['交易域/订单'], matchMode: 'include_descendants' }, '用户域/订单')).toBe(false);
  });

  it('shows submitted batches and opens instance drawer', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: '我提交的申请' }));

    expect(screen.getByText('总批次')).toBeInTheDocument();
    expect(screen.getByText('BATCH-20260611-权限申请-aggregate-mixed')).toBeInTheDocument();
    expect(screen.getByText('部分通过，部分审批中，部分拒绝/撤回')).toBeInTheDocument();
    expect(screen.getByText('部分生效，生效中')).toBeInTheDocument();
    expect(screen.getAllByText('已生效').length).toBeGreaterThan(0);
    expect(screen.getAllByText('生效中').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未生效').length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByRole('combobox', { name: '聚合状态筛选' }), 'partial_approved_in_progress_with_rejected_or_cancelled');
    expect(screen.getByText('BATCH-20260611-权限申请-aggregate-mixed')).toBeInTheDocument();
    expect(screen.queryByText('BATCH-20260610-权限申请-approved')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: '聚合状态筛选' }), 'all');
    expect(screen.getByText('BATCH-20260609-权限申请-approving')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'SUB-20260611-900-01' }));

    expect(screen.getByRole('heading', { name: '工单详情' })).toBeInTheDocument();
    expect(screen.getByText('审批时间线')).toBeInTheDocument();
    expect(screen.getByText('PER-INS-AGG-001')).toBeInTheDocument();
    const drawer = screen.getByLabelText('工单详情');
    expect(drawer).toHaveClass('approval-v6__drawer--approval-detail');
    const infoTable = within(drawer).getByRole('table', { name: '申请信息表' });
    expect(within(infoTable).getByText('工单类型')).toBeInTheDocument();
    expect(within(infoTable).getByText('权限申请')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人')).toBeInTheDocument();
    expect(within(infoTable).getByText('刘数据')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人部门')).toBeInTheDocument();
    expect(within(infoTable).getByText('数据分析部')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人直接上级')).toBeInTheDocument();
    expect(within(infoTable).getByText('王经理')).toBeInTheDocument();
    expect(within(infoTable).queryByText('其它信息')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('安全等级')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('命中流程')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('来源')).not.toBeInTheDocument();
    const infoRows = within(infoTable).getAllByRole('row');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('申请原因');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('需要分析 Q2 交易数据，用于季度业务复盘报告。');

    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '资产名称' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '资产类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '资产负责人' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源系统' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目录归属' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '安全等级' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '权限类型' })).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('wlyd_mc_beijing.').length).toBeGreaterThan(0);
    const assetNameButton = within(assetsTable).getByRole('button', { name: '查看资产 wlyd_mc_beijing.dwd_trade_order' });
    expect(assetNameButton).toHaveTextContent('dwd_trade_order');
    expect(within(assetsTable).getAllByText('表').length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText('李四')).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('MaxCompute').length).toBeGreaterThan(0);
    await user.click(assetNameButton);
    expect(window.location.hash).toBe('#detail?domain=asset&id=resource-table-order-detail');
    expect(screen.queryByRole('link', { name: '飞书查看' })).not.toBeInTheDocument();
  });

  it('shows pending tasks as a compact list and opens a detail drawer', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    expect(screen.getByRole('columnheader', { name: /工单号/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '申请人' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '资产摘要' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '操作' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '飞书' })).not.toBeInTheDocument();
    expect(screen.queryByText(/申请理由：需要分析 Q2 交易数据/)).not.toBeInTheDocument();

    expect(screen.getByText('SUB-20260609-001-01')).toBeInTheDocument();
    expect(screen.getByText('刘数据')).toBeInTheDocument();
    expect(screen.getByText('dwd_trade_order 等 2 个资产')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看 SUB-20260609-001-01' }));

    const drawer = screen.getByLabelText('待审批详情');
    expect(drawer).toHaveClass('approval-v6__drawer--approval-detail');
    expect(screen.getByRole('heading', { name: '待审批详情' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: '飞书' })).not.toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '通过' }).parentElement).toHaveClass('approval-v6__drawer-actions--sticky');

    expect(within(drawer).getByLabelText('审批元信息')).toHaveTextContent('权限申请');
    expect(within(drawer).getByLabelText('审批元信息')).toHaveTextContent('SUB-20260609-001-01');
    expect(within(drawer).getByLabelText('审批元信息')).toHaveTextContent('CTO 审批');
    expect(within(drawer).queryByLabelText('申请摘要')).not.toBeInTheDocument();

    const infoTable = within(drawer).getByRole('table', { name: '申请信息表' });
    expect(within(infoTable).getByText('工单类型')).toBeInTheDocument();
    expect(within(infoTable).getByText('权限申请')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人')).toBeInTheDocument();
    expect(within(infoTable).getByText('刘数据')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人部门')).toBeInTheDocument();
    expect(within(infoTable).getByText('数据分析部')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人直接上级')).toBeInTheDocument();
    expect(within(infoTable).getByText('王经理')).toBeInTheDocument();
    expect(within(infoTable).queryByText('其它信息')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('安全等级')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('命中流程')).not.toBeInTheDocument();
    expect(within(infoTable).queryByText('来源')).not.toBeInTheDocument();
    const infoRows = within(infoTable).getAllByRole('row');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('申请原因');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('需要分析 Q2 交易数据，用于季度业务复盘报告。');

    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '资产名称' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '资产类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '资产负责人' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源系统' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目录归属' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '安全等级' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '权限类型' })).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('wlyd_mc_beijing.').length).toBeGreaterThan(0);
    const assetNameButton = within(assetsTable).getByRole('button', { name: '查看资产 wlyd_mc_beijing.dwd_trade_order' });
    expect(assetNameButton).toHaveTextContent('dwd_trade_order');
    expect(within(assetsTable).getAllByText('表').length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText('李四')).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('MaxCompute').length).toBeGreaterThan(0);
    expect(within(drawer).queryByRole('heading', { name: '权限申请判断' })).not.toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: '审批节点' })).toBeInTheDocument();
    expect(within(drawer).getAllByText('CTO 审批').length).toBeGreaterThan(0);
    expect(within(drawer).getByRole('heading', { name: '审批时间线' })).toBeInTheDocument();
    expect(within(drawer).getByText('提交权限申请')).toBeInTheDocument();
    expect(within(drawer).getByText('等待当前审批节点处理')).toBeInTheDocument();
    await user.click(assetNameButton);
    expect(window.location.hash).toBe('#detail?domain=asset&id=resource-table-order-detail');
  });

  it('opens every pending approval type without extra judgment detail blocks', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    const pendingSubOrderNos = [
      'SUB-20260609-001-01',
      'SUB-20260610-008-01',
      'SUB-20260610-007-01',
      'SUB-20260610-006-01',
      'SUB-20260610-009-01',
      'SUB-20260610-010-01',
      'SUB-20260610-005-01',
    ] as const;

    const extraHeadings = [
      '权限申请判断',
      '上架审批判断',
      '下架审批判断',
      '资源目录修改判断',
      '目录编辑审批判断',
      '负责人交接判断',
      '血缘变更详情',
      '本次提交变更数据',
    ] as const;

    for (const subOrderNo of pendingSubOrderNos) {
      await user.click(screen.getByRole('button', { name: `查看 ${subOrderNo}` }));

      const drawer = screen.getByLabelText('待审批详情');
      expect(within(drawer).getByLabelText('审批元信息')).toHaveTextContent(subOrderNo);
      expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
      expect(within(drawer).getByRole('table', { name: '申请资产明细表' })).toBeInTheDocument();
      expect(within(drawer).getByRole('heading', { name: '审批节点' })).toBeInTheDocument();
      expect(within(drawer).getByRole('heading', { name: '审批时间线' })).toBeInTheDocument();
      expect(within(drawer).queryByLabelText('申请摘要')).not.toBeInTheDocument();
      for (const heading of extraHeadings) {
        expect(within(drawer).queryByRole('heading', { name: heading })).not.toBeInTheDocument();
      }

      await user.click(within(drawer).getByRole('button', { name: '×' }));
    }
  });

  it('renders change-focused asset details for catalog and lineage approval types', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-20260610-006-01' }));
    let drawer = screen.getByLabelText('待审批详情');
    let assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '变更对象' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '对象类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '资产负责人' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '原目录' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目标目录' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '变更说明' })).toBeInTheDocument();
    expect(within(assetsTable).queryByRole('columnheader', { name: '来源类型' })).not.toBeInTheDocument();
    expect(within(assetsTable).queryByRole('columnheader', { name: '安全等级' })).not.toBeInTheDocument();
    expect(within(assetsTable).queryByRole('columnheader', { name: '权限类型' })).not.toBeInTheDocument();
    const catalogAssetButton = within(assetsTable).getByRole('button', { name: '查看资产 wlyd_mc_beijing.dim_product_info' });
    expect(catalogAssetButton).toHaveTextContent('dim_product_info');
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-20260610-009-01' }));
    drawer = screen.getByLabelText('待审批详情');
    assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '编辑动作' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '原目录结构' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '新目录结构' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '影响资源' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目录负责人' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '说明' })).toBeInTheDocument();
    expect(within(assetsTable).getByText('交易域/营销活动')).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-20260610-005-01' }));
    drawer = screen.getByLabelText('待审批详情');
    assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '变更类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '方向' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '源端' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目标端' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '字段映射' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '变更原因' })).toBeInTheDocument();
    expect(within(assetsTable).getByText('pay_amount → gmv_amount')).toBeInTheDocument();
    expect(within(assetsTable).getByText('dwd_order_detail')).toBeInTheDocument();
    expect(within(assetsTable).getByText('rpt_gmv_daily')).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-20260610-006-01' }));
    drawer = screen.getByLabelText('待审批详情');
    assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    await user.click(within(assetsTable).getByRole('button', { name: '查看资产 wlyd_mc_beijing.dim_product_info' }));
    expect(window.location.hash).toBe('#detail?domain=asset&id=resource-table-dim-product-info');
  });

  it('reuses the change-focused lineage table in submitted work-order detail', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: '我提交的申请' }));
    await user.type(screen.getByPlaceholderText('搜索批次号、子单号、资产名...'), 'SUB-20260610-005-01');
    await user.click(screen.getByRole('button', { name: /BATCH-20260610-血缘修正-approving/ }));
    await user.click(screen.getByRole('button', { name: 'SUB-20260610-005-01' }));

    const drawer = screen.getByLabelText('工单详情');
    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '变更类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByText('pay_amount → gmv_amount')).toBeInTheDocument();
    expect(within(assetsTable).getByText('补齐 GMV 统计字段映射')).toBeInTheDocument();
  });

  it('requires rejection comments and removes rejected pending tasks from the compact list', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    await user.click(screen.getAllByRole('button', { name: '拒绝' })[0]);
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.getByRole('status')).toHaveTextContent('拒绝时必须填写审批意见');

    await user.type(screen.getByPlaceholderText('必填，请说明拒绝原因'), '数据范围过大，请缩小申请范围');
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.queryByText('SUB-20260609-001-01')).not.toBeInTheDocument();
  });

  it('supports batch approval and batch rejection from the pending list', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    await user.click(screen.getByLabelText('选择 SUB-20260609-001-01'));
    await user.click(screen.getByLabelText('选择 SUB-20260610-008-01'));
    expect(screen.getByText('已选择 2 项')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量通过' }));
    expect(screen.getByRole('dialog', { name: '确认批量审批通过' })).toBeInTheDocument();
    expect(screen.getByText('将批量处理 2 条待审批任务')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认通过' }));
    expect(screen.queryByText('SUB-20260609-001-01')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-20260610-008-01')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('选择 SUB-20260610-006-01'));
    await user.click(screen.getByRole('button', { name: '批量拒绝' }));
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.getByRole('status')).toHaveTextContent('拒绝时必须填写审批意见');

    await user.type(screen.getByPlaceholderText('必填，请说明拒绝原因'), '目录调整依据不足');
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.queryByText('SUB-20260610-006-01')).not.toBeInTheDocument();
  });

  it('renders lineage approval details with submitted change data instead of generic asset table', async () => {
    const approval = submitLineageApproval({
      objectId: 'dwd_order_detail',
      objectName: 'dwd_order_detail',
      objectDisplay: '订单明细宽表',
      catalog: '交易域/订单/订单明细',
      securityLevel: 'S3',
      reason: '补齐订单链路来源',
      changes: [
        {
          id: 'relation-1',
          kind: 'relation',
          action: 'add',
          direction: 'upstream',
          sourceId: 'kafka_order_topic',
          sourceName: 'kafka_order_topic',
          targetId: 'dwd_order_detail',
          targetName: 'dwd_order_detail',
          reason: '消息队列参与生成订单明细',
        },
        {
          id: 'field-1',
          kind: 'field',
          action: 'add',
          direction: 'upstream',
          sourceId: 'kafka_order_topic',
          sourceName: 'kafka_order_topic',
          sourceField: 'order_id',
          targetId: 'dwd_order_detail',
          targetName: 'dwd_order_detail',
          targetField: 'order_id',
          reason: '订单 ID 参数映射',
        },
      ],
    });
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));
    await user.click(screen.getByRole('button', { name: `查看 ${approval.approvalNo}` }));

    const drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).queryByLabelText('申请摘要')).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '血缘变更详情' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '本次提交变更数据' })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('手工新增')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('增量修正')).not.toBeInTheDocument();
    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getAllByText('kafka_order_topic').length).toBeGreaterThan(0);
    expect(within(assetsTable).getAllByText('dwd_order_detail').length).toBeGreaterThan(0);
    expect(within(assetsTable).getByText('order_id → order_id')).toBeInTheDocument();
    expect(within(drawer).queryByText('示例')).not.toBeInTheDocument();
  });

  it('renders static lineage pending tasks without judgment-page blocks', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));
    await user.click(screen.getByRole('button', { name: '查看 SUB-20260610-005-01' }));

    const drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).getByLabelText('审批元信息')).toHaveTextContent('血缘修正');
    expect(within(drawer).queryByLabelText('申请摘要')).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '血缘变更详情' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '本次提交变更数据' })).not.toBeInTheDocument();
    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByText('dwd_order_detail')).toBeInTheDocument();
    expect(within(assetsTable).getByText('rpt_gmv_daily')).toBeInTheDocument();
    expect(within(assetsTable).getByText('pay_amount → gmv_amount')).toBeInTheDocument();
  });
});

const basePendingTask: PendingTask = {
  id: 'custom-task',
  applicant: '测试申请人',
  applicantDept: '测试部门',
  nodeName: '测试节点',
  waitingHours: 1,
  assets: ['asset_a'],
  securityLevel: 'S3',
  permissionType: '只读',
  directory: '测试域/目录',
  sourceType: 'warehouse_engine',
  sourceSystem: 'MaxCompute',
  matchedFlow: '测试流程',
  matchedRoute: '测试规则',
  reason: '测试原因',
  subOrderNo: 'SUB-CUSTOM',
  instanceCode: 'INS-CUSTOM',
  createdAt: '2026-06-13 20:00:00',
  ticketType: '权限申请',
  approvers: [
    { nodeId: 'custom-node', nodeName: '测试节点', mode: 'single', approvers: [{ name: '测试审批人', openId: 'ou_test_approver' }] },
  ],
  timeline: [
    { action: '提交权限申请', operator: '测试申请人', time: '2026-06-13 20:00:00', status: 'system', comment: '测试原因' },
    { action: '测试节点', operator: '测试审批人', time: '2026-06-13 20:00:00', status: 'pending', comment: '等待当前审批节点处理' },
  ],
};

describe('PendingPanel typed approval detail templates', () => {
  function renderSingleTask(task: PendingTask) {
    const user = userEvent.setup();
    render(<PendingPanel tasks={[task]} onOpenAction={() => {}} />);
    return user;
  }

  it('renders listing, delisting, catalog, and owner handover details without extra judgment blocks', async () => {
    const tasks: PendingTask[] = [
      { ...basePendingTask, id: 'listing', subOrderNo: 'SUB-LISTING', ticketType: '上架审批', assets: ['rpt_finance_monthly'], reason: '口径已补齐，申请上架。' },
      { ...basePendingTask, id: 'delisting', subOrderNo: 'SUB-DELISTING', ticketType: '下架审批', permissionType: '下架', assets: ['dwd_trade_order'], securityLevel: 'S4', reason: '该表已下线，需从正式目录移除并归档。' },
      { ...basePendingTask, id: 'catalog', subOrderNo: 'SUB-CATALOG', ticketType: '目录修改', permissionType: '目录修改', assets: ['dim_product_info'], directory: '商品域/商品基础信息', reason: '商品基础信息表从商品域迁移至公共维度域。' },
      { ...basePendingTask, id: 'handover', subOrderNo: 'SUB-HANDOVER', ticketType: '负责人交接', permissionType: '负责人交接', assets: ['api_payment_query'], reason: '原负责人离职，工作交接给王工。' },
    ];
    const user = userEvent.setup();
    render(<PendingPanel tasks={tasks} onOpenAction={() => {}} />);

    await user.click(screen.getByRole('button', { name: '查看 SUB-LISTING' }));
    let drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).getByRole('table', { name: '申请资产明细表' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '上架审批判断' })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('元数据完整性')).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-DELISTING' }));
    drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).getByRole('table', { name: '申请资产明细表' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '下架审批判断' })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('影响范围')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('下游依赖')).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-CATALOG' }));
    drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).getByRole('table', { name: '申请资产明细表' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '资源目录修改判断' })).not.toBeInTheDocument();
    expect(within(drawer).getAllByText('原目录').length).toBeGreaterThan(0);
    expect(within(drawer).getAllByText('目标目录').length).toBeGreaterThan(0);
    await user.click(within(drawer).getByRole('button', { name: '×' }));

    await user.click(screen.getByRole('button', { name: '查看 SUB-HANDOVER' }));
    drawer = screen.getByLabelText('待审批详情');
    expect(within(drawer).getByRole('table', { name: '申请信息表' })).toBeInTheDocument();
    expect(within(drawer).getByRole('table', { name: '申请资产明细表' })).toBeInTheDocument();
    expect(within(drawer).queryByRole('heading', { name: '负责人交接判断' })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('原负责人')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('新负责人')).not.toBeInTheDocument();
  });
});
