export type AppRouteKey =
  | 'search'
  | 'catalog'
  | 'detail'
  | 'discovery'
  | 'management'
  | 'workbench'
  | 'ai-find'
  | 'permissions'
  | 'lineage'
  | 'my'
  | 'datasource'
  | 'data-standard'
  | 'data-standard-draft'
  | 'table-builder'
  | 'table-builder-new';

export type AppRoute = {
  key: AppRouteKey;
  label: string;
};

export const appRoutes: AppRoute[] = [
  { key: 'search', label: '资产检索' },
  { key: 'catalog', label: '资产目录' },
  { key: 'discovery', label: '资源发现' },
  { key: 'management', label: '资源管理' },
  { key: 'workbench', label: '即席查询' },
  { key: 'ai-find', label: 'AI 找数' },
  { key: 'lineage', label: '血缘追溯' },
  { key: 'permissions', label: '权限中心' },
  { key: 'my', label: '我的' },
];

/* ── 产品线 ───────────────────────────────────────────── */

export type ProductLineKey = 'data-asset' | 'data-source' | 'chatbi' | 'data-standard' | 'table-builder';

export type ProductLine = {
  key: ProductLineKey;
  name: string;
  icon: string;
  status: '正式' | '建设中';
  description: string;
};

export const productLines: ProductLine[] = [
  {
    key: 'data-asset',
    name: '数据资产',
    icon: '🗃️',
    status: '正式',
    description: '资产检索、目录、发现、管理、查询、血缘等全链路能力',
  },
  {
    key: 'data-source',
    name: '数据之源',
    icon: '🔌',
    status: '正式',
    description: '数据源接入与元数据采集管理平台',
  },
  {
    key: 'chatbi',
    name: '智能问数',
    icon: '🧠',
    status: '正式',
    description: 'ChatBI 问数与指标分析原型',
  },
  {
    key: 'data-standard',
    name: '数据标准',
    icon: '📘',
    status: '建设中',
    description: '标准集与已发布数据标准轻量壳，承接建表工具的缺标草稿',
  },
  {
    key: 'table-builder',
    name: '建表工具',
    icon: '🛠️',
    status: '建设中',
    description: '选库建表 + 标准推荐四步向导原型',
  },
];

export function getProductLineFromHash(hash: string): ProductLineKey {
  const path = hash.replace('#', '').split('?')[0];
  if (path.startsWith('datasource')) return 'data-source';
  if (path.startsWith('ai-find')) return 'chatbi';
  if (path.startsWith('table-builder')) return 'table-builder';
  if (path.startsWith('data-standard')) return 'data-standard';
  return 'data-asset';
}

export function getRouteFromHash(hash: string): AppRouteKey {
  const path = hash.replace('#', '').split('?')[0];

  if (path.startsWith('datasource')) return 'datasource';
  if (path === 'detail') return 'detail';
  if (path === 'ai-find') return 'ai-find';
  if (path === 'table-builder/new') return 'table-builder-new';
  if (path === 'table-builder') return 'table-builder';
  if (path === 'data-standard/draft') return 'data-standard-draft';
  if (path === 'data-standard') return 'data-standard';

  const route = appRoutes.find((item) => item.key === path);
  return route?.key ?? 'search';
}

export function getDataSourceIdFromHash(hash: string): string | null {
  const path = hash.replace('#', '').split('?')[0];
  const parts = path.split('/');
  if (parts[0] === 'datasource' && parts[1]) {
    return parts[1];
  }
  return null;
}
