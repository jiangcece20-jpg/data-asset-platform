<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import MineEntityCard from './MineEntityCard.vue'
import { useSellerMarketStore, sellerListingSaleLabel as saleStatus, sellerListingReviewLabel as reviewStatus } from '@/stores/sellerMarket'
import { MERCHANT_UPDATE_FREQUENCIES, isMerchantUpdateFrequency } from '@/domain/updateFrequency'
import { useCatalogStore } from '@/stores/catalog'

defineProps<{ variant: 'mobile' | 'portal' }>()

const emit = defineEmits<{ 'create-listing': [] }>()

const router = useRouter()
const seller = useSellerMarketStore()
const catalog = useCatalogStore()
const editingId = ref('')
const editTitle = ref('')
const editSubtitle = ref('')
const editDescription = ref('')
const editPrice = ref(0)
const editFrequency = ref('')
const editPeriod = ref(12)
const editCoverage = ref('')
const editFieldNotes = ref<Record<string, string>>({})
const editSampleRows = ref('[]')
const editMessage = ref('')
const editing = computed(() => seller.myListings.find((item) => item.id === editingId.value))

function openEdit(id: string) {
  const item = seller.myListings.find((listing) => listing.id === id)
  if (!item?.catalogSpec) return
  editingId.value = id
  editTitle.value = item.title
  editSubtitle.value = item.subtitle
  editDescription.value = item.catalogSpec.description
  editPrice.value = item.pendingTerms?.enterprisePrice ?? item.enterprisePrice
  const frequency = item.pendingTerms?.updateFrequency ?? item.catalogSpec.updateFrequency
  editFrequency.value = isMerchantUpdateFrequency(frequency) ? frequency : ''
  editPeriod.value = item.pendingTerms?.servicePeriodMonths ?? item.servicePeriodMonths ?? 12
  editCoverage.value = item.pendingTerms?.coverage ?? item.catalogSpec.coverage
  editFieldNotes.value = Object.fromEntries(item.catalogSpec.fields.map((field) => [field.name, field.description]))
  editSampleRows.value = JSON.stringify(item.catalogSpec.sampleRows, null, 2)
  editMessage.value = ''
}

function saveDisplay() {
  if (!editing.value) return
  try {
    const rows = JSON.parse(editSampleRows.value) as unknown
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('样例数据须为 JSON 数组')
    seller.saveListingDisplay(editing.value.id, {
      title: editTitle.value,
      subtitle: editSubtitle.value,
      description: editDescription.value,
      fieldDescriptions: editFieldNotes.value,
      sampleRows: rows as Array<Record<string, string | number | boolean>>
    })
    editMessage.value = '展示资料已生效'
  } catch (error) {
    editMessage.value = error instanceof Error ? error.message : '保存失败'
  }
}

function submitTerms() {
  if (!editing.value) return
  try {
    seller.submitListingTerms(editing.value.id, {
      enterprisePrice: Number(editPrice.value),
      servicePeriodMonths: Number(editPeriod.value),
      updateFrequency: editFrequency.value,
      coverage: editCoverage.value
    })
    editMessage.value = '交易条件已提交审核；旧订单不受影响'
  } catch (error) {
    editMessage.value = error instanceof Error ? error.message : '提交失败'
  }
}

function delist(id: string) {
  const listing = seller.myListings.find((item) => item.id === id)
  if (!listing?.productId || !window.confirm('下架后将停止新售，已售订单仍须履约。确认下架？')) return
  seller.forceDelist(listing.productId, '商家主动下架', seller.myProfile?.displayName || '商家', 'seller')
}

function restore(id: string) {
  const listing = seller.myListings.find(item => item.id === id)
  if (!listing?.productId || !window.confirm('提交恢复上架申请？审批通过后恢复原商品，历史订单保持不变。')) return
  try {
    seller.restoreListing(listing.productId, 'seller')
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '申请失败')
  }
}

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    none: '未申请',
    pending_review: '准入审核中',
    need_supplement: '待补正',
    approved: '已准入',
    rejected: '已驳回',
    suspended: '已暂停'
  }
  return map[seller.myProfile?.status || 'none']
})

