<script setup lang="ts">
import { computed } from 'vue'

export interface InfoItem {
  /** 字段名，显示在上方的浅色小字 */
  label: string
  /** 字段值，显示在下方的深色主字；空值统一回落为 — */
  value?: string | number | null
  /** 占满整行（适合较长的文本，如合规声明） */
  full?: boolean
}

const props = defineProps<{ items: InfoItem[] }>()

/** 过滤掉无 label / 空值项（空值不展示，而非回落为 —） */
const rows = computed(() =>
  props.items
    .filter((item) => item.label)
    .filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
    .map((item) => ({
      ...item,
      display: typeof item.value === 'number' ? item.value.toLocaleString() : String(item.value)
    }))
)
</script>

<template>
  <!-- 两列信息表：上标签下取值，行间横线、列间竖线 -->
  <dl class="info-grid" data-testid="info-grid">
    <div
      v-for="(row, index) in rows"
      :key="`${row.label}-${index}`"
      class="info-grid__cell"
      :class="row.full ? 'info-grid__cell--full' : ''"
    >
      <dt class="info-grid__label">{{ row.label }}</dt>
      <dd class="info-grid__value">{{ row.display }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  /* 用背景色透出 1px 间隙作为分隔线，避免逐格算边框 */
  gap: 1px;
  background-color: #f1f5f9;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
}

.info-grid__cell {
  background-color: #fff;
  padding: 12px 4px;
  min-width: 0;
}

.info-grid__cell--full {
  grid-column: 1 / -1;
}

.info-grid__label {
  font-size: 12px;
  line-height: 1.4;
  color: #94a3b8;
}

.info-grid__value {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 600;
  color: #0f172a;
  overflow-wrap: anywhere;
}
</style>
