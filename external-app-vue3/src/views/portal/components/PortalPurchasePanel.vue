<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { originMeta, listedAtOf } from '@/utils/productMeta'
import type { Product } from '@/types/domain'
import type { PortalPurchaseAction } from '@/domain/portalPurchase'
import { purchaseMoney } from '@/domain/portalPurchase'
import { useUserStore } from '@/stores/user'
import { SPACE_TRIAL_APPLY_LABEL, USER_INTENT_HINT } from '@/domain/spaceIntent'
import { billingRuleNotes } from '@/domain/productDetailFields'

const props = defineProps<{
  product: Product
  owned: boolean
  access: 'member' | 'item' | 'enterprise' | 'none'
  actions: PortalPurchaseAction[]
  busy: boolean
}>()
const emit = defineEmits<{ action: [action: PortalPurchaseAction] }>()
const router = useRouter()
const user = useUserStore()
const space = computed(() => props.product.dealChannel === 'space_purchase')
const apiPlans = computed(() => props.product.typeDetail.api?.pricingPlans ?? [])
const billingRules = computed(() => billingRuleNotes(props.product))
const spaceOffers = computed(() => props.product.commerceOffers?.length ? props.product.commerceOffers : props.product.datasetOffers ?? [])
</script>

<template>
  <div class="sticky top-20 space-y-3">
    <div class="rounded-lg border border-slate-200 bg-white p-5">
      <h2 class="text-base font-semibold text-slate-900">{{ space ? '申请试用' : '获取商品' }}</h2>
      <div v-if="space" class="mt-3 text-sm leading-6 text-slate-500" data-testid="trusted-space-purchase-eligibility">
        <div class="font-medium text-slate-700">{{ SPACE_TRIAL_APPLY_LABEL }}</div>
        {{ USER_INTENT_HINT }}
      </div>
      <div v-if="space && user.context.loggedIn && (apiPlans.length || spaceOffers.length)" class="mt-4 space-y-2" data-testid="purchase-price">
        <div v-for="plan in apiPlans" :key="plan.name" class="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2 text-sm">
          <span class="text-slate-600">{{ plan.name }}</span><span class="font-medium text-slate-900">{{ plan.price }}</span>
        </div>
        <template v-if="!apiPlans.length">
          <div v-for="offer in spaceOffers" :key="offer.id" class="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2 text-sm">
            <span class="text-slate-600">{{ offer.name }}</span><span class="font-medium text-slate-900">{{ purchaseMoney(offer.price) }}</span>
          </div>
        </template>
      </div>
      <div v-if="space && user.context.loggedIn && billingRules.length" class="mt-3 space-y-1 text-xs leading-5 text-slate-500" data-testid="space-billing-rules">
        <div>计费规则 · 来自可信空间</div>
        <div v-for="rule in billingRules" :key="rule">{{ rule }}</div>
      </div>
      <div class="mt-4 space-y-2" :data-testid="actions.length > 1 ? 'product-dual-path' : undefined" :aria-busy="busy">
        <button
          v-for="(action, index) in actions"
          :key="action.key"
          :data-testid="index === 0 ? 'product-primary-action' : 'product-secondary-action'"
          class="min-h-11 w-full whitespace-normal break-words rounded-lg border px-3 py-2.5 text-sm font-medium leading-6 disabled:cursor-not-allowed disabled:opacity-50"
          :class="index === 0 ? 'border-brand-500 bg-brand-500 text-white hover:bg-brand-600' : 'border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'"
          :disabled="action.disabled || busy"
          @click="emit('action', action)"
        >{{ busy ? '处理中…' : action.label }}</button>
      </div>
      <div v-if="owned && user.context.loggedIn" class="mt-4 border-t border-emerald-100 pt-3 text-xs leading-5 text-emerald-700">
        <div>{{ access === 'member' ? '会员权益已覆盖' : '已获得商品权益' }}</div>
        <div>{{ product.type === 'dataset' && product.origin === 'asset_platform' ? '可在“我的订单”查看交付并进入用数模块' : '可直接查看完整内容' }}</div>
      </div>
      <dl class="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div class="flex gap-2"><dt class="shrink-0">来源</dt><dd>{{ originMeta[product.origin] }}</dd></div>
        <div class="flex gap-2"><dt class="shrink-0">上架时间</dt><dd>{{ listedAtOf(product) }}</dd></div>
      </dl>
    </div>
    <button v-if="product.type === 'api' && owned && user.context.loggedIn" class="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700" @click="router.push('/portal/bills')">查看 API 账单</button>
  </div>
</template>
