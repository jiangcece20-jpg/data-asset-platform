import { useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { EmptyState } from '../../components/feedback/EmptyState';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import './asset-catalog.css';

type CatalogNode = {
  id: string;
  name: string;
  description?: string;
  children?: CatalogNode[];
};

type TypeFilter = 'all' | ResourceType;

const catalogTree: CatalogNode[] = [
  {
    id: 'trade',
    name: '交易域',
    description: '交易主题域下所有资源',
    children: [
      { id: 'trade-order', name: '订单', children: [{ id: 'trade-order-detail', name: '订单明细' }] },
      { id: 'trade-metric', name: '指标', children: [{ id: 'trade-metric-core', name: '核心指标' }] },
      { id: 'trade-report', name: '报表', children: [{ id: 'trade-report-sales', name: '销售报表' }] },
    ],
  },
  {
    id: 'user',
    name: '用户域',
    description: '用户主题域下所有资源',
    children: [
      { id: 'user-behavior', name: '行为', children: [{ id: 'user-behavior-log', name: '行为日志' }] },
      { id: 'user-profile', name: '画像', children: [{ id: 'user-profile-tag', name: '用户标签' }] },
      { id: 'user-api', name: 'API', children: [{ id: 'user-api-basic', name: '基础API' }] },
    ],
  },
  {
    id: 'supply',
    name: '供应链',
    description: '商品与库存相关资源',
    children: [
      { id: 'supply-product', name: '商品', children: [{ id: 'supply-product-info', name: '商品信息' }] },
      { id: 'supply-stock', name: '库存', children: [{ id: 'supply-stock-detail', name: '库存明细' }] },
    ],
  },
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

function getResourceTitle(resource: ResourceSummary) {
  return resource.displayName ?? resource.name;
}

function flattenNodes(nodes: CatalogNode[], parentPath = ''): Array<CatalogNode & { path: string; depth: number }> {
  return nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    const depth = path.split('/').length - 1;

    return [{ ...node, path, depth }, ...flattenNodes(node.children ?? [], path)];
  });
}

const flatCatalogNodes = flattenNodes(catalogTree);

function getNodeCount(path: string) {
  return mockResources.filter((resource) => resource.catalogPath?.startsWith(path)).length;
}

function matchesKeyword(resource: ResourceSummary, keyword: string) {
  const normalized = keyword.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [
    resource.name,
    resource.displayName,
    resource.description,
    resource.catalogPath,
    resource.owner,
    resource.sourceSystem,
    ...(resource.tags ?? []),
  ].some((field) => field?.toLowerCase().includes(normalized));
}

function ResourceCatalogCard({ resource }: { resource: ResourceSummary }) {
  const permission = permissionLabels[resource.permissionStatus ?? 'unknown'];

  return (
    <article className="asset-catalog__card">
      <div className="asset-catalog__card-head">
        <div>
          <h2>{getResourceTitle(resource)}</h2>
          <div className="asset-catalog__technical-name">{resource.name}</div>
        </div>
        <Button size="sm" variant={resource.permissionStatus === 'granted' ? 'primary' : 'default'}>
          {resource.permissionStatus === 'granted' ? '查看资产' : '申请权限'}
        </Button>
      </div>
      <p>{resource.description}</p>
      <div className="asset-catalog__meta-row">
        <Tag tone={resource.type === 'metric' ? 'purple' : 'blue'}>{typeLabels[resource.type]}</Tag>
        <Tag tone={permission.tone}>{permission.label}</Tag>
        <span>{resource.catalogPath}</span>
      </div>
      <div className="asset-catalog__stats-row">
        <span>负责人 {resource.owner}</span>
        <span>来源 {resource.sourceSystem}</span>
        <span>更新 {resource.updatedAt}</span>
        <span>热度 {resource.usageCount}</span>
        <span>质量分 {resource.qualityScore}</span>
      </div>
    </article>
  );
}

