// 演示用扩充商品：让每个热门问题都能带出多种类型（数据集/API/报告/看板），
// 以展示不同的产品卡样式。仅用于原型 mock，不进入 seedProducts 的严格校验。
import type {
  Product,
  ProductType,
  DatasetDetail,
  ApiDetail,
  ReportDetail,
  DashboardDetail,
  ProductTypeDetail,
  ProductPrice,
  AvailabilityStatus,
  SpaceSyncMeta
} from '@/types/domain'

// ── 各类型最小可用 typeDetail 桩 ──────────────────────────
const datasetDetail = (): DatasetDetail => ({
  granularity: '线路 × 日',
  timeRange: '近 12 个月',
  rowCount: 120000,
  classification: '行情数据（L1）',
  qualityUpdatedAt: '2026-07-01',
  fields: [
    { name: 'stat_date', dataType: 'date', meaning: '统计日期', description: '数据统计自然日', primaryKey: true, nullable: false, profilingEnabled: true },
    { name: 'route_code', dataType: 'string', meaning: '线路编码', description: '起讫城市对编码，如 SH-GZ', primaryKey: true, nullable: false, profilingEnabled: true },
    { name: 'vehicle_type', dataType: 'string', meaning: '车型', description: '整车/零担/冷链等车型分类', primaryKey: false, nullable: false, profilingEnabled: true },
    { name: 'price_index', dataType: 'decimal', meaning: '价格指数', description: '以基期为 100 的相对价格指数', primaryKey: false, nullable: false, profilingEnabled: true },
    { name: 'yoy_rate', dataType: 'decimal', meaning: '同比涨跌幅', description: '与去年同期对比的变化率', primaryKey: false, nullable: true, profilingEnabled: true },
    { name: 'is_peak_season', dataType: 'boolean', meaning: '是否旺季', description: '标记该记录是否处于货运旺季（春节前/双十一等）', primaryKey: false, nullable: false, profilingEnabled: true }
  ],
  sampleColumns: ['stat_date', 'route_code', 'vehicle_type', 'price_index', 'yoy_rate', 'is_peak_season'],
  sampleRows: [
    { stat_date: '2026-06-28', route_code: 'SH-GZ', vehicle_type: '整车', price_index: 106.8, yoy_rate: 0.032, is_peak_season: false },
    { stat_date: '2026-06-28', route_code: 'BJ-CD', vehicle_type: '零担', price_index: 103.2, yoy_rate: 0.018, is_peak_season: false },
    { stat_date: '2026-06-28', route_code: 'HZ-WH', vehicle_type: '冷链', price_index: 111.5, yoy_rate: 0.061, is_peak_season: false },
    { stat_date: '2026-06-27', route_code: 'SH-GZ', vehicle_type: '整车', price_index: 106.4, yoy_rate: 0.029, is_peak_season: false },
    { stat_date: '2026-01-25', route_code: 'SZ-XA', vehicle_type: '整车', price_index: 119.7, yoy_rate: 0.158, is_peak_season: true }
  ],
  sampleGeneratedAt: '2026-07-01',
  profiling: {
    completeness: '99.2%',
    uniqueness: '线路 × 日期组合唯一性 100%',
    nullRate: '0.8%（集中在 yoy_rate 字段）',
    distribution: '价格指数集中在 95-115 区间',
    anomalies: '未发现异常',
    conclusion: '数据质量良好，适合运价趋势研判',
    updatedAt: '2026-07-01'
  },
  fieldProfiling: [
    {
      fieldName: 'stat_date',
      kind: 'datetime',
      nullRate: '0%',
      distinctCount: 730,
      minDate: '2024-01-01',
      maxDate: '2026-06-30',
      span: '2 年 6 个月',
      distribution: [
        { label: '2024 Q1', count: 10800, percent: 9 },
        { label: '2024 Q2', count: 10800, percent: 9 },
        { label: '2024 Q3', count: 10800, percent: 9 },
        { label: '2024 Q4', count: 10800, percent: 9 },
        { label: '2025 Q1', count: 10800, percent: 9 },
        { label: '2025 Q2', count: 10800, percent: 9 },
        { label: '2025 Q3', count: 10800, percent: 9 },
        { label: '2025 Q4', count: 10800, percent: 9 },
        { label: '2026 Q1', count: 10800, percent: 9 },
        { label: '2026 Q2', count: 10800, percent: 9 },
        { label: '其他', count: 12000, percent: 10 }
      ],
      updatedAt: '2026-07-01'
    },
    {
      fieldName: 'route_code',
      kind: 'identifier',
      nullRate: '0%',
      distinctCount: 1850,
      uniqueness: '98.5%',
      samplePattern: 'XX-XX（起讫城市对编码，如 SH-GZ）',
      anomalies: '1.5% 记录存在重复线路编码（不同承运商共用编码）',
      updatedAt: '2026-07-01'
    },
    {
      fieldName: 'vehicle_type',
      kind: 'categorical',
      nullRate: '0%',
      distinctCount: 6,
      topValues: [
        { label: '整车', count: 54000, percent: 45 },
        { label: '零担', count: 33600, percent: 28 },
        { label: '冷链', count: 19200, percent: 16 },
        { label: '其他', count: 13200, percent: 11 }
      ],
      updatedAt: '2026-07-01'
    },
    {
      fieldName: 'price_index',
      kind: 'numeric',
      nullRate: '0%',
      distinctCount: 842,
      min: '88.4',
      max: '126.9',
      avg: '104.6',
      median: '104.2',
      p25: '99.8',
      p75: '109.5',
      histogram: [
        { label: '90 以下', count: 3600, percent: 3 },
        { label: '90 - 100', count: 21600, percent: 18 },
        { label: '100 - 110', count: 62400, percent: 52 },
        { label: '110 - 120', count: 28800, percent: 24 },
        { label: '120 以上', count: 3600, percent: 3 }
      ],
      updatedAt: '2026-07-01'
    },
    {
      fieldName: 'yoy_rate',
      kind: 'numeric',
      nullRate: '0.8%',
      distinctCount: 516,
      min: '-14.2%',
      max: '+20.8%',
      avg: '+2.6%',
      median: '+2.1%',
      p25: '-0.8%',
      p75: '+6.2%',
      histogram: [
        { label: '-5% 以下', count: 18000, percent: 15 },
        { label: '-5% ~ 0', count: 25200, percent: 21 },
        { label: '0 ~ 5%', count: 50400, percent: 42 },
        { label: '5% ~ 10%', count: 15600, percent: 13 },
        { label: '10% 以上', count: 10800, percent: 9 }
      ],
      anomalies: '空值多为新开线路缺少去年同期基数',
      updatedAt: '2026-07-01'
    },
    {
      fieldName: 'is_peak_season',
      kind: 'boolean',
      nullRate: '0%',
      distinctCount: 2,
      trueCount: 42000,
      falseCount: 78000,
      truePercent: 35,
      updatedAt: '2026-07-01'
    }
  ]
})

