<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const billsStore = useApiUsageBillsStore()
const loading = ref(false)
const error = ref('')

const bills = computed(() => billsStore.visibleBills())
const totalCalls = computed(() => bills.value.reduce((sum, b) => sum + b.visibleCalls, 0))
const totalAmount = computed(() => bills.value.reduce((sum, b) => sum + (b.totalAmount || 0), 0))

async function loadBills() {
  if (!user.isEnterpriseAuthenticated || !user.context.currentEnterpriseId) return
  loading.value = true
  error.value = ''
  try {
    await billsStore.syncBills(user.context.currentEnterpriseId, undefined)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '同步失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { void loadBills() })
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-800">📈 API 用量账单</h2>
      <button
        class="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
        :disabled="loading"
        @click="loadBills"
      >{{ loading ? '同步中...' : '刷新' }}</button>
    </div>

    <!-- 未认证提示 -->
    <div v-if="!user.isEnterpriseAuthenticated" class="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <div class="text-4xl">🔒</div>
      <div class="mt-2 text-sm text-slate-500">完成企业认证后可查看 API 用量账单</div>
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="text-xs text-slate-400">本月调用</div>
          <div class="mt-1 text-2xl font-bold text-slate-800">{{ totalCalls }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="text-xs text-slate-400">本月费用</div>
          <div class="mt-1 text-2xl font-bold text-slate-800">¥ {{ totalAmount.toLocaleString() }}</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="text-xs text-slate-400">账单数量</div>
          <div class="mt-1 text-2xl font-bold text-slate-800">{{ bills.length }}</div>
        </div>
      </div>

      <div v-if="error" class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{{ error }}</div>

      <!-- 用量趋势（柱状图模拟） -->
      <div v-if="bills.length" class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">用量趋势</h3>
        <div class="flex h-32 items-end gap-2">
          <div
            v-for="bill in bills"
            :key="bill.spaceBillId"
            class="flex-1 rounded-t bg-brand-500 transition hover:bg-brand-600"
            :style="{ height: `${Math.min(100, (bill.visibleCalls / Math.max(...bills.map(b => b.visibleCalls), 1)) * 100)}%` }"
          >
            <div class="pb-1 text-center text-xs text-slate-400">{{ bill.billingMonth }}</div>
          </div>
        </div>
      </div>

      <!-- 费用明细表格 -->
      <div v-if="bills.length" class="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-800">费用明细</h3>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs text-slate-400">
              <th class="pb-2 pr-4">账单月份</th>
              <th class="pb-2 pr-4">状态</th>
              <th class="pb-2 pr-4">调用量</th>
              <th class="pb-2 pr-4">成功</th>
              <th class="pb-2">费用</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bill in bills" :key="bill.spaceBillId" class="border-b border-slate-100">
              <td class="py-2 pr-4 text-slate-700">{{ bill.billingMonth }}</td>
              <td class="py-2 pr-4 text-slate-600">{{ bill.rawStatus }}</td>
              <td class="py-2 pr-4 text-slate-600">{{ bill.visibleCalls }}</td>
              <td class="py-2 pr-4 text-slate-600">{{ bill.successCalls }}</td>
              <td class="py-2 font-medium text-slate-800">¥ {{ bill.totalAmount?.toLocaleString() || 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!loading && !error" class="mt-4 rounded-xl bg-white p-8 text-center">
        <div class="text-4xl">📭</div>
        <div class="mt-2 text-sm text-slate-500">暂无 API 用量账单</div>
      </div>
    </template>
  </div>
</template>
