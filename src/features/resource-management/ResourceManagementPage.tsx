import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { Tooltip } from '../../components/base/Tooltip';
import type { ResourceType } from '../../types/resources';
import { ActionDialogRouter, handleDirectAction, isDirectAction, CatalogSelectDialog, TransferOwnerDialog, CatalogTreeRadio, getCatalogPathSimple, today } from './ResourceActionDialogs';
import type { ActiveAction } from './ResourceActionDialogs';
import './resource-management.css';

type ManagementPanel = 'workbench' | 'resource-list' | 'catalog-mgmt';
type ResourceStatus = 'maintain' | 'published' | 'no-list' | 'reviewing' | 'unlisting' | 'catalog_reviewing' | 'handover_reviewing';
type ResourceListTab = 'all' | 'maintain' | 'published' | 'no-list' | 'errors';
type TodoCategory = 'identification' | 'management' | 'retirement' | 'owner';
type TodoLevel = 'error' | 'warn' | 'info';
type ResourceAction = { label: string; disabled?: boolean; disabledReason?: string; primary?: boolean };

const APPROVAL_DISABLED_REASONS: Record<string, string> = {
  reviewing: '资源正在上架审批中，审批完成前无法操作',
  unlisting: '资源正在下架审批中，审批完成前无法操作',
  catalog_reviewing: '资源正在目录修改审批中，审批完成前无法操作',
  handover_reviewing: '资源正在负责人交接审批中，审批完成前无法操作',
};

export type ManagedResource = {
  id: string;
  name: string;
  displayName?: string;
  type: ResourceType;
  platform: string;
  source: string;
  sourceType: string;
  sourceSystem: string;
  status: ResourceStatus;
  techOwner: string;
  bizOwner?: string;
  catalog?: string | null;
  updated: string;
  tags: string[];
  summary: string;
  pendingCatalog?: string;
  pendingHandover?: { techOwner: string; bizOwner?: string };
  metricLevel?: string;
  securityLevel?: string;
  freshness?: string;
  expression?: string;
  specification?: string;
  usageMd?: string;
};

type WorkbenchTodo = {
  id: string;
  resourceId?: string;
  resourceName: string;
  resourceType: ResourceType;
  category: TodoCategory;
  issueTitle: string;
  issueDesc: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  scanDate: string;
  status: 'open' | 'resolved_pending_rescan' | 'waived';
  level: TodoLevel;
};

export type CatalogNode = {
  id: string;
  name: string;
  desc?: string;
  children: CatalogNode[];
};

type ResourceError = {
  id: string;
  resource: string;
  resourceId?: string | null;
  type: 'missing-info' | 'invalid' | 'no-owner' | 'no-catalog';
  typeLabel: string;
  desc: string;
  resType: ResourceType;
  owner: string;
  found: string;
  handleStatus: 'pending' | 'handled' | 'ignored';
};

type LogEntry = {
  action: string;
  resource: string;
  operator: string;
  result: string;
  time: string;
};

const CURRENT_USER = '张三';

/* --- SVG Icon Components --- */

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <line x1="2" y1="6" x2="14" y2="6" />
      <line x1="6" y1="6" x2="6" y2="14" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <line x1="6" y1="5.5" x2="10" y2="5.5" />
      <line x1="6" y1="8" x2="10" y2="8" />
      <line x1="6" y1="10.5" x2="8.5" y2="10.5" />
    </svg>
  );
}

function MetricIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 14V8h4v6M6 14V4h4v10M10 14V6h4v8" />
    </svg>
  );
}

function ApiIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M5 8h6M8 5v6" />
    </svg>
  );
}

function LabelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8l5-5.5h5.5a1.5 1.5 0 011.5 1.5V8l-5 5.5L2 8z" />
      <circle cx="10" cy="5.5" r="1.2" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1.5" />
      <rect x="8.5" y="2" width="5.5" height="5.5" rx="1.5" />
      <rect x="2" y="8.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  );
}

function ResourceIcon({ type }: { type: ResourceType }) {
  switch (type) {
    case 'table': return <TableIcon />;
    case 'report': return <ReportIcon />;
    case 'metric': return <MetricIcon />;
    case 'api': return <ApiIcon />;
    case 'label': return <LabelIcon />;
    case 'dashboard': return <DashboardIcon />;
    case 'view': return <ViewIcon />;
    default: return <TableIcon />;
  }
}

const panelNav: Array<{ key: ManagementPanel; label: string; icon: string; section: '资源管理' | '目录管理' }> = [
  { key: 'workbench', label: '工作台', icon: '▦', section: '资源管理' },
  { key: 'resource-list', label: '资源列表', icon: '▣', section: '资源管理' },
  { key: 'catalog-mgmt', label: '目录管理', icon: '📁', section: '目录管理' },
];

const INITIAL_RESOURCES: ManagedResource[] = [
  {
    id: 'r002',
    name: 'kafka_user_click_raw',
    displayName: '用户点击原始流',
    type: 'table',
    platform: 'Kafka',
    source: '消息集群B',
    sourceType: 'message_stream',
    sourceSystem: 'Kafka',
    status: 'maintain',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: null,
    updated: '2026-03-19',
    tags: ['用户行为', '点击流', '实时'],
    summary: '实时用户点击原始流，支持埋点排查与实时行为分析',
  },
  {
    id: 'r004',
    name: 'wlyd_mc_beijing.dm_difp_pay_mt_account_aggregate_info_df',
    displayName: '账户聚合明细表',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'maintain',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: '用户域/行为',
    updated: '2026-03-17',
    tags: ['支付', '账户', 'DM', '汇总表', '待维护'],
    summary: '账户聚合明细表，待补充摘要与目录信息',
  },
  {
    id: 'r006',
    name: 'rpt_weekly_summary',
    displayName: '经营周报看板',
    type: 'report',
    platform: '万联灵析',
    source: '报表中心',
    sourceType: 'report_system',
    sourceSystem: '万联灵析',
    status: 'no-list',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: null,
    updated: '2026-03-15',
    tags: ['周报', '经营分析'],
    summary: '经营周报看板，聚合展示核心业务指标变化趋势',
  },
  {
    id: 'r008',
    name: 'wlyd_mc_beijing.ads_difp_bi_mt_pay_match_pay_trend_chart_success_account_open_rate_df',
    displayName: '支付趋势图表汇总表',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'published',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: '用户域/行为/行为日志',
    updated: '2026-03-21',
    tags: ['支付', '趋势', 'ADS', '看板'],
    summary: '支付趋势图表汇总表，用于 BI 看板展示',
  },
  {
    id: 'r001',
    name: 'wlyd_industry_beijing.ods_wlyd_industry_news_industrial_info_di',
    displayName: '行业资讯原始明细',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'maintain',
    techOwner: '李四',
    bizOwner: '张三',
    catalog: null,
    updated: '2026-03-20',
    tags: ['行业资讯', 'ODS', '新闻'],
    summary: '采集的行业资讯原始明细数据，供新闻加工与主题分析使用',
  },
  {
    id: 'r009-label',
    name: 'label_user_value_tier',
    displayName: '用户价值分层标签',
    type: 'label',
    platform: 'SelectDB',
    source: '画像分析集群',
    sourceType: 'label_platform',
    sourceSystem: '标签画像平台',
    status: 'maintain',
    techOwner: '王五',
    bizOwner: '张三',
    catalog: null,
    updated: '2026-03-21',
    tags: ['标签', '用户分层', '营销'],
    summary: '对用户价值等级进行分层的标签资源，待补充规则说明与值域描述',
  },
  {
    id: 'r003',
    name: 'wlyd_mc_beijing.dws_vlsp_mb_domain_entire_business_process_1m_df',
    displayName: '业务过程汇总宽表',
    type: 'table',
    platform: 'SelectDB',
    source: '业务分析集群',
    sourceType: 'business_db',
    sourceSystem: 'SelectDB',
    status: 'published',
    techOwner: '李四',
    bizOwner: '王五',
    catalog: '交易域/订单',
    updated: '2026-03-18',
    tags: ['业务过程', '汇总', 'DWS'],
    summary: '业务过程汇总宽表，用于经营过程分析与主题建模',
  },
  {
    id: 'r005',
    name: 'api_inventory_check',
    displayName: '库存校验接口',
    type: 'api',
    platform: '内部微服务',
    source: '供应链系统',
    sourceType: 'api_service',
    sourceSystem: '内部微服务',
    status: 'maintain',
    techOwner: '李四',
    bizOwner: '王五',
    catalog: null,
    updated: '2026-03-16',
    tags: ['库存', '接口', '供应链'],
    summary: '库存校验接口，面向供应链协同场景提供库存查询能力',
  },
  {
    id: 'r007',
    name: 'wlyd_mc_beijing.dwd_ctps_product_browsered_company_shop_device_product_d1',
    displayName: '订单浏览行为明细宽表',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'catalog_reviewing',
    techOwner: '李四',
    bizOwner: '王五',
    catalog: '交易域/订单/订单明细',
    updated: '2026-03-20',
    tags: ['订单', '浏览', 'DWD', '目录迁移中'],
    summary: '订单浏览行为明细宽表，已提交目录迁移申请',
    pendingCatalog: '交易域/渠道',
  },
  {
    id: 'r011',
    name: 'wlyd_mc_beijing.dws_trade_channel_gmv_day_df',
    displayName: '渠道GMV日汇总表',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'reviewing',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: '交易域/渠道',
    updated: '2026-04-01',
    tags: ['渠道', 'GMV', 'DWS', '待审核'],
    summary: '渠道 GMV 日汇总表，已提交上架申请，等待业务负责人审批',
  },
  {
    id: 'r010',
    name: 'wlyd_mc_beijing.ads_user_retention_week_df',
    displayName: '用户周留存率汇总表',
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'unlisting',
    techOwner: '张三',
    bizOwner: '赵六',
    catalog: '用户域/留存',
    updated: '2026-03-28',
    tags: ['用户', '留存', 'ADS', '申请下架中'],
    summary: '用户周留存率汇总表，已提交下架申请，等待审批',
  },
];

const todoMeta: Record<TodoCategory, { label: string; tone: 'blue' | 'warning' | 'danger' | 'purple' }> = {
  identification: { label: '数据识别类', tone: 'blue' },
  management: { label: '数据管理类', tone: 'warning' },
  retirement: { label: '数据退役类', tone: 'danger' },
  owner: { label: '负责人异常类', tone: 'purple' },
};

