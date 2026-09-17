<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductChips from '@/components/shared/ProductChips.vue'
import PortalDetailTabs, { type DetailTab } from './components/PortalDetailTabs.vue'
import PortalPurchasePanel from './components/PortalPurchasePanel.vue'
import PortalDatasetDetail from './components/PortalDatasetDetail.vue'
import PortalApiDetail from './components/PortalApiDetail.vue'
import PortalReportDetail from './components/PortalReportDetail.vue'
import PortalDashboardDetail from './components/PortalDashboardDetail.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'
import { useTrustedSpaceCatalogStore } from '@/stores/trustedSpaceCatalog'
import { usePortalPurchaseStore } from '@/stores/portalPurchase'
import { startDatasetPayment } from '@/domain/purchaseIdentity'
import { productTopicTags } from '@/domain/productListChips'
import type { PortalPurchaseAction } from '@/domain/portalPurchase'
import type { ProductType } from '@/types/domain'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()
const purchase = usePortalPurchaseStore()
const trustedSpaceCatalog = useTrustedSpaceCatalogStore()
const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const title = computed(() => product.value?.name ?? '')
const topicTags = computed(() => product.value ? productTopicTags(product.value) : [])
const access = computed(() => {
  if (!product.value || !user.context.loggedIn) return 'none'
  if (purchase.hasItem(product.value)) return purchase.subject === 'enterprise' ? 'enterprise' : 'item'
  return purchase.memberFree(product.value) ? 'member' : 'none'
})
const owned = computed(() => access.value !== 'none')
const contentUnlocked = computed(() => user.context.loggedIn && (owned.value || !!product.value?.acquisitions.includes('free')))
const pcActions = computed(() => product.value ? purchase.actions(product.value) : [])
const busy = ref(false)
const loginOpen = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notify(message: string) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 4000)
}
onUnmounted(() => clearTimeout(toastTimer))

const tabsByType: Record<ProductType, DetailTab[]> = {
  dataset: [
    { key: 'basic', label: '基本信息' }, { key: 'samples', label: '样例数据' },
    { key: 'fields', label: '字段信息' }, { key: 'profiling', label: '探查报告' }
  ],
  api: [
    { key: 'basic', label: '基本信息' }, { key: 'docs', label: '接口文档' },
    { key: 'sandbox', label: '在线调试' }, { key: 'sla', label: '错误码与 SLA' }
  ],
  report: [
    { key: 'preview', label: '报表预览' }, { key: 'reader', label: '在线阅读' },
    { key: 'catalog', label: '目录' }, { key: 'overview', label: '报告介绍' }
  ],
  dashboard: [
    { key: 'preview', label: '看板预览' }, { key: 'metrics', label: '指标定义' },
    { key: 'overview', label: '基本信息' }, { key: 'updates', label: '更新与导出' }
  ]
}
const defaultTabByType: Record<ProductType, string> = { dataset: 'basic', api: 'basic', report: 'reader', dashboard: 'preview' }
const currentTabs = computed(() => product.value ? tabsByType[product.value.type] : [])
const activeTab = ref('basic')
watch(id, () => {
  if (product.value) activeTab.value = defaultTabByType[product.value.type]
  toast.value = ''
}, { immediate: true })
onMounted(() => {
  if (product.value?.dealChannel === 'space_purchase') void trustedSpaceCatalog.syncAll()
})
function toggleFav() { catalog.toggleFavorite(id.value) }
function handleUnlock() {
  const primary = pcActions.value[0]
  if (primary) void handleAction(primary)
}
async function handleAction(action: PortalPurchaseAction) {
  const p = product.value
  if (!p || busy.value) return
  if (p.availability === 'delisted' || p.status === 'delisted') {
    notify('商品已下架，暂不可操作')
    return
  }
  if (!user.context.loggedIn) { loginOpen.value = true; return }
  // Price-only changes use the latest price; a changed action requires another click.
  const current = purchase.actions(p).find((item) => item.key === action.key)
  if (!current || current.disabled) { notify('购买方式已更新，请重新选择'); return }
  const reason = purchase.blockingReason(p, action.key)
  if (reason) { notify(reason); return }
  busy.value = true
  try {
    if (action.key === 'subscribe') {
      await router.push({ path: '/app/checkout/member', query: { returnProduct: p.id, returnPortal: '1' } })
    } else if (action.key === 'trial') {
      await router.push(`/portal/space-intent/${p.id}`)
    } else if (action.key === 'free') {
      purchase.claimFree(p)
      notify('获取成功')
    } else if (action.key === 'item' || action.key === 'member') {
      if (p.type === 'dataset' && p.origin === 'asset_platform') {
        const { path } = startDatasetPayment(p.id, true, action.key)
        await router.push(path)
      } else {
        await router.push({ path: `/portal/checkout/${p.id}`, query: { pricePath: action.key, skipDual: '1' } })
      }
    } else if (action.key === 'listing') {
      await router.push(p.availability === 'candidate' ? `/app/listing-request/${p.id}` : '/portal/mine?menu=favorites')
    }
  } catch {
    notify('操作失败，请稍后重试')
  } finally {
    busy.value = false
  }
}
function confirmLogin() {
  user.context.loggedIn = true
  loginOpen.value = false
}
</script>

