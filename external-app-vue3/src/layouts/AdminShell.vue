<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

type NavLeaf = { path: string; label: string; icon: string; badge?: string }
type NavGroup = { key: string; label: string; icon: string; children: NavLeaf[] }
type NavLink = { key: string; label: string; icon: string; path: string; note?: string }

const operationsNav: NavGroup = {
  key: 'operations',
  label: '运营管理',
  icon: '🧭',
  children: [
    { path: '/admin', label: '概览', icon: '📊' },
    { path: '/admin/resources', label: '资源管理', icon: '🗂️', badge: '重点' },
    { path: '/admin/commerce', label: '商业化中心', icon: '💰', badge: '重点' },
    { path: '/admin/orders', label: '订单中心', icon: '🧾' },
    { path: '/admin/enterprise', label: '企业权益', icon: '🏢', badge: '重点' },
    { path: '/admin/trials-leads', label: '试用与线索', icon: '📝', badge: '重点' },
    { path: '/admin/operations', label: '运营配置', icon: '⚙️' },
    { path: '/admin/approval', label: '审批与集成', icon: '✅', badge: '重点' }
  ]
}

const permissionNav: NavLink = {
  key: 'permissions',
  label: '权限管理',
  icon: '🔐',
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
    <aside class="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4">
      <div class="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">APP 运营后台</div>
      <nav class="space-y-2">
        <div>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition"
            :class="isOperationsRoute ? 'bg-slate-100 text-slate-800' : 'text-slate-700 hover:bg-slate-50'"
            @click="operationsOpen = !operationsOpen"
          >
            <span class="flex items-center gap-2">
              <span>{{ operationsNav.icon }}</span>
              {{ operationsNav.label }}
            </span>
            <span class="text-[10px] text-slate-400">{{ operationsOpen ? '收起' : '展开' }}</span>
          </button>
          <div v-show="operationsOpen" class="mt-1 space-y-1 border-l border-slate-100 pl-2">
            <router-link
              v-for="item in operationsNav.children"
              :key="item.path"
              :to="item.path"
              class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition"
              :class="isActive(item.path) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'"
            >
              <span class="flex items-center gap-2">
                <span>{{ item.icon }}</span>
                {{ item.label }}
              </span>
              <span v-if="item.badge" class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">{{ item.badge }}</span>
            </router-link>
          </div>
        </div>

        <router-link
          :to="permissionNav.path"
          class="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition"
          :class="isActive(permissionNav.path) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'"
        >
          <span class="flex items-center gap-2">
            <span>{{ permissionNav.icon }}</span>
            {{ permissionNav.label }}
          </span>
          <span v-if="permissionNav.note" class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{{ permissionNav.note }}</span>
        </router-link>
      </nav>
      <div class="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        找数买数相关能力集中在「运营管理」；「权限管理」表示后台还包含角色、账号等其他能力，本期仅作结构示意。
      </div>
    </aside>
    <section class="flex-1 overflow-x-hidden bg-slate-50 p-6">
      <router-view />
    </section>
  </div>
</template>
