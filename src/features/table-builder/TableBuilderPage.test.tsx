import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TableBuilderPage } from './TableBuilderPage';
import { recommendFields } from './recommend';
import { clearWizard, createDefaultWizard, saveWizard } from './wizardStore';

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

describe('TableBuilderPage step 3 recommend confirmation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder';
  });

  it('auto-adopts recommendations and allows ignore / draft jump', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: '', description: '客户主体' };
    state.fields = [
      { id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' },
      { id: 'f2', nameZh: '客户性别', nameEn: '', comment: '' },
      { id: 'f3', nameZh: '优惠券编码', nameEn: '', comment: '' },
    ];
    saveWizard(state);
    render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText('客户编号')).toBeInTheDocument();
    expect(screen.getByText(/已采纳/)).toBeInTheDocument();
    expect(screen.getByText(/缺标/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '忽略' })[0]);
    expect(screen.getByText(/已忽略|未落标/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新建标准草稿' }));
    expect(window.location.hash).toBe('#data-standard/draft');
  });

  it('blocks confirm create when english names duplicate', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 3;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
    state.fields = [
      { id: 'f1', nameZh: '客户编号', nameEn: 'customer_code', comment: '' },
      { id: 'f2', nameZh: '客户代码', nameEn: 'customer_code', comment: '' },
    ];
    state.recommendations = recommendFields(state.fields).map((row) => ({
      ...row,
      status: 'adopted' as const,
    }));
    saveWizard(state);
    render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '确认建表' }));
    expect(screen.getByText(/英文名.*重复|重复/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认建表' })).toBeInTheDocument();
  });
});
