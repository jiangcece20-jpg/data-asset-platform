import { useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary, ResourceType } from '../../types/resources';
import './resource-management.css';

type ManagementPanel = 'workbench' | 'resource-list' | 'catalog-mgmt';
type ManagementStatus = 'published' | 'maintain' | 'no-list' | 'error';
type StatusFilter = 'all' | ManagementStatus;
type ManagedResource = ResourceSummary & {
  managementStatus: ManagementStatus;
  statusLabel: string;
  platform: string;
  businessOwner: string;
};

const rawManagedResources: ManagedResource[] = [
  {
    id: 'raw-news-info',
    type: 'table',
    name: 'wlyd_industry_news_info_di',
    displayName: '行业资讯原始表',
    description: '行业资讯采集原始明细，缺少业务口径和目录归属，等待维护后上架。',
    sourceSystem: 'MaxCompute',
    owner: '李四',
    businessOwner: '张三',
    permissionStatus: 'none',
    tags: ['行业资讯', 'ODS'],
    updatedAt: '2026-05-13',
    usageCount: 318,
    catalogPath: undefined,
    platform: '离线数仓',
    managementStatus: 'maintain',
    statusLabel: '待维护',
  },
  {
    id: 'raw-click-stream',
    type: 'table',
    name: 'kafka_user_click_raw',
    displayName: '点击流原始流',
    description: '实时用户点击原始流，等待补充字段说明和数据质量规则。',
    sourceSystem: 'Kafka',
    owner: '张三',
    businessOwner: '孙七',
    permissionStatus: 'pending',
    tags: ['用户行为', '实时'],
    updatedAt: '2026-05-15',
    usageCount: 527,
    catalogPath: undefined,
    platform: '实时平台',
    managementStatus: 'maintain',
    statusLabel: '待维护',
  },
  {
    id: 'raw-inventory-api',
    type: 'api',
    name: 'api_inventory_check',
    displayName: '库存校验接口',
    description: '供应链库存查询服务，等待补齐 SLA 与调用说明。',
    sourceSystem: '内部微服务',
    owner: '王五',
    businessOwner: '吴九',
    permissionStatus: 'granted',
    tags: ['库存', '接口'],
    catalogPath: '供应链/库存/库存明细',
    updatedAt: '2026-05-14',
    usageCount: 489,
    platform: '数据服务网关',
    managementStatus: 'maintain',
    statusLabel: '待维护',
  },
];

const managedResources: ManagedResource[] = [
  ...mockResources
    .filter((resource) =>
      [
        'resource-table-order-detail',
        'resource-report-gmv-daily',
        'resource-metric-gmv-core',
        'resource-label-user-profile',
        'resource-dashboard-stock',
      ].includes(resource.id),
    )
    .map((resource) => ({
      ...resource,
      businessOwner: resource.owner ?? '-',
      platform: resource.sourceSystem ?? '-',
      managementStatus: 'published' as const,
      statusLabel: '已上架',
    })),
  ...rawManagedResources,
];

const panelNav: Array<{ key: ManagementPanel; label: string; icon: string; section: '资源管理' | '目录管理' }> = [
  { key: 'workbench', label: '工作台', icon: '▦', section: '资源管理' },
  { key: 'resource-list', label: '资源列表', icon: '▣', section: '资源管理' },
  { key: 'catalog-mgmt', label: '目录管理', icon: '📁', section: '目录管理' },
];

const statusTabs: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'maintain', label: '待维护' },
  { key: 'published', label: '已上架' },
  { key: 'no-list', label: '不上架' },
  { key: 'error', label: '异常' },
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

const catalogNodes = [
  { name: '交易域', count: 3, children: ['订单', '报表', '指标'] },
  { name: '用户域', count: 3, children: ['行为', '画像', 'API'] },
  { name: '供应链', count: 2, children: ['库存'] },
];

function getTitle(resource: ManagedResource) {
  return resource.displayName ?? resource.name;
}

function matchesKeyword(resource: ManagedResource, keyword: string) {
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
    resource.businessOwner,
    resource.catalogPath,
    ...(resource.tags ?? []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedKeyword));
}

function getStatusTone(status: ManagementStatus): 'success' | 'warning' | 'gray' | 'danger' {
  if (status === 'published') return 'success';
  if (status === 'maintain') return 'warning';
  if (status === 'error') return 'danger';
  return 'gray';
}

