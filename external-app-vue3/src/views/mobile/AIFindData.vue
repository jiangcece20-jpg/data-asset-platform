<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ChatInterface from '@/components/mobile/ChatInterface.vue'
import { useAiStore, guideQuestions, roleOptions } from '@/stores/ai'
import type { ChatRole } from '@/types/aiChat'

const router = useRouter()
const route = useRoute()
const ai = useAiStore()

function handleSend(text: string) {
  ai.sendQuestion(text)
  setTimeout(() => ai.flushResponse(), 600)
}

// 从「找数」首页带入的首条问题：进入即自动提问。
onMounted(() => {
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) handleSend(q.trim())
})

function handleSelectGuide(text: string) {
  handleSend(text)
}

function handleSelectFollowUp(text: string) {
  handleSend(text)
}

function handleChangeRole(role: string) {
  ai.setRole(role as ChatRole)
}

function handleReset() {
  ai.resetChat()
}

function handleNavigateProduct(productId: string) {
  router.push(`/app/product/${productId}`)
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50">
    <MobileHeader title="AI找数" />

    <div class="flex flex-1 flex-col overflow-hidden">
      <ChatInterface
        :messages="ai.chatMessages"
        :guides="guideQuestions"
        :follow-ups="ai.chatFollowUps"
        :typing="ai.chatTyping"
        :role="ai.currentRole"
        :role-options="roleOptions"
        placeholder="说说你想了解的问题，或描述你需要的数据"
        @send="handleSend"
        @select-guide="handleSelectGuide"
        @select-follow-up="handleSelectFollowUp"
        @change-role="handleChangeRole"
        @reset="handleReset"
        @navigate-product="handleNavigateProduct"
      />
    </div>
  </div>
</template>
