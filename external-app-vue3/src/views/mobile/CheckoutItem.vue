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
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { formatYuan, memberDiscountedAmount } from '@/domain/membership'

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
const subject = computed(() => currentPurchaseSubject(user, { forcePersonal: isSellerMarket.value }))
const identity = computed(() => currentPurchaseIdentity(user, { forcePersonal: isSellerMarket.value }))
const enterpriseMode = ref<'online' | 'contract'>('online')
const offer = computed(() => product.value ? commerceOffersOf(product.value).find((item) => item.subject === subject.value) : undefined)
const purchasePeriodMonths = computed(() => product.value ? salePeriodMonthsOf(product.value) : 12)
const listPrice = computed(() => offer.value?.price ?? 0)
const amount = computed(() => product.value
  ? memberDiscountedAmount(listPrice.value, product.value, entitlements.hasEffectiveMembership)
  : listPrice.value)
const memberPriced = computed(() => amount.value < listPrice.value)

watch(checkoutAllowed, (allowed) => {
  if (!allowed) router.replace(`/app/product/${id.value}`)
}, { immediate: true })

const entitlementNote = computed(() => {
  if (!offer.value) return '当前主体未配置单品价'
  const scope = subject.value === 'personal' ? '仅购买人使用' : '归企业所有，由管理员分配成员权限'
  return `固定购买周期 ${purchasePeriodMonths.value} 个月 · ${scope}`
})

const identityNote = computed(() => {
  if (isSellerMarket.value) return '入驻商家商品仅支持个人购买，按当前可用来源完成付款。'
  if (subject.value === 'enterprise') return '本单归属当前企业，可选择在线支付或合同采购。'
  return '本单归属当前个人，支付后仅本人可使用。'
})

function confirmPurchase() {
  if (submitting.value || paid.value || !product.value || !offer.value) return
  submitting.value = true
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
        <PurchaseIdentityBanner class="mt-3" :type-label="identity.typeLabel" :name="identity.name" :note="identityNote" />

        <div v-if="offer" class="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3" data-testid="fixed-item-price">
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

        <button
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
          {{ isSellerMarket ? '已提交付款，待卖家确认到账后开通' : '支付成功，已解锁本商品' }}
        </div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="isSellerMarket ? router.replace('/app/mine') : goBackToContext()">
          {{ isSellerMarket ? '查看我的订单' : returnQ ? '回到原问题解锁完整回答' : '查看内容' }}
        </button>
      </div>
    </div>
  </div>
</template>
