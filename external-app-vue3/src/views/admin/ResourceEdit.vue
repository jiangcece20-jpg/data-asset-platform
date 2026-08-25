<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import type { AcquisitionOption, CommerceContentKind, CommerceOffer, DatasetDetail, DatasetOffer, MemberTier, ProductType } from '@/types/domain'
import { listedAtOf } from '@/utils/productMeta'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'
import {
  deriveLegacyMemberFields,
  discountToZhe,
  MEMBER_TIER_LABELS,
  normalizeDiscountFactor,
  normalizeMemberBenefits,
  resolveMemberBenefits
} from '@/domain/memberBenefits'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'
import UpdateFrequencySelect from '@/components/shared/UpdateFrequencySelect.vue'
import { coerceUpdateFrequency } from '@/domain/updateFrequency'
import {
  listingBlockReason,
  salesStateOf,
  SALES_STATE_LABELS,
  validateDraftSave,
  validatePublish,
  type FieldError,
  type PublishForm
} from '@/domain/salesListing'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const resourceId = computed(() => route.params.id as string)
const resource = computed(() => catalog.resourceById(resourceId.value))
const product = computed(() => catalog.productForResource(resourceId.value))

const typeLabels: Record<string, string> = {
  dataset: '数据集',
  api: 'API',
  report: '报告',
  dashboard: '看板',
  user_view: '用数视图'
}

const originLabels: Record<string, string> = {
  asset_platform: '资产平台',
  app_content: 'APP内容',
  trusted_space: '可信空间',
  user_created: '用户创建',
  seller_market: '入驻商家'
}

function goBack() {
  router.push('/admin/resources')
}

// ---------------------------------------------------------------------------
// 编辑表单状态
// ---------------------------------------------------------------------------

const editable = computed(() => resource.value?.type !== 'user_view')
const dealChannel = computed(() => product.value?.dealChannel ?? 'app_payment')
const publishErrors = ref<FieldError[]>([])
const salesState = computed(() => salesStateOf(product.value))
const listingBlocked = computed(() => (resource.value ? listingBlockReason(resource.value) : undefined))
const canSave = computed(() => editable.value)
const showPublish = computed(
  () => !listingBlocked.value && (salesState.value === 'unlisted' || salesState.value === 'draft')
)

// --- 商品信息表单（含运营增强） ---
const productForm = reactive({
  name: '',
  subtitle: '',
  description: '',
  valueProposition: '',
  scenarios: '',
  isFree: false,
  salePeriodMonths: 12,
  /** 普通/高级会员：同级免费与折扣互斥 */
  standardMemberMode: 'none' as 'none' | 'free' | 'discount',
  standardMemberZhe: 6,
  premiumMemberMode: 'none' as 'none' | 'free' | 'discount',
  premiumMemberZhe: 6,
  coverage: '',
  updateFrequency: '',
  deliveryMethod: '',
  provider: '',
  qualityPromise: '',
  complianceNote: '',
  // 运营增强
  recommendText: '',
  tags: '',
  sortWeight: 50,
  recommendSlot: false
})
const productSaved = ref(false)
type DashboardMetricForm = {
  name: string
  definition: string
  formula: string
  dimensions: string
}
const dashboardForm = reactive({
  timeRange: '',
  updateCycle: '',
  exportRule: '',
  metrics: [] as DashboardMetricForm[]
})
const dashboardConfigSaved = ref(false)
/** 数据集关键指标：运营配置、非必填；空则前台不展示 */
const datasetForm = reactive({
  granularity: '',
  timeRange: '',
  rowCount: '' as string,
  fieldCount: '' as string
})
const reportForm = reactive({
  publishedAt: '',
  pageCount: 0,
  author: '',
  version: '',
  audience: '',
  license: ''
})
const reportConfigSaved = ref(false)
type ItemOfferForm = {
  id: string
  enabled: boolean
  subject: 'personal' | 'enterprise'
  price: number
  allowDownload: boolean
}
const itemOfferForm = reactive({
  personal: { id: '', enabled: false, subject: 'personal', price: 0, allowDownload: false } as ItemOfferForm,
  enterprise: { id: '', enabled: false, subject: 'enterprise', price: 0, allowDownload: false } as ItemOfferForm
})

// --- 数据探查配置 ---
const profilingSelection = ref<string[]>([])
const profilingSaved = ref(false)

const datasetFields = computed(() => {
  const d = product.value?.typeDetail.dataset ?? resource.value?.typeDetail.dataset
  if (!d) return []
  const stats = d.fieldProfiling ?? []
  return d.fields.map((f) => ({
    name: f.name,
    meaning: f.meaning,
    dataType: f.dataType,
    sensitive: f.primaryKey || f.sensitivity === 'L2' || f.sensitivity === 'L3',
    sensitivityLabel: f.primaryKey ? '主键' : (f.sensitivity ?? ''),
    hasStat: stats.some((s) => s.fieldName === f.name)
  }))
})

const selectableFields = computed(() => datasetFields.value.filter((f) => f.hasStat))
const allSelectableChecked = computed(
  () => selectableFields.value.length > 0 && selectableFields.value.every((f) => profilingSelection.value.includes(f.name))
)
const someSelectableChecked = computed(
  () => profilingSelection.value.length > 0 && !allSelectableChecked.value
)

function toggleSelectAll() {
  profilingSelection.value = allSelectableChecked.value ? [] : selectableFields.value.map((f) => f.name)
}

// ---------------------------------------------------------------------------
// 从 store 同步表单
// ---------------------------------------------------------------------------

