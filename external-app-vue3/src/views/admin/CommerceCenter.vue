<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'

const catalog = useCatalogStore()
const orders = useOrderStore()

const itemPricing = computed(() => catalog.products.filter((p) => p.dealChannel === 'app_payment'))
const personalOrders = computed(() => orders.list.filter((o) => o.channel === 'app' && o.ownerType === 'personal'))
const enterpriseOrders = computed(() => orders.list.filter((o) => o.ownerType === 'enterprise'))

function sign(orderId: string) {
  orders.signContract(orderId)
}
function confirmPayment(orderId: string) {
  orders.confirmEnterpriseContract(orderId)
}
</script>

<template>
  <div>
    <PageHeader title="商业化中心" desc="会员、单品价格、个人订单、企业报价合同付款" />

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">会员定价</div>
      <div class="flex gap-3 text-[13px] text-slate-600">
        <div class="rounded-lg bg-slate-50 px-3 py-2">连续包月 ¥39</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">年度会员 ¥299（推荐）</div>
        <div class="rounded-lg bg-slate-50 px-3 py-2">单一会员覆盖配置范围内的报告与交互报表</div>
      </div>
    </div>

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">单品价格</div>
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

    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">个人订单</div>
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="py-1.5">商品</th><th class="py-1.5">金额</th><th class="py-1.5">状态</th><th class="py-1.5">创建时间</th></tr></thead>
        <tbody>
          <tr v-for="o in personalOrders" :key="o.id" class="border-t border-slate-100">
            <td class="py-1.5 text-slate-700">{{ o.productName }}</td>
            <td class="py-1.5 text-slate-500">¥{{ o.amount }}</td>
            <td class="py-1.5"><StatusBadge dict="appOrder" :value="o.status" /></td>
            <td class="py-1.5 text-slate-400">{{ o.createdAt }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!personalOrders.length" class="py-3 text-center text-[12px] text-slate-400">暂无个人订单</div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-2 text-[13px] font-medium text-slate-700">企业报价 · 合同 · 付款</div>
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400"><tr><th class="py-1.5">商品</th><th class="py-1.5">金额</th><th class="py-1.5">订单状态</th><th class="py-1.5">合同状态</th><th class="py-1.5">操作</th></tr></thead>
        <tbody>
          <tr v-for="o in enterpriseOrders" :key="o.id" class="border-t border-slate-100">
            <td class="py-1.5 text-slate-700">{{ o.productName }}</td>
            <td class="py-1.5 text-slate-500">¥{{ o.amount }}</td>
            <td class="py-1.5"><StatusBadge dict="appOrder" :value="o.status" /></td>
            <td class="py-1.5"><StatusBadge v-if="o.contractStatus" dict="contract" :value="o.contractStatus" /></td>
            <td class="py-1.5">
              <button v-if="o.contractStatus === 'quoting'" class="mr-2 text-brand-600 hover:underline" @click="sign(o.id)">标记合同已签署</button>
              <button v-if="o.contractStatus === 'contract_signed'" class="text-emerald-600 hover:underline" @click="confirmPayment(o.id)">
                确认付款并开通权益
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!enterpriseOrders.length" class="py-3 text-center text-[12px] text-slate-400">暂无企业订单</div>
    </div>
  </div>
</template>
