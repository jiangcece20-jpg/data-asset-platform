import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Tag } from '../../components/base/Tag';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import './asset-catalog.css';

type CatalogNode = {
  label: string;
  path: string;
  children?: CatalogNode[];
};

type TypeFilter = 'all' | ResourceType;

const catalogTree: CatalogNode[] = [
  {
    label: '交易域',
    path: '交易域',
    children: [
      { label: '订单', path: '交易域/订单' },
      { label: '报表', path: '交易域/报表' },
      { label: '指标', path: '交易域/指标' },
    ],
  },
  {
    label: '用户域',
    path: '用户域',
    children: [
      { label: '行为', path: '用户域/行为' },
      { label: '画像', path: '用户域/画像' },
      { label: 'API', path: '用户域/API' },
    ],
  },
  {
    label: '供应链',
    path: '供应链',
    children: [{ label: '库存', path: '供应链/库存' }],
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
  api: 'API',
  label: '标签',
  view: '视图',
  dashboard: '看板',
};

const typeIcons: Record<ResourceType, string> = {
  table: '▦',
  metric: '◇',
  report: '▣',
  api: '⎁',
  label: '🏷️',
  view: '◫',
  dashboard: '📊',
};

const typeTagTone: Record<ResourceType, 'blue' | 'success' | 'warning' | 'danger' | 'gray' | 'purple' | 'cyan'> = {
  table: 'blue',
  view: 'blue',
  report: 'success',
  metric: 'purple',
  api: 'cyan',
  label: 'gray',
  dashboard: 'success',
};

function flattenCatalog(nodes: CatalogNode[], depth = 0): Array<CatalogNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...(node.children ? flattenCatalog(node.children, depth + 1) : []),
  ]);
}

function getNodeCount(path: string) {
  return mockResources.filter((resource) => resource.catalogPath?.startsWith(path)).length;
}

