<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/mobile/EmptyState.vue'
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
  router.push(`/portal/product/${productId}`)
}
</script>

<template>
  <section v-if="variant === 'mobile'" class="space-y-3" data-testid="my-datasets">
    <div class="rounded-xl bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-700">这里管理已购数据集的交付与有效期；报告、看板和 API 的使用入口从“我的订单”进入。</div>
    <article v-for="entitlement in datasetEntitlements" :key="entitlement.id" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span class="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">{{ entitlement.source === 'enterprise' ? '企业数据' : '个人数据' }}</span>
            <span>订单 {{ entitlement.orderId || '—' }}</span>
          </div>
          <h3 class="mt-2 text-[14px] font-semibold text-slate-900">{{ catalog.byId(entitlement.productId || '')?.name || '未知数据集' }}</h3>
        </div>
        <StatusBadge dict="entitlementStatus" :value="entitlement.status" />
      </div>

      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 text-[10px]">
        <div><span class="text-slate-400">服务方式</span><div class="mt-0.5 text-slate-700">{{ isRenewable(entitlement) ? '持续更新' : '一次性快照' }}</div></div>
        <div><span class="text-slate-400">资产版本</span><div class="mt-0.5 text-slate-700">{{ entitlement.assetVersion || '—' }}</div></div>
        <div><span class="text-slate-400">用数交付</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.status === 'delivered' ? '已交付' : '处理中' }}</div></div>
        <div><span class="text-slate-400">最近更新</span><div class="mt-0.5 text-slate-700">{{ deliveryFor(entitlement.id)?.lastSuccessfulRefreshAt?.slice(0, 10) || '—' }}</div></div>
        <div class="col-span-2"><span class="text-slate-400">{{ isRenewable(entitlement) ? '更新服务到期日' : '数据保留期限' }}</span><div class="mt-0.5 font-medium" :class="isExpiring(entitlement) ? 'text-amber-600' : 'text-slate-700'">{{ effectiveExpiry(entitlement) || '当前快照长期保留' }}<span v-if="isExpiring(entitlement)"> · 即将到期</span></div></div>
      </div>
      <div v-if="isRenewable(entitlement)" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-700">到期后停止接收新版本，最近已交付版本仍可使用；续订后延长更新服务。</div>

      <div class="mt-3 flex gap-2">
       <a v-if="deliveryFor(entitlement.id)?.biEntryUrl" :href="deliveryFor(entitlement.id)?.biEntryUrl" class="flex-1 rounded-full bg-brand-500 py-2.5 text-center text-[11px] font-medium text-white">进入用数模块</a>
       <a v-if="deliveryFor(entitlement.id)?.downloadUrl" :href="deliveryFor(entitlement.id)?.downloadUrl" class="flex-1 rounded-full border border-brand-500 py-2.5 text-center text-[11px] font-medium text-brand-600">下载数据</a>
       <button v-if="isRenewable(entitlement)" data-testid="renew-dataset" class="rounded-full border border-brand-500 px-4 py-2.5 text-[11px] font-medium text-brand-600" @click="renew(entitlement)">续订</button>
      </div>
    </article>
    <EmptyState v-if="!datasetEntitlements.length" icon="🗂️" title="暂无可用数据" desc="已购买并完成交付的数据集会显示在这里" />
  </section>

  <section v-else data-testid="portal-my-data">
    <div class="mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <div><div class="text-sm font-medium text-blue-900">已交付数据集</div><div class="mt-1 text-xs text-blue-700">管理交付状态、更新服务到期日与续订；用数模块内部能力不在本期范围。</div></div>
      <div class="text-sm font-semibold text-blue-900">{{ datasetEntitlements.length }} 项</div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <article v-for="entitlement in datasetEntitlements" :key="entitlement.id" data-testid="portal-dataset-entitlement" class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 text-xs text-slate-400"><span class="rounded bg-blue-50 px-2 py-1 text-blue-600">{{ entitlement.source === 'enterprise' ? '企业数据' : '个人数据' }}</span><span>订单 {{ entitlement.orderId || '—' }}</span></div>
            <h2 class="mt-2 text-base font-semibold text-slate-900">{{ catalog.byId(entitlement.productId || '')?.name || '未知数据集' }}</h2>
          </div>
          <StatusBadge dict="entitlementStatus" :value="entitlement.status" />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 text-xs">
          <div><div class="text-slate-400">服务方式</div><div class="mt-1 text-slate-700">{{ isRenewable(entitlement) ? '持续更新' : '一次性快照' }}</div></div>
          <div><div class="text-slate-400">资产版本</div><div class="mt-1 text-slate-700">{{ entitlement.assetVersion || '—' }}</div></div>
          <div><div class="text-slate-400">用数交付</div><div class="mt-1 text-slate-700">{{ deliveryFor(entitlement.id)?.status === 'delivered' ? '已交付' : '处理中' }}</div></div>
          <div><div class="text-slate-400">最近更新</div><div class="mt-1 text-slate-700">{{ deliveryFor(entitlement.id)?.lastSuccessfulRefreshAt?.slice(0, 10) || '—' }}</div></div>
          <div class="col-span-2"><div class="text-slate-400">{{ isRenewable(entitlement) ? '更新服务到期日' : '数据保留期限' }}</div><div class="mt-1 font-medium" :class="isExpiring(entitlement) ? 'text-amber-600' : 'text-slate-700'">{{ effectiveExpiry(entitlement) || '当前快照长期保留' }}<span v-if="isExpiring(entitlement)"> · 即将到期</span></div></div>
        </div>
        <div v-if="isRenewable(entitlement)" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">到期后停止接收新版本，最近已交付版本仍可使用。</div>
        <div class="mt-4 flex gap-2">
         <a v-if="deliveryFor(entitlement.id)?.biEntryUrl" :href="deliveryFor(entitlement.id)?.biEntryUrl" class="rounded-lg bg-brand-500 px-4 py-2 text-xs text-white">进入用数模块</a>
         <a v-if="deliveryFor(entitlement.id)?.downloadUrl" :href="deliveryFor(entitlement.id)?.downloadUrl" class="rounded-lg border border-brand-500 px-4 py-2 text-xs text-brand-600">下载数据</a>
         <button v-if="isRenewable(entitlement)" data-testid="portal-renew-dataset" class="rounded-lg border border-brand-500 px-4 py-2 text-xs text-brand-600" @click="renew(entitlement)">续订</button>
          <button v-if="entitlement.productId" class="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600" @click="goProduct(entitlement.productId)">查看商品</button>
        </div>
      </article>
    </div>
    <div v-if="!datasetEntitlements.length" class="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">暂无已交付数据集</div>
  </section>
</template>
