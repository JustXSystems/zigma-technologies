import type { CatalogItem } from '@/lib/types';

/** Brochure / spec PDF URL stored on item CTA config. */
export function getBrochureUrl(item: Pick<CatalogItem, 'cta_config_json'> | null | undefined): string | null {
  const cfg = item?.cta_config_json;
  if (!cfg || typeof cfg !== 'object') return null;
  const url = cfg.brochure_url;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

export function withBrochureUrl(
  cta: Record<string, unknown> | null | undefined,
  brochureUrl: string | null | undefined
): Record<string, unknown> | null {
  const next = { ...(cta && typeof cta === 'object' ? cta : {}) };
  if (brochureUrl && brochureUrl.trim()) {
    next.brochure_url = brochureUrl.trim();
  } else {
    delete next.brochure_url;
  }
  return Object.keys(next).length ? next : null;
}
