<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const orders = useOrderStore()
const user = useUserStore()

const plans = [
  { months: 1, price: 39, label: '连续包月' },
  { months: 12, price: 299, label: '年度会员', tag: '推荐 · 省 169 元' }
]
const selected = ref(1)
const paid = ref(false)

function pay() {
  orders.purchaseMember(selected.value)
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
        <div class="text-[13px] font-medium text-slate-700">单一会员覆盖配置范围内的报告和交互报表</div>
        <p class="mt-1 text-[12px] leading-relaxed text-slate-400">会员免费或折扣内容立即解锁，非会员内容仍可单独购买。</p>

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
            <div class="mt-1 text-[18px] font-bold text-slate-900">¥{{ p.price }}</div>
          </button>
        </div>

        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="pay">
          确认支付 ¥{{ plans.find((p) => p.months === selected)?.price }}
        </button>
        <button data-testid="member-enterprise-report-entry" class="mt-2 w-full rounded-full bg-slate-100 py-2.5 text-[12px] text-slate-500" @click="router.push('/app/checkout/item/prod-logistics-monthly')">
          企业版入口 · 企业采购与席位共享 →
        </button>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">🎉</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">支付成功，会员权益已生效</div>
        <div class="mt-1 text-[12px] text-emerald-600">有效期至 {{ user.context.memberExpiresAt }}</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goBackToContext">
          {{ returnQ ? '回到原问题解锁完整回答' : '完成' }}
        </button>
      </div>
    </div>
  </div>
</template>
