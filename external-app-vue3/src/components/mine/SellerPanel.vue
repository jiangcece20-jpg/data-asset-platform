<script setup lang="ts">
import { computed } from 'vue'
import SellerApply from '@/views/mobile/SellerApply.vue'
import SellerListingApply from '@/views/mobile/SellerListingApply.vue'
import SellerOrders from '@/views/mobile/SellerOrders.vue'
import SellerListingsPanel from './SellerListingsPanel.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import type { SellerTab } from '@/domain/mineQuery'

const props = defineProps<{
  sellerTab: SellerTab
  variant: 'mobile' | 'portal'
}>()

const emit = defineEmits<{
  'update:sellerTab': [value: SellerTab]
}>()

const seller = useSellerMarketStore()

const tabs: Array<{ value: SellerTab; label: string }> = [
  { value: 'apply', label: '入驻申请' },
  { value: 'listing', label: '新建上架' },
  { value: 'orders', label: '卖家订单' },
  { value: 'listings', label: '我的上架单' }
]

const gateMessage = computed(() => {
  const status = seller.myProfile?.status
  if (!status || status === 'none' || status === 'rejected') return '请先完成入驻申请'
  if (status === 'pending_review' || status === 'need_supplement') return '准入审核处理中，通过后可使用上架与订单功能'
  if (status === 'suspended') return '卖家资格已暂停，请联系运营'
  return ''
})

function selectTab(next: SellerTab) {
  emit('update:sellerTab', next)
}
</script>

<template>
  <div data-testid="seller-panel">
    <div class="flex gap-4 overflow-x-auto border-b border-slate-100 px-1 text-[13px]">
      <button
        v-for="item in tabs"
        :key="item.value"
        :data-testid="`seller-tab-${item.value}`"
        class="shrink-0 border-b-2 px-1 py-2 transition"
        :class="sellerTab === item.value ? 'border-brand-500 font-medium text-brand-600' : 'border-transparent text-slate-500'"
        @click="selectTab(item.value)"
      >{{ item.label }}</button>
    </div>

    <SellerApply v-if="sellerTab === 'apply'" embedded :variant="variant" @done="selectTab('listings')" />

    <template v-else-if="sellerTab === 'listing'">
      <div v-if="gateMessage" class="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-[12px] text-amber-800">
        {{ gateMessage }}
        <button class="ml-2 font-medium text-brand-600" @click="selectTab('apply')">去入驻申请</button>
      </div>
      <SellerListingApply v-else embedded :variant="variant" @done="selectTab('listings')" />
    </template>

    <template v-else-if="sellerTab === 'orders'">
      <div v-if="gateMessage" class="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-[12px] text-amber-800">
        {{ gateMessage }}
        <button class="ml-2 font-medium text-brand-600" @click="selectTab('apply')">去入驻申请</button>
      </div>
      <SellerOrders v-else embedded :variant="variant" />
    </template>

    <template v-else>
      <div v-if="gateMessage" class="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-[12px] text-amber-800">
        {{ gateMessage }}
        <button class="ml-2 font-medium text-brand-600" @click="selectTab('apply')">去入驻申请</button>
      </div>
      <SellerListingsPanel v-else :variant="variant" @create-listing="selectTab('listing')" />
    </template>
  </div>
</template>
