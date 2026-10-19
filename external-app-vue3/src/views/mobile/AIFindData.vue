<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MobileHeader from '@/components/mobile/MobileHeader.vue'
import ChatInterface from '@/components/mobile/ChatInterface.vue'
import AiConversationHistory from '@/components/shared/AiConversationHistory.vue'
import { IconHistory } from '@arco-design/web-vue/es/icon'
import { useAiStore, guideQuestions } from '@/stores/ai'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const ai = useAiStore()
const user = useUserStore()
const historyOpen = ref(false)

watch(() => user.context.currentMemberId, (ownerId) => ai.activateOwner(ownerId), { immediate: true })

const fromKeywordEmpty = computed(() => route.query.from === 'keyword_empty')
const lastQuestion = computed(() => {
  const userMsgs = ai.chatMessages.filter((m) => m.role === 'user')
  const last = userMsgs[userMsgs.length - 1]
  if (!last) return String(route.query.q || '')
  const text = last.blocks.find((b) => b.type === 'text')
  return text && text.type === 'text' ? text.content : String(route.query.q || '')
})

function handleSend(text: string) {
  ai.sendQuestion(text)
  setTimeout(() => ai.flushResponse(), 600)
}

function bootstrapFromQuery() {
  const q = route.query.q
  if (typeof q !== 'string' || !q.trim()) return
  const firstUser = ai.chatMessages.find((message) => message.role === 'user')
  const firstText = firstUser?.blocks.find((block) => block.type === 'text')
  if (firstText?.type === 'text' && firstText.content === q.trim()) return
  if (ai.chatTyping) return
  if (ai.chatMessages.length) ai.startNewConversation()
  handleSend(q.trim())
}

onMounted(bootstrapFromQuery)

watch(
  () => route.query.q,
  (q, prev) => {
    if (q !== prev) bootstrapFromQuery()
  }
)

function handleSelectFollowUp(text: string) {
  if (text === '提交需求') {
    router.push({ path: '/app/demand', query: { q: lastQuestion.value } })
    return
  }
  handleSend(text)
}

function handleReset() {
  ai.startNewConversation()
  if (route.query.q) {
    router.replace({ path: '/app/ai-find', query: { entry: 'ai' } })
  }
}

function openHistoryConversation(id: string) {
  ai.openConversation(id)
  historyOpen.value = false
  if (route.query.q) void router.replace({ path: '/app/ai-find', query: { entry: 'ai' } })
}

function newFromHistory() {
  ai.startNewConversation()
  historyOpen.value = false
  if (route.query.q) void router.replace({ path: '/app/ai-find', query: { entry: 'ai' } })
}

function handleDowngrade() {
  const q = lastQuestion.value.trim()
  router.push({
    path: '/app/search',
    query: q ? { q, entry: 'keyword' } : { entry: 'keyword' }
  })
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50" data-testid="ai-find-page">
    <MobileHeader title="AI 问答">
      <button data-testid="ai-history-open" class="flex h-10 w-10 items-center justify-center rounded-md text-ink-600" aria-label="历史对话" title="历史对话" @click="historyOpen = true"><IconHistory /></button>
    </MobileHeader>
    <div class="flex flex-1 flex-col overflow-hidden">
      <ChatInterface
        :messages="ai.chatMessages"
        :guides="guideQuestions"
        :follow-ups="ai.chatFollowUps"
        :typing="ai.chatTyping"
        :from-keyword-empty="fromKeywordEmpty"
        placeholder="继续追问…"
        @send="handleSend"
        @select-guide="handleSend"
        @select-follow-up="handleSelectFollowUp"
        @reset="handleReset"
        @navigate-product="(id) => router.push(`/app/product/${id}`)"
        @downgrade-keyword="handleDowngrade"
      />
    </div>
    <AiConversationHistory :open="historyOpen" :conversations="ai.conversationList" :active-id="ai.activeConversationId" :busy="ai.chatTyping" @close="historyOpen = false" @new="newFromHistory" @select="openHistoryConversation" />
  </div>
</template>
