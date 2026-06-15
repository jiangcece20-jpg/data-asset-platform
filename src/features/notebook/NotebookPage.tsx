import { useState, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import ReactECharts from 'echarts-for-react';
import { Button } from '../../components/base/Button';
import { Resizable } from '../../components/base/Resizable';
import './notebook.css';

/* ─── Types ───────────────────────────────────── */

type MockField = { name: string; type: string; comment: string };
type MockTable = { id: string; schema: string; name: string; comment: string; fields: MockField[] };

type SuccessResult = {
  columns: string[];
  rows: string[][];
  rowCount: number;
  duration: string;
};

type QueryResult = SuccessResult | { error: string };

type ChartConfig = {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  xField: string | null;
  yField: string | null;
};

type TabData = {
  id: string;
  title: string;
  sql: string;
  result: QueryResult | null;
  viewMode: 'table' | 'chart';
  chartConfig: ChartConfig;
  sortCol: number | null;
  sortDir: 'asc' | 'desc' | null;
  visibleCols: boolean[];
};

type HistoryEntry = {
  id: string;
  sql: string;
  rowCount: number;
  duration: string;
  executedAt: string;
  error: boolean;
};

/* ─── Mock Data ───────────────────────────────── */

const MOCK_TABLES: MockTable[] = [
  {
    id: 'tbl-1', schema: 'wlyd_mc', name: 'dwd_user_basic_info_d1',
    comment: '用户基础信息日全量快照表',
    fields: [
      { name: 'user_id', type: 'BIGINT', comment: '用户唯一标识ID' },
      { name: 'user_name', type: 'VARCHAR(64)', comment: '用户昵称' },
      { name: 'mobile_phone_encrypted', type: 'VARCHAR(128)', comment: '手机号（加密存储）' },
      { name: 'register_channel_code', type: 'VARCHAR(32)', comment: '注册来源渠道编码' },
      { name: 'user_level_code', type: 'SMALLINT', comment: '会员等级编码' },
      { name: 'first_order_time', type: 'DATETIME', comment: '首次下单时间' },
      { name: 'cumulative_order_amount', type: 'DECIMAL(18,2)', comment: '累计订单金额' },
      { name: 'ds', type: 'VARCHAR(10)', comment: '分区日期yyyyMMdd' },
    ],
  },
  {
    id: 'tbl-2', schema: 'wlyd_mc', name: 'dwd_order_trade_detail_di',
    comment: '订单交易明细日增量表',
    fields: [
      { name: 'order_id', type: 'BIGINT', comment: '订单唯一标识ID' },
      { name: 'user_id', type: 'BIGINT', comment: '下单用户ID' },
      { name: 'pay_amount', type: 'DECIMAL(18,2)', comment: '实付金额' },
      { name: 'order_status_code', type: 'VARCHAR(16)', comment: '订单状态编码' },
      { name: 'product_id', type: 'BIGINT', comment: '商品ID' },
      { name: 'channel_code', type: 'VARCHAR(32)', comment: '下单渠道编码' },
      { name: 'gmt_created', type: 'DATETIME', comment: '下单时间' },
      { name: 'ds', type: 'VARCHAR(10)', comment: '分区日期yyyyMMdd' },
    ],
  },
  {
    id: 'tbl-3', schema: 'wlyd_mc_beijing', name: 'dwd_ctps_product_browsed_company_shop_device_product_d1',
    comment: '商品浏览-企业店铺设备商品维度日汇总表',
    fields: [
      { name: 'company_id', type: 'BIGINT', comment: '企业ID' },
      { name: 'shop_id', type: 'BIGINT', comment: '店铺ID' },
      { name: 'device_type_code', type: 'VARCHAR(32)', comment: '设备类型编码' },
      { name: 'product_id', type: 'BIGINT', comment: '商品ID' },
      { name: 'browse_pv', type: 'BIGINT', comment: '浏览PV' },
      { name: 'browse_uv', type: 'BIGINT', comment: '浏览UV' },
      { name: 'ds', type: 'VARCHAR(10)', comment: '分区日期yyyyMMdd' },
    ],
  },
  {
    id: 'tbl-4', schema: 'wlyd_mc', name: 'ods_user_behavior_event_log_di',
    comment: '用户行为事件埋点日志增量表',
    fields: [
      { name: 'event_id', type: 'BIGINT', comment: '事件唯一ID' },
      { name: 'user_id', type: 'BIGINT', comment: '触发用户ID' },
      { name: 'event_type_code', type: 'VARCHAR(32)', comment: '事件类型编码' },
      { name: 'event_timestamp', type: 'DATETIME', comment: '事件发生时间' },
      { name: 'page_url', type: 'VARCHAR(512)', comment: '页面URL' },
      { name: 'event_properties', type: 'JSON', comment: '事件扩展属性' },
    ],
  },
  {
    id: 'tbl-5', schema: 'wlyd_dw', name: 'dim_product_category_full',
    comment: '商品品类维度全量表',
    fields: [
      { name: 'category_id', type: 'BIGINT', comment: '品类ID' },
      { name: 'category_name', type: 'VARCHAR(128)', comment: '品类名称' },
      { name: 'parent_category_id', type: 'BIGINT', comment: '父级品类ID' },
      { name: 'category_level', type: 'SMALLINT', comment: '品类层级' },
      { name: 'is_leaf', type: 'TINYINT', comment: '是否叶子节点' },
    ],
  },
  {
    id: 'tbl-6', schema: 'wlyd_report', name: 'ads_channel_conversion_funnel_d1',
    comment: '渠道转化漏斗日报表',
    fields: [
      { name: 'channel_code', type: 'VARCHAR(32)', comment: '渠道编码' },
      { name: 'channel_name', type: 'VARCHAR(64)', comment: '渠道名称' },
      { name: 'exposure_cnt', type: 'BIGINT', comment: '曝光次数' },
      { name: 'click_cnt', type: 'BIGINT', comment: '点击次数' },
      { name: 'conversion_cnt', type: 'BIGINT', comment: '转化次数' },
      { name: 'conversion_rate', type: 'DECIMAL(6,4)', comment: '转化率' },
      { name: 'ds', type: 'VARCHAR(10)', comment: '分区日期yyyyMMdd' },
    ],
  },
];

/* ─── Helpers ─────────────────────────────────── */

let _idCounter = Date.now();
function genId() { return 'id-' + (++_idCounter).toString(36); }

function generateMockResult(sql: string): SuccessResult {
  const columns = ['user_id', 'user_name', 'channel_code', 'pay_amount', 'gmt_created'];
  const channels = ['自然搜索', '微信', '抖音', '小红书', '直接访问', '广告投放'];
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
  const rowCount = 5 + Math.floor(Math.random() * 11);
  const rows: string[][] = [];

  for (let i = 0; i < rowCount; i++) {
    rows.push([
      String(1000 + i),
      names[i % names.length],
      channels[i % channels.length],
      (Math.random() * 5000 + 100).toFixed(2),
      '2026-03-' + String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0'),
    ]);
  }

  return { columns, rows, rowCount, duration: (0.1 + Math.random() * 0.9).toFixed(2) + 's' };
}

function createTab(index: number): TabData {
  return {
    id: genId(),
    title: `查询 ${index}`,
    sql: '',
    result: null,
    viewMode: 'table',
    chartConfig: { type: 'bar', xField: null, yField: null },
    sortCol: null,
    sortDir: null,
    visibleCols: [],
  };
}

/* ─── Sub-components ──────────────────────────── */

function TableListItem({ table, onInsertField }: { table: MockTable; onInsertField: (name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="notebook__table-item">
      <div className="notebook__table-item-header" onClick={() => setExpanded(!expanded)}>
        <span className={`notebook__table-item-icon ${expanded ? 'notebook__table-item-icon--expanded' : ''}`}>&#9654;</span>
        <div className="notebook__table-item-info">
          <div className="notebook__table-item-name">{table.name}</div>
          <div className="notebook__table-item-meta">{table.schema} &middot; {table.comment}</div>
        </div>
      </div>
      {expanded ? (
        <div className="notebook__table-fields">
          {table.fields.map((f) => (
            <div key={f.name} className="notebook__field-item" onClick={() => onInsertField(f.name)} title={`${f.name} — ${f.type} — ${f.comment}`}>
              <span className="notebook__field-name">{f.name}</span>
              <span className="notebook__field-type">{f.type}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultTableView({ tab, onSort }: { tab: TabData; onSort: (colIdx: number) => void }) {
  const r = tab.result as SuccessResult;
  if (!r || 'error' in r) return null;

  const visibleCols = tab.visibleCols.length ? tab.visibleCols : r.columns.map(() => true);

  let rows = [...r.rows];
  if (tab.sortCol !== null && tab.sortDir) {
    const colIdx = tab.sortCol;
    const dir = tab.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const na = parseFloat(a[colIdx]);
      const nb = parseFloat(b[colIdx]);
      if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
      return String(a[colIdx]).localeCompare(String(b[colIdx]), 'zh') * dir;
    });
  }

  return (
    <div className="notebook__result-table-wrap">
      <table className="notebook__result-table">
        <thead>
          <tr>
            {r.columns.map((col, i) =>
              visibleCols[i] ? (
                <th key={col} onClick={() => onSort(i)}>
                  {col}
                  {tab.sortCol === i ? (tab.sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ) : null,
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((val, ci) =>
                visibleCols[ci] ? <td key={ci} title={val}>{val}</td> : null,
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartView({ tab, onUpdateConfig }: { tab: TabData; onUpdateConfig: (key: keyof ChartConfig, value: string | null) => void }) {
  const r = tab.result as SuccessResult;
  if (!r || 'error' in r) return null;

  const cfg = tab.chartConfig;
  const cols = r.columns;

  let xIdx = cfg.xField ? cols.indexOf(cfg.xField) : 0;
  let yIdx = cfg.yField ? cols.indexOf(cfg.yField) : (cols.length > 1 ? 1 : 0);
  if (xIdx < 0) xIdx = 0;
  if (yIdx < 0) yIdx = cols.length > 1 ? 1 : 0;

  const xData = r.rows.map((row) => row[xIdx]);
  const yData = r.rows.map((row) => parseFloat(row[yIdx]) || 0);
  const chartType = cfg.type;

  const option = chartType === 'pie'
    ? { tooltip: { trigger: 'item' as const }, series: [{ type: 'pie' as const, radius: '60%', data: xData.map((x, i) => ({ name: String(x), value: yData[i] })), label: { fontSize: 12 } }] }
    : chartType === 'scatter'
      ? { tooltip: { trigger: 'item' as const }, grid: { left: 60, right: 20, top: 20, bottom: 40 }, xAxis: { type: 'value' as const }, yAxis: { type: 'value' as const }, series: [{ type: 'scatter' as const, data: r.rows.map((row) => [parseFloat(row[xIdx]) || 0, parseFloat(row[yIdx]) || 0]) }] }
      : { tooltip: { trigger: 'axis' as const }, grid: { left: 60, right: 20, top: 20, bottom: 40 }, xAxis: { type: 'category' as const, data: xData.map(String), axisLabel: { fontSize: 11, rotate: xData.length > 8 ? 30 : 0 } }, yAxis: { type: 'value' as const, axisLabel: { fontSize: 11 } }, series: [{ type: chartType, data: yData, smooth: chartType === 'line' }] };

  return (
    <div className="notebook__chart-area">
      <div className="notebook__chart-settings">
        <label>类型:
          <select value={cfg.type} onChange={(e) => onUpdateConfig('type', e.target.value as ChartConfig['type'])}>
            <option value="bar">柱状图</option>
            <option value="line">折线图</option>
            <option value="pie">饼图</option>
            <option value="scatter">散点图</option>
          </select>
        </label>
        <label>X轴:
          <select value={cfg.xField ?? ''} onChange={(e) => onUpdateConfig('xField', e.target.value || null)}>
            <option value="">自动</option>
            {cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Y轴:
          <select value={cfg.yField ?? ''} onChange={(e) => onUpdateConfig('yField', e.target.value || null)}>
            <option value="">自动</option>
            {cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="notebook__chart-container">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────── */

export function NotebookPage() {
  const [tabs, setTabs] = useState<TabData[]>(() => [createTab(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [datasourceFilter, setDatasourceFilter] = useState('');
  const [running, setRunning] = useState(false);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) ?? tabs[0], [tabs, activeTabId]);

  const schemas = useMemo(() => [...new Set(MOCK_TABLES.map((t) => t.schema))], []);

  const filteredTables = useMemo(() => {
    return MOCK_TABLES.filter((t) => {
      if (datasourceFilter && t.schema !== datasourceFilter) return false;
      if (!tableFilter) return true;
      return t.name.toLowerCase().includes(tableFilter.toLowerCase());
    });
  }, [datasourceFilter, tableFilter]);

  /* ─── Tab Management ─────────────────────── */

  const addTab = useCallback(() => {
    const tab = createTab(tabs.length + 1);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs.length]);

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const idx = tabs.findIndex((t) => t.id === tabId);
      const next = tabs.filter((t) => t.id !== tabId);
      setTabs(next);
      if (activeTabId === tabId) {
        setActiveTabId(next[Math.min(idx, next.length - 1)].id);
      }
    },
    [tabs, activeTabId],
  );

  const updateTab = useCallback((tabId: string, patch: Partial<TabData>) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
  }, []);

  /* ─── SQL Execution ──────────────────────── */

  const handleExecute = useCallback(() => {
    const sql = activeTab.sql.trim();
    if (!sql) return;
    setRunning(true);
    updateTab(activeTabId, { result: null, sortCol: null, sortDir: null });

    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      try {
        const result = generateMockResult(sql);
        updateTab(activeTabId, {
          result,
          visibleCols: result.columns.map(() => true),
        });
        setHistory((prev) => [
          { id: genId(), sql, rowCount: result.rowCount, duration: result.duration, executedAt: new Date().toISOString(), error: false },
          ...prev.slice(0, 99),
        ]);
      } catch {
        updateTab(activeTabId, { result: { error: '执行失败' } });
        setHistory((prev) => [
          { id: genId(), sql, rowCount: 0, duration: '0s', executedAt: new Date().toISOString(), error: true },
          ...prev.slice(0, 99),
        ]);
      }
      setRunning(false);
    }, delay);
  }, [activeTab, activeTabId, updateTab]);

  const handleInsertField = useCallback(
    (fieldName: string) => {
      updateTab(activeTabId, { sql: activeTab.sql + fieldName });
    },
    [activeTab.sql, activeTabId, updateTab],
  );

  const handleSort = useCallback(
    (colIdx: number) => {
      let sortCol: number | null = colIdx;
      let sortDir: 'asc' | 'desc' | null = 'asc';
      if (activeTab.sortCol === colIdx) {
        if (activeTab.sortDir === 'asc') {
          sortDir = 'desc';
        } else {
          sortCol = null;
          sortDir = null;
        }
      }
      updateTab(activeTabId, { sortCol, sortDir });
    },
    [activeTab, activeTabId, updateTab],
  );

  const handleUpdateChartConfig = useCallback(
    (key: keyof ChartConfig, value: string | null) => {
      updateTab(activeTabId, {
        chartConfig: { ...activeTab.chartConfig, [key]: value },
      });
    },
    [activeTab, activeTabId, updateTab],
  );

  const handleLoadHistory = useCallback(
    (entry: HistoryEntry) => {
      updateTab(activeTabId, { sql: entry.sql });
      setHistoryOpen(false);
    },
    [activeTabId, updateTab],
  );

  /* ─── Render ─────────────────────────────── */

  const hasResult = activeTab.result && !('error' in activeTab.result);

  return (
    <section className="notebook">
      {/* ─── Left Sidebar ─────────────────── */}
      <aside className="notebook__sidebar">
        <div className="notebook__sidebar-header">
          <div className="notebook__sidebar-title">数据源</div>
          <select
            className="notebook__datasource-select"
            value={datasourceFilter}
            onChange={(e) => setDatasourceFilter(e.target.value)}
          >
            <option value="">全部数据源</option>
            {schemas.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="notebook__sidebar-title" style={{ marginTop: 10 }}>数据表</div>
          <div className="notebook__sidebar-search">
            <input
              type="text"
              placeholder="搜索表名..."
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="notebook__sidebar-list">
          {filteredTables.length === 0 ? (
            <div className="notebook__sidebar-empty">未找到匹配的表</div>
          ) : (
            filteredTables.map((t) => (
              <TableListItem key={t.id} table={t} onInsertField={handleInsertField} />
            ))
          )}
        </div>
      </aside>

      {/* ─── Main Content ─────────────────── */}
      <div className="notebook__content">
        {/* Tab Bar */}
        <div className="notebook__tab-bar">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`notebook__tab-item ${tab.id === activeTabId ? 'notebook__tab-item--active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="notebook__tab-title">{tab.title}</span>
              {tabs.length > 1 ? (
                <span
                  className="notebook__tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  &times;
                </span>
              ) : null}
            </div>
          ))}
          <button type="button" className="notebook__tab-add" onClick={addTab}>+</button>
        </div>

        {/* Workspace */}
        <div className="notebook__workspace">
          <Resizable direction="vertical" defaultSize={240} minSize={80} maxSize={600}>
            {/* Editor Pane */}
            <div className="notebook__editor-pane">
              <div className="notebook__editor-toolbar">
                <Button size="sm" variant="primary" onClick={handleExecute} disabled={running}>
                  {running ? '执行中...' : '\u25B6 执行'}
                </Button>
                <Button size="sm" onClick={() => updateTab(activeTabId, { sql: '' })}>清空</Button>
                <div style={{ flex: 1 }} />
                <Button size="sm" onClick={() => setHistoryOpen(true)}>历史记录</Button>
              </div>
              <div className="notebook__editor-container">
                <Editor
                  height="100%"
                  language="sql"
                  theme="vs"
                  value={activeTab.sql}
                  onChange={(value) => updateTab(activeTabId, { sql: value ?? '' })}
                  options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace",
                    tabSize: 2,
                    wordWrap: 'on',
                    renderLineHighlight: 'line',
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: { vertical: 'auto', horizontal: 'auto' },
                    padding: { top: 8, bottom: 8 },
                  }}
                />
              </div>
            </div>

            {/* Result Pane */}
            <div className="notebook__result-pane">
              {hasResult ? (
                <>
                  <div className="notebook__result-toolbar">
                    <span className="notebook__result-status notebook__result-status--success">
                      {`${(activeTab.result as SuccessResult).rowCount} 行 · ${(activeTab.result as SuccessResult).duration}`}
                    </span>
                    <div style={{ flex: 1 }} />
                    <div className="notebook__btn-group">
                      <button
                        type="button"
                        className={`notebook__btn-toggle ${activeTab.viewMode === 'table' ? 'notebook__btn-toggle--active' : ''}`}
                        onClick={() => updateTab(activeTabId, { viewMode: 'table' })}
                      >
                        表格
                      </button>
                      <button
                        type="button"
                        className={`notebook__btn-toggle ${activeTab.viewMode === 'chart' ? 'notebook__btn-toggle--active' : ''}`}
                        onClick={() => updateTab(activeTabId, { viewMode: 'chart' })}
                      >
                        图表
                      </button>
                    </div>
                  </div>
                  <div className="notebook__result-content">
                    {activeTab.viewMode === 'table' ? (
                      <ResultTableView tab={activeTab} onSort={handleSort} />
                    ) : (
                      <ChartView tab={activeTab} onUpdateConfig={handleUpdateChartConfig} />
                    )}
                  </div>
                </>
              ) : activeTab.result && 'error' in activeTab.result ? (
                <div className="notebook__result-toolbar">
                  <span className="notebook__result-status notebook__result-status--error">
                    错误: {activeTab.result.error}
                  </span>
                </div>
              ) : running ? (
                <div className="notebook__result-empty">
                  <div style={{ color: 'var(--primary, #1677ff)' }}>查询执行中...</div>
                </div>
              ) : (
                <div className="notebook__result-empty">
                  <div className="notebook__result-empty-icon">&#x1F4DD;</div>
                  <div>编写 SQL 后点击执行查看结果</div>
                </div>
              )}
            </div>
          </Resizable>
        </div>
      </div>

      {/* ─── History Drawer ───────────────── */}
      {historyOpen ? (
        <div className="notebook__drawer-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="notebook__drawer" onClick={(e) => e.stopPropagation()}>
            <div className="notebook__drawer-header">
              <span className="notebook__drawer-title">执行历史</span>
              <button type="button" className="notebook__drawer-close" onClick={() => setHistoryOpen(false)}>&times;</button>
            </div>
            <div className="notebook__drawer-body">
              {history.length === 0 ? (
                <div className="notebook__drawer-empty">暂无执行历史</div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="notebook__history-item" onClick={() => handleLoadHistory(h)}>
                    <div className="notebook__history-sql">{h.sql}</div>
                    <div className="notebook__history-meta">
                      <span>{new Date(h.executedAt).toLocaleString('zh-CN')}</span>
                      <span>{h.error ? '失败' : `${h.rowCount} 行`}</span>
                      <span>{h.duration}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}