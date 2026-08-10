<script setup lang="ts">
import { ref } from 'vue'

const hotWords = defineModel<string[]>('hotWords', { required: true })

const newWord = ref('')

function addWord() {
  if (!newWord.value.trim()) return
  hotWords.value = [...hotWords.value, newWord.value.trim()]
  newWord.value = ''
}

function removeWord(i: number) {
  hotWords.value = hotWords.value.filter((_, idx) => idx !== i)
}
</script>

<template>
  <div>
    <div class="mb-2 text-[13px] font-medium text-slate-700">热门词</div>
    <div class="mb-3 flex flex-wrap gap-1.5">
      <span
        v-for="(w, i) in hotWords"
        :key="w"
        class="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] text-slate-600"
      >
        {{ w }}
        <button class="text-slate-400 hover:text-slate-600" @click="removeWord(i)">×</button>
      </span>
      <span v-if="!hotWords.length" class="text-[12px] text-slate-400">暂无热门词</span>
    </div>
    <div class="flex gap-1.5">
      <input
        v-model="newWord"
        placeholder="输入新热门词后按回车或点击添加"
        class="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] focus:border-brand-500 focus:outline-none"
        @keydown.enter="addWord"
      />
      <button
        class="rounded-lg bg-brand-500 px-4 py-2 text-[12px] font-medium text-white hover:bg-brand-600"
        @click="addWord"
      >添加</button>
    </div>
  </div>
</template>
