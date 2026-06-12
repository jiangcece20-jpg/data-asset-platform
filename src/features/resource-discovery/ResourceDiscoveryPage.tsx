import { useMemo, useState } from 'react';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
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
    owner: '李四',
    permissionStatus: 'none',
    tags: ['行业资讯', 'ODS', '新闻'],
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
    owner: '张三',
    permissionStatus: 'pending',
    tags: ['用户行为', '点击流', '实时'],
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

const typeTagTone: Record<ResourceType, 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan'> = {
  table: 'blue',
  view: 'blue',
  report: 'success',
  metric: 'purple',
  api: 'cyan',
  label: 'gray',
};

const treeNodes = ['交易域', '用户域', '供应链'];

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

function DiscoveryCard({ record }: { record: DiscoveryRecord }) {
  const dbName = record.databaseName;
  const showDbPrefix = dbName && (record.type === 'table' || record.type === 'view');

  return (
    <article className="resource-discovery__asset-card">
      <div className="resource-discovery__asset-row resource-discovery__asset-row--top">
        <span className="resource-discovery__asset-icon" aria-hidden="true">
          {typeIcons[record.type]}
        </span>
        <span
          className="resource-discovery__tech-name"
          role="link"
          tabIndex={0}
          onClick={() => { window.location.hash = `detail?domain=${record.discoveryKind}&id=${record.id}`; }}
          onKeyDown={(e) => { if (e.key === 'Enter') { window.location.hash = `detail?domain=${record.discoveryKind}&id=${record.id}`; } }}
        >
          {showDbPrefix && <span className="resource-discovery__db-prefix">{dbName}.</span>}
          {record.name}
        </span>
        <button type="button" className="resource-discovery__copy-button" aria-label={`复制 ${record.name}`}>
          📋
        </button>
        <div className="resource-discovery__asset-tags">
          <Tag tone={typeTagTone[record.type]}>{typeLabels[record.type]}</Tag>
          <Tag tone="success">正常</Tag>
          {(record.tags ?? []).slice(0, 2).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>

      <div className="resource-discovery__asset-row resource-discovery__asset-row--meta">
        <span>
          <strong>来源</strong>
          {record.sourceSystem ?? '-'}
        </span>
        <span>
          <strong>目录</strong>
          {record.catalogPath ?? '未归属'}
        </span>
      </div>

      <div className="resource-discovery__asset-row resource-discovery__asset-row--description">
        <strong>描述</strong>
        <span>{record.description}</span>
      </div>

      <div className="resource-discovery__asset-row resource-discovery__asset-row--owners">
        <span>
          <strong>技术负责人</strong>
          {record.owner ?? '-'}
        </span>
        <span>
          <strong>业务负责人</strong>
          {record.businessOwner ?? record.owner ?? '-'}
        </span>
      </div>
    </article>
  );
}

export function ResourceDiscoveryPage() {
  const [treeFilter, setTreeFilter] = useState<TreeFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [status, setStatus] = useState<'all' | DiscoveryStatus>('all');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [myResourcesOnly, setMyResourcesOnly] = useState(false);

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
