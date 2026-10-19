import type { Entitlement, Product } from '@/types/domain'
import type { PurchaseInProgress } from './productAccess'
import { commerceOffersOf, salePeriodMonthsOf } from './commerceOffers'
import { purchaseMoney } from './portalPurchase'
import { shanghaiDate } from '@/utils/businessDate'

export type V102TradeActionKey = 'create_order' | 'continue_order' | 'view_order' | 'use_dataset' | 'use_content' | 'apply' | 'view_intent' | 'open_membership' | 'unavailable'
export interface V102TradeAction { key: V102TradeActionKey; label: string; disabled?: boolean }
export interface V102Trade {
  plan: 'public_free' | 'member_free' | 'member_discount' | 'merchant' | 'dataset_order' | 'trusted_space'
  price: string
  priceUnit?: string
  badge: string
  note: string
  status: string
  /** Delisted detail pages never render or execute actions. */
  hideActions?: boolean
  action: V102TradeAction
  secondaryAction?: V102TradeAction
}
export interface V102TradeContext {
  isTeam: boolean
  hasMembership: boolean
  hasAccess: boolean
  hasHistoricalDataAccess?: boolean
  purchaseInProgress?: PurchaseInProgress | null
  serviceExpired?: boolean
  hasOrderHistory?: boolean
}

const routineTradeStatuses = new Set(['试用会员', '需开通企业会员', '会员免费可用', '可申请', '可购买'])

export function v102TradeDescription(trade: V102Trade): string {
  if (trade.status.includes('已到期')) return `${trade.status}：${trade.note}`
  return routineTradeStatuses.has(trade.status) ? trade.note : trade.status
}

// Operational hints must not repeat the product's fixed pricing description.
export function v102TradeStatusHint(trade: V102Trade): string | undefined {
  if (trade.status.includes('已到期') || trade.status === '试用会员') return trade.note
  if (trade.status === '待支付') return '请勿重复下单。'
  if (trade.status === '申请处理中') return '请勿重复申请。'
  if (trade.status === '订单处理中') return '处理进度请在订单中查看。'
  if (trade.status === '原订单保留 · 商品下架') return '商品下架后不再接受新付款。'
  if (trade.status === '已开通 · 商品下架') return '商品已下架；已交付数据可用时仍可使用。'
  return undefined
}

export function hasExpiredEnterpriseProductEntitlement(
  entitlements: Entitlement[],
  productId: string,
  enterpriseId?: string,
  today = shanghaiDate()
): boolean {
  if (!enterpriseId) return false
  const matching = entitlements.filter((item) => {
    if (item.productId !== productId || item.type === 'member') return false
    if (item.source !== 'enterprise' || item.ownerId !== enterpriseId) return false
    if (item.status !== 'active' && item.status !== 'expired') return false
    return true
  })
  const isCurrent = matching.some((item) => {
    const expiresAt = item.updateValidTo || item.validTo
    return item.status === 'active'
      && item.validFrom.slice(0, 10) <= today
      && (!expiresAt || expiresAt >= today)
  })
  if (isCurrent) return false
  return matching.some((item) => {
    const expiresAt = item.updateValidTo || item.validTo
    return item.status === 'expired' || Boolean(expiresAt && expiresAt < today)
  })
}

function isOnce(frequency: string): boolean {
  return frequency === '一次性' || frequency === '不更新' || frequency === '一次性交付'
}

