export type Section = 'flows' | 'flow-detail' | 'roles' | 'submitted' | 'pending' | 'monitor';
export type DetailTab = 'basic' | 'form-mapping' | 'node-mapping' | 'route-rules';
export type FlowStatus = 'enabled' | 'disabled';
export type MappingStatus = 'complete' | 'incomplete' | 'not_configured';
export type ValidateStatus = 'passed' | 'failed' | 'not_validated';
export type ApprovalStatus = 'pending_submit' | 'approving' | 'approved' | 'rejected' | 'cancelled' | 'sync_error';
export type EffectStatus = 'not_effective' | 'effecting' | 'effective' | 'effect_failed';
export type SecurityLevel = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
export type RouteConditionValue = string | string[];
export type RouteMatchMode = 'exact' | 'include_descendants';
export type SourceType = 'warehouse_engine' | 'analytic_db' | 'business_db' | 'report_system' | 'api_service' | 'message_stream' | 'file_storage' | 'metric_platform';
export type SourceSystem = 'MaxCompute' | 'Hive' | 'SelectDB' | 'MySQL' | 'Oracle' | '万联灵析' | 'API网关' | 'Kafka' | 'OSS' | '指标平台';

export type FlowConfig = {
  id: string;
  ticketType: string;
  name: string;
  approvalCode: string;
  idType: 'open_id';
  status: FlowStatus;
  description: string;
  formMappingStatus: MappingStatus;
  nodeMappingStatus: MappingStatus;
  lastValidatedAt: string | null;
  validateStatus: ValidateStatus;
  validateError?: string;
  createdAt: string;
  updatedAt: string;
};

export type RouteCondition = {
  id: string;
  field: string;
  fieldLabel: string;
  operator: string;
  operatorLabel: string;
  value: RouteConditionValue;
  valueLabel: RouteConditionValue;
  matchMode?: RouteMatchMode;
};

export type FlowRoute = {
  id: string;
  flowConfigId: string;
  ticketType: string;
  priority: number;
  name: string;
  conditions: RouteCondition[];
  conditionLogic: 'AND' | 'OR';
  isDefault: boolean;
  enabled: boolean;
  description: string;
};

export type FormMapping = {
  id: string;
  flowConfigId: string;
  platformField: string;
  feishuWidgetId: string;
  widgetType: string;
  transformRule: string;
  required: boolean;
  usedInCondition: boolean;
  exampleValue: string;
};

export type NodeMapping = {
  id: string;
  flowConfigId: string;
  feishuNodeName: string;
  feishuNodeId: string;
  approverRuleType: 'direct_manager' | 'resource_owner' | 'directory_owner' | 'fixed_role';
  multiApproverMode: 'single' | 'countersign';
  missingAction: 'block' | 'fallback';
  enabled: boolean;
  description: string;
};

export type ApprovalRole = {
  id: string;
  roleCode: string;
  roleName: string;
  enabled: boolean;
  members: Array<{ name: string; openId: string; feishuBound: boolean }>;
};

export type ApprovalInstance = {
  id: string;
  subOrderNo: string;
  instanceCode: string;
  feishuUrl: string;
  status: ApprovalStatus;
  effectStatus: EffectStatus;
  assets: string[];
  securityLevel: SecurityLevel;
  permissionType: string;
  expireDate: string;
  directory: string;
  sourceType: SourceType;
  sourceSystem: SourceSystem;
  matchedFlow: string;
  matchedRoute: string;
  reason: string;
  ticketType?: string;
  approvers: Array<{
    nodeId: string;
    nodeName: string;
    mode: 'single' | 'countersign';
    approvers: Array<{ name: string; openId: string }>;
  }>;
  timeline: Array<{ action: string; operator: string; time: string; status: 'approved' | 'rejected' | 'pending' | 'system'; comment?: string }>;
};

export type ApprovalBatch = {
  id: string;
  batchId: string;
  ticketType: string;
  totalAssets: number;
  instanceCount: number;
  createdAt: string;
  status: ApprovalStatus;
  effectStatus: EffectStatus;
  instances: ApprovalInstance[];
};

export type PendingTask = {
  id: string;
  applicant: string;
  applicantDept: string;
  nodeName: string;
  waitingHours: number;
  assets: string[];
  securityLevel: SecurityLevel;
  permissionType: string;
  directory: string;
  sourceType: SourceType;
  sourceSystem: SourceSystem;
  matchedFlow: string;
  matchedRoute: string;
  reason: string;
  subOrderNo: string;
  instanceCode: string;
  createdAt: string;
  ticketType?: string;
  lineageApproval?: {
    objectId?: string;
    objectName?: string;
    objectDisplay?: string;
    correctionMode?: 'manual' | 'initialize';
    effectMode?: 'incremental' | 'full_rebuild';
    riskConfirmed?: boolean;
    initStats?: { add: number; delete: number; keep: number };
    changes: Array<{
      id: string;
      kind: 'relation' | 'field';
      action: 'add' | 'delete';
      direction: 'upstream' | 'downstream';
      sourceId: string;
      sourceName: string;
      targetId: string;
      targetName: string;
      sourceField?: string;
      targetField?: string;
      reason?: string;
    }>;
  };
};

