import type { CatalogPageSettings } from '@/lib/types';

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
