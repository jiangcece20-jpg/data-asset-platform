/**
 * AI 找数 · 召回管道（纯函数，PRD §6 的代码对应物）
 *
 * ① 意图分类 → ② 槽位解析（上下文补位，仅此一处）→ ③ 分支执行 → ④ 兜底
 * 规则显式、可单测；新增指标只改 mocks/aiFind.ts 的指标注册表。
 */
import {
  aiFindAmbiguousAsks,
  aiFindAmbiguousTerms,
  aiFindMetrics,
  aiFindQueries,
} from '../../mocks/aiFind';
import type { QueryCtx, RouteAction, Slots } from '../../types/aiFind';

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s/g, '');
}

/** ② 槽位解析：指标 / 分析类型 / 维度 / 时间 / 资产词 */
export function parseSlots(t: string): Slots {
  const s: Slots = { metric: null, metricText: null, ambTerm: null, analysis: null, dimension: null, time: null, assetWord: false };

  for (const [name, m] of Object.entries(aiFindMetrics)) {
    const hit = m.alias.find((a) => t.includes(a));
    if (hit) {
      s.metric = name;
      // 记录用户实际说法（如"退款率"而不只是"退款"），用于降级回显
      s.metricText = t.includes(hit + '率') ? hit + '率' : hit === 'gmv' ? 'GMV' : hit;
      break;
    }
  }
  // 没有精确命中时，检查是否"说法不准、命中多个候选指标"
  if (!s.metric) {
    for (const term of Object.keys(aiFindAmbiguousTerms)) {
      if (t.includes(term)) { s.ambTerm = term; break; }
    }
  }

  if (/是多少|多少|总额/.test(t)) s.analysis = 'value'; // I001 指标值
  const dim = t.match(/按(城市|渠道|地区|原因)|各城市|城市分布|拆分|拆解/);
  if (dim) { s.analysis = 'dimension'; s.dimension = dim[1] || '城市'; } // I006 拆解
  if (/趋势|走势|每天/.test(t)) s.analysis = 'trend'; // I002 历史趋势
  if (/对比|比较|同比|(本周.*上周)|(上周.*本周)/.test(t)) s.analysis = 'comparison'; // I004 对比
  if (/top\d*|排名|最高|最低|前\d+/.test(t)) s.analysis = 'rank'; // I003 排名
  if (/占比|比例|份额/.test(t)) s.analysis = 'share'; // I005 占比
  if (/为什么|原因|归因|异常|波动|分析一下|分析下|洞察/.test(t)) s.analysis = 'insight'; // I009 洞察
  if (/明细|列表|流水/.test(t)) s.analysis = 'detail'; // I007 明细
  if (/什么意思|口径|定义|怎么算/.test(t)) s.analysis = 'definition'; // I008 定义（不走 SQL）
  if (/预测|预估|未来/.test(t)) s.analysis = 'forecast'; // 预测（暂不支持）

  if (/昨天|昨日|今天/.test(t)) s.time = 'day';
  else if (/近\d+天|最近|本月|上月|本周/.test(t)) s.time = 'range';

  s.assetWord = /报表|看板|大盘|资产|相关|哪张|表现/.test(t);
  return s;
}

/** 是否是"裸指标名"（如只输入 GMV） */
export function isBareMetric(t: string, metricName: string): boolean {
  const m = aiFindMetrics[metricName];
  let r = t;
  m.alias.forEach((a) => { r = r.split(a).join(''); });
  return r.replace(/[^一-龥a-z0-9]/g, '').length <= 2;
}

/** 降级回显用的分析类型名 */
export function analysisLabel(slots: Slots): string {
  const map: Record<string, string> = {
    value: '数值',
    dimension: '按' + (slots.dimension || '维度') + '的分布',
    trend: '趋势',
    comparison: '对比',
    rank: '排名',
    share: '占比',
    insight: '归因洞察',
  };
  return (slots.analysis && map[slots.analysis]) || '数据';
}

