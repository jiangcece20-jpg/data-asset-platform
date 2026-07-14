import type { ChatbiResult, FindResult, MetricDef, TableAsset } from '../types/aiFind';

/** 表资产（schema 用于表信息页与详情抽屉） */
export const aiFindTables: Record<string, TableAsset> = {
  dws_trade_channel_day: {
    name: 'dws_trade_channel_day', cnName: '各渠道交易日汇总表',
    source: '数仓 DWS 层', layer: 'DWS 汇总层', domain: '交易域',
    owner: '王小明', heat: '2,341 次', perm: 'ok', freq: '每日 T+1（凌晨 3 点产出）',
    tip: '按渠道（APP / 小程序 / H5）统计每天的 GMV、订单量、退款金额，适合做渠道趋势分析和渠道间对比。',
    schema: [
      { col: 'stat_date', type: 'DATE', comment: '统计日期' },
      { col: 'channel_name', type: 'VARCHAR(32)', comment: '渠道：APP / 小程序 / H5' },
      { col: 'city_name', type: 'VARCHAR(32)', comment: '城市名称' },
      { col: 'region', type: 'VARCHAR(16)', comment: '大区：华东 / 华南 / 华北…' },
      { col: 'user_type', type: 'VARCHAR(16)', comment: '用户类型：新用户 / 老用户' },
      { col: 'category_name', type: 'VARCHAR(64)', comment: '商品一级分类' },
      { col: 'gmv_amt', type: 'DECIMAL(18,2)', comment: 'GMV（支付成功口径，含运费，不含退款）' },
      { col: 'order_cnt', type: 'BIGINT', comment: '支付订单量' },
      { col: 'refund_amt', type: 'DECIMAL(18,2)', comment: '退款金额（发起退款口径）' },
    ],
  },
  dwd_trade_refund_detail: {
    name: 'dwd_trade_refund_detail', cnName: '退款明细表',
    source: '数仓 DWD 层', layer: 'DWD 明细层', domain: '交易域 / 退款',
    owner: '王小明', heat: '1,284 次', perm: 'ok', freq: '每日 T+1（凌晨 2 点产出）',
    tip: '包含每笔退款的完整信息，可以按渠道、退款原因、时间段等维度自由聚合分析。',
    schema: [
      { col: 'refund_id', type: 'BIGINT', comment: '退款单号' },
      { col: 'order_id', type: 'BIGINT', comment: '关联订单号' },
      { col: 'refund_reason', type: 'VARCHAR(64)', comment: '退款原因分类' },
      { col: 'refund_amt', type: 'DECIMAL(18,2)', comment: '退款金额' },
      { col: 'refund_time', type: 'DATETIME', comment: '退款发起时间' },
      { col: 'channel_name', type: 'VARCHAR(32)', comment: '下单渠道' },
      { col: 'city_name', type: 'VARCHAR(32)', comment: '收货城市' },
      { col: 'stat_date', type: 'DATE', comment: '分区日期' },
    ],
  },
  dws_user_retention_day: {
    name: 'dws_user_retention_day', cnName: '用户留存日汇总表',
    source: '数仓 DWS 层', layer: 'DWS 汇总层', domain: '用户域',
    owner: '陈五', heat: '890 次', perm: 'ok', freq: '每日 T+1（凌晨 4 点产出）',
    tip: '包含各注册日期队列的 D1 / D7 / D30 留存率，可以按渠道、城市等维度筛选分析。',
    schema: [
      { col: 'reg_date', type: 'DATE', comment: '注册日期（队列）' },
      { col: 'channel_name', type: 'VARCHAR(32)', comment: '注册渠道' },
      { col: 'city_name', type: 'VARCHAR(32)', comment: '注册城市' },
      { col: 'new_user_cnt', type: 'BIGINT', comment: '当日新增用户数' },
      { col: 'd1_rate', type: 'DECIMAL(6,4)', comment: 'D1 留存率（次日活跃口径）' },
      { col: 'd7_rate', type: 'DECIMAL(6,4)', comment: 'D7 留存率' },
      { col: 'd30_rate', type: 'DECIMAL(6,4)', comment: 'D30 留存率' },
    ],
  },
  ods_trade_order_full: {
    name: 'ods_trade_order_full', cnName: '订单贴源表',
    source: '数仓 ODS 层', layer: 'ODS 贴源层', domain: '交易域',
    owner: '王小明', heat: '320 次', perm: 'ok', freq: '每日全量同步（凌晨 1 点）',
    tip: '直接来源于业务库 order 表，字段一一对应，适合核对业务库数据。',
    schema: [
      { col: 'id', type: 'BIGINT', comment: '订单 ID（业务库主键）' },
      { col: 'user_id', type: 'BIGINT', comment: '用户 ID' },
      { col: 'order_amt', type: 'DECIMAL(18,2)', comment: '订单金额' },
      { col: 'order_status', type: 'TINYINT', comment: '订单状态码（同业务库）' },
      { col: 'create_time', type: 'DATETIME', comment: '下单时间' },
      { col: 'stat_date', type: 'DATE', comment: '同步分区日期' },
    ],
  },
  dwd_trade_order_detail: {
    name: 'dwd_trade_order_detail', cnName: '订单明细表',
    source: '数仓 DWD 层', layer: 'DWD 明细层', domain: '交易域',
    owner: '王小明', heat: '2,890 次', perm: 'ok', freq: '每日 T+1（凌晨 2 点产出）',
    tip: '最常用的订单明细表，在业务库 order 基础上补充了渠道、用户画像、商品分类等维度。',
    schema: [
      { col: 'order_id', type: 'BIGINT', comment: '订单号' },
      { col: 'user_id', type: 'BIGINT', comment: '用户 ID' },
      { col: 'channel_name', type: 'VARCHAR(32)', comment: '下单渠道' },
      { col: 'city_name', type: 'VARCHAR(32)', comment: '收货城市' },
      { col: 'user_type', type: 'VARCHAR(16)', comment: '新老用户标识' },
      { col: 'category_name', type: 'VARCHAR(64)', comment: '商品一级分类' },
      { col: 'gmv_amt', type: 'DECIMAL(18,2)', comment: '订单 GMV（支付口径）' },
      { col: 'is_refund', type: 'TINYINT', comment: '是否发生退款' },
      { col: 'stat_date', type: 'DATE', comment: '分区日期' },
    ],
  },
  dws_trade_order_day: {
    name: 'dws_trade_order_day', cnName: '订单日汇总表',
    source: '数仓 DWS 层', layer: 'DWS 汇总层', domain: '交易域',
    owner: '王小明', heat: '1,670 次', perm: 'ok', freq: '每日 T+1（凌晨 3 点产出）',
    tip: '按天汇总的订单数据，适合看 GMV 趋势、订单量变化等。也是「昨天 GMV」等查数问题的来源表。',
    schema: [
      { col: 'stat_date', type: 'DATE', comment: '统计日期' },
      { col: 'gmv_amt', type: 'DECIMAL(18,2)', comment: '当日 GMV（支付口径，不含退款）' },
      { col: 'order_cnt', type: 'BIGINT', comment: '当日支付订单量' },
      { col: 'refund_amt', type: 'DECIMAL(18,2)', comment: '当日退款金额' },
      { col: 'buyer_cnt', type: 'BIGINT', comment: '当日下单人数' },
    ],
  },
  dws_trade_city_day: {
    name: 'dws_trade_city_day', cnName: '各城市交易日汇总表',
    source: '数仓 DWS 层', layer: 'DWS 汇总层', domain: '交易域',
    owner: '王小明', heat: '1,120 次', perm: 'ok', freq: '每日 T+1（凌晨 3 点产出）',
    tip: '按城市、按天汇总的交易数据，是「GMV 按城市分布」等查数问题的来源表。',
    schema: [
      { col: 'stat_date', type: 'DATE', comment: '统计日期' },
      { col: 'city_name', type: 'VARCHAR(32)', comment: '城市名称' },
      { col: 'region', type: 'VARCHAR(16)', comment: '大区' },
      { col: 'gmv_amt', type: 'DECIMAL(18,2)', comment: '当日 GMV（支付口径，不含退款）' },
      { col: 'order_cnt', type: 'BIGINT', comment: '当日支付订单量' },
    ],
  },
};

