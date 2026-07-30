// 核心领域模型 —— 对应设计规格 6.2 节
// Product / ProductEnhancement / UserContext / Entitlement / Order / TrialApplication / DemandLead / ApprovalRecord

import type { ServiceStatus, EntitlementStatus } from './reverseFlow'

// ---------------------------------------------------------------------------
// 新增类型原语（Task 1 先定义，Task 2 完成替换）
// ---------------------------------------------------------------------------
export type StandardProductType = 'dataset' | 'api' | 'report' | 'dashboard'
export type ProductOrigin = 'asset_platform' | 'app_content' | 'trusted_space' | 'user_created'
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
  /** 后台开关：该字段是否对外开放单字段数据探查（默认关闭，敏感字段不应开启） */
  profilingEnabled?: boolean
  /** 字段级示例值（可信空间同步商品可从空间元数据获取） */
  sampleValue?: string
}

/** 字段探查分类 */
export type FieldProfilingKind = 'numeric' | 'categorical' | 'identifier' | 'datetime' | 'boolean'

/** 直方图/分布条目 */
export interface DistributionBucket {
  label: string
  count: number
  percent: number
}

/** 单字段数据探查公共字段 */
interface FieldProfilingBase {
  fieldName: string
  kind: FieldProfilingKind
  /** 空值率，如 "0.8%" */
  nullRate: string
  /** 唯一值数量 */
  distinctCount: number
  /** 异常提示，无异常可缺省 */
  anomalies?: string
  updatedAt: string
}

/** 数值型探查（integer / decimal / float） */
export interface NumericFieldProfiling extends FieldProfilingBase {
  kind: 'numeric'
  min: string
  max: string
  avg: string
  median?: string
  p25?: string
  p75?: string
  /** 区间分布直方图 */
  histogram: DistributionBucket[]
}

/** 分类型探查（string 低基数） */
export interface CategoricalFieldProfiling extends FieldProfilingBase {
  kind: 'categorical'
  /** TOP 值分布 */
  topValues: DistributionBucket[]
}

/** 标识型探查（string 高基数 / 主键） */
export interface IdentifierFieldProfiling extends FieldProfilingBase {
  kind: 'identifier'
  /** 唯一性百分比，如 "100%" */
  uniqueness: string
  /** 脱敏样例格式，如 "ENT-XXXX（脱敏哈希）" */
  samplePattern?: string
}

/** 时间型探查（date / timestamp） */
export interface DateTimeFieldProfiling extends FieldProfilingBase {
  kind: 'datetime'
  minDate: string
  maxDate: string
  /** 时间跨度描述，如 "2 年 6 个月" */
  span: string
  /** 按月/季分布 */
  distribution: DistributionBucket[]
}

/** 布尔型探查（boolean） */
export interface BooleanFieldProfiling extends FieldProfilingBase {
  kind: 'boolean'
  trueCount: number
  falseCount: number
  /** TRUE 占比 0-100 */
  truePercent: number
}

/** 单字段数据探查结果（对外版，数值已做区间化/脱敏处理） */
export type FieldProfiling =
  | NumericFieldProfiling
  | CategoricalFieldProfiling
  | IdentifierFieldProfiling
  | DateTimeFieldProfiling
  | BooleanFieldProfiling

export interface DatasetDetail {
  granularity: string
  timeRange: string
  rowCount: number
  classification: string
  qualityUpdatedAt: string
  fields: DatasetField[]
  sampleColumns: string[]
  sampleRows: Array<Record<string, string | number | boolean>>
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
  /** 单字段探查结果集；仅 fields 中 profilingEnabled 的字段会在前台出现 */
  fieldProfiling?: FieldProfiling[]
}

export interface ApiParameter {
  name: string
  location: 'query' | 'body' | 'header'
  dataType: string
  required: boolean
  description: string
  example: string
}

/** API 套餐价格（可信空间可同步的计费层元数据；多套餐时详情页同时展示全部） */
export interface ApiPricePlan {
  name: string
  /** 套餐规格，如「10 万次/月」 */
  quota: string
  /** 价格文本，如「¥0.32/次」「¥2,800/月」 */
  price: string
  /** 折合说明，如「折合 ¥0.90/次」 */
  unitNote?: string
  recommended?: boolean
}

