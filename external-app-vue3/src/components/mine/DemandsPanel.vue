<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import { useDemandStore } from '@/stores/demand'
import { useUserStore } from '@/stores/user'

defineProps<{ variant: 'mobile' | 'portal' }>()

const router = useRouter()
const demand = useDemandStore()
const user = useUserStore()

type Tab = 'list' | 'form'
const activeTab = ref<Tab>('list')

const form = ref({
  title: '',
  description: '',
  priceRange: '',
  contact: user.context.phone || ''
})

const myDemands = computed(() =>
  demand.list
    .filter((item) => item.ownerId === user.context.currentMemberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}

function submitDemand() {
  if (!form.value.title.trim()) return
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
    contact: form.value.contact
  })
  form.value = { title: '', description: '', priceRange: '', contact: user.context.phone || '' }
  activeTab.value = 'list'
}

function openSubmit() {
  activeTab.value = 'form'
}

function goProduct(productId: string) {
  router.push(`/app/product/${productId}`)
}
</script>

<template>
  <div>
    <div class="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button
        data-testid="demands-tab-list"
        class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
        :class="activeTab === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="activeTab = 'list'"
      >
        我的提报
      </button>
      <button
        data-testid="demands-tab-form"
        class="flex-1 rounded-lg py-2 text-[13px] font-medium transition"
        :class="activeTab === 'form' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="activeTab = 'form'"
      >
        提报需求
      </button>
    </div>

    <div v-if="activeTab === 'list'" class="space-y-2.5">
      <div v-if="!myDemands.length" class="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
        <div class="text-3xl">📭</div>
        <div class="mt-2 text-[13px] text-slate-500">暂无提报记录</div>
        <div class="mt-1 text-[12px] text-slate-400">找数无结果时可提报需求，运营会跟进推荐或定制</div>
        <button
          class="mt-4 rounded-full bg-brand-500 px-6 py-2 text-[13px] font-medium text-white"
          data-testid="demands-empty-submit"
          @click="openSubmit"
        >
          立即提报
        </button>
      </div>

      <div
        v-for="item in myDemands"
        :key="item.id"
        data-testid="demand-item"
        class="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-card"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-[13px] font-medium text-slate-800">{{ item.question }}</span>
          <StatusBadge dict="demand" :value="item.status" />
        </div>
        <div class="mt-1.5 space-y-0.5 text-[11px] text-slate-400">
          <div v-if="item.scenario">需求描述：{{ item.scenario }}</div>
          <div v-if="item.priceRange">期望价格区间：{{ item.priceRange }}</div>
          <div v-if="item.contact">联系方式：{{ item.contact }}</div>
          <div>{{ formatDate(item.createdAt) }}</div>
        </div>
        <div v-if="item.feedbackMessage" class="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
          💬 {{ item.feedbackMessage }}
        </div>
        <div v-if="item.recommendedProductIds?.length" class="mt-2 flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] text-slate-400">推荐商品：</span>
          <button
            v-for="pid in item.recommendedProductIds"
            :key="pid"
            class="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600"
            @click="goProduct(pid)"
          >
            查看
          </button>
        </div>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
      <div class="text-[13px] font-medium text-slate-700">📝 数据需求提报</div>
      <div class="mt-1 text-[11px] text-slate-400">描述您需要的数据内容，运营会为您跟进推荐或定制</div>

      <div class="mt-4 space-y-3">
        <div>
          <label class="mb-1 block text-[12px] font-medium text-slate-600">需求标题 <span class="text-red-500">*</span></label>
          <input
            v-model="form.title"
            data-testid="demand-title"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="一句话概括您的需求"
          />
        </div>
        <div>
          <label class="mb-1 block text-[12px] font-medium text-slate-600">需求描述</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-1 focus:ring-brand-400"
            placeholder="请详细描述您需要的数据内容、格式、用途..."
          />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">期望价格区间（元）</label>
            <input
              v-model="form.priceRange"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="如：0-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-medium text-slate-600">联系方式</label>
            <input
              v-model="form.contact"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none"
              placeholder="手机号或邮箱"
            />
          </div>
        </div>
        <button
          class="w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white disabled:opacity-50"
          data-testid="demand-submit"
          :disabled="!form.title.trim()"
          @click="submitDemand"
        >
          提交需求
        </button>
      </div>
    </div>
  </div>
</template>
