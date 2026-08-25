import type { DatasetDetail, DatasetField } from '@/types/domain'
import type { ListableArtifact } from '@/types/sellerMarket'
import { fallbackSellerDatasetDetail } from '@/data/sellerDatasets'
import { coerceUpdateFrequency, isUpdateFrequency } from '@/domain/updateFrequency'

/** 卖家上架时填写、发布后写入商品详情的说明书 */
export interface SellerListingCatalogSpec {
  granularity: string
  timeRange: string
  rowCount?: number
  fieldCount?: number | null
  coverage: string
  updateFrequency: string
  scenarios: string[]
  description: string
  valueProposition: string
  qualityPromise: string
  complianceNote: string
  classification: string
  fields: DatasetField[]
  sampleColumns: string[]
  sampleRows: Array<Record<string, string | number | boolean>>
  sampleGeneratedAt: string
}

const STOREFRONT_COPY: Record<string, Pick<SellerListingCatalogSpec, 'coverage' | 'updateFrequency' | 'scenarios' | 'description' | 'valueProposition' | 'qualityPromise' | 'complianceNote'>> = {
  'artifact-route-otp': {
    coverage: '沪苏浙皖主要干线 86 条',
    updateFrequency: '每日更新',
    scenarios: ['线路时效分析', '延误预警'],
    description: '华东干线准点率、平均时效与延误单量，按线路与车型汇总。由入驻商家基于用数成果上架。',
    valueProposition: '帮助货主与承运商快速定位延误瓶颈。',
    qualityPromise: '基于卖家自有运单样本，口径见字段说明',
    complianceNote: '已脱敏企业与司机明细；不含个人信息对外售卖'
  },
  'artifact-warehouse-health': {
    coverage: '华东 12 仓',
    updateFrequency: '每周更新',
    scenarios: ['仓储运营'],
    description: '仓网周转天数、积压 SKU 与补货建议，来源为入驻商家衍生加工成果。',
    valueProposition: '快速识别高积压仓与滞销品类。',
    qualityPromise: '基于已购数据集二次加工，受源许可约束',
    complianceNote: '衍生数据；使用受限，禁止再转售明细'
  },
  'artifact-driver-score': {
    coverage: '自有运力范围',
    updateFrequency: '每周更新',
    scenarios: ['运力管理'],
    description: '司机绩效分与准点率周报，不含姓名手机等个人信息。',
    valueProposition: '快速查看运力质量周报。',
    qualityPromise: '自有绩效指标，口径见字段说明',
    complianceNote: '无个人信息对外售卖；自有数据'
  }
}

function cloneDetail<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function parseListingScenarios(raw: string): string[] {
  return raw.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
}

export function listingCatalogSpecFromArtifact(artifact: ListableArtifact): SellerListingCatalogSpec {
  const detail = artifact.datasetDetail
  const copy = STOREFRONT_COPY[artifact.id]
  return {
    granularity: detail?.granularity ?? '',
    timeRange: detail?.timeRange ?? '',
    rowCount: detail?.rowCount,
    fieldCount: detail?.fieldCount,
    coverage: copy?.coverage ?? '',
    updateFrequency: coerceUpdateFrequency(copy?.updateFrequency ?? ''),
    scenarios: copy?.scenarios ? [...copy.scenarios] : [],
    description: copy?.description ?? '',
    valueProposition: copy?.valueProposition ?? '',
    qualityPromise: copy?.qualityPromise ?? '',
    complianceNote: copy?.complianceNote ?? artifact.licenseSummary,
    classification: detail?.classification ?? '',
    fields: cloneDetail(detail?.fields ?? []),
    sampleColumns: [...(detail?.sampleColumns ?? [])],
    sampleRows: cloneDetail(detail?.sampleRows ?? []),
    sampleGeneratedAt: detail?.sampleGeneratedAt ?? ''
  }
}

export function assertSellerListingSpec(spec: SellerListingCatalogSpec): SellerListingCatalogSpec {
  const coverage = spec.coverage.trim()
  const updateFrequency = spec.updateFrequency.trim()
  const description = spec.description.trim()
  const valueProposition = spec.valueProposition.trim()
  const qualityPromise = spec.qualityPromise.trim()
  const complianceNote = spec.complianceNote.trim()
  const scenarios = spec.scenarios.map((item) => item.trim()).filter(Boolean)
  const fields = spec.fields
    .map((field) => ({
      ...field,
      name: field.name.trim(),
      dataType: field.dataType.trim() || 'string',
      meaning: field.meaning.trim(),
      description: field.description.trim()
    }))
    .filter((field) => field.name || field.meaning)
  if (!coverage) throw new Error('请填写地域范围')
  if (!isUpdateFrequency(updateFrequency)) throw new Error('请选择更新频率')
  if (!scenarios.length) throw new Error('请填写应用场景')
  if (!description) throw new Error('请填写详细描述')
  if (!valueProposition) throw new Error('请填写价值主张')
  if (!qualityPromise) throw new Error('请填写质量承诺')
  if (!complianceNote) throw new Error('请填写合规声明')
  if (!fields.length) throw new Error('请至少填写一个字段')
  const incomplete = fields.find((field) => !field.name || !field.meaning)
  if (incomplete) throw new Error('每个字段须填写字段名和业务含义')
  const sampleColumns = spec.sampleColumns.length ? spec.sampleColumns : fields.map((field) => field.name)
  return {
    ...spec,
    granularity: spec.granularity.trim(),
    timeRange: spec.timeRange.trim(),
    coverage,
    updateFrequency,
    scenarios,
    description,
    valueProposition,
    qualityPromise,
    complianceNote,
    classification: spec.classification.trim(),
    fields,
    sampleColumns,
    sampleRows: spec.sampleRows,
    sampleGeneratedAt: spec.sampleGeneratedAt.trim()
  }
}

export function datasetDetailFromListingSpec(artifact: ListableArtifact, spec: SellerListingCatalogSpec): DatasetDetail {
  const base = cloneDetail(artifact.datasetDetail || fallbackSellerDatasetDetail())
  const fieldCount = spec.fieldCount === null
    ? null
    : spec.fieldCount != null && !Number.isNaN(spec.fieldCount)
      ? spec.fieldCount
      : spec.fields.length || undefined
  return {
    ...base,
    granularity: spec.granularity || undefined,
    timeRange: spec.timeRange || undefined,
    rowCount: spec.rowCount,
    fieldCount,
    classification: spec.classification || base.classification,
    fields: spec.fields,
    sampleColumns: spec.sampleColumns,
    sampleRows: spec.sampleRows,
    sampleGeneratedAt: spec.sampleGeneratedAt || base.sampleGeneratedAt
  }
}

export function emptyListingField(): DatasetField {
  return {
    name: '',
    dataType: 'string',
    meaning: '',
    description: '',
    primaryKey: false,
    nullable: true
  }
}
