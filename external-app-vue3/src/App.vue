<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhoneShell from '@/layouts/PhoneShell.vue'
import AdminShell from '@/layouts/AdminShell.vue'

const route = useRoute()
const router = useRouter()

const isAdmin = computed(() => route.path.startsWith('/admin'))

function switchMode(target: 'app' | 'admin') {
  if (target === 'admin' && !isAdmin.value) router.push('/admin')
  if (target === 'app' && isAdmin.value) router.push('/app/home')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500 text-xs font-bold text-white">找</div>
        <div class="text-sm font-semibold text-slate-800">对外APP问数找数买数 · 交互原型</div>
      </div>
      <div class="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm">
        <button
          class="rounded-full px-3 py-1 transition"
          :class="!isAdmin ? 'bg-white shadow-sm font-medium text-brand-600' : 'text-slate-500'"
          @click="switchMode('app')"
        >
          移动端原型
        </button>
        <button
          class="rounded-full px-3 py-1 transition"
          :class="isAdmin ? 'bg-white shadow-sm font-medium text-brand-600' : 'text-slate-500'"
          @click="switchMode('admin')"
        >
          PC 运营后台
        </button>
      </div>
    </header>

    <main>
      <PhoneShell v-if="!isAdmin" />
      <AdminShell v-else />
    </main>
  </div>
</template>
