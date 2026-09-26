<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/types/domain'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { ownedProductPriceLine, productPriceLines } from '@/domain/productPriceDisplay'
import { productListChips } from '@/domain/productListChips'
import ProductTypeIcon from '@/components/shared/ProductTypeIcon.vue'

const props = defineProps<{ product: Product; matchReason?: string }>()

const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const title = computed(() => props.product.name)
const chips = computed(() => productListChips(props.product))

const access = computed(() => entitlements.accessLevel(props.product))
const purchaseSubject = computed(() => currentPurchaseSubject(user))

const priceText = computed(() => {
  const ownedLine = ownedProductPriceLine(access.value)
  if (ownedLine) return ownedLine
  return productPriceLines(props.product, purchaseSubject.value).singleLine
})

// 设计稿价格样式：主价红粗 + 后缀（会员免费）橙色胶囊
const priceParts = computed(() => priceText.value.split(' · '))
// 金额（¥开头）用大号粗体；报价说明/已购买等文字缩小一号保持协调
const isAmountPrice = computed(() => priceText.value.startsWith('¥'))

// 指标行：更新频率 · 空间名 · 提供方（provider 已含空间名时不重复）
const metricParts = computed(() => {
  const parts: string[] = []
  if (props.product.updateFrequency) parts.push(props.product.updateFrequency)
  const venue = chips.value.venue?.kind === 'space' ? chips.value.venue.name : ''
  if (venue && props.product.provider && !props.product.provider.includes(venue)) {
    parts.push(venue)
  }
  if (props.product.provider) parts.push(props.product.provider)
  return parts
})

function open() {
  router.push(`/app/product/${props.product.id}`)
}

function toggleFav(e: MouseEvent) {
  e.stopPropagation()
  catalog.toggleFavorite(props.product.id)
}
</script>

<template>
  <button
    class="relative flex w-full gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card transition active:scale-[0.99]"
    @click="open"
  >
    <!-- 类型图标 -->
    <ProductTypeIcon :type="product.type" :size="44" class="mt-0.5 shrink-0" />

    <div class="min-w-0 flex-1">
      <!-- 标题 -->
      <div class="truncate text-[16px] font-semibold leading-6 text-ink-900">{{ title }}</div>

      <!-- 标签行：类型蓝块 + 空间/卖家暖白块 + 运营橙块 -->
      <div data-testid="product-chips" class="mt-1 flex flex-wrap items-center gap-1.5">
        <span class="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-brand-600">{{ chips.typeLabel }}</span>
        <span
          v-if="chips.venue"
          class="rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4"
          :class="chips.venue.kind === 'space'
            ? 'bg-[#FFF3E8] text-warning-600'
            : 'bg-ink-100 text-ink-600'"
        >{{ chips.venue.name }}</span>
        <span v-if="chips.ops?.kind === 'campaign'" class="flex items-center gap-0.5 rounded-md bg-[#FFF3E8] px-1.5 py-0.5 text-[11px] font-medium leading-4 text-warning-600">
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.8 2.9 4.2 4.8 4.2 8.9a4.2 4.2 0 1 1-8.4 0c0-1.3.4-2.3 1-3.1.3.8.9 1.4 1.7 1.4-.4-2 .4-4.4 1.5-7.2z" /></svg>
          {{ chips.ops.label }}
        </span>
        <span v-else-if="chips.ops?.kind === 'status'" class="rounded-md bg-ink-100 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-ink-500">
          {{ chips.ops.label }}
        </span>
      </div>

      <!-- 指标行 -->
      <div class="mt-1.5 flex items-center gap-1.5 text-[12px] leading-4 text-ink-400">
        <template v-for="(part, idx) in metricParts" :key="idx">
          <span v-if="idx > 0" class="shrink-0">·</span>
          <span class="truncate">{{ part }}</span>
        </template>
      </div>

      <!-- 摘要（有价值主张时才出现，避免无效信息） -->
      <div v-if="matchReason" class="mt-1 text-[11px] text-ink-400">{{ matchReason }}</div>

      <!-- 价格行 -->
      <div class="mt-2 flex items-end justify-between gap-2">
        <div data-testid="product-card-price" class="flex min-w-0 items-baseline gap-1.5">
          <span
            class="text-danger-500"
            :class="isAmountPrice ? 'text-[17px] font-bold leading-5' : 'text-[13px] font-medium leading-5'"
          >{{ priceParts[0] }}</span>
          <template v-for="(part, idx) in priceParts.slice(1)" :key="idx">
            <span class="hidden"> · </span>
            <span class="shrink-0 rounded bg-[#FFF3E8] px-1.5 py-0.5 text-[10px] font-medium leading-3 text-warning-600">{{ part }}</span>
          </template>
        </div>
        <span
          class="shrink-0 self-center"
          role="button"
          :aria-label="product.favorite ? '取消收藏' : '收藏'"
          @click="toggleFav"
        >
          <svg v-if="product.favorite" class="h-5 w-5 text-brand-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
          <svg v-else class="h-5 w-5 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 17.3 5.8 21.5l1.6-7L1 9.9l7.1-.6L12 3l3.9 6.3 7.1.6-6.4 4.6 1.6 7z"/></svg>
        </span>
      </div>
    </div>
  </button>
</template>
