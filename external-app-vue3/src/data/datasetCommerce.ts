import type { BiDatasetDelivery } from '@/types/datasetCommerce'

export const seedBiDatasetDeliveries: BiDatasetDelivery[] = [
  // ===== A14 到期与续订 Mock 数据 =====
  // 场景1: 持续更新交付（即将到期）
  {
    id: 'bi-delivery-continuous-001',
    orderId: 'order-continuous-update-001',
    entitlementId: 'ent-renewal-expiring',
    productId: 'prod-truck-trajectory',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
    datasetInstanceId: 'bi-dataset-enterprise-truck-trajectory-v320-continuous',
    status: 'delivered',
    biEntryUrl: '/bi/workbench/dataset/bi-dataset-enterprise-truck-trajectory-v320-continuous',
    downloadUrl: '/download/dataset/bi-dataset-enterprise-truck-trajectory-v320-continuous',
    attemptCount: 12,
    firstUsedAt: '2025-08-11T09:30:00.000Z',
    lastUsedAt: '2026-08-07T14:20:00.000Z',
    lastSuccessfulRefreshAt: '2026-08-05T06:00:00.000Z',
    createdAt: '2025-08-10T09:01:00.000Z',
    deliveredAt: '2025-08-10T09:05:00.000Z',
    updatedAt: '2026-08-05T06:00:00.000Z'
  },
  // 场景2: 已到期持续更新交付（停止更新，但数据保留）
  {
    id: 'bi-delivery-expired-001',
    orderId: 'order-history-continuous-001',
    entitlementId: 'ent-renewal-expired',
    productId: 'prod-warehouse-turnover-risk',
    ownerType: 'personal',
    ownerId: 'mem-1',
    operatorMemberId: 'mem-1',
    datasetInstanceId: 'bi-dataset-warehouse-turnover-v232-expired',
    status: 'delivered',
    biEntryUrl: '/bi/workbench/dataset/bi-dataset-warehouse-turnover-v232-expired',
    downloadUrl: '/download/dataset/bi-dataset-warehouse-turnover-v232-expired',
    attemptCount: 8,
    firstUsedAt: '2024-08-11T10:00:00.000Z',
    lastUsedAt: '2026-08-07T09:15:00.000Z',
    lastSuccessfulRefreshAt: '2026-08-08T06:00:00.000Z', // 最后一次更新，已到期
    createdAt: '2024-08-10T10:01:00.000Z',
    deliveredAt: '2024-08-10T10:05:00.000Z',
    updatedAt: '2026-08-08T06:00:00.000Z'
  },
  // ===== 原有数据 =====
  {
    id: 'bi-delivery-history-001',
    orderId: 'order-dataset-history-001',
    entitlementId: 'ent-dataset-history-001',
    productId: 'prod-warehouse-turnover-risk',
    ownerType: 'personal',
    ownerId: 'mem-1',
    operatorMemberId: 'mem-1',
   datasetInstanceId: 'bi-dataset-warehouse-turnover-v232',
   status: 'delivered',
   biEntryUrl: '/bi/workbench/dataset/bi-dataset-warehouse-turnover-v232',
   downloadUrl: '/download/dataset/bi-dataset-warehouse-turnover-v232',
   attemptCount: 1,
    firstUsedAt: '2026-07-18T11:20:00.000Z',
    lastUsedAt: '2026-07-30T16:45:00.000Z',
    lastSuccessfulRefreshAt: '2026-07-28T06:00:00.000Z',
    createdAt: '2026-07-18T10:01:00.000Z',
    deliveredAt: '2026-07-18T10:02:00.000Z',
    updatedAt: '2026-07-28T06:00:00.000Z'
 },
  {
   id: 'bi-delivery-enterprise-001',
    orderId: 'order-enterprise-dataset-001',
    entitlementId: 'ent-dataset-enterprise-001',
    productId: 'prod-truck-trajectory',
    ownerType: 'enterprise',
    ownerId: 'ent-wanlian-logistics',
    operatorMemberId: 'mem-1',
   datasetInstanceId: 'bi-dataset-enterprise-truck-trajectory-v320',
   status: 'delivered',
   biEntryUrl: '/bi/workbench/dataset/bi-dataset-enterprise-truck-trajectory-v320',
   downloadUrl: '/download/dataset/bi-dataset-enterprise-truck-trajectory-v320',
   attemptCount: 1,
    firstUsedAt: '2026-07-29T16:00:00.000Z',
    lastUsedAt: '2026-08-02T10:30:00.000Z',
    lastSuccessfulRefreshAt: '2026-07-29T15:35:00.000Z',
    createdAt: '2026-07-29T15:20:00.000Z',
    deliveredAt: '2026-07-29T15:35:00.000Z',
    updatedAt: '2026-07-29T15:35:00.000Z'
  }
]
