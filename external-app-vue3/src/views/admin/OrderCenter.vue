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
  operationNote?: string
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IconClose } from '@arco-design/web-vue/es/icon'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useOrderStore } from '@/stores/orders'
import { useSpaceOrderStore } from '@/stores/spaceOrders'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useEntitlementStore } from '@/stores/entitlements'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useAdminOrderHistoryStore } from '@/stores/adminOrderHistory'
import { buyerEnterpriseName, operatorContactText } from '@/domain/opsPurchaseParty'
import { formatOrderTime, normalOrderStatusOf, productTypeLabels } from '@/domain/myCenter'
import { orderExpiryText } from '@/domain/orderExpiry'
import { originMeta } from '@/utils/productMeta'
import type { ProductOrigin, ProductType } from '@/types/domain'
import type { SpaceIntentOperation, SpaceIntentOrder } from '@/types/spaceIntent'

const orders = useOrderStore()
const spaceOrders = useSpaceOrderStore()
const purchases = useTrustedSpacePurchaseStore()
const entitlements = useEntitlementStore()
const user = useUserStore()
const spaceIntents = useSpaceIntentStore()
const catalog = useCatalogStore()
const history = useAdminOrderHistoryStore()
watch(() => orders.list.slice(), (items) => items.forEach((order) => history.captureLegacy(order)), { immediate: true })

const filterOrigin = ref<ProductOrigin | ''>('')
const filterEnterpriseName = ref('')
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
const detailIntentId = ref('')
const detailIntent = computed(() => spaceIntents.byId(detailIntentId.value))

function legacyIntentOperations(intent: SpaceIntentOrder): SpaceIntentOperation[] {
  const operations: SpaceIntentOperation[] = [{
    id: `legacy-${intent.id}-submitted`, action: 'submitted', label: '意向单创建',
    actor: '未记录（历史数据）', note: intent.scenario, createdAt: intent.createdAt
  }]
  if (intent.opsStatus !== 'unclaimed') {
    const current = intent.opsStatus === 'processing'
      ? { action: 'claimed' as const, label: '运营领取', note: '处理人未记录' }
      : intent.opsStatus === 'entitled'
        ? { action: 'entitled' as const, label: '权益生效', note: intent.processNote || '' }
        : { action: 'closed' as const, label: '意向单关闭', note: intent.closeReason || '' }
    operations.push({ id: `legacy-${intent.id}-${current.action}`, ...current, actor: '未记录（历史数据）', createdAt: intent.updatedAt })
  }
  return operations
}

const intentTimeline = computed(() => {
  const intent = detailIntent.value
  if (!intent) return []
  return intent.operations?.length ? intent.operations : legacyIntentOperations(intent)
})

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
    createdAt: intent.createdAt,
    operationNote: intent.closeReason || intent.processNote
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
    status: ['cancelled', 'payment_cancelled'].includes(order.status)
      ? order.terminationKind ?? normalOrderStatusOf(order.status)
      : normalOrderStatusOf(order.status),
    spaceIntentId: order.spaceIntentId,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    operationNote: history.forOrder(order.id).filter((event) => event.keyOperation).slice(-1)[0]?.note,
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
  if (filterOrigin.value) items = items.filter((order) => filterOrigin.value === 'app_content'
    ? order.resourceOrigin === 'app_content' || order.resourceOrigin === 'asset_platform'
    : order.resourceOrigin === filterOrigin.value)
  if (filterEnterpriseName.value.trim()) {
    const name = filterEnterpriseName.value.trim().toLowerCase()
    items = items.filter(order => order.ownerType === 'enterprise'
      && buyerName(order) !== order.ownerId && buyerName(order).toLowerCase().includes(name))
  }
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
  intentError.value = ''
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
  if (['processing', 'entitled', 'closed'].includes(row.status)) return 'spaceIntentOrder'
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

function operationTime(value?: string): string {
  if (!value) return '时间未记录'
  if (!value.includes('T')) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date) + '（北京时间）'
}
</script>

