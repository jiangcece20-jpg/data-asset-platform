<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'mobile' | 'portal'
  clickable?: boolean
}>(), { clickable: false })

const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
}>()

function onActivate(event: MouseEvent | KeyboardEvent) {
  if (props.clickable) emit('click', event)
}
</script>

<template>
  <article
    class="rounded-2xl border border-slate-100 bg-white shadow-card"
    :class="[
      variant === 'portal' ? 'p-5' : 'p-4',
      clickable ? 'cursor-pointer transition hover:border-brand-200' : ''
    ]"
    :role="clickable ? 'link' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="onActivate"
    @keydown.enter.prevent="onActivate"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div
          class="flex flex-wrap items-center gap-1.5"
          :class="variant === 'portal' ? 'text-xs' : 'text-[10px]'"
        >
          <slot name="badges" />
        </div>
        <h3
          class="mt-2 font-semibold leading-snug text-slate-900"
          :class="variant === 'portal' ? 'text-base' : 'text-[14px]'"
        >
          <slot name="title" />
        </h3>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <slot name="status" />
        <span v-if="clickable" class="text-lg leading-none text-slate-300" aria-hidden="true">›</span>
      </div>
    </div>

    <div
      v-if="$slots.meta"
      class="mt-3 grid gap-x-4 gap-y-2 rounded-xl bg-slate-50"
      :class="variant === 'portal' ? 'grid-cols-3 p-4 text-xs' : 'grid-cols-2 p-3 text-[10px]'"
    >
      <slot name="meta" />
    </div>

    <div v-if="$slots.notice" class="mt-2">
      <slot name="notice" />
    </div>

    <div
      v-if="$slots.actions"
      class="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"
    >
      <slot name="actions" />
    </div>
  </article>
</template>
