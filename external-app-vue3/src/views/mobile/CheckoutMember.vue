<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import PlaceholderPanel from '@/components/mine/PlaceholderPanel.vue'

const route = useRoute()
const router = useRouter()

const returnQ = computed(() => route.query.returnQ as string | undefined)
const returnMode = computed(() => route.query.returnMode as string | undefined)
const returnProduct = computed(() => route.query.returnProduct as string | undefined)

function goBackToContext() {
  if (returnQ.value) {
    router.replace({ path: '/app/answer', query: { q: returnQ.value, mode: returnMode.value || 'auto', unlocked: '1' } })
  } else if (returnProduct.value) {
    router.replace(`/app/product/${returnProduct.value}`)
  } else if (route.path.startsWith('/portal')) {
    router.replace('/portal/mine')
  } else {
    router.replace('/app/mine')
  }
}
</script>

<template>
  <div class="min-h-full bg-slate-50 pb-8">
    <MobileHeader title="购买 VIP" />
    <div class="px-4 pt-3">
      <PlaceholderPanel title="购买 VIP" />
      <button class="mt-4 w-full rounded-xl border border-slate-200 py-3 text-[13px] text-slate-600" @click="goBackToContext">
        返回
      </button>
    </div>
  </div>
</template>
