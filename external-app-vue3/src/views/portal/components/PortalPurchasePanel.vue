<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Product } from '@/types/domain'
import type { PortalPurchaseAction } from '@/domain/portalPurchase'
import { useUserStore } from '@/stores/user'
import { USER_INTENT_HINT } from '@/domain/spaceIntent'
import type { V102Trade, V102TradeActionKey } from '@/domain/v102Trade'

const props = defineProps<{
  product: Product
  owned: boolean
  access: 'member' | 'item' | 'enterprise' | 'none'
  actions: PortalPurchaseAction[]
  busy: boolean
  v102Trade?: V102Trade | null
}>()
const emit = defineEmits<{ action: [action: PortalPurchaseAction]; v102Action: [key: V102TradeActionKey] }>()
const router = useRouter()
const user = useUserStore()
const space = computed(() => props.product.dealChannel === 'space_purchase')
</script>

<template>
  <div data-testid="product-action-area" class="sticky top-20 space-y-3">
    <div class="ui-card p-5">
      <h2 v-if="!v102Trade" class="text-base font-semibold text-ink-900">{{ space ? '申请试用' : '获取商品' }}</h2>
      <div v-if="v102Trade" data-testid="v102-trade-plan">
        <button
          data-testid="product-primary-action"
          class="min-h-11 w-full rounded-md bg-violet-600 px-3 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink-300"
          :disabled="v102Trade.action.disabled || busy"
          @click="emit('v102Action', v102Trade.action.key)"
        >{{ v102Trade.action.label === '¥0 下单' ? '确认下单' : v102Trade.action.label }}</button>
        <button
          v-if="v102Trade.secondaryAction"
          data-testid="product-secondary-action"
          class="mt-2 min-h-11 w-full rounded-md border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-600 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="v102Trade.secondaryAction.disabled || busy"
          @click="emit('v102Action', v102Trade.secondaryAction.key)"
        >{{ v102Trade.secondaryAction.label }}</button>
      </div>
      <p v-if="!v102Trade && space" class="mt-3 text-xs leading-5 text-ink-600">{{ USER_INTENT_HINT }}</p>
      <div v-if="!v102Trade" class="mt-4 space-y-2" :data-testid="actions.length > 1 ? 'product-dual-path' : undefined" :aria-busy="busy">
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
      <div v-if="!v102Trade && owned && user.context.loggedIn" class="mt-4 rounded-md bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-600">
        <div class="font-medium">{{ access === 'member' ? '会员权益已覆盖' : '已获得商品权益' }}</div>
        <div>{{ product.type === 'dataset' && product.origin === 'asset_platform' ? '可在“我的订单”查看交付并进入用数模块' : '可直接查看完整内容' }}</div>
      </div>
    </div>
    <button v-if="product.type === 'api' && owned && user.context.loggedIn" class="w-full rounded-md border border-ink-300 bg-white p-3 text-sm text-ink-600 transition hover:border-violet-300 hover:text-violet-600" @click="router.push('/portal/bills')">查看 API 账单</button>
  </div>
</template>