function matchesKeyword(resource: ResourceSummary, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return [
    resource.name,
    resource.displayName,
    resource.description,
    resource.sourceSystem,
    resource.owner,
    resource.domain,
    resource.catalogPath,
    ...(resource.tags ?? []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
}

function CatalogAssetCard({ resource }: { resource: ResourceSummary }) {
  const dbName = resource.databaseName;
  const showDbPrefix = dbName && (resource.type === 'table' || resource.type === 'view');

  return (
    <article className="asset-catalog__asset-card">
      <div className="asset-catalog__asset-row asset-catalog__asset-row--top">
        <span className="asset-catalog__asset-icon" aria-hidden="true">
          {typeIcons[resource.type]}
        </span>
        <span
          className="asset-catalog__tech-name"
          role="link"
          tabIndex={0}
          onClick={() => { window.location.hash = `detail?domain=asset&id=${resource.id}`; }}
          onKeyDown={(e) => { if (e.key === 'Enter') { window.location.hash = `detail?domain=asset&id=${resource.id}`; } }}
        >
          {showDbPrefix && <span className="asset-catalog__db-prefix">{dbName}.</span>}
          {resource.name}
        </span>
        <button type="button" className="asset-catalog__copy-button" aria-label={`复制 ${resource.name}`}>
          📋
        </button>
        <div className="asset-catalog__asset-tags">
          <Tag tone={typeTagTone[resource.type]}>{typeLabels[resource.type]}</Tag>
          <Tag tone="success">正常</Tag>
          {(resource.tags ?? []).slice(0, 2).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>

      <div className="asset-catalog__asset-row asset-catalog__asset-row--meta">
        <span>
          <strong>来源</strong>
          {resource.sourceSystem ?? '-'}
        </span>
        <span>
          <strong>目录</strong>
          {resource.catalogPath ?? '-'}
        </span>
      </div>

      <div className="asset-catalog__asset-row asset-catalog__asset-row--description">
        <strong>描述</strong>
        <span>{resource.description}</span>
      </div>

      <div className="asset-catalog__asset-row asset-catalog__asset-row--owners">
        <span>
          <strong>技术负责人</strong>
          {resource.owner ?? '-'}
        </span>
        <span>
          <strong>业务负责人</strong>
          {resource.businessOwner ?? resource.owner ?? '-'}
        </span>
      </div>
    </article>
  );
}

export function AssetCatalogPage() {
  const flatCatalog = useMemo(() => flattenCatalog(catalogTree), []);
  const [selectedPath, setSelectedPath] = useState('');
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [myAssetsOnly, setMyAssetsOnly] = useState(false);

  const filteredResources = useMemo(() => {
    return mockResources.filter((resource) => {
      const matchesCatalog = selectedPath ? resource.catalogPath?.startsWith(selectedPath) : true;
      const matchesType = activeType === 'all' ? true : resource.type === activeType;
      const matchesOwner = myAssetsOnly ? resource.permissionStatus === 'granted' : true;
      return matchesCatalog && matchesType && matchesOwner && matchesKeyword(resource, submittedKeyword);
    });
  }, [activeType, myAssetsOnly, selectedPath, submittedKeyword]);

  const submitSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setSubmittedKeyword(keyword.trim());
  };



  return (
    <section className="asset-catalog">
      <div className="asset-catalog__layout">
        <aside className="asset-catalog__sidebar" aria-label="业务线目录">
          <div className="asset-catalog__sidebar-header">
            <span>业务线目录</span>
            <button type="button" onClick={() => setSelectedPath('')} aria-label="重置目录">
              全部
            </button>
          </div>

          <div className="asset-catalog__tree-body">
            {flatCatalog.map((node) => (
              <button
                type="button"
                key={node.path}
                className={`asset-catalog__tree-node ${selectedPath === node.path ? 'is-active' : ''}`}
                style={{ paddingLeft: `${14 + node.depth * 18}px` }}
                onClick={() => setSelectedPath(node.path)}
              >
                <span>{node.label}</span>
                <strong>{getNodeCount(node.path)}</strong>
              </button>
            ))}
          </div>
        </aside>

        <main className="asset-catalog__content">
          <div className="asset-catalog__breadcrumb">{selectedPath ? `全部 / ${selectedPath}` : '全部'}</div>

          <form className="asset-catalog__search-box" role="search" onSubmit={submitSearch}>
            <span className="asset-catalog__search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="请输入搜索内容"
              aria-label="请输入搜索内容"
              autoComplete="off"
            />
            <Button variant="primary" className="asset-catalog__submit" type="submit">
              搜索
            </Button>
          </form>

          <div className="asset-catalog__filter-bar">
            <button type="button" className="asset-catalog__owner-trigger">
              <span>
                <span className="asset-catalog__owner-dot" aria-hidden="true" />
                <span>负责人</span>
              </span>
              <span>
                <span>请选择负责人</span>
                <span aria-hidden="true">▾</span>
              </span>
            </button>

            <button
              type="button"
              className={`asset-catalog__quick-check ${myAssetsOnly ? 'is-active' : ''}`}
              onClick={() => setMyAssetsOnly((value) => !value)}
            >
              ✓ 我的表
            </button>

            <div className="asset-catalog__sort-split">
              <span>
                <span className="asset-catalog__sort-dot" aria-hidden="true" />
                <span>排序</span>
              </span>
              <button type="button">倒序 ↓</button>
              <select aria-label="排序">
                <option>热度排序</option>
                <option>创建时间</option>
                <option>更新时间</option>
              </select>
            </div>

            <button type="button" className="asset-catalog__tag-filter">
              🏷️ 标签筛选
            </button>
          </div>

          <div className="asset-catalog__tabs" role="tablist" aria-label="资产类型">
            {typeTabs.map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeType === tab.key}
                className={activeType === tab.key ? 'is-active' : ''}
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="asset-catalog__list" aria-label="目录资产列表">
            <div className="asset-catalog__list-count">共 {filteredResources.length} 条资产</div>
            <div className="asset-catalog__asset-card-list">
              {filteredResources.length > 0 ? (
                filteredResources.map((resource) => (
                  <CatalogAssetCard
                    key={resource.id}
                    resource={resource}
                  />
                ))
              ) : (
                <EmptyState title="暂无匹配资产" description="可以调整目录、类型或关键字后再试。" />
              )}
            </div>
          </section>
        </main>
      </div>
    </section>
  );
}
