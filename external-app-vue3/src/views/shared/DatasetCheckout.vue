<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useUserStore } from '@/stores/user'
import { datasetOfferToCommerce, offerAmount, offerDescription, offerTermOptions } from '@/domain/commerceOffers'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const commerce = useDatasetCommerceStore()
const user = useUserStore()

const isPortal = computed(() => route.path.startsWith('/portal'))
const product = computed(() => catalog.byId(String(route.params.id)))
const enterpriseEligible = computed(() => user.isEnterpriseAuthenticated && Boolean(user.context.currentEnterpriseId) && Boolean(user.currentEnterpriseMember))
const requestedSubject = route.query.subject === 'personal' || route.query.subject === 'enterprise' ? route.query.subject : undefined
const subject = ref<'personal' | 'enterprise'>(requestedSubject === 'personal' || (requestedSubject === 'enterprise' && enterpriseEligible.value) ? requestedSubject : enterpriseEligible.value ? 'enterprise' : 'personal')
const isRenewal = computed(() => Boolean(route.query.renew))
const offers = computed(() => product.value?.datasetOffers?.filter((offer) => offer.subject === subject.value) ?? [])
const selectedOfferId = ref('')
const offer = computed(() => product.value?.datasetOffers?.find((item) => item.id === selectedOfferId.value))
const selectedTermMonths = ref<number | undefined>()
const termOptions = computed(() => offer.value ? offerTermOptions(datasetOfferToCommerce(offer.value)) : [])
const amount = computed(() => offer.value ? offerAmount(datasetOfferToCommerce(offer.value), selectedTermMonths.value) : 0)
const submitting = ref(false)
const error = ref('')
const pendingOrderId = ref('')

const policyNote = computed(() => {
  if (subject.value === 'personal') return '订单、权益和用数模块中的数据均归个人，仅本人可使用，不能转为企业权益。'
  if (!enterpriseEligible.value) return '完成企业认证后才能以企业主体购买。'
  if (user.currentEnterpriseMember?.role === 'admin') return '企业管理员发起采购，无需内部审批；可使用企业余额、合同支付或公对公转账，不允许个人支付。'
  if (!user.enterprise.purchasePolicy.memberPurchaseAllowed) return '当前企业策略不允许普通成员发起采购。'
  return user.enterprise.purchasePolicy.memberPurchaseApprovalRequired
    ? '提交后需企业管理员审批，审批通过后选择企业付款方式。'
    : '企业已允许普通成员直接采购，可直接选择企业付款方式。'
})

function chooseSubject(next: 'personal' | 'enterprise') {
  error.value = ''
  subject.value = next
}

function chooseOffer(offerId: string) {
  selectedOfferId.value = offerId
  const next = product.value?.datasetOffers?.find((item) => item.id === offerId)
  selectedTermMonths.value = next ? offerTermOptions(datasetOfferToCommerce(next))[0] : undefined
}

watch([product, subject], () => {
  const requestedOffer = String(route.query.offer || '')
  const preferred = offers.value.find((item) => item.id === requestedOffer) || offers.value.find((item) => item.recommended) || offers.value[0]
  if (!preferred || offers.value.some((item) => item.id === selectedOfferId.value)) return
  chooseOffer(preferred.id)
}, { immediate: true })

