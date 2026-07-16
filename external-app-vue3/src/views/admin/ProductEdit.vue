<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import ProductReverseActionModal from '@/components/admin/reverse-flow/ProductReverseActionModal.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useApprovalStore } from '@/stores/approval'
import { useProductReverseStore, type ProductReversePreview } from '@/stores/productReverse'
import { useReverseWorkOrderStore } from '@/stores/reverseWorkOrders'
import { useUserStore } from '@/stores/user'
import { typeMeta, originMeta, dealChannelMeta } from '@/utils/productMeta'
import type { ProductReverseAction, ReverseReasonCode } from '@/types/reverseFlow'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const approval = useApprovalStore()
const productReverse = useProductReverseStore()
const woStore = useReverseWorkOrderStore()
const userStore = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const isSpaceProduct = computed(() => product.value?.dealChannel === 'space_purchase')
const record = computed(() => approval.byProduct(id.value))

// --- Reverse-flow modal state ---
const modalOpen = ref(false)
const modalAction = ref<ProductReverseAction>('pause')
const modalPreview = ref<ProductReversePreview | undefined>(undefined)
const inlineSuccess = ref('')

const openWorkOrders = computed(() => woStore.openForProduct(id.value))
const canResumeSales = computed(() =>
  product.value?.availability === 'paused'
  && product.value?.serviceStatus === 'normal',
)
const hasServiceIssue = computed(() =>
  product.value?.serviceStatus === 'suspended' || product.value?.serviceStatus === 'terminated',
)

const enhForm = reactive({
  displayTitle: '',
  recommendText: '',
  tags: '',
  manualDescription: '',
  previewNote: '',
  sortWeight: 50,
  recommendSlot: false
})

const appForm = reactive({
  name: '',
  subtitle: '',
  description: '',
  valueProposition: '',
  itemPrice: 0,
  memberDiscount: 0.6
})

function syncFormFromStore() {
  const p = product.value
  if (!p) return
  const enh = catalog.enhancementOf(p.id)
  enhForm.displayTitle = enh?.displayTitle || p.name
  enhForm.recommendText = enh?.recommendText || ''
  enhForm.tags = (enh?.tags || []).join('、')
  enhForm.manualDescription = enh?.manualDescription || ''
  enhForm.previewNote = enh?.previewNote || ''
  enhForm.sortWeight = enh?.sortWeight ?? 50
  enhForm.recommendSlot = enh?.recommendSlot ?? false

  appForm.name = p.name
  appForm.subtitle = p.subtitle
  appForm.description = p.description
  appForm.valueProposition = p.valueProposition
  appForm.itemPrice = p.price.itemPrice || 0
  appForm.memberDiscount = p.price.memberDiscount || 0.6
}
watch(id, syncFormFromStore, { immediate: true })

function saveEnhancement() {
  catalog.updateEnhancement(id.value, {
    displayTitle: enhForm.displayTitle,
    recommendText: enhForm.recommendText,
    tags: enhForm.tags.split(/[、,，]/).map((t) => t.trim()).filter(Boolean),
    manualDescription: enhForm.manualDescription,
    previewNote: enhForm.previewNote,
    sortWeight: Number(enhForm.sortWeight),
    recommendSlot: enhForm.recommendSlot
  })
}

function saveAppProduct() {
  catalog.updateProduct(id.value, {
    name: appForm.name,
    subtitle: appForm.subtitle,
    description: appForm.description,
    valueProposition: appForm.valueProposition,
    price: { ...product.value!.price, itemPrice: Number(appForm.itemPrice), memberDiscount: Number(appForm.memberDiscount) }
  })
}

function submitForApproval() {
  if (!product.value) return
  approval.submit(id.value, [
    { item: '说明书信息完整（价值主张/适用场景/合规声明）', passed: true, note: '' },
    { item: '价格与交易归属配置正确', passed: true, note: '' },
    { item: `${typeMeta[product.value.type].label}类目专项检查项已完成`, passed: true, note: '' }
  ])
}

function openReverseModal(action: ProductReverseAction) {
  modalAction.value = action
  modalPreview.value = undefined
  inlineSuccess.value = ''
  modalOpen.value = true
}