/** 指标注册表：新增指标只改这里，查数 / 找数 / 上下文 / 确认自动生效 */
export const aiFindMetrics: Record<string, MetricDef> = {
  GMV: {
    alias: ['gmv', '交易额', '成交额'], find: 'gmv', detailTable: 'dwd_trade_order_detail',
    caliber: 'GMV = 当日支付成功订单金额，含运费，不含退款。与财务口径（确认收入）存在差异。数据 T+1 更新（每日凌晨 3 点产出），来源指标服务 idx_gmv，负责人王小明。',
    chatbi: { value: 'gmv是多少', dimension: 'gmv按城市', trend: 'gmv趋势', comparison: 'gmv对比', rank: 'gmv排名', share: 'gmv占比', insight: 'gmv洞察' },
  },
  营收: {
    alias: ['营收', '确收'], find: 'gmv',
    caliber: '营收 = 确认收入口径（剔除退款、优惠券及补贴分摊），与 GMV（支付口径）存在差异，财务报表以此为准。数据 T+3 更新，来源财务域。',
    chatbi: null,
  },
  退款: {
    alias: ['退款', '退货'], find: '退款', detailTable: 'dwd_trade_refund_detail',
    caliber: '退款金额 = 发起退款口径（含未完成退款），非退款成功口径。退款率 = 退款金额 / GMV。数据 T+1 更新。',
    chatbi: null,
  },
  留存: {
    alias: ['留存'], find: '用户留存',
    caliber: '留存率 = 注册日队列中第 N 天仍活跃的用户占比，活跃口径为打开 APP。D1 为次日，自然日计算。数据 T+1 更新。',
    chatbi: null,
  },
  配送时效: {
    alias: ['配送时效', '配送', '时效'], find: '配送时效',
    caliber: '时效达标 = 实际送达时间 ≤ 承诺送达时间；达标率按订单量加权。看板数据实时（5 分钟延迟），日报按自然日汇总。',
    chatbi: null,
  },
  转化: {
    alias: ['转化', '漏斗'], find: '转化漏斗',
    caliber: '各环节按用户去重；转化率 = 下一环节用户数 / 上一环节用户数。漏斗环节：曝光→点击→加购→下单→支付。数据 T+1 更新。',
    chatbi: null,
  },
};

