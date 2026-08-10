import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableBuilderPage } from './TableBuilderPage';
import { DataStandardDraftPage } from '../data-standard/DataStandardDraftPage';
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
    window.location.hash = '#table-builder/new';
  });

  it('blocks entering fields step without database', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/选择.*数据源|目标库/)).toBeInTheDocument();
  });

  it('requires table name before entering field config, then allows paste', async () => {
    const user = userEvent.setup();
    render(<TableBuilderPage />);
    await user.selectOptions(screen.getByLabelText('数据源类型'), 'Hive');
    await user.selectOptions(screen.getByLabelText('目标库'), 'dwd');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    // Step 2（表名信息）— 未填表名时不能进入 Step 3
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/表中文名|表英文名/);

    // 填写表名后进入 Step 3（字段配置）
    await user.type(screen.getByLabelText('中文表名'), '客户维表');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    // Step 3: 粘贴导入字段
    await user.click(screen.getByRole('button', { name: /粘贴/ }));
    await user.clear(screen.getByLabelText(/粘贴/));
    await user.type(
      screen.getByLabelText(/粘贴/),
      '客户编号,,客户唯一编号{enter}客户性别,,{enter}优惠券编码,,',
    );
    await user.click(screen.getByRole('button', { name: '解析并写入' }));
    expect(screen.getByText('客户编号')).toBeInTheDocument();
  });
});

describe('TableBuilderPage step 3 recommend confirmation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearWizard();
    window.location.hash = '#table-builder/new';
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
    expect(within(adoptedRow).getByRole('checkbox', { name: /主键/ })).toBeChecked();

    const missingRow = findRowByText('优惠券编码');
    expect(within(missingRow).getByText('缺标')).toBeInTheDocument();

    await user.click(within(adoptedRow).getByRole('button', { name: '忽略' }));
    const ignoredRow = findRowByText('客户编号');
    expect(within(ignoredRow).getByText('已忽略')).toBeInTheDocument();
    expect(within(ignoredRow).getByText('未落标')).toBeInTheDocument();
    // 忽略后标准派生的技术属性（主键等）应被清空，仅保留用户原始录入内容。
    expect(within(ignoredRow).getByRole('checkbox', { name: /主键/ })).not.toBeChecked();

    await user.click(within(missingRow).getByRole('button', { name: '新建标准草稿' }));
    expect(window.location.hash).toBe('#data-standard/draft');
  });

  it('completes cross-page E2E flow: missing field → draft handoff → data-standard save → back to Step3 shows 草稿已发起', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 2;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: '', description: '客户主体' };
    state.fields = [
      { id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' },
      { id: 'f2', nameZh: '优惠券编码', nameEn: '', comment: '' },
    ];
    saveWizard(state);

    const { unmount: unmountBuilder } = render(<TableBuilderPage />);
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const missingRow = findRowByText('优惠券编码');
    expect(within(missingRow).getByText('缺标')).toBeInTheDocument();
    await user.click(within(missingRow).getByRole('button', { name: '新建标准草稿' }));
    expect(window.location.hash).toBe('#data-standard/draft');
    unmountBuilder();

    // 跳转数据标准草稿页：应携带缺标字段信息预填表单。
    const { unmount: unmountDraft } = render(<DataStandardDraftPage />);
    expect(screen.getByDisplayValue('优惠券编码')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(window.location.hash).toBe('#table-builder/new');
    unmountDraft();

    // 回到建表工具 Step3：该字段状态应更新为「草稿已发起」。
    render(<TableBuilderPage />);
    const draftRow = findRowByText('优惠券编码');
    expect(within(draftRow).getByText('草稿已发起')).toBeInTheDocument();
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
    expect(within(row).getByDisplayValue('性别码表')).toBeInTheDocument();
    expect(within(row).getByDisplayValue('CHAR')).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: '忽略' }));

    const ignoredRow = findRowByText('客户性别');
    expect(within(ignoredRow).getByText('已忽略')).toBeInTheDocument();
    expect(within(ignoredRow).getByText('未落标')).toBeInTheDocument();
    expect(within(ignoredRow).queryByDisplayValue('性别码表')).not.toBeInTheDocument(); // 码表已清空
    expect(within(ignoredRow).getByDisplayValue('待分类')).toBeInTheDocument();
    expect(within(ignoredRow).getByDisplayValue('待定')).toBeInTheDocument();
    expect(within(ignoredRow).getByDisplayValue('VARCHAR')).toBeInTheDocument();
  });

  it('regenerates recommendation for a field after editing its Chinese name on Step3', async () => {
    const user = userEvent.setup();
    const state = createDefaultWizard();
    state.step = 3;
    state.engine = 'Hive';
    state.database = 'dwd';
    state.table = { nameZh: '客户维表', nameEn: 'dim_customer', description: '' };
    state.fields = [{ id: 'f1', nameZh: '客户编号', nameEn: '', comment: '' }];
    state.recommendations = recommendFields(state.fields);
    saveWizard(state);
    render(<TableBuilderPage />);

    // Step3: 点击字段中文名进入内联编辑
    await user.click(screen.getByText('客户编号'));
    const nameInput = screen.getByLabelText('编辑字段中文名');
    await user.clear(nameInput);
    await user.type(nameInput, '客户性别');
    await user.keyboard('{Enter}');

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
    window.location.hash = '#table-builder/new';
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
    // 成功摘要需展示（演示用）创建时间。
    expect(screen.getByText(/创建时间：/)).toBeInTheDocument();
    // 无缺标草稿在途时，仍展示可选的「去数据标准」入口（原型演示语义清晰）。
    expect(screen.getByRole('button', { name: '去数据标准（原型演示）' })).toBeInTheDocument();
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

  it('shows 查看相关草稿 and navigates to #data-standard when a draft has been started', async () => {
    const user = userEvent.setup();
    const state = stateAtRecommend();
    state.recommendations = state.recommendations.map((row) => ({ ...row, status: 'draft_started' as const }));
    saveWizard(state);
    render(<TableBuilderPage />);

    await user.click(screen.getByRole('button', { name: '确认建表' }));
    expect(screen.getByText('建表成功（演示）')).toBeInTheDocument();

    const draftLink = screen.getByRole('button', { name: '查看相关草稿' });
    await user.click(draftLink);
    expect(window.location.hash).toBe('#data-standard');
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
    window.location.hash = '#table-builder/new';
  });

  it('walks through 选库 → 表名信息 → 字段配置 → 成功结果 → 复制 DDL → 重新建表', async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<TableBuilderPage />);

    // Step 1: 选库
    await user.selectOptions(screen.getByLabelText('数据源类型'), 'Hive');
    await user.selectOptions(screen.getByLabelText('目标库'), 'dwd');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    // Step 2: 表名信息
    await user.type(screen.getByLabelText('中文表名'), '客户维表');
    await user.click(screen.getByRole('button', { name: '下一步' }));

    // Step 3: 字段配置 — 粘贴导入
    await user.click(screen.getByRole('button', { name: /粘贴/ }));
    await user.clear(screen.getByLabelText(/粘贴/));
    await user.type(screen.getByLabelText(/粘贴/), '客户编号,,客户唯一编号{enter}客户性别,,');
    await user.click(screen.getByRole('button', { name: '解析并写入' }));

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