function handleRequestPreview(payload: { action: ProductReverseAction; reason: ReverseReasonCode; reasonDetail: string }) {
  modalPreview.value = productReverse.previewProductReverse({
    productId: id.value,
    action: payload.action,
    reason: payload.reason,
    reasonDetail: payload.reasonDetail,
  })
}

function handleConfirm(payload: { preview: ProductReversePreview; reasonDetail: string; owner: string; reviewAt: string }) {
  const result = productReverse.executeProductReverse({
    productId: id.value,
    action: payload.preview.action,
    reason: payload.preview.reason,
    reasonDetail: payload.reasonDetail,
    preview: payload.preview,
    actor: userStore.context.currentMemberId || 'admin',
    owner: payload.owner,
    reviewAt: payload.reviewAt,
  })
  modalOpen.value = false
  modalPreview.value = undefined

  if (result.workOrderId) {
    router.push(`/admin/approval/reverse-work-orders/${result.workOrderId}`)
  } else {
    inlineSuccess.value = '操作已完成。该商品无客户影响，无需创建逆向工单。'
  }
}

function handleResumeSales() {
  productReverse.resumeSales(id.value, userStore.context.currentMemberId || 'admin')
  inlineSuccess.value = '已恢复销售。'
}

function closeModal() {
  modalOpen.value = false
  modalPreview.value = undefined
}
</script>

