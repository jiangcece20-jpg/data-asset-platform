<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import PurchaseIdentityBanner from '@/components/shared/PurchaseIdentityBanner.vue'
import { currentPurchaseIdentity, currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useEntitlementStore } from '@/stores/entitlements'
import { commerceOffersOf, offerDescription, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { formatYuan, memberDiscountedAmount } from '@/domain/membership'
import { checkoutDualPathFields, previewOrderNo } from '@/domain/checkoutDualPath'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()
const entitlements = useEntitlementStore()
const sellerMarket = useSellerMarketStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isSellerMarket = computed(() => product.value?.origin === 'seller_market')
const checkoutAllowed = computed(() => product.value?.dealChannel === 'app_payment' && product.value.acquisitions.includes('item_purchase'))
const paid = ref(false)
const submitting = ref(false)
const subject = computed(() => currentPurchaseSubject(user))
const identity = computed(() => currentPurchaseIdentity(user))
const enterpriseMode = ref<'online' | 'contract'>('online')
const offer = computed(() => product.value ? commerceOffersOf(product.value).find((item) => item.subject === subject.value) : undefined)
const purchasePeriodMonths = computed(() => product.value ? salePeriodMonthsOf(product.value) : 12)
const listPrice = computed(() => offer.value?.price ?? 0)
const amount = computed(() => {
  if (!product.value) return listPrice.value
  if (isSellerMarket.value) return listPrice.value
  return memberDiscountedAmount(listPrice.value, product.value, entitlements.hasEffectiveMembership)
})
const memberPriced = computed(() => !isSellerMarket.value && amount.value < listPrice.value)
const dualPath = computed(() => {
  if (!product.value || !offer.value) {
    return { showDualPath: false as const }
  }
  if (route.query.skipDual === '1') {
    return { showDualPath: false as const }
  }
  return checkoutDualPathFields(product.value, {
    identitySubject: subject.value,
    hasEffectiveMembership: entitlements.hasEffectiveMembership,
    canPurchaseMembership: entitlements.canPurchaseMembership,
    isSellerMarket: isSellerMarket.value,
    itemPrice: listPrice.value
  })
})
const orderPreviewNo = computed(() => previewOrderNo(id.value))
const offerSummary = computed(() => (offer.value ? offerDescription(offer.value) : ''))

watch(checkoutAllowed, (allowed) => {
  if (!allowed) router.replace(`/app/product/${id.value}`)
}, { immediate: true })

const entitlementNote = computed(() => {
  if (!offer.value) return '当前主体未配置单品价'
  const scope = subject.value === 'personal' ? '仅购买人使用' : '归企业所有，由管理员分配成员权限'
  return `固定购买周期 ${purchasePeriodMonths.value} 个月 · ${scope}`
})

const identityNote = computed(() => {
  if (isSellerMarket.value && subject.value === 'enterprise') {
    return '本单打款到平台。在线支付后订单进入待开通，由运营开通后可查看；合同采购先待平台确认到账。不走会员价。'
  }
  if (isSellerMarket.value) return '本单打款到平台，支付后订单进入待开通，由运营开通后可查看。不走会员价。'
  if (subject.value === 'enterprise') return '本单归属当前企业，可选择在线支付或合同采购。'
  return '本单归属当前个人，支付后仅本人可使用。'
})

const paidTitle = computed(() => {
  if (isSellerMarket.value && subject.value === 'enterprise' && enterpriseMode.value === 'contract') {
    return '已提交合同采购，待平台确认到账后进入待开通'
  }
  if (isSellerMarket.value) return '支付成功，订单待运营开通'
  return '支付成功，已解锁本商品'
})

function goMemberCheckout() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value } })
}

