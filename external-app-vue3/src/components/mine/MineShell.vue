<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrdersPanel from './OrdersPanel.vue'
import DataPanel from './DataPanel.vue'
import SellerPanel from './SellerPanel.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'
import { useUserStore } from '@/stores/user'
import {
  parseMineQuery,
  mineQueryPatch,
  type MineMenu,
  type OrderTab,
  type DataTab,
  type SellerTab,
  type MineSubject
} from '@/domain/mineQuery'
import type { MyOrderCard } from '@/domain/myCenter'
import type { MineOrderSubjectFilter } from '@/composables/useMineOrders'

const props = defineProps<{ layout: 'mobile' | 'portal' }>()

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const state = computed(() => parseMineQuery(route.query))

const menus: Array<{ value: MineMenu; label: string; icon: string }> = [
  { value: 'vip', label: '成为VIP', icon: '👑' },
  { value: 'orders', label: '我的订单', icon: '🧾' },
  { value: 'messages', label: '消息中心', icon: '💬' },
  { value: 'favorites', label: '我的收藏', icon: '⭐' },
  { value: 'profile', label: '个人信息', icon: '🙍' },
  { value: 'data', label: '我的数据', icon: '🗂️' },
  { value: 'seller', label: '卖家中心', icon: '🏪' }
]

const menuLabel = computed(() => menus.find((item) => item.value === state.value.menu)?.label)

function selectMenu(next: MineMenu) {
  void router.replace({ query: mineQueryPatch({ menu: next }, route.query) })
}

function selectOrderTab(next: OrderTab) {
  void router.replace({ query: mineQueryPatch({ orderTab: next }, route.query) })
}

function selectDataTab(next: DataTab) {
  void router.replace({ query: mineQueryPatch({ dataTab: next }, route.query) })
}

function selectSellerTab(next: SellerTab) {
  void router.replace({ query: mineQueryPatch({ sellerTab: next }, route.query) })
}

const subjectFilter = computed<MineOrderSubjectFilter>(() => state.value.subject ?? 'all')

function setSubjectFilter(next: MineOrderSubjectFilter) {
  void router.replace({ query: { ...route.query, subject: next === 'all' ? undefined : (next as MineSubject) } })
}