const apiDetail = (): ApiDetail => ({
  method: 'GET',
  pathExample: '/api/v1/freight/price-index',
  version: 'v1',
  authentication: 'API Key（Header: X-Api-Key）',
  parameters: [
    { name: 'route_code', location: 'query', dataType: 'string', required: true, description: '线路编码，如 SH-GZ', example: 'SH-GZ' },
    { name: 'vehicle_type', location: 'query', dataType: 'string', required: false, description: '车型，缺省返回全部', example: '整车' },
    { name: 'stat_date', location: 'query', dataType: 'date', required: false, description: '统计日期，缺省取最新', example: '2026-06-28' }
  ],
  responseFields: [
    { name: 'price_index', dataType: 'decimal', description: '价格指数' },
    { name: 'mom_rate', dataType: 'decimal', description: '环比涨跌幅' },
    { name: 'yoy_rate', dataType: 'decimal', description: '同比涨跌幅' },
    { name: 'stat_date', dataType: 'date', description: '数据统计日期' }
  ],
  sandbox: {
    editableParameters: ['route_code', 'vehicle_type'],
    fixedResponse: { price_index: 106.8, mom_rate: 0.004, yoy_rate: 0.032, stat_date: '2026-06-28' },
    simulatedLatencyMs: 200
  },
  errorCodes: [
    { code: '400', message: '参数错误：route_code 缺失或格式不正确' },
    { code: '401', message: '认证失败：API Key 无效或已过期' },
    { code: '429', message: '触发限流：超出 100 QPS' },
    { code: '500', message: '服务内部错误，请稍后重试' }
  ],
  sla: '99.9% 可用性 · P95 < 300ms',
  rateLimit: '100 QPS',
  billing: '按调用次数计费，¥1.1 / 次'
})

