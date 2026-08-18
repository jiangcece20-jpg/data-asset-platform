import { describe, expect, it } from 'vitest'
import {
  assertCustomSellingShots,
  assertRequiredSellingShots,
  exampleCustomSellingShot,
  exampleSellingShot,
  exampleSellingShots,
  filledShotCount,
  normalizeSellingShots
} from './sellingShotTemplate'

describe('sellingShotTemplate', () => {
  it('requires overview and kpi screenshots', () => {
    expect(() => assertRequiredSellingShots([])).toThrow('请上传总览一屏、核心指标截图')
    expect(() => assertRequiredSellingShots([exampleSellingShot('overview')])).toThrow('请上传核心指标截图')
    expect(assertRequiredSellingShots([
      exampleSellingShot('overview'),
      exampleSellingShot('kpi')
    ])).toHaveLength(2)
  })

  it('keeps slot order and drops empty images', () => {
    const shots = normalizeSellingShots([
      { ...exampleSellingShot('finding'), caption: '  发现  ' },
      { slot: 'kpi', imageDataUrl: '', caption: '空' },
      exampleSellingShot('overview')
    ])
    expect(shots.map((shot) => shot.slot)).toEqual(['overview', 'finding'])
    expect(shots[1].caption).toBe('发现')
  })

  it('counts filled example shots as 4/4', () => {
    expect(filledShotCount(exampleSellingShots())).toBe(4)
  })

  it('requires title and description for custom shots with image', () => {
    expect(() => assertCustomSellingShots([
      { id: 'c1', title: '', description: '', imageDataUrl: 'data:image/png;base64,x' }
    ])).toThrow('自定义截图须填写标题')
    expect(() => assertCustomSellingShots([
      { id: 'c1', title: '专题', description: '', imageDataUrl: 'data:image/png;base64,x' }
    ])).toThrow('请为「专题」填写描述')
    expect(assertCustomSellingShots([exampleCustomSellingShot()])).toHaveLength(1)
  })
})
