/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

export type PreviewKind = 'image' | 'pdf' | 'none';

/**
 * Only what a browser renders in place; everything else the upload allowlist accepts is stored,
 * not shown.
 *
 * Decided by extension rather than by the browser's reported MIME type, because the backend keys
 * its own content type off the extension too (`DocumentContentType`) — one document must not
 * preview one way before upload and another way after.
 */
export function previewKindFor(fileName: string): PreviewKind {
  const extension = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return 'image';
  return 'none';
}

/** Matches `ExtractionStorageService.MAX_FILE_SIZE_BYTES`, so an oversized file is refused here. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