const reportDetail = (): ReportDetail => ({
  author: '万联物流数据研究院',
  publishedAt: '2026-07-05',
  version: 'V2026-07',
  audience: '物流企业管理层、供应链负责人、行业研究人员',
  pageCount: 28,
  license: '单篇购买带水印，企业内部使用，禁止对外转售',
  catalog: [
    { title: '核心摘要', previewable: true, page: 2 },
    { title: '市场供需与运价', previewable: false, page: 8 },
    { title: '重点区域观察', previewable: false, page: 17 },
    { title: '趋势展望', previewable: false, page: 25 }
  ],
  blocks: [
    {
      id: 'blk-summary',
      title: '核心摘要',
      kind: 'chart',
      content: '本月公路物流市场延续平稳恢复态势，重点线路运价指数环比温和上行。',
      preview: 'visible',
      page: 2
    },
    {
      id: 'blk-supply-demand',
      title: '市场供需与运价',
      kind: 'text',
      content: '分车型、分线路的供需缺口测算与运价传导路径分析。',
      preview: 'masked',
      page: 8
    },
    {
      id: 'blk-region',
      title: '重点区域观察',
      kind: 'text',
      content: '长三角、珠三角、成渝三大区域的运力与货量结构对比。',
      preview: 'masked',
      page: 17
    },
    {
      id: 'blk-outlook',
      title: '趋势展望',
      kind: 'text',
      content: '下季度运价走势预判与风险提示。',
      preview: 'locked',
      page: 25
    }
  ]
})

const dashboardDetail = (): DashboardDetail => ({
  timeRange: '近 12 个月',
  updateCycle: '每周更新',
  exportRule: '会员可导出 Excel，非会员仅在线查看',
  metrics: [
    { name: '景气指数', definition: '综合运量、运价、运力的合成指数', formula: '加权合成（运量40% 运价35% 运力25%）', dimensions: ['时间', '区域'], preview: 'visible', previewValue: '52.4', previewChange: '较上月 +0.6' },
    { name: '运力供需比', definition: '可用运力与货量需求之比', formula: '可用运力 / 货量需求', dimensions: ['时间', '区域', '车型'], preview: 'masked' },
    { name: '重点线路运价', definition: 'TOP 20 线路的加权平均运价', formula: 'Σ(线路运价×货量) / Σ货量', dimensions: ['时间', '线路'], preview: 'masked' }
  ],
  panels: [
    { id: 'panel-trend', title: '景气指数走势', chartType: 'line', preview: 'visible', summary: '近 12 个月景气指数维持在荣枯线以上，6 月为 52.4', previewSeries: [49.8, 50.2, 50.6, 51.1, 50.9, 51.4, 51.8, 52.0, 51.7, 52.1, 51.8, 52.4] },
    { id: 'panel-region', title: '区域运力供需对比', chartType: 'bar', preview: 'masked', summary: '华东运力偏紧，西南相对宽松' },
    { id: 'panel-kpi', title: '本周核心指标', chartType: 'number', preview: 'masked', summary: '货量环比 +2.1%，运价环比 +0.4%' }
  ]
})

function typeDetailFor(type: ProductType): ProductTypeDetail {
  if (type === 'dataset') return { dataset: datasetDetail() }
  if (type === 'api') return { api: apiDetail() }
  if (type === 'report') return { report: reportDetail() }
  return { dashboard: dashboardDetail() }
}

interface MockInput {
  id: string
  name: string
  subtitle: string
  type: ProductType
  price: ProductPrice
  scenarios: string[]
  tags: string[]
  provider: string
  updateFrequency: string
  availability?: AvailabilityStatus
  memberIncluded?: boolean
}

/** 可信空间可售资源表单必填项（与空间「新建资源」对齐，APP 只读展示） */
function spaceMetaForMock(input: MockInput): SpaceSyncMeta {
  const isApi = input.type === 'api'
  const resourceType = input.type === 'dataset' ? '数据集' : isApi ? 'API 服务' : input.type === 'report' ? '报告' : '看板'
  return {
    resourceName: input.name,
    resourceType,
    resourceDescription: input.subtitle,
    department: input.provider.includes('研究院') ? '研究院' : '大数据局',
    industryCategory: '交通运输',
    regionCategory: '全国',
    coverageTimeRange: '2024-01 至 2026-06',
    deliveryMode: isApi ? 'API传输' : '数据表交付',
    deliveryNoteUrl: `https://space.example.com/docs/delivery-${input.id}.pdf`,
    applicationScenario: input.scenarios.join('、') || input.subtitle,
    classificationStandard: '政务数据分类标准',
    classificationPath: '政务数据分类标准 / 组织数据 / 企事业单位',
    classificationLevel: 2,
    dataSubject: '企业数据',
    personalInfo: false,
    authorizedUse: true,
    dataVolume: input.type === 'dataset' ? '约 12 万行' : '按调用计量',
    usageRestrictions: ['禁止二次转售'],
    billingNote: input.price.model === 'quote' ? '按需询价，以可信空间报价为准' : undefined,
    billingRules: isApi
      ? [
          '发起查询请求后，只有查询获得结果才计费，无业务数据返回不计费',
          '基于核算结果自动生成详细电子账单，供你核对与留存'
        ]
      : ['一次性价格模式，购买后按约定周期交付全量数据表'],
    apiDescription: isApi
      ? `${input.name} 支持按业务主键实时查询，返回指标值与同比环比；请求与响应字段见下方接口文档。`
      : undefined,
    productIntroduction: `${input.subtitle}。数据来自${input.provider}，更新频率${input.updateFrequency}。`
  }
}

