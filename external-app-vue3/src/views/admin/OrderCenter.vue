<script lang="ts">
export interface UnifiedOrderRow {
  id: string
  rowKind: 'order' | 'space_intent' | 'space_mirror'
  orderCategory: 'intent' | 'order'
  resourceOrigin: ProductOrigin
  ownerType: 'personal' | 'enterprise'
  ownerId: string
  operatorMemberId?: string
  productId: string
  productName: string
  productType?: string
  planSummary?: string
  purchaseDuration: string
  amount: number
  currency: string
  status: string
  spaceIntentOpsStatus?: string
  spaceIntentId?: string
  createdAt: string
  paidAt?: string
  expiresAt?: string
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { buyerEnterpriseName, operatorContactText } from '@/domain/opsPurchaseParty'
import { formatOrderTime, normalOrderStatusOf, productTypeLabels } from '@/domain/myCenter'
import { orderExpiryText } from '@/domain/orderExpiry'
import { originMeta } from '@/utils/productMeta'
import type { ProductOrigin, ProductType } from '@/types/domain'
import type { SpaceIntentOrder } from '@/types/spaceIntent'

const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const purchases = useTrustedSpacePurchaseStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const spaceIntents = useSpaceIntentStore()
const catalog = useCatalogStore()

const filterOrigin = ref<ProductOrigin | ''>('')
const filterOwner = ref('')
const keyword = ref('')
const filterStatus = ref('')
const reconcilingId = ref('')
const manualOrderId = ref('')
const manualOrderAction = ref<'pay' | 'cancel' | ''>('')
const manualOrderNote = ref('')
const intentActionId = ref('')
const intentAction = ref<'effect' | 'close' | ''>('')
const intentActionNote = ref('')
const intentError = ref('')

function spaceIntentRow(intent: SpaceIntentOrder): UnifiedOrderRow {
  const product = catalog.byId(intent.productId)
  return {
    id: intent.id,
    rowKind: 'space_intent',
    orderCategory: 'intent',
    resourceOrigin: product?.origin ?? 'trusted_space',
    ownerType: intent.enterpriseId ? 'enterprise' : 'personal',
    ownerId: intent.enterpriseId ?? intent.ownerMemberId,
    operatorMemberId: intent.ownerMemberId,
    productId: intent.productId,
    productName: product?.name ?? intent.productId,
    productType: intent.productType,
    purchaseDuration: '—',
    amount: product?.datasetOffers?.[0]?.price ?? 0,
    currency: 'CNY',
    status: intent.opsStatus,
    spaceIntentOpsStatus: intent.opsStatus,
    createdAt: intent.createdAt
  }
}

const unifiedOrders = computed<UnifiedOrderRow[]>(() => [
  ...spaceIntents.list.map(spaceIntentRow),
  ...orders.list.map((order) => ({
    id: order.id,
    rowKind: 'order' as const,
    orderCategory: 'order' as const,
    resourceOrigin: catalog.byId(order.productId)?.origin ?? 'app_content',
    ownerType: order.ownerType,
    ownerId: order.ownerId,
    operatorMemberId: order.operatorMemberId,
    productId: order.productId,
    productName: order.productName,
    productType: order.productType || catalog.byId(order.productId)?.type,
    purchaseDuration: order.selectedTermMonths ? `${order.selectedTermMonths} 个月` : '—',
    amount: order.amount,
    currency: 'CNY',
    status: normalOrderStatusOf(order.status),
    spaceIntentId: order.spaceIntentId,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    expiresAt: orderExpiryText({
      order,
      product: catalog.byId(order.productId),
      entitlements: entitlements.list,
      memberExpiresAt: order.ownerId === user.context.currentMemberId ? user.context.memberExpiresAt : undefined,
      enterpriseExpiresAt: order.ownerId === user.enterprise.id ? user.enterprise.expiresAt : undefined
    })
  })),
  ...spaceOrders.mirrors.map((mirror) => ({
    id: mirror.spaceOrderId,
    rowKind: 'space_mirror' as const,
    orderCategory: 'order' as const,
    resourceOrigin: 'trusted_space' as const,
    ownerType: 'enterprise' as const,
    ownerId: mirror.appEnterpriseId,
    operatorMemberId: mirror.operatorMemberId,
    productId: mirror.appProductId,
    productName: mirror.productName,
    productType: catalog.byId(mirror.appProductId)?.type,
    purchaseDuration: '—',
    amount: mirror.amount,
    currency: mirror.currency,
    status: mirror.displayStatus,
    createdAt: mirror.spaceUpdatedAt,
  })),
])

const list = computed(() => {
  let items = [...unifiedOrders.value]
  if (filterOrigin.value) items = items.filter((order) => order.resourceOrigin === filterOrigin.value)
  if (filterOwner.value) items = items.filter((order) => order.ownerType === filterOwner.value)
  if (filterStatus.value) {
    items = items.filter((order) => {
      return order.status === filterStatus.value
    })
  }
  if (keyword.value.trim()) {
    const query = keyword.value.trim().toLowerCase()
    items = items.filter((order) =>
      order.productName.toLowerCase().includes(query)
      || order.id.toLowerCase().includes(query)
      || buyerName(order).toLowerCase().includes(query)
      || operatorContact(order).toLowerCase().includes(query)
      || productTypeLabel(order.productType).toLowerCase().includes(query)
    )
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const manualOrder = computed(() => orders.list.find((item) => item.id === manualOrderId.value))
const selectedIntent = computed(() => spaceIntents.byId(intentActionId.value))

function startManualOrder(orderId: string, action: 'pay' | 'cancel') {
  manualOrderId.value = orderId
  manualOrderAction.value = action
  manualOrderNote.value = ''
  intentError.value = ''
}

function closeManualOrder() {
  manualOrderId.value = ''
  manualOrderAction.value = ''
  manualOrderNote.value = ''
}

function submitManualOrder() {
  if (!manualOrderId.value) return
  if (!manualOrderNote.value.trim()) {
    intentError.value = manualOrderAction.value === 'pay' ? '请填写到账依据或处理说明' : '请填写取消原因'
    return
  }
  try {
    if (manualOrderAction.value === 'pay') orders.manualConfirmPayment(manualOrderId.value, manualOrderNote.value)
    if (manualOrderAction.value === 'cancel') orders.manualCancel(manualOrderId.value, manualOrderNote.value)
    closeManualOrder()
  } catch (e) {
    intentError.value = (e as Error).message
  }
}

function startIntentAction(id: string, action: 'effect' | 'close') {
  intentActionId.value = id
  intentAction.value = action
  intentActionNote.value = ''
  intentError.value = ''
}

function closeIntentAction() {
  intentActionId.value = ''
  intentAction.value = ''
  intentActionNote.value = ''
}

function submitIntentAction() {
  if (!intentActionId.value) return
  if (!intentActionNote.value.trim()) {
    intentError.value = intentAction.value === 'effect' ? '请填写处理说明' : '请填写关闭原因'
    return
  }
  runIntentAction(intentActionId.value, () => {
    if (intentAction.value === 'effect') spaceIntents.effect(intentActionId.value, intentActionNote.value)
    if (intentAction.value === 'close') spaceIntents.close(intentActionId.value, intentActionNote.value)
    closeIntentAction()
  })
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

function buyerName(row: UnifiedOrderRow): string {
  if (row.rowKind === 'space_intent') {
    const intent = spaceIntents.byId(row.id)
    return buyerEnterpriseName({
      enterpriseId: intent?.enterpriseId,
      requestedEnterpriseName: intent?.requestedEnterpriseName
    }, user.enterprise)
  }
  return buyerEnterpriseName({
    ownerType: row.ownerType,
    enterpriseId: row.ownerType === 'enterprise' ? row.ownerId : undefined
  }, user.enterprise)
}

function operatorContact(row: UnifiedOrderRow): string {
  if (row.rowKind === 'space_intent') {
    const intent = spaceIntents.byId(row.id)
    return operatorContactText({
      contactName: intent?.contactName,
      contactPhone: intent?.contactPhone,
      operatorMemberId: row.operatorMemberId,
      personalOwnerId: row.ownerType === 'personal' ? row.ownerId : undefined
    }, user.enterprise)
  }
  const linkedIntentId = orders.list.find((item) => item.id === row.id)?.spaceIntentId
  const submitted = linkedIntentId ? spaceIntents.byId(linkedIntentId) : undefined
  return operatorContactText({
    contactName: submitted?.contactName,
    contactPhone: submitted?.contactPhone,
    operatorMemberId: row.operatorMemberId,
    personalOwnerId: row.ownerType === 'personal' ? row.ownerId : undefined
  }, user.enterprise)
}

function resourceOriginLabel(row: UnifiedOrderRow): string {
  return originMeta[row.resourceOrigin]
}

function statusBadgeDict(row: UnifiedOrderRow): string {
  if (row.rowKind === 'space_intent') return 'spaceIntentOrder'
  if (row.rowKind === 'space_mirror') return 'spaceOrder'
  return 'appOrder'
}

function runIntentAction(id: string, fn: () => void) {
  intentError.value = ''
  try {
    fn()
  } catch (e) {
    intentError.value = (e as Error).message
  }
}

function claimIntent(id: string) {
  runIntentAction(id, () => {
    spaceIntents.claim(id, user.enterprise.id)
  })
}

function canClaimIntent(row: UnifiedOrderRow): boolean {
  return row.rowKind === 'space_intent' && row.spaceIntentOpsStatus === 'unclaimed'
}

function canEffectIntent(row: UnifiedOrderRow): boolean {
  return row.rowKind === 'space_intent' && row.spaceIntentOpsStatus === 'processing'
}

function canCloseIntent(row: UnifiedOrderRow): boolean {
  return row.rowKind === 'space_intent'
    && (row.spaceIntentOpsStatus === 'unclaimed' || row.spaceIntentOpsStatus === 'processing')
}

function isPendingNormalOrder(row: UnifiedOrderRow): boolean {
  return row.rowKind === 'order' && row.status === 'pending_payment'
}

function productTypeLabel(type?: string): string {
  if (type && type in productTypeLabels) return productTypeLabels[type as ProductType]
  return '—'
}

function orderCategoryLabel(category: UnifiedOrderRow['orderCategory']): string {
  return category === 'intent' ? '意向单' : '订单'
}
</script>

<template>
  <div>
    <PageHeader title="订单中心" desc="意向单独立流转、不涉及支付；普通订单支付完成即权益生效。" />

    <div v-if="intentError" data-testid="intent-error" class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{{ intentError }}</div>

    <div class="mb-3 flex flex-wrap gap-2">
      <select v-model="filterOrigin" data-testid="filter-origin" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部资源来源</option>
        <option value="asset_platform">资产平台</option>
        <option value="app_content">APP 自有内容</option>
        <option value="trusted_space">可信空间</option>
        <option value="user_created">用户创建</option>
        <option value="seller_market">入驻商家</option>
      </select>
      <select v-model="filterOwner" data-testid="filter-owner" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部客户</option>
        <option value="personal">个人</option>
        <option value="enterprise">企业</option>
      </select>
      <select v-model="filterStatus" data-testid="filter-status" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部交易状态</option>
        <option value="unclaimed">待领取</option>
        <option value="processing">处理中</option>
        <option value="entitled">权益生效</option>
        <option value="closed">已关闭</option>
        <option value="pending_payment">待支付</option>
        <option value="paid">支付完成</option>
        <option value="cancelled">订单取消</option>
      </select>
      <input v-model="keyword" data-testid="filter-keyword" placeholder="商品名 / 订单号" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="min-w-[1320px] w-full text-left text-[13px] [&_th]:whitespace-nowrap">
        <thead class="text-xs text-slate-400"><tr><th class="px-3 py-2">商品</th><th class="px-3 py-2">类型</th><th class="px-3 py-2">资源来源</th><th class="px-3 py-2">购买企业</th><th class="px-3 py-2">经办人</th><th class="px-3 py-2">购买时长</th><th class="px-3 py-2">支付成功时间</th><th class="px-3 py-2">到期时间</th><th class="px-3 py-2">金额</th><th class="px-3 py-2">订单状态</th><th class="px-3 py-2">交易状态</th><th class="px-3 py-2">创建时间</th><th class="px-3 py-2">操作</th></tr></thead>
        <tbody>
          <tr
            v-for="order in list"
            :key="order.id"
            data-testid="order-row"
            :data-id="order.id"
            :data-row-kind="order.rowKind"
            class="border-t border-slate-100 hover:bg-slate-50"
          >
            <td class="px-3 py-2 text-slate-700"><div>{{ order.productName }}</div><div v-if="order.planSummary" class="text-[10px] text-slate-400">{{ order.planSummary }}</div></td>
            <td class="px-3 py-2 text-slate-600" data-testid="product-type">{{ productTypeLabel(order.productType) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-500" data-testid="resource-origin">{{ resourceOriginLabel(order) }}</td>
            <td class="px-3 py-2 text-slate-700" data-testid="buyer-enterprise">{{ buyerName(order) }}</td>
            <td class="px-3 py-2 text-slate-600" data-testid="operator-contact">{{ operatorContact(order) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-500" data-testid="purchase-duration">{{ order.purchaseDuration }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-500" data-testid="paid-at">{{ formatOrderTime(order.paidAt) }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-600" data-testid="order-expiry">{{ order.expiresAt || '—' }}</td>
            <td class="px-3 py-2 text-slate-500">{{ order.rowKind === 'space_intent' && !order.amount ? '待报价' : `${order.currency === 'CNY' ? '¥' : `${order.currency} `}${order.amount}` }}</td>
            <td class="whitespace-nowrap px-3 py-2 text-slate-600" data-testid="order-category">{{ orderCategoryLabel(order.orderCategory) }}</td>
            <td class="px-3 py-2"><StatusBadge :dict="statusBadgeDict(order)" :value="order.status" /></td>
            <td class="px-3 py-2 text-slate-400">{{ order.createdAt }}</td>
            <td class="px-3 py-2" @click.stop>
              <template v-if="order.rowKind === 'space_intent'">
                <button v-if="canClaimIntent(order)" class="mr-2 text-brand-600 hover:underline" data-testid="claim-intent" @click="claimIntent(order.id)">领取</button>
                <button v-if="canEffectIntent(order)" class="mr-2 text-emerald-600 hover:underline" data-testid="effect-intent" @click="startIntentAction(order.id, 'effect')">确认权益生效</button>
                <button v-if="canCloseIntent(order)" class="mr-2 text-slate-500 hover:underline" data-testid="close-intent" @click="startIntentAction(order.id, 'close')">关闭</button>
                <span v-if="!canClaimIntent(order) && !canEffectIntent(order) && !canCloseIntent(order)" class="text-slate-400">—</span>
              </template>
              <template v-else-if="order.rowKind === 'order'">
                <button v-if="isPendingNormalOrder(order)" class="mr-2 text-emerald-600 hover:underline" data-testid="manual-pay-success" @click="startManualOrder(order.id, 'pay')">人工确认支付成功</button>
                <button v-if="isPendingNormalOrder(order)" class="text-slate-500 hover:underline" data-testid="manual-cancel-order" @click="startManualOrder(order.id, 'cancel')">取消订单</button>
                <span v-if="!isPendingNormalOrder(order)" class="text-slate-400">—</span>
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
    <div v-if="selectedIntent" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" data-testid="intent-action-modal">
      <div class="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="text-[15px] font-semibold text-slate-900">{{ intentAction === 'effect' ? '确认权益生效' : '关闭意向单' }}</div>
        <div class="mt-3 text-[13px] text-slate-500">意向单 {{ selectedIntent.id }} · {{ catalog.byId(selectedIntent.productId)?.name || selectedIntent.productId }}</div>
        <p class="mt-2 text-[12px] text-slate-400">{{ intentAction === 'effect' ? '确认后权益立即生效，意向单流程结束。' : '确认后意向单关闭，不再继续处理。' }}</p>
        <textarea v-model="intentActionNote" data-testid="intent-action-note" :placeholder="intentAction === 'effect' ? '处理说明（必填）' : '关闭原因（必填）'" class="mt-4 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-[13px] text-slate-500" @click="closeIntentAction">返回</button>
          <button data-testid="submit-intent-action" class="rounded-lg px-4 py-2 text-[13px] font-medium text-white" :class="intentAction === 'effect' ? 'bg-emerald-600' : 'bg-slate-600'" @click="submitIntentAction">确认</button>
        </div>
      </div>
    </div>
    <div v-if="manualOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" data-testid="manual-order-modal">
      <div class="w-[420px] rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div class="text-[15px] font-semibold text-slate-900">{{ manualOrderAction === 'pay' ? '人工确认支付成功' : '取消订单' }}</div>
        <div class="mt-3 text-[13px] text-slate-500">订单 {{ manualOrder.id }} · {{ manualOrder.productName }} · ¥{{ manualOrder.amount.toLocaleString() }}</div>
        <p class="mt-2 text-[12px] text-slate-400">{{ manualOrderAction === 'pay' ? '确认后订单将支付完成并立即生效。' : '确认后订单将关闭，不能继续支付。' }}</p>
        <textarea v-model="manualOrderNote" data-testid="manual-order-note" :placeholder="manualOrderAction === 'pay' ? '到账依据或处理说明（必填）' : '取消原因（必填）'" class="mt-4 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]" />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-[13px] text-slate-500" @click="closeManualOrder">返回</button>
          <button data-testid="submit-manual-order" class="rounded-lg px-4 py-2 text-[13px] font-medium text-white" :class="manualOrderAction === 'pay' ? 'bg-emerald-600' : 'bg-slate-600'" @click="submitManualOrder">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>
