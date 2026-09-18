import type { CatalogPageSettings } from '@/lib/types';
import {
  DEFAULT_DETAIL_ELEMENTS,
  normalizeDetailElements,
  type CatalogDetailElement,
} from '@/lib/types';

export const DEFAULT_HERO_ELEMENTS = [
  'eyebrow',
  'title',
  'lead',
  'meta',
  'standard_panel',
  'spotlight',
  'kicker',
  'price',
  'tags',
  'actions',
  'dots',
] as const;

export const DEFAULT_TOOLBAR_ELEMENTS = [
  'search',
  'sort',
  'result_meta',
  'filter_chips',
  'clear',
] as const;

export type HeroElement = (typeof DEFAULT_HERO_ELEMENTS)[number];
export type ToolbarElement = (typeof DEFAULT_TOOLBAR_ELEMENTS)[number];

/** Resolve visible hero pieces (JSON list, with legacy bool-column fallback).
 * Content chips (eyebrow, title, lead, meta, kicker, price, tags, actions, dots) apply to every
 * hero_variant and visual_style. standard_panel / spotlight only gate the featured-item shell. */
export function resolveHeroElements(settings: CatalogPageSettings | null | undefined): string[] {
  if (settings?.hero_elements_json?.length) return [...settings.hero_elements_json];
  let list: string[] = [...DEFAULT_HERO_ELEMENTS];
  if (settings?.hero_meta_enabled === 0) list = list.filter((e) => e !== 'meta');
  if (settings?.hero_standard_panel_enabled === 0) list = list.filter((e) => e !== 'standard_panel');
  return list;
}

export function heroHas(
  settings: CatalogPageSettings | null | undefined,
  name: HeroElement | string
): boolean {
  return resolveHeroElements(settings).includes(name);
}

export function resolveToolbarElements(settings: CatalogPageSettings | null | undefined): string[] {
  if (settings?.toolbar_elements_json?.length) return [...settings.toolbar_elements_json];
  return [...DEFAULT_TOOLBAR_ELEMENTS];
}

export function toolbarHas(
  settings: CatalogPageSettings | null | undefined,
  name: ToolbarElement | string
): boolean {
  return resolveToolbarElements(settings).includes(name);
}

/**
 * Resolve Quick-view popup components.
 * Prefers detail_elements_json; falls back to legacy modal_fields_json mapping.
 */
export function resolveDetailElements(settings: CatalogPageSettings | null | undefined): string[] {
  if (settings?.detail_elements_json?.length) {
    const raw = settings.detail_elements_json.map((v) =>
      typeof v === 'string' ? v.trim().toLowerCase() : ''
    );
    let list = normalizeDetailElements(raw);
    // Soft-migrate configs saved before close / gallery_dots existed.
    if (!raw.includes('close') && !raw.includes('gallery_dots')) {
      if (!list.includes('close')) list = ['close', ...list];
      if (list.includes('media') && !list.includes('gallery_dots')) list = [...list, 'gallery_dots'];
    }
    return list;
  }
  const fields = settings?.modal_fields_json;
  if (!fields?.length) return [...DEFAULT_DETAIL_ELEMENTS];

  const mapped = new Set<CatalogDetailElement>(['close', 'gallery_dots']);
  const map: Record<string, CatalogDetailElement[]> = {
    title: ['title'],
    summary: ['tagline'],
    description: ['overview'],
    category: ['badge'],
    price_label: ['price'],
    tags: ['tags'],
    specs: ['specs', 'highlight'],
    media: ['media', 'gallery_dots'],
    enquiry: ['enquiry', 'cta_copy', 'cta_profile', 'cta_quote', 'cta_contact'],
  };
  for (const f of fields) {
    for (const el of map[f] || []) mapped.add(el);
  }
  // Legacy modal fields also kept trust/chrome affordances.
  mapped.add('trust');
  return [...mapped];
}

export function detailHas(
  settings: CatalogPageSettings | null | undefined,
  name: CatalogDetailElement | string
): boolean {
  return resolveDetailElements(settings).includes(name);
}

export function detailHasFromList(elements: string[] | null | undefined, name: string): boolean {
  const list = elements?.length ? elements : DEFAULT_DETAIL_ELEMENTS;
  return list.includes(name);
}
