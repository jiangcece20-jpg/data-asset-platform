<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

// 线上全产品顶部导航；本原型只覆盖「找数买数」与「我的」
const nav = [
  { key: 'home', label: '首页', external: true },
  { key: 'wumao', label: '物贸一体', external: true },
  { key: 'kan', label: '看数', external: true },
  { key: 'yong', label: '用数', external: true },
  { key: 'market', label: '找数买数', path: '/portal/search' },
  { key: 'cai', label: '采数', external: true },
  { key: 'mine', label: '我的', path: '/portal/mine' }
]

const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function notifyExternal() {
  toast.value = '该模块不在本次原型范围内，当前演示「找数买数」'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function isActive(key: string, path?: string) {
  if (key === 'mine') {
    return route.path.startsWith('/portal/mine')
      || route.path.startsWith('/portal/bills')
      || route.path.startsWith('/portal/enterprise')
  }
  if (key === 'market') {
    return route.path.startsWith('/portal') && !isActive('mine')
  }
  if (path) return route.path.startsWith(path)
  return false
}
</script>

<template>
  <div class="min-h-[calc(100vh-93px)]">
    <!-- 顶部全局导航（对齐线上：首页/物贸一体/看数/用数/找数买数/采数/我的） -->
    <header class="z-40 border-b border-ink-100 bg-white">
      <div class="mx-auto flex h-14 max-w-[1200px] items-center px-6">
        <!-- 品牌 -->
        <router-link to="/portal/search" class="flex shrink-0 items-center gap-2 pr-4">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">万</span>
          <span class="text-[15px] font-semibold text-ink-900">万联灵析</span>
        </router-link>

        <!-- 横向导航 -->
        <nav class="flex h-full items-center">
          <template v-for="item in nav" :key="item.key">
            <a
              v-if="item.external"
              class="relative flex h-full cursor-pointer items-center px-3.5 text-sm text-ink-700 transition hover:text-brand-600"
              @click="notifyExternal"
            >
              {{ item.label }}
            </a>
            <router-link
              v-else
              :to="item.path!"
              class="relative flex h-full items-center px-3.5 text-sm transition"
              :class="isActive(item.key, item.path) ? 'font-medium text-brand-600' : 'text-ink-700 hover:text-brand-600'"
            >
              {{ item.label }}
              <span v-if="isActive(item.key, item.path)" class="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500"></span>
            </router-link>
          </template>
        </nav>

        <span class="flex-1"></span>

        <!-- 右侧用户区 -->
        <router-link to="/portal/mine" class="flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-ink-100">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white">
            {{ userStore.context.name.slice(0, 1) }}
          </span>
          <span class="text-[13px] font-medium text-ink-700">{{ userStore.context.name }}</span>
        </router-link>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="px-6 py-5">
      <router-view />
    </main>

    <!-- 原型范围提示 -->
    <transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-200"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toast"
        class="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-[13px] text-white shadow-float"
      >
        {{ toast }}
      </div>
    </transition>
  </div>
</template>
