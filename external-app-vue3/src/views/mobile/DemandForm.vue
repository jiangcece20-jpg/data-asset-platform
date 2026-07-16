<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useDemandStore } from '@/stores/demand'
import { useCatalogStore } from '@/stores/catalog'

const route = useRoute()
const router = useRouter()
const demand = useDemandStore()
const catalog = useCatalogStore()

const question = ref(String(route.query.q || ''))
const productId = computed(() => route.query.productId as string | undefined)
const contextProduct = computed(() => (productId.value ? catalog.byId(productId.value) : undefined))

const form = ref({
  objectDesc: contextProduct.value ? `参考商品：${contextProduct.value.name}` : '',
  region: '',
  timeRange: '',
  updateFreq: '',
  scenario: '',
  expectedDelivery: ''
})

const submitted = ref(false)
const leadId = ref('')

function submit() {
  const lead = demand.submit({
    question: question.value,
    filters: [route.query.type as string, route.query.channel as string].filter(Boolean) as string[],
    browsedProductIds: productId.value ? [productId.value] : [],
    ...form.value
  })
  leadId.value = lead.id
  submitted.value = true
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="需求提交" />

    <div class="px-4 pt-3">
      <div v-if="!submitted" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[13px] font-medium text-slate-700">已为你预填问题与筛选条件</div>
        <div class="mt-2 space-y-3 text-[13px]">
          <div>
            <div class="mb-1 text-[11px] text-slate-400">你的问题 / 需求描述</div>
            <textarea v-model="question" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">数据对象</div>
            <input v-model="form.objectDesc" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="mb-1 text-[11px] text-slate-400">地域</div>
              <input v-model="form.region" placeholder="如：全国 / 华东" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
            </div>
            <div>
              <div class="mb-1 text-[11px] text-slate-400">时间范围</div>
              <input v-model="form.timeRange" placeholder="如：近 12 个月" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
            </div>
            <div>
              <div class="mb-1 text-[11px] text-slate-400">更新频率</div>
              <input v-model="form.updateFreq" placeholder="如：月度" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
            </div>
            <div>
              <div class="mb-1 text-[11px] text-slate-400">使用场景</div>
              <input v-model="form.scenario" placeholder="如：风险评估" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
            </div>
          </div>
          <div>
            <div class="mb-1 text-[11px] text-slate-400">期望交付方式</div>
            <input v-model="form.expectedDelivery" placeholder="如：API / 数据集文件 / 报告" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none" />
          </div>
        </div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="submit">提交需求</button>
      </div>

      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">📮</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">需求已提交</div>
        <div class="mt-1 text-[12px] leading-relaxed text-emerald-600">运营会处理为推荐现有商品、需要定制或暂不支持，并通过 APP 消息反馈</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="router.push('/app/mine')">
          在"我的-试用与需求"查看进度
        </button>
      </div>
    </div>
  </div>
</template>
