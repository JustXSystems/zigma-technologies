import type { NavItem } from '@/lib/nav-types';

export type { NavItem } from '@/lib/nav-types';

export type FlatNavRow = {
  id: number;
  label: string;
  href: string | null;
  parent_id: number | null;
  sort_order: number;
  /** When false, row is omitted from public link lists (column headers may still show if children are enabled). */
  enabled?: boolean;
  meta_json?: Record<string, unknown> | null;
};

function rowIsEnabled(row: FlatNavRow): boolean {
  return row.enabled !== false;
}

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

  const roots = (byParent.get(null) || []).filter(rowIsEnabled);
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
        mega: children.filter(rowIsEnabled).map((col) => ({
          heading: col.label,
          headingHref: col.href || undefined,
          links: (byParent.get(col.id) || [])
            .filter(rowIsEnabled)
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

function hasEnabledDescendant(
  parentId: number,
  byParent: Map<number | null, FlatNavRow[]>
): boolean {
  for (const child of byParent.get(parentId) || []) {
    if (rowIsEnabled(child)) return true;
    if (hasEnabledDescendant(child.id, byParent)) return true;
  }
  return false;
}

/** Collect every enabled link under a footer column (any nesting depth). */
function flattenEnabledFooterLinks(
  parentId: number,
  byParent: Map<number | null, FlatNavRow[]>,
  out: FlatNavRow[]
) {
  for (const child of byParent.get(parentId) || []) {
    if (!rowIsEnabled(child)) continue;
    const nested = byParent.get(child.id) || [];
    if (nested.length) {
      if (child.href) out.push(child);
      flattenEnabledFooterLinks(child.id, byParent, out);
    } else {
      out.push(child);
    }
  }
}

function mapFooterLink(link: FlatNavRow) {
  return {
    label: link.label,
    href: link.href || '#',
    className:
      typeof (link.meta_json || {}).className === 'string'
        ? String((link.meta_json || {}).className)
        : undefined,
  };
}

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

  const topLevel = (byParent.get(null) || []).filter(
    (col) => rowIsEnabled(col) || hasEnabledDescendant(col.id, byParent)
  );

  return topLevel.map((col) => {
    const linkRows: FlatNavRow[] = [];
    flattenEnabledFooterLinks(col.id, byParent, linkRows);
    if (!linkRows.length && rowIsEnabled(col) && col.href) {
      linkRows.push(col);
    }
    return {
      heading: col.label,
      links: linkRows.map(mapFooterLink),
    };
  });
}
