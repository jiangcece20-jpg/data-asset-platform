<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrdersPanel from './OrdersPanel.vue'
import DataPanel from './DataPanel.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'
import { useUserStore } from '@/stores/user'
import { parseMineQuery, mineQueryPatch, type MineMenu, type OrderTab, type DataTab, type MineSubject } from '@/domain/mineQuery'
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
  { value: 'data', label: '我的数据', icon: '🗂️' }
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

const subjectFilter = computed<MineOrderSubjectFilter>(() => state.value.subject ?? 'all')

function setSubjectFilter(next: MineOrderSubjectFilter) {
  void router.replace({ query: { ...route.query, subject: next === 'all' ? undefined : (next as MineSubject) } })
}

function goProduct(order: MyOrderCard) {
  const basePath = props.layout === 'portal' ? '/portal' : '/app'
  router.push(`${basePath}/product/${order.productId}`)
}

function pay(order: MyOrderCard) {
  if (order.paymentPath) router.push(order.paymentPath)
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

function viewPurchasedData() {
  selectMenu('data')
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

      <div class="mt-3 grid grid-cols-3 gap-y-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
        <button
          v-for="item in menus"
          :key="item.value"
          :data-testid="`mine-menu-${item.value}`"
          class="flex flex-col items-center gap-1.5 rounded-xl py-2 text-[11px] transition"
          :class="state.menu === item.value ? 'bg-brand-50 font-medium text-brand-600' : 'text-slate-600'"
          @click="selectMenu(item.value)"
        >
          <span class="text-lg leading-none">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <button
        data-testid="seller-center-entry"
        class="mt-2 flex w-full items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-left"
        @click="router.push('/app/seller')"
      >
        <div>
          <div class="text-[13px] font-medium text-orange-800">卖家中心 · 入驻商家</div>
          <div class="mt-0.5 text-[11px] text-orange-700/80">上架用数看板 · 自收款确认 · 卖家订单</div>
        </div>
        <span class="text-orange-600">›</span>
      </button>
    </div>

    <div class="mt-3">
      <OrdersPanel
        v-if="state.menu === 'orders'"
        class="px-4"
        :order-tab="state.orderTab"
        variant="mobile"
        :subject-filter="subjectFilter"
        :go-product="goProduct"
        :pay="pay"
        :open-bills="openBills"
        @update:order-tab="selectOrderTab"
        @update:subject-filter="setSubjectFilter"
        @view-purchased-data="viewPurchasedData"
      />
      <DataPanel
        v-else-if="state.menu === 'data'"
        class="px-4"
        :data-tab="state.dataTab"
        variant="mobile"
        @update:data-tab="selectDataTab"
      />
      <PlaceholderPanel v-else class="mx-4" :title="menuLabel" />
    </div>
  </div>

  <div v-else class="mx-auto max-w-6xl" data-testid="mine-shell-portal">
    <OrdersPanel
      v-if="state.menu === 'orders'"
      :order-tab="state.orderTab"
      variant="portal"
      :subject-filter="subjectFilter"
      :go-product="goProduct"
      :pay="pay"
      :open-bills="openBills"
      @update:order-tab="selectOrderTab"
      @update:subject-filter="setSubjectFilter"
      @view-purchased-data="viewPurchasedData"
    />
    <DataPanel
      v-else-if="state.menu === 'data'"
      :data-tab="state.dataTab"
      variant="portal"
      @update:data-tab="selectDataTab"
    />
    <PlaceholderPanel v-else :title="menuLabel" />
  </div>
</template>
