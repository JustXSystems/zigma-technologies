/** Configurable sticky mobile CTA bar + floating action buttons (Site Settings). */

export const FLOATING_CTA_ZONES = [
  { id: 'sticky', label: 'Sticky mobile bar' },
  { id: 'float', label: 'Floating button (desktop + mobile)' },
] as const;

export type FloatingCtaZone = (typeof FLOATING_CTA_ZONES)[number]['id'];

export const FLOATING_CTA_ACTIONS = [
  { id: 'call', label: 'Call (main phone)' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'consultation', label: 'Open enquiry form' },
  { id: 'callback', label: 'Request callback' },
  { id: 'link', label: 'Custom link' },
] as const;

export type FloatingCtaAction = (typeof FLOATING_CTA_ACTIONS)[number]['id'];

export const FLOATING_CTA_STYLES = [
  { id: 'call', label: 'Navy / call' },
  { id: 'wa', label: 'Green / WhatsApp' },
  { id: 'quote', label: 'Orange / primary' },
  { id: 'ghost', label: 'Ghost (outline)' },
  { id: 'float', label: 'Floating circle (WhatsApp green)' },
] as const;

export type FloatingCtaStyle = (typeof FLOATING_CTA_STYLES)[number]['id'];

export type FloatingCtaItem = {
  id: string;
  label: string;
  /** Accessible name when label is short / icon-only float */
  ariaLabel: string;
  action: FloatingCtaAction;
  href: string;
  consultSubject: string;
  style: FloatingCtaStyle;
  zone: FloatingCtaZone;
  enabled: boolean;
  openInNewTab: boolean;
  /**
   * Show only on these path prefixes (comma-separated). Empty = all pages.
   * Example: `/careers`
   */
  pathsInclude: string;
  /**
   * Hide on these path prefixes (comma-separated).
   * Example: `/careers`
   */
  pathsExclude: string;
};

export type FloatingCtaConfig = {
  stickyEnabled: boolean;
  floatEnabled: boolean;
  items: FloatingCtaItem[];
};

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return `f${Date.now().toString(36)}`;
}

function isZone(value: unknown): value is FloatingCtaZone {
  return FLOATING_CTA_ZONES.some((z) => z.id === value);
}

function isAction(value: unknown): value is FloatingCtaAction {
  return FLOATING_CTA_ACTIONS.some((a) => a.id === value);
}

function isStyle(value: unknown): value is FloatingCtaStyle {
  return FLOATING_CTA_STYLES.some((s) => s.id === value);
}

export function createFloatingCtaItem(partial?: Partial<FloatingCtaItem>): FloatingCtaItem {
  return {
    id: partial?.id?.trim() || newId(),
    label: partial?.label?.trim() || 'New button',
    ariaLabel: typeof partial?.ariaLabel === 'string' ? partial.ariaLabel : '',
    action: isAction(partial?.action) ? partial.action : 'link',
    href: typeof partial?.href === 'string' ? partial.href : '',
    consultSubject: typeof partial?.consultSubject === 'string' ? partial.consultSubject : 'Request a Quote',
    style: isStyle(partial?.style) ? partial.style : 'quote',
    zone: isZone(partial?.zone) ? partial.zone : 'sticky',
    enabled: partial?.enabled !== false,
    openInNewTab: Boolean(partial?.openInNewTab),
    pathsInclude: typeof partial?.pathsInclude === 'string' ? partial.pathsInclude : '',
    pathsExclude: typeof partial?.pathsExclude === 'string' ? partial.pathsExclude : '',
  };
}

