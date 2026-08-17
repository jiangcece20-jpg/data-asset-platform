import { describe, expect, it } from 'vitest'
import {
  assertRequiredSellingShots,
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
})
