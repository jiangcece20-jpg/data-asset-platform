import { useCallback, useEffect, useRef, useState } from 'react';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { toast } from '../../components/feedback/Toast';
import {
  aiFindAmbiguousAsks,
  aiFindChatbi,
  aiFindMetrics,
  aiFindQueries,
  aiFindRecentQueries,
  aiFindTables,
  aiFindWelcomeGuides,
} from '../../mocks/aiFind';
import type { AssetCard, ChatEntry, ChatbiResult, QueryCtx, RightPanel } from '../../types/aiFind';
import { AssetDetailDrawer, type DrawerTarget } from './components/AssetDetailDrawer';
import { ChatbiResultPanel } from './components/ChatbiResultPanel';
import { ReportPreviewPanel } from './components/ReportPreviewPanel';
import { TableInfoPanel } from './components/TableInfoPanel';
import { routeQuery } from './intent';
import './ai-find.css';

const REPLY_DELAY_MS = 700;
let entryId = 0;
const nextId = () => ++entryId;

/** 联合类型的分布式 Omit（普通 Omit 会把联合坍缩成公共属性） */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type ChatEntryInput = DistributiveOmit<ChatEntry, 'id'>;

export function AIFindDataPage() {
  const [entries, setEntries] = useState<ChatEntry[]>([{ id: nextId(), role: 'ai', kind: 'welcome' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>({ view: 'empty' });
  const [ctx, setCtx] = useState<QueryCtx>(null);
  const [ctxLabel, setCtxLabel] = useState<string | null>(null);
  const [sourceVisible, setSourceVisible] = useState(true);
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const askCountRef = useRef(0);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, typing]);

  const append = useCallback((entry: ChatEntryInput) => {
    setEntries((prev) => [...prev, { ...entry, id: nextId() } as ChatEntry]);
  }, []);

  const openTable = useCallback((tableKey: string) => {
    const table = aiFindTables[tableKey];
    if (!table) return;
    setRightPanel({ view: 'table', table });
    setCtxLabel(`正在用表：${table.name}`);
  }, []);

  const openChatbi = useCallback((result: ChatbiResult) => {
    setSourceVisible(true);
    setRightPanel({ view: 'chatbi', data: result });
  }, []);

  /** 执行路由结果 → 对话流 + 右侧面板 */
  const dispatch = useCallback((text: string) => {
    const { action } = routeQuery(text, ctx, askCountRef.current);
    switch (action.kind) {
      case 'chatbi': {
        askCountRef.current = 0;
        const result = aiFindChatbi[action.chatbiKey];
        let metricName: string | null = null;
        for (const [name, m] of Object.entries(aiFindMetrics)) {
          if (m.chatbi && Object.values(m.chatbi).includes(action.chatbiKey)) { metricName = name; break; }
        }
        setCtx({ metric: metricName });
        setCtxLabel(`${metricName ?? ''} 查数 · ${result.summaryLabel}`);
        append({ role: 'ai', kind: 'chatbiSummary', result, fromCtx: action.fromCtx });
        openChatbi(result);
        break;
      }
      case 'find': {
        askCountRef.current = 0;
        const data = aiFindQueries[action.findKey];
        let metricName: string | null = null;
        for (const [name, m] of Object.entries(aiFindMetrics)) {
          if (m.find === action.findKey) { metricName = name; break; }
        }
        setCtx({ metric: metricName });
        setCtxLabel(`当前话题：${data.ctxLabel}`);
        append({ role: 'ai', kind: 'cards', findKey: action.findKey, note: action.note });
        break;
      }
      case 'confirmMetric':
        append({ role: 'ai', kind: 'confirmMetric', term: action.term, candidates: action.candidates, rawText: text });
        break;
      case 'definition':
        setCtx({ metric: action.metric });
        setCtxLabel(`${action.metric} · 口径咨询`);
        append({ role: 'ai', kind: 'definition', metric: action.metric, fromCtx: action.fromCtx });
        break;
      case 'forecast':
        append({ role: 'ai', kind: 'forecast' });
        break;
      case 'detailTable':
        append({ role: 'ai', kind: 'detailTable', tableKey: action.tableKey });
        openTable(action.tableKey);
        break;
      case 'mappingNotFound':
        append({ role: 'ai', kind: 'mappingNotFound', text });
        break;
      case 'ask':
        askCountRef.current += 1;
        append({ role: 'ai', kind: 'ask', askKey: action.askKey });
        break;
      case 'notFound':
        askCountRef.current = 0;
        append({ role: 'ai', kind: 'notFound', text });
        break;
    }
  }, [append, ctx, openChatbi, openTable]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setInput('');
    append({ role: 'user', text });
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      dispatch(text);
    }, REPLY_DELAY_MS);
  }, [append, dispatch, typing]);

  const newChat = useCallback(() => {
    setEntries([{ id: nextId(), role: 'ai', kind: 'welcome' }]);
    setRightPanel({ view: 'empty' });
    setCtx(null);
    setCtxLabel(null);
    askCountRef.current = 0;
  }, []);

  const useAsset = useCallback((asset: AssetCard) => {
    if (asset.type === 'table' && asset.tableKey) openTable(asset.tableKey);
    else {
      setRightPanel({ view: 'preview', asset });
      setCtxLabel(`正在预览：${asset.name}`);
    }
  }, [openTable]);

  return (
    <div className="ai-find">
      {/* 左侧对话区 */}
      <div className="ai-find__chat">
        <div className="ai-find__chat-header">
          <div className="ai-find__ai-icon">AI</div>
          <div className="ai-find__chat-header-info">
            <div className="ai-find__chat-title">AI 找数</div>
            <div className="ai-find__chat-sub">先找到数据，再直接用起来</div>
          </div>
          <button type="button" className="ai-find__btn-outline" onClick={newChat}>+ 新对话</button>
        </div>

        <div className="ai-find__chat-body" ref={chatBodyRef}>
          {entries.map((entry) => (
            <ChatEntryView key={entry.id} entry={entry} onSend={send} onUseAsset={useAsset} onOpenChatbi={openChatbi} onOpenDrawer={setDrawer} />
          ))}
          {typing && (
            <div className="ai-find__msg ai-find__msg--ai">
              <div className="ai-find__avatar ai-find__avatar--ai">AI</div>
              <div className="ai-find__bubble ai-find__typing" aria-label="正在输入"><span /><span /><span /></div>
            </div>
          )}
        </div>

        {ctxLabel && (
          <div className="ai-find__ctx-bar">
            <span>🧠</span>
            <span className="ai-find__ctx-label">当前上下文：{ctxLabel}</span>
            <button type="button" className="ai-find__ctx-clear" onClick={() => { setCtx(null); setCtxLabel(null); }} aria-label="清除上下文">✕</button>
          </div>
        )}

        <div className="ai-find__chat-footer">
          <textarea
            className="ai-find__input"
            rows={1}
            placeholder="描述你想找的数据，或输入业务库表名…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <button type="button" className="ai-find__send" onClick={() => send(input)} disabled={typing} aria-label="发送">➤</button>
        </div>
      </div>

      {/* 右侧工作区（四态） */}
      <div className="ai-find__workspace">
        {rightPanel.view === 'empty' && <EmptyWorkspace onSend={send} />}
        {rightPanel.view === 'chatbi' && (
          <ChatbiResultPanel
            data={rightPanel.data}
            sourceVisible={sourceVisible}
            onToggleSource={() => setSourceVisible((v) => !v)}
            onOpenTable={openTable}
            onSendQuery={send}
          />
        )}
        {rightPanel.view === 'preview' && (
          <ReportPreviewPanel asset={rightPanel.asset} onOpenDetail={() => setDrawer({ kind: 'asset', asset: rightPanel.asset })} />
        )}
        {rightPanel.view === 'table' && (
          <TableInfoPanel table={rightPanel.table} onOpenDetail={() => setDrawer({ kind: 'table', table: rightPanel.table })} />
        )}
      </div>

      {drawer && <AssetDetailDrawer target={drawer} onClose={() => setDrawer(null)} onOpenTable={openTable} />}
    </div>
  );
}