function WorkbenchPanel({ onOpenList }: { onOpenList: () => void }) {
  const maintainCount = managedResources.filter((resource) => resource.managementStatus === 'maintain').length;

  return (
    <section className="resource-management__panel">
      <h1>工作台</h1>
      <div className="resource-management__stats">
        <button type="button" className="resource-management__stat-card" onClick={onOpenList}>
          <span>我负责的资源</span>
          <strong>{managedResources.length}</strong>
          <small>已纳入管理台</small>
        </button>
        <button type="button" className="resource-management__stat-card warning">
          <span>待处理事项</span>
          <strong>{maintainCount}</strong>
          <small>待维护资源</small>
        </button>
        <div className="resource-management__stat-card">
          <span>本周变更</span>
          <strong>12</strong>
          <small>目录/标签/负责人</small>
        </div>
        <div className="resource-management__stat-card">
          <span>资源健康度</span>
          <strong>86%</strong>
          <div className="resource-management__health-bar">
            <span style={{ width: '86%' }} />
          </div>
        </div>
      </div>

      <div className="resource-management__workbench-grid">
        <section className="resource-management__card">
          <h2>待处理事项</h2>
          <div className="resource-management__todo-list">
            <div>
              <strong>补充元数据</strong>
              <span>行业资讯原始表缺少字段说明</span>
              <Tag tone="warning">待维护</Tag>
            </div>
            <div>
              <strong>确认目录归属</strong>
              <span>点击流原始流当前未归属</span>
              <Tag tone="blue">目录</Tag>
            </div>
            <div>
              <strong>完善服务 SLA</strong>
              <span>库存校验接口需补充调用说明</span>
              <Tag tone="purple">API</Tag>
            </div>
          </div>
        </section>

        <section className="resource-management__card">
          <h2>今日操作记录</h2>
          <div className="resource-management__timeline">
            <div>
              <strong>李四</strong>
              <span>更新了 行业资讯原始表 的资源描述</span>
              <time>09:42</time>
            </div>
            <div>
              <strong>张三</strong>
              <span>将 点击流原始流 标记为待维护</span>
              <time>10:18</time>
            </div>
            <div>
              <strong>王五</strong>
              <span>提交 库存校验接口 上架信息</span>
              <time>11:05</time>
            </div>
          </div>
        </section>
      </div>

      <section className="resource-management__card">
        <div className="resource-management__card-head">
          <h2>我的申请（进行中）</h2>
          <button type="button">查看全部 →</button>
        </div>
        <div className="resource-management__request-list">
          <span>GMV 核心指标 · 权限续期审批中</span>
          <span>库存校验接口 · 上架信息审核中</span>
        </div>
      </section>
    </section>
  );
}

