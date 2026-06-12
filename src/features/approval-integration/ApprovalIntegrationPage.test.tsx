import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalIntegrationPage } from './ApprovalIntegrationPage';

describe('ApprovalIntegrationPage flows prototype alignment', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.location.hash = 'permissions?section=flows';
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
    await user.type(screen.getByPlaceholderText('姓名'), '测试同学');
    await user.type(screen.getByPlaceholderText('open_id'), 'ou_test_001');
    await user.click(screen.getByRole('button', { name: '添加' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('测试审批人')).toBeInTheDocument();
    expect(screen.getByText('ou_test_001')).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: '权限申请_统一版' }));
    await user.click(screen.getByRole('tab', { name: /路由规则/ }));
    await user.click(screen.getByRole('button', { name: '新增路由规则' }));
    await user.type(screen.getByLabelText('规则名称'), '目录来源组合路由');
    await user.click(screen.getByRole('button', { name: '添加条件' }));
    await user.selectOptions(screen.getByLabelText('条件字段'), 'catalog_path');
    await user.click(within(screen.getByLabelText('目录多选')).getByLabelText(/交易域交易域/));
    await user.click(screen.getByRole('button', { name: '添加条件' }));
    await user.selectOptions(screen.getAllByLabelText('条件字段')[1], 'source_system');
    await user.click(screen.getByLabelText('MaxCompute'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('目录来源组合路由')).toBeInTheDocument();
    expect(screen.getByText(/^目录 属于 交易域（含子目录）$/)).toBeInTheDocument();
    expect(screen.getByText(/来源系统 属于 MaxCompute/)).toBeInTheDocument();
  });

  it('shows submitted batches and opens instance drawer', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: '我提交的申请' }));

    expect(screen.getByText('总批次')).toBeInTheDocument();
    expect(screen.getByText('BATCH-20260609-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'SUB-20260609-001-01' }));

    expect(screen.getByRole('heading', { name: '工单详情' })).toBeInTheDocument();
    expect(screen.getByText('审批时间线')).toBeInTheDocument();
    expect(screen.getByText('PER-INS-00931')).toBeInTheDocument();
    const drawer = screen.getByLabelText('工单详情');
    expect(drawer).toHaveClass('approval-v6__drawer--approval-detail');
    const infoTable = within(drawer).getByRole('table', { name: '申请信息表' });
    expect(within(infoTable).getByText('申请资产')).toBeInTheDocument();
    expect(within(infoTable).getByText('安全等级')).toBeInTheDocument();
    expect(within(infoTable).getByText('命中流程')).toBeInTheDocument();
    expect(within(infoTable).getByText('高安全等级专项审批')).toBeInTheDocument();
    expect(within(infoTable).getByText('来源')).toBeInTheDocument();
    expect(within(infoTable).getByText('数仓引擎 / MaxCompute')).toBeInTheDocument();
    const infoRows = within(infoTable).getAllByRole('row');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('申请原因');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('需要分析 Q2 交易数据，用于季度业务复盘报告。');

    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '资产名称' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源系统' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目录归属' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '安全等级' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '权限类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByText('dwd_trade_order')).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('MaxCompute').length).toBeGreaterThan(0);
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

    const infoTable = within(drawer).getByRole('table', { name: '申请信息表' });
    expect(within(infoTable).getByText('工单号')).toBeInTheDocument();
    expect(within(infoTable).getByText('实例号')).toBeInTheDocument();
    expect(within(infoTable).getByText('申请人')).toBeInTheDocument();
    expect(within(infoTable).getByText('命中流程')).toBeInTheDocument();
    expect(within(infoTable).getByText('权限申请_高安全等级版')).toBeInTheDocument();
    expect(within(infoTable).getByText('命中规则')).toBeInTheDocument();
    expect(within(infoTable).getByText('高安全等级专项审批')).toBeInTheDocument();
    expect(within(infoTable).getAllByText('PER-INS-00931').length).toBeGreaterThan(0);
    const infoRows = within(infoTable).getAllByRole('row');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('申请理由');
    expect(infoRows[infoRows.length - 1]).toHaveTextContent('需要分析 Q2 交易数据，用于季度业务复盘报告。');

    const assetsTable = within(drawer).getByRole('table', { name: '申请资产明细表' });
    expect(within(assetsTable).getByRole('columnheader', { name: '资产名称' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '来源系统' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '目录归属' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '安全等级' })).toBeInTheDocument();
    expect(within(assetsTable).getByRole('columnheader', { name: '权限类型' })).toBeInTheDocument();
    expect(within(assetsTable).getByText('dwd_trade_order')).toBeInTheDocument();
    expect(within(assetsTable).getAllByText('MaxCompute').length).toBeGreaterThan(0);
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
    await user.click(screen.getByLabelText('选择 SUB-20260610-004-01'));
    expect(screen.getByText('已选择 2 项')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量通过' }));
    expect(screen.getByRole('dialog', { name: '确认批量审批通过' })).toBeInTheDocument();
    expect(screen.getByText('将批量处理 2 条待审批任务')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认通过' }));
    expect(screen.queryByText('SUB-20260609-001-01')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-20260610-004-01')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('选择 SUB-20260610-006-01'));
    await user.click(screen.getByRole('button', { name: '批量拒绝' }));
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.getByRole('status')).toHaveTextContent('拒绝时必须填写审批意见');

    await user.type(screen.getByPlaceholderText('必填，请说明拒绝原因'), '目录调整依据不足');
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.queryByText('SUB-20260610-006-01')).not.toBeInTheDocument();
  });
});
