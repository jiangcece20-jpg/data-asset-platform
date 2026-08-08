<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { Product } from '@/types/domain'
import ProductInfoSections from '@/components/shared/ProductInfoSections.vue'

export interface InfoItem {
  label: string
  value?: string | number | null
  full?: boolean
}

const props = defineProps<{
  product: Product
  activeTab: string
}>()

const detail = computed(() => props.product.typeDetail.api)

const hasResponseExamples = computed(() =>
  (detail.value?.responseFields ?? []).some((f) => f.example != null)
)

// ---- Copy JSON example ----
const copiedKey = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copyExample(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedKey.value = ''
    }, 2000)
  } catch {
    // 剪贴板不可用时静默失败
  }
}

// ---- Sandbox state ----
const paramValues = reactive<Record<string, string>>({})
const sandboxResult = ref<Record<string, string | number | boolean> | null>(null)
const sandboxError = ref('')
const sandboxLoading = ref(false)

function sendSandbox() {
  sandboxError.value = ''
  sandboxResult.value = null
  if (!detail.value) return
  for (const param of detail.value.parameters) {
    if (param.required && !paramValues[param.name]?.trim()) {
      sandboxError.value = `请输入 ${param.name}`
      return
    }
  }
  sandboxResult.value = { ...detail.value.sandbox.fixedResponse }
}

function simulateFail() {
  sandboxError.value = '沙箱服务暂时繁忙，请重试'
  sandboxResult.value = null
}
</script>

