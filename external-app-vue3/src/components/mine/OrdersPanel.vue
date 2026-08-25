<script setup lang="ts">
import { computed } from 'vue'
import BuyDataOrders from './BuyDataOrders.vue'
import PlaceholderPanel from './PlaceholderPanel.vue'
import MineEntityCard from './MineEntityCard.vue'
import type { MyOrderCard } from '@/domain/myCenter'
import type { OrderTab } from '@/domain/mineQuery'
import type { MineOrderSubjectFilter } from '@/composables/useMineOrders'
import { useCatalogStore } from '@/stores/catalog'
import { useSpaceIntentStore } from '@/stores/spaceIntents'
import { useUserStore } from '@/stores/user'
import { USER_STATUS_LABELS, userStatusOf } from '@/domain/spaceIntent'

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

const catalog = useCatalogStore()
const intents = useSpaceIntentStore()
const user = useUserStore()

const tabs: Array<{ value: OrderTab; label: string }> = [
  { value: 'vip', label: 'VIP' },
  { value: 'buy', label: '买数' },
  { value: 'view', label: '看数' },
  { value: 'intent', label: '意向单' }
]

const myIntents = computed(() => intents.userVisibleByOwner(user.context.currentMemberId))

function productName(productId: string) {
  return catalog.byId(productId)?.name ?? productId
}

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
    <PlaceholderPanel v-else-if="orderTab === 'view'" title="看数" class="mt-3" />
    <div v-else-if="orderTab === 'intent'" class="mt-3 space-y-3" data-testid="my-space-intents">
      <MineEntityCard v-for="intent in myIntents" :key="intent.id" :variant="variant">
        <template #title>{{ productName(intent.productId) }}</template>
        <template #status>
          <span class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
            {{ USER_STATUS_LABELS[userStatusOf(intent.opsStatus)] }}
          </span>
        </template>
        <template #meta>
          <div>
            <div class="text-slate-400">联系人</div>
            <div class="text-slate-700">{{ intent.contactName }}</div>
          </div>
          <div>
            <div class="text-slate-400">场景</div>
            <div class="text-slate-700">{{ intent.scenario }}</div>
          </div>
        </template>
      </MineEntityCard>
      <div v-if="!myIntents.length" class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-[12px] text-slate-500">
        暂无意向单
      </div>
    </div>
  </div>
</template>
