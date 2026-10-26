<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Product } from '@/types/domain'
import { useCatalogStore } from '@/stores/catalog'
import { publicDatasetEntry } from '@/domain/datasetEntry'
import PortalProductIcon from './PortalProductIcon.vue'
import '../portal-concept.css'
import '../dataset-workspace.css'

const props = defineProps<{ datasets: Product[]; activeTab: string; keyword: string; sort: string; targetUnavailable: boolean; emptyMessage: string }>()
const emit = defineEmits<{ selectTab: [key: string]; openDataset: [id: string]; 'update:keyword': [value: string]; 'update:sort': [value: string] }>()
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const tabs = [{ key: 'all', label: '全部' }, { key: 'sql', label: 'SQL 查询' }, { key: 'model', label: '可视化建模' }, { key: 'purchased', label: '已购数据集' }]
const families = [
  { name: '有色金属', symbol: 'Cu', caption: '铜、铝、锌等金属行情', color: 'blue', keys: ['铜', '铝', '锌', '有色'] },
  { name: '能源化工', symbol: 'H₂', caption: '原油、煤炭与化工市场', color: 'cyan', keys: ['能源', '原油', '煤', '化工'] },
  { name: '黑色金属', symbol: 'Fe', caption: '钢材、铁矿石产业数据', color: 'indigo', keys: ['钢', '铁', '黑色'] },
  { name: '农林牧渔', symbol: 'Ag', caption: '粮食、畜禽与生鲜农产', color: 'green', keys: ['农', '粮', '畜', '生鲜'] },
  { name: '建材', symbol: 'Si', caption: '水泥、玻璃与建材行情', color: 'violet', keys: ['水泥', '玻璃', '建材'] },
  { name: '物流指数', symbol: '↗', caption: '货运、运价与物流趋势', color: 'azure', keys: ['货运', '物流', '运价', '吞吐'] }
]
const publicProducts = computed(() => catalog.products.filter(p => p.type === 'dataset' && p.publicDataset && catalog.resourceById(p.resourceId)?.sourcePublicDataset === true && p.status === 'published' && p.availability === 'published'))
function familyProducts(name: string) {
  const family = families.find(f => f.name === name)
  return publicProducts.value.filter(p => family?.keys.some(key => `${p.name} ${p.description || ''}`.includes(key)))
}
const openFamily = ref('')
type Draft = { id: string; name: string; kind: 'sql' | 'model'; description: string; updated: string; sql: string }
const drafts = ref<Draft[]>([
  { id: 'design-sql-1', name: '线路运营指标汇总', kind: 'sql', description: '汇总城市线路运单量、运输里程与平均运价，为日常运营提供分析基础。', updated: '2026-10-21 10:51', sql: 'SELECT city, COUNT(*) AS order_count\nFROM freight_orders\nGROUP BY city;' },
  { id: 'design-model-1', name: '城市货运趋势分析', kind: 'model', description: '关联城市货运与线路信息，按区域、时间维度探索业务变化。', updated: '2026-10-20 15:32', sql: '' },
  { id: 'design-sql-2', name: '承运商履约明细', kind: 'sql', description: '整合承运商订单、履约时效与服务质量，持续跟踪运输表现。', updated: '2026-10-19 09:24', sql: 'SELECT carrier_name, on_time_rate\nFROM carrier_performance;' }
])
const shownDrafts = computed(() => {
  if (props.activeTab === 'purchased') return []
  return drafts.value.filter(d => (props.activeTab === 'all' || props.activeTab === d.kind) && d.name.toLowerCase().includes(props.keyword.trim().toLowerCase()))
    .sort((a,b) => props.sort === 'name' ? a.name.localeCompare(b.name,'zh-CN') : b.updated.localeCompare(a.updated))
})
const visibleCount = computed(() => props.datasets.length + shownDrafts.value.length)
const editorOpen = ref(false)
const editorDialog = ref<HTMLElement>()
let restoreFocus: HTMLElement | null = null
watch(editorOpen, async (opened) => {
  if (opened) {
    restoreFocus = document.activeElement as HTMLElement
    await nextTick()
    editorDialog.value?.querySelector<HTMLInputElement>('input')?.focus()
  } else restoreFocus?.focus()
})
function trapEditorFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const controls = Array.from(editorDialog.value?.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex="0"]') || [])
  const first = controls[0], last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
