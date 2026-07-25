<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import CallbackList from '@/components/admin/demand-flow/CallbackList.vue'
import SupplyTaskTimeline from '@/components/admin/demand-flow/SupplyTaskTimeline.vue'
import { useSupplyTaskStore } from '@/stores/supplyTasks'
import { useDemandStore } from '@/stores/demand'
import type { CallbackOutcome } from '@/types/demandFlow'

const route = useRoute()
const supply = useSupplyTaskStore()
const demand = useDemandStore()

const taskId = computed(() => String(route.params.id))
const task = computed(() => supply.byId(taskId.value))
const demands = computed(() => demand.byTask(taskId.value))
const callbacks = computed(() => supply.callbacksFor(taskId.value))
const timeline = computed(() => supply.timelineFor(taskId.value))

const productId = ref('')
const error = ref('')

function run(fn: () => void) {
  error.value = ''
  try {
    fn()
  } catch (e) {
    error.value = (e as Error).message
  }
}

function advance(status: 'planned' | 'in_production') {
  run(() => supply.advanceStatus(taskId.value, status, 'op-1'))
}
function publish() {
  run(() => supply.publish(taskId.value, productId.value || 'prod-new-001', 'op-1'))
}
function withdraw(demandId: string) {
  run(() => supply.withdrawDemand(demandId, 'op-1'))
}
function reopen(demandId: string) {
  run(() => supply.reopenDemand(demandId, 'op-1'))
}
function onOutcome(id: string, outcome: CallbackOutcome) {
  if (outcome !== 'none') run(() => supply.recordOutcome(id, outcome, 'op-1'))
}
</script>

<template>
  <div v-if="task">
    <PageHeader :title="task.title" desc="供给任务详情" />

    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 flex items-center gap-2">
      <StatusBadge dict="supplyTask" :value="task.status" />
      <StatusBadge dict="supplyDecision" :value="task.decision" />
      <div class="ml-auto flex gap-2">
        <button v-if="task.status === 'evaluating'" class="rounded-lg bg-blue-500 px-3 py-1 text-[12px] text-white" data-testid="btn-plan" @click="advance('planned')">进入规划</button>
        <button v-if="task.status === 'planned'" class="rounded-lg bg-blue-500 px-3 py-1 text-[12px] text-white" data-testid="btn-produce" @click="advance('in_production')">进入加工</button>
        <template v-if="task.status === 'planned' || task.status === 'in_production'">
          <input v-model="productId" placeholder="商品ID" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]" data-testid="publish-product" />
          <button class="rounded-lg bg-emerald-600 px-3 py-1 text-[12px] text-white" data-testid="btn-publish" @click="publish">发布并回告</button>
        </template>
      </div>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">关联需求（{{ demands.length }}）</div>
      <div v-for="d in demands" :key="d.id" data-testid="task-demand" :data-id="d.id" class="flex flex-wrap items-center gap-2 border-t border-slate-100 py-2 text-[12px]">
        <span class="text-slate-600">{{ d.question }}</span>
        <StatusBadge dict="demand" :value="d.status" />
        <span class="text-slate-400">{{ d.ownerId }}</span>
        <div class="ml-auto flex gap-1">
          <button v-if="d.status !== 'withdrawn'" class="rounded bg-slate-400 px-2 py-0.5 text-white" data-testid="btn-withdraw" @click="withdraw(d.id)">撤回</button>
          <button v-if="['not_supported','recommended','closed'].includes(d.status)" class="rounded bg-amber-500 px-2 py-0.5 text-white" data-testid="btn-reopen" @click="reopen(d.id)">重开</button>
        </div>
      </div>
    </div>

    <CallbackList
      class="mb-4"
      :callbacks="callbacks"
      @deliver="(id) => run(() => supply.markCallbackDelivered(id, 'op-1'))"
      @fail="(id) => run(() => supply.markCallbackFailed(id, 'op-1'))"
      @manual="(id) => run(() => supply.markCallbackManualConfirmed(id, 'op-1', '电话已联系'))"
      @outcome="onOutcome"
    />

    <SupplyTaskTimeline :entries="timeline" />
  </div>
  <div v-else class="py-10 text-center text-[13px] text-slate-400">供给任务不存在</div>
</template>