/* ── 对话条目渲染 ───────────────────────────────────────── */

type EntryViewProps = {
  entry: ChatEntry;
  onSend: (text: string) => void;
  onUseAsset: (asset: AssetCard) => void;
  onOpenChatbi: (result: ChatbiResult) => void;
  onOpenDrawer: (target: DrawerTarget) => void;
};

function ChatEntryView({ entry, onSend, onUseAsset, onOpenChatbi, onOpenDrawer }: EntryViewProps) {
  if (entry.role === 'user') {
    return (
      <div className="ai-find__msg ai-find__msg--user">
        <div className="ai-find__avatar ai-find__avatar--user">我</div>
        <div className="ai-find__bubble">{entry.text}</div>
      </div>
    );
  }

  return (
    <div className="ai-find__msg ai-find__msg--ai">
      <div className="ai-find__avatar ai-find__avatar--ai">AI</div>
      <div className="ai-find__msg-content">
        <AiEntryBody entry={entry} onSend={onSend} onUseAsset={onUseAsset} onOpenChatbi={onOpenChatbi} onOpenDrawer={onOpenDrawer} />
      </div>
    </div>
  );
}

function AiEntryBody({ entry, onSend, onUseAsset, onOpenChatbi, onOpenDrawer }: EntryViewProps) {
  switch (entry.role === 'ai' ? entry.kind : '') {
    case 'welcome':
      return (
        <>
          <div className="ai-find__bubble">
            你好！告诉我你想找什么数据，我来帮你定位，并且直接用起来：<br />
            · 报表 / 看板 → 右侧直接预览<br />
            · 表 → 查看表结构，一键带到即席查询<br />
            · 指标类问题（如“昨天 GMV 是多少”）→ 直接给数
          </div>
          <div className="ai-find__guide-tags">
            {aiFindWelcomeGuides.map((g) => (
              <button key={g} type="button" className="ai-find__guide-tag" onClick={() => onSend(g)}>{g}</button>
            ))}
          </div>
        </>
      );
    case 'cards': {
      if (entry.role !== 'ai' || entry.kind !== 'cards') return null;
      const data = aiFindQueries[entry.findKey];
      return (
        <>
          <div className="ai-find__bubble">{entry.note ?? data.intent}</div>
          <div className="ai-find__cards">
            {data.results.map((asset) => (
              <AssetCardView key={asset.name} asset={asset} onUse={() => onUseAsset(asset)} onDetail={() => onOpenDrawer(asset.type === 'table' && asset.tableKey ? { kind: 'table', table: aiFindTables[asset.tableKey] } : { kind: 'asset', asset })} />
            ))}
          </div>
          <div className="ai-find__guide-tags">
            {data.guides.map((g) => (
              <button key={g} type="button" className="ai-find__guide-tag" onClick={() => onSend(g)}>{g}</button>
            ))}
          </div>
        </>
      );
    }
    case 'chatbiSummary': {
      if (entry.role !== 'ai' || entry.kind !== 'chatbiSummary') return null;
      const r = entry.result;
      return (
        <>
          {entry.fromCtx && <div className="ai-find__ctx-note">🧠 已沿用上下文理解你的追问</div>}
          <button type="button" className="ai-find__chatbi-summary" onClick={() => onOpenChatbi(r)}>
            <div className="ai-find__chatbi-summary-label">📊 {r.summaryLabel}</div>
            <div className="ai-find__chatbi-summary-metrics">
              {r.summaryMetrics.map((m) => (
                <span key={m.label} className="ai-find__chatbi-summary-metric">
                  <span className="ai-find__chatbi-summary-metric-label">{m.label}</span>
                  <span className="ai-find__chatbi-summary-metric-value">{m.value}</span>
                  {m.change && <span className={`ai-find__metric-change ai-find__metric-change--${m.dir}`}>{m.change}</span>}
                </span>
              ))}
            </div>
            <div className="ai-find__hint">点击查看完整图表、来源与口径 →</div>
          </button>
        </>
      );
    }
    case 'ask': {
      if (entry.role !== 'ai' || entry.kind !== 'ask') return null;
      const ask = aiFindAmbiguousAsks[entry.askKey];
      return (
        <>
          <div className="ai-find__bubble">{ask.ask}</div>
          <div className="ai-find__ask-options">
            {ask.options.map((o) => (
              <button key={o} type="button" className="ai-find__ask-option" onClick={() => onSend(o)}>{o}</button>
            ))}
          </div>
        </>
      );
    }
    case 'confirmMetric': {
      if (entry.role !== 'ai' || entry.kind !== 'confirmMetric') return null;
      return (
        <>
          <div className="ai-find__bubble">「{entry.term}」可能对应 {entry.candidates.length} 个指标，口径不一样，确认下你要哪个：</div>
          <div className="ai-find__ask-options">
            {entry.candidates.map((name) => {
              const m = aiFindMetrics[name];
              const brief = m.caliber.split('。')[0];
              return (
                <button key={name} type="button" className="ai-find__ask-option ai-find__ask-option--rich" onClick={() => onSend(entry.rawText.split(entry.term).join(name))}>
                  <strong>{name}</strong>
                  <span>{brief} · {m.chatbi ? '已接入直接查数' : '未接入查数，可推荐相关资产'}</span>
                </button>
              );
            })}
          </div>
        </>
      );
    }
    case 'definition': {
      if (entry.role !== 'ai' || entry.kind !== 'definition') return null;
      const m = aiFindMetrics[entry.metric];
      return (
        <>
          {entry.fromCtx && <div className="ai-find__ctx-note">🧠 已沿用上下文「{entry.metric}」</div>}
          <div className="ai-find__bubble">「{entry.metric}」的指标口径如下（来自指标注册表，未执行查询）：</div>
          <div className="ai-find__caliber-box"><strong>📐 {entry.metric}：</strong>{m.caliber}</div>
          <div className="ai-find__guide-tags">
            {m.chatbi && <button type="button" className="ai-find__guide-tag" onClick={() => onSend(`昨天 ${entry.metric} 是多少`)}>🔢 直接看昨天的数</button>}
            <button type="button" className="ai-find__guide-tag" onClick={() => onSend(`${entry.metric} 相关报表`)}>🔍 找 {entry.metric} 相关资产</button>
          </div>
        </>
      );
    }
    case 'forecast':
      return (
        <>
          <div className="ai-find__bubble">预测类问题目前还不支持（在规划中）。可以先看历史趋势自行判断走向：</div>
          <div className="ai-find__guide-tags">
            <button type="button" className="ai-find__guide-tag" onClick={() => onSend('最近 30 天 GMV 趋势')}>📈 近 30 天 GMV 趋势</button>
            <button type="button" className="ai-find__guide-tag" onClick={() => onSend('本周 GMV 和上周对比')}>⚖️ 本周 vs 上周 GMV</button>
          </div>
        </>
      );
    case 'detailTable': {
      if (entry.role !== 'ai' || entry.kind !== 'detailTable') return null;
      const table = aiFindTables[entry.tableKey];
      return (
        <div className="ai-find__bubble">
          明细类问题建议直接查明细表。已为你打开 <strong>{table.name}</strong>（{table.cnName}），右侧可查看表结构，查询明细请从那里去即席查询工作台。
        </div>
      );
    }
    case 'mappingNotFound': {
      if (entry.role !== 'ai' || entry.kind !== 'mappingNotFound') return null;
      return (
        <>
          <div className="ai-find__bubble">血缘映射里没找到业务库表「{entry.text}」对应的数仓表（演示库只收录了 order 表）。可以确认一下表名，或直接描述业务需求。</div>
          <div className="ai-find__guide-tags">
            <button type="button" className="ai-find__guide-tag" onClick={() => onSend('order 表在数仓里是哪张')}>🔗 order 表在数仓里是哪张</button>
          </div>
        </>
      );
    }
    case 'notFound': {
      if (entry.role !== 'ai' || entry.kind !== 'notFound') return null;
      return (
        <>
          <div className="ai-find__bubble">没有找到与「{entry.text}」直接相关的数据资产。可以换个说法（比如带上业务域、指标名），或者从这些方向开始：</div>
          <div className="ai-find__guide-tags">
            {['各渠道 GMV 表现', '用户留存相关报表', '用户下单后的退款情况', '配送时效看板'].map((g) => (
              <button key={g} type="button" className="ai-find__guide-tag" onClick={() => onSend(g)}>{g}</button>
            ))}
          </div>
        </>
      );
    }
    default:
      return null;
  }
}

