import { useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import type { ResourceType } from '../../types/resources';
import './resource-management.css';

type ManagementPanel = 'workbench' | 'resource-list' | 'catalog-mgmt';
type ResourceStatus = 'maintain' | 'published' | 'no-list' | 'reviewing' | 'unlisting' | 'catalog_reviewing';
type ResourceListTab = 'all' | 'maintain' | 'published' | 'no-list' | 'errors';
type TodoCategory = 'identification' | 'management' | 'retirement' | 'owner';
type TodoLevel = 'error' | 'warn' | 'info';

type ManagedResource = {
  id: string;
  name: string;
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

type CatalogNode = {
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

const CURRENT_USER = '张三';

const panelNav: Array<{ key: ManagementPanel; label: string; icon: string; section: '资源管理' | '目录管理' }> = [
  { key: 'workbench', label: '工作台', icon: '▦', section: '资源管理' },
  { key: 'resource-list', label: '资源列表', icon: '▣', section: '资源管理' },
  { key: 'catalog-mgmt', label: '目录管理', icon: '📁', section: '目录管理' },
];

const managedResources: ManagedResource[] = [
  {
    id: 'r002',
    name: 'kafka_user_click_raw',
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
    type: 'table',
    platform: 'MaxCompute',
    source: '北京数仓主集群',
    sourceType: 'warehouse_engine',
    sourceSystem: 'MaxCompute',
    status: 'published',
    techOwner: '李四',
    bizOwner: '王五',
    catalog: '交易域/订单/订单明细',
    updated: '2026-03-20',
    tags: ['订单', '浏览', 'DWD', '已上架'],
    summary: '订单浏览行为明细宽表，已上架为正式资产',
  },
  {
    id: 'r011',
    name: 'wlyd_mc_beijing.dws_trade_channel_gmv_day_df',
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
  { id: 'e002', resource: 'rpt_weekly_summary', resourceId: 'r006', type: 'missing-info', typeLabel: '信息缺失', desc: '资源摘要为空，无法向消费方展示资源用途', resType: 'report', owner: '张三', found: '2026-03-21', handleStatus: 'pending' },
  { id: 'e003', resource: 'dwd_payment_detail_bak', resourceId: null, type: 'invalid', typeLabel: '资源失效', desc: '底层数据表已删除，资产仍显示已上架状态', resType: 'table', owner: '李四', found: '2026-03-20', handleStatus: 'pending' },
  { id: 'e004', resource: 'api_legacy_order_v1', resourceId: null, type: 'invalid', typeLabel: '资源失效', desc: 'API 接口已下线，返回 404，请及时下架资产', resType: 'api', owner: '李四', found: '2026-03-19', handleStatus: 'ignored' },
  { id: 'e005', resource: 'ods_log_2025_archive', resourceId: null, type: 'no-owner', typeLabel: '无主资源', desc: '技术负责人已离职，资源当前无有效负责人', resType: 'table', owner: '—', found: '2026-03-18', handleStatus: 'pending' },
  { id: 'e007', resource: 'wlyd_mc_beijing.dm_difp_pay_mt_account_aggregate_info_df', resourceId: 'r004', type: 'no-catalog', typeLabel: '目录悬空', desc: '资源原归属目录已被删除，当前处于未归属状态', resType: 'table', owner: '张三', found: '2026-03-16', handleStatus: 'pending' },
];

const catalogTree: CatalogNode[] = [
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

const managementLogs = [
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
  dashboard: '看板',
  api: 'API',
  label: '标签',
  view: '视图',
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
  }[status];
}

function statusTone(status: ResourceStatus): 'success' | 'warning' | 'gray' | 'blue' {
  if (status === 'published') return 'success';
  if (status === 'maintain' || status === 'reviewing' || status === 'unlisting' || status === 'catalog_reviewing') return 'warning';
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

function getResourceActions(resource: ManagedResource) {
  if (resource.status === 'maintain') return ['编辑', '目录', '提交上架', '不上架', '交接'];
  if (resource.status === 'reviewing') return ['撤回上架申请'];
  if (resource.status === 'catalog_reviewing') return ['查看审批状态'];
  if (resource.status === 'published') return ['修改目录', '申请下架', '交接'];
  if (resource.status === 'unlisting') return ['撤回下架申请'];
  if (resource.status === 'no-list') return ['转待维护', '交接'];
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

function getCatalogResourceCount(id: string) {
  const path = getCatalogPath(catalogTree, id);
  if (!path) return 0;
  const pathText = path.join('/');
  return managedResources.filter((resource) => resource.catalog?.startsWith(pathText)).length;
}

function WorkbenchPanel({ onOpenList }: { onOpenList: () => void }) {
  const [todoTab, setTodoTab] = useState<TodoCategory>('identification');
  const [expanded, setExpanded] = useState(false);
  const openTodos = getOpenTodos();
  const myResources = managedResources.filter(isMyResource);
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

function ResourceListPanel() {
  const [status, setStatus] = useState<ResourceListTab>('all');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ResourceType>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logsOpen, setLogsOpen] = useState(false);

  const rows = useMemo(() => {
    if (status === 'errors') return [];
    return managedResources
      .filter((resource) => filterResourcesByTab(resource, status))
      .filter((resource) => (typeFilter === 'all' ? true : resource.type === typeFilter))
      .filter((resource) => (unassignedOnly ? !resource.catalog : true))
      .filter((resource) => (status === 'all' && mineOnly ? isMyResource(resource) : true))
      .filter((resource) => matchKeyword(resource, keyword))
      .sort((a, b) => Number(!isMyResource(a)) - Number(!isMyResource(b)));
  }, [keyword, mineOnly, status, typeFilter, unassignedOnly]);

  const selectedCount = selectedIds.size;
  const maintainCount = managedResources.filter((resource) => resource.status === 'maintain' || resource.status === 'reviewing').length;

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
  };

  const batchActions = (() => {
    if (status === 'maintain') return ['批量提交上架', '批量不上架', '批量修改目录', '批量交接'];
    if (status === 'published') return ['批量申请下架', '批量交接'];
    if (status === 'no-list') return ['批量转待维护', '批量交接'];
    if (status === 'errors') return [];
    return ['批量提交上架', '批量修改目录', '批量交接'];
  })();

  return (
    <section className="resource-management__panel">
      <h1>资源列表</h1>
      <div className="resource-management__status-tabs" role="tablist" aria-label="资源状态">
        {statusTabs.map((tab) => {
          const badge = tab.key === 'maintain' ? maintainCount : tab.key === 'errors' ? 4 : null;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={status === tab.key}
              className={status === tab.key ? 'active' : ''}
              onClick={() => switchTab(tab.key)}
            >
              {tab.label}{badge ? ` ${badge}` : ''}
            </button>
          );
        })}
      </div>

      <div className="resource-management__batch-bar">
        <span className={selectedCount ? 'active' : ''}>{selectedCount ? `已选 ${selectedCount} 条` : '未选择'}</span>
        {status !== 'errors' ? <span>共 {rows.length} 条资源</span> : <span>共 {resourceErrors.length} 条异常</span>}
        <div className="resource-management__batch-actions">
          {batchActions.map((action) => (
            <Button key={action} variant={action.includes('提交') ? 'primary' : 'default'} size="sm" disabled={!selectedCount}>
              {action}
            </Button>
          ))}
        </div>
        {selectedCount ? <Button size="sm" onClick={() => setSelectedIds(new Set())}>取消选择</Button> : null}
      </div>

      <div className="resource-management__toolbar">
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索资源名称…" />
        <select aria-label="全部类型" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ResourceType)}>
          <option value="all">全部类型</option>
          <option value="table">表</option>
          <option value="api">API</option>
          <option value="report">报表</option>
          <option value="label">标签</option>
          <option value="metric">指标</option>
        </select>
        <button type="button" className={unassignedOnly ? 'active' : ''} onClick={() => setUnassignedOnly((value) => !value)}>
          {unassignedOnly ? '☑' : '☐'} 未归属
        </button>
        <button type="button" className={mineOnly ? 'active' : ''} onClick={() => setMineOnly((value) => !value)}>
          {mineOnly ? '☑' : '☐'} 仅我负责
        </button>
        <div className="resource-management__toolbar-right">
          <Button variant="primary" size="sm">＋ 新增资源</Button>
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
                <th aria-label="选择"><input type="checkbox" disabled={rows.length === 0} /></th>
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
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((resource) => {
                const hasPermission = isMyResource(resource);
                const pending = ['reviewing', 'unlisting', 'catalog_reviewing'].includes(resource.status);
                const { prefix, objectName } = splitQualifiedName(resource.name);
                return (
                  <tr key={resource.id} className={!hasPermission || pending ? 'muted' : ''}>
                    <td>
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
                        <span className="resource-management__resource-icon">{resource.type === 'api' ? '🔌' : resource.type === 'report' ? '📊' : resource.type === 'label' ? '🏷️' : '🗃️'}</span>
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
                    <td>{resource.summary}</td>
                    <td>{resource.techOwner}</td>
                    <td>{resource.bizOwner ?? '-'}</td>
                    <td>
                      <div className="resource-management__tag-list">
                        {resource.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                      </div>
                    </td>
                    <td>{resource.updated}</td>
                    <td>
                      <div className="resource-management__row-actions">
                        {getResourceActions(resource).map((action) => <button key={action} type="button">{action}</button>)}
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
                {managementLogs.map((log) => (
                  <tr key={`${log.action}-${log.resource}`}>
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
    </section>
  );
}

function CatalogTreeItems({ nodes, depth, selectedId, onSelect }: { nodes: CatalogNode[]; depth: number; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <>
      {nodes.map((node, index) => {
        const path = getCatalogPath(catalogTree, node.id)?.join(' / ') ?? node.name;
        const count = getCatalogResourceCount(node.id);
        const hasChildren = node.children.length > 0;
        return (
          <div key={node.id}>
            <button
              type="button"
              role="treeitem"
              aria-label={path}
              className={`resource-management__catalog-node ${selectedId === node.id ? 'active' : ''}`}
              style={{ paddingLeft: 12 + depth * 16 }}
              onClick={() => onSelect(node.id)}
            >
              <span className="ct-arrow">{hasChildren ? '▶' : ''}</span>
              <span className="ct-icon">{hasChildren ? '📂' : '📄'}</span>
              <span className="ct-label">{node.name}</span>
              {count > 0 ? <span className="ct-count">{count}</span> : null}
              <span className="ct-sort-btns" aria-hidden="true">
                <span className={index === 0 ? 'disabled' : ''}>↑</span>
                <span className={index === nodes.length - 1 ? 'disabled' : ''}>↓</span>
              </span>
              <span className="ct-actions" aria-hidden="true">
                {depth < 4 ? <span>+</span> : null}
                <span>✎</span>
                <span className="danger">×</span>
              </span>
            </button>
            {hasChildren ? <CatalogTreeItems nodes={node.children} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} /> : null}
          </div>
        );
      })}
    </>
  );
}

function CatalogManagementPanel() {
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const selectedNode = selectedCatalog ? findCatalogNode(catalogTree, selectedCatalog) : undefined;
  const path = selectedCatalog ? getCatalogPath(catalogTree, selectedCatalog) : undefined;
  const pathText = path?.join('/');
  const resources = pathText ? managedResources.filter((resource) => resource.catalog?.startsWith(pathText)) : [];

  const toggleResource = (id: string) => {
    setSelectedResourceIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCatalog = (id: string) => {
    setSelectedCatalog(id);
    setSelectedResourceIds(new Set());
  };

  return (
    <section className="resource-management__panel resource-management__panel--full">
      <h1>目录管理</h1>
      <div className="resource-management__catalog-layout">
        <section className="resource-management__catalog-tree">
          <div className="resource-management__catalog-head">
            <span>目录结构</span>
            <Button variant="primary" size="sm">➕ 新增一级</Button>
          </div>
          <div className="resource-management__catalog-tree-body" role="tree" aria-label="目录结构">
            <CatalogTreeItems nodes={catalogTree} depth={0} selectedId={selectedCatalog} onSelect={handleSelectCatalog} />
          </div>
        </section>

        <section className="resource-management__catalog-detail">
          <div className="resource-management__catalog-detail-head">
            <span>{path ? path.join(' / ') : '请在左侧选择目录节点'}</span>
            {selectedNode ? (
              <div>
                <Button variant="primary" size="sm">📥 批量挂载</Button>
                <Button size="sm" disabled={selectedResourceIds.size === 0}>📦 批量迁移</Button>
              </div>
            ) : null}
          </div>
          <div className="resource-management__catalog-detail-body">
            {selectedNode && path ? (
              <>
                <div className="resource-management__catalog-stats">
                  <div>
                    <span>目录层级</span>
                    <strong>{path.length} 级</strong>
                  </div>
                  <div>
                    <span>挂载资源数</span>
                    <strong>{resources.length}</strong>
                  </div>
                </div>
                {selectedNode.desc ? <p className="resource-management__catalog-desc">{selectedNode.desc}</p> : null}
                {selectedNode.children.length ? (
                  <div className="resource-management__catalog-children">
                    <strong>子目录（{selectedNode.children.length}）</strong>
                    <div>
                      {selectedNode.children.map((child) => (
                        <button key={child.id} type="button" onClick={() => handleSelectCatalog(child.id)}>{child.name}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="resource-management__catalog-resource-head">
                  <strong>挂载资源列表</strong>
                  {selectedResourceIds.size ? <span>已选 {selectedResourceIds.size} 条</span> : null}
                </div>
                {resources.length ? (
                  <div className="resource-management__catalog-resource-table">
                    <table>
                      <thead>
                        <tr>
                          <th aria-label="选择"><input type="checkbox" /></th>
                          <th>资源名称</th>
                          <th>类型</th>
                          <th>状态</th>
                          <th>技术负责人</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resources.map((resource) => {
                          const pending = ['reviewing', 'unlisting', 'catalog_reviewing'].includes(resource.status);
                          return (
                            <tr key={resource.id} className={pending ? 'muted' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  aria-label={`选择 ${resource.name}`}
                                  disabled={pending}
                                  checked={selectedResourceIds.has(resource.id)}
                                  onChange={() => toggleResource(resource.id)}
                                />
                              </td>
                              <td>{resource.name}</td>
                              <td><Tag>{typeLabel(resource.type)}</Tag></td>
                              <td><Tag tone={statusTone(resource.status)}>{statusLabel(resource.status)}</Tag></td>
                              <td>
                                {resource.techOwner}
                                {resource.pendingCatalog ? <small>目标目录：{resource.pendingCatalog}</small> : null}
                              </td>
                              <td>{pending ? <Button size="sm" disabled>审批中</Button> : <button type="button">迁移</button>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="resource-management__empty-row">该目录下暂无挂载资源</div>
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
    </section>
  );
}

export function ResourceManagementPage() {
  const [activePanel, setActivePanel] = useState<ManagementPanel>('workbench');

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
        {activePanel === 'workbench' ? <WorkbenchPanel onOpenList={() => setActivePanel('resource-list')} /> : null}
        {activePanel === 'resource-list' ? <ResourceListPanel /> : null}
        {activePanel === 'catalog-mgmt' ? <CatalogManagementPanel /> : null}
      </main>
    </section>
  );
}
