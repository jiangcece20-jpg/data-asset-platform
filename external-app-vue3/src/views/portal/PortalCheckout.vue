<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { typeMeta } from '@/utils/productMeta'
import { commerceOffersOf, salePeriodMonthsOf } from '@/domain/commerceOffers'

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
const enterpriseEligible = computed(() =>
  user.isEnterpriseAuthenticated
  && Boolean(user.context.currentEnterpriseId)
  && Boolean(user.currentEnterpriseMember)
)
const subject = ref<'personal' | 'enterprise'>(enterpriseEligible.value ? 'enterprise' : 'personal')
const enterpriseMode = ref<'online' | 'contract'>('online')
const confirmationSubject = ref<'personal' | 'enterprise' | null>(null)
const offer = computed(() => product.value ? commerceOffersOf(product.value).find((item) => item.subject === subject.value) : undefined)
const purchasePeriodMonths = computed(() => product.value ? salePeriodMonthsOf(product.value) : 12)
const amount = computed(() => offer.value?.price ?? 0)
const subjectName = computed(() => subject.value === 'enterprise' ? user.enterprise.name : user.context.name)
const subjectLabel = computed(() => subject.value === 'enterprise' ? '企业' : '个人')

function selectSubject(next: 'personal' | 'enterprise') {
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
    orders.purchaseCommerceProductForSubject(id.value, subject.value, offer.value.id, purchasePeriodMonths.value, enterpriseMode.value, intent?.id)
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
              <button class="rounded-lg border p-3 text-left text-sm disabled:opacity-50" :class="subject === 'personal' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" :disabled="submitting" @click="selectSubject('personal')">个人购买<div class="mt-1 text-xs text-slate-400">{{ user.context.name }} · 仅本人使用</div></button>
              <button class="rounded-lg border p-3 text-left text-sm disabled:opacity-50" :class="subject === 'enterprise' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" :disabled="!enterpriseEligible || submitting" @click="selectSubject('enterprise')">企业购买<div class="mt-1 text-xs text-slate-400">{{ enterpriseEligible ? user.enterprise.name : '认证后可选' }}</div></button>
            </div>
          </div>

            <div v-if="offer" class="rounded-lg border border-brand-100 bg-brand-50/50 p-3" data-testid="fixed-item-price">
              <div class="flex justify-between gap-2 text-sm"><span>{{ offer.name }}</span><strong class="text-brand-600">¥{{ offer.price.toLocaleString() }}</strong></div>
              <div class="mt-1 text-xs text-slate-400">按当前购买主体展示，不与另一主体价格混用。</div>
            </div>

            <div>
              <div class="mb-2 text-sm font-medium text-slate-700">购买信息</div>
              <div class="space-y-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3" data-testid="fixed-purchase-period">
                  <label class="mb-1 block text-xs text-slate-400">购买周期</label>
                  <div class="text-sm text-slate-700">{{ purchasePeriodMonths }} 个月（商品固定）</div>
                  <div class="mt-1 text-xs text-slate-400">创建订单后锁定，不支持选择周期或数据截止日期。</div>
                </div>
                <div v-if="subject === 'enterprise'" class="grid grid-cols-2 gap-2">
                  <button class="rounded-lg border p-2 text-sm disabled:opacity-50" :class="enterpriseMode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" :disabled="submitting" @click="enterpriseMode = 'online'; orders.invalidateEnterpriseReportCheckoutIntents(id); confirmationSubject = null">在线支付</button>
                  <button class="rounded-lg border p-2 text-sm disabled:opacity-50" :class="enterpriseMode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'" :disabled="submitting" @click="enterpriseMode = 'contract'; orders.invalidateEnterpriseReportCheckoutIntents(id); confirmationSubject = null">合同采购</button>
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

            <!-- 购买主体确认信息 -->
            <div class="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              购买主体：{{ subjectName }}
            </div>

            <!-- 二次确认步骤 -->
            <button
              v-if="confirmationSubject !== subject"
              class="mt-4 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              :disabled="submitting || !offer"
              @click="requestConfirmation"
            >
              确认以{{ subjectLabel }}名义{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
            </button>
            <div v-else class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div class="text-sm text-amber-800">请再次确认：本订单将归属 {{ subjectName }}</div>
              <div class="mt-1 text-sm text-amber-800">应付金额：¥{{ amount.toLocaleString() }}</div>
              <div class="mt-1 text-sm text-amber-800">购买周期：{{ purchasePeriodMonths }} 个月</div>
              <button
                class="mt-3 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                :disabled="submitting"
                @click="confirmPurchase"
              >
                确认使用{{ subjectName }}{{ subject === 'enterprise' && enterpriseMode === 'contract' ? '提交合同采购' : '购买' }}
              </button>
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
            <div class="flex justify-between">
              <span class="text-slate-400">购买周期</span>
              <span class="text-slate-700">{{ purchasePeriodMonths }} 个月</span>
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
