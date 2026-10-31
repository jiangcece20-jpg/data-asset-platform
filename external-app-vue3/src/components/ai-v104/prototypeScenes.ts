/** 固定评审画面，不包含意图识别、检索、匹配或业务执行。 */
export interface EvidencePreview {
  demand?: string
  label: string
  fact: string
  state: 'met' | 'partial' | 'unmet' | 'unknown'
}
export interface ProductPreview {
  id: string
  name: string
  type: '数据集' | '看板' | 'API'
  price: string
  description: string
  evidence: EvidencePreview[]
  risks?: { fact: string; impact: string; demand?: string }[]
  coverage?: string[]
  budget?: string
  budgetTone?: 'ok' | 'over' | 'unknown'
  best?: boolean
  saved?: boolean
  state?: string
  action: string
}
export interface ScenePreview {
  id: string
  label: string
  group: string
  kind: string
  query?: string
  message?: string
  conditions?: string[]
  products?: ProductPreview[]
  tasks?: { title: string; status: string; detail: string; waiting?: boolean }[]
}

export const coalConditions = ['煤炭公路运价', '榆林 → 天津港', '2025 年', '按月查看（必须）']
export const dailyConditions = ['煤炭公路运价', '榆林 → 天津港', '2025 年', '按天查看（必须）', '每天更新（必须）']
export const coal: ProductPreview = {
  id: 'preview-coal', name: '煤炭公路运价明细数据集', type: '数据集', price: '¥2,400／年',
  description: '煤炭运输价格与线路信息查询。', action: '立即购买',
  evidence: [
    { label: '数据内容', fact: '包含煤炭公路运价指标', state: 'met' },
    { label: '线路方向', fact: '榆林 → 天津港', state: 'met' },
    { label: '时间范围', fact: '覆盖 2025 年', state: 'met' },
    { label: '查看方式', fact: '支持按月查看', state: 'met' }
  ]
}
export const board: ProductPreview = {
  id: 'preview-board', name: '煤炭运输价格监测看板', type: '看板', price: '¥1,800／年',
  description: '在线查看煤炭运价及线路走势。', action: '查看详情',
  evidence: [
    { label: '数据内容', fact: '包含煤炭公路运价', state: 'met' },
    { label: '线路方向', fact: '支持榆林 → 天津港', state: 'met' },
    { label: '时间范围', fact: '覆盖 2025 年', state: 'met' },
    { label: '查看方式', fact: '资料未说明是否支持按月查看', state: 'unknown' }
  ]
}
export const route: ProductPreview = {
  id: 'preview-route', name: '货运路线与运力分布数据集', type: '数据集', price: '¥1,800／年',
  description: '了解货运路线及沿线运力分布。', action: '立即购买',
  evidence: [
    { label: '数据内容', fact: '包含货运路线与运力', state: 'met' },
    { label: '筛选方式', fact: '支持按地市筛选', state: 'met' }
  ]
}
export const shared: ProductPreview = {
  ...coal, id: 'preview-shared', name: '煤炭运输线路与运价综合数据集', price: '¥3,600／年',
  description: '同一商品同时提供线路、运价与运力信息。', coverage: ['需求 1 · 煤炭运价', '需求 2 · 货运路线'],
  evidence: [...coal.evidence.map(e => ({ ...e, demand: '需求 1 · 煤炭运价' })), { label: '货运路线', fact: '提供地市间路线与运力信息', state: 'met', demand: '需求 2 · 货运路线' }]
}
const freightQuery = '找 2025 年榆林到天津港的煤炭公路运价，按月查看'
const dailyQuery = '找榆林到天津港的煤炭公路运价，2025 年，必须按天查看、每天更新'
const multiConditions = ['需求 1：煤炭运价｜榆林 → 天津港｜2025 年｜按月查看', '需求 2：货运路线｜山东省｜2025 年｜按港口筛选（必须）']
export const prototypeScenes: ScenePreview[] = [
  { id: 'welcome', label: '欢迎与输入', group: '入口与理解', kind: 'welcome' },
  { id: 'received', label: '入口关键词已带入', group: '入口与理解', kind: 'received' },
  { id: 'searching', label: '搜索中', group: '入口与理解', kind: 'searching', query: freightQuery, conditions: coalConditions, message: '正在查找相关数据商品……' },
  { id: 'clarify', label: '核心含义先澄清', group: '入口与理解', kind: 'clarify', query: '找 2025 年的苹果销量数据', message: '你说的“苹果”是水果，还是苹果品牌的产品？' },
  { id: 'soft', label: '模糊描述保留，先搜', group: '入口与理解', kind: 'searching', query: '找 2025 年全国新能源汽车销量，质量好一点', conditions: ['新能源汽车销量', '全国', '2025 年', '质量好一点（质量标准尚未明确）'], message: '正在查找相关数据商品……' },
  { id: 'hard', label: '必要标准先澄清', group: '入口与理解', kind: 'clarify', query: '找新能源汽车销量，必须与我们现有报表的统计口径一致', message: '你们现有报表采用什么统计口径？' },
  { id: 'fallback', label: '直接问数的兜底', group: '入口与理解', kind: 'fallback', query: '今天榆林到天津港的煤炭运价是多少？', message: '我目前不能可靠地直接回答具体运价，可以帮你查找相关的数据商品。要继续找相关商品吗？' },
  { id: 'consult', label: '商品咨询的兜底', group: '入口与理解', kind: 'consult', query: '这个煤炭运输看板包含哪些线路？', message: '我目前还不能可靠确认这个看板包含的具体线路，你可以先查看商品详情。' },
  { id: 'mixed-faq', label: '找数与购买说明同轮回应', group: '入口与理解', kind: 'results', query: '找汽车销量数据，顺便告诉我平台的数据怎么买。' },
  { id: 'mixed-faq-empty', label: '没有商品仍回答购买问题', group: '入口与理解', kind: 'empty', query: '找海底火山观测数据，顺便告诉我平台的数据怎么买。' },
  { id: 'mixed-faq-unverified', label: '购买规则缺依据，保留找数结果', group: '入口与理解', kind: 'results', query: '找汽车销量数据，顺便告诉我平台的数据怎么买。' },
  { id: 'route-coverage', label: '只有字段，具体路线待核实', group: '结果与商品', kind: 'results' },
  { id: 'result', label: '完整结果与最佳匹配', group: '结果与商品', kind: 'results', query: freightQuery, conditions: coalConditions, message: '找到符合要求的数据商品，以下是匹配依据。', products: [{ ...coal, best: true, coverage: ['需求 1 · 煤炭运价'] }, board], tasks: [{ title: '需求 1 · 煤炭运价', status: '有合适商品', detail: '推荐煤炭公路运价明细数据集，内容、线路、年份与查看方式均满足。' }] },
  { id: 'unknown', label: '商品资料缺失，标待核实', group: '结果与商品', kind: 'results', query: freightQuery.replace('按月', '按天'), conditions: ['煤炭公路运价', '榆林 → 天津港', '2025 年', '按天查看（必须）'], message: '找到相关商品，查看方式还需要核实。', products: [{ ...board, evidence: [...board.evidence.slice(0, 3), { label: '查看方式', fact: '资料未说明是否支持按天查看', state: 'unknown' }] }], tasks: [{ title: '需求 1 · 煤炭运价', status: '部分匹配', detail: '内容、线路和年份匹配；是否支持按天查看待核实。' }] },
  { id: 'risk', label: '满足条件，同时有数据适用风险', group: '结果与商品', kind: 'results', query: freightQuery, conditions: coalConditions,
    message: '找到符合当前条件的商品，使用前请留意明细完整性。', products: [{ ...coal,
      risks: [{ fact: '2025 年 12 月有 2 条运价明细记录缺失。', impact: '可能影响该月汇总的完整性，使用时需留意。', demand: '煤炭公路运价' }] }] },
  { id: 'preference', label: '偏好有缺口，部分匹配', group: '结果与商品', kind: 'results', query: freightQuery + '，最好每天更新', conditions: [...coalConditions, '每天更新（偏好）'], message: '找到部分匹配商品，更新频率与你的偏好存在差异。', products: [{ ...coal, evidence: [...coal.evidence, { label: '更新频率', fact: '每周更新，低于偏好的每天更新', state: 'partial' }] }], tasks: [{ title: '需求 1 · 煤炭运价', status: '部分匹配', detail: '必须条件满足；商品每周更新，未满足每天更新的偏好。' }] },
  { id: 'budget', label: '价格与四种预算提示', group: '结果与商品', kind: 'results', query: freightQuery + '，单个商品预算 3000 元/年', conditions: [...coalConditions, '单商品预算：¥3,000／年'], message: '以下商品价格与预算的对应情况供你参考。', products: [
    { ...coal, budget: '预算内', budgetTone: 'ok' },
    { ...coal, id: 'preview-budget-over', name: '公路运价深度数据集', price: '¥4,800／年', budget: '超预算', budgetTone: 'over' },
    { ...coal, id: 'preview-budget-quote', name: '公路运价定制 API', type: 'API', price: '需询价', budget: '暂无法判断', budgetTone: 'unknown', action: '提交试用申请' },
    { ...coal, id: 'preview-budget-unit', name: '公路运价查询 API', type: 'API', price: '¥0.20／次', budget: '计价口径不同，暂无法判断', budgetTone: 'unknown', action: '提交试用申请' }
  ] },
  { id: 'types', label: '用户指定仅看 API', group: '结果与商品', kind: 'results', query: freightQuery + '，只要 API', conditions: [...coalConditions, '仅 API（必须）'], message: '以下仅展示 API 商品。', products: [{ ...coal, id: 'preview-api', name: '煤炭线路运价查询 API', type: 'API', price: '¥0.20／次', action: '提交试用申请' }] },
  { id: 'multi-results', label: '多需求结果与商品去重', group: '结果与商品', kind: 'results', query: '找煤炭运价和山东货运路线，均为 2025 年，路线按地市查看', conditions: [multiConditions[0], '需求 2：货运路线｜山东省｜2025 年｜按地市查看'], message: '两项需求均已完成，找到 3 个不同商品。', tasks: [
    { title: '需求 1 · 煤炭运价', status: '有合适商品', detail: '2 个商品可用，分别说明适用情况。' },
    { title: '需求 2 · 货运路线', status: '有合适商品', detail: '2 个商品可用；综合数据集同时覆盖两项需求。' }
  ], products: [{ ...coal, coverage: ['需求 1 · 煤炭运价'] }, { ...route, coverage: ['需求 2 · 货运路线'] }, shared] },
  { id: 'empty', label: '零候选，无可靠放宽建议', group: '结果与商品', kind: 'empty', query: '找 2025 年某矿区内部专用线路的逐车运价', conditions: ['矿区内部专用线路', '2025 年', '逐车运价（必须）'], message: '本次搜索未找到符合当前要求的商品，暂时没有可靠的条件调整建议。' },
  { id: 'multi-wait', label: '已有匹配，等待统一决策', group: '放宽与确认', kind: 'relax', query: '找煤炭运价和山东货运路线，路线必须按港口筛选', conditions: multiConditions, message: '煤炭运价已有匹配。货运路线需要你决定是否调整，确认并完成搜索后一起展示结果。', tasks: [
    { title: '需求 1 · 煤炭运价', status: '已有匹配，待统一展示', detail: '保持当前条件。', waiting: true }
  ] },
  { id: 'relax', label: '同套方案包含两项变化', group: '放宽与确认', kind: 'relax', query: dailyQuery, conditions: dailyConditions, message: '当前相关商品只支持按月查看、每周更新。你愿意同时调整这两项要求吗？' },
  { id: 'alternatives', label: '两套可行方案分别选择', group: '放宽与确认', kind: 'relax', query: dailyQuery, conditions: dailyConditions, message: '有两种调整方式，你可以选择更适合的一种，也可以保留原要求。' },
  { id: 'batch', label: '每项选择，最后统一确认', group: '放宽与确认', kind: 'relax', query: '找煤炭运价，必须按天查看、每天更新；再找山东货运量，必须按区县查看', conditions: ['需求 1：煤炭运价｜按天查看｜每天更新', '需求 2：山东货运量｜按区县查看'], message: '两项需求都有条件调整建议。请分别选择，最后一起确认。' },
  { id: 'batch-ready', label: '全部选齐，尚未统一确认', group: '放宽与确认', kind: 'relax', query: '运价选按月方案，货运量保留原要求', conditions: ['需求 1：煤炭运价｜按天查看｜每天更新', '需求 2：山东货运量｜按区县查看'], message: '已记录两项选择，当前条件尚未改变。请确认后一起继续。' },
  { id: 'all-kept', label: '全部保留原要求后的结果', group: '放宽与确认', kind: 'empty', query: '两项都保留原要求，确认继续', conditions: ['需求 1：煤炭运价｜按天查看｜每天更新', '需求 2：山东货运量｜按区县查看'], message: '已保留两项原要求。按此前完整搜索的结果，本次都未找到合适商品，你仍可以提交采数需求。', tasks: [{ title: '需求 1 · 煤炭运价', status: '无合适商品', detail: '保留按天查看、每天更新。' }, { title: '需求 2 · 山东货运量', status: '无合适商品', detail: '保留按区县查看。' }] },
  { id: 'batch-missing', label: '漏选一项，仍不生效', group: '放宽与确认', kind: 'relax', query: '运价选按月方案，货运量还没想好', conditions: ['需求 1：煤炭运价｜按天查看｜每天更新', '需求 2：山东货运量｜按区县查看'], message: '山东货运量还没有选择，请完成选择后再一起确认。' },
  { id: 'partial-accept', label: '只接受同套方案的一部分', group: '放宽与确认', kind: 'partial', query: '按月查看可以，但仍然要每天更新', conditions: dailyConditions, message: '已按你的意思整理为“按月查看、每天更新”，其他要求保留。请和本批其他选择一起确认。' },
  { id: 'adjusted', label: '统一确认后展示新结果', group: '放宽与确认', kind: 'results', query: '确认选择并继续', conditions: ['煤炭公路运价', '榆林 → 天津港', '2025 年', '按月查看（已调整）', '每周更新（已调整）'], message: '已按你确认的条件完成搜索。查看方式从按天改为按月，更新频率从每天改为每周。', products: [{ ...coal, evidence: [...coal.evidence, { label: '更新频率', fact: '每周更新', state: 'met' }] }] },
  { id: 'rejected', label: '统一确认保留原要求', group: '放宽与确认', kind: 'empty', query: '保留原来的要求，确认继续', conditions: dailyConditions, message: '已保留按天查看、每天更新的要求。本次完整搜索未找到合适商品，你可以修改条件或提交采数需求。' },
  { id: 'defer', label: '多需求中暂缓不清晰项', group: '多轮与历史', kind: 'defer', query: '找煤炭运价，再找 2025 年苹果销量', conditions: ['需求 1：煤炭运价｜榆林 → 天津港｜2025 年', '需求 2：苹果销量｜2025 年｜含义待明确'], message: '苹果销量是指水果，还是苹果品牌产品？你也可以暂缓这一项，先找煤炭运价。' },
  { id: 'resume', label: '恢复暂缓需求，保留旧结果', group: '多轮与历史', kind: 'resume', query: '继续找刚才的苹果销量，是水果，还是 2025 年', conditions: ['水果苹果销量', '2025 年'], message: '继续处理之前暂缓的苹果销量需求，保留 2025 年条件。正在查找相关数据商品……' },
  { id: 'history', label: '旧条件与结果留在原对话', group: '多轮与历史', kind: 'history', query: '年份改成 2024 年，其他不变', conditions: ['煤炭公路运价', '榆林 → 天津港', '2024 年', '按月查看（必须）'], message: '已将年份改为 2024 年，以下是新条件下的结果。', products: [{ ...coal, evidence: coal.evidence.map(e => e.label === '时间范围' ? { ...e, fact: '覆盖 2024 年' } : e) }] },
  { id: 'rollback', label: '回到最近放宽前，保留主动修改', group: '多轮与历史', kind: 'rollback', query: '回到放宽前的条件', conditions: ['煤炭公路运价', '榆林 → 天津港', '2024 年（你主动修改）', '按天查看（恢复）'], message: '已恢复最近一次放宽前的按天查看，保留你修改的 2024 年。正在按这些条件重新查找……' },
  { id: 'edit', label: '修改条件的画面', group: '多轮与历史', kind: 'edit', query: freightQuery, conditions: coalConditions, message: '你可以修改当前需求的条件。' },
  { id: 'collection', label: '采数核对、价格与联系方式', group: '获取与反馈', kind: 'collection', query: '还是需要按天查看、每天更新，帮我采数', conditions: dailyConditions, message: '请核对采数需求，并补充联系方式。' },
  { id: 'collection-failed', label: '采数失败，保留已填内容', group: '获取与反馈', kind: 'collection', query: '确认提交', conditions: dailyConditions, message: '暂时未能提交，请稍后重试。你填写的内容已保留。' },
  { id: 'collection-success', label: '采数提交成功画面', group: '获取与反馈', kind: 'collection-success', query: '确认提交', message: '采数需求已提交。你可以继续找数据，或在我的需求中查看。' },
  { id: 'access', label: '收藏与获取的不同状态', group: '获取与反馈', kind: 'results', message: '你可以按商品当前状态获取数据，也可以先收藏。', products: [
    { ...coal, state: '已购买 · 权益可用', action: '立即使用' },
    { ...route, saved: true, state: '订单待付款', action: '继续支付' },
    { ...coal, id: 'preview-trial', name: '企业司法信息数据集', price: '¥3,600／年', description: '查询企业司法与清算相关信息。', evidence: [{ label: '数据内容', fact: '包含企业司法信息', state: 'met' }], state: '可申请试用', action: '提交试用申请' },
    { ...board, state: '权益状态暂时无法确认', action: '查看详情' }
  ] },
  { id: 'feedback', label: '五类反馈入口', group: '获取与反馈', kind: 'feedback', conditions: coalConditions, products: [coal], message: '这些商品是否符合你的需求？' },
  { id: 'timeout', label: '部分超时，整批未完成', group: '失败与恢复', kind: 'failure', query: '找煤炭运价和山东货运路线', conditions: multiConditions, message: '本次搜索未能全部完成，请重新搜索。当前条件已保留。' },
  { id: 'judgment-failed', label: '匹配判断失败，整批未完成', group: '失败与恢复', kind: 'failure', query: '找煤炭运价和山东货运路线', conditions: multiConditions, message: '本次匹配判断未能全部完成，请重新搜索。当前条件已保留。' },
  { id: 'all-failed', label: '全部搜索失败', group: '失败与恢复', kind: 'failure', query: freightQuery, conditions: coalConditions, message: '本次搜索暂时未能完成，请重新搜索。当前条件已保留。' }
]
