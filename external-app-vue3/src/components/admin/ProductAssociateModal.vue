<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Product } from '@/types/domain'

const props = defineProps<{
  open: boolean
  candidates: Product[]
  resourceName: string
}>()

const emit = defineEmits<{
  close: []
  create: []
  confirm: [productId: string]
}>()

const searchQuery = ref('')
const selectedId = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      searchQuery.value = ''
      selectedId.value = null
    }
  }
)

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.candidates
  return props.candidates.filter((p) => p.name.toLowerCase().includes(q))
})
</script>

<template>
  <div
    v-if="open"
    data-testid="associate-product-modal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-lg rounded-xl bg-white shadow-lg">
      <div class="border-b border-slate-100 px-5 py-4">
        <h3 class="text-sm font-semibold text-slate-800">关联商品</h3>
        <p class="mt-1 text-[11px] text-slate-400">为「{{ resourceName }}」选择已有未绑定商品，或新建并关联。</p>
      </div>

      <div class="space-y-3 px-5 py-4">
        <input
          v-model="searchQuery"
          data-testid="associate-product-search"
          type="search"
          placeholder="搜索商品名称"
          class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />

        <div class="max-h-56 overflow-y-auto rounded-lg border border-slate-100">
          <button
            v-for="product in filtered"
            :key="product.id"
            type="button"
            :data-testid="`associate-product-option-${product.id}`"
            class="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-slate-50"
            :class="selectedId === product.id ? 'bg-brand-50 text-brand-700' : 'text-slate-700'"
            @click="selectedId = product.id"
          >
            <span class="font-medium">{{ product.name }}</span>
            <span class="text-[11px] text-slate-400">{{ product.id }}</span>
          </button>
          <p v-if="!filtered.length" class="px-3 py-6 text-center text-xs text-slate-400">
            暂无可选未绑定商品，请新建并关联
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          type="button"
          data-testid="associate-product-create"
          class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
          @click="emit('create')"
        >
          新建并关联
        </button>
        <button
          type="button"
          data-testid="associate-product-confirm"
          class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!selectedId"
          @click="selectedId && emit('confirm', selectedId)"
        >
          确认关联
        </button>
      </div>
    </div>
  </div>
</template>
