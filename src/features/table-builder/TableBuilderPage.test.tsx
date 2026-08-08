import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableBuilderPage } from './TableBuilderPage';
import { recommendFields } from './recommend';
import { clearWizard, createDefaultWizard, saveWizard } from './wizardStore';

function findRowByText(text: string): HTMLElement {
  const row = screen.getAllByRole('row').find((r) => within(r).queryByText(text));
  if (!row) {
    throw new Error(`row containing "${text}" not found`);
  }
  return row;
}

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

    const adoptedRow = findRowByText('客户编号');
    expect(within(adoptedRow).getByText('已采纳')).toBeInTheDocument();
    expect(within(adoptedRow).getByText('主键')).toBeInTheDocument();

    const missingRow = findRowByText('优惠券编码');
    expect(within(missingRow).getByText('缺标')).toBeInTheDocument();

    await user.click(within(adoptedRow).getByRole('button', { name: '忽略' }));
    const ignoredRow = findRowByText('客户编号');
    expect(within(ignoredRow).getByText('已忽略')).toBeInTheDocument();
    expect(within(ignoredRow).getByText('未落标')).toBeInTheDocument();
    // 忽略后标准派生的技术属性（主键等）应被清空，仅保留用户原始录入内容。
    expect(within(ignoredRow).queryByText('主键')).not.toBeInTheDocument();

    await user.click(within(missingRow).getByRole('button', { name: '新建标准草稿' }));
    expect(window.location.hash).toBe('#data-standard/draft');
  });

  it('clears standard-derived attributes when ignoring a matched field', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 3;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
    state.fields = [{ id: 'f1', nameZh: '客户性别', nameEn: '', comment: '' }];
    state.recommendations = recommendFields(state.fields);
    saveWizard(state);
    render(<TableBuilderPage />);

    const row = findRowByText('客户性别');
    expect(within(row).getByText('性别码表')).toBeInTheDocument();
    expect(within(row).getByText(/CHAR/)).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: '忽略' }));

    const ignoredRow = findRowByText('客户性别');
    expect(within(ignoredRow).getByText('已忽略')).toBeInTheDocument();
    expect(within(ignoredRow).getByText('未落标')).toBeInTheDocument();
    expect(within(ignoredRow).queryByText('性别码表')).not.toBeInTheDocument(); // 码表已清空
    expect(within(ignoredRow).getByText(/待分类/)).toBeInTheDocument();
    expect(within(ignoredRow).getByText(/待定/)).toBeInTheDocument();
    expect(within(ignoredRow).getByText(/VARCHAR/)).toBeInTheDocument();
  });

  it('clears stale recommendations after editing fields on Step2 so Step3 regenerates', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
    state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }];
    state.recommendations = recommendFields(state.fields);
    saveWizard(state);
    render(<TableBuilderPage />);

    const nameInput = screen.getByLabelText('字段1中文名');
    await user.clear(nameInput);
    await user.type(nameInput, '客户性别');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const row = findRowByText('客户性别');
    expect(within(row).getByText('已采纳')).toBeInTheDocument();
    expect(within(row).getByText('CLT_CUS_002 客户性别')).toBeInTheDocument();
    expect(screen.queryByText(/CLT_CUS_001/)).not.toBeInTheDocument();
  });

  it('regenerates recommendations when recommendation ids no longer match current fields', () => {
    const state = createDefaultWizard();
    state.step = 3;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
    state.fields = [{ id: 'f2', nameZh: '客户性别', nameEn: '', comment: '' }];
    state.recommendations = recommendFields([{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }]);
    saveWizard(state);
    render(<TableBuilderPage />);

    expect(screen.getByText('客户性别')).toBeInTheDocument();
    expect(screen.queryByText('客户编号')).not.toBeInTheDocument();
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

describe('TableBuilderPage step 4 result page', () => {
  function stateAtRecommend() {
    const state = createDefaultWizard();
    state.step = 3;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '客户主体信息' };
    state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '客户唯一编号' }];
    state.recommendations = recommendFields(state.fields);
    return state;
  }

  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder';
  });

  it('confirms create and shows success result with DDL preview + copy', async () => {
    const user = userEvent.setup();
    saveWizard(stateAtRecommend());
    // userEvent.setup() 会为 jsdom 挂载一个真实的 Clipboard 桩实现，这里 spy 其 writeText
    // 以断言复制行为，而不是提前用假对象覆盖 navigator.clipboard（会被 user-event 重新接管）。
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '确认建表' }));

    expect(screen.getByText('建表成功（演示）')).toBeInTheDocument();
    expect(screen.getByText(/dwd\.dim_customer 建表语句已生成/)).toBeInTheDocument();
    const ddlNode = screen.getByText(/CREATE TABLE/i);
    expect(ddlNode.textContent).toContain('dwd.dim_customer');
    expect(ddlNode.textContent).toContain('customer_code');

    await user.click(screen.getByRole('button', { name: '复制 DDL' }));
    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('dwd.dim_customer'));
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();

    // 建表结果页不应触发任何真实建表网络请求（原型演示约束）。
    expect(screen.queryByText(/无权限/)).not.toBeInTheDocument();
  });

  it('simulates a failure demo without touching real create-table flow', async () => {
    const user = userEvent.setup();
    saveWizard(stateAtRecommend());
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '模拟失败（演示）' }));

    expect(screen.getByText('建表失败（演示）')).toBeInTheDocument();
    expect(screen.getByText('目标库无权限（演示）')).toBeInTheDocument();
    // 失败演示同样只展示 DDL 预览，不发起任何真实建表请求。
    expect(screen.getByText(/CREATE TABLE/i)).toBeInTheDocument();
  });

  it('blocks the failure demo when english names duplicate, same as confirm create', async () => {
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
    state.recommendations = recommendFields(state.fields).map((row) => ({ ...row, status: 'adopted' as const }));
    saveWizard(state);
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '模拟失败（演示）' }));
    expect(screen.getByText(/英文名.*重复|重复/)).toBeInTheDocument();
    expect(screen.queryByText('建表失败（演示）')).not.toBeInTheDocument();
  });

  it('allows returning to recommend step from the failure demo to fix data', async () => {
    const user = userEvent.setup();
    saveWizard(stateAtRecommend());
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '模拟失败（演示）' }));
    await user.click(screen.getByRole('button', { name: '返回修改' }));

    expect(screen.getByRole('button', { name: '确认建表' })).toBeInTheDocument();
    expect(screen.getByText('客户编号')).toBeInTheDocument();
  });

  it('restarts the wizard from the result page back to a clean step 1', async () => {
    const user = userEvent.setup();
    saveWizard(stateAtRecommend());
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '确认建表' }));
    expect(screen.getByText('建表成功（演示）')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新建表' }));

    expect(screen.getByLabelText('数据源类型')).toHaveValue('Hive');
    expect(screen.getByLabelText('目标库')).toHaveValue('');
    expect(screen.queryByText('建表成功（演示）')).not.toBeInTheDocument();
  });
});

