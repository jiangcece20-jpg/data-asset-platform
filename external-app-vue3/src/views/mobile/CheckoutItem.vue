<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import type { PurchaseSubject } from '@/stores/orders'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()
const sellerMarket = useSellerMarketStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isSellerMarket = computed(() => product.value?.origin === 'seller_market')
const checkoutAllowed = computed(() => product.value?.dealChannel === 'app_payment' && product.value.acquisitions.includes('item_purchase'))
const paid = ref(false)
const submitting = ref(false)
const enterpriseEligible = computed(() =>
  !isSellerMarket.value
  && user.isEnterpriseAuthenticated
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.currentEnterpriseMember)
)
// enterpriseEligible 已排除入驻商家，入驻商家商品自然落到个人主体
const subject = ref<PurchaseSubject>(enterpriseEligible.value ? 'enterprise' : 'personal')
const enterpriseMode = ref<'online' | 'contract'>('online')
const confirmationSubject = ref<PurchaseSubject | null>(null)
const offer = computed(() => product.value ? commerceOffersOf(product.value).find((item) => item.subject === subject.value) : undefined)
const purchasePeriodMonths = computed(() => product.value ? salePeriodMonthsOf(product.value) : 12)
const amount = computed(() => offer.value?.price ?? 0)
const subjectName = computed(() => subject.value === 'enterprise' ? user.enterprise.name : user.context.name)
const subjectLabel = computed(() => subject.value === 'enterprise' ? '企业' : '个人')

watch(checkoutAllowed, (allowed) => {
  if (!allowed) router.replace(`/app/product/${id.value}`)
}, { immediate: true })

const entitlementNote = computed(() => {
  if (!offer.value) return '当前主体未配置单品价'
  const scope = subject.value === 'personal' ? '仅购买人使用' : '归企业所有，由管理员分配成员权限'
  return `固定购买周期 ${purchasePeriodMonths.value} 个月 · ${scope}`
})

function selectSubject(next: PurchaseSubject) {
  if (submitting.value) return
  if (next === 'enterprise' && !enterpriseEligible.value) return
  if (subject.value !== next) {
    orders.invalidateEnterpriseReportCheckoutIntents(id.value)
    confirmationSubject.value = null
  }
  subject.value = next
}

function requestConfirmation() {
  if (submitting.value || !offer.value || (subject.value === 'enterprise' && !enterpriseEligible.value)) return
  confirmationSubject.value = subject.value
}

