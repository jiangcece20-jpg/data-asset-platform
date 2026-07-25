<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { genId } from '@/utils/id'
import type { ReportDetail, DashboardDetail, ReportContentBlock, PreviewMode } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const saved = ref(false)

const PREVIEW_OPTIONS: { value: PreviewMode; label: string }[] = [
  { value: 'visible', label: '可见' },
  { value: 'masked', label: '打码' },
  { value: 'locked', label: '锁定' }
]
const BLOCK_KINDS: { value: ReportContentBlock['kind']; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'metric', label: '指标' },
  { value: 'chart', label: '图表' },
  { value: 'pdf_page', label: 'PDF 页' }
]
const CHART_TYPES = [
  { value: 'line', label: '折线' },
  { value: 'bar', label: '柱状' },
  { value: 'number', label: '数值' }
] as const

// 深拷贝当前 typeDetail 到本地可编辑表单
const reportForm = reactive<ReportDetail>({
  author: '', publishedAt: '', version: '', audience: '', catalog: [], blocks: [], license: '', sourceUrl: '', boundAssetId: ''
})
const dashForm = reactive<DashboardDetail>({
  timeRange: '', updateCycle: '', metrics: [], panels: [], exportRule: '', sourceUrl: '', boundAssetId: ''
})

function loadForm() {
  saved.value = false
  const p = product.value
  if (!p) return
  if (p.type === 'report' && p.typeDetail.report) {
    Object.assign(reportForm, JSON.parse(JSON.stringify(p.typeDetail.report)))
  }
  if (p.type === 'dashboard' && p.typeDetail.dashboard) {
    Object.assign(dashForm, JSON.parse(JSON.stringify(p.typeDetail.dashboard)))
  }
}
watch(id, loadForm, { immediate: true })

// ── 报告：内容区块增删 ──
function addBlock() {
  reportForm.blocks.push({ id: genId('blk'), title: '新内容区块', kind: 'text', content: '', preview: 'masked' })
}
function removeBlock(i: number) {
  reportForm.blocks.splice(i, 1)
}

// ── 看板：面板 / 指标增删 ──
function addPanel() {
  dashForm.panels.push({ id: genId('pnl'), title: '新面板', chartType: 'line', preview: 'masked', summary: '' })
}
function removePanel(i: number) {
  dashForm.panels.splice(i, 1)
}
function addMetric() {
  dashForm.metrics.push({ name: '新指标', definition: '', formula: '', dimensions: [], preview: 'masked' })
}
function removeMetric(i: number) {
  dashForm.metrics.splice(i, 1)
}

function save() {
  const p = product.value
  if (!p) return
  if (p.type === 'report') {
    catalog.updateProduct(id.value, { typeDetail: { report: JSON.parse(JSON.stringify(reportForm)) } })
  } else if (p.type === 'dashboard') {
    catalog.updateProduct(id.value, { typeDetail: { dashboard: JSON.parse(JSON.stringify(dashForm)) } })
  }
  saved.value = true
}
</script>

