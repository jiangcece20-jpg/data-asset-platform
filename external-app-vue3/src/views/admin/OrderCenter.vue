<script setup lang="ts">
import { computed, ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useOrderStore } from '@/stores/orders'

const orders = useOrderStore()

const filterChannel = ref('')
const filterOwner = ref('')
const keyword = ref('')

const list = computed(() => {
  let items = [...orders.list]
  if (filterChannel.value) items = items.filter((o) => o.channel === filterChannel.value)
  if (filterOwner.value) items = items.filter((o) => o.ownerType === filterOwner.value)
  if (keyword.value.trim()) {
    const q = keyword.value.trim().toLowerCase()
    items = items.filter((o) => o.productName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const total = computed(() => orders.list.length)
const gmv = computed(() => orders.list.reduce((s, o) => s + (o.amount || 0), 0))
const pendingContracts = computed(() => orders.list.filter((o) => o.contractStatus === 'quoting' || o.contractStatus === 'contract_signed').length)

function sign(orderId: string) {
  orders.signContract(orderId)
}
function confirmPayment(orderId: string) {
  orders.confirmEnterpriseContract(orderId)
}
</script>

<template>
  <div>
    <PageHeader title="订单中心" desc="个人 / 企业 / 空间订单统一管理，企业报价合同签署与付款确认" />

    <!-- 概览 -->
    <div class="mb-4 flex gap-3">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">订单总数</span><span class="ml-2 font-semibold text-slate-700">{{ total }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">累计金额</span><span class="ml-2 font-semibold text-slate-700">¥{{ gmv }}</span></div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[13px]"><span class="text-slate-400">待处理合同</span><span class="ml-2 font-semibold" :class="pendingContracts ? 'text-amber-600' : 'text-slate-700'">{{ pendingContracts }}</span></div>
    </div>

    <!-- 筛选 -->
    <div class="mb-3 flex flex-wrap gap-2">
      <select v-model="filterChannel" data-testid="filter-channel" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部渠道</option>
        <option value="app">APP 支付</option>
        <option value="space">可信空间</option>
      </select>
      <select v-model="filterOwner" data-testid="filter-owner" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]">
        <option value="">全部客户</option>
        <option value="personal">个人</option>
        <option value="enterprise">企业</option>
      </select>
      <input v-model="keyword" data-testid="filter-keyword" placeholder="商品名 / 订单号" class="rounded-lg border border-slate-200 px-2 py-1 text-[12px]" />
    </div>

    <div class="rounded-xl border border-slate-200 bg-white">
      <table class="w-full text-left text-[13px]">
        <thead class="text-xs text-slate-400">
          <tr>
            <th class="px-3 py-2">商品</th>
            <th class="px-3 py-2">渠道</th>
            <th class="px-3 py-2">客户</th>
            <th class="px-3 py-2">金额</th>
            <th class="px-3 py-2">订单状态</th>
            <th class="px-3 py-2">合同状态</th>
            <th class="px-3 py-2">创建时间</th>
            <th class="px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in list" :key="o.id" data-testid="order-row" :data-id="o.id" class="border-t border-slate-100 hover:bg-slate-50">
            <td class="px-3 py-2 text-slate-700">{{ o.productName }}</td>
            <td class="px-3 py-2 text-slate-500">{{ o.channel === 'space' ? '可信空间' : 'APP 支付' }}</td>
            <td class="px-3 py-2 text-slate-500">{{ o.ownerType === 'enterprise' ? '企业' : '个人' }}</td>
            <td class="px-3 py-2 text-slate-500">¥{{ o.amount }}</td>
            <td class="px-3 py-2"><StatusBadge :dict="o.channel === 'space' ? 'spaceOrder' : 'appOrder'" :value="o.status" /></td>
            <td class="px-3 py-2"><StatusBadge v-if="o.contractStatus" dict="contract" :value="o.contractStatus" /></td>
            <td class="px-3 py-2 text-slate-400">{{ o.createdAt }}</td>
            <td class="px-3 py-2">
              <button v-if="o.contractStatus === 'quoting'" class="mr-2 text-brand-600 hover:underline" data-testid="sign" @click="sign(o.id)">标记合同已签署</button>
              <button v-if="o.contractStatus === 'contract_signed'" class="text-emerald-600 hover:underline" data-testid="confirm-pay" @click="confirmPayment(o.id)">确认付款并开通权益</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!list.length" class="py-6 text-center text-[12px] text-slate-400">暂无订单</div>
    </div>
  </div>
</template>
