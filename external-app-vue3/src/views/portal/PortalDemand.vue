<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDemandStore } from '@/stores/demand'
import { useUserStore } from '@/stores/user'
import type { DemandLead } from '@/types/domain'
import StatusBadge from '@/components/StatusBadge.vue'

const router = useRouter()
const demand = useDemandStore()
const user = useUserStore()

type Tab = 'list' | 'form'

const activeTab = ref<Tab>('list')
const submitted = ref(false)

const form = ref({
  title: '',
  type: 'dataset' as 'dataset' | 'api' | 'report' | 'dashboard',
  description: '',
  priceRange: '',
  contact: ''
})

// 当前用户的需求列表
const myDemands = computed(() => {
  const currentMemberId = user.context.currentMemberId
  return demand.list
    .filter((d) => d.ownerId === currentMemberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const demandStatusMap: Record<string, string> = {
  new: '待处理',
  aggregated: '已聚合',
  matched: '已匹配',
  closed: '已关闭',
  withdrawn: '已撤回',
  reopened: '已重开'
}

function submitDemand() {
  if (!form.value.title.trim()) return
  demand.submit({
    question: form.value.title,
    filters: [form.value.type],
    browsedProductIds: [],
    objectDesc: form.value.title,
    region: '',
    timeRange: '',
    updateFreq: '',
    scenario: form.value.description,
    expectedDelivery: form.value.type
  })
  submitted.value = true
  activeTab.value = 'list'
}

function resetForm() {
  form.value = {
    title: '',
    type: 'dataset',
    description: '',
    priceRange: '',
    contact: ''
  }
  submitted.value = false
}

function formatDate(dateStr: string) {
  return dateStr.replace('T', ' ').slice(0, 16)
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- 标签切换 -->
    <div class="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
      <button
        class="flex-1 rounded-lg py-2.5 text-sm font-medium transition"
        :class="activeTab === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="activeTab = 'list'"
      >
        📋 我的需求
      </button>
      <button
        class="flex-1 rounded-lg py-2.5 text-sm font-medium transition"
        :class="activeTab === 'form' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="activeTab = 'form'; resetForm()"
      >
        ➕ 提报需求
      </button>
    </div>

    <!-- 需求列表 -->
    <div v-if="activeTab === 'list'" class="space-y-4">
      <div v-if="myDemands.length === 0" class="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div class="text-4xl">📭</div>
        <div class="mt-3 text-sm text-slate-400">暂无已提交的需求</div>
        <button
          class="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white"
          @click="activeTab = 'form'"
        >
          立即提报
        </button>
      </div>

      <div
        v-for="item in myDemands"
        :key="item.id"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-slate-900">{{ item.question }}</span>
              <StatusBadge dict="demandStatus" :value="item.status" />
            </div>
            <div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span v-if="item.filters?.length">{{ item.filters.join('、') }}</span>
              <span v-if="item.region">{{ item.region }}</span>
              <span v-if="item.timeRange">{{ item.timeRange }}</span>
              <span>{{ formatDate(item.createdAt) }}</span>
            </div>
            <div v-if="item.feedbackMessage" class="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
              💬 {{ item.feedbackMessage }}
            </div>
            <div v-if="item.recommendedProductIds?.length" class="mt-2 flex items-center gap-2">
              <span class="text-xs text-slate-400">推荐商品：</span>
              <button
                v-for="pid in item.recommendedProductIds"
                :key="pid"
                class="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs text-brand-600"
                @click="router.push(`/portal/product/${pid}`)"
              >
                查看
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 需求提报表单 -->
    <div v-else class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-slate-800">📝 数据需求提报</h2>
      <p class="mt-1 text-sm text-slate-400">描述您需要的数据内容，运营会为您跟进推荐或定制</p>

      <div class="mt-6 space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">需求标题 <span class="text-red-500">*</span></label>
          <input
            v-model="form.title"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="一句话概括您的需求"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">需求类型</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="t in [
                { value: 'dataset', label: '数据集' },
                { value: 'api', label: 'API' },
                { value: 'report', label: '报告' },
                { value: 'dashboard', label: '看板' }
              ]"
              :key="t.value"
              class="rounded-lg border px-4 py-2 text-sm"
              :class="form.type === t.value ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600'"
              @click="form.type = t.value as any"
            >{{ t.label }}</button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">需求描述</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="请详细描述您需要的数据内容、格式、用途..."
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">期望价格区间（元）</label>
            <input
              v-model="form.priceRange"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="如：0-500"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">联系方式</label>
            <input
              v-model="form.contact"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              placeholder="手机号或邮箱"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button class="rounded-lg border border-slate-200 px-6 py-2.5 text-sm text-slate-600" @click="activeTab = 'list'">取消</button>
          <button
            class="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            :disabled="!form.title.trim()"
            @click="submitDemand"
          >提交需求</button>
        </div>
      </div>
    </div>
  </div>
</template>
