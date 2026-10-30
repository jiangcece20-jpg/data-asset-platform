<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import PrototypeProductCard from './PrototypeProductCard.vue'
import PrototypeProductFlow from './PrototypeProductFlow.vue'
import { prototypeScenes, type ProductPreview } from './prototypeScenes'
import { useDemoConversation, type DemoFrame, type DemoTask } from './demoConversation'

const props = withDefaults(defineProps<{ compact?: boolean; inline?: boolean; initialQuery?: string; initialScene?: string }>(), { compact: false, inline: false, initialQuery: '', initialScene: '' })
const emit = defineEmits<{ back: [] }>()
const demo = useDemoConversation(props.compact ? 'mobile' : 'pc')
const session = computed(() => demo.session)
const last = computed(() => demo.current)
const draft = computed({ get: () => session.value.draft, set: value => { session.value.draft = value } })
const clarification = computed({ get: () => session.value.clarificationDraft, set: value => { session.value.clarificationDraft = value } })
const selectedScene = ref(props.initialScene || 'welcome')
const following = ref(true), hasNewContent = ref(false), deleteTarget = ref(''), feedbackId = ref('')
const scrollArea = ref<HTMLElement>()
const toolsOpen = ref(!!props.initialScene), historyOpen = ref(false), favoritesOpen = ref(false)
const detail = ref<ProductPreview | null>(null), acquisition = ref<ProductPreview | null>(null), flowStart = ref<'details' | 'action'>('details')
const editOpen = ref(false), editId = ref(''), editForm = ref({ year: '', grain: '', frequency: '' })
const feedbackOpen = ref(false), feedbackType = ref(''), feedbackText = ref(''), feedbackDone = ref(false)
const toast = ref('')
const groups = [...new Set(prototypeScenes.map(s => s.group))]
const feedbackTypes = ['推荐不相关', '条件理解错误', '商品信息不准', '实际不可用', '未找到数据']
const examples = [
  { label: '找线路运价', text: '找 2025 年榆林到天津港的煤炭公路运价，按月查看' },
  { label: '一次找多项数据', text: '找煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看' },
  { label: '试试澄清', text: '找 2025 年苹果销量数据' }
]
const activeTasks = computed(() => demo.tasks.filter(t => !t.deferred))
const deferredTasks = computed(() => demo.tasks.filter(t => t.deferred))
const favoriteProducts = computed(() => demo.favoriteProducts)
const confirmationReady = computed(() => !!last.value?.plans.length && last.value.plans.every(p => !!last.value.choices[p.taskId]))
function productState(product: ProductPreview) {
  return { ...product, saved: demo.state.favorites.includes(product.id), ...(demo.state.acquired[product.id] ? { action: demo.state.acquired[product.id], state: demo.state.acquired[product.id] === '查看订单' ? '已支付 · 待开通' : demo.state.acquired[product.id] === '查看申请' ? '申请已提交 · 待处理' : '权益可用' } : {}) }
}
function toggleFavorite(product: ProductPreview) { demo.toggleFavorite(product.id) }
function collectionIds(frame: DemoFrame) {
  return frame.tasks.filter(t => ['部分匹配', '无合适商品'].includes(t.status)).map(t => t.id).filter((id): id is string => !!id)
}
async function scrollBottom() {
  following.value = true; hasNewContent.value = false
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
}
function onScroll() {
  const el = scrollArea.value; if (!el) return
  following.value = el.scrollHeight - el.clientHeight - el.scrollTop < 48
  if (following.value) hasNewContent.value = false
}
async function followContent() {
  if (following.value) await scrollBottom()
  else hasNewContent.value = true
}
async function sendText(text: string, source: 'composer' | 'clarification' | 'external' = 'composer') {
  if (!text.trim() || demo.state.busy) return
  const action = demo.send(text, source)
  if (!session.value.sendError) void scrollBottom()
  await action
}
function onEnter(event: KeyboardEvent, text = draft.value, source: 'composer' | 'clarification' = 'composer') {
  if (event.isComposing || event.keyCode === 229 || props.compact) return
  event.preventDefault(); void sendText(text, source)
}
async function selectScenario() {
  clarification.value = ''; draft.value = ''; toast.value = ''; detail.value = null; acquisition.value = null
  await demo.preset(selectedScene.value)
  if (selectedScene.value === 'edit') startEdit()
  if (selectedScene.value === 'feedback' && last.value) { demo.rate(last.value.id, 'down'); startFeedback(last.value) }
  if (scrollArea.value) scrollArea.value.scrollTop = 0
}
function startEdit(task?: DemoTask) {
  if (demo.state.busy) return
  const target = task || activeTasks.value.find(t => last.value?.taskIds.includes(t.id)) || activeTasks.value[0]
  if (!target) return
  const values = last.value?.kind === 'relax' ? { ...target, ...last.value.proposed[target.id] } : target
  editId.value = target.id; editForm.value = { year: values.year, grain: values.grain, frequency: values.frequency }; editOpen.value = true
}
async function saveEdit() { if (demo.state.busy) return; editOpen.value = false; const action = demo.edit(editId.value, editForm.value); void scrollBottom(); await action }
function choose(taskId: string, value: string) { demo.choose(taskId, value) }
async function confirmChoices() { const action = demo.confirm(); void scrollBottom(); await action }
function changedText(frame: DemoFrame, taskId: string, changes: Partial<DemoTask>) {
  const labels: Record<string, string> = { grain: '查看方式', frequency: '更新频率', year: '年份' }
  return Object.entries(changes).map(([key, value]) => `${labels[key] || key} → ${value}`).join('；')
}
function showDetail(product: ProductPreview) { detail.value = product; acquisition.value = null; flowStart.value = 'details' }
function openAction(product: ProductPreview) {
  if (product.action === '查看详情') { showDetail(product); return }
  acquisition.value = product; detail.value = null; flowStart.value = 'action'
}
function newConversation() { demo.newSession(); selectedScene.value = 'welcome'; historyOpen.value = false; deleteTarget.value = ''; void scrollBottom() }
function activateConversation(id: string) { demo.activate(id); historyOpen.value = false; void scrollBottom() }
function submitFeedback() { demo.feedback(feedbackId.value, feedbackType.value, feedbackText.value); feedbackDone.value = true }
function startFeedback(frame: DemoFrame) {
  feedbackId.value = frame.id; feedbackOpen.value = true; feedbackDone.value = false
  feedbackType.value = frame.feedbackType; feedbackText.value = frame.feedbackText; toast.value = ''
}
function rate(frame: DemoFrame, value: 'up' | 'down') {
  demo.rate(frame.id, value)
  if (value === 'down' && frame.rating === 'down') startFeedback(frame)
}
function confirmDelete() { demo.deleteSession(deleteTarget.value); deleteTarget.value = ''; void scrollBottom() }
function keyboardResize() { if (props.compact) document.activeElement?.scrollIntoView?.({ block: 'nearest' }) }
onMounted(async () => {
  window.visualViewport?.addEventListener('resize', keyboardResize)
  if (props.initialScene) { await selectScenario(); return }
  if (props.initialQuery) await demo.receiveEntry(props.initialQuery)
  void followContent()
})
onUnmounted(() => { window.visualViewport?.removeEventListener('resize', keyboardResize) })
watch(() => props.initialQuery, async (text, previous) => { if (text && text !== previous && !props.initialScene) await demo.receiveEntry(text) })
watch(() => session.value.id, () => { following.value = true; hasNewContent.value = false; void scrollBottom() }, { flush: 'sync' })
watch(() => JSON.stringify(session.value.frames), followContent)
</script>

