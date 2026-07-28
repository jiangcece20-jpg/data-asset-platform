<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'

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
        <div><span class="text-slate-500">更新时间：</span>{{ resource.updatedAt }}</div>
      </div>
    </div>

    <!-- 关联商品信息 -->
    <div v-if="product" class="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="mb-3 text-sm font-semibold text-slate-700">关联商品</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span class="text-slate-500">商品名称：</span>{{ product.name }}</div>
        <div><span class="text-slate-500">商品 ID：</span><code class="text-xs">{{ product.id }}</code></div>
        <div><span class="text-slate-500">前台状态：</span>{{ product.availability }}</div>
        <div><span class="text-slate-500">价格：</span>{{ product.price.itemPrice ?? '—' }} {{ product.price.unit ?? '' }}</div>
      </div>
    </div>
    <div v-else class="mb-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
      该资源尚未上架为商品
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
  </div>
  <div v-else class="py-20 text-center text-slate-500">
    资源不存在
  </div>
</template>
