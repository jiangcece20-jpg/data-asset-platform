<script setup lang="ts">
import PurchasedData from './PurchasedData.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'
import type { DataTab } from '@/domain/mineQuery'

defineProps<{
  dataTab: DataTab
  variant: 'mobile' | 'portal'
}>()

const emit = defineEmits<{
  'update:dataTab': [value: DataTab]
}>()

const tabs: Array<{ value: DataTab; label: string }> = [
  { value: 'purchased', label: '我购买的数据' },
  { value: 'produced', label: '我生产的数据' }
]

function selectTab(next: DataTab) {
  emit('update:dataTab', next)
}
</script>

<template>
  <div>
    <div class="mb-3 flex w-fit gap-1 rounded-xl bg-slate-100 p-1 text-[13px]">
      <button
        v-for="item in tabs"
        :key="item.value"
        :data-testid="`data-tab-${item.value}`"
        class="rounded-lg px-4 py-2 transition"
        :class="dataTab === item.value ? 'bg-white font-medium text-brand-600 shadow-sm' : 'text-slate-500'"
        @click="selectTab(item.value)"
      >{{ item.label }}</button>
    </div>

    <PurchasedData v-if="dataTab === 'purchased'" :variant="variant" />
    <PlaceholderPanel v-else title="我生产的数据" />
  </div>
</template>
