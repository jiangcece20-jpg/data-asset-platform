<script lang="ts">
export interface UnifiedOrderRow {
  id: string
  channel: 'app' | 'trusted_space'
  ownerType: 'personal' | 'enterprise'
  ownerId: string
  operatorMemberId?: string
  productId: string
  productName: string
  amount: number
  currency: string
  status: string
  contractStatus?: string
  createdAt: string
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'

const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const purchases = useTrustedSpacePurchaseStore()

const filterChannel = ref('')
const filterOwner = ref('')
const keyword = ref('')
const reconcilingId = ref('')

const unifiedOrders = computed<UnifiedOrderRow[]>(() => [
  ...orders.list.map((order) => ({
    id: order.id,
    channel: 'app' as const,
    ownerType: order.ownerType,
    ownerId: order.ownerId,
    productId: order.productId,
    productName: order.productName,
    amount: order.amount,
    currency: 'CNY',
    status: order.status,
    contractStatus: order.contractStatus,
    createdAt: order.createdAt,
  })),
  ...spaceOrders.mirrors.map((mirror) => ({
    id: mirror.spaceOrderId,
    channel: 'trusted_space' as const,
    ownerType: 'enterprise' as const,
    ownerId: mirror.appEnterpriseId,
    operatorMemberId: mirror.operatorMemberId,
    productId: mirror.appProductId,
    productName: mirror.productName,
    amount: mirror.amount,
    currency: mirror.currency,
    status: mirror.displayStatus,
    createdAt: mirror.spaceUpdatedAt,
  })),
])

const list = computed(() => {
  let items = [...unifiedOrders.value]
  if (filterChannel.value) items = items.filter((order) => order.channel === filterChannel.value)
  if (filterOwner.value) items = items.filter((order) => order.ownerType === filterOwner.value)
  if (keyword.value.trim()) {
    const query = keyword.value.trim().toLowerCase()
    items = items.filter((order) => order.productName.toLowerCase().includes(query) || order.id.toLowerCase().includes(query))
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const total = computed(() => unifiedOrders.value.length)
const gmv = computed(() => unifiedOrders.value.reduce((sum, order) => sum + (order.amount || 0), 0))
const pendingContracts = computed(() => orders.list.filter((order) => order.contractStatus === 'quoting' || order.contractStatus === 'contract_signed').length)

function sign(orderId: string) {
  orders.signContract(orderId)
}

function confirmPayment(orderId: string) {
  orders.confirmEnterpriseContract(orderId)
}

async function reconcile(row: UnifiedOrderRow) {
  const intentId = reconciliationIntentId(row.id)
  if (!intentId) return
  reconcilingId.value = row.id
  try {
    await spaceOrders.reconcileIntent(intentId)
  } finally {
    reconcilingId.value = ''
  }
}

function reconciliationIntentId(spaceOrderId: string): string | undefined {
  const intentId = spaceOrders.byId(spaceOrderId)?.purchaseIntentId
  const intent = intentId && purchases.byId(intentId)
  return intent && spaceOrders.canReconcileIntent(intent) ? intent.id : undefined
}

function spaceDetailUrl(row: UnifiedOrderRow): string | undefined {
  return spaceOrders.byId(row.id)?.detailUrl
}
</script>

<template>
  <div>
    <PageHeader title="订单中心" desc="APP 订单与可信空间镜像统一展示；空间镜像仅供查看与治理，不在此开通权益" />

    <div class="mb-4 flex gap-3">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">订单总数</span><span class="ml-2 font-semibold text-slate-700">{{ total }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">累计金额</span><span class="ml-2 font-semibold text-slate-700">¥{{ gmv }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">待处理合同</span><span class="ml-2 font-semibold" :class="pendingContracts ? 'text-amber-600' : 'text-slate-700'">{{ pendingContracts }}</span></div>
    </div>

    <div class="mb-3 flex flex-wrap gap-2">
      <select v-model="filterChannel" data-testid="filter-channel" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部渠道</option>
        <option value="app">APP 支付</option>
        <option value="trusted_space">可信空间</option>
      </select>
      <select v-model="filterOwner" data-testid="filter-owner" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部客户</option>
        <option value="personal">个人</option>
        <option value="enterprise">企业</option>
      </select>
      <input v-model="keyword" data-testid="filter-keyword" placeholder="商品名 / 订单号" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
    </div>

    <div class="rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="px-3 py-2">商品</th><th class="px-3 py-2">渠道</th><th class="px-3 py-2">客户</th><th class="px-3 py-2">金额</th><th class="px-3 py-2">订单状态</th><th class="px-3 py-2">合同状态</th><th class="px-3 py-2">创建时间</th><th class="px-3 py-2">操作</th></tr></thead>
        <tbody>
          <tr v-for="order in list" :key="order.id" data-testid="order-row" :data-id="order.id" class="border-t border-slate-100 hover:bg-slate-50">
            <td class="px-3 py-2 text-slate-700">{{ order.productName }}</td>
            <td class="px-3 py-2 text-slate-500">{{ order.channel === 'trusted_space' ? '可信空间（只读镜像）' : 'APP 支付' }}</td>
            <td class="px-3 py-2 text-slate-500">{{ order.ownerType === 'enterprise' ? '企业' : '个人' }}</td>
            <td class="px-3 py-2 text-slate-500">{{ order.currency === 'CNY' ? '¥' : `${order.currency} ` }}{{ order.amount }}</td>
            <td class="px-3 py-2"><StatusBadge :dict="order.channel === 'trusted_space' ? 'spaceOrder' : 'appOrder'" :value="order.status" /></td>
            <td class="px-3 py-2"><StatusBadge v-if="order.channel === 'app' && order.contractStatus" dict="contract" :value="order.contractStatus" /></td>
            <td class="px-3 py-2 text-slate-400">{{ order.createdAt }}</td>
            <td class="px-3 py-2">
              <template v-if="order.channel === 'app'">
                <button v-if="order.contractStatus === 'quoting'" class="mr-2 text-brand-600 hover:underline" data-testid="sign" @click="sign(order.id)">标记合同已签署</button>
                <button v-if="order.contractStatus === 'contract_signed'" class="text-emerald-600 hover:underline" data-testid="confirm-pay" @click="confirmPayment(order.id)">确认付款并开通权益</button>
              </template>
              <template v-else>
                <button v-if="reconciliationIntentId(order.id)" class="mr-2 text-brand-600 hover:underline disabled:text-slate-400" data-testid="reconcile-space" :disabled="reconcilingId === order.id" @click="reconcile(order)">{{ reconcilingId === order.id ? '对账中…' : '主动对账' }}</button>
                <a v-if="spaceDetailUrl(order)" :href="spaceDetailUrl(order)" target="_blank" rel="noopener" class="text-slate-600 hover:underline">查看空间详情</a>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="py-6 text-center text-[12px] text-slate-400">暂无订单</div>
    </div>
  </div>
</template>
