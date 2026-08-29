import type { DatasetDetail } from '@/types/domain'

/** 运营未配置字段/样例时的占位；前台空配置不展示关键指标。 */
export function fallbackSellerDatasetDetail(): DatasetDetail {
  return {
    classification: '脱敏运营数据（L2）',
    qualityUpdatedAt: '',
    fields: [],
    sampleColumns: [],
    sampleRows: [],
    sampleGeneratedAt: '',
    profiling: {
      completeness: '资料准备中',
      uniqueness: '资料准备中',
      nullRate: '资料准备中',
      distribution: '资料准备中',
      anomalies: '资料准备中',
      conclusion: '运营配置字段、样例与探查后前台展示',
      updatedAt: ''
    }
  }
}

export const sellerRouteDatasetDetail: DatasetDetail = {
  granularity: '线路 × 日',
  timeRange: '近 12 个月',
  rowCount: 128400,
  classification: '脱敏运营数据（L2）',
  qualityUpdatedAt: '2026-08-08',
  fields: [
    { name: 'route_id', dataType: 'string', meaning: '干线编码', description: '沪苏浙皖干线线路编号', primaryKey: true, nullable: false, sensitivity: 'L2', profilingEnabled: true, sampleValue: 'SH-NJ-01' },
    { name: 'stat_date', dataType: 'date', meaning: '统计日', description: '按到达日汇总', primaryKey: true, nullable: false, sampleValue: '2026-08-07' },
    { name: 'on_time_rate', dataType: 'decimal', meaning: '准点率', description: '按时到达运单占比', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '0.912' },
    { name: 'avg_hours', dataType: 'decimal', meaning: '平均时效(小时)', description: '发车到签收平均时长', primaryKey: false, nullable: false, sampleValue: '18.6' },
    { name: 'delay_count', dataType: 'integer', meaning: '延误单量', description: '当日延误运单数', primaryKey: false, nullable: false, profilingEnabled: false, sampleValue: '14' },
    { name: 'vehicle_type', dataType: 'string', meaning: '车型', description: '9.6 米 / 13 米等', primaryKey: false, nullable: true, sensitivity: 'L1', sampleValue: '13米' }
  ],
  sampleColumns: ['route_id', 'stat_date', 'on_time_rate', 'avg_hours', 'vehicle_type'],
  sampleRows: [
    { route_id: 'SH-NJ-01', stat_date: '2026-08-07', on_time_rate: 0.928, avg_hours: 17.4, vehicle_type: '13米' },
    { route_id: 'SH-HZ-02', stat_date: '2026-08-07', on_time_rate: 0.901, avg_hours: 19.1, vehicle_type: '9.6米' },
    { route_id: 'NJ-HF-03', stat_date: '2026-08-07', on_time_rate: 0.876, avg_hours: 21.3, vehicle_type: '13米' }
  ],
  sampleGeneratedAt: '2026-08-08',
  profiling: {
    completeness: '99.1%',
    uniqueness: '线路 + 统计日联合主键唯一',
    nullRate: '0.9%',
    distribution: '沪宁线样本约占 28%',
    anomalies: '节假日延误已标注',
    conclusion: '适合线路时效评估与延误热点排查',
    updatedAt: '2026-08-08'
  },
  fieldProfiling: [
    {
      fieldName: 'route_id',
      kind: 'string',
      nullRate: '0%',
      distinctCount: 86,
      uniqueness: '100%',
      topValues: [{ label: 'A', count: 40, percent: 40 }, { label: 'B', count: 35, percent: 35 }, { label: 'C', count: 25, percent: 25 }],
      updatedAt: '2026-08-08'
    },
    {
      fieldName: 'on_time_rate',
      kind: 'numeric',
      nullRate: '0%',
      distinctCount: 86,
      min: '0.62',
      max: '0.99',
      avg: '0.91',
      median: '0.91',
      histogram: [
        { label: '0.60-0.80', count: 12000, percent: 9 },
        { label: '0.80-0.90', count: 38000, percent: 30 },
        { label: '0.90-1.00', count: 78400, percent: 61 }
      ],
      updatedAt: '2026-08-08'
    }
  ]
}

