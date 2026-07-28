<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const nav = [
  { path: '/admin', label: '概览', icon: '📊' },
  { path: '/admin/resources', label: '资源管理', icon: '🗂️', badge: '重点' },
  { path: '/admin/commerce', label: '商业化中心', icon: '💰', badge: '重点' },
  { path: '/admin/orders', label: '订单中心', icon: '🧾' },
  { path: '/admin/enterprise', label: '企业权益', icon: '🏢', badge: '重点' },
  { path: '/admin/trials-leads', label: '试用与线索', icon: '📝', badge: '重点' },
  { path: '/admin/operations', label: '运营配置', icon: '⚙️' },
  { path: '/admin/approval', label: '审批与集成', icon: '✅', badge: '重点' }
]

function isActive(path: string) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex" style="min-height: calc(100vh - 49px)">
    <aside class="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4">
      <div class="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">APP 运营后台</div>
      <nav class="space-y-1">
        <router-link
          v-for="item in nav"
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
      </nav>
      <div class="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        资产选料、数据字典与出域审批仍在数据资产管理平台完成；本后台仅展示关联状态与跳转入口。
      </div>
    </aside>
    <section class="flex-1 overflow-x-hidden bg-slate-50 p-6">
      <router-view />
    </section>
  </div>
</template>
