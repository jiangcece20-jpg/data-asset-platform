<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/types/domain'
import { useCatalogStore } from '@/stores/catalog'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { ownedProductPriceLine, productPriceLines } from '@/domain/productPriceDisplay'
import { productCardSummary } from '@/domain/productCardSummary'
import ProductChips from '@/components/shared/ProductChips.vue'

const props = defineProps<{ product: Product; matchReason?: string }>()

const router = useRouter()
const catalog = useCatalogStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const title = computed(() => props.product.name)
const subtitle = computed(() => {
  if (props.product.type === 'dataset' || props.product.type === 'api') {
    return productCardSummary(props.product).lead
  }
  return props.product.recommendText || props.product.subtitle
})

const access = computed(() => entitlements.accessLevel(props.product))
const purchaseSubject = computed(() => currentPurchaseSubject(user))

const priceText = computed(() => {
  const ownedLine = ownedProductPriceLine(access.value)
  if (ownedLine) return ownedLine
  return productPriceLines(props.product, purchaseSubject.value).singleLine
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
  <button class="relative w-full rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-card transition active:scale-[0.99]" @click="open">
    <span class="absolute right-3 top-3 text-lg" :class="product.favorite ? 'text-amber-400' : 'text-slate-200'" @click="toggleFav">★</span>
    <div class="mb-1.5 pr-6">
      <ProductChips :product="product" />
    </div>
    <div class="text-[15px] font-semibold leading-snug text-slate-900">{{ title }}</div>
    <div class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-500">{{ subtitle }}</div>
    <div v-if="matchReason" class="mt-1.5 text-[12px] text-slate-400">{{ matchReason }}</div>
    <div class="mt-2.5 flex items-center justify-between">
      <div class="flex items-center gap-2 text-[11px] text-slate-400">
        <span>{{ product.provider }}</span>
        <span>·</span>
        <span>{{ product.updateFrequency }}</span>
      </div>
    </div>
    <div class="mt-2 border-t border-slate-50 pt-2">
      <span class="text-[13px] font-medium text-slate-700" data-testid="product-card-price">{{ priceText }}</span>
    </div>
  </button>
</template>
