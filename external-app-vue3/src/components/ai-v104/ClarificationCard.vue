<script setup lang="ts">
import type { DemoClarification } from './demoConversation'
defineProps<{ question: DemoClarification; id: string; readonly?: boolean }>()
const emit = defineEmits<{ select: [value: string]; 'update:text': [value: string]; submit: [] }>()
</script>
<template>
  <form class="clarification-card" :data-mode="question.mode" @submit.prevent="!readonly && !question.submitted && emit('submit')">
    <fieldset :disabled="readonly || question.submitted">
      <legend>{{ question.question }}</legend>
      <p class="answer-mode">{{ question.mode === 'single' ? '单选；也可以直接输入回答' : question.mode === 'multiple' ? '可多选；也可以直接输入回答' : '请描述你的要求' }}</p>
      <div v-if="question.options.length" class="answer-options">
        <label v-for="option in question.options" :key="option.value" :class="{ selected: question.selected.includes(option.value) }">
          <input :type="question.mode === 'multiple' ? 'checkbox' : 'radio'" :name="id" :value="option.value" :checked="question.selected.includes(option.value)" @change="emit('select', option.value)" />
          <span>{{ option.label }}</span>
        </label>
      </div>
      <label class="custom-answer"><span>{{ question.options.length ? '补充或纠正（选填）' : '你的回答' }}</span><textarea :value="question.text" rows="3" :aria-label="question.options.length ? '补充或纠正回答' : '澄清回答'" :placeholder="question.options.length ? '可以补充、纠正选项，也可以只在这里回答……' : '请输入你的回答……'" @input="emit('update:text', ($event.target as HTMLTextAreaElement).value)"></textarea></label>
    </fieldset>
    <p v-if="readonly || question.submitted" class="answer-mode">{{ question.submitted ? '已提交的回答' : '历史澄清记录' }}</p>
    <button v-else type="submit" :disabled="!question.selected.length && !question.text.trim()">提交回答</button>
  </form>
</template>
<style scoped>
.clarification-card{margin:16px 0;padding:20px;border:1px solid #dce6f4;border-radius:14px;background:#f9fbff;color:#26364d}
fieldset{border:0;padding:0;margin:0;min-width:0}legend{font-weight:600;font-size:15px;line-height:1.6;padding:0}.answer-mode{font-size:12px;color:#7a8ba1;line-height:1.6;margin:8px 0 12px}
.answer-options{display:grid;gap:8px;margin:12px 0}.answer-options label{display:flex;gap:10px;align-items:center;padding:12px;background:white;border:1px solid #e0e7ef;border-radius:9px;cursor:pointer;line-height:1.5}.answer-options label.selected{border-color:#2176ff;background:#eff5ff}.answer-options input{accent-color:#2176ff;width:16px;height:16px;margin:0;flex-shrink:0}
.custom-answer{display:grid;gap:8px;font-size:13px;color:#667b96}.custom-answer textarea{box-sizing:border-box;width:100%;border:1px solid #dce4ef;border-radius:9px;padding:12px;background:white;color:#26364d;font:inherit;resize:vertical;min-height:70px}.custom-answer textarea:focus{outline:2px solid #afd0ff;outline-offset:1px}button{margin-top:14px;background:#2176ff;color:white;border:0;border-radius:8px;padding:10px 18px;font:inherit;cursor:pointer}button:disabled{opacity:.4;cursor:default}fieldset:disabled label{cursor:default}textarea:disabled{color:#667b96;background:#f4f6f9}
@media(max-width:600px){.clarification-card{padding:16px}.answer-options label{padding:10px}}
</style>
