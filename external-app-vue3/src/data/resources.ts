import type { DatasetDetail, Product } from '@/types/domain'
import type { Resource, UserViewDetail } from '@/types/resource'
import { seedProducts } from './products'
import { mockProducts } from './mockProducts'

/**
 * 从现有 seedProducts 与 mockProducts 自动迁移生成 Resource 数组。
 * 每条 Product 对应一条 Resource，ID 加 res- 前缀。
 */
function migrateProductToResource(product: Product): Resource {
  return {
    id: `res-${product.id}`,
    resourceName: product.name,
    type: product.type,
    origin: product.origin,
    typeDetail: { ...product.typeDetail },
    assetStatus: product.origin === 'asset_platform'
      ? (product.availability === 'delisted' ? 'delisted' : product.availability === 'paused' ? 'paused' : 'published')
      : undefined,
    commercializable: product.origin === 'asset_platform' ? product.availability !== 'candidate' : undefined,
    assetVersion: product.assetSnapshot?.assetVersion,
    lastSyncedAt: product.assetSnapshot?.syncedAt,
    lastCheckedAt: product.assetSnapshot?.lastCheckedAt,
    changeRisk: product.assetSnapshot?.changeRisk,
    changeSummary: product.assetSnapshot?.changeSummary,
    createdAt: product.updatedAt,
    updatedAt: product.updatedAt
  }
}

export const seedResources: Resource[] = [...seedProducts, ...mockProducts].map(migrateProductToResource)

/**
 * 数据资产平台中已存在但尚未上架为商品的独立资源。
 * 用于资源管理中心的「未上架 → 上架」流程演示。
 */
const unlistedTruckDataset: DatasetDetail = {
  classification: '车辆轨迹明细（L3）',
  qualityUpdatedAt: '2026-07-30',
  fields: [
    { name: 'plate_no', dataType: 'string', meaning: '车牌号', description: '脱敏前车牌，默认不开放探查', primaryKey: true, nullable: false, sensitivity: 'L3', profilingEnabled: false },
    { name: 'gps_time', dataType: 'datetime', meaning: '定位时间', description: 'GPS 采样时间', primaryKey: true, nullable: false, sensitivity: 'L2', profilingEnabled: false },
    { name: 'speed_kmh', dataType: 'integer', meaning: '瞬时速度', description: '公里/小时', primaryKey: false, nullable: true, profilingEnabled: false },
    { name: 'district_code', dataType: 'string', meaning: '区县编码', description: '国家统计区划编码', primaryKey: false, nullable: false, profilingEnabled: false }
  ],
  sampleColumns: ['plate_no', 'gps_time', 'speed_kmh', 'district_code'],
  sampleRows: [
    { plate_no: '沪A****7', gps_time: '2026-07-30 08:01:12', speed_kmh: 62, district_code: '310115' }
  ],
  sampleGeneratedAt: '2026-07-30',
  profiling: {
    completeness: '97.2%',
    uniqueness: '车牌 + 时间联合主键唯一',
    nullRate: '2.8%',
    distribution: '东部干线占 51%',
    anomalies: '车牌等敏感字段默认不开放探查',
    conclusion: '适合路网热力与时段分析，上架前需勾选可探查字段',
    updatedAt: '2026-07-30'
  },
  fieldProfiling: [
    {
      fieldName: 'gps_time',
      kind: 'datetime',
      nullRate: '0%',
      distinctCount: 2592000,
      minDate: '2026-06-30',
      maxDate: '2026-07-30',
      span: '30 天',
      distribution: [
        { label: '工作日白天', count: 19300000, percent: 40 },
        { label: '工作日夜间', count: 9650000, percent: 20 },
        { label: '周末白天', count: 9650000, percent: 20 },
        { label: '周末夜间', count: 9650000, percent: 20 }
      ],
      updatedAt: '2026-07-30'
    },
    {
      fieldName: 'speed_kmh',
      kind: 'numeric',
      nullRate: '2.8%',
      distinctCount: 186,
      min: '0',
      max: '120',
      avg: '54',
      median: '58',
      histogram: [
        { label: '0-30', count: 9640000, percent: 20 },
        { label: '31-60', count: 19280000, percent: 40 },
        { label: '61-90', count: 14460000, percent: 30 },
        { label: '90 以上', count: 4820000, percent: 10 }
      ],
      updatedAt: '2026-07-30'
    },
    {
      fieldName: 'district_code',
      kind: 'identifier',
      nullRate: '0%',
      distinctCount: 2846,
      uniqueness: '区县编码覆盖全国主要干线',
      samplePattern: '6 位国家统计区划编码，如 310115',
      updatedAt: '2026-07-30'
    }
  ]
}

export const unlistedResources: Resource[] = [
  {
    id: 'res-asset-truck-trajectory',
    resourceName: '货车轨迹明细数据集',
    type: 'dataset',
    origin: 'asset_platform',
    typeDetail: { dataset: unlistedTruckDataset },
    assetStatus: 'published',
    commercializable: true,
    assetVersion: 'v3.2.0',
    lastSyncedAt: '2026-07-30 09:20',
    lastCheckedAt: '2026-07-31 08:00',
    changeRisk: 'none',
    createdAt: '2026-07-18',
    updatedAt: '2026-07-18'
  },
  {
    id: 'res-asset-warehouse-api',
    resourceName: '仓储利用率查询 API',
    type: 'api',
    origin: 'asset_platform',
    typeDetail: {},
    assetStatus: 'published',
    commercializable: true,
    assetVersion: 'v1.8.1',
    lastSyncedAt: '2026-07-29 15:10',
    lastCheckedAt: '2026-07-31 08:00',
    changeRisk: 'low',
    createdAt: '2026-07-21',
    updatedAt: '2026-07-21'
  }
]

/** 用数模块产出的 mock 用户视图 */
export const userViewResources: Resource[] = [
  {
    id: 'res-view-driver-performance',
    resourceName: '司机绩效周报',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-001',
        externalUrl: '/bi/workbench/view/view-001',
        chartType: 'bar+line',
        dataSourceName: '司机基础信息数据集',
        lastViewedAt: '2026-07-25',
        viewCount: 42
      } satisfies UserViewDetail
    },
    createdBy: '陈静',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-20',
    updatedAt: '2026-07-25'
  },
  {
    id: 'res-view-route-profit',
    resourceName: '线路利润分析',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-002',
        externalUrl: '/bi/workbench/view/view-002',
        chartType: 'pie+table',
        dataSourceName: '运单交易明细数据集',
        lastViewedAt: '2026-07-27',
        viewCount: 18
      } satisfies UserViewDetail
    },
    createdBy: '王涛',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-22',
    updatedAt: '2026-07-27'
  },
  {
    id: 'res-view-cold-chain-alert',
    resourceName: '冷链温控异常监控',
    type: 'user_view',
    origin: 'user_created',
    typeDetail: {
      userView: {
        sourceModule: 'bi-workbench',
        externalId: 'view-003',
        externalUrl: '/bi/workbench/view/view-003',
        chartType: 'line+number',
        dataSourceName: '冷链温控数据集',
        lastViewedAt: '2026-07-28',
        viewCount: 7
      } satisfies UserViewDetail
    },
    createdBy: '陈静',
    enterpriseId: 'ent-wanlian-logistics',
    createdAt: '2026-07-26',
    updatedAt: '2026-07-28'
  }
]
