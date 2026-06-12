import { useState, useCallback, useMemo } from 'react';
import { Breadcrumb } from '../../components/data-display/Breadcrumb';
import { Tabs, type TabItem } from '../../components/base/Tabs';
import { Tag } from '../../components/base/Tag';
import { Button } from '../../components/base/Button';
import { Tooltip } from '../../components/data-display/Tooltip';
import { Progress } from '../../components/data-display/Progress';
import { EmptyState } from '../../components/feedback/EmptyState';

import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable';
import { mockDetails } from '../../mocks/detailData';
import { LineagePage } from '../lineage/LineagePage';
import { sourceSystemLabels, type SourceSystem, type ResourceDetail, type ResourceType } from '../../types/resources';
import './detail.css';

/* ── Source type label mapping ────────────────────────────── */

const sourceTypeLabels: Record<string, string> = {
  warehouse_engine: '数仓引擎',
  analytic_db: '分析型数据库',
  business_db: '业务数据库',
  report_system: '报表系统',
  api_service: '接口服务',
  message_stream: '消息/流系统',
  file_storage: '文件/对象存储',
  metric_platform: '指标平台',
};

const resourceTypeLabels: Record<ResourceType, string> = {
  table: '表',
  view: '视图',
  metric: '指标',
  label: '标签',
  api: 'API',
  report: '报表',
  dashboard: '看板',
};

/* ── Tab matrix per resource type (§5 PRD) ──────────────── */

const tabMatrix: Record<ResourceType, TabItem[]> = {
  table: [
    { key: 'fields', label: '字段信息' },
    { key: 'sample', label: '样例数据' },
    { key: 'partitions', label: '分区信息' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'ddl', label: 'DDL变更' },
    { key: 'logs', label: '操作记录' },
  ],
  view: [
    { key: 'fields', label: '字段信息' },
    { key: 'sample', label: '样例数据' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'ddl', label: 'DDL变更' },
    { key: 'logs', label: '操作记录' },
  ],
  metric: [
    { key: 'definition', label: '指标定义' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'logs', label: '操作记录' },
  ],
  label: [
    { key: 'definition', label: '标签定义' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'logs', label: '操作记录' },
  ],
  api: [
    { key: 'params', label: '参数信息' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'logs', label: '操作记录' },
  ],
  report: [
    { key: 'definition', label: '报表定义' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'logs', label: '操作记录' },
  ],
  dashboard: [
    { key: 'definition', label: '看板定义' },
    { key: 'lineage', label: '血缘关系' },
    { key: 'manage', label: '使用说明' },
    { key: 'logs', label: '操作记录' },
  ],
};

/* ── Permission button state (§8.1 PRD) ──────────────────── */

type PermState = 'apply' | 'pending' | 'granted' | 'disabled';

function getPermState(detail: ResourceDetail): PermState {
  if (detail.permissionStatus === 'granted') return 'granted';
  if (detail.permissionStatus === 'pending') return 'pending';
  if (detail.type === 'metric' || detail.type === 'label') return 'disabled';
  if (detail.type === 'report') return 'disabled';
  if (detail.permissionStatus === 'none') return 'apply';
  return 'disabled';
}

const permDisabledReasons: Record<ResourceType, string> = {
  metric: '请先查看指标来源，再申请底层表/API权限',
  label: '需前往来源平台申请，平台仅做展示说明',
  report: '当前报表对象暂不支持平台内直接申请',
  api: '',
  table: '请去"血缘关系"Tab查看对应数仓表后申请',
  view: '请去"血缘关系"Tab查看对应数仓表后申请',
  dashboard: '',
};

/* ── URL param parsing ─────────────────────────────────────── */

function parseDetailHash(): { domain: string; id: string } {
  const hash = window.location.hash.replace('#', '');
  const [path, query] = hash.split('?');
  if (path !== 'detail') return { domain: '', id: '' };
  const params = new URLSearchParams(query || '');
  return {
    domain: params.get('domain') ?? '',
    id: params.get('id') ?? '',
  };
}

