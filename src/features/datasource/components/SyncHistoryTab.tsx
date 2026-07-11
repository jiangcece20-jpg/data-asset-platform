import { useEffect, useState } from 'react';
import { Pagination } from '../../../components/data-display/Pagination';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Tag } from '../../../components/base/Tag';
import { datasourceService } from '../../../services/datasourceService';
import type { SyncHistoryRecord, SyncStatus } from '../../../types/datasource';
import { syncStatusLabels } from '../../../types/datasource';

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

function calcDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diff = Math.max(0, endMs - startMs);
  const seconds = (diff / 1000).toFixed(1);
  return `${seconds}s`;
}

function syncDotClass(status: SyncStatus): string {
  if (status === 'success') return 'ds-status__dot--success';
  if (status === 'syncing') return 'ds-status__dot--syncing';
  if (status === 'failed') return 'ds-status__dot--failed';
  return 'ds-status__dot--idle';
}

type SyncHistoryTabProps = {
  dataSourceId: string;
  refreshKey: number;
};

export function SyncHistoryTab({ dataSourceId, refreshKey }: SyncHistoryTabProps) {
  const [records, setRecords] = useState<SyncHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    datasourceService.getSyncHistory(dataSourceId, page, pageSize).then((result) => {
      setRecords(result.items);
      setTotal(result.total);
      setLoading(false);
    });
  }, [dataSourceId, page, refreshKey]);

  return (
    <div>
      {loading ? (
        <div className="ds-empty">
          <div className="ds-empty__icon">⏳</div>
          <div className="ds-empty__text">加载中...</div>
        </div>
      ) : records.length === 0 ? (
        <EmptyState title="暂无同步记录" description="点击右上角「立即同步」开始首次同步" />
      ) : (
        <>
          <table className="ds-table">
            <thead>
              <tr>
                <th>触发方式</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>耗时</th>
                <th>状态</th>
                <th>新增表数</th>
                <th>变更表数</th>
                <th>总表数</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <>
                  <tr key={record.id}>
                    <td>
                      {record.triggerType === 'manual' ? (
                        <Tag tone="blue">手动</Tag>
                      ) : (
                        <Tag tone="gray">定时</Tag>
                      )}
                    </td>
                    <td>{formatDateTime(record.startedAt)}</td>
                    <td>{formatDateTime(record.finishedAt)}</td>
                    <td>{calcDuration(record.startedAt, record.finishedAt)}</td>
                    <td>
                      <span className="ds-status">
                        <span className={`ds-status__dot ${syncDotClass(record.status)}`} />
                        {syncStatusLabels[record.status]}
                      </span>
                    </td>
                    <td>{record.newTableCount}</td>
                    <td>{record.updatedTableCount}</td>
                    <td>{record.totalTableCount}</td>
                  </tr>
                  {record.status === 'failed' && record.errorMessage && (
                    <tr key={`${record.id}-error`} className="ds-table__expanded">
                      <td colSpan={8}>
                        <div className="ds-history__error">{record.errorMessage}</div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="ds-pagination">
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              onChange={setPage}
              showTotal
            />
          </div>
        </>
      )}
    </div>
  );
}
