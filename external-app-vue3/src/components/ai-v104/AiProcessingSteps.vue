<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DemoFrame } from './demoConversation'

const props = defineProps<{ frame: DemoFrame }>()
const expanded = ref(false)
const searching = computed(() => props.frame.kind === 'searching')
const summary = computed(() => {
  const frame = props.frame
  if (frame.kind === 'stopped' || frame.steps.some(step => step.state === 'stopped')) return '查找已停止'
  if (frame.kind === 'failure' || frame.steps.some(step => step.state === 'failed')) return '查找未完成'
  if (frame.steps.some(step => step.state === 'waiting')) return '等待补充需求'
  if (frame.kind === 'clarify') return '已补充需求'
  if (searching.value) {
    const active = frame.steps.find(step => step.state === 'active')
    if (active?.id === 'search') return '正在查找相关数据…'
    if (active?.id === 'match') return '正在核对匹配依据…'
    return '正在理解需求…'
  }
  return frame.steps.every(step => step.state === 'done') ? '已完成查找' : '查看处理过程'
})
const states = { pending: '待处理', active: '进行中', done: '已完成', waiting: '待补充', failed: '未完成', stopped: '已停止' }
</script>

<template>
  <section class="processing-steps" data-testid="processing-steps" aria-label="处理进度">
    <button type="button" class="processing-toggle" :aria-label="`${summary}，${expanded ? '收起' : '展开'}处理过程`" :aria-expanded="expanded" :aria-controls="`process-${frame.id}`" @click="expanded = !expanded">
      <span class="process-indicator" :class="{ searching }" aria-hidden="true">{{ searching ? '◌' : summary === '已完成查找' ? '✓' : '·' }}</span>
      <span role="status" aria-live="polite">{{ summary }}</span>
      <span class="process-chevron" :class="{ expanded }" aria-hidden="true">⌄</span>
    </button>
    <ol v-show="expanded" :id="`process-${frame.id}`">
      <li v-for="step in frame.steps" :key="step.id" :data-step="step.id" :data-state="step.state" :class="step.state">
        <span class="step-indicator" aria-hidden="true">{{ step.state === 'done' ? '✓' : step.state === 'failed' ? '!' : step.state === 'active' ? '◌' : step.state === 'waiting' ? '?' : '·' }}</span>
        <span class="step-label">{{ step.label }}<small v-if="step.detail">{{ step.detail }}</small></span>
        <span class="step-state">{{ states[step.state] }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.processing-steps{margin:0 0 16px;color:#8494a7;font-size:13px;background:none;border:0;padding:0}
.processing-toggle{display:inline-flex;align-items:center;gap:8px;min-height:26px;padding:0;border:0;background:none;color:#66788f;font:inherit;cursor:pointer}
.processing-toggle:focus-visible{outline:2px solid #1677ff;outline-offset:4px;border-radius:3px}
.process-indicator{width:14px;color:#8494a7}.process-chevron{font-size:12px;color:#8494a7}.process-chevron.expanded{transform:rotate(180deg)}
ol{list-style:none;margin:8px 0 0 7px;padding:0 0 0 14px;border-left:1px solid #e3eaf2;display:grid;gap:6px;max-width:540px}
li{display:flex;align-items:baseline;gap:7px;color:#8494a7;font-size:12px;line-height:1.7}.step-indicator{width:12px;flex:none}.step-label{flex:1;min-width:0;overflow-wrap:anywhere}.step-label small{font:inherit;margin-left:8px}.step-state{font-size:10px;color:#8494a7;flex:none}.active{color:#66788f}.failed{color:#b76b6b}.searching{animation:process-pulse 1.5s ease-in-out infinite}
@keyframes process-pulse{50%{opacity:.35}}
@media(prefers-reduced-motion:reduce){.searching{animation:none}}
</style>