export interface ApiDetail {
  method: 'GET' | 'POST'
  pathExample: string
  version: string
  authentication: string
  parameters: ApiParameter[]
  responseFields: Array<{ name: string; dataType: string; description: string; example?: string }>
  /** 请求示例 JSON（可信空间可同步；存在时接口文档 Tab 展示并支持一键复制） */
  requestExample?: string
  /** 返回示例 JSON（可信空间可同步；存在时接口文档 Tab 展示并支持一键复制） */
  responseExample?: string
  sandbox: {
    editableParameters: string[]
    fixedResponse: Record<string, string | number | boolean>
    simulatedLatencyMs: number
  }
  errorCodes: Array<{ code: string; message: string }>
  sla: string
  rateLimit: string
  billing: string
  /** 多套餐价格；存在时购买面板同时展示全部套餐 */
  pricingPlans?: ApiPricePlan[]
}

export interface ReportContentBlock {
  id: string
  title: string
  kind: 'text' | 'metric' | 'chart' | 'pdf_page'
  content: string
  preview: PreviewMode
  /** 所在页码，用于目录与阅读器定位 */
  page?: number
}

export interface ReportDetail {
  author: string
  publishedAt: string
  version: string
  audience: string
  catalog: Array<{ title: string; previewable: boolean; page?: number }>
  /** 报告总页数 */
  pageCount?: number
  blocks: ReportContentBlock[]
  license: string
  // 数据源绑定：真实报告文件/在线阅读地址，及在资产/BI 平台的报表编号
  sourceUrl?: string
  boundAssetId?: string
}

export interface DashboardDetail {
  timeRange: string
  updateCycle: string
  metrics: Array<{ name: string; definition: string; formula: string; dimensions: string[]; preview: PreviewMode }>
  panels: Array<{ id: string; title: string; chartType: 'line' | 'bar' | 'number'; preview: PreviewMode; summary: string }>
  exportRule: string
  // 数据源绑定：BI 看板嵌入地址，及在资产/BI 平台的看板编号
  sourceUrl?: string
  boundAssetId?: string
}

// ---------------------------------------------------------------------------
// 收口后的商品模型
// ---------------------------------------------------------------------------
export type ProductType = StandardProductType
export type DealChannel = 'app_payment' | 'space_purchase'

export type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'rejected'
  | 'pending_publish'
  | 'published'
  | 'paused'
  | 'delisted'

export type TrialMode = 'unsupported' | 'self_service' | 'apply'

export type PriceModel = 'free' | 'member_free' | 'member_discount' | 'item_only' | 'quote'

export interface ProductPrice {
  model: PriceModel
  itemPrice?: number
  memberDiscount?: number
  unit?: string
  quoteNote?: string
}

export interface ProductTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
}

/** 可信空间元数据同步字段：空间侧为权威源，本地只读不可编辑 */
export interface SpaceSyncMeta {
  industryCategory?: string
  regionCategory?: string
  /** 数据主体：企业数据 / 个人数据 / 公共数据 */
  dataSubject?: string
  personalInfo?: boolean
  authorizedUse?: boolean
  /** 使用限制（结构化枚举，对齐空间侧多选项） */
  usageRestrictions?: string[]
  restrictionNote?: string
  /** 数据规模（容量维度，如 22 GB） */
  dataVolume?: string
  /** 计费模式说明（如：数据表类产品采用一次性价格模式） */
  billingNote?: string
  // --- 声明信息 ---
  /** 合法合规声明（文件链接） */
  complianceDeclarationUrl?: string
  /** 数据来源声明（文件链接） */
  dataSourceDeclarationUrl?: string
  /** 数据样例（文件链接） */
  dataSampleUrl?: string
  /** 安全分类分级（文件链接） */
  securityClassificationUrl?: string
  /** 数据质量、产品价值评估报告（文件链接） */
  qualityAssessmentUrl?: string
  // --- 提供方信息 ---
  /** 提供方名称 */
  providerName?: string
  /** 提供方主体类型（如 LEGAL） */
  providerEntityType?: string
  /** 提供方主体信息（注册地址/法人/成立日期/注册资本等） */
  providerEntityInfo?: string
  /** 提供方简介 */
  providerBrief?: string
  /** 授权委托书（文件链接） */
  authorizationLetterUrl?: string
  // --- 分类分级 ---
  /** 分类标准（如"政务数据分类标准"） */
  classificationStandard?: string
  /** 分类路径（如"政务数据分类标准 / 组织数据 / 企事业单位"） */
  classificationPath?: string
  /** 分级（如 1、2、3） */
  classificationLevel?: number
}

