<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useCatalogStore } from '@/stores/catalog'

const router = useRouter()
const catalog = useCatalogStore()

const itemPricing = computed(() => catalog.products.filter((p) => p.dealChannel === 'app_payment'))
</script>

<template>
  <div>
    <PageHeader title="商业化中心" desc="会员与单品定价（订单履约已移至订单中心）" />

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">会员定价</div>
      <div class="flex gap-3 text-[13px] text-slate-600">
        <div class="rounded-lg bg-slate-50 px-3 py-2">连续包月 ¥39</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">年度会员 ¥299（推荐）</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">单一会员覆盖配置范围内的报告与交互报表</div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-[13px] font-medium text-slate-700">单品价格</span>
        <button class="text-[12px] text-brand-600 hover:underline" @click="router.push('/admin/orders')">查看订单中心 ›</button>
      </div>
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="py-1.5">商品</th><th class="py-1.5">单品价格</th><th class="py-1.5">会员折扣</th><th class="py-1.5">是否会员免费/折扣</th></tr></thead>
        <tbody>
          <tr v-for="p in itemPricing" :key="p.id" class="border-t border-slate-100">
            <td class="py-1.5 text-slate-700">{{ p.name }}</td>
            <td class="py-1.5 text-slate-500">¥{{ p.price.itemPrice }}</td>
            <td class="py-1.5 text-slate-500">{{ p.price.memberDiscount ? (p.price.memberDiscount * 10).toFixed(0) + ' 折' : '—' }}</td>
            <td class="py-1.5 text-slate-500">{{ p.price.model === 'member_free' ? '会员免费' : p.price.model === 'member_discount' ? '会员折扣' : '不纳入会员' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
