<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'

const seller = useSellerMarketStore()
const catalog = useCatalogStore()
const orders = useOrderStore()
const tab = ref<'access' | 'listing' | 'orders'>('access')
const toast = ref('')
const expandedListingId = ref('')

const sellerProducts = computed(() => catalog.products.filter((p) => p.origin === 'seller_market'))
const sellerOrders = computed(() =>
  orders.appOrders.filter((o) => Boolean(o.sellerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
)

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
  seller.decideAccess(id, 'suspended', '违规暂停，在架商品已暂停新购')
  flash('已暂停卖家')
}
function approveListing(id: string) {
  seller.decideListing(id, 'published', '审过即发布')
  flash('上架审核通过并已发布')
}
function rejectListing(id: string) {
  seller.decideListing(id, 'rejected', '文案或合规摘要不完整')
  flash('已驳回上架')
}
function delist(productId: string) {
  seller.forceDelist(productId, '运营强制下架')
  flash('已强制下架')
}
function adminConfirm(orderId: string) {
  try {
    seller.adminConfirmSellerPayment(orderId)
    flash('已确认平台到账，订单进入待开通')
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
</script>

<template>
  <div class="p-6">
    <div class="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">入驻商家</h1>
        <p class="mt-1 text-sm text-slate-500">资质合规审 · 上架审 · 平台收款后由运营开通</p>
      </div>
      <div v-if="toast" class="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">{{ toast }}</div>
    </div>

    <div class="mb-4 flex gap-2">
      <button
        v-for="item in [
          { id: 'access', label: `准入审核 (${seller.pendingAccess.length})` },
          { id: 'listing', label: `上架审核 (${seller.pendingListings.length})` },
          { id: 'orders', label: `商家订单 (${sellerOrders.filter(o => o.status === 'pending_payment' || o.status === 'pending_activation' || o.status === 'payment_pending_confirmation').length})` }
        ]"
        :key="item.id"
        class="rounded-lg px-3 py-2 text-sm"
        :class="tab === item.id ? 'bg-orange-500 text-white' : 'border border-slate-200 bg-white text-slate-600'"
        @click="tab = item.id as typeof tab"
      >{{ item.label }}</button>
    </div>

    <section v-if="tab === 'access'" class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th class="px-4 py-3">卖家</th>
            <th class="px-4 py-3">主体</th>
            <th class="px-4 py-3">收款</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in seller.profiles" :key="p.id" class="border-t border-slate-100">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-800">{{ p.displayName }}</div>
              <div class="text-xs text-slate-400">{{ p.id }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ p.subjectType }} · {{ p.compliance.realName }}</td>
            <td class="px-4 py-3 text-slate-600">{{ p.compliance.payoutBank }} {{ p.compliance.payoutAccountMasked }}</td>
            <td class="px-4 py-3"><span class="rounded bg-slate-100 px-2 py-0.5 text-xs">{{ p.status }}</span></td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button v-if="p.status === 'pending_review' || p.status === 'need_supplement'" class="rounded bg-orange-500 px-2 py-1 text-xs text-white" @click="approveAccess(p.id)">通过</button>
                <button v-if="p.status === 'pending_review'" class="rounded border px-2 py-1 text-xs" @click="rejectAccess(p.id)">驳回</button>
                <button v-if="p.status === 'approved'" class="rounded border border-red-200 px-2 py-1 text-xs text-red-600" @click="suspendAccess(p.id)">暂停</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-else-if="tab === 'listing'" class="space-y-4">
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800">上架申请队列</div>
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th class="px-4 py-3">商品</th>
              <th class="px-4 py-3">卖家</th>
              <th class="px-4 py-3">对象版本</th>
              <th class="px-4 py-3">价格（个人/企业）</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="l in seller.listings" :key="l.id">
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3">
                  <div class="font-medium">{{ l.title }}</div>
                  <div class="text-xs text-slate-400">{{ l.complianceSummary }}</div>
                </td>
                <td class="px-4 py-3">{{ l.sellerName }}</td>
                <td class="px-4 py-3 text-slate-600">{{ l.artifactId }} @ {{ l.artifactVersion }}</td>
                <td class="px-4 py-3">¥{{ l.price }} / ¥{{ l.enterprisePrice }}</td>
                <td class="px-4 py-3"><span class="rounded bg-slate-100 px-2 py-0.5 text-xs">{{ l.status }}</span></td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="rounded border px-2 py-1 text-xs"
                      :data-testid="`listing-shots-toggle-${l.id}`"
                      @click="expandedListingId = expandedListingId === l.id ? '' : l.id"
                    >{{ expandedListingId === l.id ? '收起内容' : '查看上架内容' }}</button>
                    <button v-if="l.status === 'pending_review'" class="rounded bg-orange-500 px-2 py-1 text-xs text-white" @click="approveListing(l.id)">通过并发布</button>
                    <button v-if="l.status === 'pending_review'" class="rounded border px-2 py-1 text-xs" @click="rejectListing(l.id)">驳回</button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedListingId === l.id" class="border-t border-slate-50 bg-slate-50/80">
                <td colspan="6" class="px-4 py-3">
                  <div v-if="l.catalogSpec" class="mb-3 grid grid-cols-2 gap-2 text-xs text-slate-600" data-testid="listing-catalog-spec">
                    <div>数据粒度：{{ l.catalogSpec.granularity || '—' }}</div>
                    <div>时间范围：{{ l.catalogSpec.timeRange || '—' }}</div>
                    <div>数据行数：{{ l.catalogSpec.rowCount ?? '—' }}</div>
                    <div>字段数：{{ l.catalogSpec.fields.length }}</div>
                    <div>地域范围：{{ l.catalogSpec.coverage }}</div>
                    <div>更新频率：{{ l.catalogSpec.updateFrequency }}</div>
                    <div class="col-span-2">应用场景：{{ l.catalogSpec.scenarios.join('、') }}</div>
                    <div class="col-span-2">价值主张：{{ l.catalogSpec.valueProposition }}</div>
                    <div class="col-span-2">详细描述：{{ l.catalogSpec.description }}</div>
                    <div class="col-span-2">质量承诺：{{ l.catalogSpec.qualityPromise }}</div>
                    <div class="col-span-2">个人价：¥{{ l.price }} · 企业价：¥{{ l.enterprisePrice }}</div>
                    <div class="col-span-2">合规声明：{{ l.catalogSpec.complianceNote }}</div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div class="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800">在架入驻商家商品</div>
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th class="px-4 py-3">商品</th>
              <th class="px-4 py-3">卖家</th>
              <th class="px-4 py-3">来源声明</th>
              <th class="px-4 py-3">状态</th>
              <th class="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in sellerProducts" :key="p.id" class="border-t border-slate-100">
              <td class="px-4 py-3 font-medium">{{ p.name }}</td>
              <td class="px-4 py-3">{{ p.sellerName }}</td>
              <td class="px-4 py-3">{{ p.dataProvenance === 'derived' ? '已购衍生' : '自有' }}</td>
              <td class="px-4 py-3">{{ p.availability }} / {{ p.status }}</td>
              <td class="px-4 py-3">
                <button v-if="p.availability === 'published'" class="rounded border border-red-200 px-2 py-1 text-xs text-red-600" @click="delist(p.id)">强制下架</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th class="px-4 py-3">订单</th>
            <th class="px-4 py-3">商品</th>
            <th class="px-4 py-3">金额</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in sellerOrders" :key="o.id" class="border-t border-slate-100">
            <td class="px-4 py-3">
              <div class="font-medium">{{ o.id }}</div>
              <div class="text-xs text-slate-400">买家 {{ o.ownerId }} · 卖家 {{ o.sellerId }}</div>
            </td>
            <td class="px-4 py-3">{{ o.productName }}</td>
            <td class="px-4 py-3">¥{{ o.amount }}</td>
            <td class="px-4 py-3">
              <span v-if="o.status === 'pending_activation'" class="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">待开通</span>
              <span v-else-if="o.status === 'pending_payment'" class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">待支付</span>
              <span v-else-if="o.status === 'entitlement_active'" class="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">已开通</span>
              <span v-else class="rounded bg-slate-100 px-2 py-0.5 text-xs">{{ o.status }}</span>
            </td>
            <td class="px-4 py-3">
              <button
                v-if="o.status === 'pending_payment' || o.status === 'payment_pending_confirmation'"
                class="rounded bg-orange-500 px-2 py-1 text-xs text-white"
                @click="adminConfirm(o.id)"
              >确认平台到账</button>
              <button
                v-else-if="o.status === 'pending_activation'"
                class="rounded bg-orange-500 px-2 py-1 text-xs text-white"
                data-testid="seller-admin-activate"
                @click="adminActivate(o.id)"
              >开通</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
