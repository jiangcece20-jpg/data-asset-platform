import type { ReportPreviewImages } from '@/types/domain'

export const REPORT_PREVIEW_IMAGE_MAX = 3

export function emptyReportPreviewImages(): ReportPreviewImages {
  return { app: [], pc: [] }
}

export function normalizeReportPreviewImages(input?: ReportPreviewImages): ReportPreviewImages {
  return {
    app: (input?.app ?? []).filter(Boolean).slice(0, REPORT_PREVIEW_IMAGE_MAX),
    pc: (input?.pc ?? []).filter(Boolean).slice(0, REPORT_PREVIEW_IMAGE_MAX)
  }
}

export function cloneReportPreviewImages(input?: ReportPreviewImages): ReportPreviewImages | undefined {
  if (!input) return undefined
  return normalizeReportPreviewImages(input)
}
