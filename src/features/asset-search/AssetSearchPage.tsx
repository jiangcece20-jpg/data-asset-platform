import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import './asset-search.css';

type TypeFilter = 'all' | ResourceType;
type DiscoveryTab = 'recent' | 'favorite' | 'trending' | 'hot';

const hotKeywords = ['用户行为日志', '订单明细表', 'GMV指标', '用户画像', '商品库存'];
const discoveryTabs: Array<{ key: DiscoveryTab; label: string }> = [
  { key: 'recent', label: '最近浏览' },
  { key: 'favorite', label: '我的收藏' },
  { key: 'trending', label: '热门浏览' },
  { key: 'hot', label: '热门专题' },
];
const typeFilters: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'table', label: '表' },
  { key: 'view', label: '视图' },
  { key: 'api', label: 'API' },
  { key: 'report', label: '报表' },
  { key: 'metric', label: '指标' },
  { key: 'label', label: '标签' },
];

const typeLabels: Record<ResourceType, string> = {
  table: '表',
  metric: '指标',
  report: '报表',
  api: 'API',
  label: '标签',
  view: '视图',
};

const typeIcons: Record<ResourceType, string> = {
  table: '🗃️',
  metric: '📈',
  report: '📊',
  api: '🔌',
  label: '🏷️',
  view: '👁️',
};

const permissionLabels: Record<NonNullable<ResourceSummary['permissionStatus']>, { label: string; tone: 'blue' | 'success' | 'warning' | 'gray' }> = {
  granted: { label: '已授权', tone: 'success' },
  none: { label: '可申请', tone: 'blue' },
  pending: { label: '审批中', tone: 'warning' },
  unknown: { label: '需确认', tone: 'gray' },
};

const topicCards = [
  { icon: '🛒', title: '交易域核心资产', description: '订单、支付、退款全链路', count: '42 个资产' },
  { icon: '👤', title: '用户行为分析', description: '行为日志、漏斗分析、留存', count: '28 个资产' },
  { icon: '📈', title: 'GMV指标体系', description: '日周月年GMV指标全覆盖', count: '19 个资产' },
  { icon: '🏭', title: '供应链数据', description: '库存、物流、采购数据', count: '35 个资产' },
  { icon: '🎯', title: '用户画像', description: '画像标签、分层、偏好建模', count: '23 个资产' },
  { icon: '🔌', title: 'API 接口', description: '对外服务接口、内部微服务', count: '11 个资产' },
];

function getResourceTitle(resource: ResourceSummary) {
  return resource.displayName ?? resource.name;
}

function matchesResource(resource: ResourceSummary, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    resource.name,
    resource.displayName,
    resource.description,
    resource.sourceSystem,
    resource.domain,
    resource.catalogPath,
    ...(resource.tags ?? []),
  ].some((field) => field?.toLowerCase().includes(normalized));
}

function formatUsage(value = 0) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function sortByHeat(resources: ResourceSummary[]) {
  return [...resources].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
}

function splitQualifiedName(name: string) {
  const lastDotIndex = name.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return { database: '', objectName: name };
  }

  return {
    database: name.slice(0, lastDotIndex),
    objectName: name.slice(lastDotIndex + 1),
  };
}

function DiscoveryRow({ resource, stat, onOpen }: { resource: ResourceSummary; stat: string; onOpen: (value: string) => void }) {
  const parts = splitQualifiedName(resource.name);

  return (
    <button type="button" className="asset-search__discovery-row" onClick={() => onOpen(getResourceTitle(resource))}>
      <span className="asset-search__dc-icon">{typeIcons[resource.type]}</span>
      <span className="asset-search__dc-body">
        <span className="asset-search__dc-name">
          {parts.database ? <span className="asset-search__dc-name-db">{parts.database}.</span> : null}
          <span className="asset-search__dc-name-main">{parts.objectName}</span>
        </span>
        <span className="asset-search__dc-sub">
          <span>{getResourceTitle(resource)}</span>
          <span className="asset-search__origin-chip">{resource.sourceSystem}</span>
        </span>
      </span>
      <span className="asset-search__dc-right">
        <Tag tone={resource.type === 'metric' ? 'purple' : 'gray'}>{typeLabels[resource.type]}</Tag>
        <span>{stat}</span>
      </span>
    </button>
  );
}

