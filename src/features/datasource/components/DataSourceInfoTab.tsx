import { sourceSystemLabels } from '../../../types/resources';
import type { DataSourceConfig } from '../../../types/datasource';
import { connectionModeLabels, dataSourceStatusLabels, syncFrequencyLabels } from '../../../types/datasource';

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

type DataSourceInfoTabProps = {
  dataSource: DataSourceConfig;
  onEdit: () => void;
  onTestConnection: () => void;
  testing: boolean;
};

export function DataSourceInfoTab({ dataSource, onEdit, onTestConnection, testing }: DataSourceInfoTabProps) {
  return (
    <div>
      <div className="ds-info-grid">
        <div className="ds-info-item">
          <span className="ds-info-item__label">数据源名称</span>
          <span className="ds-info-item__value">{dataSource.name}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">数据源类型</span>
          <span className="ds-info-item__value">{sourceSystemLabels[dataSource.type]}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">连接方式</span>
          <span className="ds-info-item__value">{connectionModeLabels[dataSource.connectionMode]}</span>
        </div>

        {dataSource.connectionMode === 'ip_port' ? (
          <>
            <div className="ds-info-item">
              <span className="ds-info-item__label">主机地址</span>
              <span className="ds-info-item__value">{dataSource.host || '-'}</span>
            </div>
            <div className="ds-info-item">
              <span className="ds-info-item__label">端口</span>
              <span className="ds-info-item__value">{dataSource.port || '-'}</span>
            </div>
            <div className="ds-info-item">
              <span className="ds-info-item__label">数据库名</span>
              <span className="ds-info-item__value">{dataSource.database || '-'}</span>
            </div>
            <div className="ds-info-item">
              <span className="ds-info-item__label">用户名</span>
              <span className="ds-info-item__value">{dataSource.username || '-'}</span>
            </div>
            <div className="ds-info-item">
              <span className="ds-info-item__label">密码</span>
              <span className="ds-info-item__value">********</span>
            </div>
          </>
        ) : (
          <div className="ds-info-item ds-info-item--full">
            <span className="ds-info-item__label">JDBC连接串</span>
            <span className="ds-info-item__value ds-info-item__value--mono">
              {dataSource.jdbcUrl || '-'}
            </span>
          </div>
        )}

        <div className="ds-info-item">
          <span className="ds-info-item__label">同步频率</span>
          <span className="ds-info-item__value">{syncFrequencyLabels[dataSource.syncFrequency]}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">即席查询</span>
          <span className="ds-info-item__value">{dataSource.adhocQueryEnabled ? '已开启' : '已关闭'}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">连接状态</span>
          <span className="ds-info-item__value">{dataSourceStatusLabels[dataSource.status]}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">表数量</span>
          <span className="ds-info-item__value">{dataSource.tableCount} 张表</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">创建时间</span>
          <span className="ds-info-item__value">{formatDateTime(dataSource.createdAt)}</span>
        </div>
        <div className="ds-info-item">
          <span className="ds-info-item__label">上次同步时间</span>
          <span className="ds-info-item__value">{formatDateTime(dataSource.lastSyncAt)}</span>
        </div>
      </div>

      <div className="ds-info__actions">
        <button type="button" className="ds-list__btn ds-list__btn--primary" onClick={onEdit}>
          编辑配置
        </button>
        <button
          type="button"
          className="ds-list__btn ds-list__btn--default"
          onClick={onTestConnection}
          disabled={testing}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
      </div>
    </div>
  );
}
