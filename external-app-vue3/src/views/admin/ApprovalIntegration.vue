<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useApprovalStore } from '@/stores/approval'
import { useOrderStore } from '@/stores/orders'
import { useCatalogStore } from '@/stores/catalog'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { typeMeta } from '@/utils/productMeta'

const router = useRouter()
const approval = useApprovalStore()
const orders = useOrderStore()
const catalog = useCatalogStore()
const woStore = useReverseWorkOrderStore()

const reasonDraft = reactive<Record<string, string>>({})

const openWOs = computed(() => woStore.workOrders.filter((w) => w.status !== 'closed' && w.status !== 'cancelled'))
const s1Count = computed(() => openWOs.value.filter((w) => w.severity === 'S1').length)
const overdueS1S2 = computed(() => {
  const now = new Date().toISOString()
  return openWOs.value.filter((w) =>
    (w.severity === 'S1' || w.severity === 'S2')
    && !w.acknowledgedAt
    && w.acknowledgeDueAt < now,
  ).length
})

function decide(id: string, conclusion: 'approved' | 'rejected') {
  approval.decide(id, conclusion, reasonDraft[id] || (conclusion === 'approved' ? '符合分类检查要求' : '检查项未通过，请补充后重提'), '合规审批人-周敏')
}
</script>

<template>
  <div>
    <PageHeader title="审批与集成" desc="分类清单、审批记录、空间同步、订单回调、异常告警" />

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">审批记录</div>
      <div v-for="r in approval.list" :key="r.id" class="mb-3 rounded-lg border border-slate-100 p-3">
        <div class="flex items-center justify-between">
          <div class="text-[13px] font-medium text-slate-800">{{ typeMeta[r.productType].icon }} {{ r.productName }}</div>
          <StatusBadge dict="approval" :value="r.conclusion" />
        </div>
        <ul class="mt-1.5 space-y-0.5 text-[12px] text-slate-500">
          <li v-for="(c, idx) in r.checklist" :key="idx">
            {{ c.passed === true ? '✅' : c.passed === false ? '❌' : '⏳' }} {{ c.item }}
            <span v-if="c.note" class="text-slate-400">（{{ c.note }}）</span>
          </li>
        </ul>
        <div class="mt-1.5 text-[11px] text-slate-400">
          时间线：
          <span v-for="(t, idx) in r.timeline" :key="idx">{{ t.time }} {{ t.actor }} {{ t.action }}{{ idx < r.timeline.length - 1 ? ' → ' : '' }}</span>
        </div>
        <div v-if="r.conclusion === 'pending'" class="mt-2 flex items-center gap-2">
          <input v-model="reasonDraft[r.id]" placeholder="审批意见" class="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
          <button class="rounded-full bg-emerald-500 px-3 py-1 text-[11px] text-white" @click="decide(r.id, 'approved')">通过</button>
          <button class="rounded-full bg-red-500 px-3 py-1 text-[11px] text-white" @click="decide(r.id, 'rejected')">驳回</button>
        </div>
      </div>
      <div v-if="!approval.list.length" class="py-3 text-center text-[12px] text-slate-400">暂无审批记录</div>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">空间同步状态</div>
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="py-1.5">商品</th><th class="py-1.5">空间编号</th><th class="py-1.5">最近同步</th></tr></thead>
        <tbody>
          <tr v-for="p in catalog.products.filter((x) => x.source !== 'app_self')" :key="p.id" class="border-t border-slate-100">
            <td class="py-1.5 text-slate-700">{{ p.name }}</td>
            <td class="py-1.5 text-slate-500">{{ p.spaceProductNo }}</td>
            <td class="py-1.5 text-slate-400">{{ p.spaceSyncedAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Reverse work-order card -->
    <div data-testid="reverse-wo-card" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-[13px] font-medium text-slate-700">逆向工单</div>
        <button data-testid="reverse-wo-link" class="text-[12px] text-blue-600 hover:underline" @click="router.push('/admin/approval/reverse-work-orders')">查看全部</button>
      </div>
      <div class="flex gap-4 text-[13px]">
        <div><span class="text-slate-400">待处理</span><span class="ml-1 font-semibold text-slate-700">{{ openWOs.length }}</span></div>
        <div><span class="text-slate-400">S1</span><span class="ml-1 font-semibold text-red-600">{{ s1Count }}</span></div>
        <div v-if="overdueS1S2 > 0"><span class="text-slate-400">超时 S1/S2</span><span class="ml-1 font-semibold text-red-600">{{ overdueS1S2 }}</span></div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">订单回调 / 异常告警</div>
      <div v-for="o in orders.list.filter((x) => x.status === 'callback_delayed')" :key="o.id" class="flex items-center justify-between border-t border-slate-100 py-2 text-[13px]">
        <span class="text-slate-700">{{ o.productName }} · 订单 {{ o.id }}</span>
        <StatusBadge dict="spaceOrder" :value="o.status" />
      </div>
      <div v-if="!orders.list.filter((x) => x.status === 'callback_delayed').length" class="py-3 text-center text-[12px] text-slate-400">
        暂无异常告警
      </div>
    </div>
  </div>
</template>
