import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TableBuilderPage } from './TableBuilderPage';
import { clearWizard } from './wizardStore';

describe('TableBuilderPage steps 1-2', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder';
  });

  it('blocks entering fields step without database', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/选择.*数据源|目标库/)).toBeInTheDocument();
  });

  it('allows paste then requires table name before recommend', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.selectOptions(screen.getByLabelText('数据源类型'), 'Hive');
    await user.selectOptions(screen.getByLabelText('目标库'), 'dwd');
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: /粘贴/ }));
    await user.clear(screen.getByLabelText(/粘贴/));
    await user.type(
      screen.getByLabelText(/粘贴/),
      '客户编号,,客户唯一编号{enter}客户性别,,{enter}优惠券编码,,',
    );
    await user.click(screen.getByRole('button', { name: '解析并写入' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/表中文名|表英文名/)).toBeInTheDocument();
  });
});
