import { describe, expect, it } from 'vitest'
import { seedProducts } from '@/data/products'
import type { Entitlement } from '@/types/domain'
import { hasExpiredEnterpriseProductEntitlement, resolveV102Trade, v102TradeDescription, v102TradeStatusHint } from './v102Trade'

const product = (id: string) => seedProducts.find((item) => item.id === id)!
const team = { isTeam: true, hasMembership: true, hasAccess: false }

describe('V1.0.2 商品详情交易方案', () => {
  it.each(['prod-qualification-api', 'prod-enterprise-activity'])('sends an authorized trusted product to orders: %s', (id) => {
    for (const delisted of [false, true]) {
      const p = product(id)
      const trade = resolveV102Trade({ ...p, availability: delisted ? 'delisted' : 'published', status: delisted ? 'delisted' : 'published' }, { ...team, hasAccess: true })
      expect(trade.action).toMatchObject({ key: 'view_order', label: '前往订单' })
    }
  })

  it('keeps the purchase operation disabled while delisting remains a separate status', () => {
    const p = { ...product('prod-seller-route-board'), status: 'delisted' as const, availability: 'delisted' as const }
    const trade = resolveV102Trade(p, team)
    expect(trade.action).toMatchObject({ label: '购买数据集', disabled: true })
    expect(v102TradeStatusHint(trade)).toBeUndefined()
    expect(resolveV102Trade(p, { ...team, hasOrderHistory: true }).action)
      .toEqual({ key: 'view_order', label: '查看订单' })
  })
  it('does not invent an order entry for unavailable content without order history', () => {
    const p = { ...product('prod-seller-route-board'), serviceStatus: 'terminated' as const }
    expect(resolveV102Trade(p, team).action).toMatchObject({ key: 'unavailable', disabled: true })
    expect(resolveV102Trade(p, { ...team, hasOrderHistory: true }).action).toEqual({ key: 'view_order', label: '查看订单' })
  })

  it('keeps the apply entry when source synchronization is unavailable', () => {
    const p = product('prod-enterprise-activity')
    const context = { ...team }
    expect(resolveV102Trade(p, context).action).toMatchObject({ key: 'apply' })
    expect(resolveV102Trade(p, { ...context, hasAccess: true }).action.disabled).not.toBe(true)
    expect(resolveV102Trade(p, { ...context, purchaseInProgress: { phase: 'space_intent', intentId: 'existing-intent', userStatus: 'processing' } }).action.key).toBe('view_intent')
  })
  it('stops delisted public free access even when an old access flag is present', () => {
    const p = { ...product('prod-public-freight-dataset'), availability: 'delisted' as const }
    expect(resolveV102Trade(p, { ...team, hasAccess: true }).action).toMatchObject({ key: 'unavailable', disabled: true })
  })

  it('keeps a separate new-order entry alongside current usable rights', () => {
    const trade = resolveV102Trade(product('prod-seller-route-board'), { ...team, hasAccess: true,
      purchaseInProgress: { phase: 'pending_payment', orderId: 'new-order', canPay: true } })
    expect(trade.action.key).toBe('use_dataset')
    expect(trade.secondaryAction).toEqual({ key: 'view_order', label: '查看新单' })
  })

  it('retains the actual pending order entry when use is revoked', () => {
    const p = { ...product('prod-seller-route-board'), serviceStatus: 'terminated' as const }
    expect(resolveV102Trade(p, { ...team, purchaseInProgress: { phase: 'fulfilling', orderId: 'paid', status: 'paid' } }).action)
      .toEqual({ key: 'view_order', label: '查看订单' })
  })
  it('keeps product benefits out of actions while retaining operational hints', () => {
    const p = product('prod-seller-route-board')
    expect(v102TradeStatusHint(resolveV102Trade(p, team))).toBeUndefined()
    expect(v102TradeStatusHint(resolveV102Trade(p, { ...team, hasAccess: true }))).toBeUndefined()
    expect(v102TradeStatusHint(resolveV102Trade(p, { ...team, purchaseInProgress: { phase: 'pending_payment', orderId: 'test', canPay: true } }))).toBe('请勿重复下单。')
    expect(v102TradeStatusHint(resolveV102Trade(p, { ...team, serviceExpired: true, hasHistoricalDataAccess: true }))).toBe('已停止更新，已交付数据仍可查看、下载。')
    expect(v102TradeStatusHint(resolveV102Trade(p, { ...team, isTeam: false }))).toBe('试用会员不能购买或申请。')
  })
  it('uses one line for routine pricing, but surfaces order and ownership states', () => {
    const free = resolveV102Trade(product('prod-freight-index'), { ...team, hasMembership: false })
    expect(v102TradeDescription(free)).toBe('企业会员直接使用，无需下单。')

    const pending = resolveV102Trade(product('prod-seller-route-board'), {
      ...team,
      purchaseInProgress: { phase: 'pending_payment', orderId: 'order-1', canPay: true }
    })
    expect(v102TradeDescription(pending)).toBe('待支付')

    const owned = resolveV102Trade(product('prod-seller-route-board'), { ...team, hasAccess: true })
    expect(v102TradeDescription(owned)).toBe('已开通')
  })
  it('公开数据集会员免费直用，不创建订单', () => {
    const result = resolveV102Trade(product('prod-public-freight-dataset'), team)
    expect(result.plan).toBe('public_free')
    expect(result.price).toBe('会员免费')
    expect(result.action.key).toBe('use_dataset')
    expect(result.note).toContain('无订单')
  })

  it('非公开零元数据集仍生成企业订单', () => {
    const result = resolveV102Trade(product('prod-private-zero-dataset'), team)
    expect(result.plan).toBe('dataset_order')
    expect(result.price).toBe('¥0')
    expect(result.action.key).toBe('create_order')
  })

  it('商家数据集按一个企业价格及更新频率、服务周期展示', () => {
    const result = resolveV102Trade(product('prod-seller-route-board'), team)
    expect(result.plan).toBe('merchant')
    expect(result.price).toBe('¥1,990')
    expect(result.note).toContain('每日更新')
    expect(result.note).toContain('12个月')
  })

  it('试用身份不发起购买或申请', () => {
    const result = resolveV102Trade(product('prod-seller-route-board'), { ...team, isTeam: false })
    expect(result.action).toMatchObject({ key: 'open_membership', label: '开通会员' })
    expect(result.action.disabled).not.toBe(true)
    expect(result.note).toBe('试用会员不能购买或申请。')
  })

  it('企业身份未开通会员时先引导开通', () => {
    const result = resolveV102Trade(product('prod-public-freight-dataset'), { ...team, hasMembership: false })
    expect(result.action.key).toBe('open_membership')
  })

  it('企业成员可直接申请可信空间数据集', () => {
    const result = resolveV102Trade(product('prod-enterprise-activity'), { ...team, hasMembership: false })
    expect(result.action.key).toBe('apply')
    expect(result.status).toBe('可申请')
  })

  it('已有待支付订单优先继续原单；下架后仅可查看原单', () => {
    const pending = { phase: 'pending_payment' as const, orderId: 'order-1', canPay: true }
    expect(resolveV102Trade(product('prod-seller-route-board'), { ...team, purchaseInProgress: pending }).action.key).toBe('continue_order')
    expect(resolveV102Trade({ ...product('prod-seller-route-board'), availability: 'delisted' }, { ...team, purchaseInProgress: pending }).action.key).toBe('view_order')
  })

  it('已拥有权益时保留用数', () => {
    expect(resolveV102Trade(product('prod-seller-route-board'), { ...team, hasAccess: true }).action.key).toBe('use_dataset')
  })

  it('新周期有效权益优先于历史到期记录', () => {
    const trade = resolveV102Trade(product('prod-seller-route-board'), {
      ...team,
      hasAccess: true,
      serviceExpired: true
    })
    expect(trade.status).toBe('已开通')
    expect(trade.action.key).toBe('use_dataset')
  })

  it('存在新周期有效权益时不再把历史周期判为当前已到期', () => {
    const records: Entitlement[] = [
      {
        id: 'ent-old', source: 'enterprise', type: 'dataset', ownerId: 'ent-1', enterpriseId: 'ent-1',
        productId: 'prod-seller-route-board', validFrom: '2025-01-01', updateValidTo: '2026-09-30', status: 'active'
      },
      {
        id: 'ent-new', source: 'enterprise', type: 'dataset', ownerId: 'ent-1', enterpriseId: 'ent-1',
        productId: 'prod-seller-route-board', validFrom: '2026-10-01', updateValidTo: '2027-09-30', status: 'active'
      }
    ]
    expect(hasExpiredEnterpriseProductEntitlement(records, 'prod-seller-route-board', 'ent-1', '2026-10-10')).toBe(false)
  })

  it('在售数据集到期后详情仅再次购买', () => {
    const expired = resolveV102Trade(product('prod-seller-route-board'), { ...team, serviceExpired: true, hasHistoricalDataAccess: true })
    expect(expired.status).toBe('服务已到期')
    expect(expired.note).toBe('已停止更新，已交付数据仍可查看、下载。')
    expect(expired.action).toMatchObject({ key: 'create_order', label: '再次购买' })
    expect(expired.secondaryAction).toBeUndefined()
  })

  it('下架数据集到期后隐藏详情操作区', () => {
    const expired = resolveV102Trade({
      ...product('prod-seller-route-board'),
      availability: 'delisted',
      status: 'delisted'
    }, { ...team, serviceExpired: true, hasHistoricalDataAccess: true })
    expect(expired.status).toBe('服务已到期 · 商品已下架')
    expect(expired.hideActions).toBe(true)
    expect(expired.action).toMatchObject({ key: 'use_dataset', label: '查看已交付数据' })
    expect(expired.secondaryAction).toBeUndefined()
  })

  it.each([false, true])('keeps the retained snapshot usable while a new order is being processed (delisted=%s)', (delisted) => {
    const p = product('prod-seller-route-board')
    const trade = resolveV102Trade(delisted ? { ...p, status: 'delisted', availability: 'delisted' } : p, {
      ...team, serviceExpired: true, hasHistoricalDataAccess: true,
      purchaseInProgress: { phase: 'pending_payment', orderId: 'new-cycle', canPay: true }
    })
    expect(trade.action.key).toBe(delisted ? 'view_order' : 'continue_order')
    expect(trade.secondaryAction).toBeUndefined()
  })

  it('到期但没有历史使用权益时不显示用数入口', () => {
    const p = product('prod-seller-route-board')
    const listed = resolveV102Trade(p, { ...team, serviceExpired: true, hasHistoricalDataAccess: false })
    expect(listed.action.key).toBe('create_order')
    expect(listed.secondaryAction).toBeUndefined()
    const delisted = resolveV102Trade({ ...p, availability: 'delisted', status: 'delisted' }, {
      ...team, serviceExpired: true, hasHistoricalDataAccess: false, hasOrderHistory: true
    })
    expect(delisted.action.key).toBe('view_order')
  })

  it('可信空间权益到期后按商品状态重新申请或查看申请', () => {
    const trusted = product('prod-enterprise-activity')
    const listed = resolveV102Trade(trusted, { ...team, serviceExpired: true })
    expect(listed.status).toBe('权益已到期')
    expect(listed.note).toBe('如需继续使用，请按当前方案重新提交申请。')
    expect(listed.action).toMatchObject({ key: 'apply', label: '重新申请' })

    const delisted = resolveV102Trade({ ...trusted, availability: 'delisted', status: 'delisted' }, { ...team, serviceExpired: true })
    expect(delisted.status).toBe('权益已到期 · 商品已下架')
    expect(delisted.note).toBe('暂不可重新申请，原申请和授权记录仍可查看。')
    expect(delisted.action).toMatchObject({ key: 'view_intent', label: '查看申请' })
  })

  it('付费看板或报告到期后按商品状态再次购买或查看订单', () => {
    const report = product('prod-logistics-monthly')
    const listed = resolveV102Trade(report, { ...team, serviceExpired: true })
    expect(listed.status).toBe('权益已到期')
    expect(listed.note).toBe('当前权益已结束，如需继续使用请重新购买。')
    expect(listed.action).toMatchObject({ key: 'create_order', label: '再次购买' })

    const delisted = resolveV102Trade({ ...report, availability: 'delisted', status: 'delisted' }, { ...team, serviceExpired: true })
    expect(delisted.status).toBe('权益已到期 · 商品已下架')
    expect(delisted.action).toMatchObject({ key: 'view_order', label: '查看订单' })
  })

  it('公开数据集和会员免费商品不产生商品到期态', () => {
    const publicDataset = resolveV102Trade(product('prod-public-freight-dataset'), { ...team, serviceExpired: true })
    expect(publicDataset.status).toBe('会员免费可用')
    expect(publicDataset.action.key).toBe('use_dataset')

    const memberFree = resolveV102Trade(product('prod-freight-index'), { ...team, serviceExpired: true })
    expect(memberFree.status).toBe('会员免费可用')
    expect(memberFree.action.key).toBe('use_content')
  })

  it('进行中的订单或申请优先于到期后的新交易', () => {
    const pending = resolveV102Trade(product('prod-seller-route-board'), {
      ...team,
      serviceExpired: true,
      purchaseInProgress: { phase: 'pending_payment', orderId: 'order-pending', canPay: true }
    })
    expect(pending.action).toMatchObject({ key: 'continue_order', label: '继续支付' })

    const intent = resolveV102Trade(product('prod-enterprise-activity'), {
      ...team,
      serviceExpired: true,
      purchaseInProgress: { phase: 'space_intent', intentId: 'intent-pending' }
    })
    expect(intent.action).toMatchObject({ key: 'view_intent', label: '查看订单' })
    expect(v102TradeStatusHint(intent)).toBe('请勿重复申请。')
  })
})

