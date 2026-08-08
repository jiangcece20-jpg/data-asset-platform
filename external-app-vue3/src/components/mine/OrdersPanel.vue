<script setup lang="ts">
import BuyDataOrders from './BuyDataOrders.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'
import type { MyOrderCard } from '@/domain/myCenter'
import type { OrderTab } from '@/domain/mineQuery'
import type { MineOrderSubjectFilter } from '@/composables/useMineOrders'

defineProps<{
  orderTab: OrderTab
  variant: 'mobile' | 'portal'
  subjectFilter: MineOrderSubjectFilter
  goProduct: (order: MyOrderCard) => void
  pay: (order: MyOrderCard) => void
  openBills: () => void
}>()

const emit = defineEmits<{
  'update:orderTab': [value: OrderTab]
  'update:subjectFilter': [value: MineOrderSubjectFilter]
  'view-purchased-data': []
}>()

const tabs: Array<{ value: OrderTab; label: string }> = [
  { value: 'vip', label: 'VIP' },
  { value: 'buy', label: '买数' },
  { value: 'view', label: '看数' }
]

function selectTab(next: OrderTab) {
  emit('update:orderTab', next)
}
</script>

<template>
  <div>
    <div class="flex gap-4 border-b border-slate-100 px-1 text-[13px]">
      <button
        v-for="item in tabs"
        :key="item.value"
        :data-testid="`order-tab-${item.value}`"
        class="border-b-2 px-1 py-2 transition"
        :class="orderTab === item.value ? 'border-brand-500 font-medium text-brand-600' : 'border-transparent text-slate-500'"
        @click="selectTab(item.value)"
      >{{ item.label }}</button>
    </div>

    <BuyDataOrders
      v-if="orderTab === 'buy'"
      :variant="variant"
      :subject-filter="subjectFilter"
      :go-product="goProduct"
      :pay="pay"
      :open-bills="openBills"
      @update:subject-filter="emit('update:subjectFilter', $event)"
      @view-purchased-data="emit('view-purchased-data')"
    />
    <PlaceholderPanel v-else-if="orderTab === 'vip'" title="VIP" class="mt-3" />
    <PlaceholderPanel v-else title="看数" class="mt-3" />
  </div>
</template>
