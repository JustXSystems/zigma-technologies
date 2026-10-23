/** Mirror of control-plane gates — agents should refuse forbidden kinds even if pushed. */

export const ALLOWED_PATCH_KINDS = new Set([
  'meta',
  'schema',
  'canonical',
  'sitemap-hint',
  'alt',
  'robots-hint',
  'verify-meta',
  'redirect-hint',
  'indexnow-key',
]);

export const FORBIDDEN_PATCH_KINDS = new Set([
  'city-index',
  'review-email',
  'content-factory',
  'doorway',
  'bulk-publish',
  'thin-page',
]);

export function isPatchAllowed(patch) {
  const kind = String(patch?.kind || '').toLowerCase();
  if (FORBIDDEN_PATCH_KINDS.has(kind)) return { ok: false, reason: `forbidden kind: ${kind}` };
  if (!ALLOWED_PATCH_KINDS.has(kind)) return { ok: false, reason: `unknown kind: ${kind}` };
  if (patch?.payload?.forceIndex === true) return { ok: false, reason: 'forceIndex blocked' };
  if (patch?.payload?.sendReviewEmail === true) return { ok: false, reason: 'review auto-send blocked' };
  if (patch?.payload?.massPublish === true) return { ok: false, reason: 'mass publish blocked' };
  return { ok: true };
}