const workbenchTodos: WorkbenchTodo[] = [
  {
    id: 'wbt001',
    resourceId: 'r001',
    resourceName: 'wlyd_industry_beijing.ods_wlyd_industry_news_industrial_info_di',
    resourceType: 'table',
    category: 'identification',
    issueTitle: '数据无分类分级',
    issueDesc: '资源未进行数据分类分级标注，请联系管理员线下处理。',
    primaryActionLabel: '联系管理员',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt002',
    resourceId: 'r005',
    resourceName: 'api_inventory_check',
    resourceType: 'api',
    category: 'identification',
    issueTitle: 'API详情描述不规范',
    issueDesc: 'API 描述信息不完整，当前无法关联应用平台。',
    primaryActionLabel: '编辑',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'info',
  },
  {
    id: 'wbt003',
    resourceId: 'r004',
    resourceName: 'wlyd_mc_beijing.dm_difp_pay_mt_account_aggregate_info_df',
    resourceType: 'table',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt010',
    resourceId: 'r002',
    resourceName: 'kafka_user_click_raw',
    resourceType: 'table',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-15',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt011',
    resourceId: 'r001',
    resourceName: 'wlyd_industry_beijing.ods_wlyd_industry_news_industrial_info_di',
    resourceType: 'table',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-15',
    status: 'open',
    level: 'info',
  },
  {
    id: 'wbt012',
    resourceId: 'r005',
    resourceName: 'api_inventory_check',
    resourceType: 'api',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-15',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt013',
    resourceId: 'r006',
    resourceName: 'rpt_weekly_summary',
    resourceType: 'report',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-15',
    status: 'open',
    level: 'info',
  },
  {
    id: 'wbt014',
    resourceId: 'r009-label',
    resourceName: 'label_user_value_tier',
    resourceType: 'label',
    category: 'management',
    issueTitle: '数据长时间未更新',
    issueDesc: '超过 30 天未更新，且生命周期小于 30 天。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-15',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt004',
    resourceId: 'r003',
    resourceName: 'wlyd_mc_beijing.dws_vlsp_mb_domain_entire_business_process_1m_df',
    resourceType: 'table',
    category: 'retirement',
    issueTitle: '数据源已删除',
    issueDesc: '源系统已删除该数据资源，但平台中仍保留对应记录。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'error',
  },
  {
    id: 'wbt005',
    resourceId: 'r006',
    resourceName: 'rpt_weekly_summary',
    resourceType: 'report',
    category: 'retirement',
    issueTitle: '表名不规范 / 临时表',
    issueDesc: '命名不规范、无过期时间或为临时表，需确认是否销毁。',
    primaryActionLabel: '已处理',
    secondaryActionLabel: '无需处理',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'warn',
  },
  {
    id: 'wbt006',
    resourceId: 'r002',
    resourceName: 'kafka_user_click_raw',
    resourceType: 'table',
    category: 'owner',
    issueTitle: '负责人离职',
    issueDesc: '技术负责人已离职，资源当前无有效维护人。',
    primaryActionLabel: '认领资源',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'error',
  },
  {
    id: 'wbt007',
    resourceId: 'r009-label',
    resourceName: 'label_user_value_tier',
    resourceType: 'label',
    category: 'owner',
    issueTitle: '负责人缺失',
    issueDesc: '未指定业务负责人，资源无法闭环治理。',
    primaryActionLabel: '认领资源',
    scanDate: '2026-05-14',
    status: 'open',
    level: 'warn',
  },
];

const workbenchOperations = [
  { time: '10:42', operator: '张三', resource: 'dwd_order_detail', action: '编辑', detail: '修改资源描述' },
  { time: '10:30', operator: '张三', resource: 'ods_user_log', action: '上架', detail: '状态：待维护 → 已上架' },
  { time: '10:15', operator: '系统', resource: 'ods_trade_flow', action: '字段同步', detail: '自动同步物理字段（+2 -1）' },
  { time: '09:50', operator: '张三', resource: 'dim_city', action: '修改目录', detail: '从"基础维度"迁移至"地理维度"' },
  { time: '09:35', operator: '李四', resource: 'ads_finance_report', action: '申请权限', detail: '申请读权限，待审批' },
  { time: '09:20', operator: '张三', resource: 'dws_user_behavior', action: '打标签', detail: '新增标签：核心资产、用户行为' },
];

const myRequests = [
  { resource: 'dwd_order_detail', type: '上架申请', status: '审批中', time: '03-30 14:20' },
  { resource: 'ods_user_log', type: '权限申请', status: '审批中', time: '03-29 11:00' },
  { resource: 'dim_product', type: '目录变更', status: '审批中', time: '03-28 16:30' },
];

const resourceErrors: ResourceError[] = [
  { id: 'e001', resource: 'kafka_user_click_raw', resourceId: 'r002', type: 'missing-info', typeLabel: '信息缺失', desc: '资源已上架但目录未归属，影响消费方检索', resType: 'table', owner: '张三', found: '2026-03-22', handleStatus: 'pending' },
  { id: 'e003', resource: 'dwd_payment_detail_bak', resourceId: null, type: 'invalid', typeLabel: '资源失效', desc: '底层数据表已删除，资产仍显示已上架状态', resType: 'table', owner: '李四', found: '2026-03-20', handleStatus: 'pending' },
  { id: 'e005', resource: 'ods_log_2025_archive', resourceId: null, type: 'no-owner', typeLabel: '无主资源', desc: '技术负责人已离职，资源当前无有效负责人', resType: 'table', owner: '—', found: '2026-03-18', handleStatus: 'pending' },
];

const INITIAL_CATALOG_TREE: CatalogNode[] = [
  {
    id: 'cat1',
    name: '交易域',
    desc: '交易主题域下所有资源',
    children: [
      { id: 'cat1-1', name: '订单', desc: '订单相关资源', children: [
        { id: 'cat1-1-1', name: '订单明细', desc: '订单明细层资源', children: [] },
        { id: 'cat1-1-2', name: '历史订单', desc: '历史订单归档', children: [] },
      ] },
      { id: 'cat1-2', name: '支付', desc: '支付流水相关', children: [{ id: 'cat1-2-1', name: '支付流水', children: [] }] },
      { id: 'cat1-3', name: '指标', children: [{ id: 'cat1-3-1', name: '核心指标', children: [] }] },
      { id: 'cat1-4', name: '报表', children: [{ id: 'cat1-4-1', name: '销售报表', children: [] }] },
    ],
  },
  {
    id: 'cat2',
    name: '用户域',
    desc: '用户主题域下所有资源',
    children: [
      { id: 'cat2-1', name: '行为', children: [{ id: 'cat2-1-1', name: '行为日志', children: [] }] },
      { id: 'cat2-2', name: '画像', children: [{ id: 'cat2-2-1', name: '用户标签', children: [] }] },
      { id: 'cat2-3', name: '标签', children: [{ id: 'cat2-3-1', name: '用户价值', children: [] }] },
      { id: 'cat2-4', name: 'API', children: [{ id: 'cat2-4-1', name: '基础API', children: [] }] },
    ],
  },
  {
    id: 'cat3',
    name: '供应链',
    children: [
      { id: 'cat3-1', name: '商品', children: [{ id: 'cat3-1-1', name: '商品信息', children: [] }] },
      { id: 'cat3-2', name: '库存', children: [{ id: 'cat3-2-1', name: '库存明细', children: [] }] },
    ],
  },
];

const INITIAL_LOGS: LogEntry[] = [
  { action: '提交上架', resource: 'wlyd_industry_beijing.ods_wlyd_industry_news_industrial_info_di', operator: '李四', result: '待审核', time: '2026-03-20 14:30' },
  { action: '驳回申请', resource: 'wlyd_mc_beijing.dm_difp_pay_mt_account_aggregate_info_df', operator: '管理员-王敏', result: '需补负责人', time: '2026-03-19 16:42' },
  { action: '标记不上架', resource: 'rpt_weekly_summary', operator: '张三', result: '保留资源态', time: '2026-03-18 11:15' },
  { action: '恢复上架', resource: 'wlyd_mc_beijing.dwd_ctps_product_browsered_company_shop_device_product_d1', operator: '李四', result: '已恢复为资产', time: '2026-03-17 09:20' },
];

const statusTabs: Array<{ key: ResourceListTab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'maintain', label: '待维护' },
  { key: 'published', label: '已上架' },
  { key: 'no-list', label: '不上架' },
  { key: 'errors', label: '异常' },
];

const typeLabels: Record<ResourceType, string> = {
  table: '表',
  metric: '指标',
  report: '报表',
  api: 'API',
  label: '标签',
  view: '视图',
  dashboard: '看板',
};

const platformLabels: Record<string, string> = {
  warehouse_engine: '数仓引擎',
  message_stream: '消息队列',
  report_system: '报表系统',
  business_db: '业务数据库',
  api_service: 'API服务',
  label_platform: '画像标签系统',
};

function isMyResource(resource: ManagedResource) {
  return resource.techOwner === CURRENT_USER || resource.bizOwner === CURRENT_USER;
}

function typeLabel(type: ResourceType) {
  return typeLabels[type] ?? type;
}

function statusLabel(status: ResourceStatus) {
  return {
    maintain: '待维护',
    published: '已上架',
    'no-list': '不上架',
    reviewing: '上架审批中',
    unlisting: '下架审批中',
    catalog_reviewing: '目录迁移审批中',
    handover_reviewing: '交接审批中',
  }[status];
}

function statusTone(status: ResourceStatus): 'success' | 'warning' | 'gray' | 'blue' {
  if (status === 'published') return 'success';
  if (status === 'maintain' || status === 'reviewing' || status === 'unlisting' || status === 'catalog_reviewing' || status === 'handover_reviewing') return 'warning';
  return 'gray';
}

function splitQualifiedName(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return { prefix: '', objectName: name };
  return { prefix: `${parts.slice(0, -1).join('.')}.`, objectName: parts[parts.length - 1] };
}

function getOpenTodos() {
  return workbenchTodos.filter((item) => item.status === 'open');
}

function todoCount(category: TodoCategory) {
  return getOpenTodos().filter((item) => item.category === category).length;
}

function levelClass(level: TodoLevel) {
  return `resource-management__todo-dot resource-management__todo-dot--${level}`;
}

function matchKeyword(resource: ManagedResource, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return true;
  return [
    resource.name,
    resource.platform,
    resource.source,
    resource.sourceSystem,
    resource.catalog,
    resource.summary,
    resource.techOwner,
    resource.bizOwner,
    ...resource.tags,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function filterResourcesByTab(resource: ManagedResource, tab: ResourceListTab) {
  if (tab === 'maintain') return resource.status === 'maintain' || resource.status === 'reviewing';
  if (tab === 'published') return resource.status === 'published' || resource.status === 'unlisting';
  if (tab === 'no-list') return resource.status === 'no-list';
  return true;
}

function getResourceActions(resource: ManagedResource): ResourceAction[] {
  if (resource.status === 'maintain') return [{ label: '编辑' }, { label: '目录' }, { label: '提交上架' }, { label: '不上架' }, { label: '标签' }, { label: '交接' }];
  if (resource.status === 'reviewing') return [{ label: '撤回上架申请', primary: true }];
  if (resource.status === 'catalog_reviewing') return [{ label: '查看审批状态' }];
  if (resource.status === 'handover_reviewing') return [{ label: '查看审批状态' }];
  if (resource.status === 'published') return [{ label: '标签' }, { label: '修改目录' }, { label: '申请下架' }, { label: '交接' }];
  if (resource.status === 'unlisting') return [{ label: '撤回下架申请', primary: true }];
  if (resource.status === 'no-list') return [{ label: '标签' }, { label: '转待维护' }, { label: '交接' }];
  return [];
}

function getErrorAction(error: ResourceError) {
  if (error.type === 'no-owner') return '设置负责人';
  if (error.type === 'invalid') return '申请下架';
  if (error.type === 'no-catalog') return '设置目录';
  return '去完善';
}

function findCatalogNode(nodes: CatalogNode[], id: string): CatalogNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findCatalogNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function getCatalogPath(nodes: CatalogNode[], id: string, path: string[] = []): string[] | undefined {
  for (const node of nodes) {
    const nextPath = [...path, node.name];
    if (node.id === id) return nextPath;
    const childPath = getCatalogPath(node.children, id, nextPath);
    if (childPath) return childPath;
  }
  return undefined;
}

function getCatalogResourceCount(id: string, allResources: ManagedResource[]) {
  const path = getCatalogPath(INITIAL_CATALOG_TREE, id);
  if (!path) return 0;
  const pathText = path.join('/');
  return allResources.filter((resource) => resource.catalog?.startsWith(pathText)).length;
}


function getDirectResourceCount(id: string, allResources: ManagedResource[]) {
  const path = getCatalogPath(INITIAL_CATALOG_TREE, id);
  if (!path) return 0;
  const pathText = path.join('/');
  return allResources.filter((r) => r.catalog === pathText).length;
}

function getCatalogDepth(nodes: CatalogNode[], id: string, depth = 1): number | null {
  for (const node of nodes) {
    if (node.id === id) return depth;
    const child = getCatalogDepth(node.children, id, depth + 1);
    if (child) return child;
  }
  return null;
}

function findParentNode(nodes: CatalogNode[], id: string, parent: CatalogNode | null = null): CatalogNode | null {
  for (const node of nodes) {
    if (node.id === id) return parent;
    const found = findParentNode(node.children, id, node);
    if (found !== undefined && found !== null) return found;
  }
  return null;
}

function getCatalogSubtreeHeight(node: CatalogNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getCatalogSubtreeHeight));
}

