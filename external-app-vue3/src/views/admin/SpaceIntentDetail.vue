<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { OPS_STATUS_LABELS } from '@/domain/spaceIntent'
import { buyerEnterpriseName, operatorContactText } from '@/domain/opsPurchaseParty'
import { productTypeLabels } from '@/domain/myCenter'
import { statusMeta } from '@/utils/statusMeta'
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
    intents.claim(id.value, user.enterprise.id)
  })
}

function confirmTransaction() {
  run(() => {
    intents.confirmOfflinePayment(id.value, user.enterprise.id)
  })
}

function confirmOrderPayment() {
  if (!relatedOrder.value) return
  run(() => {
    orders.confirmSpaceIntentPayment(relatedOrder.value!.id)
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
    closeReason.value = ''
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

function goOrders() {
  void router.push('/admin/orders')
}

const spaceKindLabel = computed(() => {
  if (product.value?.spaceKind === 'owned') return '自有'
  if (product.value?.spaceKind === 'federated') return '互联'
  return '—'
})

const canConfirmTransaction = computed(() =>
  intent.value?.opsStatus === 'processing'
  && Boolean(intent.value.enterpriseId)
  && !intent.value.orderId
)

const canConfirmOrderPayment = computed(() =>
  relatedOrder.value?.status === 'payment_pending_confirmation'
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

const orderStatusLabel = computed(() =>
  relatedOrder.value ? statusMeta('appOrder', relatedOrder.value.status).label : ''
)
</script>

<template>
  <div v-if="intent">
    <PageHeader
      :title="`意向单 ${intent.id}`"
      desc="领取后在空间侧线下确认企业、方案与试用；运营确认交易后转买数订单，到账后再开通履约。"
    />

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
      <div v-if="relatedOrder" class="mt-1 text-[12px] text-slate-400" data-testid="related-order">
        买数订单 {{ relatedOrder.id }} · 交易状态 {{ orderStatusLabel }}
      </div>
      <div class="mt-2 text-[12px] leading-relaxed text-slate-400">
        确认企业、确认方案、线下试用均在空间侧线下完成，系统不记录这些节点。
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="intent.opsStatus === 'unclaimed'"
        data-testid="claim-intent"
        class="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] text-white"
        @click="claim"
      >
        领取
      </button>
      <button
        v-if="canConfirmTransaction"
        data-testid="confirm-transaction"
        class="rounded-lg bg-blue-500 px-3 py-1.5 text-[12px] text-white"
        @click="confirmTransaction"
      >
        确认交易
      </button>
      <button
        v-if="canConfirmOrderPayment"
        data-testid="confirm-order-payment"
        class="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] text-white"
        @click="confirmOrderPayment"
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
      <button
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600"
        @click="goOrders"
      >
        返回订单中心
      </button>
    </div>

    <div v-if="canClose" class="mt-6 rounded-xl border border-slate-200 bg-white p-4" data-testid="close-intent-panel">
      <div class="mb-2 text-[12px] font-medium text-slate-700">关闭意向单</div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="closeReason"
          data-testid="close-reason"
          placeholder="关闭原因（必填）"
          class="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
        />
        <button
          data-testid="close-intent"
          class="rounded-lg bg-slate-500 px-3 py-1.5 text-[12px] text-white"
          @click="close"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
  <div v-else class="py-10 text-center text-[13px] text-slate-400">意向单不存在</div>
</template>
