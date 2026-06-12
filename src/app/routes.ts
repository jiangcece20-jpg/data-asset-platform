export type AppRouteKey =
  | 'search'
  | 'catalog'
  | 'detail'
  | 'discovery'
  | 'management'
  | 'workbench'
  | 'permissions'
  | 'lineage'
  | 'my';

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
  { key: 'lineage', label: '血缘追溯' },
  { key: 'permissions', label: '权限中心' },
  { key: 'my', label: '我的' },
];
