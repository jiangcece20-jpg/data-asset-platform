<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    showBack?: boolean
    transparent?: boolean
    /** 置于深色/蓝色头部之上：透明底、白色标题与箭头 */
    tone?: 'dark' | 'light'
  }>(),
  { showBack: true, transparent: false, tone: 'dark' }
)

const router = useRouter()

function back() {
  if (window.history.length > 1) router.back()
  else router.push('/app/discover')
}
</script>

<template>
  <div
    class="relative z-20 grid h-12 shrink-0 grid-cols-[44px_1fr_44px] items-center px-1"
    :class="[
      props.transparent || props.tone === 'light' ? 'bg-transparent' : 'border-b border-ink-100 bg-white',
      props.tone === 'light' ? 'text-white' : 'text-ink-800'
    ]"
  >
    <button
      v-if="showBack"
      type="button"
      aria-label="返回"
      class="relative z-20 flex h-11 w-11 items-center justify-center rounded-full transition active:bg-black/5"
      @click="back"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <span v-else></span>

    <div class="truncate text-center text-[15px] font-medium">{{ props.title }}</div>

    <div class="flex h-full items-center justify-end pr-1">
      <slot />
    </div>
  </div>
</template>
