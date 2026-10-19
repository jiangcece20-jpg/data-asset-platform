<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/domain'
import { resolveV102Trade } from '@/domain/v102Trade'
import { billingRuleNotes } from '@/domain/productDetailFields'
import { purchaseMoney } from '@/domain/portalPurchase'

const props = defineProps<{ product: Product }>()
// Product terms stay visible independently of the viewer's transaction state.
const pricing = computed(() => resolveV102Trade(props.product, { isTeam: true, hasMembership: true, hasAccess: false }))
const space = computed(() => props.product.dealChannel === 'space_purchase')
const plans = computed(() => {
  const api = props.product.typeDetail.api?.pricingPlans
  if (api?.length) return api.map(p => ({ name: p.name, price: p.price }))
  if (!space.value) return []
  return (props.product.commerceOffers?.length ? props.product.commerceOffers : props.product.datasetOffers ?? [])
    .map(p => ({ name: p.name, price: purchaseMoney(p.price) }))
})
const rules = computed(() => space.value ? billingRuleNotes(props.product) : [])
const description = computed(() => {
  if (space.value) return '按可信空间当前方案申请，授权以源端为准。'
  if (['member_free', 'public_free'].includes(pricing.value.plan)) return '企业会员直接使用，无需下单。'
  if (pricing.value.plan === 'merchant') return '按商品约定频率更新，服务期内自动交付。'
  return '购买后开通企业使用权益。'
})
</script>

<template>
  <section data-testid="detail-pricing" class="mb-5 border-b border-ink-200 pb-5">
    <h2 class="text-sm font-semibold text-ink-900">价格方案</h2>
    <div v-if="!plans.length" class="mt-3 flex flex-wrap items-baseline gap-2">
      <strong class="text-2xl text-ink-900">{{ pricing.price }}</strong>
      <span v-if="pricing.priceUnit" class="text-xs text-ink-500">{{ pricing.priceUnit }}</span>
      <span v-if="['member_discount', 'dataset_order'].includes(pricing.plan)" class="text-xs text-brand-600">会员折扣</span>
    </div>
    <dl v-else data-testid="purchase-price" class="mt-3 divide-y divide-ink-100">
      <div v-for="plan in plans" :key="plan.name" class="flex flex-wrap justify-between gap-3 py-2 text-sm">
        <dt class="text-ink-600">{{ plan.name }}</dt><dd class="font-semibold text-ink-900">{{ plan.price }}</dd>
      </div>
    </dl>
    <p data-testid="pricing-description" class="mt-2 text-xs leading-5 text-ink-500">{{ description }}</p>
    <p v-if="pricing.plan === 'merchant'" class="mt-1 text-xs text-ink-500">更新频率：{{ product.updateFrequency }}</p>
    <div v-if="rules.length" data-testid="space-billing-rules" class="mt-3 space-y-1 text-xs leading-5 text-ink-500">
      <div class="font-medium">计费规则 · 来自可信空间</div>
      <p v-for="rule in rules" :key="rule">{{ rule }}</p>
    </div>
  </section>
</template>
