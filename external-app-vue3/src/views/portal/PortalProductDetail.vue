<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductTypeIcon from '@/components/shared/ProductTypeIcon.vue'
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
import { productListChips, productTopicTags } from '@/domain/productListChips'
import { isSpaceSyncedProduct } from '@/domain/productDetailFields'
import { productPriceSummary } from '@/domain/productPriceSummary'
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
// Hero 标签收敛：类型 + 来源（可信空间等信任信息）+ 至多 1 个运营标签
const heroTags = computed<string[]>(() => {
  const p = product.value
  if (!p) return []
  const chips = productListChips(p)
  const tags = [chips.typeLabel]
  if (chips.venue) tags.push(chips.venue.name)
  if (chips.ops) tags.push(chips.ops.label)
  return tags.slice(0, 3)
})
// 头部起步价锚点（右栏购买卡同步展示）
const priceSummary = computed(() => product.value ? productPriceSummary(product.value) : null)
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
const currentTabs = computed(() => {
  if (!product.value) return []
  if (product.value.type === 'api' && isSpaceSyncedProduct(product.value)) {
    return tabsByType.api.filter((tab) => tab.key !== 'sandbox' && tab.key !== 'sla')
  }
  return tabsByType[product.value.type]
})
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
      <!-- 左栏：商品头部 + Tab 导航 + Tab 内容 -->
      <div class="min-w-0 space-y-4">
        <!-- 商品头部：浅蓝柔和底，蓝色仅作点缀 -->
        <section class="rounded-xl border border-brand-100 bg-[#F2F7FF] px-7 py-6">
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs text-brand-600 transition hover:text-brand-700"
            @click="router.push('/portal/search')"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            返回找数
          </button>
          <div class="mt-3 flex items-start gap-4">
            <ProductTypeIcon :type="product.type" :size="52" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  v-for="(tag, index) in heroTags"
                  :key="tag"
                  class="inline-flex items-center rounded px-2 py-0.5 text-xs"
                  :class="index === 0
                    ? 'border border-brand-200 bg-white font-medium text-brand-600'
                    : 'border border-ink-300 bg-white text-ink-600'"
                >{{ tag }}</span>
              </div>
              <h1 class="mt-2 pr-10 text-[22px] font-bold leading-8 text-ink-900">{{ title }}</h1>
              <p v-if="product.recommendText || product.subtitle" class="mt-1 max-w-3xl truncate text-sm text-ink-600">{{ product.recommendText || product.subtitle }}</p>
              <div v-if="priceSummary && priceSummary.kind !== 'none'" class="mt-2 flex items-baseline gap-1.5" data-testid="product-header-price">
                <template v-if="priceSummary.kind === 'money'">
                  <span class="text-xl font-bold leading-none text-danger-500">{{ priceSummary.text }}</span>
                  <span class="text-xs text-ink-500">{{ priceSummary.suffix }}</span>
                </template>
                <span v-else-if="priceSummary.kind === 'free'" class="text-base font-bold text-success-600">免费</span>
                <span v-else class="rounded bg-warning-50 px-1.5 py-0.5 text-xs font-medium text-warning-600">待报价</span>
                <span v-if="priceSummary.hint" class="text-xs text-ink-500">{{ priceSummary.hint }}</span>
              </div>
              <div v-if="topicTags.length" class="mt-2.5 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in topicTags.slice(0, 6)"
                  :key="tag"
                  class="rounded bg-white px-2 py-0.5 text-xs text-ink-500"
                >{{ tag }}</span>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-ink-300 transition hover:border-brand-300"
              :title="product.favorite ? '取消收藏' : '收藏'"
              @click="toggleFav"
            >
              <svg class="h-5 w-5" viewBox="0 0 24 24" :fill="product.favorite ? '#FFB400' : 'none'" :stroke="product.favorite ? '#FFB400' : '#86909C'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 17.3-6.2 3.6 1.6-6.9L2 9.2l7-.6L12 2.2l3 6.4 7 .6-5.4 4.8 1.6 6.9z" />
              </svg>
            </button>
          </div>
        </section>

        <!-- Tab 导航 + 内容 -->
        <div class="ui-card overflow-hidden">
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
            <div v-else class="py-8 text-center text-sm text-ink-500">资料准备中</div>
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

    <div v-if="toast" role="status" aria-live="polite" class="fixed left-1/2 top-20 z-50 max-w-[90vw] -translate-x-1/2 rounded-lg bg-ink-900/90 px-5 py-3 text-sm text-white shadow-float">{{ toast }}</div>
    <div v-if="loginOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" @click.self="loginOpen = false">
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-login-title" class="w-full max-w-sm rounded-xl bg-white p-6 shadow-float" @keydown.esc="loginOpen = false">
        <h2 id="purchase-login-title" class="text-base font-semibold text-ink-900">登录</h2>
        <p class="mt-3 text-sm text-ink-600">{{ user.context.name }} · {{ user.context.phone }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-md border border-ink-300 px-4 py-2 text-sm text-ink-600 transition hover:bg-ink-100" @click="loginOpen = false">取消</button>
          <button data-testid="purchase-login-confirm" class="rounded-md bg-brand-500 px-4 py-2 text-sm text-white transition hover:bg-brand-600" @click="confirmLogin">登录</button>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-ink-500">商品不存在</div>
</template>
