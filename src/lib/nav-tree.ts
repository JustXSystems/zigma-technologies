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
  id: number;
  heading: string;
  links: Array<{ id: number; label: string; href: string; className?: string }>;
};

function groupByParent(rows: FlatNavRow[]) {
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
  return byParent;
}

function hasEnabledDescendant(parentId: number, byParent: Map<number | null, FlatNavRow[]>): boolean {
  for (const child of byParent.get(parentId) || []) {
    if (rowIsEnabled(child)) return true;
    if (hasEnabledDescendant(child.id, byParent)) return true;
  }
  return false;
}

/** Every enabled descendant in tree order — 1:1 with Admin → Footer child rows (no skipping). */
function collectEnabledDescendants(
  parentId: number,
  byParent: Map<number | null, FlatNavRow[]>,
  out: FlatNavRow[]
) {
  for (const child of byParent.get(parentId) || []) {
    if (!rowIsEnabled(child)) continue;
    out.push(child);
    collectEnabledDescendants(child.id, byParent, out);
  }
}

function mapFooterLink(link: FlatNavRow) {
  return {
    id: link.id,
    label: link.label,
    href: link.href || '#',
    className:
      typeof (link.meta_json || {}).className === 'string'
        ? String((link.meta_json || {}).className)
        : undefined,
  };
}

/**
 * Public footer columns = Admin → Navigation (footer) only.
 * - Top-level rows → column headings
 * - Every enabled descendant → one link (tree order)
 * - Orphans (parent missing) → extra column so nothing is silently dropped
 */
export function buildFooterColumns(rows: FlatNavRow[]): FooterColumn[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const byParent = groupByParent(rows);

  const topLevel = (byParent.get(null) || []).filter(
    (col) => rowIsEnabled(col) || hasEnabledDescendant(col.id, byParent)
  );

  const claimed = new Set<number>();
  const columns: FooterColumn[] = topLevel.map((col) => {
    const descendants: FlatNavRow[] = [];
    collectEnabledDescendants(col.id, byParent, descendants);
    for (const d of descendants) claimed.add(d.id);

    // Lone top-level row with an href and no children → single link column
    if (!descendants.length && rowIsEnabled(col) && col.href) {
      claimed.add(col.id);
      return { id: col.id, heading: col.label, links: [mapFooterLink(col)] };
    }

    return {
      id: col.id,
      heading: col.label,
      links: descendants.map(mapFooterLink),
    };
  });

  const orphans = rows.filter(
    (r) =>
      rowIsEnabled(r) &&
      r.parent_id != null &&
      !claimed.has(r.id) &&
      !byId.has(r.parent_id)
  );
  if (orphans.length) {
    orphans.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    columns.push({
      id: -1,
      heading: 'More',
      links: orphans.map(mapFooterLink),
    });
  }

  return columns;
}
