<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import DetailFieldGrid from './DetailFieldGrid.vue'
import {
  apiComplianceFields,
  apiProviderFields,
  apiResourceInfoFields,
  dashboardResourceInfoFields,
  complianceFields,
  datasetResourceInfoFields,
  declarationLinks,
  isSpaceSyncedProduct,
  providerFields,
  resourceInfoFields
} from '@/domain/productDetailFields'

const props = withDefaults(defineProps<{
  product: Product
  /** mobile 用 2 列小字号；pc 用 3 列 */
  variant?: 'pc' | 'mobile'
  /** 覆盖默认列数（运营后台窄栏用 2 列） */
  columns?: 2 | 3
  /** 运营编辑页展示「部门」；前台详情默认不展示 */
  includeDepartment?: boolean
  compactDataset?: boolean
  compactDashboard?: boolean
  apiDetail?: boolean
  originLabel?: string
}>(), {
  variant: 'pc',
  columns: undefined,
  includeDepartment: false,
  compactDataset: false,
  compactDashboard: false,
  apiDetail: false
})

const gridColumns = computed<2 | 3>(() => props.columns ?? (props.compactDataset || props.compactDashboard || props.apiDetail || props.variant === 'mobile' ? 2 : 3))
const dense = computed(() => props.variant === 'mobile')
const fieldLayout = computed<'grid' | 'rows'>(() => (props.variant === 'mobile' && !props.columns ? 'rows' : 'grid'))
const titleClass = computed(() =>
  props.variant === 'mobile' ? 'text-[15px] font-semibold text-ink-900' : 'text-sm font-semibold text-ink-900'
)

const resourceInfo = computed(() =>
  props.apiDetail && props.product.type === 'api'
    ? apiResourceInfoFields(props.product)
    : props.compactDashboard && props.product.type === 'dashboard'
      ? dashboardResourceInfoFields(props.product)
    : props.compactDataset && props.product.type === 'dataset'
    ? datasetResourceInfoFields(props.product)
    : resourceInfoFields(props.product, { includeDepartment: props.includeDepartment })
)
const compliance = computed(() => props.compactDataset || props.compactDashboard ? [] : props.apiDetail ? apiComplianceFields(props.product) : complianceFields(props.product))
const declarations = computed(() => props.compactDataset || props.compactDashboard || props.apiDetail ? [] : declarationLinks(props.product))
const provider = computed(() => props.compactDataset || props.compactDashboard ? [] : props.apiDetail ? apiProviderFields(props.product) : providerFields(props.product))
const spaceSynced = computed(() => isSpaceSyncedProduct(props.product))
</script>

<template>
  <div class="space-y-4">
    <section v-if="resourceInfo.length" data-testid="detail-resource-info" :class="variant === 'mobile' ? 'space-y-3' : ''">
      <div v-if="spaceSynced && !compactDataset && variant === 'mobile'" class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#EAF2FF] to-[#F4F1FF] px-3 py-2.5">
        <svg class="h-4 w-4 shrink-0 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" />
        </svg>
        <span class="text-[12px] leading-4 text-brand-700">标「同步」字段来自可信空间，不可编辑</span>
      </div>
      <div class="flex items-center gap-2">
        <span :class="titleClass">资源信息</span>
        <span v-if="spaceSynced && !compactDataset && variant !== 'mobile'" class="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">
          标「同步」字段来自可信空间，不可编辑
        </span>
      </div>
      <DetailFieldGrid :items="originLabel ? resourceInfo.map(item => item.label === '来源' ? { ...item, value: originLabel } : item) : resourceInfo" :columns="gridColumns" :dense="dense" :layout="fieldLayout" />
      <div v-if="product.spaceProductNo && !compactDataset && !compactDashboard && !apiDetail" class="rounded-lg bg-ink-100 px-3 py-2 text-[11px] text-ink-500" :class="variant === 'mobile' ? '' : 'mt-2'">
        空间商品编号 {{ product.spaceProductNo }}（同步于 {{ product.spaceSyncedAt }}）
      </div>
    </section>

    <section v-if="compliance.length" data-testid="detail-compliance" :class="variant === 'mobile' ? 'space-y-3' : ''">
      <div class="flex items-center gap-2">
        <span :class="titleClass">合规与授权</span>
        <span v-if="variant !== 'mobile' && !apiDetail" class="rounded bg-warning-50 px-1.5 py-0.5 text-[10px] text-warning-600">可售必填</span>
      </div>
      <DetailFieldGrid :items="compliance" :columns="gridColumns" :dense="dense" :layout="fieldLayout" />
      <DetailFieldGrid
        v-if="declarations.length"
        :items="declarations"
        :columns="gridColumns"
        :dense="dense"
        :layout="fieldLayout"
        :class="variant === 'mobile' ? '' : 'mt-2'"
      />
    </section>

    <section v-if="provider.length" data-testid="detail-provider" :class="variant === 'mobile' ? 'space-y-3' : ''">
      <div class="flex items-center gap-2">
        <span :class="titleClass">提供方信息</span>
        <span v-if="variant !== 'mobile' && spaceSynced" class="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">来自可信空间</span>
      </div>
      <DetailFieldGrid :items="provider" :columns="gridColumns" :dense="dense" :layout="fieldLayout" />
    </section>
  </div>
</template>