</script>

<template>
  <div class="mt-3 space-y-3" data-testid="seller-listings-panel">
    <div class="rounded-xl border border-warning-100 bg-warning-50 px-3 py-2 text-[11px] text-warning-600">
      卖家状态：{{ statusLabel }}
      <span v-if="seller.myProfile?.displayName"> · {{ seller.myProfile.displayName }}</span>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-[13px] font-medium text-ink-900">我的上架单</div>
      <button
        data-testid="seller-create-listing"
        class="rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white"
        :disabled="!seller.isApprovedSeller"
        @click="emit('create-listing')"
      >新建上架单</button>
    </div>

    <MineEntityCard v-for="item in seller.myListings" :key="item.id" :variant="variant">
      <template #badges>
        <span class="rounded-full bg-warning-50 px-2 py-0.5 text-warning-600">上架单</span>
        <span class="font-mono text-ink-500">{{ item.id }}</span>
      </template>
      <template #title>{{ item.title }}</template>
      <template #status>
        <div class="flex flex-col items-end gap-1 text-[10px] text-ink-600">
          <span :data-testid="`seller-listing-sale-${item.id}`">上下架状态：{{ saleStatus(item) }}</span>
          <span :data-testid="`seller-listing-review-${item.id}`">审批状态：{{ reviewStatus(item) }}</span>
        </div>
      </template>
      <template #meta>
        <div><span class="text-ink-500">商品类型</span><div class="mt-0.5 text-ink-700">数据集</div></div>
        <div><span class="text-ink-500">企业售价</span><div class="mt-0.5 font-semibold text-brand-600">¥{{ item.enterprisePrice }}</div></div>
        <div><span class="text-ink-500">服务周期</span><div class="mt-0.5 text-ink-700">{{ item.servicePeriodMonths || 12 }}个月</div></div>
        <div><span class="text-ink-500">更新频率</span><div class="mt-0.5 text-ink-700">{{ item.catalogSpec?.updateFrequency || '—' }}</div></div>
        <div><span class="text-ink-500">来源</span><div class="mt-0.5 text-ink-700">{{ item.dataProvenance === 'owned' ? '自有' : '衍生' }}</div></div>
        <div><span class="text-ink-500">数据更新时间</span><div class="mt-0.5 text-ink-700">{{ seller.artifacts.find((artifact) => artifact.id === item.artifactId)?.updatedAt || '—' }}</div></div>
        <div><span class="text-ink-500">上架人</span><div class="mt-0.5 text-ink-700">{{ item.listedByName || item.sellerName }}</div></div>
        <div><span class="text-ink-500">最近操作人</span><div class="mt-0.5 text-ink-700">{{ item.lastOperatorName || '—' }}</div></div>
        <div><span class="text-ink-500">最近修改时间</span><div class="mt-0.5 text-ink-700">{{ item.updatedAt }}</div></div>
      </template>
      <template v-if="item.reviewNote" #notice>
        <div class="rounded-lg bg-warning-50 px-3 py-2 text-[10px] text-warning-600">{{ item.reviewNote }}</div>
      </template>
      <template v-if="item.productId" #actions>
        <button v-if="saleStatus(item) === '上架'" :data-testid="`edit-listing-${item.id}`" class="rounded-full border border-brand-200 px-3 py-1.5 text-[11px] text-brand-600" @click="openEdit(item.id)">修改资料/价格</button>
        <button v-if="saleStatus(item) === '上架'" class="rounded-full border border-danger-200 px-3 py-1.5 text-[11px] text-danger-600" @click="delist(item.id)">下架</button>
        <span v-if="item.restoreReview?.status === 'pending_review'" class="text-xs text-ink-500">恢复申请审批中</span>
        <button v-else-if="saleStatus(item) === '已下架' && catalog.byId(item.productId)?.manualDelistedBy === 'seller'" :data-testid="`request-restore-${item.id}`" class="rounded-full border border-brand-200 px-3 py-1.5 text-[11px] text-brand-600" @click="restore(item.id)">申请恢复上架</button>
        <span v-else-if="saleStatus(item) === '已下架'" class="text-xs text-ink-500">由平台发起恢复审批</span>
        <span v-if="item.restoreReview?.status === 'rejected'" class="text-xs text-danger-600">恢复驳回：{{ item.restoreReview.note }}</span>
        <button
          class="rounded-full border border-ink-200 px-3 py-1.5 text-[11px] text-ink-600"
          @click="router.push(`${variant === 'portal' ? '/portal' : '/app'}/product/${item.productId}`)"
        >查看商品</button>
      </template>
    </MineEntityCard>

    <div v-if="!seller.myListings.length" class="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-[12px] text-ink-500">
      暂无上架申请
    </div>

    <div v-if="editing" data-testid="listing-edit-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="editingId = ''">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-float">
        <div class="flex items-center justify-between"><h2 class="text-base font-semibold text-ink-900">修改商品</h2><button aria-label="关闭修改商品" class="text-xl text-ink-500" @click="editingId = ''">×</button></div>
        <div v-if="editMessage" class="mt-3 rounded-md bg-brand-50 px-3 py-2 text-xs text-brand-700">{{ editMessage }}</div>
        <section class="mt-4 space-y-3 border-b border-ink-100 pb-5">
          <h3 class="text-sm font-medium text-ink-800">展示资料 · 保存后生效</h3>
          <label class="block text-xs text-ink-500">商品名称<input v-model="editTitle" data-testid="listing-edit-title" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
          <label class="block text-xs text-ink-500">简介<input v-model="editSubtitle" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
          <label class="block text-xs text-ink-500">内容说明<textarea v-model="editDescription" rows="3" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
          <div v-for="field in editing.catalogSpec?.fields || []" :key="field.name" class="text-xs text-ink-500">
            <label class="block">{{ field.name }} · 字段说明<input v-model="editFieldNotes[field.name]" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
          </div>
          <label class="block text-xs text-ink-500">样例数据（JSON 数组，不改变字段）<textarea v-model="editSampleRows" rows="3" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 font-mono text-xs text-ink-900" /></label>
          <button data-testid="save-listing-display" class="rounded-md bg-brand-600 px-4 py-2 text-xs text-white" @click="saveDisplay">保存展示资料</button>
        </section>
        <section class="mt-4 space-y-3">
          <h3 class="text-sm font-medium text-ink-800">交易条件 · 审核通过后仅影响新订单</h3>
          <div class="grid grid-cols-2 gap-3">
            <label class="text-xs text-ink-500">企业售价（元）<input v-model.number="editPrice" data-testid="listing-edit-price" type="number" min="1" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
            <label class="text-xs text-ink-500">服务周期（月）<input v-model.number="editPeriod" data-testid="listing-edit-period" type="number" min="1" step="1" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
            <label class="text-xs text-ink-500">更新频率<select v-model="editFrequency" data-testid="listing-edit-frequency" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900"><option value="">请选择更新频率</option><option v-for="frequency in MERCHANT_UPDATE_FREQUENCIES" :key="frequency" :value="frequency">{{ frequency }}</option></select></label>
            <label class="text-xs text-ink-500">数据范围<input v-model="editCoverage" class="mt-1 w-full rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900" /></label>
          </div>
          <p v-if="editing.reviewStatus === 'change_rejected'" class="text-xs text-danger-600">驳回原因：{{ editing.reviewNote }}</p>
          <button data-testid="submit-listing-terms" :disabled="editing.reviewStatus === 'change_pending'" class="rounded-md bg-brand-600 px-4 py-2 text-xs text-white disabled:bg-ink-300" @click="submitTerms">提交变更审核</button>
        </section>
      </div>
    </div>
  </div>
</template>
