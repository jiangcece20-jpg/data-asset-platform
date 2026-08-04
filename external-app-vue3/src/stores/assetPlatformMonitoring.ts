import { defineStore } from 'pinia'
import { seedAssetPlatformMonitorRecords } from '@/data/assetPlatformMonitoring'
import type { AssetPlatformMonitorRecord } from '@/data/assetPlatformMonitoring'

export const useAssetPlatformMonitoringStore = defineStore('assetPlatformMonitoring', {
  state: () => ({
    enabled: false,
    mode: 'architecture_placeholder' as const,
    lastRunAt: '2026-07-31 08:00',
    records: seedAssetPlatformMonitorRecords.map((item) => ({ ...item })) as AssetPlatformMonitorRecord[]
  }),
  getters: {
    highRiskCount: (state) => state.records.filter((item) => item.risk === 'high').length,
    monitoredProductCount: (state) => new Set(state.records.map((item) => item.productId).filter(Boolean)).size
  }
})
