<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDemandStore } from '@/stores/demand'

const router = useRouter()
const demand = useDemandStore()

const form = ref({
  title: '',
  type: 'dataset' as 'dataset' | 'api' | 'report' | 'dashboard',
  description: '',
  priceRange: '',
  contact: ''
})

const submitted = ref(false)

function submit() {
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
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div v-if="!submitted" class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-slate-800">📝 数据需求提报</h2>
      <p class="mt-1 text-sm text-slate-400">描述您需要的数据内容，运营会为您跟进推荐或定制</p>

      <div class="mt-6 space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">需求标题</label>
          <input
            v-model="form.title"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="一句话概括您的需求"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">需求类型</label>
          <div class="flex gap-2">
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
          <button class="rounded-lg border border-slate-200 px-6 py-2.5 text-sm text-slate-600" @click="router.back()">取消</button>
          <button
            class="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            :disabled="!form.title.trim()"
            @click="submit"
          >提交需求</button>
        </div>
      </div>
    </div>

    <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <div class="text-4xl">📮</div>
      <div class="mt-3 text-lg font-medium text-emerald-700">需求已提交</div>
      <div class="mt-1 text-sm text-emerald-600">运营会处理为推荐现有商品、需要定制或暂不支持，并通过消息反馈</div>
      <button class="mt-4 rounded-lg bg-brand-500 px-6 py-2.5 text-sm text-white" @click="router.push('/portal/home')">
        返回首页
      </button>
    </div>
  </div>
</template>