function ResultCard({ resource }: { resource: ResourceSummary }) {
  const permission = permissionLabels[resource.permissionStatus ?? 'unknown'];
  const queryCount = Math.floor((resource.usageCount ?? 0) * 0.35);

  return (
    <article className="asset-search__asset-card">
      <div className="asset-search__asset-row1">
        <span>{typeIcons[resource.type]}</span>
        <h2>{getResourceTitle(resource)}</h2>
        <span className="asset-search__copy" title="复制表名">
          📋
        </span>
        <Tag tone={resource.type === 'metric' ? 'purple' : 'blue'}>{typeLabels[resource.type]}</Tag>
        <Tag tone={permission.tone}>{permission.label}</Tag>
        {(resource.tags ?? []).slice(0, 2).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <button
        className="asset-search__apply"
        type="button"
        onClick={() => {
          window.location.hash = `detail?domain=asset&id=${resource.id}`;
        }}
      >
        {resource.permissionStatus === 'granted' ? '查看详情' : '申请权限'}
      </button>
      <div className="asset-search__asset-row2">
        <span>
          <span>来源</span> {resource.sourceSystem}
        </span>
        <span>
          <span>目录</span> {resource.catalogPath ?? resource.domain}
        </span>
        <div>
          <span>🔍 {queryCount.toLocaleString()}</span>
          <span>👁 {formatUsage(resource.usageCount)}</span>
        </div>
      </div>
      <div className="asset-search__asset-row3">
        <span>描述</span> {resource.description}
      </div>
      <div className="asset-search__asset-row4">
        <span>
          <span>技术负责人</span> <strong>{resource.owner}</strong>
        </span>
        <span>
          <span>业务负责人</span> <strong>{resource.owner}</strong>
        </span>
        <span className="asset-search__asset-times">
          <span>创建时间 {resource.updatedAt}</span>
          <span>更新时间 {resource.updatedAt}</span>
        </span>
      </div>
    </article>
  );
}

export function AssetSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [activeDiscoveryTab, setActiveDiscoveryTab] = useState<DiscoveryTab>('recent');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const sortedResources = useMemo(() => sortByHeat(mockResources), []);
  const suggestions = useMemo(() => sortedResources.filter((resource) => matchesResource(resource, keyword)).slice(0, 5), [keyword, sortedResources]);
  const results = useMemo(() => {
    return sortedResources.filter((resource) => {
      const typeMatched = activeType === 'all' || resource.type === activeType;
      return typeMatched && matchesResource(resource, submittedKeyword);
    });
  }, [activeType, sortedResources, submittedKeyword]);
  const hasSearched = submittedKeyword.trim().length > 0;

  const submitSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSubmittedKeyword(keyword.trim());
    setSuggestOpen(false);
  };

  const quickSearch = (value: string) => {
    setKeyword(value);
    setSubmittedKeyword(value);
    setActiveType('all');
    setSuggestOpen(false);
  };

  const recentResources = sortedResources.slice(0, 5);
  const favoriteResources = sortedResources.filter((resource) => resource.permissionStatus === 'granted').slice(0, 5);
  const trendingResources = sortedResources.slice(0, 6);

  const discoveryList =
    activeDiscoveryTab === 'favorite' ? favoriteResources : activeDiscoveryTab === 'trending' ? trendingResources : recentResources;

  return (
    <section className="asset-search" aria-label="资产检索业务页">
      <div className="asset-search__hero">
        <h1>数据资产检索</h1>
        <p>找资产 · 找不到时找资源 · 将资源治理成资产</p>
        <form className="asset-search__search-box" role="search" onSubmit={submitSearch}>
          <span className="asset-search__search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              if (keyword.trim()) setSuggestOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSuggestOpen(false);
              }
            }}
            placeholder="请输入搜索内容"
            aria-label="请输入搜索内容"
            autoComplete="off"
          />
          <Button variant="primary" className="asset-search__submit" type="submit">
            搜索
          </Button>
          {suggestOpen ? (
            <div className="asset-search__suggest-panel">
              <div className="asset-search__suggest-head">
                <div>
                  <strong>⚡ 快速命中建议</strong>
                  <span>{suggestions.length ? '支持中文名、英文名和别名匹配，选中后可直接进入详情' : '暂无快捷命中结果，可继续输入或按 Enter 执行全文搜索'}</span>
                </div>
                <span>已命中 {suggestions.length} 条候选</span>
              </div>
              <div className="asset-search__suggest-list">
                {suggestions.length > 0 ? (
                  suggestions.map((resource) => (
                    <button key={resource.id} type="button" className="asset-search__suggest-item" onMouseDown={() => quickSearch(getResourceTitle(resource))}>
                      <span className="asset-search__suggest-icon">{typeIcons[resource.type]}</span>
                      <span>
                        <strong>{getResourceTitle(resource)}</strong>
                        <small>{resource.name}</small>
                      </span>
                      <span>点击进入 →</span>
                    </button>
                  ))
                ) : (
                  <div className="asset-search__suggest-empty">没有找到与当前输入直接匹配的快捷结果</div>
                )}
              </div>
              <div className="asset-search__suggest-foot">
                <span>↑ ↓ 切换选中</span>
                <span>Enter 查看详情</span>
                <span>Esc 收起下拉</span>
              </div>
            </div>
          ) : null}
        </form>
        <div className="asset-search__hints" aria-label="热门搜索">
          <span>热门搜索:</span>
          {hotKeywords.map((keywordItem) => (
            <button key={keywordItem} type="button" onClick={() => quickSearch(keywordItem)}>
              {keywordItem}
            </button>
          ))}
        </div>
      </div>

      <div className="asset-search__body">
        <div className="asset-search__center">
          {hasSearched ? (
            <div className="asset-search__results-panel">
              <div className="asset-search__filter-bar">
                <strong>找到 {results.length} 个相关资产</strong>
                <div role="tablist" aria-label="资源类型">
                  {typeFilters.map((filter) => (
                    <button key={filter.key} type="button" className={filter.key === activeType ? 'is-active' : ''} onClick={() => setActiveType(filter.key)}>
                      {filter.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={() => quickSearch('')}>
                  返回发现
                </Button>
              </div>
              {results.length > 0 ? (
                <div className="asset-search__asset-card-list">
                  {results.map((resource) => (
                    <ResultCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <EmptyState title="未找到匹配的数据资产" description="可以换一个关键词，或提交资源治理需求。" />
              )}
            </div>
          ) : (
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
                      <button key={topic.title} type="button" className="asset-search__topic-card" onClick={() => quickSearch(topic.title)}>
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
                      <DiscoveryRow key={resource.id} resource={resource} stat={activeDiscoveryTab === 'trending' ? `热度 ${formatUsage(resource.usageCount)}` : index === 0 ? '刚刚浏览' : `${index + 1} 天前`} onOpen={quickSearch} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
            <button type="button" className="asset-search__topic-link topic-blue" onClick={() => quickSearch('交易域核心资产')}>
              <strong>交易域核心资产</strong>
              <span>订单、支付、退款全链路 · 42个资产</span>
            </button>
            <button type="button" className="asset-search__topic-link topic-purple" onClick={() => quickSearch('用户域分析资产')}>
              <strong>用户域分析资产</strong>
              <span>行为、画像、留存分析 · 28个资产</span>
            </button>
            <button type="button" className="asset-search__topic-link topic-green" onClick={() => quickSearch('供应链数据资产')}>
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