type ScenarioStatus = 'approving' | 'approved' | 'rejected' | 'cancelled';

type ApprovalScenario = {
  id: string;
  ticketType: string;
  status: ScenarioStatus;
  applicant: string;
  applicantDept: string;
  nodeName: string;
  waitingHours: number;
  assets: string[];
  securityLevel: SecurityLevel;
  permissionType: string;
  expireDate: string;
  directory: string;
  sourceType: SourceType;
  sourceSystem: SourceSystem;
  matchedFlow: string;
  matchedRoute: string;
  reason: string;
  subOrderNo: string;
  instanceCode: string;
  createdAt: string;
  effectStatus: EffectStatus;
  timelineComment?: string;
  lineageApproval?: PendingTask['lineageApproval'];
};

function createApprovalScenario(overrides: ApprovalScenario): ApprovalScenario {
  return overrides;
}

function createPendingTask(scenario: ApprovalScenario): PendingTask {
  return {
    id: `task-${scenario.id}`,
    applicant: scenario.applicant,
    applicantDept: scenario.applicantDept,
    nodeName: scenario.nodeName,
    waitingHours: scenario.waitingHours,
    assets: scenario.assets,
    securityLevel: scenario.securityLevel,
    permissionType: scenario.permissionType,
    directory: scenario.directory,
    sourceType: scenario.sourceType,
    sourceSystem: scenario.sourceSystem,
    matchedFlow: scenario.matchedFlow,
    matchedRoute: scenario.matchedRoute,
    reason: scenario.reason,
    subOrderNo: scenario.subOrderNo,
    instanceCode: scenario.instanceCode,
    createdAt: scenario.createdAt,
    ticketType: scenario.ticketType,
    lineageApproval: scenario.lineageApproval,
  };
}

function createTimeline(scenario: ApprovalScenario): ApprovalInstance['timeline'] {
  const submitted = {
    action: `提交${scenario.ticketType}`,
    operator: scenario.applicant,
    time: scenario.createdAt,
    status: 'system' as const,
    comment: scenario.reason,
  };

  if (scenario.status === 'approving') {
    return [
      submitted,
      {
        action: scenario.nodeName,
        operator: scenario.nodeName,
        time: scenario.createdAt,
        status: 'pending',
        comment: scenario.timelineComment ?? '等待当前审批节点处理',
      },
    ];
  }

  if (scenario.status === 'approved') {
    return [
      submitted,
      {
        action: '审批通过',
        operator: scenario.nodeName,
        time: scenario.createdAt,
        status: 'approved',
        comment: scenario.timelineComment ?? '审批通过，变更已生效',
      },
    ];
  }

  if (scenario.status === 'rejected') {
    return [
      submitted,
      {
        action: '审批拒绝',
        operator: scenario.nodeName,
        time: scenario.createdAt,
        status: 'rejected',
        comment: scenario.timelineComment ?? '申请说明不足，已拒绝',
      },
    ];
  }

  return [
    submitted,
    {
      action: '申请撤回',
      operator: scenario.applicant,
      time: scenario.createdAt,
      status: 'system',
      comment: scenario.timelineComment ?? '申请人撤回，未产生变更',
    },
  ];
}

function createApprovalInstance(scenario: ApprovalScenario): ApprovalInstance {
  return {
    id: `instance-${scenario.id}`,
    subOrderNo: scenario.subOrderNo,
    instanceCode: scenario.instanceCode,
    feishuUrl: `https://example.feishu.cn/approval/${scenario.instanceCode}`,
    status: scenario.status,
    effectStatus: scenario.effectStatus,
    assets: scenario.assets,
    securityLevel: scenario.securityLevel,
    permissionType: scenario.permissionType,
    expireDate: scenario.expireDate,
    directory: scenario.directory,
    sourceType: scenario.sourceType,
    sourceSystem: scenario.sourceSystem,
    matchedFlow: scenario.matchedFlow,
    matchedRoute: scenario.matchedRoute,
    reason: scenario.reason,
    ticketType: scenario.ticketType,
    approvers: [
      {
        nodeId: `node-${scenario.id}`,
        nodeName: scenario.nodeName,
        mode: 'single',
        approvers: [{ name: scenario.nodeName, openId: `ou_${scenario.id}` }],
      },
    ],
    timeline: createTimeline(scenario),
  };
}

function createApprovalBatch(ticketType: string, scenarios: ApprovalScenario[]): ApprovalBatch {
  if (!scenarios.length) {
    throw new Error(`No approval scenarios configured for ${ticketType}`);
  }

  const instances = scenarios.map(createApprovalInstance);
  const primary = scenarios[0];
  const status = scenarios.some(item => item.status === 'approving') ? 'approving' : primary.status;
  const effectStatus = instances.some(instance => instance.effectStatus === 'effect_failed')
    ? 'effect_failed'
    : instances.some(instance => instance.effectStatus === 'effecting')
      ? 'effecting'
      : instances.length > 0 && instances.every(instance => instance.effectStatus === 'effective')
        ? 'effective'
        : 'not_effective';

  return {
    id: `batch-${ticketType}`,
    batchId: `BATCH-${primary.createdAt.slice(0, 10).replace(/-/g, '')}-${ticketType}`,
    ticketType,
    totalAssets: instances.reduce((sum, instance) => sum + instance.assets.length, 0),
    instanceCount: instances.length,
    createdAt: primary.createdAt,
    status,
    effectStatus,
    instances,
  };
}

