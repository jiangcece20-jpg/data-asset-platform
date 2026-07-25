<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
import type { EnterpriseContract } from '@/types/afterSales'

const props = defineProps<{ contract: EnterpriseContract }>()
const emit = defineEmits<{
  terminate: [contractId: string]
  removeMember: [contractId: string, seatId: string]
}>()
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4" data-testid="seat-reclaim">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-[13px] font-medium text-slate-700">企业合同与席位</span>
      <StatusBadge dict="contractStatus" :value="contract.status" />
    </div>
    <div class="mb-2 text-[12px] text-slate-500">席位数：{{ contract.seatIds.length }}</div>
    <div v-for="s in contract.seatIds" :key="s" class="flex items-center justify-between border-t border-slate-100 py-1.5 text-[12px]">
      <span class="text-slate-600">席位 {{ s }}</span>
      <button class="rounded bg-slate-400 px-2 py-0.5 text-white" data-testid="remove-member" @click="emit('removeMember', contract.id, s)">收回该席位</button>
    </div>
    <button
      v-if="contract.status === 'active'"
      class="mt-3 rounded-lg bg-red-500 px-3 py-1 text-[12px] text-white"
      data-testid="terminate-contract"
      @click="emit('terminate', contract.id)"
    >终止合同并批量收回席位</button>
  </div>
</template>