describe('企业商品权益到期判断', () => {
  const entitlement = (overrides: Partial<Entitlement> = {}): Entitlement => ({
    id: 'entitlement-expired',
    source: 'enterprise',
    type: 'dataset',
    productId: 'product-1',
    enterpriseId: 'enterprise-1',
    ownerId: 'enterprise-1',
    validFrom: '2026-01-01',
    validTo: '2026-09-30',
    status: 'active',
    ...overrides
  })

  it('优先使用更新截止日并在截止日次日判定到期', () => {
    expect(hasExpiredEnterpriseProductEntitlement([
      entitlement({ validTo: '2027-01-01', updateValidTo: '2026-09-30' })
    ], 'product-1', 'enterprise-1', '2026-10-01')).toBe(true)
  })

  it('没有更新截止日时回退到权益截止日', () => {
    expect(hasExpiredEnterpriseProductEntitlement([
      entitlement({ updateValidTo: undefined })
    ], 'product-1', 'enterprise-1', '2026-10-01')).toBe(true)
  })

  it('截止日等于今天时仍未到期', () => {
    expect(hasExpiredEnterpriseProductEntitlement([
      entitlement({ validTo: '2026-10-01' })
    ], 'product-1', 'enterprise-1', '2026-10-01')).toBe(false)
  })

  it('按企业和商品隔离且无企业身份时不判定', () => {
    const expired = entitlement()
    expect(hasExpiredEnterpriseProductEntitlement([expired], 'product-2', 'enterprise-1', '2026-10-01')).toBe(false)
    expect(hasExpiredEnterpriseProductEntitlement([expired], 'product-1', 'enterprise-2', '2026-10-01')).toBe(false)
    expect(hasExpiredEnterpriseProductEntitlement([expired], 'product-1', undefined, '2026-10-01')).toBe(false)
  })
})

it('closes delisted member-free dashboards despite an active membership access flag', () => {
  const p = { ...product('prod-freight-index'), availability: 'delisted' as const, status: 'delisted' as const }
  expect(resolveV102Trade(p, { ...team, hasAccess: true }).action).toMatchObject({ label: '前往看数', disabled: true })
})
