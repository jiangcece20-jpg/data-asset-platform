<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { ChatMessage, GuideQuestion } from '@/types/aiChat'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'

const props = withDefaults(defineProps<{
  messages: ChatMessage[]
  guides?: GuideQuestion[]
  followUps?: string[]
  typing?: boolean
  placeholder?: string
  showDowngrade?: boolean
  fromKeywordEmpty?: boolean
  /** 嵌入找数页等容器时隐藏顶部工具条，避免与外层 Tab 重复 */
  embedded?: boolean
}>(), {
  guides: () => [],
  followUps: () => [],
  typing: false,
  placeholder: '说说你想了解的问题，或描述你需要的数据',
  showDowngrade: true,
  fromKeywordEmpty: false,
  embedded: false
})

const emit = defineEmits<{
  send: [text: string]
  selectGuide: [text: string]
  selectFollowUp: [text: string]
  reset: []
  navigateProduct: [productId: string]
  downgradeKeyword: []
}>()

const catalog = useCatalogStore()
const input = ref('')
const scrollRef = ref<HTMLDivElement | null>(null)

function handleSend() {
  const text = input.value.trim()
  if (!text) return
  emit('send', text)
  input.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleFollowUp(text: string) {
  if (text === '只看平台内数据') {
    emit('downgradeKeyword')
    return
  }
  emit('selectFollowUp', text)
}

watch(() => props.messages.length, async () => {
  await nextTick()
  const el = scrollRef.value
  if (el && typeof el.scrollTo === 'function') {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }
})

function getProduct(productId: string) {
  return catalog.byId(productId)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="!embedded" class="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
      <div class="min-w-0 flex-1 text-[12px] font-medium text-slate-700">AI 问答</div>
      <button
        v-if="showDowngrade"
        data-testid="downgrade-keyword"
        class="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600"
        @click="emit('downgradeKeyword')"
      >
        关键词搜索
      </button>
      <button
        v-if="messages.length"
        data-testid="reset-chat"
        class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
        @click="emit('reset')"
      >
        新对话
      </button>
    </div>

    <div v-if="fromKeywordEmpty" class="shrink-0 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-700" data-testid="from-keyword-banner">
      关键词未命中，已切换到 AI 问答
    </div>

    <div ref="scrollRef" class="flex-1 overflow-y-auto px-3 py-3">
      <div v-if="!messages.length && guides.length" class="flex flex-col items-center pt-8" data-testid="chat-empty">
        <div class="text-[15px] font-semibold text-slate-800">用自然语言找数</div>
        <div class="mt-1 text-[12px] text-slate-400">试试下面的问题，或直接输入</div>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            v-for="g in guides"
            :key="g.text"
            class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 hover:border-brand-400 hover:text-brand-600"
            @click="emit('selectGuide', g.text)"
          >
            {{ g.text }}
          </button>
        </div>
      </div>

      <div v-for="msg in messages" :key="msg.id" class="mb-3" :data-testid="msg.role === 'ai' ? 'ai-message' : 'user-message'">
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2 text-[14px] text-white">
            {{ msg.blocks.map(b => b.type === 'text' ? b.content : '').join('') }}
          </div>
        </div>

        <div v-else class="space-y-2">
          <template v-for="(block, i) in msg.blocks" :key="i">
            <div
              v-if="block.type === 'route-badge'"
              data-testid="route-badge"
              class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="block.route === 'external_exploration' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ block.label }}
            </div>

            <div
              v-else-if="block.type === 'external-zone'"
              data-testid="external-zone"
              class="rounded-2xl border border-amber-200 bg-amber-50/70 p-3"
            >
              <div class="text-[11px] font-medium text-amber-800">来自外网</div>
              <p class="mt-1 text-[13px] leading-relaxed text-slate-700">{{ block.summary }}</p>
              <div class="mt-2 space-y-1">
                <a
                  v-for="s in block.sources"
                  :key="s.url"
                  :href="s.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block text-[12px] text-amber-800 underline-offset-2 hover:underline"
                >
                  {{ s.title }}
                </a>
              </div>
            </div>

            <p v-else-if="block.type === 'text'" class="rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2 text-[14px] leading-relaxed text-slate-700">
              {{ block.content }}
            </p>

            <div v-else-if="block.type === 'metric'" class="inline-flex items-baseline gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span class="text-[12px] text-slate-400">{{ block.label }}</span>
              <span class="text-[18px] font-bold text-slate-900">{{ block.value }}</span>
              <span v-if="block.change" class="text-[12px] font-medium" :class="block.dir === 'up' ? 'text-red-500' : 'text-emerald-500'">
                {{ block.dir === 'up' ? '↑' : '↓' }} {{ block.change }}
              </span>
            </div>

            <div
              v-else-if="block.type === 'product-card' && getProduct(block.productId)"
              class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-400"
              @click="emit('navigateProduct', block.productId)"
            >
              <div class="flex items-center gap-1.5">
                <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{{ typeMeta[getProduct(block.productId)!.type].label }}</span>
                <span class="text-[14px] font-semibold text-slate-800">{{ getProduct(block.productId)!.name }}</span>
              </div>
              <div class="mt-1 line-clamp-1 text-[12px] text-slate-500">{{ getProduct(block.productId)!.subtitle }}</div>
            </div>
          </template>
        </div>
      </div>

      <div v-if="typing" class="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3 w-fit">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 0ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 150ms" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 300ms" />
      </div>

      <div v-if="followUps.length && !typing" class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="fu in followUps"
          :key="fu"
          class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 hover:border-brand-400 hover:text-brand-600"
          @click="handleFollowUp(fu)"
        >
          {{ fu }}
        </button>
      </div>
    </div>

    <div class="shrink-0 border-t border-slate-100 bg-white p-3">
      <div class="flex items-end gap-2 rounded-2xl border border-slate-200 px-3 py-2">
        <textarea
          v-model="input"
          rows="1"
          :placeholder="placeholder"
          class="flex-1 resize-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown="handleKeyDown"
        />
        <button
          data-testid="chat-send"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white disabled:opacity-40"
          :disabled="!input.trim()"
          @click="handleSend"
        >
          ➤
        </button>
      </div>
    </div>
  </div>
</template>
