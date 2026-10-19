<script setup lang="ts">
import { IconClose, IconHistory, IconPlus } from '@arco-design/web-vue/es/icon'
import type { AiConversation } from '@/stores/ai'

defineProps<{
  open: boolean
  conversations: AiConversation[]
  activeId: string
  busy: boolean
}>()

const emit = defineEmits<{
  close: []
  new: []
  select: [id: string]
}>()

function timeLabel(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[80] flex justify-end" data-testid="ai-history-drawer">
    <button class="absolute inset-0 bg-ink-900/40" aria-label="关闭历史对话" @click="emit('close')" />
    <aside role="dialog" aria-label="历史对话" class="relative flex h-full w-[min(88vw,360px)] flex-col bg-white shadow-float">
      <div class="flex h-14 items-center justify-between border-b border-ink-100 px-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-ink-900"><IconHistory />历史对话</div>
        <button class="flex h-9 w-9 items-center justify-center text-ink-500" aria-label="关闭" title="关闭" @click="emit('close')"><IconClose /></button>
      </div>
      <div class="border-b border-ink-100 p-3">
        <button data-testid="ai-history-new" :disabled="busy" class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand-500 text-sm font-medium text-white disabled:opacity-50" @click="emit('new')"><IconPlus />新对话</button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        <p v-if="!conversations.length" class="px-3 py-8 text-center text-sm text-ink-500">暂无历史对话</p>
        <button
          v-for="conversation in conversations"
          :key="conversation.id"
          :data-testid="`ai-history-${conversation.id}`"
          :disabled="busy"
          class="mb-1 block w-full rounded-md px-3 py-3 text-left transition hover:bg-ink-100 disabled:opacity-50"
          :class="activeId === conversation.id ? 'bg-brand-50' : ''"
          @click="emit('select', conversation.id)"
        >
          <span class="block truncate text-sm font-medium text-ink-800">{{ conversation.title }}</span>
          <span class="mt-1 block text-xs text-ink-400">{{ timeLabel(conversation.updatedAt) }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>
