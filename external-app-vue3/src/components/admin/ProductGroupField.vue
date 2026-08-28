<script setup lang="ts">
defineProps<{
  associates: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  add: []
  remove: [productId: string]
}>()
</script>

<template>
  <div class="mb-4 flex items-start gap-3" data-testid="product-group-field">
    <span class="mt-2 w-16 shrink-0 text-xs text-slate-500">关联商品</span>
    <div
      class="flex min-h-[38px] flex-1 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5"
      data-testid="product-group-tags"
    >
      <span
        v-for="item in associates"
        :key="item.id"
        class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
        :data-testid="`product-group-tag-${item.id}`"
      >
        {{ item.name }}
        <button
          type="button"
          class="rounded px-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          :data-testid="`product-group-remove-${item.id}`"
          :aria-label="`移除 ${item.name}`"
          @click="emit('remove', item.id)"
        >
          ×
        </button>
      </span>
      <button
        type="button"
        data-testid="associate-product-add"
        class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-slate-300 text-base font-semibold text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
        aria-label="添加关联商品"
        @click="emit('add')"
      >
        +
      </button>
    </div>
  </div>
  <p v-if="associates.length" class="mb-4 text-[11px] leading-relaxed text-slate-400">
    购买组内任一商品将获得全部关联商品权益；改价、停售与当前商品同步。
  </p>
</template>
