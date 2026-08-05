<script lang="ts">
export interface UnifiedOrderRow {
  id: string
  channel: 'app' | 'trusted_space'
  ownerType: 'personal' | 'enterprise'
  ownerId: string
  operatorMemberId?: string
  productId: string
  productName: string
  productType?: string
  planSummary?: string
  amount: number
  currency: string
  status: string
  contractStatus?: string
  approvalStatus?: string
  entitlementStatus?: string
  deliveryStatus?: string
  deliveryId?: string
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
import { useDatasetCommerceStore } from '@/stores/datasetCommerce'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { statusMeta } from '@/utils/statusMeta'

const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const purchases = useTrustedSpacePurchaseStore()
const datasetCommerce = useDatasetCommerceStore()
const entitlements = useEntitlementStore()
const user = useUserStore()

const filterChannel = ref('')
const filterOwner = ref('')
const keyword = ref('')
const reconcilingId = ref('')
const confirmingOrderId = ref('')
const activationDate = ref('')

const unifiedOrders = computed<UnifiedOrderRow[]>(() => [
  ...orders.list.map((order) => ({
    id: order.id,
    channel: 'app' as const,
    ownerType: order.ownerType,
    ownerId: order.ownerId,
    operatorMemberId: order.operatorMemberId,
    productId: order.productId,
    productName: order.productName,
    productType: order.productType,
    planSummary: order.serviceMode === 'continuous' ? `持续服务 · ${order.selectedTermMonths || '—'}个月` : order.serviceMode === 'one_time' ? '一次性交付' : undefined,
    amount: order.amount,
    currency: 'CNY',
    status: order.status,
    contractStatus: order.contractStatus,
    approvalStatus: datasetCommerce.approvalRequests.find((item) => item.id === order.approvalRequestId)?.status,
    entitlementStatus: entitlements.list.find((item) => item.id === order.entitlementId)?.status,
    deliveryStatus: datasetCommerce.deliveries.find((item) => item.id === order.biDeliveryId)?.status,
    deliveryId: order.biDeliveryId,
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
const pendingConfirmations = computed(() => orders.list.filter((order) => order.status === 'payment_pending_confirmation').length)

function sign(orderId: string) {
  orders.signContract(orderId)
}

function confirmPayment(orderId: string) {
  orders.confirmEnterpriseContract(orderId)
}

const confirmingOrder = computed(() => orders.list.find((item) => item.id === confirmingOrderId.value))
const isContinuousPlan = computed(() => {
  const order = confirmingOrder.value
  return order?.serviceMode === 'continuous'
})

function startConfirmOffline(orderId: string) {
  confirmingOrderId.value = orderId
  activationDate.value = ''
}

function submitConfirmOffline() {
  if (!confirmingOrderId.value) return
  datasetCommerce.confirmOfflinePayment(confirmingOrderId.value, {
    activationDate: activationDate.value || undefined
  })
  confirmingOrderId.value = ''
  activationDate.value = ''
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

function operatorName(memberId?: string): string {
  return user.enterprise.members.find((item) => item.id === memberId)?.name || memberId || '—'
}

function statusLabel(dict: string, status: string | undefined, fallback: string): string {
  return status ? statusMeta(dict, status).label : fallback
}
</script>

<template>
  <div>
    <PageHeader title="订单中心" desc="APP 订单与可信空间镜像统一展示；空间镜像仅供查看与治理，不在此开通权益" />

    <div class="mb-4 flex gap-3">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">订单总数</span><span class="ml-2 font-semibold text-slate-700">{{ total }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">累计金额</span><span class="ml-2 font-semibold text-slate-700">¥{{ gmv }}</span></div>
     <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">待处理合同</span><span class="ml-2 font-semibold" :class="pendingContracts ? 'text-amber-600' : 'text-slate-700'">{{ pendingContracts }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">待确认到账</span><span class="ml-2 font-semibold" :class="pendingConfirmations ? 'text-amber-600' : 'text-slate-700'">{{ pendingConfirmations }}</span></div>
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
        <thead class="text-xs text-slate-400"><tr><th class="px-3 py-2">商品</th><th class="px-3 py-2">渠道</th><th class="px-3 py-2">客户/经办人</th><th class="px-3 py-2">金额</th><th class="px-3 py-2">交易状态</th><th class="px-3 py-2">审批/权益/交付</th><th class="px-3 py-2">创建时间</th><th class="px-3 py-2">操作</th></tr></thead>
        <tbody>
          <tr v-for="order in list" :key="order.id" data-testid="order-row" :data-id="order.id" class="border-t border-slate-100 hover:bg-slate-50">
            <td class="px-3 py-2 text-slate-700"><div>{{ order.productName }}</div><div v-if="order.planSummary" class="text-[10px] text-slate-400">{{ order.planSummary }}</div></td>
            <td class="px-3 py-2 text-slate-500">{{ order.channel === 'trusted_space' ? '可信空间（只读镜像）' : 'APP 支付' }}</td>
            <td class="px-3 py-2 text-slate-500"><div>{{ order.ownerType === 'enterprise' ? '企业' : '个人' }}</div><div v-if="order.operatorMemberId" class="text-[10px] text-slate-400">经办 {{ operatorName(order.operatorMemberId) }}</div></td>
            <td class="px-3 py-2 text-slate-500">{{ order.currency === 'CNY' ? '¥' : `${order.currency} ` }}{{ order.amount }}</td>
            <td class="px-3 py-2"><StatusBadge :dict="order.channel === 'trusted_space' ? 'spaceOrder' : 'appOrder'" :value="order.status" /></td>
            <td class="px-3 py-2 text-[11px] text-slate-500">
              <template v-if="order.channel === 'app' && order.productType === 'dataset'">
                <div>审批：{{ statusLabel('approval', order.approvalStatus, '不需要') }}</div>
                <div>权益：{{ statusLabel('entitlementStatus', order.entitlementStatus, '未创建') }}</div>
                <div>用数交付：{{ statusLabel('biDelivery', order.deliveryStatus, '未创建') }}</div>
              </template>
              <span v-else-if="order.channel === 'app'">APP 内容权益</span>
              <span v-else>空间侧权威</span>
            </td>
            <td class="px-3 py-2 text-slate-400">{{ order.createdAt }}</td>
            <td class="px-3 py-2">
              <template v-if="order.channel === 'app'">
                <button v-if="order.contractStatus === 'quoting'" class="mr-2 text-brand-600 hover:underline" data-testid="sign" @click="sign(order.id)">标记合同已签署</button>
               <button v-if="order.contractStatus === 'contract_signed'" class="text-emerald-600 hover:underline" data-testid="confirm-pay" @click="confirmPayment(order.id)">确认付款并开通权益</button>
                <button v-if="order.status === 'payment_pending_confirmation'" class="text-emerald-600 hover:underline" data-testid="confirm-offline-payment" @click="startConfirmOffline(order.id)">确认到账并开通</button>
               <button v-if="order.deliveryStatus === 'failed' && order.deliveryId" class="text-amber-700 hover:underline" data-testid="retry-bi-delivery" @click="datasetCommerce.retryDelivery(order.deliveryId)">重试用数交付</button>
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
    <!-- 确认线下付款弹窗 -->
    <div v-if="confirmingOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" data-testid="confirm-offline-modal">
      <div class="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="text-[15px] font-semibold text-slate-900">确认线下付款到账</div>
        <div class="mt-3 text-[13px] text-slate-500">订单 {{ confirmingOrder.id }} · {{ confirmingOrder.productName }} · ¥{{ confirmingOrder.amount.toLocaleString() }}</div>
        <div class="mt-4">
          <label class="text-[13px] font-medium text-slate-700">生效日期（可选）</label>
          <p v-if="isContinuousPlan" class="mt-1 text-[11px] text-slate-400">持续更新方案：填写后从该日期开始计期；留空则按确认时间开通。</p>
          <p v-else class="mt-1 text-[11px] text-slate-400">一次性快照方案：填写后从该日期开始计算权益有效期；留空则按确认时间开通。</p>
          <input v-model="activationDate" type="date" data-testid="activation-date-input" class="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button data-testid="cancel-confirm-offline" class="rounded-lg border border-slate-200 px-4 py-2 text-[13px] text-slate-500" @click="confirmingOrderId = ''">取消</button>
          <button data-testid="submit-confirm-offline" class="rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white" @click="submitConfirmOffline">确认到账并开通</button>
        </div>
      </div>
    </div>
  </div>
</template>
