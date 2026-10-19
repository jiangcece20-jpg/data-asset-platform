<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useSellerMarketStore, sellerListingSaleLabel as listingStatusText, sellerListingReviewLabel as reviewStatusText } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { listingChangeLabel } from '@/domain/salesListing'
import type { Order } from '@/types/domain'

const seller = useSellerMarketStore()
const catalog = useCatalogStore()
const orders = useOrderStore()
const tab = ref<'access' | 'listing' | 'orders'>('access')
const toast = ref('')
const expandedListingId = ref('')
const reviewChangeId = ref('')
const reviewChangeNote = ref('')
const reviewChangeError = ref('')
const reviewKind = ref<'terms' | 'restore'>('terms')
const reviewChangeListing = computed(() => seller.listings.find((item) => item.id === reviewChangeId.value))

const listingMode = ref('')
const sellerProducts = computed(() => catalog.products.filter((p) => p.origin === 'seller_market' && (!listingMode.value || p.lastListingChange?.mode === listingMode.value)))
const sellerOrders = computed(() =>
  orders.appOrders.filter((o) => Boolean(o.sellerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
)

function isHistoricalSellerOrder(order: Order): boolean {
  return order.status === 'pending_activation'
    || !seller.listings.some((listing) => listing.productId === order.productId && listing.servicePeriodMonths != null)
}

function flash(msg: string) {
  toast.value = msg
  window.setTimeout(() => { if (toast.value === msg) toast.value = '' }, 2500)
}

function approveAccess(id: string) {
  seller.decideAccess(id, 'approved', '运营审核通过（L1+L2）')
  flash('已通过卖家准入')
}
function rejectAccess(id: string) {
  seller.decideAccess(id, 'rejected', '材料不足，请补正后重提')
  flash('已驳回准入')
}
function suspendAccess(id: string) {
  seller.decideAccess(id, 'suspended', '准入暂停，在架商品已强制下架；恢复须审批')
  flash('已暂停卖家')
}
function approveListing(id: string) {
  try {
    seller.decideListing(id, 'published', '审过即发布')
    flash('上架审核通过并已发布')
  } catch (error) {
    flash(error instanceof Error ? error.message : '审核失败')
  }
}
function rejectListing(id: string) {
  seller.decideListing(id, 'rejected', '文案或合规摘要不完整')
  flash('已驳回上架')
}
function delist(productId: string) {
  if (!window.confirm('确认强制下架？商家将不能自行恢复。')) return
  seller.forceDelist(productId, '运营强制下架')
  flash('已强制下架')
}
function restore(productId: string) {
  if (!window.confirm('提交恢复上架申请？审批通过后恢复原商品，历史订单保持不变。')) return
  try {
    seller.restoreListing(productId)
    flash('恢复申请已提交，商品仍保持下架')
  } catch (error) {
    flash(error instanceof Error ? error.message : '恢复失败')
  }
}
function reviewChange(id: string, kind: 'terms' | 'restore' = 'terms') {
  reviewKind.value = kind
  reviewChangeId.value = id
  reviewChangeNote.value = ''
  reviewChangeError.value = ''
}
function decideChange(approved: boolean) {
  try {
    if (reviewKind.value === 'restore') seller.reviewListingRestore(reviewChangeId.value, approved, reviewChangeNote.value)
    else seller.reviewListingTerms(reviewChangeId.value, approved, reviewChangeNote.value)
    reviewChangeId.value = ''
    flash(reviewKind.value === 'restore' ? (approved ? '审批通过，原商品已恢复上架' : '恢复申请已驳回，商品仍保持下架') : (approved ? '变更已通过，仅影响新订单' : '变更已驳回，商家可修改后重提'))
  } catch (error) {
    reviewChangeError.value = error instanceof Error ? error.message : '审核失败'
  }
}
function adminConfirm(orderId: string) {
  try {
    const order = seller.adminConfirmSellerPayment(orderId)
    flash(order.status === 'entitlement_active' ? '已确认平台到账并立即自动交付' : '已确认平台到账，历史存量订单待开通')
  } catch (e) {
    flash(e instanceof Error ? e.message : '操作失败')
  }
}
function adminActivate(orderId: string) {
  try {
    seller.adminActivateSellerOrder(orderId)
    flash('已开通数据集查看')
  } catch (e) {
    flash(e instanceof Error ? e.message : '操作失败')
  }
}

const ACCESS_STATUS: Record<string, { text: string; cls: string }> = {
  pending_review: { text: '待审核', cls: 'bg-warning-50 text-warning-600' },
  need_supplement: { text: '待补充材料', cls: 'bg-warning-50 text-warning-600' },
  approved: { text: '已通过', cls: 'bg-success-50 text-success-600' },
  rejected: { text: '已驳回', cls: 'bg-ink-100 text-ink-600' },
  suspended: { text: '已暂停', cls: 'bg-danger-50 text-danger-600' }
}
function accessStatusText(s: string) { return ACCESS_STATUS[s]?.text ?? s }
function accessStatusClass(s: string) { return ACCESS_STATUS[s]?.cls ?? 'bg-ink-100 text-ink-600' }

function listingStatusClass(status: string) {
  if (status === 'published') return 'bg-success-50 text-success-600'
  if (['pending_review', 'need_supplement', 'paused'].includes(status)) return 'bg-warning-50 text-warning-600'
  return 'bg-ink-100 text-ink-600'
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="p-6">
    <PageHeader title="入驻商家" desc="资质合规审 · 上架审 · 新数据集付款成功后立即自动交付" />

    <!-- 浮动提示 -->
    <transition name="fade">
      <div v-if="toast" class="fixed right-6 top-6 z-50 rounded-lg bg-ink-900 px-4 py-2.5 text-sm text-white shadow-float">{{ toast }}</div>
    </transition>

    <div class="mb-4 inline-flex rounded-lg bg-ink-100 p-1">
      <button
        v-for="item in [
          { id: 'access', label: '准入审核', count: seller.pendingAccess.length },
          { id: 'listing', label: '上架审核', count: seller.pendingListings.length + seller.listings.filter(l => l.reviewStatus === 'change_pending' || l.restoreReview?.status === 'pending_review').length },
          { id: 'orders', label: '商家订单', count: sellerOrders.filter(o => o.status === 'pending_payment' || o.status === 'pending_activation' || o.status === 'payment_pending_confirmation').length }
        ]"
        :key="item.id"
        :data-testid="`seller-admin-tab-${item.id}`"
        class="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm transition"
        :class="tab === item.id ? 'bg-white font-medium text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'"
        @click="tab = item.id as typeof tab"
      >
        {{ item.label }}
        <span v-if="item.count" class="rounded-full px-1.5 py-px text-[11px] leading-4" :class="tab === item.id ? 'bg-brand-50 text-brand-600' : 'bg-ink-200 text-ink-600'">{{ item.count }}</span>
      </button>
    </div>

    <section v-if="tab === 'access'" class="ui-card overflow-hidden">
      <table class="min-w-full text-sm">
        <thead class="bg-ink-100 text-left text-xs text-ink-500">
          <tr>
            <th class="px-4 py-3 font-medium">卖家</th>
            <th class="px-4 py-3 font-medium">主体</th>
            <th class="px-4 py-3 font-medium">收款</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in seller.profiles" :key="p.id" class="border-t border-ink-100 transition hover:bg-ink-100/60">
            <td class="px-4 py-3">
              <div class="font-medium text-ink-900">{{ p.displayName }}</div>
              <div class="text-xs text-ink-500">{{ p.id }}</div>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ p.subjectType }} · {{ p.compliance.realName }}</td>
            <td class="px-4 py-3 text-ink-600">{{ p.compliance.payoutBank }} {{ p.compliance.payoutAccountMasked }}</td>
            <td class="px-4 py-3"><span class="rounded px-2 py-0.5 text-xs" :class="accessStatusClass(p.status)">{{ accessStatusText(p.status) }}</span></td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap items-center gap-3 text-xs">
                <button v-if="p.status === 'pending_review' || p.status === 'need_supplement'" class="font-medium text-brand-600 hover:text-brand-700" @click="approveAccess(p.id)">通过</button>
                <button v-if="p.status === 'pending_review'" class="text-ink-500 hover:text-ink-700" @click="rejectAccess(p.id)">驳回</button>
                <button v-if="p.status === 'approved'" class="text-danger-600 hover:text-danger-500" @click="suspendAccess(p.id)">暂停</button>
                <span v-if="p.status !== 'pending_review' && p.status !== 'need_supplement' && p.status !== 'approved'" class="text-ink-400">—</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="tab === 'listing'" class="space-y-4">
      <div class="ui-card overflow-x-auto">
        <div class="border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-900">上架申请队列</div>
        <table class="min-w-full text-sm">
          <thead class="bg-ink-100 text-left text-xs text-ink-500">
            <tr>
              <th class="px-4 py-3 font-medium">商品</th>
              <th class="px-4 py-3 font-medium">卖家</th>
              <th class="px-4 py-3 font-medium">对象版本</th>
              <th class="px-4 py-3 font-medium">企业售价 / 服务周期</th>
              <th class="whitespace-nowrap px-4 py-3 font-medium" data-testid="approval-state-heading">审批状态</th>
              <th class="whitespace-nowrap px-4 py-3 font-medium" data-testid="listing-state-heading">上下架状态</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="l in seller.listings" :key="l.id">
              <tr class="border-t border-ink-100 transition hover:bg-ink-100/60">
                <td class="px-4 py-3">
                  <div class="font-medium text-ink-900">{{ l.title }}</div>
                  <div class="text-xs text-ink-500">{{ l.complianceSummary }}</div>
                </td>
                <td class="px-4 py-3 text-ink-600">{{ l.sellerName }}</td>
                <td class="px-4 py-3 text-ink-600">{{ l.artifactId }} @ {{ l.artifactVersion }}</td>
                <td class="px-4 py-3 text-ink-900">¥{{ l.enterprisePrice }} / {{ l.servicePeriodMonths || 12 }}个月</td>
                <td :data-testid="`listing-review-${l.id}`" class="px-4 py-3 text-xs text-ink-600">{{ reviewStatusText(l) }}</td>
                <td :data-testid="`listing-state-${l.id}`" class="px-4 py-3"><span class="rounded px-2 py-0.5 text-xs" :class="listingStatusClass(l.listingStatus ?? l.status)">{{ listingStatusText(l) }}</span></td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-3 text-xs">
                    <button
                      class="text-ink-600 hover:text-brand-600"
                      :data-testid="`listing-shots-toggle-${l.id}`"
                      @click="expandedListingId = expandedListingId === l.id ? '' : l.id"
                    >{{ expandedListingId === l.id ? '收起内容' : '查看上架内容' }}</button>
                    <button v-if="l.status === 'pending_review'" class="font-medium text-brand-600 hover:text-brand-700" @click="approveListing(l.id)">通过并发布</button>
                    <button v-if="l.status === 'pending_review'" class="text-ink-500 hover:text-ink-700" @click="rejectListing(l.id)">驳回</button>
                    <button v-if="l.reviewStatus === 'change_pending'" :data-testid="`review-change-${l.id}`" class="font-medium text-brand-600 hover:text-brand-700" @click="reviewChange(l.id)">审核变更</button>
                    <button v-if="l.restoreReview?.status === 'pending_review'" :data-testid="`review-restore-${l.id}`" class="font-medium text-brand-600 hover:text-brand-700" @click="reviewChange(l.id, 'restore')">审批恢复上架</button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedListingId === l.id" class="border-t border-ink-100 bg-ink-100/60">
                <td colspan="7" class="px-4 py-4">
                  <div v-if="l.catalogSpec" class="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs text-ink-600" data-testid="listing-catalog-spec">
                    <div>数据粒度：{{ l.catalogSpec.granularity || '—' }}</div>
                    <div>时间范围：{{ l.catalogSpec.timeRange || '—' }}</div>
                    <div>数据行数：{{ l.catalogSpec.rowCount ?? '—' }}</div>
                    <div>字段数：{{ l.catalogSpec.fields.length }}</div>
                    <div>地域范围：{{ l.catalogSpec.coverage }}</div>
                    <div>更新频率：{{ l.catalogSpec.updateFrequency }}</div>
                    <div>服务周期：{{ l.servicePeriodMonths || 12 }}个月</div>
                    <div class="col-span-2">应用场景：{{ l.catalogSpec.scenarios.join('、') }}</div>
                    <div class="col-span-2">价值主张：{{ l.catalogSpec.valueProposition }}</div>
                    <div class="col-span-2">详细描述：{{ l.catalogSpec.description }}</div>
                    <div class="col-span-2">质量承诺：{{ l.catalogSpec.qualityPromise }}</div>
                    <div class="col-span-2">企业售价：¥{{ l.enterprisePrice }}</div>
                    <div v-if="l.pendingTerms" class="col-span-2 text-brand-600">待审：¥{{ l.pendingTerms.enterprisePrice }} / {{ l.pendingTerms.servicePeriodMonths }}个月 / {{ l.pendingTerms.updateFrequency }} / {{ l.pendingTerms.coverage }}</div>
                    <div class="col-span-2">合规声明：{{ l.catalogSpec.complianceNote }}</div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 text-sm font-semibold text-ink-900">入驻商家商品
          <label class="flex items-center gap-2 font-normal">上下架方式
            <select v-model="listingMode" aria-label="上下架方式" class="rounded border border-ink-200 px-2 py-1">
              <option value="">全部方式</option><option value="manual">人工</option><option value="system">系统</option>
            </select>
          </label>
        </div>
        <table class="min-w-full text-sm">
          <thead class="bg-ink-100 text-left text-xs text-ink-500">
            <tr>
              <th class="px-4 py-3 font-medium">商品</th>
              <th class="px-4 py-3 font-medium">卖家</th>
              <th class="px-4 py-3 font-medium">来源声明</th>
              <th class="px-4 py-3 font-medium">上下架状态</th>
              <th class="px-4 py-3 font-medium">最近上下架</th>
              <th class="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in sellerProducts" :key="p.id" class="border-t border-ink-100 transition hover:bg-ink-100/60">
              <td class="px-4 py-3 font-medium text-ink-900">{{ p.name }}</td>
              <td class="px-4 py-3 text-ink-600">{{ p.sellerName }}</td>
              <td class="px-4 py-3 text-ink-600">{{ p.dataProvenance === 'derived' ? '已购衍生' : '自有' }}</td>
              <td class="px-4 py-3 text-ink-600">{{ listingStatusText(p.availability) }}</td>
              <td class="px-4 py-3 text-ink-600">{{ listingChangeLabel(p) }}</td>
              <td class="px-4 py-3 text-xs">
                <button v-if="p.availability === 'published'" class="text-danger-600 hover:text-danger-500" @click="delist(p.id)">强制下架</button>
                <span v-else-if="seller.listings.find(l => l.productId === p.id)?.restoreReview?.status === 'pending_review'" class="text-ink-500">恢复申请审批中</span>
                <button v-else-if="p.availability === 'delisted'" class="text-brand-600" @click="restore(p.id)">发起恢复审批</button>
                <span v-else class="text-ink-400">—</span>
              </td>
            </tr>
            <tr v-if="!sellerProducts.length"><td colspan="6" class="px-4 py-8 text-center text-ink-500">暂无符合条件的商品</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="ui-card overflow-hidden">
      <table class="min-w-full text-sm">
        <thead class="bg-ink-100 text-left text-xs text-ink-500">
          <tr>
            <th class="px-4 py-3 font-medium">订单</th>
            <th class="px-4 py-3 font-medium">商品</th>
            <th class="px-4 py-3 font-medium">金额</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in sellerOrders" :key="o.id" class="border-t border-ink-100 transition hover:bg-ink-100/60">
            <td class="px-4 py-3">
              <div class="font-medium text-ink-900">{{ o.id }}</div>
              <div class="text-xs text-ink-500">买家 {{ o.ownerId }} · 卖家 {{ o.sellerId }}</div>
              <div v-if="isHistoricalSellerOrder(o)" class="mt-1 text-xs text-ink-500">历史存量订单</div>
            </td>
            <td class="px-4 py-3 text-ink-600">{{ o.productName }}</td>
            <td class="px-4 py-3 font-medium text-ink-900">¥{{ o.amount }}</td>
            <td class="px-4 py-3">
              <span v-if="o.status === 'pending_activation'" class="rounded bg-warning-50 px-2 py-0.5 text-xs text-warning-600">待开通</span>
              <span v-else-if="o.status === 'pending_payment'" class="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">待支付</span>
              <span v-else-if="o.status === 'entitlement_active'" class="rounded bg-success-50 px-2 py-0.5 text-xs text-success-600">已开通</span>
              <span v-else class="rounded bg-ink-100 px-2 py-0.5 text-xs text-ink-600">{{ o.status }}</span>
            </td>
            <td class="px-4 py-3 text-xs">
              <button
                v-if="o.status === 'pending_payment' || o.status === 'payment_pending_confirmation'"
                class="font-medium text-brand-600 hover:text-brand-700"
                @click="adminConfirm(o.id)"
              >确认平台到账</button>
              <button
                v-else-if="o.status === 'pending_activation'"
                class="font-medium text-brand-600 hover:text-brand-700"
                data-testid="seller-admin-activate"
                @click="adminActivate(o.id)"
              >开通</button>
              <span v-else class="text-ink-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <div v-if="reviewChangeListing && (reviewKind === 'restore' || reviewChangeListing.pendingTerms)" data-testid="terms-review-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="reviewChangeId = ''">
      <div class="w-full max-w-lg rounded-lg bg-white p-5 shadow-float">
        <h2 class="text-base font-semibold text-ink-900">{{ reviewKind === 'restore' ? '审批恢复上架' : '审核交易条件变更' }}</h2>
        <p class="mt-1 text-sm text-ink-600">{{ reviewChangeListing.title }}</p>
        <div v-if="reviewKind === 'restore'" class="mt-4 space-y-2 text-sm text-ink-700" data-testid="restore-review-summary">
          <p>上下架状态：{{ listingStatusText(reviewChangeListing) }}</p>
          <p>审批状态：{{ reviewStatusText(reviewChangeListing) }}</p>
          <p>下架原因：{{ reviewChangeListing.delistNote || '未记录' }}</p>
          <p>申请时间：{{ reviewChangeListing.restoreReview?.requestedAt }}</p>
        </div>
        <div v-else-if="reviewChangeListing.pendingTerms" class="mt-4 grid grid-cols-2 gap-4 text-xs text-ink-700">
          <div><div class="font-medium text-ink-500">现行条件</div><p class="mt-1">¥{{ reviewChangeListing.enterprisePrice }} · {{ reviewChangeListing.servicePeriodMonths || 12 }}个月</p><p>{{ reviewChangeListing.catalogSpec?.updateFrequency }} · {{ reviewChangeListing.catalogSpec?.coverage }}</p></div>
          <div><div class="font-medium text-ink-500">拟变更条件</div><p class="mt-1">¥{{ reviewChangeListing.pendingTerms.enterprisePrice }} · {{ reviewChangeListing.pendingTerms.servicePeriodMonths }}个月</p><p>{{ reviewChangeListing.pendingTerms.updateFrequency }} · {{ reviewChangeListing.pendingTerms.coverage }}</p></div>
        </div>
        <label class="mt-4 block text-xs text-ink-500">审核说明 / 驳回原因<textarea v-model="reviewChangeNote" data-testid="terms-review-note" rows="3" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
        <p v-if="reviewChangeError" class="mt-2 text-xs text-danger-600">{{ reviewChangeError }}</p>
        <div class="mt-4 flex justify-end gap-2"><button class="rounded-md border border-ink-200 px-3 py-2 text-xs" @click="reviewChangeId = ''">取消</button><button class="rounded-md border border-danger-200 px-3 py-2 text-xs text-danger-600" @click="decideChange(false)">驳回</button><button data-testid="approve-terms-change" class="rounded-md bg-brand-600 px-3 py-2 text-xs text-white" @click="decideChange(true)">通过</button></div>
      </div>
    </div>
  </div>
</template>
