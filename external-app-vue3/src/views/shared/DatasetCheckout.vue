<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import PurchaseIdentityBanner from '@/components/shared/PurchaseIdentityBanner.vue'
import { currentPurchaseIdentity, startDatasetPayment } from '@/domain/purchaseIdentity'
import { useCatalogStore } from '@/stores/catalog'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()

const isPortal = computed(() => route.path.startsWith('/portal'))
const product = computed(() => catalog.byId(String(route.params.id)))
const identity = computed(() => currentPurchaseIdentity(user))
const error = ref('')
const starting = ref(true)

onMounted(() => {
  start()
})

function start() {
  if (!product.value) {
    starting.value = false
    return
  }
  error.value = ''
  starting.value = true
  try {
    const { path } = startDatasetPayment(product.value.id, isPortal.value)
    const query = route.query.renew ? { renew: String(route.query.renew) } : undefined
    router.replace({ path, query })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '提交采购失败'
    starting.value = false
  }
}

function goEnterpriseAuth() {
  router.push({ path: '/app/enterprise-auth', query: { redirect: route.fullPath } })
}
</script>

<template>
  <div v-if="product" :class="isPortal ? 'mx-auto max-w-5xl' : 'min-h-full bg-slate-50 pb-8'">
    <MobileHeader v-if="!isPortal" title="购买数据集" />
    <div :class="isPortal ? '' : 'px-4 pt-3'">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h1 class="text-lg font-semibold text-slate-900">{{ product.name }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ product.subtitle }}</p>
        <PurchaseIdentityBanner class="mt-4" :type-label="identity.typeLabel" :name="identity.name" note="购买主体跟随当前登录身份，支付页不再选择个人或企业。" />
        <div v-if="starting && !error" class="mt-4 text-sm text-slate-500">正在进入支付页…</div>
        <div v-if="error" data-testid="dataset-checkout-error" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ error }}</div>
        <button v-if="error && error.includes('企业认证')" class="mt-4 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white" @click="goEnterpriseAuth">先完成企业认证</button>
        <button v-else-if="error" data-testid="dataset-create-order" class="mt-4 w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white" @click="start">重试</button>
      </div>
    </div>
  </div>
  <div v-else class="p-8 text-center text-sm text-slate-400">数据集商品不存在</div>
</template>
