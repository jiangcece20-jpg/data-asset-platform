<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiFindPrototype from '@/components/ai-v104/AiFindPrototype.vue'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { aiFindCatalogProduct } from '@/domain/aiFindCatalog'
import type { ProductPreview } from '@/components/ai-v104/prototypeScenes'
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const user = useUserStore()
const mobile = computed(() => route.path.startsWith('/app/'))
const keyword = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
const scene = computed(() => typeof route.query.preview === 'string' ? route.query.preview : '')
function viewProduct(product: ProductPreview) {
  if (!catalog.byId(product.id)) catalog.products.push(aiFindCatalogProduct(product))
  router.push({ path: `/${mobile.value ? 'app' : 'portal'}/product/${encodeURIComponent(product.id)}`, query: { from: 'ai' } })
}
function favoriteProduct(product: ProductPreview) {
  if (!catalog.byId(product.id)) catalog.products.push(aiFindCatalogProduct(product))
  catalog.toggleFavorite(product.id)
}
</script>
<template>
  <AiFindPrototype :compact="mobile" :initial-query="keyword" :initial-scene="scene" :collection-contact="user.context" :product-favorite="id => catalog.byId(id)?.favorite" @favorite="favoriteProduct" @details="viewProduct" @back="router.push('/app/discover')" />
</template>