function makeMock(input: MockInput): Product {
  const isTradeInSpace = input.type === 'dataset' || input.type === 'api'
  const availability = input.availability ?? 'published'
  return {
    id: input.id,
    resourceId: `res-${input.id}`,
    name: input.name,
    subtitle: input.subtitle,
    type: input.type,
    origin: isTradeInSpace ? 'trusted_space' : 'app_content',
    dealChannel: isTradeInSpace ? 'space_purchase' : 'app_payment',
    availability,
    acquisitions: isTradeInSpace
      ? ['space_purchase']
      : input.price.model === 'free'
        ? ['free']
        : input.memberIncluded
          ? ['member', 'item_purchase']
          : ['item_purchase'],
    scenarios: input.scenarios,
    provider: input.provider,
    coverage: '全国',
    updateFrequency: input.updateFrequency,
    qualityPromise: '来源可溯、口径统一',
    complianceNote: '已通过合规审核',
    price: input.price,
    status: availability === 'candidate' ? 'draft' : 'published',
    tags: input.tags,
    description: input.subtitle,
    valueProposition: input.subtitle,
    deliveryMethod: isTradeInSpace ? '可信空间交付' : 'APP 内查看',
    memberIncluded: input.memberIncluded ?? false,
    spaceProductNo: isTradeInSpace
      ? `SP-${input.id.replace(/[^a-z]/gi, '').slice(-6).toUpperCase()}`
      : undefined,
    spaceSyncedAt: isTradeInSpace ? '2026-07-10' : undefined,
    spaceMeta: isTradeInSpace ? spaceMetaForMock(input) : undefined,
    listedAt: isTradeInSpace && availability === 'published' ? '2026-07-10' : undefined,
    updatedAt: '2026-07-10',
    spaceName: isTradeInSpace ? '万联易达可信空间' : undefined,
    spaceKind: isTradeInSpace ? 'owned' : undefined,
    hasSampleData: isTradeInSpace && input.type === 'dataset' ? false : undefined,
    hasTrialApi: isTradeInSpace && input.type === 'api' ? true : undefined,
    typeDetail: typeDetailFor(input.type),
    serviceStatus: 'normal'
  }
}

const free: ProductPrice = { model: 'free' }
const memberFree: ProductPrice = { model: 'member_free' }
const item = (p: number): ProductPrice => ({ model: 'item_only', itemPrice: p })
const quote: ProductPrice = { model: 'quote', quoteNote: '按需报价' }