const editingId = ref('')
const draftName = ref('')
const draftDescription = ref('')
const draftKind = ref<'sql' | 'model'>('sql')
const draftSql = ref('')
const feedback = ref('')
let serial = 0
function openEditor(kind: 'sql' | 'model' = 'sql', draft?: Draft) {
  editingId.value = draft?.id || ''; draftKind.value = draft?.kind || kind
  draftName.value = draft?.name || ''; draftDescription.value = draft?.description || ''; draftSql.value = draft?.sql || ''
  editorOpen.value = true
}
function saveDraft() {
  if (!draftName.value.trim()) return
  const entry: Draft = { id: editingId.value || `design-draft-${Date.now()}-${++serial}`, name: draftName.value.trim(), kind: draftKind.value, description: draftDescription.value.trim() || '暂无描述', sql: draftSql.value, updated: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0,16) }
  if (editingId.value) drafts.value = drafts.value.map(d => d.id === editingId.value ? entry : d)
  else drafts.value.unshift(entry)
  editorOpen.value = false
  emit('selectTab', 'all')
  feedback.value = '已保存原型示例，本次页面刷新前有效。'
}
function copyDraft(draft: Draft) {
  drafts.value.unshift({ ...draft, id: `design-copy-${Date.now()}-${++serial}`, name: `${draft.name} · 副本` })
  feedback.value = '已复制为新的原型示例。'
}
function removeDraft(id: string) { drafts.value = drafts.value.filter(d => d.id !== id); feedback.value = '已删除该原型示例。' }
const selectedModule = ref('datasets')
function navigateModule(key: string) {
  if (key === 'sql') return openEditor('sql')
  if (key === 'model') return openEditor('model')
  selectedModule.value = key
}
</script>