function currentPublishForm(): PublishForm {
  return {
    name: productForm.name,
    dealChannel: dealChannel.value,
    isFree: productForm.isFree,
    salePeriodMonths: Number(productForm.salePeriodMonths),
    personalEnabled: itemOfferForm.personal.enabled,
    personalPrice: Number(itemOfferForm.personal.price),
    enterpriseEnabled: itemOfferForm.enterprise.enabled,
    enterprisePrice: Number(itemOfferForm.enterprise.price),
    standardMemberMode: productForm.standardMemberMode,
    standardMemberZhe: Number(productForm.standardMemberZhe),
    premiumMemberMode: productForm.premiumMemberMode,
    premiumMemberZhe: Number(productForm.premiumMemberZhe),
    hasSpacePrice: Boolean(
      product.value?.datasetOffers?.length || product.value?.typeDetail.api?.pricingPlans?.length
    ),
    dashboardMetrics: dashboardForm.metrics.map((metric) => ({
      name: metric.name,
      definition: metric.definition
    }))
  }
}

function syncFormFromStore() {
  const p = product.value
  if (!p) {
    productForm.name = resource.value?.resourceName ?? ''
    productForm.subtitle = ''
    productForm.description = ''
    productForm.valueProposition = ''
    productForm.scenarios = ''
    productForm.isFree = false
    productForm.salePeriodMonths = 12
    productForm.standardMemberMode = 'none'
    productForm.standardMemberZhe = 6
    productForm.premiumMemberMode = 'none'
    productForm.premiumMemberZhe = 6
    productForm.coverage = ''
    productForm.updateFrequency = ''
    productForm.deliveryMethod = ''
    productForm.provider = ''
    productForm.qualityPromise = ''
    productForm.complianceNote = ''
    productForm.recommendText = ''
    productForm.tags = ''
    productForm.sortWeight = 50
    productForm.recommendSlot = false
    itemOfferForm.personal.id = ''
    itemOfferForm.personal.enabled = false
    itemOfferForm.personal.price = 0
    itemOfferForm.personal.allowDownload = false
    itemOfferForm.enterprise.id = ''
    itemOfferForm.enterprise.enabled = false
    itemOfferForm.enterprise.price = 0
    itemOfferForm.enterprise.allowDownload = false
    datasetForm.granularity = ''
    datasetForm.timeRange = ''
    datasetForm.rowCount = ''
    datasetForm.fieldCount = ''
    dashboardForm.timeRange = ''
    dashboardForm.updateCycle = ''
    dashboardForm.exportRule = ''
    dashboardForm.metrics.splice(0)
    reportForm.publishedAt = ''
    reportForm.pageCount = 0
    reportForm.author = ''
    reportForm.version = ''
    reportForm.audience = ''
    reportForm.license = ''
    profilingSelection.value = (resource.value?.typeDetail.dataset?.fields ?? [])
      .filter((f) => f.profilingEnabled)
      .map((f) => f.name)
    publishErrors.value = []
    productSaved.value = false
    dashboardConfigSaved.value = false
    reportConfigSaved.value = false
    profilingSaved.value = false
    return
  }

  // 商品信息
  productForm.name = p.name
  productForm.subtitle = p.subtitle
  productForm.description = p.description
  productForm.valueProposition = p.valueProposition
  productForm.scenarios = (p.scenarios || []).join('、')
  productForm.isFree = p.acquisitions.includes('free')
  productForm.salePeriodMonths = salePeriodMonthsOf(p)
  const benefits = resolveMemberBenefits(p)
  const standard = benefits.find((item) => item.tier === 'standard')
  const premium = benefits.find((item) => item.tier === 'premium')
  productForm.standardMemberMode = standard ? standard.mode : 'none'
  productForm.standardMemberZhe = discountToZhe(standard?.discount ?? p.price.memberDiscount)
  productForm.premiumMemberMode = premium ? premium.mode : 'none'
  productForm.premiumMemberZhe = discountToZhe(premium?.discount ?? p.price.premiumMemberDiscount)
  productForm.coverage = p.coverage
  productForm.updateFrequency = coerceUpdateFrequency(p.updateFrequency)
  productForm.deliveryMethod = p.deliveryMethod
  productForm.provider = p.provider
  productForm.qualityPromise = p.qualityPromise
  productForm.complianceNote = p.complianceNote

  // 运营增强
  productForm.recommendText = p.recommendText || ''
  productForm.tags = (p.tags || []).join('、')
  productForm.sortWeight = p.sortWeight ?? 50
  productForm.recommendSlot = p.recommendSlot ?? false

  const offers = commerceOffersOf(p)
  syncItemOffer(itemOfferForm.personal, offers, p.price.itemPrice ?? 0)
  syncItemOffer(itemOfferForm.enterprise, offers, (p.price.itemPrice ?? 0) * 10)

  // 看板展示配置：原型阶段由商品 Mock 初始化，保存时同步商品与关联资源。
  const dashboard = p.typeDetail.dashboard
  dashboardForm.timeRange = dashboard?.timeRange ?? ''
  dashboardForm.updateCycle = dashboard?.updateCycle ?? ''
  dashboardForm.exportRule = dashboard?.exportRule ?? ''
  dashboardForm.metrics.splice(
    0,
    dashboardForm.metrics.length,
    ...(dashboard?.metrics ?? []).map((metric) => ({
      name: metric.name,
      definition: metric.definition,
      formula: metric.formula,
      dimensions: metric.dimensions.join('、')
    }))
  )

  // 数据集关键指标（运营配置）
  const dataset = p.typeDetail.dataset
  datasetForm.granularity = dataset?.granularity ?? ''
  datasetForm.timeRange = dataset?.timeRange ?? ''
  datasetForm.rowCount = dataset?.rowCount != null ? String(dataset.rowCount) : ''
  datasetForm.fieldCount =
    dataset?.fieldCount != null
      ? String(dataset.fieldCount)
      : dataset?.fieldCount === null
        ? ''
        : dataset?.fields?.length
          ? String(dataset.fields.length)
          : ''

  // 报告介绍配置：对应前台「报告介绍」类型特有字段。
  const report = p.typeDetail.report
  reportForm.publishedAt = report?.publishedAt ?? ''
  reportForm.pageCount = report?.pageCount ?? 0
  reportForm.author = report?.author ?? ''
  reportForm.version = report?.version ?? ''
  reportForm.audience = report?.audience ?? ''
  reportForm.license = report?.license ?? ''

  // 探查字段
  profilingSelection.value = (p.typeDetail.dataset?.fields ?? [])
    .filter((f) => f.profilingEnabled)
    .map((f) => f.name)

  productSaved.value = false
  dashboardConfigSaved.value = false
  reportConfigSaved.value = false
  profilingSaved.value = false
}

