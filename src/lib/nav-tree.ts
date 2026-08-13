import type { NavItem } from '@/lib/nav-types';

export type { NavItem } from '@/lib/nav-types';

export type FlatNavRow = {
  id: number;
  label: string;
  href: string | null;
  parent_id: number | null;
  sort_order: number;
  meta_json?: Record<string, unknown> | null;
};

/** “Learn more” / mega-secondary rows — redundant once column headers are links. */
export function isMegaLearnMoreLink(link: { label?: string; className?: string }): boolean {
  const className = (link.className || '').toLowerCase();
  if (className.includes('mega-secondary')) return true;
  const label = (link.label || '').trim().toLowerCase();
  return /^learn\s*more\b/.test(label);
}

export function buildNavTree(rows: FlatNavRow[]): NavItem[] {
  const byParent = new Map<number | null, FlatNavRow[]>();
  for (const row of rows) {
    const key = row.parent_id ?? null;
    const list = byParent.get(key) || [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  const roots = byParent.get(null) || [];
  return roots.map((root) => {
    const meta = root.meta_json || {};
    const children = byParent.get(root.id) || [];
    const isMega =
      meta.kind === 'mega' ||
      children.some((c) => (c.meta_json || {}).kind === 'column' || (byParent.get(c.id) || []).length > 0);

    if (isMega && children.length) {
      return {
        label: root.label,
        href: root.href || undefined,
        megaClass: typeof meta.megaClass === 'string' ? meta.megaClass : undefined,
        mega: children.map((col) => ({
          heading: col.label,
          headingHref: col.href || undefined,
          links: (byParent.get(col.id) || [])
            .map((link) => ({
              label: link.label,
              href: link.href || undefined,
              className:
                typeof (link.meta_json || {}).className === 'string'
                  ? String((link.meta_json || {}).className)
                  : undefined,
            }))
            .filter((link) => !isMegaLearnMoreLink(link)),
        })),
      };
    }

    return {
      label: root.label,
      href: root.href || undefined,
      className: typeof meta.className === 'string' ? meta.className : undefined,
    };
  });
}

export type FooterColumn = {
  heading: string;
  links: Array<{ label: string; href: string; className?: string }>;
};

export function buildFooterColumns(rows: FlatNavRow[]): FooterColumn[] {
  const byParent = new Map<number | null, FlatNavRow[]>();
  for (const row of rows) {
    const key = row.parent_id ?? null;
    const list = byParent.get(key) || [];
    list.push(row);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  return (byParent.get(null) || []).map((col) => ({
    heading: col.label,
    links: (byParent.get(col.id) || []).map((link) => ({
      label: link.label,
      href: link.href || '#',
      className:
        typeof (link.meta_json || {}).className === 'string'
          ? String((link.meta_json || {}).className)
          : undefined,
    })),
  }));
}