<template>
  <div class="ai-prototype" :class="{ compact }" data-testid="ai-v104-interactive-prototype">
    <div class="prototype-tools" data-testid="prototype-review-tools">
      <div class="review-title"><span class="review-dot"></span><b>V1.0.4 · 前端交互原型</b><span class="demo-note">示例数据 · 不产生真实交易或提交</span><button type="button" class="text-button" @click="toolsOpen = !toolsOpen">{{ toolsOpen ? '收起工具' : '演示场景' }}</button></div>
      <div v-show="toolsOpen" class="review-options">
        <div class="review-controls"><label for="ai-preview-scene">快速进入</label><select id="ai-preview-scene" v-model="selectedScene" data-testid="prototype-scene-select" :disabled="demo.state.busy" @change="selectScenario"><optgroup v-for="group in groups" :key="group" :label="group"><option v-for="item in prototypeScenes.filter(s => s.group === group)" :key="item.id" :value="item.id">{{ item.label }}</option></optgroup></select></div>
        <div class="review-controls"><label for="demo-next-failure">下次操作</label><select id="demo-next-failure" v-model="demo.state.nextFailure"><option value="">正常完成</option><option value="search">模拟整批搜索未完成</option><option value="judgment">模拟匹配判断失败</option><option value="collection">模拟采数提交失败</option><option value="send">模拟消息发送失败</option></select></div>
        <p v-if="demo.state.storageError" role="alert">{{ demo.state.storageError }}</p><p>可直接输入或点击示例连续体验。固定数据支持煤炭运价、货运路线/货运量、苹果销量、汽车销量等样例；此处用于快速预览和异常演示。刷新恢复使用本浏览器演示快照，不代表真实后台续跑。</p>
      </div>
    </div>
    <section class="chat-surface" :data-scene="selectedScene" data-testid="prototype-user-screen">
      <header class="chat-header">
        <button v-if="compact" type="button" class="back-button" :aria-label="inline ? '返回关键词找数' : '返回找数页'" @click="emit('back')">‹</button>
        <span class="assistant-icon" aria-hidden="true">✦</span><div class="header-copy"><h1>AI找数</h1><p>描述你需要的数据，查找相关商品</p></div>
        <button type="button" class="header-action" aria-label="我的收藏" @click="favoritesOpen = true">☆<span v-if="!compact"> 收藏</span></button>
        <button type="button" class="header-action" aria-label="历史会话" @click="historyOpen = true">◷<span v-if="!compact"> 历史会话</span></button>
        <button type="button" class="header-action" aria-label="新建会话" @click="newConversation">＋<span v-if="!compact"> 新建会话</span></button>
      </header>
      <div ref="scrollArea" class="conversation-scroll" data-testid="prototype-conversation" @scroll="onScroll">
        <div class="conversation-content">
          <div v-if="!session.frames.length" class="welcome-screen"><span class="welcome-mark" aria-hidden="true">✦</span><span class="eyebrow">从一个问题开始</span><h2>你想找什么数据？</h2><p>说出你要找的内容，也可以加上地区、时间等要求。</p><div class="example-grid"><button v-for="example in examples" :key="example.label" type="button" class="example-card" @click="sendText(example.text, 'external')"><span>{{ example.label }} <i>↗</i></span><p>{{ example.text }}</p></button></div></div>
          <article v-for="frame in session.frames" :key="frame.id" class="conversation-turn" :data-turn="frame.id" :data-phase="frame.kind">
            <div v-if="frame.query" class="user-message" data-testid="prototype-user-question">{{ frame.query }}</div>
            <div class="assistant-reply"><div class="reply-label"><span class="tiny-star">✦</span> AI找数助手</div>
              <section v-if="frame.steps?.length" class="processing-steps" data-testid="processing-steps" :role="frame.kind === 'searching' ? 'status' : undefined" :aria-live="frame.kind === 'searching' ? 'polite' : 'off'" aria-label="处理进度">
                <div class="processing-title"><span class="processing-star" aria-hidden="true">✦</span>过程步骤</div>
                <ol>
                  <li v-for="step in frame.steps" :key="step.id" :data-step="step.id" :data-state="step.state" :class="step.state">
                    <span class="step-indicator" aria-hidden="true">{{ step.state === 'done' ? '✓' : step.state === 'failed' ? '!' : step.state === 'active' ? '◌' : step.state === 'waiting' ? '?' : '·' }}</span>
                    <span class="step-label">{{ step.label }}<small v-if="step.detail">{{ step.detail }}</small></span>
                    <span class="step-state">{{ ({ pending: '待处理', active: '进行中', done: '已完成', waiting: '待补充', failed: '未完成', stopped: '已停止' })[step.state] }}</span>
                  </li>
                </ol>
              </section>
              <div v-if="frame.conditions.length" class="condition-block" data-testid="prototype-conditions"><div class="condition-top"><span class="section-kicker">{{ frame === last ? '当前生效条件' : '当时的搜索条件' }}</span><button v-if="frame === last" type="button" :disabled="demo.state.busy" @click="startEdit()">修改条件 ↗</button></div><div class="condition-values"><span v-for="(condition, index) in frame.conditions" :key="index">{{ condition }}</span></div></div>
              <p class="reply-text">{{ frame.message }}</p>

              <div v-if="frame.kind === 'clarify' && frame === last" class="clarification-box"><textarea v-model="clarification" rows="2" placeholder="请输入你的回答" aria-label="澄清回答" @keydown.enter.exact="onEnter($event, clarification, 'clarification')"></textarea><div class="button-row"><button type="button" class="primary" :disabled="!clarification.trim()" @click="sendText(clarification, 'clarification')">发送回答</button><button type="button" class="secondary" @click="demo.defer()">暂缓该需求</button><button type="button" class="text-button" @click="demo.defer(true)">删除该需求</button></div></div>
              <div v-if="frame.kind === 'fallback' && frame === last" class="button-row"><button type="button" class="primary" @click="demo.continueFinding()">找相关商品</button><button type="button" class="secondary" @click="newConversation">暂时不用</button></div>
              <div v-if="frame.kind === 'consult'" class="button-row"><button type="button" class="secondary" @click="showDetail({ id: 'preview-consult', name: '煤炭运输价格监测看板', type: '看板', price: '需询价', description: '具体内容以商品说明为准。', evidence: [], action: '查看详情' })">查看商品详情</button></div>
              <div v-if="frame.tasks.length" class="task-list" data-testid="prototype-task-summary"><article v-for="task in frame.tasks" :key="task.title" class="task-summary"><div><b>{{ task.title }}</b><span class="task-status" :class="{ waiting: task.status.includes('待') || task.status === '部分匹配', absent: task.status === '无合适商品' }">{{ task.status }}</span></div><p>{{ task.detail }}</p></article></div>
              <template v-if="frame.kind === 'relax'">
                <section v-for="plan in frame.plans" :key="plan.taskId" class="plan-panel"><div class="plan-heading"><h3>{{ plan.title }}</h3></div><p class="original-condition">当前要求：{{ plan.original }}</p>
                  <button v-for="(option, index) in plan.options" :key="option.title" type="button" class="plan-option" :class="{ chosen: frame.choices[plan.taskId] === String(index) }" :disabled="frame !== last" :aria-pressed="frame.choices[plan.taskId] === String(index)" :data-choice="`${plan.taskId}:${index}`" @click="choose(plan.taskId, String(index))"><span class="radio-mark" :class="{ checked: frame.choices[plan.taskId] === String(index) }" aria-hidden="true"></span><div><h4>{{ option.title }}</h4><p class="change-text">{{ changedText(frame, plan.taskId, option.changes) }}</p><p class="option-impact">用途影响：{{ option.impact }}</p></div></button>
                  <button type="button" class="plan-option keep-option" :class="{ chosen: frame.choices[plan.taskId] === 'keep' }" :disabled="frame !== last" :aria-pressed="frame.choices[plan.taskId] === 'keep'" :data-choice="`${plan.taskId}:keep`" @click="choose(plan.taskId, 'keep')"><span class="radio-mark" :class="{ checked: frame.choices[plan.taskId] === 'keep' }" aria-hidden="true"></span><div><h4>保留原要求</h4><p class="option-impact">不修改条件，保留采数入口。</p></div></button>
                  <div v-if="frame.proposed[plan.taskId] && frame.choices[plan.taskId] === 'custom'" class="proposal-panel"><span class="pending-label">你提出的组合 · 尚未确认</span><p>{{ frame.proposedText[plan.taskId] }}</p><p class="unverified-note">目前没有已核实符合这一组合的商品，确认后可以继续查找。</p></div>
                </section>
                <div v-if="frame === last" class="confirm-panel"><p v-if="frame.missing.length" class="error-text">请完成以下需求的选择：{{ frame.plans.filter(p => frame.missing.includes(p.taskId)).map(p => p.title).join('、') }}</p><p v-else>{{ confirmationReady ? '各项已选齐，统一确认后才生效。' : '请分别选择，当前生效条件保持不变。' }}</p><button type="button" class="primary" @click="confirmChoices">确认选择并继续</button></div>
                <p v-else class="past-step">本轮决策记录，后续回复已保留处理结果。</p>
              </template>
              <section v-if="frame.purchaseGuide" class="purchase-guide"><h3>怎么买数据</h3><p>{{ frame.purchaseGuide }}</p></section>
              <div v-if="frame.products.length" class="product-list" data-testid="prototype-product-list"><div class="section-kicker">相关数据商品 · 已去重</div><PrototypeProductCard v-for="product in frame.products" :key="product.id" :product="productState(product)" @favorite="toggleFavorite(product)" @details="showDetail(product)" @action="openAction(product)" /></div>
              <div v-if="frame === last && (frame.kind === 'empty' || frame.tasks.some(t => ['部分匹配', '无合适商品'].includes(t.status)))" class="gap-actions"><p>仍不满足？可以修改条件，或提交采数需求。</p><div class="button-row"><button type="button" class="secondary" @click="startEdit()">修改条件</button><button type="button" class="primary" @click="demo.openCollection(collectionIds(frame).length ? collectionIds(frame) : frame.taskIds)">提交采数需求</button></div></div>
              <div v-if="['failure', 'stopped'].includes(frame.kind) && frame === last" class="failure-panel"><span class="failure-icon">!</span><h3>{{ frame.kind === 'stopped' ? '已停止' : '本批未完成' }}</h3><p>当前条件已保留，重新搜索后一起展示本批结果。</p><button type="button" class="primary" @click="demo.retry()">重新搜索</button></div>
              <div v-if="['results', 'empty', 'consult', 'fallback', 'faq'].includes(frame.kind)" class="result-footer">
                <button type="button" class="rating-button" :class="{ selected: frame.rating === 'up' }" :aria-pressed="frame.rating === 'up'" aria-label="点赞此回答" @click="rate(frame, 'up')">♡ 赞</button>
                <button type="button" class="rating-button" :class="{ selected: frame.rating === 'down' }" :aria-pressed="frame.rating === 'down'" aria-label="点踩此回答" @click="rate(frame, 'down')">♧ 踩</button>
                <button v-if="frame.rating === 'down'" type="button" class="text-button" @click="startFeedback(frame)">补充原因</button>
                <template v-if="frame === last && ['results', 'empty'].includes(frame.kind)"><button type="button" class="text-button" :disabled="demo.state.busy" @click="demo.retry()">重新搜索</button><span v-for="task in activeTasks.filter(t => frame.taskIds.includes(t.id) && demo.rollbackPreview(t.id))" :key="task.id" class="rollback-option"><span>{{ task.name }} · {{ demo.rollbackPreview(task.id) }}</span><button type="button" class="text-button" :disabled="demo.state.busy" @click="demo.rollback(task.id)">回到放宽前条件</button></span></template>
              </div>
            </div>
          </article>
          <div v-if="deferredTasks.length" class="deferred-list"><span class="section-kicker">暂缓的需求</span><button v-for="task in deferredTasks" :key="task.id" type="button" class="deferred-chip" @click="sendText(`继续${task.name}`, 'external')">{{ task.name }} · {{ task.year }} <b>继续查找 →</b></button></div>
        </div>
      </div>
      <div v-if="!following" class="latest-bar"><button type="button" @click="scrollBottom">{{ hasNewContent ? '有新内容 · 回到最新消息 ↓' : '回到最新消息 ↓' }}</button></div>
      <div class="composer"><p v-if="session.sendError" class="form-error" role="alert">{{ session.sendError }}</p><form class="composer-box" @submit.prevent="sendText(draft)"><textarea v-model="draft" rows="2" aria-label="描述数据需求" placeholder="描述你需要的数据，或继续补充条件……" @keydown.enter.exact="onEnter"></textarea><div class="composer-bottom"><span>{{ demo.state.busy ? '正在处理，可编辑草稿；停止或完成后再发送' : '查找平台的数据商品' }}</span><button v-if="demo.state.busy" type="button" class="stop-button" aria-label="停止本批处理" @click="demo.stop()">■ 停止</button><button v-else type="submit" aria-label="发送需求" data-testid="chat-send" class="send-button" :disabled="!draft.trim()">↑</button></div></form></div>
    </section>

    <div v-if="deleteTarget || historyOpen || favoritesOpen || detail || acquisition || editOpen || demo.state.collection.open || feedbackOpen" class="demo-overlay" @click.self="deleteTarget = ''; historyOpen = false; favoritesOpen = false; detail = null; acquisition = null; editOpen = false; demo.state.collection.open = false; feedbackOpen = false">
      <section class="demo-dialog" role="dialog" aria-modal="true" :aria-label="deleteTarget ? '删除会话' : historyOpen ? '历史会话' : favoritesOpen ? '我的收藏' : detail ? '商品详情' : acquisition ? '商品获取' : editOpen ? '修改条件' : feedbackOpen ? '反馈问题' : '采数需求'">
        <div class="dialog-heading"><h2>{{ deleteTarget ? '删除会话' : historyOpen ? '历史会话' : favoritesOpen ? '我的收藏' : detail ? '商品详情' : acquisition ? '商品获取' : editOpen ? '修改条件' : feedbackOpen ? '反馈问题' : '采数需求' }}</h2><button type="button" aria-label="关闭弹窗" @click="deleteTarget = ''; historyOpen = false; favoritesOpen = false; detail = null; acquisition = null; editOpen = false; demo.state.collection.open = false; feedbackOpen = false">×</button></div>
        <template v-if="deleteTarget"><div class="delete-confirm"><h3>删除这个会话？</h3><p>聊天记录和未发送草稿将一并移除。</p><p v-if="demo.state.sessions.find(s => s.id === deleteTarget)?.run" class="form-error">删除后将停止本会话的处理。</p><p>商品收藏及已提交的采数、购买或试用申请继续保留。</p><div class="button-row"><button type="button" class="primary danger" data-testid="confirm-delete-session" @click="confirmDelete">确认删除</button><button type="button" class="secondary" @click="deleteTarget = ''">取消</button></div></div></template>
        <template v-else-if="historyOpen"><div v-for="item in demo.state.sessions" :key="item.id" class="history-row"><button type="button" class="history-item" :data-session="item.id" @click="activateConversation(item.id)"><b>{{ item.title }}</b><small>{{ demo.status(item) }} · {{ item.id === session.id ? '当前会话' : '查看会话' }}</small></button><button type="button" class="delete-session" :data-delete-session="item.id" :aria-label="`删除会话：${item.title}`" @click="deleteTarget = item.id">删除</button></div></template>
        <template v-else-if="favoritesOpen"><p v-if="!favoriteProducts.length" class="reply-text">还没有收藏商品。</p><PrototypeProductCard v-for="product in favoriteProducts" :key="product.id" :product="productState(product)" @favorite="toggleFavorite(product)" @details="favoritesOpen = false; showDetail(product)" @action="favoritesOpen = false; openAction(product)" /></template>
        <PrototypeProductFlow v-else-if="detail || acquisition" :key="`${(detail || acquisition)!.id}:${flowStart}`" :product="productState((detail || acquisition)!)" :start="flowStart" @favorite="toggleFavorite((detail || acquisition)!)" @acquired="value => { demo.state.acquired[(detail || acquisition)!.id] = value }" @close="detail = null; acquisition = null" />
        <form v-else-if="editOpen" class="edit-panel" @submit.prevent="saveEdit"><label>选择需求<select v-model="editId" @change="startEdit(demo.tasks.find(t => t.id === editId))"><option v-for="task in activeTasks" :key="task.id" :value="task.id">{{ task.name }}</option></select></label><label>年份<input v-model="editForm.year" placeholder="例如：2024 年" /></label><label>查看方式<select v-model="editForm.grain"><option value="">未限定</option><option>按月查看</option><option>按天查看</option><option>按地市查看</option><option>按区县查看</option><option>按港口筛选</option></select></label><label>更新频率<select v-model="editForm.frequency"><option value="">未限定</option><option>每天更新</option><option>每周更新</option></select></label><div class="button-row"><button type="submit" class="primary">{{ last?.kind === 'relax' ? '保存待确认修改' : '保存并重新查找' }}</button><button type="button" class="secondary" @click="editOpen = false">取消</button></div></form>
        <form v-else-if="feedbackOpen" class="feedback-panel" @submit.prevent="submitFeedback"><div v-if="feedbackDone" class="success-panel"><span>✓</span><h3>反馈已记录</h3><button type="button" class="secondary" @click="feedbackOpen = false">返回</button></div><template v-else><p class="form-hint">点踩已记录，原因与说明均可选填。</p><div class="feedback-types"><button v-for="type in feedbackTypes" :key="type" type="button" :class="{ chosen: feedbackType === type }" @click="feedbackType = feedbackType === type ? '' : type">{{ type }}</button></div><textarea v-model="feedbackText" rows="3" placeholder="补充问题说明（选填）" aria-label="反馈说明"></textarea><div class="button-row"><button type="submit" class="primary">保存补充</button><button type="button" class="secondary" @click="feedbackOpen = false">暂不补充</button></div></template></form>
        <form v-else-if="demo.state.collection.open" class="collection-panel" @submit.prevent="demo.submitCollection()"><div v-if="demo.state.collection.success" class="success-panel"><span>✓</span><h3>采数需求已提交</h3><p>{{ demo.state.collection.name }} · {{ demo.state.collection.contact }}</p><button type="button" class="secondary" @click="demo.state.collection.open = false">完成</button></div><template v-else><h3>请核对采数需求</h3><dl><dt>数据目标与要求</dt><dd v-for="condition in demo.state.collection.conditions" :key="condition">{{ condition }}</dd><dt>已知缺口</dt><dd>{{ demo.state.collection.gaps.join('；') || '本次未找到符合当前要求的商品' }}</dd><dt>待核实信息</dt><dd>{{ demo.state.collection.unknown.join('；') || '暂无' }}</dd></dl><div class="form-divider"></div><label>期望价格区间（元）<span class="optional">选填</span><input v-model="demo.state.collection.price" placeholder="例如：0-5000" /></label><label>联系人<input v-model="demo.state.collection.name" placeholder="请输入联系人姓名" /></label><label>联系方式<input v-model="demo.state.collection.contact" placeholder="请输入手机号或邮箱" /></label><p v-if="demo.state.collection.error" class="form-error" role="alert">{{ demo.state.collection.error }}</p><div class="button-row"><button type="submit" class="primary">确认提交</button><button type="button" class="secondary" @click="demo.state.collection.open = false">取消</button></div></template></form>
        <p v-if="toast" class="form-hint" role="status">{{ toast }}</p>
      </section>
    </div>
  </div>
</template>
<style scoped src="./prototype.css"></style>
