import type { Product, ProductType, SpaceSyncMeta } from '@/types/domain'
import { originMeta, listedAtOf } from '@/utils/productMeta'

/**
 * 详情页信息分块（PC 门户与 APP 共用）：
 * 1. 关键指标 —— 各类型详情组件自行组装
 * 2. 资源信息 —— resourceInfoFields
 * 3. 合规与授权 —— complianceFields
 * 4. 商品说明书 —— 页面直接读取 product 的可编辑文案
 *
 * 同名字段（数据范围/覆盖范围、应用场景、提供方等）在此统一去重，
 * 空间商品优先取 spaceMeta 同步值并标记 synced。
 */
export interface DetailFieldItem {
  label: string
  value: string
  /** 值来自可信空间同步，展示「· 同步」标记 */
  synced?: boolean
  /** 占满整行 */
  full?: boolean
  /** 值为文件链接时的地址 */
  href?: string
}

const PLACEHOLDER = '—'

const spaceTypeLabel: Record<ProductType, string> = {
  dataset: '数据集',
  api: 'API 服务',
  report: '报告',
  dashboard: '看板'
}

export function isSpaceSyncedProduct(product?: Product | null): boolean {
  return Boolean(product && (product.dealChannel === 'space_purchase' || product.origin === 'trusted_space'))
}

/**
 * 空间商品即使 store 里尚未写入完整 spaceMeta，也用商品字段兜底，
 * 避免「已同步但页面看不到」的空白块。
 */
export function resolveSpaceMeta(product?: Product | null): SpaceSyncMeta | null {
  const m = product?.spaceMeta ?? null
  if (!product || !isSpaceSyncedProduct(product)) return m
  return {
    ...m,
    resourceName: m?.resourceName || product.name,
    resourceType: m?.resourceType || spaceTypeLabel[product.type],
    resourceDescription: m?.resourceDescription || product.description || product.subtitle,
    department: m?.department || '大数据局',
    industryCategory: m?.industryCategory || '交通运输',
    regionCategory: m?.regionCategory || product.coverage,
    coverageTimeRange: m?.coverageTimeRange || product.typeDetail.dataset?.timeRange,
    deliveryMode: m?.deliveryMode || product.deliveryMethod,
    applicationScenario: m?.applicationScenario || product.scenarios?.join('、'),
    classificationStandard: m?.classificationStandard || '政务数据分类标准',
    classificationPath: m?.classificationPath || '政务数据分类标准 / 组织数据 / 企事业单位',
    classificationLevel: m?.classificationLevel ?? 2
  }
}

function push(items: DetailFieldItem[], item: DetailFieldItem | null) {
  if (item) items.push(item)
}

function field(
  label: string,
  value: string | number | null | undefined,
  opts: { synced?: boolean; full?: boolean; href?: string; keepEmpty?: boolean } = {}
): DetailFieldItem | null {
  const text = value === null || value === undefined || value === '' ? PLACEHOLDER : String(value)
  if (text === PLACEHOLDER && !opts.keepEmpty) return null
  return { label, value: text, synced: opts.synced, full: opts.full, href: opts.href }
}

/**
 * 块 2「资源信息」：商品通用运营信息 + 空间同步的资源属性，合并后每个字段只出现一次。
 * 资源名/资源类型不在此重复（已由页面标题与类型徽标承载）。
 * @param opts.includeDepartment 运营编辑页可展示「部门」；前台详情默认不展示（与「提供方」易混淆）
 */