function isCatalogDescendant(ancestorId: string, maybeDescendantId: string, tree: CatalogNode[]): boolean {
  const ancestorNode = findCatalogNode(tree, ancestorId);
  if (!ancestorNode || !ancestorNode.children || ancestorNode.children.length === 0) return false;
  const stack = [...ancestorNode.children];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (cur.id === maybeDescendantId) return true;
    if (cur.children && cur.children.length > 0) stack.push(...cur.children);
  }
  return false;
}

function deleteCatalogNode(nodes: CatalogNode[], id: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
    if (deleteCatalogNode(nodes[i].children, id)) return true;
  }
  return false;
}

type CatalogModalState =
  | { type: 'none' }
  | { type: 'add'; parentId: string | null }
  | { type: 'edit'; nodeId: string }
  | { type: 'delete'; nodeId: string }
  | { type: 'migrate'; resourceIds: string[] }
  | { type: 'mount'; catalogId: string };

type DropPosition = 'before' | 'after' | 'in';

function getCatalogNodeSiblingsAndIndex(tree: CatalogNode[], nodeId: string) {
  const parent = findParentNode(tree, nodeId);
  const siblings = parent ? parent.children : tree;
  const index = siblings.findIndex((n) => n.id === nodeId);
  return { parent, siblings, index };
}

function getCatalogDropInvalidReason(dragId: string, targetId: string, dropPosition: DropPosition, tree: CatalogNode[]): string | null {
  if (!dragId || !targetId) return '无效放置';
  if (dragId === targetId) return '不能拖到自身';
  if (isCatalogDescendant(dragId, targetId, tree)) return '不能拖到后代目录';
  const dragNode = findCatalogNode(tree, dragId);
  if (!dragNode) return '拖拽节点不存在';
  const subtreeHeight = getCatalogSubtreeHeight(dragNode);
  const targetDepth = getCatalogDepth(tree, targetId);
  if (!targetDepth) return '目标目录不存在';
  const { parent: dragParent, index: dragIndex } = getCatalogNodeSiblingsAndIndex(tree, dragId);
  const dragParentId = dragParent ? dragParent.id : '__root__';
  if (dropPosition === 'in') {
    const newRootDepth = targetDepth + 1;
    if (newRootDepth + subtreeHeight - 1 > 5) return '超过最大层级（5级）';
    if (dragParentId === targetId) return '该节点已在目标目录下';
    return null;
  }
  const targetDepthVal = targetDepth;
  if (targetDepthVal + subtreeHeight - 1 > 5) return '超过最大层级（5级）';
  const { parent: targetParent, index: targetIndex } = getCatalogNodeSiblingsAndIndex(tree, targetId);
  if (targetIndex === -1) return '目标目录不存在';
  const targetParentId = targetParent ? targetParent.id : '__root__';
  if (dragParentId === targetParentId) {
    if (dropPosition === 'before' && dragIndex === targetIndex - 1) return '目录位置未变化';
    if (dropPosition === 'after' && dragIndex === targetIndex + 1) return '目录位置未变化';
  }
  return null;
}

type PendingCatalogOp = {
  type: 'add' | 'edit' | 'delete' | 'reorder';
  nodeId?: string;
  parentId?: string | null;
  direction?: 'up' | 'down';
  nodeName?: string;
  targetName?: string;
  name?: string;
  desc?: string;
  pendingDrag?: { dragId: string; targetId: string; position: DropPosition; dragName: string; targetName: string };
};

type CatalogApprovalNotice = {
  action: string;
  resource: string;
  result: string;
  catalogIds: string[];
};

function catalogOpActionLabel(op: PendingCatalogOp) {
  if (op.type === 'add') return '新增目录';
  if (op.type === 'edit') return '编辑目录';
  if (op.type === 'delete') return '删除目录';
  return '调整目录层级/排序';
}

function catalogOpApprovalCatalogIds(op: PendingCatalogOp) {
  const ids = [op.nodeId, op.parentId ?? undefined, op.pendingDrag?.dragId].filter(Boolean) as string[];
  return Array.from(new Set(ids));
}

function catalogOpSummary(op: PendingCatalogOp) {
  if (op.type === 'add') return `新增目录「${op.name ?? op.nodeName ?? ''}」`;
  if (op.type === 'edit') return `将目录「${op.nodeName ?? ''}」编辑为「${op.name ?? ''}」`;
  if (op.type === 'delete') return `删除目录「${op.nodeName ?? ''}」`;
  if (op.pendingDrag) return `将目录「${op.nodeName ?? ''}」移动到「${op.targetName ?? ''}」`;
  return `将目录「${op.nodeName ?? ''}」${op.direction === 'up' ? '向上移动' : '向下移动'}`;
}

