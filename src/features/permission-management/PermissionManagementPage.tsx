import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/base/Button';
import { Tag } from '../../components/base/Tag';
import { ConditionFieldCheckbox } from '../../components/forms/ConditionFieldCheckbox';
import './permission-management.css';
import { statusLabels, statusTone, syncTone, categoryTone, pendingStatusLabels, subOrderStatusTag } from './components/ticketStatus';
import { TimelineItem } from './components/TimelineItem';
import { buildReapplyHash } from './components/buildReapplyHash';
import { ApplicantPermDetail } from './components/ApplicantPermDetail';
import { ApplicantGovDetail } from './components/ApplicantGovDetail';
import { ApplicantTransferDetail } from './components/ApplicantTransferDetail';

export { statusLabels, statusTone, syncTone, categoryTone, pendingStatusLabels, subOrderStatusTag };
export { TimelineItem };
export { buildReapplyHash };
export type { Ticket };

type PermissionSection = 'tickets' | 'pending' | 'approval-management' | 'records';
type TicketStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
type TicketCategory = 'all' | 'perm' | 'gov';
type TicketType = 'all' | '权限申请' | '上架申请' | '目录修改' | '打标签' | '下架申请' | '血缘修正';
type PendingStatusTab = 'all' | 'pending' | 'approved' | 'rejected' | 'expired';
type ManagementTab = 'flows' | 'routes' | 'approver-rules' | 'sync';
type RecordCategory = 'all' | '权限' | '治理';
type ModalState = (
  | { type: 'none' }
  | { type: 'tpl'; editIndex?: number }
  | { type: 'role'; editIndex?: number }
  | { type: 'reject'; pendingId: string }
) & { editIndex?: number };

export type Ticket = {
  id: string;
  type: Exclude<TicketType, 'all'>;
  category: Exclude<TicketCategory, 'all'>;
  feishuDefinition: string;
  approvalCode: string;
  batchId?: string;
  instanceCode: string;
  feishuUrl?: string;
  syncText: string;
  syncMode: 'event' | 'polling' | 'blocked';
  assetName: string;
  assetDisplay: string;
  assetType: string;
  applyTime: string;
  status: Exclude<TicketStatus, 'all'>;
  applicant: string;
  reason?: string;
};

type SubOrder = {
  assetName: string;
  assetDisplay: string;
  assetTypeTag: string;
  status: 'approved' | 'rejected' | 'pending' | 'withdrawn';
  timeline: Array<{ label: string; time: string; status: 'done' | 'rejected' | 'waiting' }>;
  rejectReason?: string;
};

type PendingApproval = {
  id: string;
  category: Exclude<TicketCategory, 'all'>;
  type: string;
  applicant: string;
  target: string;
  description: string;
  reason: string;
  applyTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  primaryAction: string;
  secondaryAction: string;
  detailType?: 'perm' | 'catalog' | 'transfer';
  detailData?: Record<string, string>;
};

type TplNode = { kind: 'superior' | 'owner' | 'role' | 'person'; role?: string; person?: string };
type ConditionField = 'objectTypes' | 'securityLevels';
type WorkOrderType = {
  name: string;
  code: string;
  category: string;
  description: string;
  defaultRoute: string;
  allowWithdraw: boolean;
  allowReapply: boolean;
  status: '启用' | '停用';
  updatedAt: string;
  used: boolean;
  applicableConditions: ConditionField[];
  bindingFlowCode: string;
};
type FeishuApprovalFlow = {
  name: string;
  approvalCode: string;
  description: string;
  feishuStatus: '已启用' | '已停用' | '不存在' | '无权限访问';
  formMappingStatus: '已校验' | '待校验' | '控件缺失';
  nodeSyncStatus: '已同步' | '待同步' | '节点缺失' | '手动维护';
  subscriptionStatus: '已订阅' | '未订阅' | '回调异常';
  status: '启用' | '停用';
  updatedAt: string;
  referenced: boolean;
};
type ApprovalRouteRule = {
  name: string;
  workOrderType: string;
  conditionSummary: string;
  objectTypes: string[];
  securityLevels: string[];
  businessDomain: string;
  catalog: string;
  sourceSystem: string;
  applicantDepartment: string;
  ownerDepartment: string;
  flow: string;
  nodeScheme: string;
  split: string;
  priority: number;
  isFallback: boolean;
  status: '启用' | '停用';
  updatedAt: string;
  used: boolean;
};
type FormFillingRule = {
  field: string;
  label: string;
  mappingType: 'direct' | 'rule';
  ruleMapping?: Record<string, string>;
  sourceField?: string;
};
type ApproverRule = {
  name: string;
  resolveType: string;
  source: string;
  fallbackEnabled: boolean;
  fallbackType: string;
  fallbackTarget: string;
  approvalMode: '单人审批' | '或签' | '会签';
  openIdSource: string;
  formFillingRules: FormFillingRule[];
  status: '启用' | '停用';
  checkStatus: '已校验' | '待校验' | '校验中' | '异常';
  updatedAt: string;
  used: boolean;
};
type FeishuApprovalNode = {
  nodeId: string;
  name: string;
  approvalMode: '单人审批' | '或签' | '会签';
  source: '飞书同步' | '手动维护';
  required: boolean;
};
type NodeApprovalScheme = {
  name: string;
  flow: string;
  nodes: Array<{
    nodeId: string;
    nodeName: string;
    approverRule: string;
    fallbackRule: string;
    approvalMode: '单人审批' | '或签' | '会签';
  }>;
  schemeFallbackRule: string;
  status: '启用' | '停用';
  updatedAt: string;
  used: boolean;
};
type SyncHealthItem = {
  name: string;
  kind: string;
  severity: '严重' | '警告' | '提示';
  status: string;
  target: string;
  detail: string;
  updatedAt: string;
};

const navItems: Array<{ key: PermissionSection; label: string; badge?: number; group?: string }> = [
  { key: 'tickets', label: '我提交的申请' },
  { key: 'pending', label: '待我审批', badge: 3 },
  { key: 'approval-management', label: '审批管理', group: '管理' },
  { key: 'records', label: '审批记录', group: '管理' },
];

