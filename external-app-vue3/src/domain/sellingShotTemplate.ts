/** 卖家上架：数据预览截图模版（截哪、为什么能卖、校验） */

export type SellingShotSlot = 'overview' | 'kpi' | 'trend' | 'finding'

export interface SellingShot {
  slot: SellingShotSlot
  imageDataUrl: string
  caption: string
}

export interface SellingShotSlotDef {
  slot: SellingShotSlot
  order: number
  name: string
  required: boolean
  crop: string
  why: string
  exampleCaption: string
}

export const SELLING_SHOT_SLOTS: SellingShotSlotDef[] = [
  {
    slot: 'overview',
    order: 1,
    name: '总览一屏',
    required: true,
    crop: '截数据集打开后的第一屏：筛选条 + 指标卡 + 1～2 张主图，保留完整上下文。',
    why: '3 秒看懂这是一份能干活的完整数据集，不是单张图。',
    exampleCaption: '华东干线时效一屏看准点率、平均时效与延误热点'
  },
  {
    slot: 'kpi',
    order: 2,
    name: '核心指标',
    required: true,
    crop: '只裁 KPI 卡（4～6 个数字，带同比/环比或红绿）。数字和口径名必须清楚。',
    why: '买家买单指标、买结论，不买装饰图。',
    exampleCaption: '准点率 91.2%，平均时效 18.6 小时，较上月改善'
  },
  {
    slot: 'trend',
    order: 3,
    name: '趋势或对比',
    required: false,
    crop: '截最能代表这份数据集的一张图：时间趋势、线路/区域对比或排名。图例和单位留在画面里。',
    why: '证明有分析深度，不是静态汇总。',
    exampleCaption: '近 30 天准点率从 88% 升至 91%，沪宁线改善最明显'
  },
  {
    slot: 'finding',
    order: 4,
    name: '异常或下钻',
    required: false,
    crop: '截一次筛选/下钻后的发现：某线路掉时效、某仓积压。可配红框或注释。',
    why: '证明「能发现问题」，这是转化关键图。',
    exampleCaption: '苏北支线延误次数周环比 +18%，瓶颈在卸货排队'
  }
]

export const SELLING_SHOT_TIPS = [
  '先脱敏：人名、手机、车牌、完整运单号不要入镜',
  '不要整页 Excel 网格；不要裁到没了图例/单位',
  '每张配一句卖点说明（不超过 40 字）'
]

export const SELLING_SHOT_CAPTION_MAX = 40

/** 卖家自定义补充截图（模版四槽位之外，可选） */
export interface CustomSellingShot {
  id: string
  title: string
  description: string
  imageDataUrl: string
}

export const CUSTOM_SELLING_SHOT_MAX = 1
export const CUSTOM_SELLING_SHOT_TITLE_MAX = 20
export const CUSTOM_SELLING_SHOT_DESC_MAX = 80

export function normalizeCustomSellingShots(shots: CustomSellingShot[] | undefined): CustomSellingShot[] {
  return (shots ?? [])
    .filter((shot) => shot.imageDataUrl.trim())
    .slice(0, CUSTOM_SELLING_SHOT_MAX)
    .map((shot) => ({
      id: shot.id,
      title: shot.title.trim().slice(0, CUSTOM_SELLING_SHOT_TITLE_MAX),
      description: shot.description.trim().slice(0, CUSTOM_SELLING_SHOT_DESC_MAX),
      imageDataUrl: shot.imageDataUrl
    }))
}

export function assertCustomSellingShots(shots: CustomSellingShot[] | undefined): CustomSellingShot[] {
  for (const shot of shots ?? []) {
    const hasImage = Boolean(shot.imageDataUrl.trim())
    const hasTitle = Boolean(shot.title.trim())
    const hasDesc = Boolean(shot.description.trim())
    if (!hasImage && (hasTitle || hasDesc)) {
      throw new Error('自定义截图已填写标题或描述，请上传图片')
    }
    if (hasImage && !hasTitle) {
      throw new Error('自定义截图须填写标题')
    }
    if (hasImage && hasTitle && !hasDesc) {
      throw new Error(`请为「${shot.title.trim()}」填写描述`)
    }
  }
  const normalized = normalizeCustomSellingShots(shots)
  if (normalized.length > CUSTOM_SELLING_SHOT_MAX) {
    throw new Error(`自定义截图最多 ${CUSTOM_SELLING_SHOT_MAX} 张`)
  }
  return normalized
}

export function exampleCustomSellingShot(): CustomSellingShot {
  return {
    id: 'custom-demo-1',
    title: '线路对比专题',
    description: '沪宁线与苏北支线时效对比，帮助买家判断适用场景',
    imageDataUrl: exampleShotImage('trend')
  }
}

const SLOT_STYLE: Record<SellingShotSlot, { bg: string; accent: string; label: string }> = {
  overview: { bg: '#0f172a', accent: '#38bdf8', label: '总览' },
  kpi: { bg: '#111827', accent: '#34d399', label: '指标' },
  trend: { bg: '#1e1b4b', accent: '#a78bfa', label: '趋势' },
  finding: { bg: '#431407', accent: '#fb923c', label: '发现' }
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function exampleShotImage(slot: SellingShotSlot): string {
  const style = SLOT_STYLE[slot]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" rx="16" fill="${style.bg}"/>
    <rect x="24" y="24" width="160" height="18" rx="4" fill="${style.accent}" opacity="0.35"/>
    <text x="24" y="78" fill="white" font-size="22" font-family="sans-serif">${style.label}示例截图</text>
    <rect x="24" y="110" width="180" height="72" rx="8" fill="white" opacity="0.08"/>
    <rect x="220" y="110" width="180" height="72" rx="8" fill="white" opacity="0.08"/>
    <rect x="416" y="110" width="180" height="72" rx="8" fill="white" opacity="0.08"/>
    <rect x="24" y="204" width="592" height="120" rx="10" fill="${style.accent}" opacity="0.22"/>
  </svg>`
  return svgDataUrl(svg)
}

export function exampleSellingShot(slot: SellingShotSlot): SellingShot {
  const def = SELLING_SHOT_SLOTS.find((item) => item.slot === slot)!
  return {
    slot,
    imageDataUrl: exampleShotImage(slot),
    caption: def.exampleCaption
  }
}

export function exampleSellingShots(): SellingShot[] {
  return SELLING_SHOT_SLOTS.map((item) => exampleSellingShot(item.slot))
}

export function normalizeSellingShots(shots: SellingShot[] | undefined): SellingShot[] {
  const bySlot = new Map((shots ?? []).filter((shot) => shot.imageDataUrl).map((shot) => [shot.slot, {
    slot: shot.slot,
    imageDataUrl: shot.imageDataUrl,
    caption: shot.caption.trim().slice(0, SELLING_SHOT_CAPTION_MAX)
  }]))
  return SELLING_SHOT_SLOTS
    .map((item) => bySlot.get(item.slot))
    .filter((shot): shot is SellingShot => Boolean(shot))
}

export function filledShotCount(shots: SellingShot[] | undefined): number {
  return normalizeSellingShots(shots).length
}

export function assertRequiredSellingShots(shots: SellingShot[] | undefined): SellingShot[] {
  const normalized = normalizeSellingShots(shots)
  const present = new Set(normalized.map((shot) => shot.slot))
  const missing = SELLING_SHOT_SLOTS.filter((item) => item.required && !present.has(item.slot))
  if (missing.length) {
    throw new Error(`请上传${missing.map((item) => item.name).join('、')}截图`)
  }
  return normalized
}