function ResourceListPanel() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  const rows = useMemo(() => {
    return managedResources
      .filter((resource) => (status === 'all' ? true : resource.managementStatus === status))
      .filter((resource) => (typeFilter === 'all' ? true : resource.type === typeFilter))
      .filter((resource) => (unassignedOnly ? !resource.catalogPath : true))
      .filter((resource) => (mineOnly ? resource.owner === '李四' : true))
      .filter((resource) => matchesKeyword(resource, keyword));
  }, [keyword, mineOnly, status, typeFilter, unassignedOnly]);

  const maintainCount = managedResources.filter((resource) => resource.managementStatus === 'maintain').length;

  return (
    <section className="resource-management__panel">
      <h1>资源列表</h1>
      <div className="resource-management__status-tabs" role="tablist" aria-label="资源状态">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={status === tab.key}
            className={status === tab.key ? 'active' : ''}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
            {tab.key === 'maintain' ? <span className="resource-management__badge">{maintainCount}</span> : null}
            {tab.key === 'error' ? <span className="resource-management__badge danger">4</span> : null}
          </button>
        ))}
      </div>

      <div className="resource-management__batch-bar">
        <span>未选择</span>
        <span>共 {rows.length} 条资源</span>
      </div>

      <div className="resource-management__toolbar">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索资源名称…" />
        <select aria-label="全部类型" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ResourceType)}>
          <option value="all">全部类型</option>
          <option value="table">表</option>
          <option value="api">API</option>
          <option value="report">报表</option>
          <option value="label">标签</option>
          <option value="metric">指标</option>
        </select>
        <button type="button" className={unassignedOnly ? 'active' : ''} onClick={() => setUnassignedOnly((value) => !value)}>
          {unassignedOnly ? '☑' : '☐'} 未归属
        </button>
        <button type="button" className={mineOnly ? 'active' : ''} onClick={() => setMineOnly((value) => !value)}>
          {mineOnly ? '☑' : '☐'} 仅我负责
        </button>
        <div className="resource-management__toolbar-right">
          <Button variant="primary" size="sm">＋ 新增资源</Button>
          <Button size="sm">📝 操作记录</Button>
        </div>
      </div>

      <div className="resource-management__table-wrap">
        <table>
          <thead>
            <tr>
              <th aria-label="选择"><input type="checkbox" /></th>
              <th>资源名称</th>
              <th>类型</th>
              <th>平台/来源</th>
              <th>当前状态</th>
              <th>目录归属</th>
              <th>资源描述</th>
              <th>技术负责人</th>
              <th>业务负责人</th>
              <th>标签</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((resource) => (
              <tr key={resource.id}>
                <td><input type="checkbox" aria-label={`选择 ${getTitle(resource)}`} /></td>
                <td>
                  <div className="resource-management__resource-cell">
                    <strong>{getTitle(resource)}</strong>
                    <span>{resource.name}</span>
                  </div>
                </td>
                <td><Tag tone={resource.type === 'metric' ? 'purple' : 'blue'}>{typeLabels[resource.type]}</Tag></td>
                <td>{resource.platform}</td>
                <td><Tag tone={getStatusTone(resource.managementStatus)}>{resource.statusLabel}</Tag></td>
                <td>{resource.catalogPath ?? '未归属'}</td>
                <td>{resource.description}</td>
                <td>{resource.owner}</td>
                <td>{resource.businessOwner}</td>
                <td>
                  <div className="resource-management__tag-list">
                    {(resource.tags ?? []).slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}
                  </div>
                </td>
                <td>{resource.updatedAt}</td>
                <td><button type="button">编辑</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CatalogManagementPanel() {
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const selectedNode = catalogNodes.find((node) => node.name === selectedCatalog);

  return (
    <section className="resource-management__panel resource-management__panel--full">
      <h1>目录管理</h1>
      <div className="resource-management__catalog-layout">
        <section className="resource-management__catalog-tree">
          <div className="resource-management__catalog-head">
            <span>目录结构</span>
            <Button variant="primary" size="sm">➕ 新增一级</Button>
          </div>
          <div className="resource-management__catalog-tree-body" role="tree" aria-label="目录结构">
            {catalogNodes.map((node) => (
              <button
                key={node.name}
                type="button"
                role="treeitem"
                aria-label={node.name}
                className={selectedCatalog === node.name ? 'active' : ''}
                onClick={() => setSelectedCatalog(node.name)}
              >
                <span><span aria-hidden="true">▸</span> {node.name}</span>
                <strong>{node.count}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="resource-management__catalog-detail">
          <div className="resource-management__catalog-detail-head">
            <span>{selectedNode ? selectedNode.name : '请在左侧选择目录节点'}</span>
          </div>
          <div className="resource-management__catalog-detail-body">
            {selectedNode ? (
              <>
                <h2>{selectedNode.name}</h2>
                <p>{`当前目录资源 ${selectedNode.count} 个`}</p>
                <div className="resource-management__catalog-children">
                  {selectedNode.children.map((child) => <Tag key={child} tone="blue">{child}</Tag>)}
                </div>
              </>
            ) : (
              <div className="resource-management__empty-catalog">
                <div>📁</div>
                <span>点击左侧目录节点查看详情</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export function ResourceManagementPage() {
  const [activePanel, setActivePanel] = useState<ManagementPanel>('workbench');

  const groupedNav = panelNav.reduce<Record<string, typeof panelNav>>((groups, item) => {
    groups[item.section] = groups[item.section] ?? [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return (
    <section className="resource-management">
      <nav className="resource-management__sidebar" aria-label="资源管理导航">
        {Object.entries(groupedNav).map(([section, items], index) => (
          <div className="resource-management__sidebar-section" key={section}>
            {index > 0 ? <div className="resource-management__sidebar-divider" /> : null}
            <div className="resource-management__sidebar-title">{section}</div>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activePanel === item.key ? 'active' : ''}
                onClick={() => setActivePanel(item.key)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main className="resource-management__main">
        {activePanel === 'workbench' ? <WorkbenchPanel onOpenList={() => setActivePanel('resource-list')} /> : null}
        {activePanel === 'resource-list' ? <ResourceListPanel /> : null}
        {activePanel === 'catalog-mgmt' ? <CatalogManagementPanel /> : null}
      </main>
    </section>
  );
}
