import { useState, useMemo } from 'react';
import { ChatInterface, type ChatMessage } from '../../components/interaction/ChatInterface';
import { Select } from '../../components/forms/Select';
import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
import './ai-find.css';

type Role = '业务运营' | '产品经理' | '管理层' | '数据分析师' | '数仓开发';
type WorkspaceView = 'empty' | 'resource' | 'chatbi';

type RecommendedResource = {
  name: string;
  displayName: string;
  type: 'report' | 'dashboard' | 'table' | 'api';
  description: string;
  reason: string;
  perm: 'ok' | 'apply' | 'pending';
  owner: string;
  source: string;
  heat: string;
  tip?: string;
};

const roleOptions = [
  { value: '业务运营', label: '\uD83D\uDCCA 业务运营' },
  { value: '产品经理', label: '\uD83C\uDFAF 产品经理' },
  { value: '管理层', label: '\uD83D\uDC54 管理层' },
  { value: '数据分析师', label: '\uD83D\uDD2C 数据分析师' },
  { value: '数仓开发', label: '\u2699\uFE0F 数仓开发' },
];

const guideQuestions = [
  '\uD83D\uDCCA 各渠道 GMV 表现',
  '\uD83D\uDC64 用户留存相关报表',
  '\uD83D\uDD17 order 表在数仓里是哪张',
  '\uD83D\uDE9A 配送时效看板',
  '\uD83D\uDD22 昨天 GMV 是多少',
  '\uD83D\uDCCD GMV 按城市分布',
  '\uD83D\uDCC8 近 30 天 GMV 趋势',
  '\u2696\uFE0F 本周 vs 上周 GMV',
];

const mockResources: RecommendedResource[] = [
  { name: 'rpt_channel_gmv_daily', displayName: '渠道 GMV 日报', type: 'report', description: '按渠道统计每天GMV、订单量、退款率，每日T+1更新', reason: '匹配"渠道+GMV"关键词', perm: 'ok', owner: '李四', source: 'BI 平台', heat: '2,341 次' },
  { name: 'dashboard_ops_overview', displayName: '运营大盘看板', type: 'dashboard', description: 'GMV、DAU、转化率等核心指标实时看板', reason: '运营核心看板', perm: 'ok', owner: '王五', source: 'BI 平台', heat: '5,120 次' },
  { name: 'dws_trade_channel_day', displayName: '渠道交易日汇总表', type: 'table', description: 'DWS汇总层，按渠道+日期粒度，含GMV、订单量、退款金额', reason: '底层数据支撑', perm: 'apply', owner: '赵六', source: 'MaxCompute', heat: '1,890 次', tip: '申请后可查看字段详情和样例数据' },
];

const mockChatBIData = {
  summary: '昨天 GMV',
  metrics: [
    { label: 'GMV', value: '1.23 亿', change: '+930 万', dir: 'up' as const, period: '环比' },
    { label: '订单量', value: '8.9 万', change: '+5.2%', dir: 'up' as const, period: '同比' },
    { label: '客单价', value: '138 元', change: '-1.3%', dir: 'down' as const, period: '环比' },
  ],
  cityData: [
    { city: '北京', amount: '3,240 万', percent: '26.3%' },
    { city: '上海', amount: '2,980 万', percent: '24.2%' },
    { city: '广州', amount: '1,870 万', percent: '15.2%' },
    { city: '深圳', amount: '1,650 万', percent: '13.4%' },
    { city: '杭州', amount: '1,120 万', percent: '9.1%' },
  ],
};

const followUpOptions = ['加上环比', '只看华东区', '按城市分布', '最近7天趋势'];

function typeLabel(type: RecommendedResource['type']): string {
  return type === 'report' ? '报表' : type === 'dashboard' ? '看板' : type === 'table' ? '表' : 'API';
}

function typeTone(type: RecommendedResource['type']): 'success' | 'purple' | 'blue' | 'warning' {
  return type === 'report' ? 'success' : type === 'dashboard' ? 'purple' : type === 'table' ? 'blue' : 'warning';
}

function permLabel(perm: RecommendedResource['perm']): string {
  return perm === 'ok' ? '已有权限' : perm === 'apply' ? '申请权限' : '申请中';
}

function permTone(perm: RecommendedResource['perm']): 'success' | 'warning' | 'gray' {
  return perm === 'ok' ? 'success' : perm === 'apply' ? 'warning' : 'gray';
}

function ResourceCard({ resource, selected, onClick }: { resource: RecommendedResource; selected: boolean; onClick: () => void }) {
  return (
    <div className={`ai-find__resource-card ${selected ? 'ai-find__resource-card--selected' : ''}`} onClick={onClick}>
      <div className="ai-find__resource-card-head">
        <Tag tone={typeTone(resource.type)}>{typeLabel(resource.type)}</Tag>
        <Tag tone={permTone(resource.perm)}>{permLabel(resource.perm)}</Tag>
      </div>
      <div className="ai-find__resource-card-name">{resource.displayName}</div>
      <div className="ai-find__resource-card-desc">{resource.description}</div>
      <div className="ai-find__resource-card-reason">{resource.reason}</div>
      <div className="ai-find__resource-card-meta">
        <span>{resource.owner}</span>
        <span>{resource.heat}</span>
      </div>
    </div>
  );
}

