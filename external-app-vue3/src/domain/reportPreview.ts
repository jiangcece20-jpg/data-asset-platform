import type { ReportPreviewImages } from '@/types/domain'

export type { ReportPreviewImages } from '@/types/domain'
export {
  REPORT_PREVIEW_IMAGE_MAX,
  cloneReportPreviewImages,
  emptyReportPreviewImages,
  normalizeReportPreviewImages
} from './reportPreviewImages'

export type ReportPreviewPlatform = 'app' | 'pc'

export function imagesForPlatform(images: ReportPreviewImages | undefined, platform: ReportPreviewPlatform): string[] {
  return platform === 'app' ? images?.app ?? [] : images?.pc ?? []
}