export function resourceInfoFields(
  product?: Product | null,
  opts: { includeDepartment?: boolean } = {}
): DetailFieldItem[] {
  if (!product) return []
  const m = resolveSpaceMeta(product)
  const synced = isSpaceSyncedProduct(product)
  const items: DetailFieldItem[] = []

  push(items, field('提供方', m?.providerName || product.provider, { synced: synced && Boolean(m?.providerName), keepEmpty: true }))
  if (product.origin === 'seller_market') {
    push(items, field('入驻卖家', product.sellerName || product.provider))
    push(items, field('数据来源声明', product.dataProvenance === 'derived' ? '已购衍生（受源许可约束）' : '自有数据'))
  }
  if (opts.includeDepartment) {
    push(items, field('部门', m?.department, { synced }))
  }
  push(items, field('行业分类', m?.industryCategory, { synced }))
  push(items, field('地域范围', m?.regionCategory || product.coverage, { synced: synced && Boolean(m?.regionCategory), keepEmpty: true }))
  push(items, field('覆盖时间范围', m?.coverageTimeRange, { synced }))
  push(items, field('更新频率', product.updateFrequency, { synced, keepEmpty: true }))
  push(items, field('交付方式', m?.deliveryMode || product.deliveryMethod, { synced: synced && Boolean(m?.deliveryMode), keepEmpty: true }))
  push(items, field('交付方式说明', m?.deliveryNoteUrl ? '查看文件' : null, { synced, href: m?.deliveryNoteUrl }))
  push(items, field('来源', originMeta[product.origin], { keepEmpty: true }))
  push(items, field('上架时间', listedAtOf(product), { synced, keepEmpty: true }))
  push(items, field('应用场景', m?.applicationScenario || product.scenarios?.join('、'), { synced: synced && Boolean(m?.applicationScenario), full: true }))

  if (product.assetSnapshot) {
    push(items, field('资产版本', product.assetSnapshot.assetVersion))
    push(items, field('最后监测', product.assetSnapshot.lastCheckedAt))
  }
  return items
}

/** 块 3「合规与授权」：数据属性 + 使用限制 + 分类分级，均为空间同步只读 */
export function complianceFields(product?: Product | null): DetailFieldItem[] {
  if (!product) return []
  const m = resolveSpaceMeta(product)
  if (!m) return []
  const synced = isSpaceSyncedProduct(product)
  const items: DetailFieldItem[] = []

  push(items, field('数据主体', m.dataSubject, { synced }))
  push(items, field('是否涉及个人信息', m.personalInfo == null ? null : (m.personalInfo ? '是' : '否'), { synced }))
  push(items, field('授权使用', m.authorizedUse == null ? null : (m.authorizedUse ? '是' : '否'), { synced }))
  push(items, field('数据规模', m.dataVolume, { synced }))
  push(items, field('分类标准', m.classificationStandard, { synced }))
  push(items, field('分级', m.classificationLevel == null ? null : `${m.classificationLevel} 级`, { synced }))
  push(items, field('分类', m.classificationPath, { synced, full: true }))
  if (m.usageRestrictions?.length) {
    const note = m.restrictionNote ? `；其他说明：${m.restrictionNote}` : ''
    push(items, field('使用限制', m.usageRestrictions.join('、') + note, { synced, full: true }))
  }
  return items
}

/** 块 3 附属：声明类文件链接 */
export function declarationLinks(product?: Product | null): DetailFieldItem[] {
  const m = product?.spaceMeta
  if (!m) return []
  const links: Array<[string, string | undefined]> = [
    ['合法合规声明', m.complianceDeclarationUrl],
    ['数据来源声明', m.dataSourceDeclarationUrl],
    ['数据样例', m.dataSampleUrl],
    ['安全分类分级', m.securityClassificationUrl],
    ['数据质量评估报告', m.qualityAssessmentUrl]
  ]
  return links
    .filter(([, url]) => Boolean(url))
    .map(([label, url]) => ({ label, value: '查看文件', href: url, synced: true }))
}

/** 提供方主体信息（空间同步） */
export function providerFields(product?: Product | null): DetailFieldItem[] {
  const m = product?.spaceMeta
  if (!m?.providerName) return []
  const items: DetailFieldItem[] = []
  push(items, field('提供方', m.providerName, { synced: true }))
  push(items, field('主体类型', m.providerEntityType, { synced: true }))
  push(items, field('主体信息', m.providerEntityInfo, { synced: true, full: true }))
  push(items, field('简介', m.providerBrief, { synced: true, full: true }))
  if (m.authorizationLetterUrl) {
    items.push({ label: '授权委托书', value: '查看文件', href: m.authorizationLetterUrl, synced: true })
  }
  return items
}

/** 计费规则说明（购买面板展示） */
export function billingRuleNotes(product?: Product | null): string[] {
  const m = product?.spaceMeta
  if (!m) return []
  const rules = [...(m.billingRules ?? [])]
  if (m.billingNote && !rules.includes(m.billingNote)) rules.unshift(m.billingNote)
  return rules
}