/** ①③④：完整路由。返回 action + 解析出的槽位（供 UI 回显） */
export function routeQuery(text: string, ctx: QueryCtx, askCount: number): { action: RouteAction; slots: Slots } {
  const t = normalize(text);
  const emptySlots = parseSlots('');

  // ── ① 表名映射（最高优先级：英文表名形态）──
  if (/\border\b|order表/.test(t)) {
    return { action: { kind: 'find', findKey: 'order' }, slots: emptySlots };
  }
  if (/^[a-z][a-z0-9_]*$/.test(t) && t.includes('_')) {
    return { action: { kind: 'mappingNotFound' }, slots: emptySlots };
  }

  // ── ② 槽位解析 ──
  const slots = parseSlots(t);
  // 说法不准确、命中多个候选指标 → 先确认
  if (!slots.metric && slots.ambTerm) {
    return { action: { kind: 'confirmMetric', term: slots.ambTerm, candidates: aiFindAmbiguousTerms[slots.ambTerm] }, slots };
  }
  // 上下文补位（仅此一处）：短追问缺指标时沿用上一轮
  let fromCtx = false;
  if (!slots.metric && (slots.analysis || slots.dimension) && ctx?.metric) {
    slots.metric = ctx.metric;
    fromCtx = true;
  }
  const m = slots.metric ? aiFindMetrics[slots.metric] : null;

  // ── ③ 分支执行 ──
  // 定义类（I008）：不走 SQL，直接回口径
  if (slots.analysis === 'definition' && m && slots.metric) {
    return { action: { kind: 'definition', metric: slots.metric, fromCtx }, slots };
  }
  // 预测类：能力未覆盖，诚实告知
  if (slots.analysis === 'forecast') {
    return { action: { kind: 'forecast' }, slots };
  }
  // 明细类（I007）：直达明细表信息页
  if (slots.analysis === 'detail') {
    const tableKey = /退款/.test(t) ? 'dwd_trade_refund_detail' : 'dwd_trade_order_detail';
    return { action: { kind: 'detailTable', tableKey }, slots };
  }
  // 查数：指标 + (分析类型或时间词)，且没有资产词
  if (m && (slots.analysis || slots.time) && !slots.assetWord) {
    const chatbiKey = m.chatbi ? m.chatbi[(slots.analysis || 'value') as keyof typeof m.chatbi] || m.chatbi.value : undefined;
    if (chatbiKey) {
      return { action: { kind: 'chatbi', chatbiKey, fromCtx }, slots };
    }
    // 指标未接入直接查数 → 降级找资产，回显识别到的完整槽位
    return {
      action: {
        kind: 'find', findKey: m.find,
        note: `已识别你想查「${slots.metricText ?? slots.metric}」的${analysisLabel(slots)}，但该指标还没接入直接查数（演示），先推荐相关资产：`,
      },
      slots,
    };
  }
  // 只输入了指标名 → 默认给最新值（不追问）
  if (m && m.chatbi?.value && slots.metric && !slots.analysis && !slots.time && !slots.assetWord && isBareMetric(t, slots.metric)) {
    return { action: { kind: 'chatbi', chatbiKey: m.chatbi.value, fromCtx: false }, slots };
  }
  // 找资产
  if (m) {
    return { action: { kind: 'find', findKey: m.find }, slots };
  }
  for (const key of Object.keys(aiFindQueries)) {
    if (key !== 'order' && t.includes(key)) {
      return { action: { kind: 'find', findKey: key }, slots };
    }
  }

  // ── ④ 兜底：模糊追问一次 → 诚实"没找到" ──
  if (askCount < 1) {
    for (const key of Object.keys(aiFindAmbiguousAsks)) {
      if (t.includes(key)) {
        return { action: { kind: 'ask', askKey: key }, slots };
      }
    }
  }
  return { action: { kind: 'notFound' }, slots };
}