function confirmPurchase() {
  if (submitting.value || paid.value || !product.value || !offer.value) return
  submitting.value = true
  try {
    if (isSellerMarket.value) {
      sellerMarket.purchaseSellerProduct(
        id.value,
        offer.value.id,
        subject.value === 'enterprise' ? enterpriseMode.value : 'online'
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
          买家打款到平台。支付成功后订单为「待开通」，由运营开通后才可查看。平台按合同与卖家结算，本商品不享受会员价。
        </div>
        <PurchaseIdentityBanner class="mt-3" :type-label="identity.typeLabel" :name="identity.name" :note="identityNote" />

        <div
          v-if="dualPath.showDualPath"
          class="mt-3 rounded-xl border border-slate-200 bg-white p-3"
          data-testid="checkout-order-summary"
        >
          <div class="text-[12px] font-medium text-slate-700">订单信息</div>
          <dl class="mt-2 space-y-2 text-[12px]">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400">订单编号</dt>
              <dd class="text-slate-700">{{ orderPreviewNo }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400">商品名称</dt>
              <dd class="text-right text-slate-700">{{ product.name }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400">付款金额</dt>
              <dd class="font-semibold text-brand-600">{{ formatYuan(listPrice) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-slate-400">商品描述</dt>
              <dd class="text-right text-slate-600">{{ offerSummary }}</dd>
            </div>
          </dl>
        </div>

        <div v-if="offer && !dualPath.showDualPath" class="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3" data-testid="fixed-item-price">
          <div class="flex items-start justify-between gap-2">
            <span class="text-[13px] font-medium text-slate-800">{{ memberPriced ? '会员价' : offer.name }}</span>
            <span class="text-right">
              <span v-if="memberPriced" class="mr-2 text-[11px] text-slate-400 line-through">{{ formatYuan(listPrice) }}</span>
              <span class="text-[13px] font-semibold text-brand-600">{{ formatYuan(amount) }}</span>
            </span>
          </div>
          <div class="mt-1 text-[11px] leading-relaxed text-slate-500">
            {{ memberPriced ? '当前身份会员生效，本单按会员折扣计价。' : '按当前登录身份展示对应价格，支付页不再切换主体。' }}
          </div>
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
            @click="enterpriseMode = 'online'; orders.invalidateEnterpriseReportCheckoutIntents(id)"
          >在线支付</button>
          <button
            class="rounded-xl border p-3 text-left"
            :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
            :disabled="submitting"
            @click="enterpriseMode = 'contract'; orders.invalidateEnterpriseReportCheckoutIntents(id)"
          >合同采购</button>
        </div>

        <div v-if="dualPath.showDualPath" class="mt-4 space-y-2" data-testid="checkout-dual-path">
          <button
            data-testid="checkout-direct-purchase"
            class="w-full rounded-full border border-slate-300 bg-white py-3 text-[14px] font-medium text-slate-700"
            :disabled="submitting || !offer"
            @click="confirmPurchase"
          >
            直接购买 {{ formatYuan(listPrice) }}
          </button>
          <div class="relative">
            <button
              data-testid="checkout-become-member"
              class="w-full rounded-full bg-emerald-500 py-3 text-[14px] font-medium text-white"
              :disabled="submitting"
              @click="goMemberCheckout"
            >
              {{ dualPath.memberButtonLabel ?? '成为会员' }}
            </button>
            <span
              v-if="dualPath.savingsLabel"
              class="absolute -top-2 right-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-medium text-amber-950 shadow-sm"
              data-testid="checkout-member-savings"
            >
              {{ dualPath.savingsLabel }}
            </span>
          </div>
        </div>
        <button
          v-else
          data-testid="purchase-final-confirm"
          class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
          :disabled="submitting || !offer"
          @click="confirmPurchase"
        >
          {{ subject === 'enterprise' && enterpriseMode === 'contract' ? `以${identity.name}提交合同采购` : `以${identity.name}支付` }}
        </button>
      </div>
      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">{{ isSellerMarket ? '⏳' : '🎉' }}</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">
          {{ paidTitle }}
        </div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="isSellerMarket ? router.replace({ path: '/app/mine', query: { tab: 'orders' } }) : goBackToContext()">
          {{ isSellerMarket ? '查看我的订单' : returnQ ? '回到原问题解锁完整回答' : '查看内容' }}
        </button>
      </div>
    </div>
  </div>
</template>