function EmptyWorkspace() {
  return (
    <div className="ai-find__empty">
      <div className="ai-find__empty-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <h3>用自然语言找数据</h3>
      <p>描述你想查询的数据，AI会为你推荐最匹配的资源，还可以一键生成SQL查数。</p>
      <div className="ai-find__empty-steps">
        <div className="ai-find__empty-step">
          <span className="ai-find__step-num">1</span>
          <span>输入问题或选择引导标签</span>
        </div>
        <div className="ai-find__empty-step">
          <span className="ai-find__step-num">2</span>
          <span>浏览推荐资源，查看详情</span>
        </div>
        <div className="ai-find__empty-step">
          <span className="ai-find__step-num">3</span>
          <span>配置SQL或查看ChatBI结果</span>
        </div>
      </div>
    </div>
  );
}

function ResourceDetail({ resource, onSQLConfig }: { resource: RecommendedResource; onSQLConfig: () => void }) {
  return (
    <div className="ai-find__detail">
      <div className="ai-find__detail-header">
        <div>
          <Tag tone={typeTone(resource.type)}>{typeLabel(resource.type)}</Tag>
          <h3>{resource.displayName}</h3>
          <span className="ai-find__detail-en">{resource.name}</span>
        </div>
        <div className="ai-find__detail-actions">
          <Tag tone={permTone(resource.perm)}>{permLabel(resource.perm)}</Tag>
          {resource.type === 'report' || resource.type === 'dashboard' ? (
            <Button variant="primary" size="sm">查看{typeLabel(resource.type)}</Button>
          ) : null}
        </div>
      </div>
      <div className="ai-find__detail-meta">
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">负责人</span><span>{resource.owner}</span></div>
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">来源</span><span>{resource.source}</span></div>
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">查询热度</span><span>{resource.heat}</span></div>
        <div className="ai-find__meta-item"><span className="ai-find__meta-label">权限</span><span className={`ai-find__perm--${resource.perm}`}>{permLabel(resource.perm)}</span></div>
      </div>
      {resource.tip ? (
        <div className="ai-find__detail-tip">{resource.tip}</div>
      ) : null}
      <div className="ai-find__detail-sql-bar">
        <span>SQL 辅助</span>
        <Button variant="primary" size="sm" onClick={onSQLConfig}>配置SQL</Button>
      </div>
    </div>
  );
}

