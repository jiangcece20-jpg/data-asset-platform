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
    expect(screen.getByText('高安全等级专项审批')).toBeInTheDocument();
    expect(screen.getByText('数仓引擎 / MaxCompute')).toBeInTheDocument();
  });

  it('requires rejection comments and removes approved pending tasks', async () => {
    const user = userEvent.setup();
    render(<ApprovalIntegrationPage />);

    await user.click(within(screen.getByRole('navigation', { name: '飞书审批集成导航' })).getByRole('button', { name: /待我审批/ }));

    expect(screen.getAllByText('交易域/订单').length).toBeGreaterThan(0);
    expect(screen.getByText('权限申请_高安全等级版')).toBeInTheDocument();
    expect(screen.getByText('高安全等级专项审批')).toBeInTheDocument();
    expect(screen.getByText('SUB-20260609-001-01')).toBeInTheDocument();
    expect(screen.getByText('PER-INS-00931')).toBeInTheDocument();
    expect(screen.getByText('2026-06-09 14:26:00')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '拒绝' })[0]);
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.getByRole('status')).toHaveTextContent('拒绝时必须填写审批意见');

    await user.type(screen.getByPlaceholderText('必填，请说明拒绝原因'), '数据范围过大，请缩小申请范围');
    await user.click(screen.getByRole('button', { name: '确认拒绝' }));
    expect(screen.queryByText('SUB-20260609-001-01 · PER-INS-00931 · 2026-06-09 14:26:00')).not.toBeInTheDocument();
  });
});