/** 模糊说法 → 多个候选指标（需用户确认） */
export const aiFindAmbiguousTerms: Record<string, string[]> = {
  销售额: ['GMV', '营收'],
  收入: ['GMV', '营收'],
  销售收入: ['GMV', '营收'],
};

/** 宽泛名词 → 方向追问 */
export const aiFindAmbiguousAsks: Record<string, { ask: string; options: string[] }> = {
  用户: { ask: '你想看的是哪方面的用户数据？', options: ['用户行为 / 活跃度', '用户画像 / 标签', '用户留存 / 流失', '用户交易 / 消费'] },
  数据: { ask: '你想找哪个业务方向的数据？', options: ['交易 / 订单 / GMV', '用户 / 留存 / 画像', '供应链 / 配送', '营销 / 活动 / 优惠券'] },
};

/** 找数结果 */
export const aiFindQueries: Record<string, FindResult> = {
  gmv: {
    ctxLabel: '渠道 GMV',
    intent: '我理解你想看各渠道的 GMV 表现。优先推荐可以直接查看的报表和看板，需要自定义分析时再用表：',
    results: [
      { type: 'report', typeLabel: '报表', name: '渠道 GMV 日报', enName: 'channel_gmv_daily_report',
        source: 'BI 平台', owner: '张三', heat: '3,210 次', perm: 'ok', layer: '报表', domain: '交易域', freq: '每日 09:00 更新',
        caliber: 'GMV = 当日支付成功订单金额，含运费，不含退款；渠道按下单端归属。',
        desc: '按渠道（APP/小程序/H5）统计每天的 GMV、订单量、退款率，支持时间范围筛选和渠道对比。',
        reason: '直接包含渠道 GMV 数据，点击可在右侧预览' },
      { type: 'dashboard', typeLabel: '看板', name: '运营大盘看板', enName: 'ops_overview_dashboard',
        source: 'BI 平台', owner: '李四', heat: '1,890 次', perm: 'ok', layer: '看板', domain: '综合', freq: '实时（10 分钟延迟）',
        caliber: 'GMV 为支付口径；DAU 为去重活跃设备数；转化率 = 支付用户数 / 访问用户数。',
        desc: '包含 GMV、DAU、转化率等核心经营指标，实时更新。',
        reason: '包含 GMV 核心指标，适合整体趋势监控' },
      { type: 'table', typeLabel: '表', tableKey: 'dws_trade_channel_day', name: 'dws_trade_channel_day',
        source: '数仓 DWS 层', perm: 'ok',
        desc: '按渠道、按天汇总的交易数据，包含 GMV、订单量、退款金额等字段。',
        reason: '报表覆盖不了的自定义分析，用这张表去即席查询' },
    ],
    guides: ['按城市看 GMV', '本周 GMV 和上周对比', '退款分析报表', '用户留存相关报表'],
  },
  退款: {
    ctxLabel: '退款分析',
    intent: '我理解你想查看退款相关的数据。优先推荐退款分析报表，明细分析用表：',
    results: [
      { type: 'report', typeLabel: '报表', name: '退款分析日报', enName: 'refund_analysis_daily',
        source: 'BI 平台', owner: '张三', heat: '1,560 次', perm: 'ok', layer: '报表', domain: '交易域 / 退款', freq: '每日 09:00 更新',
        caliber: '退款金额为发起退款口径（含未完成退款）；退款率 = 退款金额 / GMV。',
        desc: '按渠道、退款原因分类统计每日退款量和退款金额，支持下钻到订单明细。',
        reason: '直接覆盖退款分析需求，点击可在右侧预览' },
      { type: 'table', typeLabel: '表', tableKey: 'dwd_trade_refund_detail', name: 'dwd_trade_refund_detail',
        source: '数仓 DWD 层', perm: 'ok',
        desc: '退款明细表，包含每笔退款的订单号、退款原因、退款金额、退款时间等字段。',
        reason: '需要明细数据或自定义聚合时，用这张表直接查' },
    ],
    guides: ['退款原因分布', '退款率趋势', 'order 表在数仓里是哪张', '各渠道 GMV 表现'],
  },
  用户留存: {
    ctxLabel: '用户留存',
    intent: '我理解你想看用户留存相关的数据。找到了以下资源：',
    results: [
      { type: 'report', typeLabel: '报表', name: '用户留存分析报表', enName: 'user_retention_report',
        source: 'BI 平台', owner: '陈五', heat: '2,100 次', perm: 'apply', layer: '报表', domain: '用户域', freq: '每日 10:00 更新',
        caliber: '留存率 = 注册日队列中第 N 天仍活跃的用户占比；活跃口径为打开 APP。',
        desc: '按注册日期队列统计 D1/D7/D30 留存率，支持按渠道、城市等维度拆分。',
        reason: '直接覆盖留存分析需求（需申请权限）' },
      { type: 'table', typeLabel: '表', tableKey: 'dws_user_retention_day', name: 'dws_user_retention_day',
        source: '数仓 DWS 层', perm: 'ok',
        desc: '按天统计各注册队列的留存情况，包含 D1/D7/D30 留存率字段。',
        reason: '报表权限未下来之前，可以先用这张表查' },
    ],
    guides: ['按渠道看留存', '近 30 天 GMV 趋势', '转化漏斗报表', '各渠道 GMV 表现'],
  },
  配送时效: {
    ctxLabel: '配送时效',
    intent: '我理解你想看配送时效相关的数据。找到了以下相关资源：',
    results: [
      { type: 'dashboard', typeLabel: '看板', name: '配送时效监控看板', enName: 'delivery_sla_dashboard',
        source: 'BI 平台', owner: '赵六', heat: '1,450 次', perm: 'ok', layer: '看板', domain: '供应链域 / 配送', freq: '实时（5 分钟延迟）',
        caliber: '时效达标 = 实际送达时间 ≤ 承诺送达时间；达标率按订单量加权。',
        desc: '实时展示各城市、各时段的配送时效达标率，支持按城市、骑手类型筛选。',
        reason: '直接覆盖配送时效监控需求，点击可在右侧预览' },
      { type: 'report', typeLabel: '报表', name: '配送时效日报', enName: 'delivery_sla_daily',
        source: 'BI 平台', owner: '赵六', heat: '980 次', perm: 'ok', layer: '报表', domain: '供应链域 / 配送', freq: '每日 08:30 更新',
        caliber: '统计口径同监控看板，按自然日汇总。',
        desc: '按城市、骑手类型统计每日配送时效达标率和平均配送时长。',
        reason: '需要历史趋势分析时使用' },
    ],
    guides: ['按城市看时效', '高峰期时效分析', '骑手类型对比', '时效与差评关联'],
  },
  order: {
    ctxLabel: 'order 表映射',
    isMapping: true,
    intent: '根据血缘关系，业务库 order 表在数仓中有以下下游表，选一张直接用：',
    results: [
      { type: 'table', typeLabel: '表', tableKey: 'ods_trade_order_full', name: 'ods_trade_order_full',
        source: '数仓 ODS 层', perm: 'ok',
        desc: '直接来源于业务库 order 表，保留原始字段，每日全量同步。',
        reason: '与业务库 order 表字段一一对应，适合核对数据' },
      { type: 'table', typeLabel: '表', tableKey: 'dwd_trade_order_detail', name: 'dwd_trade_order_detail',
        source: '数仓 DWD 层', perm: 'ok',
        desc: '基于 ODS 层清洗加工，补充了渠道、用户画像、商品分类等维度，是最常用的订单明细表。',
        reason: '最常用的订单明细表，字段更丰富' },
      { type: 'table', typeLabel: '表', tableKey: 'dws_trade_order_day', name: 'dws_trade_order_day',
        source: '数仓 DWS 层', perm: 'ok',
        desc: '基于 DWD 层按天聚合，包含每日订单量、GMV、退款量等汇总指标。',
        reason: '需要看趋势或汇总数据时使用' },
    ],
    guides: ['订单 GMV 趋势', '退款相关的表', '各渠道 GMV 表现', '昨天 GMV 是多少'],
  },
  转化漏斗: {
    ctxLabel: '转化漏斗',
    intent: '我理解你想看转化漏斗相关的数据。找到了以下相关资源：',
    results: [
      { type: 'report', typeLabel: '报表', name: '核心转化漏斗报表', enName: 'core_conversion_funnel',
        source: 'BI 平台', owner: '陈五', heat: '3,450 次', perm: 'ok', layer: '报表', domain: '用户域 / 转化', freq: '每日 10:00 更新',
        caliber: '各环节按用户去重；转化率 = 下一环节用户数 / 上一环节用户数。',
        desc: '展示从曝光→点击→加购→下单→支付的完整转化漏斗，支持按渠道、时间段筛选。',
        reason: '直接覆盖转化漏斗分析需求，点击可在右侧预览' },
    ],
    guides: ['按渠道看转化', '加购到支付转化', '新用户转化率', '转化与留存关联'],
  },
};

