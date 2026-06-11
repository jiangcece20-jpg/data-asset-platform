import type { DataTableColumn } from '../../components/data-display/DataTable';
import { mockResources } from '../../mocks/resources';
import type { ResourceSummary } from '../../types/resources';

export const galleryResources = mockResources;

export const resourceColumns: Array<DataTableColumn<ResourceSummary>> = [
  { key: 'displayName', title: '名称' },
  { key: 'type', title: '类型' },
  { key: 'sourceSystem', title: '来源系统' },
  { key: 'permissionStatus', title: '权限状态' },
  { key: 'owner', title: '负责人' },
];
