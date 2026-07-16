<script setup lang="ts">
import { computed } from 'vue'
import type { AvailabilityStatus } from '@/types/domain'
import type { ServiceStatus } from '@/types/reverseFlow'

const props = defineProps<{
  availability: AvailabilityStatus
  serviceStatus: ServiceStatus
  hasAccess: boolean
}>()

const messages = {
  degraded: '当前服务降级，您的权益继续保留；恢复后将按影响情况补偿。',
  suspended: '当前商品正在进行风险处置，受影响能力已暂停；请在"我的－服务通知"查看进展。',
  terminated: '该商品已停止服务，我们将通过服务通知提供迁移或退款方案。',
  pausedOwned: '该商品已暂停新购，您已有的有效权益不受影响。',
  pausedUnowned: '该商品已暂停新购。',
  delisted: '该商品已下架。',
}

const notice = computed<{ text: string; tone: string } | null>(() => {
  // Priority: terminated → suspended → degraded → paused → delisted
  if (props.serviceStatus === 'terminated') {
    return { text: messages.terminated, tone: 'bg-slate-50 text-slate-600' }
  }
  if (props.serviceStatus === 'suspended') {
    return { text: messages.suspended, tone: 'bg-red-50 text-red-600' }
  }
  if (props.serviceStatus === 'degraded') {
    return { text: messages.degraded, tone: 'bg-amber-50 text-amber-700' }
  }
  if (props.availability === 'paused') {
    const text = props.hasAccess ? messages.pausedOwned : messages.pausedUnowned
    return { text, tone: 'bg-amber-50 text-amber-700' }
  }
  if (props.availability === 'delisted') {
    return { text: messages.delisted, tone: 'bg-slate-50 text-slate-600' }
  }
  return null
})
</script>

<template>
  <div v-if="notice" class="rounded-lg px-3 py-2 text-[12px] leading-relaxed" :class="notice.tone">
    {{ notice.text }}
  </div>
</template>