export type CatalogNode = {
  id: string;
  label: string;
  path: string;
  children?: CatalogNode[];
};

export const ticketTypes = ['权限申请', '上架审批', '下架审批', '目录修改', '目录编辑审批', '负责人交接', '血缘修正'];

export const securityLevelOptions = ['S1', 'S2', 'S3', 'S4', 'S5'].map(value => ({ value, label: value }));

export const assetTypeOptions = [
  { value: 'table', label: '表' },
  { value: 'view', label: '视图' },
  { value: 'api', label: 'API' },
  { value: 'report', label: '报表' },
  { value: 'metric', label: '指标' },
];

export const permissionTypeOptions = [
  { value: 'read', label: '只读' },
  { value: 'readwrite', label: '读写' },
  { value: 'export', label: '导出' },
];

export const sourceTypeOptions: Array<{ value: SourceType; label: string }> = [
  { value: 'warehouse_engine', label: '数仓引擎' },
  { value: 'analytic_db', label: '分析型数据库' },
  { value: 'business_db', label: '业务数据库' },
  { value: 'report_system', label: '报表系统' },
  { value: 'api_service', label: '接口服务' },
  { value: 'message_stream', label: '消息/流系统' },
  { value: 'file_storage', label: '文件/对象存储' },
  { value: 'metric_platform', label: '指标平台' },
];

export const sourceSystemOptions: Array<{ value: SourceSystem; label: string }> = [
  { value: 'MaxCompute', label: 'MaxCompute' },
  { value: 'Hive', label: 'Hive' },
  { value: 'SelectDB', label: 'SelectDB' },
  { value: 'MySQL', label: 'MySQL' },
  { value: 'Oracle', label: 'Oracle' },
  { value: '万联灵析', label: '万联灵析' },
  { value: 'API网关', label: 'API网关' },
  { value: 'Kafka', label: 'Kafka' },
  { value: 'OSS', label: 'OSS' },
  { value: '指标平台', label: '指标平台' },
];

export const applicantDeptOptions = [
  { value: '数据分析部', label: '数据分析部' },
  { value: '运营增长部', label: '运营增长部' },
  { value: '财务管理部', label: '财务管理部' },
  { value: '供应链事业部', label: '供应链事业部' },
];

export const catalogTree: CatalogNode[] = [
  { id: 'cat-trade', label: '交易域', path: '交易域', children: [
    { id: 'cat-trade-order', label: '订单', path: '交易域/订单', children: [{ id: 'cat-trade-order-detail', label: '订单明细', path: '交易域/订单/订单明细' }] },
    { id: 'cat-trade-pay', label: '支付', path: '交易域/支付', children: [{ id: 'cat-trade-pay-flow', label: '支付流水', path: '交易域/支付/支付流水' }] },
    { id: 'cat-trade-api', label: 'API', path: '交易域/API', children: [{ id: 'cat-trade-api-query', label: '查询服务', path: '交易域/API/查询服务' }] },
  ] },
  { id: 'cat-user', label: '用户域', path: '用户域', children: [
    { id: 'cat-user-behavior', label: '行为', path: '用户域/行为', children: [{ id: 'cat-user-behavior-log', label: '行为日志', path: '用户域/行为/行为日志' }] },
    { id: 'cat-user-profile', label: '画像', path: '用户域/画像', children: [{ id: 'cat-user-profile-tag', label: '用户标签', path: '用户域/画像/用户标签' }] },
  ] },
  { id: 'cat-finance', label: '财务域', path: '财务域', children: [
    { id: 'cat-finance-report', label: '报表', path: '财务域/报表', children: [{ id: 'cat-finance-report-monthly', label: '月报', path: '财务域/报表/月报' }] },
    { id: 'cat-finance-metric', label: '指标', path: '财务域/指标', children: [{ id: 'cat-finance-metric-core', label: '核心', path: '财务域/指标/核心' }] },
  ] },
  { id: 'cat-supply', label: '供应链', path: '供应链', children: [
    { id: 'cat-supply-stock', label: '库存', path: '供应链/库存', children: [{ id: 'cat-supply-stock-detail', label: '库存明细', path: '供应链/库存/库存明细' }] },
  ] },
];

export const routeFields = [
  { value: 'security_level', label: '安全等级' },
  { value: 'asset_type', label: '资产类型' },
  { value: 'catalog_path', label: '目录' },
  { value: 'source_type', label: '来源类型' },
  { value: 'source_system', label: '来源系统' },
  { value: 'applicant_dept', label: '申请人部门' },
  { value: 'permission_type', label: '权限类型' },
  { value: 'is_cross_dept', label: '是否跨部门' },
];

