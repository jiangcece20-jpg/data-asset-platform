import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, beforeAll, vi } from 'vitest';
import { LineagePage } from './LineagePage';
import { resetLineageApprovalStore } from './lineageApprovalStore';

describe('LineagePage lineage edit approval flow', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverMock });
    Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverMock });
  });

  beforeEach(() => {
    resetLineageApprovalStore();
  });

  it('opens the lineage management drawer with submit disabled while there are no changes', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));

    expect(screen.getByRole('heading', { name: /血缘关系管理/ })).toBeInTheDocument();
    expect(screen.getByText(/本次修正提交审批后生效/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /表级血缘/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /字段级血缘/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '初始化血缘' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '提交修正（0 项变更）' })).toBeDisabled();
  });

  it('keeps target assets and field mapping selectable after changing target type', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));

    expect(screen.getByLabelText('方向')).toHaveValue('');
    expect(screen.getByLabelText('目标类型')).toHaveValue('');
    expect(screen.getByLabelText('目标资源')).toHaveValue('');

    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'view');
    expect(screen.getByLabelText('目标资源')).toHaveValue('');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'dws_order_subject_view');

    await user.selectOptions(screen.getByLabelText('目标类型'), 'table');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'ods_order_raw');
    expect(screen.getByLabelText('目标资源')).toBeEnabled();
    expect(screen.getByLabelText('目标节点字段')).toBeEnabled();
    expect(screen.getByLabelText('当前节点字段')).toBeEnabled();
  });

  it('adds a table relation with field mapping and requires a submit reason', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));
    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'api');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'kafka_order_topic');
    await user.selectOptions(screen.getByLabelText('目标节点参数'), 'order_id');
    await user.selectOptions(screen.getByLabelText('当前节点字段'), 'order_id');
    await user.click(screen.getByRole('button', { name: '确认添加' }));

    expect(screen.getByText('请填写单条修正原因')).toBeInTheDocument();

    await user.type(screen.getByLabelText('单条修正原因'), '补齐消息队列来源');
    await user.click(screen.getByRole('button', { name: '确认添加' }));

    expect(screen.getByText('待提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交修正（2 项变更）' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '提交修正（2 项变更）' }));
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));

    expect(screen.getByText('请填写修正总原因')).toBeInTheDocument();

    await user.type(screen.getByLabelText('修正总原因'), '订单链路补齐');
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));

    expect(screen.getByText(/当前对象已有血缘修正审批中/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /添加血缘关系/ })).toBeDisabled();
  });

  it('marks an active field-level lineage row for deletion from the operation column', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const fieldRow = within(fieldTable).getAllByRole('row').find(row =>
      row.textContent?.includes('ods_order_raw') &&
      row.textContent.includes('dwd_order_detail') &&
      row.textContent.includes('.order_id')
    ) as HTMLElement;
    expect(fieldRow).toBeTruthy();
    expect(within(fieldRow).getByText('有效')).toBeInTheDocument();

    await user.click(within(fieldRow).getByRole('button', { name: '删除' }));

    expect(within(fieldRow).getByText('待提交')).toBeInTheDocument();
    expect(within(fieldRow).getByRole('button', { name: '撤销' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();
  });

  it('cascades table-level relation exclusion to its direct field-level mappings', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));

    const table = document.querySelector('.lineage-editor-table') as HTMLElement;
    const orderRawRow = within(table).getAllByRole('row').find(row =>
      row.textContent?.includes('ods_order_raw')
    ) as HTMLElement;
    expect(orderRawRow).toBeTruthy();

    await user.click(within(orderRawRow).getByRole('button', { name: '排除' }));

    expect(within(orderRawRow).getByText('待提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交修正（3 项变更）' })).toBeEnabled();
    expect(screen.getByText('已联动排除 2 条字段级血缘，将随本次审批一起提交。')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    await user.selectOptions(screen.getByLabelText('状态'), 'draft');

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const fieldRows = within(fieldTable).getAllByRole('row').filter(row => row.querySelector('td'));
    expect(fieldRows).toHaveLength(2);
    expect(fieldRows[0]).toHaveTextContent('ods_order_raw');
    expect(fieldRows[0]).toHaveTextContent('dwd_order_detail');
    expect(fieldRows[0]).toHaveTextContent('待提交');
    expect(fieldRows[1]).toHaveTextContent('ods_order_raw');
    expect(fieldRows[1]).toHaveTextContent('dwd_order_detail');
    expect(fieldRows[1]).toHaveTextContent('待提交');

    await user.click(screen.getByRole('button', { name: '提交修正（3 项变更）' }));

    const submitDialog = screen.getByRole('dialog', { name: '提交血缘修正审批' });
    expect(within(submitDialog).getByText('ods_order_raw → dwd_order_detail')).toBeInTheDocument();
    expect(within(submitDialog).getByText('ods_order_raw.order_id → dwd_order_detail.order_id')).toBeInTheDocument();
    expect(within(submitDialog).getByText('ods_order_raw.create_time → dwd_order_detail.create_time')).toBeInTheDocument();
  });

  it('undoes only field deletes generated by a table-level relation exclusion', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const manualFieldRow = within(fieldTable).getAllByRole('row').find(row =>
      row.textContent?.includes('dwd_order_detail') &&
      row.textContent.includes('ads_order_summary') &&
      row.textContent.includes('.order_id')
    ) as HTMLElement;
    expect(manualFieldRow).toBeTruthy();

    await user.click(within(manualFieldRow).getByRole('button', { name: '删除' }));
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();

    await user.click(screen.getByRole('tab', { name: /表级血缘/ }));
    const table = document.querySelector('.lineage-editor-table') as HTMLElement;
    const orderRawRow = within(table).getAllByRole('row').find(row =>
      row.textContent?.includes('ods_order_raw')
    ) as HTMLElement;
    expect(orderRawRow).toBeTruthy();

    await user.click(within(orderRawRow).getByRole('button', { name: '排除' }));
    expect(screen.getByRole('button', { name: '提交修正（4 项变更）' })).toBeEnabled();
    expect(screen.getByText('已联动排除 2 条字段级血缘，将随本次审批一起提交。')).toBeInTheDocument();
    await user.click(within(orderRawRow).getByRole('button', { name: '撤销' }));
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();
    expect(screen.queryByText('已联动排除 2 条字段级血缘，将随本次审批一起提交。')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    await user.selectOptions(screen.getByLabelText('状态'), 'draft');

    const draftFieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const draftRows = within(draftFieldTable).getAllByRole('row').filter(row => row.querySelector('td'));
    expect(draftRows).toHaveLength(1);
    expect(draftRows[0]).toHaveTextContent('dwd_order_detail');
    expect(draftRows[0]).toHaveTextContent('ads_order_summary');
    expect(draftRows[0]).toHaveTextContent('.order_id');
  });

  it('defaults to effective lineage rows and restores an excluded table relation through a draft approval change', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));

    expect(screen.getByPlaceholderText('搜索资源名/字段名...')).toBeInTheDocument();
    expect(screen.getByLabelText('状态')).toHaveValue('effective');

    const initialTable = document.querySelector('.lineage-editor-table') as HTMLElement;
    const skuRow = within(initialTable).getAllByRole('row').find(row =>
      row.textContent?.includes('dim_sku_info')
    ) as HTMLElement;
    expect(skuRow).toBeTruthy();

    await user.click(within(skuRow).getByRole('button', { name: '排除' }));
    expect(within(skuRow).getByText('待提交')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提交修正（2 项变更）' }));
    await user.type(screen.getByLabelText('修正总原因'), '排除错误维表来源');
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));
    await user.click(screen.getByRole('button', { name: '模拟审批通过' }));

    const effectiveOnlyTable = document.querySelector('.lineage-editor-table') as HTMLElement;
    expect(within(effectiveOnlyTable).queryByText('已排除')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('状态'), 'all');

    const allStatusTable = document.querySelector('.lineage-editor-table') as HTMLElement;
    const excludedRow = within(allStatusTable).getAllByRole('row').find(row =>
      row.textContent?.includes('dim_sku_info') &&
      row.textContent.includes('已排除')
    ) as HTMLElement;
    expect(excludedRow).toBeTruthy();
    expect(excludedRow).toHaveClass('lineage-editor-tr--excluded');

    await user.click(within(excludedRow).getByRole('button', { name: '恢复' }));

    expect(within(excludedRow).getByText('待提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();
  });

  it('filters field-level lineage by field name and keeps delete available from the operation column', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    await user.type(screen.getByPlaceholderText('搜索资源名/字段名...'), 'create_time');

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const rows = within(fieldTable).getAllByRole('row').filter(row => row.querySelector('td'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('create_time');

    await user.click(within(rows[0]).getByRole('button', { name: '删除' }));

    expect(within(rows[0]).getByText('待提交')).toBeInTheDocument();
  });

  it('adds metric lineage without carrier fields and shows it in both table and field tabs', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));
    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'metric');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'metric_gmv_daily');

    expect(screen.queryByText('选择承载字段')).not.toBeInTheDocument();
    expect(screen.queryByText('指标/标签需要绑定到表、视图或 API 的一个或多个字段/参数。')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('单条修正原因'), '补齐指标依赖');
    await user.click(screen.getByRole('button', { name: '确认添加' }));

    await user.selectOptions(screen.getByLabelText('状态'), 'draft');
    const table = document.querySelector('.lineage-editor-table') as HTMLElement;
    const tableRows = within(table).getAllByRole('row').filter(row => row.querySelector('td'));
    expect(tableRows).toHaveLength(1);
    expect(tableRows[0]).toHaveTextContent('metric_gmv_daily');
    expect(tableRows[0]).toHaveTextContent('GMV日指标');
    expect(tableRows[0]).toHaveTextContent('待提交');

    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const fieldRows = within(fieldTable).getAllByRole('row').filter(row => row.querySelector('td'));
    expect(fieldRows).toHaveLength(1);
    expect(fieldRows[0]).toHaveTextContent('dwd_order_detail');
    expect(fieldRows[0]).toHaveTextContent('metric_gmv_daily');
    expect(fieldRows[0]).toHaveTextContent('GMV日指标');
    expect(fieldRows[0]).not.toHaveTextContent('.gmv_value');
    expect(screen.getByRole('button', { name: '提交修正（2 项变更）' })).toBeEnabled();
  });

  it('allows label to label lineage and creates both relation and field drafts', async () => {
    const user = userEvent.setup();
    render(<LineagePage centerNodeId="label_user_value_tier" />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));
    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'label');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'label_user_value_tier_peer');

    expect(screen.queryByText('选择承载字段')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('单条修正原因'), '补齐标签口径依赖');
    await user.click(screen.getByRole('button', { name: '确认添加' }));

    expect(screen.getByRole('button', { name: '提交修正（2 项变更）' })).toBeEnabled();

    await user.selectOptions(screen.getByLabelText('状态'), 'draft');
    const table = document.querySelector('.lineage-editor-table') as HTMLElement;
    expect(table).toHaveTextContent('label_user_value_tier_peer');

    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    expect(fieldTable).toHaveTextContent('label_user_value_tier_peer');
    expect(fieldTable).not.toHaveTextContent('.user_value_tier');
  });

  it('cascades deleting the last field-level mapping to its table-level relation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const metricRows = within(fieldTable).getAllByRole('row').filter(row =>
      row.textContent?.includes('dwd_order_detail') &&
      row.textContent.includes('metric_gmv_daily')
    );
    expect(metricRows).toHaveLength(2);

    await user.click(within(metricRows[0]).getByRole('button', { name: '删除' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();

    await user.click(within(metricRows[1]).getByRole('button', { name: '删除' }));
    expect(confirmSpy).toHaveBeenCalledWith('删除后该表级关系下将没有字段级血缘，将同时删除表级血缘关系。是否继续？');
    expect(screen.getByRole('button', { name: '提交修正（3 项变更）' })).toBeEnabled();

    await user.click(screen.getByRole('tab', { name: /表级血缘/ }));
    await user.selectOptions(screen.getByLabelText('状态'), 'draft');
    const table = document.querySelector('.lineage-editor-table') as HTMLElement;
    const relationRow = within(table).getAllByRole('row').find(row =>
      row.textContent?.includes('metric_gmv_daily')
    ) as HTMLElement;
    expect(relationRow).toBeTruthy();
    expect(relationRow).toHaveTextContent('待提交');

    confirmSpy.mockRestore();
  });

  it('keeps the relation when cancelling last field-level delete cascade', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));

    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const metricRows = within(fieldTable).getAllByRole('row').filter(row =>
      row.textContent?.includes('dwd_order_detail') &&
      row.textContent.includes('metric_gmv_daily')
    );

    await user.click(within(metricRows[0]).getByRole('button', { name: '删除' }));
    await user.click(within(metricRows[1]).getByRole('button', { name: '删除' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '提交修正（1 项变更）' })).toBeEnabled();

    confirmSpy.mockRestore();
  });

  it('undoes a manually added field-level draft together with its relation when it is the last mapping', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));
    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'metric');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'metric_gmv_daily');
    await user.type(screen.getByLabelText('单条修正原因'), '补齐指标依赖');
    await user.click(screen.getByRole('button', { name: '确认添加' }));

    expect(screen.getByRole('button', { name: '提交修正（2 项变更）' })).toBeEnabled();

    await user.click(screen.getByRole('tab', { name: /字段级血缘/ }));
    await user.selectOptions(screen.getByLabelText('状态'), 'draft');
    const fieldTable = document.querySelector('.lineage-editor-table--field') as HTMLElement;
    const draftRow = within(fieldTable).getAllByRole('row').find(row =>
      row.textContent?.includes('metric_gmv_daily') &&
      row.textContent.includes('待提交')
    ) as HTMLElement;

    await user.click(within(draftRow).getByRole('button', { name: '撤销' }));

    expect(confirmSpy).toHaveBeenCalledWith('撤销后该表级关系下将没有字段级血缘，将同时撤销表级血缘关系。是否继续？');
    expect(screen.getByRole('button', { name: '提交修正（0 项变更）' })).toBeDisabled();

    confirmSpy.mockRestore();
  });

  it('submits lineage reset as an initialization approval instead of applying it immediately', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: '初始化血缘' }));

    expect(screen.getByRole('dialog', { name: '初始化血缘审批申请' })).toBeInTheDocument();
    expect(screen.getAllByText(/全量重建/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));
    expect(screen.getByText('请填写初始化原因')).toBeInTheDocument();

    await user.type(screen.getByLabelText('初始化原因'), '重新扫描订单链路');
    await user.click(screen.getByLabelText('我确认审批通过后将覆盖当前资产已有血缘'));
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));

    expect(screen.getByText(/当前对象已有血缘修正审批中/)).toBeInTheDocument();
    expect(screen.getAllByText(/初始化血缘/).length).toBeGreaterThan(0);
  });

  it('applies approved change sets to the visible lineage graph', async () => {
    const user = userEvent.setup();
    render(<LineagePage />);

    await user.click(screen.getByRole('button', { name: /修正血缘/ }));
    await user.click(screen.getByRole('button', { name: /添加血缘关系/ }));
    await user.selectOptions(screen.getByLabelText('方向'), 'upstream');
    await user.selectOptions(screen.getByLabelText('目标类型'), 'api');
    await user.selectOptions(screen.getByLabelText('目标资源'), 'kafka_order_topic');
    await user.selectOptions(screen.getByLabelText('目标节点参数'), 'order_id');
    await user.selectOptions(screen.getByLabelText('当前节点字段'), 'order_id');
    await user.type(screen.getByLabelText('单条修正原因'), '补齐消息队列来源');
    await user.click(screen.getByRole('button', { name: '确认添加' }));
    await user.click(screen.getByRole('button', { name: '提交修正（2 项变更）' }));
    await user.type(screen.getByLabelText('修正总原因'), '补齐消息队列来源');
    await user.click(screen.getByRole('button', { name: '确认提交审批' }));

    await user.click(screen.getByRole('button', { name: '模拟审批通过' }));

    expect(screen.queryByText(/当前对象已有血缘修正审批中/)).not.toBeInTheDocument();
    const canvas = document.querySelector('.lineage-canvas-wrap') as HTMLElement;
    expect(within(canvas).getByText('订单消息队列')).toBeInTheDocument();
  });
});
