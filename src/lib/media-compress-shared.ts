/**
 * Browser-safe compress helpers/constants (no Node imports).
 * Keep in sync with src/lib/media-compress.ts limits.
 */

export const MEDIA_COMPRESS_MAX_IMAGES = 20;
export const MEDIA_COMPRESS_MAX_VIDEOS = 3;

export type MediaCompressUiKind = 'image' | 'video' | null;

export function mediaCompressUiKind(mime: string | null | undefined, assetPath: string): MediaCompressUiKind {
  if (mime === 'image/svg+xml' || /\.svg$/i.test(assetPath)) return null;
  if (
    (mime != null && /^image\/(jpeg|png|webp|gif)$/i.test(mime)) ||
    /\.(jpe?g|png|webp|gif)$/i.test(assetPath)
  ) {
    return 'image';
  }
  if (
    (mime != null && /^video\/(mp4|webm|quicktime)$/i.test(mime)) ||
    /\.(mp4|webm|m4v)$/i.test(assetPath)
  ) {
    return 'video';
  }
  return null;
}

export function isCompressibleMedia(mime: string | null | undefined, assetPath: string) {
  return mediaCompressUiKind(mime, assetPath) != null;
}
