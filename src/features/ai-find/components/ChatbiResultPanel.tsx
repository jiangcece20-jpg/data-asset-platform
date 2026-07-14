import type { ChatbiResult } from '../../../types/aiFind';
import { aiFindTables } from '../../../mocks/aiFind';

type Props = {
  data: ChatbiResult;
  sourceVisible: boolean;
  onToggleSource: () => void;
  onOpenTable: (tableKey: string) => void;
  onSendQuery: (text: string) => void;
};

/** 查数结果面板：7 种分析类型渲染 + 来源与口径 */
export function ChatbiResultPanel({ data, sourceVisible, onToggleSource, onOpenTable, onSendQuery }: Props) {
  return (
    <div className="ai-find__panel">
      <div className="ai-find__panel-header">
        <span className="ai-find__chatbi-badge">📊 查数结果</span>
        <span className="ai-find__panel-title">{data.rightTitle}</span>
        <button type="button" className="ai-find__btn-outline" onClick={onToggleSource}>
          {sourceVisible ? '收起来源与口径 ↑' : '查看来源与口径 ↓'}
        </button>
      </div>
      <div className="ai-find__panel-body">
        {data.rightContent === 'metric' && <MetricCards data={data} />}
        {(data.rightContent === 'dimension' || data.rightContent === 'rank') && <DimTable data={data} />}
        {data.rightContent === 'trend' && <TrendBlock />}
        {data.rightContent === 'comparison' && <ComparisonBlock data={data} />}
        {data.rightContent === 'share' && <ShareBlock data={data} />}
        {data.rightContent === 'insight' && <InsightBlock data={data} onSendQuery={onSendQuery} />}
        {sourceVisible && <SourcePanel data={data} onOpenTable={onOpenTable} />}
      </div>
    </div>
  );
}

