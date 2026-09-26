<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MineEntityCard from './MineEntityCard.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'

defineProps<{ variant: 'mobile' | 'portal' }>()

const emit = defineEmits<{ 'create-listing': [] }>()

const router = useRouter()
const seller = useSellerMarketStore()

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    none: '未申请',
    pending_review: '准入审核中',
    need_supplement: '待补正',
    approved: '已准入',
    rejected: '已驳回',
    suspended: '已暂停'
  }
  return map[seller.myProfile?.status || 'none']
})
</script>

<template>
  <div class="mt-3 space-y-3" data-testid="seller-listings-panel">
    <div class="rounded-xl border border-warning-100 bg-warning-50 px-3 py-2 text-[11px] text-warning-600">
      卖家状态：{{ statusLabel }}
      <span v-if="seller.myProfile?.displayName"> · {{ seller.myProfile.displayName }}</span>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-[13px] font-medium text-ink-900">我的上架单</div>
      <button
        data-testid="seller-create-listing"
        class="rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white"
        :disabled="!seller.isApprovedSeller"
        @click="emit('create-listing')"
      >新建上架单</button>
    </div>

    <MineEntityCard v-for="item in seller.myListings" :key="item.id" :variant="variant">
      <template #badges>
        <span class="rounded-full bg-warning-50 px-2 py-0.5 text-warning-600">上架单</span>
        <span class="font-mono text-ink-500">{{ item.id }}</span>
      </template>
      <template #title>{{ item.title }}</template>
      <template #status>
        <span class="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">{{ item.status }}</span>
      </template>
      <template #meta>
        <div><span class="text-ink-500">个人价</span><div class="mt-0.5 font-semibold text-brand-600">¥{{ item.price }}</div></div>
        <div><span class="text-ink-500">企业价</span><div class="mt-0.5 font-semibold text-brand-600">¥{{ item.enterprisePrice }}</div></div>
        <div><span class="text-ink-500">来源</span><div class="mt-0.5 text-ink-700">{{ item.dataProvenance === 'owned' ? '自有' : '衍生' }}</div></div>
        <div><span class="text-ink-500">更新时间</span><div class="mt-0.5 text-ink-700">{{ item.updatedAt }}</div></div>
      </template>
      <template v-if="item.reviewNote" #notice>
        <div class="rounded-lg bg-warning-50 px-3 py-2 text-[10px] text-warning-600">{{ item.reviewNote }}</div>
      </template>
      <template v-if="item.productId" #actions>
        <button
          class="rounded-full border border-ink-200 px-3 py-1.5 text-[11px] text-ink-600"
          @click="router.push(`${variant === 'portal' ? '/portal' : '/app'}/product/${item.productId}`)"
        >查看商品</button>
      </template>
    </MineEntityCard>

    <div v-if="!seller.myListings.length" class="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-[12px] text-ink-500">
      暂无上架申请
    </div>
  </div>
</template>
