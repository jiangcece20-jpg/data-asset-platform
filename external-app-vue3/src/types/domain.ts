// 核心领域模型 —— 对应设计规格 6.2 节
// Product / ProductEnhancement / UserContext / Entitlement / Order / TrialApplication / DemandLead / ApprovalRecord

// ---------------------------------------------------------------------------
// 新增类型原语（Task 1 先定义，Task 2 完成替换）
// ---------------------------------------------------------------------------
export type StandardProductType = 'dataset' | 'api' | 'report' | 'dashboard'
export type ProductOrigin = 'asset_platform' | 'app_content' | 'trusted_space'
export type AvailabilityStatus = 'candidate' | 'preparing' | 'published' | 'paused' | 'delisted'
export type AcquisitionOption = 'free' | 'member' | 'item_purchase' | 'space_purchase'
export type PreviewMode = 'visible' | 'masked' | 'locked'
export type EntitlementPolicy =
  | { kind: 'report_version'; version: string }
  | { kind: 'term'; months: number }

export interface DatasetField {
  name: string
  dataType: string
  meaning: string
  description: string
  primaryKey: boolean
  nullable: boolean
  sensitivity?: 'L1' | 'L2' | 'L3'
}

export interface DatasetDetail {
  granularity: string
  timeRange: string
  rowCount: number
  classification: string
  qualityUpdatedAt: string
  fields: DatasetField[]
  sampleColumns: string[]
  sampleRows: Array<Record<string, string | number>>
  sampleGeneratedAt: string
  profiling: {
    completeness: string
    uniqueness: string
    nullRate: string
    distribution: string
    anomalies: string
    conclusion: string
    updatedAt: string
  }
}

export interface ApiParameter {
  name: string
  location: 'query' | 'body' | 'header'
  dataType: string
  required: boolean
  description: string
  example: string
}

export interface ApiDetail {
  method: 'GET' | 'POST'
  pathExample: string
  version: string
  authentication: string
  parameters: ApiParameter[]
  responseFields: Array<{ name: string; dataType: string; description: string }>
  sandbox: {
    editableParameters: string[]
    fixedResponse: Record<string, string | number | boolean>
    simulatedLatencyMs: number
  }
  errorCodes: Array<{ code: string; message: string }>
  sla: string
  rateLimit: string
  billing: string
}

export interface ReportContentBlock {
  id: string
  title: string
  kind: 'text' | 'metric' | 'chart' | 'pdf_page'
  content: string
  preview: PreviewMode
}

export interface ReportDetail {
  author: string
  publishedAt: string
  version: string
  audience: string
  catalog: Array<{ title: string; previewable: boolean }>
  blocks: ReportContentBlock[]
  license: string
}

export interface DashboardDetail {
  timeRange: string
  updateCycle: string
  metrics: Array<{ name: string; definition: string; formula: string; dimensions: string[]; preview: PreviewMode }>
  panels: Array<{ id: string; title: string; chartType: 'line' | 'bar' | 'number'; preview: PreviewMode; summary: string }>
  exportRule: string
}

// ---------------------------------------------------------------------------
// 旧模型（Task 2 将完成收口替换）
// ---------------------------------------------------------------------------
export type ProductType =
  | 'report' // 行业报告
  | 'dashboard' // 交互报表
  | 'dataset' // 数据集
  | 'api' // API
  | 'pq_pir' // PQ/PIR
  | 'joint_analysis' // 联合分析
  | 'solution' // 解决方案

export type ProductSource = 'app_self' | 'space_self' | 'space_third_party'

export type DealChannel = 'app_payment' | 'space_purchase' | 'inquiry'

export type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'rejected'
  | 'pending_publish'
  | 'published'
  | 'paused'
  | 'delisted'

export type TrialMode = 'unsupported' | 'self_service' | 'apply'

export type PriceModel = 'member_free' | 'member_discount' | 'item_only' | 'quote'

export interface ProductPrice {
  model: PriceModel
  itemPrice?: number
  memberDiscount?: number
  unit?: string
  quoteNote?: string
}

export interface ProductTypeDetail {
  report?: { catalogChapters: string[]; samplePages: number; methodology: string; version: string; license: string }
  dashboard?: { metrics: string[]; dimensions: string[]; timeRange: string; updateCycle: string; exportRule: string }
  dataset?: { granularity: string; coverage: string; dictionaryFields: string[]; sampleRows: number; qualityScore: string; joinKey: string }
  api?: { params: string[]; sampleResponse: string; errorCodes: string[]; sla: string; billing: string }
  pq_pir?: { verifyFields: string[]; returnForm: string; hitRate: string; privacyMechanism: string }
  joint_analysis?: { template: string; participantFields: string[]; output: string; disclosureLimit: string; cycle: string }
  solution?: { scenario: string; components: string[]; scope: string; cases: string[] }
}

