<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { ChatMessage, GuideQuestion, RoleOption } from '@/types/aiChat'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'

const props = withDefaults(defineProps<{
  messages: ChatMessage[]
  guides?: GuideQuestion[]
  followUps?: string[]
  typing?: boolean
  placeholder?: string
  role?: string
  roleOptions?: RoleOption[]
}>(), {
  guides: () => [],
  followUps: () => [],
  typing: false,
  placeholder: '说说你想了解的问题，或描述你需要的数据',
  role: '',
  roleOptions: () => [],
})

const emit = defineEmits<{
  send: [text: string]
  selectGuide: [text: string]
  selectFollowUp: [text: string]
  changeRole: [role: string]
  reset: []
  navigateProduct: [productId: string]
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

watch(() => props.messages.length, async () => {
  await nextTick()
  scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' })
})

function getProduct(productId: string) {
  return catalog.byId(productId)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- 顶部栏：角色选择 + 新对话 -->
    <div v-if="roleOptions.length" class="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
      <div class="flex flex-1 gap-1 overflow-x-auto">
        <button
          v-for="r in roleOptions"
          :key="r.value"
          class="shrink-0 rounded-full px-2.5 py-1 text-[11px] transition"
          :class="role === r.value ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'"
          @click="emit('changeRole', r.value)"
        >
          {{ r.icon }} {{ r.label }}
        </button>
      </div>
      <button
        v-if="messages.length"
        class="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500"
        @click="emit('reset')"
      >
        新对话
      </button>
    </div>

    <!-- 消息区 -->
    <div ref="scrollRef" class="flex-1 overflow-y-auto px-3 py-3">
      <!-- 空状态：引导问题 -->
      <div v-if="!messages.length && guides.length" class="flex flex-col items-center pt-6">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-purple-100 text-lg">
          🤖
        </div>
        <div class="mt-2 text-[14px] font-semibold text-slate-700">用自然语言找数据</div>
        <div class="mt-1 text-[12px] text-slate-400">描述你想查询的数据，AI 为你推荐最匹配的商品</div>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button
            v-for="g in guides"
            :key="g.text"
            class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
            @click="emit('selectGuide', g.text)"
          >
            {{ g.icon }} {{ g.text }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-for="msg in messages" :key="msg.id" class="mb-3">
        <!-- 用户消息 -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-500 px-3.5 py-2 text-[14px] text-white">
            {{ msg.blocks.map(b => b.type === 'text' ? b.content : '').join('') }}
          </div>
        </div>

        <!-- AI 消息（混排渲染） -->
        <div v-else class="flex gap-2">
          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 text-[10px] font-bold text-white">
            AI
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <template v-for="(block, i) in msg.blocks" :key="i">
              <!-- 文本块 -->
              <p v-if="block.type === 'text'" class="rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2 text-[14px] leading-relaxed text-slate-700">
                {{ block.content }}
              </p>

              <!-- 步骤块 -->
              <div v-else-if="block.type === 'step'" class="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span class="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">✓</span>
                <span>{{ block.label }}</span>
              </div>

              <!-- 指标块 -->
              <div v-else-if="block.type === 'metric'" class="inline-flex items-baseline gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span class="text-[12px] text-slate-400">{{ block.label }}</span>
                <span class="text-[18px] font-bold text-slate-900">{{ block.value }}</span>
                <span v-if="block.change" class="text-[12px] font-medium" :class="block.dir === 'up' ? 'text-red-500' : 'text-emerald-500'">
                  {{ block.dir === 'up' ? '↑' : '↓' }} {{ block.change }}
                </span>
                <span v-if="block.period" class="text-[10px] text-slate-300">{{ block.period }}</span>
              </div>

              <!-- 商品卡片块（混排核心） -->
              <div
                v-else-if="block.type === 'product-card' && getProduct(block.productId)"
                class="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-400 hover:shadow-sm"
                @click="emit('navigateProduct', block.productId)"
              >
                <div class="flex items-center gap-1.5">
                  <span class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">{{ typeMeta[getProduct(block.productId)!.type].label }}</span>
                  <span class="text-[14px] font-semibold text-slate-800">{{ getProduct(block.productId)!.name }}</span>
                </div>
                <div class="mt-1 text-[12px] text-slate-500">{{ getProduct(block.productId)!.subtitle }}</div>
                <div class="mt-1.5 inline-block rounded bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">{{ block.reason }}</div>
              </div>

              <!-- 来源块 -->
              <button
                v-else-if="block.type === 'source'"
                class="flex w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-left text-[12px] text-slate-500"
                @click="block.productId && emit('navigateProduct', block.productId)"
              >
                <span>{{ block.locked ? '🔒' : '📄' }}</span>
                <span class="truncate">{{ block.title }}</span>
                <span class="ml-auto text-slate-300">›</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- 打字动画 -->
      <div v-if="typing" class="flex gap-2">
        <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 text-[10px] font-bold text-white">
          AI
        </div>
        <div class="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 0ms" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 150ms" />
          <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style="animation-delay: 300ms" />
        </div>
      </div>

      <!-- 追问 chips -->
      <div v-if="followUps.length && !typing" class="mt-2 flex flex-wrap gap-2 pl-9">
        <button
          v-for="fu in followUps"
          :key="fu"
          class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
          @click="emit('selectFollowUp', fu)"
        >
          {{ fu }}
        </button>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="shrink-0 border-t border-slate-100 p-3">
      <div class="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <textarea
          v-model="input"
          rows="1"
          :placeholder="placeholder"
          class="flex-1 resize-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
          @keydown="handleKeyDown"
        />
        <button
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white transition disabled:opacity-40"
          :disabled="!input.trim()"
          @click="handleSend"
        >
          ➤
        </button>
      </div>
    </div>
  </div>
</template>
