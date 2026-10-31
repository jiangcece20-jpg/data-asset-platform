<script setup lang="ts">
import { computed } from 'vue'
import { matchSummary } from './matchSummary'
import type { ProductPreview } from './prototypeScenes'
const props = defineProps<{ product: ProductPreview }>()
const emit = defineEmits<{ favorite: []; details: []; action: [] }>()
const summary = computed(() => matchSummary(props.product.evidence))
const evidenceLabels = { met: '满足', partial: '部分满足', unmet: '不满足', unknown: '待核实' }
const groups = computed(() => [
  { id: 'differences', title: '条件差异', evidence: props.product.evidence.filter(e => e.state === 'partial' || e.state === 'unmet'), risks: [] },
  { id: 'risks', title: '风险提示', evidence: [], risks: props.product.risks || [] },
  { id: 'unknown', title: '待核实', evidence: props.product.evidence.filter(e => e.state === 'unknown'), risks: [] }
].filter(group => group.evidence.length || group.risks.length))
</script>

<template>
  <article class="preview-product" :data-product="product.id">
    <div class="product-top">
      <div class="product-name"><h3>{{ product.name }}</h3><span class="type-chip">{{ product.type }}</span></div>
      <button type="button" class="favorite" @click="emit('favorite')" :class="{ saved: product.saved }" :aria-label="product.saved ? '已收藏，可取消收藏' : '收藏商品'"><span aria-hidden="true">{{ product.saved ? '★' : '☆' }}</span>{{ product.saved ? '已收藏' : '收藏' }}</button>
    </div>
    <div v-if="product.coverage?.length" class="coverage"><span v-for="item in product.coverage" :key="item">{{ item }}</span></div>
    <p class="product-description">{{ product.description }}</p>
    <div class="price-row"><strong>{{ product.price }}</strong><span v-if="product.budget" class="budget" :class="product.budgetTone">{{ product.budget }}</span></div>
    <div v-if="product.best" class="best-label">✦ 最佳匹配</div>
    <p v-if="product.state" class="access-state">{{ product.state }}</p>
    <section v-if="summary" class="evidence-group satisfied" data-evidence-group="satisfied" aria-label="匹配说明"><h4 class="evidence-title">匹配说明</h4><p class="match-summary">{{ summary }}</p></section>
    <section v-for="group in groups" :key="group.id" class="evidence-group" :class="group.id" :data-evidence-group="group.id" :aria-label="group.title">
      <h4 class="evidence-title">{{ group.title }}</h4>
      <ul class="evidence-list">
        <li v-for="(evidence, index) in group.evidence" :key="`${evidence.label}:${index}`" :class="evidence.state">
          <span class="evidence-symbol" aria-hidden="true">{{ evidence.state === 'met' ? '✓' : evidence.state === 'unmet' ? '×' : evidence.state === 'partial' ? '△' : '?' }}</span>
          <div><b>{{ evidence.demand ? evidence.demand + ' · ' : '' }}{{ evidence.label }}</b><span>{{ evidence.fact }}</span></div>
          <span class="evidence-status">{{ evidenceLabels[evidence.state] }}</span>
        </li>
        <li v-for="(risk, index) in group.risks" :key="`risk:${index}`" class="known-risk">
          <span class="evidence-symbol" aria-hidden="true">⚠</span>
          <div><b v-if="risk.demand">{{ risk.demand }}</b><span>{{ risk.fact }}</span><p class="risk-impact">{{ risk.impact }}</p></div>
        </li>
      </ul>
    </section>
    <div class="product-actions"><button type="button" class="primary-action" @click="emit('action')">{{ product.action }}</button><button v-if="product.action !== '查看详情'" type="button" class="secondary-action" @click="emit('details')">查看商品</button></div>
  </article>
</template>