<template>
  <main class="dataset-workspace" data-testid="dataset-management">
    <aside class="use-sidebar" aria-label="用数导航">
      <div class="workspace-label">DATA WORKSPACE</div>
      <div class="workspace-brand"><span class="workspace-brand-mark">◈</span><div>数据工作空间<small>连接数据，驱动业务</small></div></div>
      <nav>
        <button :class="{ active: selectedModule === 'connections' }" @click="navigateModule('connections')"><span>⌁</span>数据连接</button>
        <div class="sidebar-group"><span>▤</span>数据准备<span class="group-chevron">⌃</span></div>
        <button class="nav-child" :class="{ active: selectedModule === 'datasets' }" @click="navigateModule('datasets')"><i></i>数据集管理</button>
        <button class="nav-child" @click="navigateModule('sql')"><i></i>SQL 编辑器</button>
        <button class="nav-child" @click="navigateModule('model')"><i></i>可视化建模</button>
        <button :class="{ active: selectedModule === 'analysis' }" @click="navigateModule('analysis')"><span>◷</span>自助分析</button>
        <button :class="{ active: selectedModule === 'boards' }" @click="navigateModule('boards')"><span>▥</span>看板管理</button>
      </nav>
      <div class="workspace-side-note"><span>✧</span><strong>让每一份数据<br>都成为业务洞察</strong><p>从数据准备，到价值发现。</p><router-link to="/portal/search">去发现数据 <span>↗</span></router-link></div>
      <div class="sidebar-footer"><i></i>企业数据空间</div>
    </aside>

    <section class="workspace-content">
      <template v-if="selectedModule !== 'datasets'">
        <div class="workspace-page-heading"><div><p>用数 / 数据工作空间</p><h1>{{ { connections: '数据连接', analysis: '自助分析', boards: '看板管理' }[selectedModule] }}</h1></div></div>
        <div class="workspace-empty"><PortalProductIcon type="view" :size="60"/><h3>本轮先展示数据集管理的设计</h3><p>该模块入口已保留，页面设计待后续展开。</p><button class="workspace-primary" @click="selectedModule = 'datasets'">返回数据集管理</button></div>
      </template>
      <template v-else>
        <header class="workspace-page-heading"><div><p>用数 <span>/</span> 数据准备</p><h1>数据集管理<span class="workspace-heading-dot"></span></h1><span class="heading-description">在一个工作空间，管理、探索并使用你的数据。</span></div><button class="workspace-primary" @click="openEditor()"><span>＋</span>新建数据集</button></header>

        <section class="public-datasets" aria-label="公开数据集">
          <div class="workspace-section-title"><h2>公开数据集<span class="public-free">免费探索</span></h2><span>精选行业数据，快速开启分析</span></div>
          <div class="public-category-grid">
            <button v-for="family in families" :key="family.name" class="public-category" :data-tone="family.color" :class="{ selected: openFamily === family.name }" :aria-expanded="openFamily === family.name" @click="openFamily = openFamily === family.name ? '' : family.name">
              <div><h3>{{ family.name }}</h3><p>{{ family.caption }}</p><span class="category-count">{{ familyProducts(family.name).length ? `${familyProducts(family.name).length} 个数据集` : '暂无数据集' }} <b>↗</b></span></div>
              <div class="category-art" aria-hidden="true"><span class="art-top"></span><span class="art-front">{{ family.symbol }}</span><span class="art-side"></span><span class="art-pedestal"></span><i></i></div>
            </button>
          </div>
          <div v-if="openFamily" class="public-category-panel"><div class="category-panel-title"><strong>{{ openFamily }}</strong><button aria-label="关闭公开数据集分类" @click="openFamily = ''">×</button></div><div v-if="familyProducts(openFamily).length" class="category-dataset-links"><button v-for="product in familyProducts(openFamily)" :key="product.id" @click="router.push(publicDatasetEntry(product, 'portal'))"><PortalProductIcon type="dataset" :size="30"/><span>{{ product.name }}</span><span>查看数据 ↗</span></button></div><p v-else>该分类暂无公开数据集，后续上架后将在这里展示。</p></div>
        </section>

        <section class="my-datasets" aria-label="我的数据集">
          <div class="workspace-section-title"><h2>我的数据集<span class="dataset-total">{{ visibleCount }}</span></h2><span class="workspace-sample-label">SQL 查询与建模卡片为原型示例</span></div>
          <div class="dataset-toolbar">
            <div class="dataset-tabs" role="tablist" aria-label="我的数据集分类"><button v-for="tab in tabs" :key="tab.key" role="tab" :data-tab="tab.key" :aria-selected="activeTab === tab.key" :class="{ active: activeTab === tab.key }" @click="emit('selectTab',tab.key)">{{ tab.label }}</button></div>
            <div class="dataset-tools"><label class="dataset-search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg><input :value="keyword" aria-label="数据集名称" placeholder="搜索数据集" @input="emit('update:keyword', ($event.target as HTMLInputElement).value)"></label><select :value="sort" aria-label="排序" @change="emit('update:sort', ($event.target as HTMLSelectElement).value)"><option value="updated">最近更新</option><option value="name">按名称</option></select></div>
          </div>
          <div v-if="feedback" role="status" class="workspace-feedback">{{ feedback }}<button aria-label="关闭提示" @click="feedback = ''">×</button></div>
          <p v-if="targetUnavailable" role="status" class="workspace-feedback">目标数据集暂不可用或当前企业无使用权益。</p>
          <div v-if="visibleCount" class="workspace-dataset-grid">
            <article v-for="product in datasets" :key="product.id" :data-product="product.id" data-testid="purchased-dataset" :aria-current="route.query.product === product.id ? 'true' : undefined" class="workspace-dataset-card purchased-card">
              <div class="dataset-card-heading"><PortalProductIcon type="dataset" :size="42"/><h3>{{ product.name }}</h3></div>
              <div class="dataset-card-tags"><span class="tag-purchased">已购</span><span>数据集</span></div><p class="dataset-description">{{ product.description || product.subtitle }}</p>
              <div class="dataset-card-meta">数据更新时间 {{ product.typeDetail.dataset?.dataUpdatedAt?.replace('T',' ').slice(0,16) || '未返回' }}</div>
              <div class="dataset-card-bottom"><span class="dataset-ready"><i></i>可使用</span><button @click="emit('openDataset',product.id)">查看数据 <span>↗</span></button></div>
            </article>
            <article v-for="draft in shownDrafts" :key="draft.id" class="workspace-dataset-card" data-testid="workspace-example">
              <div class="dataset-card-heading"><PortalProductIcon :type="draft.kind === 'sql' ? 'api' : 'dashboard'" :size="42"/><h3>{{ draft.name }}</h3></div>
              <div class="dataset-card-tags"><span :class="draft.kind === 'sql' ? 'tag-sql' : 'tag-model'">{{ draft.kind === 'sql' ? 'SQL 查询' : '可视化建模' }}</span><span>示例</span></div><p class="dataset-description">{{ draft.description }}</p>
              <div class="dataset-card-meta">更新时间 {{ draft.updated }}</div>
              <div class="dataset-card-bottom"><span class="dataset-draft-label">工作区示例</span><div class="draft-actions"><button @click="openEditor(draft.kind,draft)">编辑</button><button @click="copyDraft(draft)">复制</button><button class="draft-delete" @click="removeDraft(draft.id)">删除</button></div></div>
            </article>
          </div>
          <div v-else class="workspace-empty"><PortalProductIcon type="dataset" :size="56"/><h3>{{ keyword.trim() ? '没有找到匹配的数据集' : emptyMessage }}</h3><p>{{ keyword.trim() ? '尝试调整关键词，或切换数据集分类。' : '你可以创建 SQL 查询、可视化建模，或前往数据市场获取数据。' }}</p><button v-if="keyword.trim()" class="workspace-secondary" @click="emit('update:keyword','')">清空搜索</button><router-link v-else class="workspace-secondary" to="/portal/search">前往找数买数 ↗</router-link></div>
          <div class="dataset-list-end">{{ visibleCount ? '已展示全部数据集' : '准备好，让数据开始创造价值' }}</div>
        </section>
      </template>
    </section>
    <div v-if="editorOpen" class="workspace-modal-backdrop" @click.self="editorOpen = false" @keydown.esc="editorOpen = false"><section ref="editorDialog" class="workspace-editor" @keydown="trapEditorFocus" role="dialog" aria-modal="true" aria-labelledby="workspace-editor-title"><header><div><p>DATA WORKSPACE</p><h2 id="workspace-editor-title">{{ editingId ? '编辑数据集' : '新建数据集' }}</h2></div><button aria-label="关闭新建数据集" @click="editorOpen = false">×</button></header><form @submit.prevent="saveDraft"><p class="editor-prototype-note">原型演示：仅保存本页示例，不连接或执行真实数据。</p><label>创建方式<select v-model="draftKind"><option value="sql">SQL 查询</option><option value="model">可视化建模</option></select></label><label>数据集名称<input v-model="draftName" required maxlength="60" placeholder="为你的数据集起个名字"></label><label>描述<textarea v-model="draftDescription" rows="2" placeholder="描述数据内容或分析用途"></textarea></label><label v-if="draftKind === 'sql'">SQL 查询<textarea v-model="draftSql" class="sql-draft" rows="5" placeholder="SELECT ..."></textarea></label><div v-else class="model-draft-preview"><span>数据源</span><i>→</i><span>字段选择</span><i>→</i><span>数据集</span></div><footer><button type="button" class="workspace-secondary" @click="editorOpen = false">取消</button><button class="workspace-primary" type="submit">保存示例</button></footer></form></section></div>
  </main>
</template>
