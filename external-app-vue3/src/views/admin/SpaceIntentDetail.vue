<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { buyerEnterpriseName, operatorContactText } from '@/domain/opsPurchaseParty'
import { productTypeLabels } from '@/domain/myCenter'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const intents = useSpaceIntentStore()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const intent = computed(() => intents.byId(id.value))
const product = computed(() => (intent.value ? catalog.byId(intent.value.productId) : undefined))
const relatedOrder = computed(() =>
  intent.value?.orderId ? orders.list.find((item) => item.id === intent.value?.orderId) : undefined
)
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

function confirmPayment() {
  run(() => {
    intents.confirmOfflinePayment(id.value, user.enterprise.id)
  })
}

function completeFulfillment() {
  run(() => {
    intents.completeFulfillment(id.value)
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
  if (!intent.value) return
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

const canConfirmPayment = computed(() =>
  intent.value?.opsStatus === 'unclaimed' || intent.value?.opsStatus === 'processing'
)
const canFulfill = computed(() =>
  intent.value?.opsStatus === 'converted' && relatedOrder.value?.status === 'paid'
)
const canClose = computed(() =>
  intent.value?.opsStatus === 'unclaimed' || intent.value?.opsStatus === 'processing'
)

const buyerName = computed(() =>
  intent.value
    ? buyerEnterpriseName({
      enterpriseId: intent.value.enterpriseId,
      requestedEnterpriseName: intent.value.requestedEnterpriseName
    }, user.enterprise)
    : '—'
)

const operatorContact = computed(() =>
  intent.value
    ? operatorContactText({
      contactName: intent.value.contactName,
      contactPhone: intent.value.contactPhone,
      operatorMemberId: intent.value.ownerMemberId
    }, user.enterprise)
    : '—'
)
</script>

<template>
  <div v-if="intent">
    <PageHeader :title="`空间意向单 ${intent.id}`" desc="领取后线下确认企业、方案和试用。系统里确认到账后转为买数订单，再协调空间履约。" />

    <div v-if="error" data-testid="error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ error }}</div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ OPS_STATUS_LABELS[intent.opsStatus] }}</span>
        <span class="text-slate-700">{{ product?.name || intent.productId }}</span>
        <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600" data-testid="product-type">{{ productTypeLabels[intent.productType] }}</span>
        <span class="text-slate-400">{{ product?.spaceName || '—' }} · {{ spaceKindLabel }}</span>
      </div>
      <div class="mt-2 text-[12px] text-slate-500">
        购买企业：<span data-testid="buyer-enterprise">{{ buyerName }}</span>
      </div>
      <div class="mt-1 text-[12px] text-slate-500">
        经办人：<span data-testid="operator-contact">{{ operatorContact }}</span>
        · 场景：{{ intent.scenario }}
      </div>
      <div class="mt-1 text-[12px] text-slate-400">
        <template v-if="relatedOrder">买数订单 {{ relatedOrder.id }} · {{ relatedOrder.status === 'paid' ? '履约中' : '已完成' }}</template>
      </div>
      <div class="mt-2 text-[12px] leading-relaxed text-slate-400">
        确认企业、确认方案、线下试用均在线下完成，系统不增加这些节点。
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
        v-if="canConfirmPayment"
        data-testid="confirm-payment"
        class="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] text-white"
        @click="confirmPayment"
      >
        确认到账
      </button>
      <button
        v-if="intent.opsStatus === 'processing' || intent.opsStatus === 'converted'"
        data-testid="go-space-ops"
        class="rounded-lg bg-violet-500 px-3 py-1.5 text-[12px] text-white"
        @click="goSpaceOps"
      >
        去空间处理
      </button>
      <button
        v-if="canFulfill"
        data-testid="complete-fulfillment"
        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] text-white"
        @click="completeFulfillment"
      >
        {{ intent.productType === 'dataset' ? '完成接入' : '完成开通' }}
      </button>
    </div>

    <div v-if="canClose" class="mt-4 flex flex-wrap items-center gap-2">
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