function pay(order: MyOrderCard) {
  if (!order.paymentPath) return
  const path = props.layout === 'portal' ? order.paymentPath.replace(/^\/app\//, '/portal/') : order.paymentPath
  router.push(path)
}

function openBills() {
  if (props.layout === 'portal') {
    router.push('/portal/bills')
    return
  }
  if (user.isEnterpriseAuthenticated) {
    router.push('/app/mine/enterprise/bills')
    return
  }
  router.push({ path: '/app/enterprise-auth', query: { redirect: '/app/mine/enterprise/bills' } })
}

const portalLegacyTestId: Partial<Record<MineMenu, string>> = {
  orders: 'portal-my-orders-tab',
  data: 'portal-my-data-tab'
}
</script>

<template>
  <div v-if="layout === 'mobile'">
    <div class="px-4 pt-3">
      <div class="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-slate-900 to-brand-800 p-4 text-white shadow-card">
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg">👤</div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[14px] font-semibold">{{ user.context.name }}</div>
          <div class="mt-0.5 truncate text-[11px] text-white/65">
            {{ user.isEnterpriseAuthenticated ? user.enterprise.name : '个人身份 · 企业认证后可查看企业订单' }}
          </div>
        </div>
        <button class="rounded-full bg-white/15 px-3 py-1.5 text-[11px]" @click="router.push('/app/mine/enterprise')">企业中心 ›</button>
      </div>

      <!-- 横滑菜单 + 右侧渐变截断漏出半个 logo -->
      <!-- 外层 relative+overflow-hidden 截断 logo 右侧部分 -->
      <div class="relative mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white py-3 shadow-card">
        <!-- 内层 flex：logo 区域固定，items 区域宽度 = 100% + logo 宽度 -->
        <div class="flex items-center">
          <!-- 滚动区域：宽度超出父容器，让 logo 右侧部分漏出 -->
          <div
            class="flex h-full flex-none items-center overflow-x-auto px-3 [&::-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&]:[-ms-overflow-style:none] [&]:[scrollbar-width:none]"
            style="width: calc(100% + 40px)"
          >
            <button
              v-for="item in menus"
              :key="item.value"
              :data-testid="`mine-menu-${item.value}`"
              class="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 text-[11px] transition"
              :class="state.menu === item.value ? 'font-medium text-brand-600' : 'text-slate-600'"
              @click="selectMenu(item.value)"
            >
              <span
                class="flex h-10 w-10 items-center justify-center rounded-xl text-lg leading-none"
                :class="state.menu === item.value ? 'bg-brand-50' : 'bg-transparent'"
              >{{ item.icon }}</span>
              <span class="truncate">{{ item.label }}</span>
            </button>
          </div>
          <!-- 右侧 logo 区域：在 items 流内，右侧部分被外层 overflow-hidden 截断 -->
          <div class="h-10 w-10 flex-none rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-lg text-white shadow-sm flex items-center justify-center">
            ⋯
          </div>
        </div>
        <!-- 右侧渐变遮罩（可选，增强视觉） -->
        <div class="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-transparent to-white" />
      </div>
    </div>

    <div class="mt-3">
      <OrdersPanel
        v-if="state.menu === 'orders'"
        class="px-4"
        :order-tab="state.orderTab"
        variant="mobile"
        :subject-filter="subjectFilter"
        :pay="pay"
        :open-bills="openBills"
        @update:order-tab="selectOrderTab"
        @update:subject-filter="setSubjectFilter"
      />
      <DataPanel
        v-else-if="state.menu === 'data'"
        class="px-4"
        :data-tab="state.dataTab"
        variant="mobile"
        @update:data-tab="selectDataTab"
      />
      <SellerPanel
        v-else-if="state.menu === 'seller'"
        class="px-4"
        :seller-tab="state.sellerTab"
        variant="mobile"
        @update:seller-tab="selectSellerTab"
      />
      <PlaceholderPanel v-else class="mx-4" :title="menuLabel" />
    </div>
  </div>

  <div v-else class="mx-auto flex max-w-6xl items-start gap-6 py-6" data-testid="mine-shell-portal">
    <aside class="w-60 shrink-0 space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl">👤</div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold text-slate-900">{{ user.context.name }}</div>
            <div class="mt-0.5 truncate text-xs text-slate-400">
              {{ user.isEnterpriseAuthenticated ? user.enterprise.name : '个人身份' }}
            </div>
          </div>
        </div>
        <button
          v-if="user.isEnterpriseAuthenticated"
          class="mt-4 w-full rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-600"
          @click="router.push('/portal/enterprise')"
        >
          企业中心 ›
        </button>
      </div>

      <nav class="space-y-1 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          v-for="item in menus"
          :key="item.value"
          :data-testid="portalLegacyTestId[item.value] ?? `mine-menu-${item.value}`"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition"
          :class="state.menu === item.value ? 'bg-brand-50 font-medium text-brand-600' : 'text-slate-600 hover:bg-slate-50'"
          @click="selectMenu(item.value)"
        >
          <span class="text-base leading-none">{{ item.icon }}</span>
          <span :data-testid="portalLegacyTestId[item.value] ? `mine-menu-${item.value}` : undefined">{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <section class="min-w-0 flex-1">
      <h1 class="mb-5 text-xl font-semibold text-slate-900">{{ menuLabel }}</h1>
      <OrdersPanel
        v-if="state.menu === 'orders'"
        :order-tab="state.orderTab"
        variant="portal"
        :subject-filter="subjectFilter"
        :pay="pay"
        :open-bills="openBills"
        @update:order-tab="selectOrderTab"
        @update:subject-filter="setSubjectFilter"
      />
      <DataPanel
        v-else-if="state.menu === 'data'"
        :data-tab="state.dataTab"
        variant="portal"
        @update:data-tab="selectDataTab"
      />
      <SellerPanel
        v-else-if="state.menu === 'seller'"
        :seller-tab="state.sellerTab"
        variant="portal"
        @update:seller-tab="selectSellerTab"
      />
      <PlaceholderPanel v-else :title="menuLabel" />
    </section>
  </div>
</template>
