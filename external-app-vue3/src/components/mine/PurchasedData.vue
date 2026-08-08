<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
import MineEntityCard from './MineEntityCard.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import type { Entitlement } from '@/types/domain'

const props = defineProps<{ variant: 'mobile' | 'portal' }>()

const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const datasetCommerce = useDatasetCommerceStore()

const datasetEntitlements = computed(() => entitlements.visibleDatasetEntitlements)
const deliveryFor = (entitlementId: string) => datasetCommerce.deliveries.find((item) => item.entitlementId === entitlementId)
const effectiveExpiry = (entitlement: Entitlement) => entitlement.updateValidTo || entitlement.validTo
const isRenewable = (entitlement: Entitlement) => entitlement.licenseKind === 'subscription' || entitlement.serviceMode === 'continuous'
const isExpiring = (entitlement: Entitlement) => {
  const value = effectiveExpiry(entitlement)
  if (!value) return false
  const days = Math.ceil((new Date(`${value}T23:59:59`).getTime() - Date.now()) / 86_400_000)
  return days >= 0 && days <= 90
}

function renew(entitlement: Entitlement) {
  if (!entitlement.productId) return
  const basePath = props.variant === 'portal' ? '/portal' : '/app'
  router.push({
    path: `${basePath}/checkout/dataset/${entitlement.productId}`,
    query: {
      subject: entitlement.source,
      offer: entitlement.datasetOfferId,
      renew: entitlement.id
    }
  })
}

function goProduct(productId: string) {
  const basePath = props.variant === 'portal' ? '/portal' : '/app'
  router.push(`${basePath}/product/${productId}`)
}

const actionBtn = 'rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600'
const actionPrimary = 'rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white'
const actionBrand = 'rounded-full border border-brand-500 px-3 py-1.5 text-[11px] text-brand-600'
</script>

<template>
  <section class="space-y-3" :data-testid="variant === 'portal' ? 'portal-my-data' : 'my-datasets'">
    <div
      class="rounded-xl px-3 py-2 leading-relaxed text-blue-700"
      :class="variant === 'portal' ? 'border border-blue-100 bg-blue-50 px-4 py-3 text-xs' : 'bg-blue-50 text-[11px]'"
    >
      <template v-if="variant === 'portal'">
        <div class="flex items-center justify-between gap-4">
          <div>
            <div class="text-sm font-medium text-blue-900">已交付数据集</div>
            <div class="mt-1 text-xs text-blue-700">管理交付状态、更新服务到期日与续订；用数模块内部能力不在本期范围。</div>
          </div>
          <div class="shrink-0 text-sm font-semibold text-blue-900">{{ datasetEntitlements.length }} 项</div>
        </div>
      </template>
      <template v-else>
        这里管理已购数据集的交付与有效期；报告、看板和 API 的使用入口从“我的订单”进入。
      </template>
    </div>

    <MineEntityCard
      v-for="entitlement in datasetEntitlements"
      :key="entitlement.id"
      :variant="variant"
      :data-testid="variant === 'portal' ? 'portal-dataset-entitlement' : undefined"
    >
      <template #badges>
        <span class="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">{{ entitlement.source === 'enterprise' ? '企业数据' : '个人数据' }}</span>
        <span class="text-slate-400">订单 {{ entitlement.orderId || '—' }}</span>
      </template>
      <template #title>{{ catalog.byId(entitlement.productId || '')?.name || '未知数据集' }}</template>
      <template #status><StatusBadge dict="entitlementStatus" :value="entitlement.status" /></template>
      <template #meta>
        <div><span class="text-slate-400">服务方式</span><div class="mt-0.5 text-slate-700">{{ isRenewable(entitlement) ? '持续更新' : '一次性快照' }}</div></div>
        <div><span class="text-slate-400">资产版本</span><div class="mt-0.5 text-slate-700">{{ entitlement.assetVersion || '—' }}</div></div>
        <div><span class="text-slate-400">用数交付</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.status === 'delivered' ? '已交付' : '处理中' }}</div></div>
        <div><span class="text-slate-400">最近更新</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.lastSuccessfulRefreshAt?.slice(0, 10) || '—' }}</div></div>
        <div :class="variant === 'portal' ? 'col-span-3' : 'col-span-2'">
          <span class="text-slate-400">{{ isRenewable(entitlement) ? '更新服务到期日' : '数据保留期限' }}</span>
          <div class="mt-0.5 font-medium" :class="isExpiring(entitlement) ? 'text-amber-600' : 'text-slate-700'">
            {{ effectiveExpiry(entitlement) || '当前快照长期保留' }}
            <span v-if="isExpiring(entitlement)"> · 即将到期</span>
          </div>
        </div>
      </template>
      <template v-if="isRenewable(entitlement)" #notice>
        <div class="rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700" :class="variant === 'portal' ? 'text-xs' : ''">
          到期后停止接收新版本，最近已交付版本仍可使用；续订后延长更新服务。
        </div>
      </template>
      <template #actions>
        <a v-if="deliveryFor(entitlement.id)?.biEntryUrl" :href="deliveryFor(entitlement.id)?.biEntryUrl" :class="actionPrimary">进入用数模块</a>
        <a v-if="deliveryFor(entitlement.id)?.downloadUrl" :href="deliveryFor(entitlement.id)?.downloadUrl" :class="actionBrand">下载数据</a>
        <button
          v-if="isRenewable(entitlement)"
          :data-testid="variant === 'portal' ? 'portal-renew-dataset' : 'renew-dataset'"
          :class="actionBrand"
          @click="renew(entitlement)"
        >续订</button>
        <button v-if="variant === 'portal' && entitlement.productId" :class="actionBtn" @click="goProduct(entitlement.productId!)">查看商品</button>
      </template>
    </MineEntityCard>

    <EmptyState v-if="variant === 'mobile' && !datasetEntitlements.length" icon="🗂️" title="暂无可用数据" desc="已购买并完成交付的数据集会显示在这里" />
    <div v-else-if="!datasetEntitlements.length" class="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400 shadow-card">暂无已交付数据集</div>
  </section>
</template>
