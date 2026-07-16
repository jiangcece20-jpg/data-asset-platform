<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useApprovalStore } from '@/stores/approval'
import { useDemandStore } from '@/stores/demand'
import { useTrialStore } from '@/stores/trials'
import { useOrderStore } from '@/stores/orders'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'

const router = useRouter()
const catalog = useCatalogStore()
const approval = useApprovalStore()
const demand = useDemandStore()
const trials = useTrialStore()
const orders = useOrderStore()
const woStore = useReverseWorkOrderStore()

const kpis = [
  { label: '找数成功率', value: '86.2%' },
  { label: '有效回答率', value: '78.4%' },
  { label: '详情到试用转化', value: '32.1%' },
  { label: '试用到购买转化', value: '21.6%' },
  { label: '会员续费率', value: '64.8%' },
  { label: '企业席位激活率', value: '71.0%' },
  { label: '需求响应时效', value: '4.2 小时' },
  { label: '商品上新周期', value: '6.5 天' }
]

const pendingCounts = computed(() => [
  { label: '商品总数 / 已发布', value: `${catalog.products.length} / ${catalog.published.length}`, to: '/admin/products' },
  { label: '待审批商品', value: String(approval.pending.length), to: '/admin/approval' },
  { label: '待处理需求线索', value: String(demand.list.filter((d) => d.status === 'new').length), to: '/admin/trials-leads' },
  { label: '待审批试用', value: String(trials.pendingApplications.length), to: '/admin/trials-leads' },
  { label: '待确认企业合同', value: String(orders.list.filter((o) => o.contractStatus === 'quoting').length), to: '/admin/commerce' },
  { label: '空间回调异常', value: String(orders.list.filter((o) => o.status === 'callback_delayed').length), to: '/admin/approval' },
  { label: '逆向工单（待处理）', value: String(woStore.workOrders.filter((w) => w.status !== 'closed' && w.status !== 'cancelled').length), to: '/admin/approval/reverse-work-orders' },
  { label: '逆向工单（超时）', value: String(woStore.workOrders.filter((w) => { const now = new Date().toISOString(); return w.status !== 'closed' && w.status !== 'cancelled' && !w.acknowledgedAt && w.acknowledgeDueAt < now }).length), to: '/admin/approval/reverse-work-orders' },
])
</script>

<template>
  <div>
    <PageHeader title="运营概览" desc="供给流程：需求洞察 → 商品规划 → 资产加工/内容生产 → 分类审批 → 发布 → 运营推荐" />

    <div class="grid grid-cols-4 gap-3">
      <div v-for="k in kpis" :key="k.label" class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="text-xs text-slate-400">{{ k.label }}</div>
        <div class="mt-1 text-xl font-semibold text-slate-900">{{ k.value }}</div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-3 gap-3">
      <button
        v-for="p in pendingCounts"
        :key="p.label"
        class="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-card"
        @click="router.push(p.to)"
      >
        <div class="text-xs text-slate-400">{{ p.label }}</div>
        <div class="mt-1 text-lg font-semibold text-brand-600">{{ p.value }}</div>
      </button>
    </div>

    <div class="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-[12px] leading-relaxed text-slate-400">
      本后台与移动端共享同一份 mock 状态：在此处修改商品、审批、企业权益或线索状态后，切换到"移动端原型"即可立即看到对应变化。
    </div>
  </div>
</template>
