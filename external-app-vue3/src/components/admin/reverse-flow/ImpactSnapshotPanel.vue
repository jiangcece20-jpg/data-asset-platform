<script setup lang="ts">
import type { ImpactSnapshot } from '@/types/reverseFlow'

defineProps<{
  impact?: ImpactSnapshot
}>()

const categories: Array<{ key: keyof ImpactSnapshot; label: string }> = [
  { key: 'customerIds', label: '客户' },
  { key: 'inFlightOrderIds', label: '在途订单' },
  { key: 'activeEntitlementIds', label: '权益' },
  { key: 'enterpriseMemberIds', label: '企业成员' },
  { key: 'trialIds', label: '试用' },
  { key: 'listingRequestIds', label: '求上架' },
  { key: 'catalogReferenceIds', label: '目录引用' },
  { key: 'contractIds', label: '合同' },
]
</script>

<template>
  <div data-testid="impact-panel" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div class="mb-2 text-[12px] font-medium text-slate-600">影响快照</div>
    <div v-if="impact" class="grid grid-cols-4 gap-2">
      <div v-for="cat in categories" :key="cat.key" class="text-center">
        <div class="text-[18px] font-bold text-slate-700">{{ (impact[cat.key] as string[])?.length ?? 0 }}</div>
        <div class="text-[11px] text-slate-400">{{ cat.label }}</div>
      </div>
    </div>
    <div v-else class="py-4 text-center text-[12px] text-slate-400">尚未生成影响快照</div>
  </div>
</template>
