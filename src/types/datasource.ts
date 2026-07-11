import type { SourceSystem } from './resources';

export type DataSourceStatus = 'active' | 'inactive' | 'error';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

export type SyncFrequency = 'hourly' | 'daily' | 'manual';

export type ConnectionMode = 'ip_port' | 'jdbc';

export type DataSourceConfig = {
  id: string;
  name: string;
  type: SourceSystem;
  connectionMode: ConnectionMode;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  jdbcUrl: string;
  status: DataSourceStatus;
  syncFrequency: SyncFrequency;
  adhocQueryEnabled: boolean;
  lastSyncAt: string;
  lastSyncStatus: SyncStatus;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SyncedField = {
  name: string;
  type: string;
  comment: string;
};

export type SyncedTable = {
  id: string;
  dataSourceId: string;
  tableName: string;
  tableComment: string;
  fields: SyncedField[];
  syncedAt: string;
};

export type SyncHistoryRecord = {
  id: string;
  dataSourceId: string;
  startedAt: string;
  finishedAt: string;
  status: SyncStatus;
  newTableCount: number;
  updatedTableCount: number;
  totalTableCount: number;
  errorMessage?: string;
  triggerType: 'scheduled' | 'manual';
};

export type SyncResult = {
  success: boolean;
  newTableCount: number;
  updatedTableCount: number;
  totalTableCount: number;
  errorMessage?: string;
};

export type DataSourceFilter = {
  keyword?: string;
  type?: SourceSystem | 'all';
  status?: DataSourceStatus | 'all';
};

export type ConnectionTestResult = {
  success: boolean;
  message: string;
};

export type FetchDatabasesResult = {
  success: boolean;
  databases: string[];
  message?: string;
};

export const connectionModeLabels: Record<ConnectionMode, string> = {
  ip_port: 'IP端口',
  jdbc: 'JDBC连接串',
};

export const dataSourceStatusLabels: Record<DataSourceStatus, string> = {
  active: '正常',
  inactive: '未连接',
  error: '异常',
};

export const syncStatusLabels: Record<SyncStatus, string> = {
  idle: '未同步',
  syncing: '同步中',
  success: '已同步',
  failed: '同步失败',
};

export const syncFrequencyLabels: Record<SyncFrequency, string> = {
  hourly: '每小时',
  daily: '每天',
  manual: '仅手动',
};
