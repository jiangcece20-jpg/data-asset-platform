import type { Product } from '@/types/domain'
import { seedSpaceProducts } from './spaceProducts'
import { sellerRouteDatasetDetail, sellerWarehouseDatasetDetail } from '@/data/sellerDatasets'

export const seedProducts: Product[] = [
  // ── 自有看板 ──────────────────────────────────────────
  {
    id: 'prod-freight-index',
    resourceId: 'res-prod-freight-index',
    name: '全国货运价格指数',
    subtitle: '周度更新的全国公路货运价格趋势看板',
    type: 'dashboard',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['member', 'item_purchase'],
    entitlementPolicy: { kind: 'term', months: 12 },
    scenarios: ['物流成本分析', '运价趋势研判'],
    provider: 'APP 自营内容',
    coverage: '全国 31 省份 · 12 大枢纽城市对',
    updateFrequency: '每周更新',
    qualityPromise: '数据来源于平台真实交易样本，月度校准',
    complianceNote: '已脱敏，仅展示指数与趋势，不含企业级明细',
    price: { model: 'member_free', itemPrice: 299, unit: '元/12个月' },
    commerceOffers: [
      { id: 'offer-freight-personal-fixed', name: '个人固定版', subject: 'personal', price: 199, currency: 'CNY', serviceMode: 'one_time', contentKind: 'fixed_dashboard', accessScope: 'personal', allowDownload: false },
      { id: 'offer-freight-personal-updates', name: '个人持续更新版', subject: 'personal', price: 299, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, accessScope: 'personal', allowDownload: false, recommended: true },
      { id: 'offer-freight-enterprise-fixed', name: '企业固定版', subject: 'enterprise', price: 1990, currency: 'CNY', serviceMode: 'one_time', contentKind: 'fixed_dashboard', accessScope: 'named_seats', seats: 10, allowDownload: false },
      { id: 'offer-freight-enterprise-updates', name: '企业持续更新版', subject: 'enterprise', price: 2990, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, accessScope: 'named_seats', seats: 10, allowDownload: false, recommended: true }
    ],
    status: 'published',
    tags: ['热门', '会员免费'],
    description: '覆盖全国主要城市对的公路货运价格指数，支持按线路、车型、时间维度下钻分析价格走势。',
    valueProposition: '帮助物流企业和货主实时掌握运价波动，辅助采购与报价决策。',
    deliveryMethod: 'APP 在线看板，支持导出会员专享',
    memberIncluded: true,
    memberBenefits: [
      { tier: 'standard', mode: 'free' },
      { tier: 'premium', mode: 'discount', discount: 0.8 }
    ],
    listedAt: '2026-05-20',
    updatedAt: '2026-07-10',
    serviceStatus: 'normal',
    typeDetail: {
      dashboard: {
        timeRange: '近 3 年，按周粒度',
        updateCycle: '每周一 09:00',
        metrics: [
          { name: '货运价格指数', definition: '基于平台真实交易样本计算的综合性运价指数', formula: '加权均值 = Σ(线路单价 × 权重)', dimensions: ['省份', '城市对', '车型'], preview: 'visible', previewValue: '108.6', previewChange: '较上周 -0.8%' },
          { name: '环比涨跌幅', definition: '本周指数与上周指数的变化百分比', formula: '(本周 - 上周) / 上周 × 100%', dimensions: ['省份', '车型'], preview: 'visible', previewValue: '-0.8%', previewChange: '降幅收窄 0.3pct' },
          { name: '同比涨跌幅', definition: '本周指数与去年同期指数的变化百分比', formula: '(本周 - 去年同期) / 去年同期 × 100%', dimensions: ['省份', '车型'], preview: 'masked' }
        ],
        panels: [
          { id: 'panel-trend', title: '全国运价趋势', chartType: 'line', preview: 'visible', summary: '近 12 周运价指数走势', previewSeries: [101.2, 102.8, 104.1, 103.5, 105.6, 107.2, 109.4, 110.1, 109.3, 108.9, 109.5, 108.6] },
          { id: 'panel-region', title: '区域热力图', chartType: 'bar', preview: 'masked', summary: '各省份运价对比' },
          { id: 'panel-detail', title: '线路明细', chartType: 'number', preview: 'masked', summary: 'TOP 20 线路单价' }
        ],
        exportRule: '会员可导出近 12 个月数据，单品购买不支持导出'
      }
    }
  },
  {
    id: 'prod-cold-chain-dashboard',
    resourceId: 'res-prod-cold-chain-dashboard',
    name: '冷链物流温控合规看板',
    subtitle: '冷链运输温控合规监测交互看板',
    type: 'dashboard',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'paused',
    acquisitions: ['member', 'item_purchase'],
    entitlementPolicy: { kind: 'term', months: 12 },
    scenarios: ['物流成本分析'],
    provider: 'APP 自营内容',
    coverage: '重点冷链通道 42 条',
    updateFrequency: '每日更新',
    qualityPromise: '接入温控设备采样数据，异常自动标注',
    complianceNote: '已脱敏企业信息',
    price: { model: 'member_discount', itemPrice: 99, memberDiscount: 0.7, unit: '元/月' },
    status: 'paused',
    tags: ['冷链'],
    description: '监测冷链运输过程中的温控合规情况，支持按通道、企业、时间维度分析异常率。',
    valueProposition: '帮助冷链企业及时发现温控异常，降低货损与合规风险。',
    deliveryMethod: 'APP 在线看板',
    memberIncluded: false,
    listedAt: '2026-04-15',
    updatedAt: '2026-06-28',
    serviceStatus: 'normal',
    typeDetail: {
      dashboard: {
        timeRange: '近 12 个月',
        updateCycle: '每日 06:00',
        metrics: [
          { name: '温控合规率', definition: '温控达标运输次数占比', formula: '达标次数 / 总次数 × 100%', dimensions: ['通道', '企业', '时间'], preview: 'visible', previewValue: '98.6%', previewChange: '近30天 +0.4pct' },
          { name: '异常事件数', definition: '温控异常事件统计', formula: 'COUNT(异常标记 = true)', dimensions: ['通道', '企业'], preview: 'masked' }
        ],
        panels: [
          { id: 'panel-compliance', title: '合规率趋势', chartType: 'line', preview: 'visible', summary: '近 30 天合规率走势', previewSeries: [96.8, 97.2, 97.1, 97.9, 98.1, 98.0, 98.6] },
          { id: 'panel-alerts', title: '异常告警', chartType: 'bar', preview: 'masked', summary: '各通道异常次数' }
        ],
        exportRule: '暂不支持导出'
      }
    }
  },
  {
    id: 'prod-port-dashboard-free',
    resourceId: 'res-prod-port-dashboard-free',
    name: '港口吞吐量免费看板',
    subtitle: '全国主要港口吞吐量趋势免费看板',
    type: 'dashboard',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['free'],
    scenarios: ['港口运营分析'],
    provider: 'APP 自营内容',
    coverage: '全国 25 个主要港口',
    updateFrequency: '每周更新',
    qualityPromise: '基于公开数据整理',
    complianceNote: '公开数据，无敏感信息',
    price: { model: 'free' },
    status: 'published',
    tags: ['免费'],
    description: '全国主要港口货物吞吐量趋势看板，免费查看完整内容。',
    valueProposition: '快速了解港口运营趋势，辅助物流规划。',
    deliveryMethod: 'APP 在线看板',
    memberIncluded: false,
    listedAt: '2026-05-08',
    updatedAt: '2026-07-12',
    serviceStatus: 'normal',
    typeDetail: {
      dashboard: {
        timeRange: '近 24 个月',
        updateCycle: '每周五 18:00',
        metrics: [
          { name: '吞吐量', definition: '港口货物吞吐量（万吨）', formula: 'SUM(货物重量)', dimensions: ['港口', '时间'], preview: 'visible', previewValue: '8,426 万吨', previewChange: '本周 +2.1%' },
          { name: '同比增长', definition: '同比变化百分比', formula: '(本期 - 去年同期) / 去年同期 × 100%', dimensions: ['港口'], preview: 'visible', previewValue: '+4.7%', previewChange: '连续3周增长' }
        ],
        panels: [
          { id: 'panel-throughput', title: '吞吐量趋势', chartType: 'line', preview: 'visible', summary: '近 12 个月吞吐量走势', previewSeries: [7210, 7380, 7540, 7490, 7680, 7810, 7920, 8060, 7990, 8180, 8260, 8426] },
          { id: 'panel-ranking', title: '港口排名', chartType: 'bar', preview: 'visible', summary: 'TOP 10 港口吞吐量' }
        ],
        exportRule: '免费看板不支持导出'
      }
    }
  },
  // ── 行业报告 ──────────────────────────────────────────
  {
    id: 'prod-logistics-monthly',
    resourceId: 'res-prod-logistics-monthly',
    name: '中国公路物流行业月报',
    subtitle: '公路物流行业趋势与政策解读月报',
    type: 'report',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['member', 'item_purchase'],
    entitlementPolicy: { kind: 'report_version', version: 'V2026-07' },
    scenarios: ['行业研究', '企业采购决策'],
    provider: 'APP 自营内容',
    coverage: '全国公路物流行业，含 8 个细分赛道',
    updateFrequency: '每月更新',
    qualityPromise: '由行业研究团队撰写，交叉验证三方数据源',
    complianceNote: '公开发布内容，不含企业敏感信息',
    price: { model: 'member_discount', itemPrice: 199, memberDiscount: 0.6, unit: '元/篇' },
    commerceOffers: [
      { id: 'offer-monthly-personal-current', name: '个人当前版本', subject: 'personal', price: 199, currency: 'CNY', serviceMode: 'one_time', contentKind: 'current_version', accessScope: 'personal', allowDownload: true },
      { id: 'offer-monthly-personal-updates', name: '个人持续更新版', subject: 'personal', price: 499, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, accessScope: 'personal', allowDownload: true, recommended: true },
      { id: 'offer-monthly-enterprise-current', name: '企业当前版本', subject: 'enterprise', price: 1990, currency: 'CNY', serviceMode: 'one_time', contentKind: 'current_version', accessScope: 'named_seats', seats: 10, allowDownload: true },
      { id: 'offer-monthly-enterprise-updates', name: '企业持续更新版', subject: 'enterprise', price: 4990, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, accessScope: 'named_seats', seats: 10, allowDownload: true, recommended: true }
    ],
    status: 'published',
    tags: ['行业研究', '企业采购'],
    description: '系统梳理公路物流行业月度运行情况、政策动态与代表企业动向，含数据图表与专家解读。',
    valueProposition: '为企业战略规划和采购决策提供权威、及时的行业洞察。',
    deliveryMethod: 'APP 阅读器在线阅读，会员可合规下载 PDF',
    memberIncluded: true,
    memberBenefits: [
      { tier: 'standard', mode: 'discount', discount: 0.6 },
      { tier: 'premium', mode: 'free' }
    ],
    listedAt: '2026-06-01',
    updatedAt: '2026-07-05',
    serviceStatus: 'normal',
    typeDetail: {
      report: {
        author: '平台行业研究院',
        publishedAt: '2026-07-05',
        version: 'V2026-07',
        audience: '物流企业管理层、供应链负责人、行业研究人员',
        pageCount: 28,
        catalog: [
          { title: '行业运行总览', previewable: true, page: 2 },
          { title: '细分赛道动态', previewable: true, page: 8 },
          { title: '政策与监管', previewable: false, page: 14 },
          { title: '代表企业追踪', previewable: false, page: 19 },
          { title: '下月展望', previewable: false, page: 25 }
        ],
        blocks: [
          { id: 'block-overview', title: '行业运行总览', kind: 'text', content: '2026年6月，全国公路物流运行总体平稳，货运量同比增长3.2%，行业景气指数维持在荣枯线以上。', preview: 'visible', page: 2 },
          { id: 'block-freight-volume', title: '货运量数据', kind: 'metric', content: '6月公路货运量达到 35.8 亿吨，同比增长 3.2%；其中快递物流增长 8.7%，大宗物资增长 1.1%。', preview: 'masked', page: 8 },
          { id: 'block-chart', title: '运价指数走势', kind: 'chart', content: '近 12 个月运价指数走势图，显示 6 月指数为 108.6，环比下降 0.8%。', preview: 'masked', page: 11 },
          { id: 'block-policy', title: '政策与监管', kind: 'text', content: '交通运输部发布《关于进一步规范公路货运市场秩序的通知》，重点整治超载超限、非法改装等行为。', preview: 'locked', page: 14 },
          { id: 'block-enterprise', title: '代表企业追踪', kind: 'text', content: '本月重点追踪 10 家头部物流企业，其中 3 家完成新一轮融资，2 家拓展了区域网络。', preview: 'locked', page: 19 },
          { id: 'block-outlook', title: '下月展望', kind: 'text', content: '预计 7 月货运量将保持平稳增长，运价指数有望企稳回升，需关注夏季高温对运力供给的影响。', preview: 'locked', page: 25 }
        ],
        license: '企业内部使用，禁止对外转售'
      }
    }
  },
  {
    id: 'prod-industry-brief-free',
    resourceId: 'res-prod-industry-brief-free',
    name: '物流行业政策速递（免费）',
    subtitle: '每月物流政策动态免费摘要',
    type: 'report',
    origin: 'app_content',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['free'],
    scenarios: ['行业研究'],
    provider: 'APP 自营内容',
    coverage: '全国物流政策动态',
    updateFrequency: '每月更新',
    qualityPromise: '基于公开政策文件整理',
    complianceNote: '公开内容',
    price: { model: 'free' },
    status: 'published',
    tags: ['免费', '政策'],
    description: '每月汇总物流行业最新政策动态，免费阅读。',
    valueProposition: '快速了解政策变化，把握行业方向。',
    deliveryMethod: 'APP 在线阅读',
    memberIncluded: false,
    listedAt: '2026-05-12',
    updatedAt: '2026-07-03',
    serviceStatus: 'normal',
    typeDetail: {
      report: {
        author: '平台内容编辑组',
        publishedAt: '2026-07-03',
        version: 'V2026-07',
        audience: '所有用户',
        pageCount: 6,
        catalog: [
          { title: '本月政策概览', previewable: true, page: 1 },
          { title: '地方政策动态', previewable: true, page: 4 }
        ],
        blocks: [
          { id: 'block-overview', title: '本月政策概览', kind: 'text', content: '2026年6月，国家及地方共发布物流相关政策 12 项，涉及降本增效、绿色物流、安全监管等方面。', preview: 'visible', page: 1 },
          { id: 'block-local', title: '地方政策动态', kind: 'text', content: '广东、浙江、四川等省份发布了支持物流枢纽建设的配套政策，提供土地、税收等优惠。', preview: 'visible', page: 4 }
        ],
        license: '免费内容，可分享引用'
      }
    }
  },
  // ── API ────────────────────────────────────────────────
  {
    id: 'prod-qualification-api',
    resourceId: 'res-prod-qualification-api',
    name: '道路运输从业人员资格核验 API',
    subtitle: '从业资格证信息实时核验 API',
    type: 'api',
    origin: 'trusted_space',
    dealChannel: 'space_purchase',
    availability: 'published',
    acquisitions: ['space_purchase'],
    scenarios: ['司机合规核验', '承运商准入审核'],
    provider: '万联易达可信空间 · 交通运输认证机构',
    coverage: '全国从业资格证持证人员',
    updateFrequency: '不定期',
    qualityPromise: '权威机构数据源，命中率 99.2%',
    complianceNote: '核验结果仅返回是否有效，不返回证件原始影像',
    price: { model: 'quote', quoteNote: '按调用量阶梯计费，详见空间报价' },
    status: 'published',
    tags: ['合规核验', '空间商品', '合规首选'],
    description: '输入身份证号与证件编号即可核验从业资格证的有效性与准驾类型，适用于司机准入与承运商审核场景。',
    valueProposition: '将线下人工核验流程缩短至秒级响应，降低合规风险。',
    deliveryMethod: '可信空间接口调用，订单与交付状态回传 APP',
    memberIncluded: false,
    spaceProductNo: 'SPACE-API-20415',
    spaceSyncedAt: '2026-07-09 08:30',
    spaceMeta: {
      resourceName: '道路运输从业人员资格核验数据资源',
      resourceType: 'API',
      resourceDescription: '面向司机准入与承运商审核的从业资格证有效性核验能力，返回是否有效与准驾类型。',
      department: '交通运输认证机构',
      industryCategory: '交通运输',
      regionCategory: '全国',
      applicationScenario: '司机合规核验',
      coverageTimeRange: '2021-01 至今',
      deliveryMode: 'API传输',
      deliveryNoteUrl: 'https://space.example.com/docs/delivery-api-20415.pdf',
      dataSubject: '个人数据',
      personalInfo: true,
      authorizedUse: true,
      usageRestrictions: ['仅限合规核验用途', '禁止二次转售', '禁止留存原始数据'],
      restrictionNote: '需取得被核验人授权后方可调用',
      billingNote: 'API 类产品按调用量阶梯计费',
      billingRules: [
        '发起查询请求后，只有查询获得结果才计费，无业务数据返回不计费',
        '基于核算结果自动生成详细电子账单，供你核对与留存'
      ],
      apiDescription: '支持按身份证号 + 证件编号核验从业资格证有效性，返回是否有效、准驾类型与核验时间；单次请求仅返回结论，不返回证件影像。',
      productIntroduction: '面向道路运输企业的司机准入合规能力，覆盖全国从业资格证数据，秒级返回核验结论，支持批量与单条两种调用方式。',
      complianceDeclarationUrl: 'https://space.example.com/docs/compliance-api-20415.pdf',
      dataSourceDeclarationUrl: 'https://space.example.com/docs/source-api-20415.pdf',
      dataSampleUrl: 'https://space.example.com/docs/sample-api-20415.pdf',
      securityClassificationUrl: 'https://space.example.com/docs/classification-api-20415.pdf',
      qualityAssessmentUrl: 'https://space.example.com/docs/quality-api-20415.pdf',
      providerName: 'test万联易达可信数据联调测试公司3',
      providerEntityType: 'LEGAL',
      providerEntityInfo: '四川省雅安市经济开发区永兴大道南；法定代表人：可信test3；成立日期：2026-06-09；注册资本：1500万元',
      providerBrief: '专注交通运输行业数据服务，为物流、客运企业提供合规核验能力。',
      authorizationLetterUrl: 'https://space.example.com/docs/auth-letter-api-20415.pdf',
      classificationStandard: '政务数据分类标准',
      classificationPath: '政务数据分类标准 / 个人数据 / 从业资格',
      classificationLevel: 2
    },
    listedAt: '2026-06-18',
    updatedAt: '2026-07-09',
    serviceStatus: 'normal',
    recommendText: '司机准入必备，99.9% 可用性保障',
    sortWeight: 90,
    recommendSlot: true,
    spaceName: '万联易达可信空间',
    spaceKind: 'owned',
    hasTrialApi: true,
    typeDetail: {
      api: {
        method: 'POST',
        pathExample: '/api/v1/qualification/verify',
        version: 'v1.2.0',
        authentication: 'API Key（通过可信空间获取）',
        parameters: [
          { name: 'idCardNo', location: 'body', dataType: 'string', required: true, description: '身份证号', example: '110101199001010011' },
          { name: 'certificateNo', location: 'body', dataType: 'string', required: true, description: '从业资格证编号', example: 'CERT-A2-001' },
          { name: 'vehicleClass', location: 'body', dataType: 'string', required: false, description: '准驾车型（可选筛选条件）', example: 'A2' }
        ],
        responseFields: [
          { name: 'requestId', dataType: 'string', description: '请求唯一标识', example: 'req-20260709-8a3f' },
          { name: 'valid', dataType: 'boolean', description: '证件是否有效', example: 'true' },
          { name: 'vehicleClass', dataType: 'string', description: '准驾类型', example: 'A2' },
          { name: 'expireAt', dataType: 'string', description: '证件到期日期', example: '2028-05-01' }
        ],
        requestExample: `{
  "idCardNo": "110101199001010011",
  "certificateNo": "CERT-A2-001",
  "vehicleClass": "A2"
}`,
        responseExample: `{
  "requestId": "req-20260709-8a3f",
  "valid": true,
  "vehicleClass": "A2",
  "expireAt": "2028-05-01"
}`,
        sandbox: {
          editableParameters: ['idCardNo', 'certificateNo', 'vehicleClass'],
          fixedResponse: {
            requestId: 'sandbox-demo-001',
            valid: true,
            vehicleClass: 'A2',
            expireAt: '2028-05-01'
          },
          simulatedLatencyMs: 200
        },
        errorCodes: [
          { code: '40001', message: '参数缺失' },
          { code: '40401', message: '证件不存在' },
          { code: '50001', message: '服务繁忙' }
        ],
        sla: '99.9% 可用性 · 平均响应 180ms',
        rateLimit: '100 次/分钟（默认），可按需扩容',
        billing: '按调用次数阶梯计费',
        pricingPlans: [
          { name: '基础包', quota: '1 万次/月', price: '¥0.40/次' },
          { name: '标准包', quota: '10 万次/月', price: '¥0.32/次', unitNote: '较基础包省 20%', recommended: true },
          { name: '企业包', quota: '100 万次/月', price: '¥0.25/次', unitNote: '支持专属扩容' }
        ]
      }
    }
  },
  {
    id: 'prod-privacy-verify',
    resourceId: 'res-prod-privacy-verify',
    name: '企业资质隐私核验 API',
    subtitle: '基于 PIR 的企业资质匹配核验 API',
    type: 'api',
    origin: 'trusted_space',
    dealChannel: 'space_purchase',
    availability: 'published',
    acquisitions: ['space_purchase'],
    scenarios: ['供应商准入', '资质比对'],
    provider: '某省数据空间',
    coverage: '全国企业资质信息库',
    updateFrequency: '实时更新',
    qualityPromise: '隐私信息检索机制，查询方与数据方互不感知明细',
    complianceNote: '仅返回匹配结果（命中/不命中），不返回原始记录',
    price: { model: 'quote', quoteNote: '按核验次数报价' },
    status: 'published',
    tags: ['隐私核验', '隐私计算'],
    description: '基于隐私信息检索（PIR）技术，在不暴露查询内容与数据库明细的前提下完成企业资质核验。',
    valueProposition: '在保护双方隐私的同时完成资质比对，适用于敏感场景准入核验。',
    deliveryMethod: '可信空间核验服务',
    memberIncluded: false,
    spaceProductNo: 'SPACE-PIR-40217',
    spaceSyncedAt: '2026-07-06 10:00',
    spaceMeta: {
      resourceName: '企业资质隐私核验数据资源',
      resourceType: 'API',
      resourceDescription: '基于 PIR 的企业资质匹配核验，在不暴露明文库的前提下完成匹配判定。',
      department: '企业服务数据中心',
      industryCategory: '企业服务',
      regionCategory: '全国',
      applicationScenario: '企业准入审核',
      coverageTimeRange: '2022-01 至今',
      deliveryMode: 'API传输',
      deliveryNoteUrl: 'https://space.example.com/docs/delivery-pir-40217.pdf',
      dataSubject: '企业数据',
      personalInfo: false,
      authorizedUse: false,
      usageRestrictions: ['仅返回匹配结果', '禁止二次转售', '仅限内部使用'],
      billingNote: '隐私核验类产品按核验次数报价',
      billingRules: [
        '发起核验请求后，只有匹配得到结论才计费',
        '基于核算结果自动生成详细电子账单，供你核对与留存'
      ],
      apiDescription: '基于 PIR 的双向匿名匹配：请求方不暴露查询条件，数据方不暴露明文库，接口仅返回匹配结论与有效期判定。',
      productIntroduction: '面向供应商准入场景的隐私核验能力，适合在不共享明文名单的前提下完成资质比对。',
      complianceDeclarationUrl: 'https://space.example.com/docs/compliance-pir-40217.pdf',
      dataSourceDeclarationUrl: 'https://space.example.com/docs/source-pir-40217.pdf',
      securityClassificationUrl: 'https://space.example.com/docs/classification-pir-40217.pdf',
      qualityAssessmentUrl: 'https://space.example.com/docs/quality-pir-40217.pdf',
      providerName: 'test万联易达可信数据联调测试公司3',
      providerEntityType: 'LEGAL',
      providerEntityInfo: '四川省雅安市经济开发区永兴大道南；法定代表人：可信test3；成立日期：2026-06-09；注册资本：1500万元',
      providerBrief: '专注企业数据服务与隐私计算，提供多方安全计算核验能力。',
      authorizationLetterUrl: 'https://space.example.com/docs/auth-letter-pir-40217.pdf',
      classificationStandard: '政务数据分类标准',
      classificationPath: '政务数据分类标准 / 组织数据 / 企事业单位',
      classificationLevel: 2
    },
    listedAt: '2026-06-05',
    updatedAt: '2026-07-06',
    serviceStatus: 'normal',
    recommendText: '查询过程双向匿名，安全合规',
    sortWeight: 60,
    recommendSlot: false,
    spaceName: '某省数据空间',
    spaceKind: 'federated',
    hasTrialApi: false,
    typeDetail: {
      api: {
        method: 'POST',
        pathExample: '/api/v1/privacy-verify/check',
        version: 'v1.0.0',
        authentication: 'API Key（通过可信空间获取）',
        parameters: [
          { name: 'creditCode', location: 'body', dataType: 'string', required: true, description: '统一社会信用代码', example: '91110108MA01ABCDEF' },
          { name: 'qualificationType', location: 'body', dataType: 'string', required: true, description: '资质类别', example: '道路运输经营许可' },
          { name: 'validUntil', location: 'body', dataType: 'string', required: false, description: '要求有效期至', example: '2027-12-31' }
        ],
        responseFields: [
          { name: 'requestId', dataType: 'string', description: '请求唯一标识', example: 'req-pir-20260706-c51d' },
          { name: 'hit', dataType: 'boolean', description: '是否命中匹配资质', example: 'true' },
          { name: 'validRange', dataType: 'string', description: '有效期区间（命中时返回）', example: '2024-01-01 ~ 2028-12-31' }
        ],
        requestExample: `{
  "creditCode": "91110108MA01ABCDEF",
  "qualificationType": "道路运输经营许可",
  "validUntil": "2027-12-31"
}`,
        responseExample: `{
  "requestId": "req-pir-20260706-c51d",
  "hit": true,
  "validRange": "2024-01-01 ~ 2028-12-31"
}`,
        sandbox: {
          editableParameters: ['creditCode', 'qualificationType', 'validUntil'],
          fixedResponse: {
            requestId: 'sandbox-pir-001',
            hit: true,
            validRange: '2024-01-01 ~ 2028-12-31'
          },
          simulatedLatencyMs: 300
        },
        errorCodes: [
          { code: '40001', message: '参数缺失' },
          { code: '40301', message: '未授权访问' },
          { code: '50001', message: '服务繁忙' }
        ],
        sla: '99.5% 可用性 · 平均响应 250ms',
        rateLimit: '50 次/分钟（默认）',
        billing: '按核验次数报价',
        pricingPlans: [
          { name: '按量付费', quota: '无月度承诺', price: '¥1.20/次' },
          { name: '包月套餐', quota: '5 万次/月', price: '¥45,000/月', unitNote: '折合 ¥0.90/次', recommended: true }
        ]
      }
    }
  },
  // ── 数据集 ──────────────────────────────────────────────
  {
    id: 'prod-enterprise-activity',
    resourceId: 'res-prod-enterprise-activity',
    name: '企业物流活跃度数据集',
    subtitle: '企业维度物流活跃指标数据集',
    type: 'dataset',
    origin: 'trusted_space',
    dealChannel: 'space_purchase',
    availability: 'published',
    acquisitions: ['space_purchase'],
    scenarios: ['企业画像', '风险评估'],
    provider: '万联易达可信空间',
    coverage: '覆盖 260 万家活跃物流相关企业',
    updateFrequency: '每月更新',
    qualityPromise: '完整性 97%，字段级质量校验',
    complianceNote: '企业维度脱敏样本，正式使用需企业认证与空间订单',
    price: { model: 'quote', quoteNote: '按数据范围与更新周期报价' },
    datasetOffers: [
      { id: 'space-ds-basic', externalPlanCode: 'DS-10893-BASIC', name: '基础快照版', subject: 'enterprise', price: 9800, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: true, deliveryMode: 'snapshot' },
      { id: 'space-ds-year', externalPlanCode: 'DS-10893-YEAR', name: '年度订阅版', subject: 'enterprise', price: 29800, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 12, licenseKind: 'subscription', termMonths: 12, accessScope: 'enterprise_wide', allowDownload: false, deliveryMode: 'managed_connection', recommended: true },
      { id: 'space-ds-custom', externalPlanCode: 'DS-10893-PLUS', name: '扩展覆盖版', subject: 'enterprise', price: 49800, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 12, licenseKind: 'subscription', termMonths: 12, accessScope: 'enterprise_wide', allowDownload: false, deliveryMode: 'managed_connection' }
    ],
    status: 'published',
    tags: ['数据集', '空间商品', '热门数据集'],
    description: '包含企业物流发单频次、履约稳定性、区域覆盖等活跃度指标，可用于企业画像与合作评估。',
    valueProposition: '快速识别活跃、稳定的合作伙伴企业，辅助商务决策。',
    deliveryMethod: '可信空间订单交付，支持 API 或批量文件形式',
    memberIncluded: false,
    spaceProductNo: 'SPACE-DS-10893',
    spaceSyncedAt: '2026-07-08 21:10',
    spaceMeta: {
      resourceName: '全国公路货运企业活跃度数据集',
      resourceType: '数据集',
      resourceDescription: '覆盖全国公路货运企业活跃度、运力结构与区域热力的可交易数据集。',
      department: '大数据局',
      industryCategory: '物流',
      regionCategory: '广东省 / 云浮市 / 新兴县',
      applicationScenario: '城市管理',
      coverageTimeRange: '2024-01 至 2026-06',
      deliveryMode: '数据表交付',
      deliveryNoteUrl: 'https://space.example.com/docs/delivery-ds-10893.pdf',
      dataSubject: '企业数据',
      personalInfo: false,
      authorizedUse: false,
      usageRestrictions: ['使用前必须上传合规承诺文件', '禁止二次转售', '仅限内部使用'],
      restrictionNote: '跨境传输需另行合规评估',
      dataVolume: '约 3.2 GB',
      billingNote: '数据表类产品采用一次性价格模式',
      billingRules: [
        '一次性价格模式，购买后按约定周期交付全量数据表',
        '基于核算结果自动生成详细电子账单，供你核对与留存'
      ],
      productIntroduction: '覆盖全国 260 万家公路货运企业的活跃度画像，含运力结构与区域热力，可用于城市管理与产业分析。',
      complianceDeclarationUrl: 'https://space.example.com/docs/compliance-ds-10893.pdf',
      dataSourceDeclarationUrl: 'https://space.example.com/docs/source-ds-10893.pdf',
      dataSampleUrl: 'https://space.example.com/docs/sample-ds-10893.pdf',
      securityClassificationUrl: 'https://space.example.com/docs/classification-ds-10893.pdf',
      qualityAssessmentUrl: 'https://space.example.com/docs/quality-ds-10893.pdf',
      providerName: 'test万联易达可信数据联调测试公司3',
      providerEntityType: 'LEGAL',
      providerEntityInfo: '四川省雅安市经济开发区永兴大道南；法定代表人：可信test3；成立日期：2026-06-09；注册资本：1500万元',
      providerBrief: '物流行业数据服务商，覆盖全国 260 万家企业画像数据。',
      authorizationLetterUrl: 'https://space.example.com/docs/auth-letter-ds-10893.pdf',
      classificationStandard: '政务数据分类标准',
      classificationPath: '政务数据分类标准 / 组织数据 / 企事业单位',
      classificationLevel: 1
    },
    listedAt: '2026-06-30',
    updatedAt: '2026-07-08',
    serviceStatus: 'normal',
    recommendText: '260 万家企业活跃度全景覆盖',
    sortWeight: 80,
    recommendSlot: true,
    spaceName: '万联易达可信空间',
    spaceKind: 'owned',
    hasSampleData: true,
    typeDetail: {
      dataset: {
        granularity: '企业 × 月',
        timeRange: '2024-01 至 2026-06',
        rowCount: 2600000,
        classification: '企业画像数据（L2）',
        qualityUpdatedAt: '2026-07-01',
        fields: [
          { name: 'enterprise_id', dataType: 'string', meaning: '企业唯一标识（脱敏哈希）', description: '不可逆哈希值，用于跨数据集关联', primaryKey: true, nullable: false, sensitivity: 'L2', sampleValue: 'ENT-8A12' },
          { name: 'stat_month', dataType: 'date', meaning: '统计月份', description: '活跃度指标所属自然月，格式 YYYY-MM-01', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '2026-06-01' },
          { name: 'order_frequency', dataType: 'integer', meaning: '月度发单频次', description: '该企业当月通过平台发起的物流订单总数', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '156' },
          { name: 'fulfillment_rate', dataType: 'decimal', meaning: '履约完成率', description: '成功完成 / 总订单数 × 100%', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '0.94' },
          { name: 'coverage_region', dataType: 'string', meaning: '主要覆盖区域', description: '发单/收单最频繁的 3 个省份', primaryKey: false, nullable: true, profilingEnabled: true, sampleValue: '广东,浙江,江苏' },
          { name: 'activity_level', dataType: 'string', meaning: '活跃等级', description: 'A/B/C/D 四级，基于发单频次和履约率综合评定', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: 'A' }
        ],
        sampleColumns: ['enterprise_id', 'stat_month', 'order_frequency', 'fulfillment_rate', 'coverage_region', 'activity_level'],
        sampleRows: [
          { enterprise_id: 'ENT-8A12', stat_month: '2026-06-01', order_frequency: 156, fulfillment_rate: 0.94, coverage_region: '广东,浙江,江苏', activity_level: 'A' },
          { enterprise_id: 'ENT-2C31', stat_month: '2026-06-01', order_frequency: 89, fulfillment_rate: 0.87, coverage_region: '上海,江苏,安徽', activity_level: 'B' },
          { enterprise_id: 'ENT-5F90', stat_month: '2026-05-01', order_frequency: 42, fulfillment_rate: 0.76, coverage_region: '四川,重庆', activity_level: 'C' },
          { enterprise_id: 'ENT-1D47', stat_month: '2026-06-01', order_frequency: 203, fulfillment_rate: 0.91, coverage_region: '北京,河北,山东', activity_level: 'A' },
          { enterprise_id: 'ENT-9E33', stat_month: '2026-04-01', order_frequency: 28, fulfillment_rate: 0.68, coverage_region: '湖北,湖南', activity_level: 'D' }
        ],
        sampleGeneratedAt: '2026-07-01',
        profiling: {
          completeness: '97.2%',
          uniqueness: '企业ID唯一性 100%',
          nullRate: '2.8%（主要在 coverage_region 字段）',
          distribution: '活跃等级 A:15% B:28% C:38% D:19%',
          anomalies: '0.3% 记录存在发单频次异常波动（已标注）',
          conclusion: '数据质量优良，适合企业画像与风险评估场景',
          updatedAt: '2026-07-01'
        },
        fieldProfiling: [
          {
            fieldName: 'stat_month',
            kind: 'datetime',
            nullRate: '0%',
            distinctCount: 30,
            minDate: '2024-01-01',
            maxDate: '2026-06-01',
            span: '2 年 6 个月',
            distribution: [
              { label: '2024 H1', count: 520000, percent: 20 },
              { label: '2024 H2', count: 546000, percent: 21 },
              { label: '2025 H1', count: 572000, percent: 22 },
              { label: '2025 H2', count: 546000, percent: 21 },
              { label: '2026 H1', count: 416000, percent: 16 }
            ],
            anomalies: '2026-02 春节窗口企业活跃记录偏少，已按业务日历标注',
            updatedAt: '2026-07-01'
          },
          {
            fieldName: 'order_frequency',
            kind: 'numeric',
            nullRate: '0%',
            distinctCount: 412,
            min: '1',
            max: '2,180',
            avg: '76.4',
            median: '52',
            p25: '18',
            p75: '128',
            histogram: [
              { label: '1-20 次', count: 894000, percent: 34 },
              { label: '21-60 次', count: 754000, percent: 29 },
              { label: '61-150 次', count: 546000, percent: 21 },
              { label: '150 次以上', count: 406000, percent: 16 }
            ],
            updatedAt: '2026-07-01'
          },
          {
            fieldName: 'fulfillment_rate',
            kind: 'numeric',
            nullRate: '0%',
            distinctCount: 96,
            min: '0.41',
            max: '1.00',
            avg: '0.86',
            median: '0.89',
            p25: '0.78',
            p75: '0.94',
            histogram: [
              { label: '0.90 - 1.00', count: 1092000, percent: 42 },
              { label: '0.80 - 0.90', count: 806000, percent: 31 },
              { label: '0.70 - 0.80', count: 468000, percent: 18 },
              { label: '0.70 以下', count: 234000, percent: 9 }
            ],
            anomalies: '0.3% 记录履约率低于 0.5，多为当月订单量过少导致',
            updatedAt: '2026-07-01'
          },
          {
            fieldName: 'coverage_region',
            kind: 'categorical',
            nullRate: '2.8%',
            distinctCount: 31,
            topValues: [
              { label: '广东', count: 468000, percent: 18 },
              { label: '江苏', count: 390000, percent: 15 },
              { label: '浙江', count: 338000, percent: 13 },
              { label: '山东', count: 260000, percent: 10 },
              { label: '其他省份', count: 1144000, percent: 44 }
            ],
            anomalies: '空值集中在注册未满 3 个月的新企业',
            updatedAt: '2026-07-01'
          },
          {
            fieldName: 'activity_level',
            kind: 'categorical',
            nullRate: '0%',
            distinctCount: 4,
            topValues: [
              { label: 'C', count: 988000, percent: 38 },
              { label: 'B', count: 728000, percent: 28 },
              { label: 'D', count: 494000, percent: 19 },
              { label: 'A', count: 390000, percent: 15 }
            ],
            updatedAt: '2026-07-01'
          }
        ]
      }
    }
  },
  {
    id: 'prod-space-port-throughput',
    resourceId: 'res-prod-space-port-throughput',
    name: '港口吞吐量数据集',
    subtitle: '某省主要港口集装箱与货物吞吐量明细',
    type: 'dataset',
    origin: 'trusted_space',
    dealChannel: 'space_purchase',
    availability: 'published',
    acquisitions: ['space_purchase'],
    scenarios: ['港口运营分析'],
    provider: '某省数据空间',
    coverage: '某省主要港口',
    updateFrequency: '每月更新',
    qualityPromise: '来源可溯、口径统一',
    complianceNote: '企业维度脱敏，正式使用需企业认证与空间订单',
    price: { model: 'quote', quoteNote: '按数据范围与更新周期报价' },
    datasetOffers: [
      { id: 'space-port-basic', externalPlanCode: 'DS-PORT-BASIC', name: '基础快照版', subject: 'enterprise', price: 6800, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: true, deliveryMode: 'snapshot' }
    ],
    status: 'published',
    tags: ['港口吞吐量', '空间商品'],
    description: '包含某省主要港口的集装箱与货物吞吐量指标，可用于港口运营分析与产能评估。',
    valueProposition: '快速获取区域港口吞吐趋势，辅助物流枢纽规划。',
    deliveryMethod: '可信空间订单交付',
    memberIncluded: false,
    spaceProductNo: 'SPACE-DS-PORT-01',
    spaceSyncedAt: '2026-07-10 10:00',
    spaceMeta: {
      resourceName: '某省港口吞吐量数据资源',
      resourceType: '数据集',
      resourceDescription: '某省主要港口集装箱与货物吞吐量明细，面向港口运营分析与产能评估。',
      department: '港航数据中心',
      industryCategory: '交通运输',
      regionCategory: '某省主要港口',
      applicationScenario: '港口运营分析',
      coverageTimeRange: '2024-01 至 2026-06',
      deliveryMode: '数据表交付',
      deliveryNoteUrl: 'https://space.example.com/docs/delivery-ds-port-01.pdf',
      dataSubject: '公共数据',
      personalInfo: false,
      authorizedUse: true,
      usageRestrictions: ['禁止二次转售', '仅限内部使用'],
      restrictionNote: '正式使用需企业认证与空间订单',
      dataVolume: '约 1,200 行',
      billingNote: '数据表类产品采用一次性价格模式',
      billingRules: [
        '一次性价格模式，购买后按约定周期交付全量数据表',
        '基于核算结果自动生成详细电子账单，供你核对与留存'
      ],
      productIntroduction: '覆盖某省主要港口的集装箱与货物吞吐量指标，按港口 × 月汇总，可用于港口运营分析、枢纽规划与产能评估。',
      complianceDeclarationUrl: 'https://space.example.com/docs/compliance-ds-port-01.pdf',
      dataSourceDeclarationUrl: 'https://space.example.com/docs/source-ds-port-01.pdf',
      dataSampleUrl: 'https://space.example.com/docs/sample-ds-port-01.pdf',
      securityClassificationUrl: 'https://space.example.com/docs/classification-ds-port-01.pdf',
      qualityAssessmentUrl: 'https://space.example.com/docs/quality-ds-port-01.pdf',
      providerName: 'test万联易达可信数据联调测试公司3',
      providerEntityType: 'LEGAL',
      providerEntityInfo: '四川省雅安市经济开发区永兴大道南；法定代表人：可信test3；成立日期：2026-06-09；注册资本：1500万元',
      providerBrief: '港航数据服务商，提供区域港口吞吐与枢纽运营分析数据。',
      authorizationLetterUrl: 'https://space.example.com/docs/auth-letter-ds-port-01.pdf',
      classificationStandard: '政务数据分类标准',
      classificationPath: '政务数据分类标准 / 组织数据 / 企事业单位',
      classificationLevel: 2
    },
    listedAt: '2026-07-10',
    updatedAt: '2026-07-10',
    serviceStatus: 'normal',
    recommendText: '区域港口吞吐全景',
    sortWeight: 55,
    recommendSlot: false,
    spaceName: '某省数据空间',
    spaceKind: 'federated',
    hasSampleData: false,
    typeDetail: {
      dataset: {
        granularity: '港口 × 月',
        timeRange: '2024-01 至 2026-06',
        rowCount: 1200,
        classification: '港口运营数据（L2）',
        qualityUpdatedAt: '2026-07-01',
        fields: [
          { name: 'port_code', dataType: 'string', meaning: '港口编码', description: '港口唯一标识', primaryKey: true, nullable: false, sensitivity: 'L1', sampleValue: 'PORT-001' },
          { name: 'stat_month', dataType: 'date', meaning: '统计月份', description: '吞吐量指标所属自然月', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '2026-06-01' },
          { name: 'container_teu', dataType: 'integer', meaning: '集装箱吞吐量（TEU）', description: '当月集装箱标准箱量', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '125000' }
        ],
        sampleColumns: ['port_code', 'stat_month', 'container_teu'],
        sampleRows: [],
        sampleGeneratedAt: '2026-07-01',
        profiling: {
          completeness: '96.5%',
          uniqueness: '港口编码唯一性 100%',
          nullRate: '0%',
          distribution: '沿海港口占 72%',
          anomalies: '无显著异常',
          conclusion: '数据质量良好，适合港口运营分析',
          updatedAt: '2026-07-01'
        },
        fieldProfiling: [
          {
            fieldName: 'stat_month',
            kind: 'datetime',
            nullRate: '0%',
            distinctCount: 18,
            minDate: '2024-01-01',
            maxDate: '2026-06-01',
            span: '1 年 6 个月',
            distribution: [
              { label: '2024 H1', count: 400, percent: 33 },
              { label: '2024 H2', count: 400, percent: 33 },
              { label: '2025 H1', count: 400, percent: 34 }
            ],
            updatedAt: '2026-07-01'
          },
          {
            fieldName: 'container_teu',
            kind: 'numeric',
            nullRate: '0%',
            distinctCount: 120,
            min: '1200',
            max: '285000',
            avg: '48200',
            median: '35600',
            p25: '18200',
            p75: '72000',
            histogram: [
              { label: '1 万 TEU 以下', count: 240, percent: 20 },
              { label: '1-5 万 TEU', count: 480, percent: 40 },
              { label: '5-10 万 TEU', count: 360, percent: 30 },
              { label: '10 万 TEU 以上', count: 120, percent: 10 }
            ],
            updatedAt: '2026-07-01'
          }
        ]
      }
    }
  },
  {
    id: 'prod-truck-trajectory',
    resourceId: 'res-prod-truck-trajectory',
    name: '全国货车轨迹热力数据集',
    subtitle: '资产平台上架数据，购买后交付至用数模块',
    type: 'dataset',
    origin: 'asset_platform',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['item_purchase'],
    scenarios: ['运输网络规划', '线路热度分析'],
    provider: '万联数据资产平台',
    coverage: '全国主要干线 · 按区县聚合',
    updateFrequency: '每日更新',
    qualityPromise: '完整性 98.6%，每日质量巡检',
    complianceNote: '轨迹已聚合脱敏，不提供车辆级明细样本',
    price: { model: 'item_only', itemPrice: 399, unit: '元起' },
    datasetOffers: [
      { id: 'offer-truck-personal-snapshot', name: '个人快照版', subject: 'personal', price: 399, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'personal', allowDownload: true, deliveryMode: 'snapshot' },
      { id: 'offer-truck-personal-updates', name: '个人持续更新版', subject: 'personal', price: 999, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, licenseKind: 'subscription', termMonths: 12, accessScope: 'personal', allowDownload: true, deliveryMode: 'managed_connection', recommended: true },
      { id: 'offer-truck-enterprise-snapshot', name: '企业快照版', subject: 'enterprise', price: 3800, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'named_seats', seats: 10, allowDownload: true, deliveryMode: 'snapshot' },
      { id: 'offer-truck-enterprise-updates', name: '企业持续更新版', subject: 'enterprise', price: 5800, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, licenseKind: 'subscription', termMonths: 12, accessScope: 'named_seats', seats: 10, allowDownload: true, deliveryMode: 'managed_connection', recommended: true },
      { id: 'offer-truck-enterprise-continuous', name: '企业持续更新版', subject: 'enterprise', price: 5800, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, licenseKind: 'subscription', termMonths: 12, accessScope: 'named_seats', seats: 10, allowDownload: true, deliveryMode: 'managed_connection', recommended: true }
    ],
    assetSnapshot: { resourceId: 'asset-truck-trajectory', assetVersion: 'v3.2.0', syncedAt: '2026-07-30 09:20', lastCheckedAt: '2026-07-31 08:00', changeRisk: 'none' },
    status: 'published',
    tags: ['资产平台', '用数模块可用', '每日更新'],
    description: '对货车轨迹做空间网格聚合后形成的热力数据，适合运输网络规划与线路热度分析。',
    valueProposition: '无需自行接入和清洗轨迹明细，购买后可进入用数模块使用。',
    deliveryMethod: 'APP 内支付后自动交付至用数模块',
    memberIncluded: false,
    listedAt: '2026-07-26',
    updatedAt: '2026-07-30',
    serviceStatus: 'normal',
    recommendText: '购买后直接进入用数模块',
    sortWeight: 86,
    recommendSlot: true,
    typeDetail: {
      dataset: {
        granularity: '区县 × 小时', timeRange: '近 12 个月', rowCount: 18600000, classification: '聚合运营数据（L2）', qualityUpdatedAt: '2026-07-30',
        fields: [
          { name: 'district_code', dataType: 'string', meaning: '区县编码', description: '国家统计区划编码', primaryKey: true, nullable: false, profilingEnabled: true, sampleValue: '310115' },
          { name: 'time_bucket', dataType: 'datetime', meaning: '小时窗口', description: '轨迹聚合时间窗口', primaryKey: true, nullable: false, profilingEnabled: true, sampleValue: '2026-07-30 08:00' },
          { name: 'vehicle_heat', dataType: 'integer', meaning: '车辆热度', description: '窗口内脱敏聚合热度', primaryKey: false, nullable: false, profilingEnabled: true, sampleValue: '862' }
        ],
        sampleColumns: ['district_code', 'time_bucket', 'vehicle_heat'],
        sampleRows: [
          { district_code: '310115', time_bucket: '2026-07-30 08:00', vehicle_heat: 862 },
          { district_code: '320115', time_bucket: '2026-07-30 08:00', vehicle_heat: 641 }
        ],
        sampleGeneratedAt: '2026-07-30',
        profiling: { completeness: '98.6%', uniqueness: '联合主键唯一性 100%', nullRate: '1.4%', distribution: '东部干线占 48%', anomalies: '节假日波动已标注', conclusion: '适合区域热力和趋势分析', updatedAt: '2026-07-30' },
        fieldProfiling: [
          {
            fieldName: 'district_code',
            kind: 'identifier',
            nullRate: '0%',
            distinctCount: 2846,
            uniqueness: '100%',
            samplePattern: '6 位国家统计区划编码，如 310115',
            updatedAt: '2026-07-30'
          },
          {
            fieldName: 'time_bucket',
            kind: 'datetime',
            nullRate: '0%',
            distinctCount: 8760,
            minDate: '2025-07-31',
            maxDate: '2026-07-30',
            span: '12 个月',
            distribution: [
              { label: '工作日白天', count: 7440000, percent: 40 },
              { label: '工作日夜间', count: 3720000, percent: 20 },
              { label: '周末白天', count: 3720000, percent: 20 },
              { label: '周末夜间', count: 3720000, percent: 20 }
            ],
            updatedAt: '2026-07-30'
          },
          {
            fieldName: 'vehicle_heat',
            kind: 'numeric',
            nullRate: '1.4%',
            distinctCount: 2156,
            min: '12',
            max: '4,860',
            avg: '428',
            median: '316',
            p25: '142',
            p75: '580',
            histogram: [
              { label: '12-100', count: 3906000, percent: 21 },
              { label: '101-300', count: 5580000, percent: 30 },
              { label: '301-600', count: 5208000, percent: 28 },
              { label: '600 以上', count: 3906000, percent: 21 }
            ],
            anomalies: '节假日窗口热度波动已标注',
            updatedAt: '2026-07-30'
          }
        ]
      }
    }
  },
  {
    id: 'prod-warehouse-turnover-risk',
    resourceId: 'res-prod-warehouse-turnover-risk',
    name: '仓储周转效率数据集',
    subtitle: '检测到资产结构高风险变更，已暂停新购',
    type: 'dataset',
    origin: 'asset_platform',
    dealChannel: 'app_payment',
    availability: 'paused',
    acquisitions: ['item_purchase'],
    scenarios: ['仓储效率分析'],
    provider: '万联数据资产平台',
    coverage: '全国 120 个园区',
    updateFrequency: '每周更新',
    qualityPromise: '最近有效版本可继续使用',
    complianceNote: '字段结构调整待重新评估',
    price: { model: 'item_only', itemPrice: 599, unit: '元起' },
    datasetOffers: [
      { id: 'offer-warehouse-personal', name: '个人快照版', subject: 'personal', price: 599, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', licenseKind: 'snapshot', accessScope: 'personal', allowDownload: true, deliveryMode: 'snapshot' },
      { id: 'offer-warehouse-personal-continuous', name: '个人持续更新版', subject: 'personal', price: 998, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, licenseKind: 'subscription', termMonths: 12, accessScope: 'personal', allowDownload: true, deliveryMode: 'managed_connection', recommended: true },
      { id: 'offer-warehouse-enterprise', name: '企业年度订阅', subject: 'enterprise', price: 8800, currency: 'CNY', serviceMode: 'continuous', contentKind: 'continuous_updates', billingPeriodMonths: 12, maxTermMonths: 36, licenseKind: 'subscription', termMonths: 12, accessScope: 'named_seats', seats: 20, allowDownload: true, deliveryMode: 'managed_connection' }
    ],
    assetSnapshot: { resourceId: 'asset-warehouse-turnover', assetVersion: 'v2.4.0', syncedAt: '2026-07-28 18:20', lastCheckedAt: '2026-07-31 08:00', changeRisk: 'high', changeSummary: '关键字段 turnover_days 类型发生变化，等待运营确认版本迁移。' },
    status: 'paused',
    tags: ['资产平台', '变更监控', '暂停新购'],
    description: '仓储园区周转效率指标数据集。',
    valueProposition: '用于仓储运营效率横向对标。',
    deliveryMethod: '用数模块数据交付',
    memberIncluded: false,
    listedAt: '2026-06-18',
    updatedAt: '2026-07-31',
    serviceStatus: 'degraded',
    typeDetail: {
      dataset: {
        granularity: '园区 × 周', timeRange: '近 18 个月', rowCount: 9360, classification: '企业运营聚合数据（L2）', qualityUpdatedAt: '2026-07-28',
        fields: [{ name: 'park_code', dataType: 'string', meaning: '园区编码', description: '脱敏园区编码', primaryKey: true, nullable: false }],
        sampleColumns: ['park_code'], sampleRows: [{ park_code: 'PARK-031' }], sampleGeneratedAt: '2026-07-28',
        profiling: { completeness: '99.1%', uniqueness: '100%', nullRate: '0.9%', distribution: '全国分布', anomalies: '结构变更待复核', conclusion: '暂停新购，保留最近有效版本', updatedAt: '2026-07-31' }
      }
    }
  },
  {
    id: 'prod-driver-credit-candidate',
    resourceId: 'res-prod-driver-credit-candidate',
    name: '司机信用评分数据集（可申请上架）',
    subtitle: '司机维度信用与安全驾驶评分',
    type: 'dataset',
    origin: 'asset_platform',
    dealChannel: 'space_purchase',
    availability: 'candidate',
    acquisitions: ['space_purchase'],
    scenarios: ['风险评估', '司机准入'],
    provider: '资产平台 · 平台自营',
    coverage: '试点区域 5 省',
    updateFrequency: '',
    qualityPromise: '待完成质量评估',
    complianceNote: '出域审批进行中',
    price: { model: 'quote', quoteNote: '待定价' },
    status: 'draft',
    tags: ['筹备中'],
    description: '尚在资产商品化与出域审批阶段的司机信用评分数据集，可提交求上架需求。',
    valueProposition: '未来可用于司机准入与风险定价。',
    deliveryMethod: '待发布',
    memberIncluded: false,
    listedAt: '2026-07-02',
    updatedAt: '2026-07-11',
    serviceStatus: 'normal',
    typeDetail: {
      dataset: {
        granularity: '司机 × 月',
        timeRange: '待定',
        rowCount: 0,
        classification: '个人信息数据（L3）',
        qualityUpdatedAt: '',
        fields: [
          { name: 'driver_id', dataType: 'string', meaning: '司机唯一标识（脱敏哈希）', description: '不可逆哈希值', primaryKey: true, nullable: false, sensitivity: 'L3' },
          { name: 'safety_score', dataType: 'integer', meaning: '安全驾驶评分', description: '0-100 分，基于驾驶行为综合评定', primaryKey: false, nullable: false, sensitivity: 'L2' },
          { name: 'violation_count', dataType: 'integer', meaning: '违规次数', description: '近 12 个月违规次数', primaryKey: false, nullable: false }
        ],
        sampleColumns: [],
        sampleRows: [],
        sampleGeneratedAt: '',
        profiling: {
          completeness: '资料准备中',
          uniqueness: '资料准备中',
          nullRate: '资料准备中',
          distribution: '资料准备中',
          anomalies: '资料准备中',
          conclusion: '资料准备中，上架审核通过后提供脱敏样例与探查报告',
          updatedAt: ''
        }
      }
    }
  },
  // ── 入驻商家数据集 ──────────────────────────────────────────
  {
    id: 'prod-seller-route-board',
    resourceId: 'res-prod-seller-route-board',
    name: '华东干线时效数据集',
    subtitle: '入驻商家提供的干线到达时效与延误分析数据集',
    type: 'dataset',
    origin: 'seller_market',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['item_purchase'],
    entitlementPolicy: { kind: 'term', months: 12 },
    scenarios: ['线路时效分析', '延误预警'],
    provider: '入驻商家 · 陈静',
    sellerId: 'seller-chenjing',
    sellerName: '陈静',
    dataProvenance: 'owned',
    settlementModeDefault: 'platform_collect',
    coverage: '沪苏浙皖主要干线 86 条',
    updateFrequency: '每日更新',
    qualityPromise: '基于卖家自有运单样本，口径见字段说明',
    complianceNote: '已脱敏企业与司机明细；不含个人信息对外售卖',
    price: { model: 'item_only', itemPrice: 199, unit: '元/12个月' },
    commerceOffers: [
      { id: 'offer-seller-route-personal', name: '个人单品', subject: 'personal', price: 199, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'personal', allowDownload: false, recommended: true },
      { id: 'offer-seller-route-enterprise', name: '企业单品', subject: 'enterprise', price: 1990, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: false }
    ],
    status: 'published',
    tags: ['入驻商家', '干线', '时效'],
    description: '华东干线准点率、平均时效与延误单量，按线路与车型汇总。由入驻商家基于用数成果上架。',
    valueProposition: '帮助货主与承运商快速定位延误瓶颈。',
    deliveryMethod: '平台收款后由运营开通数据集查看与样例',
    memberIncluded: false,
    hasSampleData: true,
    listedAt: '2026-08-01',
    updatedAt: '2026-08-08',
    serviceStatus: 'normal',
    recommendSlot: true,
    recommendText: '入驻商家 · 干线时效',
    sortWeight: 80,
    typeDetail: {
      dataset: sellerRouteDatasetDetail
    }
  },
  {
    id: 'prod-seller-warehouse-board',
    resourceId: 'res-prod-seller-warehouse-board',
    name: '仓网周转健康数据集',
    subtitle: '入驻商家仓网周转与积压风险数据集',
    type: 'dataset',
    origin: 'seller_market',
    dealChannel: 'app_payment',
    availability: 'published',
    acquisitions: ['item_purchase'],
    entitlementPolicy: { kind: 'term', months: 6 },
    scenarios: ['仓储运营'],
    provider: '入驻商家 · 张数',
    sellerId: 'seller-zhangshu',
    sellerName: '张数',
    dataProvenance: 'derived',
    settlementModeDefault: 'platform_collect',
    coverage: '华东 12 仓',
    updateFrequency: '每周更新',
    qualityPromise: '基于已购数据集二次加工，受源许可约束',
    complianceNote: '衍生数据；使用受限，禁止再转售明细',
    price: { model: 'item_only', itemPrice: 129, unit: '元/6个月' },
    commerceOffers: [
      { id: 'offer-seller-wh-personal', name: '个人单品', subject: 'personal', price: 129, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'personal', allowDownload: false, recommended: true },
      { id: 'offer-seller-wh-enterprise', name: '企业单品', subject: 'enterprise', price: 1290, currency: 'CNY', serviceMode: 'one_time', contentKind: 'snapshot', accessScope: 'enterprise_wide', allowDownload: false }
    ],
    status: 'published',
    tags: ['入驻商家', '仓储'],
    description: '仓网周转天数、积压 SKU 与补货建议，来源为入驻商家衍生加工成果。',
    valueProposition: '快速识别高积压仓与滞销品类。',
    deliveryMethod: '平台收款后由运营开通数据集查看与样例',
    memberIncluded: false,
    hasSampleData: true,
    listedAt: '2026-08-05',
    updatedAt: '2026-08-08',
    serviceStatus: 'normal',
    typeDetail: {
      dataset: sellerWarehouseDatasetDetail
    }
  }

]