/* ── SVG icons ─────────────────────────────────────────────── */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 10V3C2 2.45 2.45 2 3 2H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function FavIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 13.5L3.2 8.7C1.8 7.3 1.8 5 3.2 3.6C4.6 2.2 7 2.2 8 3.6C9 2.2 11.4 2.2 12.8 3.6C14.2 5 14.2 7.3 12.8 8.7L8 13.5Z"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 13.5L3.2 8.7C1.8 7.3 1.8 5 3.2 3.6C4.6 2.2 7 2.2 8 3.6C9 2.2 11.4 2.2 12.8 3.6C14.2 5 14.2 7.3 12.8 8.7L8 13.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function QueryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7C1 7 3 2 7 2C11 2 13 7 13 7C13 7 11 12 7 12C3 12 1 7 1 7Z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

/* ── Header area ──────────────────────────────────────────── */

function DetailHeader({ detail, isFav, onToggleFav }: { detail: ResourceDetail; isFav: boolean; onToggleFav: () => void }) {
  const permState = getPermState(detail);
  const sysLabel = detail.sourceSystem ? sourceSystemLabels[detail.sourceSystem as SourceSystem] ?? detail.sourceSystem : '';
  const typeLabel = sourceTypeLabels[detail.sourceType ?? ''] ?? '';

  const techName = detail.name;
  const dbPrefix = detail.databaseName;
  const showDbPrefix = detail.type === 'table' || detail.type === 'view';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(techName);
  }, [techName]);

  return (
    <div className="detail-header">
      {/* Layer 1 */}
      <div className="detail-header__layer1">
        <div className="detail-header__title-group">
          {showDbPrefix && dbPrefix ? (
            <span className="detail-header__db-name">{dbPrefix}.</span>
          ) : null}
          <span className="detail-header__tech-name">{techName}</span>
          {detail.displayName ? (
            <span className="detail-header__display-name">{detail.displayName}</span>
          ) : null}

          {/* Source info block */}
          <span className="detail-header__source-block">
            <Tag tone="blue">{typeLabel}</Tag>
            <span className="detail-header__source-sys">{sysLabel}</span>
          </span>
          {/* Approval status badge */}
          {detail.resourceStatus ? <ApprovalStatusBadge status={detail.resourceStatus} /> : null}

          {/* Copy button */}
          <button type="button" className="detail-header__copy-btn" onClick={handleCopy} aria-label="复制英文名">
            <CopyIcon />
          </button>
        </div>

        <div className="detail-header__stats">
          <Tooltip title="近30天内用户通过搜索、筛选、目录检索等方式命中该资源并进入详情的次数">
            <span className="detail-header__stat">
              <QueryIcon />
              <span className="detail-header__stat-val">{detail.usageCount ?? 0}</span>
            </span>
          </Tooltip>
          <Tooltip title="近30天内详情页被访问、打开或再次查看的次数">
            <span className="detail-header__stat">
              <EyeIcon />
              <span className="detail-header__stat-val">{detail.viewCount ?? 0}</span>
            </span>
          </Tooltip>
        </div>

        <div className="detail-header__actions">
          {permState === 'apply' && (
            <Button variant="primary" size="sm" onClick={() => { window.location.hash = 'my?section=cart'; }}>申请权限</Button>
          )}
          {permState === 'pending' && (
            <span className="detail-header__perm-chip detail-header__perm-chip--pending">申请中</span>
          )}
          {permState === 'granted' && (
            <span className="detail-header__perm-chip detail-header__perm-chip--granted">已有权限</span>
          )}
          {permState === 'disabled' && (
            <Tooltip title={permDisabledReasons[detail.type] ?? '当前对象暂不支持平台内直接申请'}>
              <Button variant="default" size="sm" disabled>申请权限</Button>
            </Tooltip>
          )}

          <button type="button" className="detail-header__fav-btn" onClick={onToggleFav} aria-label={isFav ? '取消收藏' : '收藏'}>
            <FavIcon filled={isFav} />
          </button>
        </div>
      </div>

      {/* Layer 2 */}
      <div className="detail-header__layer2">
        <span className="detail-header__completeness">
          信息完善度
          <Progress percent={detail.infoCompleteness ?? 0} />
        </span>

        {detail.catalogPath ? (
          <span className="detail-header__catalog">
            数据目录
            <span className="detail-header__catalog-path">{detail.catalogPath}</span>
          </span>
        ) : null}

        {detail.tags && detail.tags.length > 0 ? (
          <span className="detail-header__tags">
            数据分类
            {detail.tags.map((t) => <Tag key={t} tone="gray">{t}</Tag>)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── Right sidebar (§7 PRD, per type) ─────────────────────── */

function SidebarSection({ title, fields }: { title: string; fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="detail-sidebar__section">
      <h4 className="detail-sidebar__section-title">{title}</h4>
      <dl className="detail-sidebar__fields">
        {fields.map((f) => (
          <div key={f.label} className="detail-sidebar__field">
            <dt>{f.label}</dt>
            <dd>{f.value || '\u2014'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailSidebar({ detail }: { detail: ResourceDetail }) {
  const sysLabel = detail.sourceSystem ? sourceSystemLabels[detail.sourceSystem as SourceSystem] ?? detail.sourceSystem : '';
  const permState = getPermState(detail);
  const permLabel = permState === 'granted' ? '已有权限' : permState === 'pending' ? '申请中' : permState === 'apply' ? '无权限' : '不支持申请';

  const baseInfo: Array<{ label: string; value: string }> = [];
  const bizInfo: Array<{ label: string; value: string }> = [];
  const techInfo: Array<{ label: string; value: string }> = [];
  const usageInfo: Array<{ label: string; value: string }> = [];

  if (detail.type === 'table' || detail.type === 'view') {
    baseInfo.push(
      { label: '中文名', value: detail.displayName ?? '' },
      { label: '描述', value: detail.description ?? '' },
      { label: '数据层级', value: detail.dataLevel ?? '' },
      { label: '是否核心', value: detail.isCore ? '是' : '否' },
      { label: '我的权限', value: permLabel },
    );
    bizInfo.push(
      { label: '业务域', value: detail.domain ?? '' },
      { label: '业务负责人', value: detail.businessOwner ?? '' },
      { label: '数据分类', value: (detail.tags ?? []).join('\u3001') },
      { label: '技术负责人', value: detail.owner ?? '' },
    );
    techInfo.push(
      { label: '平台来源', value: sysLabel },
      { label: '库名', value: detail.databaseName ?? '' },
      { label: '是否分区', value: detail.isPartitioned ? '是' : '否' },
      { label: '存储格式', value: detail.storageFormat ?? '' },
      { label: '生命周期', value: detail.lifecycle ?? '' },
      { label: '创建时间', value: detail.createdAt ?? '' },
      { label: '更新时间', value: detail.updatedAt ?? '' },
    );
    usageInfo.push(
      { label: '近30天查询量', value: String(detail.usageCount ?? 0) },
      { label: '近30天浏览量', value: String(detail.viewCount ?? 0) },
    );
  } else if (detail.type === 'metric') {
    const md = detail.metricDefinition;
    baseInfo.push(
      { label: '中文名', value: detail.displayName ?? '' },
      { label: '指标类型', value: '原子指标' },
      { label: '统计粒度', value: md?.statisticsGranularity ?? '' },
      { label: '统计周期', value: md?.statisticsPeriod ?? '' },
      { label: '更新频率', value: md?.updateFrequency ?? '' },
    );
    bizInfo.push(
      { label: '来源平台', value: sysLabel },
      { label: '负责人', value: detail.owner ?? '' },
      { label: '目录归属', value: detail.catalogPath ?? '' },
      { label: '创建时间', value: detail.createdAt ?? '' },
      { label: '更新时间', value: detail.updatedAt ?? '' },
    );
    usageInfo.push(
      { label: '近30天查询量', value: String(detail.usageCount ?? 0) },
      { label: '近30天浏览量', value: String(detail.viewCount ?? 0) },
    );
  } else if (detail.type === 'label') {
    const ld = detail.labelDefinition;
    baseInfo.push(
      { label: '中文名', value: detail.displayName ?? '' },
      { label: '打标对象', value: ld?.targetObject ?? '' },
      { label: '标签类型', value: ld?.labelType ?? '' },
      { label: '值类型', value: ld?.valueType ?? '' },
      { label: '更新方式', value: ld?.updateMethod ?? '' },
      { label: '更新频率', value: ld?.updateFrequency ?? '' },
    );
    bizInfo.push(
      { label: '来源平台', value: sysLabel },
      { label: '负责人', value: detail.owner ?? '' },
      { label: '目录归属', value: detail.catalogPath ?? '' },
      { label: '创建时间', value: detail.createdAt ?? '' },
      { label: '更新时间', value: detail.updatedAt ?? '' },
    );
    usageInfo.push(
      { label: '近30天查询量', value: String(detail.usageCount ?? 0) },
      { label: '近30天浏览量', value: String(detail.viewCount ?? 0) },
    );
  } else if (detail.type === 'api') {
    const ad = detail.apiDefinition;
    baseInfo.push(
      { label: '中文名', value: detail.displayName ?? '' },
      { label: '描述', value: detail.description ?? '' },
      { label: '服务归属', value: ad?.serviceName ?? '' },
      { label: '请求方式', value: ad?.httpMethod ?? '' },
      { label: '鉴权方式', value: ad?.authMethod ?? '' },
    );
    bizInfo.push(
      { label: '技术负责人', value: detail.owner ?? '' },
      { label: '业务负责人', value: detail.businessOwner ?? '' },
      { label: '平台来源', value: sysLabel },
      { label: '目录归属', value: detail.catalogPath ?? '' },
      { label: '创建时间', value: detail.createdAt ?? '' },
      { label: '更新时间', value: detail.updatedAt ?? '' },
    );
    usageInfo.push(
      { label: '近30天调用量', value: String(detail.usageCount ?? 0) },
      { label: '近30天浏览量', value: String(detail.viewCount ?? 0) },
    );
  } else if (detail.type === 'report') {
    const rd = detail.reportDefinition;
    baseInfo.push(
      { label: '中文名', value: detail.displayName ?? '' },
      { label: '描述', value: rd?.description ?? detail.description ?? '' },
      { label: '所属系统', value: rd?.sourceSystem ?? '' },
      { label: '报表目录', value: rd?.reportCatalog ?? '' },
      { label: '访问链接', value: rd?.accessLink ?? '' },
    );
    bizInfo.push(
      { label: '技术负责人', value: detail.owner ?? '' },
      { label: '业务负责人', value: detail.businessOwner ?? '' },
      { label: '平台来源', value: sysLabel },
      { label: '目录归属', value: detail.catalogPath ?? '' },
      { label: '创建时间', value: detail.createdAt ?? '' },
      { label: '更新时间', value: detail.updatedAt ?? '' },
    );
    usageInfo.push(
      { label: '近30天查看量', value: String(detail.usageCount ?? 0) },
      { label: '近30天浏览量', value: String(detail.viewCount ?? 0) },
    );
  }

  return (
    <aside className="detail-sidebar">
      <SidebarSection title="基本信息" fields={baseInfo} />
      {bizInfo.length > 0 && <SidebarSection title="业务/管理信息" fields={bizInfo} />}
      {techInfo.length > 0 && <SidebarSection title="技术信息" fields={techInfo} />}
      {usageInfo.length > 0 && <SidebarSection title="使用统计" fields={usageInfo} />}
    </aside>
  );
}

/* ── Tab content components ────────────────────────────────── */

function FieldsTab({ detail }: { detail: ResourceDetail }) {
  const fields = detail.fields ?? [];
  if (fields.length === 0) return <EmptyState title="暂无字段信息" />;

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: '_idx', title: '序号', render: (_v: unknown, row: Record<string, unknown>) => String(row._idx) },
    { key: 'name', title: '字段名', render: (v: unknown) => <code>{String(v)}</code> },
    { key: 'type', title: '类型', render: (v: unknown) => String(v) },
    { key: 'comment', title: '注释' },
    { key: 'description', title: '字段描述', render: (v: unknown) => v ? String(v) : <span className="detail-field__desc-empty">待补充</span> },
    { key: 'securityLevel', title: '安全等级', render: (v: unknown) => {
      const level = String(v);
      const tone = level === 'S1' || level === 'S2' ? 'success' : level === 'S3' ? 'warning' : 'danger';
      return (
        <span className="detail-field__security">
          <Tag tone={tone}>{level}</Tag>
          {(level === 'S3' || level === 'S4' || level === 'S5') && <span className="detail-field__encrypt-mark">需加密</span>}
        </span>
      );
    }},
  ];

  const rows: Record<string, unknown>[] = fields.map((f, i) => ({ ...f, _idx: i + 1 }));

  return (
    <div className="detail-tab-content">
      <div className="detail-field__notice">
        <p>安全等级规则：S1 公开级 / S2 内部级 \u2192 正常展示；S3 秘密级 / S4 绝密级 / S5 核心级 \u2192 标记加密，样例脱敏。</p>
      </div>
      <DataTable columns={columns} rows={rows} rowKey="_idx" />
    </div>
  );
}

function SampleTab({ detail }: { detail: ResourceDetail }) {
  const data = detail.sampleData ?? [];
  const fields = detail.fields ?? [];
  if (data.length === 0) return <EmptyState title="暂无样例数据" />;

  const allHighSensitivity = fields.length > 0 && fields.every((f) => f.securityLevel === 'S3' || f.securityLevel === 'S4' || f.securityLevel === 'S5');
  if (allHighSensitivity) {
    return <EmptyState title="该表所有字段均为高敏等级，样例数据不可查看" />;
  }

  const columns: DataTableColumn<Record<string, unknown>>[] = fields.map((f) => {
    const isMasked = f.securityLevel === 'S3' || f.securityLevel === 'S4' || f.securityLevel === 'S5';
    return {
      key: f.name,
      title: isMasked ? f.name + ' \uD83D\uDD12' : f.name,
      render: (v: unknown) => isMasked ? '******' : String(v ?? ''),
    };
  });

  return (
    <div className="detail-tab-content">
      <DataTable columns={columns} rows={data} />
    </div>
  );
}

function PartitionsTab({ detail }: { detail: ResourceDetail }) {
  const partitions = detail.partitions ?? [];
  if (partitions.length === 0) return <EmptyState title="该表暂无分区信息" />;

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: 'keys', title: '分区键', render: (v: unknown) => (v as string[]).join(' / ') },
    { key: 'value', title: '分区值' },
    { key: 'rowCount', title: '数据量(行数)', render: (v: unknown) => String(v) },
    { key: 'storageSize', title: '存储大小' },
    { key: 'createdAt', title: '创建时间' },
    { key: 'updatedAt', title: '最近更新时间' },
  ];

  return (
    <div className="detail-tab-content">
      <DataTable columns={columns} rows={partitions} />
    </div>
  );
}

function MetricDefinitionTab({ detail }: { detail: ResourceDetail }) {
  const md = detail.metricDefinition;
  if (!md) return <EmptyState title="暂无指标定义" />;

  return (
    <div className="detail-tab-content">
      <div className="detail-definition__block">
        <h3>口径概览与计算逻辑</h3>
        <dl className="detail-definition__fields">
          <div><dt>统计对象</dt><dd>{md.statisticsObject}</dd></div>
          <div><dt>统计粒度</dt><dd>{md.statisticsGranularity}</dd></div>
          <div><dt>统计周期</dt><dd>{md.statisticsPeriod}</dd></div>
          <div><dt>更新频率</dt><dd>{md.updateFrequency}</dd></div>
          <div><dt>数据延迟</dt><dd>{md.dataDelay}</dd></div>
          <div><dt>计算公式</dt><dd><code className="detail-definition__formula">{md.formula}</code></dd></div>
          <div><dt>口径说明</dt><dd>{md.caliberDescription}</dd></div>
        </dl>
      </div>

      <div className="detail-definition__block">
        <h3>适用场景与维度</h3>
        <div className="detail-definition__tag-group">
          <span className="detail-definition__tag-label">常用分析维度</span>
          {md.dimensions.map((d) => <Tag key={d} tone="blue">{d}</Tag>)}
        </div>
        <div className="detail-definition__tag-group">
          <span className="detail-definition__tag-label">适用场景</span>
          {md.scenarios.map((s) => <Tag key={s} tone="cyan">{s}</Tag>)}
        </div>
      </div>

      <div className="detail-definition__block">
        <h3>使用提醒</h3>
        <ul className="detail-definition__notes">
          {md.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}

function LabelDefinitionTab({ detail }: { detail: ResourceDetail }) {
  const ld = detail.labelDefinition;
  if (!ld) return <EmptyState title="暂无标签定义" />;

  return (
    <div className="detail-tab-content">
      <div className="detail-definition__block">
        <h3>标签概览</h3>
        <dl className="detail-definition__fields">
          <div><dt>标签编码</dt><dd><code>{ld.code}</code></dd></div>
          <div><dt>标签类型</dt><dd>{ld.labelType}</dd></div>
          <div><dt>值类型</dt><dd>{ld.valueType}</dd></div>
          <div><dt>打标对象</dt><dd>{ld.targetObject}</dd></div>
          <div><dt>更新方式</dt><dd>{ld.updateMethod}</dd></div>
          <div><dt>更新频率</dt><dd>{ld.updateFrequency}</dd></div>
        </dl>
      </div>

      <div className="detail-definition__block">
        <h3>标签定义（值域说明）</h3>
        <table className="detail-definition__value-table">
          <thead><tr><th>值</th><th>含义</th></tr></thead>
          <tbody>
            {ld.valueRanges.map((vr) => <tr key={vr.value}><td><Tag tone="purple">{vr.value}</Tag></td><td>{vr.meaning}</td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="detail-definition__block">
        <h3>覆盖统计</h3>
        <dl className="detail-definition__fields">
          <div><dt>覆盖率</dt><dd>{ld.coverageRate}%</dd></div>
        </dl>
        <div className="detail-definition__tag-group">
          <span className="detail-definition__tag-label">适用场景</span>
          {ld.scenarios.map((s) => <Tag key={s} tone="cyan">{s}</Tag>)}
        </div>
      </div>

      <div className="detail-definition__block">
        <h3>样本数据</h3>
        <table className="detail-definition__value-table">
          <thead><tr><th>用户ID</th><th>标签值</th></tr></thead>
          <tbody>
            {ld.sampleData.map((sd) => <tr key={sd.userId}><td>{sd.userId}</td><td><Tag tone="purple">{sd.labelValue}</Tag></td></tr>)}
          </tbody>
        </table>
      </div>

      <div className="detail-definition__block">
        <h3>使用提醒</h3>
        <ul className="detail-definition__notes">
          {ld.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}

function APIParamsTab({ detail }: { detail: ResourceDetail }) {
  const ad = detail.apiDefinition;
  if (!ad) return <EmptyState title="暂无参数信息" />;

  const reqColumns: DataTableColumn<Record<string, unknown>>[] = [
    { key: 'name', title: '参数名' },
    { key: 'type', title: '类型' },
    { key: 'position', title: '参数位置' },
    { key: 'required', title: '必填', render: (v: unknown) => v ? '是' : '否' },
    { key: 'description', title: '说明' },
    { key: 'example', title: '示例值', render: (v: unknown) => v ? <code>{String(v)}</code> : '\u2014' },
  ];

  const resColumns: DataTableColumn<Record<string, unknown>>[] = [
    { key: 'name', title: '字段名' },
    { key: 'type', title: '类型' },
    { key: 'description', title: '说明' },
    { key: 'example', title: '示例值', render: (v: unknown) => v ? <code>{String(v)}</code> : '\u2014' },
  ];

  return (
    <div className="detail-tab-content">
      <div className="detail-definition__block detail-definition__api-header">
        <h3>接口信息</h3>
        <dl className="detail-definition__fields">
          <div><dt>请求方式</dt><dd><Tag tone="blue">{ad.httpMethod}</Tag></dd></div>
          <div><dt>摘要描述</dt><dd>{ad.summary}</dd></div>
          <div><dt>服务归属</dt><dd>{ad.serviceName}</dd></div>
          <div><dt>请求路径</dt><dd><code>{ad.requestPath}</code></dd></div>
          <div><dt>鉴权方式</dt><dd>{ad.authMethod}</dd></div>
        </dl>
      </div>

      <div className="detail-definition__block">
        <h3>请求参数</h3>
        <DataTable columns={reqColumns} rows={ad.requestParams} rowKey="name" />
      </div>

      <div className="detail-definition__block">
        <h3>响应字段</h3>
        <DataTable columns={resColumns} rows={ad.responseFields} rowKey="name" />
      </div>

      <div className="detail-definition__block">
        <h3>调用说明</h3>
        <ul className="detail-definition__notes">
          {ad.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}

function ReportDefinitionTab({ detail }: { detail: ResourceDetail }) {
  const rd = detail.reportDefinition;
  if (!rd) return <EmptyState title="暂无报表定义" />;

  return (
    <div className="detail-tab-content">
      <div className="detail-definition__block">
        <h3>报表概览</h3>
        <dl className="detail-definition__fields">
          <div><dt>描述</dt><dd>{rd.description}</dd></div>
          <div><dt>所属系统</dt><dd>{rd.sourceSystem}</dd></div>
          <div><dt>报表目录</dt><dd>{rd.reportCatalog}</dd></div>
        </dl>
      </div>

      <div className="detail-definition__block">
        <h3>核心内容与分析视角</h3>
        <div className="detail-definition__tag-group">
          <span className="detail-definition__tag-label">核心指标</span>
          {rd.coreMetrics.map((m) => <Tag key={m} tone="blue">{m}</Tag>)}
        </div>
        <div className="detail-definition__tag-group">
          <span className="detail-definition__tag-label">分析维度</span>
          {rd.analysisDimensions.map((d) => <Tag key={d} tone="cyan">{d}</Tag>)}
        </div>
      </div>

      {rd.accessLink && (
        <div className="detail-definition__block">
          <h3>报表链接</h3>
          <a className="detail-definition__link" href={rd.accessLink} target="_blank" rel="noopener noreferrer">{rd.accessLink}</a>
        </div>
      )}
    </div>
  );
}

function DDLTab({ detail }: { detail: ResourceDetail }) {
  const changes = detail.ddlChanges ?? [];
  if (changes.length === 0) return <EmptyState title="暂无DDL变更记录" />;

  const ddlTypeLabels: Record<string, string> = {
    add_field: '新增字段',
    remove_field: '删除字段',
    modify_type: '修改字段类型',
    modify_comment: '修改字段注释',
    modify_property: '修改表属性',
    other: '其他',
  };

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: 'time', title: '变更时间' },
    { key: 'type', title: '变更类型', render: (v: unknown) => ddlTypeLabels[String(v)] ?? String(v) },
    { key: 'description', title: '变更描述' },
    { key: 'operator', title: '操作人' },
    { key: 'sql', title: 'SQL', render: (v: unknown) => <code className="detail-ddl__sql">{String(v)}</code> },
  ];

  return (
    <div className="detail-tab-content">
      <DataTable columns={columns} rows={changes} />
    </div>
  );
}

function LogsTab({ detail }: { detail: ResourceDetail }) {
  const logs = detail.operationLogs ?? [];
  if (logs.length === 0) return <EmptyState title="暂无操作记录" />;

  const columns: DataTableColumn<Record<string, unknown>>[] = [
    { key: 'time', title: '时间' },
    { key: 'category', title: '分类' },
    { key: 'action', title: '操作' },
    { key: 'operator', title: '操作人' },
    { key: 'detail', title: '详情' },
  ];

  return (
    <div className="detail-tab-content">
      <DataTable columns={columns} rows={logs} />
    </div>
  );
}

function ManageTab({ detail }: { detail: ResourceDetail }) {
  const hasContent = detail.usageNotes || detail.maintenanceNote;
  if (!hasContent) {
    return <EmptyState title="暂无使用说明" description="负责人可点击编辑补充" />;
  }

  return (
    <div className="detail-tab-content">
      {detail.usageNotes && (
        <div className="detail-definition__block">
          <h3>使用说明</h3>
          <div className="detail-manage__richtext">{detail.usageNotes}</div>
        </div>
      )}
      {detail.maintenanceNote && (
        <div className="detail-definition__block">
          <h3>维护备注</h3>
          <p className="detail-manage__note">{detail.maintenanceNote}</p>
        </div>
      )}
      <div className="detail-definition__block">
        <dl className="detail-definition__fields">
          <div><dt>技术负责人</dt><dd>{detail.owner ?? '\u2014'}</dd></div>
          <div><dt>业务负责人</dt><dd>{detail.businessOwner ?? '\u2014'}</dd></div>
        </dl>
      </div>
    </div>
  );
}



/* ── Approval status badge ──────────────────────────────── */
type ApprovalBadgeInfo = {
  label: string;
  type: 'reviewing' | 'unlisting' | 'catalog_reviewing' | 'handover_reviewing';
};

const APPROVAL_BADGE: Record<string, ApprovalBadgeInfo> = {
  reviewing: { label: '上架审批中', type: 'reviewing' },
  unlisting: { label: '下架审批中', type: 'unlisting' },
  catalog_reviewing: { label: '目录修改审批中', type: 'catalog_reviewing' },
  handover_reviewing: { label: '交接审批中', type: 'handover_reviewing' },
};

function ApprovalStatusBadge({ status }: { status: string }) {
  const info = APPROVAL_BADGE[status];
  if (!info) return null;
  return <Tag tone="warning">{info.label}</Tag>
}

/* ── Main DetailPage ──────────────────────────────────────── */

export function DetailPage() {
  const { domain, id } = parseDetailHash();
  const detail = mockDetails[id];
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (!detail) return '';
    const tabs = tabMatrix[detail.type];
    return tabs.length > 0 ? tabs[0].key : '';
  });
  const [isFav, setIsFav] = useState(false);

  const tabs = useMemo(() => detail ? tabMatrix[detail.type] : [], [detail]);

  const handleToggleFav = useCallback(() => setIsFav((prev) => !prev), []);



  if (!detail) {
    return (
      <div className="detail-page">
        <EmptyState title="未找到该资源" description="请检查URL参数是否正确，或返回上一页重新选择。" />
        <div className="detail-page__back">
          <Button variant="text" onClick={() => { window.location.hash = domain === 'resource' ? '#management' : '#catalog'; }}>
            <BackIcon /> 返回列表
          </Button>
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: resourceTypeLabels[detail.type], onClick: () => { window.location.hash = domain === 'resource' ? '#management' : '#catalog'; } },
    { label: detail.displayName ?? detail.name },
  ];

  const showSidebar = activeTab !== 'lineage';

  return (
    <div className="detail-page">
      {/* Top bar */}
      <div className="detail-page__topbar">
        <button type="button" className="detail-page__back-btn" onClick={() => { window.location.hash = domain === 'resource' ? '#management' : '#catalog'; }}>
          <BackIcon /> 返回
        </button>
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <DetailHeader detail={detail} isFav={isFav} onToggleFav={handleToggleFav} />

      {tabs.length > 0 && (
        <Tabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />
      )}

      <div className={`detail-page__body ${showSidebar ? '' : 'detail-page__body--full'}`}>
        <div className="detail-page__content">
          {activeTab === 'fields' && <FieldsTab detail={detail} />}
          {activeTab === 'sample' && <SampleTab detail={detail} />}
          {activeTab === 'partitions' && <PartitionsTab detail={detail} />}
          {activeTab === 'definition' && detail.type === 'metric' && <MetricDefinitionTab detail={detail} />}
          {activeTab === 'definition' && detail.type === 'label' && <LabelDefinitionTab detail={detail} />}
          {activeTab === 'definition' && detail.type === 'report' && <ReportDefinitionTab detail={detail} />}
          {activeTab === 'params' && <APIParamsTab detail={detail} />}
          {activeTab === 'ddl' && <DDLTab detail={detail} />}
          {activeTab === 'logs' && <LogsTab detail={detail} />}
          {activeTab === 'manage' && <ManageTab detail={detail} />}
          {activeTab === 'lineage' && (
            <div style={{ height: '600px', position: 'relative' }}>
              <LineagePage centerNodeId={detail.name} isEmbedded={true} />
            </div>
          )}
        </div>

        {showSidebar && <DetailSidebar detail={detail} />}
      </div>
    </div>
  );
}