<template>
  <div v-if="product" class="mx-auto max-w-7xl">
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- 左栏：标题卡 + Tab 导航 + Tab 内容 -->
      <div class="min-w-0 space-y-4">
        <!-- 商品标题卡 -->
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <ProductChips :product="product" show-trial />
              <h1 class="mt-3 text-xl font-bold text-slate-900">{{ title }}</h1>
              <p class="mt-1 text-sm text-slate-500">{{ product.recommendText || product.subtitle }}</p>
              <div v-if="topicTags.length" class="mt-2 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in topicTags"
                  :key="tag"
                  class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                >{{ tag }}</span>
              </div>
            </div>
            <button
              class="shrink-0 text-xl transition-colors"
              :class="product.favorite ? 'text-amber-400' : 'text-slate-200 hover:text-slate-300'"
              :title="product.favorite ? '取消收藏' : '收藏'"
              @click="toggleFav"
            >★</button>
          </div>
        </div>

        <!-- Tab 导航 + 内容 -->
        <div class="rounded-xl border border-slate-200 bg-white">
          <PortalDetailTabs v-model="activeTab" :tabs="currentTabs" class="px-5" />
          <div class="p-5">
            <PortalDatasetDetail
              v-if="product.type === 'dataset'"
              :product="product"
              :active-tab="activeTab"
            />
            <PortalApiDetail
              v-else-if="product.type === 'api'"
              :product="product"
              :active-tab="activeTab"
            />
            <PortalReportDetail
              v-else-if="product.type === 'report'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
              @unlock="handleUnlock"
            />
            <PortalDashboardDetail
              v-else-if="product.type === 'dashboard'"
              :product="product"
              :active-tab="activeTab"
              :unlocked="contentUnlocked"
            />
            <div v-else class="py-8 text-center text-sm text-slate-400">资料准备中</div>
          </div>
        </div>
      </div>

      <!-- 右栏：sticky 购买面板 -->
      <div>
        <PortalPurchasePanel
          :product="product"
          :owned="owned"
          :access="access"
          :actions="pcActions"
          :busy="busy"
          @action="handleAction"
        />
      </div>
    </div>

    <div v-if="toast" role="status" aria-live="polite" class="fixed left-1/2 top-20 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-slate-900 px-5 py-3 text-sm text-white shadow-lg">{{ toast }}</div>
    <div v-if="loginOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" @click.self="loginOpen = false">
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-login-title" class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" @keydown.esc="loginOpen = false">
        <h2 id="purchase-login-title" class="text-lg font-semibold text-slate-900">登录</h2>
        <p class="mt-3 text-sm text-slate-600">{{ user.context.name }} · {{ user.context.phone }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm" @click="loginOpen = false">取消</button>
          <button data-testid="purchase-login-confirm" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white" @click="confirmLogin">登录</button>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">商品不存在</div>
</template>
