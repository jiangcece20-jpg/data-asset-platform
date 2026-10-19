import type { PublicUseDatasetSnapshot } from '@/stores/catalog'
import type { Resource } from '@/types/resource'
import { PUBLIC_DATASET_PROVIDER, PUBLIC_DATASET_UPDATE_FREQUENCY } from '@/domain/publicDataset'

/** 原型预置已由采集流程同步、尚未建品的资源，不暴露手动同步入口。 */
export function publicUseDatasetResourceSample(): Resource {
  const source = publicUseDatasetSample()
  return {
    id: source.resourceId, resourceName: source.name, description: source.description,
    type: 'dataset', origin: 'asset_platform', createdAt: source.updatedAt, updatedAt: source.updatedAt,
    sourcePublicDataset: true, sourceDatasetAvailable: true, assetStatus: 'published', commercializable: true,
    publicDatasetMetadata: {
      ...source.metadata,
      provider: PUBLIC_DATASET_PROVIDER,
      coverage: '',
      updateFrequency: PUBLIC_DATASET_UPDATE_FREQUENCY
    },
    lastSyncedAt: '2026-10-12 09:00',
    typeDetail: { dataset: {
      classification: '公开数据', blankOverview: true, granularity: '', timeRange: '',
      fieldCount: null, qualityUpdatedAt: source.updatedAt, dataUpdatedAt: source.updatedAt, fields: source.fields,
      sampleColumns: [], sampleRows: [], sampleGeneratedAt: '',
      profiling: { completeness: '', uniqueness: '', nullRate: '', distribution: '', anomalies: '', conclusion: '', updatedAt: '' }
    } }
  }
}

export function publicUseDatasetSample(): PublicUseDatasetSnapshot {
  return {
    resourceId: 'res-use-public-city-flow', name: '城市货运公开数据集',
    description: '全国城市货运量公开统计，按月汇总。',
    isPublic: true, available: true, updatedAt: '2026-10-09',
    metadata: { scenarios: ['城市货运分析'] },
    fields: [
      { name: 'city', dataType: 'string', meaning: '城市', description: '城市名称', primaryKey: true, nullable: false },
      { name: 'volume', dataType: 'number', meaning: '货运量', description: '货运量（万吨）', primaryKey: false, nullable: false }
    ],
    detail: { granularity: '城市 × 月', rowCount: 2, fieldCount: 2,
      sampleColumns: ['city', 'volume'], sampleRows: [{ city: '北京', volume: 128 }, { city: '上海', volume: 156 }], sampleGeneratedAt: '2026-10-09' }
  }
}