describe('TableBuilderPage end-to-end acceptance', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder';
  });

  it('walks through 选库 → 录入 → 推荐确认 → 成功结果 → 复制 DDL → 重新建表', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<TableBuilderPage />);

    await user.selectOptions(screen.getByLabelText('数据源类型'), 'Hive');
    await user.selectOptions(screen.getByLabelText('目标库'), 'dwd');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    await user.click(screen.getByRole('button', { name: /粘贴/ }));
    await user.clear(screen.getByLabelText(/粘贴/));
    await user.type(screen.getByLabelText(/粘贴/), '客户编号,,客户唯一编号{enter}客户性别,,');
    await user.click(screen.getByRole('button', { name: '解析并写入' }));
    await user.type(screen.getByLabelText('中文表名'), '客户维表');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    expect(findRowByText('客户编号')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认建表' }));

    expect(screen.getByText('建表成功（演示）')).toBeInTheDocument();
    const ddlText = screen.getByText(/CREATE TABLE/i).textContent ?? '';
    expect(ddlText).toContain('dwd.');

    await user.click(screen.getByRole('button', { name: '复制 DDL' }));
    expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));

    await user.click(screen.getByRole('button', { name: '重新建表' }));
    expect(screen.getByLabelText('目标库')).toHaveValue('');
    expect(screen.queryByRole('button', { name: '重新建表' })).not.toBeInTheDocument();
  });

  it('walks through the failure demo path end-to-end without any real network create-table', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'MySQL';
    state.database = 'ods_mysql';
    state.table = { nameZh: '客户维表', nameEn: '', description: '' };
    state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }];
    saveWizard(state);
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(findRowByText('客户编号')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '模拟失败（演示）' }));
    expect(screen.getByText('建表失败（演示）')).toBeInTheDocument();
    expect(screen.getByText('目标库无权限（演示）')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回修改' }));
    await user.click(screen.getByRole('button', { name: '确认建表' }));
    expect(screen.getByText('建表成功（演示）')).toBeInTheDocument();
  });
});
