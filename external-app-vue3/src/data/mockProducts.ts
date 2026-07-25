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
  AvailabilityStatus
} from '@/types/domain'

// ── 各类型最小可用 typeDetail 桩 ──────────────────────────
const datasetDetail = (): DatasetDetail => ({
  granularity: '企业级',
  timeRange: '近 12 个月',
  rowCount: 120000,
  classification: 'L2',
  qualityUpdatedAt: '2026-07-01',
  fields: [],
  sampleColumns: [],
  sampleRows: [],
  sampleGeneratedAt: '2026-07-01',
  profiling: {
    completeness: '99.2%',
    uniqueness: '98.5%',
    nullRate: '0.8%',
    distribution: '分布正常',
    anomalies: '未发现异常',
    conclusion: '数据质量良好',
    updatedAt: '2026-07-01'
  }
})

const apiDetail = (): ApiDetail => ({
  method: 'GET',
  pathExample: '/api/v1/query',
  version: 'v1',
  authentication: 'API Key',
  parameters: [],
  responseFields: [],
  sandbox: { editableParameters: [], fixedResponse: {}, simulatedLatencyMs: 200 },
  errorCodes: [],
  sla: '99.9% 可用性',
  rateLimit: '100 QPS',
  billing: '按调用次数计费'
})

const reportDetail = (): ReportDetail => ({
  author: '万联物流研究院',
  publishedAt: '2026-07-01',
  version: 'V2026-07',
  audience: '行业研究 / 企业决策',
  catalog: [],
  blocks: [],
  license: '企业商用授权'
})

const dashboardDetail = (): DashboardDetail => ({
  timeRange: '近 12 个月',
  updateCycle: '每周更新',
  metrics: [],
  panels: [],
  exportRule: '会员可导出'
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

function makeMock(input: MockInput): Product {
  const isTradeInSpace = input.type === 'dataset' || input.type === 'api'
  const availability = input.availability ?? 'published'
  return {
    id: input.id,
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
    updatedAt: '2026-07-10',
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
