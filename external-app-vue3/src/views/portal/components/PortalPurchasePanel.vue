<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { originMeta, listedAtOf } from '@/utils/productMeta'
import type { Product } from '@/types/domain'
import type { ProductAction, ProductActionKey } from '@/domain/productAccess'
import { pricingPresentation } from '@/domain/pricingPresentation'
import { commerceOffersOf, offerDescription, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { billingRuleNotes } from '@/domain/productDetailFields'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  product: Product
  owned: boolean
  access: 'member' | 'item' | 'enterprise' | 'none'
  actions: { primary: ProductAction; secondary?: ProductAction } | null
}>()

const emit = defineEmits<{ action: [key: ProductActionKey] }>()
const router = useRouter()
const user = useUserStore()
const pricingInfo = computed(() => pricingPresentation(props.product))
const billingRules = computed(() => billingRuleNotes(props.product))

const trustedPurchaseEligibility = computed(() => {
  if (props.product.dealChannel !== 'space_purchase') return null
  if (!user.context.loggedIn) {
    return {
      badge: '未登录',
      tone: 'border-slate-200 bg-slate-50',
      badgeTone: 'bg-slate-200 text-slate-600',
      title: '登录后查看购买资格',
      description: '登录后可继续查看商品信息；正式购买仍需使用已认证企业身份。'
    }
  }
  if (user.context.enterpriseAuthStatus === 'none') {
    return {
      badge: '个人浏览',
      tone: 'border-amber-200 bg-amber-50',
      badgeTone: 'bg-amber-100 text-amber-700',
      title: '当前为个人身份',
      description: '你可以查看商品、价格和公开资料，但可信空间商品仅支持认证企业购买，个人身份不能下单。'
    }
  }
  if (user.context.enterpriseAuthStatus === 'pending') {
    return {
      badge: '认证中',
      tone: 'border-blue-200 bg-blue-50',
      badgeTone: 'bg-blue-100 text-blue-700',
      title: '企业认证审核中',
      description: '审核期间可以继续浏览和收藏；认证通过后返回当前商品继续购买。'
    }
  }
  if (props.actions?.primary.disabled) {
    return {
      badge: '连接中',
      tone: 'border-blue-200 bg-blue-50',
      badgeTone: 'bg-blue-100 text-blue-700',
      title: props.actions.primary.label,
      description: `已认证企业：${user.enterprise.name}。正在校验商品和可信空间企业连接，完成前暂不能下单。`
    }
  }
  return {
    badge: '可购买',
    tone: 'border-emerald-200 bg-emerald-50',
    badgeTone: 'bg-emerald-100 text-emerald-700',
    title: '认证企业购买',
    description: `当前购买企业：${user.enterprise.name}。订单、付款、正式交付和售后由可信空间承接。`
  }
})

const priceText = computed(() => {
  if (commerceOffers.value.length) return `¥${Math.min(...commerceOffers.value.map((offer) => offer.price)).toLocaleString()} 起`
  const m = props.product.price.model
  if (m === 'free') return '免费'
  if (m === 'member_free') return '会员免费'
  if (m === 'quote') return apiPlans.value.length ? '多套餐可选' : '按报价'
  if (m === 'member_discount') return `¥${props.product.price.itemPrice}`
  return `¥${props.product.price.itemPrice}`
})

const priceSub = computed(() => {
  if (commerceOffers.value.length) return props.product.dealChannel === 'space_purchase' ? '可信空间同步价格方案' : `个人 / 企业单品价 · 固定 ${salePeriodMonthsOf(props.product)} 个月`
  const m = props.product.price.model
  if (m === 'free') return ''
  if (m === 'member_free') return '开通会员后免费使用'
  if (m === 'quote') return props.product.price.quoteNote ?? ''
  if (m === 'member_discount') return `会员折扣 ${props.product.price.memberDiscount}折`
  return '单品购买'
})

/** API 多套餐价格：存在时全部同时展示 */
const apiPlans = computed(() => props.product.typeDetail.api?.pricingPlans ?? [])
const commerceOffers = computed(() => commerceOffersOf(props.product))

const acquisitionText = computed(() => {
  const a = props.product.acquisitions
  if (a.includes('free')) return '免费'
  if (a.includes('member') && a.includes('item_purchase')) return '会员 / 单品'
  if (a.includes('member')) return '会员'
  if (a.includes('space_purchase')) return '可信空间'
  return '单品'
})

const showServiceNotice = computed(() =>
  props.product.serviceStatus !== 'normal'
  || props.product.availability === 'paused'
  || props.product.availability === 'delisted'
)

const serviceNoticeText = computed(() => {
  if (props.product.serviceStatus === 'suspended') return '服务风险处置中，暂停使用'
  if (props.product.serviceStatus === 'terminated') return '服务已终止'
  if (props.product.availability === 'paused') return '商品已暂停销售'
  if (props.product.availability === 'delisted') return '商品已下架'
  return '服务异常'
})

function goBills() {
  router.push('/portal/bills')
}
</script>

