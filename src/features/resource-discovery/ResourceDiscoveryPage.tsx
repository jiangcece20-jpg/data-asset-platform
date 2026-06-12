import { type ReactNode, useMemo, useState } from 'react';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import { sourceSystemLabels } from '../../types/resources';
import './resource-discovery.css';

type DiscoveryKind = 'asset' | 'resource';
type DiscoveryStatus = 'published' | 'maintain' | 'no-list';
type ScopeFilter = 'all' | DiscoveryKind;
type TreeFilter = 'all' | 'unassigned' | string;
type TypeFilter = 'all' | ResourceType;

type DiscoveryRecord = ResourceSummary & {
  discoveryKind: DiscoveryKind;
  discoveryStatus: DiscoveryStatus;
  favorite?: boolean;
};

const rawResources: DiscoveryRecord[] = [
  {
    id: 'raw-news-info',
    discoveryKind: 'resource',
    discoveryStatus: 'maintain',
    type: 'table',
    name: 'wlyd_industry_news_info_di',
    displayName: '行业资讯原始表',
    description: '采集的行业资讯原始明细数据，待补充元数据后可提交上架。',
    sourceSystem: 'MaxCompute',
    sourceType: 'warehouse_engine',
    sourceInstance: 'mc_raw_news',
    sourcePath: 'ods.news.wlyd_industry_news_info_di',
    owner: '李四',
    permissionStatus: 'none',
    tags: ['行业资讯', 'ODS', '新闻'],
    databaseName: 'wlyd_mc_beijing',
    updatedAt: '2026-05-13',
    usageCount: 318,
    qualityScore: 72,
    favorite: false,
  },
  {
    id: 'raw-click-stream',
    discoveryKind: 'resource',
    discoveryStatus: 'maintain',
    type: 'table',
    name: 'kafka_user_click_raw',
    displayName: '点击流原始流',
    description: '实时用户点击原始流，支持埋点排查与实时行为分析。',
    sourceSystem: 'Kafka',
    sourceType: 'message_stream',
    sourceInstance: 'kafka_user_prod',
    sourcePath: 'topic/kafka_user_click_raw',
    owner: '张三',
    permissionStatus: 'pending',
    tags: ['用户行为', '点击流', '实时'],
    databaseName: 'wlyd_mc_shanghai',
    updatedAt: '2026-05-15',
    usageCount: 527,
    qualityScore: 76,
    favorite: true,
  },
  {
    id: 'raw-weekly-report',
    discoveryKind: 'resource',
    discoveryStatus: 'no-list',
    type: 'report',
    name: 'rpt_weekly_summary',
    displayName: '经营周报',
    description: '经营周报看板，聚合展示核心业务指标变化趋势，当前暂不上架。',
    sourceSystem: '万联灵析',
    sourceType: 'report_system',
    sourceInstance: 'bi_ops_workspace',
    sourcePath: '经营分析/周报/rpt_weekly_summary',
    owner: '赵六',
    permissionStatus: 'none',
    tags: ['周报', '经营分析'],
    updatedAt: '2026-05-09',
    usageCount: 223,
    qualityScore: 80,
    favorite: false,
  },
  {
    id: 'raw-inventory-api',
    discoveryKind: 'resource',
    discoveryStatus: 'maintain',
    type: 'api',
    name: 'api_inventory_check',
    displayName: '库存校验接口',
    description: '面向供应链协同场景提供库存查询能力，等待补齐 SLA 与调用说明。',
    sourceSystem: '内部微服务',
    sourceType: 'api_service',
    sourceInstance: 'inventory-service-prod',
    sourcePath: '/inventory/check',
    owner: '王五',
    permissionStatus: 'granted',
    tags: ['库存', '接口', '供应链'],
    catalogPath: '供应链/库存/库存明细',
    updatedAt: '2026-05-14',
    usageCount: 489,
    qualityScore: 83,
    favorite: false,
  },
];

const discoveryRecords: DiscoveryRecord[] = [
  ...mockResources.map((resource) => ({
    ...resource,
    discoveryKind: 'asset' as const,
    discoveryStatus: 'published' as const,
    favorite: resource.permissionStatus === 'granted',
  })),
  ...rawResources,
];

const typeTabs: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'table', label: '表' },
  { key: 'view', label: '视图' },
  { key: 'api', label: 'API' },
  { key: 'report', label: '报表' },
  { key: 'metric', label: '指标' },
  { key: 'label', label: '标签' },
];

const statusFilters: Array<{ key: 'all' | DiscoveryStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'maintain', label: '待维护' },
  { key: 'published', label: '已上架' },
  { key: 'no-list', label: '不上架' },
];

