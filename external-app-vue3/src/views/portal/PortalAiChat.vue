<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatInterface from '@/components/mobile/ChatInterface.vue'
import { useAiStore, guideQuestions } from '@/stores/ai'

const route = useRoute()
const router = useRouter()
const ai = useAiStore()

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
  if (ai.chatMessages.length) return
  handleSend(q.trim())
}

onMounted(bootstrapFromQuery)

watch(
  () => route.query.q,
  (q, prev) => {
    if (typeof q === 'string' && q.trim() && q !== prev && !ai.chatMessages.length) {
      handleSend(q.trim())
    }
  }
)

function handleSelectFollowUp(text: string) {
  if (text === '提交需求') {
    router.push({ path: '/portal/demand', query: { q: lastQuestion.value } })
    return
  }
  handleSend(text)
}

function handleReset() {
  ai.resetChat()
  if (route.query.q) {
    router.replace({ path: '/portal/ai-chat', query: { entry: 'ai' } })
  }
}

function handleDowngrade() {
  const q = lastQuestion.value.trim()
  router.push({
    path: '/portal/search',
    query: q ? { q, entry: 'keyword' } : { entry: 'keyword' }
  })
}
</script>

<template>
  <div class="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="portal-ai-chat">
    <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
      <h1 class="text-base font-semibold text-slate-900">AI 问答</h1>
      <button
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        @click="router.push('/portal/search')"
      >
        关键词搜索
      </button>
    </div>
    <div class="min-h-0 flex-1">
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
        @navigate-product="(id) => router.push(`/portal/product/${id}`)"
        @downgrade-keyword="handleDowngrade"
      />
    </div>
  </div>
</template>
