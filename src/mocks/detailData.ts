import type { ResourceDetail } from '../types/resources';
import { mockResources } from './resources';

const enriched: ResourceDetail[] = mockResources.map((r) => {
  switch (r.type) {
    case 'table':
      return {
        ...r,
        databaseName: r.databaseName ?? (r.name.includes('.') ? r.name.slice(0, r.name.lastIndexOf('.')) : 'dwd'),
        isPartitioned: true,
        storageFormat: 'Parquet',
        lifecycle: '30天',
        isCore: r.tags?.includes('核心表') ?? false,
        dataLevel: 'DWD',
        infoCompleteness: 92,
        fields: getTableFields(r.id),
        partitions: getPartitions(r.id),
        sampleData: getSampleData(r.id),
        ddlChanges: getDDLChanges(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
        /* V2.1.1: 审批状态模拟 */
        resourceStatus: 'reviewing' as const,
      };
    case 'view':
      return {
        ...r,
        databaseName: r.databaseName ?? (r.name.includes('.') ? r.name.slice(0, r.name.lastIndexOf('.')) : 'dwd'),
        isPartitioned: false,
        storageFormat: 'Parquet',
        lifecycle: '永久',
        isCore: false,
        dataLevel: 'DWS',
        infoCompleteness: 78,
        fields: getTableFields(r.id),
        sampleData: getSampleData(r.id),
        ddlChanges: getDDLChanges(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
      };
    case 'metric':
      return {
        ...r,
        infoCompleteness: 85,
        metricDefinition: getMetricDefinition(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
      };
    case 'label':
      return {
        ...r,
        infoCompleteness: 70,
        labelDefinition: getLabelDefinition(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
      };
    case 'api':
      return {
        ...r,
        infoCompleteness: 60,
        apiDefinition: getAPIDefinition(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
      };
    case 'report':
      return {
        ...r,
        infoCompleteness: 80,
        reportDefinition: getReportDefinition(r.id),
        operationLogs: getOperationLogs(r.id),
        usageNotes: '',
        maintenanceNote: '',
      };
    default:
      return { ...r, infoCompleteness: 50 };
  }
});

export const mockDetails: Record<string, ResourceDetail> = {};
for (const d of enriched) {
  mockDetails[d.id] = d;
}

/* ── Helper functions ──────────────────────────────────── */

function getTableFields(id: string): import('../types/resources').FieldInfo[] {
  if (id === 'resource-table-order-detail') {
    return [
      { name: 'order_id', type: 'bigint', comment: '订单ID', description: '唯一标识每一笔订单', securityLevel: 'S1' },
      { name: 'user_id', type: 'bigint', comment: '用户ID', securityLevel: 'S3' },
      { name: 'product_id', type: 'bigint', comment: '商品ID', description: '关联商品主键', securityLevel: 'S1' },
      { name: 'order_amount', type: 'decimal(18,2)', comment: '订单金额', securityLevel: 'S4' },
      { name: 'payment_status', type: 'string', comment: '支付状态', description: '枚举：待支付/已支付/已退款', securityLevel: 'S1' },
      { name: 'create_time', type: 'timestamp', comment: '创建时间', securityLevel: 'S1' },
      { name: 'update_time', type: 'timestamp', comment: '更新时间', securityLevel: 'S1' },
    ];
  }
  return [
    { name: 'id', type: 'bigint', comment: '主键', securityLevel: 'S1' },
    { name: 'name', type: 'string', comment: '名称', securityLevel: 'S2' },
    { name: 'value', type: 'string', comment: '值', securityLevel: 'S2' },
    { name: 'dt', type: 'string', comment: '分区字段', securityLevel: 'S1' },
  ];
}

function getPartitions(id: string): import('../types/resources').PartitionInfo[] {
  if (id === 'resource-table-order-detail') {
    return [
      { keys: ['dt'], value: '2026-05-14', rowCount: 125000, storageSize: '3.2 GB', createdAt: '2026-05-14 02:00:00', updatedAt: '2026-05-14 08:30:00' },
      { keys: ['dt'], value: '2026-05-13', rowCount: 118000, storageSize: '3.0 GB', createdAt: '2026-05-13 02:00:00', updatedAt: '2026-05-13 08:30:00' },
      { keys: ['dt'], value: '2026-05-12', rowCount: 112000, storageSize: '2.8 GB', createdAt: '2026-05-12 02:00:00', updatedAt: '2026-05-12 08:30:00' },
    ];
  }
  return [
    { keys: ['dt'], value: '2026-05-01', rowCount: 50000, storageSize: '1.2 GB', createdAt: '2026-05-01 02:00:00', updatedAt: '2026-05-01 08:00:00' },
  ];
}

function getSampleData(id: string): import('../types/resources').SampleDataRow[] {
  if (id === 'resource-table-order-detail') {
    return [
      { order_id: '100001', user_id: '******', product_id: 'P2001', order_amount: '******', payment_status: '已支付', create_time: '2026-05-14 10:23:45', update_time: '2026-05-14 10:23:45' },
      { order_id: '100002', user_id: '******', product_id: 'P2002', order_amount: '******', payment_status: '待支付', create_time: '2026-05-14 11:05:22', update_time: '2026-05-14 11:05:22' },
      { order_id: '100003', user_id: '******', product_id: 'P2003', order_amount: '******', payment_status: '已退款', create_time: '2026-05-14 09:12:33', update_time: '2026-05-14 15:30:00' },
    ];
  }
  return [
    { id: '1', name: '示例1', value: 'value1', dt: '2026-05-01' },
    { id: '2', name: '示例2', value: 'value2', dt: '2026-05-01' },
  ];
}

function getDDLChanges(id: string): import('../types/resources').DDLChange[] {
  return [
    { time: '2026-05-10 14:30:00', type: 'add_field', description: '新增字段 payment_status string', operator: '李四', sql: 'ALTER TABLE dwd_order_detail ADD COLUMN payment_status STRING COMMENT "支付状态";' },
    { time: '2026-04-20 10:00:00', type: 'modify_comment', description: '修改字段 order_amount 注释', operator: '系统', sql: 'ALTER TABLE dwd_order_detail CHANGE COLUMN order_amount order_amount DECIMAL(18,2) COMMENT "订单金额(元)";' },
  ];
}

function getOperationLogs(id: string): import('../types/resources').OperationLog[] {
  return [
    { time: '2026-05-14 09:00:00', category: '上架', action: '提交上架申请', operator: '李四', detail: '首次上架，目录归属交易域/订单' },
    { time: '2026-05-14 10:30:00', category: '权限', action: '审批通过', operator: '管理员', detail: '用户张三申请订单明细表查看权限，审批通过' },
    { time: '2026-04-20 08:00:00', category: '变更', action: '字段描述更新', operator: '李四', detail: '更新 payment_status 字段描述' },
  ];
}

function getMetricDefinition(id: string): import('../types/resources').MetricDefinition {
  return {
    statisticsObject: '交易订单',
    statisticsGranularity: '日',
    statisticsPeriod: '自然日（T+1）',
    updateFrequency: '每日凌晨 2:00',
    dataDelay: '2小时',
    formula: 'SUM(order_amount) WHERE payment_status = "已支付"',
    caliberDescription: '统计当日所有已完成支付的订单金额总和，不含退款',
    dimensions: ['日期', '商品类目', '用户分层'],
    scenarios: ['经营日报', 'GMV趋势分析', '品类贡献度分析'],
    notes: ['退款订单不计入GMV', '跨日支付的订单计入支付日', '大额异常订单需人工复核'],
  };
}

function getLabelDefinition(id: string): import('../types/resources').LabelDefinition {
  return {
    code: 'user_value_tier',
    labelType: '统计型标签',
    valueType: '枚举型',
    targetObject: '用户',
    updateMethod: '离线计算',
    updateFrequency: '每日',
    valueRanges: [
      { value: '高价值', meaning: '近30天消费金额≥500元' },
      { value: '中价值', meaning: '近30天消费金额100-500元' },
      { value: '低价值', meaning: '近30天消费金额<100元' },
    ],
    coverageRate: 87.5,
    scenarios: ['精准营销推送', 'VIP分层运营', '流失预警模型'],
    notes: ['新注册用户默认标记为低价值', '标签更新延迟约2小时'],
    sampleData: [
      { userId: 'U10001', labelValue: '高价值' },
      { userId: 'U10002', labelValue: '中价值' },
    ],
  };
}

function getAPIDefinition(id: string): import('../types/resources').APIDefinition {
  return {
    httpMethod: 'GET',
    summary: '根据用户ID获取客户价值评分、活跃度与推荐触达策略',
    serviceName: 'customer-value-service',
    requestPath: '/api/v1/customer/value/{userId}',
    authMethod: 'OAuth2 Token',
    requestParams: [
      { name: 'userId', type: 'string', position: 'Path', required: true, description: '用户唯一标识', example: 'U10001' },
      { name: 'includeHistory', type: 'boolean', position: 'Query', required: false, description: '是否包含历史评分', example: 'true' },
    ],
    responseFields: [
      { name: 'valueScore', type: 'number', description: '客户价值评分(0-100)', example: '85.5' },
      { name: 'lastActiveDays', type: 'number', description: '最近活跃天数', example: '7' },
      { name: 'strategy', type: 'string', description: '推荐触达策略', example: '高价值用户-专属优惠' },
    ],
    notes: ['限流：100次/分钟', 'Token有效期24小时', '超时设置建议5秒'],
  };
}

function getReportDefinition(id: string): import('../types/resources').ReportDefinition {
  if (id === 'resource-report-gmv-daily') {
    return {
      description: '按天展示 GMV、订单量、退款金额等核心交易指标，支持趋势对比与维度拆解。',
      sourceSystem: 'BI 平台',
      reportCatalog: '交易域/报表/销售报表',
      accessLink: 'https://bi.example.com/report/gmv-daily',
      coreMetrics: ['GMV', '订单量', '退款率', '客单价'],
      analysisDimensions: ['日期', '商品类目', '地区'],
    };
  }
  return {
    description: '通用报表，展示核心业务指标与维度分析。',
    sourceSystem: 'BI 平台',
    reportCatalog: '报表/通用报表',
    accessLink: '',
    coreMetrics: ['核心指标'],
    analysisDimensions: ['分析维度'],
  };
}