const typeLabels: Record<ResourceType, string> = {
  table: '表',
  metric: '指标',
  report: '报表',
  dashboard: '看板',
  api: 'API',
  label: '标签',
  view: '视图',
};

const typeTagTone: Record<ResourceType, 'blue' | 'success' | 'warning' | 'gray' | 'purple'> = {
  table: 'blue',
  metric: 'purple',
  report: 'success',
  dashboard: 'success',
  api: 'warning',
  label: 'gray',
  view: 'blue',
};

const discoveryStatusTagTone: Record<DiscoveryStatus, 'success' | 'warning' | 'gray'> = {
  published: 'success',
  maintain: 'warning',
  'no-list': 'gray',
};

const discoveryStatusLabels: Record<DiscoveryStatus, string> = {
  published: '已上架',
  maintain: '待维护',
  'no-list': '不上架',
};

/* ─── SVG Icons ─────────────────────────────── */

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="5.5" x2="6" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function MetricIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8L10.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ApiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8h3l2-5 2 10 2-5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LabelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 3h5l5.5 5.5L8.5 13 3 7.5V3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5.5" cy="5.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1.5" width="5.5" height="3.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="7" width="5.5" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9.5" width="5.5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4.5" cy="3.5" r="1" fill="currentColor" />
    </svg>
  );
}

const typeIcons: Record<ResourceType, () => ReactNode> = {
  table: TableIcon,
  report: ReportIcon,
  metric: MetricIcon,
  api: ApiIcon,
  label: LabelIcon,
  dashboard: DashboardIcon,
  view: ViewIcon,
};

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8.5" y1="8.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/* ─── Helpers ──────────────────────────────── */

const treeNodes = ['交易域', '用户域', '供应链'];
const initialFavoriteIds = new Set(discoveryRecords.filter((record) => record.favorite).map((record) => record.id));

function matchesKeyword(record: DiscoveryRecord, keyword: string) {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    record.name,
    record.displayName,
    record.description,
    record.catalogPath,
    record.owner,
    record.sourceSystem,
    ...(record.tags ?? []),
  ].some((field) => field?.toLowerCase().includes(normalized));
}

function matchesTree(record: DiscoveryRecord, treeFilter: TreeFilter) {
  if (treeFilter === 'all') {
    return true;
  }

  if (treeFilter === 'unassigned') {
    return !record.catalogPath;
  }

  return record.catalogPath?.startsWith(treeFilter) ?? false;
}

function getTreeCount(filter: TreeFilter) {
  return discoveryRecords.filter((record) => matchesTree(record, filter)).length;
}

function getTreeFilterLabel(treeFilter: TreeFilter) {
  if (treeFilter === 'all') {
    return '全部';
  }

  if (treeFilter === 'unassigned') {
    return '未归属';
  }

  return treeFilter;
}

/* ─── Discovery Card (4-Row Layout) ─────────── */