function syncItemOffer(target: ItemOfferForm, offers: CommerceOffer[], fallbackPrice: number) {
  const candidates = offers.filter((offer) => offer.subject === target.subject)
  const source = candidates.find((offer) => offer.serviceMode === 'one_time') ?? candidates[0]
  target.id = source?.id ?? `offer-${product.value?.id}-${target.subject}-item`
  target.enabled = Boolean(source)
  target.price = source?.price ?? fallbackPrice
  target.allowDownload = Boolean(source?.allowDownload)
}

watch([product, resourceId], syncFormFromStore, { immediate: true })

// ---------------------------------------------------------------------------
// 保存动作
// ---------------------------------------------------------------------------

function saveProduct() {
  const res = resource.value
  if (!res || res.type === 'user_view') return
  const errors = validateDraftSave(currentPublishForm())
  if (errors.length) {
    publishErrors.value = errors
    return
  }
  publishErrors.value = []
  let p = product.value
  if (!p) {
    const blocked = listingBlockReason(res)
    if (blocked) {
      publishErrors.value = [{ field: 'listing', message: blocked }]
      return
    }
    p = catalog.listResource(res.id, {
      name: productForm.name.trim(),
      subtitle: productForm.subtitle,
      price: {
        model: productForm.isFree ? 'free' : 'item_only',
        itemPrice: itemOfferForm.personal.price || 100,
        unit: '元/次'
      },
      acquisitions: buildAcquisitions(
        productForm.isFree,
        productForm.standardMemberMode !== 'none' || productForm.premiumMemberMode !== 'none',
        itemOfferForm.personal.enabled || itemOfferForm.enterprise.enabled
      ),
      scenarios: productForm.scenarios.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      tags: productForm.tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean)
    })
  }
  const appOffers = p.dealChannel === 'app_payment' && !productForm.isFree
    ? [itemOfferForm.personal, itemOfferForm.enterprise]
        .filter((offer) => offer.enabled)
        .map((offer) => normalizeItemOffer(p.type, offer))
    : []
  const datasetOffers = p.type === 'dataset' && p.dealChannel === 'app_payment'
    ? appOffers.map((offer): DatasetOffer => ({
        ...offer,
        licenseKind: 'snapshot',
        accessScope: offer.subject === 'personal' ? 'personal' : 'enterprise_wide',
        allowDownload: Boolean(offer.allowDownload),
        deliveryMode: 'snapshot'
      }))
    : p.datasetOffers
  const personalStartingPrice = appOffers
    .filter((offer) => offer.subject === 'personal')
    .reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY)
  const memberBenefits = productForm.isFree ? [] : buildMemberBenefitsFromForm()
  const hasItemOffer = appOffers.length > 0
  const legacyMember = deriveLegacyMemberFields(
    memberBenefits,
    {
      ...p.price,
      itemPrice: Number.isFinite(personalStartingPrice) ? personalStartingPrice : p.price.itemPrice
    },
    productForm.isFree,
    hasItemOffer
  )
  catalog.updateProduct(p.id, {
    name: productForm.name,
    subtitle: productForm.subtitle,
    description: productForm.description,
    valueProposition: productForm.valueProposition,
    scenarios: productForm.scenarios.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
    coverage: productForm.coverage,
    updateFrequency: coerceUpdateFrequency(productForm.updateFrequency),
    deliveryMethod: productForm.deliveryMethod,
    provider: productForm.provider,
    qualityPromise: productForm.qualityPromise,
    complianceNote: productForm.complianceNote,
    memberIncluded: legacyMember.memberIncluded,
    memberBenefits,
    acquisitions: buildAcquisitions(productForm.isFree, memberBenefits.length > 0, hasItemOffer),
    price: legacyMember.price,
    salePeriodMonths: Math.max(1, Number(productForm.salePeriodMonths) || 12),
    // 运营增强字段
    recommendText: productForm.recommendText,
    tags: productForm.tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean),
    sortWeight: Number(productForm.sortWeight),
    recommendSlot: productForm.recommendSlot,
    commerceOffers: p.dealChannel === 'app_payment' && p.type !== 'dataset' ? appOffers : p.commerceOffers,
    datasetOffers
  })
  if (p.type === 'dashboard') persistDashboardConfig()
  if (p.type === 'report') persistReportConfig()
  if (p.type === 'dataset') {
    persistDatasetMetrics()
    persistProfilingFields()
  }
  productSaved.value = true
  setTimeout(() => { productSaved.value = false }, 3000)
}

