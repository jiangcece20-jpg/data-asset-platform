<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { path: '/app/home', label: '首页', icon: '🏠' },
  { path: '/app/discover', label: '找数', icon: '🔍' },
  { path: '/app/mine', label: '我的', icon: '👤' }
]

const showTabBar = computed(() => tabs.some((t) => t.path === route.path))
const fillHeight = computed(() => route.path === '/app/discover' || route.path === '/app/ai-find')
</script>

<template>
  <div class="flex justify-center py-0 sm:py-8">
    <div class="relative flex h-[calc(100vh-49px)] w-full flex-col overflow-hidden border-0 border-slate-900 bg-white shadow-none sm:h-[800px] sm:w-[390px] sm:rounded-[2.5rem] sm:border-8 sm:shadow-2xl">
      <!-- 状态栏 -->
      <div class="flex shrink-0 items-center justify-between bg-white px-6 pb-1 pt-3 text-[11px] font-medium text-slate-900">
        <span>9:41</span>
        <span class="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900"></span>
        <span class="flex items-center gap-1">📶 🔋</span>
      </div>

      <!-- 内容区 -->
      <div class="flex-1 bg-slate-50" :class="fillHeight ? 'flex min-h-0 flex-col overflow-hidden' : 'phone-scroll overflow-y-auto'">
        <router-view v-slot="{ Component, route: r }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="r.fullPath" />
          </transition>
        </router-view>
      </div>

      <!-- 底部 Tab -->
      <div v-if="showTabBar" class="grid shrink-0 grid-cols-3 border-t border-slate-200 bg-white pb-2 pt-1.5">
        <router-link
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          class="flex flex-col items-center gap-0.5 py-1 text-[11px]"
          :class="route.path === tab.path ? 'text-brand-600 font-medium' : 'text-slate-400'"
        >
          <span class="text-base leading-none">{{ tab.icon }}</span>
          {{ tab.label }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