export const DEFAULT_FLOATING_CTA: FloatingCtaConfig = {
  stickyEnabled: true,
  floatEnabled: true,
  items: [
    createFloatingCtaItem({
      id: 'sticky-call',
      label: 'Call',
      action: 'call',
      style: 'call',
      zone: 'sticky',
    }),
    createFloatingCtaItem({
      id: 'sticky-wa',
      label: 'WhatsApp',
      action: 'whatsapp',
      style: 'wa',
      zone: 'sticky',
      openInNewTab: true,
    }),
    createFloatingCtaItem({
      id: 'sticky-quote',
      label: 'Quote',
      action: 'consultation',
      consultSubject: 'Request a Quote',
      style: 'quote',
      zone: 'sticky',
      pathsExclude: '/careers',
    }),
    createFloatingCtaItem({
      id: 'sticky-apply',
      label: 'Apply Now',
      action: 'link',
      href: '/careers#apply',
      style: 'quote',
      zone: 'sticky',
      pathsInclude: '/careers',
    }),
    createFloatingCtaItem({
      id: 'float-wa',
      label: 'WhatsApp',
      ariaLabel: 'Chat on WhatsApp',
      action: 'whatsapp',
      style: 'float',
      zone: 'float',
      openInNewTab: true,
    }),
  ],
};

function sanitizeItem(raw: unknown): FloatingCtaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  return createFloatingCtaItem({
    id: typeof row.id === 'string' ? row.id : undefined,
    label,
    ariaLabel: typeof row.ariaLabel === 'string' ? row.ariaLabel : '',
    action: isAction(row.action) ? row.action : 'link',
    href: typeof row.href === 'string' ? row.href : '',
    consultSubject: typeof row.consultSubject === 'string' ? row.consultSubject : 'Request a Quote',
    style: isStyle(row.style) ? row.style : 'quote',
    zone: isZone(row.zone) ? row.zone : 'sticky',
    enabled: row.enabled !== false && row.enabled !== 0 && row.enabled !== 'false',
    openInNewTab: Boolean(row.openInNewTab),
    pathsInclude: typeof row.pathsInclude === 'string' ? row.pathsInclude : '',
    pathsExclude: typeof row.pathsExclude === 'string' ? row.pathsExclude : '',
  });
}

export function parseFloatingCta(raw: unknown): FloatingCtaConfig {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return structuredClone(DEFAULT_FLOATING_CTA);
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return structuredClone(DEFAULT_FLOATING_CTA);
    }
  }
  if (!parsed || typeof parsed !== 'object') return structuredClone(DEFAULT_FLOATING_CTA);
  const obj = parsed as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? obj.items.map(sanitizeItem).filter((x): x is FloatingCtaItem => Boolean(x))
    : structuredClone(DEFAULT_FLOATING_CTA.items);

  return {
    stickyEnabled: obj.stickyEnabled !== false && obj.stickyEnabled !== 0 && obj.stickyEnabled !== 'false',
    floatEnabled: obj.floatEnabled !== false && obj.floatEnabled !== 0 && obj.floatEnabled !== 'false',
    items,
  };
}

export function serializeFloatingCta(config: FloatingCtaConfig): string {
  return JSON.stringify(config);
}

function splitPaths(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function pathMatches(pathname: string, patterns: string[]): boolean {
  if (!patterns.length) return false;
  return patterns.some((p) => {
    if (p === '/') return pathname === '/' || pathname === '';
    return pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`) || pathname.startsWith(p);
  });
}

/** Whether an item should render for the current pathname. */
export function floatingCtaVisibleOnPath(item: FloatingCtaItem, pathname: string): boolean {
  if (!item.enabled) return false;
  const include = splitPaths(item.pathsInclude);
  const exclude = splitPaths(item.pathsExclude);
  if (exclude.length && pathMatches(pathname, exclude)) return false;
  if (include.length && !pathMatches(pathname, include)) return false;
  return true;
}

export function floatingCtaStyleClass(style: FloatingCtaStyle, zone: FloatingCtaZone): string {
  if (zone === 'float' || style === 'float') return 'float-wa';
  if (style === 'call') return 'call';
  if (style === 'wa') return 'wa';
  if (style === 'ghost') return 'ghost';
  return 'quote';
}
