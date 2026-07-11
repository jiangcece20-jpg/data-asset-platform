import { useEffect, useState } from 'react';
import { Pagination } from '../../../components/data-display/Pagination';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { datasourceService } from '../../../services/datasourceService';
import type { SyncedTable } from '../../../types/datasource';

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

type TableListTabProps = {
  dataSourceId: string;
  tableCount: number;
  refreshKey: number;
};

export function TableListTab({ dataSourceId, tableCount, refreshKey }: TableListTabProps) {
  const [tables, setTables] = useState<SyncedTable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    datasourceService.getSyncedTables(dataSourceId, { keyword, page, pageSize }).then((result) => {
      setTables(result.items);
      setTotal(result.total);
      setLoading(false);
    });
  }, [dataSourceId, keyword, page, refreshKey]);

  return (
    <div>
      <div className="ds-tables__toolbar">
        <label className="ds-tables__search">
          <span aria-hidden="true">🔍</span>
          <input
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索表名或注释"
          />
        </label>
        <span className="ds-tables__hint">
          共 {tableCount} 张表已同步至资源管理，可在「资源管理」中查看和治理
        </span>
      </div>

      {loading ? (
        <div className="ds-empty">
          <div className="ds-empty__icon">⏳</div>
          <div className="ds-empty__text">加载中...</div>
        </div>
      ) : tables.length === 0 ? (
        <EmptyState title="暂无同步表" description="点击右上角「立即同步」拉取表元数据" />
      ) : (
        <>
          <table className="ds-table">
            <thead>
              <tr>
                <th>表名</th>
                <th>表注释</th>
                <th>字段数量</th>
                <th>同步时间</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <>
                  <tr key={table.id}>
                    <td>
                      <span
                        className="ds-table__row-toggle"
                        onClick={() => setExpandedId(expandedId === table.id ? null : table.id)}
                      >
                        {expandedId === table.id ? '▼' : '▶'} {table.tableName}
                      </span>
                    </td>
                    <td>{table.tableComment || '-'}</td>
                    <td>{table.fields.length} 个字段</td>
                    <td>{formatDateTime(table.syncedAt)}</td>
                  </tr>
                  {expandedId === table.id && (
                    <tr key={`${table.id}-fields`} className="ds-table__expanded">
                      <td colSpan={4}>
                        <div className="ds-table__fields">
                          <table className="ds-table__fields-table">
                            <thead>
                              <tr>
                                <th>字段名</th>
                                <th>类型</th>
                                <th>注释</th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.fields.map((field) => (
                                <tr key={field.name}>
                                  <td className="ds-field__name">{field.name}</td>
                                  <td className="ds-field__type">{field.type}</td>
                                  <td>{field.comment || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
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