export const routeOperators = [
  { value: 'eq', label: '等于' },
  { value: 'in', label: '属于' },
  { value: 'contains', label: '包含' },
];

export const initialFlows: FlowConfig[] = [
  { id: 'fc-001', ticketType: '权限申请', name: '权限申请_统一版', approvalCode: '7C468A54-PER-2024', idType: 'open_id', status: 'enabled', description: '适用于所有数据资产权限申请，支持多资产拆单', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-09 14:32:00', validateStatus: 'passed', createdAt: '2026-05-01 10:00:00', updatedAt: '2026-06-09 14:32:00' },
  { id: 'fc-004', ticketType: '权限申请', name: '权限申请_高安全等级版', approvalCode: '7C468A54-HIGH-2024', idType: 'open_id', status: 'enabled', description: '适用于 S4/S5 安全等级数据资产权限申请，包含 CTO 审批节点', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-08 10:00:00', validateStatus: 'passed', createdAt: '2026-05-15 09:00:00', updatedAt: '2026-06-08 10:00:00' },
  { id: 'fc-005', ticketType: '权限申请', name: '权限申请_跨部门版', approvalCode: '7C468A54-CROSS-2024', idType: 'open_id', status: 'enabled', description: '适用于跨部门数据资产权限申请，需额外经过申请人所在部门负责人审批', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-08 11:00:00', validateStatus: 'passed', createdAt: '2026-05-20 14:00:00', updatedAt: '2026-06-08 11:00:00' },
  { id: 'fc-002', ticketType: '上架审批', name: '数据上架审批_v2', approvalCode: 'A12B3C4D-PUB-2024', idType: 'open_id', status: 'disabled', description: '数据资产上架至数据市场的审批流程', formMappingStatus: 'incomplete', nodeMappingStatus: 'not_configured', lastValidatedAt: '2026-05-20 09:15:00', validateStatus: 'failed', validateError: '动态节点 cto_node 未配置审批人规则', createdAt: '2026-04-15 09:00:00', updatedAt: '2026-05-20 09:15:00' },
  { id: 'fc-003', ticketType: '下架审批', name: '数据下架审批_v1', approvalCode: 'E56F7G8H-DEP-2024', idType: 'open_id', status: 'disabled', description: '数据资产从数据市场下架的审批流程', formMappingStatus: 'not_configured', nodeMappingStatus: 'not_configured', lastValidatedAt: null, validateStatus: 'not_validated', createdAt: '2026-06-01 11:00:00', updatedAt: '2026-06-01 11:00:00' },
  { id: 'fc-006', ticketType: '目录修改', name: '目录修改审批_业务域版', approvalCode: 'DIR-CHANGE-2024', idType: 'open_id', status: 'enabled', description: '资源或资产修改目录归属时使用，按目标目录业务负责人审批', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-09 16:20:00', validateStatus: 'passed', createdAt: '2026-06-02 10:00:00', updatedAt: '2026-06-09 16:20:00' },
  { id: 'fc-007', ticketType: '负责人交接', name: '负责人交接审批_接收人确认', approvalCode: 'OWNER-HANDOVER-2024', idType: 'open_id', status: 'enabled', description: '技术负责人或业务负责人交接，由接收方确认接手', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-09 16:30:00', validateStatus: 'passed', createdAt: '2026-06-02 11:00:00', updatedAt: '2026-06-09 16:30:00' },
  { id: 'fc-008', ticketType: '血缘修正', name: '血缘修正审批_治理版', approvalCode: 'LINEAGE-FIX-2024', idType: 'open_id', status: 'enabled', description: '血缘新增、删除、字段映射修正提交后，由治理负责人审批', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-09 16:40:00', validateStatus: 'passed', createdAt: '2026-06-02 12:00:00', updatedAt: '2026-06-09 16:40:00' },
  { id: 'fc-009', ticketType: '目录编辑审批', name: '目录编辑审批_统一版', approvalCode: 'DIR-EDIT-2024', idType: 'open_id', status: 'enabled', description: '新增、改名、移动、删除目录时使用，由目录委员会审批', formMappingStatus: 'complete', nodeMappingStatus: 'complete', lastValidatedAt: '2026-06-13 21:00:00', validateStatus: 'passed', createdAt: '2026-06-13 20:30:00', updatedAt: '2026-06-13 21:00:00' },
];

export const initialRoutes: FlowRoute[] = [
  { id: 'route-001', flowConfigId: 'fc-004', ticketType: '权限申请', priority: 1, name: '高安全等级专项审批', conditions: [{ id: 'cond-001', field: 'security_level', fieldLabel: '安全等级', operator: 'in', operatorLabel: '属于', value: ['S4', 'S5'], valueLabel: ['S4', 'S5'] }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '安全等级为 S4 或 S5 时，走包含 CTO 审批的专项流程' },
  { id: 'route-002', flowConfigId: 'fc-005', ticketType: '权限申请', priority: 2, name: '跨部门申请审批', conditions: [{ id: 'cond-002', field: 'is_cross_dept', fieldLabel: '是否跨部门', operator: 'eq', operatorLabel: '等于', value: 'true', valueLabel: '是' }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '跨部门申请需额外经过申请人所在部门负责人审批' },
  { id: 'route-003', flowConfigId: 'fc-001', ticketType: '权限申请', priority: 3, name: '交易域数仓授权', conditions: [
    { id: 'cond-003-a', field: 'catalog_path', fieldLabel: '目录', operator: 'in', operatorLabel: '属于', value: ['交易域/订单', '交易域/支付'], valueLabel: ['交易域/订单（含子目录）', '交易域/支付（含子目录）'], matchMode: 'include_descendants' },
    { id: 'cond-003-b', field: 'source_type', fieldLabel: '来源类型', operator: 'in', operatorLabel: '属于', value: ['warehouse_engine'], valueLabel: ['数仓引擎'] },
  ], conditionLogic: 'AND', isDefault: false, enabled: true, description: '交易域下数仓资产走标准权限申请流程' },
  { id: 'route-004', flowConfigId: 'fc-001', ticketType: '权限申请', priority: 99, name: '标准权限申请（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '未命中其他规则时，走标准权限申请流程' },
  { id: 'route-005', flowConfigId: 'fc-002', ticketType: '上架审批', priority: 1, name: '报表来源上架复核', conditions: [{ id: 'cond-005', field: 'source_type', fieldLabel: '来源类型', operator: 'in', operatorLabel: '属于', value: ['report_system'], valueLabel: ['报表系统'] }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '报表系统来源的对象上架前需额外复核展示口径' },
  { id: 'route-006', flowConfigId: 'fc-002', ticketType: '上架审批', priority: 99, name: '标准上架审批（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '所有上架申请走统一流程' },
  { id: 'route-007', flowConfigId: 'fc-003', ticketType: '下架审批', priority: 99, name: '标准下架审批（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '所有下架申请走统一流程' },
  { id: 'route-008', flowConfigId: 'fc-006', ticketType: '目录修改', priority: 1, name: '交易域目录调整审批', conditions: [{ id: 'cond-008', field: 'catalog_path', fieldLabel: '目录', operator: 'in', operatorLabel: '属于', value: ['交易域'], valueLabel: ['交易域（含子目录）'], matchMode: 'include_descendants' }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '目标目录为交易域任意层级时，由交易域业务负责人审批' },
  { id: 'route-009', flowConfigId: 'fc-006', ticketType: '目录修改', priority: 99, name: '标准目录修改（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '其他目录修改走标准目录审批' },
  { id: 'route-010', flowConfigId: 'fc-007', ticketType: '负责人交接', priority: 99, name: '接收人确认（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '负责人交接默认由接收方确认' },
  { id: 'route-011', flowConfigId: 'fc-008', ticketType: '血缘修正', priority: 1, name: '数仓血缘治理审批', conditions: [{ id: 'cond-011', field: 'source_system', fieldLabel: '来源系统', operator: 'in', operatorLabel: '属于', value: ['MaxCompute', 'Hive'], valueLabel: ['MaxCompute', 'Hive'] }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '数仓来源血缘修正由治理负责人审批' },
  { id: 'route-012', flowConfigId: 'fc-008', ticketType: '血缘修正', priority: 99, name: '标准血缘修正（兜底）', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '其他血缘修正走标准治理审批' },
  { id: 'route-013', flowConfigId: 'fc-009', ticketType: '目录编辑审批', priority: 1, name: '新增目录审批', conditions: [{ id: 'cond-013', field: 'catalog_path', fieldLabel: '目录', operator: 'contains', operatorLabel: '包含', value: '新增', valueLabel: '新增目录' }], conditionLogic: 'AND', isDefault: false, enabled: true, description: '新增目录时由目录委员会审批' },
  { id: 'route-014', flowConfigId: 'fc-009', ticketType: '目录编辑审批', priority: 99, name: '目录结构调整审批', conditions: [], conditionLogic: 'AND', isDefault: true, enabled: true, description: '目录改名、移动、删除走统一目录结构调整审批' },
];

export const initialFormMappings: FormMapping[] = [
  { id: 'fm-001', flowConfigId: 'fc-001', platformField: '申请人 open_id', feishuWidgetId: 'applicant_open_id', widgetType: 'contact', transformRule: '原值传入', required: true, usedInCondition: false, exampleValue: 'ou_xiaoming' },
  { id: 'fm-002', flowConfigId: 'fc-001', platformField: '资产名称', feishuWidgetId: 'asset_names', widgetType: 'textarea', transformRule: '多资产用换行拼接', required: true, usedInCondition: false, exampleValue: 'dwd_trade_order' },
  { id: 'fm-003', flowConfigId: 'fc-001', platformField: '安全等级', feishuWidgetId: 'security_level', widgetType: 'select', transformRule: '枚举映射 S1-S5', required: true, usedInCondition: true, exampleValue: 'S3' },
  { id: 'fm-004', flowConfigId: 'fc-004', platformField: '安全等级', feishuWidgetId: 'security_level', widgetType: 'select', transformRule: '枚举映射 S4/S5', required: true, usedInCondition: true, exampleValue: 'S5' },
  { id: 'fm-005', flowConfigId: 'fc-001', platformField: '目录路径', feishuWidgetId: 'catalog_path', widgetType: 'input', transformRule: '父级目录按含子目录规则命中', required: true, usedInCondition: true, exampleValue: '交易域/订单/订单明细' },
  { id: 'fm-006', flowConfigId: 'fc-001', platformField: '来源类型', feishuWidgetId: 'source_type', widgetType: 'select', transformRule: '按资源来源字段字典枚举映射', required: true, usedInCondition: true, exampleValue: 'warehouse_engine' },
  { id: 'fm-007', flowConfigId: 'fc-006', platformField: '目标目录', feishuWidgetId: 'target_catalog_path', widgetType: 'input', transformRule: '目录树路径原值传入', required: true, usedInCondition: true, exampleValue: '交易域/支付/支付流水' },
  { id: 'fm-008', flowConfigId: 'fc-007', platformField: '接收人 open_id', feishuWidgetId: 'target_owner_open_id', widgetType: 'contact', transformRule: '从交接目标人解析 open_id', required: true, usedInCondition: false, exampleValue: 'ou_new_owner_001' },
  { id: 'fm-009', flowConfigId: 'fc-008', platformField: '血缘修正摘要', feishuWidgetId: 'lineage_change_summary', widgetType: 'textarea', transformRule: '新增/删除/字段映射调整合并摘要', required: true, usedInCondition: false, exampleValue: '新增 dwd_order_detail -> rpt_gmv_daily 字段映射' },
  { id: 'fm-010', flowConfigId: 'fc-009', platformField: '目录编辑动作', feishuWidgetId: 'directory_edit_action', widgetType: 'select', transformRule: '新增/改名/移动/删除', required: true, usedInCondition: true, exampleValue: '新增目录' },
  { id: 'fm-011', flowConfigId: 'fc-009', platformField: '影响资源数量', feishuWidgetId: 'affected_resource_count', widgetType: 'number', transformRule: '数字直传', required: true, usedInCondition: false, exampleValue: '12' },
];

export const initialNodeMappings: NodeMapping[] = [
  { id: 'nm-001', flowConfigId: 'fc-001', feishuNodeName: '直属上级审批', feishuNodeId: 'manager_node', approverRuleType: 'direct_manager', multiApproverMode: 'single', missingAction: 'block', enabled: true, description: '根据申请人 open_id 解析直属上级' },
  { id: 'nm-002', flowConfigId: 'fc-001', feishuNodeName: '资源负责人审批', feishuNodeId: 'owner_node', approverRuleType: 'resource_owner', multiApproverMode: 'countersign', missingAction: 'fallback', enabled: true, description: '按资产负责人聚合审批人' },
  { id: 'nm-003', flowConfigId: 'fc-004', feishuNodeName: 'CTO 审批', feishuNodeId: 'cto_node', approverRuleType: 'fixed_role', multiApproverMode: 'single', missingAction: 'block', enabled: true, description: '高安全等级固定角色审批' },
  { id: 'nm-004', flowConfigId: 'fc-006', feishuNodeName: '目录负责人审批', feishuNodeId: 'directory_owner_node', approverRuleType: 'directory_owner', multiApproverMode: 'single', missingAction: 'block', enabled: true, description: '按目标目录解析业务负责人' },
  { id: 'nm-005', flowConfigId: 'fc-007', feishuNodeName: '接收人确认', feishuNodeId: 'target_owner_node', approverRuleType: 'fixed_role', multiApproverMode: 'single', missingAction: 'block', enabled: true, description: 'mock 中使用固定角色代表交接接收人确认' },
  { id: 'nm-006', flowConfigId: 'fc-008', feishuNodeName: '治理负责人审批', feishuNodeId: 'governance_owner_node', approverRuleType: 'fixed_role', multiApproverMode: 'countersign', missingAction: 'block', enabled: true, description: '血缘修正由数据治理委员会审批' },
  { id: 'nm-007', flowConfigId: 'fc-009', feishuNodeName: '目录委员会审批', feishuNodeId: 'directory_committee_node', approverRuleType: 'fixed_role', multiApproverMode: 'countersign', missingAction: 'block', enabled: true, description: '目录结构变更由目录委员会审批' },
];

export const initialRoles: ApprovalRole[] = [
  { id: 'role-001', roleCode: 'security_admin', roleName: '安全管理员', enabled: true, members: [{ name: '周安全', openId: 'ou_security_001', feishuBound: true }, { name: '吴合规', openId: 'ou_compliance_002', feishuBound: true }] },
  { id: 'role-002', roleCode: 'cto', roleName: 'CTO', enabled: true, members: [{ name: '郑技术', openId: 'ou_cto_001', feishuBound: true }] },
  { id: 'role-003', roleCode: 'data_governance', roleName: '数据治理委员会', enabled: false, members: [] },
];

export const initialBatches: ApprovalBatch[] = [
  {
    id: 'batch-001',
    batchId: 'BATCH-20260609-001',
    ticketType: '权限申请',
    totalAssets: 5,
    instanceCount: 2,
    createdAt: '2026-06-09 14:26:00',
    status: 'approving',
    effectStatus: 'not_effective',
    instances: [
      {
        id: 'inst-001',
        subOrderNo: 'SUB-20260609-001-01',
        instanceCode: 'PER-INS-00931',
        feishuUrl: 'https://example.feishu.cn/approval/PER-INS-00931',
        status: 'approving',
        effectStatus: 'not_effective',
        assets: ['dwd_trade_order', 'dwd_trade_payment'],
        securityLevel: 'S4',
        permissionType: '只读',
        expireDate: '2026-09-09',
        directory: '交易域/订单',
        sourceType: 'warehouse_engine',
        sourceSystem: 'MaxCompute',
        matchedFlow: '权限申请_高安全等级版',
        matchedRoute: '高安全等级专项审批',
        reason: '需要分析 Q2 交易数据，用于季度业务复盘报告。',
        approvers: [
          { nodeId: 'manager_node', nodeName: '直属上级审批', mode: 'single', approvers: [{ name: '王经理', openId: 'ou_manager_001' }] },
          { nodeId: 'cto_node', nodeName: 'CTO 审批', mode: 'single', approvers: [{ name: '郑技术', openId: 'ou_cto_001' }] },
        ],
        timeline: [
          { action: '提交申请', operator: '刘数据', time: '2026-06-09 14:26:00', status: 'system' },
          { action: '直属上级审批通过', operator: '王经理', time: '2026-06-09 15:04:00', status: 'approved', comment: '用途明确' },
          { action: '等待 CTO 审批', operator: '郑技术', time: '2026-06-09 15:04:00', status: 'pending' },
        ],
      },
      {
        id: 'inst-002',
        subOrderNo: 'SUB-20260609-001-02',
        instanceCode: 'PER-INS-00932',
        feishuUrl: 'https://example.feishu.cn/approval/PER-INS-00932',
        status: 'approving',
        effectStatus: 'not_effective',
        assets: ['dim_user_profile', 'ads_user_tag'],
        securityLevel: 'S3',
        permissionType: '只读',
        expireDate: '2026-09-09',
        directory: '用户域/画像',
        sourceType: 'warehouse_engine',
        sourceSystem: 'Hive',
        matchedFlow: '权限申请_统一版',
        matchedRoute: '标准权限申请（兜底）',
        reason: '用于用户分群分析。',
        approvers: [{ nodeId: 'owner_node', nodeName: '资源负责人审批', mode: 'countersign', approvers: [{ name: '李负责人', openId: 'ou_owner_001' }, { name: '赵负责人', openId: 'ou_owner_002' }] }],
        timeline: [{ action: '提交申请', operator: '刘数据', time: '2026-06-09 14:26:00', status: 'system' }, { action: '等待资源负责人审批', operator: '李负责人、赵负责人', time: '2026-06-09 14:27:00', status: 'pending' }],
      },
    ],
  },
  {
    id: 'batch-002',
    batchId: 'BATCH-20260608-002',
    ticketType: '目录修改',
    totalAssets: 3,
    instanceCount: 1,
    createdAt: '2026-06-08 13:12:00',
    status: 'approved',
    effectStatus: 'effective',
    instances: [{
      id: 'inst-003',
      subOrderNo: 'SUB-20260608-002-01',
      instanceCode: 'DIR-INS-00312',
      feishuUrl: 'https://example.feishu.cn/approval/DIR-INS-00312',
      status: 'approved',
      effectStatus: 'effective',
      assets: ['dwd_trade_payment', 'dwd_refund_detail', 'ads_pay_monitor'],
      securityLevel: 'S3',
      permissionType: '目录修改',
      expireDate: '永久',
      directory: '交易域/支付/支付流水',
      sourceType: 'warehouse_engine',
      sourceSystem: 'MaxCompute',
      matchedFlow: '目录修改审批_业务域版',
      matchedRoute: '交易域目录调整审批',
      reason: '支付类资产原归属订单目录，需迁移到支付流水目录方便业务检索。',
      approvers: [{ nodeId: 'directory_owner_node', nodeName: '目录负责人审批', mode: 'single', approvers: [{ name: '赵目录', openId: 'ou_catalog_001' }] }],
      timeline: [
        { action: '提交目录修改', operator: '李治理', time: '2026-06-08 13:12:00', status: 'system' },
        { action: '目录负责人审批通过', operator: '赵目录', time: '2026-06-08 14:02:00', status: 'approved', comment: '目标目录合理' },
        { action: '目录切换生效', operator: '系统', time: '2026-06-08 14:03:00', status: 'system' },
      ],
    }],
  },
  {
    id: 'batch-003',
    batchId: 'BATCH-20260607-003',
    ticketType: '上架审批',
    totalAssets: 1,
    instanceCount: 1,
    createdAt: '2026-06-07 10:12:00',
    status: 'approved',
    effectStatus: 'effective',
    instances: [{
      id: 'inst-004',
      subOrderNo: 'SUB-20260607-003-01',
      instanceCode: 'PUB-INS-00108',
      feishuUrl: 'https://example.feishu.cn/approval/PUB-INS-00108',
      status: 'approved',
      effectStatus: 'effective',
      assets: ['rpt_finance_monthly'],
      securityLevel: 'S2',
      permissionType: '上架',
      expireDate: '永久',
      directory: '财务域/报表/月报',
      sourceType: 'report_system',
      sourceSystem: '万联灵析',
      matchedFlow: '数据上架审批_v2',
      matchedRoute: '报表来源上架复核',
      reason: '财务月报指标口径已补齐，申请进入资产目录。',
      approvers: [{ nodeId: 'owner_node', nodeName: '业务负责人审批', mode: 'single', approvers: [{ name: '王财务', openId: 'ou_finance_001' }] }],
      timeline: [{ action: '提交上架申请', operator: '王五', time: '2026-06-07 10:12:00', status: 'system' }, { action: '业务负责人审批通过', operator: '王财务', time: '2026-06-07 11:30:00', status: 'approved' }],
    }],
  },
  { id: 'batch-004', batchId: 'BATCH-20260605-007', ticketType: '权限申请', totalAssets: 1, instanceCount: 1, createdAt: '2026-06-05 11:30:00', status: 'rejected', effectStatus: 'not_effective', instances: [] },
];

export const initialPendingTasks: PendingTask[] = [
  { id: 'task-001', applicant: '刘数据', applicantDept: '数据分析部', nodeName: 'CTO 审批', waitingHours: 26, assets: ['dwd_trade_order', 'dwd_trade_payment'], securityLevel: 'S4', permissionType: '只读', directory: '交易域/订单', sourceType: 'warehouse_engine', sourceSystem: 'MaxCompute', matchedFlow: '权限申请_高安全等级版', matchedRoute: '高安全等级专项审批', reason: '需要分析 Q2 交易数据，用于季度业务复盘报告。', subOrderNo: 'SUB-20260609-001-01', instanceCode: 'PER-INS-00931', createdAt: '2026-06-09 14:26:00', ticketType: '权限申请' },
  { id: 'task-002', applicant: '陈运营', applicantDept: '运营增长部', nodeName: '资源负责人审批', waitingHours: 4, assets: ['ads_user_tag'], securityLevel: 'S3', permissionType: '只读', directory: '用户域/画像/用户标签', sourceType: 'warehouse_engine', sourceSystem: 'Hive', matchedFlow: '权限申请_统一版', matchedRoute: '标准权限申请（兜底）', reason: '用于本周活动用户标签圈选。', subOrderNo: 'SUB-20260610-004-01', instanceCode: 'PER-INS-00988', createdAt: '2026-06-10 09:40:00', ticketType: '权限申请' },
  { id: 'task-003', applicant: '李治理', applicantDept: '数据治理部', nodeName: '治理负责人审批', waitingHours: 2, assets: ['dwd_order_detail -> rpt_gmv_daily'], securityLevel: 'S2', permissionType: '血缘修正', directory: '交易域/订单/订单明细', sourceType: 'warehouse_engine', sourceSystem: 'MaxCompute', matchedFlow: '血缘修正审批_治理版', matchedRoute: '数仓血缘治理审批', reason: '补齐订单明细到 GMV 日报的字段级血缘映射。', subOrderNo: 'SUB-20260610-005-01', instanceCode: 'LIN-INS-00121', createdAt: '2026-06-10 11:10:00', ticketType: '血缘修正' },
  { id: 'task-004', applicant: '张开发', applicantDept: '技术部', nodeName: '目录负责人审批', waitingHours: 8, assets: ['dim_product_info'], securityLevel: 'S3', permissionType: '目录修改', directory: '商品域/商品基础信息', sourceType: 'warehouse_engine', sourceSystem: 'MaxCompute', matchedFlow: '目录修改审批', matchedRoute: '跨域目录迁移', reason: '商品基础信息表从商品域迁移至公共维度域。', subOrderNo: 'SUB-20260610-006-01', instanceCode: 'CAT-INS-00089', createdAt: '2026-06-10 10:30:00', ticketType: '目录修改' },
  { id: 'task-005', applicant: '王运维', applicantDept: '运维部', nodeName: 'CTO 审批', waitingHours: 48, assets: ['dwd_trade_order'], securityLevel: 'S4', permissionType: '下架', directory: '交易域/订单', sourceType: 'warehouse_engine', sourceSystem: 'MaxCompute', matchedFlow: '下架审批_高安全等级版', matchedRoute: '高安全等级下架审批', reason: '该表已下线，需从正式目录移除并归档。', subOrderNo: 'SUB-20260610-007-01', instanceCode: 'UNL-INS-00056', createdAt: '2026-06-10 08:00:00', ticketType: '下架审批' },
];

export function statusLabel(status: ApprovalStatus) {
  return ({ pending_submit: '待提交', approving: '审批中', approved: '已通过', rejected: '已拒绝', cancelled: '已取消', sync_error: '同步异常' } as Record<ApprovalStatus, string>)[status];
}

export function effectLabel(status: EffectStatus) {
  return ({ not_effective: '未生效', effecting: '生效中', effective: '已生效', effect_failed: '生效失败' } as Record<EffectStatus, string>)[status];
}
