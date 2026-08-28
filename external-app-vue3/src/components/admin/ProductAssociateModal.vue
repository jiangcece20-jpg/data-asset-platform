<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { packagingStatusLabel, type ProductPackCandidate } from '@/domain/productGroup'

const props = defineProps<{
  open: boolean
  candidates: ProductPackCandidate[]
  sourceProductName: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [productIds: string[]]
}>()

const searchQuery = ref('')
const selectedIds = ref<string[]>([])

watch(
  () => props.open,
  (open) => {
    if (open) {
      searchQuery.value = ''
      selectedIds.value = []
    }
  }
)

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = props.candidates
  if (!q) return list
  return list.filter((item) => item.product.name.toLowerCase().includes(q))
})

function isSelected(productId: string) {
  return selectedIds.value.includes(productId)
}

function isChecked(item: ProductPackCandidate) {
  return item.packagingStatus === 'linked_here' || isSelected(item.product.id)
}

function toggleSelection(item: ProductPackCandidate) {
  if (!item.selectable) return
  const id = item.product.id
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((itemId) => itemId !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function confirmSelection() {
  if (!selectedIds.value.length) return
  emit('confirm', [...selectedIds.value])
}

function tagClass(status: ProductPackCandidate['packagingStatus']) {
  if (status === 'available') return 'bg-emerald-50 text-emerald-600'
  if (status === 'linked_here') return 'bg-brand-50 text-brand-700'
  return 'bg-slate-100 text-slate-500'
}
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
        <h3 class="text-sm font-semibold text-slate-800">关联商品（打包）</h3>
        <p class="mt-1 text-[11px] leading-relaxed text-slate-400">
          为「{{ sourceProductName }}」打包关联其它商品，可多选未打包商品。已关联商品会标记状态；已在其它组内的商品不可重复选择。
        </p>
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
            v-for="item in filtered"
            :key="item.product.id"
            type="button"
            :data-testid="`associate-product-option-${item.product.id}`"
            :disabled="!item.selectable"
            class="flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-b-0"
            :class="[
              !item.selectable ? 'cursor-not-allowed bg-slate-50/80 text-slate-500' : 'hover:bg-slate-50',
              isSelected(item.product.id) ? 'bg-brand-50 text-brand-700' : '',
              item.packagingStatus === 'linked_here' ? 'bg-brand-50/60' : ''
            ]"
            @click="toggleSelection(item)"
          >
            <input
              type="checkbox"
              class="pointer-events-none shrink-0"
              :checked="isChecked(item)"
              :disabled="!item.selectable"
              tabindex="-1"
            />
            <span class="min-w-0 flex-1 font-medium">{{ item.product.name }}</span>
            <span
              class="max-w-[140px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]"
              :class="tagClass(item.packagingStatus)"
              :data-testid="`associate-product-tag-${item.product.id}`"
              :title="packagingStatusLabel(item)"
            >
              {{ packagingStatusLabel(item) }}
            </span>
          </button>
          <p v-if="!filtered.length" class="px-3 py-6 text-center text-xs text-slate-400">暂无匹配商品</p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <span class="text-[11px] text-slate-400" data-testid="associate-product-selected-count">
          已选 {{ selectedIds.length }} 个
        </span>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            data-testid="associate-product-confirm"
            class="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!selectedIds.length"
            @click="confirmSelection"
          >
            确认关联
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
