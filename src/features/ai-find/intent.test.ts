import { describe, expect, it } from 'vitest';
import { routeQuery } from './intent';

/** PRD §8 场景矩阵 → 路由判定（docs/product/2026-07-13-AI找数-模块PRD.md） */
describe('routeQuery：四层召回管道', () => {
  const route = (text: string, ctx: { metric: string | null } | null = null, askCount = 0) =>
    routeQuery(text, ctx, askCount).action;

  describe('查数意图（I001-I009）', () => {
    it('2-1 指标值：昨天 GMV 是多少', () => {
      expect(route('昨天 GMV 是多少')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv是多少' });
    });
    it('2-2 拆解：昨天 GMV 按城市分布', () => {
      expect(route('昨天 GMV 按城市分布')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv按城市' });
    });
    it('2-3 趋势：最近 30 天 GMV 趋势', () => {
      expect(route('最近 30 天 GMV 趋势')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv趋势' });
    });
    it('2-4 对比：本周 GMV 和上周对比', () => {
      expect(route('本周 GMV 和上周对比')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv对比' });
    });
    it('2-5 排名：GMV 最高的城市 TOP5', () => {
      expect(route('GMV 最高的城市 TOP5')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv排名' });
    });
    it('2-6 占比：各渠道 GMV 占比', () => {
      expect(route('各渠道 GMV 占比')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv占比' });
    });
    it('2-7 明细：昨天的订单明细 → 直达明细表', () => {
      expect(route('昨天的订单明细')).toMatchObject({ kind: 'detailTable', tableKey: 'dwd_trade_order_detail' });
    });
    it('2-7b 退款明细 → 退款明细表', () => {
      expect(route('退款明细列表')).toMatchObject({ kind: 'detailTable', tableKey: 'dwd_trade_refund_detail' });
    });
    it('2-8 定义：GMV 的口径是什么（不走 SQL）', () => {
      expect(route('GMV 的口径是什么')).toMatchObject({ kind: 'definition', metric: 'GMV' });
    });
    it('2-9 洞察：昨天 GMV 为什么涨了', () => {
      expect(route('昨天 GMV 为什么涨了')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv洞察' });
    });
    it('2-10 预测：诚实不支持', () => {
      expect(route('预测下个月 GMV')).toMatchObject({ kind: 'forecast' });
    });
  });

  describe('找资产意图', () => {
    it('1-1 各渠道 GMV 表现（资产词"表现"→ 找资产而非查数）', () => {
      expect(route('各渠道 GMV 表现')).toMatchObject({ kind: 'find', findKey: 'gmv' });
    });
    it('GMV 相关报表 → 找资产', () => {
      expect(route('GMV 相关报表')).toMatchObject({ kind: 'find', findKey: 'gmv' });
    });
    it('1-3 用户留存相关报表', () => {
      expect(route('用户留存相关报表')).toMatchObject({ kind: 'find', findKey: '用户留存' });
    });
    it('1-4 口语化描述：用户下单后的退款情况', () => {
      expect(route('用户下单后的退款情况')).toMatchObject({ kind: 'find', findKey: '退款' });
    });
  });

  describe('表名映射', () => {
    it('5-1 order 表在数仓里是哪张', () => {
      expect(route('order 表在数仓里是哪张')).toMatchObject({ kind: 'find', findKey: 'order' });
    });
    it('未收录表名 → 诚实告知', () => {
      expect(route('user_profile_full')).toMatchObject({ kind: 'mappingNotFound' });
    });
  });

  describe('歧义与诚实降级', () => {
    it('4-1 指标确认：昨天销售额是多少 → GMV / 营收候选', () => {
      expect(route('昨天销售额是多少')).toMatchObject({ kind: 'confirmMetric', term: '销售额', candidates: ['GMV', '营收'] });
    });
    it('4-1b 裸指标名 GMV → 默认出最新值，不追问', () => {
      expect(route('GMV')).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv是多少' });
    });
    it('4-2 未接入查数的指标 → 降级找资产并回显槽位', () => {
      const action = route('退款率趋势');
      expect(action).toMatchObject({ kind: 'find', findKey: '退款' });
      expect((action as { note?: string }).note).toContain('退款率');
      expect((action as { note?: string }).note).toContain('趋势');
    });
    it('4-3 宽泛名词 → 方向追问（每会话最多一次）', () => {
      expect(route('帮我找点数据')).toMatchObject({ kind: 'ask', askKey: '数据' });
      expect(route('帮我找点数据', null, 1)).toMatchObject({ kind: 'notFound' });
    });
    it('4-5 无关输入 → 诚实没找到', () => {
      expect(route('随便什么乱七八糟')).toMatchObject({ kind: 'notFound' });
    });
    it('确认营收后走降级（营收未接入查数）', () => {
      const action = route('昨天营收是多少');
      expect(action).toMatchObject({ kind: 'find', findKey: 'gmv' });
      expect((action as { note?: string }).note).toContain('营收');
    });
  });

  describe('上下文补位', () => {
    it('3-1 短追问"趋势呢"沿用上一轮指标', () => {
      expect(route('趋势呢', { metric: 'GMV' })).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv趋势', fromCtx: true });
    });
    it('3-1b "按城市呢"沿用上下文', () => {
      expect(route('按城市呢', { metric: 'GMV' })).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv按城市', fromCtx: true });
    });
    it('定义类也支持上下文："口径是什么"', () => {
      expect(route('口径是什么', { metric: 'GMV' })).toMatchObject({ kind: 'definition', metric: 'GMV', fromCtx: true });
    });
    it('无上下文时短追问走兜底', () => {
      expect(route('趋势呢', null)).toMatchObject({ kind: 'notFound' });
    });
  });

  describe('确认后槽位保留', () => {
    it('本周销售额和上周对比 → 确认 → 替换指标名后命中对比', () => {
      const confirm = route('本周销售额和上周对比');
      expect(confirm.kind).toBe('confirmMetric');
      // 模拟用户选择 GMV：原句替换指标名后重新路由
      const resent = '本周销售额和上周对比'.split('销售额').join('GMV');
      expect(route(resent)).toMatchObject({ kind: 'chatbi', chatbiKey: 'gmv对比' });
    });
  });
});
