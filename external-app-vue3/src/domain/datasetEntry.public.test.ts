import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as entry from './datasetEntry'
import { useCatalogStore } from '@/stores/catalog'

describe('public dataset precise entry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each(['app', 'portal'] as const)('selects the stable resource in the public category on %s', (client) => {
    expect(entry).toHaveProperty('publicDatasetEntry')
    const product = useCatalogStore().byId('prod-public-freight-dataset')!
    product.name = 'Renamed / dataset'
    expect(entry.publicDatasetEntry(product, client)).toEqual({
      path: `/${client}/data-prepare/datasets/public`,
      query: { category: 'public', resource: 'res-prod-public-freight-dataset', product: 'prod-public-freight-dataset' }
    })
  })
})
