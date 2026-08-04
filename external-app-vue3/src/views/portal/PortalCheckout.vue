<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { typeMeta } from '@/utils/productMeta'
import { commerceOffersOf, normalizeOfferTerm, offerAmount, offerDescription, offerTermOptions } from '@/domain/commerceOffers'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const paid = ref(false)
const submitting = ref(false)
const purpose = ref('')
const subject = ref<'personal' | 'enterprise'>('personal')
const enterpriseMode = ref<'online' | 'contract'>('online')
const enterpriseEligible = computed(() => user.isEnterpriseAuthenticated && Boolean(user.context.currentEnterpriseId) && Boolean(user.currentEnterpriseMember))
const offers = computed(() => product.value ? commerceOffersOf(product.value).filter((item) => item.subject === subject.value) : [])
const selectedOfferId = ref('')
const offer = computed(() => offers.value.find((item) => item.id === selectedOfferId.value))
const selectedTermMonths = ref<number | undefined>()
const termOptions = computed(() => offer.value ? offerTermOptions(offer.value) : [])
const amount = computed(() => offer.value ? offerAmount(offer.value, selectedTermMonths.value) : 0)

function chooseOffer(offerId: string) {
  selectedOfferId.value = offerId
  const next = offers.value.find((item) => item.id === offerId)
  selectedTermMonths.value = next ? offerTermOptions(next)[0] : undefined
}

watch([product, subject], () => {
  const preferred = offers.value.find((item) => item.recommended) || offers.value[0]
  if (!preferred || offers.value.some((item) => item.id === selectedOfferId.value)) return
  chooseOffer(preferred.id)
}, { immediate: true })

function confirmPurchase() {
  if (submitting.value || paid.value || !product.value || !offer.value) return
  submitting.value = true
  try {
    const intent = subject.value === 'enterprise'
      ? orders.createEnterpriseReportCheckoutIntent(id.value, enterpriseMode.value, {
          offerId: offer.value.id,
          selectedTermMonths: normalizeOfferTerm(offer.value, selectedTermMonths.value),
          amount: amount.value,
          serviceMode: offer.value.serviceMode
        })
      : undefined
    orders.purchaseCommerceProductForSubject(id.value, subject.value, offer.value.id, selectedTermMonths.value, enterpriseMode.value, intent?.id)
    paid.value = true
  } catch {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="product" class="mx-auto max-w-4xl">
    <div class="grid grid-cols-3 gap-6">
      <!-- 左栏：订单信息 -->
      <div class="col-span-2 space-y-4">
        <div v-if="!paid" class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-lg font-semibold text-slate-800">购买结算</h2>
          <div class="mt-4 space-y-3">
            <div class="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <span class="rounded bg-brand-50 px-2 py-1 text-xs text-brand-600">{{ typeMeta[product.type].label }}</span>
              <div class="flex-1">
                <div class="text-sm font-medium text-slate-800">{{ product.name }}</div>
                <div class="text-xs text-slate-400">{{ product.subtitle }}</div>
              </div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-700">购买主体</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="rounded-lg border p-3 text-left text-sm" :class="subject === 'personal' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="subject = 'personal'">个人购买<div class="mt-1 text-xs text-slate-400">{{ user.context.name }} · 仅本人使用</div></button>
                <button class="rounded-lg border p-3 text-left text-sm disabled:opacity-50" :class="subject === 'enterprise' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" :disabled="!enterpriseEligible" @click="subject = 'enterprise'">企业购买<div class="mt-1 text-xs text-slate-400">{{ enterpriseEligible ? user.enterprise.name : '认证后可选' }}</div></button>
              </div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-700">交付与更新方式</div>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="item in offers" :key="item.id" class="rounded-lg border p-3 text-left" :class="selectedOfferId === item.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="chooseOffer(item.id)">
                  <div class="flex justify-between gap-2 text-sm"><span>{{ item.name }}</span><strong class="text-brand-600">¥{{ item.price.toLocaleString() }}</strong></div>
                  <div class="mt-1 text-xs text-slate-400">{{ offerDescription(item) }}</div>
                </button>
              </div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-700">购买信息</div>
              <div class="space-y-3">
                <div v-if="termOptions.length">
                  <label class="mb-1 block text-xs text-slate-400">购买周期</label>
                  <select v-model.number="selectedTermMonths" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option v-for="months in termOptions" :key="months" :value="months">{{ months }} 个月</option></select>
                  <div class="mt-1 text-xs text-slate-400">最长可购买 {{ offer?.maxTermMonths }} 个月，不提供永久持续更新</div>
                </div>
                <div v-if="subject === 'enterprise'" class="grid grid-cols-2 gap-2">
                  <button class="rounded-lg border p-2 text-sm" :class="enterpriseMode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="enterpriseMode = 'online'">在线支付</button>
                  <button class="rounded-lg border p-2 text-sm" :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" @click="enterpriseMode = 'contract'">合同采购</button>
                </div>
                <div>
                  <label class="mb-1 block text-xs text-slate-400">使用用途</label>
                  <input
                    v-model="purpose"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="请描述使用用途（可选）"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div class="text-4xl">🎉</div>
          <div class="mt-3 text-lg font-medium text-emerald-700">支付成功</div>
          <div class="mt-1 text-sm text-emerald-600">{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '企业合同订单已提交' : '已解锁本商品' }}</div>
          <button class="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm text-white" @click="router.push('/portal/mine')">
            查看我的购买 →
          </button>
        </div>
      </div>

      <!-- 右栏：订单摘要 -->
      <div class="col-span-1">
        <div class="sticky top-20 rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">订单摘要</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">商品名称</span>
              <span class="text-slate-700">{{ product.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">类型</span>
              <span class="text-slate-700">{{ typeMeta[product.type].label }}</span>
            </div>
            <div class="border-t border-slate-100 pt-2">
              <div class="flex justify-between">
                <span class="text-slate-400">原价</span>
                <span class="text-slate-700">¥{{ amount.toLocaleString() }}</span>
              </div>
              <div class="mt-1 flex justify-between">
                <span class="text-slate-400">实付</span>
                <span class="text-lg font-bold text-brand-600">¥{{ amount.toLocaleString() }}</span>
              </div>
            </div>
          </div>
          <button
            v-if="!paid"
            class="mt-4 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="submitting"
            @click="confirmPurchase"
          >确认购买</button>
          <button
            v-if="!paid"
            class="mt-2 w-full rounded-lg border border-slate-200 py-2.5 text-sm text-slate-600"
            @click="router.back()"
          >取消</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">商品不存在</div>
</template>