function confirmPurchase() {
  if (submitting.value || paid.value || !product.value || !offer.value || confirmationSubject.value !== subject.value) return
  submitting.value = true
  confirmationSubject.value = null
  try {
    if (isSellerMarket.value) {
      sellerMarket.purchaseSellerProduct(
        id.value,
        offer.value.id
      )
      paid.value = true
      return
    }
    if (subject.value === 'enterprise' && enterpriseMode.value === 'contract') {
      const intent = orders.createEnterpriseReportCheckoutIntent(id.value, enterpriseMode.value, {
        offerId: offer.value.id,
        selectedTermMonths: purchasePeriodMonths.value,
        amount: amount.value,
        serviceMode: offer.value.serviceMode
      })
      router.push({ path: `/app/checkout/enterprise/${id.value}`, query: { intent: intent.id } })
      return
    }
    const intent = subject.value === 'enterprise'
      ? orders.createEnterpriseReportCheckoutIntent(id.value, enterpriseMode.value, {
          offerId: offer.value.id,
          selectedTermMonths: purchasePeriodMonths.value,
          amount: amount.value,
          serviceMode: offer.value.serviceMode
        })
      : undefined
    orders.purchaseCommerceProductForSubject(id.value, subject.value, offer.value.id, purchasePeriodMonths.value, enterpriseMode.value, intent?.id)
    paid.value = true
  } catch {
    submitting.value = false
  }
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
          购买周期：{{ entitlementNote }} · 下载/导出：{{ product.type === 'report' ? '会员可合规下载 PDF' : '暂不支持导出' }} · 授权范围：{{ product.deliveryMethod }}
        </div>
        <div v-if="isSellerMarket" class="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-3 text-[12px] leading-relaxed text-orange-800">
          入驻商家自收款：你标记付款后，需卖家确认到账才会开通看板权益。平台不代收、不垫资。
        </div>
        <template>
          <div class="mt-3">
            <div class="text-[12px] font-medium text-slate-700">购买主体</div>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                data-testid="purchase-subject-personal"
                class="rounded-xl border p-3 text-left"
                :class="subject === 'personal' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
                :disabled="submitting"
                @click="selectSubject('personal')"
              >
                <div class="text-[13px] font-medium text-slate-800">个人购买</div>
                <div class="mt-1 text-[12px] text-slate-500">{{ user.context.name }}</div>
              </button>
              <button
                v-if="!isSellerMarket"
                data-testid="purchase-subject-enterprise"
                class="rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
                :class="subject === 'enterprise' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
                :disabled="!enterpriseEligible || submitting"
                @click="selectSubject('enterprise')"
              >
                <div class="text-[13px] font-medium text-slate-800">企业购买</div>
                <div class="mt-1 text-[12px] text-slate-500">{{ enterpriseEligible ? user.enterprise.name : '认证后可选' }}</div>
              </button>
            </div>
          </div>

          <div v-if="offer" class="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3" data-testid="fixed-item-price">
            <div class="flex items-start justify-between gap-2">
              <span class="text-[13px] font-medium text-slate-800">{{ offer.name }}</span>
              <span class="text-[13px] font-semibold text-brand-600">¥{{ offer.price.toLocaleString() }}</span>
            </div>
            <div class="mt-1 text-[11px] leading-relaxed text-slate-500">按当前购买主体展示，不与另一主体价格混用。</div>
          </div>

          <div class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="fixed-purchase-period">
            <div class="text-[12px] font-medium text-slate-700">购买周期</div>
            <div class="mt-1 text-[13px] text-slate-800">{{ purchasePeriodMonths }} 个月（商品固定）</div>
            <div class="mt-1 text-[11px] text-slate-400">创建订单后锁定，不支持选择周期或数据截止日期。</div>
          </div>

          <div v-if="subject === 'enterprise'" class="mt-3 grid grid-cols-2 gap-2">
            <button
              class="rounded-xl border p-3 text-left"
              :class="enterpriseMode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
              :disabled="submitting"
              @click="enterpriseMode = 'online'; orders.invalidateEnterpriseReportCheckoutIntents(id); confirmationSubject = null"
            >在线支付</button>
            <button
              class="rounded-xl border p-3 text-left"
              :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
              :disabled="submitting"
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
            :disabled="submitting"
            @click="requestConfirmation"
          >
            确认以{{ subjectLabel }}名义{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
          </button>
          <div v-else class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div class="text-[12px] text-amber-800">请再次确认：本订单将归属 {{ subjectName }}</div>
            <div class="mt-1 text-[12px] text-amber-800">应付金额：¥{{ amount.toLocaleString() }}</div>
            <div class="mt-1 text-[12px] text-amber-800">购买周期：{{ purchasePeriodMonths }} 个月</div>
            <button
              data-testid="purchase-final-confirm"
              class="mt-3 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
              :disabled="submitting"
              @click="confirmPurchase"
            >
              确认使用{{ subjectName }}{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
            </button>
          </div>
        </template>
      </div>
      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">{{ isSellerMarket ? '⏳' : '🎉' }}</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">
          {{ isSellerMarket ? '已提交付款，待卖家确认到账后开通' : '支付成功，已解锁本商品' }}
        </div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="isSellerMarket ? router.replace('/app/mine') : goBackToContext()">
          {{ isSellerMarket ? '查看我的订单' : returnQ ? '回到原问题解锁完整回答' : '查看内容' }}
        </button>
      </div>
    </div>
  </div>
</template>