<template>
  <div class="sticky top-20 space-y-3">
    <!-- 价格区 -->
    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="text-2xl font-bold text-brand-600">{{ priceText }}</div>
      <div v-if="priceSub" class="mt-1 text-xs text-slate-400">{{ priceSub }}</div>
      <div class="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2" data-testid="pricing-method">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-slate-400">报价方式</span>
          <span class="text-sm font-semibold text-slate-700">{{ pricingInfo.label }}</span>
        </div>
        <div class="mt-1 text-xs leading-relaxed text-slate-500">{{ pricingInfo.note }}</div>
      </div>

      <!-- API 多套餐价格（同时展示全部套餐） -->
      <div v-if="apiPlans.length" class="mt-3 space-y-2">
        <div
          v-for="plan in apiPlans"
          :key="plan.name"
          class="rounded-lg border px-3 py-2"
          :class="plan.recommended ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-medium text-slate-800">
              {{ plan.name }}
              <span
                v-if="plan.recommended"
                class="ml-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-normal text-white"
              >推荐</span>
            </div>
            <div class="shrink-0 text-sm font-bold text-brand-600">{{ plan.price }}</div>
          </div>
          <div class="mt-0.5 flex items-center justify-between text-xs text-slate-400">
            <span>{{ plan.quota }}</span>
            <span v-if="plan.unitNote">{{ plan.unitNote }}</span>
          </div>
        </div>
      </div>

      <div v-if="commerceOffers.length" class="mt-3 space-y-2" data-testid="commerce-price-plans">
        <div v-for="offer in commerceOffers" :key="offer.id" class="rounded-lg border px-3 py-2" :class="offer.recommended ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'">
          <div class="flex items-center justify-between gap-2"><div class="text-sm font-medium text-slate-800">{{ offer.name }} <span v-if="offer.recommended" class="ml-1 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] text-white">推荐</span></div><div class="font-bold text-brand-600">¥{{ offer.price.toLocaleString() }}</div></div>
          <div class="mt-1 text-xs text-slate-400">{{ offer.subject === 'enterprise' ? '企业' : '个人' }} · {{ product.dealChannel === 'space_purchase' ? offerDescription(offer) : `订单锁定 ${salePeriodMonthsOf(product)} 个月购买周期` }} · {{ offer.accessScope === 'named_seats' ? `${offer.seats}席位` : offer.accessScope === 'enterprise_wide' ? '企业全员' : '仅本人' }}</div>
        </div>
      </div>

      <!-- 可信空间同步的计费规则说明 -->
      <div
        v-if="billingRules.length"
        class="mt-2 space-y-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500"
        data-testid="space-billing-rules"
      >
        <div class="text-[11px] text-slate-400">计费规则 · 来自可信空间</div>
        <div v-for="rule in billingRules" :key="rule">💡 {{ rule }}</div>
      </div>

      <div
        v-if="trustedPurchaseEligibility"
        class="mt-3 rounded-lg border p-3"
        :class="trustedPurchaseEligibility.tone"
        data-testid="trusted-space-purchase-eligibility"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-slate-500">购买资格</span>
          <span class="rounded-full px-2 py-0.5 text-[10px]" :class="trustedPurchaseEligibility.badgeTone">
            {{ trustedPurchaseEligibility.badge }}
          </span>
        </div>
        <div class="mt-2 text-sm font-semibold text-slate-800">{{ trustedPurchaseEligibility.title }}</div>
        <div class="mt-1 text-xs leading-relaxed text-slate-600">{{ trustedPurchaseEligibility.description }}</div>
      </div>

      <!-- 已拥有权益 -->
      <div v-if="owned" class="mt-3 rounded-lg bg-emerald-50 p-3 text-center">
        <div class="text-sm font-medium text-emerald-700">
          ✅ {{ product.type === 'dataset' && product.origin === 'asset_platform' ? '已获得数据权益' : access === 'member' ? '会员权益已覆盖' : access === 'item' ? '已单独购买' : '企业席位已授权' }}
        </div>
        <div class="mt-0.5 text-xs text-emerald-600">{{ product.type === 'dataset' && product.origin === 'asset_platform' ? '可在“我的数据”查看交付并进入用数模块' : '可直接查看完整内容' }}</div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="actions" class="mt-4 space-y-2">
        <button
          class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="actions.primary.disabled"
          @click="emit('action', actions.primary.key)"
        >
          {{ actions.primary.label }}
        </button>
        <button
          v-if="actions.secondary"
          class="w-full rounded-lg border border-brand-300 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          @click="emit('action', actions.secondary!.key)"
        >
          {{ actions.secondary.label }}
        </button>
      </div>

      <!-- 购买信息 -->
      <div class="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        <div>购买方式：{{ acquisitionText }}</div>
        <div class="mt-1">来源：{{ originMeta[product.origin] }}</div>
        <div class="mt-1">上架时间：{{ listedAtOf(product) }}</div>
      </div>
    </div>

    <!-- 服务状态通知 -->
    <div
      v-if="showServiceNotice"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3"
    >
      <div class="text-sm font-medium text-amber-700">⚠️ {{ serviceNoticeText }}</div>
    </div>

    <!-- API 用量入口 -->
    <div
      v-if="product.type === 'api' && owned"
      class="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div class="text-sm font-semibold text-slate-800">📊 API 用量</div>
      <div class="mt-2 flex items-center justify-between text-xs">
        <div>
          <span class="text-slate-400">本月调用：</span>
          <span class="text-slate-700">-- 次</span>
        </div>
        <button
          class="rounded-lg border border-brand-200 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
          @click="goBills"
        >
          查看账单 →
        </button>
      </div>
    </div>
  </div>
</template>
