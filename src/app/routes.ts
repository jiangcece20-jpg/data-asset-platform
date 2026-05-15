export type AppRouteKey =
  | 'search'
  | 'catalog'
  | 'discovery'
  | 'management'
  | 'workbench'
  | 'components'
  | 'permissions';

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
  { key: 'components', label: '组件库' },
  { key: 'permissions', label: '权限管理' },
];
