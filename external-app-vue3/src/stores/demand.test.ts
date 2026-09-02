import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDemandStore } from './demand'
import { useUserStore } from './user'

const basePayload = {
  question: '需要华东 PVC 月度数据',
  filters: [],
  browsedProductIds: [],
  objectDesc: '华东 PVC 月度数据',
  region: '',
  timeRange: '',
  updateFreq: '',
  scenario: '产能评估',
  expectedDelivery: ''
}

describe('useDemandStore.submit contact snapshot', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('stores editable contact name and login account separately', () => {
    const user = useUserStore()
    expect(user.context.name).toBe('陈静')
    expect(user.context.phone).toBe('138****2201')

    const demand = useDemandStore()
    const lead = demand.submit({
      ...basePayload,
      priceRange: '0-5000',
      contact: '139****1111',
      contactName: '张三'
    })

    expect(lead).toMatchObject({
      contactName: '张三',
      contact: '13900001111',
      submitterAccount: '13800002201',
      submitterUserId: 'mem-1',
      priceRange: '0-5000'
    })
  })

  it('defaults contact name from login when the form omits it', () => {
    const demand = useDemandStore()
    const lead = demand.submit(basePayload)

    expect(lead.contactName).toBe('陈静')
    expect(lead.submitterAccount).toBe('13800002201')
    expect(lead.submitterUserId).toBe('mem-1')
  })
})