export interface Product {
  id: string
  resourceId: string
  name: string
  subtitle: string
  type: ProductType
  origin: ProductOrigin
  dealChannel: DealChannel
  availability: AvailabilityStatus
  acquisitions: AcquisitionOption[]
  entitlementPolicy?: EntitlementPolicy
  scenarios: string[]
  provider: string
  coverage: string
  updateFrequency: string
  qualityPromise: string
  complianceNote: string
  price: ProductPrice
  status: ProductStatus
  tags: string[]
  description: string
  valueProposition: string
  deliveryMethod: string
  memberIncluded: boolean
  spaceProductNo?: string
  spaceSyncedAt?: string
  /** 可信空间同步的描述/合规层元数据（space_purchase 商品只读展示，PRD §11） */
  spaceMeta?: SpaceSyncMeta
  /** 上架时间：空间商品=空间上架时间（随元数据同步）；本地商品=资产管理上架时间（listResource 写入） */
  listedAt?: string
  /** 平台记录更新时间（商品信息编辑触发，不对外展示） */
  updatedAt: string
  typeDetail: ProductTypeDetail
  favorite?: boolean
  serviceStatus: ServiceStatus
  salesReviewOwner?: string
  salesReviewAt?: string
  // --- 运营增强（原 Enhancement，已合并为商品字段） ---
  /** 推荐语（卡片副标题优先使用） */
  recommendText?: string
  /** 排序权重（越大越靠前） */
  sortWeight?: number
  /** 是否进入推荐位 */
  recommendSlot?: boolean
}

/** @deprecated Enhancement 已合并进 Product，保留类型别名兼容过渡 */
export interface ProductEnhancement {
  productId: string
  recommendText: string
  tags: string[]
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
  productVersion?: string
  enterpriseId?: string
  ownerId: string
  validFrom: string
  validTo?: string
  status: EntitlementStatus
  reverseWorkOrderId?: string
  refundId?: string
}

export type OrderChannel = 'app'
export type OrderOwnerType = 'personal' | 'enterprise'
export type AppOrderStatus =
  | 'pending_payment'
  | 'payment_cancelled'
  | 'payment_failed'
  | 'paid'
  | 'refunded'
  | 'entitlement_active'
export interface Order {
  id: string
  channel: OrderChannel
  ownerType: OrderOwnerType
  ownerId: string
  productId: string
  productName: string
  amount: number
  status: AppOrderStatus
  createdAt: string
  paidAt?: string
  contractStatus?: 'quoting' | 'contract_signed' | 'payment_confirmed' | 'not_required'
  note?: string
  // 交易售后（§9）新增字段
  idempotencyKey?: string
  entitlementGranted?: boolean
  entitlementGrantAttempts?: number
  entitlementPendingManual?: boolean
}

export type TrialStatus = 'not_applied' | 'pending' | 'approved' | 'rejected' | 'exhausted' | 'expired'

export interface TrialApplication {
  id: string
  productId: string
  productName: string
  mode: TrialMode
  enterpriseId?: string
  ownerId: string
  status: TrialStatus
  quota: number
  usedQuota: number
  appliedAt: string
  decidedAt?: string
}

export type DemandStatus =
  | 'new'
  | 'assigned'
  | 'aggregated'
  | 'recommended'
  | 'custom_required'
  | 'not_supported'
  | 'closed'
  | 'withdrawn'
  | 'reopened'

export type DemandSource =
  | 'search_miss'
  | 'inquiry'
  | 'listing_request'
  | 'trial_feedback'
  | 'recommend_mismatch'
  | 'post_delist_alt'

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
  // 需求回流闭环（§7）新增字段
  ownerId: string
  source: DemandSource
  supplyTaskId?: string
  mergedIntoId?: string
  reopenedFromId?: string
  priorConclusion?: string
  subscribed: boolean
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

// ---------------------------------------------------------------------------
// 求上架模型
// ---------------------------------------------------------------------------
export type ListingRequestStatus = 'submitted' | 'evaluating' | 'preparing' | 'published' | 'unsupported'

export interface ListingRequestPayload {
  productId: string
  productName: string
  userId: string
  scenario: string
  requestedScope: string
  timeRange: string
  updateFrequency: string
  expectedAvailableAt: string
  note: string
}

export interface ListingRequest {
  id: string
  productId: string
  productName: string
  userId: string
  scenario: string
  requestedScope: string
  timeRange: string
  updateFrequency: string
  expectedAvailableAt: string
  note: string
  status: ListingRequestStatus
  feedbackMessage: string
  alternativeProductIds: string[]
  createdAt: string
  updatedAt: string
}