<template>
  <div v-if="product">
    <div class="mb-1 flex items-center gap-2 text-[12px] text-slate-400">
      <button class="hover:underline" @click="router.push('/admin/content')">内容中心</button>
      <span>/</span>
      <span>{{ product.name }}</span>
    </div>
    <PageHeader :title="product.name" desc="内容正文 / 区块 / 预览口径维护（不跳转商品编辑页）" />

    <div class="mb-4 flex items-center gap-2">
      <StatusBadge dict="availability" :value="product.availability" />
      <span class="text-xs text-slate-400">{{ product.type === 'report' ? '报告' : '交互看板' }}</span>
      <div class="ml-auto flex items-center gap-2">
        <span v-if="saved" data-testid="saved" class="text-[12px] text-emerald-600">✅ 已保存</span>
        <button data-testid="save" class="rounded-lg bg-brand-500 px-4 py-1.5 text-[12px] text-white" @click="save">保存内容</button>
      </div>
    </div>

    <!-- 报告编辑器 -->
    <div v-if="product.type === 'report'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-1 flex items-center gap-2">
          <span class="text-[13px] font-medium text-slate-700">数据源 / 地址</span>
          <span class="text-[10px] text-slate-300">· 关联资产后可自动带出</span>
        </div>
        <div class="mt-2 space-y-2 text-[13px]">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">报告文件 / 在线阅读地址</span><input v-model="reportForm.sourceUrl" placeholder="https:// 或资产平台文件地址" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">绑定资产 / 报表编号</span><input v-model="reportForm.boundAssetId" placeholder="资产平台报表 ID" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 text-[13px] font-medium text-slate-700">报告信息</div>
        <div class="grid grid-cols-2 gap-2 text-[13px]">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">版本</span><input v-model="reportForm.version" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">作者</span><input v-model="reportForm.author" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">适用读者</span><input v-model="reportForm.audience" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">授权说明</span><input v-model="reportForm.license" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-[13px] font-medium text-slate-700">内容区块（{{ reportForm.blocks.length }}）</span>
          <button data-testid="add-block" class="rounded-lg bg-slate-100 px-3 py-1 text-[12px] text-slate-600" @click="addBlock">+ 新增区块</button>
        </div>
        <div v-for="(b, i) in reportForm.blocks" :key="b.id" data-testid="block-row" class="mb-3 rounded-lg border border-slate-100 p-3">
          <div class="mb-2 flex items-center gap-2">
            <input v-model="b.title" class="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium" />
            <select v-model="b.kind" class="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option v-for="k in BLOCK_KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
            <select v-model="b.preview" class="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option v-for="pm in PREVIEW_OPTIONS" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
            </select>
            <button class="rounded bg-red-50 px-2 py-1 text-[12px] text-red-500" @click="removeBlock(i)">删除</button>
          </div>
          <textarea v-model="b.content" rows="2" placeholder="区块正文" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]" />
        </div>
        <div v-if="!reportForm.blocks.length" class="py-4 text-center text-[12px] text-slate-400">暂无内容区块，点击右上角新增</div>
      </div>
    </div>

    <!-- 看板编辑器 -->
    <div v-else-if="product.type === 'dashboard'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-1 flex items-center gap-2">
          <span class="text-[13px] font-medium text-slate-700">数据源 / 地址</span>
          <span class="text-[10px] text-slate-300">· 关联资产后可自动带出</span>
        </div>
        <div class="mt-2 space-y-2 text-[13px]">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">看板嵌入地址（BI Embed URL）</span><input v-model="dashForm.sourceUrl" placeholder="https:// BI 看板嵌入地址" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">绑定资产 / 看板编号</span><input v-model="dashForm.boundAssetId" placeholder="资产平台看板 ID" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 text-[13px] font-medium text-slate-700">看板信息</div>
        <div class="grid grid-cols-3 gap-2 text-[13px]">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">时间范围</span><input v-model="dashForm.timeRange" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">更新周期</span><input v-model="dashForm.updateCycle" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">导出规则</span><input v-model="dashForm.exportRule" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-[13px] font-medium text-slate-700">面板（{{ dashForm.panels.length }}）</span>
          <button data-testid="add-panel" class="rounded-lg bg-slate-100 px-3 py-1 text-[12px] text-slate-600" @click="addPanel">+ 新增面板</button>
        </div>
        <div v-for="(p, i) in dashForm.panels" :key="p.id" data-testid="panel-row" class="mb-3 rounded-lg border border-slate-100 p-3">
          <div class="mb-2 flex items-center gap-2">
            <input v-model="p.title" class="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium" />
            <select v-model="p.chartType" class="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option v-for="c in CHART_TYPES" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
            <select v-model="p.preview" class="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option v-for="pm in PREVIEW_OPTIONS" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
            </select>
            <button class="rounded bg-red-50 px-2 py-1 text-[12px] text-red-500" @click="removePanel(i)">删除</button>
          </div>
          <input v-model="p.summary" placeholder="面板说明" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]" />
        </div>
        <div v-if="!dashForm.panels.length" class="py-4 text-center text-[12px] text-slate-400">暂无面板</div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-[13px] font-medium text-slate-700">指标定义（{{ dashForm.metrics.length }}）</span>
          <button data-testid="add-metric" class="rounded-lg bg-slate-100 px-3 py-1 text-[12px] text-slate-600" @click="addMetric">+ 新增指标</button>
        </div>
        <div v-for="(m, i) in dashForm.metrics" :key="i" data-testid="metric-row" class="mb-3 rounded-lg border border-slate-100 p-3">
          <div class="mb-2 flex items-center gap-2">
            <input v-model="m.name" class="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium" />
            <select v-model="m.preview" class="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]">
              <option v-for="pm in PREVIEW_OPTIONS" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
            </select>
            <button class="rounded bg-red-50 px-2 py-1 text-[12px] text-red-500" @click="removeMetric(i)">删除</button>
          </div>
          <input v-model="m.definition" placeholder="口径定义" class="mb-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]" />
          <input v-model="m.formula" placeholder="计算公式" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]" />
        </div>
        <div v-if="!dashForm.metrics.length" class="py-4 text-center text-[12px] text-slate-400">暂无指标</div>
      </div>
    </div>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-6 text-center text-[13px] text-slate-400">
      该商品不是内容型（仅报告 / 看板支持内容编辑）
    </div>
  </div>
  <div v-else class="text-sm text-slate-400">商品不存在</div>
</template>
