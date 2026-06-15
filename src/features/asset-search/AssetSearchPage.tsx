import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import { sourceSystemLabels } from '../../types/resources';
import './asset-search.css';

/* ── Constants ──────────────────────────────────────────── */

type DiscoveryTab = 'recent' | 'favorite' | 'trending' | 'hot';

const MAX_SUGGESTIONS = 8;
const MAX_HIT_EXPLANATIONS = 3;

const hotKeywords = ['用户行为日志', '订单明细表', 'GMV指标', '用户画像', '商品库存'];
const discoveryTabs: Array<{ key: DiscoveryTab; label: string }> = [
  { key: 'recent', label: '最近浏览' },
  { key: 'favorite', label: '我的收藏' },
  { key: 'trending', label: '热门浏览' },
  { key: 'hot', label: '热门专题' },
];

const typeLabels: Record<ResourceType, string> = {
  table: '表', metric: '指标', report: '报表',
  dashboard: '看板', api: 'API', label: '标签', view: '视图',
};

const typeIcons: Record<ResourceType, string> = {
  table: '🗃️', metric: '📈', report: '📊',
  dashboard: '📊', api: '🔌', label: '🏷️', view: '👁️',
};

const topicCards = [
  { icon: '🛒', title: '交易域核心资产', description: '订单、支付、退款全链路', count: '42 个资产' },
  { icon: '👤', title: '用户行为分析', description: '行为日志、漏斗分析、留存', count: '28 个资产' },
  { icon: '📈', title: 'GMV指标体系', description: '日周月年GMV指标全覆盖', count: '19 个资产' },
  { icon: '🏭', title: '供应链数据', description: '库存、物流、采购数据', count: '35 个资产' },
  { icon: '🎯', title: '用户画像', description: '画像标签、分层、偏好建模', count: '23 个资产' },
  { icon: '🔌', title: 'API 接口', description: '对外服务接口、内部微服务', count: '11 个资产' },
];

/* ── Weighted search (§7.1) ────────────────────────────── */

type FieldWeight = { field: string; value: string | undefined; weight: number; label: string };

function getFieldWeights(r: ResourceSummary): FieldWeight[] {
  return [
    { field: 'name', value: r.name, weight: 10, label: '技术名' },
    { field: 'displayName', value: r.displayName, weight: 8, label: '中文名' },
    { field: 'tags', value: r.tags?.join(' '), weight: 5, label: '标签' },
    { field: 'owner', value: r.owner, weight: 5, label: '负责人' },
    { field: 'businessOwner', value: r.businessOwner, weight: 5, label: '业务负责人' },
    { field: 'sourceSystem', value: r.sourceSystem ? sourceSystemLabels[r.sourceSystem] : undefined, weight: 3, label: '来源' },
    { field: 'description', value: r.description, weight: 2, label: '描述' },
    { field: 'domain', value: r.domain, weight: 2, label: '域' },
    { field: 'catalogPath', value: r.catalogPath, weight: 1, label: '目录' },
  ];
}

function tokenize(query: string): string[] {
  return query.trim().split(/[\s,，]+/).filter(Boolean);
}

type HitExplanation = { label: string; snippet: string };

function computeRelevance(r: ResourceSummary, tokens: string[]): {
  score: number;
  explanations: HitExplanation[];
} {
  if (tokens.length === 0) return { score: 0, explanations: [] };

  const fields = getFieldWeights(r);
  let totalScore = 0;
  const explanations: HitExplanation[] = [];
  const nameOrDisplayHit = new Set<string>();

  for (const token of tokens) {
    const lower = token.toLowerCase();
    for (const fw of fields) {
      if (!fw.value) continue;
      const lowerVal = fw.value.toLowerCase();
      if (lowerVal.includes(lower)) {
        const boosted = fw.field === 'name' || fw.field === 'displayName'
          ? fw.weight * 1.5
          : fw.weight;
        totalScore += boosted;
        if (fw.field === 'name' || fw.field === 'displayName') {
          nameOrDisplayHit.add(token);
        }
        if (fw.field !== 'name' && fw.field !== 'displayName') {
          const idx = lowerVal.indexOf(lower);
          const start = Math.max(0, idx - 6);
          const end = Math.min(lowerVal.length, idx + token.length + 6);
          const snippet = (start > 0 ? '…' : '') + fw.value.slice(start, end) + (end < lowerVal.length ? '…' : '');
          if (explanations.length < MAX_HIT_EXPLANATIONS) {
            explanations.push({ label: fw.label, snippet });
          }
        }
      }
    }
  }

  const allHitNameOrDisplay = tokens.every((t) => nameOrDisplayHit.has(t));
  if (allHitNameOrDisplay) {
    return { score: totalScore, explanations: [] };
  }

  return { score: totalScore, explanations: explanations.slice(0, MAX_HIT_EXPLANATIONS) };
}