function ChatBIResult() {
  return (
    <div className="ai-find__chatbi">
      <div className="ai-find__chatbi-header">
        <h3>ChatBI 查数结果</h3>
      </div>
      <div className="ai-find__metric-cards">
        {mockChatBIData.metrics.map((m) => (
          <div key={m.label} className="ai-find__metric-card">
            <span className="ai-find__metric-label">{m.label}</span>
            <span className="ai-find__metric-value">{m.value}</span>
            <span className={`ai-find__metric-change ai-find__metric-change--${m.dir}`}>
              {m.dir === 'up' ? '\u2191' : '\u2193'} {m.change}
            </span>
            <span className="ai-find__metric-period">{m.period}</span>
          </div>
        ))}
      </div>
      <div className="ai-find__city-table">
        <table>
          <thead>
            <tr>
              <th>城市</th>
              <th>GMV</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {mockChatBIData.cityData.map((row) => (
              <tr key={row.city}>
                <td>{row.city}</td>
                <td>{row.amount}</td>
                <td>{row.percent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

let nextMsgId = 0;

export function AIFindDataPage() {
  const [role, setRole] = useState<Role>('业务运营');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('empty');
  const [selectedResource, setSelectedResource] = useState<RecommendedResource | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [sqlConfigOpen, setSqlConfigOpen] = useState(false);
  const [sqlDimensions, setSqlDimensions] = useState<string[]>(['渠道']);
  const [sqlMetrics, setSqlMetrics] = useState<string[]>(['GMV']);
  const [sqlTimeRange, setSqlTimeRange] = useState('近7天');
  const [generatedSQL, setGeneratedSQL] = useState('');

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = { id: `msg-${nextMsgId++}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);
    setFollowUps([]);
    setWorkspaceView('resource');

    setTimeout(() => {
      const aiContent = (
        <div>
          <p>根据你的角色（{role}），优先为你推荐了以下资源：</p>
          <div className="ai-find__inline-resources">
            {mockResources.map((r) => (
              <ResourceCard
                key={r.name}
                resource={r}
                selected={selectedResource?.name === r.name}
                onClick={() => setSelectedResource(r)}
              />
            ))}
          </div>
        </div>
      );
      const aiMsg: ChatMessage = { id: `msg-${nextMsgId++}`, role: 'ai', content: aiContent };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
      setFollowUps(followUpOptions);
    }, 800);
  };

  const handleSQLConfig = () => {
    setSqlConfigOpen(true);
  };

  const handleGenerateSQL = () => {
    const sql = `SELECT\n  channel_name AS 渠道,\n  trade_date AS 日期,\n  SUM(gmv_amount) AS GMV,\n  COUNT(order_id) AS 订单量\nFROM dws_trade_channel_day\nWHERE trade_date >= DATE_SUB(CURRENT_DATE, 7)\nGROUP BY channel_name, trade_date\nORDER BY GMV DESC\nLIMIT 100;`;
    setGeneratedSQL(sql);
  };

  const handleResetSQL = () => {
    setSqlDimensions(['渠道']);
    setSqlMetrics(['GMV']);
    setSqlTimeRange('近7天');
    setGeneratedSQL('');
  };

  const toggleDimension = (dim: string) => {
    setSqlDimensions((prev) => prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]);
  };

  const toggleMetric = (met: string) => {
    setSqlMetrics((prev) => prev.includes(met) ? prev.filter((m) => m !== met) : [...prev, met]);
  };

  const availableDimensions = ['渠道', '城市', '省份', '品类', '品牌'];
  const availableMetrics = ['GMV', '订单量', '客单价', '退款率', 'DAU'];

  const chatHeader = (
    <>
      <div className="ai-find__chat-title">
        <div className="ai-find__ai-icon">AI</div>
        <div>
          <div className="ai-find__chat-title-text">AI 找数</div>
          <div className="ai-find__chat-title-sub">智能推荐 + SQL生成</div>
        </div>
      </div>
      <div className="ai-find__chat-header-actions">
        <Select
          options={roleOptions}
          value={role}
          onChange={(v) => setRole(v as Role)}
          className="ai-find__role-select"
        />
        <Button size="sm" onClick={() => { setMessages([]); setSelectedResource(null); setWorkspaceView('empty'); setFollowUps([]); setGeneratedSQL(''); setSqlConfigOpen(false); }}>
          新对话
        </Button>
      </div>
    </>
  );

  return (
    <section className="ai-find">
      <div className="ai-find__chat-panel">
        <ChatInterface
          messages={messages}
          onSend={handleSend}
          header={chatHeader}
          guides={guideQuestions}
          followUps={followUps}
          typing={typing}
        />
      </div>
      <div className="ai-find__workspace">
        {workspaceView === 'empty' ? (
          <EmptyWorkspace />
        ) : null}
        {workspaceView === 'resource' && selectedResource ? (
          <>
            <ResourceDetail resource={selectedResource} onSQLConfig={handleSQLConfig} />
            {sqlConfigOpen ? (
              <div className="ai-find__sql-config">
                <div className="ai-find__sql-config-toggle" onClick={() => setSqlConfigOpen(!sqlConfigOpen)}>
                  <span>SQL 配置</span>
                  <span className={`ai-find__sql-arrow ${sqlConfigOpen ? 'ai-find__sql-arrow--open' : ''}`}>&#9662;</span>
                </div>
                <div className="ai-find__sql-config-body">
                  <div className="ai-find__sql-field">
                    <label>分组维度</label>
                    <div className="ai-find__chips">
                      {availableDimensions.map((dim) => (
                        <button
                          key={dim}
                          type="button"
                          className={`ai-find__chip ${sqlDimensions.includes(dim) ? 'ai-find__chip--selected' : ''}`}
                          onClick={() => toggleDimension(dim)}
                        >
                          {dim}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-find__sql-field">
                    <label>指标</label>
                    <div className="ai-find__chips">
                      {availableMetrics.map((met) => (
                        <button
                          key={met}
                          type="button"
                          className={`ai-find__chip ${sqlMetrics.includes(met) ? 'ai-find__chip--selected' : ''}`}
                          onClick={() => toggleMetric(met)}
                        >
                          {met}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ai-find__sql-field">
                    <label>时间范围</label>
                    <Select
                      options={[
                        { value: '近7天', label: '近7天' },
                        { value: '近30天', label: '近30天' },
                        { value: '近90天', label: '近90天' },
                        { value: '本年', label: '本年' },
                      ]}
                      value={sqlTimeRange}
                      onChange={(v) => setSqlTimeRange(v)}
                    />
                  </div>
                  <div className="ai-find__sql-actions">
                    <Button variant="primary" size="sm" onClick={handleGenerateSQL}>生成SQL</Button>
                    <Button size="sm" onClick={handleResetSQL}>重置</Button>
                  </div>
                </div>
                {generatedSQL ? (
                  <div className="ai-find__sql-result">
                    <pre className="ai-find__sql-code">{generatedSQL}</pre>
                    <div className="ai-find__sql-result-actions">
                      <Button size="sm" onClick={() => navigator.clipboard.writeText(generatedSQL)}>复制SQL</Button>
                      <Button size="sm">在工作台执行</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!sqlConfigOpen && workspaceView === 'resource' ? (
              <Button className="ai-find__view-chatbi" onClick={() => setWorkspaceView('chatbi')}>查看 ChatBI 结果</Button>
            ) : null}
          </>
        ) : null}
        {workspaceView === 'chatbi' ? <ChatBIResult /> : null}
      </div>
    </section>
  );
}