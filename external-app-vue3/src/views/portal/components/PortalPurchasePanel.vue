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
import { productPriceSummary } from '@/domain/productPriceSummary'

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
const priceSummary = computed(() => productPriceSummary(props.product))
/** 已逐条展示方案价（空间商品登录后）时不再重复展示起步价块 */
const hasPriceList = computed(() => space.value && user.context.loggedIn && Boolean(apiPlans.value.length || spaceOffers.value.length))
</script>

<template>
  <div class="sticky top-20 space-y-3">
    <div class="ui-card p-5">
      <h2 class="text-base font-semibold text-ink-900">{{ space ? '申请试用' : '获取商品' }}</h2>
      <div
        v-if="!owned && !hasPriceList && priceSummary.kind !== 'none'"
        class="mt-3 flex items-baseline gap-1.5 rounded-lg border border-violet-100 bg-violet-50/40 px-4 py-3"
        data-testid="purchase-price-summary"
      >
        <template v-if="priceSummary.kind === 'money'">
          <span class="text-2xl font-bold leading-none text-violet-600">{{ priceSummary.text }}</span>
          <span class="text-xs text-ink-500">{{ priceSummary.suffix }}</span>
        </template>
        <span v-else-if="priceSummary.kind === 'free'" class="text-xl font-bold text-violet-600">免费</span>
        <span v-else class="text-xl font-bold text-ink-500">待报价</span>
        <span v-if="priceSummary.hint" class="ml-auto text-right text-xs leading-4 text-ink-500">{{ priceSummary.hint }}</span>
      </div>
      <div v-if="space" class="mt-3 rounded-lg bg-ink-100 p-3 text-xs leading-5 text-ink-600" data-testid="trusted-space-purchase-eligibility">
        <div class="font-medium text-ink-900">{{ SPACE_TRIAL_APPLY_LABEL }}</div>
        {{ USER_INTENT_HINT }}
      </div>
      <div v-if="space && user.context.loggedIn && (apiPlans.length || spaceOffers.length)" class="mt-4 space-y-2" data-testid="purchase-price">
        <div v-for="plan in apiPlans" :key="plan.name" class="flex flex-wrap justify-between gap-2 border-b border-ink-200 py-2 text-sm">
          <span class="text-ink-600">{{ plan.name }}</span><span class="font-medium text-ink-900">{{ plan.price }}</span>
        </div>
        <template v-if="!apiPlans.length">
          <div v-for="offer in spaceOffers" :key="offer.id" class="flex flex-wrap justify-between gap-2 border-b border-ink-200 py-2 text-sm">
            <span class="text-ink-600">{{ offer.name }}</span><span class="font-medium text-ink-900">{{ purchaseMoney(offer.price) }}</span>
          </div>
        </template>
      </div>
      <div v-if="space && user.context.loggedIn && billingRules.length" class="mt-3 space-y-1 text-xs leading-5 text-ink-500" data-testid="space-billing-rules">
        <div>计费规则 · 来自可信空间</div>
        <div v-for="rule in billingRules" :key="rule">{{ rule }}</div>
      </div>
      <div class="mt-4 space-y-2" :data-testid="actions.length > 1 ? 'product-dual-path' : undefined" :aria-busy="busy">
        <button
          v-for="(action, index) in actions"
          :key="action.key"
          :data-testid="index === 0 ? 'product-primary-action' : 'product-secondary-action'"
          class="min-h-11 w-full whitespace-normal break-words rounded-md border px-3 py-2.5 text-sm font-medium leading-6 transition disabled:cursor-not-allowed disabled:opacity-50"
          :class="index === 0
            ? 'border-violet-600 bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-700 hover:to-violet-600'
            : 'border-violet-200 bg-violet-50 text-violet-600 hover:border-violet-400 hover:bg-violet-100'"
          :disabled="action.disabled || busy"
          @click="emit('action', action)"
        >{{ busy ? '处理中…' : action.label }}</button>
      </div>
      <div v-if="owned && user.context.loggedIn" class="mt-4 rounded-md bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-600">
        <div class="font-medium">{{ access === 'member' ? '会员权益已覆盖' : '已获得商品权益' }}</div>
        <div>{{ product.type === 'dataset' && product.origin === 'asset_platform' ? '可在“我的订单”查看交付并进入用数模块' : '可直接查看完整内容' }}</div>
      </div>
      <dl class="mt-4 space-y-2 border-t border-ink-200 pt-3 text-xs text-ink-500">
        <div class="flex gap-2"><dt class="shrink-0">来源</dt><dd>{{ originMeta[product.origin] }}</dd></div>
        <div class="flex gap-2"><dt class="shrink-0">上架时间</dt><dd>{{ listedAtOf(product) }}</dd></div>
      </dl>
    </div>
    <button v-if="product.type === 'api' && owned && user.context.loggedIn" class="w-full rounded-md border border-ink-300 bg-white p-3 text-sm text-ink-600 transition hover:border-violet-300 hover:text-violet-600" @click="router.push('/portal/bills')">查看 API 账单</button>
  </div>
</template>
