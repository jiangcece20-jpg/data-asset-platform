import { useEffect, useState } from 'react';
import { Tag } from '../../components/base/Tag';
import { toast } from '../../components/feedback/Toast';
import { datasourceService } from '../../services/datasourceService';
import { sourceSystemLabels } from '../../types/resources';
import type { DataSourceConfig, SyncStatus } from '../../types/datasource';
import { dataSourceStatusLabels, syncStatusLabels } from '../../types/datasource';
import { DataSourceInfoTab } from './components/DataSourceInfoTab';
import { TableListTab } from './components/TableListTab';
import { SyncHistoryTab } from './components/SyncHistoryTab';
import { DataSourceFormModal } from './DataSourceFormModal';
import './datasource.css';

function statusDotClass(status: DataSourceConfig['status']): string {
  if (status === 'active') return 'ds-status__dot--active';
  if (status === 'error') return 'ds-status__dot--error';
  return 'ds-status__dot--inactive';
}

function syncDotClass(status: SyncStatus): string {
  if (status === 'success') return 'ds-status__dot--success';
  if (status === 'syncing') return 'ds-status__dot--syncing';
  if (status === 'failed') return 'ds-status__dot--failed';
  return 'ds-status__dot--idle';
}

type TabKey = 'info' | 'tables' | 'history';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'info', label: '基本信息' },
  { key: 'tables', label: '表列表' },
  { key: 'history', label: '同步历史' },
];

type DataSourceDetailPageProps = {
  dataSourceId: string;
};

export function DataSourceDetailPage({ dataSourceId }: DataSourceDetailPageProps) {
  const [dataSource, setDataSource] = useState<DataSourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formModal, setFormModal] = useState<{ open: boolean; mode: 'edit' }>({
    open: false,
    mode: 'edit',
  });

  useEffect(() => {
    setLoading(true);
    datasourceService.getById(dataSourceId).then((ds) => {
      setDataSource(ds ?? null);
      setLoading(false);
    });
  }, [dataSourceId, refreshKey]);

  const handleSync = async () => {
    if (!dataSource) return;
    setSyncing(true);
    toast.info(`正在同步「${dataSource.name}」的元数据...`);
    const result = await datasourceService.syncNow(dataSource.id);
    setSyncing(false);
    if (result.success) {
      toast.success(`同步完成：新增 ${result.newTableCount} 张表，更新 ${result.updatedTableCount} 张表`);
    } else {
      toast.error(`同步失败：${result.errorMessage}`);
    }
    setRefreshKey((k) => k + 1);
  };

  const handleTestConnection = async () => {
    if (!dataSource) return;
    setTesting(true);
    const result = await datasourceService.testConnection({
      type: dataSource.type,
      connectionMode: dataSource.connectionMode,
      host: dataSource.host,
      port: dataSource.port,
      database: dataSource.database,
      username: dataSource.username,
      password: dataSource.password,
      jdbcUrl: dataSource.jdbcUrl,
    });
    setTesting(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleToggleAdhoc = async () => {
    if (!dataSource) return;
    await datasourceService.toggleAdhocQuery(dataSource.id, !dataSource.adhocQueryEnabled);
    toast.success(!dataSource.adhocQueryEnabled ? '已开启即席查询' : '已关闭即席查询');
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <section className="ds-detail">
        <div className="ds-empty">
          <div className="ds-empty__icon">⏳</div>
          <div className="ds-empty__text">加载中...</div>
        </div>
      </section>
    );
  }

  if (!dataSource) {
    return (
      <section className="ds-detail">
        <div className="ds-empty">
          <div className="ds-empty__icon">❓</div>
          <div className="ds-empty__text">数据源不存在或已被删除</div>
          <button
            type="button"
            className="ds-list__btn ds-list__btn--default"
            style={{ marginTop: '12px' }}
            onClick={() => { window.location.hash = 'datasource'; }}
          >
            返回列表
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ds-detail">
      <div className="ds-detail__header">
        <button
          type="button"
          className="ds-detail__back"
          onClick={() => { window.location.hash = 'datasource'; }}
        >
          ← 返回
        </button>
        <span className="ds-detail__title">{dataSource.name}</span>
        <Tag tone="blue">{sourceSystemLabels[dataSource.type]}</Tag>
      </div>

      <div className="ds-detail__meta">
        <span className="ds-detail__meta-item">
          <strong>状态：</strong>
          <span className="ds-status">
            <span className={`ds-status__dot ${statusDotClass(dataSource.status)}`} />
            {dataSourceStatusLabels[dataSource.status]}
          </span>
        </span>
        <span className="ds-detail__meta-item">
          <strong>同步：</strong>
          <span className="ds-status">
            <span className={`ds-status__dot ${syncDotClass(dataSource.lastSyncStatus)}`} />
            {syncStatusLabels[dataSource.lastSyncStatus]}
          </span>
        </span>
        <span className="ds-detail__meta-item">
          <strong>表数量：</strong>
          {dataSource.tableCount} 张表
        </span>
        <span className="ds-detail__meta-item">
          <strong>即席查询：</strong>
          <button
            type="button"
            className={`ds-toggle ${dataSource.adhocQueryEnabled ? 'ds-toggle--on' : ''}`}
            onClick={handleToggleAdhoc}
            aria-label="切换即席查询"
          >
            <span className="ds-toggle__thumb" />
          </button>
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="ds-list__btn ds-list__btn--primary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? '同步中...' : '立即同步'}
        </button>
      </div>

      <div className="ds-detail__body">
        <div className="ds-detail__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`ds-detail__tab ${activeTab === tab.key ? 'ds-detail__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ds-detail__tab-content">
          {activeTab === 'info' && (
            <DataSourceInfoTab
              dataSource={dataSource}
              onEdit={() => setFormModal({ open: true, mode: 'edit' })}
              onTestConnection={handleTestConnection}
              testing={testing}
            />
          )}
          {activeTab === 'tables' && (
            <TableListTab
              dataSourceId={dataSource.id}
              tableCount={dataSource.tableCount}
              refreshKey={refreshKey}
            />
          )}
          {activeTab === 'history' && (
            <SyncHistoryTab
              dataSourceId={dataSource.id}
              refreshKey={refreshKey}
            />
          )}
        </div>
      </div>

      <DataSourceFormModal
        open={formModal.open}
        mode="edit"
        dataSource={dataSource}
        onClose={() => setFormModal({ open: false, mode: 'edit' })}
        onSuccess={() => {
          setFormModal({ open: false, mode: 'edit' });
          setRefreshKey((k) => k + 1);
        }}
      />
    </section>
  );
}
