import type { Product } from '@/types/domain'
import type { ProductPreview } from '@/components/ai-v104/prototypeScenes'

/** Adapt the existing AI fixture to the marketplace model; never substitute a different product. */
export function aiFindCatalogProduct(preview: ProductPreview): Product {
  const amount = /[¥￥]\s*([\d,.]+)/.exec(preview.price)
  const unit = /[／/]\s*(\S+)/.exec(preview.price)?.[1]
  const facts = preview.evidence.filter(e => e.state === 'met').map(e => e.fact)
  return {
    id: preview.id, resourceId: `res-${preview.id}`, name: preview.name,
    subtitle: preview.description, description: [preview.description, ...facts].join('；'),
    type: preview.type === 'API' ? 'api' : preview.type === '看板' ? 'dashboard' : 'dataset',
    origin: 'app_content', dealChannel: 'app_payment', availability: 'published', status: 'published',
    acquisitions: amount ? ['item_purchase'] : [],
    price: amount ? { model: 'item_only', itemPrice: Number(amount[1].replaceAll(',', '')), unit } : { model: 'quote' },
    salePeriodMonths: unit === '年' ? 12 : unit === '月' ? 1 : undefined,
    commerceOffers: amount ? (['personal', 'enterprise'] as const).map(subject => ({
      id: `offer-${preview.id}-${subject}`, name: '单品', subject,
      price: Number(amount[1].replaceAll(',', '')), currency: 'CNY', serviceMode: 'one_time',
      contentKind: preview.type === '看板' ? 'fixed_dashboard' : preview.type === 'API' ? 'quota_package' : 'snapshot'
    })) : [],
    provider: '原型示例', scenarios: [], tags: [], coverage: '', updateFrequency: '',
    qualityPromise: '', complianceNote: '', valueProposition: '', deliveryMethod: '',
    memberIncluded: false, updatedAt: '', typeDetail: {}, serviceStatus: 'normal', favorite: !!preview.saved
  }
}

/** Existing conversation snapshots also keep direct marketplace-detail URLs reloadable. */
export function restoredAiFindCatalogProducts(): Product[] {
  const products = new Map<string, Product>()
  for (const scope of ['pc', 'mobile']) {
    try {
      const snapshot = JSON.parse(localStorage.getItem(`ai-v104-demo-v1:${scope}`) || 'null')
      if (snapshot?.version !== 1 || !snapshot.catalog || typeof snapshot.catalog !== 'object') continue
      for (const item of Object.values(snapshot.catalog) as ProductPreview[]) {
        if (!item || typeof item.id !== 'string' || !item.id.startsWith('preview-') ||
          typeof item.name !== 'string' || typeof item.price !== 'string' || typeof item.description !== 'string' ||
          !['数据集', '看板', 'API'].includes(item.type) || !Array.isArray(item.evidence)) continue
        products.set(item.id, aiFindCatalogProduct(item))
      }
    } catch { /* Unavailable snapshots leave the existing marketplace catalog usable. */ }
  }
  return [...products.values()]
}