<style scoped>
.preview-product{padding:22px;border:1px solid #e1e5ee;border-radius:16px;background:#fff;box-shadow:0 3px 16px #27345b04}.product-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.product-name{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0}.product-name h3{font-size:16px;line-height:1.6;font-weight:650;margin:0;color:#283149}.type-chip{padding:2px 8px;border-radius:5px;background:#f1f0fb;color:#6b5fc0;font-size:11px;white-space:nowrap}.favorite{display:flex;align-items:center;gap:4px;flex:none;border:1px solid #e6e8ef;padding:5px 8px;border-radius:7px;font-size:12px;color:#788195;background:white;white-space:nowrap}.favorite span{font-size:18px;line-height:1}.favorite.saved{color:#9d731b;background:#fffbef;border-color:#f0e1b8}.coverage{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}.coverage span{font-size:11px;padding:3px 7px;background:#f2f5fb;color:#60718c;border-radius:5px}.product-description{font-size:13px;color:#7a8395;line-height:1.7;margin:10px 0}.price-row{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.price-row strong{font-size:20px;letter-spacing:-.4px;color:#5e50c6}.budget{font-size:11px;padding:3px 7px;border-radius:5px}.budget.ok{background:#edf7f1;color:#32704d}.budget.over{background:#fff3e5;color:#a26b29}.budget.unknown{background:#f2f3f7;color:#788195}.best-label{display:inline-block;font-size:12px;color:#347857;background:#edf8f1;padding:4px 8px;margin-top:12px;border-radius:5px}.access-state{font-size:12px;color:#6a7690;margin:9px 0}.evidence-title{font-size:12px;color:#8992a4;margin:18px 0 7px}.evidence-list{list-style:none;padding:0;margin:0;display:grid;gap:10px}.evidence-list li{display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.7;color:#4d7160}.evidence-symbol{font-size:14px;width:15px;flex:none}.evidence-list li>div{flex:1;min-width:0}.evidence-list b{font-weight:500;margin-right:8px;color:#626f81}.evidence-status{font-size:10px;white-space:nowrap;margin-top:1px;color:inherit}.evidence-list .unknown{color:#71809a}.evidence-list .partial{color:#ad7d36}.evidence-list .unmet{color:#b75d60}.product-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:19px}.product-actions button{border-radius:8px;font-size:12px;padding:9px 15px;line-height:1.5}.primary-action{background:#6759d7;border:1px solid #6759d7;color:white}.secondary-action{background:white;border:1px solid #d9d6ee;color:#6c5fb2}@media(max-width:520px){.preview-product{padding:16px;border-radius:13px}.product-name h3{font-size:14px}.product-top{gap:8px}.favorite{padding:4px 6px;font-size:11px}.price-row strong{font-size:19px}.evidence-list li{font-size:11px}.evidence-status{font-size:10px}.product-description{font-size:12px}}
.evidence-group{margin-top:14px;padding:12px 14px;border:1px solid #e2e9e5;background:#f7fbf8;border-radius:9px}.evidence-group .evidence-title{font-size:12px;font-weight:550;margin:0 0 9px;color:#5e7d6d;line-height:1.7}.evidence-group.differences{background:#fff8f6;border-color:#f0e0da}.differences .evidence-title{color:#a67a68}.evidence-group.risks{background:#fffbf0;border-color:#eee2be}.risks .evidence-title,.evidence-list .known-risk{color:#a1874d}.evidence-group.unknown{background:#f4f6fa;border-color:#e0e5ee}.unknown .evidence-title{color:#71809a}.risk-impact{font-size:11px;line-height:1.8;color:#a18d62;margin:5px 0 0}.evidence-list li>div{overflow-wrap:anywhere}@media(max-width:520px){.evidence-group{padding:11px 12px}.evidence-group .evidence-title{font-size:11px}.risk-impact{font-size:10px}}
.match-summary{margin:0;font-size:13px;line-height:1.9;color:#4d7160;overflow-wrap:anywhere}@media(max-width:520px){.match-summary{font-size:12px}}
</style>
