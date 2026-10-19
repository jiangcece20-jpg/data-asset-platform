<script setup lang="ts">
import BuyDataOrders from './BuyDataOrders.vue'
import type { MyOrderCard } from '@/domain/myCenter'
import type { MineOrderSubjectFilter } from '@/composables/useMineOrders'

defineProps<{
  variant: 'mobile' | 'portal'
  subjectFilter: MineOrderSubjectFilter
  pay: (order: MyOrderCard) => void
  openBills: () => void
}>()

const emit = defineEmits<{
  'update:subjectFilter': [value: MineOrderSubjectFilter]
}>()

</script>

<template>
  <div>
    <BuyDataOrders
      :variant="variant"
      :subject-filter="subjectFilter"
      :pay="pay"
      :open-bills="openBills"
      @update:subject-filter="emit('update:subjectFilter', $event)"
    />
  </div>
</template>
