<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const id = computed(() => String(route.params.id))
const product = computed(() => catalog.byId(id.value))
const intentId = computed(() => String(route.query.intent ?? ''))

onMounted(() => {
  if (!product.value || (product.value.type !== 'dataset' && product.value.type !== 'api') || !intentId.value) {
    router.replace(`/app/product/${id.value}`)
  }
})
</script>

<template>
  <div v-if="product" class="min-h-full bg-slate-900 pb-8 text-white">
    <div class="border-b border-white/10 px-4 py-3 text-center text-[12px] text-white/60">🔗 可信空间承接页 · 购买意图校验</div>
    <div class="flex h-11 items-center px-3">
      <button class="flex h-7 w-7 items-center justify-center rounded-full text-white/80 hover:bg-white/10" @click="router.back()">‹</button>
      <div class="flex-1 -ml-7 text-center text-[15px] font-medium text-white">可信数据空间</div>
    </div>

    <div class="px-4 pt-2">
      <div class="rounded-2xl bg-white/5 p-4">
        <div class="text-[14px] font-semibold">{{ product.name }}</div>
        <div class="mt-1 text-[12px] text-white/50">空间商品编号 {{ product.spaceProductNo }}</div>

        <div v-if="intentId" class="mt-4 rounded-xl bg-white/10 p-3 text-center text-[12px] text-white/60">
          购买意图校验中…
        </div>
      </div>
    </div>
  </div>
</template>
