// 核心领域模型 —— 对应设计规格 6.2 节
// Product / ProductEnhancement / UserContext / Entitlement / Order / TrialApplication / DemandLead / ApprovalRecord

import type { ServiceStatus, EntitlementStatus } from './reverseFlow'
import type { SellingShot } from '@/domain/sellingShotTemplate'

// ---------------------------------------------------------------------------
// 新增类型原语（Task 1 先定义，Task 2 完成替换）
// ---------------------------------------------------------------------------
export type StandardProductType = 'dataset' | 'api' | 'report' | 'dashboard'
export type ProductOrigin = 'asset_platform' | 'app_content' | 'trusted_space' | 'user_created' | 'seller_market'
export type SettlementMode = 'platform_collect' | 'seller_self'
export type DataProvenance = 'owned' | 'derived'
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
  /** 数据粒度（运营配置，非必填；空则前台不展示） */
  granularity?: string
  /** 时间范围（运营配置，非必填；空则前台不展示） */
  timeRange?: string
  /** 数据行数（运营配置，非必填；空则前台不展示） */
  rowCount?: number
  /**
   * 字段数展示口径（运营配置，非必填）。
   * - undefined：未配置，有字段清单时回落为 fields.length
   * - null：运营明确留空，前台不展示
   * - number：按配置展示
   */
  fieldCount?: number | null
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
  metrics: Array<{
    name: string
    definition: string
    formula: string
    dimensions: string[]
    preview: PreviewMode
    /** 商品预览使用的示例/公开值；生产环境由关联看板或用数平台提供。 */
    previewValue?: string
    /** 示例/公开值的趋势说明。 */
    previewChange?: string
  }>
  panels: Array<{
    id: string
    title: string
    chartType: 'line' | 'bar' | 'number'
    preview: PreviewMode
    summary: string
    /** 商品预览使用的脱敏趋势序列；生产环境由关联看板或用数平台提供。 */
    previewSeries?: number[]
  }>
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

/** 个人会员等级：普通会员 / 高级会员 */
export type MemberTier = 'standard' | 'premium'

/** 商品对某一会员等级的权益：同级仅允许免费或折扣其一 */
export interface MemberBenefitConfig {
  tier: MemberTier
  mode: 'free' | 'discount'
  /** 折扣系数 0~1，仅 mode=discount 时有效；如 0.6 表示 6 折 */
  discount?: number
}

export interface ProductPrice {
  model: PriceModel
  itemPrice?: number
  /** 兼容字段：优先表示普通会员折扣；多等级以 memberBenefits 为准 */
  memberDiscount?: number
  /** 高级会员折扣系数；无 memberBenefits 时的兼容字段 */
  premiumMemberDiscount?: number
  unit?: string
  quoteNote?: string
}

export type DatasetOfferSubject = 'personal' | 'enterprise'
export type DatasetLicenseKind = 'subscription' | 'snapshot'
export type DatasetAccessScope = 'personal' | 'named_seats' | 'enterprise_wide'
export type DatasetDeliveryMode = 'managed_connection' | 'snapshot'

/** APP 统一销售方案：所有商品类型共用主体、交付方式和期限定价。 */
export type CommerceServiceMode = 'one_time' | 'continuous'
export type CommerceContentKind =
  | 'snapshot'
  | 'current_version'
  | 'fixed_dashboard'
  | 'quota_package'
  | 'continuous_updates'
  | 'continuous_service'

export interface CommerceOffer {
  id: string
  name: string
  subject: DatasetOfferSubject
  price: number
  currency: 'CNY'
  serviceMode: CommerceServiceMode
  contentKind: CommerceContentKind
  /** 持续方案每几个自然月计一次价。 */
  billingPeriodMonths?: number
  /** 持续方案允许一次购买的最长月数；不得配置为永久。 */
  maxTermMonths?: number
  accessScope?: DatasetAccessScope
  seats?: number
  allowDownload?: boolean
  recommended?: boolean
  externalPlanCode?: string
}

/** 数据集销售方案：资产平台来源由 APP 配置；可信空间来源仅同步展示。 */
export interface DatasetOffer extends CommerceOffer {
  licenseKind: DatasetLicenseKind
  /** @deprecated 兼容旧 Mock；新方案使用 billingPeriodMonths + maxTermMonths。 */
  termMonths?: number
  accessScope: DatasetAccessScope
  allowDownload: boolean
  deliveryMode: DatasetDeliveryMode
}

export type AssetChangeRisk = 'none' | 'low' | 'medium' | 'high'

/** 资产平台商品绑定的不可变资产版本快照。 */
export interface AssetProductSnapshotRef {
  resourceId: string
  assetVersion: string
  syncedAt: string
  lastCheckedAt: string
  changeRisk: AssetChangeRisk
  changeSummary?: string
}

export interface ProductTypeDetail {
  dataset?: DatasetDetail
  api?: ApiDetail
  report?: ReportDetail
  dashboard?: DashboardDetail
}

