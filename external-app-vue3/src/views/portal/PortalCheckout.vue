<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PurchaseIdentityBanner from '@/components/shared/PurchaseIdentityBanner.vue'
import { currentPurchaseIdentity, currentPurchaseSubject } from '@/domain/purchaseIdentity'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { typeMeta } from '@/utils/productMeta'
import { useEntitlementStore } from '@/stores/entitlements'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { commerceOffersOf, offerDescription, salePeriodMonthsOf } from '@/domain/commerceOffers'
import { formatYuan, memberDiscountedAmount } from '@/domain/membership'
import { checkoutDualPathFields, previewOrderNo } from '@/domain/checkoutDualPath'
import { usePortalPurchaseStore } from '@/stores/portalPurchase'
import type { PurchasePricePath } from '@/domain/portalPurchase'
import type { Order } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()
const entitlements = useEntitlementStore()
const purchase = usePortalPurchaseStore()
const error = ref('')
const pricePath = computed<PurchasePricePath | undefined>(() => route.query.pricePath === 'member' ? 'member' : route.query.pricePath === 'item' ? 'item' : undefined)

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isSellerMarket = computed(() => product.value?.origin === 'seller_market')
const paid = ref(false)
const purchaseOrder = ref<Order>()
const saleIssue = computed(() => isSellerMarket.value && product.value && (
  product.value.status !== 'published' || product.value.availability !== 'published'
  || ['suspended', 'terminated'].includes(product.value.serviceStatus)
) ? '该商品当前不可购买，请返回详情核对在售状态' : '')
const submitting = ref(false)
const purpose = ref('')
const subject = computed(() => currentPurchaseSubject(user))
const identity = computed(() => currentPurchaseIdentity(user))
const enterpriseMode = ref<'online' | 'contract'>('online')
const offer = computed(() => product.value ? commerceOffersOf(product.value, !!pricePath.value).find((item) => item.subject === subject.value) : undefined)
const purchasePeriodMonths = computed(() => product.value ? salePeriodMonthsOf(product.value) : 12)
const listPrice = computed(() => offer.value?.price ?? 0)
const amount = computed(() => {
  if (!product.value) return listPrice.value
  if (pricePath.value) return purchase.amount(product.value, pricePath.value)
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
const identityNote = computed(() => {
  if (isSellerMarket.value && subject.value === 'enterprise') {
    return '本单打款到平台。在线支付后自动交付当前数据版本；合同采购待平台确认到账后自动交付。不享受会员价。'
  }
  if (isSellerMarket.value) return '本单打款到平台，支付后自动交付当前数据版本。不享受会员价。'
  return subject.value === 'enterprise'
    ? '本单归属当前企业，可选择在线支付或合同采购。'
    : '本单归属当前个人，支付后仅本人可使用。'
})
const paidTitle = computed(() => {
  if (isSellerMarket.value && subject.value === 'enterprise' && enterpriseMode.value === 'contract') {
    return '已提交合同采购，待平台确认到账后自动交付'
  }
  if (isSellerMarket.value) return purchaseOrder.value?.status === 'entitlement_active'
    ? '支付成功，当前数据版本已交付' : '支付成功，数据交付处理中'
  return subject.value === 'enterprise' && enterpriseMode.value === 'contract' ? '企业合同订单已提交' : '已解锁本商品'
})

const sellerMarket = useSellerMarketStore()

function goMemberCheckout() {
  router.push({ path: '/app/checkout/member', query: { returnProduct: id.value, returnPortal: '1' } })
}

function confirmPurchase() {
  if (submitting.value || paid.value || subject.value !== 'enterprise' || !product.value || !offer.value) return
  if (saleIssue.value) { error.value = saleIssue.value; return }
  if (pricePath.value) {
    const reason = purchase.blockingReason(product.value, pricePath.value)
    if (reason) { error.value = reason; return }
    if (!purchase.actions(product.value).some((action) => action.key === pricePath.value)) {
      error.value = '购买方式已更新，请返回商品详情重新选择'
      return
    }
  }
  error.value = ''
  submitting.value = true
  try {
    if (isSellerMarket.value) {
      purchaseOrder.value = sellerMarket.purchaseSellerProduct(
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
      router.push({ path: `/portal/checkout/enterprise/${id.value}`, query: { intent: intent.id } })
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
    orders.purchaseCommerceProductForSubject(id.value, subject.value, offer.value.id, purchasePeriodMonths.value, enterpriseMode.value, intent?.id, pricePath.value)
    paid.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '操作失败，请稍后重试'
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="product && subject === 'enterprise'" class="mx-auto max-w-4xl">
    <div v-if="!paid && (error || saleIssue)" role="status" class="mb-4 rounded-lg border border-warning-100 bg-warning-50 px-5 py-3 text-sm text-warning-600">{{ error || saleIssue }}</div>
    <div class="grid grid-cols-3 gap-6">
      <!-- 左栏：订单信息 -->
      <div class="col-span-2 space-y-4">
        <div v-if="!paid" class="rounded-xl border border-ink-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-ink-900">购买结算</h2>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-3 rounded-lg bg-ink-100 p-3">
              <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">{{ typeMeta[product.type].label }}</span>
              <div class="flex-1">
                <div class="text-sm font-medium text-ink-900">{{ product.name }}</div>
                <div class="text-xs text-ink-500">{{ product.subtitle }}</div>
              </div>
            </div>

            <PurchaseIdentityBanner :type-label="identity.typeLabel" :name="identity.name" :note="identityNote" />

            <div v-if="isSellerMarket" class="rounded-lg border border-warning-100 bg-warning-50 p-3 text-xs leading-relaxed text-warning-600">
              买家打款到平台。在线支付成功或合同确认到账后，自动交付当前数据版本。平台按合同与卖家结算，本商品不享受会员价。
            </div>
            <dl v-if="isSellerMarket" data-testid="merchant-delivery-summary" class="space-y-2 rounded-lg bg-ink-100 p-3 text-xs">
              <div class="flex justify-between gap-3"><dt class="text-ink-500">数据更新时间</dt><dd class="text-ink-700">{{ product.typeDetail.dataset?.dataUpdatedAt || '未提供' }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-ink-500">更新频率</dt><dd class="text-ink-700">{{ product.updateFrequency }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-ink-500">服务周期</dt><dd class="text-ink-700">{{ purchasePeriodMonths }} 个月</dd></div>
            </dl>

            <div
              v-if="dualPath.showDualPath"
              class="rounded-lg border border-ink-200 bg-white p-3"
              data-testid="checkout-order-summary"
            >
              <div class="text-sm font-medium text-ink-700">订单信息</div>
              <dl class="mt-2 space-y-2 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-ink-500">订单编号</dt>
                  <dd class="text-ink-700">{{ orderPreviewNo }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-ink-500">商品名称</dt>
                  <dd class="text-right text-ink-700">{{ product.name }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-ink-500">付款金额</dt>
                  <dd class="font-semibold text-brand-600">{{ formatYuan(listPrice) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-ink-500">商品描述</dt>
                  <dd class="text-right text-ink-600">{{ offerSummary }}</dd>
                </div>
              </dl>
            </div>

            <div v-if="offer && !dualPath.showDualPath" class="rounded-lg border border-brand-100 bg-brand-50/50 p-3" data-testid="fixed-item-price">
              <div class="flex justify-between gap-2 text-sm">
                <span>{{ memberPriced ? '会员价' : offer.name }}</span>
                <strong class="text-brand-600">
                  <span v-if="memberPriced && !pricePath" class="mr-2 text-xs font-normal text-ink-500 line-through">{{ formatYuan(listPrice) }}</span>
                  {{ formatYuan(amount) }}
                </strong>
              </div>
              <div class="mt-1 text-xs text-ink-500">{{ memberPriced ? '当前身份会员生效，本单按会员折扣计价。' : '按当前登录身份展示对应价格，支付页不再切换主体。' }}</div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-ink-700">购买信息</div>
              <div class="space-y-3">
                <div class="rounded-lg border border-ink-200 bg-ink-100 p-3" data-testid="fixed-purchase-period">
                  <label class="mb-1 block text-xs text-ink-500">购买周期</label>
                  <div class="text-sm text-ink-700">{{ purchasePeriodMonths }} 个月（商品固定）</div>
                  <div class="mt-1 text-xs text-ink-500">创建订单后锁定，不支持选择周期或数据截止日期。</div>
                </div>
                <div v-if="subject === 'enterprise'" class="grid grid-cols-2 gap-2">
                  <button class="rounded-lg border p-2 text-sm disabled:opacity-50" :class="enterpriseMode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-ink-200'" :disabled="submitting" @click="enterpriseMode = 'online'; orders.invalidateEnterpriseReportCheckoutIntents(id)">在线支付</button>
                  <button class="rounded-lg border p-2 text-sm disabled:opacity-50" :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-ink-200'" :disabled="submitting" @click="enterpriseMode = 'contract'; orders.invalidateEnterpriseReportCheckoutIntents(id)">合同采购</button>
                </div>
                <div>
                  <label class="mb-1 block text-xs text-ink-500">使用用途</label>
                  <input
                    v-model="purpose"
                    class="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="请描述使用用途（可选）"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="ui-card border-success-100 bg-success-50 p-8 text-center">
          <div class="text-4xl"><svg class="mx-auto h-10 w-10 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m8.5 12.5 2.5 2.5 5-5" /></svg></div>
          <div class="mt-3 text-lg font-medium text-success-600">{{ isSellerMarket && enterpriseMode === 'contract' ? '合同采购已提交' : '支付成功' }}</div>
          <div class="mt-1 text-sm text-success-600">{{ paidTitle }}</div>
          <button class="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm text-white" @click="router.push({ path: '/portal/mine', query: { menu: 'orders', orderTab: 'buy' } })">
            查看我的订单 →
          </button>
        </div>
      </div>

      <!-- 右栏：订单摘要 -->
      <div class="col-span-1">
        <div class="sticky top-20 rounded-xl border border-ink-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-ink-900">订单摘要</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-ink-500">商品名称</span>
              <span class="text-ink-700">{{ product.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-500">类型</span>
              <span class="text-ink-700">{{ typeMeta[product.type].label }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-500">当前身份</span>
              <span class="truncate text-ink-700">{{ identity.typeLabel }} · {{ identity.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-ink-500">购买周期</span>
              <span class="text-ink-700">{{ purchasePeriodMonths }} 个月</span>
            </div>
            <div class="border-t border-ink-100 pt-2">
              <div v-if="!pricePath" class="flex justify-between">
                <span class="text-ink-500">原价</span>
                <span class="text-ink-700">{{ formatYuan(listPrice) }}</span>
              </div>
              <div class="mt-1 flex justify-between">
                <span class="text-ink-500">实付</span>
                <span class="text-lg font-bold text-brand-600">{{ formatYuan(amount) }}</span>
              </div>
            </div>
          </div>
          <div v-if="dualPath.showDualPath" class="space-y-2" data-testid="checkout-dual-path">
            <button
              data-testid="checkout-direct-purchase"
              class="w-full rounded-lg border border-ink-300 bg-white py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50"
              :disabled="submitting || !offer"
              @click="confirmPurchase"
            >
              直接购买 {{ formatYuan(listPrice) }}
            </button>
            <div class="relative">
              <button
                data-testid="checkout-become-member"
                class="w-full rounded-lg bg-success-500 py-2.5 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50"
                :disabled="submitting"
                @click="goMemberCheckout"
              >
                {{ dualPath.memberButtonLabel ?? '成为会员' }}
              </button>
              <span
                v-if="dualPath.savingsLabel"
                class="absolute -top-2 right-3 rounded-full bg-warning-500 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
                data-testid="checkout-member-savings"
              >
                {{ dualPath.savingsLabel }}
              </span>
            </div>
          </div>
          <button
            v-else-if="!paid"
            data-testid="purchase-final-confirm"
            class="mt-4 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="submitting || !offer || !!saleIssue"
            @click="confirmPurchase"
          >{{ submitting ? '处理中…' : subject === 'enterprise' ? '确认企业付款' : '确认并支付' }}</button>
          <button
            v-if="!paid && !dualPath.showDualPath"
            class="mt-2 w-full rounded-lg border border-ink-200 py-2.5 text-sm text-ink-600"
            @click="router.back()"
          >取消</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="product" class="p-8 text-center text-sm text-ink-500">试用会员不能购买或申请。</div>
  <div v-else class="p-8 text-center text-sm text-ink-500">商品不存在</div>
</template>