export interface Product {
  id: string
  name: string
  subtitle: string
  type: ProductType
  source: ProductSource
  dealChannel: DealChannel
  scenarios: string[]
  provider: string
  coverage: string
  updateFrequency: string
  qualityPromise: string
  complianceNote: string
  trialPolicy: string
  trialMode: TrialMode
  price: ProductPrice
  status: ProductStatus
  tags: string[]
  description: string
  valueProposition: string
  deliveryMethod: string
  memberIncluded: boolean
  spaceProductNo?: string // 空间商品编号（只读，来自可信空间）
  spaceSyncedAt?: string
  updatedAt: string
  typeDetail: ProductTypeDetail
  favorite?: boolean
}

export interface ProductEnhancement {
  productId: string
  displayTitle: string
  recommendText: string
  tags: string[]
  manualDescription: string
  previewNote: string
  sortWeight: number
  recommendSlot: boolean
}

export type EnterpriseAuthStatus = 'none' | 'pending' | 'authenticated'

export interface UserContext {
  loggedIn: boolean
  name: string
  phone: string
  personalMember: boolean
  memberExpiresAt?: string
  currentEnterpriseId?: string
  currentMemberId: string
  enterpriseAuthStatus: EnterpriseAuthStatus
  role: 'member' | 'admin'
}

export interface EnterpriseMember {
  id: string
  name: string
  phone: string
  role: 'admin' | 'member'
  seatAssigned: boolean
  status: 'active' | 'invited' | 'revoked'
}

export type EnterpriseBenefitStatus = 'pending' | 'active' | 'seats_full' | 'expired'

export interface Enterprise {
  id: string
  name: string
  packageName: string
  seatsTotal: number
  seatsUsed: number
  status: EnterpriseBenefitStatus
  expiresAt: string
  members: EnterpriseMember[]
  entitledProductIds: string[]
}

export type EntitlementSource = 'personal' | 'enterprise'
export type EntitlementType = 'member' | 'item' | 'seat'

export interface Entitlement {
  id: string
  source: EntitlementSource
  type: EntitlementType
  productId?: string
  enterpriseId?: string
  validFrom: string
  validTo: string
  status: 'active' | 'expired'
}

export type OrderChannel = 'app' | 'space'
export type OrderOwnerType = 'personal' | 'enterprise'
export type AppOrderStatus =
  | 'pending_payment'
  | 'payment_cancelled'
  | 'payment_failed'
  | 'paid'
  | 'refunded'
  | 'entitlement_active'
export type SpaceOrderStatus =
  | 'pending_redirect'
  | 'space_processing'
  | 'purchase_success'
  | 'callback_delayed'
  | 'delivering'
  | 'delivered'

export interface Order {
  id: string
  channel: OrderChannel
  ownerType: OrderOwnerType
  productId: string
  productName: string
  amount: number
  status: AppOrderStatus | SpaceOrderStatus
  createdAt: string
  paidAt?: string
  contractStatus?: 'quoting' | 'contract_signed' | 'payment_confirmed' | 'not_required'
  note?: string
}

export type TrialStatus = 'not_applied' | 'pending' | 'approved' | 'rejected' | 'exhausted' | 'expired'

export interface TrialApplication {
  id: string
  productId: string
  productName: string
  mode: TrialMode
  enterpriseId?: string
  status: TrialStatus
  quota: number
  usedQuota: number
  appliedAt: string
  decidedAt?: string
}

export type DemandStatus = 'new' | 'assigned' | 'recommended' | 'custom_required' | 'not_supported' | 'closed'

export interface DemandLead {
  id: string
  question: string
  filters: string[]
  browsedProductIds: string[]
  objectDesc: string
  region: string
  timeRange: string
  updateFreq: string
  scenario: string
  expectedDelivery: string
  status: DemandStatus
  recommendedProductIds: string[]
  feedbackMessage: string
  createdAt: string
}

export interface ApprovalChecklistItem {
  item: string
  passed: boolean | null
  note: string
}

export interface ApprovalTimelineEntry {
  time: string
  actor: string
  action: string
  note?: string
}

export interface ApprovalRecord {
  id: string
  productId: string
  productName: string
  productType: ProductType
  checklist: ApprovalChecklistItem[]
  conclusion: 'approved' | 'rejected' | 'pending'
  reason: string
  reviewer: string
  timeline: ApprovalTimelineEntry[]
}

export interface AnswerSource {
  title: string
  productId?: string
  locked: boolean
}

export interface AnswerSession {
  id: string
  question: string
  mode: 'auto' | 'answer' | 'search'
  answerText: string
  lockedFollowUps: string[]
  sources: AnswerSource[]
  paywalled: boolean
  unlockedProductId?: string
  createdAt: string
}
