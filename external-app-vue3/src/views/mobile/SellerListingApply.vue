<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import {
  emptyListingField,
  listingCatalogSpecFromArtifact,
  parseListingScenarios,
  type SellerListingCatalogSpec
} from '@/domain/sellerListingSpec'
import UpdateFrequencySelect from '@/components/shared/UpdateFrequencySelect.vue'
import { coerceUpdateFrequency } from '@/domain/updateFrequency'

const props = defineProps<{
  embedded?: boolean
  variant?: 'mobile' | 'portal'
}>()
const emit = defineEmits<{ done: [] }>()

const route = useRoute()
const router = useRouter()
const seller = useSellerMarketStore()
const catalog = useCatalogStore()

const artifactId = ref(seller.listableArtifacts[0]?.id || '')
const title = ref('')
const subtitle = ref('')
const price = ref(99)
const enterprisePrice = ref(990)
const error = ref('')
const submitting = ref(false)
const rowCountText = ref('')
const fieldCountText = ref('')
const scenariosText = ref('')
const spec = ref<SellerListingCatalogSpec>(emptySpec())

const artifact = computed(() => seller.listableArtifacts.find((a) => a.id === artifactId.value))
const sourceProduct = computed(() => {
  const id = String(route.query.productId || '')
  return id ? catalog.byId(id) : undefined
})

function emptySpec(): SellerListingCatalogSpec {
  return {
    granularity: '',
    timeRange: '',
    coverage: '',
    updateFrequency: '',
    scenarios: [],
    description: '',
    valueProposition: '',
    qualityPromise: '',
    complianceNote: '',
    classification: '',
    fields: [],
    sampleColumns: [],
    sampleRows: [],
    sampleGeneratedAt: ''
  }
}

function applySpec(next: SellerListingCatalogSpec) {
  spec.value = {
    ...next,
    fields: next.fields.map((field) => ({ ...field })),
    sampleColumns: [...next.sampleColumns],
    sampleRows: next.sampleRows.map((row) => ({ ...row })),
    updateFrequency: coerceUpdateFrequency(next.updateFrequency)
  }
  rowCountText.value = next.rowCount != null ? String(next.rowCount) : ''
  fieldCountText.value = next.fieldCount != null ? String(next.fieldCount) : (next.fields.length ? String(next.fields.length) : '')
  scenariosText.value = next.scenarios.join('、')
}

function parseOptionalCount(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t.replace(/,/g, ''))
  return Number.isFinite(n) ? n : undefined
}

function currentCatalogSpec(): SellerListingCatalogSpec {
  return {
    ...spec.value,
    rowCount: parseOptionalCount(rowCountText.value),
    fieldCount: fieldCountText.value.trim() ? parseOptionalCount(fieldCountText.value) ?? null : spec.value.fields.length || undefined,
    scenarios: parseListingScenarios(scenariosText.value)
  }
}

watch(artifact, (a) => {
  if (!a) return
  applySpec(listingCatalogSpecFromArtifact(a))
  if (sourceProduct.value?.type === 'report') {
    title.value = `${sourceProduct.value.name} · 衍生数据集`
    subtitle.value = `基于已购报告 ${sourceProduct.value.typeDetail.report?.version || ''} 加工`
    return
  }
  title.value = a.name
  subtitle.value = `用数对象 ${a.version} · ${a.dataProvenance === 'owned' ? '自有数据' : '已购衍生'}`
}, { immediate: true })

watch(sourceProduct, (product) => {
  if (!product || product.type !== 'report') return
  title.value = `${product.name} · 衍生数据集`
  subtitle.value = `基于已购报告 ${product.typeDetail.report?.version || ''} 加工`
}, { immediate: true })

function addField() {
  spec.value.fields = [...spec.value.fields, emptyListingField()]
}

function removeField(index: number) {
  spec.value.fields = spec.value.fields.filter((_, i) => i !== index)
}

