import { describe, expect, it } from 'vitest'
import {
  assertSellerListingSpec,
  datasetDetailFromListingSpec,
  listingCatalogSpecFromArtifact
} from './sellerListingSpec'
import type { ListableArtifact } from '@/types/sellerMarket'

const artifact: ListableArtifact = {
  id: 'artifact-demo',
  name: '演示数据集',
  type: 'dataset',
  version: 'v1',
  sourceModule: 'bi-workbench',
  dataProvenance: 'owned',
  licenseSummary: '自有数据',
  updatedAt: '2026-08-08',
  datasetDetail: {
    granularity: '线路 × 日',
    timeRange: '近 12 个月',
    rowCount: 100,
    classification: 'L2',
    qualityUpdatedAt: '2026-08-08',
    fields: [
      { name: 'route_id', dataType: 'string', meaning: '线路', description: '', primaryKey: true, nullable: false }
    ],
    sampleColumns: ['route_id'],
    sampleRows: [{ route_id: 'SH-NJ-01' }],
    sampleGeneratedAt: '2026-08-08',
    profiling: {
      completeness: '99%',
      uniqueness: '唯一',
      nullRate: '1%',
      distribution: '—',
      anomalies: '—',
      conclusion: '可用',
      updatedAt: '2026-08-08'
    }
  }
}

describe('seller listing catalog spec', () => {
  it('prefills metrics and fields from the listable dataset', () => {
    const spec = listingCatalogSpecFromArtifact(artifact)
    expect(spec.granularity).toBe('线路 × 日')
    expect(spec.rowCount).toBe(100)
    expect(spec.fields[0]?.name).toBe('route_id')
    expect(spec.sampleRows[0]).toEqual({ route_id: 'SH-NJ-01' })
  })

  it('rejects a listing spec missing storefront copy', () => {
    const spec = {
      ...listingCatalogSpecFromArtifact(artifact),
      coverage: '华东',
      updateFrequency: '每周更新',
      scenarios: ['仓储运营'],
      description: '周转与积压',
      valueProposition: '识别积压仓',
      qualityPromise: '口径已声明',
      complianceNote: '禁止再转售明细'
    }
    expect(() => assertSellerListingSpec({ ...spec, description: '' })).toThrow('请填写详细描述')
    expect(() => assertSellerListingSpec({ ...spec, coverage: '' })).toThrow('请填写地域范围')
    expect(() => assertSellerListingSpec({ ...spec, updateFrequency: '' })).toThrow('请选择更新频率')
    expect(() => assertSellerListingSpec({ ...spec, updateFrequency: '每周一更新' })).toThrow('请选择更新频率')
    expect(() => assertSellerListingSpec({ ...spec, fields: [] })).toThrow('请至少填写一个字段')
  })

  it('writes seller-edited spec onto the published dataset detail', () => {
    const spec = assertSellerListingSpec({
      ...listingCatalogSpecFromArtifact(artifact),
      granularity: '仓库 × 周',
      coverage: '华东 12 仓',
      updateFrequency: '每周更新',
      scenarios: ['仓储运营'],
      description: '周转与积压',
      valueProposition: '识别积压仓',
      qualityPromise: '口径已声明',
      complianceNote: '禁止再转售明细'
    })
    const detail = datasetDetailFromListingSpec(artifact, spec)
    expect(detail.granularity).toBe('仓库 × 周')
    expect(detail.fields).toHaveLength(1)
    expect(detail.profiling.conclusion).toBe('可用')
  })
})
