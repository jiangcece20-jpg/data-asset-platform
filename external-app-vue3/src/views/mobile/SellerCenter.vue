<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useSellerMarketStore } from '@/stores/sellerMarket'

const router = useRouter()
const seller = useSellerMarketStore()

const profile = computed(() => seller.myProfile)
const statusLabel = computed(() => {
  const map: Record<string, string> = {
    none: '未申请',
    pending_review: '准入审核中',
    need_supplement: '待补正',
    approved: '已准入',
    rejected: '已驳回',
    suspended: '已暂停'
  }
  return map[profile.value?.status || 'none']
})

const pendingOrders = computed(() =>
  seller.mySellerOrders.filter((o) => o.status === 'payment_pending_confirmation')
)
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="卖家中心" />

    <div class="space-y-3 px-4 pt-3">
      <div class="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 p-4 text-white shadow-card">
        <div class="text-[12px] text-white/80">入驻商家 · U1～U4 附加身份</div>
        <div class="mt-1 text-[16px] font-semibold">{{ profile?.displayName || '尚未申请入驻' }}</div>
        <div class="mt-1 text-[12px] text-white/85">状态：{{ statusLabel }}</div>
        <div v-if="profile?.reviewNote" class="mt-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px]">{{ profile.reviewNote }}</div>
      </div>

      <div v-if="!profile || profile.status === 'rejected' || profile.status === 'none'" class="rounded-2xl border border-orange-100 bg-white p-4">
        <div class="text-[14px] font-medium text-slate-800">申请成为入驻商家</div>
        <div class="mt-1 text-[12px] text-slate-500">需完成 L1 身份/收款与 L2 合规声明，运营人工审核通过后方可上架看板。</div>
        <button class="mt-3 w-full rounded-xl bg-orange-500 py-2.5 text-[13px] font-medium text-white" @click="router.push('/app/seller/apply')">去申请</button>
      </div>

      <div v-else-if="profile.status === 'pending_review' || profile.status === 'need_supplement'" class="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-800">
        准入申请处理中。可在运营后台「入驻商家」查看审核队列。{{ profile.status === 'need_supplement' ? '请按驳回意见补正后重新提交。' : '' }}
      </div>

      <template v-else-if="profile.status === 'approved'">
        <div class="grid grid-cols-2 gap-2">
          <button class="rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-card" @click="router.push('/app/seller/listing')">
            <div class="text-[13px] font-medium text-slate-800">上架申请</div>
            <div class="mt-1 text-[11px] text-slate-500">用数对象 → APP 看板</div>
          </button>
          <button class="rounded-2xl border border-slate-100 bg-white p-3.5 text-left shadow-card" @click="router.push('/app/seller/orders')">
            <div class="text-[13px] font-medium text-slate-800">卖家订单</div>
            <div class="mt-1 text-[11px] text-slate-500">待确认 {{ pendingOrders.length }} 单</div>
          </button>
        </div>

        <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
          <div class="mb-2 flex items-center justify-between">
            <div class="text-[13px] font-medium text-slate-800">我的上架单</div>
            <button class="text-[11px] text-brand-600" @click="router.push('/app/seller/listing')">新建</button>
          </div>
          <div v-if="!seller.myListings.length" class="text-[12px] text-slate-400">暂无上架申请</div>
          <div v-for="item in seller.myListings.slice(0, 5)" :key="item.id" class="border-t border-slate-50 py-2.5 first:border-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate text-[13px] font-medium text-slate-800">{{ item.title }}</div>
                <div class="mt-0.5 text-[11px] text-slate-450 text-slate-500">{{ item.artifactVersion }} · ¥{{ item.price }}</div>
              </div>
              <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{{ item.status }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
          MVP：仅看板上架；结算为卖家自收款；商品/审核权威在 APP。用数侧可发起上架，状态以本中心为准。
        </div>
      </template>

      <div v-else-if="profile.status === 'suspended'" class="rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] text-red-700">
        卖家资格已暂停，在架商品已暂停新购。请联系运营处理。
      </div>
    </div>
  </div>
</template>
