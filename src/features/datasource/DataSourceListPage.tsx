import { useEffect, useState } from 'react';
import { Tag } from '../../components/base/Tag';
import { Modal } from '../../components/feedback/Modal';
import { toast } from '../../components/feedback/Toast';
import { datasourceService } from '../../services/datasourceService';
import { sourceSystemLabels } from '../../types/resources';
import type { SourceSystem } from '../../types/resources';
import type { DataSourceConfig, DataSourceStatus, SyncStatus } from '../../types/datasource';
import {
  dataSourceStatusLabels,
  syncStatusLabels,
} from '../../types/datasource';
import { DataSourceFormModal } from './DataSourceFormModal';
import './datasource.css';

const typeFilters: Array<{ key: SourceSystem | 'all'; label: string }> = [
  { key: 'all', label: '全部类型' },
  { key: 'MySQL', label: 'MySQL' },
  { key: 'MaxCompute', label: 'MaxCompute' },
  { key: 'SelectDB', label: 'SelectDB' },
];

const statusFilters: Array<{ key: DataSourceStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'active', label: '正常' },
  { key: 'error', label: '异常' },
  { key: 'inactive', label: '未连接' },
];

function statusDotClass(status: DataSourceStatus): string {
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

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function DataSourceListPage() {
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceSystem | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DataSourceStatus | 'all'>('all');
  const [formModal, setFormModal] = useState<{ open: boolean; mode: 'create' | 'edit'; ds?: DataSourceConfig }>({
    open: false,
    mode: 'create',
  });
  const [deleteTarget, setDeleteTarget] = useState<DataSourceConfig | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const fetchDataSources = async () => {
    setLoading(true);
    const result = await datasourceService.list({
      keyword,
      type: typeFilter,
      status: statusFilter,
    });
    setDataSources(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchDataSources();
  }, []);

  const handleSearch = () => {
    fetchDataSources();
  };

  const handleToggleAdhoc = async (ds: DataSourceConfig) => {
    await datasourceService.toggleAdhocQuery(ds.id, !ds.adhocQueryEnabled);
    toast.success(!ds.adhocQueryEnabled ? '已开启即席查询' : '已关闭即席查询');
    fetchDataSources();
  };

  const handleSync = async (ds: DataSourceConfig) => {
    setSyncingIds((prev) => new Set(prev).add(ds.id));
    toast.info(`正在同步「${ds.name}」的元数据...`);
    const result = await datasourceService.syncNow(ds.id);
    setSyncingIds((prev) => {
      const next = new Set(prev);
      next.delete(ds.id);
      return next;
    });
    if (result.success) {
      toast.success(`同步完成：新增 ${result.newTableCount} 张表，更新 ${result.updatedTableCount} 张表`);
    } else {
      toast.error(`同步失败：${result.errorMessage}`);
    }
    fetchDataSources();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await datasourceService.delete(deleteTarget.id);
    toast.success('数据源已删除');
    setDeleteTarget(null);
    fetchDataSources();
  };

  return (
    <section className="ds-page">
      <div className="ds-list__header">
        <h1 className="ds-list__title">数据源管理</h1>
        <button
          type="button"
          className="ds-list__btn ds-list__btn--primary"
          onClick={() => setFormModal({ open: true, mode: 'create' })}
        >
          + 新增数据源
        </button>
      </div>

      <div className="ds-list__toolbar">
        <label className="ds-list__search">
          <span aria-hidden="true">🔍</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="搜索数据源名称"
          />
        </label>
        <select
          className="ds-list__filter-select"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as SourceSystem | 'all'); }}
        >
          {typeFilters.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <select
          className="ds-list__filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as DataSourceStatus | 'all'); }}
        >
          {statusFilters.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <button type="button" className="ds-list__btn ds-list__btn--default" onClick={handleSearch}>
          查询
        </button>
      </div>

      <div className="ds-table-wrap">
        {loading ? (
          <div className="ds-empty">
            <div className="ds-empty__icon">⏳</div>
            <div className="ds-empty__text">加载中...</div>
          </div>
        ) : dataSources.length === 0 ? (
          <div className="ds-empty">
            <div className="ds-empty__icon">📭</div>
            <div className="ds-empty__text">暂无数据源，点击右上角「新增数据源」创建</div>
          </div>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>连接状态</th>
                <th>同步状态</th>
                <th>即席查询</th>
                <th>上次同步时间</th>
                <th>表数量</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((ds) => (
                <tr key={ds.id}>
                  <td>
                    <span
                      className="ds-table__name"
                      onClick={() => { window.location.hash = `datasource/${ds.id}`; }}
                    >
                      {ds.name}
                    </span>
                  </td>
                  <td>
                    <Tag tone="blue">{sourceSystemLabels[ds.type]}</Tag>
                  </td>
                  <td>
                    <span className="ds-status">
                      <span className={`ds-status__dot ${statusDotClass(ds.status)}`} />
                      {dataSourceStatusLabels[ds.status]}
                    </span>
                  </td>
                  <td>
                    <span className="ds-status">
                      <span className={`ds-status__dot ${syncDotClass(ds.lastSyncStatus)}`} />
                      {syncStatusLabels[ds.lastSyncStatus]}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ds-toggle ${ds.adhocQueryEnabled ? 'ds-toggle--on' : ''}`}
                      onClick={() => handleToggleAdhoc(ds)}
                      aria-label="切换即席查询"
                    >
                      <span className="ds-toggle__thumb" />
                    </button>
                  </td>
                  <td>{formatDateTime(ds.lastSyncAt)}</td>
                  <td>{ds.tableCount} 张表</td>
                  <td>
                    <div className="ds-table__actions">
                      <button
                        type="button"
                        className="ds-list__btn ds-list__btn--default ds-list__btn--sm"
                        onClick={() => { window.location.hash = `datasource/${ds.id}`; }}
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        className="ds-list__btn ds-list__btn--default ds-list__btn--sm"
                        onClick={() => handleSync(ds)}
                        disabled={syncingIds.has(ds.id)}
                      >
                        {syncingIds.has(ds.id) ? '同步中...' : '同步'}
                      </button>
                      <button
                        type="button"
                        className="ds-list__btn ds-list__btn--default ds-list__btn--sm"
                        onClick={() => setFormModal({ open: true, mode: 'edit', ds })}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="ds-list__btn ds-list__btn--danger ds-list__btn--sm"
                        onClick={() => setDeleteTarget(ds)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DataSourceFormModal
        open={formModal.open}
        mode={formModal.mode}
        dataSource={formModal.ds}
        onClose={() => setFormModal({ open: false, mode: 'create' })}
        onSuccess={() => {
          setFormModal({ open: false, mode: 'create' });
          fetchDataSources();
        }}
      />

      <Modal
        open={deleteTarget !== null}
        title="确认删除"
        onClose={() => setDeleteTarget(null)}
      >
        <p>确认删除数据源「{deleteTarget?.name}」？</p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
          删除后已同步的表信息将保留在资源管理中。
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button
            type="button"
            className="ds-list__btn ds-list__btn--default"
            onClick={() => setDeleteTarget(null)}
          >
            取消
          </button>
          <button
            type="button"
            className="ds-list__btn ds-list__btn--primary"
            onClick={handleDelete}
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            确认删除
          </button>
        </div>
      </Modal>
    </section>
  );
}