/** 查数结果（Chat BI） */
export const aiFindChatbi: Record<string, ChatbiResult> = {
  gmv是多少: {
    key: 'gmv是多少',
    summaryLabel: '昨天 GMV',
    summaryMetrics: [
      { label: 'GMV', value: '1.23 亿', change: '↑8.2%', dir: 'up' },
      { label: '环比前日', value: '+930 万', change: '', dir: 'up' },
      { label: '同比上周', value: '+8.2%', change: '', dir: 'up' },
    ],
    rightTitle: '昨天 GMV 是多少', rightContent: 'metric',
    metrics: [
      { label: '昨日 GMV', value: '1.23 亿', change: '↑8.2%', dir: 'up', period: '对比上周同日', primary: true },
      { label: '环比前日', value: '+930 万', change: '↑8.2%', dir: 'up', period: '07-12 vs 07-11' },
      { label: '同比上周', value: '+8.2%', change: '', dir: 'up', period: '07-12 vs 07-05' },
    ],
    source: { table: 'dws_trade_order_day', field: 'gmv_amt', time: 'stat_date = 2026-07-12', via: '指标服务 API' },
    caliber: 'GMV = 当日支付成功订单金额，含运费，不含退款。数据 T+1 更新，昨日数据已产出（今晨 3:00）。',
  },
  gmv按城市: {
    key: 'gmv按城市',
    summaryLabel: '昨天 GMV 按城市分布',
    summaryMetrics: [
      { label: '北京', value: '3,240 万', change: '↑5.1%', dir: 'up' },
      { label: '上海', value: '2,980 万', change: '↑3.8%', dir: 'up' },
      { label: '广州', value: '1,870 万', change: '↓1.2%', dir: 'down' },
    ],
    rightTitle: '昨天 GMV 按城市分布', rightContent: 'dimension',
    dimRows: [
      { rank: 1, city: '北京', gmv: '3,240 万', pct: '26.3%', wow: '↑5.1%', dir: 'up' },
      { rank: 2, city: '上海', gmv: '2,980 万', pct: '24.2%', wow: '↑3.8%', dir: 'up' },
      { rank: 3, city: '广州', gmv: '1,870 万', pct: '15.2%', wow: '↓1.2%', dir: 'down' },
      { rank: 4, city: '深圳', gmv: '1,650 万', pct: '13.4%', wow: '↑2.3%', dir: 'up' },
      { rank: 5, city: '成都', gmv: '980 万', pct: '8.0%', wow: '↑7.6%', dir: 'up' },
      { rank: 6, city: '杭州', gmv: '760 万', pct: '6.2%', wow: '↓0.5%', dir: 'down' },
      { rank: 7, city: '其他', gmv: '830 万', pct: '6.7%', wow: '↑1.1%', dir: 'up' },
    ],
    source: { table: 'dws_trade_city_day', field: 'gmv_amt', time: 'stat_date = 2026-07-12', via: '白名单表 SQL 自动执行' },
    caliber: 'GMV = 当日支付成功订单金额（支付口径，不含退款）；城市按收货地址归属。数据 T+1 更新。',
  },
  gmv排名: {
    key: 'gmv排名',
    summaryLabel: '昨天 GMV 城市排名 TOP5',
    summaryMetrics: [
      { label: 'TOP1 北京', value: '3,240 万', change: '↑5.1%', dir: 'up' },
      { label: 'TOP2 上海', value: '2,980 万', change: '↑3.8%', dir: 'up' },
      { label: 'TOP3 广州', value: '1,870 万', change: '↓1.2%', dir: 'down' },
    ],
    rightTitle: 'GMV 最高的城市 TOP5', rightContent: 'rank',
    dimRows: [
      { rank: 1, city: '北京', gmv: '3,240 万', pct: '26.3%', wow: '↑5.1%', dir: 'up' },
      { rank: 2, city: '上海', gmv: '2,980 万', pct: '24.2%', wow: '↑3.8%', dir: 'up' },
      { rank: 3, city: '广州', gmv: '1,870 万', pct: '15.2%', wow: '↓1.2%', dir: 'down' },
      { rank: 4, city: '深圳', gmv: '1,650 万', pct: '13.4%', wow: '↑2.3%', dir: 'up' },
      { rank: 5, city: '成都', gmv: '980 万', pct: '8.0%', wow: '↑7.6%', dir: 'up' },
    ],
    source: { table: 'dws_trade_city_day', field: 'gmv_amt', time: 'stat_date = 2026-07-12 · ORDER BY gmv DESC LIMIT 5', via: '白名单表 SQL 自动执行' },
    caliber: 'GMV = 当日支付成功订单金额（支付口径，不含退款）；城市按收货地址归属，排名按 GMV 降序取前 5。数据 T+1 更新。',
  },
  gmv占比: {
    key: 'gmv占比',
    summaryLabel: '昨天各渠道 GMV 占比',
    summaryMetrics: [
      { label: 'APP', value: '58.4%', change: '7,180 万', dir: 'neutral' },
      { label: '小程序', value: '31.2%', change: '3,840 万', dir: 'neutral' },
      { label: 'H5', value: '10.4%', change: '1,280 万', dir: 'neutral' },
    ],
    rightTitle: '昨天各渠道 GMV 占比', rightContent: 'share',
    shareRows: [
      { name: 'APP', value: '7,180 万', pct: 58.4, wow: '↑1.2pp', dir: 'up' },
      { name: '小程序', value: '3,840 万', pct: 31.2, wow: '↑0.4pp', dir: 'up' },
      { name: 'H5', value: '1,280 万', pct: 10.4, wow: '↓1.6pp', dir: 'down' },
    ],
    source: { table: 'dws_trade_channel_day', field: 'gmv_amt', time: 'stat_date = 2026-07-12', via: '白名单表 SQL 自动执行' },
    caliber: 'GMV = 当日支付成功订单金额（支付口径，不含退款）；占比 = 各渠道 GMV / 全渠道 GMV，环比为占比的百分点变化。数据 T+1 更新。',
  },
  gmv洞察: {
    key: 'gmv洞察',
    summaryLabel: '昨天 GMV 涨幅归因',
    summaryMetrics: [
      { label: '昨日 GMV', value: '1.23 亿', change: '↑8.2%', dir: 'up' },
      { label: '主要动因', value: 'APP 渠道', change: '+680 万（贡献 73%）', dir: 'up' },
      { label: '异常提示', value: '2 项', change: '1 项需关注', dir: 'down' },
    ],
    rightTitle: '昨天 GMV 为什么涨了', rightContent: 'insight',
    insight: {
      conclusion: '昨天 GMV 1.23 亿，环比上周同日 +930 万（↑8.2%）。增长 73% 来自 APP 渠道（715 大促预热活动拉动），各城市普涨，基本面健康；有 1 项异常建议关注。',
      drivers: [
        { name: 'APP', diff: '+680 万', pct: 73 },
        { name: '小程序', diff: '+190 万', pct: 20 },
        { name: 'H5', diff: '+60 万', pct: 7 },
      ],
      anomalies: [
        { level: 'info', text: '成都 GMV 环比 +7.6%，显著高于全国均值（+2.9%）——当地满减活动 7/10 上线，属预期内增长。' },
        { level: 'warn', text: 'H5 渠道订单量 -3.1% 但 GMV 基本持平，客单价异常上升，建议排查是否存在大额异常订单。' },
      ],
      nextSteps: ['昨天 GMV 按城市分布', '各渠道 GMV 占比', '最近 30 天 GMV 趋势'],
    },
    source: { table: 'dws_trade_channel_day', field: 'gmv_amt', time: 'stat_date = 2026-07-12 vs 2026-07-05', via: '指标服务 + 自动归因（维度贡献度分解）' },
    caliber: 'GMV = 当日支付成功订单金额（支付口径，不含退款）。归因方法：对环比增量按渠道/城市维度做贡献度分解（各维度增量 / 总增量）；异常检测为环比波动超 ±2σ 触发。结论由规则生成，仅供参考。',
  },
  gmv趋势: {
    key: 'gmv趋势',
    summaryLabel: '最近 30 天 GMV 趋势',
    summaryMetrics: [
      { label: '30天累计', value: '3.68 亿', change: '↑12.4%', dir: 'up' },
      { label: '日均 GMV', value: '1,227 万', change: '', dir: 'neutral' },
      { label: '最高单日', value: '1,580 万', change: '7月12日', dir: 'neutral' },
    ],
    rightTitle: '最近 30 天 GMV 趋势', rightContent: 'trend',
    source: { table: 'dws_trade_order_day', field: 'gmv_amt', time: '近 30 天', via: '白名单表 SQL 自动执行' },
    caliber: 'GMV = 每日支付成功订单金额（支付口径，不含退款）。同比为对比上一个 30 天周期。数据 T+1 更新。',
  },
  gmv对比: {
    key: 'gmv对比',
    summaryLabel: '本周 vs 上周 GMV 对比',
    summaryMetrics: [
      { label: '本周 GMV', value: '8,640 万', change: '↑9.3%', dir: 'up' },
      { label: '上周 GMV', value: '7,905 万', change: '', dir: 'neutral' },
      { label: '增量', value: '+735 万', change: '', dir: 'up' },
    ],
    rightTitle: '本周 GMV 和上周对比', rightContent: 'comparison',
    compareRows: [
      { day: '周一', cur: '1,180 万', prev: '1,050 万', diff: '+130 万', dir: 'up' },
      { day: '周二', cur: '1,240 万', prev: '1,120 万', diff: '+120 万', dir: 'up' },
      { day: '周三', cur: '1,320 万', prev: '1,230 万', diff: '+90 万', dir: 'up' },
      { day: '周四', cur: '1,290 万', prev: '1,180 万', diff: '+110 万', dir: 'up' },
      { day: '周五', cur: '1,580 万', prev: '1,420 万', diff: '+160 万', dir: 'up' },
      { day: '周六', cur: '—', prev: '1,380 万', diff: '—', dir: 'neutral' },
      { day: '周日（今天，未完整）', cur: '2,030 万', prev: '1,525 万', diff: '统计中', dir: 'neutral' },
    ],
    source: { table: 'dws_trade_order_day', field: 'gmv_amt', time: '本周 vs 上周', via: '白名单表 SQL 自动执行' },
    caliber: 'GMV = 每日支付成功订单金额（支付口径，不含退款）。本周对比截至昨天完整数据，今日为实时数（未完整）。',
  },
};

