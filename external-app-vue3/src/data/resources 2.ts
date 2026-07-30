import type { Product } from '@/types/domain'
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
    createdAt: product.updatedAt,
    updatedAt: product.updatedAt
  }
}

export const seedResources: Resource[] = [...seedProducts, ...mockProducts].map(migrateProductToResource)

/**
 * 数据资产平台中已存在但尚未上架为商品的独立资源。
 * 用于资源管理中心的「未上架 → 上架」流程演示。
 */
export const unlistedResources: Resource[] = [
  {
    id: 'res-asset-truck-trajectory',
    resourceName: '货车轨迹明细数据集',
    type: 'dataset',
    origin: 'app_content',
    typeDetail: {},
    createdAt: '2026-07-18',
    updatedAt: '2026-07-18'
  },
  {
    id: 'res-asset-warehouse-api',
    resourceName: '仓储利用率查询 API',
    type: 'api',
    origin: 'app_content',
    typeDetail: {},
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