function getPermissionSectionFromHash(): PermissionSection {
  const [, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const section = new URLSearchParams(query).get('section');
  if (section === 'submitted') return 'tickets';
  return navItems.some(item => item.key === section) ? section as PermissionSection : 'tickets';
}

const tickets: Ticket[] = [
  { id: 'PA-2026033100001', type: '权限申请', category: 'perm', feishuDefinition: '权限申请审批', approvalCode: 'APPROVAL_PERMISSION', batchId: 'BATCH-20260603-001', instanceCode: 'FS-PERM-0001', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-PERM-0001', syncText: '事件同步正常', syncMode: 'event', assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', assetType: '数据表', applyTime: '2026-03-31 14:30', status: 'pending', applicant: '张三', reason: '需要查询金融业务线的交易数据用于月度分析报告' },
  { id: 'PA-2026032800012', type: '权限申请', category: 'perm', feishuDefinition: '权限申请审批', approvalCode: 'APPROVAL_PERMISSION', batchId: 'BATCH-20260603-002', instanceCode: 'FS-PERM-0002', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-PERM-0002', syncText: '事件同步正常', syncMode: 'event', assetName: 'dim_user_profile', assetDisplay: '用户画像维表', assetType: '数据表', applyTime: '2026-03-28 09:15', status: 'approved', applicant: '李四' },
  { id: 'PA-2026032500008', type: '权限申请', category: 'perm', feishuDefinition: '权限申请审批', approvalCode: 'APPROVAL_PERMISSION', batchId: 'BATCH-20260603-003', instanceCode: 'FS-PERM-0003', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-PERM-0003', syncText: '轮询补偿完成', syncMode: 'polling', assetName: 'api_logistics_track', assetDisplay: '物流追踪接口', assetType: 'API', applyTime: '2026-03-25 16:40', status: 'rejected', applicant: '张三' },
  { id: 'PA-2026032200003', type: '权限申请', category: 'perm', feishuDefinition: '权限申请审批', approvalCode: 'APPROVAL_PERMISSION', batchId: 'BATCH-20260603-004', instanceCode: 'FS-PERM-0004', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-PERM-0004', syncText: '事件同步正常', syncMode: 'event', assetName: 'rpt_finance_monthly', assetDisplay: '金融月度报表', assetType: '报表', applyTime: '2026-03-22 11:00', status: 'withdrawn', applicant: '王五' },
  { id: 'GA-2026033100042', type: '上架申请', category: 'gov', feishuDefinition: '资源治理审批', approvalCode: 'APPROVAL_RESOURCE_GOV', instanceCode: 'FS-GOV-0042', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-GOV-0042', syncText: '事件同步正常', syncMode: 'event', assetName: 'dwd_user_behavior', assetDisplay: '用户行为宽表', assetType: '数据表', applyTime: '2026-03-31 10:15', status: 'pending', applicant: '张三', reason: '该表已完善元数据，申请上架发布' },
  { id: 'GA-2026033000038', type: '下架申请', category: 'gov', feishuDefinition: '资源治理审批', approvalCode: 'APPROVAL_RESOURCE_GOV', instanceCode: 'FS-GOV-0038', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-GOV-0038', syncText: '事件同步正常', syncMode: 'event', assetName: 'dwd_order_legacy', assetDisplay: '历史订单表（已废弃）', assetType: '数据表', applyTime: '2026-03-30 15:20', status: 'approved', applicant: '赵六' },
  { id: 'GA-2026032900035', type: '目录修改', category: 'gov', feishuDefinition: '资源治理审批', approvalCode: 'APPROVAL_RESOURCE_GOV', batchId: 'BATCH-20260603-005', instanceCode: 'FS-GOV-0035', feishuUrl: 'https://applink.feishu.cn/client/approval/open?instance_code=FS-GOV-0035', syncText: '轮询补偿完成', syncMode: 'polling', assetName: 'dwd_click_stream', assetDisplay: '点击流日志表', assetType: '数据表', applyTime: '2026-03-29 11:30', status: 'rejected', applicant: '张三' },
  { id: 'GA-2026032800020', type: '打标签', category: 'gov', feishuDefinition: '暂未接入首期', approvalCode: 'NOT_IN_SCOPE', instanceCode: '—', syncText: '未接入飞书', syncMode: 'blocked', assetName: 'metric_gmv_daily', assetDisplay: 'GMV日指标', assetType: '指标', applyTime: '2026-03-28 08:45', status: 'approved', applicant: '李四' },
];

const permDetailSubOrders: SubOrder[] = [
  { assetName: 'dwd_trade_order', assetDisplay: '交易订单宽表', assetTypeTag: '数据表 \xb7 金融', status: 'approved', timeline: [{ label: '上级审批 → 王经理', time: '2026-03-31 15:02', status: 'done' }, { label: '负责人审批（或签）→ 张三', time: '2026-03-31 16:20', status: 'done' }] },
  { assetName: 'dwd_trade_payment', assetDisplay: '交易支付明细表', assetTypeTag: '数据表 \xb7 金融', status: 'approved', timeline: [{ label: '上级审批 → 王经理', time: '2026-03-31 15:02', status: 'done' }, { label: '负责人审批（或签）→ 李四', time: '2026-03-31 17:10', status: 'done' }] },
  { assetName: 'rpt_finance_monthly, rpt_finance_weekly', assetDisplay: '', assetTypeTag: '报表 \xb7 金融', status: 'rejected', rejectReason: '请补充具体使用场景和查看频率', timeline: [{ label: '金融业务线审批人 → 赵总', time: '2026-03-31 16:45', status: 'rejected' }] },
  { assetName: 'api_trade_query', assetDisplay: '交易查询接口', assetTypeTag: 'API \xb7 金融', status: 'pending', timeline: [{ label: 'API负责人 → 孙工', time: '等待审批中...', status: 'waiting' }] },
];

const pendingApprovals: PendingApproval[] = [
  { id: 'PA-2026040100003-S2', category: 'perm', type: '权限申请', applicant: '王五', target: 'dwd_trade_order / dwd_trade_payment', description: '交易订单宽表、交易支付明细表 \xb7 数据表 \xb7 金融', reason: '需要分析 Q1 交易数据，用于季度业务复盘报告，预计使用 3 个月。', applyTime: '2026-04-01 09:30', status: 'pending', primaryAction: '通过', secondaryAction: '驳回', detailType: 'perm', detailData: { applicant: '王五', applyTime: '2026-04-01 09:30', reason: '需要分析 Q1 交易数据，用于季度业务复盘报告，预计使用 3 个月。' } },
  { id: 'GA-2026040100044', category: 'gov', type: '变更目录', applicant: '李四', target: 'dwd_user_behavior', description: '用户域/行为 → 用户域/画像', reason: '该表包含用户画像相关字段，归属行为目录有误，应归属画像目录。', applyTime: '2026-04-01 10:15', status: 'pending', primaryAction: '通过', secondaryAction: '驳回', detailType: 'catalog', detailData: { applicant: '李四', applyTime: '2026-04-01 10:15', asset: 'dwd_user_behavior', from: '用户域/行为', to: '用户域/画像', reason: '该表包含用户画像相关字段，归属行为目录有误，应归属画像目录。' } },
  { id: 'GA-2026040100045', category: 'gov', type: '转交负责人', applicant: '赵六', target: 'rpt_logistics_daily', description: '赵六 → 钱七（待您确认接收）', reason: '赵六岗位调整，物流报表相关工作移交给钱七负责。', applyTime: '2026-04-01 11:00', status: 'pending', primaryAction: '确认接收', secondaryAction: '拒绝', detailType: 'transfer', detailData: { transferor: '赵六', applyTime: '2026-04-01 11:00', asset: 'rpt_logistics_daily（物流日报表）', assignee: '钱七（您）', reason: '赵六岗位调整，物流报表相关工作移交给钱七负责。' } },
  { id: 'GA-2026040100046', category: 'gov', type: '上架申请', applicant: '张三', target: 'metric_sales_daily', description: '销售日指标 \xb7 指标 \xb7 金融', reason: '指标已完善元数据', applyTime: '2026-04-02 09:00', status: 'approved', primaryAction: '通过', secondaryAction: '驳回' },
  { id: 'PA-2026040200001', category: 'perm', type: '权限申请', applicant: '李四', target: 'dim_user_profile', description: '用户画像维表 \xb7 数据表 \xb7 用户增长', reason: '用于用户分群分析', applyTime: '2026-04-02 14:00', status: 'rejected', primaryAction: '通过', secondaryAction: '驳回' },
  { id: 'PA-2026040300002', category: 'perm', type: '权限申请', applicant: '王五', target: 'rpt_logistics_daily', description: '物流日报表 \xb7 报表 \xb7 物流', reason: '查看物流数据', applyTime: '2026-04-03 10:00', status: 'expired', primaryAction: '查看详情', secondaryAction: '' },
];

const approvalTemplates = [
  { name: '数据表-通用审批', condition: ['数据表'], approverRule: '资源技术负责人', priority: 4, status: '启用' },
  { name: '报表-S3/S4安全等级', condition: ['报表', 'S3', 'S4'], approverRule: '资源业务负责人', priority: 2, status: '启用' },
  { name: '报表-S5安全等级', condition: ['报表', 'S5'], approverRule: '治理负责人', priority: 2, status: '启用' },
  { name: '交易域-核心表审批', condition: ['数据表', '交易域/订单, 交易域/支付'], approverRule: '金融业务线审批人', priority: 1, status: '启用' },
  { name: 'API-通用审批', condition: ['API'], approverRule: '资产负责人', priority: 4, status: '启用' },
  { name: '默认兜底模板', condition: ['全部（兜底）'], approverRule: '资产负责人', priority: 99, status: '启用' },
];

const approvalRoles = [
  { name: '金融业务线审批人', members: '赵总', feishuUser: 'open_id: ou_approval_finance', mode: '或签', referenced: '2 个模板' },
  { name: '物流业务线审批人', members: '钱总、周总', feishuUser: 'open_id: ou_approval_logistics', mode: '或签', referenced: '1 个模板' },
  { name: '数据管理员', members: '张三', feishuUser: 'open_id: ou_data_admin', mode: '或签', referenced: '治理操作' },
];

const workOrderTypes: WorkOrderType[] = [
  { name: '上架申请', code: 'WORK_ORDER_PUBLISH', category: '资源治理', description: '待维护资源申请进入正式资产目录', defaultRoute: '资源治理：上架/下架/目录修改', allowWithdraw: true, allowReapply: true, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: ['objectTypes'], bindingFlowCode: 'APPROVAL_RESOURCE_GOV' },
  { name: '下架申请', code: 'WORK_ORDER_UNPUBLISH', category: '资源治理', description: '已上架资源申请退出正式资产目录', defaultRoute: '资源治理：上架/下架/目录修改', allowWithdraw: true, allowReapply: true, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: ['objectTypes'], bindingFlowCode: 'APPROVAL_RESOURCE_GOV' },
  { name: '目录修改', code: 'WORK_ORDER_CATALOG_CHANGE', category: '资源治理', description: '资源或资产对象申请修改目录归属', defaultRoute: '资源治理：上架/下架/目录修改', allowWithdraw: true, allowReapply: true, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: ['objectTypes'], bindingFlowCode: 'APPROVAL_RESOURCE_GOV' },
  { name: '权限申请', code: 'WORK_ORDER_PERMISSION', category: '权限', description: '用户申请数据访问权限', defaultRoute: '权限申请：S1-S4 常规授权', allowWithdraw: true, allowReapply: true, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: ['objectTypes', 'securityLevels'], bindingFlowCode: 'APPROVAL_PERMISSION' },
  { name: '负责人交接', code: 'WORK_ORDER_OWNER_TRANSFER', category: '负责人', description: '当前负责人发起技术或业务负责人交接', defaultRoute: '负责人交接：接收人确认', allowWithdraw: true, allowReapply: false, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: [], bindingFlowCode: 'APPROVAL_OWNER_TRANSFER' },
  { name: '血缘修正', code: 'WORK_ORDER_LINEAGE_FIX', category: '血缘', description: '提交血缘新增、删除或字段映射修正', defaultRoute: '血缘修正：治理审批', allowWithdraw: true, allowReapply: true, status: '启用', updatedAt: '2026-06-05 09:20', used: true, applicableConditions: [], bindingFlowCode: 'APPROVAL_LINEAGE_FIX' },
];

const feishuApprovalDefinitions: FeishuApprovalFlow[] = [
  { name: '资源治理审批', approvalCode: 'APPROVAL_RESOURCE_GOV', description: '承载上架、下架、目录修改等资源治理动作', feishuStatus: '已启用', formMappingStatus: '已校验', nodeSyncStatus: '已同步', subscriptionStatus: '已订阅', status: '启用', updatedAt: '2026-06-05 09:30', referenced: true },
  { name: '权限申请审批', approvalCode: 'APPROVAL_PERMISSION', description: '承载申请单提交后的权限审批', feishuStatus: '已启用', formMappingStatus: '已校验', nodeSyncStatus: '已同步', subscriptionStatus: '已订阅', status: '启用', updatedAt: '2026-06-05 09:30', referenced: true },
  { name: '负责人交接审批', approvalCode: 'APPROVAL_OWNER_TRANSFER', description: '承载技术或业务负责人交接确认', feishuStatus: '已启用', formMappingStatus: '已校验', nodeSyncStatus: '手动维护', subscriptionStatus: '已订阅', status: '启用', updatedAt: '2026-06-05 09:30', referenced: true },
  { name: '血缘修正审批', approvalCode: 'APPROVAL_LINEAGE_FIX', description: '承载血缘新增、删除、字段映射修正', feishuStatus: '已启用', formMappingStatus: '控件缺失', nodeSyncStatus: '待同步', subscriptionStatus: '已订阅', status: '启用', updatedAt: '2026-06-05 09:30', referenced: true },
];

const feishuApprovalNodes: Record<string, FeishuApprovalNode[]> = {
  APPROVAL_PERMISSION: [
    { nodeId: 'applicant_manager', name: '申请人上级审批', approvalMode: '单人审批', source: '飞书同步', required: true },
    { nodeId: 'resource_owner', name: '资源负责人审批', approvalMode: '或签', source: '飞书同步', required: true },
    { nodeId: 'fixed_leader', name: '固定领导审批', approvalMode: '单人审批', source: '手动维护', required: false },
    { nodeId: 'governance_owner', name: '治理负责人审批', approvalMode: '会签', source: '飞书同步', required: true },
  ],
  APPROVAL_RESOURCE_GOV: [
    { nodeId: 'resource_owner', name: '资源负责人审批', approvalMode: '单人审批', source: '飞书同步', required: true },
    { nodeId: 'governance_owner', name: '治理负责人审批', approvalMode: '单人审批', source: '飞书同步', required: true },
  ],
  APPROVAL_OWNER_TRANSFER: [
    { nodeId: 'target_owner', name: '接收人确认', approvalMode: '单人审批', source: '手动维护', required: true },
  ],
  APPROVAL_LINEAGE_FIX: [
    { nodeId: 'governance_owner', name: '治理负责人审批', approvalMode: '单人审批', source: '飞书同步', required: true },
  ],
};

const approvalRouteRules: ApprovalRouteRule[] = [
  { name: '资源治理：上架/下架/目录修改', workOrderType: '上架申请', conditionSummary: '对象类型 in 表/视图/API；兜底规则', objectTypes: ['表', '视图', 'API'], securityLevels: [], businessDomain: '', catalog: '', sourceSystem: '', applicantDepartment: '', ownerDepartment: '', flow: '资源治理审批', nodeScheme: '资源治理-负责人审批', split: '不拆分', priority: 20, isFallback: true, status: '启用', updatedAt: '2026-06-05 09:40', used: true },
  { name: '权限申请：S1-S4 常规授权', workOrderType: '权限申请', conditionSummary: '对象类型 in 表/视图/API；安全等级 in S1/S2/S3/S4', objectTypes: ['表', '视图', 'API'], securityLevels: ['S1', 'S2', 'S3', 'S4'], businessDomain: '', catalog: '', sourceSystem: '', applicantDepartment: '', ownerDepartment: '', flow: '权限申请审批', nodeScheme: '权限申请-S5 多级审批', split: '按资源负责人分组', priority: 30, isFallback: true, status: '启用', updatedAt: '2026-06-05 09:40', used: true },
  { name: '权限申请：S5 高敏授权', workOrderType: '权限申请', conditionSummary: '对象类型 in 表/视图/API；安全等级 = S5', objectTypes: ['表', '视图', 'API'], securityLevels: ['S5'], businessDomain: '', catalog: '', sourceSystem: '', applicantDepartment: '', ownerDepartment: '', flow: '权限申请审批', nodeScheme: '权限申请-S5 多级审批', split: '按审批人分组', priority: 10, isFallback: false, status: '启用', updatedAt: '2026-06-05 09:40', used: true },
  { name: '负责人交接：接收人确认', workOrderType: '负责人交接', conditionSummary: '—', objectTypes: [], securityLevels: [], businessDomain: '', catalog: '', sourceSystem: '', applicantDepartment: '', ownerDepartment: '', flow: '负责人交接审批', nodeScheme: '负责人交接-接收人确认', split: '按接收人分组', priority: 20, isFallback: true, status: '启用', updatedAt: '2026-06-05 09:40', used: true },
  { name: '血缘修正：治理审批', workOrderType: '血缘修正', conditionSummary: '—', objectTypes: [], securityLevels: [], businessDomain: '', catalog: '', sourceSystem: '', applicantDepartment: '', ownerDepartment: '', flow: '血缘修正审批', nodeScheme: '血缘修正-治理审批', split: '不拆分', priority: 20, isFallback: true, status: '启用', updatedAt: '2026-06-05 09:40', used: true },
];

const approverResolutionRules: ApproverRule[] = [
  { name: '资源技术负责人', resolveType: '资源技术负责人', source: '从资产 technicalOwner 字段解析',
    fallbackEnabled: true, fallbackType: '指定角色', fallbackTarget: '数据管理员',
    approvalMode: '单人审批', openIdSource: '员工接口',
    formFillingRules: [
      { field: 'target_directory', label: '目标目录', mappingType: 'direct', sourceField: 'targetCatalog' },
    ],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '资源业务负责人', resolveType: '资源业务负责人', source: '从资产 businessOwner 字段解析',
    fallbackEnabled: true, fallbackType: '指定角色', fallbackTarget: '数据管理员',
    approvalMode: '单人审批', openIdSource: '员工接口',
    formFillingRules: [
      { field: 'cost_center', label: '成本中心', mappingType: 'direct', sourceField: 'costCenter' },
    ],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '治理负责人', resolveType: '指定角色', source: '从平台角色"数据管理员"解析',
    fallbackEnabled: false, fallbackType: '', fallbackTarget: '',
    approvalMode: '或签', openIdSource: '员工接口',
    formFillingRules: [
      { field: 'urgent_level', label: '紧急程度', mappingType: 'rule', ruleMapping: { 'S5': '高', 'S3': '中', 'S1': '低' } },
    ],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '申请人直属上级', resolveType: '申请人直属上级', source: '从员工接口 manager 字段解析',
    fallbackEnabled: true, fallbackType: '指定角色', fallbackTarget: '数据管理员',
    approvalMode: '单人审批', openIdSource: '员工接口',
    formFillingRules: [],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '固定领导', resolveType: '固定人员', source: '固定人员 open_id：ou_fixed_leader',
    fallbackEnabled: true, fallbackType: '指定角色', fallbackTarget: '数据管理员',
    approvalMode: '单人审批', openIdSource: '员工接口',
    formFillingRules: [],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '申请目标人', resolveType: '申请目标人', source: '从负责人交接的新负责人字段解析',
    fallbackEnabled: false, fallbackType: '', fallbackTarget: '',
    approvalMode: '单人审批', openIdSource: '员工接口',
    formFillingRules: [],
    status: '启用', checkStatus: '已校验', updatedAt: '2026-06-05 09:50', used: true },
  { name: '金融业务线审批人', resolveType: '业务域负责人', source: '按资产业务域解析金融业务线审批角色',
    fallbackEnabled: true, fallbackType: '解析规则', fallbackTarget: '资源业务负责人',
    approvalMode: '或签', openIdSource: '员工接口',
    formFillingRules: [
      { field: 'cost_center', label: '成本中心', mappingType: 'direct', sourceField: 'costCenter' },
      { field: 'urgent_level', label: '紧急程度', mappingType: 'rule', ruleMapping: { 'S5': '高', 'S3': '中', 'S1': '低' } },
    ],
    status: '启用', checkStatus: '待校验', updatedAt: '2026-06-05 09:50', used: false },
];

function flowNameOf(approvalCode: string) {
  return feishuApprovalDefinitions.find(f => f.approvalCode === approvalCode)?.name ?? approvalCode;
}

const nodeApprovalSchemes: NodeApprovalScheme[] = [
  {
    name: '权限申请-S5 多级审批',
    flow: 'APPROVAL_PERMISSION',
    nodes: [
      { nodeId: 'applicant_manager', nodeName: '申请人上级审批', approverRule: '申请人直属上级', fallbackRule: '数据管理员', approvalMode: '单人审批' },
      { nodeId: 'resource_owner', nodeName: '资源负责人审批', approverRule: '资源技术负责人', fallbackRule: '数据管理员', approvalMode: '或签' },
      { nodeId: 'fixed_leader', nodeName: '固定领导审批', approverRule: '固定领导', fallbackRule: '治理负责人', approvalMode: '单人审批' },
      { nodeId: 'governance_owner', nodeName: '治理负责人审批', approverRule: '治理负责人', fallbackRule: '数据管理员', approvalMode: '会签' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '启用',
    updatedAt: '2026-06-05 10:40',
    used: true,
  },
  {
    name: '资源治理-负责人审批',
    flow: 'APPROVAL_RESOURCE_GOV',
    nodes: [
      { nodeId: 'resource_owner', nodeName: '资源负责人审批', approverRule: '资源业务负责人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
      { nodeId: 'governance_owner', nodeName: '治理负责人审批', approverRule: '治理负责人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '启用',
    updatedAt: '2026-06-05 10:40',
    used: true,
  },
  {
    name: '负责人交接-接收人确认',
    flow: 'APPROVAL_OWNER_TRANSFER',
    nodes: [
      { nodeId: 'target_owner', nodeName: '接收人确认', approverRule: '申请目标人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '启用',
    updatedAt: '2026-06-05 10:40',
    used: true,
  },
  {
    name: '血缘修正-治理审批',
    flow: 'APPROVAL_LINEAGE_FIX',
    nodes: [
      { nodeId: 'governance_owner', nodeName: '治理负责人审批', approverRule: '治理负责人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '启用',
    updatedAt: '2026-06-05 10:40',
    used: true,
  },
  {
    name: '权限申请-会签模式',
    flow: 'APPROVAL_PERMISSION',
    nodes: [
      { nodeId: 'applicant_manager', nodeName: '申请人上级审批', approverRule: '申请人直属上级', fallbackRule: '数据管理员', approvalMode: '单人审批' },
      { nodeId: 'resource_owner', nodeName: '资源负责人审批', approverRule: '资源技术负责人', fallbackRule: '数据管理员', approvalMode: '会签' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '停用',
    updatedAt: '2026-06-05 10:40',
    used: false,
  },
  {
    name: '资源治理-仅负责人审批',
    flow: 'APPROVAL_RESOURCE_GOV',
    nodes: [
      { nodeId: 'resource_owner', nodeName: '资源负责人审批', approverRule: '资源业务负责人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '停用',
    updatedAt: '2026-06-05 10:40',
    used: false,
  },
  {
    name: '负责人交接-管理员审批',
    flow: 'APPROVAL_OWNER_TRANSFER',
    nodes: [
      { nodeId: 'admin', nodeName: '管理员确认', approverRule: '数据管理员', fallbackRule: '', approvalMode: '单人审批' },
      { nodeId: 'target_owner', nodeName: '接收人确认', approverRule: '申请目标人', fallbackRule: '数据管理员', approvalMode: '单人审批' },
    ],
    schemeFallbackRule: '数据管理员',
    status: '停用',
    updatedAt: '2026-06-05 10:40',
    used: false,
  },
];

const syncMonitorItems: SyncHealthItem[] = [
  { name: 'approval_instance 事件订阅', kind: '事件订阅', severity: '提示', status: '正常', target: '4 个 approval_code', detail: '实例状态回调最近 2 分钟内正常送达', updatedAt: '2026-06-05 10:10' },
  { name: '平台与飞书状态冲突', kind: '实例同步', severity: '严重', status: '待处理', target: 'FS-PERM-0003', detail: '飞书状态为已拒绝，平台本地仍为审批中，需要人工确认或补偿同步', updatedAt: '2026-06-05 10:08' },
  { name: '5 分钟轮询补偿', kind: '轮询补偿', severity: '提示', status: '正常', target: '12 个审批中实例', detail: '最近一次扫描修复 1 个延迟实例', updatedAt: '2026-06-05 10:05' },
  { name: '血缘修正字段映射缺失', kind: '飞书流程健康', severity: '警告', status: '待校验', target: 'APPROVAL_LINEAGE_FIX', detail: '字段映射摘要控件 key 未完成校验，相关路由暂不建议新增', updatedAt: '2026-06-05 10:00' },
  { name: '审批人 open_id 缺失', kind: '审批人解析异常', severity: '警告', status: '需处理', target: '3 名员工', detail: '员工接口未返回 open_id，命中时将走兜底审批人', updatedAt: '2026-06-05 09:58' },
];

const approvalRecords = [
  { id: 'PA-2026033100001-S1', category: '权限' as const, applicant: '当前用户', target: 'dwd_trade_order', applyTime: '2026-03-31 14:30', approver: '王经理 → 张三', approveTime: '2026-03-31 16:20', result: '通过' },
  { id: 'PA-2026033100001-S2', category: '权限' as const, applicant: '当前用户', target: 'dwd_trade_payment', applyTime: '2026-03-31 14:30', approver: '王经理 → 李四', approveTime: '2026-03-31 17:10', result: '通过' },
  { id: 'PA-2026033100001-S3', category: '权限' as const, applicant: '当前用户', target: 'rpt_finance_monthly + weekly', applyTime: '2026-03-31 14:30', approver: '赵总', approveTime: '2026-03-31 16:45', result: '驳回' },
  { id: 'PA-2026033100001-S4', category: '权限' as const, applicant: '当前用户', target: 'api_trade_query', applyTime: '2026-03-31 14:30', approver: '孙工', approveTime: '—', result: '审批中' },
  { id: 'GA-2026033100042', category: '治理' as const, applicant: '李四', target: '上架 \xb7 dwd_user_behavior', applyTime: '2026-03-31 10:15', approver: '张三', approveTime: '—', result: '审批中' },
  { id: 'GA-2026033000038', category: '治理' as const, applicant: '王五', target: '下架 \xb7 dwd_order_legacy', applyTime: '2026-03-30 15:20', approver: '张三', approveTime: '2026-03-30 16:00', result: '通过' },
];

// statusLabels, statusTone, syncTone imported from ./components/ticketStatus

function PermDetailSubOrderCard({ order }: { order: SubOrder }) {
  const [withdrawn, setWithdrawn] = useState(false);
  if (withdrawn) {
    return (
      <div className="permission-management__sub-order status-cancelled">
        <div className="permission-management__sub-order-header">
          <div><Tag tone="gray">已撤回</Tag> <strong>子单已撤回</strong></div>
        </div>
      </div>
    );
  }
  return (
    <div className={`permission-management__sub-order status-${order.status}`}>
      <div className="permission-management__sub-order-header">
        <div>
          {subOrderStatusTag(order.status)}
          <strong>{order.assetName}</strong>
          {order.assetDisplay ? <span className="permission-management__sub-order-secondary">{order.assetDisplay}</span> : null}
        </div>
        <Tag tone="blue">{order.assetTypeTag}</Tag>
      </div>
      <div className="permission-management__sub-order-body">
        <div className="permission-management__timeline">
          {order.timeline.map((t, i) => <TimelineItem key={i} {...t} />)}
        </div>
        {order.rejectReason ? (
          <div className="permission-management__reject-reason">
            <strong>驳回原因：</strong>{order.rejectReason}
          </div>
        ) : null}
        {order.status === 'pending' ? <Button size="sm" onClick={() => setWithdrawn(true)}>撤回</Button> : null}
        {order.status === 'rejected' ? (
          <Button variant="primary" size="sm" onClick={() => { window.location.hash = buildReapplyHash(order.assetName); }}>重新申请</Button>
        ) : null}
      </div>
    </div>
  );
}

function TicketQueryPanel() {
  const [status, setStatus] = useState<TicketStatus>('all');
  const [category, setCategory] = useState<TicketCategory>('all');
  const [type, setType] = useState<TicketType>('all');
  const [keyword, setKeyword] = useState('');
  const [applicant, setApplicant] = useState('');
  const [sortByTime, setSortByTime] = useState<'none' | 'desc' | 'asc'>('none');
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const applicantKw = applicant.trim().toLowerCase();
    const filtered = tickets.filter((ticket) => {
      if (status !== 'all' && ticket.status !== status) return false;
      if (category !== 'all' && ticket.category !== category) return false;
      if (type !== 'all' && ticket.type !== type) return false;
      if (kw && !ticket.assetName.toLowerCase().includes(kw) && !ticket.assetDisplay.toLowerCase().includes(kw)) return false;
      if (applicantKw && !ticket.applicant.toLowerCase().includes(applicantKw)) return false;
      return true;
    });
    if (sortByTime === 'none') return filtered;
    const sorted = [...filtered].sort((a, b) => a.applyTime.localeCompare(b.applyTime));
    return sortByTime === 'desc' ? sorted.reverse() : sorted;
  }, [applicant, category, keyword, sortByTime, status, type]);

  const detailTicket = detailId ? tickets.find(t => t.id === detailId) : null;

  if (detailTicket && detailTicket.category === 'perm') {
    return (
      <ApplicantPermDetail
        ticket={detailTicket}
        subOrders={permDetailSubOrders}
        actions={[<Button key="withdraw" variant="danger" size="sm">撤回所有未完成审批</Button>]}
      />
    );
  }

  if (detailTicket && detailTicket.category === 'gov') {
    const isCatalog = detailTicket.type === '目录修改';
    return (
      <ApplicantGovDetail
        ticket={detailTicket}
        actions={[<Button key="withdraw" variant="danger" size="sm">撤回申请</Button>]}
        timeline={[
          { label: `${detailTicket.applicant} 提交${detailTicket.type}`, time: detailTicket.applyTime, status: 'done' },
          { label: '张三（数据管理员）', time: '等待审批中...', status: 'waiting' },
        ]}
        diff={isCatalog ? { label: '当前目录', before: '用户域/行为/行为日志', after: '用户域/行为/点击流' } : undefined}
      />
    );
  }

  if (detailTicket && detailTicket.type === '负责人交接') {
    return (
      <ApplicantTransferDetail
        ticket={{ id: detailTicket.id }}
        transferor={detailTicket.applicant}
        assignee="钱七"
        asset={detailTicket.assetName}
        applyTime={detailTicket.applyTime}
        reason="原负责人离职"
        timeline={[
          { label: '① 赵六的上级（王经理）', time: detailTicket.applyTime, status: 'done' },
          { label: '② 被转交人确认（钱七 · 您）', time: '', status: 'waiting' },
          { label: '③ 钱七的上级（孙总）', time: '', status: 'waiting' },
        ]}
        actions={[<Button key="withdraw" variant="danger" size="sm">撤回</Button>]}
      />
    );
  }

  return (
    <section className="permission-management__panel">
      <h2>我提交的申请</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="工单状态">
        {([['all', '全部'], ['pending', '审批中'], ['approved', '已通过'], ['rejected', '已拒绝'], ['withdrawn', '已撤回']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={status === key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}>{label}</button>
        ))}
      </div>
      <div className="permission-management__filters">
        <select aria-label="工单分类" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
          <option value="all">全部分类</option>
          <option value="perm">权限</option>
          <option value="gov">治理</option>
        </select>
        <select aria-label="申请类型" value={type} onChange={(e) => setType(e.target.value as TicketType)}>
          <option value="all">全部类型</option>
          <option value="权限申请">权限申请</option>
          <option value="上架申请">上架申请</option>
          <option value="目录修改">目录修改</option>
          <option value="打标签">打标签</option>
          <option value="下架申请">下架申请</option>
          <option value="血缘修正">血缘修正</option>
        </select>
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索资产名称…" />
        <input value={applicant} onChange={(e) => setApplicant(e.target.value)} placeholder="搜索申请人…" />
        <select aria-label="按申请时间排序" value={sortByTime} onChange={(e) => setSortByTime(e.target.value as 'none' | 'desc' | 'asc')}>
          <option value="none">默认顺序</option>
          <option value="desc">申请时间 ↓</option>
          <option value="asc">申请时间 ↑</option>
        </select>
      </div>
      <TableShell>
        <table>
          <thead>
            <tr>
              <th>编号</th><th>工单分类</th><th>申请类型</th><th>飞书定义</th><th>批次/实例</th><th>资产名称</th><th>资产类型</th><th>申请时间</th><th>申请人</th><th>状态</th><th>同步</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ticket) => (
              <tr key={ticket.id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(ticket.id)}>
                <td className="primary">{ticket.id}</td>
                <td><Tag tone={categoryTone(ticket.category)}>{ticket.category === 'perm' ? '权限' : '治理'}</Tag></td>
                <td><Tag tone={ticket.type === '权限申请' ? 'blue' : ticket.type === '上架申请' ? 'success' : ticket.type === '下架申请' ? 'danger' : 'warning'}>{ticket.type}</Tag></td>
                <td><strong>{ticket.feishuDefinition}</strong><span>{ticket.approvalCode}</span></td>
                <td><strong>{ticket.batchId ?? '单实例'}</strong><span>{ticket.instanceCode}</span></td>
                <td><strong>{ticket.assetName}</strong><span>{ticket.assetDisplay}</span></td>
                <td><Tag tone={ticket.assetType === '数据表' ? 'blue' : ticket.assetType === '报表' ? 'warning' : 'gray'}>{ticket.assetType}</Tag></td>
                <td>{ticket.applyTime}</td>
                <td>{ticket.applicant}</td>
                <td><Tag tone={statusTone(ticket.status)}>{statusLabels[ticket.status]}</Tag></td>
                <td><Tag tone={syncTone(ticket.syncMode)}>{ticket.syncText}</Tag></td>
                <td>
                  <div className="permission-management__row-actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setDetailId(ticket.id); }}>查看详情</button>
                    {ticket.feishuUrl ? <a href={ticket.feishuUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>飞书审批单</a> : null}
                    {ticket.status === 'pending' ? <button type="button" className="danger" onClick={(e) => { e.stopPropagation(); }}>撤回</button> : null}
                    {ticket.status === 'rejected' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = buildReapplyHash(ticket.assetName, ticket.reason);
                        }}
                      >
                        重新申请
                      </button>
                    ) : null}
                    {ticket.status === 'withdrawn' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.hash = buildReapplyHash(ticket.assetName, ticket.reason);
                        }}
                      >
                        重新申请
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={12} className="permission-management__empty">暂无工单记录</td></tr> : null}
          </tbody>
        </table>
      </TableShell>
    </section>
  );
}

function PendingApprovalPanel() {
  const [tab, setTab] = useState<PendingStatusTab>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'perm' | 'gov'>('all');
  const [applicantFilter, setApplicantFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [rejectReason, setRejectReason] = useState('');

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const applicantKw = applicantFilter.trim().toLowerCase();
    return pendingApprovals.filter(item => {
      if (tab !== 'all' && item.status !== tab) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (applicantKw && !item.applicant.toLowerCase().includes(applicantKw)) return false;
      if (kw) {
        const haystack = `${item.target} ${item.description} ${item.applicant}`.toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [tab, categoryFilter, applicantFilter, keyword]);

  const detailItem = detailId ? pendingApprovals.find(p => p.id === detailId) : null;

  const handleApprove = (id: string) => {
    setDetailId(null);
  };

  const handleReject = (id: string) => {
    setModal({ type: 'reject', pendingId: id });
    setRejectReason('');
  };

  const confirmReject = () => {
    setModal({ type: 'none' });
    setDetailId(null);
  };

  if (detailItem) {
    return (
      <section className="permission-management__panel">
        <button type="button" className="permission-management__back-btn" onClick={() => setDetailId(null)}>← 返回列表</button>
        {detailItem.detailType === 'perm' && detailItem.detailData ? (
          <>
            <span className="permission-management__detail-title">权限申请详情 — {detailItem.id}</span>
            <div className="permission-management__card">
              <div className="permission-management__card-body">
                <div className="permission-management__info-grid">
                  <div><div className="permission-management__info-label">申请人</div><div className="permission-management__info-value">{detailItem.detailData.applicant}</div></div>
                  <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{detailItem.detailData.applyTime}</div></div>
                  <div style={{ gridColumn: '1/-1' }}><div className="permission-management__info-label">申请理由</div><div className="permission-management__info-value">{detailItem.detailData.reason}</div></div>
                </div>
              </div>
            </div>
            <div className="permission-management__card">
              <div className="permission-management__card-body">
                <strong>申请资产（共 2 项）</strong>
                <div className="permission-management__asset-card">
                  <div className="permission-management__asset-card-head"><strong>dwd_trade_order</strong> <span className="permission-management__sub-order-secondary">交易订单宽表</span></div>
                  <div className="permission-management__asset-card-meta">
                    <span>类型：数据表 \xb7 金融</span><span>来源：Hive \xb7 交易域</span>
                    <span>更新频率：每日</span><span>安全等级：<Tag tone="warning">L2 内部</Tag></span>
                  </div>
                </div>
                <div className="permission-management__asset-card">
                  <div className="permission-management__asset-card-head"><strong>dwd_trade_payment</strong> <span className="permission-management__sub-order-secondary">交易支付明细表</span></div>
                  <div className="permission-management__asset-card-meta">
                    <span>类型：数据表 \xb7 金融</span><span>来源：Hive \xb7 交易域</span>
                    <span>更新频率：每日</span><span>安全等级：<Tag tone="warning">L2 内部</Tag></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="permission-management__detail-actions">
              <Button onClick={() => setDetailId(null)}>取消</Button>
              <Button variant="danger" onClick={() => handleReject(detailItem.id)}>驳回</Button>
              <Button variant="primary" onClick={() => handleApprove(detailItem.id)}>通过</Button>
            </div>
          </>
        ) : detailItem.detailType === 'catalog' && detailItem.detailData ? (
          <>
            <span className="permission-management__detail-title">变更目录审批 — {detailItem.id}</span>
            <div className="permission-management__card">
              <div className="permission-management__card-body">
                <div className="permission-management__info-grid">
                  <div><div className="permission-management__info-label">申请人</div><div className="permission-management__info-value">{detailItem.detailData.applicant}</div></div>
                  <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{detailItem.detailData.applyTime}</div></div>
                  <div><div className="permission-management__info-label">资产</div><div className="permission-management__info-value">{detailItem.detailData.asset}</div></div>
                  <div><div className="permission-management__info-label">当前目录</div><div className="permission-management__info-value">{detailItem.detailData.from}</div></div>
                  <div><div className="permission-management__info-label">变更为</div><div className="permission-management__info-value primary">{detailItem.detailData.to}</div></div>
                  <div style={{ gridColumn: '1/-1' }}><div className="permission-management__info-label">变更原因</div><div className="permission-management__info-value">{detailItem.detailData.reason}</div></div>
                </div>
              </div>
            </div>
            <div className="permission-management__detail-actions">
              <Button onClick={() => setDetailId(null)}>取消</Button>
              <Button variant="danger" onClick={() => handleReject(detailItem.id)}>驳回</Button>
              <Button variant="primary" onClick={() => handleApprove(detailItem.id)}>通过</Button>
            </div>
          </>
        ) : detailItem.detailType === 'transfer' && detailItem.detailData ? (
          <>
            <span className="permission-management__detail-title">转交负责人确认 — {detailItem.id}</span>
            <div className="permission-management__card">
              <div className="permission-management__card-body">
                <div className="permission-management__info-grid">
                  <div><div className="permission-management__info-label">转交人</div><div className="permission-management__info-value">{detailItem.detailData.transferor}</div></div>
                  <div><div className="permission-management__info-label">申请时间</div><div className="permission-management__info-value">{detailItem.detailData.applyTime}</div></div>
                  <div><div className="permission-management__info-label">资产</div><div className="permission-management__info-value">{detailItem.detailData.asset}</div></div>
                  <div><div className="permission-management__info-label">被转交人</div><div className="permission-management__info-value primary">{detailItem.detailData.assignee}</div></div>
                  <div style={{ gridColumn: '1/-1' }}><div className="permission-management__info-label">转交原因</div><div className="permission-management__info-value">{detailItem.detailData.reason}</div></div>
                </div>
              </div>
            </div>
            <div className="permission-management__card">
              <div className="permission-management__card-header"><strong>审批进度</strong></div>
              <div className="permission-management__card-body">
                <div className="permission-management__timeline">
                  <TimelineItem label="① 赵六的上级（王经理）" time="2026-04-01 11:30" status="done" />
                  <TimelineItem label="② 被转交人确认（钱七 \xb7 您）" time="" status="waiting" />
                  <TimelineItem label="③ 钱七的上级（孙总）" time="" status="waiting" />
                </div>
              </div>
            </div>
            <div className="permission-management__detail-actions">
              <Button onClick={() => setDetailId(null)}>取消</Button>
              <Button variant="danger" onClick={() => handleReject(detailItem.id)}>拒绝接收</Button>
              <Button variant="primary" onClick={() => handleApprove(detailItem.id)}>确认接收</Button>
            </div>
          </>
        ) : (
          <div className="permission-management__empty">无详情数据</div>
        )}
        {modal.type === 'reject' ? (
          <div className="permission-management__modal-overlay" onClick={() => setModal({ type: 'none' })}>
            <div className="permission-management__modal" onClick={e => e.stopPropagation()}>
              <div className="permission-management__modal-header">
                <strong>驳回原因</strong>
                <button type="button" className="permission-management__modal-close" onClick={() => setModal({ type: 'none' })}>×</button>
              </div>
              <div className="permission-management__modal-body">
                <label className="permission-management__form-label">驳回原因 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea className="permission-management__form-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请填写驳回原因..." />
              </div>
              <div className="permission-management__modal-footer">
                <Button onClick={() => setModal({ type: 'none' })}>取消</Button>
                <Button variant="primary" onClick={confirmReject} disabled={!rejectReason.trim()}>确认驳回</Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="permission-management__panel">
      <h2>待我审批</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="待审批状态">
        {([['all', '全部'], ['pending', '待审批'], ['approved', '已通过'], ['rejected', '已拒绝'], ['expired', '已过期']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key as PendingStatusTab)}>
            {label}{key === 'all' ? ` ${pendingApprovals.length}` : ''}
          </button>
        ))}
      </div>
      <div className="permission-management__filters">
        <select aria-label="待审批类别" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'perm' | 'gov')}>
          <option value="all">全部类别</option>
          <option value="perm">权限</option>
          <option value="gov">治理</option>
        </select>
        <input value={applicantFilter} onChange={(e) => setApplicantFilter(e.target.value)} placeholder="筛选申请人…" aria-label="筛选申请人" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索资产/描述…" aria-label="搜索资产或描述" />
      </div>
      <TableShell>
        <table>
          <thead>
            <tr>
              <th>审批编号</th><th>类别</th><th>申请人</th><th>资产/操作</th><th>申请理由</th><th>申请时间</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="primary">{row.id}</td>
                <td><Tag tone={categoryTone(row.category)}>{row.type}</Tag></td>
                <td>{row.applicant}</td>
                <td><strong>{row.target}</strong><span>{row.description}</span></td>
                <td className="permission-management__reason-cell">{row.reason}</td>
                <td>{row.applyTime}</td>
                <td><Tag tone={statusTone(row.status)}>{pendingStatusLabels[row.status]}</Tag></td>
                <td>
                  <div className="permission-management__row-actions">
                    {row.status === 'pending' ? (
                      <>
                        <button type="button" onClick={() => setDetailId(row.id)}>查看详情</button>
                        <button type="button" className="success" onClick={() => handleApprove(row.id)}>{row.primaryAction}</button>
                        <button type="button" className="danger" onClick={() => handleReject(row.id)}>{row.secondaryAction}</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setDetailId(row.id)}>查看详情</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 ? <tr><td colSpan={8} className="permission-management__empty">暂无审批记录</td></tr> : null}
          </tbody>
        </table>
      </TableShell>
    </section>
  );
}

const emptyWorkOrderForm: WorkOrderType = {
  name: '',
  code: '',
  category: '资源治理',
  description: '',
  defaultRoute: '',
  allowWithdraw: true,
  allowReapply: true,
  status: '启用',
  updatedAt: '',
  used: false,
  applicableConditions: [],
  bindingFlowCode: '',
};

const emptyFlowForm: FeishuApprovalFlow = {
  name: '',
  approvalCode: '',
  description: '',
  feishuStatus: '已启用',
  formMappingStatus: '待校验',
  nodeSyncStatus: '待同步',
  subscriptionStatus: '已订阅',
  status: '启用',
  updatedAt: '',
  referenced: false,
};

const emptyRouteForm: ApprovalRouteRule = {
  name: '',
  workOrderType: '',
  conditionSummary: '',
  objectTypes: [],
  securityLevels: [],
  businessDomain: '',
  catalog: '',
  sourceSystem: '',
  applicantDepartment: '',
  ownerDepartment: '',
  flow: '',
  nodeScheme: '',
  split: '',
  priority: 20,
  isFallback: false,
  status: '启用',
  updatedAt: '',
  used: false,
};

const emptyApproverForm: ApproverRule = {
  name: '',
  resolveType: '资源技术负责人',
  source: '',
  fallbackEnabled: false,
  fallbackType: '指定角色',
  fallbackTarget: '',
  approvalMode: '单人审批',
  openIdSource: '员工接口',
  formFillingRules: [],
  status: '启用',
  checkStatus: '待校验',
  updatedAt: '',
  used: false,
};

const emptyNodeSchemeForm: NodeApprovalScheme = {
  name: '',
  flow: '',
  nodes: [],
  schemeFallbackRule: '',
  status: '启用',
  updatedAt: '',
  used: false,
};

const currentMockTime = '2026-06-05 10:30';

function selectedOptions(select: HTMLSelectElement) {
  return Array.from(select.options).filter(option => option.selected).map(option => option.value);
}

function buildRouteConditionSummary(rule: ApprovalRouteRule) {
  const parts = [
    rule.objectTypes.length ? `对象类型 in ${rule.objectTypes.join('/')}` : '',
    rule.securityLevels.length ? `安全等级 in ${rule.securityLevels.join('/')}` : '',
    rule.businessDomain.trim() ? `业务域 = ${rule.businessDomain.trim()}` : '',
    rule.catalog.trim() ? `目录 = ${rule.catalog.trim()}` : '',
    rule.sourceSystem.trim() ? `来源系统 = ${rule.sourceSystem.trim()}` : '',
    rule.applicantDepartment.trim() ? `申请人部门 = ${rule.applicantDepartment.trim()}` : '',
    rule.ownerDepartment.trim() ? `负责人部门 = ${rule.ownerDepartment.trim()}` : '',
    rule.isFallback ? '兜底规则' : '',
  ].filter(Boolean);
  return parts.length ? parts.join('；') : '—';
}

function fieldStatusTone(status: string) {
  if (status.includes('缺失') || status.includes('异常') || status.includes('不存在')) return 'danger';
  if (status.includes('待') || status.includes('未')) return 'warning';
  return 'success';
}

function hydrateNodeSchemeNodes(flow: string): NodeApprovalScheme['nodes'] {
  return (feishuApprovalNodes[flow] || []).map(node => ({
    nodeId: node.nodeId,
    nodeName: node.name,
    approverRule: '',
    fallbackRule: '',
    approvalMode: node.approvalMode,
  }));
}

function severityTone(severity: SyncHealthItem['severity']) {
  if (severity === '严重') return 'danger';
  if (severity === '警告') return 'warning';
  return 'success';
}

function ApprovalRoutingManagementPanel() {
  const [tab, setTab] = useState<ManagementTab>('flows');
  const [flows, setFlows] = useState<FeishuApprovalFlow[]>(feishuApprovalDefinitions);
  const [routeRules, setRouteRules] = useState<ApprovalRouteRule[]>(approvalRouteRules);
  const [approverRules, setApproverRules] = useState<ApproverRule[]>(approverResolutionRules);
  const [nodeSchemes, setNodeSchemes] = useState<NodeApprovalScheme[]>(nodeApprovalSchemes);
  const [flowForm, setFlowForm] = useState<FeishuApprovalFlow>(emptyFlowForm);
  const [routeForm, setRouteForm] = useState<ApprovalRouteRule>(emptyRouteForm);
  const [approverForm, setApproverForm] = useState<ApproverRule>(emptyApproverForm);
  const [nodeSchemeForm, setNodeSchemeForm] = useState<NodeApprovalScheme>(emptyNodeSchemeForm);
  const [flowModal, setFlowModal] = useState<{ mode: 'create' | 'edit'; approvalCode?: string } | null>(null);
  const [routeDrawer, setRouteDrawer] = useState<{ mode: 'create' | 'edit'; name?: string } | null>(null);
  const [approverDrawer, setApproverDrawer] = useState<{ mode: 'create' | 'edit'; name?: string } | null>(null);
  const [nodeSchemeDrawer, setNodeSchemeDrawer] = useState<{ mode: 'create' | 'edit'; name?: string } | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [loadingCodes, setLoadingCodes] = useState<Set<string>>(new Set());

  const withLoading = async (code: string, fn: () => Promise<void>) => {
    setLoadingCodes(prev => new Set([...prev, code]));
    try {
      await fn();
    } finally {
      setLoadingCodes(prev => { const s = new Set(prev); s.delete(code); return s; });
    }
  };

  const handleSyncFormFields = (code: string) => withLoading(code, async () => {
    await new Promise(r => setTimeout(r, 800));
    setFlows(prev => prev.map(row => row.approvalCode === code ? { ...row, formMappingStatus: '已校验' } : row));
    setActionMessage(`飞书流程 ${code} 表单控件同步完成`);
    setTimeout(() => setActionMessage(''), 3000);
  });

  const handleSyncNodes = (code: string) => withLoading(code, async () => {
    await new Promise(r => setTimeout(r, 800));
    setFlows(prev => prev.map(row => row.approvalCode === code ? { ...row, nodeSyncStatus: '已同步' } : row));
    setActionMessage(`飞书流程 ${code} 流程节点同步完成`);
    setTimeout(() => setActionMessage(''), 3000);
  });

  const duplicateFlowCode = Boolean(flowForm.approvalCode.trim()) && flows.some(item => (
    item.approvalCode === flowForm.approvalCode.trim() &&
    item.approvalCode !== flowModal?.approvalCode
  ));
  const canSaveFlow = Boolean(flowForm.name.trim() && flowForm.approvalCode.trim() && !duplicateFlowCode);
  const currentWorkOrderType = workOrderTypes.find(w => w.name === routeForm.workOrderType);
  const derivedFlowCode = currentWorkOrderType?.bindingFlowCode ?? '';
  const availableNodeSchemes = nodeSchemes.filter(scheme => scheme.flow === derivedFlowCode && scheme.status === '启用');
  const canSaveRoute = Boolean(routeForm.name.trim() && routeForm.workOrderType && currentWorkOrderType && routeForm.nodeScheme && routeForm.split && routeForm.priority);
  const canSaveApprover = Boolean(approverForm.name.trim() && (!approverForm.fallbackEnabled || approverForm.fallbackTarget.trim()));
  const canSaveNodeScheme = Boolean(
    nodeSchemeForm.name.trim() &&
    nodeSchemeForm.flow &&
    nodeSchemeForm.schemeFallbackRule &&
    nodeSchemeForm.nodes.length > 0 &&
    nodeSchemeForm.nodes.every(node => node.nodeId && node.approverRule),
  );

  const closeFlowModal = () => {
    setFlowModal(null);
    setFlowForm(emptyFlowForm);
  };

  const closeRouteDrawer = () => {
    setRouteDrawer(null);
    setRouteForm(emptyRouteForm);
  };

  const closeApproverDrawer = () => {
    setApproverDrawer(null);
    setApproverForm(emptyApproverForm);
  };

  const closeNodeSchemeDrawer = () => {
    setNodeSchemeDrawer(null);
    setNodeSchemeForm(emptyNodeSchemeForm);
  };



  const saveFlow = () => {
    if (!canSaveFlow) return;
    const next = { ...flowForm, name: flowForm.name.trim(), approvalCode: flowForm.approvalCode.trim(), updatedAt: currentMockTime };
    setFlows(prev => flowModal?.mode === 'edit'
      ? prev.map(item => item.approvalCode === flowModal.approvalCode ? next : item)
      : [next, ...prev]);
    setActionMessage(`飞书流程「${flowForm.name}」保存成功，模拟校验完成`);
    closeFlowModal();
  };

  const saveRoute = () => {
    if (!canSaveRoute || !currentWorkOrderType) return;
    const next = {
      ...routeForm,
      name: routeForm.name.trim(),
      flow: flowNameOf(currentWorkOrderType.bindingFlowCode),
      conditionSummary: buildRouteConditionSummary({ ...routeForm, flow: flowNameOf(currentWorkOrderType.bindingFlowCode) }),
      updatedAt: currentMockTime,
    };
    setRouteRules(prev => routeDrawer?.mode === 'edit'
      ? prev.map(item => item.name === routeDrawer.name ? next : item)
      : [next, ...prev]);
    closeRouteDrawer();
  };

  const saveApprover = () => {
    if (!canSaveApprover) return;
    const source = approverForm.resolveType === '指定角色'
      ? `从平台角色“${approverForm.name.trim()}”解析`
      : `从${approverForm.resolveType}解析`;
    const next = {
      ...approverForm,
      name: approverForm.name.trim(),
      source,
      fallbackTarget: approverForm.fallbackTarget.trim(),
      updatedAt: currentMockTime,
    };
    setApproverRules(prev => approverDrawer?.mode === 'edit'
      ? prev.map(item => item.name === approverDrawer.name ? next : item)
      : [next, ...prev]);
    closeApproverDrawer();
  };

  const saveNodeScheme = () => {
    if (!canSaveNodeScheme) return;
    const next = {
      ...nodeSchemeForm,
      name: nodeSchemeForm.name.trim(),
      nodes: nodeSchemeForm.nodes.map(node => ({
        ...node,
        fallbackRule: node.fallbackRule || nodeSchemeForm.schemeFallbackRule,
      })),
      updatedAt: currentMockTime,
    };
    setNodeSchemes(prev => nodeSchemeDrawer?.mode === 'edit'
      ? prev.map(item => item.name === nodeSchemeDrawer.name ? next : item)
      : [next, ...prev]);
    closeNodeSchemeDrawer();
  };

  return (
    <section className="permission-management__panel">
      <h2>审批管理</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="审批管理">
        <button type="button" role="tab" aria-selected={tab === 'flows'} className={tab === 'flows' ? 'active' : ''} onClick={() => setTab('flows')}>飞书流程库</button>
        <button type="button" role="tab" aria-selected={tab === 'routes'} className={tab === 'routes' ? 'active' : ''} onClick={() => setTab('routes')}>审批路由</button>
        <button type="button" role="tab" aria-selected={tab === 'approver-rules'} className={tab === 'approver-rules' ? 'active' : ''} onClick={() => setTab('approver-rules')}>审批规则</button>
        <button type="button" role="tab" aria-selected={tab === 'sync'} className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>同步监控</button>
      </div>

      {actionMessage ? <div className="permission-management__notice">{actionMessage}</div> : null}

      {tab === 'flows' ? (
        <>
          <div className="permission-management__panel-actions">
            <div>
              <strong>可被审批路由选择的飞书 approval_code</strong>
              <p className="permission-management__hint">首期预置 4 个飞书审批定义，但这里支持继续绑定新的流程编码。</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => { setFlowForm(emptyFlowForm); setFlowModal({ mode: 'create' }); }}>+ 绑定飞书流程</Button>
          </div>
          <TableShell>
            <table>
              <thead><tr><th>飞书流程</th><th>approval_code</th><th>表单控件映射</th><th>流程节点同步</th><th>飞书状态</th><th>事件订阅</th><th>平台状态</th><th>操作</th></tr></thead>
              <tbody>
                {flows.map((item) => (
                  <tr key={item.approvalCode}>
                    <td><strong>{item.name}</strong><span>{item.description}</span></td>
                    <td><Tag tone="blue">{item.approvalCode}</Tag></td>
                    <td><Tag tone={fieldStatusTone(item.formMappingStatus)}>{item.formMappingStatus}</Tag></td>
                    <td><Tag tone={fieldStatusTone(item.nodeSyncStatus)}>{item.nodeSyncStatus}</Tag></td>
                    <td>{item.feishuStatus}</td>
                    <td><Tag tone={fieldStatusTone(item.subscriptionStatus)}>{item.subscriptionStatus}</Tag></td>
                    <td><Tag tone={statusTone(item.status)}>{item.status}</Tag></td>
                    <td>
                      <div className="permission-management__row-actions">
                        <button type="button" aria-label={`${item.approvalCode} 编辑`} onClick={() => { setFlowForm(item); setFlowModal({ mode: 'edit', approvalCode: item.approvalCode }); }}>编辑</button>
                        <button type="button" aria-label={`${item.approvalCode} 同步表单控件`} disabled={loadingCodes.has(`form:${item.approvalCode}`)} onClick={() => handleSyncFormFields(item.approvalCode)}>{loadingCodes.has(`form:${item.approvalCode}`) ? '同步中…' : '同步表单控件'}</button>
                        <button type="button" aria-label={`${item.approvalCode} 同步流程节点`} disabled={loadingCodes.has(`node:${item.approvalCode}`)} onClick={() => handleSyncNodes(item.approvalCode)}>{loadingCodes.has(`node:${item.approvalCode}`) ? '同步中…' : '同步流程节点'}</button>
                        <button type="button" aria-label={`${item.approvalCode} 手动维护节点`} onClick={() => { setActionMessage('已进入手动维护节点模式，请确保 custom_node_id 与飞书后台一致'); setTimeout(() => setActionMessage(''), 3000); }}>手动维护节点</button>
                        <button type="button" aria-label={`${item.approvalCode} ${item.status === '启用' ? '停用' : '启用'}`} onClick={() => { setFlows(prev => prev.map(row => row.approvalCode === item.approvalCode ? { ...row, status: row.status === '启用' ? '停用' : '启用' } : row)); setActionMessage(`飞书流程 ${item.name} 已${item.status === '启用' ? '停用' : '启用'}`); setTimeout(() => setActionMessage(''), 3000); }}>{item.status === '启用' ? '停用' : '启用'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </>
      ) : null}

      {tab === 'routes' ? (
        <>
          <div className="permission-management__panel-actions">
            <p className="permission-management__hint">审批路由按优先级从小到大命中第一条；兜底规则用于避免新工单无流程可走。</p>
            <Button variant="primary" size="sm" onClick={() => { setRouteForm({ ...emptyRouteForm, split: '不拆分' }); setRouteDrawer({ mode: 'create' }); }}>+ 新建路由规则</Button>
          </div>
          <TableShell>
            <table>
              <thead><tr><th>规则名称</th><th>工单类型</th><th>条件摘要</th><th>飞书流程</th><th>节点审批方案</th><th>拆分方式</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {routeRules.map(rule => (
                  <tr key={rule.name}>
                    <td><strong>{rule.name}</strong>{rule.isFallback ? <span>兜底规则</span> : null}</td>
                    <td>{rule.workOrderType}</td>
                    <td>{rule.conditionSummary}</td>
                    <td><Tag tone="blue">{rule.flow}</Tag></td>
                    <td>{rule.nodeScheme}</td>
                    <td>{rule.split}</td>
                    <td>{rule.priority}</td>
                    <td><Tag tone={statusTone(rule.status)}>{rule.status}</Tag></td>
                    <td>
                      <div className="permission-management__row-actions">
                        <button type="button" onClick={() => { setRouteForm(rule); setRouteDrawer({ mode: 'edit', name: rule.name }); }}>编辑</button>
                        <button type="button" onClick={() => { setRouteForm({ ...rule, name: `${rule.name}（复制）` }); setRouteDrawer({ mode: 'create' }); }}>复制</button>
                        <button type="button" onClick={() => { setRouteRules(prev => prev.filter(r => r.name !== rule.name)); setActionMessage(`路由规则「${rule.name}」已删除`); setTimeout(() => setActionMessage(''), 3000); }}>删除</button>
                        <button type="button" onClick={() => { setRouteRules(prev => prev.map(row => row.name === rule.name ? { ...row, status: row.status === '启用' ? '停用' : '启用' } : row)); setActionMessage(`路由规则「${rule.name}」已${rule.status === '启用' ? '停用' : '启用'}`); setTimeout(() => setActionMessage(''), 3000); }}>{rule.status === '启用' ? '停用' : '启用'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </>
      ) : null}

      {tab === 'approver-rules' ? (
        <>
          <div className="permission-management__panel-actions">
            <div>
              <p className="permission-management__hint">审批人规则定义审批人解析逻辑和表单填充规则；节点审批方案为每个飞书流程的节点绑定审批人规则（多节点时）。</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => { setApproverForm(emptyApproverForm); setApproverDrawer({ mode: 'create' }); }}>+ 新建审批规则</Button>
          </div>

          {/* 审批规则表格 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>审批人解析规则</div>
            <TableShell>
              <table>
                <thead>
                  <tr>
                    <th>规则名称</th>
                    <th>审批人解析</th>
                    <th>解析来源</th>
                    <th>审批方式</th>
                    <th>兜底策略</th>
                    <th>表单填充</th>
                    <th>校验</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {approverRules.map(rule => (
                    <tr key={rule.name}>
                      <td><strong>{rule.name}</strong></td>
                      <td>{rule.resolveType}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{rule.source}</td>
                      <td>{rule.approvalMode}</td>
                      <td>{rule.fallbackEnabled ? <><Tag tone="warning">{rule.fallbackType}</Tag> {rule.fallbackTarget}</> : <span style={{ color: 'var(--text-tertiary)' }}>无</span>}</td>
                      <td>
                        {rule.formFillingRules.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {rule.formFillingRules.map((fr, i) => (
                              <span key={i} className="tag" data-tone={fr.mappingType === 'rule' ? 'warning' : 'blue'} title={fr.mappingType === 'rule' && fr.ruleMapping ? Object.entries(fr.ruleMapping).map(([k, v]) => `${k}→${v}`).join(', ') : fr.sourceField || ''}>
                                {fr.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>直接映射</span>
                        )}
                      </td>
                      <td><Tag tone={fieldStatusTone(rule.checkStatus)}>{rule.checkStatus}</Tag></td>
                      <td><Tag tone={statusTone(rule.status)}>{rule.status}</Tag></td>
                      <td>
                        <div className="permission-management__row-actions">
                          <button type="button" onClick={() => { setApproverForm(rule); setApproverDrawer({ mode: 'edit', name: rule.name }); }}>编辑</button>
                          <button type="button" onClick={async () => { setApproverRules(prev => prev.map(row => row.name === rule.name ? { ...row, checkStatus: '校验中' } : row)); await new Promise(r => setTimeout(r, 800)); setApproverRules(prev => prev.map(row => row.name === rule.name ? { ...row, checkStatus: '已校验' } : row)); setActionMessage(`审批规则「${rule.name}」校验通过`); setTimeout(() => setActionMessage(''), 3000); }}>校验</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>

          {/* 节点审批方案表格 */}
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>节点审批方案（多节点流程时使用）</div>
            <TableShell>
              <table>
                <thead>
                  <tr>
                    <th>方案名称</th>
                    <th>绑定飞书流程</th>
                    <th>节点绑定</th>
                    <th>方案兜底</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {nodeSchemes.map(scheme => (
                    <tr key={scheme.name}>
                      <td><strong>{scheme.name}</strong></td>
                      <td><Tag tone="blue">{scheme.flow}</Tag></td>
                      <td>
                        <div className="permission-management__node-list">
                          {scheme.nodes.map(node => (
                            <span key={node.nodeId} title={feishuApprovalNodes[scheme.flow]?.find(item => item.nodeId === node.nodeId)?.name || node.nodeName}>
                              {node.nodeId} → {node.approverRule}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{scheme.schemeFallbackRule}</td>
                      <td><Tag tone={statusTone(scheme.status)}>{scheme.status}</Tag></td>
                      <td>
                        <div className="permission-management__row-actions">
                          <button type="button" onClick={() => { setNodeSchemeForm(scheme); setNodeSchemeDrawer({ mode: 'edit', name: scheme.name }); }}>编辑</button>
                          <button type="button" onClick={() => { setNodeSchemes(prev => prev.map(row => row.name === scheme.name ? { ...row, status: row.status === '启用' ? '停用' : '启用' } : row)); setActionMessage(`节点方案「${scheme.name}」已${scheme.status === '启用' ? '停用' : '启用'}`); setTimeout(() => setActionMessage(''), 3000); }}>{scheme.status === '启用' ? '停用' : '启用'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          </div>
        </>
      ) : null}

      {tab === 'sync' ? (
        <>
          <div className="permission-management__health-grid">
            <div className="permission-management__card"><strong>事件订阅正常</strong><span>4 个 approval_code 已订阅</span></div>
            <div className="permission-management__card"><strong>待同步实例</strong><span>12 个审批中实例被补偿轮询覆盖</span></div>
            <div className="permission-management__card"><strong>审批人异常</strong><span>3 名员工缺少 open_id</span></div>
            <div className="permission-management__card"><strong>飞书流程异常</strong><span>1 个字段映射待校验</span></div>
          </div>
          <div className="permission-management__panel-actions">
            <Button size="sm" onClick={async () => { setActionMessage('正在触发批量补偿同步…'); await new Promise(r => setTimeout(r, 1200)); setActionMessage('批量补偿同步完成，共补偿 12 个审批中实例'); setTimeout(() => setActionMessage(''), 4000); }}>批量补偿同步</Button>
            <Button size="sm" onClick={async () => { setActionMessage('正在校验飞书流程配置…'); await new Promise(r => setTimeout(r, 1000)); setActionMessage('重新校验完成：1 个字段映射待处理'); setTimeout(() => setActionMessage(''), 4000); }}>重新校验飞书流程</Button>
            <Button size="sm" onClick={() => { setActionMessage('已打开最近 24 小时回调日志（模拟）'); setTimeout(() => setActionMessage(''), 3000); }}>查看回调日志</Button>
          </div>
          <TableShell>
            <table>
              <thead><tr><th>监控项</th><th>类型</th><th>级别</th><th>状态</th><th>对象</th><th>说明</th><th>更新时间</th></tr></thead>
              <tbody>
                {syncMonitorItems.map(item => (
                  <tr key={item.name}>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.kind}</td>
                    <td><Tag tone={severityTone(item.severity)}>{item.severity}</Tag></td>
                    <td>{item.status}</td>
                    <td>{item.target}</td>
                    <td>{item.detail}</td>
                    <td>{item.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </>
      ) : null}

            {flowModal ? (
        <div className="permission-management__modal-overlay" onClick={closeFlowModal}>
          <div className="permission-management__modal" onClick={event => event.stopPropagation()}>
            <div className="permission-management__modal-header">
              <h3>{flowModal.mode === 'edit' ? '编辑飞书流程' : '绑定飞书流程'}</h3>
              <button type="button" className="permission-management__modal-close" onClick={closeFlowModal}>×</button>
            </div>
            <div className="permission-management__modal-body">
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="flow-name">飞书流程名称</label><input id="flow-name" className="permission-management__form-input" value={flowForm.name} onChange={e => setFlowForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="flow-code">approval_code</label><input id="flow-code" className="permission-management__form-input" value={flowForm.approvalCode} onChange={e => setFlowForm(prev => ({ ...prev, approvalCode: e.target.value }))} />{duplicateFlowCode ? <span className="permission-management__form-error">approval_code 已存在</span> : null}</div>
              </div>
              <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="flow-desc">流程说明</label><textarea id="flow-desc" className="permission-management__form-textarea" value={flowForm.description} onChange={e => setFlowForm(prev => ({ ...prev, description: e.target.value }))} /></div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="flow-fields">表单控件映射状态</label><select id="flow-fields" className="permission-management__form-select" value={flowForm.formMappingStatus} onChange={e => setFlowForm(prev => ({ ...prev, formMappingStatus: e.target.value as FeishuApprovalFlow['formMappingStatus'] }))}><option>已校验</option><option>待校验</option><option>控件缺失</option></select></div>
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="flow-feishu-status">飞书启用状态</label><select id="flow-feishu-status" className="permission-management__form-select" value={flowForm.feishuStatus} onChange={e => setFlowForm(prev => ({ ...prev, feishuStatus: e.target.value as FeishuApprovalFlow['feishuStatus'] }))}><option>已启用</option><option>已停用</option><option>不存在</option><option>无权限访问</option></select></div>
              </div>
            </div>
            <div className="permission-management__modal-footer"><Button onClick={closeFlowModal}>取消</Button><Button variant="primary" disabled={!canSaveFlow} onClick={saveFlow}>保存</Button></div>
          </div>
        </div>
      ) : null}

      {routeDrawer ? (
        <div className="permission-management__drawer-overlay" onClick={closeRouteDrawer}>
          <aside className="permission-management__drawer" onClick={event => event.stopPropagation()}>
            <div className="permission-management__drawer-header"><h3>{routeDrawer.mode === 'edit' ? '编辑审批路由' : '新建审批路由'}</h3><button type="button" className="permission-management__modal-close" onClick={closeRouteDrawer}>×</button></div>
            <div className="permission-management__drawer-body">
              <div className="permission-management__form-section-title">基础信息</div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="route-name">规则名称 <span style={{ color: 'var(--danger)' }}>*</span></label><input id="route-name" className="permission-management__form-input" value={routeForm.name} onChange={e => setRouteForm(prev => ({ ...prev, name: e.target.value }))} /></div>
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="route-work-order">工单类型 <span style={{ color: 'var(--danger)' }}>*</span></label><select id="route-work-order" className="permission-management__form-select" value={routeForm.workOrderType} onChange={e => { const selected = e.target.value; const wot = workOrderTypes.find(w => w.name === selected); setRouteForm(prev => ({ ...prev, workOrderType: selected, nodeScheme: wot ? '' : prev.nodeScheme })); }}><option value="">请选择</option>{workOrderTypes.map(item => <option key={item.code} value={item.name}>{item.name}</option>)}</select></div>
              </div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="route-priority">优先级 <span style={{ color: 'var(--danger)' }}>*</span></label><input id="route-priority" type="number" className="permission-management__form-input" value={routeForm.priority} onChange={e => setRouteForm(prev => ({ ...prev, priority: Number(e.target.value) }))} /></div>
                <div className="permission-management__form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}><label className="permission-management__checkbox-line"><input type="checkbox" checked={routeForm.isFallback} onChange={e => setRouteForm(prev => ({ ...prev, isFallback: e.target.checked }))} />是否兜底</label></div>
              </div>

              {currentWorkOrderType ? (
                <>
                  <div className="permission-management__form-section-title">路由结果</div>
                  <div className="permission-management__form-row-2col">
                    <div className="permission-management__form-group">
                      <label className="permission-management__form-label">飞书流程</label>
                      <div className="permission-management__flow-auto-tag">
                        <Tag tone="blue">{flowNameOf(currentWorkOrderType.bindingFlowCode)}</Tag>
                        <span className="permission-management__flow-auto-hint">自动带出，不可编辑</span>
                      </div>
                    </div>
                    <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="route-node-scheme">节点审批方案 <span style={{ color: 'var(--danger)' }}>*</span></label><select id="route-node-scheme" className="permission-management__form-select" value={routeForm.nodeScheme} disabled={availableNodeSchemes.length === 0} onChange={e => setRouteForm(prev => ({ ...prev, nodeScheme: e.target.value }))}><option value="">请选择</option>{availableNodeSchemes.map(scheme => <option key={scheme.name} value={scheme.name}>{scheme.name}</option>)}</select></div>
                  </div>
                  <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="route-split">拆分方式 <span style={{ color: 'var(--danger)' }}>*</span></label><select id="route-split" className="permission-management__form-select" value={routeForm.split} onChange={e => setRouteForm(prev => ({ ...prev, split: e.target.value }))}><option value="">请选择</option><option>不拆分</option><option>按审批人分组</option><option>按接收人分组</option><option>按治理负责人分组</option></select></div>

                  {currentWorkOrderType.applicableConditions.length > 0 ? (
                    <>
                      <div className="permission-management__form-section-title">命中条件</div>
                      {currentWorkOrderType.applicableConditions.includes('objectTypes') && (
                        <ConditionFieldCheckbox
                          label="对象类型"
                          options={[
                            { value: '表', label: '表' },
                            { value: '视图', label: '视图' },
                            { value: 'API', label: 'API' },
                            { value: '指标', label: '指标' },
                            { value: '报表', label: '报表' },
                          ]}
                          value={routeForm.objectTypes}
                          onChange={vals => setRouteForm(prev => ({ ...prev, objectTypes: vals }))}
                        />
                      )}
                      {currentWorkOrderType.applicableConditions.includes('securityLevels') && (
                        <ConditionFieldCheckbox
                          label="安全等级"
                          options={[
                            { value: 'S1', label: 'S1' },
                            { value: 'S2', label: 'S2' },
                            { value: 'S3', label: 'S3' },
                            { value: 'S4', label: 'S4' },
                            { value: 'S5', label: 'S5' },
                          ]}
                          value={routeForm.securityLevels}
                          onChange={vals => setRouteForm(prev => ({ ...prev, securityLevels: vals }))}
                        />
                      )}
                    </>
                  ) : null}
                </>
              ) : (
                <p className="permission-management__hint" style={{ marginTop: 16 }}>请先选择工单类型，路由结果将自动带出。</p>
              )}
            </div>
            <div className="permission-management__drawer-footer"><Button onClick={closeRouteDrawer}>取消</Button><Button variant="primary" disabled={!canSaveRoute} onClick={saveRoute}>保存</Button></div>
          </aside>
        </div>
      ) : null}

      {approverDrawer ? (
        <div className="permission-management__drawer-overlay" onClick={closeApproverDrawer}>
          <aside className="permission-management__drawer" onClick={event => event.stopPropagation()}>
            <div className="permission-management__drawer-header"><h3>{approverDrawer.mode === 'edit' ? '编辑审批人规则' : '新建审批人规则'}</h3><button type="button" className="permission-management__modal-close" onClick={closeApproverDrawer}>×</button></div>
            <div className="permission-management__drawer-body">
              <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="approver-name">规则名称</label><input id="approver-name" className="permission-management__form-input" value={approverForm.name} onChange={e => setApproverForm(prev => ({ ...prev, name: e.target.value }))} /></div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="approver-resolve">解析方式</label><select id="approver-resolve" className="permission-management__form-select" value={approverForm.resolveType} onChange={e => setApproverForm(prev => ({ ...prev, resolveType: e.target.value }))}><option>资源技术负责人</option><option>资源业务负责人</option><option>业务域负责人</option><option>申请目标人</option><option>指定角色</option><option>固定人员</option></select></div>
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="approver-mode">审批方式</label><select id="approver-mode" className="permission-management__form-select" value={approverForm.approvalMode} onChange={e => setApproverForm(prev => ({ ...prev, approvalMode: e.target.value as ApproverRule['approvalMode'] }))}><option>单人审批</option><option>或签</option><option>会签</option></select></div>
              </div>
              <label className="permission-management__checkbox-line"><input aria-label="启用兜底" type="checkbox" checked={approverForm.fallbackEnabled} onChange={e => setApproverForm(prev => ({ ...prev, fallbackEnabled: e.target.checked }))} />启用兜底</label>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="fallback-type">兜底类型</label><select id="fallback-type" className="permission-management__form-select" value={approverForm.fallbackType} onChange={e => setApproverForm(prev => ({ ...prev, fallbackType: e.target.value }))}><option>指定角色</option><option>固定人员</option><option>解析规则</option></select></div>
                <div className="permission-management__form-group"><label className="permission-management__form-label" htmlFor="fallback-target">兜底对象</label><input id="fallback-target" className="permission-management__form-input" value={approverForm.fallbackTarget} onChange={e => setApproverForm(prev => ({ ...prev, fallbackTarget: e.target.value }))} /></div>
              </div>
            </div>
            <div className="permission-management__drawer-footer"><Button onClick={closeApproverDrawer}>取消</Button><Button variant="primary" disabled={!canSaveApprover} onClick={saveApprover}>保存</Button></div>
          </aside>
        </div>
      ) : null}

      {nodeSchemeDrawer ? (
        <div className="permission-management__drawer-overlay" onClick={closeNodeSchemeDrawer}>
          <aside className="permission-management__drawer" onClick={event => event.stopPropagation()}>
            <div className="permission-management__drawer-header">
              <h3>{nodeSchemeDrawer.mode === 'edit' ? '编辑节点审批方案' : '新建节点审批方案'}</h3>
              <button type="button" className="permission-management__modal-close" onClick={closeNodeSchemeDrawer}>×</button>
            </div>
            <div className="permission-management__drawer-body">
              <div className="permission-management__form-section-title">基础信息</div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="node-scheme-name">方案名称</label>
                  <input id="node-scheme-name" className="permission-management__form-input" value={nodeSchemeForm.name} onChange={e => setNodeSchemeForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="node-scheme-flow">绑定飞书流程</label>
                  <select
                    id="node-scheme-flow"
                    className="permission-management__form-select"
                    value={nodeSchemeForm.flow}
                    onChange={e => {
                      const flow = e.target.value;
                      setNodeSchemeForm(prev => ({
                        ...prev,
                        flow,
                        nodes: hydrateNodeSchemeNodes(flow),
                      }));
                    }}
                  >
                    <option value="">请选择</option>
                    {flows.map(flow => <option key={flow.approvalCode} value={flow.approvalCode}>{flow.approvalCode}</option>)}
                  </select>
                </div>
              </div>

              <div className="permission-management__form-section-title">节点绑定</div>
              <div className="permission-management__node-editor">
                {nodeSchemeForm.nodes.length ? nodeSchemeForm.nodes.map(node => (
                  <div className="permission-management__node-editor-row" key={node.nodeId}>
                    <div>
                      <strong>{node.nodeId}</strong>
                      <span>{node.nodeName} / {node.approvalMode}</span>
                    </div>
                    <div className="permission-management__form-group">
                      <label className="permission-management__form-label" htmlFor={`node-rule-${node.nodeId}`}>{node.nodeId} 审批人解析规则</label>
                      <select
                        id={`node-rule-${node.nodeId}`}
                        className="permission-management__form-select"
                        value={node.approverRule}
                        onChange={e => setNodeSchemeForm(prev => ({
                          ...prev,
                          nodes: prev.nodes.map(item => item.nodeId === node.nodeId ? { ...item, approverRule: e.target.value } : item),
                        }))}
                      >
                        <option value="">请选择</option>
                        {approverRules.filter(rule => rule.status === '启用').map(rule => <option key={rule.name} value={rule.name}>{rule.name}</option>)}
                      </select>
                    </div>
                  </div>
                )) : (
                  <p className="permission-management__hint">先选择飞书流程，平台会按流程节点同步结果带出 custom_node_id。</p>
                )}
              </div>

              <div className="permission-management__form-section-title">兜底与状态</div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="node-scheme-fallback">方案级兜底</label>
                  <select id="node-scheme-fallback" className="permission-management__form-select" value={nodeSchemeForm.schemeFallbackRule} onChange={e => setNodeSchemeForm(prev => ({ ...prev, schemeFallbackRule: e.target.value }))}>
                    <option value="">请选择</option>
                    <option>数据管理员</option>
                    {approverRules.filter(rule => rule.status === '启用').map(rule => <option key={rule.name} value={rule.name}>{rule.name}</option>)}
                  </select>
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="node-scheme-status">状态</label>
                  <select id="node-scheme-status" className="permission-management__form-select" value={nodeSchemeForm.status} onChange={e => setNodeSchemeForm(prev => ({ ...prev, status: e.target.value as NodeApprovalScheme['status'] }))}>
                    <option>启用</option>
                    <option>停用</option>
                  </select>
                </div>
              </div>
              <p className="permission-management__hint">飞书后台决定节点顺序，平台只把每个 custom_node_id 解析成 open_id 并传给飞书审批实例。</p>
            </div>
            <div className="permission-management__drawer-footer">
              <Button onClick={closeNodeSchemeDrawer}>取消</Button>
              <Button variant="primary" disabled={!canSaveNodeScheme} onClick={saveNodeScheme}>保存</Button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function LegacyApprovalRoutingManagementPanel() {
  return null;
  /*
  const [tab, setTab] = useState<ManagementTab>('flows');
  const [routeRules, setRouteRules] = useState<ApprovalRouteRule[]>(approvalRouteRules);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeForm, setRouteForm] = useState<ApprovalRouteRule>({
    name: '',
    condition: '',
    flow: feishuApprovalDefinitions[0].approvalCode,
    approverRule: approverResolutionRules[0].name,
    split: '不拆分',
    status: '启用',
  });

  const resetRouteForm = () => {
    setRouteForm({
      name: '',
      condition: '',
      flow: feishuApprovalDefinitions[0].approvalCode,
      approverRule: approverResolutionRules[0].name,
      split: '不拆分',
      status: '启用',
    });
  };

  const closeRouteModal = () => {
    setIsRouteModalOpen(false);
    resetRouteForm();
  };

  const canSaveRouteRule = Boolean(
    routeForm.name.trim() &&
    routeForm.condition.trim() &&
    routeForm.flow &&
    routeForm.approverRule &&
    routeForm.split,
  );

  const saveRouteRule = () => {
    if (!canSaveRouteRule) return;
    setRouteRules(prev => [{
      ...routeForm,
      name: routeForm.name.trim(),
      condition: routeForm.condition.trim(),
    }, ...prev]);
    closeRouteModal();
  };

  return (
    <section className="permission-management__panel">
      <h2>审批管理</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="审批管理">
        <button type="button" role="tab" aria-selected={tab === 'flows'} className={tab === 'flows' ? 'active' : ''} onClick={() => setTab('flows')}>飞书流程库</button>
        <button type="button" role="tab" aria-selected={tab === 'routes'} className={tab === 'routes' ? 'active' : ''} onClick={() => setTab('routes')}>审批路由规则</button>
        <button type="button" role="tab" aria-selected={tab === 'approvers'} className={tab === 'approvers' ? 'active' : ''} onClick={() => setTab('approvers')}>审批人解析</button>
        <button type="button" role="tab" aria-selected={tab === 'sync'} className={tab === 'sync' ? 'active' : ''} onClick={() => setTab('sync')}>同步监控</button>
      </div>

      {tab === 'flows' ? (
        <>
          <p className="permission-management__hint">流程在飞书后台配置，平台只维护 approval_code、字段映射和可用性校验。</p>
          <div className="permission-management__definition-grid" aria-label="飞书流程库">
            <div className="permission-management__section-title">飞书流程库</div>
            {feishuApprovalDefinitions.map((definition) => (
              <div className="permission-management__definition-card" key={definition.approvalCode}>
                <div className="permission-management__definition-card-head">
                  <strong>{definition.name}</strong>
                  <Tag tone="blue">{definition.approvalCode}</Tag>
                </div>
                <p>{definition.scope}</p>
                <span>{definition.form}</span>
                <div className="permission-management__definition-meta">
                  <Tag tone={definition.status === '已启用' ? 'success' : 'gray'}>{definition.status}</Tag>
                  <Tag tone={definition.formMappingStatus === '已校验' ? 'success' : 'warning'}>{definition.formMappingStatus}</Tag>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {tab === 'routes' ? (
        <>
          <div className="permission-management__panel-actions"><Button variant="primary" size="sm" onClick={() => setIsRouteModalOpen(true)}>+ 新建路由规则</Button></div>
          <TableShell>
            <table>
              <thead><tr><th>规则名称</th><th>触发条件</th><th>走哪个飞书流程</th><th>审批人规则</th><th>拆分方式</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {routeRules.map((rule) => (
                  <tr key={rule.name}>
                    <td><strong>{rule.name}</strong></td>
                    <td>{rule.condition}</td>
                    <td><Tag tone="blue">{rule.flow}</Tag></td>
                    <td>{rule.approverRule}</td>
                    <td>{rule.split}</td>
                    <td><Tag tone={statusTone(rule.status)}>{rule.status}</Tag></td>
                    <td>
                      <div className="permission-management__row-actions">
                        <button type="button">编辑</button>
                        <button type="button" className="danger">停用</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <p className="permission-management__hint">审批路由决定“什么业务走哪个飞书 approval_code”。飞书后台负责流程节点，平台负责业务条件、表单字段映射、审批人解析和拆分策略。</p>
        </>
      ) : null}

      {tab === 'approvers' ? (
        <TableShell>
          <table>
            <thead><tr><th>审批人规则</th><th>解析来源</th><th>异常兜底</th><th>飞书用户映射</th><th>操作</th></tr></thead>
            <tbody>
              {approverResolutionRules.map((rule) => (
                <tr key={rule.name}>
                  <td><strong>{rule.name}</strong></td>
                  <td>{rule.source}</td>
                  <td>{rule.fallback}</td>
                  <td>{rule.feishuMapping}</td>
                  <td>
                    <div className="permission-management__row-actions">
                      <button type="button">编辑</button>
                      <button type="button">校验</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      ) : null}

      {tab === 'sync' ? (
        <div className="permission-management__monitor-grid">
          {syncMonitorItems.map((item) => (
            <div className="permission-management__monitor-card" key={item.name}>
              <div className="permission-management__monitor-head">
                <strong>{item.name}</strong>
                <Tag tone={item.status === '正常' ? 'success' : 'warning'}>{item.status}</Tag>
              </div>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {isRouteModalOpen ? (
        <div className="permission-management__modal-overlay" onClick={closeRouteModal}>
          <div className="permission-management__modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="permission-management__modal-header">
              <h3>新建路由规则</h3>
              <button type="button" className="permission-management__modal-close" onClick={closeRouteModal}>×</button>
            </div>
            <div className="permission-management__modal-body">
              <div className="permission-management__form-group">
                <label className="permission-management__form-label" htmlFor="route-rule-name">规则名称 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="route-rule-name"
                  aria-label="规则名称"
                  className="permission-management__form-input"
                  value={routeForm.name}
                  onChange={e => setRouteForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="如：资源治理：上架单独审批"
                />
              </div>
              <div className="permission-management__form-group">
                <label className="permission-management__form-label" htmlFor="route-rule-condition">触发条件 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  id="route-rule-condition"
                  aria-label="触发条件"
                  className="permission-management__form-input"
                  value={routeForm.condition}
                  onChange={e => setRouteForm(prev => ({ ...prev, condition: e.target.value }))}
                  placeholder="如：工单类型 = 上架申请"
                />
              </div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="route-rule-flow">走哪个飞书流程 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="route-rule-flow"
                    aria-label="走哪个飞书流程"
                    className="permission-management__form-select"
                    value={routeForm.flow}
                    onChange={e => setRouteForm(prev => ({ ...prev, flow: e.target.value }))}
                  >
                    {feishuApprovalDefinitions.map((definition) => (
                      <option key={definition.approvalCode} value={definition.approvalCode}>{definition.approvalCode}</option>
                    ))}
                  </select>
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="route-rule-approver">审批人规则 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="route-rule-approver"
                    aria-label="审批人规则"
                    className="permission-management__form-select"
                    value={routeForm.approverRule}
                    onChange={e => setRouteForm(prev => ({ ...prev, approverRule: e.target.value }))}
                  >
                    {approverResolutionRules.map((rule) => (
                      <option key={rule.name} value={rule.name}>{rule.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="route-rule-split">拆分方式 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    id="route-rule-split"
                    aria-label="拆分方式"
                    className="permission-management__form-select"
                    value={routeForm.split}
                    onChange={e => setRouteForm(prev => ({ ...prev, split: e.target.value }))}
                  >
                    <option value="不拆分">不拆分</option>
                    <option value="按审批人分组">按审批人分组</option>
                    <option value="按接收人分组">按接收人分组</option>
                    <option value="按治理负责人分组">按治理负责人分组</option>
                  </select>
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label" htmlFor="route-rule-status">状态</label>
                  <select
                    id="route-rule-status"
                    aria-label="状态"
                    className="permission-management__form-select"
                    value={routeForm.status}
                    onChange={e => setRouteForm(prev => ({ ...prev, status: e.target.value as ApprovalRouteRule['status'] }))}
                  >
                    <option value="启用">启用</option>
                    <option value="停用">停用</option>
                  </select>
                </div>
              </div>
              <p className="permission-management__hint">保存后只更新当前原型表格，正式接入后会提交到审批路由配置接口。</p>
            </div>
            <div className="permission-management__modal-footer">
              <Button onClick={closeRouteModal}>取消</Button>
              <Button variant="primary" onClick={saveRouteRule} disabled={!canSaveRouteRule}>保存</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

  */
}

function ApprovalManagementPanel() {
  return <ApprovalRoutingManagementPanel />;
  /*

  const [tab, setTab] = useState<ManagementTab>('templates');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [tplName, setTplName] = useState('');
  const [tplPriority, setTplPriority] = useState(3);
  const [tplAssetType, setTplAssetType] = useState('全部');
  const [tplNodes, setTplNodes] = useState<TplNode[]>([{ kind: 'superior' }, { kind: 'owner' }]);
  const [roleName, setRoleName] = useState('');
  const [roleMembers, setRoleMembers] = useState<string[]>([]);

  const openTplModal = (editIndex?: number) => {
    if (editIndex !== undefined) {
      const t = approvalTemplates[editIndex];
      setTplName(t.name);
      setTplPriority(t.priority);
    } else {
      setTplName('');
      setTplPriority(3);
    }
    setTplAssetType('全部');
    setTplNodes([{ kind: 'superior' }, { kind: 'owner' }]);
    setModal({ type: 'tpl', editIndex });
  };

  const openRoleModal = (editIndex?: number) => {
    if (editIndex !== undefined) {
      const r = approvalRoles[editIndex];
      setRoleName(r.name);
      setRoleMembers(r.members.split('、'));
    } else {
      setRoleName('');
      setRoleMembers([]);
    }
    setModal({ type: 'role', editIndex });
  };

  const addNode = () => setTplNodes(prev => [...prev, { kind: 'owner' }]);
  const removeNode = (idx: number) => { if (tplNodes.length > 1) setTplNodes(prev => prev.filter((_, i) => i !== idx)); };
  const updateNode = (idx: number, kind: TplNode['kind']) => setTplNodes(prev => prev.map((n, i) => i === idx ? { ...n, kind } : n));

  const addRoleMember = () => { if (roleName.trim()) setRoleMembers(prev => [...prev, '新成员']); };
  const removeRoleMember = (idx: number) => setRoleMembers(prev => prev.filter((_, i) => i !== idx));

  const nodeKindLabels: Record<TplNode['kind'], string> = {
    superior: '申请人上级',
    owner: '资产负责人',
    role: '指定角色',
    person: '固定审批人',
  };

  return (
    <section className="permission-management__panel">
      <h2>审批管理</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="审批管理">
        <button type="button" role="tab" aria-selected={tab === 'templates'} className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}>审批模板</button>
        <button type="button" role="tab" aria-selected={tab === 'roles'} className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}>审批角色</button>
      </div>
      {tab === 'templates' ? (
        <>
          <div className="permission-management__panel-actions"><Button variant="primary" size="sm" onClick={() => openTplModal()}>+ 新建模板</Button></div>
          <div className="permission-management__definition-grid" aria-label="飞书定义映射">
            <div className="permission-management__section-title">飞书定义映射</div>
            {feishuApprovalDefinitions.map((definition) => (
              <div className="permission-management__definition-card" key={definition.approvalCode}>
                <div className="permission-management__definition-card-head">
                  <strong>{definition.name}</strong>
                  <Tag tone="blue">{definition.approvalCode}</Tag>
                </div>
                <p>{definition.scope}</p>
                <span>{definition.form}</span>
              </div>
            ))}
          </div>
          <TableShell>
            <table>
              <thead><tr><th>模板名称</th><th>匹配条件</th><th>审批人规则</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {approvalTemplates.map((template, idx) => (
                  <tr key={template.name}>
                    <td><strong>{template.name}</strong></td>
                    <td><div className="permission-management__tag-list">{template.condition.map((item) => <Tag key={item} tone={item === '数据表' ? 'blue' : item === '报表' ? 'warning' : 'gray'}>{item}</Tag>)}</div></td>
                    <td>{template.approverRule}</td>
                    <td>{template.priority}</td>
                    <td><Tag tone="success">{template.status}</Tag></td>
                    <td>
                      <div className="permission-management__row-actions">
                        <button type="button" onClick={() => openTplModal(idx)}>编辑</button>
                        <button type="button" className={template.name === '默认兜底模板' ? 'muted' : 'danger'}>停用</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
          <p className="permission-management__hint">平台只维护规则，流程节点在飞书后台维护。优先级数字越小越优先。匹配时按优先级从小到大遍历，取第一个命中的模板。兜底模板不可停用。</p>
        </>
      ) : (
        <>
          <div className="permission-management__panel-actions"><Button variant="primary" size="sm" onClick={() => openRoleModal()}>+ 新建角色</Button></div>
          <TableShell>
            <table>
              <thead><tr><th>角色名称</th><th>成员</th><th>飞书用户映射</th><th>审批方式</th><th>被引用</th><th>操作</th></tr></thead>
              <tbody>
                {approvalRoles.map((role, idx) => (
                  <tr key={role.name}>
                    <td><strong>{role.name}</strong></td>
                    <td>{role.members}</td>
                    <td>{role.feishuUser}</td>
                    <td>{role.mode}</td>
                    <td><Tag tone={role.referenced.includes('模板') ? 'blue' : 'gray'}>{role.referenced}</Tag></td>
                    <td>
                      <div className="permission-management__row-actions">
                        <button type="button" onClick={() => openRoleModal(idx)}>编辑</button>
                        <button type="button" className="muted">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>
        </>
      )}
      {modal.type === 'tpl' ? (
        <div className="permission-management__modal-overlay" onClick={() => setModal({ type: 'none' })}>
          <div className="permission-management__modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="permission-management__modal-header">
              <strong>{modal.editIndex !== undefined ? '编辑审批模板' : '新建审批模板'}</strong>
              <button type="button" className="permission-management__modal-close" onClick={() => setModal({ type: 'none' })}>×</button>
            </div>
            <div className="permission-management__modal-body">
              <div className="permission-management__form-group">
                <label className="permission-management__form-label">模板名称 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="permission-management__form-input" value={tplName} onChange={e => setTplName(e.target.value)} placeholder="如：报表-S3/S4安全等级" />
              </div>
              <div className="permission-management__form-section-title">匹配条件（至少选择一项）</div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label">资产类型</label>
                  <select className="permission-management__form-select" value={tplAssetType} onChange={e => setTplAssetType(e.target.value)}>
                    <option>全部</option><option>数据表</option><option>报表</option><option>API</option><option>指标</option><option>标签</option>
                  </select>
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label">来源平台</label>
                  <select className="permission-management__form-select"><option>全部</option><option>Hive</option><option>MySQL</option><option>报表平台</option><option>API网关</option></select>
                </div>
              </div>
              <div className="permission-management__form-section-title">审批人规则 <span style={{ color: 'var(--danger)' }}>*</span> <span className="permission-management__form-hint">平台解析审批人，飞书后台维护节点顺序</span></div>
              <div className="permission-management__tpl-nodes">
                {tplNodes.map((node, idx) => (
                  <div key={idx}>
                    <div className="permission-management__tpl-node">
                      <div className="permission-management__tpl-node-header">
                        <span>节点 {idx + 1}</span>
                        {tplNodes.length > 1 ? <button type="button" className="danger" onClick={() => removeNode(idx)}>删除</button> : <span className="permission-management__muted-text">至少保留一个节点</span>}
                      </div>
                      <div className="permission-management__tpl-node-body">
                        <select className="permission-management__form-select" value={node.kind} onChange={e => updateNode(idx, e.target.value as TplNode['kind'])}>
                          {Object.entries(nodeKindLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    {idx < tplNodes.length - 1 ? <div className="permission-management__tpl-arrow">↓ 串行</div> : null}
                  </div>
                ))}
              </div>
              <button type="button" className="permission-management__add-node-btn" onClick={addNode}>+ 添加审批节点</button>
              <div className="permission-management__form-section-title">其它</div>
              <div className="permission-management__form-row-2col">
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label">优先级 <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="permission-management__form-input" type="number" value={tplPriority} onChange={e => setTplPriority(Number(e.target.value))} min={1} max={99} />
                  <span className="permission-management__form-hint">1-99，数字越小越优先</span>
                </div>
                <div className="permission-management__form-group">
                  <label className="permission-management__form-label">状态</label>
                  <div className="permission-management__radio-group">
                    <label><input type="radio" name="tpl-status" defaultChecked /> 启用</label>
                    <label><input type="radio" name="tpl-status" /> 停用</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="permission-management__modal-footer">
              <Button onClick={() => setModal({ type: 'none' })}>取消</Button>
              <Button variant="primary" onClick={() => setModal({ type: 'none' })}>保存</Button>
            </div>
          </div>
        </div>
      ) : null}
      {modal.type === 'role' ? (
        <div className="permission-management__modal-overlay" onClick={() => setModal({ type: 'none' })}>
          <div className="permission-management__modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="permission-management__modal-header">
              <strong>{modal.editIndex !== undefined ? '编辑审批角色' : '新建审批角色'}</strong>
              <button type="button" className="permission-management__modal-close" onClick={() => setModal({ type: 'none' })}>×</button>
            </div>
            <div className="permission-management__modal-body">
              <div className="permission-management__form-group">
                <label className="permission-management__form-label">角色名称 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="permission-management__form-input" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="如：金融业务线审批人" />
              </div>
              <div className="permission-management__form-group">
                <label className="permission-management__form-label">成员 <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input className="permission-management__form-input" placeholder="搜索姓名或工号..." />
                <div className="permission-management__member-tags">
                  {roleMembers.map((m, i) => (
                    <Tag key={i} tone="blue">{m} <span className="permission-management__member-remove" onClick={() => removeRoleMember(i)}>×</span></Tag>
                  ))}
                </div>
                <span className="permission-management__form-hint">多人时审批为或签（任一人通过即可）</span>
              </div>
            </div>
            <div className="permission-management__modal-footer">
              <Button onClick={() => setModal({ type: 'none' })}>取消</Button>
              <Button variant="primary" onClick={() => { addRoleMember(); setModal({ type: 'none' }); }}>保存</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

  */
}

function ApprovalRecordsPanel() {
  const [tab, setTab] = useState<RecordCategory>('all');
  const filtered = useMemo(() => {
    if (tab === 'all') return approvalRecords;
    return approvalRecords.filter(r => r.category === tab);
  }, [tab]);

  return (
    <section className="permission-management__panel">
      <h2>审批记录</h2>
      <div className="permission-management__tabs" role="tablist" aria-label="审批记录类型">
        {([['all', '全部'], ['权限', '权限申请'], ['治理', '治理操作']] as const).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key as RecordCategory)}>{label}</button>
        ))}
      </div>
      <TableShell>
        <table aria-label="审批记录列表">
          <thead><tr><th>审批编号</th><th>类别</th><th>申请人</th><th>操作/资产</th><th>申请时间</th><th>审批人</th><th>审批时间</th><th>结果</th></tr></thead>
          <tbody>
            {filtered.map((record) => (
              <tr key={record.id}>
                <td className="primary">{record.id}</td>
                <td><Tag tone={categoryTone(record.category)}>{record.category}</Tag></td>
                <td>{record.applicant}</td>
                <td>{record.target}</td>
                <td>{record.applyTime}</td>
                <td>{record.approver}</td>
                <td>{record.approveTime}</td>
                <td><Tag tone={statusTone(record.result)}>{record.result}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </section>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="permission-management__table-wrap">{children}</div>;
}

export function PermissionManagementPage() {
  const [activeSection, setActiveSection] = useState<PermissionSection>(() => getPermissionSectionFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      const nextSection = getPermissionSectionFromHash();
      if (nextSection !== activeSection) setActiveSection(nextSection);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeSection]);

  return (
    <section className="permission-management">
      <aside className="permission-management__sidebar">
        <div className="permission-management__sidebar-title">审批中心</div>
        <nav aria-label="审批中心导航">
          {navItems.map((item, index) => (
            <div key={item.key}>
              {item.group && index === 2 ? <div className="permission-management__sidebar-group">{item.group}</div> : null}
              <button type="button" className={activeSection === item.key ? 'active' : ''} onClick={() => setActiveSection(item.key)}>
                {item.label}
                {item.badge ? <b>{item.badge}</b> : null}
              </button>
            </div>
          ))}
        </nav>
      </aside>
      <main className="permission-management__main">
        <header className="permission-management__header">
          <div>
            <h1>审批中心</h1>
            <p>按工单视角查看我提交的申请，并处理待我审批。</p>
          </div>
        </header>
        {activeSection === 'tickets' ? <TicketQueryPanel /> : null}
        {activeSection === 'pending' ? <PendingApprovalPanel /> : null}
        {activeSection === 'approval-management' ? <ApprovalRoutingManagementPanel /> : null}
        {activeSection === 'records' ? <ApprovalRecordsPanel /> : null}
      </main>
    </section>
  );
}