function goEnterpriseAuth() {
  router.push({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
}

function submit() {
  if (!product.value || !offer.value || submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    const { order } = commerce.createOrder(product.value.id, subject.value, offer.value.id, selectedTermMonths.value)
    if (order.status === 'pending_approval') {
      pendingOrderId.value = order.id
      return
    }
    const base = isPortal.value ? '/portal/payment/dataset/' : '/app/payment/dataset/'
    router.push(`${base}${order.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交采购失败'
    submitting.value = false
  }
}

function goApprovalCenter() {
  router.push(isPortal.value
    ? { path: '/portal/mine', query: { menu: 'orders', orderTab: 'buy' } }
    : '/app/mine/enterprise?tab=purchase')
}
</script>

<template>
  <div v-if="product" :class="isPortal ? 'mx-auto max-w-5xl' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!isPortal" title="购买数据集" />
    <div :class="isPortal ? 'grid grid-cols-[minmax(0,1fr)_320px] gap-6' : 'px-4 pt-3'">
      <div class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-center gap-2 text-xs">
            <span class="rounded bg-blue-50 px-2 py-1 text-blue-600">资产平台数据集</span>
            <span class="rounded bg-emerald-50 px-2 py-1 text-emerald-600">用数模块交付</span>
          </div>
          <h1 class="mt-3 text-lg font-semibold text-slate-900">{{ product.name }}</h1>
          <p class="mt-1 text-sm text-slate-500">{{ product.subtitle }}</p>
          <div v-if="isRenewal" class="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">正在续订更新服务；原订单与已交付版本保留，本次支付成功后延长更新到期日。</div>
          <div class="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div>绑定版本：<span class="text-slate-700">{{ product.assetSnapshot?.assetVersion }}</span></div>
            <div>更新频率：<span class="text-slate-700">{{ product.updateFrequency }}</span></div>
            <div>交付：<span class="text-slate-700">用数模块数据</span></div>
            <div>原始下载：<span class="text-slate-700">{{ offer?.allowDownload ? '允许' : '不提供' }}</span></div>
          </div>
        </div>

        <div v-if="!pendingOrderId" class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="text-sm font-semibold text-slate-800">选择购买主体</div>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <button data-testid="dataset-subject-enterprise" class="rounded-xl border p-4 text-left" :class="subject === 'enterprise' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="chooseSubject('enterprise')">
              <div class="text-sm font-medium text-slate-800">企业购买 <span v-if="enterpriseEligible" class="text-xs text-brand-600">优先</span></div>
              <div class="mt-1 text-xs text-slate-500">{{ enterpriseEligible ? user.enterprise.name : '需完成企业认证' }}</div>
            </button>
            <button data-testid="dataset-subject-personal" class="rounded-xl border p-4 text-left" :class="subject === 'personal' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="chooseSubject('personal')">
              <div class="text-sm font-medium text-slate-800">个人购买</div>
              <div class="mt-1 text-xs text-slate-500">{{ user.context.name }} · 仅本人使用</div>
            </button>
          </div>

          <div class="mt-4">
            <div class="text-sm font-semibold text-slate-800">选择交付方式</div>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                v-for="item in offers"
                :key="item.id"
                :data-testid="`dataset-offer-${item.serviceMode}`"
                class="rounded-xl border p-4 text-left"
                :class="selectedOfferId === item.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
                @click="chooseOffer(item.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="text-sm font-medium text-slate-800">{{ item.name }} <span v-if="item.recommended" class="text-xs text-brand-600">推荐</span></div>
                  <div class="font-semibold text-brand-600">¥{{ item.price.toLocaleString() }}</div>
                </div>
                <div class="mt-1 text-xs leading-relaxed text-slate-500">{{ offerDescription(datasetOfferToCommerce(item)) }}</div>
              </button>
            </div>
          </div>

          <div v-if="offer" class="mt-4 rounded-lg border border-slate-100 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-slate-800">{{ offer.name }}</div>
                <div class="mt-1 text-xs text-slate-500">
                  {{ offer.accessScope === 'named_seats' ? `${offer.seats} 个指定成员席位` : offer.accessScope === 'enterprise_wide' ? '企业全员' : '仅本人' }}
                </div>
              </div>
              <div class="text-xl font-semibold text-brand-600">¥{{ amount.toLocaleString() }}</div>
            </div>
            <label v-if="termOptions.length" class="mt-3 block text-xs text-slate-500">
              购买有效期
              <select v-model.number="selectedTermMonths" data-testid="dataset-term-select" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <option v-for="months in termOptions" :key="months" :value="months">{{ months }} 个月</option>
              </select>
              <span class="mt-1 block text-[11px] text-slate-400">到期后停止更新，已交付的最近版本仍可使用；最长 {{ offer.maxTermMonths || offer.termMonths }} 个月。</span>
            </label>
          </div>

          <div class="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">{{ policyNote }}</div>
          <div v-if="error" data-testid="dataset-checkout-error" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ error }}</div>
          <button v-if="subject === 'enterprise' && !enterpriseEligible" class="mt-4 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white" @click="goEnterpriseAuth">先完成企业认证</button>
          <button v-else data-testid="dataset-create-order" class="mt-4 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white disabled:opacity-50" :disabled="!offer || submitting" @click="submit">
            {{ subject === 'enterprise' && user.currentEnterpriseMember?.role !== 'admin' && user.enterprise.purchasePolicy.memberPurchaseApprovalRequired ? '提交企业续订审批' : isRenewal ? '创建续订订单并去支付' : '创建订单并去支付' }}
          </button>
        </div>

        <div v-else data-testid="dataset-approval-submitted" class="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div class="text-3xl">🕘</div>
          <div class="mt-3 text-base font-medium text-amber-900">企业采购审批已提交</div>
          <p class="mt-1 text-sm text-amber-700">订单 {{ pendingOrderId }} 待管理员审批；审批通过后再选择企业付款方式。</p>
          <button class="mt-4 rounded-lg bg-amber-700 px-5 py-2.5 text-sm text-white" @click="goApprovalCenter">查看采购进度</button>
        </div>
      </div>

      <aside v-if="isPortal" class="h-fit rounded-xl border border-slate-200 bg-white p-5">
        <div class="text-sm font-semibold text-slate-800">边界说明</div>
        <ul class="mt-3 space-y-2 text-xs leading-relaxed text-slate-500">
          <li>• 购买主体决定订单、权益和后续发票主体</li>
          <li>• 企业订单禁止使用个人支付方式</li>
          <li>• 用数模块内部分析、报表及权限不在本次范围</li>
          <li>• 本页不适用于可信空间商品</li>
        </ul>
      </aside>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">数据集商品不存在</div>
</template>
