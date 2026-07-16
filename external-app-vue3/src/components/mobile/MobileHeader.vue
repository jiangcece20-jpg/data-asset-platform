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
    class="sticky top-0 z-10 flex h-11 shrink-0 items-center px-3"
    :class="transparent ? 'bg-transparent' : 'border-b border-slate-100 bg-white'"
  >
    <button v-if="showBack" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100" @click="back">
      ‹
    </button>
    <div class="flex-1 text-center text-[15px] font-medium text-slate-800" :class="showBack ? '-ml-7' : ''">{{ props.title }}</div>
  </div>
</template>
