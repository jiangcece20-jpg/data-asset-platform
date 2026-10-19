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
  degraded: '后续更新异常，历史已交付数据按实际使用权益保留。',
  suspended: '当前商品正在进行风险处置，受影响能力已暂停；请在"我的－服务通知"查看进展。',
  terminated: '该商品服务不可用，请查看原订单或联系运营核实。',
  delisted: '该商品已下架。',
}

const notice = computed<{ text: string; tone: string } | null>(() => {
  // Service availability and actual rights remain independent of delisting.
  if (props.serviceStatus === 'terminated') {
    return { text: messages.terminated, tone: 'bg-ink-100 text-ink-600' }
  }
  if (props.serviceStatus === 'suspended') {
    return { text: messages.suspended, tone: 'bg-red-50 text-red-600' }
  }
  if (props.serviceStatus === 'degraded') {
    return { text: messages.degraded, tone: 'bg-warning-50 text-warning-600' }
  }
  if (props.availability === 'delisted' || props.availability === 'paused') {
    return { text: messages.delisted, tone: 'bg-ink-100 text-ink-600' }
  }
  return null
})
</script>

<template>
  <div v-if="notice" class="rounded-lg px-3 py-2 text-[12px] leading-relaxed" :class="notice.tone">
    {{ notice.text }}
  </div>
</template>
