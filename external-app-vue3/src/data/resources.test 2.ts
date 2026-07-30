import { describe, expect, it } from 'vitest'
import { seedResources, userViewResources } from './resources'
import { seedProducts } from './products'
import { mockProducts } from './mockProducts'

describe('resource migration from products', () => {
  it('creates a resource for every seed and mock product', () => {
    expect(seedResources).toHaveLength(seedProducts.length + mockProducts.length)
  })

  it('resource ids follow the res- prefix convention', () => {
    for (const r of seedResources) {
      expect(r.id).toMatch(/^res-/)
    }
  })

  it('resource names match product names', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].resourceName).toBe(seedProducts[i].name)
    }
  })

  it('resource types match product types', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].type).toBe(seedProducts[i].type)
    }
  })

  it('resource origins match product origins', () => {
    for (let i = 0; i < seedProducts.length; i++) {
      expect(seedResources[i].origin).toBe(seedProducts[i].origin)
    }
  })

  it('every product resourceId exists in the resource list', () => {
    const resourceIds = new Set(seedResources.map((r) => r.id))
    for (const p of seedProducts) {
      expect(resourceIds.has(p.resourceId)).toBe(true)
    }
  })

  it('every mock product resourceId exists in the resource list', () => {
    const resourceIds = new Set(seedResources.map((r) => r.id))
    for (const p of mockProducts) {
      expect(resourceIds.has(p.resourceId)).toBe(true)
    }
  })
})

describe('user view resources', () => {
  it('has exactly 3 mock user view resources', () => {
    expect(userViewResources).toHaveLength(3)
  })

  it('all user views have user_view type and user_created origin', () => {
    for (const r of userViewResources) {
      expect(r.type).toBe('user_view')
      expect(r.origin).toBe('user_created')
    }
  })

  it('all user views have userView detail with externalUrl', () => {
    for (const r of userViewResources) {
      expect(r.typeDetail.userView).toBeDefined()
      expect(r.typeDetail.userView!.externalUrl).toBeTruthy()
    }
  })

  it('user view ids are unique and do not collide with migrated resources', () => {
    const migratedIds = new Set(seedResources.map((r) => r.id))
    for (const r of userViewResources) {
      expect(migratedIds.has(r.id)).toBe(false)
    }
  })
})
