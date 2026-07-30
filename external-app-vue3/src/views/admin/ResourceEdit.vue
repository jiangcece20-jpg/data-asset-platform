<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import type { PriceModel, AcquisitionOption } from '@/types/domain'
import { listedAtOf } from '@/utils/productMeta'

const PRICE_MODELS: { value: PriceModel; label: string }[] = [
  { value: 'free', label: '免费' },
  { value: 'member_free', label: '会员免费' },
  { value: 'member_discount', label: '会员折扣' },
  { value: 'item_only', label: '仅单品购买' }
]

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
  acquiMember: false,
  acquiItem: false,
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
  productForm.memberIncluded = p.memberIncluded
  productForm.acquiFree = p.acquisitions.includes('free')
  productForm.acquiMember = p.acquisitions.includes('member')
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

  // 探查字段
  profilingSelection.value = (p.typeDetail.dataset?.fields ?? [])
    .filter((f) => f.profilingEnabled)
    .map((f) => f.name)

  productSaved.value = false
  profilingSaved.value = false
}

watch(product, syncFormFromStore, { immediate: true })

// ---------------------------------------------------------------------------
// 保存动作
// ---------------------------------------------------------------------------

function saveProduct() {
  const p = product.value
  if (!p) return
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
    memberIncluded: productForm.memberIncluded,
    acquisitions: buildAcquisitions(),
    price: {
      ...p.price,
      model: productForm.priceModel,
      itemPrice: Number(productForm.itemPrice),
      memberDiscount: Number(productForm.memberDiscount)
    },
    // 运营增强字段
    recommendText: productForm.recommendText,
    tags: productForm.tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean),
    sortWeight: Number(productForm.sortWeight),
    recommendSlot: productForm.recommendSlot
  })
  productSaved.value = true
  setTimeout(() => { productSaved.value = false }, 3000)
}

function buildAcquisitions(): AcquisitionOption[] {
  const list: AcquisitionOption[] = []
  if (productForm.acquiFree) list.push('free')
  if (productForm.acquiMember) list.push('member')
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

    <!-- 类型特有区块：报告 -->
    <div v-if="resource.type === 'report' && resource.typeDetail.report" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">报告详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">作者：</span>{{ resource.typeDetail.report.author }}</div>
        <div><span class="text-slate-500">版本：</span>{{ resource.typeDetail.report.version }}</div>
        <div><span class="text-slate-500">受众：</span>{{ resource.typeDetail.report.audience }}</div>
        <div><span class="text-slate-500">内容区块：</span>{{ resource.typeDetail.report.blocks?.length }}</div>
      </div>
    </div>

    <!-- 类型特有区块：看板 -->
    <div v-if="resource.type === 'dashboard' && resource.typeDetail.dashboard" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">看板详情</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">时间范围：</span>{{ resource.typeDetail.dashboard.timeRange }}</div>
        <div><span class="text-slate-500">更新周期：</span>{{ resource.typeDetail.dashboard.updateCycle }}</div>
        <div><span class="text-slate-500">指标数：</span>{{ resource.typeDetail.dashboard.metrics?.length }}</div>
        <div><span class="text-slate-500">面板数：</span>{{ resource.typeDetail.dashboard.panels?.length }}</div>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 编辑表单（仅有关联商品且非用数视图时显示） -->
    <!-- ================================================================== -->
    <template v-if="editable && product">

      <!-- 商品信息编辑 -->
      <div class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-700">商品信息编辑</h2>

        <!-- 基本信息 -->
        <div class="mb-4">
          <div class="mb-2 text-xs font-medium text-slate-500">基本信息</div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">商品名称</span><input v-model="productForm.name" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">副标题</span><input v-model="productForm.subtitle" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">详细描述</span><textarea v-model="productForm.description" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">价值主张</span><textarea v-model="productForm.valueProposition" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">适用场景（顿号分隔）</span><input v-model="productForm.scenarios" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          </div>
        </div>

        <!-- 价格设置（仅 APP 内购商品） -->
        <div v-if="product.dealChannel === 'app_payment'" class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 text-xs font-medium text-slate-500">价格设置</div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">价格模式</span>
              <select v-model="productForm.priceModel" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm">
                <option v-for="m in PRICE_MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="mb-1 block text-xs text-slate-400">单品价格 ¥</span><input v-model.number="productForm.itemPrice" type="number" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">会员折扣</span><input v-model.number="productForm.memberDiscount" type="number" step="0.1" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            </div>
            <div>
              <span class="mb-1 block text-xs text-slate-400">获取方式</span>
              <div class="flex flex-wrap gap-3 text-xs text-slate-600">
                <label class="flex items-center gap-1.5"><input v-model="productForm.acquiFree" type="checkbox" />免费</label>
                <label class="flex items-center gap-1.5"><input v-model="productForm.acquiMember" type="checkbox" />会员</label>
                <label class="flex items-center gap-1.5"><input v-model="productForm.acquiItem" type="checkbox" />单品购买</label>
                <label class="flex items-center gap-1.5"><input v-model="productForm.memberIncluded" type="checkbox" />会员权益包含</label>
              </div>
            </div>
          </div>
        </div>

        <!-- 运营信息 -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 text-xs font-medium text-slate-500">运营信息</div>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <label class="block"><span class="mb-1 block text-xs text-slate-400">覆盖范围</span><input v-model="productForm.coverage" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">更新频率</span><input v-model="productForm.updateFrequency" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">交付方式</span><input v-model="productForm.deliveryMethod" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">提供方</span><input v-model="productForm.provider" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            </div>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">质量/服务承诺</span><textarea v-model="productForm.qualityPromise" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">合规声明</span><textarea v-model="productForm.complianceNote" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
          </div>
        </div>

        <!-- 展示与推荐 -->
        <div class="mb-4 border-t border-slate-100 pt-4">
          <div class="mb-2 text-xs font-medium text-slate-500">展示与推荐</div>
          <div class="space-y-3">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">推荐语</span><input v-model="productForm.recommendText" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">标签（顿号分隔）</span><input v-model="productForm.tags" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm" /></label>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model.number="productForm.sortWeight" type="number" class="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm" />排序权重</label>
              <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model="productForm.recommendSlot" type="checkbox" />进入推荐位</label>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700" @click="saveProduct">保存</button>
          <span v-if="productSaved" class="text-sm text-emerald-600">已保存</span>
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
