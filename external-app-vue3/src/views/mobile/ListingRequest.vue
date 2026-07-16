<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useListingRequestStore } from '@/stores/listingRequests'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const listingRequests = useListingRequestStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))

const existing = computed(() =>
  product.value ? listingRequests.byProduct(product.value.id, user.context.currentMemberId) : undefined
)

const submitted = ref(false)
const form = ref({
  scenario: '',
  requestedScope: '',
  timeRange: '',
  updateFrequency: '',
  expectedAvailableAt: '',
  note: ''
})

function handleSubmit() {
  if (!product.value || !user.context.loggedIn) return
  listingRequests.submit({
    productId: product.value.id,
    productName: product.value.name,
    userId: user.context.currentMemberId,
    scenario: form.value.scenario,
    requestedScope: form.value.requestedScope,
    timeRange: form.value.timeRange,
    updateFrequency: form.value.updateFrequency,
    expectedAvailableAt: form.value.expectedAvailableAt,
    note: form.value.note
  })
  submitted.value = true
}
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="求上架" />

    <div class="px-4 pt-3">
      <!-- 已有进行中请求 -->
      <div v-if="existing && existing.status !== 'unsupported'" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-900">{{ product.name }}</div>
          <StatusBadge dict="listingRequest" :value="existing.status" />
        </div>
        <div class="mt-2 space-y-1 text-[12px] text-slate-500">
          <div>记录编号：{{ existing.id }}</div>
          <div>使用场景：{{ existing.scenario }}</div>
          <div>所需范围：{{ existing.requestedScope }}</div>
          <div>希望可购买时间：{{ existing.expectedAvailableAt }}</div>
          <div v-if="existing.feedbackMessage" class="mt-2 rounded-lg bg-slate-50 px-2 py-1 text-slate-600">{{ existing.feedbackMessage }}</div>
        </div>
        <button class="mt-3 w-full rounded-full bg-slate-100 py-2.5 text-[13px] text-slate-600" @click="router.push('/app/mine')">
          在我的—求上架查看进度
        </button>
      </div>

      <!-- 未登录 -->
      <div v-else-if="!user.context.loggedIn" class="rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-card">
        <div class="text-[13px] text-slate-500">请先登录后提交</div>
      </div>

      <!-- 提交成功 -->
      <div v-else-if="submitted" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">✅</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">已提交求上架请求</div>
        <div class="mt-1 text-[12px] text-emerald-600">我们将在评估后尽快反馈</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="router.push('/app/mine')">
          在我的—求上架查看进度
        </button>
      </div>

      <!-- 表单 -->
      <div v-else class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-slate-400">{{ product.subtitle }}</div>

        <div class="mt-4 space-y-3">
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">使用场景 *</label>
            <input v-model="form.scenario" placeholder="如：司机准入风控" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">所需范围 *</label>
            <input v-model="form.requestedScope" placeholder="如：安全驾驶评分与违规次数" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">时间跨度 *</label>
            <input v-model="form.timeRange" placeholder="如：近 12 个月" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">更新频率 *</label>
            <input v-model="form.updateFrequency" placeholder="如：每月" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">希望可购买时间 *</label>
            <input v-model="form.expectedAvailableAt" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">补充说明</label>
            <textarea v-model="form.note" rows="2" placeholder="其他需求补充" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]"></textarea>
          </div>
        </div>

        <button
          class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white disabled:opacity-50"
          :disabled="!form.scenario || !form.requestedScope || !form.timeRange || !form.updateFrequency || !form.expectedAvailableAt"
          @click="handleSubmit"
        >
          提交求上架
        </button>
      </div>
    </div>
  </div>
  <div v-else class="p-6 text-center text-sm text-slate-400">商品不存在</div>
</template>
