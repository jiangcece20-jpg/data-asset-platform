import { mockDataSources, mockSyncedTables, mockSyncHistory } from '../mocks/datasources';
import { mockResources } from '../mocks/resources';
import type { ResourceSummary, SourceType } from '../types/resources';
import type {
  ConnectionTestResult,
  DataSourceConfig,
  DataSourceFilter,
  FetchDatabasesResult,
  SyncHistoryRecord,
  SyncResult,
  SyncedTable,
} from '../types/datasource';

/* ── 内部可变状态（Mock 模式下模拟后端存储） ────────────────── */

let dataSources: DataSourceConfig[] = [...mockDataSources];
let syncedTables: SyncedTable[] = [...mockSyncedTables];
let syncHistory: SyncHistoryRecord[] = [...mockSyncHistory];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sourceTypeMap: Record<string, SourceType> = {
  MySQL: 'business_db',
  MaxCompute: 'warehouse_engine',
  SelectDB: 'analytic_db',
};

/* ── 数据源 CRUD ────────────────────────────────────────── */

export const datasourceService = {
  async list(filters?: DataSourceFilter): Promise<DataSourceConfig[]> {
    await delay(200);
    let result = [...dataSources];
    if (filters?.keyword) {
      const kw = filters.keyword.trim().toLowerCase();
      result = result.filter((ds) => ds.name.toLowerCase().includes(kw));
    }
    if (filters?.type && filters.type !== 'all') {
      result = result.filter((ds) => ds.type === filters.type);
    }
    if (filters?.status && filters.status !== 'all') {
      result = result.filter((ds) => ds.status === filters.status);
    }
    return result;
  },

  async getById(id: string): Promise<DataSourceConfig | undefined> {
    await delay(150);
    return dataSources.find((ds) => ds.id === id);
  },

  async create(
    config: Omit<DataSourceConfig, 'id' | 'status' | 'lastSyncAt' | 'lastSyncStatus' | 'tableCount' | 'createdAt' | 'updatedAt'>,
  ): Promise<DataSourceConfig> {
    await delay(300);
    const now = new Date().toISOString();
    const newDs: DataSourceConfig = {
      ...config,
      id: `ds-${Date.now()}`,
      status: 'inactive',
      lastSyncAt: '',
      lastSyncStatus: 'idle',
      tableCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    dataSources = [...dataSources, newDs];
    return newDs;
  },

  async update(id: string, config: Partial<DataSourceConfig>): Promise<DataSourceConfig | undefined> {
    await delay(300);
    const idx = dataSources.findIndex((ds) => ds.id === id);
    if (idx === -1) return undefined;
    dataSources[idx] = { ...dataSources[idx], ...config, updatedAt: new Date().toISOString() };
    return dataSources[idx];
  },

  async delete(id: string): Promise<void> {
    await delay(200);
    dataSources = dataSources.filter((ds) => ds.id !== id);
    syncedTables = syncedTables.filter((t) => t.dataSourceId !== id);
    syncHistory = syncHistory.filter((h) => h.dataSourceId !== id);
  },

  /* ── 测试连接 ─────────────────────────────────────────── */

  async testConnection(config: {
    type: string;
    connectionMode: 'ip_port' | 'jdbc';
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    jdbcUrl?: string;
  }): Promise<ConnectionTestResult> {
    await delay(1200 + Math.random() * 800);
    const supported = ['MySQL', 'MaxCompute', 'SelectDB'];
    if (!supported.includes(config.type)) {
      return { success: false, message: `暂不支持 ${config.type} 类型数据源的连接测试` };
    }
    if (config.connectionMode === 'jdbc') {
      if (!config.jdbcUrl) {
        return { success: false, message: 'JDBC连接串不能为空' };
      }
      if (Math.random() < 0.1) {
        return { success: false, message: `连接失败: 无法解析JDBC连接串或目标不可达` };
      }
      return { success: true, message: '连接成功' };
    }
    if (!config.host || !config.port || !config.database || !config.username || !config.password) {
      return { success: false, message: '连接参数不完整，请检查主机、端口、数据库、用户名和密码' };
    }
    if (Math.random() < 0.1) {
      return { success: false, message: `Connection refused: ${config.host}:${config.port} — 目标主机不可达` };
    }
    return { success: true, message: '连接成功' };
  },

  /* ── 拉取数据库列表 ────────────────────────────────────── */

  async fetchDatabases(config: {
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
  }): Promise<FetchDatabasesResult> {
    await delay(1000 + Math.random() * 500);
    if (!config.host || !config.port || !config.username || !config.password) {
      return { success: false, databases: [], message: '连接参数不完整，请填写主机、端口、用户名和密码' };
    }
    if (Math.random() < 0.1) {
      return { success: false, databases: [], message: `连接失败: ${config.host}:${config.port} — 目标主机不可达` };
    }
    // Mock 数据库列表
    const dbMap: Record<string, string[]> = {
      MySQL: ['wlyd_orders', 'wlyd_products', 'wlyd_users', 'wlyd_logs', 'information_schema', 'mysql', 'performance_schema'],
      MaxCompute: ['wlyd_dw', 'wlyd_ads', 'wlyd_tmp', 'wlyd_ods'],
      SelectDB: ['analytics_db', 'realtime_db', 'test_db', 'information_schema'],
    };
    const databases = dbMap[config.type] ?? ['default_db'];
    return { success: true, databases };
  },

  /* ── 同步操作 ─────────────────────────────────────────── */

  async syncNow(id: string): Promise<SyncResult> {
    await delay(3000 + Math.random() * 2000);
    const ds = dataSources.find((d) => d.id === id);
    if (!ds) {
      return { success: false, newTableCount: 0, updatedTableCount: 0, totalTableCount: 0, errorMessage: '数据源不存在' };
    }

    const now = new Date().toISOString();
    const newCount = Math.floor(Math.random() * 4);
    const updatedCount = Math.floor(Math.random() * 4);

    // 模拟同步失败概率
    if (Math.random() < 0.08) {
      syncHistory = [
        {
          id: `sync-${Date.now()}`,
          dataSourceId: id,
          startedAt: now,
          finishedAt: now,
          status: 'failed',
          newTableCount: 0,
          updatedTableCount: 0,
          totalTableCount: ds.tableCount,
          errorMessage: `连接失败: ${ds.connectionMode === 'jdbc' ? 'JDBC连接串无效' : `${ds.host}:${ds.port} — Authentication failed`}`,
          triggerType: 'manual',
        },
        ...syncHistory,
      ];
      dataSources = dataSources.map((d) =>
        d.id === id ? { ...d, lastSyncAt: now, lastSyncStatus: 'failed', status: 'error' } : d,
      );
      return { success: false, newTableCount: 0, updatedTableCount: 0, totalTableCount: ds.tableCount, errorMessage: 'Authentication failed' };
    }

    // 同步成功：生成新表并添加到 syncedTables
    for (let i = 0; i < newCount; i++) {
      const newTableId = `tbl-auto-${Date.now()}-${i}`;
      syncedTables = [
        ...syncedTables,
        {
          id: newTableId,
          dataSourceId: id,
          tableName: `auto_synced_table_${syncedTables.filter((t) => t.dataSourceId === id).length + i + 1}`,
          tableComment: '自动同步新增表',
          fields: [
            { name: 'id', type: 'BIGINT', comment: '主键ID' },
            { name: 'created_at', type: 'DATETIME', comment: '创建时间' },
            { name: 'updated_at', type: 'DATETIME', comment: '更新时间' },
          ],
          syncedAt: now,
        },
      ];
      // 同步到资源管理 Mock
      const resource: ResourceSummary = {
        id: `resource-${newTableId}`,
        type: 'table',
        name: `auto_synced_table_${syncedTables.filter((t) => t.dataSourceId === id).length + i + 1}`,
        displayName: '自动同步新增表',
        description: `来自 ${ds.name}`,
        sourceSystem: ds.type,
        sourceType: sourceTypeMap[ds.type] ?? 'business_db',
        sourceInstance: ds.name,
        status: 'draft',
        permissionStatus: 'none',
        updatedAt: now.slice(0, 10),
      };
      mockResources.push(resource);
    }

    const totalCount = ds.tableCount + newCount;
    dataSources = dataSources.map((d) =>
      d.id === id
        ? { ...d, lastSyncAt: now, lastSyncStatus: 'success', status: 'active', tableCount: totalCount, updatedAt: now }
        : d,
    );

    syncHistory = [
      {
        id: `sync-${Date.now()}`,
        dataSourceId: id,
        startedAt: now,
        finishedAt: new Date().toISOString(),
        status: 'success',
        newTableCount: newCount,
        updatedTableCount: updatedCount,
        totalTableCount: totalCount,
        triggerType: 'manual',
      },
      ...syncHistory,
    ];

    return { success: true, newTableCount: newCount, updatedTableCount: updatedCount, totalTableCount: totalCount };
  },

  async getSyncedTables(
    id: string,
    filters?: { keyword?: string; page?: number; pageSize?: number },
  ): Promise<{ items: SyncedTable[]; total: number }> {
    await delay(150);
    let result = syncedTables.filter((t) => t.dataSourceId === id);
    if (filters?.keyword) {
      const kw = filters.keyword.trim().toLowerCase();
      result = result.filter(
        (t) => t.tableName.toLowerCase().includes(kw) || t.tableComment.toLowerCase().includes(kw),
      );
    }
    const total = result.length;
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return { items: result.slice(start, start + pageSize), total };
  },

  async getSyncHistory(
    id: string,
    page?: number,
    pageSize?: number,
  ): Promise<{ items: SyncHistoryRecord[]; total: number }> {
    await delay(150);
    const result = syncHistory.filter((h) => h.dataSourceId === id);
    const total = result.length;
    const p = page ?? 1;
    const ps = pageSize ?? 20;
    const start = (p - 1) * ps;
    return { items: result.slice(start, start + ps), total };
  },

  /* ── 即席查询开关 ────────────────────────────────────── */

  async toggleAdhocQuery(id: string, enabled: boolean): Promise<void> {
    await delay(200);
    dataSources = dataSources.map((d) =>
      d.id === id ? { ...d, adhocQueryEnabled: enabled, updatedAt: new Date().toISOString() } : d,
    );
  },
};