<template>
  <div v-if="detail">
    <!-- =================== Tab 1: basic =================== -->
    <div v-if="activeTab === 'basic'" class="space-y-4">
      <!-- 资源信息 + 合规与授权 + 提供方 -->
      <ProductInfoSections :product="product" />

      <!-- 商品说明书 -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">商品说明书</h3>
        <div class="space-y-2 text-sm leading-relaxed text-slate-600">
          <div><span class="text-slate-400">价值主张：</span>{{ product.valueProposition }}</div>
          <div><span class="text-slate-400">详细描述：</span>{{ product.description }}</div>
          <div><span class="text-slate-400">质量承诺：</span>{{ product.qualityPromise }}</div>
          <div><span class="text-slate-400">合规声明：</span>{{ product.complianceNote }}</div>
        </div>
      </div>

      <!-- 产品介绍（空间同步富文本） -->
      <div v-if="product.spaceMeta?.productIntroduction" class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="mb-2 flex items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-800">产品介绍</h3>
          <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
        </div>
        <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600">{{ product.spaceMeta.productIntroduction }}</p>
      </div>
    </div>

    <!-- =================== Tab 2: docs =================== -->
    <div v-if="activeTab === 'docs'" class="space-y-4">
      <!-- 接口描述（空间同步富文本） -->
      <div v-if="product.spaceMeta?.apiDescription" class="rounded-xl border border-slate-200 bg-white p-5">
        <div class="mb-2 flex items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-800">接口描述</h3>
          <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">来自可信空间</span>
        </div>
        <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600">{{ product.spaceMeta.apiDescription }}</p>
      </div>

      <!-- 接口基础信息 -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">接口基础信息</h3>
        <div class="grid grid-cols-3 gap-px bg-slate-100">
          <div class="bg-white px-4 py-3">
            <div class="text-xs text-slate-400">请求方式</div>
            <div class="mt-1 text-sm font-mono text-slate-800">{{ detail.method }}</div>
          </div>
          <div class="bg-white px-4 py-3">
            <div class="text-xs text-slate-400">版本号</div>
            <div class="mt-1 text-sm text-slate-800">{{ detail.version }}</div>
          </div>
          <div class="bg-white px-4 py-3">
            <div class="text-xs text-slate-400">认证方式</div>
            <div class="mt-1 text-sm text-slate-800">{{ detail.authentication }}</div>
          </div>
          <div class="bg-white px-4 py-3">
            <div class="text-xs text-slate-400">限流策略</div>
            <div class="mt-1 text-sm text-slate-800">{{ detail.rateLimit }}</div>
          </div>
          <div class="bg-white px-4 py-3 col-span-2">
            <div class="text-xs text-slate-400">路径示例</div>
            <div class="mt-1 break-all font-mono text-sm text-slate-800">{{ detail.pathExample }}</div>
          </div>
        </div>
      </div>

      <!-- 请求参数（全宽） -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">请求参数</h3>
        <table class="w-full table-fixed text-left text-sm">
          <thead>
            <tr class="bg-slate-50 text-xs text-slate-400">
              <th class="w-[16%] px-3 py-2 font-medium">参数名</th>
              <th class="w-[10%] px-3 py-2 font-medium">位置</th>
              <th class="w-[10%] px-3 py-2 font-medium">类型</th>
              <th class="w-[8%] px-3 py-2 text-center font-medium">必填</th>
              <th class="px-3 py-2 font-medium">说明</th>
              <th class="w-[18%] px-3 py-2 font-medium">示例</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="param in detail.parameters"
              :key="param.name"
              class="border-b border-slate-100"
            >
              <td class="break-all px-3 py-2 font-mono text-slate-800">{{ param.name }}</td>
              <td class="px-3 py-2 text-slate-600">{{ param.location }}</td>
              <td class="px-3 py-2 text-slate-600">{{ param.dataType }}</td>
              <td class="px-3 py-2 text-center text-slate-600">{{ param.required ? '✓' : '' }}</td>
              <td class="px-3 py-2 text-slate-600">{{ param.description }}</td>
              <td class="break-all px-3 py-2 font-mono text-xs text-slate-500">{{ param.example }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 响应字段（全宽） -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">响应字段</h3>
        <table class="w-full table-fixed text-left text-sm">
          <thead>
            <tr class="bg-slate-50 text-xs text-slate-400">
              <th class="w-[22%] px-3 py-2 font-medium">字段名</th>
              <th class="w-[14%] px-3 py-2 font-medium">类型</th>
              <th class="px-3 py-2 font-medium">说明</th>
              <th v-if="hasResponseExamples" class="w-[20%] px-3 py-2 font-medium">示例值</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="field in detail.responseFields"
              :key="field.name"
              class="border-b border-slate-100"
            >
              <td class="break-all px-3 py-2 font-mono text-slate-800">{{ field.name }}</td>
              <td class="px-3 py-2 text-slate-600">{{ field.dataType }}</td>
              <td class="px-3 py-2 text-slate-600">{{ field.description }}</td>
              <td v-if="hasResponseExamples" class="break-all px-3 py-2 font-mono text-xs text-slate-500">{{ field.example ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 请求/返回示例（并排） -->
      <div class="grid grid-cols-2 gap-4">
        <!-- 请求示例 -->
        <div v-if="detail.requestExample" class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800">请求示例</h3>
            <button
              class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
              @click="copyExample('request', detail.requestExample)"
            >{{ copiedKey === 'request' ? '已复制 ✓' : '复制' }}</button>
          </div>
          <pre class="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">{{ detail.requestExample }}</pre>
        </div>

        <!-- 返回示例 -->
        <div v-if="detail.responseExample" class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800">返回示例</h3>
            <button
              class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
              @click="copyExample('response', detail.responseExample)"
            >{{ copiedKey === 'response' ? '已复制 ✓' : '复制' }}</button>
          </div>
          <pre class="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">{{ detail.responseExample }}</pre>
        </div>
      </div>
    </div>

    <!-- =================== Tab 3: sandbox =================== -->
    <div v-if="activeTab === 'sandbox'" class="space-y-4">
      <!-- Warning banner -->
      <div class="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
        固定脱敏沙箱样例，不调用真实服务、不消耗正式额度
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Left: Parameter inputs -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">参数输入</h3>
          <div class="space-y-3">
            <div v-for="paramName in detail.sandbox.editableParameters" :key="paramName">
              <label class="block text-xs text-slate-400">{{ paramName }}</label>
              <input
                v-model="paramValues[paramName]"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                :placeholder="`请输入 ${paramName}`"
              />
            </div>
          </div>
          <div class="mt-4 flex gap-2">
            <button
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="sandboxLoading"
              @click="sendSandbox"
            >发送请求</button>
            <button
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              @click="simulateFail"
            >模拟失败</button>
          </div>
        </div>

        <!-- Right: Dark terminal result -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="mb-3 text-sm font-semibold text-slate-800">响应结果</h3>
          <div class="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 min-h-[200px]">
            <div v-if="sandboxError" class="text-red-400">
              {{ sandboxError }}
            </div>
            <div v-else-if="sandboxResult">
              <div v-for="(value, key) in sandboxResult" :key="key" class="leading-relaxed">
                <span class="text-slate-400">{{ key }}:</span>
                <span class="ml-1 text-emerald-300">{{ value }}</span>
              </div>
            </div>
            <div v-else class="text-slate-500">
              // 发送请求后结果将显示在这里
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =================== Tab 4: sla =================== -->
    <div v-if="activeTab === 'sla'" class="space-y-4">
      <!-- Error codes table -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">错误码</h3>
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 text-xs text-slate-400">
              <th class="px-3 py-2 font-medium">错误码</th>
              <th class="px-3 py-2 font-medium">说明</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="err in detail.errorCodes"
              :key="err.code"
              class="border-b border-slate-100"
            >
              <td class="px-3 py-2 font-mono text-slate-800">{{ err.code }}</td>
              <td class="px-3 py-2 text-slate-600">{{ err.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SLA info rows -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">SLA 信息</h3>
        <div class="space-y-2 text-sm">
          <div class="flex">
            <span class="w-24 shrink-0 text-slate-400">SLA：</span>
            <span class="text-slate-700">{{ detail.sla }}</span>
          </div>
          <div class="flex">
            <span class="w-24 shrink-0 text-slate-400">限流：</span>
            <span class="text-slate-700">{{ detail.rateLimit }}</span>
          </div>
          <div class="flex">
            <span class="w-24 shrink-0 text-slate-400">计费：</span>
            <span class="text-slate-700">{{ detail.billing }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