function AssetCardView({ asset, onUse, onDetail }: { asset: AssetCard; onUse: () => void; onDetail: () => void }) {
  const [perm, setPerm] = useState(asset.perm);
  const useLabel = asset.type === 'report' ? '预览报表' : asset.type === 'dashboard' ? '预览看板' : '打开表 · 去查询';
  const tone = asset.type === 'report' ? 'success' : asset.type === 'dashboard' ? 'purple' : 'blue';
  return (
    <div className="ai-find__result-card" onClick={onUse} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onUse(); }}>
      <div className="ai-find__card-top">
        <Tag tone={tone}>{asset.typeLabel}</Tag>
        <span className="ai-find__card-name">{asset.name}</span>
        <span className="ai-find__card-source">{asset.source}</span>
      </div>
      <div className="ai-find__card-desc">{asset.desc}</div>
      <div className="ai-find__card-reason">💡 {asset.reason}</div>
      <div className="ai-find__card-actions" onClick={(e) => e.stopPropagation()}>
        {perm === 'ok' && <Tag tone="success">✓ 已有权限</Tag>}
        {perm === 'apply' && (
          <button type="button" className="ai-find__perm-apply" onClick={() => { setPerm('pending'); toast.info('已发起权限申请，审批通过后会通知你（演示）'); }}>申请权限</button>
        )}
        {perm === 'pending' && <Tag tone="gray">申请中</Tag>}
        <button type="button" className="ai-find__card-btn-primary" onClick={onUse}>{useLabel}</button>
        <button type="button" className="ai-find__btn-outline" onClick={onDetail}>详情</button>
      </div>
    </div>
  );
}

function EmptyWorkspace({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="ai-find__empty">
      <EmptyState title="从左侧开始：找数 → 用数" description="描述业务需求，AI 帮你定位数据资产。报表 / 看板可直接预览，表可查看结构说明、一键带到即席查询。" />
      <div className="ai-find__empty-steps">
        <div className="ai-find__empty-step"><span className="ai-find__step-num">1</span>描述你想找的数据</div>
        <span className="ai-find__step-arrow">→</span>
        <div className="ai-find__empty-step"><span className="ai-find__step-num">2</span>选择推荐的资产</div>
        <span className="ai-find__step-arrow">→</span>
        <div className="ai-find__empty-step"><span className="ai-find__step-num">3</span>直接用数：预览报表 / 带上下文去查询</div>
      </div>
      <div className="ai-find__recent">
        <div className="ai-find__recent-title">📋 最近找数记录</div>
        {aiFindRecentQueries.map((r) => (
          <button key={r.text} type="button" className="ai-find__recent-item" onClick={() => onSend(r.text)}>
            <span>💬</span>
            <span className="ai-find__recent-text">{r.text}</span>
            <span className="ai-find__recent-time">{r.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