<template>
  <div v-if="product">
    <div class="mb-1 flex items-center gap-2 text-[12px] text-slate-400">
      <button class="hover:underline" @click="router.push('/admin/products')">商品中心</button>
      <span>/</span>
      <span>{{ product.name }}</span>
    </div>
    <PageHeader :title="product.name" :desc="`${typeMeta[product.type].label} · ${originMeta[product.origin]} · ${dealChannelMeta[product.dealChannel].label}`" />

    <div class="mb-4 flex items-center gap-2">
      <StatusBadge dict="availability" :value="product.availability" />
      <StatusBadge dict="product" :value="product.status" />
      <span v-if="hasServiceIssue" class="rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-600">服务异常</span>
      <span class="text-xs text-slate-400">更新于 {{ product.updatedAt }}</span>
      <div class="ml-auto flex gap-2">
        <button v-if="product.status === 'draft'" class="rounded-lg bg-brand-500 px-3 py-1.5 text-[12px] text-white" @click="submitForApproval">
          提交审批
        </button>
        <!-- Reverse-flow actions for published products -->
        <template v-if="product.availability === 'published'">
          <button class="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] text-slate-600" @click="openReverseModal('pause')">暂停销售</button>
          <button class="rounded-lg bg-red-50 px-3 py-1.5 text-[12px] text-red-600" @click="openReverseModal('delist')">下架</button>
          <button class="rounded-lg bg-orange-50 px-3 py-1.5 text-[12px] text-orange-600" @click="openReverseModal('recall')">召回</button>
        </template>
        <!-- Resume sales for paused + normal service -->
        <button v-if="canResumeSales" class="rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] text-white" @click="handleResumeSales">恢复销售</button>
        <!-- Link to open work orders for suspended/terminated service -->
        <template v-if="hasServiceIssue && openWorkOrders.length > 0">
          <button
            v-for="wo in openWorkOrders"
            :key="wo.id"
            class="rounded-lg bg-blue-50 px-3 py-1.5 text-[12px] text-blue-600"
            @click="router.push(`/admin/approval/reverse-work-orders/${wo.id}`)"
          >查看处置工单 ({{ wo.severity }})</button>
        </template>
        <button v-if="product.status === 'pending_publish'" class="rounded-lg bg-emerald-500 px-3 py-1.5 text-[12px] text-white" @click="approval.publish(id)">
          正式发布
        </button>
      </div>
    </div>

    <!-- Inline success for impact-free actions -->
    <div v-if="inlineSuccess" class="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
      {{ inlineSuccess }}
    </div>

    <div v-if="record" class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <div class="text-[13px] font-medium text-slate-700">分类检查清单与审批结论</div>
        <StatusBadge dict="approval" :value="record.conclusion" />
      </div>
      <ul class="space-y-1 text-[12px]">
        <li v-for="(c, idx) in record.checklist" :key="idx" class="flex items-center gap-2 text-slate-600">
          <span>{{ c.passed === true ? '✅' : c.passed === false ? '❌' : '⏳' }}</span>
          <span>{{ c.item }}</span>
          <span v-if="c.note" class="text-slate-400">（{{ c.note }}）</span>
        </li>
      </ul>
      <div v-if="record.reason" class="mt-2 text-[12px] text-slate-400">审批意见：{{ record.reason }}（{{ record.reviewer }}）</div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- 只读主数据（空间商品）或可编辑商品信息（APP自营） -->
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 text-[13px] font-medium text-slate-700">
          {{ isSpaceProduct ? '空间主数据（只读）' : 'APP 商品信息' }}
        </div>

        <template v-if="isSpaceProduct">
          <dl class="space-y-2 text-[13px]">
            <div><dt class="text-slate-400">名称</dt><dd class="text-slate-700">{{ product.name }}</dd></div>
            <div><dt class="text-slate-400">类型</dt><dd class="text-slate-700">{{ typeMeta[product.type].label }}</dd></div>
            <div><dt class="text-slate-400">提供方</dt><dd class="text-slate-700">{{ product.provider }}</dd></div>
            <div><dt class="text-slate-400">空间价格</dt><dd class="text-slate-700">{{ product.price.quoteNote }}</dd></div>
            <div><dt class="text-slate-400">空间商品编号</dt><dd class="text-slate-700">{{ product.spaceProductNo }}</dd></div>
            <div><dt class="text-slate-400">同步时间</dt><dd class="text-slate-700">{{ product.spaceSyncedAt }}</dd></div>
          </dl>
        </template>
        <template v-else>
          <div class="space-y-2.5 text-[13px]">
            <label class="block"><span class="mb-1 block text-xs text-slate-400">商品名称</span><input v-model="appForm.name" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">副标题</span><input v-model="appForm.subtitle" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">价值主张</span><textarea v-model="appForm.valueProposition" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
            <label class="block"><span class="mb-1 block text-xs text-slate-400">详细描述</span><textarea v-model="appForm.description" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block"><span class="mb-1 block text-xs text-slate-400">单品价格 ¥</span><input v-model.number="appForm.itemPrice" type="number" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
              <label class="block"><span class="mb-1 block text-xs text-slate-400">会员折扣</span><input v-model.number="appForm.memberDiscount" type="number" step="0.1" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
            </div>
            <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="saveAppProduct">保存商品信息</button>
          </div>
        </template>
      </div>

      <!-- APP 增强信息（空间商品必填，APP自营也可用于优化展示） -->
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-3 text-[13px] font-medium text-slate-700">APP 展示增强信息</div>
        <div class="space-y-2.5 text-[13px]">
          <label class="block"><span class="mb-1 block text-xs text-slate-400">展示标题</span><input v-model="enhForm.displayTitle" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">推荐语</span><input v-model="enhForm.recommendText" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">标签（顿号分隔）</span><input v-model="enhForm.tags" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">说明书补充</span><textarea v-model="enhForm.manualDescription" rows="2" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <label class="block"><span class="mb-1 block text-xs text-slate-400">预览说明</span><input v-model="enhForm.previewNote" class="w-full rounded-lg border border-slate-200 px-2.5 py-1.5" /></label>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model="enhForm.sortWeight" type="number" class="w-16 rounded-lg border border-slate-200 px-2 py-1" />排序权重</label>
            <label class="flex items-center gap-1.5 text-xs text-slate-500"><input v-model="enhForm.recommendSlot" type="checkbox" />进入推荐位</label>
          </div>
          <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="saveEnhancement">保存增强信息</button>
        </div>
      </div>
    </div>

    <!-- Reverse-action modal -->
    <ProductReverseActionModal
      :open="modalOpen"
      :product-name="product.name"
      :preview="modalPreview"
      @close="closeModal"
      @request-preview="handleRequestPreview"
      @confirm="handleConfirm"
    />
  </div>
  <div v-else class="text-sm text-slate-400">商品不存在</div>
</template>
