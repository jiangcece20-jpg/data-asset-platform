import { Tag } from '../../../components/base/Tag';
import { mockResources } from '../../../mocks/resources';
import type { ResourceType } from '../../../types/resources';
import type { PendingTask, SecurityLevel, SourceSystem, SourceType } from '../approvalData';

export type ApprovalDetailRecord = {
  applicant?: string;
  applicantDept?: string;
  applicantManager?: string;
  assets: string[];
  securityLevel: SecurityLevel;
  permissionType: string;
  expireDate?: string;
  directory: string;
  sourceType: SourceType;
  sourceSystem: SourceSystem;
  matchedFlow: string;
  matchedRoute: string;
  reason: string;
  ticketType?: string;
  lineageApproval?: PendingTask['lineageApproval'];
};

const sourceTypeOptions: Array<{ value: SourceType; label: string }> = [
  { value: 'warehouse_engine', label: '数仓引擎' },
  { value: 'analytic_db', label: '分析型数据库' },
  { value: 'business_db', label: '业务数据库' },
  { value: 'report_system', label: '报表系统' },
  { value: 'api_service', label: 'API服务' },
  { value: 'message_stream', label: '消息队列' },
  { value: 'file_storage', label: '文件存储' },
  { value: 'metric_platform', label: '指标平台' },
];

const resourceTypeLabels: Record<ResourceType, string> = {
  table: '表',
  view: '视图',
  metric: '指标',
  label: '标签',
  api: 'API',
  report: '报表',
  dashboard: '看板',
};

export function sourceTypeLabel(value: SourceType) {
  return sourceTypeOptions.find(item => item.value === value)?.label ?? value;
}

export function approvalSecurityTone(securityLevel: SecurityLevel) {
  return securityLevel === 'S4' || securityLevel === 'S5' ? 'danger' : 'blue';
}

function supportsPermissionType(ticketType: string) {
  return ticketType !== '目录修改' && ticketType !== '血缘修正' && ticketType !== '下架审批';
}

function resourceForAsset(asset: string) {
  return mockResources.find(resource => resource.name === asset || resource.displayName === asset);
}

function fallbackResourceType(record: ApprovalDetailRecord): ResourceType {
  if (record.sourceType === 'api_service') return 'api';
  if (record.sourceType === 'report_system') return 'report';
  if (record.sourceType === 'metric_platform') return 'metric';
  if (record.sourceType === 'warehouse_engine' || record.sourceType === 'analytic_db' || record.sourceType === 'business_db') return 'table';
  return 'table';
}

function assetDisplayInfo(asset: string, record: ApprovalDetailRecord) {
  const resource = resourceForAsset(asset);
  const type = resource?.type ?? fallbackResourceType(record);
  const databaseName = resource?.databaseName ?? (type === 'table' || type === 'view' ? databaseNameForSource(record.sourceSystem) : '');
  const owner = resource?.owner ?? record.applicant ?? '—';
  const detailId = resource?.id ?? fallbackAssetDetailId(asset, type);
  const name = resource?.name ?? asset;
  const showDatabase = (type === 'table' || type === 'view') && databaseName;
  const fullName = showDatabase ? `${databaseName}.${name}` : name;
  return { asset, type, databaseName, owner, detailId, name, fullName, resource };
}

function databaseNameForSource(sourceSystem: SourceSystem) {
  if (sourceSystem === 'Hive') return 'wlyd_hive';
  if (sourceSystem === 'MaxCompute') return 'wlyd_mc_beijing';
  if (sourceSystem === 'MySQL') return 'wlyd_mysql';
  if (sourceSystem === 'Oracle') return 'wlyd_oracle';
  return 'wlyd_data';
}

function fallbackAssetDetailId(asset: string, type: ResourceType) {
  const slug = asset.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
  return `resource-${type}-${slug}`;
}

function navigateToAssetDetail(detailId: string) {
  window.location.hash = `detail?domain=asset&id=${encodeURIComponent(detailId)}`;
}

function AssetNameCell({ assetName, record }: { assetName: string; record: ApprovalDetailRecord }) {
  const info = assetDisplayInfo(assetName, record);
  const showDatabase = (info.type === 'table' || info.type === 'view') && info.databaseName;

  return (
    <button
      type="button"
      className="approval-v6__asset-name-link"
      aria-label={`查看资产 ${info.fullName}`}
      onClick={() => navigateToAssetDetail(info.detailId)}
      title={`查看资产 ${info.fullName}`}
    >
      {showDatabase ? <span className="approval-v6__asset-db-prefix">{info.databaseName}.</span> : null}
      <span className="approval-v6__asset-tech-name">{info.name}</span>
    </button>
  );
}

