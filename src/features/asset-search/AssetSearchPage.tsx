import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import './asset-search.css';

type TypeFilter = 'all' | ResourceType;

const hotKeywords = ['用户行为日志', '订单明细表', 'GMV指标', '用户画像', '商品库存'];
const typeFilters: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'table', label: '数据表' },
  { key: 'metric', label: '指标' },
  { key: 'report', label: '报表' },
  { key: 'dashboard', label: '看板' },
  { key: 'api', label: 'API' },
  { key: 'label', label: '标签' },
];

const typeLabels: Record<ResourceType, string> = {
  table: '数据表',
  metric: '指标',
  report: '报表',
  dashboard: '看板',
  api: 'API',
  label: '标签',
  view: '视图',
};

const permissionLabels: Record<NonNullable<ResourceSummary['permissionStatus']>, { label: string; tone: 'blue' | 'success' | 'warning' | 'gray' }> = {
  granted: { label: '已授权', tone: 'success' },
  none: { label: '可申请', tone: 'blue' },
  pending: { label: '审批中', tone: 'warning' },
  unknown: { label: '需确认', tone: 'gray' },
};

function getResourceTitle(resource: ResourceSummary) {
  return resource.displayName ?? resource.name;
}

function matchesResource(resource: ResourceSummary, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const fields = [
    resource.name,
    resource.displayName,
    resource.description,
    resource.sourceSystem,
    resource.domain,
    ...(resource.tags ?? []),
  ];

  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

function formatUsage(value = 0) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

function sortByHeat(resources: ResourceSummary[]) {
  return [...resources].sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
}

function ResourceCard({ resource }: { resource: ResourceSummary }) {
  const permission = permissionLabels[resource.permissionStatus ?? 'unknown'];

  return (
    <article className="asset-search__result-card">
      <div className="asset-search__result-main">
        <div className="asset-search__result-topline">
          <Tag tone={resource.type === 'metric' ? 'purple' : 'blue'}>{typeLabels[resource.type]}</Tag>
          <span>{resource.sourceSystem}</span>
          <span>{resource.domain}</span>
        </div>
        <h2>{getResourceTitle(resource)}</h2>
        <div className="asset-search__resource-name">{resource.name}</div>
        <p>{resource.description}</p>
        <div className="asset-search__tag-row">
          {(resource.tags ?? []).map((tag) => (
            <span key={tag} className="asset-search__soft-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <aside className="asset-search__result-side" aria-label={`${getResourceTitle(resource)} 操作`}>
        <Tag tone={permission.tone}>{permission.label}</Tag>
        <dl>
          <div>
            <dt>负责人</dt>
            <dd>{resource.owner}</dd>
          </div>
          <div>
            <dt>更新</dt>
            <dd>{resource.updatedAt}</dd>
          </div>
          <div>
            <dt>热度</dt>
            <dd>{formatUsage(resource.usageCount)}</dd>
          </div>
          <div>
            <dt>质量分</dt>
            <dd>{resource.qualityScore ?? '-'}</dd>
          </div>
        </dl>
        <div className="asset-search__result-actions">
          <Button size="sm">查看详情</Button>
          <Button size="sm" variant={resource.permissionStatus === 'granted' ? 'primary' : 'default'}>
            {resource.permissionStatus === 'granted' ? '去查询' : '申请权限'}
          </Button>
        </div>
      </aside>
    </article>
  );
}

export function AssetSearchPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [suggestOpen, setSuggestOpen] = useState(false);

  const suggestions = useMemo(() => sortByHeat(mockResources).filter((resource) => matchesResource(resource, keyword)).slice(0, 4), [keyword]);
  const results = useMemo(() => {
    return mockResources.filter((resource) => {
      const typeMatched = activeType === 'all' || resource.type === activeType;
      return typeMatched && matchesResource(resource, submittedKeyword);
    });
  }, [activeType, submittedKeyword]);
  const hasSearched = submittedKeyword.trim().length > 0;
  const recentResources = sortByHeat(mockResources).filter((resource) => resource.id !== 'resource-table-order-detail').slice(0, 3);
  const grantedCount = mockResources.filter((resource) => resource.permissionStatus === 'granted').length;

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
            onFocus={() => setSuggestOpen(true)}
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
                  <strong>快速命中建议</strong>
                  <span>支持中文名、英文名和标签匹配</span>
                </div>
                <span>{suggestions.length} 条</span>
              </div>
              <div className="asset-search__suggest-list">
                {suggestions.length > 0 ? (
                  suggestions.map((resource) => (
                    <button key={resource.id} type="button" className="asset-search__suggest-item" onMouseDown={() => quickSearch(getResourceTitle(resource))}>
                      <span>{typeLabels[resource.type]}</span>
                      <strong>{getResourceTitle(resource)}</strong>
                      <small>{resource.name}</small>
                    </button>
                  ))
                ) : (
                  <div className="asset-search__suggest-empty">没有实时建议</div>
                )}
              </div>
              <div className="asset-search__suggest-foot">
                <span>Enter 搜索</span>
                <span>Esc 收起</span>
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
        <div className="asset-search__stats" aria-label="检索概览">
          <div>
            <span>已收录资产</span>
            <strong>{mockResources.length}</strong>
          </div>
          <div>
            <span>可访问资源</span>
            <strong>{grantedCount}</strong>
          </div>
          <div>
            <span>今日更新</span>
            <strong>2</strong>
          </div>
          <div>
            <span>平均质量分</span>
            <strong>91</strong>
          </div>
        </div>

        {hasSearched ? (
          <div className="asset-search__results-layout">
            <aside className="asset-search__filters" aria-label="筛选条件">
              <h2>筛选条件</h2>
              <div className="asset-search__filter-group">
                <span>资源类型</span>
                <div>
                  {typeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={filter.key === activeType ? 'is-active' : ''}
                      onClick={() => setActiveType(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="asset-search__filter-group">
                <span>权限状态</span>
                <p>优先展示已授权和可申请的数据资产。</p>
              </div>
            </aside>
            <div className="asset-search__results">
              <div className="asset-search__results-head">
                <div>
                  <span>搜索结果</span>
                  <strong>找到 {results.length} 个相关资产</strong>
                </div>
                <Button size="sm" onClick={() => quickSearch('')}>
                  返回发现
                </Button>
              </div>
              {results.length > 0 ? (
                <div className="asset-search__result-list">
                  {results.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              ) : (
                <EmptyState title="未找到匹配的数据资产" description="可以换一个关键词，或提交资源治理需求。" />
              )}
            </div>
          </div>
        ) : (
          <div className="asset-search__discovery">
            <section className="asset-search__panel">
              <div className="asset-search__panel-head">
                <h2>最近浏览</h2>
                <Button size="sm">管理收藏</Button>
              </div>
              <div className="asset-search__discovery-grid">
                {recentResources.map((resource) => (
                  <button key={resource.id} type="button" className="asset-search__discovery-card" onClick={() => quickSearch(getResourceTitle(resource))}>
                    <span>{typeLabels[resource.type]}</span>
                    <strong>{getResourceTitle(resource)}</strong>
                    <small>{resource.description}</small>
                  </button>
                ))}
              </div>
            </section>
            <section className="asset-search__panel asset-search__panel--side">
              <h2>热门搜索</h2>
              <div className="asset-search__rank-list">
                {hotKeywords.map((item, index) => (
                  <button key={item} type="button" onClick={() => quickSearch(item)}>
                    <span>{index + 1}</span>
                    <strong>{item}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