function parseOptionalCount(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function emptyDatasetDetail(): DatasetDetail {
  return {
    classification: '',
    qualityUpdatedAt: '',
    fields: [],
    sampleColumns: [],
    sampleRows: [],
    sampleGeneratedAt: '',
    profiling: {
      completeness: '',
      uniqueness: '',
      nullRate: '',
      distribution: '',
      anomalies: '',
      conclusion: '',
      updatedAt: ''
    }
  }
}

function persistDatasetMetrics() {
  const p = product.value
  if (!p || p.type !== 'dataset') return
  if (!p.typeDetail.dataset) {
    catalog.updateProduct(p.id, {
      typeDetail: { ...p.typeDetail, dataset: emptyDatasetDetail() }
    })
  }
  const fieldRaw = datasetForm.fieldCount.trim()
  catalog.updateDatasetMetrics(p.id, {
    granularity: datasetForm.granularity.trim() || undefined,
    timeRange: datasetForm.timeRange.trim() || undefined,
    rowCount: parseOptionalCount(datasetForm.rowCount),
    // 留空 → null（明确不展示）；有值 → number
    fieldCount: fieldRaw ? parseOptionalCount(datasetForm.fieldCount) ?? null : null
  })
}

function buildMemberBenefitsFromForm() {
  const list = []
  if (productForm.standardMemberMode === 'free') list.push({ tier: 'standard' as MemberTier, mode: 'free' as const })
  if (productForm.standardMemberMode === 'discount') {
    list.push({
      tier: 'standard' as MemberTier,
      mode: 'discount' as const,
      discount: normalizeDiscountFactor(productForm.standardMemberZhe)
    })
  }
  if (productForm.premiumMemberMode === 'free') list.push({ tier: 'premium' as MemberTier, mode: 'free' as const })
  if (productForm.premiumMemberMode === 'discount') {
    list.push({
      tier: 'premium' as MemberTier,
      mode: 'discount' as const,
      discount: normalizeDiscountFactor(productForm.premiumMemberZhe)
    })
  }
  return normalizeMemberBenefits(list)
}

function setMemberMode(tier: MemberTier, mode: 'none' | 'free' | 'discount') {
  if (tier === 'standard') {
    productForm.standardMemberMode = mode
    if (mode === 'discount' && !productForm.standardMemberZhe) productForm.standardMemberZhe = 6
  } else {
    productForm.premiumMemberMode = mode
    if (mode === 'discount' && !productForm.premiumMemberZhe) productForm.premiumMemberZhe = 6
  }
}

function contentKindFor(type: ProductType): CommerceContentKind {
  if (type === 'dataset') return 'snapshot'
  if (type === 'report') return 'current_version'
  if (type === 'dashboard') return 'fixed_dashboard'
  return 'quota_package'
}

function normalizeItemOffer(type: ProductType, form: ItemOfferForm): CommerceOffer {
  return {
    id: form.id,
    name: form.subject === 'personal' ? '个人单品' : '企业单品',
    subject: form.subject,
    price: Number(form.price),
    currency: 'CNY',
    serviceMode: 'one_time',
    contentKind: contentKindFor(type),
    accessScope: form.subject === 'personal' ? 'personal' : 'enterprise_wide',
    allowDownload: form.allowDownload,
    recommended: false
  }
}

function addDashboardMetric() {
  dashboardForm.metrics.push({ name: '', definition: '', formula: '', dimensions: '' })
}

function removeDashboardMetric(index: number) {
  dashboardForm.metrics.splice(index, 1)
}

function persistDashboardConfig() {
  const p = product.value
  const current = p?.typeDetail.dashboard
  if (!p || !current) return
  catalog.updateDashboardDetail(p.id, {
    ...current,
    timeRange: dashboardForm.timeRange.trim(),
    updateCycle: dashboardForm.updateCycle.trim(),
    exportRule: dashboardForm.exportRule.trim(),
    metrics: dashboardForm.metrics.map((metric, index) => ({
      name: metric.name.trim(),
      definition: metric.definition.trim(),
      formula: metric.formula.trim(),
      dimensions: metric.dimensions.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
      preview: 'visible',
      previewValue: current.metrics[index]?.previewValue,
      previewChange: current.metrics[index]?.previewChange
    }))
  })
}

function saveDashboardConfig() {
  persistDashboardConfig()
  dashboardConfigSaved.value = true
  setTimeout(() => { dashboardConfigSaved.value = false }, 3000)
}

function persistReportConfig() {
  const p = product.value
  const current = p?.typeDetail.report
  if (!p || !current) return
  const pageCount = Number(reportForm.pageCount)
  catalog.updateReportDetail(p.id, {
    ...current,
    publishedAt: reportForm.publishedAt.trim(),
    pageCount: Number.isFinite(pageCount) && pageCount > 0 ? pageCount : undefined,
    author: reportForm.author.trim(),
    version: reportForm.version.trim(),
    audience: reportForm.audience.trim(),
    license: reportForm.license.trim()
  })
}

function saveReportConfig() {
  persistReportConfig()
  reportConfigSaved.value = true
  setTimeout(() => { reportConfigSaved.value = false }, 3000)
}

function confirmPublish() {
  const errors = validatePublish(currentPublishForm())
  if (errors.length) {
    publishErrors.value = errors
    return
  }
  const message = salesState.value === 'delisted'
    ? '重新上架后将出现在前台，确认？'
    : '上架后将出现在前台搜索和购买，确认上架？'
  if (!window.confirm(message)) return
  saveProduct()
  if (!product.value) return
  catalog.publishProduct(product.value.id)
}

function confirmPause() {
  if (!product.value) return
  if (!window.confirm('暂停新购后前台不能下单，已购不受影响，确认？')) return
  catalog.pauseProduct(product.value.id)
}

function confirmResume() {
  if (!product.value) return
  if (!window.confirm('恢复后前台可继续购买，确认？')) return
  catalog.resumeProduct(product.value.id)
}

function confirmDelist() {
  if (!product.value) return
  if (!window.confirm('下架后将从搜索和推荐移除，确认？')) return
  catalog.delistProduct(product.value.id)
}

function buildAcquisitions(isFree: boolean, hasMemberBenefit: boolean, hasItemOffer: boolean): AcquisitionOption[] {
  const list: AcquisitionOption[] = []
  if (isFree) return ['free']
  if (hasMemberBenefit) list.push('member')
  if (hasItemOffer) list.push('item_purchase')
  return list
}


function persistProfilingFields() {
  const res = resource.value
  if (!res || res.type !== 'dataset') return
  catalog.setProfilingFields(res.id, profilingSelection.value)
}

function saveProfilingFields() {
  persistProfilingFields()
  profilingSaved.value = true
  setTimeout(() => { profilingSaved.value = false }, 3000)
}
</script>

<template>
  <div v-if="resource">
    <div class="mb-6 flex items-center gap-3">
      <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" @click="goBack">← 返回</button>
      <h1 class="text-xl font-semibold text-slate-800">{{ resource.resourceName }}</h1>
      <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ typeLabels[resource.type] }}</span>
      <span class="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{{ originLabels[resource.origin] }}</span>
    </div>

    <!-- 资源基本信息 -->
    <div class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">资源信息</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">资源名称：</span>{{ resource.resourceName }}</div>
        <div><span class="text-slate-500">资源 ID：</span><code class="text-xs">{{ resource.id }}</code></div>
        <div><span class="text-slate-500">类型：</span>{{ typeLabels[resource.type] }}</div>
        <div><span class="text-slate-500">来源：</span>{{ originLabels[resource.origin] }}</div>
        <div v-if="resource.createdBy"><span class="text-slate-500">创建者：</span>{{ resource.createdBy }}</div>
        <div><span class="text-slate-500">上架时间：</span>{{ product ? listedAtOf(product) : '未上架' }}</div>
      </div>
    </div>

    <div class="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4" data-testid="sales-status-bar">
      <div class="mr-auto">
        <div class="text-sm font-medium text-slate-700">销售状态</div>
        <div class="mt-0.5 text-xs text-slate-400">{{ listingBlocked || SALES_STATE_LABELS[salesState] }}</div>
        <p v-if="publishErrors.some((e) => e.field === 'listing')" data-testid="listing-block-error" class="mt-1 text-xs text-red-500">{{ publishErrors.find((e) => e.field === 'listing')?.message }}</p>
      </div>
      <button v-if="canSave" data-testid="save-product-bar" class="rounded-lg border border-slate-200 px-4 py-2 text-sm" type="button" @click="saveProduct">{{ salesState === 'unlisted' ? '保存草稿' : '保存' }}</button>
      <button v-if="showPublish" data-testid="publish-product" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" type="button" @click="confirmPublish">上架</button>
      <button v-if="salesState === 'published'" data-testid="pause-product" class="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white" type="button" @click="confirmPause">停新购</button>
      <button v-if="salesState === 'paused'" data-testid="resume-product" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white" type="button" @click="confirmResume">恢复销售</button>
      <button v-if="salesState === 'published' || salesState === 'paused'" data-testid="delist-product" class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600" type="button" @click="confirmDelist">下架</button>
      <button v-if="!listingBlocked && salesState === 'delisted'" data-testid="relist-product" class="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white" type="button" @click="confirmPublish">重新上架</button>
    </div>

    <!-- 类型特有区块：用数视图（只读） -->
    <div v-if="resource.type === 'user_view' && resource.typeDetail.userView" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">用数视图详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">来源模块：</span>{{ resource.typeDetail.userView.sourceModule }}</div>
        <div><span class="text-slate-500">图表类型：</span>{{ resource.typeDetail.userView.chartType }}</div>
        <div><span class="text-slate-500">数据源：</span>{{ resource.typeDetail.userView.dataSourceName }}</div>
        <div><span class="text-slate-500">浏览次数：</span>{{ resource.typeDetail.userView.viewCount ?? '—' }}</div>
      </div>
      <div class="mt-3">
        <a :href="resource.typeDetail.userView.externalUrl" target="_blank" class="text-sm text-brand-600 hover:underline">
          在用数模块中查看 →
        </a>
      </div>
    </div>

    <!-- 类型特有区块：数据集关键指标（运营配置，非必填） -->
    <div v-if="resource.type === 'dataset'" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-700">数据集详情</h2>
        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">运营配置 · 非必填</span>
      </div>
      <p class="mb-4 text-xs leading-relaxed text-slate-400">
        粒度、时间范围、行数、字段数无可信空间同步源，由运营在本页维护；留空则 APP / 门户详情不展示对应项。保存商品信息时一并写入。
      </p>
      <div class="grid grid-cols-2 gap-3" data-testid="dataset-metrics-editor">
        <label class="block">
          <span class="mb-1 block text-xs text-slate-400">数据粒度</span>
          <input v-model="datasetForm.granularity" data-testid="dataset-metric-granularity" placeholder="如：企业 × 月" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-slate-400">时间范围</span>
          <input v-model="datasetForm.timeRange" data-testid="dataset-metric-time-range" placeholder="如：2024-01 至 2026-06" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-slate-400">数据行数</span>
          <input v-model="datasetForm.rowCount" data-testid="dataset-metric-row-count" type="text" inputmode="numeric" placeholder="如：2600000" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs text-slate-400">字段数</span>
          <input v-model="datasetForm.fieldCount" data-testid="dataset-metric-field-count" type="text" inputmode="numeric" placeholder="如：6" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
        </label>
      </div>
    </div>

    <!-- 类型特有区块：API -->
    <div v-if="resource.type === 'api' && resource.typeDetail.api" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">API 详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">方法：</span>{{ resource.typeDetail.api.method }}</div>
        <div><span class="text-slate-500">路径：</span><code class="text-xs">{{ resource.typeDetail.api.pathExample }}</code></div>
        <div><span class="text-slate-500">版本：</span>{{ resource.typeDetail.api.version }}</div>
        <div><span class="text-slate-500">SLA：</span>{{ resource.typeDetail.api.sla }}</div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 编辑表单（非用数视图即可填写；无商品时保存即创建草稿） -->
    <!-- ================================================================== -->
    <template v-if="editable">

      <!-- 商品信息编辑 -->
      <div class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-700">商品信息编辑</h2>

        <!-- 标题与展示（对应详情页标题卡） -->
        <div class="mb-4">
          <div class="mb-2 text-xs font-medium text-slate-500">标题与展示</div>
          <div class="space-y-3">
            <label class="block">
              <span class="mb-1 block text-xs text-slate-400">商品名称</span>
              <input v-model="productForm.name" data-testid="product-name-input" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" />
              <p v-if="publishErrors.some((e) => e.field === 'name')" class="mt-1 text-xs text-red-500">{{ publishErrors.find((e) => e.field === 'name')?.message }}</p>
            </label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">商品副标题（推荐语为空时展示）</span><input v-model="productForm.subtitle" data-testid="product-subtitle-input" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">推荐语（商品卡片与详情页优先展示）</span><input v-model="productForm.recommendText" data-testid="product-recommend-input" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">标签（顿号分隔）</span><input v-model="productForm.tags" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model.number="productForm.sortWeight" type="number" class="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" />排序权重</label>
              <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model="productForm.recommendSlot" type="checkbox" />进入推荐位</label>
              <span class="text-[11px] text-slate-400">仅影响发现页排序与推荐，不在详情页展示</span>
            </div>
          </div>
        </div>

        <!-- 运营信息：空间商品整体只读同步，与详情页「资源信息 / 合规与授权」同源 -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <template v-if="product?.dealChannel === 'space_purchase'">
            <div data-testid="space-kind-readonly" class="mb-3 rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">来源类型</span>
              <div class="mt-1 text-sm text-slate-700">{{ product.spaceKind === 'owned' ? '自有' : product.spaceKind === 'federated' ? '互联' : '—' }}</div>
            </div>
            <ProductInfoSections :product="product" :columns="2" include-department />
          </template>
          <template v-else>
            <div class="mb-2 text-xs font-medium text-slate-500">运营信息</div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="mb-1 block text-xs text-slate-400">提供方</span><input v-model="productForm.provider" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">更新频率</span>
                <UpdateFrequencySelect v-model="productForm.updateFrequency" data-testid="product-update-frequency" class="px-2.5 py-1.5 text-sm" />
              </label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">覆盖范围</span><input v-model="productForm.coverage" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">交付方式</span><input v-model="productForm.deliveryMethod" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            </div>
          </template>
        </div>

        <!-- 商品说明书（对应详情页商品说明书区） -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">商品说明书</span>
            <span v-if="product?.dealChannel === 'space_purchase'" class="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">部分字段来自可信空间同步</span>
          </div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">价值主张</span><textarea v-model="productForm.valueProposition" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <!-- 详细描述：空间商品只读 -->
            <div v-if="product?.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">详细描述 <span class="text-blue-500">· 同步</span></span>
              <div class="mt-1 text-sm leading-relaxed text-slate-700">{{ product.description || '—' }}</div>
            </div>
            <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">详细描述</span><textarea v-model="productForm.description" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">质量/服务承诺</span><textarea v-model="productForm.qualityPromise" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">合规声明</span><textarea v-model="productForm.complianceNote" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <!-- 适用场景：空间商品只读 -->
            <div v-if="product?.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">适用场景 <span class="text-blue-500">· 同步</span></span>
              <div class="mt-0.5 text-sm text-slate-700">{{ (product.scenarios || []).join('、') || '—' }}</div>
            </div>
            <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">适用场景（顿号分隔）</span><input v-model="productForm.scenarios" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          </div>
        </div>

        <!-- APP 价格方案：个人单品、企业单品、普通会员和高级会员统一配置。 -->
        <div v-if="dealChannel === 'app_payment'" class="mb-4 border-t border-slate-100 pt-4" data-testid="pricing-plan-editor">
          <div class="mb-1 flex items-center justify-between gap-3">
            <div class="text-xs font-medium text-slate-600">价格方案</div>
            <span class="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">APP 内配置</span>
          </div>
          <p class="mb-3 text-[11px] leading-relaxed text-slate-400">免费商品与付费单品、会员权益互斥；非免费商品可同时配置个人单品、企业单品及普通 / 高级会员权益。</p>
          <p v-if="publishErrors.some((e) => e.field === 'pricing' || e.field === 'itemPrice' || e.field === 'memberZhe')" class="mb-3 text-xs text-red-500">
            {{ publishErrors.find((e) => e.field === 'pricing' || e.field === 'itemPrice' || e.field === 'memberZhe')?.message }}
          </p>
          <label class="mb-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <input v-model="productForm.isFree" type="checkbox" data-testid="product-free" />
            免费
            <span class="font-normal text-emerald-600">· 勾选后其他价格方案不可配置</span>
          </label>
          <fieldset
            :disabled="productForm.isFree"
            data-testid="paid-pricing-options"
            class="transition-opacity disabled:cursor-not-allowed"
            :class="productForm.isFree ? 'opacity-40' : ''"
          >
            <label class="mb-3 flex items-center gap-2 text-xs text-slate-600">
              <span class="font-medium text-slate-700">可售卖周期</span>
              <input
                v-model.number="productForm.salePeriodMonths"
                type="number"
                min="1"
                :disabled="productForm.isFree"
                data-testid="sale-period-months"
                class="w-24 rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700 disabled:bg-slate-50"
              />
              <span class="text-slate-400">个月 · 客户下单时锁定</span>
              <span v-if="publishErrors.some((e) => e.field === 'salePeriod')" class="text-red-500">{{ publishErrors.find((e) => e.field === 'salePeriod')?.message }}</span>
            </label>
            <div class="overflow-hidden rounded-lg border border-slate-200">
            <div class="grid grid-cols-[160px_1fr] border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-500">
              <div>价格类型</div>
              <div>配置</div>
            </div>

            <div
              v-for="offer in [itemOfferForm.personal, itemOfferForm.enterprise]"
              :key="offer.subject"
              class="grid grid-cols-[160px_1fr] items-center border-b border-slate-100 px-4 py-3 last:border-b-0"
              :data-testid="`item-offer-${offer.subject}`"
            >
              <div class="text-xs font-medium text-slate-700">{{ offer.subject === 'personal' ? '个人单品' : '企业单品' }}</div>
              <div class="flex items-center gap-3 text-xs text-slate-600">
                <label class="flex items-center gap-1.5">
                  <input v-model="offer.enabled" type="checkbox" :disabled="productForm.isFree" :data-testid="`item-offer-${offer.subject}-enabled`" />启用
                </label>
                <label class="flex items-center gap-1.5" :class="offer.enabled ? '' : 'opacity-50'">
                  <span>价格 ¥</span>
                  <input
                    v-model.number="offer.price"
                    type="number"
                    min="0"
                    :disabled="productForm.isFree || !offer.enabled"
                    :data-testid="`item-offer-${offer.subject}-price`"
                    class="w-32 rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700 disabled:bg-slate-50"
                  />
                </label>
              </div>
            </div>

            <div
              v-for="tier in (['standard', 'premium'] as const)"
              :key="tier"
              class="grid grid-cols-[160px_1fr] items-center border-b border-slate-100 px-4 py-3 last:border-b-0"
              :data-testid="`member-tier-${tier}`"
            >
              <div class="text-xs font-medium text-slate-700">{{ MEMBER_TIER_LABELS[tier] }}</div>
              <div class="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <label class="flex items-center gap-1.5">
                    <input
                      type="radio"
                      :name="`member-mode-${tier}`"
                      :disabled="productForm.isFree"
                      :checked="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'none'"
                      :data-testid="`member-${tier}-none`"
                      @change="setMemberMode(tier, 'none')"
                    />
                    不纳入
                  </label>
                  <label class="flex items-center gap-1.5">
                    <input
                      type="radio"
                      :name="`member-mode-${tier}`"
                      :disabled="productForm.isFree"
                      :checked="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'free'"
                      :data-testid="`member-${tier}-free`"
                      @change="setMemberMode(tier, 'free')"
                    />
                    免费
                  </label>
                  <label class="flex items-center gap-1.5">
                    <input
                      type="radio"
                      :name="`member-mode-${tier}`"
                      :disabled="productForm.isFree"
                      :checked="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'discount'"
                      :data-testid="`member-${tier}-discount`"
                      @change="setMemberMode(tier, 'discount')"
                    />
                    折扣
                  </label>
                  <label
                    v-if="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'discount'"
                    class="flex items-center gap-1.5"
                  >
                    <span class="text-slate-400">打</span>
                    <input
                      v-if="tier === 'standard'"
                      v-model.number="productForm.standardMemberZhe"
                      type="number"
                      min="1"
                      max="9.9"
                      step="0.1"
                      :disabled="productForm.isFree"
                      data-testid="member-standard-zhe"
                      class="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                    <input
                      v-else
                      v-model.number="productForm.premiumMemberZhe"
                      type="number"
                      min="1"
                      max="9.9"
                      step="0.1"
                      :disabled="productForm.isFree"
                      data-testid="member-premium-zhe"
                      class="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                    <span class="text-slate-400">折</span>
                  </label>
              </div>
            </div>
            </div>
          </fieldset>
        </div>

        <div v-if="product?.dealChannel === 'space_purchase'" class="mb-4 border-t border-slate-100 pt-4" data-testid="space-pricing-readonly">
          <div class="mb-1 flex items-center justify-between"><span class="text-xs font-medium text-slate-600">同步价格方案</span><span class="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600">可信空间只读</span></div>
          <p class="mb-2 text-[11px] text-slate-400">价格、套餐和有效期由可信空间同步，APP 只展示，不在本页改价。</p>
          <div v-if="product.datasetOffers?.length" class="space-y-2">
            <div v-for="offer in product.datasetOffers" :key="offer.id" class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>{{ offer.name }} · {{ offer.licenseKind === 'subscription' ? `${offer.termMonths}个月` : '一次性' }}</span><span class="font-medium text-slate-700">¥{{ offer.price.toLocaleString() }}</span></div>
          </div>
          <div v-else-if="product.typeDetail.api?.pricingPlans?.length" class="space-y-2">
            <div v-for="plan in product.typeDetail.api.pricingPlans" :key="plan.name" class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>{{ plan.name }} · {{ plan.quota }}</span><span class="font-medium text-slate-700">{{ plan.price }}</span></div>
          </div>
          <div v-else class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{{ product.price.quoteNote || product.spaceMeta?.billingNote || '以可信空间实际报价为准' }}</div>
        </div>

        <div class="flex items-center gap-3">
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" data-testid="save-product" @click="saveProduct">保存</button>
          <span v-if="productSaved" class="text-sm text-emerald-600">已保存</span>
        </div>
      </div>

      <!-- 报告介绍配置 -->
      <div v-if="resource.type === 'report' && product?.typeDetail.report" class="mb-6 rounded-lg border border-slate-200 bg-white p-5" data-testid="report-config-editor">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-slate-700">报告介绍配置</h2>
            <p class="mt-1 text-xs leading-relaxed text-slate-400">对应前台「报告介绍」中的类型特有字段；通用运营信息（提供方、更新频率等）仍在上方商品信息中维护。来源与上架时间为系统事实，只读展示。</p>
          </div>
          <span class="shrink-0 rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-600">前台公开</span>
        </div>

        <div class="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <div><span class="text-slate-500">来源：</span>{{ originLabels[resource.origin] }}</div>
          <div><span class="text-slate-500">上架时间：</span>{{ listedAtOf(product) || '未上架' }}</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">发布日期</span><input v-model="reportForm.publishedAt" data-testid="report-published-at" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" placeholder="YYYY-MM-DD" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">报告页数</span><input v-model.number="reportForm.pageCount" type="number" min="1" data-testid="report-page-count" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">研究机构</span><input v-model="reportForm.author" data-testid="report-author" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">报告版本</span><input v-model="reportForm.version" data-testid="report-version" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="col-span-2 block"><span class="mb-1 block text-xs text-slate-400">适用读者</span><input v-model="reportForm.audience" data-testid="report-audience" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="col-span-2 block"><span class="mb-1 block text-xs text-slate-400">下载授权</span><textarea v-model="reportForm.license" rows="2" data-testid="report-license" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
        </div>

        <p class="mt-4 text-[11px] leading-relaxed text-slate-400">目录章节与在线阅读正文块本期由内容稿维护，编辑页展示结构摘要但不改正文；保存后版本字段同步影响单次购买绑定的当前版本口径。</p>

        <div class="mt-4 flex items-center gap-3">
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" data-testid="save-report-config" type="button" @click="saveReportConfig">保存报告配置</button>
          <span v-if="reportConfigSaved" class="text-sm text-emerald-600">已同步到前台详情</span>
        </div>
      </div>

      <!-- 看板与指标定义配置 -->
      <div v-if="resource.type === 'dashboard' && product?.typeDetail.dashboard" class="mb-6 rounded-lg border border-slate-200 bg-white p-5" data-testid="dashboard-config-editor">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-sm font-semibold text-slate-700">看板与指标定义配置</h2>
            <p class="mt-1 text-xs leading-relaxed text-slate-400">这些内容对应前台“看板信息”和“指标定义”。指标定义属于购买前说明，所有用户无需解锁即可查看。</p>
          </div>
          <span class="shrink-0 rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-600">前台公开</span>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">时间范围</span><input v-model="dashboardForm.timeRange" data-testid="dashboard-time-range" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">更新周期</span><input v-model="dashboardForm.updateCycle" data-testid="dashboard-update-cycle" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          <label class="col-span-2 block"><span class="mb-1 block text-xs text-slate-400">导出规则</span><textarea v-model="dashboardForm.exportRule" rows="2" data-testid="dashboard-export-rule" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
        </div>

        <div class="mt-5 border-t border-slate-100 pt-4">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-slate-600">指标定义</div>
              <div class="mt-0.5 text-[11px] text-slate-400">指标名称、描述、计算公式和支持维度会直接展示在详情页指标卡片中。</div>
              <p v-if="publishErrors.some((e) => e.field === 'dashboardMetrics')" class="mt-1 text-xs text-red-500">{{ publishErrors.find((e) => e.field === 'dashboardMetrics')?.message }}</p>
            </div>
            <button class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50" type="button" @click="addDashboardMetric">+ 添加指标</button>
          </div>

          <div class="space-y-3">
            <div v-for="(metric, index) in dashboardForm.metrics" :key="index" class="rounded-lg border border-slate-200 p-4" :data-testid="`dashboard-metric-${index}`">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-xs font-medium text-slate-600">指标 {{ index + 1 }}</span>
                <button class="text-xs text-red-500 hover:text-red-600" type="button" @click="removeDashboardMetric(index)">删除</button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <label class="block"><span class="mb-1 block text-xs text-slate-400">指标名称</span><input v-model="metric.name" :data-testid="`dashboard-metric-name-${index}`" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
                <label class="block"><span class="mb-1 block text-xs text-slate-400">支持维度（顿号分隔）</span><input v-model="metric.dimensions" :data-testid="`dashboard-metric-dimensions-${index}`" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
                <label class="col-span-2 block"><span class="mb-1 block text-xs text-slate-400">指标描述</span><textarea v-model="metric.definition" rows="2" :data-testid="`dashboard-metric-definition-${index}`" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
                <label class="col-span-2 block"><span class="mb-1 block text-xs text-slate-400">计算公式</span><input v-model="metric.formula" :data-testid="`dashboard-metric-formula-${index}`" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              </div>
            </div>
          </div>

          <div v-if="!dashboardForm.metrics.length" class="rounded-lg bg-slate-50 py-8 text-center text-xs text-slate-400">暂无指标，点击“添加指标”补充。</div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" data-testid="save-dashboard-config" @click="saveDashboardConfig">保存看板配置</button>
          <span v-if="dashboardConfigSaved" class="text-sm text-emerald-600">已同步到前台详情</span>
        </div>
      </div>

      <!-- 数据探查配置（仅数据集类型） -->
      <div v-if="resource.type === 'dataset' && datasetFields.length" data-testid="profiling-config" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 class="mb-1 text-sm font-semibold text-slate-700">数据探查配置</h2>
        <p class="mb-3 text-xs text-slate-400">勾选的字段将作为 App「探查报告」的可切换维度。敏感字段（主键、L2/L3）默认不开放。</p>

        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-400">
            <tr>
              <th class="w-9 px-2 py-2">
                <input
                  type="checkbox"
                  :checked="allSelectableChecked"
                  :indeterminate.prop="someSelectableChecked"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="px-2 py-2 font-medium">字段名</th>
              <th class="px-2 py-2 font-medium">业务含义</th>
              <th class="px-2 py-2 font-medium">类型</th>
              <th class="px-2 py-2 font-medium">敏感级</th>
              <th class="px-2 py-2 font-medium">探查结果</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in datasetFields"
              :key="f.name"
              class="border-t border-slate-100"
              :class="f.sensitive ? 'bg-amber-50/40' : ''"
            >
              <td class="px-2 py-2">
                <input v-model="profilingSelection" type="checkbox" :value="f.name" :disabled="!f.hasStat" :data-testid="`profiling-field-${f.name}`" />
              </td>
              <td class="px-2 py-2 font-mono text-slate-800">{{ f.name }}</td>
              <td class="px-2 py-2 text-slate-600">{{ f.meaning }}</td>
              <td class="px-2 py-2 text-slate-500">{{ f.dataType }}</td>
              <td class="px-2 py-2">
                <span v-if="f.sensitive" class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700">
                  {{ f.sensitivityLabel }}
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-2 py-2">
                <span v-if="f.hasStat" class="text-emerald-600">已产出</span>
                <span v-else class="text-slate-300">未产出</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-3 flex items-center gap-3">
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" data-testid="save-profiling-config" @click="saveProfilingFields">
            保存探查配置
          </button>
          <span class="text-xs text-slate-400">已开放 {{ profilingSelection.length }} / {{ datasetFields.length }} 个字段</span>
          <span v-if="profilingSaved" class="text-sm text-emerald-600">已保存</span>
        </div>
      </div>
    </template>
  </div>
  <div v-else class="py-20 text-center text-slate-500">
    资源不存在
  </div>
</template>
