<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/types/domain'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { typeMeta, dealChannelMeta, originMeta } from '@/utils/productMeta'
import { commerceOffersOf } from '@/domain/commerceOffers'
import { formatMemberBenefitsLabel, resolveMemberBenefits } from '@/domain/memberBenefits'
import { productCardSummary } from '@/domain/productCardSummary'
import { publicSpaceChips } from '@/domain/spaceIntent'

const props = defineProps<{ product: Product; matchReason?: string }>()

const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()

const title = computed(() => props.product.name)
const subtitle = computed(() => {
  if (props.product.type === 'dataset' || props.product.type === 'api') {
    return productCardSummary(props.product).lead
  }
  return props.product.recommendText || props.product.subtitle
})

const access = computed(() => entitlements.accessLevel(props.product))

const priceText = computed(() => {
  const offers = commerceOffersOf(props.product)
  if (offers.length) {
    const min = Math.min(...offers.map((offer) => offer.price))
    return `¥${min.toLocaleString()} 起`
  }
  const p = props.product.price
  const memberLabel = formatMemberBenefitsLabel(resolveMemberBenefits(props.product))
  if (memberLabel) return p.itemPrice ? `¥${p.itemPrice} · ${memberLabel}` : memberLabel
  if (p.model === 'item_only') return `¥${p.itemPrice}`
  return p.quoteNote || '询价'
})

const actionHint = computed(() => {
  if (access.value === 'member') return '会员看'
  if (access.value === 'item') return '已购买'
  if (access.value === 'enterprise') return '企业已购'
  if (props.product.availability === 'candidate') return '可申请上架'
  if (props.product.availability === 'preparing') return '查看进度'
  if (props.product.acquisitions.includes('free')) return '免费查看'
  if (props.product.type === 'dataset' && props.product.dealChannel === 'app_payment') return '购买数据集'
  if (props.product.dealChannel === 'app_payment') return props.product.memberIncluded ? '会员解锁' : '单品购买'
  if (props.product.dealChannel === 'space_purchase') return '提交意向单'
  return '查看详情'
})

const spaceChips = computed(() => publicSpaceChips(props.product))

function open() {
  router.push(`/app/product/${props.product.id}`)
}

function toggleFav(e: MouseEvent) {
  e.stopPropagation()
  catalog.toggleFavorite(props.product.id)
}
</script>

<template>
  <button class="relative w-full rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-card transition active:scale-[0.99]" @click="open">
    <span class="absolute right-3 top-3 text-lg" :class="product.favorite ? 'text-amber-400' : 'text-slate-200'" @click="toggleFav">★</span>
    <div class="mb-1.5 flex items-center gap-1.5 pr-6">
      <span class="tag-chip">{{ typeMeta[product.type].icon }} {{ typeMeta[product.type].label }}</span>
      <span class="rounded-full px-2 py-0.5 text-xs" :class="dealChannelMeta[product.dealChannel].tone">{{ dealChannelMeta[product.dealChannel].label }}</span>
      <span v-if="product.origin === 'seller_market'" class="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">{{ originMeta.seller_market }}</span>
      <span v-if="product.availability === 'candidate'" class="tag-chip">可申请上架</span>
      <span v-if="product.availability === 'preparing'" class="tag-chip">准备中</span>
      <span v-for="chip in spaceChips" :key="chip" class="tag-chip">{{ chip }}</span>
    </div>
    <div class="text-[15px] font-semibold leading-snug text-slate-900">{{ title }}</div>
    <div class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-500">{{ subtitle }}</div>
    <div v-if="matchReason" class="mt-1.5 rounded-lg bg-brand-50 px-2 py-1 text-[12px] text-brand-700">匹配原因：{{ matchReason }}</div>
    <div class="mt-2.5 flex items-center justify-between">
      <div class="flex items-center gap-2 text-[11px] text-slate-400">
        <span>{{ product.provider }}</span>
        <span>·</span>
        <span>{{ product.updateFrequency }}</span>
      </div>
    </div>
    <div class="mt-2 flex items-center justify-between border-t border-slate-50 pt-2">
      <span class="text-[13px] font-medium text-slate-700">{{ priceText }}</span>
      <span class="rounded-full bg-brand-500 px-3 py-1 text-[12px] font-medium text-white">{{ actionHint }}</span>
    </div>
  </button>
</template>