function WorkbenchPanel({ onOpenList, resources }: { onOpenList: () => void; resources: ManagedResource[] }) {
  const [todoTab, setTodoTab] = useState<TodoCategory>('identification');
  const [expanded, setExpanded] = useState(false);
  const openTodos = getOpenTodos();
  const myResources = resources.filter(isMyResource);
  const visibleTodos = openTodos.filter((todo) => todo.category === todoTab);
  const displayedTodos = expanded ? visibleTodos : visibleTodos.slice(0, 5);

  return (
    <section className="resource-management__panel">
      <h1>工作台</h1>
      <div className="resource-management__stats">
        <button type="button" className="resource-management__stat-card" onClick={onOpenList}>
          <span>我负责的资源</span>
          <strong>{myResources.length}</strong>
          <small>表 {myResources.filter((r) => r.type === 'table').length} · 报表 {myResources.filter((r) => r.type === 'report').length} · 其他 {myResources.filter((r) => !['table', 'report'].includes(r.type)).length}</small>
        </button>
        <button type="button" className="resource-management__stat-card warning">
          <span>待处理事项</span>
          <strong>{openTodos.length}</strong>
          <small>识别 {todoCount('identification')} · 管理 {todoCount('management')} · 退役 {todoCount('retirement')} · 负责人 {todoCount('owner')}</small>
          <i aria-hidden="true" />
        </button>
        <div className="resource-management__stat-card">
          <span>本周变更</span>
          <strong>12</strong>
          <small>较上周 +3</small>
        </div>
        <div className="resource-management__stat-card">
          <span>资源健康度</span>
          <strong className="success">89%</strong>
          <div className="resource-management__health-bar">
            <span style={{ width: '89%' }} />
          </div>
        </div>
      </div>

      <div className="resource-management__workbench-grid">
        <section className="resource-management__card">
          <h2>待办事项</h2>
          <div className="resource-management__todo-tabs" role="tablist" aria-label="待办分类">
            {(Object.keys(todoMeta) as TodoCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={todoTab === category}
                className={todoTab === category ? 'active' : ''}
                onClick={() => {
                  setTodoTab(category);
                  setExpanded(false);
                }}
              >
                {todoMeta[category].label}（{todoCount(category)}）
              </button>
            ))}
          </div>
          <div className="resource-management__todo-list">
            {displayedTodos.map((todo) => (
              <article key={todo.id} className="resource-management__todo-item">
                <span className={levelClass(todo.level)} aria-hidden="true" />
                <div>
                  <div className="resource-management__todo-title">
                    <strong>{todo.resourceName}</strong>
                    <span>{todo.issueTitle}</span>
                  </div>
                  <p>{todo.issueDesc}</p>
                  <small>扫描时间：{todo.scanDate}</small>
                </div>
                <div className="resource-management__todo-actions">
                  <Button variant="primary" size="sm">{todo.primaryActionLabel}</Button>
                  {todo.secondaryActionLabel ? <Button size="sm">{todo.secondaryActionLabel}</Button> : null}
                </div>
              </article>
            ))}
          </div>
          {visibleTodos.length > 5 ? (
            <div className="resource-management__todo-footer">
              <button type="button" onClick={() => setExpanded((value) => !value)}>
                {expanded ? '收起' : `展开查看更多（还有 ${visibleTodos.length - 5} 条）`}
              </button>
            </div>
          ) : null}
        </section>

        <section className="resource-management__card">
          <h2>今日操作记录</h2>
          <div className="resource-management__timeline">
            <div className="resource-management__timeline-day">今天</div>
            {workbenchOperations.map((item) => (
              <div key={`${item.time}-${item.resource}`}>
                <strong>{item.resource}</strong>
                <span>{item.operator} {item.action}</span>
                <small>{item.detail} · {item.time}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="resource-management__card">
        <div className="resource-management__card-head">
          <h2>我的申请（进行中）</h2>
          <button type="button">查看全部 →</button>
        </div>
        <div className="resource-management__request-list">
          {myRequests.map((request) => (
            <div key={`${request.resource}-${request.type}`}>
              <strong>{request.resource}</strong>
              <Tag tone="blue">{request.type}</Tag>
              <span>{request.status}</span>
              <time>{request.time}</time>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ResourceListPanel({ resources, catalogTree, logs, updateResource, addLog }: {
  resources: ManagedResource[];
  catalogTree: CatalogNode[];
  logs: LogEntry[];
  updateResource: (id: string, patch: Partial<ManagedResource>) => void;
  addLog: (entry: { action: string; resource: string; result: string; detail: string }) => void;
}) {
  const [status, setStatus] = useState<ResourceListTab>('all');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logsOpen, setLogsOpen] = useState(false);
  const [moreActionsFor, setMoreActionsFor] = useState<string | null>(null);
  const [moreActionsPos, setMoreActionsPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [pendingBatchAction, setPendingBatchAction] = useState<{ type: string; resourceIds: string[]; catalogPath?: string; newTechOwner?: string; newBizOwner?: string } | null>(null);
  const pageSize = 10;

  useEffect(() => {
    if (!moreActionsFor) return;
    const close = () => setMoreActionsFor(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.resource-management__action-dropdown') && !target.closest('.resource-management__action-more-btn')) {
        close();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [moreActionsFor]);

  const rows = useMemo(() => {
    if (status === 'errors') return [];
    return resources
      .filter((resource) => filterResourcesByTab(resource, status))
      .filter((resource) => (typeFilter === 'all' ? true : resource.type === typeFilter))
      .filter((resource) => (unassignedOnly ? !resource.catalog : true))
      .filter((resource) => (mineOnly ? isMyResource(resource) : true))
      .filter((resource) => matchKeyword(resource, keyword))
      .sort((a, b) => Number(!isMyResource(a)) - Number(!isMyResource(b)));
  }, [keyword, mineOnly, resources, status, typeFilter, unassignedOnly]);

  const selectedCount = selectedIds.size;

  const maintainBadge = resources.filter((r) => r.status === 'maintain').length;
  const publishedBadge = resources.filter((r) => r.status === 'published').length;
  const noListBadge = resources.filter((r) => r.status === 'no-list').length;
  const allBadge = maintainBadge + publishedBadge + noListBadge;
  const errorBadge = resourceErrors.filter((e) => e.handleStatus === 'pending').length;

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const switchTab = (tab: ResourceListTab) => {
    setStatus(tab);
    setMineOnly(false);
    setUnassignedOnly(false);
    setSelectedIds(new Set());
    setPage(1);
  };

  const batchActions = (() => {
    if (status === 'maintain') return ['批量提交上架', '批量不上架', '批量修改目录', '批量交接'];
    if (status === 'published') return ['批量申请下架', '批量交接'];
    if (status === 'no-list') return ['批量转待维护', '批量交接'];
    if (status === 'errors') return [];
    return ['批量提交上架', '批量修改目录', '批量交接'];
  })();

  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(rows.length / pageSize);

  const handleAction = (resourceId: string, action: string) => {
    setMoreActionsFor(null);
    if (isDirectAction(action)) {
      const resource = resources.find((r) => r.id === resourceId);
      if (resource) handleDirectAction(action, resource, updateResource, addLog);
    } else {
      setActiveAction({ resourceId, action });
    }
  };

  return (
    <section className="resource-management__panel">
      <h1>资源列表</h1>
      <div className="resource-management__status-tabs" role="tablist" aria-label="资源状态">
        {statusTabs.map((tab) => {
          const badge = tab.key === 'all' ? allBadge : tab.key === 'maintain' ? maintainBadge : tab.key === 'published' ? publishedBadge : tab.key === 'no-list' ? noListBadge : tab.key === 'errors' ? errorBadge : null;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              className={status === tab.key ? 'active' : ''}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}{badge != null ? ` ${badge}` : ''}
            </button>
          );
        })}
      </div>

      <div className="resource-management__batch-bar">
        <span className={selectedCount ? 'active' : ''}>{selectedCount ? `已选 ${selectedCount} 条` : '未选择'}</span>
        {status !== 'errors' ? <span>共 {rows.length} 条资源</span> : <span>共 {resourceErrors.length} 条异常</span>}
        <div className="resource-management__batch-actions">
          {batchActions.map((action) => (
            <Button key={action} variant={action.includes('提交') ? 'primary' : 'default'} size="sm" disabled={!selectedCount}
              onClick={() => {
                const actionMap: Record<string, string> = {
                  '批量提交上架': 'batchPublish',
                  '批量不上架': 'batchNoList',
                  '批量申请下架': 'batchUnlist',
                  '批量转待维护': 'batchMaintain',
                  '批量修改目录': 'batchCatalog',
                  '批量交接': 'batchHandover',
                };
                const type = actionMap[action];
                if (type) setPendingBatchAction({ type, resourceIds: [...selectedIds] });
              }}>
              {action}
            </Button>
          ))}
        </div>
        {selectedCount ? <Button size="sm" onClick={() => setSelectedIds(new Set())}>取消选择</Button> : null}
      </div>

      <div className="resource-management__toolbar">
        <input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="搜索资源名称…" />
        <select aria-label="全部类型" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as 'all' | ResourceType); setPage(1); }}>
          <option value="all">全部类型</option>
          <option value="table">表</option>
          <option value="api">API</option>
          <option value="report">报表</option>
          <option value="label">标签</option>
          <option value="metric">指标</option>
          <option value="dashboard">看板</option>
          <option value="view">视图</option>
        </select>
        <button type="button" className={unassignedOnly ? 'active' : ''} onClick={() => setUnassignedOnly((value) => !value)}>
          {unassignedOnly ? '☑' : '☐'} 未归属
        </button>
        <button type="button" className={mineOnly ? 'active' : ''} onClick={() => setMineOnly((value) => !value)}>
          {mineOnly ? '☑' : '☐'} 仅我负责
        </button>
        <div className="resource-management__toolbar-right">
          <div className="resource-management__add-menu-wrap">
            <Button variant="primary" size="sm" onClick={() => setAddMenuOpen((v) => !v)}>＋ 新增资源</Button>
            {addMenuOpen ? (
              <div className="resource-management__add-menu">
                {(Object.keys(typeLabels) as ResourceType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setAddMenuOpen(false)}>{typeLabels[t]}</button>
                ))}
              </div>
            ) : null}
          </div>
          <Button size="sm" onClick={() => setLogsOpen(true)}>📝 操作记录</Button>
        </div>
      </div>

      <div className="resource-management__table-wrap">
        {status === 'errors' ? (
          <table>
            <thead>
              <tr>
                <th>资源名称</th>
                <th>类型</th>
                <th>异常类型</th>
                <th>异常描述</th>
                <th>责任人</th>
                <th>发现时间</th>
                <th>处理状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {resourceErrors.map((error) => (
                <tr key={error.id} className={error.handleStatus !== 'pending' ? 'muted' : ''}>
                  <td><strong>{error.resource}</strong></td>
                  <td><Tag>{typeLabel(error.resType)}</Tag></td>
                  <td><Tag tone={error.type === 'invalid' || error.type === 'no-owner' ? 'danger' : 'warning'}>{error.typeLabel}</Tag></td>
                  <td>{error.desc}</td>
                  <td>{error.owner}</td>
                  <td>{error.found}</td>
                  <td><Tag tone={error.handleStatus === 'pending' ? 'warning' : 'gray'}>{error.handleStatus === 'pending' ? '待处理' : error.handleStatus === 'ignored' ? '已忽略' : '已处理'}</Tag></td>
                  <td>
                    {error.handleStatus === 'pending' ? (
                      <div className="resource-management__row-actions">
                        <Button size="sm">{getErrorAction(error)}</Button>
                        <button type="button">忽略</button>
                      </div>
                    ) : (
                      <button type="button">重新处理</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="resource-management__sticky-col-left" aria-label="选择"><input type="checkbox" disabled={rows.length === 0} /></th>
                <th>资源名称</th>
                <th>类型</th>
                <th>平台/来源</th>
                <th>当前状态</th>
                <th>目录归属</th>
                <th>资源描述</th>
                <th>技术负责人</th>
                <th>业务负责人</th>
                <th>标签</th>
                <th>更新时间</th>
                <th className="resource-management__sticky-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((resource) => {
                const hasPermission = isMyResource(resource);
                const pending = ['reviewing', 'unlisting', 'catalog_reviewing'].includes(resource.status);
                const { prefix, objectName } = splitQualifiedName(resource.name);
                const actions = getResourceActions(resource);
                const inlineActions = actions.slice(0, 2);
                const dropdownActions = actions.slice(2);
                return (
                  <tr key={resource.id} className={!hasPermission || pending ? 'muted' : ''}>
                    <td className="resource-management__sticky-col-left">
                      <input
                        type="checkbox"
                        aria-label={`选择 ${resource.name}`}
                        disabled={!hasPermission || pending}
                        checked={selectedIds.has(resource.id)}
                        onChange={() => toggleSelected(resource.id)}
                      />
                    </td>
                    <td>
                      <div className="resource-management__resource-cell">
                        <span className="resource-management__resource-icon"><ResourceIcon type={resource.type} /></span>
                        <strong>
                          {prefix ? <small>{prefix}</small> : null}
                          {objectName}
                        </strong>
                        {!hasPermission ? <em>（无权限）</em> : null}
                        {pending ? <em>（审批中，不可选择）</em> : null}
                      </div>
                    </td>
                    <td><Tag>{typeLabel(resource.type)}</Tag></td>
                    <td>
                      <div className="resource-management__source-cell">
                        <strong>{platformLabels[resource.sourceType] ?? resource.platform}</strong>
                        <span>{resource.sourceSystem}</span>
                      </div>
                    </td>
                    <td><Tag tone={statusTone(resource.status)}>{statusLabel(resource.status)}</Tag></td>
                    <td>{resource.catalog ? resource.catalog : <span className="resource-management__warn-text">⚠️ 未归属</span>}</td>
                    <td className="resource-management__cell-ellipsis">{resource.summary}</td>
                    <td>{resource.techOwner}</td>
                    <td>{resource.bizOwner ?? '-'}</td>
                    <td>
                      <div className="resource-management__tag-list">
                        {resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                      </div>
                    </td>
                    <td>{resource.updated}</td>
                    <td className="resource-management__sticky-col">
                      <div className="resource-management__row-actions">
                        {inlineActions.map((action) => {
                          if (action.disabled) {
                            return (
                              <Tooltip key={action.label} title={action.disabledReason ?? APPROVAL_DISABLED_REASONS[resource.status] ?? '审批中，无法操作'}>
                                <button type="button" disabled>{action.label}</button>
                              </Tooltip>
                            );
                          }
                          return <button key={action.label} type="button" onClick={() => handleAction(resource.id, action.label)}>{action.label}</button>;
                        })}
                        {dropdownActions.length > 0 ? (
                          <span className="resource-management__action-more-wrap">
                            <button
                              type="button"
                              className="resource-management__action-more-btn"
                              aria-label="⋯"
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMoreActionsPos({ top: rect.bottom + 4, left: rect.left });
                                setMoreActionsFor(resource.id);
                              }}
                            >
                              ⋯
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="resource-management__empty-row">暂无数据</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="resource-management__pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
        </div>
      ) : null}

      {moreActionsFor ? createPortal(
        <div
          className="resource-management__action-dropdown"
          style={{ top: moreActionsPos.top, left: moreActionsPos.left }}
        >
          {getResourceActions(resources.find((r) => r.id === moreActionsFor)!).slice(2).map((action) => {
            if (action.disabled) {
              return (
                <button key={action.label} type="button" disabled title={action.disabledReason ?? APPROVAL_DISABLED_REASONS[resources.find((r) => r.id === moreActionsFor)?.status ?? ''] ?? '审批中，无法操作'}>
                  {action.label}
                </button>
              );
            }
            return <button key={action.label} type="button" onClick={() => handleAction(moreActionsFor!, action.label)}>{action.label}</button>;
          })}
        </div>,
        document.body,
      ) : null}

      {logsOpen ? (
        <div className="resource-management__drawer-wrap">
          <button type="button" className="resource-management__drawer-mask" aria-label="关闭操作记录" onClick={() => setLogsOpen(false)} />
          <aside className="resource-management__drawer" aria-label="操作记录抽屉">
            <div className="resource-management__drawer-head">
              <strong>操作记录</strong>
              <button type="button" onClick={() => setLogsOpen(false)}>×</button>
            </div>
            <table>
              <thead><tr><th>操作</th><th>资源名称</th><th>操作人</th><th>结果</th><th>时间</th></tr></thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={`${log.action}-${log.resource}-${idx}`}>
                    <td>{log.action}</td>
                    <td>{log.resource}</td>
                    <td>{log.operator}</td>
                    <td>{log.result}</td>
                    <td>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </aside>
        </div>
      ) : null}

      <ActionDialogRouter
        activeAction={activeAction}
        resources={resources}
        catalogTree={catalogTree}
        onUpdateResource={updateResource}
        onAddLog={addLog}
        onClose={() => setActiveAction(null)}
      />

      {/* Batch action dialogs */}
      {pendingBatchAction ? (
        <>
          {pendingBatchAction.type === 'batchPublish' ? (
            <div className="resource-management__dialog-overlay" onClick={() => setPendingBatchAction(null)}>
              <div className="resource-management__dialog" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className="resource-management__dialog-header"><strong>批量提交上架</strong><button type="button" onClick={() => setPendingBatchAction(null)}>×</button></div>
                <div className="resource-management__dialog-body">
                  <p className="resource-management__confirm-message">确定将以下 <strong>{pendingBatchAction.resourceIds.length}</strong> 条资源提交上架申请？</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, marginTop: 8 }}>
                    {pendingBatchAction.resourceIds.map((id) => { const r = resources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
                  </div>
                  <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f', marginTop: 12 }}>提交后将进入审批流程，审批通过后资源正式上架。</div>
                </div>
                <div className="resource-management__dialog-footer">
                  <Button onClick={() => setPendingBatchAction(null)}>取消</Button>
                  <Button variant="primary" onClick={() => {
                    pendingBatchAction.resourceIds.forEach((id) => {
                      const r = resources.find((res) => res.id === id);
                      if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                        updateResource(id, { status: 'reviewing', updated: today() });
                        addLog({ action: '批量提交上架', resource: r.name, result: '待审核', detail: '状态：待维护 → 上架审批中' });
                      }
                    });
                    setPendingBatchAction(null);
                    setSelectedIds(new Set());
                  }}>确认提交</Button>
                </div>
              </div>
            </div>
          ) : pendingBatchAction.type === 'batchNoList' ? (
            <div className="resource-management__dialog-overlay" onClick={() => setPendingBatchAction(null)}>
              <div className="resource-management__dialog" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className="resource-management__dialog-header"><strong>批量不上架</strong><button type="button" onClick={() => setPendingBatchAction(null)}>×</button></div>
                <div className="resource-management__dialog-body">
                  <p className="resource-management__confirm-message">确定将以下 <strong>{pendingBatchAction.resourceIds.length}</strong> 条资源标记为不上架？</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, marginTop: 8 }}>
                    {pendingBatchAction.resourceIds.map((id) => { const r = resources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd', marginTop: 12 }}>标记后资源不会出现在资产目录中，可随时转为待维护后重新上架。</div>
                </div>
                <div className="resource-management__dialog-footer">
                  <Button onClick={() => setPendingBatchAction(null)}>取消</Button>
                  <Button variant="primary" onClick={() => {
                    pendingBatchAction.resourceIds.forEach((id) => {
                      const r = resources.find((res) => res.id === id);
                      if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                        updateResource(id, { status: 'no-list', updated: today() });
                        addLog({ action: '批量标记不上架', resource: r.name, result: '保留资源态', detail: '状态：待维护 → 不上架' });
                      }
                    });
                    setPendingBatchAction(null);
                    setSelectedIds(new Set());
                  }}>确认</Button>
                </div>
              </div>
            </div>
          ) : pendingBatchAction.type === 'batchUnlist' ? (
            <div className="resource-management__dialog-overlay" onClick={() => setPendingBatchAction(null)}>
              <div className="resource-management__dialog" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className="resource-management__dialog-header"><strong>批量申请下架</strong><button type="button" onClick={() => setPendingBatchAction(null)}>×</button></div>
                <div className="resource-management__dialog-body">
                  <p className="resource-management__confirm-message">确定将以下 <strong>{pendingBatchAction.resourceIds.length}</strong> 条已上架资源申请下架？</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, marginTop: 8 }}>
                    {pendingBatchAction.resourceIds.map((id) => { const r = resources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
                  </div>
                  <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f', marginTop: 12 }}>提交后将进入审批流程，审批通过后资源将下架回到待维护状态。</div>
                </div>
                <div className="resource-management__dialog-footer">
                  <Button onClick={() => setPendingBatchAction(null)}>取消</Button>
                  <Button variant="primary" onClick={() => {
                    pendingBatchAction.resourceIds.forEach((id) => {
                      const r = resources.find((res) => res.id === id);
                      if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                        updateResource(id, { status: 'unlisting', updated: today() });
                        addLog({ action: '批量申请下架', resource: r.name, result: '待审核', detail: '状态：已上架 → 下架审批中' });
                      }
                    });
                    setPendingBatchAction(null);
                    setSelectedIds(new Set());
                  }}>确认提交</Button>
                </div>
              </div>
            </div>
          ) : pendingBatchAction.type === 'batchMaintain' ? (
            <div className="resource-management__dialog-overlay" onClick={() => setPendingBatchAction(null)}>
              <div className="resource-management__dialog" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
                <div className="resource-management__dialog-header"><strong>批量转待维护</strong><button type="button" onClick={() => setPendingBatchAction(null)}>×</button></div>
                <div className="resource-management__dialog-body">
                  <p className="resource-management__confirm-message">确定将以下 <strong>{pendingBatchAction.resourceIds.length}</strong> 条资源转回待维护状态？</p>
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, marginTop: 8 }}>
                    {pendingBatchAction.resourceIds.map((id) => { const r = resources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
                  </div>
                </div>
                <div className="resource-management__dialog-footer">
                  <Button onClick={() => setPendingBatchAction(null)}>取消</Button>
                  <Button variant="primary" onClick={() => {
                    pendingBatchAction.resourceIds.forEach((id) => {
                      const r = resources.find((res) => res.id === id);
                      if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                        updateResource(id, { status: 'maintain', updated: today() });
                        addLog({ action: '批量转待维护', resource: r.name, result: '已恢复为待维护', detail: '状态：不上架 → 待维护' });
                      }
                    });
                    setPendingBatchAction(null);
                    setSelectedIds(new Set());
                  }}>确认</Button>
                </div>
              </div>
            </div>
          ) : pendingBatchAction.type === 'batchCatalog' ? (
            <CatalogSelectDialog
              resource={{ id: '', name: '', type: 'table', platform: '', source: '', sourceType: '', sourceSystem: '', status: 'maintain', techOwner: '', summary: '', tags: [], updated: '' }}
              catalogTree={catalogTree}
              onConfirm={(catalogId, catalogPath) => {
                pendingBatchAction.resourceIds.forEach((id) => {
                  const r = resources.find((res) => res.id === id);
                  if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                    updateResource(id, { pendingCatalog: catalogPath, status: 'catalog_reviewing', updated: today() });
                    addLog({ action: '批量修改目录', resource: r.name, result: '待审批', detail: `申请迁移至「${catalogPath}」` });
                  }
                });
                setPendingBatchAction(null);
                setSelectedIds(new Set());
              }}
              onClose={() => setPendingBatchAction(null)}
            />
          ) : pendingBatchAction.type === 'batchHandover' ? (
            <TransferOwnerDialog
              resource={{ id: '', name: '', type: 'table', platform: '', source: '', sourceType: '', sourceSystem: '', status: 'maintain', techOwner: resources.find((r) => r.id === pendingBatchAction.resourceIds[0])?.techOwner ?? '', summary: '', tags: [], updated: '' }}
              onConfirm={(newTech, newBiz) => {
                pendingBatchAction.resourceIds.forEach((id) => {
                  const r = resources.find((res) => res.id === id);
                  if (r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status)) {
                    const needsApproval = ['published', 'maintain', 'no-list'].includes(r.status);
                    if (needsApproval) {
                      updateResource(id, { pendingHandover: { techOwner: newTech, bizOwner: newBiz || undefined }, status: 'handover_reviewing', updated: today() });
                      addLog({ action: '批量交接负责人', resource: r.name, result: '待审批', detail: `申请交接至 ${newTech}` });
                    } else {
                      updateResource(id, { techOwner: newTech, bizOwner: newBiz || undefined, updated: today() });
                      addLog({ action: '批量交接负责人', resource: r.name, result: '已交接', detail: `技术负责人：${r.techOwner}→${newTech}` });
                    }
                  }
                });
                setPendingBatchAction(null);
                setSelectedIds(new Set());
              }}
              onClose={() => setPendingBatchAction(null)}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function CatalogTreeItems({ nodes, depth, selectedId, onSelect, allResources, expandedIds, onToggle, onAction, dragState, approvalCatalogIds }: {
  nodes: CatalogNode[]; depth: number; selectedId: string | null;
  onSelect: (id: string) => void; allResources: ManagedResource[];
  expandedIds: Set<string>; onToggle: (id: string) => void;
  onAction: (action: string, nodeId: string) => void;
  dragState: { dragId: string | null; targetId: string | null; position: DropPosition | null };
  approvalCatalogIds: Set<string>;
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const path = getCatalogPath(INITIAL_CATALOG_TREE, node.id)?.join(' / ') ?? node.name;
        const count = getCatalogResourceCount(node.id, allResources);
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const isDragging = dragState.dragId === node.id;
        const isDropTarget = dragState.targetId === node.id;
        const dropCls = isDropTarget
          ? dragState.position === 'before' ? ' drop-before' : dragState.position === 'after' ? ' drop-after' : ' drop-in'
          : '';
        const isDndDisabled = !!dragState.dragId && dragState.dragId !== node.id
          && getCatalogDropInvalidReason(dragState.dragId, node.id, 'in', INITIAL_CATALOG_TREE) !== null
          && getCatalogDropInvalidReason(dragState.dragId, node.id, 'before', INITIAL_CATALOG_TREE) !== null
          && getCatalogDropInvalidReason(dragState.dragId, node.id, 'after', INITIAL_CATALOG_TREE) !== null;
        return (
          <div key={node.id}>
            <button
              type="button"
              role="treeitem"
              aria-label={path}
              className={`resource-management__catalog-node ${selectedId === node.id ? 'active' : ''}${isDragging ? ' dragging' : ''}${isDndDisabled ? ' dnd-disabled' : ''}${dropCls}`}
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() => onSelect(node.id)}
              data-node-id={node.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', node.id); onAction('dragStart', node.id); }}
              onDragOver={(e) => { e.preventDefault(); onAction('dragOver', node.id); }}
              onDragLeave={() => onAction('dragLeave', node.id)}
              onDrop={(e) => { e.preventDefault(); onAction('drop', node.id); }}
              onDragEnd={() => onAction('dragEnd', '')}
            >
              <span className={`ct-arrow${isExpanded ? ' expanded' : ''}`} onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}>{hasChildren ? '▶' : ''}</span>
              <span className="ct-icon">{hasChildren ? '📂' : '📄'}</span>
              <span className="ct-label">{node.name}</span>
              {approvalCatalogIds.has(node.id) ? <span className="ct-approval-badge">审批中</span> : null}
              {count > 0 ? <span className="ct-count">{count}</span> : null}
              <span className="ct-sort-btns" onClick={(e) => e.stopPropagation()}>
                <span className={index === 0 ? 'disabled' : ''} onClick={() => { if (index > 0) onAction('moveUp', node.id); }}>↑</span>
                <span className={index === nodes.length - 1 ? 'disabled' : ''} onClick={() => { if (index < nodes.length - 1) onAction('moveDown', node.id); }}>↓</span>
              </span>
              <span className="ct-actions" onClick={(e) => e.stopPropagation()}>
                {depth < 4 ? <span title="新增子目录" onClick={() => onAction('addChild', node.id)}>+</span> : null}
                <span title="编辑" onClick={() => onAction('edit', node.id)}>✎</span>
                <span className="danger" title="删除" onClick={() => onAction('delete', node.id)}>×</span>
              </span>
            </button>
            {hasChildren && isExpanded ? <CatalogTreeItems nodes={node.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} allResources={allResources} expandedIds={expandedIds} onToggle={onToggle} onAction={onAction} dragState={dragState} approvalCatalogIds={approvalCatalogIds} /> : null}
          </div>
        );
      })}
    </>
  );
}

function CatalogManagementPanel({ allResources, catalogTree: catalogTreeProp, setCatalogTree, updateResource, addLog }: {
  allResources: ManagedResource[]; catalogTree: CatalogNode[];
  setCatalogTree: React.Dispatch<React.SetStateAction<CatalogNode[]>>;
  updateResource: (id: string, patch: Partial<ManagedResource>) => void;
  addLog: (entry: { action: string; resource: string; result: string; detail: string }) => void;
}) {
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [catalogSearch, setCatalogSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => { const ids: string[] = []; function walk(nodes: CatalogNode[]) { for (const n of nodes) { if (n.children.length > 0) { ids.push(n.id); walk(n.children); } } } walk(catalogTreeProp); return new Set(ids); });
  const [catalogModal, setCatalogModal] = useState<CatalogModalState>({ type: 'none' });
  const [modalName, setModalName] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [migrateTargetId, setMigrateTargetId] = useState<string | null>(null);
  const [mountSelected, setMountSelected] = useState<Set<string>>(new Set());
  const [detailScope, setDetailScope] = useState<'direct' | 'all'>('all');
  const [dragState, setDragState] = useState<{ dragId: string | null; targetId: string | null; position: DropPosition | null }>({ dragId: null, targetId: null, position: null });
  const [pendingDrag, setPendingDrag] = useState<{ dragId: string; targetId: string; position: DropPosition; dragName: string; targetName: string } | null>(null);
  const [pendingMigrate, setPendingMigrate] = useState<{ targetId: string; targetPath: string; targetIds: string[] } | null>(null);
  const [pendingCatalogOp, setPendingCatalogOp] = useState<PendingCatalogOp | null>(null);
  const [pendingMount, setPendingMount] = useState<{ catalogId: string; catalogPath: string; resourceIds: string[] } | null>(null);
  const [catalogApprovalNotice, setCatalogApprovalNotice] = useState<CatalogApprovalNotice | null>(null);

  const selectedNode = selectedCatalog ? findCatalogNode(catalogTreeProp, selectedCatalog) : undefined;
  const path = selectedCatalog ? getCatalogPath(catalogTreeProp, selectedCatalog) : undefined;
  const pathText = path?.join('/');

  const directResources = pathText ? allResources.filter((r) => r.catalog === pathText) : [];
  const descendantResources = pathText ? allResources.filter((r) => r.catalog?.startsWith(pathText)) : [];
  const hasChildren = selectedNode ? selectedNode.children.length > 0 : false;
  const catalogResources = (detailScope === 'direct' || !hasChildren) ? directResources : descendantResources;
  const approvalCatalogIds = new Set(catalogApprovalNotice?.catalogIds ?? []);
  const selectedCatalogApprovalNotice = catalogApprovalNotice && selectedCatalog && approvalCatalogIds.has(selectedCatalog)
    ? catalogApprovalNotice
    : null;

  const toggleResource = (id: string) => {
    setSelectedResourceIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleSelectCatalog = (id: string) => {
    setSelectedCatalog(id);
    setSelectedResourceIds(new Set());
    const node = findCatalogNode(catalogTreeProp, id);
    setDetailScope(node && node.children.length > 0 ? 'all' : 'direct');
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filterTree = (nodes: CatalogNode[], keyword: string): CatalogNode[] => {
    if (!keyword.trim()) return nodes;
    return nodes.reduce<CatalogNode[]>((acc, node) => {
      const childMatch = filterTree(node.children, keyword);
      if (node.name.toLowerCase().includes(keyword.toLowerCase()) || childMatch.length > 0) {
        acc.push({ ...node, children: childMatch });
      }
      return acc;
    }, []);
  };
  const filteredTree = filterTree(catalogTreeProp, catalogSearch);

  const handleCatalogAction = (action: string, nodeId: string) => {
    if (action === 'moveUp') {
      const node = findCatalogNode(catalogTreeProp, nodeId);
      const nodeName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? node?.name ?? nodeId;
      setPendingCatalogOp({ type: 'reorder', nodeId, direction: 'up', nodeName });
    }
    else if (action === 'moveDown') {
      const node = findCatalogNode(catalogTreeProp, nodeId);
      const nodeName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? node?.name ?? nodeId;
      setPendingCatalogOp({ type: 'reorder', nodeId, direction: 'down', nodeName });
    }
    else if (action === 'addChild') {
      setCatalogModal({ type: 'add', parentId: nodeId });
      const parent = findCatalogNode(catalogTreeProp, nodeId);
      const parentName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? parent?.name ?? nodeId;
      setPendingCatalogOp({ type: 'add', parentId: nodeId, nodeName: parentName });
    }
    else if (action === 'edit') {
      const node = findCatalogNode(catalogTreeProp, nodeId);
      if (node) { setModalName(node.name); setModalDesc(node.desc ?? ''); }
      setCatalogModal({ type: 'edit', nodeId });
      const nodeName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? node?.name ?? nodeId;
      setPendingCatalogOp({ type: 'edit', nodeId, nodeName });
    }
    else if (action === 'delete') {
      const node = findCatalogNode(catalogTreeProp, nodeId);
      const nodeName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? node?.name ?? nodeId;
      setPendingCatalogOp({ type: 'delete', nodeId, nodeName });
      setCatalogModal({ type: 'delete', nodeId });
    }
    else if (action === 'dragStart') {
      setDragState({ dragId: nodeId, targetId: null, position: null });
      setExpandedIds((prev) => { const next = new Set(prev); next.add(nodeId); return next; });
    }
    else if (action === 'dragOver') {
      if (!dragState.dragId || dragState.dragId === nodeId) return;
      const reasonIn = getCatalogDropInvalidReason(dragState.dragId, nodeId, 'in', catalogTreeProp);
      const reasonBefore = getCatalogDropInvalidReason(dragState.dragId, nodeId, 'before', catalogTreeProp);
      const reasonAfter = getCatalogDropInvalidReason(dragState.dragId, nodeId, 'after', catalogTreeProp);
      let pos: DropPosition = 'in';
      if (!reasonIn) pos = 'in';
      else if (!reasonBefore) pos = 'before';
      else if (!reasonAfter) pos = 'after';
      else { setDragState((prev) => ({ ...prev, targetId: null, position: null })); return; }
      setDragState((prev) => ({ ...prev, targetId: nodeId, position: pos }));
    }
    else if (action === 'dragLeave') {
      setDragState((prev) => prev.targetId === nodeId ? { ...prev, targetId: null, position: null } : prev);
    }
    else if (action === 'drop') {
      const targetId = dragState.targetId ?? nodeId;
      const pos = dragState.position ?? 'in';
      if (dragState.dragId && targetId && !getCatalogDropInvalidReason(dragState.dragId, targetId, pos, catalogTreeProp)) {
        const dragNode = findCatalogNode(catalogTreeProp, dragState.dragId!);
        const targetNode = findCatalogNode(catalogTreeProp, targetId);
        if (dragNode && targetNode) {
          const dragName = getCatalogPath(catalogTreeProp, dragState.dragId!)?.join('/') ?? dragNode.name;
          const targetName = getCatalogPath(catalogTreeProp, targetId)?.join('/') ?? targetNode.name;
          const posLabel = pos === 'in' ? `子目录` : pos === 'before' ? `之前` : `之后`;
          setPendingDrag({ dragId: dragState.dragId!, targetId, position: pos, dragName, targetName: `${targetName}（${posLabel}）` });
        }
      }
      setDragState({ dragId: null, targetId: null, position: null });
    }
    else if (action === 'dragEnd') {
      setDragState({ dragId: null, targetId: null, position: null });
    }
  };

  const submitCatalogNode = () => {
    const name = modalName.trim();
    if (!name) return;
    if (catalogModal.type === 'add') {
      const parentId = catalogModal.parentId;
      const parentNode = parentId ? findCatalogNode(catalogTreeProp, parentId) : null;
      const isLeaf = parentNode && parentNode.children.length === 0;
      const directCount = parentId ? getDirectResourceCount(parentId, allResources) : 0;
      const autoMigration = isLeaf && directCount > 0 ? {
        oldPath: pathText ?? '',
        newPath: [...(getCatalogPath(catalogTreeProp, parentId!) ?? []), name].join('/'),
        count: directCount,
      } : null;
      setPendingCatalogOp({
        type: 'add',
        parentId,
        nodeName: name,
        name,
        desc: modalDesc || undefined,
        pendingDrag: autoMigration ? { dragId: '', targetId: '', position: 'in' as DropPosition, dragName: `${directCount}条资源`, targetName: autoMigration.newPath } : undefined,
      });
      setCatalogModal({ type: 'none' }); setModalName(''); setModalDesc('');
    } else if (catalogModal.type === 'edit' && catalogModal.nodeId) {
      setPendingCatalogOp({
        type: 'edit',
        nodeId: catalogModal.nodeId,
        nodeName: findCatalogNode(catalogTreeProp, catalogModal.nodeId)?.name ?? '',
        name,
        desc: modalDesc || undefined,
      });
      setCatalogModal({ type: 'none' }); setModalName(''); setModalDesc('');
    }
  };

  const confirmDelete = () => {
    if (catalogModal.type !== 'delete') return;
    const nodeId = catalogModal.nodeId;
    const node = findCatalogNode(catalogTreeProp, nodeId);
    if (!node) return;
    const count = getCatalogResourceCount(nodeId, allResources);
    if (count > 0) return;
    const nodeName = getCatalogPath(catalogTreeProp, nodeId)?.join('/') ?? node.name;
    const delPath = getCatalogPath(catalogTreeProp, nodeId)?.join('/');
    setPendingCatalogOp({
      type: 'delete',
      nodeId,
      nodeName,
      pendingDrag: delPath ? { dragId: nodeId, targetId: '', position: 'in', dragName: node.name, targetName: '' } : undefined,
    });
    setCatalogModal({ type: 'none' });
  };

  const confirmDragDrop = () => {
    if (!pendingDrag) return;
    setPendingCatalogOp({
      type: 'reorder',
      nodeId: pendingDrag.dragId,
      direction: undefined,
      nodeName: pendingDrag.dragName,
      targetName: pendingDrag.targetName,
      pendingDrag: { ...pendingDrag },
    });
    setPendingDrag(null);
  };

  const confirmCatalogOp = () => {
    if (!pendingCatalogOp) return;
    const op = pendingCatalogOp;
    const action = '目录修改';
    const resource = catalogOpSummary(op);
    addLog({ action, resource, result: '待审批', detail: catalogOpActionLabel(op) });
    setCatalogApprovalNotice({ action, resource, result: '待审批', catalogIds: catalogOpApprovalCatalogIds(op) });
    setPendingCatalogOp(null);
  };

  const submitMigrate = () => {
    if (!migrateTargetId) return;
    const targetPath = getCatalogPath(catalogTreeProp, migrateTargetId)?.join('/');
    if (!targetPath) return;
    const targetIds = [...selectedResourceIds].filter((id) => {
      const r = allResources.find((res) => res.id === id);
      return r && !['reviewing', 'unlisting', 'catalog_reviewing', 'handover_reviewing'].includes(r.status);
    });
    setPendingMigrate({ targetId: migrateTargetId, targetPath, targetIds });
    setCatalogModal({ type: 'none' });
  };

  const confirmMigrate = () => {
    if (!pendingMigrate) return;
    const { targetId, targetPath, targetIds } = pendingMigrate;
    targetIds.forEach((id) => {
      updateResource(id, { pendingCatalog: targetPath, status: 'catalog_reviewing' });
    });
    addLog({ action: '提交目录迁移审批', resource: `${targetIds.length}条资源`, result: `目标目录「${targetPath}」`, detail: '' });
    setCatalogApprovalNotice({ action: '提交目录迁移审批', resource: `${targetIds.length}条资源`, result: `目标目录「${targetPath}」`, catalogIds: [targetId] });
    setPendingMigrate(null);
    setSelectedResourceIds(new Set());
    setMigrateTargetId(null);
  };

  const submitMount = () => {
    if (catalogModal.type !== 'mount') return;
    const catalogId = catalogModal.catalogId;
    const targetPath = getCatalogPath(catalogTreeProp, catalogId)?.join('/');
    if (!targetPath) return;
    const selected = [...mountSelected];
    if (selected.length === 0) return;
    setPendingMount({ catalogId, catalogPath: targetPath, resourceIds: selected });
    setCatalogModal({ type: 'none' });
    setMountSelected(new Set());
  };

  const confirmMount = () => {
    if (!pendingMount) return;
    const { catalogId, catalogPath, resourceIds } = pendingMount;
    resourceIds.forEach((id) => {
      updateResource(id, { pendingCatalog: catalogPath, status: 'catalog_reviewing' });
    });
    addLog({ action: '提交批量挂载审批', resource: `${resourceIds.length}条资源`, result: `挂载至「${catalogPath}」`, detail: '' });
    setCatalogApprovalNotice({ action: '提交批量挂载审批', resource: `${resourceIds.length}条资源`, result: `挂载至「${catalogPath}」`, catalogIds: [catalogId] });
    setPendingMount(null);
  };

  const deleteNodeResourceCount = catalogModal.type === 'delete' ? getCatalogResourceCount(catalogModal.nodeId, allResources) : 0;
  const canDelete = deleteNodeResourceCount === 0;

  const filterMigrateTree = (nodes: CatalogNode[], excludeId: string): CatalogNode[] => {
    return nodes.filter((n) => n.id !== excludeId).map((n) => ({ ...n, children: filterMigrateTree(n.children, excludeId) }));
  };

  const unassignedResources = allResources.filter((r) => !r.catalog);

  return (
    <section className="resource-management__panel resource-management__panel--full">
      <h1>目录管理</h1>
      <div className="resource-management__catalog-layout">
        <section className="resource-management__catalog-tree">
          <div className="resource-management__catalog-head">
            <span>目录结构</span>
            <Button variant="primary" size="sm" onClick={() => { setModalName(''); setModalDesc(''); setCatalogModal({ type: 'add', parentId: null }); }}>➕ 新增一级</Button>
          </div>
          <div className="resource-management__catalog-search">
            <input value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="搜索目录名称…" />
          </div>
          <div className="resource-management__catalog-tree-body" role="tree" aria-label="目录结构">
            <CatalogTreeItems
              nodes={filteredTree} depth={0} selectedId={selectedCatalog}
              onSelect={handleSelectCatalog} allResources={allResources}
              expandedIds={expandedIds} onToggle={handleToggleExpand}
              onAction={handleCatalogAction} dragState={dragState}
              approvalCatalogIds={approvalCatalogIds}
            />
          </div>
        </section>

        <section className="resource-management__catalog-detail">
          <div className="resource-management__catalog-detail-head">
            <span>{path ? path.join(' / ') : '请在左侧选择目录节点'}</span>
            {selectedNode ? (
              <div>
                <Button variant="primary" size="sm" onClick={() => { setMountSelected(new Set()); setCatalogModal({ type: 'mount', catalogId: selectedCatalog! }); }}>📥 批量挂载</Button>
                <Button size="sm" disabled={selectedResourceIds.size === 0} onClick={() => { setMigrateTargetId(null); setCatalogModal({ type: 'migrate', resourceIds: [...selectedResourceIds] }); }}>📦 批量迁移</Button>
              </div>
            ) : null}
          </div>
          <div className="resource-management__catalog-detail-body">
            {selectedNode && path ? (
              <>
                {selectedCatalogApprovalNotice ? (
                  <div className="resource-management__catalog-migrate-hint info" data-testid="catalog-detail-approval-notice" role="status">
                    <strong>{selectedCatalogApprovalNotice.action}</strong>
                    <span style={{ marginLeft: 8 }}>{selectedCatalogApprovalNotice.resource}</span>
                    <span style={{ marginLeft: 8, color: '#d97706' }}>{selectedCatalogApprovalNotice.result}</span>
                  </div>
                ) : null}
                <div className="resource-management__catalog-stats" style={{ gridTemplateColumns: descendantResources.length !== directResources.length ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                  <div>
                    <span>目录层级</span>
                    <strong>{path.length} 级</strong>
                  </div>
                  <div>
                    <span>直接挂载</span>
                    <strong style={{ color: directResources.length > 0 ? 'var(--primary, #1677ff)' : '#9aa3b2' }}>{directResources.length}</strong>
                    <small style={{ display: 'block', fontSize: 11, color: '#9aa3b2', marginTop: 2 }}>仅当前节点</small>
                  </div>
                  {descendantResources.length !== directResources.length ? (
                    <div>
                      <span>含子目录</span>
                      <strong style={{ color: '#6b7280' }}>{descendantResources.length}</strong>
                      <small style={{ display: 'block', fontSize: 11, color: '#9aa3b2', marginTop: 2 }}>含所有子目录</small>
                    </div>
                  ) : null}
                </div>
                {selectedNode.desc ? <p className="resource-management__catalog-desc">{selectedNode.desc}</p> : null}
                {hasChildren ? (
                  <div className="resource-management__catalog-children">
                    <strong>子目录（{selectedNode.children.length}）<small style={{ fontWeight: 400, color: '#9aa3b2', marginLeft: 4 }}>点击可跳转</small></strong>
                    <div>
                      {selectedNode.children.map((child) => (
                        <button key={child.id} type="button" onClick={() => handleSelectCatalog(child.id)}>{child.name} <small>›</small></button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="resource-management__catalog-resource-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong>挂载资源</strong>
                    {hasChildren ? (
                      <div className="resource-management__scope-toggle">
                        <span className={detailScope === 'direct' ? 'active' : ''} onClick={() => setDetailScope('direct')}>仅当前目录</span>
                        <span className={detailScope === 'all' ? 'active' : ''} onClick={() => setDetailScope('all')}>含子目录</span>
                      </div>
                    ) : null}
                  </div>
                  {selectedResourceIds.size ? <span>已选 {selectedResourceIds.size} 条</span> : null}
                </div>
                {catalogResources.length ? (
                  <div className="resource-management__catalog-resource-table">
                    <table>
                      <thead>
                        <tr>
                          <th aria-label="选择"><input type="checkbox" onChange={(e) => { const checked = e.target.checked; const selectable = catalogResources.filter((r) => !['reviewing', 'unlisting', 'catalog_reviewing'].includes(r.status)); setSelectedResourceIds(checked ? new Set(selectable.map((r) => r.id)) : new Set()); }} /></th>
                          <th>资源名称</th>
                          {detailScope === 'all' && hasChildren ? <th>所属目录</th> : null}
                          <th>类型</th>
                          <th>状态</th>
                          <th>技术负责人</th>
                          <th style={{ width: 80 }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogResources.map((resource) => {
                          const pending = ['reviewing', 'unlisting', 'catalog_reviewing'].includes(resource.status);
                          return (
                            <tr key={resource.id} className={pending ? 'muted' : ''}>
                              <td>
                                <input type="checkbox" aria-label={`选择 ${resource.name}`} disabled={pending} checked={selectedResourceIds.has(resource.id)} onChange={() => toggleResource(resource.id)} />
                              </td>
                              <td style={{ fontSize: 12 }}>
                                <span style={{ color: 'var(--primary, #1677ff)', cursor: 'pointer' }}>{resource.name}</span>
                                {pending ? <span className="resource-management__catalog-no-perm">（审批中，不可迁移）</span> : null}
                              </td>
                              {detailScope === 'all' && hasChildren ? <td style={{ fontSize: 12, color: '#9aa3b2' }}>{resource.catalog === pathText ? '当前目录' : resource.catalog?.replace(pathText! + '/', '')}</td> : null}
                              <td><Tag>{typeLabel(resource.type)}</Tag></td>
                              <td><Tag tone={statusTone(resource.status)}>{statusLabel(resource.status)}</Tag></td>
                              <td>
                                <span style={{ fontSize: 12 }}>{resource.techOwner}</span>
                                {resource.pendingCatalog ? <small>目标目录：{resource.pendingCatalog}</small> : null}
                              </td>
                              <td>{pending ? <Button size="sm" disabled>审批中</Button> : <button type="button" className="resource-management__link-btn" onClick={() => { setSelectedResourceIds(new Set([resource.id])); setMigrateTargetId(null); setCatalogModal({ type: 'migrate', resourceIds: [resource.id] }); }}>迁移</button>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="resource-management__empty-row">{detailScope === 'direct' ? '当前目录暂无直接挂载的资源' : '当前目录及子目录下暂无挂载资源'}</div>
                )}
              </>
            ) : (
              <div className="resource-management__empty-catalog">
                <div>📁</div>
                <span>点击左侧目录节点查看详情</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {catalogModal.type === 'add' || catalogModal.type === 'edit' ? (
        <div className="resource-management__dialog-overlay" onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label={catalogModal.type === 'add' ? (catalogModal.parentId ? '新增子目录' : '新增一级目录') : '编辑目录'} style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>{catalogModal.type === 'add' ? (catalogModal.parentId ? '新增子目录' : '新增一级目录') : '编辑目录'}</strong>
              <button type="button" onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              {pendingCatalogOp ? (
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f', marginBottom: 12 }}>
                  目录{pendingCatalogOp.type === 'add' ? '新增' : '编辑'}将提交审批，审批通过后生效。
                </div>
              ) : null}
              {catalogModal.type === 'add' && catalogModal.parentId ? (
                <div className="resource-management__form-item">
                  <label className="resource-management__form-label">父节点</label>
                  <div style={{ fontSize: 13, color: '#6b7280', padding: '6px 0' }}>{getCatalogPath(catalogTreeProp, catalogModal.parentId)?.join(' / ')}</div>
                </div>
              ) : null}
              {catalogModal.type === 'add' && catalogModal.parentId ? (() => {
                const parentNode = findCatalogNode(catalogTreeProp, catalogModal.parentId!);
                const isLeaf = parentNode && parentNode.children.length === 0;
                const directCount = getDirectResourceCount(catalogModal.parentId!, allResources);
                if (isLeaf && directCount > 0) {
                  return <div className="resource-management__catalog-migrate-hint">该目录直接挂载了 <strong>{directCount}</strong> 条资源，目录新增成功后，系统会自动将这些资源迁移到新子目录中。</div>;
                } else if (!isLeaf && directCount > 0) {
                  return <div className="resource-management__catalog-migrate-hint info">该目录有子目录，且直接挂载了 <strong>{directCount}</strong> 条资源。新增子目录后，请通过「批量迁移」手动将这些资源迁移到对应子目录。</div>;
                }
                return null;
              })() : null}
              <div className="resource-management__form-item">
                <label className="resource-management__form-label required">目录名称</label>
                <input className="resource-management__form-input" value={modalName} onChange={(e) => setModalName(e.target.value)} placeholder="请输入目录名称" />
              </div>
              <div className="resource-management__form-item">
                <label className="resource-management__form-label">目录描述</label>
                <textarea className="resource-management__form-textarea" value={modalDesc} onChange={(e) => setModalDesc(e.target.value)} placeholder="可选，请输入目录用途描述…" style={{ minHeight: 70 }} />
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>取消</Button>
              <Button variant="primary" onClick={submitCatalogNode} disabled={!modalName.trim()}>确认</Button>
            </div>
          </div>
        </div>
      ) : null}

      {catalogModal.type === 'delete' ? (
        <div className="resource-management__dialog-overlay" onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="删除目录" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>删除目录</strong>
              <button type="button" onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              {pendingCatalogOp ? (
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f', marginBottom: 12 }}>
                  目录删除将提交审批，审批通过后生效。
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>确认删除目录「{findCatalogNode(catalogTreeProp, catalogModal.nodeId)?.name}」？</div>
                  {deleteNodeResourceCount > 0 ? (
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
                      该目录下共有 <strong>{deleteNodeResourceCount}</strong> 条资源，<span style={{ color: '#ff4d4f', fontWeight: 600 }}>请先将资源迁移至其他目录后再删除</span>。<br />
                      <small style={{ color: '#9aa3b2' }}>提示：可在目录详情中使用「批量迁移」功能快速转移资源。</small>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>删除后无法恢复。</div>
                  )}
                </div>
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => { setCatalogModal({ type: 'none' }); setPendingCatalogOp(null); }}>取消</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={!canDelete} style={!canDelete ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>确认删除</Button>
            </div>
          </div>
        </div>
      ) : null}

      {catalogModal.type === 'migrate' ? (
        <div className="resource-management__dialog-overlay" onClick={() => setCatalogModal({ type: 'none' })}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="批量迁移资源（提交审批）" style={{ width: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>批量迁移资源（提交审批）</strong>
              <button type="button" onClick={() => setCatalogModal({ type: 'none' })}>×</button>
            </div>
            <div className="resource-management__dialog-body" style={{ overflowY: 'auto', flex: 1 }}>
              <div className="resource-management__form-item">
                <label className="resource-management__form-label">已选资源</label>
                <div style={{ fontSize: 13, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, maxHeight: 72, overflowY: 'auto' }}>
                  {catalogModal.resourceIds.map((id) => { const r = allResources.find((res) => res.id === id); return r ? <div key={id} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div> : null; })}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#d97706', marginBottom: 16, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>批量迁移将提交审批，审批通过后统一生效；审批中的资源不可重复选择。</div>
              <div className="resource-management__form-item">
                <label className="resource-management__form-label required">目标目录 <small style={{ fontWeight: 400, color: '#9aa3b2' }}>（选择要迁移到的目录）</small></label>
                <div className="resource-management__catalog-dialog-tree">
                  <MigrateTreeItems nodes={filterMigrateTree(catalogTreeProp, selectedCatalog ?? '')} depth={0} selectedId={migrateTargetId} onSelect={setMigrateTargetId} />
                </div>
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => setCatalogModal({ type: 'none' })}>取消</Button>
              <Button variant="primary" onClick={submitMigrate} disabled={!migrateTargetId}>提交审批</Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingCatalogOp && catalogModal.type === 'none' ? (
        <div className="resource-management__dialog-overlay" onClick={() => setPendingCatalogOp(null)}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="确认目录修改审批" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>确认目录修改审批</strong>
              <button type="button" onClick={() => setPendingCatalogOp(null)}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <dl className="resource-management__approval-status-list" style={{ marginTop: 0 }}>
                  <dt>审批类型</dt><dd>目录修改</dd>
                  <dt>操作类型</dt><dd>{catalogOpActionLabel(pendingCatalogOp)}</dd>
                  <dt>变更摘要</dt><dd>{catalogOpSummary(pendingCatalogOp)}</dd>
                  <dt>提交结果</dt><dd style={{ color: '#d97706' }}>待审批</dd>
                </dl>
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
                  将发起目录修改审批，审批通过后生效。
                </div>
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => setPendingCatalogOp(null)}>取消</Button>
              <Button variant="primary" onClick={confirmCatalogOp}>确认提交</Button>
            </div>
          </div>
        </div>
      ) : null}

      {catalogModal.type === 'mount' ? (
        <div className="resource-management__dialog-overlay" onClick={() => setCatalogModal({ type: 'none' })}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="批量挂载未归属资源" style={{ width: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>批量挂载未归属资源</strong>
              <button type="button" onClick={() => setCatalogModal({ type: 'none' })}>×</button>
            </div>
            <div className="resource-management__dialog-body" style={{ overflowY: 'auto', flex: 1 }}>
              {unassignedResources.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#9aa3b2' }}>暂无未归属资源可挂载</div>
              ) : (
                <>
                  <div style={{ marginBottom: 8, fontSize: 12, color: '#9aa3b2' }}>共 {unassignedResources.length} 条未归属资源</div>
                  <div className="resource-management__catalog-resource-table" style={{ border: '1px solid #eef0f5', borderRadius: 6, maxHeight: 300, overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th style={{ width: 36 }}><input type="checkbox" aria-label="选择全部未归属资源" onChange={(e) => setMountSelected(e.target.checked ? new Set(unassignedResources.map((r) => r.id)) : new Set())} /></th><th>资源名称</th><th>类型</th><th>技术负责人</th></tr></thead>
                      <tbody>
                        {unassignedResources.map((r) => (
                          <tr key={r.id}>
                            <td><input type="checkbox" aria-label={`选择 ${r.name}`} checked={mountSelected.has(r.id)} onChange={() => { setMountSelected((prev) => { const next = new Set(prev); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); return next; }); }} /></td>
                            <td style={{ fontSize: 12 }}>{r.name}</td>
                            <td><Tag>{typeLabel(r.type)}</Tag></td>
                            <td style={{ fontSize: 12 }}>{r.techOwner}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => setCatalogModal({ type: 'none' })}>取消</Button>
              <Button variant="primary" onClick={submitMount} disabled={mountSelected.size === 0}>提交审批</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Drag-drop directory confirmation */}
      {pendingDrag ? (
        <div className="resource-management__dialog-overlay" onClick={() => setPendingDrag(null)}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="确认拖拽目录" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>确认拖拽目录</strong>
              <button type="button" onClick={() => setPendingDrag(null)}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 12 }}>
                  确定将目录 <strong style={{ color: '#1d4ed8' }}>{pendingDrag.dragName}</strong> 移动到 <strong style={{ color: '#1d4ed8' }}>{pendingDrag.targetName}</strong> 吗？
                </p>
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
                  目录排序调整将提交审批，审批通过后生效。
                </div>
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => setPendingDrag(null)}>取消</Button>
              <Button variant="primary" onClick={confirmDragDrop}>确认移动</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Batch mount confirmation */}
      {pendingMount ? (
        <div className="resource-management__dialog-overlay" onClick={() => setPendingMount(null)}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="确认提交批量挂载审批" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>确认提交批量挂载审批</strong>
              <button type="button" onClick={() => setPendingMount(null)}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              <p className="resource-management__confirm-message">确定将以下 <strong>{pendingMount.resourceIds.length}</strong> 条资源挂载至目录 <strong style={{ color: '#1d4ed8' }}>{pendingMount.catalogPath}</strong>？</p>
              <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 12, color: '#6b7280', padding: 8, background: '#f8fafc', borderRadius: 6, marginTop: 8 }}>
                {pendingMount.resourceIds.map((id) => { const r = allResources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
              </div>
              <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f', marginTop: 12 }}>
                挂载操作将提交审批，审批通过后资源将归属该目录。
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => setPendingMount(null)}>取消</Button>
              <Button variant="primary" onClick={confirmMount}>确认提交</Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Batch migrate confirmation */}
      {pendingMigrate ? (
        <div className="resource-management__dialog-overlay" onClick={() => { setPendingMigrate(null); }}>
          <div className="resource-management__dialog" role="dialog" aria-modal="true" aria-label="确认提交目录迁移审批" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="resource-management__dialog-header">
              <strong>确认提交目录迁移审批</strong>
              <button type="button" onClick={() => { setPendingMigrate(null); }}>×</button>
            </div>
            <div className="resource-management__dialog-body">
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 8 }}>确定将以下 <strong>{pendingMigrate.targetIds.length}</strong> 条资源迁移至 <strong style={{ color: '#1d4ed8' }}>{pendingMigrate.targetPath}</strong> 吗？</p>
                <div style={{ maxHeight: 120, overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                  {pendingMigrate.targetIds.map((id) => { const r = allResources.find((res) => res.id === id); return r ? <div key={id} style={{ padding: '2px 0' }}>{r.name}</div> : null; })}
                </div>
                <div style={{ fontSize: 12, color: '#d97706', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
                  迁移将提交审批，审批通过后统一生效；审批中的资源不可重复选择。
                </div>
              </div>
            </div>
            <div className="resource-management__dialog-footer">
              <Button onClick={() => { setPendingMigrate(null); }}>取消</Button>
              <Button variant="primary" onClick={confirmMigrate}>提交审批</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MigrateTreeItems({ nodes, depth, selectedId, onSelect }: { nodes: CatalogNode[]; depth: number; selectedId: string | null; onSelect: (id: string | null) => void }) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isSelected = selectedId === node.id;
        return (
          <div key={node.id}>
            <div
              className={`resource-management__catalog-radio-item${isSelected ? ' selected' : ''}`}
              style={{ paddingLeft: 8 + depth * 16 }}
              onClick={() => onSelect(isSelected ? null : node.id)}
            >
              <span style={{ fontSize: 12 }}>{hasChildren ? '📂 ' : '📄 '}</span>
              <span style={{ fontSize: 13 }}>{node.name}</span>
              {isSelected ? <span style={{ marginLeft: 'auto', color: '#1677ff', fontWeight: 700 }}>✓</span> : null}
            </div>
            {hasChildren ? <MigrateTreeItems nodes={node.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} /> : null}
          </div>
        );
      })}
    </>
  );
}

export function ResourceManagementPage() {
  const [activePanel, setActivePanel] = useState<ManagementPanel>('workbench');
  const [resources, setResources] = useState<ManagedResource[]>(INITIAL_RESOURCES);
  const [catalogTreeState, setCatalogTreeState] = useState<CatalogNode[]>(INITIAL_CATALOG_TREE);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const updateResource = (id: string, patch: Partial<ManagedResource>) => {
    setResources((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const addLog = (entry: { action: string; resource: string; result: string; detail: string }) => {
    const now = new Date();
    const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLogs((prev) => [{ action: entry.action, resource: entry.resource, operator: CURRENT_USER, result: entry.result, time }, ...prev]);
  };

  const groupedNav = panelNav.reduce<Record<string, typeof panelNav>>((groups, item) => {
    groups[item.section] = groups[item.section] ?? [];
    groups[item.section].push(item);
    return groups;
  }, {});

  return (
    <section className="resource-management">
      <nav className="resource-management__sidebar" aria-label="资源管理导航">
        {Object.entries(groupedNav).map(([section, items], index) => (
          <div className="resource-management__sidebar-section" key={section}>
            {index > 0 ? <div className="resource-management__sidebar-divider" /> : null}
            <div className="resource-management__sidebar-title">{section}</div>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activePanel === item.key ? 'active' : ''}
                onClick={() => setActivePanel(item.key)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <main className="resource-management__main">
        {activePanel === 'workbench' ? <WorkbenchPanel onOpenList={() => setActivePanel('resource-list')} resources={resources} /> : null}
        {activePanel === 'resource-list' ? <ResourceListPanel resources={resources} catalogTree={catalogTreeState} logs={logs} updateResource={updateResource} addLog={addLog} /> : null}
        {activePanel === 'catalog-mgmt' ? <CatalogManagementPanel allResources={resources} catalogTree={catalogTreeState} setCatalogTree={setCatalogTreeState} updateResource={updateResource} addLog={addLog} /> : null}
      </main>
    </section>
  );
}
