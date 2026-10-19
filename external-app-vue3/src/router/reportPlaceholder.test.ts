import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from './index'

describe('current-release report checkout boundary', () => {
  beforeEach(async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    setActivePinia(createPinia())
    await router.push('/app/home')
  })
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ['/app/checkout/item/prod-logistics-monthly', '/app/product/prod-logistics-monthly'],
    ['/app/checkout/enterprise/prod-logistics-monthly?intent=old-intent', '/app/product/prod-logistics-monthly'],
    ['/app/checkout/dataset/prod-logistics-monthly', '/app/product/prod-logistics-monthly'],
    ['/portal/checkout/prod-logistics-monthly', '/portal/product/prod-logistics-monthly'],
    ['/portal/checkout/enterprise/prod-logistics-monthly?intent=old-intent', '/portal/product/prod-logistics-monthly'],
    ['/portal/checkout/dataset/prod-logistics-monthly', '/portal/product/prod-logistics-monthly']
  ])('returns the old purchase URL %s to the report placeholder', async (path, target) => {
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(target)
    expect(router.currentRoute.value.query.intent).toBeUndefined()
  })

  it.each([
    '/app/checkout/item/prod-cold-chain-dashboard',
    '/portal/checkout/prod-cold-chain-dashboard',
    '/app/checkout/member'
  ])('keeps the supported purchase route %s available', async path => {
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(path)
  })
})