export const sellerWarehouseDatasetDetail: DatasetDetail = {
  granularity: '仓库 × 品类 × 周',
  timeRange: '近 6 个月',
  rowCount: 18600,
  classification: '脱敏运营数据（L2）',
  qualityUpdatedAt: '2026-08-08',
  fields: [
    { name: 'warehouse_id', dataType: 'string', meaning: '仓库编码', description: '华东仓网节点', primaryKey: true, nullable: false, sensitivity: 'L2', profilingEnabled: true, sampleValue: 'WH-SH-03' },
    { name: 'sku_cat', dataType: 'string', meaning: '品类', description: '库存品类', primaryKey: true, nullable: false, sampleValue: '快消' },
    { name: 'week_start', dataType: 'date', meaning: '周起始日', description: '自然周一', primaryKey: true, nullable: false, sampleValue: '2026-08-03' },
    { name: 'turnover_days', dataType: 'decimal', meaning: '周转天数', description: '库存量 / 日出库量', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '14.2' },
    { name: 'backlog_sku', dataType: 'integer', meaning: '积压 SKU 数', description: '超周转阈值的 SKU', primaryKey: false, nullable: false, sampleValue: '37' }
  ],
  sampleColumns: ['warehouse_id', 'sku_cat', 'week_start', 'turnover_days', 'backlog_sku'],
  sampleRows: [
    { warehouse_id: 'WH-SH-03', sku_cat: '快消', week_start: '2026-08-03', turnover_days: 14.2, backlog_sku: 37 },
    { warehouse_id: 'WH-HZ-01', sku_cat: '配件', week_start: '2026-08-03', turnover_days: 21.8, backlog_sku: 64 }
  ],
  sampleGeneratedAt: '2026-08-08',
  profiling: {
    completeness: '98.4%',
    uniqueness: '仓 + 品类 + 周联合主键唯一',
    nullRate: '1.6%',
    distribution: '上海仓样本约占 22%',
    anomalies: '春节备货周周转拉长已标注',
    conclusion: '适合识别高积压仓与滞销品类',
    updatedAt: '2026-08-08'
  },
  fieldProfiling: [
    {
      fieldName: 'warehouse_id',
      kind: 'string',
      nullRate: '0%',
      distinctCount: 12,
      uniqueness: '100%',
      topValues: [{ label: 'TOP1', count: 50, percent: 5 }, { label: 'TOP2', count: 40, percent: 4 }, { label: '其他', count: 910, percent: 91 }],
      updatedAt: '2026-08-08'
    },
    {
      fieldName: 'turnover_days',
      kind: 'numeric',
      nullRate: '1.6%',
      distinctCount: 84,
      min: '6.2',
      max: '38.4',
      avg: '16.8',
      median: '14.2',
      histogram: [
        { label: '7 天内', count: 4200, percent: 23 },
        { label: '7-21 天', count: 9800, percent: 53 },
        { label: '21 天以上', count: 4600, percent: 24 }
      ],
      updatedAt: '2026-08-08'
    }
  ]
}

export const sellerDriverDatasetDetail: DatasetDetail = {
  granularity: '司机 × 周',
  timeRange: '近 26 周',
  rowCount: 9400,
  classification: '脱敏运营数据（L2）',
  qualityUpdatedAt: '2026-07-25',
  fields: [
    { name: 'driver_id', dataType: 'string', meaning: '司机标识', description: '不可逆哈希', primaryKey: true, nullable: false, sensitivity: 'L2', profilingEnabled: false, sampleValue: 'd_8f21' },
    { name: 'week_start', dataType: 'date', meaning: '周起始日', description: '自然周一', primaryKey: true, nullable: false, sampleValue: '2026-07-20' },
    { name: 'score', dataType: 'integer', meaning: '绩效分', description: '0-100', primaryKey: false, nullable: false, sampleValue: '86' },
    { name: 'on_time_rate', dataType: 'decimal', meaning: '准点率', description: '当周准点运单占比', primaryKey: false, nullable: false, sampleValue: '0.94' }
  ],
  sampleColumns: ['driver_id', 'week_start', 'score', 'on_time_rate'],
  sampleRows: [
    { driver_id: 'd_8f21', week_start: '2026-07-20', score: 86, on_time_rate: 0.94 },
    { driver_id: 'd_3a07', week_start: '2026-07-20', score: 79, on_time_rate: 0.88 }
  ],
  sampleGeneratedAt: '2026-07-25',
  profiling: {
    completeness: '99.0%',
    uniqueness: '司机 + 周联合主键唯一',
    nullRate: '1.0%',
    distribution: '华东线路司机约占 61%',
    anomalies: '不含姓名手机等个人信息',
    conclusion: '适合运力质量周报，禁止再识别个人',
    updatedAt: '2026-07-25'
  }
}

export function sellerDatasetDetailByArtifact(artifactId: string): DatasetDetail {
  if (artifactId === 'artifact-route-otp') return structuredClone(sellerRouteDatasetDetail)
  if (artifactId === 'artifact-warehouse-health') return structuredClone(sellerWarehouseDatasetDetail)
  if (artifactId === 'artifact-driver-score') return structuredClone(sellerDriverDatasetDetail)
  return fallbackSellerDatasetDetail()
}