function originalCatalogFromReason(record: ApprovalDetailRecord) {
  const migrationMatch = record.reason.match(/从(.+?)(迁移|调整|移动|改名|至|到)/);
  if (migrationMatch?.[1]) return migrationMatch[1].replace(/[，。,.]$/, '');
  if (record.reason.includes('商品域')) return '商品域';
  if (record.reason.includes('支付域')) return '支付域';
  if (record.reason.includes('交易域')) return '交易域';
  return '待确认原目录';
}

function directoryEditActionFromReason(record: ApprovalDetailRecord) {
  if (record.reason.includes('新增')) return '新增';
  if (record.reason.includes('改名')) return '改名';
  if (record.reason.includes('删除')) return '删除';
  if (record.reason.includes('迁移') || record.reason.includes('移动') || record.reason.includes('调整')) return '调整结构';
  return '编辑';
}

function originalDirectoryStructureFromReason(record: ApprovalDetailRecord) {
  const renameMatch = record.reason.match(/将(.+?)改名为/);
  if (renameMatch?.[1]) return renameMatch[1];
  if (record.reason.includes('新增')) return '无，新增目录';
  if (record.reason.includes('删除')) return record.directory;
  return '待确认原目录结构';
}

function lineageChangeType(change: NonNullable<ApprovalDetailRecord['lineageApproval']>['changes'][number]) {
  if (change.kind === 'field' && change.action === 'add') return '新增字段';
  if (change.kind === 'field' && change.action === 'delete') return '删除字段';
  if (change.kind === 'field' && change.action === 'restore') return '恢复字段';
  if (change.kind === 'relation' && change.action === 'add') return '新增关系';
  if (change.kind === 'relation' && change.action === 'delete') return '删除关系';
  if (change.kind === 'relation' && change.action === 'restore') return '恢复关系';
  return '关系修正';
}

function lineageChangeTone(change: NonNullable<ApprovalDetailRecord['lineageApproval']>['changes'][number]) {
  if (change.action === 'delete') return 'danger';
  if (change.action === 'restore') return 'success';
  if (change.kind === 'field') return 'success';
  return 'blue';
}

function lineageDirectionLabel(direction: 'upstream' | 'downstream') {
  return direction === 'upstream' ? '上游到当前资产' : '当前资产到下游';
}

function lineageFieldMapping(change: NonNullable<ApprovalDetailRecord['lineageApproval']>['changes'][number]) {
  if (change.kind !== 'field') return '关系级变更';
  return `${change.sourceField ?? '—'} → ${change.targetField ?? '—'}`;
}

