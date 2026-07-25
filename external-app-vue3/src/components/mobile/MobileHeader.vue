<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    showBack?: boolean
    transparent?: boolean
  }>(),
  { showBack: true, transparent: false }
)

const router = useRouter()

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/app/discover')
}
</script>

<template>
  <div
    class="sticky top-0 z-10 grid h-12 shrink-0 grid-cols-[44px_1fr_44px] items-center px-1"
    :class="transparent ? 'bg-transparent' : 'border-b border-slate-100 bg-white'"
  >
    <button
      v-if="showBack"
      type="button"
      aria-label="返回"
      class="relative z-20 flex h-11 w-11 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"
      @click="back"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <span v-else></span>

    <div class="truncate text-center text-[15px] font-medium text-slate-800">{{ props.title }}</div>

    <span></span>
  </div>
</template>
