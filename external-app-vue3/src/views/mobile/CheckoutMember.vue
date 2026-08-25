<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import PurchaseIdentityBanner from '@/components/shared/PurchaseIdentityBanner.vue'
import { currentPurchaseIdentity, currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { formatYuan, membershipPlanForSubject, productMemberBenefit } from '@/domain/membership'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const subject = computed(() => currentPurchaseSubject(user))
const identity = computed(() => currentPurchaseIdentity(user))
const plan = computed(() => membershipPlanForSubject(subject.value))
const paid = ref(false)
const error = ref('')

const alreadyMember = computed(() => entitlements.hasEffectiveMembership)
const blockedPersonal = computed(() =>
  subject.value === 'personal' && entitlements.hasAnyTeamMembership && !entitlements.hasEffectiveMembership
)
const canPay = computed(() => entitlements.canPurchaseMembership)

const returnQ = computed(() => route.query.returnQ as string | undefined)
const returnMode = computed(() => route.query.returnMode as string | undefined)
const returnProduct = computed(() => route.query.returnProduct as string | undefined)
const returnProductRecord = computed(() => returnProduct.value ? catalog.byId(returnProduct.value) : undefined)
const returnBenefit = computed(() => returnProductRecord.value ? productMemberBenefit(returnProductRecord.value) : 'none')

const identityNote = computed(() => {
  if (subject.value === 'enterprise') return '本单开通当前企业的团队会员，个人会员会立即失效且时长不叠加。'
  if (blockedPersonal.value) return '已有团队会员的账户不能再开通个人会员。'
  return '本单开通个人会员，仅在个人身份下生效；进入企业身份后个人会员立即作废。'
})

const successHint = computed(() => {
  if (returnBenefit.value === 'discount') return '返回商品后可按会员价购买本商品。'
  if (returnBenefit.value === 'free') return '返回商品后可直接查看本商品。'
  return `有效期 ${plan.value.months} 个月`
})

function pay() {
  error.value = ''
  try {
    orders.purchaseMember(plan.value.months)
    paid.value = true
  } catch (err) {
    error.value = err instanceof Error ? err.message : '开通失败'
  }
}

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
        <PurchaseIdentityBanner :type-label="identity.typeLabel" :name="identity.name" :note="identityNote" />

        <div class="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4" data-testid="membership-plan">
          <div class="text-[11px] text-brand-600">{{ plan.shortName }}</div>
          <div class="mt-0.5 text-[15px] font-semibold text-slate-900">{{ plan.name }}</div>
          <div class="mt-1 text-[11px] leading-relaxed text-slate-500">{{ plan.note }}</div>
          <div class="mt-3 flex items-end justify-between">
            <div class="text-[22px] font-bold text-slate-900">{{ formatYuan(plan.price) }}<span class="ml-1 text-[12px] font-medium text-slate-400">/ 年</span></div>
            <div class="text-[11px] text-slate-400">{{ plan.months }} 个月</div>
          </div>
        </div>

        <p v-if="alreadyMember" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
          当前身份已有生效会员，无需重复开通。
        </p>
        <p v-else-if="blockedPersonal" class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          账户已有团队会员，不能再开通个人会员。可切换到企业身份使用团队权益，或直接单品购买。
        </p>
        <p v-else class="mt-3 text-[11px] leading-relaxed text-slate-400">
          个人会员与团队会员互斥。开通团队会员后个人权益立即失效；被加入企业后个人会员也会作废，退出企业不恢复。
        </p>
        <p v-if="error" class="mt-2 text-[12px] text-rose-600">{{ error }}</p>

        <button
          class="mt-4 w-full rounded-full py-3 text-[14px] font-medium text-white"
          :class="canPay ? 'bg-brand-500' : 'bg-slate-300'"
          :disabled="!canPay"
          @click="pay"
        >
          {{ alreadyMember ? '已开通' : blockedPersonal ? '无法开通个人会员' : `确认支付 ${formatYuan(plan.price)}` }}
        </button>
        <button data-testid="member-enterprise-report-entry" class="mt-2 w-full rounded-full bg-slate-100 py-2.5 text-[12px] text-slate-500" @click="router.push('/app/checkout/item/prod-logistics-monthly')">
          企业版入口 · 企业采购与席位共享 →
        </button>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">🎉</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">支付成功，{{ plan.shortName }}已生效</div>
        <div class="mt-1 text-[12px] text-emerald-600">{{ successHint }}</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goBackToContext">
          {{ returnQ ? '回到原问题解锁完整回答' : returnProduct ? '返回商品' : '完成' }}
        </button>
      </div>
    </div>
  </div>
</template>
