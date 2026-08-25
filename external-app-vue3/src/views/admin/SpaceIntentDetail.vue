<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const intents = useSpaceIntentStore()
const catalog = useCatalogStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const intent = computed(() => intents.byId(id.value))
const product = computed(() => (intent.value ? catalog.byId(intent.value.productId) : undefined))
const closeReason = ref('')
const error = ref('')

function run(fn: () => void) {
  error.value = ''
  try {
    fn()
  } catch (e) {
    error.value = (e as Error).message
  }
}

function claim() {
  run(() => {
    intents.claim(id.value)
  })
}

function confirmEnterprise() {
  run(() => {
    intents.confirmEnterprise(id.value, user.enterprise.id)
  })
}

function markSpaceDeal() {
  run(() => {
    intents.markSpaceDeal(id.value, { spaceOrderNo: 'SO-OPS', spaceDealNote: '空间已成交' })
  })
}

function completeDelivery() {
  run(() => {
    intents.completeDelivery(id.value)
  })
}

function close() {
  if (!closeReason.value.trim()) {
    error.value = '关闭必须填原因'
    return
  }
  run(() => {
    intents.close(id.value, closeReason.value.trim())
  })
}

function goSpaceOps() {
  if (!intent.value?.enterpriseId) return
  return router.push({
    name: 'space-bridge',
    params: { id: intent.value.productId },
    query: { intent: `ops-${intent.value.id}` }
  })
}

const spaceKindLabel = computed(() => {
  if (product.value?.spaceKind === 'owned') return '自有'
  if (product.value?.spaceKind === 'federated') return '互联'
  return '—'
})
</script>

<template>
  <div v-if="intent">
    <PageHeader :title="`空间意向单 ${intent.id}`" desc="领取、确认企业、代办空间成交与接入交付" />

    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ OPS_STATUS_LABELS[intent.opsStatus] }}</span>
        <span class="text-slate-700">{{ product?.name || intent.productId }}</span>
        <span class="text-slate-400">{{ product?.spaceName || '—' }} · {{ spaceKindLabel }}</span>
      </div>
      <div class="mt-2 text-[12px] text-slate-500">
        联系人：{{ intent.contactName }} · {{ intent.contactPhone }} · 场景：{{ intent.scenario }}
      </div>
      <div class="mt-1 text-[12px] text-slate-400">
        企业：{{ intent.enterpriseId || intent.requestedEnterpriseName || '未确认' }}
        <template v-if="intent.spaceOrderNo"> · 空间单号 {{ intent.spaceOrderNo }}</template>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="intent.opsStatus === 'unclaimed'"
        class="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] text-white"
        @click="claim"
      >
        领取
      </button>
      <button
        v-if="intent.opsStatus === 'pending_enterprise' || intent.opsStatus === 'unclaimed'"
        class="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] text-white"
        @click="confirmEnterprise"
      >
        确认企业
      </button>
      <button
        v-if="intent.enterpriseId"
        data-testid="go-space-ops"
        class="rounded-lg bg-violet-500 px-3 py-1.5 text-[12px] text-white"
        @click="goSpaceOps"
      >
        去空间处理
      </button>
      <button
        v-if="intent.opsStatus === 'space_dealing'"
        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] text-white"
        @click="markSpaceDeal"
      >
        回填空间成交
      </button>
      <button
        v-if="intent.opsStatus === 'pending_delivery'"
        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] text-white"
        @click="completeDelivery"
      >
        完成接入
      </button>
    </div>

    <div v-if="intent.opsStatus !== 'completed' && intent.opsStatus !== 'closed'" class="mt-4 flex flex-wrap items-center gap-2">
      <input
        v-model="closeReason"
        data-testid="close-reason"
        placeholder="关闭原因（必填）"
        class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]"
      />
      <button class="rounded-lg bg-slate-400 px-3 py-1.5 text-[12px] text-white" @click="close">关闭</button>
    </div>
  </div>
  <div v-else class="py-10 text-center text-[13px] text-slate-400">意向单不存在</div>
</template>