<template>
  <div>
    <PageHeader title="订单中心" desc="意向单独立流转，不涉及支付；交易状态与实际权益分别记录。" />

    <div v-if="intentError" data-testid="intent-error" class="mb-3 rounded-md bg-danger-50 px-3 py-2 text-[12px] text-danger-600">{{ intentError }}</div>

    <div class="ui-card mb-3 flex flex-wrap items-center gap-2 p-3">
      <select v-model="filterOrigin" data-testid="filter-origin" class="ui-field w-32 cursor-pointer pr-7">
        <option value="">全部资源来源</option>
        <option value="app_content">自营产品</option>
        <option value="trusted_space">可信空间</option>
        <option value="seller_market">入驻商家</option>
      </select>
      <div class="relative">
        <input v-model="filterEnterpriseName" data-testid="filter-enterprise-name" aria-label="购买企业名称" placeholder="购买企业名称" class="ui-field w-52 pr-8" />
        <button v-if="filterEnterpriseName" data-testid="clear-enterprise-name" aria-label="清空购买企业名称" title="清空购买企业名称" class="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400" @click="filterEnterpriseName = ''"><IconClose /></button>
      </div>
      <select v-model="filterStatus" data-testid="filter-status" class="ui-field w-28 cursor-pointer pr-7">
        <option value="">全部交易状态</option>
        <option value="unclaimed">待领取</option>
        <option value="processing">处理中</option>
        <option value="entitled">权益生效</option>
        <option value="closed">已关闭</option>
        <option value="pending_payment">待支付</option>
        <option value="paid">支付完成</option>
        <option value="cancelled">订单取消</option>
        <option value="refunded">已退款</option>
      </select>
      <div class="relative">
        <svg class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.8-3.8" /></svg>
        <input v-model="keyword" data-testid="filter-keyword" placeholder="商品名 / 订单号 / 经办人" class="ui-field w-64 pl-8" />
      </div>
    </div>

    <div class="ui-card overflow-x-auto">
      <table class="min-w-[1320px] w-full text-left text-[13px] [&_th]:whitespace-nowrap">
        <thead class="bg-ink-100 text-xs font-normal text-ink-500"><tr><th class="px-3 py-2.5">商品</th><th class="px-3 py-2.5">类型</th><th class="px-3 py-2.5">资源来源</th><th class="px-3 py-2.5">购买企业</th><th class="px-3 py-2.5">经办人</th><th class="px-3 py-2.5">购买时长</th><th class="px-3 py-2.5">支付成功时间</th><th class="px-3 py-2.5">到期时间</th><th class="px-3 py-2.5">金额</th><th class="px-3 py-2.5">订单状态</th><th class="px-3 py-2.5">交易状态</th><th class="px-3 py-2.5">创建时间</th><th class="px-3 py-2.5">操作说明</th><th class="px-3 py-2.5">操作</th></tr></thead>
        <tbody>
          <tr
            v-for="order in list"
            :key="order.id"
            data-testid="order-row"
            :data-id="order.id"
            :data-row-kind="order.rowKind"
            class="border-t border-ink-200 transition-colors hover:bg-ink-100"
          >
            <td class="px-3 py-2.5 text-ink-900"><div class="max-w-[220px] truncate font-medium">{{ order.productName }}</div><div v-if="order.planSummary" class="mt-0.5 text-[10px] text-ink-500">{{ order.planSummary }}</div></td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="product-type">{{ productTypeLabel(order.productType) }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="resource-origin">{{ resourceOriginLabel(order) }}</td>
            <td class="px-3 py-2.5 text-ink-900" data-testid="buyer-enterprise">{{ buyerName(order) }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="operator-contact">{{ operatorContact(order) }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="purchase-duration">{{ order.purchaseDuration }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="paid-at">{{ formatOrderTime(order.paidAt) }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-600" data-testid="order-expiry">{{ order.expiresAt || '—' }}</td>
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink-900">{{ order.rowKind === 'space_intent' && !order.amount ? '待报价' : `${order.currency === 'CNY' ? '¥' : `${order.currency} `}${order.amount}` }}</td>
            <td class="whitespace-nowrap px-3 py-2.5" data-testid="order-category">
              <span
                class="inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                :class="order.orderCategory === 'intent' ? 'bg-brand-50 text-brand-600' : 'bg-ink-200 text-ink-600'"
              >{{ orderCategoryLabel(order.orderCategory) }}</span>
            </td>
            <td class="px-3 py-2.5"><StatusBadge :dict="statusBadgeDict(order)" :value="order.status" /></td>
            <td class="whitespace-nowrap px-3 py-2.5 text-ink-500">{{ order.createdAt }}</td>
            <td class="max-w-[200px] px-3 py-2.5 text-ink-600" data-testid="operation-note"><span class="line-clamp-2" :title="order.operationNote || ''">{{ order.operationNote || '—' }}</span></td>
            <td class="whitespace-nowrap px-3 py-2.5" @click.stop>
              <template v-if="order.rowKind === 'space_intent'">
                <button class="mr-3 text-[13px] text-brand-600 transition hover:text-brand-700" data-testid="view-intent-detail" @click="detailIntentId = order.id">查看详情</button>
                <button v-if="canClaimIntent(order)" class="mr-3 text-[13px] text-brand-600 transition hover:text-brand-700" data-testid="claim-intent" @click="claimIntent(order.id)">领取</button>
                <button v-if="canEffectIntent(order)" class="mr-3 text-[13px] text-success-500 transition hover:text-success-600" data-testid="effect-intent" @click="startIntentAction(order.id, 'effect')">确认权益生效</button>
                <button v-if="canCloseIntent(order)" class="mr-3 text-[13px] text-ink-500 transition hover:text-ink-900" data-testid="close-intent" @click="startIntentAction(order.id, 'close')">关闭</button>
                <span v-if="!canClaimIntent(order) && !canEffectIntent(order) && !canCloseIntent(order)" class="text-ink-400">—</span>
              </template>
              <template v-else-if="order.rowKind === 'order'">
                <button v-if="isPendingNormalOrder(order)" class="mr-3 text-[13px] text-success-500 transition hover:text-success-600" data-testid="manual-pay-success" @click="startManualOrder(order.id, 'pay')">人工确认支付成功</button>
                <button v-if="isPendingNormalOrder(order)" class="text-[13px] text-ink-500 transition hover:text-danger-500" data-testid="manual-cancel-order" @click="startManualOrder(order.id, 'cancel')">取消订单</button>
              </template>
              <template v-else>
                <button v-if="reconciliationIntentId(order.id)" class="mr-3 text-[13px] text-brand-600 transition hover:text-brand-700 disabled:text-ink-400" data-testid="reconcile-space" :disabled="reconcilingId === order.id" @click="reconcile(order)">{{ reconcilingId === order.id ? '对账中…' : '主动对账' }}</button>
                <a v-if="spaceDetailUrl(order)" :href="spaceDetailUrl(order)" target="_blank" rel="noopener" class="text-[13px] text-ink-600 transition hover:text-brand-600">查看空间详情</a>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="py-12 text-center text-[12px] text-ink-500">暂无订单</div>
   </div>
    <div v-if="detailIntent" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4" data-testid="admin-intent-detail" @click.self="detailIntentId = ''">
      <div class="max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-lg bg-white p-5 shadow-float">
        <div class="flex items-start justify-between gap-3">
          <div><h2 class="text-base font-semibold text-ink-900">意向单详情</h2><p class="mt-1 text-xs text-ink-500">{{ detailIntent.id }}</p></div>
          <button class="text-sm text-ink-500 hover:text-ink-900" @click="detailIntentId = ''">关闭</button>
        </div>
        <div class="mt-4 border-b border-ink-100 pb-4 text-sm text-ink-800">{{ catalog.byId(detailIntent.productId)?.name || detailIntent.productId }}</div>
        <h3 class="mt-4 text-sm font-semibold text-ink-900">操作时间线</h3>
        <ol class="mt-3 space-y-3" data-testid="intent-operation-timeline">
          <li v-for="event in intentTimeline" :key="event.id" class="border-l-2 border-brand-200 pl-3 text-xs" data-testid="intent-operation-event">
            <div class="flex flex-wrap gap-x-2 gap-y-1 font-medium text-ink-800"><span>{{ event.label }}</span><time :datetime="event.createdAt" :title="event.createdAt" class="font-normal text-ink-500">{{ operationTime(event.createdAt) }}</time></div>
            <div class="mt-1 break-words text-ink-500">操作人：{{ event.actor }}</div>
            <div class="mt-1 whitespace-pre-wrap break-words text-ink-600">{{ event.note || '—' }}</div>
          </li>
        </ol>
      </div>
    </div>
    <div v-if="selectedIntent" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40" data-testid="intent-action-modal" @click.self="closeIntentAction">
      <div class="w-[420px] rounded-xl bg-white p-6 shadow-float">
        <div class="text-base font-semibold text-ink-900">{{ intentAction === 'effect' ? '确认权益生效' : '关闭意向单' }}</div>
        <div class="mt-3 text-[13px] text-ink-600">意向单 {{ selectedIntent.id }} · {{ catalog.byId(selectedIntent.productId)?.name || selectedIntent.productId }}</div>
        <p class="mt-2 text-[12px] text-ink-500">{{ intentAction === 'effect' ? '确认后权益立即生效，意向单流程结束。' : '确认后意向单关闭，不再继续处理。' }}</p>
        <textarea v-model="intentActionNote" data-testid="intent-action-note" :placeholder="intentAction === 'effect' ? '处理说明（必填）' : '关闭原因（必填）'" class="mt-4 min-h-24 w-full rounded-md border border-ink-300 px-3 py-2 text-[13px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-[13px] text-ink-600 transition hover:bg-ink-100" @click="closeIntentAction">返回</button>
          <button data-testid="submit-intent-action" class="rounded-md px-4 py-2 text-[13px] font-medium text-white transition" :class="intentAction === 'effect' ? 'bg-success-500 hover:bg-success-600' : 'bg-danger-500 hover:bg-danger-600'" @click="submitIntentAction">确认</button>
        </div>
      </div>
    </div>
    <div v-if="manualOrder" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40" data-testid="manual-order-modal" @click.self="closeManualOrder">
      <div class="w-[420px] rounded-xl bg-white p-6 shadow-float">
        <div class="text-base font-semibold text-ink-900">{{ manualOrderAction === 'pay' ? '人工确认支付成功' : '取消订单' }}</div>
        <div class="mt-3 text-[13px] text-ink-600">订单 {{ manualOrder.id }} · {{ manualOrder.productName }} · ¥{{ manualOrder.amount.toLocaleString() }}</div>
        <p class="mt-2 text-[12px] text-ink-500">{{ manualOrderAction === 'pay' ? '确认后订单将支付完成并立即生效。' : '确认后订单将取消，不能继续支付。' }}</p>
        <textarea v-model="manualOrderNote" data-testid="manual-order-note" :placeholder="manualOrderAction === 'pay' ? '到账依据或处理说明（必填）' : '取消原因（必填）'" class="mt-4 min-h-24 w-full rounded-md border border-ink-300 px-3 py-2 text-[13px] outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-[13px] text-ink-600 transition hover:bg-ink-100" @click="closeManualOrder">返回</button>
          <button data-testid="submit-manual-order" class="rounded-md px-4 py-2 text-[13px] font-medium text-white transition" :class="manualOrderAction === 'pay' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-danger-500 hover:bg-danger-600'" @click="submitManualOrder">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>
