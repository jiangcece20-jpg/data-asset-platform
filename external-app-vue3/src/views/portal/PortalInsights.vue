<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import PortalProductIcon from './components/PortalProductIcon.vue'
import './portal-concept.css'
import './portal-insights.css'

type Report = { id: string; name: string; description: string; dimensions: string[] }
const groups: { id: string; name: string; caption: string; icon: 'dataset' | 'dashboard' | 'report'; reports: Report[] }[] = [
  { id: 'industry', name: '产业数据', caption: '洞察产业变化，把握市场先机', icon: 'dataset', reports: [
    { id: 'industry-data', name: '产业数据', description: '覆盖钢铁、能源、有色、化工等主流大宗产业，一站式提供产业价格、库存与产量分析。', dimensions: ['产业价格', '库存变化', '产量趋势'] }
  ] },
  { id: 'index', name: '指数', caption: '读懂运输趋势，辅助科学决策', icon: 'dashboard', reports: [
    { id: 'freight-index', name: '运价指数', description: '覆盖周期、区域、货品线路多维运价数据，追踪运价走势，核算运输成本，规划发货方案。', dimensions: ['区域运价', '线路走势', '成本分析'] },
    { id: 'efficiency-index', name: '物流效率指数', description: '对比多区域、货品线路的运输效率，定位低效线路，优化运输组织与车辆调度。', dimensions: ['运输时效', '线路效率', '区域对比'] },
    { id: 'capacity-index', name: '运力活跃指数', description: '追踪各省运力活跃度，研判区域供需，提前调配车辆，规避运力紧张区域。', dimensions: ['运力分布', '活跃趋势', '供需变化'] },
    { id: 'freight-query', name: '全国运价查询工具', description: '按出发地、目的地与货物类型查询市场运价，快速了解公开价格区间，辅助运输询价。', dimensions: ['出发地', '目的地', '货物类型'] }
  ] },
  { id: 'business', name: '生意参谋', caption: '从市场洞察，到经营提效', icon: 'report', reports: [
    { id: 'market-board', name: '物流市场看板', description: '汇集运单、货源与线路产销地数据，掌握市场供需，发现优质货源与线路商机。', dimensions: ['货源供需', '线路分布', '市场机会'] },
    { id: 'operations-board', name: '物流经营数据', description: '聚合企业运单、回款与结算数据，跟踪订单履约，识别经营风险，掌握业务全貌。', dimensions: ['订单履约', '回款结算', '经营概览'] }
  ] }
]
const selected = ref<string[]>([])
const keyword = ref('')
const sort = ref('default')
const collapsed = ref<string[]>([])
const allReports = groups.flatMap(g => g.reports)
const filteredGroups = computed(() => groups.map(group => ({ ...group, reports: group.reports.filter(report =>
  (!selected.value.length || selected.value.includes(report.id)) && `${report.name} ${report.description}`.includes(keyword.value.trim())
).sort((a,b) => sort.value === 'name' ? a.name.localeCompare(b.name,'zh-CN') : 0) })).filter(g => g.reports.length))
const resultCount = computed(() => filteredGroups.value.reduce((sum,g) => sum + g.reports.length,0))
function toggleGroup(id: string) {
  const reports = groups.find(g => g.id === id)!.reports.map(r => r.id)
  selected.value = reports.every(id => selected.value.includes(id)) ? selected.value.filter(id => !reports.includes(id)) : [...new Set([...selected.value,...reports])]
}
function toggleReport(id: string) { selected.value = selected.value.includes(id) ? selected.value.filter(item => item !== id) : [...selected.value,id] }
function toggleCollapse(id: string) { collapsed.value = collapsed.value.includes(id) ? collapsed.value.filter(item => item !== id) : [...collapsed.value,id] }
function clearFilters() { selected.value = []; keyword.value = '' }
const preview = ref<Report>()
const previewPanel = ref<HTMLElement>()
let previousFocus: HTMLElement | null = null
watch(preview, async report => {
  if (report) { previousFocus = document.activeElement as HTMLElement; await nextTick(); previewPanel.value?.querySelector<HTMLButtonElement>('button')?.focus() }
  else previousFocus?.focus()
})
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = Array.from(previewPanel.value?.querySelectorAll<HTMLButtonElement>('button') || [])
  if (buttons.length && ((event.shiftKey && document.activeElement === buttons[0]) || (!event.shiftKey && document.activeElement === buttons[buttons.length-1]))) { event.preventDefault(); (event.shiftKey ? buttons[buttons.length-1] : buttons[0]).focus() }
}
</script>

