import { useState } from 'react';
import { ChatInterface, type ChatMessage } from '../../components/interaction/ChatInterface';
import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
import { Modal } from '../../components/feedback/Modal';
import './ai-chat.css';

type SearchMode = 'traditional' | 'ai';

type ResourceCardData = {
  type: 'table' | 'report' | 'api' | 'metric';
  name: string;
  displayName: string;
  description: string;
  perm: 'ok' | 'apply' | 'pending';
  owner: string;
  storage?: string;
  fields?: number;
  refreshTime?: string;
  latestValue?: string;
  updateFreq?: string;
  requestMethod?: string;
};

const mockResourceCards: ResourceCardData[] = [
  { type: 'table', name: 'dwd_trade_order', displayName: '交易订单明细表', description: '保留订单粒度的交易明细，T+1每日更新', perm: 'ok', owner: '赵六', storage: 'MaxCompute', fields: 42 },
  { type: 'report', name: 'rpt_gmv_daily', displayName: 'GMV日报', description: '每日核心经营指标报表，含GMV、订单量、客单价', perm: 'apply', owner: '王五', refreshTime: '10分钟前' },
  { type: 'api', name: 'api_trade_query', displayName: '交易查询接口', description: '实时交易查询API，支持订单状态、支付信息查询', perm: 'pending', owner: '李四', requestMethod: 'GET' },
  { type: 'metric', name: 'metric_gmv', displayName: 'GMV核心指标', description: '平台GMV核心指标，每日T+1更新，含环比同比', perm: 'ok', owner: '张三', latestValue: '78.3%', updateFreq: 'T+1' },
];

const historyGroups = [
  { label: '今天', items: ['订单明细表在哪里', 'GMV日报怎么看'] },
  { label: '昨天', items: ['交易查询接口权限', '核心经营指标报表'] },
  { label: '7天内', items: ['MaxCompute表清单', '用户行为数据', '退款率指标定义'] },
];

function typeLabel(type: ResourceCardData['type']): string {
  return type === 'table' ? '表' : type === 'report' ? '报表' : type === 'api' ? 'API' : '指标';
}

function typeTone(type: ResourceCardData['type']): 'blue' | 'success' | 'warning' | 'gray' {
  return type === 'table' ? 'blue' : type === 'report' ? 'success' : type === 'api' ? 'warning' : 'gray';
}

function permLabel(perm: ResourceCardData['perm']): string {
  return perm === 'ok' ? '已有权限' : perm === 'apply' ? '申请权限' : '申请中';
}

function permTone(perm: ResourceCardData['perm']): 'success' | 'warning' | 'gray' {
  return perm === 'ok' ? 'success' : perm === 'apply' ? 'warning' : 'gray';
}

let nextMsgId = 0;

export function AIChatPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<ResourceCardData | null>(null);

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = { id: `msg-${nextMsgId++}`, role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const aiContent = (
        <div>
          <p>为你找到以下相关资源：</p>
          <div className="ai-chat__resource-grid">
            {mockResourceCards.map((card) => (
              <div key={card.name} className="ai-chat__resource-card" onClick={() => {
                if (card.perm === 'apply') {
                  setPermTarget(card);
                  setPermModalOpen(true);
                }
              }}>
                <div className="ai-chat__resource-card-head">
                  <Tag tone={typeTone(card.type)}>{typeLabel(card.type)}</Tag>
                  <Tag tone={permTone(card.perm)}>{permLabel(card.perm)}</Tag>
                </div>
                <div className="ai-chat__resource-card-name">{card.displayName}</div>
                <div className="ai-chat__resource-card-desc">{card.description}</div>
                <div className="ai-chat__resource-card-meta">
                  <span>{card.owner}</span>
                  {card.storage ? <span>{card.storage}</span> : null}
                  {card.fields ? <span>{card.fields} 字段</span> : null}
                </div>
                <div className="ai-chat__resource-card-actions">
                  <Button size="sm">查看详情</Button>
                  {card.perm === 'ok' ? <Button size="sm" variant="primary">打开报表</Button> : null}
                  {card.perm === 'apply' ? (
                    <Button size="sm" variant="primary" onClick={() => { setPermTarget(card); setPermModalOpen(true); }}>申请权限</Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      const aiMsg: ChatMessage = { id: `msg-${nextMsgId++}`, role: 'ai', content: aiContent };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
    }, 600);
  };

  return (
    <section className="ai-chat">
      {sidebarOpen ? (
        <aside className="ai-chat__sidebar">
          <div className="ai-chat__sidebar-header">
            <h3>历史对话</h3>
            <button type="button" className="ai-chat__sidebar-close" onClick={() => setSidebarOpen(false)}>&#9664;</button>
          </div>
          <div className="ai-chat__history">
            {historyGroups.map((group) => (
              <div key={group.label} className="ai-chat__history-group">
                <div className="ai-chat__history-group-label">{group.label}</div>
                {group.items.map((item) => (
                  <button key={item} type="button" className="ai-chat__history-item" onClick={() => handleSend(item)}>
                    {item}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
      ) : null}
      <div className="ai-chat__main">
        <div className="ai-chat__mode-toggle">
          <button
            type="button"
            className={`ai-chat__mode-btn ${searchMode === 'traditional' ? 'ai-chat__mode-btn--active' : ''}`}
            onClick={() => setSearchMode('traditional')}
          >
            传统搜索
          </button>
          <button
            type="button"
            className={`ai-chat__mode-btn ${searchMode === 'ai' ? 'ai-chat__mode-btn--active' : ''}`}
            onClick={() => setSearchMode('ai')}
          >
            AI找数
          </button>
          {!sidebarOpen ? (
            <button type="button" className="ai-chat__sidebar-open" onClick={() => setSidebarOpen(true)}>&#9654; 历史</button>
          ) : null}
        </div>
        {searchMode === 'ai' ? (
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            placeholder="描述你想查找的数据..."
            guides={['订单数据在哪里', 'GMV怎么看', '用户画像表', '交易接口']}
            typing={typing}
          />
        ) : (
          <div className="ai-chat__traditional">
            <p className="ai-chat__traditional-placeholder">传统搜索模式 - 后续接入资产检索页面</p>
          </div>
        )}
      </div>
      {permModalOpen && permTarget ? (
        <Modal open={permModalOpen} title="申请权限" onClose={() => setPermModalOpen(false)}>
          <div className="ai-chat__perm-form">
            <p>申请访问 <strong>{permTarget.displayName}</strong> ({permTarget.name})</p>
            <div className="ai-chat__perm-meta">
              <span>类型: {typeLabel(permTarget.type)}</span>
              <span>负责人: {permTarget.owner}</span>
            </div>
            <div className="ai-chat__perm-actions">
              <Button
                variant="primary"
                onClick={() => {
                  setPermModalOpen(false);
                  window.location.hash = 'my?section=cart';
                }}
              >
                确认申请
              </Button>
              <Button onClick={() => setPermModalOpen(false)}>取消</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
