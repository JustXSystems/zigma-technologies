/** Shared admin media upload rules (API + UI). Keep in sync with /api/admin/media. */

export const MEDIA_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

export const MEDIA_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
] as const;

export type MediaUploadMime = (typeof MEDIA_UPLOAD_MIME_TYPES)[number];

export const MEDIA_UPLOAD_ALLOWED = new Set<string>(MEDIA_UPLOAD_MIME_TYPES);

/** Value for `<input type="file" accept="…">`. */
export const MEDIA_UPLOAD_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm';

export type MediaUploadTypeInfo = {
  mime: MediaUploadMime;
  label: string;
  extensions: string;
  folder: '/assets/images' | '/assets/svg' | '/assets/video';
};

export const MEDIA_UPLOAD_TYPE_INFO: MediaUploadTypeInfo[] = [
  { mime: 'image/jpeg', label: 'JPEG', extensions: '.jpg, .jpeg', folder: '/assets/images' },
  { mime: 'image/png', label: 'PNG', extensions: '.png', folder: '/assets/images' },
  { mime: 'image/webp', label: 'WebP', extensions: '.webp', folder: '/assets/images' },
  { mime: 'image/gif', label: 'GIF', extensions: '.gif', folder: '/assets/images' },
  { mime: 'image/svg+xml', label: 'SVG', extensions: '.svg', folder: '/assets/svg' },
  { mime: 'video/mp4', label: 'MP4 video', extensions: '.mp4', folder: '/assets/video' },
  { mime: 'video/webm', label: 'WebM video', extensions: '.webm', folder: '/assets/video' },
];

export const MEDIA_UPLOAD_RESTRICTIONS = [
  `Maximum file size: ${formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES)} per upload`,
  'Only the MIME types listed above are accepted (exact match)',
  'One file per upload from this page',
  'Raster images → /assets/images · SVG → /assets/svg · video → /assets/video',
  'PDF, HEIC, AVIF, MOV, and other formats are not supported',
] as const;

export function formatMediaBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function mediaUploadTypeLabels(): string {
  return MEDIA_UPLOAD_TYPE_INFO.map((t) => `${t.label} (${t.extensions})`).join(', ');
}

export type MediaUploadValidationFailure = {
  code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE';
  message: string;
  details: Record<string, unknown>;
};

/** Client- or server-side check before writing to disk. */
export function validateMediaUploadFile(file: {
  name: string;
  type: string;
  size: number;
}): MediaUploadValidationFailure | null {
  if (!file.size) {
    return {
      code: 'EMPTY_FILE',
      message: `“${file.name || 'file'}” is empty (0 bytes). Choose a non-empty image or video.`,
      details: { fileName: file.name || null, receivedBytes: 0 },
    };
  }

  const mime = (file.type || '').trim().toLowerCase();
  if (!MEDIA_UPLOAD_ALLOWED.has(mime)) {
    const received = mime || '(none — browser did not report a MIME type)';
    return {
      code: 'UNSUPPORTED_TYPE',
      message: `Unsupported file type ${received} for “${file.name || 'file'}”. Allowed: ${mediaUploadTypeLabels()}.`,
      details: {
        fileName: file.name || null,
        receivedType: mime || null,
        allowedTypes: [...MEDIA_UPLOAD_MIME_TYPES],
      },
    };
  }

  if (file.size > MEDIA_UPLOAD_MAX_BYTES) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `“${file.name || 'file'}” is ${formatMediaBytes(file.size)}, which exceeds the ${formatMediaBytes(MEDIA_UPLOAD_MAX_BYTES)} limit.`,
      details: {
        fileName: file.name || null,
        receivedBytes: file.size,
        maxBytes: MEDIA_UPLOAD_MAX_BYTES,
        receivedType: mime,
      },
    };
  }

  return null;
}
