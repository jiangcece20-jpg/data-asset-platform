import { reactive, watch } from 'vue'
import { isConditionChange, parseConditionChanges } from './conditionChanges'
import { board, coal, prototypeScenes, route, shared, type ProductPreview } from './prototypeScenes'

export interface DemoTask {
  id: string; name: string; topic: string; raw: string; year: string; grain: string; frequency: string
  note: string; blocked: string; unknown: boolean; preference: boolean
  regionCoverageUnknown?: boolean; standardUnknown?: boolean; routeCoverageUnknown?: boolean; region?: string; productType?: string; budget?: string
  edits: Record<string, number>
}
export interface DemoPlan {
  taskId: string; title: string; original: string
  options: { title: string; changes: Partial<DemoTask>; impact: string; basis?: string }[]
}
export interface DemoClarification {
  mode: 'single' | 'multiple' | 'text'; question: string
  options: { value: string; label: string }[]; selected: string[]; text: string; submitted: boolean
}
export interface DemoStep {
  id: string; label: string; detail?: string
  state: 'pending' | 'active' | 'done' | 'waiting' | 'failed' | 'stopped'
}
export interface DemoFrame {
  clarification?: DemoClarification; suggestions: DemoPlan[]; consultProduct?: ProductPreview; additionalAnswer?: string; purchaseGuide?: string; rating: '' | 'up' | 'down'; feedbackType: string; feedbackText: string
  id: string; searchedTaskIds?: string[]; steps: DemoStep[]; kind: string; query: string; message: string; conditions: string[]; taskIds: string[]
  products: ProductPreview[]; tasks: { id?: string; title: string; status: string; detail: string }[]
  plans: DemoPlan[]; choices: Record<string, string>; proposed: Record<string, Partial<DemoTask>>; proposedText: Record<string, string>; missing: string[]
}
interface Relaxation { taskId: string; changes: { key: string; before: string; after: string; edit: number }[] }
interface DemoRun { id: string; frameId: string; tasks: DemoTask[]; searchIds?: string[]; stage: number; dueAt: number; decisionsDone: boolean; failure: string }
export interface DemoSession {
  id: string; title: string; tasks: DemoTask[]; frames: DemoFrame[]; relaxations: Relaxation[]; pending: string[]
  suggestionQuestion?: DemoPlan[];
  conditionQuestion?: { changes: Partial<DemoTask>; query: string };
  decidedTaskIds?: string[];
  decisionDraft?: Pick<DemoFrame, 'plans' | 'choices' | 'proposed' | 'proposedText'>; collectionDrafts?: Record<string, {price: string; name: string; contact: string; description?: string}>;
  purchaseRulesKnown?: boolean; purchaseQuestion?: boolean; facts?: Record<string, ProductPreview[]>; draft: string; clarificationDraft: string; sendError: string; run: DemoRun | null; decisionsDone: boolean
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

interface DemoOptions {
  purchaseRulesAvailable?: boolean; storage?: Pick<Storage, 'getItem' | 'setItem'>; storageKey?: string; stepMs?: number; now?: () => number
}

/** 仅将预设样例串成前端演示；浏览器快照/阶段时间只用于模拟恢复，不连接真实后台任务。 */
export function createDemoConversation(pause: () => Promise<void> = () => Promise.resolve(), options: DemoOptions = {}) {
  let serial = 0
  let accountContact = {name:'王涛',contact:''}
  function setCollectionContact(profile: {name: string; phone?: string}) {
    accountContact = {name:profile.name || '',contact: /^\+?[\d\s-]{7,20}$/.test(profile.phone || '') ? profile.phone! : ''}
  }
  const now = options.now || (() => Date.now()), stepMs = options.stepMs || 0
  const uid = () => `demo-${++serial}`
  const freshSession = (): DemoSession => ({ id: uid(), title: '新会话', tasks: [], frames: [], relaxations: [], pending: [], facts: {}, draft: '', clarificationDraft: '', sendError: '', run: null, decisionsDone: false })
  const first = freshSession()
  const state = reactive({
    sessions: [first], activeId: first.id, favorites: [] as string[], acquired: {} as Record<string, string>,
    get busy(): boolean { return !!state.sessions.find(s => s.id === state.activeId)?.run },
    nextFailure: '' as '' | 'search' | 'judgment' | 'collection' | 'send',
    catalog: {} as Record<string, ProductPreview>, storageError: '', entryQuery: '',
    collection: { taskIds: [] as string[], key: '', ownerId: '', searchFinding: '', open: false, description: '', price: '', name: '王涛', contact: '', error: '', success: false, conditions: [] as string[], gaps: [] as string[], unknown: [] as string[] }
  })
  const session = () => state.sessions.find(s => s.id === state.activeId)!
  const current = () => session().frames.at(-1)!
  const taskConditions = (tasks: DemoTask[]) => tasks.map(t => [t.name, t.region && !t.name.includes(t.region.replace(/省$/, '')) ? t.region : '', t.year, t.grain, t.frequency, t.productType ? `仅 ${t.productType}（必须）` : '', t.budget, ...['矿区内部专用线路', '专用线路', '逐车运价', '逐车明细'].filter(value => t.raw.includes(value) && !(value === '专用线路' && t.raw.includes('矿区内部专用线路'))), t.note].filter(Boolean).join(' · '))
  function append(query: string, kind = 'notice', message = '', ids = session().pending) {
    const frame: DemoFrame = { id: uid(), steps: [], rating: '', feedbackType: '', feedbackText: '', kind, query, message, conditions: taskConditions(session().tasks.filter(t => ids.includes(t.id))), taskIds: [...ids], products: [], tasks: [], suggestions: [], plans: [], choices: {}, proposed: {}, proposedText: {}, missing: [] }
    session().frames.push(frame)
    if (query && session().title === '新会话') session().title = query.slice(0, 30)
    return current()
  }
  function parse(text: string): DemoTask[] {
    const targets = [
      { topic: 'coal', test: /煤炭|运价/, name: '煤炭公路运价' },
      { topic: 'route', test: /货运路线|货运线路/, name: /山东/.test(text) ? '山东货运路线' : '货运路线' },
      { topic: 'volume', test: /货运量/, name: /山东/.test(text) ? '山东货运量' : '货运量' },
      { topic: 'apple', test: /苹果/, name: /水果/.test(text) ? '水果苹果销量' : /品牌|手机/.test(text) ? '苹果品牌产品销量' : '苹果销量' },
      { topic: 'vehicle', test: /汽车|乘用车|公司销售量/, name: /公司销售量/.test(text) ? '公司口径销售量' : /新能源/.test(text) ? '新能源汽车销量' : /乘用车/.test(text) ? '乘用车销量' : '汽车销量' }
    ].filter(t => t.test.test(text))
    if (!targets.length) targets.push({ topic: 'generic', test: /./, name: text.replace(/^(帮我)?找(一下|一些)?/, '').trim() || '数据需求' })
    return targets.map(target => {
      const clause = text.split(/[；;]|再找|另外找/).find(part => target.test.test(part)) || text
      const year = clause.match(/20\d{2}/)?.[0]
      let grain = target.topic === 'volume' ? (/区县/.test(clause) ? '按区县查看' : /地市/.test(clause) ? '按地市查看' : '')
        : target.topic === 'route' ? (/港口筛选/.test(clause) ? '按港口筛选' : /按地市/.test(clause) ? '按地市查看' : /按月/.test(clause) ? '按月查看' : '')
        : /按天|逐日/.test(clause) ? '按天查看' : /按月/.test(clause) ? '按月查看' : ''
      const blocked = target.topic === 'apple' && !/水果|品牌|手机/.test(clause) ? '含义'
        : /必须.*公司.*(?:华东|业务区)/.test(clause) ? '地区口径'
        : /(?:必须.*(?:口径一致|现有报表)|公司.*(?:销售量|统计).*口径一致)/.test(clause) ? '口径'
        : /质量必须|必须.*质量.*达标/.test(clause) ? '质量'
        : target.topic === 'generic' && /^(数据需求|数据|一些数据)$/.test(target.name) ? '目标' : ''
      return { id: uid(), name: target.name, topic: target.topic, raw: clause, region: /全国/.test(clause) && (targets.length === 1 || /都|均/.test(clause) || new RegExp(`全国(?:的)?${target.name}`).test(clause)) ? '全国' : target.topic === 'coal' && /榆林.*天津港/.test(clause) ? '榆林 → 天津港' : ['route', 'volume'].includes(target.topic) && /山东/.test(clause) ? '山东省' : '', year: year ? `${year} 年` : /今天/.test(clause) ? '今天' : '', grain,
        productType: /(?:只要|仅)\s*API/i.test(clause) ? 'API' : /(?:只要|仅)\s*看板/.test(clause) ? '看板' : /(?:只要|仅)\s*数据集/.test(clause) ? '数据集' : '',
        budget: clause.match(/(?:单商品|单个商品|总)?预算\s*\d+(?:\.\d+)?\s*(?:万|元)?(?:[\/／]年|每年)?/)?.[0] || '',
        frequency: /每天更新|每日更新/.test(clause) ? '每天更新' : /每周更新/.test(clause) ? '每周更新' : '',
        note: /质量好一点/.test(clause) ? '质量好一点（质量标准尚未明确）' : '',
        routeCoverageUnknown: /(?:仅列|只列).*出发地.*目的地/.test(clause), blocked, unknown: /待核实|没写|资料未/.test(clause), preference: /最好.*每天/.test(clause), edits: {} }
    })
  }
  function referencedTasks(text: string, tasks: DemoTask[]) {
    const topics: Record<string, RegExp> = { coal: /煤炭|运价/, route: /货运路线|货运线路/, volume: /货运量/, apple: /苹果/, vehicle: /汽车|乘用车/ }
    return tasks.filter(t => text.includes(t.name) || topics[t.topic]?.test(text))
  }
  const clarification = (task: DemoTask) => task.blocked === '含义' ? '你说的“苹果”是水果，还是苹果品牌的产品？'
    : task.blocked === '口径' ? '你们公司的销售量统计口径是什么？'
    : task.blocked === '地区口径' ? '你们公司的华东业务区包含哪些地区？'
    : task.blocked === '质量' ? '你对数据质量的最低要求是什么？' : '你想找哪方面的数据？'
  function setClarification(frame: DemoFrame, task?: DemoTask) {
    frame.clarification = { question: frame.message, mode: task?.blocked === '含义' ? 'single' : task?.blocked === '地区口径' || frame.kind === 'clarify-edit' ? 'multiple' : 'text',
      options: task?.blocked === '含义' ? [{value:'fruit', label:'水果苹果销量'}, {value:'brand', label:'苹果品牌产品销量'}]
        : task?.blocked === '地区口径' ? ['上海','江苏','浙江','安徽','福建','江西','山东'].map(label => ({value:label,label}))
        : frame.kind === 'clarify-edit' && session().conditionQuestion ? session().tasks.filter(t=>session().pending.includes(t.id)).map(t=>({value:t.id,label:[t.name,t.year].filter(Boolean).join(' · ')})) : [],
      selected: [], text: '', submitted: false }
    if (!frame.clarification.options.length) frame.clarification.mode = 'text'
    return frame
  }
  function askScope(query: string, message: string) { return setClarification(append(query, 'clarify-edit', message)) }
  function selectClarification(value: string) {
    const q = current()?.clarification
    if (state.busy || !q || q.submitted || !q.options.some(o=>o.value === value)) return
    q.selected = q.mode === 'single' ? [value] : q.selected.includes(value) ? q.selected.filter(v=>v!==value) : [...q.selected,value]
  }
  async function submitClarification() {
    const q = current()?.clarification
    if (state.busy || !q || q.submitted) return false
    const selected = q.options.filter(o=>q.selected.includes(o.value)).map(o=>o.label).join('、')
    if (!selected && !q.text.trim()) return false
    return (await send([selected, q.text.trim()].filter(Boolean).join('；'), 'clarification', { targetIds: [...q.selected], text: q.text })) !== false
  }
  function planFor(task: DemoTask): DemoPlan | null {
    if (task.unknown || task.preference || task.routeCoverageUnknown || task.standardUnknown || task.regionCoverageUnknown) return null
    let options: DemoPlan['options'] = []
    if (task.topic === 'coal' && (task.grain === '按天查看' || task.frequency === '每天更新')) {
      options = [{ title: '调整查看方式与更新频率', changes: {
        ...(task.grain === '按天查看' ? { grain: '按月查看' } : {}), ...(task.frequency === '每天更新' ? { frequency: '每周更新' } : {})
      }, impact: '无法查看逐日变化或每天获得最新数据，请确认是否适合你的用途。' }]
    }
    if (task.topic === 'route' && task.grain === '按港口筛选') options = [{ title: '按地市筛选', changes: { grain: '按地市查看' }, impact: '不能定位到具体港口。' }]
    if (task.topic === 'volume' && task.grain === '按区县查看') options = [{ title: '按地市查看', changes: { grain: '按地市查看' }, impact: '不能比较区县层面的差异。' }]
    options = options.map(option => ({ ...option, basis: task.topic === 'coal' ? '商品资料说明：煤炭公路运价明细数据集支持按月查看、每周更新；其他要求仍需按本轮条件核对。' : '已核验的商品资料：支持按地市查看，不支持原要求的细分维度。' }))
    return options.length ? { taskId: task.id, title: task.name, original: taskConditions([task])[0], options } : null
  }
  function productFor(task: DemoTask): ProductPreview[] {
    if (task.topic === 'generic' || task.year === '今天') return []
    if (task.topic === 'coal' && task.grain && !['按天查看','按月查看'].includes(task.grain)) return []
    if (task.topic === 'coal' && /北京|上海|广州|青岛|深圳|矿区|逐车|专用线路/.test(task.raw)) return []
    if (task.topic === 'coal' && !task.unknown && !task.preference && (task.grain === '按天查看' || task.frequency === '每天更新')) return []
    let product: ProductPreview
    if (task.topic === 'coal') {
      product = clone(task.unknown ? board : coal)
      product.best = !task.unknown && !task.preference
      product.description = '查看煤炭公路运价与对应线路信息。'
      product.evidence = product.evidence.filter(e => !['时间范围', '查看方式'].includes(e.label))
      if (task.year) product.evidence.push({ label: '时间范围', fact: `覆盖 ${task.year}`, state: 'met' })
      if (task.grain) product.evidence.push({ label: '查看方式', fact: task.unknown ? `资料未说明是否支持${task.grain}` : `支持${task.grain}`, state: task.unknown ? 'unknown' : 'met' })
      if (task.frequency) product.evidence.push({ label: '更新频率', fact: task.preference ? '每周更新' : task.frequency, state: task.preference ? 'partial' : 'met' })
    } else if (task.topic === 'route' || task.topic === 'volume') {
      if (task.grain === '按港口筛选' || task.grain === '按区县查看') return []
      product = clone(route)
      product.id = `preview-${task.topic}`
      product.name = task.topic === 'volume' ? '山东货运量数据集' : route.name
      product.description = `提供${task.name}相关信息。`
      product.evidence = [{ label: '数据内容', fact: `包含${task.name}`, state: 'met' }]
      if (task.grain) product.evidence.push({ label: '查看方式', fact: `支持${task.grain}`, state: 'met' })
      if (task.year) product.evidence.push({ label: '时间范围', fact: `覆盖 ${task.year}`, state: 'met' })
    } else {
      product = { id: `preview-${task.topic}`, name: `${task.name}数据集`, type: '数据集', price: '¥2,400／年', description: `提供${task.name}及相关明细。`, action: '立即购买', evidence: [{ label: '数据内容', fact: `包含${task.name}`, state: 'met' }] }
      if (task.year) product.evidence.push({ label: '时间范围', fact: `覆盖 ${task.year}`, state: 'met' })

    }
    if (task.regionCoverageUnknown) { product.evidence.push({label:'地区范围',fact:`是否完整覆盖${task.region}，商品资料待核实`,state:'unknown'}); product.best = false }
    if (task.standardUnknown) { product.evidence.push({label:'用户统计口径',fact:'是否满足你补充的统计口径，商品资料待核实',state:'unknown'}); product.best = false }
    if (task.routeCoverageUnknown) {
      product.evidence = product.evidence.filter(e => e.label !== '线路方向')
      product.description = '商品资料列有出发地、目的地和运价字段，指定路线覆盖仍待核实。'
      product.evidence.push({ label: '线路方向', fact: '是否包含榆林至天津港的煤炭公路运价，资料未说明', state: 'unknown' })
      product.best = false
    }
    if (task.region === '全国') product.evidence.push({ label: '地区范围', fact: '覆盖全国', state: 'met' })
    if (task.note) product.best = false
    if (task.productType && product.type !== task.productType) {
      if (task.topic !== 'coal') return []
      if (task.productType === 'API') product = { ...product, id: 'preview-coal-api', type: 'API', name: '煤炭线路运价查询 API', price: '¥0.20／次', action: '提交试用申请' }
      else if (task.productType === '看板') product = { ...product, id: 'preview-coal-board', type: '看板', name: '煤炭运输价格监测看板', price: '¥1,800／年' }
      else return []
    }
    if (task.budget) {
      const amount = task.budget.match(/\d+(?:\.\d+)?/)?.[0]
      const budget = Number(amount) * (task.budget.includes('万') ? 10000 : 1)
      if (/[\/／]年|每年/.test(task.budget) && /[\/／]年/.test(product.price) && !task.budget.includes('总预算')) {
        const price = Number(product.price.replace(/[^\d.]/g, ''))
        product.budget = price <= budget ? '预算内' : '超预算'; product.budgetTone = price <= budget ? 'ok' : 'over'
      } else { product.budget = '计价口径不同，暂无法判断'; product.budgetTone = 'unknown' }
    }
    product.coverage = [task.name]
    return [product]
  }
  const purchaseGuide = (owner = session()) => options.purchaseRulesAvailable === false || owner.purchaseRulesKnown === false
    ? '暂时无法确认平台的通用购买规则，请先在具体商品详情中查看当前可用的获取入口；不会为你创建订单。'
    : '先查看商品详情，核对价格、购买主体、计价周期和权益。按商品当前主按钮进入购买确认、继续支付或试用申请；已有可用权益时可立即使用。不同商品获取方式以详情页为准，询问购买方式不会创建订单。'
  function publish(frame: DemoFrame, tasks: DemoTask[], owner = session()) {
    owner.decisionDraft = undefined
    owner.suggestionQuestion = undefined
    const products = (task: DemoTask) => clone(owner.facts?.[task.id] ?? productFor(task))
    frame.suggestions = tasks.filter(t => !products(t).length && !/矿区|逐车|专用线路/.test(t.raw)).map(t => planFor(t)).filter((p): p is DemoPlan => !!p)
    frame.kind = 'results'
    frame.purchaseGuide = owner.purchaseQuestion ? purchaseGuide(owner) : undefined
    frame.products = tasks.flatMap(products)
    const byId = new Map<string, ProductPreview>()
    for (const p of frame.products) {
      const existing = byId.get(p.id)
      if (existing) {
        const scope = (product: ProductPreview) => [product.coverage?.join('、'), product.evidence.find(e => e.label === '时间范围')?.fact].filter(Boolean).join(' · ')
        existing.evidence = [...existing.evidence.map(e => ({ ...e, demand: e.demand || scope(existing) })), ...p.evidence.map(e => ({ ...e, demand: scope(p) }))]
        existing.coverage = [...new Set([...(existing.coverage || []), ...(p.coverage || [])])]
      }
      else byId.set(p.id, p)
    }
    frame.products = [...byId.values()]
    if (tasks.length > 1) frame.products.forEach(p => { p.best = false })
    frame.tasks = tasks.map(t => ({ id: t.id, title: t.name, status: products(t).length ? t.note && !t.standardUnknown ? '找到相关商品' : t.unknown || t.preference || t.routeCoverageUnknown || t.standardUnknown || t.regionCoverageUnknown ? '部分匹配' : '有合适商品' : '无合适商品', detail: products(t).length ? t.note && !t.standardUnknown ? '已明确条件见商品证据；补充要求的具体标准尚未明确，不据此判断已满足。' : t.unknown || t.routeCoverageUnknown || t.standardUnknown || t.regionCoverageUnknown ? '相关商品资料未写明支持情况，请核实标记的信息。' : t.preference ? '必须条件满足，更新偏好有缺口。' : '请查看下方商品的匹配说明及需留意的信息。' : '保留当前要求，可修改条件或提交采数需求。' }))
    frame.message = frame.products.length ? '本批需求已全部完成，以下一起展示结果。' : frame.suggestions.length ? '本次搜索未找到符合当前要求的商品。以下提供有商品资料依据的条件调整建议，当前要求保持不变。' : '本次搜索未找到符合当前要求的商品，暂时没有可靠的条件调整建议。'
    if (!frame.products.length) frame.kind = 'empty'
    frame.products.forEach(p => { state.catalog[p.id] = clone(p) })
  }
  function stop(ownerId = state.activeId) {
    const owner = state.sessions.find(s => s.id === ownerId)
    if (!owner?.run) return
    const frame = owner.frames.find(f => f.id === owner.run!.frameId)
    owner.run = null
    if (frame) {
      frame.steps.filter(step => step.state === 'active').forEach(step => { step.state = 'stopped'; step.detail = '已停止' })
      frame.kind = 'stopped'; frame.message = '已停止本批处理，条件已保留。你可以重新搜索或修改条件。'
      frame.products = []; frame.tasks = []
    }
  }
  async function drive(ownerId: string, runId: string) {
    while (true) {
      const owner = state.sessions.find(s => s.id === ownerId), run = owner?.run
      if (!owner || !run || run.id !== runId) return
      if (stepMs === 0 || now() < run.dueAt) {
        await pause()
        if (owner.run?.id !== runId || !state.sessions.some(s => s.id === ownerId)) return
        if (stepMs && now() < run.dueAt) continue
      }
      const f = owner.frames.find(f => f.id === run.frameId)!
      const stage = run.stage
      if ((stage === 2 && run.failure === 'search') || (stage === 3 && run.failure === 'judgment')) {
        f.steps[stage].state = 'failed'
        f.steps[stage].detail = stage === 2 ? '本批检索未能全部完成' : '本批匹配判断未能全部完成'
        f.kind = 'failure'; f.message = stage === 3 ? '本次匹配判断未能全部完成，请重新搜索。当前条件已保留。' : '本次搜索未能全部完成，请重新搜索。当前条件已保留。'
        owner.run = null; return
      }
      f.steps[stage].state = 'done'
      if (stage === 1) f.steps[stage].detail = `${run.tasks.length} 项需求`
      run.stage++; run.dueAt += stepMs
      if (run.stage < f.steps.length) {
        f.steps[run.stage].state = 'active'
        f.message = ['正在整理本批需求……', '正在统一查找相关数据商品……', '正在核对商品证据与匹配条件……'][stage]
        continue
      }
      owner.facts ||= {}
      for (const task of run.tasks.filter(t => (run.searchIds || run.tasks.map(t => t.id)).includes(t.id))) owner.facts[task.id] = clone(productFor(task))
      publish(f, run.tasks, owner)
      owner.run = null; return
    }
  }
  async function search(ids: string[], query = '', decisionsDone = false, searchIds = ids) {
    if (state.busy) return
    const owner = session()
    const activeTasks = owner.tasks.filter(t => ids.includes(t.id))
    if (!activeTasks.length) { owner.pending = []; owner.decisionDraft = undefined; append(query, 'notice', '本轮需求已全部移出，没有发起搜索。', []); return }
    owner.pending = activeTasks.map(t => t.id); owner.decisionsDone = decisionsDone
    for (const id of searchIds) if (owner.facts) delete owner.facts[id]
    const blocked = activeTasks.find(t => t.blocked)
    if (blocked) {
      const f = setClarification(append(query, 'clarify', clarification(blocked)), blocked); f.missing = [blocked.id]
      f.steps = [
        { id: 'parse', label: '解析需求', state: 'done' },
        { id: 'split', label: '拆分多需求', detail: `${activeTasks.length} 项需求`, state: 'done' },
        { id: 'clarify', label: '检查是否需要澄清', detail: '等待你的补充', state: 'waiting' }
      ]
      return
    }
    const f = append(query, 'searching', '正在理解你的数据需求……')
    f.searchedTaskIds = searchIds.filter(id => activeTasks.some(t => t.id === id))
    f.steps = [
      { id: 'parse', label: '解析需求', state: 'active' },
      { id: 'split', label: '拆分多需求', state: 'pending' },
      { id: 'search', label: '统一搜索商品', state: 'pending', detail: f.searchedTaskIds.length < activeTasks.length ? `本批 ${activeTasks.length} 项，仅重搜 ${f.searchedTaskIds.length} 项，其余沿用已有结果` : undefined },
      { id: 'match', label: '证据核对与匹配判断', state: 'pending' }
    ]
    const failure = ['search', 'judgment'].includes(state.nextFailure) ? state.nextFailure : ''
    if (failure) state.nextFailure = ''
    owner.run = { id: uid(), frameId: f.id, tasks: clone(activeTasks), searchIds: [...f.searchedTaskIds], stage: 0, dueAt: now() + stepMs, decisionsDone, failure }
    await drive(owner.id, owner.run.id)
  }
  function answerWithoutSearch(text: string, kind: string, message: string) {
    const pendingQuestion = current()?.clarification && !current().clarification!.submitted ? clone(current()) : null
    const frame = append(text, pendingQuestion?.kind || kind, pendingQuestion?.message || message, pendingQuestion?.taskIds || [])
    if (pendingQuestion) { frame.clarification = pendingQuestion.clarification; frame.missing = pendingQuestion.missing; frame.steps = pendingQuestion.steps; frame.additionalAnswer = message }
    return frame
  }
  function productConsultation(text: string) {
    const history = [...session().frames].reverse().find(f => f.products.length)
    const products = [...new Map([...Object.values(state.catalog),board,coal,route].map(p=>[p.id,p])).values()]
    const identified = products.find(p=>text.includes(p.name)) || (/看板/.test(text) && /煤炭|运输/.test(text) ? board : undefined)
      || (/这个|该商品/.test(text) && history?.products.length === 1 ? history.products[0] : undefined)
    if (!identified) {
      const f = answerWithoutSearch(text,'consult','你想了解哪件商品？请提供商品名称，或从已有结果中说明是哪一件。')
      if (!f.clarification) setClarification(f)
      return
    }
    const requestedText = current()?.kind === 'consult' && current().clarification ? `${current().query}；${text}` : text
    if (current()?.kind === 'consult' && current().clarification) current().clarification!.submitted = true
    const requested = /价格|多少钱/.test(requestedText) ? `该商品标价为 ${identified.price}，以商品详情中的当前价格及计价周期为准。`
      : /更新/.test(requestedText) ? identified.evidence.filter(e=>e.label==='更新频率').map(e=>e.fact).join('；')
      : /线路|地区|覆盖/.test(requestedText) ? identified.evidence.filter(e=>/线路|地区|范围/.test(e.label)).map(e=>e.fact).join('；')
      : identified.description
    const f = answerWithoutSearch(text,'consult',requested || '你询问的信息在现有商品资料中未写明，标为待核实；可以在商品详情进一步确认。')
    f.consultProduct = clone(identified)
  }
  function askSuggestionAcceptance(query: string, suggestions: DemoPlan[]) {
    session().suggestionQuestion = clone(suggestions)
    const f = askScope(query, '你想采用哪项需求的哪种调整？请说明需求与要接受的变化，未提及的要求保持不变。')
    Object.assign(f.clarification!, { mode:'single', options:suggestions.flatMap(p=>p.options.map((option,index)=>({value:`${p.taskId}:${index}`,label:`${p.title}：${Object.values(option.changes).join('、')}`}))) })
  }
  async function acceptSuggestion(plan: DemoPlan, changes: Partial<DemoTask>, query: string) {
    const task = session().tasks.find(t=>t.id === plan.taskId)!
    const accepted = Object.entries(changes).filter(([key,value])=>value !== task[key as keyof DemoTask] && plan.options.some(o=>o.changes[key as keyof DemoTask] === value))
    if (accepted.length) session().relaxations.push({taskId:task.id, changes:accepted.map(([key,value])=>({key,before:String(task[key as keyof DemoTask]||''),after:String(value),edit:(task.edits[key]||0)+1}))})
    session().suggestionQuestion = undefined
    await applyDialogueChanges([task.id],changes,query)
  }
  async function send(raw: string, source: 'composer' | 'clarification' | 'external' = 'composer', answer?: {targetIds: string[]; text: string}) {
    const text = raw.trim(); if (!text || state.busy) return false
    const scopeText = answer?.text ?? text
    const scopeTargets = () => {
      const explicit = /只改|仅改/.test(scopeText) ? scopeText.split(/只改|仅改/).at(-1)! : scopeText
      const named = referencedTasks(explicit,session().tasks.filter(t=>session().pending.includes(t.id)))
      return named.length || /全部|所有|都|两项|三项/.test(scopeText) ? conditionTargets(explicit) : answer?.targetIds.length ? answer.targetIds : conditionTargets(text)
    }
    const asksPurchase = /怎么买|如何购买|购买流程/.test(text)
    if (state.nextFailure === 'send') { state.nextFailure = ''; session().sendError = '消息未能发送，文字已保留，请重试。'; return false }
    session().sendError = ''
    if (source === 'composer') session().draft = ''
    if (source === 'clarification') session().clarificationDraft = ''
    const explicitFind = /(?:帮我|再|另外)?找|查找|搜索.*(?:数据|商品)/.test(text)
    if (/你(?:能|可以)做什么|有什么功能|能帮我什么|能力范围/.test(text)) { answerWithoutSearch(text,'faq','你可以描述需要的数据，我会帮你查找平台相关商品、核对匹配与待核实信息；也可以咨询商品和购买方式。'); return }
    if (asksPurchase && !explicitFind) { const f=answerWithoutSearch(text,'faq','以下是平台数据商品的获取说明。'); f.purchaseGuide=purchaseGuide(); return }
    if (!explicitFind && (/(?:这个|该|商品|看板|数据集|API).*(?:包含|线路|多少钱|价格|更新|介绍|内容)/.test(text) || Object.values(state.catalog).some(p=>text.includes(p.name)))) { productConsultation(text); return }
    if (/^(?:你好|您好|谢谢|再见)[。！!？?]?$/.test(text)) { answerWithoutSearch(text,'faq',/谢/.test(text)?'不客气。需要继续找数据时，可以直接描述你的要求。':'你好，可以告诉我你需要什么数据。'); return }
    const previousQuestion = current()?.clarification
    if (previousQuestion && ['clarify','clarify-edit'].includes(current().kind)) previousQuestion.submitted = true
    if (current()?.kind === 'fallback' && /^(可以|同意|好|继续|找相关商品)[。！!]?$/u.test(text)) { await continueFinding(); return }
    const suggestions = (current()?.suggestions || []).filter(p => { const task=session().tasks.find(t=>t.id===p.taskId); return task && session().pending.includes(p.taskId) && p.original === taskConditions([task])[0] })
    if (/保留原要求|保持原要求|不接受建议/.test(text)) { session().suggestionQuestion=undefined; session().conditionQuestion=undefined; restoreDecisionFrame(text,'已保留原要求，条件调整建议未生效。'); return }
    if (session().suggestionQuestion && !explicitFind) {
      const pending = session().suggestionQuestion!
      const selected = answer?.targetIds[0]?.split(':')
      const named = referencedTasks(scopeText,session().tasks.filter(t=>session().pending.includes(t.id)))
      const targets = named.length ? pending.filter(p=>named.some(t=>t.id===p.taskId)) : selected ? pending.filter(p=>p.taskId===selected[0]) : []
      const explicitChanges = parseConditionChanges(scopeText)
      if (targets.length === 1 && (targets[0].options.length === 1 || selected)) {
        const option = targets[0].options[Number(selected?.[1] || 0)]
        await acceptSuggestion(targets[0],{...option.changes,...explicitChanges},text); return
      }
      if (!Object.keys(explicitChanges).length) { askSuggestionAcceptance(text,pending); return }
      session().suggestionQuestion=undefined
    }
    if (/^(可以|同意|好|接受|按建议来|就按你说的)[。！!]?$/u.test(text)) {
      if (!suggestions.length) { append(text,'notice','你希望继续哪项操作？可以直接说明需要的数据或要修改的条件。',[]); return }
      if (suggestions.length !== 1 || suggestions[0].options.length !== 1) { askSuggestionAcceptance(text,suggestions); return }
      await acceptSuggestion(suggestions[0], suggestions[0].options[0].changes, text); return
    }
    if (/^(重试|重新搜索|再试一次)[。！!]?$/.test(text)) {
      if (session().conditionQuestion) { askScope(text, '请先说明原修改的需求范围，未明确范围前不执行搜索。'); return }
      if (!session().pending.length) { append(text, 'notice', '本轮没有待查需求，可以继续描述你需要的数据。', []); return }
      await retry(); return
    }
    if (/不找了|先不找|不用找|不需要了/.test(text)) {
      const clauses = text.split(/[，,；;]/), removals = clauses.filter(c => /不找了|先不找|不用找|不需要了/.test(c))
      const edits = clauses.filter(c => !removals.includes(c)).join('；')
      if (edits && isConditionChange(edits)) await exclude(removals.join('；'), edits, text)
      else await exclude(text)
      return
    }
    if (/回到.*放宽前/.test(text)) { const target = session().tasks.find(t => text.includes(t.name.slice(0, 2))); await rollback(target?.id); return }
    if (/采数|帮我采/.test(text)) { openCollection(); return }
    if (session().conditionQuestion && /先不改了|取消修改|不修改了|全部保留原要求/.test(text)) {
      session().conditionQuestion = undefined
      restoreDecisionFrame(text, '已取消这次修改，原条件保持不变。')
      return
    }
    const addition = text.match(/(?:再找|另外找|新增)(.+)$/)
    const editPrefix = addition ? text.slice(0,addition.index).replace(/[，,；;\s]+$/,'') : ''
    if (addition && editPrefix && isConditionChange(editPrefix)) {
      const changes = parseConditionChanges(editPrefix), assignments = conditionAssignments(editPrefix)
      const ids = conditionTargets(editPrefix)
      const added = parse(addition[1]); session().tasks.push(...added); session().pending.push(...added.map(t=>t.id))
      session().suggestionQuestion=undefined
      if (assignments?.length || ids.length) { await applyDialogueEdits(assignments?.length ? assignments : ids.map(taskId=>({taskId,changes})),text); return }
      session().conditionQuestion={changes,query:editPrefix}; askScope(text,'新需求已加入。请说明原条件修改适用于哪项需求，新需求不会自动继承该修改。'); return
    }
    const addsDemand = /^(再找|另外找|新增)/.test(text)
    const negated = text.split(/[，,；;]/).filter(c => /不(?:用|要|必)?改|保持原|保留原/.test(c))
    if (session().conditionQuestion && negated.length && !/只改|仅改/.test(scopeText) && !Object.keys(parseConditionChanges(scopeText)).length) { session().conditionQuestion = undefined; restoreDecisionFrame(text, '已取消这次修改，原条件保持不变。'); return }
    if (negated.length && !session().conditionQuestion && !Object.keys(parseConditionChanges(text)).length) {
      session().conditionQuestion = undefined
      rememberDecisions(); restoreDecisionFrame(text, '已保留原条件，未执行被否定的修改。'); return
    }
    if (!(source === 'clarification' && current()?.kind === 'clarify') && session().pending.length && (isConditionChange(text) || (/可以|接受|仍要|还是|只要/.test(text) && Object.keys(parseConditionChanges(text)).length > 0)) && !addsDemand && (!session().conditionQuestion || Object.keys(parseConditionChanges(text)).length)) {
      const remembered = { ...session().conditionQuestion?.changes }
      const rejected = parseConditionChanges(negated.join('；').replace(/不(?:用|要|必)?改/g, '改').replace(/保持原|保留原/g, ''))
      for (const key of Object.keys(rejected)) delete remembered[key as keyof DemoTask]
      const changes = { ...remembered, ...parseConditionChanges(scopeText) }
      if (!Object.keys(changes).length) {
        if (/不(?:用|要|必)?改|保持原|保留原/.test(text)) { rememberDecisions(); restoreDecisionFrame(text, '已保留原条件，未执行被否定的修改。'); return }
        const previous = current()
        rememberDecisions()
        const f = append(text, previous?.kind || 'notice', '暂未识别你要修改的具体条件，可以说明修改哪项的年份、查看方式、更新频率、商品类型或预算。')
        if (previous) for (const key of ['plans', 'choices', 'proposed', 'proposedText', 'tasks', 'missing', 'steps'] as const) Object.assign(f, { [key]: clone(previous[key]) })
        return
      }
      const assignments = conditionAssignments(scopeText)
      if (assignments?.length) { const previous = session().conditionQuestion?.changes; session().conditionQuestion = undefined; await applyDialogueEdits(assignments.map(a => ({ ...a, changes: { ...previous, ...a.changes } })), text); return }
      if (new Set(scopeText.match(/20\d{2}\s*年/g) || []).size > 1) { append(text, 'notice', '这条修改包含不同的年份，请分别说明对应需求，例如：煤炭运价改查2024年；货运量改查2023年。'); return }
      const ids = scopeTargets()
      if (!ids.length) { rememberDecisions(); session().conditionQuestion = { changes, query: text }; askScope(text, '你想修改哪一项需求的条件？可选择一项或多项，也可以直接说明修改范围。'); return }
      session().conditionQuestion = undefined
      const accepted = ids.length === 1 && /可以|接受|按建议/.test(text) ? suggestions.find(p=>p.taskId===ids[0]) : undefined
      if (accepted) await acceptSuggestion(accepted,changes,text)
      else await applyDialogueChanges(ids, changes, text)
      return
    }
    if (session().conditionQuestion && !addsDemand) {
      const ids = scopeTargets(), question = session().conditionQuestion!
      if (!ids.length) { askScope(text, '还不能确定修改范围，请说明需求名称，或说明本轮全部需求都修改。'); return }
      session().conditionQuestion = undefined
      await applyDialogueChanges(ids, question.changes, `${question.query}；${text}`); return
    }
    if (current()?.kind === 'clarify' && (!/再找|另外找|新增/.test(text) || /水果|品牌|手机|iPhone/.test(text.split(/再找|另外找|新增/)[0]))) {
      const task = session().tasks.find(t => current().missing.includes(t.id))
      if (!task) { askScope(text, '请说明需要补充哪项需求。'); return }
      // Read the final explicit correction before the selected labels; never infer an unspoken standard.
      const correction = text.split(/[；;]|不是|改为|纠正为|只要/).filter(Boolean).at(-1) || text
      if (task.blocked === '含义' && !/水果|品牌|手机|iPhone/i.test(text)) { setClarification(append(text, 'clarify', clarification(task)), task).missing = [task.id]; return }
      if (task.blocked === '含义') task.name = /iPhone/i.test(correction) ? 'iPhone手机销量' : /手机/.test(correction) ? '苹果品牌手机销量' : /水果/.test(correction) ? '水果苹果销量' : /品牌/.test(correction) ? '苹果品牌产品销量' : /水果/.test(text) ? '水果苹果销量' : '苹果品牌产品销量'
      else if (task.blocked === '地区口径') {
        const areas = (value: string): string[] => value.match(/上海|江苏|浙江|安徽|福建|江西|山东|湖北|湖南|广东|北京|天津|重庆|四川/g) || []
        const custom = current().clarification?.text || text
        const replacement = custom.split(/只要|仅要|改成|改为|纠正为/).at(-1)!
        const excluded = custom.match(/(?:不含|不要|不包括)([^，,；;]+)/)?.[1] || ''
        task.region = [...new Set(/只要|仅要|改成|改为|纠正为/.test(custom) ? areas(replacement) : areas(text))].filter(area=>!areas(excluded).includes(area)).join('、')
        task.regionCoverageUnknown = true
      }
      else if (task.blocked === '目标') {
        const replacement = parse(text)[0]; Object.assign(task, replacement, { id: task.id })
      } else { task.note = `补充要求：${text}`; task.standardUnknown = true }
      task.blocked = ''
      const editText = (answer?.text || text).split(/再找|另外找|新增/)[0]
      if (isConditionChange(editText)) {
        const changes = parseConditionChanges(editText)
        const named = referencedTasks(editText,session().tasks.filter(t=>session().pending.includes(t.id)))
        for (const target of named.length ? named : [task]) {
          for (const [key,value] of Object.entries(changes)) { (target as unknown as Record<string,unknown>)[key]=value; target.edits[key]=(target.edits[key]||0)+1 }
          if (session().facts) delete session().facts![target.id]
        }
      }
      const addedText = text.match(/(?:再找|另外找|新增)(.+)$/)?.[1]
      if (addedText) { const added=parse(addedText); session().tasks.push(...added); session().pending.push(...added.map(t=>t.id)) }
      current().steps.filter(step => step.id === 'clarify').forEach(step => { step.state = 'done'; step.detail = '已补充' })
      await search([...session().pending], text, false, session().pending.filter(id => !session().facts || !(id in session().facts!))); return
    }
    if (asksPurchase && !/销量|运价|货运量|货运路线|找/.test(text)) { const f = append(text, 'faq', '以下是平台数据商品的获取说明。', []); f.purchaseGuide = purchaseGuide(); return }
    if (current()?.kind === 'consult' && current().clarification && !explicitFind) { productConsultation(text); return }
    session().suggestionQuestion = undefined
    session().purchaseQuestion = asksPurchase
    const unresolved = ['clarify', 'clarify-edit', 'failure', 'stopped'].includes(current()?.kind) || /^(再找|另外找|新增)/.test(text)
    rememberDecisions()
    const tasks = parse(text)
    const attribution = tasks.length > 1 && /其中(?:一个|一项).*(按港口筛选)/.test(text)
    if (attribution) { tasks.forEach(t=>{ if(t.grain==='按港口筛选') t.grain='' }); session().conditionQuestion={changes:{grain:'按港口筛选'},query:text} }
    if (/刚才|之前|继续/.test(text)) for (const task of tasks) {
      const prior = [...session().tasks].reverse().find(t => t.topic === task.topic)
      if (prior) for (const key of ['year', 'grain', 'frequency', 'region', 'productType', 'budget', 'note'] as const) if (!task[key]) task[key] = prior[key]
    }
    const ids = [...(unresolved ? session().pending : []), ...tasks.map(t => t.id)]
    if (!unresolved) session().decisionDraft = undefined
    session().tasks.push(...tasks); session().pending = ids
    if (attribution) { const f=askScope(text,'哪项数据需要按港口筛选？可以选择一项，也可以输入补充或纠正。'); f.clarification!.mode='single'; return }
    if (session().conditionQuestion) { askScope(text, '已加入新需求。原条件修改仍待明确范围，请说明修改哪项需求；新需求不自动继承该修改。'); return }
    if (/是多少|多少[？?]?$/.test(text) && !/找/.test(text)) { append(text, 'fallback', '我目前不能可靠地直接回答具体数值，可以帮你查找相关的数据商品。要继续找相关商品吗？'); return }
    if (/这个.*(看板|商品).*(包含|线路|多少钱|价格)/.test(text)) { append(text, 'consult', '我目前还不能可靠确认这个商品的具体内容，你可以先查看商品详情。'); return }
    await search(ids, text, false, ids.filter(id => !session().facts || !(id in session().facts!)))
  }
  function conditionTargets(text: string): string[] {
    const candidates = session().tasks.filter(t => session().pending.includes(t.id))
    const named = referencedTasks(text, candidates)
    if (named.length) return new Set(named.map(t => t.topic)).size === named.length || /全部|都|所有/.test(text) ? named.map(t => t.id) : []
    if (/煤炭|运价|货运量|货运路线|货运线路|苹果|汽车|乘用车/.test(text)) return []
    if (/两项|这两|这俩/.test(text) && candidates.length !== 2) return []
    if (/三项|这三/.test(text) && candidates.length !== 3) return []
    if (/全部|所有|都|两项|三项|一起|共同/.test(text)) return candidates.map(t => t.id)
    return candidates.length === 1 ? [candidates[0].id] : []
  }
  function conditionAssignments(text: string) {
    const candidates = session().tasks.filter(t => session().pending.includes(t.id))
    let scope: string[] = [], explicitGroups = 0
    const updates = new Map<string, Partial<DemoTask>>()
    for (const clause of text.split(/[，,；;]/)) {
      if (referencedTasks(clause, candidates).length) {
        scope = conditionTargets(clause); explicitGroups++
        if (!scope.length) return null
      }
      if (/不(?:用|要|必)?改|保持原|保留原/.test(clause)) continue
      const changes = parseConditionChanges(clause)
      if (!Object.keys(changes).length) continue
      if (!scope.length) return null
      for (const id of scope) updates.set(id, { ...updates.get(id), ...changes })
    }
    return explicitGroups > 1 ? [...updates].map(([taskId, changes]) => ({ taskId, changes })) : null
  }
  function restoreDecisionFrame(query: string, message: string) {
    const blocked = session().tasks.find(t => session().pending.includes(t.id) && t.blocked)
    const f = append(query, blocked ? 'clarify' : 'notice', blocked ? clarification(blocked) : message)
    if (blocked) { f.missing = [blocked.id]; setClarification(f, blocked) }
    return f
  }
  async function applyDialogueChanges(ids: string[], changes: Partial<DemoTask>, query: string) {
    await applyDialogueEdits(ids.map(taskId => ({ taskId, changes })), query)
  }
  async function applyDialogueEdits(assignments: { taskId: string; changes: Partial<DemoTask> }[], query: string) {
    rememberDecisions()
    const changed = await editAssignments(assignments, query)
    if (!changed) append(query, 'notice', '这些条件与当前条件相同，已保留原要求，无需重新搜索。')
  }
  async function edit(id: string, changes: Partial<DemoTask>) { await editMany([id], changes) }
  async function editMany(ids: string[], changes: Partial<DemoTask>, query = '修改条件后继续查找') {
    return editAssignments(ids.map(taskId => ({ taskId, changes })), query)
  }
  async function editAssignments(assignments: { taskId: string; changes: Partial<DemoTask> }[], query: string) {
    if (state.busy) return false
    const tasks = session().tasks.filter(t => assignments.some(a => a.taskId === t.id) && session().pending.includes(t.id))
    const changedIds: string[] = []
    for (const task of tasks) {
      const id = task.id, changes = assignments.find(a => a.taskId === id)!.changes
      const editable = Object.fromEntries(Object.entries(changes).filter(([key]) => ['year', 'grain', 'frequency', 'productType', 'budget', 'note', 'region'].includes(key))) as Partial<DemoTask>
        const entries = Object.entries(editable).filter(([key, value]) => task[key as keyof DemoTask] !== value)
        if (!entries.length) continue
        for (const [key, value] of entries) { (task as unknown as Record<string, unknown>)[key] = value; task.edits[key] = (task.edits[key] || 0) + 1 }
        changedIds.push(id)
    }
    if (changedIds.length) {
      const needed = session().pending.filter(id => changedIds.includes(id) || !(id in (session().facts || {})))
      await search([...session().pending], query, false, needed)
    }
    return changedIds.length > 0
  }
  function lastRelaxation(taskId: string) { return [...session().relaxations].reverse().find(r => r.taskId === taskId) }
  function rollbackPreview(taskId: string) {
    const record = lastRelaxation(taskId), task = session().tasks.find(t => t.id === taskId)
    if (!record || !task) return ''
    const labels: Record<string, string> = { grain: '查看方式', frequency: '更新频率', year: '年份' }
    return record.changes.map(c => (task.edits[c.key] || 0) === c.edit && task[c.key as keyof DemoTask] === c.after
      ? `${labels[c.key] || c.key}：${c.after} → ${c.before || '未限定'}`
      : `${labels[c.key] || c.key}已主动修改，保留当前值`).join('；')
  }
  async function rollback(taskId?: string) {
    if (state.busy) return
    const targets = session().tasks.filter(t => session().pending.includes(t.id) && lastRelaxation(t.id))
    const target = taskId || (targets.length === 1 ? targets[0].id : '')
    const relaxation = lastRelaxation(target)
    if (!relaxation) { append('', 'notice', targets.length > 1 ? '请通过对话说明要恢复哪项需求的放宽前条件。' : '当前没有可回退的放宽。'); return }
    const task = session().tasks.find(t => t.id === relaxation.taskId)!
    session().relaxations.splice(session().relaxations.lastIndexOf(relaxation), 1)
    for (const change of relaxation.changes) if ((task.edits[change.key] || 0) === change.edit && task[change.key as keyof DemoTask] === change.after) (task as unknown as Record<string, unknown>)[change.key] = change.before
    const scope = session().pending.includes(task.id) ? [...session().pending] : [task.id]
    await search(scope, `回到${task.name}最近一次放宽前的条件`, false, [task.id])
  }
  function rememberDecisions() { session().decisionDraft = undefined }
  async function exclude(text: string, followup = '', query = text) {
    const owner = session(), active = owner.tasks.filter(t => owner.pending.includes(t.id))
    const exclusion = text.split(/再找|另外找|新增/)[0]
    const named = referencedTasks(exclusion, active)
    let ids: string[] = []
    if (named.length) {
      if (new Set(named.map(t => t.topic)).size === named.length || /都|全部/.test(exclusion)) ids = named.map(t => t.id)
    } else if (/全部|都不找|这两项|这几项/.test(exclusion)) ids = [...owner.pending]
    else if (/这项|这一项/.test(exclusion) && current()?.kind === 'clarify') ids = [...current().missing]
    else if (active.length === 1 && /^(?:这项|这一项|这个)?(?:先)?不找了[。！!，,\s]*$/.test(exclusion)) ids = [active[0].id]
    if (!ids.length) {
      const previous = current(), f = append(text, previous?.kind || 'notice', '请说明本轮哪项需求不再查找；其他条件保持不变。')
      if (previous) for (const key of ['plans', 'choices', 'proposed', 'proposedText', 'tasks', 'missing'] as const) Object.assign(f, { [key]: clone(previous[key]) })
      return
    }
    rememberDecisions()
    owner.conditionQuestion = undefined
    owner.pending = owner.pending.filter(id => !ids.includes(id))
    if (owner.decisionDraft) for (const id of ids) {
      owner.decisionDraft.plans = owner.decisionDraft.plans.filter(p => p.taskId !== id)
      delete owner.decisionDraft.choices[id]; delete owner.decisionDraft.proposed[id]; delete owner.decisionDraft.proposedText[id]
    }
    const extra = text.match(/(?:再找|另外找|新增)(.+)$/)?.[1]
    if (extra) { const added = parse(extra); owner.tasks.push(...added); owner.pending.push(...added.map(t => t.id)) }
    if (followup) { const previous = current(); await send(followup, 'external'); if (current() !== previous) current().query = query; return }
    await search([...owner.pending], text, !!owner.decisionsDone && !extra && !owner.decisionDraft, owner.pending.filter(id => !(id in (owner.facts || {}))))
  }
  async function retry() { if (state.busy || !current()) return; if (session().conditionQuestion) { askScope('重新搜索', '请先说明要修改哪项需求，当前条件保持不变。'); return } rememberDecisions(); await search([...session().pending], '沿当前条件重新搜索', session().decisionsDone) }
  async function continueFinding() { await search([...session().pending], '继续找相关商品') }
  watch(() => [state.collection.price, state.collection.name, state.collection.contact, state.collection.description], () => {
    const form = state.collection, owner = state.sessions.find(s => s.id === form.ownerId)
    if (owner && form.key) { owner.collectionDrafts ||= {}; owner.collectionDrafts[form.key] = { price: form.price, name: form.name, contact: form.contact, description: form.description } }
  }, { flush: 'sync' })
  function openCollection(ids = current()?.taskIds || session().pending) {
    if (state.busy) return
    const owner = session(), tasks = owner.tasks.filter(t => ids.includes(t.id)), conditions = taskConditions(tasks)
    if (!tasks.length) return
    const key = JSON.stringify([tasks.map(t => t.id).sort(), conditions])
    const draft = owner.collectionDrafts?.[key]
    const budgets = tasks.map(t => t.budget || '')
    const amount = tasks.length === 1 && !/总|年|次|月/.test(budgets[0]) ? budgets[0].match(/\d+(?:\.\d+)?/)?.[0] : ''
    const price = amount ? String(Number(amount) * (budgets[0].includes('万') ? 10000 : 1)) : ''
    const facts = tasks.flatMap(t => owner.facts?.[t.id] || [])
    // Disconnect the previous key before prefilling; synchronous watches must not overwrite another draft.
    state.collection.key = ''
    Object.assign(state.collection, { open: true, success: false, error: '', description: draft?.description ?? '', taskIds: tasks.map(t => t.id), price: draft?.price ?? price, name: draft?.name ?? accountContact.name, contact: draft?.contact ?? accountContact.contact, conditions,
      searchFinding: tasks.every(t => t.id in (owner.facts || {})) ? facts.length ? '已找到相关候选商品，具体适配情况见缺口与待核实信息。' : '本次完整搜索未找到符合选定要求的商品。' : '选定需求尚未完成检索与判断，暂不作供给结论。',
      gaps: tasks.flatMap(t => {
        if (!(t.id in (owner.facts || {})) || t.unknown || t.routeCoverageUnknown || /矿区|逐车|专用线路/.test(t.raw)) return []
        if (t.topic === 'volume' && t.grain === '按区县查看') return ['山东货运量：相关商品支持按地市查看，不满足按区县查看。']
        if (t.topic === 'route' && t.grain === '按港口筛选') return ['货运路线：相关商品支持按地市筛选，不满足按港口筛选。']
        if (t.topic === 'coal' && (t.grain === '按天查看' || t.frequency === '每天更新')) return [`煤炭运价：相关商品支持按月查看、每周更新，原要求为${t.grain}、${t.frequency}。`]
        return []
      }), unknown: [...new Set(facts.flatMap(p => p.evidence.filter(e => e.state === 'unknown').map(e => e.fact)))] })
    state.collection.ownerId = owner.id; state.collection.key = key
  }
  function submitCollection() {
    const form = state.collection; form.error = ''
    if (!form.name.trim()) form.error = '请填写联系人。'
    else if (!/^\+?[\d\s-]{7,20}$/.test(form.contact.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact.trim())) form.error = '请填写有效的手机号或邮箱。'
    else if (form.price.trim()) {
      const prices = form.price.trim().match(/^(\d+(?:\.\d{1,2})?)(?:\s*[-–—~至]\s*(\d+(?:\.\d{1,2})?))?$/)
      if (!prices || (prices[2] && Number(prices[1]) > Number(prices[2]))) form.error = '请填写合法金额或价格区间，例如 0-5000。'
    }
    if (form.error) return false
    if (state.nextFailure === 'collection') { state.nextFailure = ''; form.error = '暂时未能提交，你填写的内容已保留，请重试。'; return false }
    form.success = true; return true
  }
  function toggleFavorite(id: string) {
    const i = state.favorites.indexOf(id)
    if (i < 0) {
      const product = state.sessions.flatMap(s => s.frames.flatMap(f => f.products)).find(p => p.id === id)
      if (product) state.catalog[id] = clone(product)
      state.favorites.push(id)
    } else state.favorites.splice(i, 1)
  }
  function newSession() { state.collection.open = false; const s = freshSession(); state.sessions.unshift(s); state.activeId = s.id }
  function activate(id: string) { if (state.sessions.some(s => s.id === id)) { state.collection.open = false; state.activeId = id } }
  function deleteSession(id: string) {
    if (!state.sessions.some(s => s.id === id)) return
    stop(id)
    if (state.activeId === id) {
      const next = state.sessions.find(s => s.id !== id)
      if (next) state.activeId = next.id
      else newSession()
    }
    state.sessions = state.sessions.filter(s => s.id !== id)
    state.collection.open = false
  }
  function rate(frameId: string, value: 'up' | 'down') {
    const frame = session().frames.find(f => f.id === frameId)
    if (!frame || !['results', 'empty', 'consult', 'fallback', 'faq'].includes(frame.kind)) return
    frame.rating = frame.rating === value ? '' : value
    if (frame.rating !== 'down') { frame.feedbackType = ''; frame.feedbackText = '' }
  }
  function feedback(frameId: string, type: string, text: string) {
    const frame = session().frames.find(f => f.id === frameId)
    if (frame?.rating === 'down') { frame.feedbackType = type; frame.feedbackText = text }
  }
  async function receiveEntry(text: string) { if (!text || state.entryQuery === text) return; state.entryQuery = text; newSession(); await send(text, 'external') }
  function status(item: DemoSession) {
    if (item.run) return '处理中'
    return ({ clarify: '待你补充', 'clarify-edit': '待你补充', relax: '待你确认', stopped: '已停止', failure: '未完成' } as Record<string, string>)[item.frames.at(-1)?.kind || ''] || (item.frames.length ? '已完成' : '新会话')
  }
  async function preset(id: string) {
    newSession()
    const owner = session().id
    const sample = prototypeScenes.find(s => s.id === id); if (!sample || id === 'welcome') return
    if (id === 'mixed-faq-unverified') session().purchaseRulesKnown = false
    if (id === 'unknown') { await send(`${sample.query}，商品资料未说明查看方式`); return }
    if (id === 'route-coverage') { await send('找榆林到天津港的煤炭公路运价，商品资料仅列出发地、目的地和运价字段'); return }
    if (id === 'history' || id === 'dialogue-edit') { await send('找2025年煤炭运价，按月查看'); await send('煤炭运价改查2024年'); return }
    if (id === 'scope-excluded') { await send('找煤炭运价，再找2025年苹果销量'); await send('苹果先不找了'); return }
    if (id === 'context-followup') { await send('找煤炭运价，再找2025年苹果销量'); await send('苹果先不找了'); await send('继续刚才苹果销量，是水果'); return }
    if (id.startsWith('batch') || id === 'partial-accept' || id === 'all-kept') {
      await send('找煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看')
      if (id === 'partial-accept') await send('煤炭运价按月查看可以，但仍要每天更新')
      if (id === 'all-kept') await send('全部保留原要求')
      return
    }
    if (['relax', 'alternatives', 'adjusted', 'rejected', 'rollback'].includes(id)) {
      await send('找2025年煤炭运价，必须按天查看、每天更新')
      if (['adjusted', 'rollback'].includes(id)) await send('可以')
      if (id === 'rejected') await send('保留原要求')
      if (id === 'rollback') { await edit(session().tasks[0].id, { year: '2024 年' }); await rollback() }
      return
    }
    if (id.startsWith('collection')) {
      await send('找2025年榆林到天津港的煤炭运价，必须按天查看、每天更新')
      if (owner !== session().id) return
      openCollection()
      if (id !== 'collection') Object.assign(state.collection, { name: '王女士', contact: 'demo@example.com', price: '0-5000' })
      if (id === 'collection-failed') { state.nextFailure = 'collection'; submitCollection() }
      if (id === 'collection-success') submitCollection()
      return
    }
    if (id === 'timeout' || id === 'all-failed') state.nextFailure = 'search'
    if (id === 'judgment-failed') state.nextFailure = 'judgment'
    await send(sample.query || '找2025年煤炭运价，按月查看')
    if (owner !== session().id) return
    const f = current()
    if (sample.products && !['failure', 'clarify', 'relax', 'fallback'].includes(f.kind)) { f.products = clone(sample.products); f.kind = 'results'; f.message = sample.message || f.message }
    sample.products?.filter(p => p.saved).forEach(p => { if (!state.favorites.includes(p.id)) state.favorites.push(p.id) })


  }
  const storage = options.storage, storageKey = options.storageKey || 'ai-v104-demo'
  if (storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey) || 'null')
      if (saved?.version === 1 && Array.isArray(saved.sessions) && saved.sessions.length && saved.sessions.every((s: DemoSession) => s.id && Array.isArray(s.frames) && Array.isArray(s.tasks))) {
        serial = saved.serial || serial; state.entryQuery = saved.entryQuery || ''
        state.sessions = saved.sessions
        state.sessions.forEach(s => {
          s.decisionDraft = undefined
          s.frames.forEach(f => { f.suggestions ??= []; if (f.kind === 'relax') { f.kind = 'notice'; f.suggestions = clone(f.plans || []); f.message = '以下是历史条件调整建议；尚未接受的变化不会生效，可在对话中说明当前要求。' } })
          const lastFrame = s.frames.at(-1)
          if (lastFrame && ['clarify','clarify-edit'].includes(lastFrame.kind) && !lastFrame.clarification) {
            const task = s.tasks.find(t=>lastFrame.missing.includes(t.id))
            lastFrame.clarification = { question: lastFrame.message, mode:'text', options:[],selected:[],text:s.clarificationDraft || '',submitted:false }
            if (task?.blocked === '含义') Object.assign(lastFrame.clarification,{mode:'single',options:[{value:'fruit',label:'水果苹果销量'},{value:'brand',label:'苹果品牌产品销量'}]})
          }
          s.decidedTaskIds ??= (s.run?.decisionsDone ?? s.decisionsDone) ? [...s.pending] : []
          const legacyIds = s.tasks.filter(t => (t as DemoTask & { deferred?: boolean }).deferred).map(t => t.id)
          s.pending = s.pending.filter(id => !legacyIds.includes(id))
          s.tasks.forEach(t => { delete (t as DemoTask & { deferred?: boolean }).deferred })
          if (s.run && legacyIds.length) { s.run.tasks = s.run.tasks.filter(t => !legacyIds.includes(t.id)); if (!s.run.tasks.length) s.run = null }
        })
        state.activeId = state.sessions.some(s => s.id === saved.activeId) ? saved.activeId : state.sessions[0].id
        state.favorites = saved.favorites || []; state.catalog = saved.catalog || {}; state.acquired = saved.acquired || {}
      }
    } catch { state.storageError = '浏览器演示记录无法恢复，已开启新的演示会话。' }
    watch(() => ({ version: 1, serial, entryQuery: state.entryQuery, sessions: state.sessions, activeId: state.activeId, favorites: state.favorites, acquired: state.acquired, catalog: state.catalog }), snapshot => {
      try { storage.setItem(storageKey, JSON.stringify(snapshot)) }
      catch { state.storageError = '浏览器无法保存演示记录，刷新后可能无法恢复。' }
    }, { deep: true, flush: 'sync' })
    state.sessions.forEach(owner => { if (owner.run) void drive(owner.id, owner.run.id) })
  }
  return { state, get session() { return session() }, get current() { return current() }, get tasks() { return session().tasks }, send, selectClarification, submitClarification, edit, editMany, rollback, rollbackPreview, retry, continueFinding, setCollectionContact, openCollection, submitCollection, toggleFavorite, newSession, activate, deleteSession, stop, rate, feedback, status, receiveEntry, preset, taskConditions, get favoriteProducts() { return state.favorites.map(id => state.catalog[id]).filter((p): p is ProductPreview => !!p) } }
}
const controllers = new Map<string, ReturnType<typeof createDemoConversation>>()
export function useDemoConversation(scope: string) {
  if (!controllers.has(scope)) {
    let storage: Storage | undefined
    try { storage = typeof window !== 'undefined' ? window.localStorage : undefined } catch { /* 演示允许禁用存储。 */ }
    controllers.set(scope, createDemoConversation(() => new Promise(resolve => setTimeout(resolve, 220)), { storage, storageKey: `ai-v104-demo-v1:${scope}`, stepMs: 220 }))
  }
  return controllers.get(scope)!
}