function MetricCards({ data }: { data: ChatbiResult }) {
  return (
    <div className="ai-find__metric-cards">
      {(data.metrics ?? []).map((m) => (
        <div key={m.label} className={m.primary ? 'ai-find__metric-card ai-find__metric-card--primary' : 'ai-find__metric-card'}>
          <div className="ai-find__metric-label">{m.label}</div>
          <div className="ai-find__metric-value">{m.value}</div>
          <div className={`ai-find__metric-change ai-find__metric-change--${m.dir}`}>{m.change}</div>
          <div className="ai-find__metric-period">{m.period}</div>
        </div>
      ))}
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function DimTable({ data }: { data: ChatbiResult }) {
  const rows = data.dimRows ?? [];
  const isRank = data.rightContent === 'rank';
  const maxGmv = rows.length ? parseFloat(rows[0].gmv.replace(/[^0-9.]/g, '')) || 1 : 1;
  return (
    <div className="ai-find__card">
      <div className="ai-find__card-title">
        {isRank ? `🏆 GMV 城市排名 TOP${rows.length}` : '📍 各城市 GMV 分布'}
        <span className="ai-find__card-sub">{isRank ? '昨天 · 按 GMV 降序' : `昨天 · 共 ${rows.length} 个城市`}</span>
      </div>
      <table className="ai-find__table">
        <thead>
          <tr><th>{isRank ? '排名' : '#'}</th><th>城市</th><th>GMV</th><th>{isRank ? '占全国' : '占比'}</th><th>环比上周</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const num = parseFloat(r.gmv.replace(/[^0-9.]/g, '')) || 0;
            const pct = Math.round((num / maxGmv) * 100);
            return (
              <tr key={r.rank}>
                <td>{isRank && r.rank <= 3 ? MEDALS[r.rank - 1] : <span className="ai-find__rank-num">{r.rank}</span>}</td>
                <td>{r.city}</td>
                <td>
                  <span className="ai-find__rank-bar-wrap">
                    <span className="ai-find__rank-bar" style={{ width: `${pct}px` }} />
                    {r.gmv}
                  </span>
                </td>
                <td>{r.pct}</td>
                <td className={r.dir === 'up' ? 'ai-find__num-up' : 'ai-find__num-down'}>{r.wow}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const TREND_VALUES = [820, 910, 880, 1050, 980, 1120, 1080, 1150, 1090, 1200, 1180, 1250, 1220, 1300, 1280, 1350, 1320, 1400, 1380, 1450, 1420, 1480, 1460, 1520, 1500, 1550, 1530, 1580, 1560, 1580];

function TrendBlock() {
  const w = 560; const h = 140; const pad = 20;
  const min = Math.min(...TREND_VALUES); const max = Math.max(...TREND_VALUES);
  const pts = TREND_VALUES.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (TREND_VALUES.length - 1);
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return `${x},${y}`;
  });
  const areaPath = `M${pts[0]} L${pts.join(' L')} L${pad + (w - pad * 2)},${h - pad} L${pad},${h - pad} Z`;
  const last = pts[pts.length - 1].split(',');
  return (
    <>
      <div className="ai-find__card ai-find__card--padded">
        <div className="ai-find__card-title">📈 近 30 天 GMV 趋势<span className="ai-find__card-sub">GMV（万元）</span></div>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="近 30 天 GMV 趋势折线图">
          <defs>
            <linearGradient id="aiFindAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#aiFindAreaGrad)" />
          <path d={`M${pts.join(' L')}`} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r="4" fill="var(--primary)" />
          <text x={pad} y={h - 4} fontSize="10" fill="var(--text-tertiary, #bfbfbf)">6月13日</text>
          <text x={w - pad - 28} y={h - 4} fontSize="10" fill="var(--text-tertiary, #bfbfbf)">7月12日</text>
        </svg>
      </div>
      <div className="ai-find__metric-cards">
        <div className="ai-find__metric-card"><div className="ai-find__metric-label">30天累计</div><div className="ai-find__metric-value">3.68 亿</div><div className="ai-find__metric-change ai-find__metric-change--up">↑12.4% 同比</div></div>
        <div className="ai-find__metric-card"><div className="ai-find__metric-label">日均 GMV</div><div className="ai-find__metric-value">1,227 万</div><div className="ai-find__metric-change ai-find__metric-change--neutral">近30天均值</div></div>
        <div className="ai-find__metric-card"><div className="ai-find__metric-label">最高单日</div><div className="ai-find__metric-value">1,580 万</div><div className="ai-find__metric-change ai-find__metric-change--neutral">7月12日（昨天）</div></div>
      </div>
    </>
  );
}

function ComparisonBlock({ data }: { data: ChatbiResult }) {
  return (
    <>
      <div className="ai-find__metric-cards">
        <div className="ai-find__metric-card ai-find__metric-card--primary"><div className="ai-find__metric-label">本周 GMV（截至昨天）</div><div className="ai-find__metric-value">8,640 万</div><div className="ai-find__metric-change ai-find__metric-change--up">↑9.3% 对比上周同期</div></div>
        <div className="ai-find__metric-card"><div className="ai-find__metric-label">上周同期 GMV</div><div className="ai-find__metric-value">7,905 万</div><div className="ai-find__metric-change ai-find__metric-change--neutral">周一至周五</div></div>
        <div className="ai-find__metric-card"><div className="ai-find__metric-label">增量</div><div className="ai-find__metric-value">+735 万</div><div className="ai-find__metric-change ai-find__metric-change--up">↑9.3%</div></div>
      </div>
      <div className="ai-find__card">
        <div className="ai-find__card-title">📅 逐日对比</div>
        <table className="ai-find__table">
          <thead><tr><th>日期</th><th>本周 GMV</th><th>上周 GMV</th><th>差值</th></tr></thead>
          <tbody>
            {(data.compareRows ?? []).map((r) => (
              <tr key={r.day}>
                <td>{r.day}</td>
                <td className="ai-find__num-strong">{r.cur}</td>
                <td className="ai-find__num-muted">{r.prev}</td>
                <td className={r.dir === 'up' ? 'ai-find__num-up' : r.dir === 'down' ? 'ai-find__num-down' : 'ai-find__num-muted'}>{r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ShareBlock({ data }: { data: ChatbiResult }) {
  return (
    <div className="ai-find__card ai-find__card--padded">
      <div className="ai-find__card-title">🥧 各渠道 GMV 占比<span className="ai-find__card-sub">昨天 · 合计 1.23 亿</span></div>
      {(data.shareRows ?? []).map((r) => (
        <div key={r.name} className="ai-find__share-row">
          <span className="ai-find__share-name">{r.name}</span>
          <span className="ai-find__share-track">
            <span className="ai-find__share-fill" style={{ width: `${r.pct}%` }}>{r.pct}%</span>
          </span>
          <span className="ai-find__share-value">{r.value}</span>
          <span className={r.dir === 'up' ? 'ai-find__num-up' : 'ai-find__num-down'}>{r.wow}</span>
        </div>
      ))}
      <div className="ai-find__hint">环比列为占比的百分点（pp）变化，对比上周同日</div>
    </div>
  );
}

function InsightBlock({ data, onSendQuery }: { data: ChatbiResult; onSendQuery: (text: string) => void }) {
  const ins = data.insight;
  if (!ins) return null;
  return (
    <>
      <div className="ai-find__card ai-find__card--padded ai-find__card--accent">
        <div className="ai-find__card-title">💡 核心结论</div>
        <div className="ai-find__insight-conclusion">{ins.conclusion}</div>
      </div>
      <div className="ai-find__card ai-find__card--padded">
        <div className="ai-find__card-title">📊 增量归因 · 按渠道<span className="ai-find__card-sub">环比增量 +930 万的构成</span></div>
        {ins.drivers.map((d) => (
          <div key={d.name} className="ai-find__share-row">
            <span className="ai-find__share-name">{d.name}</span>
            <span className="ai-find__share-track ai-find__share-track--thin">
              <span className="ai-find__share-fill" style={{ width: `${d.pct}%` }} />
            </span>
            <span className="ai-find__num-up">{d.diff}</span>
            <span className="ai-find__num-muted">贡献 {d.pct}%</span>
          </div>
        ))}
      </div>
      <div className="ai-find__card ai-find__card--padded">
        <div className="ai-find__card-title">🔍 异常检测</div>
        {ins.anomalies.map((a) => (
          <div key={a.text} className={a.level === 'warn' ? 'ai-find__anomaly ai-find__anomaly--warn' : 'ai-find__anomaly'}>
            <span>{a.level === 'warn' ? '⚠️' : 'ℹ️'}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </div>
      <div className="ai-find__card ai-find__card--padded">
        <div className="ai-find__card-title">👉 继续分析</div>
        <div className="ai-find__guide-tags">
          {ins.nextSteps.map((g) => (
            <button key={g} type="button" className="ai-find__guide-tag" onClick={() => onSendQuery(g)}>{g}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function SourcePanel({ data, onOpenTable }: { data: ChatbiResult; onOpenTable: (tableKey: string) => void }) {
  const s = data.source;
  const hasTable = Boolean(aiFindTables[s.table]);
  return (
    <div className="ai-find__card ai-find__card--padded" data-testid="chatbi-source">
      <div className="ai-find__card-title">
        数据来源与口径
        {hasTable && (
          <button type="button" className="ai-find__btn-outline ai-find__btn-right" onClick={() => onOpenTable(s.table)}>
            打开来源表 →
          </button>
        )}
      </div>
      <div className="ai-find__source-row"><span className="ai-find__source-label">取数方式</span><span>{s.via}</span></div>
      <div className="ai-find__source-row">
        <span className="ai-find__source-label">来源表</span>
        {hasTable ? (
          <button type="button" className="ai-find__source-code ai-find__source-link" onClick={() => onOpenTable(s.table)}>{s.table} ↗</button>
        ) : (
          <span className="ai-find__source-code">{s.table}</span>
        )}
      </div>
      <div className="ai-find__source-row"><span className="ai-find__source-label">指标字段</span><span className="ai-find__source-code">{s.field}</span></div>
      <div className="ai-find__source-row"><span className="ai-find__source-label">时间条件</span><span className="ai-find__source-code">{s.time}</span></div>
      <div className="ai-find__caliber-box"><strong>📐 指标口径：</strong>{data.caliber}</div>
    </div>
  );
}
