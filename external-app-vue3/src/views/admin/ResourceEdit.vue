<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import type { PriceModel, AcquisitionOption, CommerceContentKind, CommerceOffer, DatasetOffer, MemberTier, ProductType } from '@/types/domain'
import { listedAtOf } from '@/utils/productMeta'
import { commerceOffersOf } from '@/domain/commerceOffers'
import {
  deriveLegacyMemberFields,
  discountToZhe,
  MEMBER_TIER_LABELS,
  normalizeDiscountFactor,
  normalizeMemberBenefits,
  resolveMemberBenefits
} from '@/domain/memberBenefits'
import ProductContentPeek from '@/components/ProductContentPeek.vue'

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
  user_created: '用户创建'
}

function goBack() {
  router.push('/admin/resources')
}

// ---------------------------------------------------------------------------
// 编辑表单状态
// ---------------------------------------------------------------------------

const editable = computed(() => !!product.value && resource.value?.type !== 'user_view')

// --- 商品信息表单（含运营增强） ---
const productForm = reactive({
  name: '',
  subtitle: '',
  description: '',
  valueProposition: '',
  scenarios: '',
  priceModel: 'item_only' as PriceModel,
  itemPrice: 0,
  memberDiscount: 0.6,
  memberIncluded: false,
  acquiFree: false,
  acquiItem: false,
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
const previewProduct = computed(() => product.value
  ? {
      ...product.value,
      subtitle: productForm.subtitle,
      description: productForm.description,
      coverage: productForm.coverage,
      updateFrequency: productForm.updateFrequency
    }
  : null)
const productSaved = ref(false)
const workflowMessage = ref('')
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
const reportForm = reactive({
  publishedAt: '',
  pageCount: 0,
  author: '',
  version: '',
  audience: '',
  license: ''
})
const reportConfigSaved = ref(false)
type CommerceOfferForm = {
  id: string
  name: string
  subject: 'personal' | 'enterprise'
  serviceMode: 'one_time' | 'continuous'
  price: number
  billingPeriodMonths: number
  maxTermMonths: number
  accessScope: 'personal' | 'named_seats' | 'enterprise_wide'
  seats: number
  allowDownload: boolean
  recommended: boolean
}
const commerceOfferForm = reactive({ offers: [] as CommerceOfferForm[] })

// --- 数据探查配置 ---
const profilingSelection = ref<string[]>([])
const profilingSaved = ref(false)

const datasetFields = computed(() => {
  const d = product.value?.typeDetail.dataset
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

function syncFormFromStore() {
  const p = product.value
  if (!p) return

  // 商品信息
  productForm.name = p.name
  productForm.subtitle = p.subtitle
  productForm.description = p.description
  productForm.valueProposition = p.valueProposition
  productForm.scenarios = (p.scenarios || []).join('、')
  productForm.priceModel = p.price.model
  productForm.itemPrice = p.price.itemPrice ?? 0
  productForm.memberDiscount = p.price.memberDiscount ?? 0.6
  const benefits = resolveMemberBenefits(p)
  const standard = benefits.find((item) => item.tier === 'standard')
  const premium = benefits.find((item) => item.tier === 'premium')
  productForm.standardMemberMode = standard ? standard.mode : 'none'
  productForm.standardMemberZhe = discountToZhe(standard?.discount ?? p.price.memberDiscount)
  productForm.premiumMemberMode = premium ? premium.mode : 'none'
  productForm.premiumMemberZhe = discountToZhe(premium?.discount ?? p.price.premiumMemberDiscount)
  productForm.memberIncluded = benefits.some((item) => item.mode === 'free')
  productForm.acquiFree = p.acquisitions.includes('free')
  productForm.acquiItem = p.acquisitions.includes('item_purchase')
  productForm.coverage = p.coverage
  productForm.updateFrequency = p.updateFrequency
  productForm.deliveryMethod = p.deliveryMethod
  productForm.provider = p.provider
  productForm.qualityPromise = p.qualityPromise
  productForm.complianceNote = p.complianceNote

  // 运营增强
  productForm.recommendText = p.recommendText || ''
  productForm.tags = (p.tags || []).join('、')
  productForm.sortWeight = p.sortWeight ?? 50
  productForm.recommendSlot = p.recommendSlot ?? false

  commerceOfferForm.offers.splice(0, commerceOfferForm.offers.length, ...commerceOffersOf(p).map((offer) => ({
    id: offer.id,
    name: offer.name,
    subject: offer.subject,
    serviceMode: offer.serviceMode,
    price: offer.price,
    billingPeriodMonths: offer.billingPeriodMonths ?? 12,
    maxTermMonths: offer.maxTermMonths ?? 36,
    accessScope: offer.accessScope ?? (offer.subject === 'personal' ? 'personal' : 'named_seats'),
    seats: offer.seats ?? 10,
    allowDownload: Boolean(offer.allowDownload),
    recommended: Boolean(offer.recommended)
  })))

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

watch(product, syncFormFromStore, { immediate: true })

// ---------------------------------------------------------------------------
// 保存动作
// ---------------------------------------------------------------------------

function saveProduct() {
  const p = product.value
  if (!p) return
  const isAssetDataset = p.origin === 'asset_platform' && p.type === 'dataset'
  const appOffers = p.dealChannel === 'app_payment'
    ? commerceOfferForm.offers.map((offer) => normalizeCommerceOffer(p.type, offer))
    : []
  const datasetOffers = isAssetDataset
    ? appOffers.map((offer): DatasetOffer => ({
        ...offer,
        licenseKind: offer.serviceMode === 'continuous' ? 'subscription' : 'snapshot',
        termMonths: offer.serviceMode === 'continuous' ? offer.billingPeriodMonths : undefined,
        accessScope: offer.accessScope || (offer.subject === 'personal' ? 'personal' : 'named_seats'),
        allowDownload: Boolean(offer.allowDownload),
        deliveryMode: offer.serviceMode === 'continuous' ? 'managed_connection' : 'snapshot'
      }))
    : p.datasetOffers
  const personalStartingPrice = appOffers
    .filter((offer) => offer.subject === 'personal')
    .reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY)
  const memberBenefits = isAssetDataset ? [] : buildMemberBenefitsFromForm()
  const legacyMember = deriveLegacyMemberFields(
    memberBenefits,
    {
      ...p.price,
      itemPrice: Number(productForm.itemPrice) || (Number.isFinite(personalStartingPrice) ? personalStartingPrice : p.price.itemPrice)
    },
    productForm.acquiFree,
    productForm.acquiItem
  )
  catalog.updateProduct(p.id, {
    name: productForm.name,
    subtitle: productForm.subtitle,
    description: productForm.description,
    valueProposition: productForm.valueProposition,
    scenarios: productForm.scenarios.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
    coverage: productForm.coverage,
    updateFrequency: productForm.updateFrequency,
    deliveryMethod: productForm.deliveryMethod,
    provider: productForm.provider,
    qualityPromise: productForm.qualityPromise,
    complianceNote: productForm.complianceNote,
    memberIncluded: isAssetDataset ? false : legacyMember.memberIncluded,
    memberBenefits: isAssetDataset ? undefined : memberBenefits,
    acquisitions: isAssetDataset ? ['item_purchase'] : buildAcquisitions(memberBenefits.length > 0),
    price: isAssetDataset ? {
      ...p.price,
      model: 'item_only',
      itemPrice: Number.isFinite(personalStartingPrice) ? personalStartingPrice : p.price.itemPrice,
      memberDiscount: undefined,
      premiumMemberDiscount: undefined
    } : legacyMember.price,
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
  productSaved.value = true
  setTimeout(() => { productSaved.value = false }, 3000)
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

function contentKindFor(type: ProductType, serviceMode: 'one_time' | 'continuous'): CommerceContentKind {
  if (serviceMode === 'continuous') return type === 'api' ? 'continuous_service' : 'continuous_updates'
  if (type === 'dataset') return 'snapshot'
  if (type === 'report') return 'current_version'
  if (type === 'dashboard') return 'fixed_dashboard'
  return 'quota_package'
}

function normalizeCommerceOffer(type: ProductType, form: CommerceOfferForm): CommerceOffer {
  return {
    id: form.id,
    name: form.name.trim(),
    subject: form.subject,
    price: Number(form.price),
    currency: 'CNY',
    serviceMode: form.serviceMode,
    contentKind: contentKindFor(type, form.serviceMode),
    billingPeriodMonths: form.serviceMode === 'continuous' ? Math.max(1, Number(form.billingPeriodMonths)) : undefined,
    maxTermMonths: form.serviceMode === 'continuous'
      ? Math.max(Number(form.billingPeriodMonths), Number(form.maxTermMonths))
      : undefined,
    accessScope: form.subject === 'personal' ? 'personal' : form.accessScope,
    seats: form.subject === 'enterprise' && form.accessScope === 'named_seats' ? Math.max(1, Number(form.seats)) : undefined,
    allowDownload: form.allowDownload,
    recommended: form.recommended
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

function submitReview() {
  if (!product.value) return
  saveProduct()
  catalog.submitProductReview(product.value.id)
  workflowMessage.value = '已提交审核，商品仍不会在前台展示'
}

function approveAndPublish() {
  if (!product.value) return
  catalog.approveAndPublishProduct(product.value.id)
  workflowMessage.value = '审核通过，商品已发布'
}

function buildAcquisitions(hasMemberBenefit: boolean): AcquisitionOption[] {
  const list: AcquisitionOption[] = []
  if (productForm.acquiFree) list.push('free')
  if (hasMemberBenefit) list.push('member')
  if (productForm.acquiItem) list.push('item_purchase')
  return list
}


function saveProfilingFields() {
  const p = product.value
  if (!p) return
  catalog.setProfilingFields(p.id, profilingSelection.value)
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

    <div v-if="resource.origin === 'asset_platform'" class="mb-6 rounded-lg border border-blue-200 bg-blue-50/40 p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-700">资产平台同步绑定 <span class="ml-1 rounded bg-white px-1.5 py-0.5 text-[10px] text-blue-600">只读</span></h2>
        <span :class="resource.commercializable ? 'text-emerald-600' : 'text-red-600'" class="text-xs">{{ resource.commercializable ? '已上架 · 可商品化' : '不可商品化' }}</span>
      </div>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div><span class="text-slate-500">资产版本：</span>{{ product?.assetSnapshot?.assetVersion || resource.assetVersion || '—' }}</div>
        <div><span class="text-slate-500">最后检查：</span>{{ product?.assetSnapshot?.lastCheckedAt || resource.lastCheckedAt || '—' }}</div>
        <div><span class="text-slate-500">变更风险：</span><span :class="(product?.assetSnapshot?.changeRisk || resource.changeRisk) === 'high' ? 'text-red-600' : 'text-emerald-600'">{{ product?.assetSnapshot?.changeRisk || resource.changeRisk || 'none' }}</span></div>
      </div>
      <p v-if="product?.assetSnapshot?.changeSummary || resource.changeSummary" class="mt-3 text-xs text-slate-500">{{ product?.assetSnapshot?.changeSummary || resource.changeSummary }}</p>
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

    <!-- 类型特有区块：数据集 -->
    <div v-if="resource.type === 'dataset' && resource.typeDetail.dataset" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">数据集详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">粒度：</span>{{ resource.typeDetail.dataset.granularity }}</div>
        <div><span class="text-slate-500">时间范围：</span>{{ resource.typeDetail.dataset.timeRange }}</div>
        <div><span class="text-slate-500">行数：</span>{{ resource.typeDetail.dataset.rowCount?.toLocaleString() }}</div>
        <div><span class="text-slate-500">字段数：</span>{{ resource.typeDetail.dataset.fields?.length }}</div>
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

    <!-- 类型特有区块：报告（资源摘要只读） -->
    <div v-if="resource.type === 'report' && resource.typeDetail.report" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-700">报告资源摘要</h2>
        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">结构只读</span>
      </div>
      <p class="mb-4 text-xs leading-relaxed text-slate-400">目录与正文块来自内容稿；发布日期、机构、版本等展示口径在下方「报告介绍配置」维护。</p>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">当前版本：</span>{{ resource.typeDetail.report.version }}</div>
        <div><span class="text-slate-500">研究机构：</span>{{ resource.typeDetail.report.author }}</div>
        <div><span class="text-slate-500">目录章节：</span>{{ resource.typeDetail.report.catalog?.length ?? 0 }}</div>
        <div><span class="text-slate-500">内容区块：</span>{{ resource.typeDetail.report.blocks?.length ?? 0 }}</div>
      </div>
    </div>

    <!-- 类型特有区块：看板 -->
    <div v-if="resource.type === 'dashboard' && resource.typeDetail.dashboard" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <div class="mb-3 flex items-center gap-2">
        <h2 class="text-sm font-semibold text-slate-700">看板资源摘要</h2>
        <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">来自关联看板资源</span>
      </div>
      <p class="mb-4 text-xs leading-relaxed text-slate-400">当前原型随关联看板资源初始化；生产环境由看板 / BI 平台同步基础结构，运营在下方维护前台展示口径和指标描述。</p>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">时间范围：</span>{{ resource.typeDetail.dashboard.timeRange }}</div>
        <div><span class="text-slate-500">更新周期：</span>{{ resource.typeDetail.dashboard.updateCycle }}</div>
        <div><span class="text-slate-500">指标数：</span>{{ resource.typeDetail.dashboard.metrics?.length }}</div>
        <div><span class="text-slate-500">面板数：</span>{{ resource.typeDetail.dashboard.panels?.length }}</div>
        <div class="col-span-2"><span class="text-slate-500">指标：</span>{{ resource.typeDetail.dashboard.metrics?.map((item) => item.name).join('、') || '—' }}</div>
        <div class="col-span-2"><span class="text-slate-500">图表面板：</span>{{ resource.typeDetail.dashboard.panels?.map((item) => item.title).join('、') || '—' }}</div>
        <div class="col-span-2"><span class="text-slate-500">导出规则：</span>{{ resource.typeDetail.dashboard.exportRule || '—' }}</div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 编辑表单（仅有关联商品且非用数视图时显示） -->
    <!-- ================================================================== -->
    <template v-if="editable && product">

      <div class="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4" data-testid="product-review-workflow">
        <div class="mr-auto">
          <div class="text-sm font-medium text-slate-700">商品发布流程</div>
          <div class="mt-0.5 text-xs text-slate-400">当前状态：{{ product.status }} · 前台状态：{{ product.availability }}</div>
        </div>
        <button v-if="product.status === 'draft'" class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white" data-testid="submit-review" @click="submitReview">保存并提交审核</button>
        <button v-if="product.status === 'pending_approval'" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white" data-testid="approve-publish" @click="approveAndPublish">审核通过并发布</button>
        <span v-if="workflowMessage" class="text-xs text-emerald-600">{{ workflowMessage }}</span>
      </div>

      <!-- 商品信息编辑 -->
      <div class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-700">商品信息编辑</h2>

        <!-- 标题与展示（对应详情页标题卡） -->
        <div class="mb-4">
          <div class="mb-2 text-xs font-medium text-slate-500">标题与展示</div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">商品名称</span><input v-model="productForm.name" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
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

        <div v-if="previewProduct && (product.type === 'dataset' || product.type === 'api')" class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-1 text-xs font-medium text-slate-500">列表内容总结预览</div>
          <p class="mb-2 text-[11px] text-slate-400">根据详细描述和已配置的类型信息自动摘取，不新增单独摘要字段。</p>
          <ProductContentPeek :product="previewProduct" />
        </div>

        <!-- 运营信息（对应详情页基本信息网格） -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">运营信息</span>
            <span v-if="product.dealChannel === 'space_purchase'" class="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">部分字段来自可信空间同步</span>
          </div>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <!-- 提供方：空间商品只读 -->
              <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
                <span class="text-xs text-slate-400">提供方 <span class="text-blue-500">· 同步</span></span>
                <div class="mt-0.5 text-sm text-slate-700">{{ product.provider }}</div>
              </div>
              <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">提供方</span><input v-model="productForm.provider" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <!-- 更新频率：空间商品只读 -->
              <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
                <span class="text-xs text-slate-400">更新频率 <span class="text-blue-500">· 同步</span></span>
                <div class="mt-0.5 text-sm text-slate-700">{{ product.updateFrequency }}</div>
              </div>
              <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">更新频率</span><input v-model="productForm.updateFrequency" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <!-- 覆盖范围（时间覆盖范围）：空间商品只读 -->
              <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
                <span class="text-xs text-slate-400">覆盖时间范围 <span class="text-blue-500">· 同步</span></span>
                <div class="mt-0.5 text-sm text-slate-700">{{ product.coverage || '—' }}</div>
              </div>
              <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">覆盖范围</span><input v-model="productForm.coverage" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <!-- 交付方式：空间商品只读 -->
              <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
                <span class="text-xs text-slate-400">交付方式 <span class="text-blue-500">· 同步</span></span>
                <div class="mt-0.5 text-sm text-slate-700">{{ product.deliveryMethod }}</div>
              </div>
              <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">交付方式</span><input v-model="productForm.deliveryMethod" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            </div>
          </div>
        </div>

        <!-- 可信空间同步信息（只读，仅 space_purchase 商品有 spaceMeta 时展示） -->
        <div v-if="product.spaceMeta" class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">合规与分类信息</span>
            <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">来自可信空间同步 · 不可编辑</span>
          </div>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div v-if="product.spaceMeta.industryCategory" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">行业分类</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.industryCategory }}</div>
            </div>
            <div v-if="product.spaceMeta.regionCategory" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">地域分类</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.regionCategory }}</div>
            </div>
            <div v-if="product.spaceMeta.dataSubject" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">数据主体</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.dataSubject }}</div>
            </div>
            <div v-if="product.spaceMeta.personalInfo != null" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">是否涉及个人信息</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.personalInfo ? '是' : '否' }}</div>
            </div>
            <div v-if="product.spaceMeta.authorizedUse != null" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">授权使用</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.authorizedUse ? '是' : '否' }}</div>
            </div>
            <div v-if="product.spaceMeta.dataVolume" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">数据规模</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.dataVolume }}</div>
            </div>
            <div v-if="product.spaceMeta.usageRestrictions?.length" class="col-span-2 rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">使用限制</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.usageRestrictions.join('、') }}<template v-if="product.spaceMeta.restrictionNote">；其他说明：{{ product.spaceMeta.restrictionNote }}</template></div>
            </div>
            <div v-if="product.spaceMeta.classificationStandard" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">分类标准</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.classificationStandard }}</div>
            </div>
            <div v-if="product.spaceMeta.classificationLevel != null" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">分级</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.classificationLevel }} 级</div>
            </div>
            <div v-if="product.spaceMeta.classificationPath" class="col-span-2 rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">分类路径</span>
              <div class="mt-0.5 text-slate-700">{{ product.spaceMeta.classificationPath }}</div>
            </div>
          </div>
        </div>

        <!-- 商品说明书（对应详情页商品说明书区） -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium text-slate-500">商品说明书</span>
            <span v-if="product.dealChannel === 'space_purchase'" class="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">部分字段来自可信空间同步</span>
          </div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">价值主张</span><textarea v-model="productForm.valueProposition" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <!-- 详细描述：空间商品只读 -->
            <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">详细描述 <span class="text-blue-500">· 同步</span></span>
              <div class="mt-1 text-sm leading-relaxed text-slate-700">{{ product.description || '—' }}</div>
            </div>
            <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">详细描述</span><textarea v-model="productForm.description" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">质量/服务承诺</span><textarea v-model="productForm.qualityPromise" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">合规声明</span><textarea v-model="productForm.complianceNote" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <!-- 适用场景：空间商品只读 -->
            <div v-if="product.dealChannel === 'space_purchase'" class="rounded-md bg-slate-50 px-3 py-2">
              <span class="text-xs text-slate-400">适用场景 <span class="text-blue-500">· 同步</span></span>
              <div class="mt-0.5 text-sm text-slate-700">{{ (product.scenarios || []).join('、') || '—' }}</div>
            </div>
            <label v-else class="block"><span class="mb-1 block text-xs text-slate-400">适用场景（顿号分隔）</span><input v-model="productForm.scenarios" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          </div>
        </div>

        <!-- APP 统一价格方案：四类商品共同使用，可信空间价格只读同步。 -->
        <div v-if="product.dealChannel === 'app_payment'" class="mb-4 border-t border-slate-100 pt-4" data-testid="commerce-offer-editor">
          <template v-if="commerceOfferForm.offers.length">
            <div class="mb-1 flex items-center justify-between gap-3">
              <div class="text-xs font-medium text-slate-600">统一价格方案</div>
              <span class="rounded bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">APP 内配置</span>
            </div>
            <p class="mb-3 text-[11px] leading-relaxed text-slate-400">个人、企业均可分别配置一次性交付与持续服务。持续方案必须设置计价周期和最长购买期限，不允许永久更新。</p>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="(offer, index) in commerceOfferForm.offers" :key="offer.id" class="rounded-lg border border-slate-200 p-3" :data-testid="`commerce-offer-form-${index}`">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-medium text-slate-700">{{ offer.subject === 'personal' ? '个人' : '企业' }} · {{ offer.serviceMode === 'one_time' ? '一次性交付' : '持续服务' }}</span>
                  <label class="flex items-center gap-1 text-[11px] text-slate-400"><input v-model="offer.recommended" type="checkbox" />推荐</label>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <label class="col-span-2 text-xs text-slate-400">方案名称<input v-model="offer.name" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label>
                  <label class="text-xs text-slate-400">购买主体<select v-model="offer.subject" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700"><option value="personal">个人</option><option value="enterprise">企业</option></select></label>
                  <label class="text-xs text-slate-400">交付方式<select v-model="offer.serviceMode" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700"><option value="one_time">一次性交付</option><option value="continuous">持续服务</option></select></label>
                  <label class="text-xs text-slate-400">价格 ¥<input v-model.number="offer.price" type="number" min="0" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label>
                  <label v-if="offer.serviceMode === 'continuous'" class="text-xs text-slate-400">计价周期（月）<input v-model.number="offer.billingPeriodMonths" data-testid="billing-period-months" type="number" min="1" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label>
                  <label v-if="offer.serviceMode === 'continuous'" class="text-xs text-slate-400">最长购买（月）<input v-model.number="offer.maxTermMonths" data-testid="max-term-months" type="number" :min="offer.billingPeriodMonths" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label>
                  <template v-if="offer.subject === 'enterprise'">
                    <label class="text-xs text-slate-400">授权范围<select v-model="offer.accessScope" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700"><option value="named_seats">指定成员</option><option value="enterprise_wide">企业全员</option></select></label>
                    <label v-if="offer.accessScope === 'named_seats'" class="text-xs text-slate-400">席位数<input v-model.number="offer.seats" type="number" min="1" class="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700" /></label>
                  </template>
                </div>
                <label class="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><input v-model="offer.allowDownload" type="checkbox" />允许下载 / 导出</label>
              </div>
            </div>
          </template>
          <div class="mt-3" data-testid="acquisition-options">
            <span class="mb-1 block text-xs text-slate-400">其它获取方式</span>
            <div class="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <label class="flex items-center gap-1.5"><input v-model="productForm.acquiFree" type="checkbox" data-testid="acqui-free" />免费</label>
              <label class="flex items-center gap-1.5"><input v-model="productForm.acquiItem" type="checkbox" data-testid="acqui-item" />单品购买</label>
            </div>

            <div v-if="product.type !== 'dataset'" class="mt-3 space-y-2" data-testid="member-tier-benefits">
              <div class="text-xs font-medium text-slate-600">会员权益（按等级）</div>
              <p class="text-[11px] leading-relaxed text-slate-400">
                同级「免费」与「折扣」互斥；不同等级互不影响。例如可选普通会员折扣，同时再选高级会员免费或高级会员折扣之一。
              </p>

              <div
                v-for="tier in (['standard', 'premium'] as const)"
                :key="tier"
                class="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                :data-testid="`member-tier-${tier}`"
              >
                <div class="mb-2 text-[11px] font-medium text-slate-700">{{ MEMBER_TIER_LABELS[tier] }}</div>
                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <label class="flex items-center gap-1.5">
                    <input
                      type="radio"
                      :name="`member-mode-${tier}`"
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
                      :checked="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'free'"
                      :data-testid="`member-${tier}-free`"
                      @change="setMemberMode(tier, 'free')"
                    />
                    {{ MEMBER_TIER_LABELS[tier] }}免费
                  </label>
                  <label class="flex items-center gap-1.5">
                    <input
                      type="radio"
                      :name="`member-mode-${tier}`"
                      :checked="(tier === 'standard' ? productForm.standardMemberMode : productForm.premiumMemberMode) === 'discount'"
                      :data-testid="`member-${tier}-discount`"
                      @change="setMemberMode(tier, 'discount')"
                    />
                    {{ MEMBER_TIER_LABELS[tier] }}折扣
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
                      data-testid="member-premium-zhe"
                      class="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-slate-700"
                    />
                    <span class="text-slate-400">折</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="product.dealChannel === 'space_purchase'" class="mb-4 border-t border-slate-100 pt-4" data-testid="space-pricing-readonly">
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
      <div v-if="resource.type === 'report' && product.typeDetail.report" class="mb-6 rounded-lg border border-slate-200 bg-white p-5" data-testid="report-config-editor">
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
          <span v-if="reportConfigSaved" class="text-sm text-emerald-600">已同步到资源摘要和前台详情</span>
        </div>
      </div>

      <!-- 看板与指标定义配置 -->
      <div v-if="resource.type === 'dashboard' && product.typeDetail.dashboard" class="mb-6 rounded-lg border border-slate-200 bg-white p-5" data-testid="dashboard-config-editor">
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
          <span v-if="dashboardConfigSaved" class="text-sm text-emerald-600">已同步到资源摘要和前台详情</span>
        </div>
      </div>

      <!-- 数据探查配置（仅数据集类型） -->
      <div v-if="resource.type === 'dataset' && datasetFields.length" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
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
                <input v-model="profilingSelection" type="checkbox" :value="f.name" :disabled="!f.hasStat" />
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
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" @click="saveProfilingFields">
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
