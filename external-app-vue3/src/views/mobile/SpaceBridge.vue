<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const orderId = ref('')
const order = computed(() => orders.list.find((o) => o.id === orderId.value))
const spaceUnavailable = ref(false)

onMounted(() => {
  if (!product.value || (product.value.type !== 'dataset' && product.value.type !== 'api')) {
    if (product.value) router.replace(`/app/product/${id.value}`)
    return
  }
  if (!user.isEnterpriseAuthenticated) {
    router.replace({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
    return
  }
  const created = orders.createSpaceOrder(id.value)
  orderId.value = created.id
  setTimeout(() => {
    if (order.value) order.value.status = 'space_processing'
  }, 600)
})

function simulateSuccess() {
  orders.advanceSpaceOrder(orderId.value, 'success')
}
function simulateDelay() {
  orders.advanceSpaceOrder(orderId.value, 'delayed')
}
function simulateUnavailable() {
  spaceUnavailable.value = true
}
function reconnect() {
  spaceUnavailable.value = false
  orderId.value = ''
  const created = orders.createSpaceOrder(id.value)
  orderId.value = created.id
  setTimeout(() => {
    if (order.value) order.value.status = 'space_processing'
  }, 600)
}
function retry() {
  orders.retryCallback(orderId.value)
}
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-900 pb-8 text-white">
    <div class="border-b border-white/10 px-4 py-3 text-center text-[12px] text-white/60">🔗 内嵌打开 · 单点登录 · 复用 APP 身份</div>
    <div class="flex h-11 items-center px-3">
      <button class="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" @click="router.back()">‹</button>
      <div class="flex-1 -ml-7 text-center text-[15px] font-medium text-white">可信数据空间</div>
    </div>

    <div class="px-4 pt-2">
      <div class="rounded-2xl bg-white/5 p-4">
        <div class="text-[14px] font-semibold">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-white/50">空间商品编号 {{ product.spaceProductNo }}</div>

        <div v-if="order" class="mt-4">
          <div class="flex items-center justify-between rounded-xl bg-white/10 p-3">
            <span class="text-[13px]">订单状态</span>
            <StatusBadge dict="spaceOrder" :value="order.status" />
          </div>

          <div v-if="order.status === 'pending_redirect' || order.status === 'space_processing'" class="mt-4 text-center text-[12px] text-white/50">
            正在跳转可信空间并完成单点登录…
          </div>

          <div v-if="order.status === 'space_processing'" class="mt-3 grid grid-cols-2 gap-2">
            <button class="rounded-full bg-emerald-500 py-2.5 text-[13px] font-medium" @click="simulateSuccess">模拟：购买成功</button>
            <button class="rounded-full bg-amber-500 py-2.5 text-[13px] font-medium" @click="simulateDelay">模拟：回调延迟</button>
            <button class="col-span-2 rounded-full bg-red-500/80 py-2.5 text-[13px] font-medium" @click="simulateUnavailable">模拟：空间不可用</button>
          </div>

          <div v-if="spaceUnavailable" class="mt-4 rounded-xl bg-red-500/10 p-3 text-center">
            <div class="text-[13px] text-red-300">可信空间暂不可用，请稍后重试</div>
            <div class="mt-1 text-[12px] text-white/50">商品：{{ product?.name }}</div>
            <button class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white" @click="reconnect">重新连接</button>
          </div>

          <div v-if="order.status === 'callback_delayed'" class="mt-4 rounded-xl bg-amber-500/10 p-3 text-center">
            <div class="text-[12px] text-amber-300">空间已受理，状态同步中，可稍后在"我的-空间订单"查看</div>
            <button class="mt-3 w-full rounded-full bg-amber-500 py-2.5 text-[13px] font-medium" @click="retry">重试同步</button>
          </div>

          <div v-if="order.status === 'purchase_success' || order.status === 'delivering' || order.status === 'delivered'" class="mt-4 rounded-xl bg-emerald-500/10 p-3 text-center">
            <div class="text-[13px] font-medium text-emerald-300">✅ 购买成功，订单状态回传 APP</div>
            <div class="mt-1 text-[12px] text-white/60">{{ order.status === 'delivered' ? '已交付' : '交付中，请稍候…' }}</div>
            <button class="mt-3 w-full rounded-full bg-brand-500 py-2.5 text-[13px] font-medium text-white" @click="router.push('/app/mine')">
              前往"我的-空间订单"查看
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
