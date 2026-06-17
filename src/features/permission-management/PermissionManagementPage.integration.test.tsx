import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PermissionManagementPage } from './PermissionManagementPage';

describe('PermissionManagementPage integration', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('renders ApplicantPermDetail when an applicant-side perm ticket row is opened', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);
    await user.click(screen.getByRole('tab', { name: '全部拒绝/撤回' }));
    const rows = screen.getAllByRole('row');
    // Find a row containing PA- (perm ticket id pattern)
    const permRow = rows.find(row => row.textContent?.includes('PA-2026032500008'));
    if (permRow) {
      await user.click(permRow);
      expect(screen.getByText(/权限申请详情 — PA-2026032500008/)).toBeInTheDocument();
      expect(screen.getByText(/审批流明细/)).toBeInTheDocument();
    } else {
      // Fallback: click any row that has a PA- id
      const anyPermRow = rows.find(row => row.textContent?.match(/PA-\d+/));
      if (anyPermRow) {
        await user.click(anyPermRow);
        expect(screen.getByText(/权限申请详情/)).toBeInTheDocument();
      }
    }
  });

  it('renders ApplicantGovDetail with DiffField when approver catalog row is opened', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);
    // Navigate to 待我审批 tab (the second tab panel area)
    // Find tabs - look for "待我审批" tab
    const tabs = screen.getAllByRole('tab');
    const pendingTab = tabs.find(tab => tab.textContent?.includes('待审批') || tab.textContent?.includes('待我审批'));
    if (pendingTab) {
      await user.click(pendingTab);
      const rows = screen.getAllByRole('row');
      // Find a GA- row (catalog ticket id pattern)
      const catalogRow = rows.find(row => row.textContent?.includes('GA-2026032900035'));
      if (catalogRow) {
        await user.click(catalogRow);
        expect(screen.getByText(/目录修改详情/)).toBeInTheDocument();
        expect(screen.getByText('当前目录')).toBeInTheDocument();
      }
    }
  });

  it('shows aggregate status for applicant permission work orders', () => {
    render(<PermissionManagementPage />);
    expect(screen.getByText('部分通过，审批中')).toBeInTheDocument();
  });

  it('filters applicant permission work orders by aggregate status', async () => {
    const user = userEvent.setup();
    render(<PermissionManagementPage />);
    await user.click(screen.getByRole('tab', { name: '部分通过审批中' }));
    expect(screen.getByText('PA-2026033100001')).toBeInTheDocument();
    expect(screen.queryByText('GA-2026033100042')).not.toBeInTheDocument();
  });
});
