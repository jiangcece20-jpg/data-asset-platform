<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import DetailFieldGrid from './DetailFieldGrid.vue'
import {
  complianceFields,
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
}>(), {
  variant: 'pc',
  columns: undefined,
  includeDepartment: false
})

const gridColumns = computed<2 | 3>(() => props.columns ?? (props.variant === 'mobile' ? 2 : 3))
const dense = computed(() => props.variant === 'mobile')
const titleClass = computed(() =>
  props.variant === 'mobile' ? 'text-[13px] font-semibold text-slate-800' : 'text-sm font-semibold text-slate-800'
)

const resourceInfo = computed(() =>
  resourceInfoFields(props.product, { includeDepartment: props.includeDepartment })
)
const compliance = computed(() => complianceFields(props.product))
const declarations = computed(() => declarationLinks(props.product))
const provider = computed(() => providerFields(props.product))
const spaceSynced = computed(() => isSpaceSyncedProduct(props.product))
</script>

<template>
  <div class="space-y-4">
    <section v-if="resourceInfo.length" data-testid="detail-resource-info">
      <div class="mb-2 flex items-center gap-2">
        <span :class="titleClass">资源信息</span>
        <span v-if="spaceSynced" class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
          标「同步」字段来自可信空间，不可编辑
        </span>
      </div>
      <DetailFieldGrid :items="resourceInfo" :columns="gridColumns" :dense="dense" />
      <div v-if="product.spaceProductNo" class="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
        空间商品编号 {{ product.spaceProductNo }}（同步于 {{ product.spaceSyncedAt }}）
      </div>
    </section>

    <section v-if="compliance.length" data-testid="detail-compliance">
      <div class="mb-2 flex items-center gap-2">
        <span :class="titleClass">合规与授权</span>
        <span class="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">可售必填</span>
      </div>
      <DetailFieldGrid :items="compliance" :columns="gridColumns" :dense="dense" />
      <DetailFieldGrid
        v-if="declarations.length"
        :items="declarations"
        :columns="gridColumns"
        :dense="dense"
        class="mt-2"
      />
    </section>

    <section v-if="provider.length" data-testid="detail-provider">
      <div class="mb-2 flex items-center gap-2">
        <span :class="titleClass">提供方信息</span>
        <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
      </div>
      <DetailFieldGrid :items="provider" :columns="gridColumns" :dense="dense" />
    </section>
  </div>
</template>
