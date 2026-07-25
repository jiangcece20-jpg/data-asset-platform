<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Product } from '@/types/domain'
import InfoGrid, { type InfoItem } from './InfoGrid.vue'

const props = defineProps<{ product: Product; activeTab: 'basic' | 'docs' | 'sandbox' | 'sla' }>()

const detail = computed(() => props.product.typeDetail.api)

const basicItems = computed<InfoItem[]>(() => {
  const d = detail.value
  if (!d) return []
  return [
    { label: '请求方法', value: d.method },
    { label: '接口版本', value: d.version },
    { label: '认证方式', value: d.authentication },
    { label: '调用限制', value: d.rateLimit },
    { label: '路径示例', value: d.pathExample, full: true }
  ]
})

// 本地沙箱状态
const paramValues = reactive<Record<string, string>>({})
const sandboxResult = ref<Record<string, string | number | boolean> | null>(null)
const sandboxError = ref('')
const sandboxLoading = ref(false)

function sendSandbox() {
  sandboxError.value = ''
  sandboxResult.value = null
  if (!detail.value) return

  // 检查必填参数
  for (const param of detail.value.parameters) {
    if (param.required && !paramValues[param.name]?.trim()) {
      sandboxError.value = `请输入 ${param.name}`
      return
    }
  }

  // 直接返回固定脱敏结果，不调用真实服务
  sandboxResult.value = { ...detail.value.sandbox.fixedResponse }
}

function simulateFail() {
  sandboxError.value = '沙箱服务暂时繁忙，请重试'
  sandboxResult.value = null
}
</script>

<template>
  <div v-if="detail">
    <!-- 基本信息 -->
    <InfoGrid v-if="activeTab === 'basic'" :items="basicItems" />

    <!-- 接口文档 -->
    <div v-else-if="activeTab === 'docs'" class="space-y-4">
      <div>
        <div class="mb-1.5 text-[12px] font-medium text-slate-500">请求参数</div>
        <table class="w-full text-left text-[12px]">
          <thead class="bg-slate-50 text-slate-400">
            <tr>
              <th class="px-3 py-2 font-medium">参数名</th>
              <th class="px-3 py-2 font-medium">位置</th>
              <th class="px-3 py-2 font-medium">类型</th>
              <th class="px-3 py-2 font-medium">必填</th>
              <th class="px-3 py-2 font-medium">说明</th>
              <th class="px-3 py-2 font-medium">示例</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="param in detail.parameters" :key="param.name" class="border-t border-slate-100">
              <td class="px-3 py-2 font-mono text-slate-800">{{ param.name }}</td>
              <td class="px-3 py-2 text-slate-500">{{ param.location }}</td>
              <td class="px-3 py-2 text-slate-500">{{ param.dataType }}</td>
              <td class="px-3 py-2 text-center">{{ param.required ? '✓' : '' }}</td>
              <td class="px-3 py-2 text-slate-600">{{ param.description }}</td>
              <td class="px-3 py-2 font-mono text-slate-400">{{ param.example }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <div class="mb-1.5 text-[12px] font-medium text-slate-500">响应字段</div>
        <table class="w-full text-left text-[12px]">
          <thead class="bg-slate-50 text-slate-400">
            <tr>
              <th class="px-3 py-2 font-medium">字段名</th>
              <th class="px-3 py-2 font-medium">类型</th>
              <th class="px-3 py-2 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="field in detail.responseFields" :key="field.name" class="border-t border-slate-100">
              <td class="px-3 py-2 font-mono text-slate-800">{{ field.name }}</td>
              <td class="px-3 py-2 text-slate-500">{{ field.dataType }}</td>
              <td class="px-3 py-2 text-slate-600">{{ field.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 在线调试 -->
    <div v-else-if="activeTab === 'sandbox'" class="space-y-3">
      <div class="rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
        固定脱敏沙箱样例，不调用真实服务、不消耗正式额度
      </div>

      <div class="space-y-2">
        <div v-for="paramName in detail.sandbox.editableParameters" :key="paramName" class="flex items-center gap-2">
          <label class="w-32 shrink-0 text-[12px] font-mono text-slate-600">{{ paramName }}</label>
          <input
            :data-param="paramName"
            v-model="paramValues[paramName]"
            class="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px]"
            :placeholder="`输入 ${paramName}`"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          data-testid="sandbox-send"
          class="rounded-full bg-brand-500 px-4 py-2 text-[13px] font-medium text-white"
          :disabled="sandboxLoading"
          @click="sendSandbox"
        >
          {{ sandboxLoading ? '发送中...' : '发送请求' }}
        </button>
        <button
          data-testid="sandbox-fail"
          class="rounded-full border border-slate-300 px-4 py-2 text-[13px] text-slate-500"
          @click="simulateFail"
        >
          模拟失败
        </button>
      </div>

      <div v-if="sandboxError" class="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
        {{ sandboxError }}
      </div>

      <div v-if="sandboxResult" class="rounded-lg bg-slate-50 p-3 font-mono text-[12px] text-slate-700">
        <div v-for="(value, key) in sandboxResult" :key="key">
          <span class="text-slate-400">{{ key }}:</span> {{ value }}
        </div>
        <div class="mt-1 text-[11px] text-slate-400">不调用真实服务</div>
      </div>
    </div>

    <!-- 错误码与 SLA -->
    <div v-else-if="activeTab === 'sla'" class="space-y-4 text-[13px] text-slate-700">
      <div>
        <div class="mb-1.5 text-[12px] font-medium text-slate-500">错误码</div>
        <table class="w-full text-left text-[12px]">
          <thead class="bg-slate-50 text-slate-400">
            <tr>
              <th class="px-3 py-2 font-medium">错误码</th>
              <th class="px-3 py-2 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="err in detail.errorCodes" :key="err.code" class="border-t border-slate-100">
              <td class="px-3 py-2 font-mono text-slate-800">{{ err.code }}</td>
              <td class="px-3 py-2 text-slate-600">{{ err.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="space-y-1">
        <div><span class="text-slate-400">SLA：</span>{{ detail.sla }}</div>
        <div><span class="text-slate-400">限流：</span>{{ detail.rateLimit }}</div>
        <div><span class="text-slate-400">计费：</span>{{ detail.billing }}</div>
      </div>
    </div>
  </div>
  <div v-else class="py-8 text-center text-[13px] text-slate-400">资料准备中</div>
</template>
