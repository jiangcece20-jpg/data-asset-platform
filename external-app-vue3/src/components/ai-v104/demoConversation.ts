import { reactive, watch } from 'vue'
import { board, coal, prototypeScenes, route, shared, type ProductPreview } from './prototypeScenes'

export interface DemoTask {
  id: string; name: string; topic: string; raw: string; year: string; grain: string; frequency: string
  note: string; blocked: string; deferred: boolean; unknown: boolean; preference: boolean
  routeCoverageUnknown?: boolean; region?: string; productType?: string; budget?: string
  edits: Record<string, number>
}
export interface DemoPlan {
  taskId: string; title: string; original: string
  options: { title: string; changes: Partial<DemoTask>; impact: string }[]
}
export interface DemoStep {
  id: string; label: string; detail?: string
  state: 'pending' | 'active' | 'done' | 'waiting' | 'failed' | 'stopped'
}
export interface DemoFrame {
  purchaseGuide?: string; rating: '' | 'up' | 'down'; feedbackType: string; feedbackText: string
  id: string; searchedTaskIds?: string[]; steps: DemoStep[]; kind: string; query: string; message: string; conditions: string[]; taskIds: string[]
  products: ProductPreview[]; tasks: { id?: string; title: string; status: string; detail: string }[]
  plans: DemoPlan[]; choices: Record<string, string>; proposed: Record<string, Partial<DemoTask>>; proposedText: Record<string, string>; missing: string[]
}
interface Relaxation { taskId: string; changes: { key: string; before: string; after: string; edit: number }[] }
interface DemoRun { id: string; frameId: string; tasks: DemoTask[]; searchIds?: string[]; stage: number; dueAt: number; decisionsDone: boolean; failure: string }
export interface DemoSession {
  id: string; title: string; tasks: DemoTask[]; frames: DemoFrame[]; relaxations: Relaxation[]; pending: string[]
  purchaseRulesKnown?: boolean; purchaseQuestion?: boolean; facts?: Record<string, ProductPreview[]>; draft: string; clarificationDraft: string; sendError: string; run: DemoRun | null; decisionsDone: boolean
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

interface DemoOptions {
  purchaseRulesAvailable?: boolean; storage?: Pick<Storage, 'getItem' | 'setItem'>; storageKey?: string; stepMs?: number; now?: () => number
}

/** 仅将预设样例串成前端演示；浏览器快照/阶段时间只用于模拟恢复，不连接真实后台任务。 */
export function createDemoConversation(pause: () => Promise<void> = () => Promise.resolve(), options: DemoOptions = {}) {
  let serial = 0
  const now = options.now || (() => Date.now()), stepMs = options.stepMs || 0
  const uid = () => `demo-${++serial}`
  const freshSession = (): DemoSession => ({ id: uid(), title: '新会话', tasks: [], frames: [], relaxations: [], pending: [], facts: {}, draft: '', clarificationDraft: '', sendError: '', run: null, decisionsDone: false })
  const first = freshSession()
  const state = reactive({
    sessions: [first], activeId: first.id, favorites: [] as string[], acquired: {} as Record<string, string>,
    get busy(): boolean { return !!state.sessions.find(s => s.id === state.activeId)?.run },
    nextFailure: '' as '' | 'search' | 'judgment' | 'collection' | 'send',
    catalog: {} as Record<string, ProductPreview>, storageError: '', entryQuery: '',
    collection: { open: false, price: '', name: '王涛', contact: '', error: '', success: false, conditions: [] as string[], gaps: [] as string[], unknown: [] as string[] }
  })
  const session = () => state.sessions.find(s => s.id === state.activeId)!
  const current = () => session().frames.at(-1)!
  const taskConditions = (tasks: DemoTask[]) => tasks.map(t => [t.name, t.region && !t.name.includes(t.region.replace(/省$/, '')) ? t.region : '', t.year, t.grain, t.frequency, t.productType ? `仅 ${t.productType}（必须）` : '', t.budget, t.note].filter(Boolean).join(' · '))
  function append(query: string, kind = 'notice', message = '', ids = session().pending) {
    const frame: DemoFrame = { id: uid(), steps: [], rating: '', feedbackType: '', feedbackText: '', kind, query, message, conditions: taskConditions(session().tasks.filter(t => ids.includes(t.id))), taskIds: [...ids], products: [], tasks: [], plans: [], choices: {}, proposed: {}, proposedText: {}, missing: [] }
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
      { topic: 'vehicle', test: /汽车|乘用车/, name: /新能源/.test(text) ? '新能源汽车销量' : /乘用车/.test(text) ? '乘用车销量' : '汽车销量' }
    ].filter(t => t.test.test(text))
    if (!targets.length) targets.push({ topic: 'generic', test: /./, name: text.replace(/^(帮我)?找(一下|一些)?/, '').trim() || '数据需求' })
    return targets.map(target => {
      const clause = text.split(/[；;]|再找|另外找/).find(part => target.test.test(part)) || text
      const year = clause.match(/20\d{2}/)?.[0]
      let grain = target.topic === 'volume' ? (/区县/.test(clause) ? '按区县查看' : /地市/.test(clause) ? '按地市查看' : '')
        : target.topic === 'route' ? (/港口筛选/.test(clause) ? '按港口筛选' : /按地市/.test(clause) ? '按地市查看' : /按月/.test(clause) ? '按月查看' : '')
        : /按天|逐日/.test(clause) ? '按天查看' : /按月/.test(clause) ? '按月查看' : ''
      const blocked = target.topic === 'apple' && !/水果|品牌|手机/.test(clause) ? '含义'
        : /必须.*(?:口径一致|现有报表)/.test(clause) ? '口径'
        : /质量必须|必须.*质量.*达标/.test(clause) ? '质量'
        : target.topic === 'generic' && /^(数据需求|数据|一些数据)$/.test(target.name) ? '目标' : ''
      return { id: uid(), name: target.name, topic: target.topic, raw: clause, region: /全国/.test(clause) && (targets.length === 1 || /都|均/.test(clause) || new RegExp(`全国(?:的)?${target.name}`).test(clause)) ? '全国' : target.topic === 'coal' && /榆林.*天津港/.test(clause) ? '榆林 → 天津港' : ['route', 'volume'].includes(target.topic) && /山东/.test(clause) ? '山东省' : '', year: year ? `${year} 年` : /今天/.test(clause) ? '今天' : '', grain,
        productType: /(?:只要|仅)\s*API/i.test(clause) ? 'API' : /(?:只要|仅)\s*看板/.test(clause) ? '看板' : /(?:只要|仅)\s*数据集/.test(clause) ? '数据集' : '',
        budget: clause.match(/(?:单商品|单个商品|总)?预算\s*\d+(?:\.\d+)?\s*(?:万|元)?(?:[\/／]年|每年)?/)?.[0] || '',
        frequency: /每天更新|每日更新/.test(clause) ? '每天更新' : /每周更新/.test(clause) ? '每周更新' : '',
        note: /质量好一点/.test(clause) ? '质量好一点（质量标准尚未明确）' : '',
        routeCoverageUnknown: /(?:仅列|只列).*出发地.*目的地/.test(clause), blocked, deferred: false, unknown: /待核实|没写|资料未/.test(clause), preference: /最好.*每天/.test(clause), edits: {} }
    })
  }
  const clarification = (task: DemoTask) => task.blocked === '含义' ? '你说的“苹果”是水果，还是苹果品牌的产品？'
    : task.blocked === '口径' ? '你们现有报表采用什么统计口径？'
    : task.blocked === '质量' ? '你对数据质量的最低要求是什么？' : '你想找哪方面的数据？'
  function planFor(task: DemoTask, multiple: boolean): DemoPlan | null {
    if (task.unknown || task.preference || task.routeCoverageUnknown) return null
    let options: DemoPlan['options'] = []
    if (task.topic === 'coal' && (task.grain === '按天查看' || task.frequency === '每天更新')) {
      if (multiple && task.grain === '按天查看' && task.frequency === '每天更新') options = [
        { title: '方案 A · 调整查看方式', changes: { grain: '按月查看' }, impact: '无法查看逐日变化，保留每天更新要求。' },
        { title: '方案 B · 调整更新频率', changes: { frequency: '每周更新' }, impact: '保留按天查看，无法每天获得最新数据。' }
      ]
      else options = [{ title: '方案 A · 调整查看方式与更新频率', changes: {
        ...(task.grain === '按天查看' ? { grain: '按月查看' } : {}), ...(task.frequency === '每天更新' ? { frequency: '每周更新' } : {})
      }, impact: '查看粒度与更新频率降低，不能满足原来的逐日、每日要求。' }]
    }
    if (task.topic === 'route' && task.grain === '按港口筛选') options = [{ title: '方案 A · 按地市筛选', changes: { grain: '按地市查看' }, impact: '不能定位到具体港口。' }]
    if (task.topic === 'volume' && task.grain === '按区县查看') options = [{ title: '方案 A · 按地市查看', changes: { grain: '按地市查看' }, impact: '不能比较区县层面的差异。' }]
    return options.length ? { taskId: task.id, title: task.name, original: taskConditions([task])[0], options } : null
  }
  function productFor(task: DemoTask): ProductPreview[] {
    if (task.topic === 'generic' || task.year === '今天') return []
    if (task.topic === 'coal' && /北京|上海|广州|青岛|深圳|矿区|逐车|专用线路/.test(task.raw)) return []
    if (task.topic === 'coal' && !task.unknown && !task.preference && ((task.grain === '按天查看' && task.frequency !== '每周更新') || (task.frequency === '每天更新' && task.grain !== '按月查看'))) return []
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
    const products = (task: DemoTask) => clone(owner.facts?.[task.id] ?? productFor(task))
    frame.kind = 'results'
    frame.purchaseGuide = owner.purchaseQuestion ? purchaseGuide(owner) : undefined
    frame.products = tasks.flatMap(products)
    const byId = new Map<string, ProductPreview>()
    for (const p of frame.products) {
      const existing = byId.get(p.id)
      if (existing) existing.coverage = [...new Set([...(existing.coverage || []), ...(p.coverage || [])])]
      else byId.set(p.id, p)
    }
    frame.products = [...byId.values()]
    if (tasks.length > 1) frame.products.forEach(p => { p.best = false })
    frame.tasks = tasks.map(t => ({ id: t.id, title: t.name, status: products(t).length ? t.note ? '找到相关商品' : t.unknown || t.preference || t.routeCoverageUnknown ? '部分匹配' : '有合适商品' : '无合适商品', detail: products(t).length ? t.note ? '已明确条件见商品证据；补充要求的具体标准尚未明确，不据此判断已满足。' : t.unknown || t.routeCoverageUnknown ? '相关商品资料未写明支持情况，请核实标记的信息。' : t.preference ? '必须条件满足，更新偏好有缺口。' : '请查看下方商品和逐条件证据。' : '保留当前要求，可修改条件或提交采数需求。' }))
    frame.message = frame.products.length ? '本批需求已全部完成，以下一起展示结果。' : '本次搜索未找到符合当前要求的商品，暂时没有可靠的条件调整建议。'
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
      const plans = run.decisionsDone ? [] : run.tasks.map(t => planFor(t, run.tasks.length > 1)).filter((p): p is DemoPlan => !!p)
      if (plans.length) {
        f.kind = 'relax'; f.plans = plans; f.message = '完整搜索后，部分需求需要你决定是否调整。请分别选择，最后一起确认。'
        f.tasks = run.tasks.filter(t => !plans.some(p => p.taskId === t.id)).map(t => ({ id: t.id, title: t.name, status: '待统一展示', detail: '保持原条件，等待本批决策完成。' }))
      } else publish(f, run.tasks, owner)
      owner.run = null; return
    }
  }
  async function search(ids: string[], query = '', decisionsDone = false, searchIds = ids) {
    if (state.busy) return
    const owner = session()
    const activeTasks = owner.tasks.filter(t => ids.includes(t.id) && !t.deferred)
    if (!activeTasks.length) { append(query, 'notice', '当前没有待查找的需求。'); return }
    owner.pending = activeTasks.map(t => t.id); owner.decisionsDone = decisionsDone
    const blocked = activeTasks.find(t => t.blocked)
    if (blocked) {
      const f = append(query, 'clarify', clarification(blocked)); f.missing = [blocked.id]
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
  async function send(raw: string, source: 'composer' | 'clarification' | 'external' = 'composer') {
    const text = raw.trim(); if (!text || state.busy) return false
    const asksPurchase = /怎么买|如何购买|购买流程/.test(text)
    if (state.nextFailure === 'send') { state.nextFailure = ''; session().sendError = '消息未能发送，文字已保留，请重试。'; return false }
    session().sendError = ''
    if (source === 'composer') session().draft = ''
    if (source === 'clarification') session().clarificationDraft = ''
    if (current()?.kind === 'relax' && asksPurchase) {
      const previous = current()
      const frame = append(text, 'relax', '已补充购买说明。原有选择及待确认修改保留，请完成本批选择后统一确认。', previous.taskIds)
      for (const key of ['plans', 'choices', 'proposed', 'proposedText', 'tasks', 'missing'] as const) Object.assign(frame, { [key]: clone(previous[key]) })
      frame.purchaseGuide = purchaseGuide(); session().purchaseQuestion = true
      return
    }
    if (['failure', 'stopped', 'results', 'empty'].includes(current()?.kind) && /^(重试|重新搜索|再试一次)[。！!]?$/.test(text)) { await retry(); return }
    if (current()?.kind === 'clarify' && /暂缓|先不找|删除该需求/.test(text)) { await defer(/删除/.test(text)); return }
    if (current()?.kind === 'relax' && /^(确认|同意|好|可以|继续|确认选择并继续)[。！!]?$/.test(text)) { await confirm(); return }
    if (current()?.kind === 'relax' && /全部保留原要求/.test(text)) { current().plans.forEach(p => choose(p.taskId, 'keep')); return }
    if (/回到.*放宽前/.test(text)) { const target = session().tasks.find(t => text.includes(t.name.slice(0, 2))); await rollback(target?.id); return }
    if (/采数|帮我采/.test(text)) { openCollection(); return }
    const deferred = session().tasks.filter(t => t.deferred)
    if (/继续|恢复/.test(text) && deferred.length) {
      const t = deferred.find(t => text.includes(t.name.slice(0, 2))) || (deferred.length === 1 ? deferred[0] : undefined)
      if (!t) { append(text, 'notice', '你想继续哪一项暂缓的需求？'); return }
      t.deferred = false
      if (/水果|品牌|手机/.test(text)) { t.blocked = ''; t.name = /水果/.test(text) ? '水果苹果销量' : '苹果品牌产品销量' }
      await search([t.id], text); return
    }
    if (current()?.kind === 'clarify') {
      const task = session().tasks.find(t => current().missing.includes(t.id))!
      if (task.blocked === '含义' && !/水果|品牌|手机/.test(text)) { append(text, 'clarify', clarification(task)).missing = [task.id]; return }
      if (task.blocked === '含义') task.name = /水果/.test(text) ? '水果苹果销量' : '苹果品牌产品销量'
      else if (task.blocked === '目标') {
        const replacement = parse(text)[0]; Object.assign(task, replacement, { id: task.id })
      } else task.note = `补充要求：${text}`
      task.blocked = ''
      current().steps.filter(step => step.id === 'clarify').forEach(step => { step.state = 'done'; step.detail = '已补充' })
      await search([...session().pending], text); return
    }
    if (current()?.kind === 'relax' && /按月.*(可以|接受)|仍.*每天|只.*按月/.test(text)) {
      const task = session().tasks.find(t => current().plans.some(p => p.taskId === t.id && t.topic === 'coal'))
      if (task) {
        const previous = current()
        const f = append(text, 'relax', `已记录你的选择：按月查看、${task.frequency || '保留原更新要求'}。当前条件尚未改变，请统一确认后继续。`, previous.taskIds)
        f.plans = clone(previous.plans); f.choices = clone(previous.choices); f.proposed = clone(previous.proposed); f.proposedText = clone(previous.proposedText); f.tasks = clone(previous.tasks)
        await edit(task.id, { grain: '按月查看' }); return
      }
    }
    if (session().tasks.length && /改成|改为|换成/.test(text) && !/找.*(和|再找)/.test(text)) {
      const year = text.match(/20\d{2}/)?.[0]
      const changes: Partial<DemoTask> = { ...(year ? { year: `${year} 年` } : {}), ...(/按月/.test(text) ? { grain: '按月查看' } : /按天/.test(text) ? { grain: '按天查看' } : {}) }
      const candidates = session().tasks.filter(t => !t.deferred)
      const task = candidates.find(t => text.includes(t.name.slice(0, 2))) || (candidates.length === 1 ? candidates[0] : undefined)
      if (!task) { append(text, 'notice', '你想修改哪一项需求的条件？'); return }
      await edit(task.id, changes); return
    }
    if (asksPurchase && !/销量|运价|货运量|货运路线|找/.test(text)) { const f = append(text, 'faq', '以下是平台数据商品的获取说明。', []); f.purchaseGuide = purchaseGuide(); return }
    session().purchaseQuestion = asksPurchase
    const tasks = parse(text); session().tasks.push(...tasks); session().pending = tasks.map(t => t.id)
    if (/是多少|多少[？?]?$/.test(text) && !/找/.test(text)) { append(text, 'fallback', '我目前不能可靠地直接回答具体数值，可以帮你查找相关的数据商品。要继续找相关商品吗？'); return }
    if (/这个.*(看板|商品).*(包含|线路|多少钱|价格)/.test(text)) { append(text, 'consult', '我目前还不能可靠确认这个商品的具体内容，你可以先查看商品详情。'); return }
    await search(tasks.map(t => t.id), text)
  }
  function choose(taskId: string, value: string) { if (state.busy || current()?.kind !== 'relax') return; current().choices[taskId] = value; current().missing = current().missing.filter(id => id !== taskId) }
  async function confirm() {
    const f = current(); if (state.busy || f.kind !== 'relax') return
    f.missing = f.plans.filter(p => !f.choices[p.taskId]).map(p => p.taskId)
    if (f.missing.length) return
    const ids = [...f.taskIds]
    const changedIds: string[] = []
    for (const plan of f.plans) {
      const selected = f.choices[plan.taskId]; if (selected === 'keep') continue
      const task = session().tasks.find(t => t.id === plan.taskId)!
      const changes = selected === 'custom' ? f.proposed[task.id] : plan.options[Number(selected)]?.changes
      if (!changes) continue
      const record: Relaxation = { taskId: task.id, changes: [] }
      for (const [key, value] of Object.entries(changes)) {
        if (task[key as keyof DemoTask] === value) continue
        record.changes.push({ key, before: String(task[key as keyof DemoTask] || ''), after: String(value), edit: task.edits[key] || 0 })
        ;(task as unknown as Record<string, unknown>)[key] = value
        if (selected === 'custom') task.edits[key] = (task.edits[key] || 0) + 1
      }
      if (record.changes.length) {
        if (selected !== 'custom') session().relaxations.push(record)
        changedIds.push(task.id)
      }
    }
    if (changedIds.length) await search(ids, '确认选择并继续', true, changedIds)
    else { session().decisionsDone = true; const reply = append('确认选择并继续', 'results', '', ids); reply.searchedTaskIds = []; publish(reply, session().tasks.filter(t => ids.includes(t.id))); reply.message = '已保留原要求，以下是此前完整搜索的结果。' }
  }
  async function edit(id: string, changes: Partial<DemoTask>) {
    if (state.busy) return
    const task = session().tasks.find(t => t.id === id); if (!task) return
    const editable = Object.fromEntries(Object.entries(changes).filter(([key]) => ['year', 'grain', 'frequency', 'productType', 'budget', 'note', 'region'].includes(key))) as Partial<DemoTask>
    if (current()?.kind === 'relax') {
      const frame = current()
      const proposed = { ...frame.proposed[id], ...editable }
      frame.proposed[id] = Object.fromEntries(Object.entries(proposed).filter(([key, value]) => task[key as keyof DemoTask] !== value))
      frame.proposedText[id] = taskConditions([{ ...task, ...frame.proposed[id] }])[0]
      if (!frame.plans.some(p => p.taskId === id)) frame.plans.push({ taskId: id, title: task.name, original: taskConditions([task])[0], options: [] })
      frame.choices[id] = 'custom'; frame.missing = frame.missing.filter(m => m !== id)
      frame.message = '已暂存你修改的条件，当前条件尚未改变。请完成本批选择后统一确认。'
      return
    }
    const entries = Object.entries(editable).filter(([key, value]) => task[key as keyof DemoTask] !== value)
    if (!entries.length) return
    for (const [key, value] of entries) { (task as unknown as Record<string, unknown>)[key] = value; task.edits[key] = (task.edits[key] || 0) + 1 }
    const scope = session().pending.includes(id) ? [...session().pending] : [id]
    await search(scope, '修改条件后继续查找', session().decisionsDone, [id])
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
    if (!relaxation) { append('', 'notice', targets.length > 1 ? '请在对应需求下选择回到放宽前条件。' : '当前没有可回退的放宽。'); return }
    const task = session().tasks.find(t => t.id === relaxation.taskId)!
    session().relaxations.splice(session().relaxations.lastIndexOf(relaxation), 1)
    for (const change of relaxation.changes) if ((task.edits[change.key] || 0) === change.edit && task[change.key as keyof DemoTask] === change.after) (task as unknown as Record<string, unknown>)[change.key] = change.before
    const scope = session().pending.includes(task.id) ? [...session().pending] : [task.id]
    await search(scope, `回到${task.name}最近一次放宽前的条件`, false, [task.id])
  }
  async function defer(remove = false) {
    if (state.busy) return
    const id = current().missing[0], task = session().tasks.find(t => t.id === id); if (!task) return
    current().steps.filter(step => step.id === 'clarify').forEach(step => { step.state = 'stopped'; step.detail = remove ? '已删除该需求' : '已暂缓该需求' })
    if (remove) session().tasks = session().tasks.filter(t => t.id !== id)
    else task.deferred = true
    const ids = session().pending.filter(taskId => taskId !== id)
    await search(ids, remove ? `删除${task.name}` : `先暂缓${task.name}`)
  }
  async function retry() { if (state.busy || !current()) return; await search([...session().pending], '沿当前条件重新搜索', session().decisionsDone) }
  async function continueFinding() { await search([...session().pending], '继续找相关商品') }
  function openCollection(ids = current()?.taskIds || session().pending) {
    const tasks = session().tasks.filter(t => ids.includes(t.id))
    Object.assign(state.collection, { open: true, success: false, error: '', conditions: taskConditions(tasks), gaps: tasks.flatMap(t => {
      if (t.unknown) return []
      if (t.topic === 'volume' && t.grain === '按区县查看') return ['山东货运量：相关商品支持按地市查看，不满足按区县查看。']
      if (t.topic === 'route' && t.grain === '按港口筛选') return ['货运路线：相关商品支持按地市筛选，不满足按港口筛选。']
      if (t.topic === 'coal' && (t.grain === '按天查看' || t.frequency === '每天更新')) return [`煤炭运价：相关商品支持按月查看、每周更新，原要求为${t.grain}、${t.frequency}。`]
      return []
    }), unknown: current()?.products.flatMap(p => p.evidence.filter(e => e.state === 'unknown').map(e => e.fact)) || [] })
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
    return ({ clarify: '待你补充', relax: '待你确认', stopped: '已停止', failure: '未完成' } as Record<string, string>)[item.frames.at(-1)?.kind || ''] || (item.frames.length ? '已完成' : '新会话')
  }
  async function preset(id: string) {
    newSession()
    const owner = session().id
    const sample = prototypeScenes.find(s => s.id === id); if (!sample || id === 'welcome') return
    if (id === 'mixed-faq-unverified') session().purchaseRulesKnown = false
    if (id === 'unknown') { await send(`${sample.query}，商品资料未说明查看方式`); return }
    if (id === 'route-coverage') { await send('找榆林到天津港的煤炭公路运价，商品资料仅列出发地、目的地和运价字段'); return }
    if (id === 'history') { await send('找2025年煤炭运价，按月查看'); await edit(session().tasks[0].id, { year: '2024 年' }); return }
    if (id === 'resume') { await send('找煤炭运价，再找2025年苹果销量'); await defer(); await send('继续刚才苹果销量，是水果'); return }
    if (id.startsWith('batch') || id === 'partial-accept' || id === 'all-kept') {
      await send('找煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看')
      const f = current()
      if (['batch-missing', 'batch-ready'].includes(id)) choose(f.plans[0].taskId, '0')
      if (id === 'batch-ready') choose(f.plans[1].taskId, 'keep')
      if (id === 'batch-missing') await confirm()
      if (id === 'partial-accept') { await send('按月查看可以，但仍要每天更新'); choose(f.plans[1].taskId, 'keep') }
      if (id === 'all-kept') { f.plans.forEach(p => choose(p.taskId, 'keep')); await confirm() }
      return
    }
    if (['relax', 'alternatives', 'adjusted', 'rejected', 'rollback'].includes(id)) {
      await send('找2025年煤炭运价，必须按天查看、每天更新')
      if (id === 'alternatives') current().plans = [planFor(session().tasks[0], true)!]
      if (['adjusted', 'rollback'].includes(id)) { choose(session().tasks[0].id, '0'); await confirm() }
      if (id === 'rejected') { choose(session().tasks[0].id, 'keep'); await confirm() }
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
  return { state, get session() { return session() }, get current() { return current() }, get tasks() { return session().tasks }, send, choose, confirm, edit, rollback, rollbackPreview, defer, retry, continueFinding, openCollection, submitCollection, toggleFavorite, newSession, activate, deleteSession, stop, rate, feedback, status, receiveEntry, preset, taskConditions, get favoriteProducts() { return state.favorites.map(id => state.catalog[id]).filter((p): p is ProductPreview => !!p) } }
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
