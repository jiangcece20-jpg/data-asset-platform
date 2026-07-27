import { onBeforeUnmount, onMounted, ref } from 'vue'

export const RESPONSIVE_NOW_INTERVAL_MS = 30 * 1000

export function useResponsiveNow(intervalMs = RESPONSIVE_NOW_INTERVAL_MS) {
  const now = ref(new Date())
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date()
    }, intervalMs)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return now
}
