<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const submittedOrderId = ref('')
const mode = ref<'online' | 'contract'>('contract')

const packagePrice = computed(() => (product.value?.price.itemPrice || 199) * 10)

function submit() {
  if (!product.value) return
  const order = orders.submitEnterpriseOrder(id.value, packagePrice.value, mode.value)
  submittedOrderId.value = order.id
}

const submittedOrder = computed(() => orders.list.find((o) => o.id === submittedOrderId.value))
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="企业采购" />
    <div class="px-4 pt-3">
      <div v-if="!submittedOrder" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }} · 企业内容套餐</div>
        <div class="mt-1 text-[12px] text-slate-500">企业采购后由管理员在企业中心分配席位，成员即可共享内容</div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            class="rounded-xl border p-3 text-left"
            :class="mode === 'online' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
            @click="mode = 'online'"
          >
            <div class="text-[12px] text-slate-500">小额标准套餐</div>
            <div class="mt-1 text-[13px] font-medium text-slate-800">在线支付</div>
          </button>
          <button
            class="rounded-xl border p-3 text-left"
            :class="mode === 'contract' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'"
            @click="mode = 'contract'"
          >
            <div class="text-[12px] text-slate-500">大额/定制采购</div>
            <div class="mt-1 text-[13px] font-medium text-slate-800">报价 → 合同 → 对公付款</div>
          </button>
        </div>

        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] text-slate-500">套餐金额：¥{{ packagePrice }} / 年，含 10 席位</div>

        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="submit">
          {{ mode === 'online' ? '确认支付' : '提交企业订单' }}
        </button>
      </div>

      <div v-else class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div class="text-[14px] font-semibold text-slate-900">企业订单已{{ mode === 'online' ? '支付' : '提交' }}</div>
          <StatusBadge dict="appOrder" :value="submittedOrder.status" />
        </div>
        <div v-if="submittedOrder.contractStatus" class="mt-2 flex items-center gap-2 text-[12px] text-slate-500">
          合同状态：<StatusBadge dict="contract" :value="submittedOrder.contractStatus" />
        </div>
        <p class="mt-2 text-[12px] leading-relaxed text-slate-400">
          {{ mode === 'online' ? '权益已生效，前往企业中心分配席位。' : '运营后台将推进报价、合同签署与对公付款确认，确认后自动开通企业权益。' }}
        </p>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="router.push('/app/mine/enterprise')">
          前往企业中心查看进度
        </button>
      </div>
    </div>
  </div>
</template>