<template>
  <main class="insights-page">
    <header class="insights-hero">
      <div class="insights-hero-copy"><p class="insights-eyebrow"><span></span> DATA INSIGHTS</p><h1>看见数据，<span>洞察生意。</span></h1><p class="insights-hero-description">汇聚全行业数据，让每一次经营决策更有依据。</p><div class="insights-hero-tags"><span>产业洞察</span><i></i><span>运输指数</span><i></i><span>经营分析</span></div></div>
      <div class="insights-hero-art" aria-hidden="true"><div class="hero-art-halo"></div><div class="hero-chart-back"></div><div class="hero-chart-front"><div class="mini-chart-top"><span></span><i></i><i></i></div><div class="hero-chart-layout"><div class="hero-chart-side"><span></span><span></span><span></span></div><div class="hero-chart-body"><div class="hero-chart-metrics"><i></i><i></i><i></i></div><svg viewBox="0 0 180 65" fill="none"><defs><linearGradient id="insight-hero-area" x2="0" y2="1"><stop stop-color="#81b3ff" stop-opacity=".6"/><stop offset="1" stop-color="#eaf3ff" stop-opacity="0"/></linearGradient></defs><path d="M0 55 18 44 36 48 54 25 72 33 90 17 108 23 126 9 144 17 162 4 180 9V65H0Z" fill="url(#insight-hero-area)"/><path d="m0 55 18-11 18 4 18-23 18 8 18-16 18 6 18-14 18 8 18-13 18 5" stroke="#b8cff7" stroke-width="1.4" stroke-linecap="round"/><path class="hero-chart-trace" pathLength="1" d="m0 55 18-11 18 4 18-23 18 8 18-16 18 6 18-14 18 8 18-13 18 5" stroke="#5388ed" stroke-width="2.2" stroke-linecap="round"/><circle class="hero-chart-runner hero-runner-halo" r="5" fill="#65b4ff" fill-opacity=".22"/><circle class="hero-chart-runner" r="2.4" fill="#4c93f1" stroke="white" stroke-width="1"/><path d="M0 62h180M0 40h180M0 18h180" stroke="#c8d9f4" stroke-opacity=".45" stroke-width=".6"/></svg></div></div></div><span class="art-float-chip chip-chart">▥</span><span class="art-float-chip chip-growth">↗</span><div class="art-orbit-dot"></div></div>
    </header>

    <div class="insights-workspace">
      <aside class="insights-filter" aria-label="报表分类筛选"><div class="insights-filter-title"><h2>看数类型</h2><button :disabled="!selected.length && !keyword" @click="clearFilters">清空筛选</button></div><button class="all-reports-filter" :class="{ active: !selected.length }" @click="selected = []"><span>全部报表</span><b>{{ allReports.length }}</b></button>
        <div v-for="group in groups" :key="group.id" class="report-filter-group"><div class="filter-group-heading"><button class="filter-collapse" :aria-label="`${collapsed.includes(group.id) ? '展开' : '收起'}${group.name}`" :aria-expanded="!collapsed.includes(group.id)" @click="toggleCollapse(group.id)">{{ collapsed.includes(group.id) ? '›' : '⌄' }}</button><label><input type="checkbox" :aria-label="`筛选${group.name}分类`" :checked="group.reports.every(r => selected.includes(r.id))" :indeterminate="group.reports.some(r => selected.includes(r.id)) && !group.reports.every(r => selected.includes(r.id))" @change="toggleGroup(group.id)"><span>{{ group.name }}</span></label><small>{{ group.reports.length }}</small></div><div v-if="!collapsed.includes(group.id)" class="filter-group-items"><label v-for="report in group.reports" :key="report.id"><input type="checkbox" :checked="selected.includes(report.id)" @change="toggleReport(report.id)"><span>{{ report.name }}</span></label></div></div>
        <div class="insights-filter-note"><span>✧</span><strong>让洞察更进一步</strong><p>探索更多数据，找到业务增长的新可能。</p><router-link to="/portal/search">发现更多数据 ↗</router-link></div>
      </aside>

      <section class="insights-results" aria-label="报表列表"><div class="insights-toolbar"><div><h2>{{ selected.length || keyword.trim() ? '筛选结果' : '全部报表' }}</h2><span>{{ resultCount }} 个</span><span class="insights-example-note">原型示例 · 非真实业务数据</span></div><div class="insights-tools"><label class="insights-search"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg><input v-model="keyword" aria-label="搜索报表" placeholder="搜索报表名称或关键词"></label><select v-model="sort" aria-label="报表排序"><option value="default">默认排序</option><option value="name">按名称</option></select></div></div>
        <section v-for="group in filteredGroups" :key="group.id" class="report-section" :data-report-group="group.id"><header><div><span class="report-group-mark" :class="group.id"></span><h3>{{ group.name }}</h3><small>{{ group.reports.length }}</small></div><p>{{ group.caption }}</p></header><div class="insights-card-grid"><button v-for="(report,index) in group.reports" :key="report.id" class="insight-report-card" :data-report="report.id" @click="preview = report"><div class="report-card-title"><PortalProductIcon :type="group.icon" :size="42"/><h4>{{ report.name }}</h4><span class="report-open-arrow">↗</span></div><div class="report-dimension-tags"><span v-for="dimension in report.dimensions.slice(0,2)" :key="dimension">{{ dimension }}</span></div><p class="report-description">{{ report.description }}</p><div class="report-card-chart" aria-hidden="true"><svg v-if="group.id !== 'business'" viewBox="0 0 240 36" preserveAspectRatio="none" fill="none"><path d="M0 32H240M0 16H240" stroke="#eef1f8" stroke-width=".7"/><path :d="index % 2 ? 'M0 27 20 22 40 25 60 13 80 18 100 9 120 16 140 10 160 13 180 5 200 10 220 3 240 7' : 'M0 30 20 25 40 27 60 18 80 23 100 14 120 18 140 9 160 14 180 8 200 12 220 3 240 7'" :stroke="group.id === 'industry' ? '#70b9db' : '#95a5e8'" stroke-width="1.5" stroke-linecap="round"/></svg><div v-else class="report-mini-bars"><i v-for="n in 18" :key="n" :style="{ height: `${25 + ((n * 31 + index * 11) % 65)}%` }"></i></div></div><div class="report-card-footer"><span class="report-example-text">设计示例报表</span><span>查看报表 <b>↗</b></span></div></button></div></section>
        <div v-if="!resultCount" class="insights-empty"><PortalProductIcon type="view" :size="55"/><h3>没有找到匹配的报表</h3><p>调整关键词或清空筛选后再试试。</p><button @click="clearFilters">清空筛选</button></div>
        <footer class="insights-results-footer"><span>已展示全部 {{ resultCount }} 个报表</span><span>从数据中发现更多可能</span></footer>
      </section>
    </div>
    <footer class="insights-page-footer"><span>万联灵析 <b>/</b> 看见数据的价值</span><span>INSIGHT · UNDERSTAND · DECIDE</span></footer>
    <div v-if="preview" class="insight-preview-backdrop" @click.self="preview = undefined" @keydown.esc="preview = undefined"><section ref="previewPanel" class="insight-preview-panel" role="dialog" aria-modal="true" aria-labelledby="report-preview-name" @keydown="trapFocus"><header><div><p>REPORT PREVIEW</p><h2 id="report-preview-name">{{ preview.name }}</h2></div><button aria-label="关闭报表预览" @click="preview = undefined">×</button></header><span class="preview-example-label">设计预览 · 非真实业务数据</span><p class="preview-description">{{ preview.description }}</p><div class="preview-dimensions"><span v-for="dimension in preview.dimensions" :key="dimension">{{ dimension }}</span></div><div class="preview-chart"><div><strong>趋势概览</strong><span>示意图</span></div><svg viewBox="0 0 500 170" fill="none"><path d="M15 25H485M15 65H485M15 105H485M15 145H485" stroke="#e8edf7" stroke-dasharray="3 4"/><path d="m15 130 40-14 40 8 40-35 40 15 40-30 40 9 40-28 40 12 40-21 40 8 40-26 30 8" stroke="#7ca2eb" stroke-width="2.5" stroke-linejoin="round"/><path d="m15 145 40-9 40 4 40-21 40 10 40-18 40 6 40-18 40 8 40-12 40 4 40-16 30 5" stroke="#88c5cb" stroke-width="2" stroke-linejoin="round"/></svg><div class="preview-chart-legend"><span>● 主维度</span><span>● 对比维度</span></div></div><p class="preview-note">此处用于评审报表入口与预览样式，完整业务报表待接入。</p></section></div>
  </main>
</template>
