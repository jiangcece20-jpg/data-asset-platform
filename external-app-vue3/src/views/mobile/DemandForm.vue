<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import {
  isValidDemandPriceRange,
  resolveDemandSubmitterSnapshot,
  sanitizeDemandPriceRangeInput
} from '@/domain/demandSubmitFields'
import { useDemandStore } from '@/stores/demand'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const demand = useDemandStore()
const user = useUserStore()

const submitted = ref(false)
const snapshot = resolveDemandSubmitterSnapshot(user.context)

const form = ref({
  title: String(route.query.q || ''),
  description: String(route.query.desc || ''),
  priceRange: '',
  contactName: snapshot.defaultContactName,
  contact: user.context.phone || ''
})
const canSubmit = computed(
  () => form.value.title.trim().length > 0 && isValidDemandPriceRange(form.value.priceRange)
)

function setPriceRange(raw: string) {
  form.value.priceRange = sanitizeDemandPriceRangeInput(raw)
}

function onPriceRangeInput(event: Event) {
  setPriceRange((event.target as HTMLInputElement).value)
}

function submit() {
  if (!canSubmit.value) return
  demand.submit({
    question: form.value.title,
    filters: [],
    browsedProductIds: [],
    objectDesc: form.value.title,
    region: '',
    timeRange: '',
    updateFreq: '',
    scenario: form.value.description,
    expectedDelivery: '',
    priceRange: form.value.priceRange,
    contactName: form.value.contactName,
    contact: form.value.contact
  })
  submitted.value = true
}

function goMineDemands() {
  router.push({ path: '/app/mine', query: { menu: 'demands' } })
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="需求提报" />

    <div class="px-4 pt-3">
      <div v-if="!submitted" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-700">📝 数据需求提报</div>
        <div class="mt-1 text-[11px] text-slate-400">描述您需要的数据内容，运营会为您跟进推荐或定制</div>

        <div class="mt-4 space-y-3 text-[13px]">
          <div>
            <div class="mb-1 text-[11px] text-slate-400">需求标题 <span class="text-red-500">*</span></div>
            <input
              v-model="form.title"
              data-testid="demand-title"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="一句话概括您的需求"
            />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">需求描述</div>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="请详细描述您需要的数据内容、格式、用途..."
            />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">联系人</div>
            <input
              v-model="form.contactName"
              data-testid="demand-contact-name"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="默认使用登录姓名，可修改"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="mb-1 text-[11px] text-slate-400">期望价格区间（元）</div>
              <input
                :value="form.priceRange"
                data-testid="demand-price-range"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
                placeholder="如：0-5000"
                @input="onPriceRangeInput"
              />
            </div>
            <div>
              <div class="mb-1 text-[11px] text-slate-400">联系方式</div>
              <input v-model="form.contact" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" placeholder="手机号或邮箱" />
            </div>
          </div>
        </div>
        <button
          class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white disabled:opacity-50"
          data-testid="demand-submit"
          :disabled="!canSubmit"
          @click="submit"
        >
          提交需求
        </button>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">📮</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">需求已提交</div>
        <div class="mt-1 text-[12px] leading-relaxed text-emerald-600">运营会处理为推荐现有商品、需要定制或暂不支持，并通过消息反馈</div>
        <button
          class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white"
          data-testid="go-mine-demands"
          @click="goMineDemands"
        >
          在「我的 · 我的提报」查看进度
        </button>
      </div>
    </div>
  </div>
</template>
