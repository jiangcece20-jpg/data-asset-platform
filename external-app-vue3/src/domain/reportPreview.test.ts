import { describe, expect, it } from 'vitest'
import { normalizeReportPreviewImages, REPORT_PREVIEW_IMAGE_MAX } from './reportPreviewImages'

describe('reportPreviewImages', () => {
  it('caps each platform at three images', () => {
    const urls = ['a', 'b', 'c', 'd']
    const normalized = normalizeReportPreviewImages({ app: urls, pc: urls })
    expect(normalized.app).toHaveLength(REPORT_PREVIEW_IMAGE_MAX)
    expect(normalized.pc).toHaveLength(REPORT_PREVIEW_IMAGE_MAX)
  })
})
