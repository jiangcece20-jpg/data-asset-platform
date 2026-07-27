<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useTrustedSpacePurchaseStore } from '@/stores/trustedSpacePurchase'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const purchase = useTrustedSpacePurchaseStore()
const user = useUserStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const intentId = computed(() => String(route.query.intent ?? ''))
const intent = computed(() => purchase.byId(intentId.value))
const enterprise = computed(() => user.enterprise)
const operator = computed(() => user.currentEnterpriseMember)
const validIntent = computed(() => {
  const current = intent.value
  return Boolean(
    current && product.value &&
    current.appProductId === product.value.id &&
    current.spaceProductNo === product.value.spaceProductNo &&
    current.appEnterpriseId === user.context.currentEnterpriseId &&
    current.operatorMemberId === user.context.currentMemberId
  )
})
const connecting = ref(false)
const connectionError = ref('')

onMounted(() => {
  if (!product.value || !validIntent.value) {
    void router.replace(`/app/product/${id.value}`)
    return
  }
  if (route.query.returned === '1') purchase.markReturned(intent.value!.id)
})

async function createLink() {
  if (!intent.value) return
  connecting.value = true
  connectionError.value = ''
  try {
    await purchase.createLink(intent.value.id)
  } catch (error) {
    connectionError.value = error instanceof Error ? error.message : '可信空间连接失败'
  } finally {
    connecting.value = false
  }
}

function enterTrustedSpace() {
  if (intent.value) purchase.markRedirected(intent.value.id)
}
</script>

<template>
  <div v-if="product && validIntent && intent" class="min-h-full bg-slate-900 pb-8 text-white">
    <div class="border-b border-white/10 px-4 py-3 text-center text-[12px] text-white/60">🔗 可信空间承接页 · 企业购买意图</div>
    <div class="flex h-11 items-center px-3">
      <button class="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" @click="router.back()">‹</button>
      <div class="flex-1 -ml-7 text-center text-[15px] font-medium text-white">可信数据空间</div>
    </div>

    <div class="space-y-3 px-4 pt-2">
      <div class="rounded-2xl bg-white/5 p-4">
        <div class="text-[14px] font-semibold">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-white/50">空间商品编号 {{ intent.spaceProductNo }}</div>
      </div>

      <div class="rounded-2xl bg-white/5 p-4 text-[13px]">
        <div class="text-white/50">购买主体</div>
        <div class="mt-1 font-medium">{{ enterprise.name }}</div>
        <div class="mt-3 text-white/50">经办人</div>
        <div class="mt-1 font-medium">经办人：{{ operator?.name }}</div>
        <div class="mt-3 text-white/50">意图状态</div>
        <div class="mt-1 font-medium">{{ intent.status }}</div>
      </div>

      <div v-if="intent.status === 'returned_pending_sync'" class="rounded-xl bg-amber-400/10 p-3 text-center text-[13px] text-amber-200">
        空间已受理，状态同步中
      </div>
      <div v-else class="rounded-2xl bg-white/5 p-4">
        <div class="text-[13px] text-white/70">订单与数据权益由可信空间处理，APP 不创建本地空间订单。</div>
        <div v-if="connectionError" class="mt-3 text-[12px] text-rose-300">{{ connectionError }}</div>
        <button
          v-if="!intent.purchaseUrl"
          class="mt-4 w-full rounded-xl bg-cyan-400 py-3 text-[14px] font-medium text-slate-950 disabled:opacity-50"
          :disabled="connecting"
          @click="createLink"
        >{{ connectionError ? '重新连接' : '生成可信空间链接' }}</button>
        <a
          v-else
          class="mt-4 block w-full rounded-xl bg-cyan-400 py-3 text-center text-[14px] font-medium text-slate-950"
          :href="intent.purchaseUrl"
          @click="enterTrustedSpace"
        >进入可信空间</a>
      </div>
    </div>
  </div>
</template>
