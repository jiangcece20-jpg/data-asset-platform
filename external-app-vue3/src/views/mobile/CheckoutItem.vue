<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import type { PurchaseSubject } from '@/stores/orders'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const checkoutAllowed = computed(() => product.value?.type === 'report' && product.value.dealChannel === 'app_payment')
const paid = ref(false)
const enterpriseEligible = computed(() =>
  user.isEnterpriseAuthenticated
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.currentEnterpriseMember)
)
const subject = ref<PurchaseSubject>(enterpriseEligible.value ? 'enterprise' : 'personal')
const enterpriseMode = ref<'online' | 'contract'>('online')
const confirmationSubject = ref<PurchaseSubject | null>(null)
const subjectName = computed(() => subject.value === 'enterprise' ? user.enterprise.name : user.context.name)
const subjectLabel = computed(() => subject.value === 'enterprise' ? '企业' : '个人')

watch(checkoutAllowed, (allowed) => {
  if (!allowed) router.replace(`/app/product/${id.value}`)
}, { immediate: true })

const entitlementNote = computed(() => {
  if (!product.value) return ''
  if (product.value.type === 'report') {
    const version = product.value.typeDetail.report?.version || ''
    return `永久访问当前版本 ${version}；后续独立版本需另行购买`
  }
  if (product.value.type === 'dashboard') {
    const months = product.value.entitlementPolicy?.kind === 'term' ? product.value.entitlementPolicy.months : 12
    return `购买后使用 ${months} 个月，期间持续获得更新`
  }
  return '购买后长期可访问'
})

function selectSubject(next: PurchaseSubject) {
  if (next === 'enterprise' && !enterpriseEligible.value) return
  if (subject.value !== next) {
    orders.invalidateEnterpriseReportCheckoutIntents(id.value)
    confirmationSubject.value = null
  }
  subject.value = next
}

function requestConfirmation() {
  if (subject.value === 'enterprise' && !enterpriseEligible.value) return
  confirmationSubject.value = subject.value
}

function confirmPurchase() {
  if (!product.value) return
  if (confirmationSubject.value !== subject.value) return
  if (product.value.type === 'report') {
    if (subject.value === 'enterprise' && enterpriseMode.value === 'contract') {
      const intent = orders.createEnterpriseReportCheckoutIntent(id.value, enterpriseMode.value)
      router.push({ path: `/app/checkout/enterprise/${id.value}`, query: { intent: intent.id } })
      return
    }
    const intent = subject.value === 'enterprise'
      ? orders.createEnterpriseReportCheckoutIntent(id.value, enterpriseMode.value)
      : undefined
    orders.purchaseReportForSubject(id.value, subject.value, enterpriseMode.value, intent?.id)
  }
  paid.value = true
}

const returnQ = computed(() => route.query.returnQ as string | undefined)
const returnMode = computed(() => route.query.returnMode as string | undefined)

function goBackToContext() {
  if (returnQ.value) {
    router.replace({ path: '/app/answer', query: { q: returnQ.value, mode: returnMode.value || 'auto', unlocked: '1' } })
  } else {
    router.replace(`/app/product/${id.value}`)
  }
}
</script>

<template>
  <div v-if="product && checkoutAllowed" class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="单品购买" />
    <div class="px-4 pt-3">
      <div v-if="!paid" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-slate-500">{{ product.subtitle }}</div>
        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-500">
          访问期限：{{ entitlementNote }} · 下载/导出：{{ product.type === 'report' ? '会员可合规下载 PDF' : '暂不支持导出' }} · 授权范围：{{ product.deliveryMethod }}
        </div>
        <template v-if="product.type === 'report'">
          <div class="mt-3">
            <div class="text-[12px] font-medium text-slate-700">购买主体</div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                data-testid="purchase-subject-personal"
                class="rounded-xl border p-3 text-left"
                :class="subject === 'personal' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
                @click="selectSubject('personal')"
              >
                <div class="text-[13px] font-medium text-slate-800">个人购买</div>
                <div class="mt-1 text-[12px] text-slate-500">{{ user.context.name }}</div>
              </button>
              <button
                data-testid="purchase-subject-enterprise"
                class="rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                :class="subject === 'enterprise' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
                :disabled="!enterpriseEligible"
                @click="selectSubject('enterprise')"
              >
                <div class="text-[13px] font-medium text-slate-800">企业购买</div>
                <div class="mt-1 text-[12px] text-slate-500">{{ enterpriseEligible ? user.enterprise.name : '认证后可选' }}</div>
              </button>
            </div>
          </div>

          <div v-if="subject === 'enterprise'" class="mt-3 grid grid-cols-2 gap-2">
            <button
              class="rounded-xl border p-3 text-left"
              :class="enterpriseMode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
              @click="enterpriseMode = 'online'; orders.invalidateEnterpriseReportCheckoutIntents(id); confirmationSubject = null"
            >在线支付</button>
            <button
              class="rounded-xl border p-3 text-left"
              :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
              @click="enterpriseMode = 'contract'; orders.invalidateEnterpriseReportCheckoutIntents(id); confirmationSubject = null"
            >合同采购</button>
          </div>

          <div data-testid="purchase-subject-name" class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">
            购买主体：{{ subjectName }}
          </div>
          <button
            v-if="confirmationSubject !== subject"
            data-testid="purchase-intent-confirm"
            class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
            @click="requestConfirmation"
          >
            确认以{{ subjectLabel }}名义{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
          </button>
          <div v-else class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div class="text-[12px] text-amber-800">请再次确认：本订单将归属 {{ subjectName }}</div>
            <button
              data-testid="purchase-final-confirm"
              class="mt-3 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
              @click="confirmPurchase"
            >
              确认使用{{ subjectName }}{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
            </button>
          </div>
        </template>
      </div>
      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">🎉</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">支付成功，已解锁本商品</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goBackToContext">
          {{ returnQ ? '回到原问题解锁完整回答' : '查看内容' }}
        </button>
      </div>
    </div>
  </div>
</template>
