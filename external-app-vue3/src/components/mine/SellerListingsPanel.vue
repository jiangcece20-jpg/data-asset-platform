<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MineEntityCard from './MineEntityCard.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'
import { filledShotCount } from '@/domain/sellingShotTemplate'

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
    <div class="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] text-orange-800">
      卖家状态：{{ statusLabel }}
      <span v-if="seller.myProfile?.displayName"> · {{ seller.myProfile.displayName }}</span>
    </div>

    <div class="flex items-center justify-between">
      <div class="text-[13px] font-medium text-slate-800">我的上架单</div>
      <button
        data-testid="seller-create-listing"
        class="rounded-full bg-brand-500 px-3 py-1.5 text-[11px] text-white"
        :disabled="!seller.isApprovedSeller"
        @click="emit('create-listing')"
      >新建上架单</button>
    </div>

    <MineEntityCard v-for="item in seller.myListings" :key="item.id" :variant="variant">
      <template #badges>
        <span class="rounded-full bg-orange-50 px-2 py-0.5 text-orange-600">上架单</span>
        <span class="font-mono text-slate-400">{{ item.id }}</span>
      </template>
      <template #title>{{ item.title }}</template>
      <template #status>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{{ item.status }}</span>
      </template>
      <template #meta>
        <div><span class="text-slate-400">对象版本</span><div class="mt-0.5 text-slate-700">{{ item.artifactVersion }}</div></div>
        <div><span class="text-slate-400">价格</span><div class="mt-0.5 font-semibold text-brand-600">¥{{ item.price }}</div></div>
        <div><span class="text-slate-400">来源</span><div class="mt-0.5 text-slate-700">{{ item.dataProvenance === 'owned' ? '自有' : '衍生' }}</div></div>
        <div><span class="text-slate-400">截图</span><div class="mt-0.5 text-slate-700">{{ filledShotCount(item.shots) }}/4</div></div>
        <div><span class="text-slate-400">更新时间</span><div class="mt-0.5 text-slate-700">{{ item.updatedAt }}</div></div>
      </template>
      <template v-if="item.reviewNote" #notice>
        <div class="rounded-lg bg-amber-50 px-3 py-2 text-[10px] text-amber-700">{{ item.reviewNote }}</div>
      </template>
      <template v-if="item.productId" #actions>
        <button
          class="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600"
          @click="router.push(`${variant === 'portal' ? '/portal' : '/app'}/product/${item.productId}`)"
        >查看商品</button>
      </template>
    </MineEntityCard>

    <div v-if="!seller.myListings.length" class="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-[12px] text-slate-400">
      暂无上架申请
    </div>
  </div>
</template>