export function AssetCatalogPage() {
  const [selectedPath, setSelectedPath] = useState('');
  const [keyword, setKeyword] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [myAssetsOnly, setMyAssetsOnly] = useState(false);

  const resources = useMemo(() => {
    return mockResources.filter((resource) => {
      const catalogMatched = selectedPath ? resource.catalogPath?.startsWith(selectedPath) : true;
      const typeMatched = activeType === 'all' || resource.type === activeType;
      const ownerMatched = myAssetsOnly ? resource.permissionStatus === 'granted' : true;

      return catalogMatched && typeMatched && ownerMatched && matchesKeyword(resource, keyword);
    });
  }, [activeType, keyword, myAssetsOnly, selectedPath]);

  const selectedNode = selectedPath ? flatCatalogNodes.find((node) => node.path === selectedPath) : undefined;
  const totalHeat = resources.reduce((sum, resource) => sum + (resource.usageCount ?? 0), 0);
  const avgQuality = resources.length
    ? Math.round(resources.reduce((sum, resource) => sum + (resource.qualityScore ?? 0), 0) / resources.length)
    : 0;

  return (
    <section className="asset-catalog">
      <aside className="asset-catalog__tree-panel">
        <div className="asset-catalog__tree-header">
          <span>业务线目录</span>
          <Button size="sm">新增</Button>
        </div>
        <button className={!selectedPath ? 'asset-catalog__tree-node is-active' : 'asset-catalog__tree-node'} type="button" onClick={() => setSelectedPath('')}>
          <span>全部资产</span>
          <strong>{mockResources.length}</strong>
        </button>
        <div className="asset-catalog__tree-list">
          {flatCatalogNodes.map((node) => (
            <button
              key={node.id}
              className={node.path === selectedPath ? 'asset-catalog__tree-node is-active' : 'asset-catalog__tree-node'}
              type="button"
              style={{ paddingLeft: 12 + node.depth * 18 }}
              onClick={() => setSelectedPath(node.path)}
            >
              <span>{node.depth === 0 ? '▸ ' : ''}{node.name}</span>
              <strong>{getNodeCount(node.path)}</strong>
            </button>
          ))}
        </div>
      </aside>

      <main className="asset-catalog__content">
        <header className="asset-catalog__header">
          <div>
            <div className="asset-catalog__eyebrow">Catalog workspace</div>
            <h1>资产目录</h1>
            <p>{selectedNode?.description ?? '按照业务域、主题域和目录层级组织数据资产。'}</p>
          </div>
          <div className="asset-catalog__actions">
            <Button variant="primary">新增目录</Button>
            <Button>目录治理</Button>
          </div>
        </header>

        <div className="asset-catalog__breadcrumb">全部{selectedPath ? ` / ${selectedPath}` : ''}</div>

        <section className="asset-catalog__summary" aria-label="目录概览">
          <div>
            <span>当前资产</span>
            <strong>{resources.length}</strong>
          </div>
          <div>
            <span>累计热度</span>
            <strong>{totalHeat}</strong>
          </div>
          <div>
            <span>平均质量分</span>
            <strong>{avgQuality}</strong>
          </div>
          <div>
            <span>目录层级</span>
            <strong>{selectedPath ? selectedPath.split('/').length : 1}</strong>
          </div>
        </section>

        <div className="asset-catalog__filter-bar">
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="请输入资产名称/描述关键字" />
          <button className={myAssetsOnly ? 'is-active' : ''} type="button" onClick={() => setMyAssetsOnly((value) => !value)}>
            我的表
          </button>
          <select aria-label="排序">
            <option>热度排序</option>
            <option>更新时间</option>
            <option>质量分</option>
          </select>
          <Button size="sm">标签筛选</Button>
        </div>

        <div className="asset-catalog__tabs" role="tablist" aria-label="资产类型">
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

        <section className="asset-catalog__list" aria-label="目录资产列表">
          <div className="asset-catalog__list-head">
            <strong>共 {resources.length} 条资产</strong>
            <span>{selectedPath || '全部目录'}</span>
          </div>
          {resources.length > 0 ? (
            resources.map((resource) => <ResourceCatalogCard key={resource.id} resource={resource} />)
          ) : (
            <EmptyState title="当前目录暂无资产" description="可以切换目录或调整筛选条件。" />
          )}
        </section>
      </main>
    </section>
  );
}