/** 可信空间元数据同步字段：空间侧为权威源，本地只读不可编辑 */
export interface SpaceSyncMeta {
  // --- 基本信息（可售空间必填，同步只读） ---
  /** 数据资源名 */
  resourceName?: string
  /** 资源类型（如 数据集 / API / 报告） */
  resourceType?: string
  /** 资源描述 */
  resourceDescription?: string
  /** 部门 */
  department?: string
  /** 所属行业 */
  industryCategory?: string
  /** 数据范围（行政区划等，如 广东省 / 云浮市 / 新兴县） */
  regionCategory?: string
  /** 覆盖时间范围（如 2023-01 至今） */
  coverageTimeRange?: string
  /** 交付方式（空间侧枚举，如 API传输 / 数据表交付 / 文件下载） */
  deliveryMode?: string
  /** 交付方式说明（文件链接） */
  deliveryNoteUrl?: string
  /** 应用场景（空间侧单值） */
  applicationScenario?: string
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
  /** 计费规则明细（空间侧多条说明，如按结果计费、电子账单） */
  billingRules?: string[]
  /** 接口描述（空间侧富文本，API 类型专属，并入接口文档页签） */
  apiDescription?: string
  /** 产品介绍（空间侧富文本，独立页签展示） */
  productIntroduction?: string
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
  // --- 分类分级（可售空间必填，同步只读） ---
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
  /** 入驻商家卖家档案 ID（origin=seller_market） */
  sellerId?: string
  /** 前台卖家展示名 */
  sellerName?: string
  /** 数据来源声明：自有 / 已购衍生 */
  dataProvenance?: DataProvenance
  /** 默认结算模式；入驻商家 MVP 为 seller_self */
  settlementModeDefault?: SettlementMode
  coverage: string
  updateFrequency: string
  qualityPromise: string
  complianceNote: string
  price: ProductPrice
  /** APP 商品统一可售卖周期；下单时快照到订单，单位为月。 */
  salePeriodMonths?: number
  /** APP 内个人/企业单品价；旧多方案数据在读取时收口为每个主体一条价格。 */
  commerceOffers?: CommerceOffer[]
  /** 数据集价格与交付兼容字段；APP 购买时每个主体只使用一条单品价。 */
  datasetOffers?: DatasetOffer[]
  /** 资产平台来源商品的版本化绑定与监控摘要。 */
  assetSnapshot?: AssetProductSnapshotRef
  status: ProductStatus
  tags: string[]
  description: string
  valueProposition: string
  deliveryMethod: string
  /** @deprecated 请以 memberBenefits 为准；任一等级配置免费时为 true */
  memberIncluded: boolean
  /** 按会员等级配置的免费/折扣权益；同级互斥，跨级独立 */
  memberBenefits?: MemberBenefitConfig[]
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
  /** 入驻商家上架时按模版上传的报表卖点截图；自营商品为空 */
  sellingShots?: SellingShot[]
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
  /** 当前个人会员等级；无会员时为空 */
  personalMemberTier?: MemberTier
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
  purchasePolicy: {
    /** 是否允许普通成员以企业主体发起采购。 */
    memberPurchaseAllowed: boolean
    /** 普通成员发起企业采购后是否必须由管理员审批。 */
    memberPurchaseApprovalRequired: boolean
  }
}

export type EntitlementSource = 'personal' | 'enterprise'
export type EntitlementType = 'member' | 'item' | 'seat' | 'dataset'

export interface Entitlement {
  id: string
  source: EntitlementSource
  type: EntitlementType
  productId?: string
  productVersion?: string
  enterpriseId?: string
  ownerId: string
  /** 会员权益对应的等级；仅 type=member 使用 */
  memberTier?: MemberTier
  validFrom: string
  validTo?: string
  /** 数据集/报告持续更新截止日；到期停止新版本，已交付内容仍保留。 */
  updateValidTo?: string
  status: EntitlementStatus
  reverseWorkOrderId?: string
  refundId?: string
  orderId?: string
  datasetOfferId?: string
  commerceOfferId?: string
  serviceMode?: CommerceServiceMode
  selectedTermMonths?: number
  licenseKind?: DatasetLicenseKind
  assetVersion?: string
  accessScope?: DatasetAccessScope
  assignedMemberIds?: string[]
  allowDownload?: boolean
  biDeliveryId?: string
}

export type OrderChannel = 'app'
export type OrderOwnerType = 'personal' | 'enterprise'
export type PaymentMethod =
  | 'personal_online'
  | 'enterprise_balance'
  | 'enterprise_contract'
  | 'enterprise_bank_transfer'
export type AppOrderStatus =
  | 'pending_approval'
  | 'approval_rejected'
  | 'pending_payment'
  | 'payment_cancelled'
  | 'payment_failed'
  | 'payment_pending_confirmation'
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
  productType?: ProductType
  operatorMemberId?: string
  datasetOfferId?: string
  commerceOfferId?: string
  serviceMode?: CommerceServiceMode
  selectedTermMonths?: number
  approvalRequestId?: string
  paymentMethod?: PaymentMethod
  entitlementId?: string
  biDeliveryId?: string
  // 交易售后（§9）新增字段
  idempotencyKey?: string
  entitlementGranted?: boolean
  entitlementGrantAttempts?: number
  entitlementPendingManual?: boolean
  // 运营确认线下付款时的开通日期；为空表示按确认时间开通
  activationDate?: string
  /** 入驻商家订单：卖家 ID */
  sellerId?: string
  /** 结算模式；入驻商家 MVP 为 seller_self */
  settlementMode?: SettlementMode
  /** 买家声称已付款时间（自收款） */
  buyerPaidClaimedAt?: string
  /** 卖家确认到账时间 */
  sellerConfirmedAt?: string
  /** 卖家拒认/争议原因 */
  disputeReason?: string
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