/** 血缘（详情抽屉血缘 Tab） */
export const aiFindLineage: Record<string, { up: string[]; down: string[] }> = {
  dws_trade_channel_day: { up: ['dwd_trade_order_detail'], down: ['channel_gmv_daily_report（报表）', 'ops_overview_dashboard（看板）'] },
  dwd_trade_refund_detail: { up: ['ods_trade_refund_full'], down: ['refund_analysis_daily（报表）'] },
  dws_user_retention_day: { up: ['dwd_user_active_detail'], down: ['user_retention_report（报表）'] },
  ods_trade_order_full: { up: ['业务库 order 表'], down: ['dwd_trade_order_detail'] },
  dwd_trade_order_detail: { up: ['ods_trade_order_full'], down: ['dws_trade_order_day', 'dws_trade_channel_day', 'dws_trade_city_day'] },
  dws_trade_order_day: { up: ['dwd_trade_order_detail'], down: ['指标服务：GMV / 订单量'] },
  dws_trade_city_day: { up: ['dwd_trade_order_detail'], down: ['指标服务：城市 GMV'] },
};

/** 欢迎语引导标签 */
export const aiFindWelcomeGuides: string[] = [
  '各渠道 GMV 表现',
  '用户留存相关报表',
  'order 表在数仓里是哪张',
  '配送时效看板',
  '昨天 GMV 是多少',
  '昨天 GMV 按城市分布',
  '最近 30 天 GMV 趋势',
  '本周 GMV 和上周对比',
  'GMV 最高的城市 TOP5',
  '各渠道 GMV 占比',
  '昨天的订单明细',
  'GMV 的口径是什么',
  '昨天 GMV 为什么涨了',
  '昨天销售额是多少',
];

/** 空态最近记录 */
export const aiFindRecentQueries: Array<{ text: string; time: string }> = [
  { text: '用户下单后的退款情况', time: '2 小时前' },
  { text: '各城市骑手配送时效', time: '昨天' },
  { text: 'order 表在数仓里是哪张', time: '3 天前' },
];
