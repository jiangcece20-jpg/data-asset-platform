<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const user = useUserStore()
const billsStore = useApiUsageBillsStore()
const loading = ref(false)
const pageError = ref('')
const currentTime = inject<() => Date>('trusted-space-now', () => new Date())

const member = computed(() => user.currentEnterpriseMember)
const role = computed(() => member.value?.role ?? 'member')
const billId = computed(() => String(route.params.id))
const authenticated = computed(() => user.isEnterpriseAuthenticated && Boolean(user.context.currentEnterpriseId && member.value))
const bill = computed(() => billsStore.billDetail(billId.value))
const supportLink = computed(() => billsStore.supportLinkForBill(billId.value, currentTime()) ?? '')

async function loadBill() {
  if (!authenticated.value || !user.context.currentEnterpriseId) return
  loading.value = true
  pageError.value = ''
  try {
    const binding = await trustedSpaceAdapter.ensureEnterpriseBinding(user.context.currentEnterpriseId)
    if (!binding.spaceEnterpriseId) {
      pageError.value = '暂未建立可信空间企业映射'
      return
    }
    await billsStore.syncBills(user.context.currentEnterpriseId, binding.spaceEnterpriseId)
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '空间账单同步失败'
  } finally {
    loading.value = false
  }
}

async function downloadBill() {
  const url = await billsStore.download(billId.value)
  if (url) window.location.assign(url)
}

async function askSupport() {
  await billsStore.support(billId.value, route.fullPath, undefined, currentTime)
}

function useSupportLink(event: MouseEvent) {
  if (billsStore.supportLinkForBill(billId.value, currentTime())) return
  event.preventDefault()
  void askSupport()
}

onMounted(() => { void loadBill() })
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="API 用量账单" />

    <div v-if="!authenticated" class="mx-4 mt-3 rounded-2xl bg-white p-4 text-center text-[13px] text-slate-500">完成企业认证后可查看账单明细</div>
    <div v-else-if="loading" class="mx-4 mt-3 rounded-2xl bg-white p-4 text-center text-[13px] text-slate-400">账单同步中…</div>
    <div v-else-if="pageError || billsStore.error" class="mx-4 mt-3 rounded-2xl bg-amber-50 p-4 text-[13px] text-amber-700">{{ pageError || billsStore.error }}</div>
    <div v-else-if="!bill" class="mx-4 mt-3 rounded-2xl bg-white p-4 text-center text-[13px] text-slate-400">未找到该账单</div>

    <template v-else>
      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[15px] font-semibold text-slate-800">{{ bill.billingMonth }} 用量账单</div>
          <div class="text-[11px] text-slate-400">{{ bill.rawStatus }}</div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-center">
          <div class="rounded-xl bg-slate-50 p-2.5">
            <div class="text-[16px] font-bold text-slate-800">{{ bill.visibleCalls }}</div>
            <div class="text-[11px] text-slate-400">{{ role === 'admin' ? '企业调用量' : '本人调用量' }}</div>
          </div>
          <div class="rounded-xl bg-slate-50 p-2.5">
            <div class="text-[16px] font-bold text-slate-800">{{ bill.successCalls }}</div>
            <div class="text-[11px] text-slate-400">成功调用</div>
          </div>
        </div>
        <div v-if="role === 'admin'" class="mt-3 rounded-xl bg-slate-50 p-3 text-center">
          <div class="text-[11px] text-slate-400">企业总额</div>
          <div class="mt-1 text-[20px] font-bold text-slate-800">¥{{ bill.totalAmount?.toLocaleString() }}</div>
        </div>
      </div>

      <div class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="mb-2 text-[13px] font-medium text-slate-700">按日期与 API 明细</div>
        <div v-for="line in bill.lines" :key="line.id" class="border-t border-slate-50 py-3 first:border-t-0 first:pt-0">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-[13px] text-slate-800">{{ line.apiName }}</div>
              <div class="mt-1 text-[11px] text-slate-400">{{ line.date }} · 凭证 {{ line.appCredentialId }}</div>
            </div>
            <div class="text-right text-[12px] text-slate-600">{{ line.calls }} 次<br><span class="text-[11px] text-slate-400">成功 {{ line.successCalls }}</span></div>
          </div>
        </div>
        <div v-if="!bill.lines.length" class="text-[12px] text-slate-400">本账期暂无可见调用明细</div>
      </div>

      <div class="mx-4 mt-3 space-y-2">
        <button v-if="role === 'admin'" class="w-full rounded-full bg-slate-800 py-2.5 text-[13px] font-medium text-white" @click="downloadBill">下载完整账单</button>
        <button class="w-full rounded-full border border-brand-500 py-2.5 text-[13px] font-medium text-brand-500" @click="askSupport">账单有疑问</button>
        <a v-if="supportLink" :href="supportLink" class="block break-all rounded-xl bg-cyan-50 p-3 text-[12px] text-cyan-800" @click="useSupportLink">前往可信空间处理账单疑问</a>
      </div>
    </template>
  </div>
</template>