export function resolveV102Trade(product: Product, context: V102TradeContext): V102Trade {
  const space = product.dealChannel === 'space_purchase'
  const dataset = product.type === 'dataset'
  const publicFree = product.type === 'dataset' && product.publicDataset === true
  const memberFree = !space && !dataset && (product.price.model === 'member_free' || product.acquisitions.includes('free'))
  const merchant = product.type === 'dataset' && product.origin === 'seller_market'
  const plan: V102Trade['plan'] = space ? 'trusted_space' : publicFree ? 'public_free' : merchant ? 'merchant' : memberFree ? 'member_free' : dataset ? 'dataset_order' : 'member_discount'
  const enterpriseOffer = commerceOffersOf(product, true).find((offer) => offer.subject === 'enterprise')
  const apiPlanPrices = product.typeDetail.api?.pricingPlans
    ?.map((item) => Number(/¥\s*([\d,]+(?:\.\d+)?)/.exec(item.price)?.[1]?.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value)) ?? []
  const amount = enterpriseOffer?.price ?? product.price.itemPrice ?? 0
  const period = salePeriodMonthsOf(product)
  const scheduled = !isOnce(product.updateFrequency)
  const discountFactor = product.price.memberDiscount ?? 0.6
  const effectiveAmount = plan === 'member_discount' ? Math.round(amount * discountFactor * 100) / 100 : amount
  const price = memberFree || publicFree ? '会员免费' : space ? (enterpriseOffer ? purchaseMoney(enterpriseOffer.price) : apiPlanPrices.length ? purchaseMoney(Math.min(...apiPlanPrices)) : '待报价') : purchaseMoney(effectiveAmount)
  const priceUnit = merchant ? `/ ${period}个月` : undefined
  const badge = merchant ? '企业购买' : publicFree || memberFree ? '会员免费' : space ? '可信空间申请' : dataset ? (amount === 0 ? '非公开 · 须下单' : '企业购买') : '会员折扣'
  const note = publicFree
    ? '源于用数公开数据集；企业会员直接用数，无订单。'
    : merchant
      ? `${product.updateFrequency} · ${period}个月服务期 · ${scheduled ? '自动交付更新' : '交付当前版本'}`
      : dataset && amount === 0
        ? '非公开数据表仍需下单；¥0 订单完成后发权益。'
        : memberFree
          ? '企业会员直接使用，无需下单。'
          : space
            ? '按可信空间的当前方案申请，授权以源端为准。'
            : '企业会员购买，权益在企业内共享。'
  const base = { plan, price, priceUnit, badge, note, hideActions: [product.availability, product.status].some(status => ['delisted', 'paused'].includes(status)) }
  const delisted = ['delisted', 'paused'].includes(product.availability) || ['delisted', 'paused'].includes(product.status)
  const blocked = product.serviceStatus === 'terminated' || product.serviceStatus === 'suspended'
  const useAction: V102TradeAction = space ? { key: 'view_order', label: '前往订单' }
    : dataset ? { key: 'use_dataset', label: '前往用数' } : { key: 'use_content', label: product.type === 'dashboard' ? '前往看数' : '查看内容' }
  const delistedAction: V102TradeAction = {
    key: 'unavailable', disabled: true,
    label: space ? '提交试用申请' : publicFree || memberFree ? useAction.label
      : amount === 0 ? '确认下单' : merchant ? '购买数据集' : '立即购买'
  }

  const phase = context.purchaseInProgress
  if (blocked) return { ...base, status: '服务不可用', action: phase
    ? { key: phase.phase === 'space_intent' ? 'view_intent' : 'view_order', label: '查看订单' }
    : context.hasOrderHistory ? { key: space ? 'view_intent' : 'view_order', label: '查看订单' }
      : { key: 'unavailable', label: '暂不可开通', disabled: true } }
  if ((publicFree || memberFree) && delisted) return { ...base, status: '商品已下架', action: delistedAction }
  if (!context.isTeam && !delisted) return { ...base, status: '试用会员', note: '试用会员不能购买或申请。', action: { key: 'open_membership', label: '开通会员' } }
  if (context.hasAccess) return { ...base, status: delisted ? '已开通 · 商品下架' : '已开通', action: useAction,
    secondaryAction: phase ? { key: phase.phase === 'space_intent' ? 'view_intent' : 'view_order', label: '查看新单' } : undefined }
  if (phase) {
    if (phase.phase === 'space_intent') return { ...base, status: '申请处理中', action: { key: 'view_intent', label: '查看订单' } }
    const secondaryAction: V102TradeAction | undefined = undefined
    if (delisted) return { ...base, status: '原订单保留 · 商品下架', action: { key: 'view_order', label: '查看订单' }, secondaryAction }
    if (phase.phase === 'pending_payment') return { ...base, status: '待支付', action: { key: 'continue_order', label: phase.canPay ? '继续支付' : '查看订单' }, secondaryAction }
    return { ...base, status: '订单处理中', action: { key: 'view_order', label: '查看订单' }, secondaryAction }
  }
  if (context.serviceExpired && !publicFree && !memberFree) {
    if (space) {
      return delisted
        ? { ...base, status: '权益已到期 · 商品已下架', note: '暂不可重新申请，原申请和授权记录仍可查看。', action: { key: 'view_intent', label: '查看申请' } }
        : { ...base, status: '权益已到期', note: '如需继续使用，请按当前方案重新提交申请。', action: { key: 'apply', label: '重新申请' } }
    }
    if (dataset) {
      const historyAction: V102TradeAction = { key: 'use_dataset', label: '查看已交付数据' }
      if (!context.hasHistoricalDataAccess) return delisted
        ? { ...base, status: '服务已到期 · 商品已下架', note: '当前无可用数据权益。', action: context.hasOrderHistory
          ? { key: 'view_order', label: '查看订单' } : delistedAction }
        : { ...base, status: '服务已到期', note: '当前无可用数据权益。', action: { key: 'create_order', label: '再次购买' } }
      return delisted
        ? { ...base, status: '服务已到期 · 商品已下架', note: '已停止更新，已交付数据仍可查看、下载。', action: historyAction }
        : { ...base, status: '服务已到期', note: '已停止更新，已交付数据仍可查看、下载。', action: { key: 'create_order', label: '再次购买' } }
    }
    return delisted
      ? { ...base, status: '权益已到期 · 商品已下架', note: '当前权益已结束，原订单仍可查看。', action: { key: 'view_order', label: '查看订单' } }
      : { ...base, status: '权益已到期', note: '当前权益已结束，如需继续使用请重新购买。', action: { key: 'create_order', label: '再次购买' } }
  }
  if (delisted) return { ...base, status: '商品已下架', action: context.hasOrderHistory
    ? { key: space ? 'view_intent' : 'view_order', label: '查看订单' } : delistedAction }
  if (!context.isTeam) return { ...base, status: '试用会员', note: '试用会员不能购买或申请。', action: { key: 'open_membership', label: '开通会员' } }
  // 可信空间由源端承接申请，企业身份即可发起意向单，不要求先购买平台企业会员。
  if (space) return { ...base, status: '可申请', action: { key: 'apply', label: '提交试用申请' } }
  if ((publicFree || memberFree) && context.hasMembership) return { ...base, status: '会员免费可用', action: useAction }
  if (!context.hasMembership) return { ...base, status: '需开通企业会员', action: { key: 'open_membership', label: '开通会员' } }
  return { ...base, status: '可购买', action: { key: 'create_order', label: amount === 0 ? '¥0 下单' : merchant ? '购买数据集' : '立即购买' } }
}