function DiscoveryCard({
  record,
  isFavorite,
  onToggleFavorite,
}: {
  record: DiscoveryRecord;
  isFavorite: boolean;
  onToggleFavorite: (resourceId: string) => void;
}) {
  const permissionStatus = record.permissionStatus ?? 'unknown';
  const IconComponent = typeIcons[record.type] ?? TableIcon;
  const dbPrefix = (record.type === 'table' || record.type === 'view') ? record.databaseName : undefined;

  const navigateToDetail = () => {
    window.location.hash = `#detail?domain=asset&id=${encodeURIComponent(record.id)}`;
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateToDetail();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(record.name);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(record.id);
  };

  const handleApplyPermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to cart with this asset pre-selected
    window.location.hash = `my?section=cart&apply=${encodeURIComponent(record.id)}`;
  };

  const permissionTone = permissionStatus === 'granted' ? 'granted'
    : permissionStatus === 'pending' ? 'pending'
    : permissionStatus === 'none' ? 'apply'
    : 'disabled';
  const permissionText = permissionStatus === 'granted' ? '已有权限'
    : permissionStatus === 'pending' ? '申请中'
    : '申请权限';

  return (
    <article className="resource-discovery__asset-card" onClick={navigateToDetail}>
      {/* Row 1: icon + name + copy + tags */}
      <div className="resource-discovery__card-row1">
        <span className="resource-discovery__asset-icon"><IconComponent /></span>
        <a className="resource-discovery__asset-name" href={`#detail?domain=asset&id=${encodeURIComponent(record.id)}`} onClick={handleNameClick}>
          {dbPrefix && <span className="resource-discovery__name-prefix">{dbPrefix}.</span>}
          {record.name}
        </a>
        <button type="button" className="resource-discovery__copy-btn" onClick={handleCopy} title="复制表名" aria-label={`复制 ${record.name}`}>
          📋
        </button>
        <span className="resource-discovery__card-tags">
          <Tag tone={typeTagTone[record.type]}>{typeLabels[record.type]}</Tag>
          <Tag tone={record.discoveryKind === 'asset' ? 'blue' : 'cyan'}>{record.discoveryKind === 'asset' ? '资产' : '资源'}</Tag>
          <Tag tone={discoveryStatusTagTone[record.discoveryStatus]}>{discoveryStatusLabels[record.discoveryStatus]}</Tag>
          {(record.tags ?? []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      </div>

      {/* Permission status - absolute top-right */}
      <button
        type="button"
        className={`resource-discovery__permission resource-discovery__permission--${permissionTone} ${permissionStatus === 'none' ? 'is-clickable' : ''}`}
        onClick={permissionStatus === 'none' ? handleApplyPermission : undefined}
        title={permissionStatus === 'none' ? '点击申请权限' : permissionText}
        aria-label={permissionStatus === 'none' ? `申请 ${record.name} 的权限` : permissionText}
      >
        {permissionStatus === 'granted' ? '★ ' : ''}{permissionText}
      </button>

      {/* Favorite button - absolute top-right corner */}
      <button
        type="button"
        className={`resource-discovery__fav ${isFavorite ? 'is-fav' : ''}`}
        onClick={handleFavorite}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
        aria-pressed={isFavorite}
      >
        {isFavorite ? '★' : '☆'}
      </button>

      {/* Row 2: source + catalog + stats */}
      <div className="resource-discovery__card-row2">
        <span className="resource-discovery__meta-item"><span className="resource-discovery__label">来源</span>{record.sourceSystem ? sourceSystemLabels[record.sourceSystem] : '-'}</span>
        <span className="resource-discovery__meta-item"><span className="resource-discovery__label">目录</span>{record.catalogPath ?? '-'}</span>
        <div className="resource-discovery__stats">
          <span className="resource-discovery__stat"><SearchIcon />{(record.usageCount ?? 0).toLocaleString('zh-CN')}</span>
          <span className="resource-discovery__stat"><EyeIcon />{(record.viewCount ?? 0).toLocaleString('zh-CN')}</span>
        </div>
      </div>

      {/* Row 3: description */}
      {record.description && (
        <div className="resource-discovery__card-row3"><span className="resource-discovery__label">描述</span>{record.description}</div>
      )}

      {/* Row 4: owners + times */}
      <div className="resource-discovery__card-row4">
        <span className="resource-discovery__owner"><span className="resource-discovery__label">技术负责人</span> <strong>{record.owner ?? '-'}</strong></span>
        <span className="resource-discovery__owner"><span className="resource-discovery__label">业务负责人</span> <strong>{record.businessOwner ?? record.owner ?? '-'}</strong></span>
        <span className="resource-discovery__card-row4-right">
          <span className="resource-discovery__time">创建时间 {record.createdAt ?? '-'}</span>
          <span className="resource-discovery__time">更新时间 {record.updatedAt ?? '-'}</span>
        </span>
      </div>
    </article>
  );
}

/* ─── Main Component ───────────────────────── */

export function ResourceDiscoveryPage() {
  const [treeFilter, setTreeFilter] = useState<TreeFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [status, setStatus] = useState<'all' | DiscoveryStatus>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [myResourcesOnly, setMyResourcesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => initialFavoriteIds);

  const records = useMemo(() => {
    return discoveryRecords
      .filter((record) => scope === 'all' || record.discoveryKind === scope)
      .filter((record) => status === 'all' || record.discoveryStatus === status)
      .filter((record) => activeType === 'all' || record.type === activeType)
      .filter((record) => (myResourcesOnly ? record.permissionStatus === 'granted' : true))
      .filter((record) => matchesTree(record, treeFilter))
      .filter((record) => matchesKeyword(record, keyword))
      .sort((a, b) => (b.usageCount ?? 0) - (a.usageCount ?? 0));
  }, [activeType, keyword, myResourcesOnly, scope, status, treeFilter]);

  const toggleFavorite = (resourceId: string) => {
    setFavoriteIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(resourceId)) {
        nextIds.delete(resourceId);
      } else {
        nextIds.add(resourceId);
      }
      return nextIds;
    });
  };

  return (
    <section className="resource-discovery">
      <div className="resource-discovery__layout">
        <aside className="resource-discovery__sidebar" aria-label="业务目录">
          <div className="resource-discovery__sidebar-header">
            <span>业务目录</span>
          </div>
          <div className="resource-discovery__tree-body">
            <button className={treeFilter === 'all' ? 'is-active' : ''} type="button" onClick={() => setTreeFilter('all')}>
              <span>
                <span aria-hidden="true">🌐</span>
                <span>全部</span>
              </span>
              <strong>{getTreeCount('all')}</strong>
            </button>
            <button className={treeFilter === 'unassigned' ? 'is-active is-warning' : 'is-warning'} type="button" onClick={() => setTreeFilter('unassigned')}>
              <span>
                <span aria-hidden="true">⚠️</span>
                <span>未归属</span>
              </span>
              <strong>{getTreeCount('unassigned')}</strong>
            </button>
            <div className="resource-discovery__tree-divider" />
            {treeNodes.map((node) => (
              <button key={node} className={treeFilter === node ? 'is-active' : ''} type="button" onClick={() => setTreeFilter(node)}>
                <span>{node}</span>
                <strong>{getTreeCount(node)}</strong>
              </button>
            ))}
          </div>
        </aside>

        <main className="resource-discovery__content">
          <section className="resource-discovery__filter-panel">
            <div className="resource-discovery__filter-top">
              <label className="resource-discovery__search-wrap">
                <span aria-hidden="true">🔍</span>
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="请输入资产名称/描述关键字" />
              </label>

              <button type="button" className="resource-discovery__owner-trigger">
                <span>
                  <span className="resource-discovery__owner-dot" aria-hidden="true" />
                  <span>负责人</span>
                </span>
                <span>
                  <span>请选择负责人</span>
                  <span aria-hidden="true">▾</span>
                </span>
              </button>

              <button
                className={`resource-discovery__quick-check ${myResourcesOnly ? 'is-active' : ''}`}
                type="button"
                onClick={() => setMyResourcesOnly((value) => !value)}
              >
                ✓ 我的表
              </button>

              <div className="resource-discovery__sort-split">
                <span>
                  <span className="resource-discovery__sort-dot" aria-hidden="true" />
                  <span>排序</span>
                </span>
                <button type="button">倒序 ↓</button>
                <select aria-label="排序字段">
                  <option>热度排序</option>
                  <option>创建时间</option>
                  <option>更新时间</option>
                </select>
              </div>

              <button type="button" className="resource-discovery__tag-filter">
                🏷️ 标签筛选
              </button>
            </div>
            <div className="resource-discovery__filter-groups">
              <div className="resource-discovery__filter-block">
                <span className="resource-discovery__filter-label">范围</span>
                <div className="resource-discovery__seg" role="group" aria-label="结果范围">
                  <button className={scope === 'all' ? 'is-active' : ''} type="button" onClick={() => setScope('all')}>
                    全部
                  </button>
                  <button className={scope === 'asset' ? 'is-active' : ''} type="button" onClick={() => setScope('asset')}>
                    仅资产
                  </button>
                  <button className={scope === 'resource' ? 'is-active' : ''} type="button" onClick={() => setScope('resource')}>
                    仅资源
                  </button>
                </div>
              </div>
              <div className="resource-discovery__filter-block">
                <span className="resource-discovery__filter-label">状态</span>
                <div className="resource-discovery__seg" role="group" aria-label="资源状态">
                  {statusFilters.map((filter) => (
                    <button key={filter.key} className={status === filter.key ? 'is-active' : ''} type="button" onClick={() => setStatus(filter.key)}>
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="resource-discovery__filter-block resource-discovery__filter-block--type">
                <span className="resource-discovery__filter-label">类型</span>
                <div className="resource-discovery__type-scroll">
                  <div className="resource-discovery__seg resource-discovery__type-tabs" role="tablist" aria-label="资源类型">
                    {typeTabs.map((tab) => (
                      <button
                        key={tab.key}
                        role="tab"
                        type="button"
                        aria-selected={activeType === tab.key}
                        className={activeType === tab.key ? 'is-active' : ''}
                        onClick={() => setActiveType(tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="resource-discovery__list" aria-label="资源发现列表">
            <div className="resource-discovery__list-count">
              共 {records.length} 条
              {treeFilter !== 'all' ? <span>{getTreeFilterLabel(treeFilter)}</span> : null}
            </div>
            <div className="resource-discovery__asset-card-list">
              {records.length > 0 ? (
                records.map((record) => (
                  <DiscoveryCard
                    key={`${record.discoveryKind}-${record.id}`}
                    record={record}
                    isFavorite={favoriteIds.has(record.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))
              ) : (
                <EmptyState title="暂无数据" description="可以切换目录、范围、状态或类型筛选。" />
              )}
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}
