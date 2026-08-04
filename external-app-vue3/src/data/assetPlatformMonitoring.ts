import type { AssetChangeRisk } from '@/types/domain'

export interface AssetPlatformMonitorRecord {
  id: string
  resourceId: string
  resourceName: string
  productId?: string
  previousVersion: string
  currentVersion: string
  risk: AssetChangeRisk
  changeType: 'data_refresh' | 'schema_change' | 'compliance_change' | 'source_outage'
  action: 'observed' | 'purchase_paused' | 'access_frozen' | 'refresh_paused'
  checkedAt: string
  summary: string
}

export const seedAssetPlatformMonitorRecords: AssetPlatformMonitorRecord[] = [
  {
    id: 'asset-monitor-001', resourceId: 'asset-truck-trajectory', resourceName: '全国货车轨迹热力数据集', productId: 'prod-truck-trajectory',
    previousVersion: 'v3.1.9', currentVersion: 'v3.2.0', risk: 'none', changeType: 'data_refresh', action: 'observed', checkedAt: '2026-07-31 08:00',
    summary: '同结构数据刷新完成，订阅权益沿用当前托管连接。'
  },
  {
    id: 'asset-monitor-002', resourceId: 'asset-warehouse-turnover', resourceName: '仓储周转效率数据集', productId: 'prod-warehouse-turnover-risk',
    previousVersion: 'v2.3.2', currentVersion: 'v2.4.0', risk: 'high', changeType: 'schema_change', action: 'purchase_paused', checkedAt: '2026-07-31 08:00',
    summary: '关键字段 turnover_days 类型变化；已暂停新购，既有用户保留最近有效版本。'
  },
  {
    id: 'asset-monitor-003', resourceId: 'res-asset-warehouse-api', resourceName: '仓储利用率查询 API',
    previousVersion: 'v1.8.0', currentVersion: 'v1.8.1', risk: 'low', changeType: 'data_refresh', action: 'observed', checkedAt: '2026-07-31 08:00',
    summary: '元数据描述更新，未影响商品字段结构。'
  }
]
