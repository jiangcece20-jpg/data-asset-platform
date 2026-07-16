<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import { useCatalogStore } from '@/stores/catalog'

const catalog = useCatalogStore()

const hotWords = ref(['货运价格趋势', '资格核验 API', '企业物流活跃度', '联合分析'])
const guideQuestions = ref(['货运价格趋势如何？', '有没有资格核验类的数据产品？', '企业物流活跃度怎么查？'])
const newWord = ref('')

function addWord() {
  if (!newWord.value.trim()) return
  hotWords.value.push(newWord.value.trim())
  newWord.value = ''
}
function removeWord(i: number) {
  hotWords.value.splice(i, 1)
}

function toggleRecommend(productId: string, current: boolean) {
  catalog.updateEnhancement(productId, { recommendSlot: !current })
}
</script>

<template>
  <div>
    <PageHeader title="运营配置" desc="首页入口、频道、场景、推荐位、热门词、AI 引导问题" />

    <div class="grid grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">首页入口 / 频道</div>
        <div class="text-[12px] leading-relaxed text-slate-500">
          综合 APP 首页：找数唯一入口（已配置）<br />
          全部商品频道：行业报告 / 交互报表 / 数据集 / API / PQ-PIR / 联合分析 / 解决方案（7 个类型频道，已配置）
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">热门词</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="(w, i) in hotWords" :key="w" class="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] text-slate-600">
            {{ w }}
            <button class="text-slate-400" @click="removeWord(i)">×</button>
          </span>
        </div>
        <div class="mt-2 flex gap-1.5">
          <input v-model="newWord" placeholder="新增热门词" class="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]" @keydown.enter="addWord" />
          <button class="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] text-white" @click="addWord">添加</button>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">AI 引导问题</div>
        <ul class="space-y-1 text-[12px] text-slate-600">
          <li v-for="q in guideQuestions" :key="q">💬 {{ q }}</li>
        </ul>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <div class="mb-2 text-[13px] font-medium text-slate-700">推荐位</div>
        <div v-for="p in catalog.published" :key="p.id" class="flex items-center justify-between py-1 text-[12px]">
          <span class="text-slate-600">{{ p.name }}</span>
          <button
            class="rounded-full px-2 py-0.5 text-[11px]"
            :class="catalog.enhancementOf(p.id)?.recommendSlot ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'"
            @click="toggleRecommend(p.id, !!catalog.enhancementOf(p.id)?.recommendSlot)"
          >
            {{ catalog.enhancementOf(p.id)?.recommendSlot ? '推荐中' : '未推荐' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
