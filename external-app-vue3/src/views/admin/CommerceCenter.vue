<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import type { Product } from '@/types/domain'
import { formatMemberBenefitsLabel, resolveMemberBenefits } from '@/domain/memberBenefits'

const router = useRouter()
const catalog = useCatalogStore()

const itemPricing = computed(() => catalog.products.filter((p) => p.dealChannel === 'app_payment'))

function formatMemberCell(product: Product) {
  const label = formatMemberBenefitsLabel(resolveMemberBenefits(product))
  return label || '不纳入会员'
}
</script>

<template>
  <div>
    <PageHeader title="商业化中心" desc="会员、内容单品与数据集个人/企业销售方案（订单履约已移至订单中心）" />

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">会员定价</div>
      <div class="flex flex-wrap gap-3 text-[13px] text-slate-600">
        <div class="rounded-lg bg-slate-50 px-3 py-2">普通年费 ¥299 / 月费 ¥39</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">高级年费 ¥599 / 月费 ¥79</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">商品按普通/高级配置免费或折扣；同级互斥、跨级独立</div>
      </div>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4" data-testid="dataset-commerce-offers">
      <div class="mb-2 text-[13px] font-medium text-slate-700">资产平台数据集销售方案</div>
      <div v-for="p in itemPricing.filter((item) => item.type === 'dataset' && item.origin === 'asset_platform')" :key="p.id" class="grid grid-cols-[1.4fr_1fr_1fr_.8fr] gap-3 border-t border-slate-100 py-2 text-[12px]">
        <div><div class="font-medium text-slate-700">{{ p.name }}</div><div class="text-slate-400">绑定 {{ p.assetSnapshot?.assetVersion }} · {{ p.status }}</div></div>
        <div class="text-slate-500">个人：¥{{ p.datasetOffers?.find((offer) => offer.subject === 'personal')?.price.toLocaleString() || '—' }}</div>
        <div class="text-slate-500">企业：¥{{ p.datasetOffers?.find((offer) => offer.subject === 'enterprise')?.price.toLocaleString() || '—' }}</div>
        <div :class="p.assetSnapshot?.changeRisk === 'high' ? 'text-red-600' : 'text-emerald-600'">{{ p.assetSnapshot?.changeRisk === 'high' ? '高风险·暂停新购' : '可销售' }}</div>
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
            <td class="py-1.5 text-slate-500">{{ formatMemberCell(p) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