function submit() {
  error.value = ''
  if (!seller.isApprovedSeller) {
    error.value = '请先完成卖家准入'
    return
  }
  submitting.value = true
  try {
    const catalogSpec = currentCatalogSpec()
    seller.submitListing({
      artifactId: artifactId.value,
      title: title.value.trim(),
      subtitle: subtitle.value.trim(),
      price: Number(price.value),
      enterprisePrice: Number(enterprisePrice.value),
      complianceSummary: catalogSpec.complianceNote,
      catalogSpec
    })
    if (props.embedded) emit('done')
    else router.replace({ path: '/app/mine', query: { menu: 'seller', sellerTab: 'listings' } })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div :class="embedded ? 'mt-3 space-y-3' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!embedded" title="上架申请" />
    <div :class="embedded ? 'space-y-3' : 'space-y-3 px-4 pt-3'">
      <div class="rounded-2xl border border-slate-100 bg-white p-3 text-[12px] text-slate-600 shadow-card">
        <template v-if="sourceProduct?.type === 'report'">
          来自「我的数据」个人报告：{{ sourceProduct.name }}。可选择用数对象后提交上架审核。
        </template>
        <template v-else>
          以下字段会进入找数详情页。系统项（卖家、来源）不可改；其余由你填写，运营审核通过后发布。
        </template>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <label class="block text-[12px] text-slate-500">可上架数据集（用数成果）
          <select v-model="artifactId" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
            <option v-for="a in seller.listableArtifacts" :key="a.id" :value="a.id">
              {{ a.name }} · {{ a.version }} · {{ a.dataProvenance === 'owned' ? '自有' : '衍生' }}
            </option>
          </select>
        </label>
        <div v-if="artifact" class="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          {{ artifact.licenseSummary }} · 更新于 {{ artifact.updatedAt }}
        </div>
        <label class="block text-[12px] text-slate-500">商品标题
          <input v-model="title" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">卖点摘要
          <input v-model="subtitle" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[12px] text-slate-500">个人购买价格（元）
            <input v-model.number="price" data-testid="seller-listing-personal-price" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
          <label class="block text-[12px] text-slate-500">企业购买价格（元）
            <input v-model.number="enterprisePrice" data-testid="seller-listing-enterprise-price" type="number" min="1" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
        </div>
        <p class="text-[11px] leading-relaxed text-slate-400">买家按当前身份支付对应标价，不享受会员价。款项打到平台，平台按合同与卖家结算。</p>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-800">关键指标</div>
        <p class="text-[11px] leading-relaxed text-slate-500">对应详情页「基本信息」顶部四格；留空则前台不展示该项。</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[12px] text-slate-500">数据粒度
            <input v-model="spec.granularity" data-testid="seller-listing-granularity" placeholder="如：仓库 × 品类 × 周" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
          <label class="block text-[12px] text-slate-500">时间范围
            <input v-model="spec.timeRange" data-testid="seller-listing-time-range" placeholder="如：近 6 个月" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
          <label class="block text-[12px] text-slate-500">数据行数
            <input v-model="rowCountText" data-testid="seller-listing-row-count" inputmode="numeric" placeholder="如：18600" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
          <label class="block text-[12px] text-slate-500">字段数
            <input v-model="fieldCountText" data-testid="seller-listing-field-count" inputmode="numeric" placeholder="默认按字段清单计数" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </label>
        </div>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-800">资源信息</div>
        <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <div class="rounded-lg bg-slate-50 px-3 py-2">入驻卖家<br><span class="text-[12px] text-slate-800">{{ seller.myProfile?.displayName || '当前卖家' }}</span></div>
          <div class="rounded-lg bg-slate-50 px-3 py-2">数据来源声明<br><span class="text-[12px] text-slate-800">{{ artifact?.dataProvenance === 'derived' ? '已购衍生（受源许可约束）' : '自有数据' }}</span></div>
          <div class="col-span-2 rounded-lg bg-slate-50 px-3 py-2">交付方式<br><span class="text-[12px] text-slate-800">平台收款后由运营开通数据集查看与样例</span></div>
        </div>
        <label class="block text-[12px] text-slate-500">地域范围
          <input v-model="spec.coverage" data-testid="seller-listing-coverage" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">更新频率
          <UpdateFrequencySelect
            v-model="spec.updateFrequency"
            data-testid="seller-listing-update-frequency"
            class="mt-1 px-3 py-2 text-[13px]"
          />
        </label>
        <label class="block text-[12px] text-slate-500">应用场景（顿号分隔）
          <input v-model="scenariosText" data-testid="seller-listing-scenarios" placeholder="如：仓储运营" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-800">商品说明书</div>
        <label class="block text-[12px] text-slate-500">价值主张
          <input v-model="spec.valueProposition" data-testid="seller-listing-value" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">详细描述
          <textarea v-model="spec.description" data-testid="seller-listing-description" rows="3" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">质量承诺
          <textarea v-model="spec.qualityPromise" data-testid="seller-listing-quality" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
        <label class="block text-[12px] text-slate-500">合规声明
          <textarea v-model="spec.complianceNote" data-testid="seller-listing-compliance" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </label>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-800">字段信息</div>
          <button type="button" class="text-[11px] text-orange-700" @click="addField">+ 添加字段</button>
        </div>
        <div v-for="(field, index) in spec.fields" :key="index" class="space-y-2 rounded-xl border border-slate-100 p-3">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-slate-400">字段 {{ index + 1 }}</span>
            <button type="button" class="text-[11px] text-slate-400" @click="removeField(index)">删除</button>
          </div>
          <input v-model="field.name" placeholder="字段名" class="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[12px]" />
          <div class="grid grid-cols-2 gap-2">
            <input v-model="field.dataType" placeholder="类型" class="rounded-lg border border-slate-200 px-3 py-2 text-[12px]" />
            <input v-model="field.meaning" placeholder="业务含义" class="rounded-lg border border-slate-200 px-3 py-2 text-[12px]" />
          </div>
          <input v-model="field.description" placeholder="描述" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px]" />
        </div>
        <div v-if="!spec.fields.length" class="rounded-lg bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-400">请至少添加一个字段</div>
      </div>

      <div v-if="spec.sampleRows.length" class="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-800">样例数据</div>
        <p class="text-[11px] leading-relaxed text-slate-500">随用数对象带出，发布后出现在「样例数据」页签。</p>
        <div class="overflow-x-auto rounded-lg border border-slate-100 text-[11px]">
          <table class="min-w-full">
            <thead class="bg-slate-50 text-slate-400">
              <tr>
                <th v-for="col in spec.sampleColumns" :key="col" class="px-2 py-1.5 text-left font-medium">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in spec.sampleRows" :key="index" class="border-t border-slate-50">
                <td v-for="col in spec.sampleColumns" :key="col" class="px-2 py-1.5 text-slate-600">{{ row[col] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="error" class="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>
      <button class="w-full rounded-xl bg-orange-500 py-3 text-[14px] font-medium text-white disabled:opacity-50" :disabled="submitting" @click="submit">
        提交上架审核
      </button>
    </div>
  </div>
</template>
