<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { trustedSpaceAdapter } from '@/services/trusted-space/TrustedSpaceAdapter'
import { useApiUsageBillsStore } from '@/stores/apiUsageBills'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const billsStore = useApiUsageBillsStore()
const loading = ref(false)
const bindingError = ref('')

const member = computed(() => user.currentEnterpriseMember)
const role = computed(() => member.value?.role ?? 'member')
const authenticated = computed(() => user.isEnterpriseAuthenticated && Boolean(user.context.currentEnterpriseId && member.value))
const bills = computed(() => billsStore.visibleBills())

async function loadBills() {
  if (!authenticated.value || !user.context.currentEnterpriseId) return
  loading.value = true
  bindingError.value = ''
  try {
    const binding = await trustedSpaceAdapter.ensureEnterpriseBinding(user.context.currentEnterpriseId)
    if (!binding.spaceEnterpriseId) {
      bindingError.value = '暂未建立可信空间企业映射'
      return
    }
    await billsStore.syncBills(user.context.currentEnterpriseId, binding.spaceEnterpriseId)
  } catch (error) {
    bindingError.value = error instanceof Error ? error.message : '空间账单同步失败'
  } finally {
    loading.value = false
  }
}

function openBill(spaceBillId: string) {
  router.push({ name: 'api-usage-bill-detail', params: { id: spaceBillId } })
}

onMounted(() => { void loadBills() })
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="API 用量账单" />

    <div v-if="!authenticated" class="mx-4 mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-center">
      <div class="text-[13px] text-slate-500">完成企业认证后可查看可信空间 API 用量账单</div>
      <button class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white" @click="router.push({ path: '/app/enterprise-auth', query: { redirect: '/app/mine/enterprise/bills' } })">
        去认证
      </button>
    </div>

    <template v-else>
      <div class="mx-4 mt-3 flex items-center justify-between">
        <div class="text-[12px] text-slate-400">账单由可信空间出具</div>
        <button class="text-[12px] text-brand-500 disabled:text-slate-400" :disabled="loading" @click="loadBills">{{ loading ? '同步中…' : '刷新' }}</button>
      </div>
      <div v-if="bindingError || billsStore.error" class="mx-4 mt-3 rounded-xl bg-amber-50 p-3 text-[12px] text-amber-700">
        {{ bindingError || billsStore.error }}
      </div>
      <div v-if="billsStore.stale" class="mx-4 mt-3 rounded-xl bg-amber-50 p-3 text-[12px] text-amber-700">当前展示最近一次成功同步的账单</div>

      <div v-if="!loading && !bills.length && !bindingError" class="mx-4 mt-3 rounded-2xl bg-white p-4 text-center text-[13px] text-slate-400">暂无 API 用量账单</div>
      <button v-for="bill in bills" :key="bill.spaceBillId" class="mx-4 mt-3 block w-[calc(100%-2rem)] rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-card" @click="openBill(bill.spaceBillId)">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-800">{{ bill.billingMonth }} 用量账单</div>
          <div class="text-[11px] text-slate-400">{{ bill.rawStatus }}</div>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <div>
            <template v-if="role === 'admin'">
              <div class="text-[11px] text-slate-400">企业总额</div>
              <div class="text-[20px] font-bold text-slate-800">¥{{ bill.totalAmount?.toLocaleString() }}</div>
            </template>
            <template v-else>
              <div class="text-[11px] text-slate-400">本人调用量</div>
              <div class="text-[20px] font-bold text-slate-800">{{ bill.visibleCalls }}</div>
            </template>
          </div>
          <div class="text-right text-[12px] text-slate-500">
            <div>{{ role === 'admin' ? '企业调用量' : '本人调用量' }} {{ bill.visibleCalls }}</div>
            <div class="mt-1">成功 {{ bill.successCalls }}</div>
          </div>
        </div>
      </button>
    </template>
  </div>
</template>
