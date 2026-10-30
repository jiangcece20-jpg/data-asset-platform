<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiFindPrototype from '@/components/ai-v104/AiFindPrototype.vue'
const route = useRoute()
const router = useRouter()
const mobile = computed(() => route.path.startsWith('/app/'))
const keyword = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
const scene = computed(() => typeof route.query.preview === 'string' ? route.query.preview : '')
</script>
<template>
  <AiFindPrototype :compact="mobile" :initial-query="keyword" :initial-scene="scene" @back="router.push('/app/discover')" />
</template>