export function ApprovalInfoTable({ record }: { record: ApprovalDetailRecord }) {
  const ticketType = record.ticketType ?? '权限申请';

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-info-table" aria-label="申请信息表">
        <tbody>
          <tr>
            <th scope="row">工单类型</th>
            <td colSpan={3}>{ticketType}</td>
          </tr>
          <tr>
            <th scope="row">申请人</th>
            <td>{record.applicant ?? '—'}</td>
            <th scope="row">申请人部门</th>
            <td>{record.applicantDept ?? '—'}</td>
          </tr>
          <tr>
            <th scope="row">申请人直接上级</th>
            <td colSpan={3}>{record.applicantManager ?? '—'}</td>
          </tr>
          <tr>
            <th scope="row">申请原因</th>
            <td colSpan={3} className="approval-v6__reason-cell">{record.reason}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ApprovalAssetsTable({ record }: { record: ApprovalDetailRecord }) {
  const ticketType = record.ticketType ?? '权限申请';

  if (ticketType === '目录修改') {
    return <CatalogChangeAssetsTable record={record} />;
  }

  if (ticketType === '目录编辑审批') {
    return <DirectoryEditAssetsTable record={record} />;
  }

  if (ticketType === '血缘修正') {
    return <LineageCorrectionAssetsTable record={record} />;
  }

  const permissionType = supportsPermissionType(ticketType) ? record.permissionType : '—';

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-table" aria-label="申请资产明细表">
        <thead>
          <tr>
            <th>资产名称</th>
            <th>资产类型</th>
            <th>资产负责人</th>
            <th>来源类型</th>
            <th>来源系统</th>
            <th>目录归属</th>
            <th>安全等级</th>
            <th>权限类型</th>
          </tr>
        </thead>
        <tbody>
          {record.assets.map(asset => {
            const info = assetDisplayInfo(asset, record);

            return (
              <tr key={asset}>
                <td>
                  <AssetNameCell assetName={asset} record={record} />
                  <span className="approval-v6__asset-subtext">{record.directory}</span>
                </td>
                <td><Tag tone="blue">{resourceTypeLabels[info.type]}</Tag></td>
                <td>{info.owner}</td>
                <td>{sourceTypeLabel(record.sourceType)}</td>
                <td>{record.sourceSystem}</td>
                <td>{record.directory}</td>
                <td><Tag tone={approvalSecurityTone(record.securityLevel)}>{record.securityLevel}</Tag></td>
                <td>{permissionType}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CatalogChangeAssetsTable({ record }: { record: ApprovalDetailRecord }) {
  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-table approval-v6__drawer-table--change" aria-label="申请资产明细表">
        <thead>
          <tr>
            <th>变更对象</th>
            <th>对象类型</th>
            <th>资产负责人</th>
            <th>原目录</th>
            <th>目标目录</th>
            <th>变更说明</th>
          </tr>
        </thead>
        <tbody>
          {record.assets.map(asset => {
            const info = assetDisplayInfo(asset, record);

            return (
              <tr key={asset}>
                <td>
                  <AssetNameCell assetName={asset} record={record} />
                  <span className="approval-v6__asset-subtext">{record.sourceSystem} / {sourceTypeLabel(record.sourceType)}</span>
                </td>
                <td><Tag tone="blue">{resourceTypeLabels[info.type]}</Tag></td>
                <td>{info.owner}</td>
                <td className="approval-v6__change-cell"><span className="approval-v6__change-muted">{originalCatalogFromReason(record)}</span></td>
                <td className="approval-v6__change-cell"><span className="approval-v6__change-emphasis">{record.directory}</span></td>
                <td className="approval-v6__change-cell">{record.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DirectoryEditAssetsTable({ record }: { record: ApprovalDetailRecord }) {
  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-table approval-v6__drawer-table--change" aria-label="申请资产明细表">
        <thead>
          <tr>
            <th>编辑动作</th>
            <th>原目录结构</th>
            <th>新目录结构</th>
            <th>影响资源</th>
            <th>目录负责人</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><Tag tone="cyan">{directoryEditActionFromReason(record)}</Tag></td>
            <td className="approval-v6__change-cell"><span className="approval-v6__change-muted">{originalDirectoryStructureFromReason(record)}</span></td>
            <td className="approval-v6__change-cell"><span className="approval-v6__change-emphasis">{record.directory}</span></td>
            <td>{Math.max(record.assets.length, 1)} 个资源</td>
            <td>{record.applicant ?? '—'}</td>
            <td className="approval-v6__change-cell">{record.reason}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LineageCorrectionAssetsTable({ record }: { record: ApprovalDetailRecord }) {
  const changes = record.lineageApproval?.changes ?? [];

  return (
    <div className="approval-v6__drawer-table-wrap">
      <table className="approval-v6__drawer-table approval-v6__drawer-table--change" aria-label="申请资产明细表">
        <thead>
          <tr>
            <th>变更类型</th>
            <th>方向</th>
            <th>源端</th>
            <th>目标端</th>
            <th>字段映射</th>
            <th>变更原因</th>
          </tr>
        </thead>
        <tbody>
          {changes.length === 0 ? (
            <tr>
              <td colSpan={6} className="approval-v6__change-empty">暂无提交变更数据</td>
            </tr>
          ) : changes.map(change => (
            <tr key={change.id}>
              <td><Tag tone={lineageChangeTone(change)}>{lineageChangeType(change)}</Tag></td>
              <td>{lineageDirectionLabel(change.direction)}</td>
              <td className="approval-v6__change-cell"><span className="approval-v6__change-emphasis">{change.sourceName}</span></td>
              <td className="approval-v6__change-cell"><span className="approval-v6__change-emphasis">{change.targetName}</span></td>
              <td className="approval-v6__change-cell">{lineageFieldMapping(change)}</td>
              <td className="approval-v6__change-cell">{change.reason ?? record.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApprovalDetailTables({ record }: { record: ApprovalDetailRecord }) {
  return (
    <>
      <h3>申请信息</h3>
      <ApprovalInfoTable record={record} />

      <h3>申请资产明细</h3>
      <ApprovalAssetsTable record={record} />
    </>
  );
}
