<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useOrderStore } from '@/stores/orders'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const orders = useOrderStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const paid = ref(false)

const entitlementNote = computed(() => {
  if (!product.value) return ''
  if (product.value.type === 'report') {
    const version = product.value.typeDetail.report?.version || ''
    return `永久访问当前版本 ${version}；后续独立版本需另行购买`
  }
  if (product.value.type === 'dashboard') {
    const months = product.value.entitlementPolicy?.kind === 'term' ? product.value.entitlementPolicy.months : 12
    return `购买后使用 ${months} 个月，期间持续获得更新`
  }
  return '购买后长期可访问'
})

function pay() {
  if (!product.value) return
  orders.purchaseItem(id.value, product.value.price.itemPrice || 0)
  paid.value = true
}

const returnQ = computed(() => route.query.returnQ as string | undefined)
const returnMode = computed(() => route.query.returnMode as string | undefined)

function goBackToContext() {
  if (returnQ.value) {
    router.replace({ path: '/app/answer', query: { q: returnQ.value, mode: returnMode.value || 'auto', unlocked: '1' } })
  } else {
    router.replace(`/app/product/${id.value}`)
  }
}
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="单品购买" />
    <div class="px-4 pt-3">
      <div v-if="!paid" class="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <div class="text-[14px] font-semibold text-slate-900">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-slate-500">{{ product.subtitle }}</div>
        <div class="mt-3 rounded-lg bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-500">
          访问期限：{{ entitlementNote }} · 下载/导出：{{ product.type === 'report' ? '会员可合规下载 PDF' : '暂不支持导出' }} · 授权范围：{{ product.deliveryMethod }}
        </div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="pay">
          确认支付 ¥{{ product.price.itemPrice }}
        </button>
      </div>
      <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div class="text-3xl">🎉</div>
        <div class="mt-2 text-[14px] font-medium text-emerald-700">支付成功，已解锁本商品</div>
        <button class="mt-4 w-full rounded-full bg-brand-500 py-3 text-[14px] font-medium text-white" @click="goBackToContext">
          {{ returnQ ? '回到原问题解锁完整回答' : '查看内容' }}
        </button>
      </div>
    </div>
  </div>
</template>
