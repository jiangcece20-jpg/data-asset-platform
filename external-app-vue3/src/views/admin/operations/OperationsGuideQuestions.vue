<script setup lang="ts">
import { ref } from 'vue'

const guideQuestions = defineModel<string[]>('guideQuestions', { required: true })

const newQuestion = ref('')

function addQuestion() {
  if (!newQuestion.value.trim()) return
  guideQuestions.value = [...guideQuestions.value, newQuestion.value.trim()]
  newQuestion.value = ''
}

function removeQuestion(i: number) {
  guideQuestions.value = guideQuestions.value.filter((_, idx) => idx !== i)
}

function moveUp(i: number) {
  if (i <= 0) return
  const arr = [...guideQuestions.value]
  ;[arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]
  guideQuestions.value = arr
}

function moveDown(i: number) {
  if (i >= guideQuestions.value.length - 1) return
  const arr = [...guideQuestions.value]
  ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
  guideQuestions.value = arr
}
</script>

<template>
  <div>
    <div class="mb-2 text-[13px] font-medium text-slate-700">AI 引导问题（AI 找数页展示）</div>
    <div class="mb-3 space-y-2">
      <div
        v-for="(q, i) in guideQuestions"
        :key="i"
        class="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
      >
        <span class="shrink-0 text-[13px] text-slate-400">{{ i + 1 }}</span>
        <span class="flex-1 text-[12px] text-slate-600">💬 {{ q }}</span>
        <div class="flex gap-1">
          <button
            class="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
            :disabled="i === 0"
            @click="moveUp(i)"
          >↑</button>
          <button
            class="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100"
            :disabled="i === guideQuestions.length - 1"
            @click="moveDown(i)"
          >↓</button>
          <button
            class="rounded px-1.5 py-0.5 text-[11px] text-red-400 hover:bg-red-50"
            @click="removeQuestion(i)"
          >删除</button>
        </div>
      </div>
      <div v-if="!guideQuestions.length" class="py-4 text-center text-[12px] text-slate-400">暂无引导问题</div>
    </div>
    <div class="flex gap-1.5">
      <input
        v-model="newQuestion"
        placeholder="输入新引导问题后按回车或点击添加"
        class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-brand-500 focus:outline-none"
        @keydown.enter="addQuestion"
      />
      <button
        class="rounded-lg bg-brand-500 px-4 py-2 text-[12px] font-medium text-white hover:bg-brand-600"
        @click="addQuestion"
      >添加</button>
    </div>
  </div>
</template>
