<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const user = useUserStore()
const billsStore = useApiUsageBillsStore()
const loading = ref(false)
const error = ref('')
const downloadLink = ref('')
const supportLink = ref('')

const role = computed(() => user.currentEnterpriseMember?.role || 'member')
const bills = computed(() => billsStore.visibleBills())
const billLines = computed(() => bills.value.flatMap((bill) => bill.lines.map((line) => ({
  ...line,
  billingMonth: bill.billingMonth,
  billStatus: bill.rawStatus,
  currency: bill.currency,
  syncedAt: bill.syncedAt
}))))
const totalCalls = computed(() => bills.value.reduce((sum, bill) => sum + bill.visibleCalls, 0))
const totalAmount = computed(() => role.value === 'admin'
  ? bills.value.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0)
  : billLines.value.reduce((sum, line) => sum + line.amount, 0))
const orderCount = computed(() => new Set(billLines.value.map((line) => line.spaceOrderId)).size)
const apiCount = computed(() => new Set(billLines.value.map((line) => line.spaceProductNo)).size)

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

async function prepareDownload() {
  const bill = bills.value[0]
  if (!bill || role.value !== 'admin') return
  downloadLink.value = await billsStore.download(bill.spaceBillId) || ''
}

async function prepareSupport() {
  const bill = bills.value[0]
  if (!bill) return
  supportLink.value = await billsStore.support(bill.spaceBillId, route.fullPath) || ''
}

onMounted(() => { void loadBills() })
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <div class="mb-5 flex items-center justify-between">
      <div>
        <button class="mb-2 text-xs text-brand-600" @click="router.push({ path: '/portal/mine', query: { menu: 'orders', orderTab: 'buy' } })">← 返回我的订单</button>
        <h1 class="text-xl font-semibold text-slate-900">API 调用与费用账单</h1>
        <p class="mt-1 text-sm text-slate-500">每笔费用均关联到采购订单、API 商品、计费方案和调用凭证。</p>
      </div>
      <div class="flex gap-2">
        <button v-if="role === 'admin' && bills.length" data-testid="portal-download-api-bill" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600" @click="prepareDownload">导出账单</button>
        <button v-if="bills.length" data-testid="portal-api-bill-support" class="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-600" @click="prepareSupport">账单异议</button>
        <button class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 disabled:opacity-50" :disabled="loading" @click="loadBills">{{ loading ? '同步中…' : '刷新空间账单' }}</button>
      </div>
    </div>

    <div v-if="!user.isEnterpriseAuthenticated" class="rounded-xl border border-slate-200 bg-white p-10 text-center">
      <div class="text-4xl">🔒</div>
      <div class="mt-3 text-sm text-slate-500">完成企业认证后可查看可信空间 API 用量账单</div>
    </div>

    <template v-else>
      <div v-if="error || billsStore.error" class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{{ error || billsStore.error }}</div>
      <div v-if="billsStore.stale" class="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">当前展示最近一次成功同步的账单，数据可能延迟。</div>
      <div v-if="downloadLink || supportLink" class="mb-4 flex items-center gap-3 rounded-lg bg-cyan-50 px-4 py-3 text-xs text-cyan-800">
        <span>可信空间已生成安全链接：</span>
        <a v-if="downloadLink" :href="downloadLink" target="_blank" rel="noopener noreferrer" class="font-medium underline">下载完整账单</a>
        <a v-if="supportLink" :href="supportLink" target="_blank" rel="noopener noreferrer" class="font-medium underline">前往可信空间处理账单异议</a>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5"><div class="text-xs text-slate-400">{{ role === 'admin' ? '企业调用量' : '本人调用量' }}</div><div class="mt-1 text-2xl font-bold text-slate-900">{{ totalCalls.toLocaleString() }}</div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5"><div class="text-xs text-slate-400">{{ role === 'admin' ? '企业费用' : '本人可见费用' }}</div><div class="mt-1 text-2xl font-bold text-slate-900">¥{{ totalAmount.toLocaleString() }}</div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5"><div class="text-xs text-slate-400">关联采购订单</div><div class="mt-1 text-2xl font-bold text-slate-900">{{ orderCount }}</div></div>
        <div class="rounded-xl border border-slate-200 bg-white p-5"><div class="text-xs text-slate-400">API 商品</div><div class="mt-1 text-2xl font-bold text-slate-900">{{ apiCount }}</div></div>
      </div>

      <div v-if="billLines.length" class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div><h2 class="text-sm font-semibold text-slate-900">订单与 API 费用明细</h2><p class="mt-1 text-xs text-slate-400">普通成员仅可见本人获授权凭证的调用；企业管理员可见企业汇总。</p></div>
          <div class="text-xs text-slate-400">由可信空间出具</div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-[960px] w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-400">
              <tr>
                <th class="px-4 py-3 font-medium">账期 / 日期</th>
                <th class="px-4 py-3 font-medium">关联采购订单</th>
                <th class="px-4 py-3 font-medium">API 商品</th>
                <th class="px-4 py-3 font-medium">商品号 / 凭证</th>
                <th class="px-4 py-3 font-medium">计费方案</th>
                <th class="px-4 py-3 text-right font-medium">调用 / 成功</th>
                <th class="px-4 py-3 text-right font-medium">单价 / 费用</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in billLines" :key="line.id" data-testid="portal-api-bill-order-line" class="border-t border-slate-100 text-slate-600">
                <td class="px-4 py-3"><div class="text-slate-700">{{ line.billingMonth }}</div><div class="mt-1 text-slate-400">{{ line.date }}</div></td>
                <td class="px-4 py-3 font-mono text-[11px] text-slate-700">{{ line.spaceOrderId }}</td>
                <td class="px-4 py-3"><div class="font-medium text-slate-800">{{ line.apiName }}</div><div class="mt-1 text-slate-400">数据量 {{ line.dataVolume }}</div><button class="mt-1 text-brand-600" @click="router.push(`/portal/product/${line.appProductId}`)">查看商品 ›</button></td>
                <td class="px-4 py-3"><div class="font-mono text-[11px]">{{ line.spaceProductNo }}</div><div class="mt-1 font-mono text-[11px] text-slate-400">{{ line.appCredentialId }}</div></td>
                <td class="px-4 py-3">{{ line.pricingPlan }}</td>
                <td class="px-4 py-3 text-right"><div>{{ line.calls.toLocaleString() }}</div><div class="mt-1 text-slate-400">{{ line.successCalls.toLocaleString() }}</div></td>
                <td class="px-4 py-3 text-right"><div class="text-slate-500">¥{{ line.unitPrice }}/次</div><div class="mt-1 font-semibold text-slate-900">¥{{ line.amount.toLocaleString() }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="!loading && !error" class="mt-4 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">暂无 API 调用账单</div>
    </template>
  </div>
</template>
