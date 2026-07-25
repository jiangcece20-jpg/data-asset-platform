<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'

export interface ScrollColumn {
  key: string
  label: string
  /** 单元格水平对齐，默认左对齐 */
  align?: 'left' | 'center'
  /** 等宽字体，适合字段名、编号 */
  mono?: boolean
}

const props = defineProps<{
  columns: ScrollColumn[]
  rows: Array<Record<string, string | number | null | undefined>>
  /** 首列是否吸附在左侧，横滑时保持可见 */
  stickyFirst?: boolean
}>()

const scroller = ref<HTMLElement | null>(null)
const scrollable = ref(false)
const atEnd = ref(false)

function sync() {
  const el = scroller.value
  if (!el) return
  const max = el.scrollWidth - el.clientWidth
  scrollable.value = max > 4
  atEnd.value = el.scrollLeft >= max - 4
}

onMounted(() => {
  sync()
  window.addEventListener('resize', sync)
})
onBeforeUnmount(() => window.removeEventListener('resize', sync))

/** 右侧渐隐提示：可横滑且未滑到底时显示 */
const showHint = computed(() => scrollable.value && !atEnd.value)

function cellText(row: Record<string, string | number | null | undefined>, key: string) {
  const v = row[key]
  return v === null || v === undefined || v === '' ? '—' : String(v)
}
</script>

<template>
  <div class="relative">
    <div ref="scroller" class="scroll-table" data-testid="scroll-table" @scroll="sync">
      <table class="scroll-table__table">
        <thead>
          <tr>
            <th
              v-for="(col, i) in columns"
              :key="col.key"
              class="scroll-table__th"
              :class="[
                col.align === 'center' ? 'text-center' : 'text-left',
                stickyFirst && i === 0 ? 'scroll-table__sticky scroll-table__sticky--head' : ''
              ]"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="idx" class="scroll-table__tr">
            <td
              v-for="(col, i) in columns"
              :key="col.key"
              class="scroll-table__td"
              :class="[
                col.align === 'center' ? 'text-center' : 'text-left',
                col.mono ? 'font-mono text-slate-800' : 'text-slate-600',
                stickyFirst && i === 0 ? 'scroll-table__sticky' : ''
              ]"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ cellText(row, col.key) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 右侧渐隐，提示还可继续横滑 -->
    <div v-if="showHint" class="scroll-table__hint" aria-hidden="true" />
  </div>
</template>

<style scoped>
.scroll-table {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.scroll-table::-webkit-scrollbar {
  height: 4px;
}
.scroll-table::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* 关键：不使用 w-full，让表格按内容撑开才会真正产生横向滚动 */
.scroll-table__table {
  min-width: 100%;
  width: max-content;
  border-collapse: collapse;
  font-size: 12px;
}

.scroll-table__th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  color: #94a3b8;
  font-weight: 500;
  padding: 8px 12px;
  white-space: nowrap;
}

.scroll-table__td {
  padding: 8px 12px;
  white-space: nowrap;
}

.scroll-table__tr {
  border-top: 1px solid #f1f5f9;
}

/* 首列吸附：横滑时保持字段名可见 */
.scroll-table__sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  box-shadow: 1px 0 0 0 #f1f5f9;
}
.scroll-table__sticky--head {
  z-index: 2;
  background: #f8fafc;
}

.scroll-table__hint {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 4px;
  width: 24px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.95));
}
</style>