export const mockProducts: Product[] = [
  // ── 货运价格（Q1/Q2）：已有看板 + 报告/数据集/API ──
  makeMock({ id: 'mock-freight-report', name: '货运价格趋势月报', subtitle: '全国货运价格月度走势与区域对比', type: 'report', price: memberFree, memberIncluded: true, scenarios: ['运价趋势研判'], tags: ['运价', '月报'], provider: '万联物流研究院', updateFrequency: '每月' }),
  makeMock({ id: 'mock-freight-dataset', name: '货运价格历史明细数据集', subtitle: '分线路、分车型的货运价格历史明细', type: 'dataset', price: quote, scenarios: ['运价趋势研判', '物流成本分析'], tags: ['运价', '数据集'], provider: '交通大数据中心', updateFrequency: '每日' }),
  makeMock({ id: 'mock-freight-api', name: '货运价格指数查询 API', subtitle: '实时查询货运价格指数与环比同比', type: 'api', price: quote, scenarios: ['运价趋势研判'], tags: ['运价', '接口'], provider: '交通大数据中心', updateFrequency: '实时' }),

  // ── 公路物流行业（Q3）：已有月报 + 看板/数据集 ──
  makeMock({ id: 'mock-highway-dashboard', name: '公路物流景气指数看板', subtitle: '公路物流景气与运力供需交互看板', type: 'dashboard', price: memberFree, memberIncluded: true, scenarios: ['行业研究'], tags: ['公路物流', '看板'], provider: '万联物流研究院', updateFrequency: '每周' }),
  makeMock({ id: 'mock-highway-dataset', name: '公路物流运量明细数据集', subtitle: '分省、分月的公路物流运量明细', type: 'dataset', price: quote, scenarios: ['行业研究', '企业采购决策'], tags: ['公路物流', '数据集'], provider: '交通大数据中心', updateFrequency: '每月' }),

  // ── 港口吞吐量（Q4）：已有免费看板 + 数据集/API ──
  makeMock({ id: 'mock-port-dataset', name: '港口吞吐量明细数据集', subtitle: '主要港口集装箱与货物吞吐量明细', type: 'dataset', price: quote, scenarios: ['港口运营分析'], tags: ['港口吞吐量', '数据集'], provider: '港航数据中心', updateFrequency: '每月' }),
  makeMock({ id: 'mock-port-api', name: '港口吞吐量查询 API', subtitle: '按港口、按周期查询吞吐量数据', type: 'api', price: quote, scenarios: ['港口运营分析'], tags: ['港口吞吐量', '接口'], provider: '港航数据中心', updateFrequency: '每日' }),

  // ── 资格核验（Q5）：已有 API + 数据集/报告 ──
  makeMock({ id: 'mock-qualify-dataset', name: '司机资格核验数据集', subtitle: '道路运输从业人员资格核验样本数据', type: 'dataset', price: quote, availability: 'candidate', scenarios: ['司机合规核验'], tags: ['资格核验', '数据集'], provider: '交通运输合规中心', updateFrequency: '每月' }),
  makeMock({ id: 'mock-qualify-report', name: '从业资格核验合规月报', subtitle: '承运商资格与准入合规情况月度分析', type: 'report', price: item(199), scenarios: ['承运商准入审核'], tags: ['资格核验', '月报'], provider: '交通运输合规中心', updateFrequency: '每月' }),

  // ── 企业资质（Q6）：已有 API + 数据集/看板 ──
  makeMock({ id: 'mock-credential-dataset', name: '企业资质核验数据集', subtitle: '企业资质、证照与经营状态核验数据', type: 'dataset', price: quote, scenarios: ['供应商准入', '资质比对'], tags: ['企业资质', '数据集'], provider: '企业征信中心', updateFrequency: '每周' }),
  makeMock({ id: 'mock-credential-dashboard', name: '企业资质核验看板', subtitle: '供应商资质合规与风险交互看板', type: 'dashboard', price: memberFree, memberIncluded: true, scenarios: ['供应商准入', '资质比对'], tags: ['企业资质', '看板'], provider: '企业征信中心', updateFrequency: '每周' }),

  // ── 物流活跃度（Q7）：已有数据集 + 看板/API ──
  makeMock({ id: 'mock-activity-dashboard', name: '企业物流活跃度看板', subtitle: '企业物流活跃度画像与趋势看板', type: 'dashboard', price: memberFree, memberIncluded: true, scenarios: ['企业画像', '风险评估'], tags: ['物流活跃度', '看板'], provider: '企业征信中心', updateFrequency: '每周' }),
  makeMock({ id: 'mock-activity-api', name: '企业物流活跃度查询 API', subtitle: '按企业查询物流活跃度评分与画像', type: 'api', price: quote, scenarios: ['企业画像', '风险评估'], tags: ['物流活跃度', '接口'], provider: '企业征信中心', updateFrequency: '每日' }),

  // ── 物流政策（Q8）：已有免费报告 + 看板/数据集 ──
  makeMock({ id: 'mock-policy-dashboard', name: '物流政策解读看板', subtitle: '物流行业政策速递与影响解读看板', type: 'dashboard', price: free, scenarios: ['行业研究'], tags: ['物流政策', '看板', '免费'], provider: '万联物流研究院', updateFrequency: '每周' }),
  makeMock({ id: 'mock-policy-dataset', name: '物流政策合规数据集', subtitle: '各地物流相关政策与合规要求汇编', type: 'dataset', price: quote, availability: 'preparing', scenarios: ['行业研究'], tags: ['物流政策', '数据集'], provider: '政策研究中心', updateFrequency: '每月' })
]
