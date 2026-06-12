import { type ReactNode, useMemo, useState, useRef, useCallback } from 'react';
import { Button } from '../../components/base/Button';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Modal } from '../../components/feedback/Modal';
import { Tag } from '../../components/base/Tag';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import { sourceSystemLabels } from '../../types/resources';
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

const statusLabels: Record<NonNullable<ResourceSummary['status']>, string> = {
  published: '正常',
  draft: '草稿',
  deprecated: '已下线',
};

const statusTagTone: Record<NonNullable<ResourceSummary['status']>, 'success' | 'gray' | 'warning'> = {
  published: 'success',
  draft: 'gray',
  deprecated: 'warning',
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

function highlightText(text: string, kw: string): ReactNode {
  const normalized = kw.trim().toLowerCase();
  if (!normalized || !text) return text;
  const idx = text.toLowerCase().indexOf(normalized);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <em>{text.slice(idx, idx + normalized.length)}</em>
      {text.slice(idx + normalized.length)}
    </>
  );
}

/* ─── Asset Card Sub-component ─────────────── */

function CatalogAssetCard({
  resource,
  isFavorite,
  onToggleFavorite,
  onApplyPermission,
}: {
  resource: ResourceSummary;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onApplyPermission: (id: string) => void;
}) {
  const permissionStatus = resource.permissionStatus ?? 'unknown';
  const resourceStatus = resource.status ?? 'published';
  const IconComponent = typeIcons[resource.type] ?? TableIcon;

  const dbPrefix = (resource.type === 'table' || resource.type === 'view') ? resource.databaseName : undefined;

  const navigateToDetail = () => {
    window.location.hash = `#detail?domain=asset&id=${encodeURIComponent(resource.id)}`;
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateToDetail();
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(resource.name);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(resource.id);
  };

  const handlePermissionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionStatus === 'none') {
      onApplyPermission(resource.id);
    }
  };

  const permissionTone = permissionStatus === 'granted' ? 'granted'
    : permissionStatus === 'pending' ? 'pending'
    : permissionStatus === 'none' ? 'apply'
    : 'disabled';
  const permissionText = permissionStatus === 'granted' ? '已有权限'
    : permissionStatus === 'pending' ? '申请中'
    : '申请权限';

  return (
    <article className="asset-catalog__asset-card" onClick={navigateToDetail}>
      {/* Row 1: icon + name + copy + tags */}
      <div className="asset-catalog__card-row1">
        <span className="asset-catalog__asset-icon"><IconComponent /></span>
        <a className="asset-catalog__asset-name" href={`#detail?domain=asset&id=${encodeURIComponent(resource.id)}`} onClick={handleNameClick}>
          {dbPrefix && <span className="asset-catalog__name-prefix">{dbPrefix}.</span>}
          {resource.name}
        </a>
        <button type="button" className="asset-catalog__copy-btn" onClick={handleCopy} title="复制表名" aria-label={`复制 ${resource.name}`}>
          📋
        </button>
        <span className="asset-catalog__card-tags">
          <Tag tone={typeTagTone[resource.type]}>{typeLabels[resource.type]}</Tag>
          <Tag tone={statusTagTone[resourceStatus]}>{statusLabels[resourceStatus]}</Tag>
          {(resource.tags ?? []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </span>
      </div>

      {/* Permission status - absolute top-right */}
      <span
        className={`asset-catalog__permission asset-catalog__permission--${permissionTone}`}
        onClick={handlePermissionClick}
      >
        {permissionStatus === 'granted' ? '★ ' : ''}{permissionText}
      </span>

      {/* Favorite button - absolute top-right corner */}
      <button
        type="button"
        className={`asset-catalog__fav ${isFavorite ? 'is-fav' : ''}`}
        onClick={handleFavorite}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
        aria-pressed={isFavorite}
      >
        {isFavorite ? '★' : '☆'}
      </button>

      {/* Row 2: source + catalog + stats */}
      <div className="asset-catalog__card-row2">
        <span className="asset-catalog__meta-item"><span className="asset-catalog__label">来源</span>{resource.sourceSystem ? sourceSystemLabels[resource.sourceSystem] : '-'}</span>
        <span className="asset-catalog__meta-item"><span className="asset-catalog__label">目录</span>{resource.catalogPath ?? '-'}</span>
        <div className="asset-catalog__stats">
          <span className="asset-catalog__stat"><SearchIcon />{(resource.usageCount ?? 0).toLocaleString('zh-CN')}</span>
          <span className="asset-catalog__stat"><EyeIcon />{(resource.viewCount ?? 0).toLocaleString('zh-CN')}</span>
        </div>
      </div>

      {/* Row 3: description */}
      {resource.description && (
        <div className="asset-catalog__card-row3"><span className="asset-catalog__label">描述</span>{resource.description}</div>
      )}

      {/* Row 4: owners + times */}
      <div className="asset-catalog__card-row4">
        <span className="asset-catalog__owner"><span className="asset-catalog__label">技术负责人</span> <strong>{resource.owner ?? '-'}</strong></span>
        <span className="asset-catalog__owner"><span className="asset-catalog__label">业务负责人</span> <strong>{resource.businessOwner ?? resource.owner ?? '-'}</strong></span>
        <span className="asset-catalog__card-row4-right">
          <span className="asset-catalog__time">创建时间 {resource.createdAt ?? '-'}</span>
          <span className="asset-catalog__time">更新时间 {resource.updatedAt ?? '-'}</span>
        </span>
      </div>
    </article>
  );
}

/* ─── Main Component ───────────────────────── */

export function AssetCatalogPage() {
  const flatCatalog = useMemo(() => flattenCatalog(catalogTree), []);
  const [selectedPath, setSelectedPath] = useState('');
  const [keyword, setKeyword] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [myAssetsOnly, setMyAssetsOnly] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const suggestRef = useRef<HTMLDivElement>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    new Set(mockResources.filter((r) => r.permissionStatus === 'granted').map((r) => r.id))
  );
  const [cartCount, setCartCount] = useState(0);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<ResourceSummary | null>(null);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const applyPermission = (id: string) => {
    const r = mockResources.find((res) => res.id === id);
    if (!r) return;
    setPermTarget(r);
    setCartCount((c) => c + 1);
    setPermModalOpen(true);
  };

  const filteredResources = useMemo(() => {
    return mockResources.filter((resource) => {
      const matchesCatalog = selectedPath ? resource.catalogPath?.startsWith(selectedPath) : true;
      const matchesType = activeType === 'all' ? true : resource.type === activeType;
      const matchesOwner = myAssetsOnly ? resource.permissionStatus === 'granted' : true;
      return matchesCatalog && matchesType && matchesOwner && matchesKeyword(resource, keyword);
    });
  }, [activeType, myAssetsOnly, selectedPath, keyword]);

  const suggestions = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [];
    return mockResources.filter((r) => matchesKeyword(r, keyword)).slice(0, 8);
  }, [keyword]);

  const handleSearchInput = useCallback((value: string) => {
    setKeyword(value);
    setSuggestOpen(value.trim().length > 0);
    setSuggestIndex(-1);
  }, []);

  const handleSearchFocus = useCallback(() => {
    if (keyword.trim().length > 0) setSuggestOpen(true);
  }, [keyword]);

  const handleSearchBlur = useCallback(() => {
    setTimeout(() => setSuggestOpen(false), 200);
  }, []);

  const handleSearchKeydown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestIndex >= 0 && suggestIndex < suggestions.length) {
        window.location.hash = `#detail?domain=asset&id=${encodeURIComponent(suggestions[suggestIndex].id)}`;
        setSuggestOpen(false);
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  }, [suggestOpen, suggestions, suggestIndex]);

  const openSuggestion = useCallback((id: string) => {
    window.location.hash = `#detail?domain=asset&id=${encodeURIComponent(id)}`;
    setSuggestOpen(false);
  }, []);

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

          <div className="asset-catalog__filter-bar">
            <div className="asset-catalog__search-wrap" ref={suggestRef}>
              <SearchIcon />
              <input
                value={keyword}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeydown}
                placeholder="请输入资产名称/描述关键字"
                aria-label="请输入资产名称/描述关键字"
                autoComplete="off"
              />

              {suggestOpen && suggestions.length > 0 && (
                <div className="asset-catalog__suggest-panel">
                  <div className="asset-catalog__suggest-header">
                    <span className="asset-catalog__suggest-header-title">⚡ 快速命中建议</span>
                    <span className="asset-catalog__suggest-header-count">共 {suggestions.length} 条</span>
                  </div>
                  <div className="asset-catalog__suggest-list">
                    {suggestions.map((s, i) => {
                      const sDbPrefix = (s.type === 'table' || s.type === 'view') ? s.databaseName : undefined;
                      const resourceStatus = s.status ?? 'published';
                      const hits: Array<{ label: string; text: string }> = [];
                      if (s.description && keyword.trim() && s.description.toLowerCase().includes(keyword.trim().toLowerCase())) {
                        hits.push({ label: '描述', text: keyword.trim() });
                      }
                      if (s.tags?.some((t) => t.toLowerCase().includes(keyword.trim().toLowerCase()))) {
                        hits.push({ label: '标签', text: keyword.trim() });
                      }
                      return (
                        <div
                          key={s.id}
                          className={`asset-catalog__suggest-item ${i === suggestIndex ? 'is-active' : ''}`}
                          onMouseDown={() => openSuggestion(s.id)}
                        >
                          <div className="asset-catalog__suggest-item-left">
                            <div className="asset-catalog__suggest-item-name">
                              {sDbPrefix && <span className="asset-catalog__name-prefix">{sDbPrefix}.</span>}
                              {highlightText(s.name, keyword)}
                            </div>
                            <div className="asset-catalog__suggest-item-tags">
                              <Tag tone={typeTagTone[s.type]}>{typeLabels[s.type]}</Tag>
                              <Tag tone={statusTagTone[resourceStatus]}>{statusLabels[resourceStatus]}</Tag>
                              {s.displayName && <span className="asset-catalog__suggest-item-display">{s.displayName}</span>}
                            </div>
                            <div className="asset-catalog__suggest-item-meta">
                              {hits.slice(0, 3).map((h) => (
                                <span key={h.label} className="asset-catalog__suggest-hit">
                                  <span className="asset-catalog__suggest-hit-label">{h.label}</span>
                                  <span className="asset-catalog__suggest-hit-text">{highlightText(h.text, keyword)}</span>
                                </span>
                              ))}
                              {hits.length > 3 && <span className="asset-catalog__suggest-hit-more">+{hits.length - 3} 项</span>}
                              <span className="asset-catalog__suggest-owner">👤 {s.owner ?? '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="asset-catalog__suggest-footer">
                    <span className="asset-catalog__suggest-shortcuts">
                      <span className="asset-catalog__suggest-key">↑</span>
                      <span className="asset-catalog__suggest-key">↓</span>
                      <span className="asset-catalog__suggest-sep">切换选中</span>
                      <span className="asset-catalog__suggest-key">Enter</span>
                      <span className="asset-catalog__suggest-sep">查看详情</span>
                      <span className="asset-catalog__suggest-key">Esc</span>
                      <span className="asset-catalog__suggest-sep">收起下拉</span>
                    </span>
                    <span className="asset-catalog__suggest-footer-note">输入时实时命中，点击候选可直接进入</span>
                  </div>
                </div>
              )}
            </div>

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
                    isFavorite={favoriteIds.has(resource.id)}
                    onToggleFavorite={toggleFavorite}
                    onApplyPermission={applyPermission}
                  />
                ))
              ) : (
                <EmptyState title="暂无匹配资产" description="可以调整目录、类型或关键字后再试。" />
              )}
            </div>
          </section>
        </main>
      </div>

      <Modal open={permModalOpen} title="加入申请单" onClose={() => setPermModalOpen(false)}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>已加入申请单</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{permTarget?.name}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>当前申请单共 <span style={{ color: '#1677ff', fontWeight: 600 }}>{cartCount}</span> 项资产</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Button variant="default" onClick={() => setPermModalOpen(false)}>继续浏览</Button>
          <Button
            variant="primary"
            onClick={() => {
              setPermModalOpen(false);
              window.location.hash = 'my?section=cart';
            }}
          >
            去申请单提交 →
          </Button>
        </div>
      </Modal>
    </section>
  );
}
