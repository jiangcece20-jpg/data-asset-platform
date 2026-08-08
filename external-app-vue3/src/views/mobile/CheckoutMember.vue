<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import type { MemberTier } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const orders = useOrderStore()
const user = useUserStore()

const tiers: Array<{ tier: MemberTier; label: string; note: string }> = [
  { tier: 'standard', label: '普通会员', note: '覆盖普通会员免费/折扣商品' },
  { tier: 'premium', label: '高级会员', note: '覆盖普通 + 高级会员权益' }
]

const plans = [
  { months: 1, standardPrice: 39, premiumPrice: 79, label: '连续包月' },
  { months: 12, standardPrice: 299, premiumPrice: 599, label: '年度会员', tag: '推荐' }
]

const selectedTier = ref<MemberTier>('standard')
const selected = ref(1)
const paid = ref(false)

const currentPrice = computed(() => {
  const plan = plans.find((p) => p.months === selected.value)!
  return selectedTier.value === 'premium' ? plan.premiumPrice : plan.standardPrice
})

function pay() {
  orders.purchaseMember(selected.value, selectedTier.value)
  paid.value = true
}

const returnQ = computed(() => route.query.returnQ as string | undefined)
const returnMode = computed(() => route.query.returnMode as string | undefined)
const returnProduct = computed(() => route.query.returnProduct as string | undefined)

function goBackToContext() {
  if (returnQ.value) {
    router.replace({ path: '/app/answer', query: { q: returnQ.value, mode: returnMode.value || 'auto', unlocked: '1' } })
  } else if (returnProduct.value) {
    router.replace(`/app/product/${returnProduct.value}`)
  } else {
    router.replace('/app/mine')
  }
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="开通会员" />

    <div class="px-4 pt-3">
      <div v-if="!paid" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-700">按等级开通会员</div>
        <p class="mt-1 text-[12px] leading-relaxed text-slate-400">高级会员包含普通会员权益；商品可分别配置普通/高级的免费或折扣。</p>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="item in tiers"
            :key="item.tier"
            class="rounded-xl border p-3 text-left"
            :class="selectedTier === item.tier ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
            @click="selectedTier = item.tier"
          >
            <div class="text-[13px] font-medium text-slate-800">{{ item.label }}</div>
            <div class="mt-1 text-[11px] text-slate-400">{{ item.note }}</div>
          </button>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="p in plans"
            :key="p.months"
            class="relative rounded-xl border p-3 text-left"
            :class="selected === p.months ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
            @click="selected = p.months"
          >
            <div v-if="p.tag" class="absolute -top-2 right-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] text-white">{{ p.tag }}</div>
            <div class="text-[12px] text-slate-500">{{ p.label }}</div>
            <div class="mt-1 text-[18px] font-bold text-slate-900">
              ¥{{ selectedTier === 'premium' ? p.premiumPrice : p.standardPrice }}
            </div>
          </button>
        </div>

        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="pay">
          确认支付 ¥{{ currentPrice }}
        </button>
        <button data-testid="member-enterprise-report-entry" class="mt-2 w-full rounded-full bg-slate-100 py-2.5 text-[12px] text-slate-500" @click="router.push('/app/checkout/item/prod-logistics-monthly')">
          企业版入口 · 企业采购与席位共享 →
        </button>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">🎉</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">支付成功，{{ selectedTier === 'premium' ? '高级' : '普通' }}会员已生效</div>
        <div class="mt-1 text-[12px] text-emerald-600">有效期至 {{ user.context.memberExpiresAt }}</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goBackToContext">
          {{ returnQ ? '回到原问题解锁完整回答' : '完成' }}
        </button>
      </div>
    </div>
  </div>
</template>