/* ── Highlight helper ───────────────────────────────────── */

function HighlightText({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;

  const lower = text.toLowerCase();
  const marks: Array<{ start: number; end: number }> = [];
  for (const token of tokens) {
    const tl = token.toLowerCase();
    let pos = 0;
    while (pos < lower.length) {
      const idx = lower.indexOf(tl, pos);
      if (idx < 0) break;
      marks.push({ start: idx, end: idx + tl.length });
      pos = idx + 1;
    }
  }
  marks.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const m of marks) {
    if (merged.length && merged[merged.length - 1].end >= m.start) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, m.end);
    } else {
      merged.push({ ...m });
    }
  }

  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of merged) {
    if (m.start > last) parts.push(text.slice(last, m.start));
    parts.push(<mark key={m.start} className="asset-search__hl">{text.slice(m.start, m.end)}</mark>);
    last = m.end;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ── SVG icons for suggestion panel ─────────────────────── */

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OwnerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 15c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function DiscoveryRow({ resource, stat, onNavigate }: { resource: ResourceSummary; stat: string; onNavigate: (keyword: string) => void }) {
  const parts = splitQualifiedName(resource.name);

  return (
    <button type="button" className="asset-search__discovery-row" onClick={() => onNavigate(getResourceTitle(resource))}>
      <span className="asset-search__dc-icon">{typeIcons[resource.type]}</span>
      <span className="asset-search__dc-body">
        <span className="asset-search__dc-name">
          {parts.database ? <span className="asset-search__dc-name-db">{parts.database}.</span> : null}
          <span className="asset-search__dc-name-main">{parts.objectName}</span>
        </span>
        <span className="asset-search__dc-sub">
          <span>{getResourceTitle(resource)}</span>
          <span className="asset-search__origin-chip">{resource.sourceSystem ? sourceSystemLabels[resource.sourceSystem] : '-'}</span>
        </span>
      </span>
      <span className="asset-search__dc-right">
        <Tag tone={resource.type === 'metric' ? 'purple' : 'gray'}>{typeLabels[resource.type]}</Tag>
        <span>{stat}</span>
      </span>
    </button>
  );
}

function SuggestionItem({
  resource,
  tokens,
  isActive,
  onMouseEnter,
  onClick,
}: {
  resource: ResourceSummary;
  tokens: string[];
  isActive: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  const relevance = useMemo(() => computeRelevance(resource, tokens), [resource, tokens]);
  const domainLabel = '资产';

  return (
    <button
      type="button"
      className={`asset-search__suggest-item${isActive ? ' is-active' : ''}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <span className="asset-search__sg-icon">{typeIcons[resource.type]}</span>
      <span className="asset-search__sg-body">
        <span className="asset-search__sg-name-row">
          <strong className="asset-search__sg-name">
            <HighlightText text={resource.name} tokens={tokens} />
          </strong>
          <Tag tone="blue">{domainLabel}</Tag>
          <Tag tone={resource.type === 'metric' ? 'purple' : 'gray'}>{typeLabels[resource.type]}</Tag>
        </span>
        <span className="asset-search__sg-subtitle">
          {resource.displayName && <HighlightText text={resource.displayName} tokens={tokens} />}
          {resource.sourceSystem && (
            <>
              <span className="asset-search__sg-sep">·</span>
              {sourceSystemLabels[resource.sourceSystem]}
            </>
          )}
        </span>
        {relevance.explanations.length > 0 && (
          <span className="asset-search__sg-hits">
            {relevance.explanations.map((e, i) => (
              <span key={i} className="asset-search__sg-hit">
                <em>{e.label}</em>
                <HighlightText text={e.snippet} tokens={tokens} />
              </span>
            ))}
          </span>
        )}
        <span className="asset-search__sg-owner">
          <OwnerIcon />
          {resource.owner}
        </span>
      </span>
      <span className="asset-search__sg-action">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

/* ── Helpers ────────────────────────────────────────────── */

function getResourceTitle(resource: ResourceSummary) {
  return resource.displayName ?? resource.name;
}

function formatUsage(value = 0) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function sortByHeat(resources: ResourceSummary[]) {
  return [...resources].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
}

function splitQualifiedName(name: string) {
  const lastDotIndex = name.lastIndexOf('.');
  if (lastDotIndex < 0) return { database: '', objectName: name };
  return { database: name.slice(0, lastDotIndex), objectName: name.slice(lastDotIndex + 1) };
}

function navigateToCatalog(keyword: string) {
  const q = encodeURIComponent(keyword.trim());
  window.location.hash = `#catalog?q=${q}`;
}

function navigateToDetail(resource: ResourceSummary) {
  window.location.hash = `#detail?domain=asset&id=${encodeURIComponent(resource.id)}`;
}

/* ── Main component ─────────────────────────────────────── */

export function AssetSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [activeDiscoveryTab, setActiveDiscoveryTab] = useState<DiscoveryTab>('recent');

  const sortedResources = useMemo(() => sortByHeat(mockResources), []);
  const tokens = useMemo(() => tokenize(keyword), [keyword]);

  const suggestions = useMemo(() => {
    if (tokens.length === 0) return [];
    return [...sortedResources]
      .map((r) => ({ resource: r, relevance: computeRelevance(r, tokens) }))
      .filter((item) => item.relevance.score > 0)
      .sort((a, b) => b.relevance.score - a.relevance.score)
      .slice(0, MAX_SUGGESTIONS)
      .map((item) => item.resource);
  }, [tokens, sortedResources]);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIdx(-1);
  }, [suggestions.length]);

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
    setSuggestOpen(value.trim().length > 0);
    setActiveIdx(-1);
  }, []);

  const handleFocus = useCallback(() => {
    if (keyword.trim()) setSuggestOpen(true);
  }, [keyword]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setSuggestOpen(false);
      return;
    }
    if (!suggestOpen || suggestions.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (keyword.trim()) navigateToCatalog(keyword);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIdx >= 0 && activeIdx < suggestions.length) {
        navigateToDetail(suggestions[activeIdx]);
        setSuggestOpen(false);
      } else if (keyword.trim()) {
        navigateToCatalog(keyword);
        setSuggestOpen(false);
      }
    }
  }, [suggestOpen, suggestions, activeIdx, keyword]);

  const handleSubmit = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSuggestOpen(false);
    if (keyword.trim()) navigateToCatalog(keyword);
  }, [keyword]);

  const handleHotKeyword = useCallback((kw: string) => {
    navigateToCatalog(kw);
  }, []);

  const handleSuggestionClick = useCallback((resource: ResourceSummary) => {
    navigateToDetail(resource);
    setSuggestOpen(false);
  }, []);

  const recentResources = sortedResources.slice(0, 5);
  const favoriteResources = sortedResources.filter((r) => r.permissionStatus === 'granted').slice(0, 5);
  const trendingResources = sortedResources.slice(0, 6);

  const discoveryList =
    activeDiscoveryTab === 'favorite' ? favoriteResources : activeDiscoveryTab === 'trending' ? trendingResources : recentResources;

  return (
    <section className="asset-search" aria-label="资产检索业务页">
      <div className="asset-search__hero">
        <h1>数据资产检索</h1>
        <p>找资产 · 找不到时找资源 · 将资源治理成资产</p>
        <form className="asset-search__search-box" role="search" onSubmit={handleSubmit}>
          <span className="asset-search__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="搜索资产名称、描述、负责人、标签…"
            aria-label="搜索资产名称、描述、负责人、标签"
            autoComplete="off"
          />
          <Button variant="primary" className="asset-search__submit" type="submit">
            搜索
          </Button>
          {suggestOpen && (
            <div className="asset-search__suggest-panel">
              <div className="asset-search__suggest-head">
                <div>
                  <strong>已命中 {suggestions.length} 条候选</strong>
                  <span>{suggestions.length > 0 ? '方向键选择，Enter 进入详情；无选中项时 Enter 跳转资产目录' : '暂无快捷命中结果，按 Enter 跳转资产目录执行全文搜索'}</span>
                </div>
              </div>
              <div className="asset-search__suggest-list">
                {suggestions.length > 0 ? (
                  suggestions.map((resource, idx) => (
                    <SuggestionItem
                      key={resource.id}
                      resource={resource}
                      tokens={tokens}
                      isActive={idx === activeIdx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => handleSuggestionClick(resource)}
                    />
                  ))
                ) : (
                  <div className="asset-search__suggest-empty">没有找到与当前输入直接匹配的快捷结果</div>
                )}
              </div>
              <div className="asset-search__suggest-foot">
                <span>↑ ↓ 切换选中</span>
                <span>Enter 进入详情 / 跳转目录</span>
                <span>Esc 收起下拉</span>
              </div>
            </div>
          )}
        </form>
        <div className="asset-search__hints" aria-label="热门搜索">
          <span>热门搜索:</span>
          {hotKeywords.map((kw) => (
            <button key={kw} type="button" onClick={() => handleHotKeyword(kw)}>
              {kw}
            </button>
          ))}
        </div>
      </div>

      <div className="asset-search__body">
        <div className="asset-search__center">
          <div className="asset-search__discovery-panel">
            <div className="asset-search__discovery-tabs">
              {discoveryTabs.map((tab) => (
                <button key={tab.key} type="button" className={activeDiscoveryTab === tab.key ? 'active' : ''} onClick={() => setActiveDiscoveryTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="asset-search__discovery-content">
              {activeDiscoveryTab === 'hot' ? (
                <div className="asset-search__topic-grid">
                  {topicCards.map((topic) => (
                    <button key={topic.title} type="button" className="asset-search__topic-card" onClick={() => handleHotKeyword(topic.title)}>
                      <span>{topic.icon}</span>
                      <span>
                        <strong>{topic.title}</strong>
                        <small>{topic.description}</small>
                        <em>{topic.count}</em>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="asset-search__discovery-cards">
                  {discoveryList.map((resource, index) => (
                    <DiscoveryRow
                      key={resource.id}
                      resource={resource}
                      stat={activeDiscoveryTab === 'trending' ? `热度 ${formatUsage(resource.usageCount)}` : index === 0 ? '刚刚浏览' : `${index + 1} 天前`}
                      onNavigate={handleHotKeyword}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="asset-search__right">
          <section className="asset-search__side-card">
            <h2>平台概览</h2>
            <div className="asset-search__kpi-grid">
              <div>
                <strong>1,284</strong>
                <span>已上架资产</span>
              </div>
              <div>
                <strong>3,672</strong>
                <span>资源总数</span>
              </div>
              <div>
                <strong>87.3%</strong>
                <span>搜索命中率</span>
              </div>
              <div>
                <strong>23</strong>
                <span>待审核申请</span>
              </div>
            </div>
          </section>
          <section className="asset-search__side-card">
            <h2>专题推荐</h2>
            <button type="button" className="asset-search__topic-link topic-blue" onClick={() => handleHotKeyword('交易域核心资产')}>
              <strong>交易域核心资产</strong>
              <span>订单、支付、退款全链路 · 42个资产</span>
            </button>
            <button type="button" className="asset-search__topic-link topic-purple" onClick={() => handleHotKeyword('用户域分析资产')}>
              <strong>用户域分析资产</strong>
              <span>行为、画像、留存分析 · 28个资产</span>
            </button>
            <button type="button" className="asset-search__topic-link topic-green" onClick={() => handleHotKeyword('供应链数据资产')}>
              <strong>供应链数据资产</strong>
              <span>库存、物流、采购 · 35个资产</span>
            </button>
          </section>
          <section className="asset-search__ai-card">
            <h2>AI 助手</h2>
            <p>用自然语言描述你的数据需求，AI 帮你找到合适的资产</p>
            <button type="button">即将上线，敬请期待</button>
          </section>
        </aside>
      </div>
    </section>
  );
}
