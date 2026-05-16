import { useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
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

const treeNodes = ['交易域', '用户域', '供应链'];

function getTitle(record: DiscoveryRecord) {
  return record.displayName ?? record.name;
}

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
  const permission = permissionLabels[record.permissionStatus ?? 'unknown'];

  return (
    <article className="resource-discovery__card">
      <div className="resource-discovery__card-main">
        <div className="resource-discovery__card-top">
          <Tag tone={record.discoveryKind === 'asset' ? 'blue' : 'cyan'}>{record.discoveryKind === 'asset' ? '资产' : '资源'}</Tag>
          <Tag tone={record.type === 'metric' ? 'purple' : 'gray'}>{typeLabels[record.type]}</Tag>
          <Tag tone={record.discoveryStatus === 'published' ? 'success' : record.discoveryStatus === 'maintain' ? 'warning' : 'gray'}>
            {record.discoveryStatus === 'published' ? '已上架' : record.discoveryStatus === 'maintain' ? '待维护' : '不上架'}
          </Tag>
        </div>
        <h2>{getTitle(record)}</h2>
        <div className="resource-discovery__technical-name">{record.name}</div>
        <p>{record.description}</p>
        <div className="resource-discovery__tag-row">
          {(record.tags ?? []).slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <aside className="resource-discovery__card-side">
        <Tag tone={permission.tone}>{permission.label}</Tag>
        <dl>
          <div>
            <dt>来源</dt>
            <dd>{record.sourceSystem}</dd>
          </div>
          <div>
            <dt>目录</dt>
            <dd>{record.catalogPath ?? '未归属'}</dd>
          </div>
          <div>
            <dt>负责人</dt>
            <dd>{record.owner}</dd>
          </div>
          <div>
            <dt>热度</dt>
            <dd>{record.usageCount}</dd>
          </div>
        </dl>
        <div className="resource-discovery__card-actions">
          <Button size="sm">查看详情</Button>
          <Button size="sm" variant={record.permissionStatus === 'granted' ? 'primary' : 'default'}>
            {record.permissionStatus === 'granted' ? '直接使用' : '加入申请单'}
          </Button>
        </div>
      </aside>
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

  const recommended = discoveryRecords
    .filter((record) => record.discoveryKind === 'asset' && record.permissionStatus === 'granted')
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
    .slice(0, 3);
  const hotCount = discoveryRecords.filter((record) => (record.usageCount ?? 0) > 700).length;

  return (
    <section className="resource-discovery">
      <aside className="resource-discovery__tree-panel">
        <div className="resource-discovery__tree-header">业务目录</div>
        <button className={treeFilter === 'all' ? 'is-active' : ''} type="button" onClick={() => setTreeFilter('all')}>
          <span>全部</span>
          <strong>{getTreeCount('all')}</strong>
        </button>
        <button className={treeFilter === 'unassigned' ? 'is-active is-warning' : 'is-warning'} type="button" onClick={() => setTreeFilter('unassigned')}>
          <span>未归属</span>
          <strong>{getTreeCount('unassigned')}</strong>
        </button>
        <div className="resource-discovery__tree-divider" />
        {treeNodes.map((node) => (
          <button key={node} className={treeFilter === node ? 'is-active' : ''} type="button" onClick={() => setTreeFilter(node)}>
            <span>{node}</span>
            <strong>{getTreeCount(node)}</strong>
          </button>
        ))}
      </aside>

      <main className="resource-discovery__content">
        <header className="resource-discovery__hero">
          <div>
            <div className="resource-discovery__eyebrow">Discovery workspace</div>
            <h1>资源发现</h1>
            <p>把已上架资产、待维护资源和可申请数据入口放进同一个发现池。</p>
          </div>
          <div className="resource-discovery__hero-actions">
            <Button variant="primary">查看推荐</Button>
            <Button>筛选资源</Button>
          </div>
        </header>

        <section className="resource-discovery__overview" aria-label="资源发现概览">
          <div>
            <span>统一资源池</span>
            <strong>{discoveryRecords.length}</strong>
          </div>
          <div>
            <span>推荐资源</span>
            <strong>{recommended.length}</strong>
          </div>
          <div>
            <span>热门资源</span>
            <strong>{hotCount}</strong>
          </div>
          <div>
            <span>未归属</span>
            <strong>{getTreeCount('unassigned')}</strong>
          </div>
        </section>

        <section className="resource-discovery__recommend-panel">
          <div className="resource-discovery__panel-head">
            <h2>推荐资源</h2>
            <span>优先展示已授权、高质量、高热度资源</span>
          </div>
          <div className="resource-discovery__recommend-grid">
            {recommended.map((record) => (
              <button key={record.id} type="button" onClick={() => setKeyword(getTitle(record))}>
                <Tag tone="success">已授权</Tag>
                <strong>{getTitle(record)}</strong>
                <span>{record.catalogPath}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="resource-discovery__filter-panel">
          <div className="resource-discovery__filter-top">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="请输入资产名称/描述关键字" />
            <button className={myResourcesOnly ? 'is-active' : ''} type="button" onClick={() => setMyResourcesOnly((value) => !value)}>
              我的表
            </button>
            <select aria-label="排序字段">
              <option>热度排序</option>
              <option>创建时间</option>
              <option>更新时间</option>
            </select>
            <Button size="sm">标签筛选</Button>
          </div>
          <div className="resource-discovery__filter-groups">
            <div>
              <span>范围</span>
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
            <div>
              <span>状态</span>
              {statusFilters.map((filter) => (
                <button key={filter.key} className={status === filter.key ? 'is-active' : ''} type="button" onClick={() => setStatus(filter.key)}>
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="resource-discovery__type-tabs" role="tablist" aria-label="资源类型">
              <span>类型</span>
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
        </section>

        <section className="resource-discovery__list" aria-label="资源发现列表">
          <div className="resource-discovery__list-head">
            <strong>共 {records.length} 条</strong>
            <span>当前范围：{getTreeFilterLabel(treeFilter)}</span>
          </div>
          {records.length > 0 ? (
            records.map((record) => <DiscoveryCard key={`${record.discoveryKind}-${record.id}`} record={record} />)
          ) : (
            <EmptyState title="暂无数据" description="可以切换目录、范围、状态或类型筛选。" />
          )}
        </section>
      </main>
    </section>
  );
}
