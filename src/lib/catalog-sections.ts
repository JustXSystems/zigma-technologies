import type { CmsSection } from '@/lib/cms-types';
import { SECTION_TYPES } from '@/lib/cms-types';

/** Sections every catalog page ships with; they can be hidden, reordered, removed and re-added. */
export const CATALOG_BUILTIN_SECTIONS = [
  {
    key: 'hero',
    label: 'Hero spotlight',
    description: 'Top banner: title, lead, rotating spotlight items and background media (Hero tab).',
  },
  {
    key: 'listing',
    label: 'Catalogue listing',
    description: 'Search toolbar, profile rail, filters, Quick find and the item grid (Listing and Discovery tabs).',
  },
  {
    key: 'social_proof',
    label: 'Trusted partners strip',
    description: 'Partner logo strip with a link to Certifications.',
  },
] as const;

export type CatalogBuiltinSectionKey = (typeof CATALOG_BUILTIN_SECTIONS)[number]['key'];

export type CatalogSectionEntry = {
  id: string;
  /** builtin = catalog component (type is a CatalogBuiltinSectionKey); cms = any /admin/pages section type */
  kind: 'builtin' | 'cms';
  type: string;
  enabled: boolean;
  title?: string | null;
  section_key?: string | null;
  content_json?: Record<string, unknown>;
  style_json?: Record<string, unknown>;
};

export const CATALOG_SECTIONS_MAX = 40;

const BUILTIN_KEYS = new Set<string>(CATALOG_BUILTIN_SECTIONS.map((s) => s.key));
const CMS_TYPES = new Set<string>(SECTION_TYPES.map((t) => t.type));

export function isCatalogBuiltinKey(value: unknown): value is CatalogBuiltinSectionKey {
  return typeof value === 'string' && BUILTIN_KEYS.has(value);
}

export function catalogBuiltinMeta(key: string) {
  return CATALOG_BUILTIN_SECTIONS.find((s) => s.key === key);
}

export function newCatalogSectionId(prefix = 'sec'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultCatalogSections(): CatalogSectionEntry[] {
  return CATALOG_BUILTIN_SECTIONS.map((s) => ({ id: s.key, kind: 'builtin', type: s.key, enabled: true }));
}

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Never configured (null / not an array) → the default built-in trio.
 * A saved array is respected as-is, so removing every section stays removed.
 */
export function normalizeCatalogSections(raw: unknown): CatalogSectionEntry[] {
  if (!Array.isArray(raw)) return defaultCatalogSections();
  const seenIds = new Set<string>();
  const seenBuiltins = new Set<string>();
  const out: CatalogSectionEntry[] = [];
  for (const value of raw) {
    if (out.length >= CATALOG_SECTIONS_MAX) break;
    const entry = plainObject(value);
    const kind = entry.kind === 'builtin' ? 'builtin' : entry.kind === 'cms' ? 'cms' : null;
    const type = typeof entry.type === 'string' ? entry.type : '';
    if (!kind) continue;
    if (kind === 'builtin' && (!BUILTIN_KEYS.has(type) || seenBuiltins.has(type))) continue;
    if (kind === 'cms' && !CMS_TYPES.has(type)) continue;
    let id = typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim().slice(0, 64) : '';
    if (!id || seenIds.has(id)) id = kind === 'builtin' && !seenIds.has(type) ? type : newCatalogSectionId();
    seenIds.add(id);
    const enabled = entry.enabled !== false && entry.enabled !== 0;
    if (kind === 'builtin') {
      seenBuiltins.add(type);
      out.push({ id, kind, type, enabled });
      continue;
    }
    out.push({
      id,
      kind,
      type,
      enabled,
      title: typeof entry.title === 'string' ? entry.title.slice(0, 255) : null,
      section_key: typeof entry.section_key === 'string' && entry.section_key ? entry.section_key.slice(0, 120) : null,
      content_json: plainObject(entry.content_json),
      style_json: plainObject(entry.style_json),
    });
  }
  return out;
}

/** Shape a catalog CMS entry like a page_sections row so SectionRenderer / SectionEditor can use it. */
export function catalogSectionToCms(entry: CatalogSectionEntry, index: number): CmsSection {
  return {
    id: index + 1,
    page_id: 0,
    type: entry.type,
    section_key: entry.section_key ?? null,
    title: entry.title ?? null,
    sort_order: index,
    enabled: entry.enabled ? 1 : 0,
    content_json: entry.content_json || {},
    style_json: entry.style_json || {},
  };
}
