import type { Product } from '@/types/domain'
import type { PublicDatasetDisplay, Resource } from '@/types/resource'
import { truncateProductName } from './resourceManagement'

export const PUBLIC_DATASET_PROVIDER = '万联灵析'
export const PUBLIC_DATASET_UPDATE_FREQUENCY = '每天更新'

export function isPublicDatasetProduct(product: Product, resource?: Resource): resource is Resource {
  return product.type === 'dataset' && product.origin === 'asset_platform'
    && product.price.model === 'member_free' && resource?.sourcePublicDataset !== undefined
}

export function publicDatasetRestoreIssues(resource: Resource): string[] {
  return publicDatasetIssues(resource).map(issue => issue === '源端未公开'
    ? '公开状态已取消，须先恢复源端公开'
    : issue)
}

export function publicDatasetDisplay(resource: Resource): PublicDatasetDisplay {
  const detail = resource.typeDetail.dataset
  return {
    productName: truncateProductName(resource.productNameDraft ?? resource.resourceName),
    resourceName: resource.resourceName, description: resource.description || '',
    coverage: resource.publicDatasetMetadata?.coverage || '',
    updateFrequency: PUBLIC_DATASET_UPDATE_FREQUENCY,
    granularity: detail?.granularity || '', timeRange: detail?.timeRange || '',
    rowCount: detail?.rowCount, fieldCount: detail?.fieldCount ?? null
  }
}

export function applyPublicDatasetOverrides(resource: Resource) {
  const changes = resource.publicDatasetOverrides
  if (!changes) return
  if (changes.productName !== undefined) resource.productNameDraft = truncateProductName(changes.productName)
  if (changes.resourceName !== undefined) resource.resourceName = changes.resourceName
  if (changes.description !== undefined) resource.description = changes.description
  for (const key of ['coverage'] as const) {
    if (key in changes && resource.publicDatasetMetadata) resource.publicDatasetMetadata[key] = changes[key]!
  }
  const detail = resource.typeDetail.dataset
  if (!detail) return
  for (const key of ['granularity', 'timeRange'] as const) {
    if (key in changes) detail[key] = changes[key]
  }
  if ('rowCount' in changes) detail.rowCount = changes.rowCount
  if ('fieldCount' in changes) detail.fieldCount = changes.fieldCount
}

export function publicDatasetIssues(resource: Resource): string[] {
  const missing: string[] = []
  if (resource.type !== 'dataset' || !resource.sourcePublicDataset) missing.push('源端未公开')
  if (!resource.sourceDatasetAvailable) missing.push('源端数据不可用')
  if (resource.publicSyncError) missing.push('同步失败，请重试')
  for (const [label, value] of [
    ['名称', resource.resourceName], ['商品名称', publicDatasetDisplay(resource).productName], ['简介', resource.description],
    ['数据更新时间', resource.typeDetail.dataset?.qualityUpdatedAt]
  ]) {
    if (!value?.trim()) missing.push(`缺少${label}`)
  }
  const fields = resource.typeDetail.dataset?.fields
  if (!fields?.length || fields.some((field) => !field.name.trim() || !field.dataType.trim())) missing.push('字段信息不完整')
  return missing
}

// 引用资源当前展示资料（含运营补充），保留商品 ID、价格和运营配置。
export function publicDatasetPresentation(resource: Resource): Partial<Product> {
  const meta = resource.publicDatasetMetadata
  return {
    name: publicDatasetDisplay(resource).productName, subtitle: resource.description || '', description: resource.description || '',
    provider: PUBLIC_DATASET_PROVIDER, coverage: meta?.coverage || '', updateFrequency: PUBLIC_DATASET_UPDATE_FREQUENCY,
    scenarios: [...(meta?.scenarios || [])], valueProposition: meta?.valueProposition || '',
    qualityPromise: meta?.qualityPromise || '', complianceNote: meta?.complianceNote || '',
    deliveryMethod: '用数模块在线使用', typeDetail: { dataset: resource.typeDetail.dataset },
    updatedAt: resource.updatedAt
  }
}
