<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const nav = [
  { path: '/portal/home', label: '门户首页', icon: '📊' },
  { path: '/portal/search', label: '搜索发现', icon: '🔍' },
  { path: '/portal/mine', label: '我的', icon: '👤' },
  { path: '/portal/enterprise', label: '企业中心', icon: '🏢' },
  { path: '/portal/demand', label: '需求提报', icon: '📝' }
]

function isActive(path: string) {
  if (path === '/portal/mine' && route.path.startsWith('/portal/bills')) return true
  if (path === '/portal/enterprise' && route.path.startsWith('/portal/enterprise')) return true
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="flex" style="min-height: calc(100vh - 49px)">
    <aside class="w-56 shrink-0 border-r border-slate-200 bg-white px-3 py-4">
      <div class="mb-3 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">找数买数</div>
      <nav class="space-y-1">
        <router-link
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
          :class="isActive(item.path) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </router-link>
      </nav>
    </aside>
    <section class="flex-1 overflow-x-hidden bg-slate-50 p-6">
      <router-view />
    </section>
  </div>
</template>
