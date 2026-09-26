<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  IconCommon,
  IconDashboard,
  IconStorage,
  IconGift,
  IconList,
  IconUserGroup,
  IconEdit,
  IconSettings,
  IconLock
} from '@arco-design/web-vue/es/icon'

const route = useRoute()

type NavLeaf = { path: string; label: string; icon: any; badge?: string }
type NavGroup = { key: string; label: string; icon: any; children: NavLeaf[] }
type NavLink = { key: string; label: string; icon: any; path: string; note?: string }

const operationsNav: NavGroup = {
  key: 'operations',
  label: '运营管理',
  icon: IconCommon,
  children: [
    { path: '/admin', label: '概览', icon: IconDashboard },
    { path: '/admin/resources', label: '资源管理', icon: IconStorage, badge: '重点' },
    { path: '/admin/commerce', label: '商业化中心', icon: IconGift },
    { path: '/admin/orders', label: '订单中心', icon: IconList, badge: '重点' },
    { path: '/admin/sellers', label: '入驻商家', icon: IconUserGroup, badge: 'MVP' },
    { path: '/admin/trials-leads', label: '试用与线索', icon: IconEdit, badge: '重点' },
    { path: '/admin/operations', label: '运营配置', icon: IconSettings }
  ]
}

const permissionNav: NavLink = {
  key: 'permissions',
  label: '权限管理',
  icon: IconLock,
  path: '/admin/permissions',
  note: '示意'
}

const isOperationsRoute = computed(() =>
  operationsNav.children.some((item) => isActive(item.path))
)

const operationsOpen = ref(true)

watch(
  isOperationsRoute,
  (active) => {
    if (active) operationsOpen.value = true
  },
  { immediate: true }
)

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex" style="min-height: calc(100vh - 49px)">
    <aside class="w-56 shrink-0 border-r border-ink-200 bg-white px-3 py-4">
      <div class="mb-4 flex items-center gap-2 px-2">
        <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">万</span>
        <div class="leading-tight">
          <div class="text-sm font-semibold text-ink-900">万联灵析</div>
          <div class="text-[10px] text-ink-500">运营后台</div>
        </div>
      </div>
      <nav class="space-y-2">
        <div>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-900 transition hover:bg-ink-100"
            @click="operationsOpen = !operationsOpen"
          >
            <span class="flex items-center gap-2.5">
              <component :is="operationsNav.icon" class="text-base text-ink-500" />
              {{ operationsNav.label }}
            </span>
            <svg
              class="h-3.5 w-3.5 text-ink-400 transition-transform"
              :class="operationsOpen ? 'rotate-90' : ''"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            ><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <div v-show="operationsOpen" class="mt-1 space-y-0.5">
            <router-link
              v-for="item in operationsNav.children"
              :key="item.path"
              :to="item.path"
              class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition"
              :class="isActive(item.path)
                ? 'bg-brand-50 font-medium text-brand-600'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'"
            >
              <span class="flex items-center gap-2.5">
                <component :is="item.icon" class="text-[15px]" :class="isActive(item.path) ? 'text-brand-500' : 'text-ink-400'" />
                {{ item.label }}
              </span>
              <span
                v-if="item.badge"
                class="rounded px-1.5 py-px text-[10px] leading-4"
                :class="item.badge === 'MVP'
                  ? 'bg-warning-50 text-warning-600'
                  : 'bg-brand-50 text-brand-600'"
              >{{ item.badge }}</span>
            </router-link>
          </div>
        </div>

        <router-link
          :to="permissionNav.path"
          class="mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-sm transition"
          :class="isActive(permissionNav.path)
            ? 'bg-brand-50 font-medium text-brand-600'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'"
        >
          <span class="flex items-center gap-2.5">
            <component :is="permissionNav.icon" class="text-[15px]" :class="isActive(permissionNav.path) ? 'text-brand-500' : 'text-ink-400'" />
            {{ permissionNav.label }}
          </span>
          <span v-if="permissionNav.note" class="rounded bg-ink-200 px-1.5 py-0.5 text-[10px] text-ink-500">{{ permissionNav.note }}</span>
        </router-link>
      </nav>
      <div class="mt-6 rounded-lg bg-ink-100 p-3 text-xs leading-relaxed text-ink-500">
        找数买数相关能力集中在「运营管理」；「权限管理」表示后台还包含角色、账号等其他能力，本期仅作结构示意。
      </div>
    </aside>
    <section class="min-w-0 flex-1 overflow-x-hidden bg-ink-100 p-6">
      <router-view />
    </section>
  </div>
</template>
