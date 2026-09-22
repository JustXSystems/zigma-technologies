/** Configurable header "Request Consultation" CTA + optional submenu (Site Settings). */

import { HEADER_TALK_DISPLAY_MODES, type HeaderTalkDisplay } from '@/lib/header-talk';

export { HEADER_TALK_DISPLAY_MODES as HEADER_CTA_DISPLAY_MODES };
export type HeaderCtaDisplay = HeaderTalkDisplay;

export const HEADER_CTA_ACTIONS = [
  { id: 'consultation', label: 'Open consultation form' },
  { id: 'link', label: 'Custom link' },
  { id: 'call', label: 'Call (main phone)' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'callback', label: 'Request callback' },
] as const;

export type HeaderCtaAction = (typeof HEADER_CTA_ACTIONS)[number]['id'];

export const HEADER_CTA_ICONS = [
  { id: 'consult', label: 'Consultation / chat' },
  { id: 'call', label: 'Call' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'callback', label: 'Callback' },
  { id: 'link', label: 'Link' },
  { id: 'quote', label: 'Quote / document' },
] as const;

export type HeaderCtaIcon = (typeof HEADER_CTA_ICONS)[number]['id'];

export const HEADER_CTA_STYLES = [
  { id: 'consult', label: 'Orange (primary CTA)' },
  { id: 'call', label: 'Orange (call)' },
  { id: 'wa', label: 'Green (WhatsApp)' },
  { id: 'callback', label: 'Sky (callback)' },
  { id: 'tool', label: 'Cyan (tool)' },
  { id: 'link', label: 'Neutral' },
] as const;

export type HeaderCtaStyle = (typeof HEADER_CTA_STYLES)[number]['id'];

export type HeaderCtaItem = {
  id: string;
  label: string;
  action: HeaderCtaAction;
  href: string;
  /** Subject passed when action is consultation */
  consultSubject: string;
  icon: HeaderCtaIcon;
  style: HeaderCtaStyle;
  desktopDisplay: HeaderCtaDisplay;
  mobileDisplay: HeaderCtaDisplay;
  openInNewTab: boolean;
};

export type HeaderCtaConfig = {
  buttonLabelA: string;
  buttonLabelB: string;
  /** 0–100 chance to show variant B */
  variantBPercent: number;
  /** Primary click when submenu is empty (or as default intent). */
  action: HeaderCtaAction;
  href: string;
  consultSubject: string;
  desktopDisplay: HeaderCtaDisplay;
  mobileDisplay: HeaderCtaDisplay;
  items: HeaderCtaItem[];
};

export type HeaderCtaLegacy = {
  headerCtaLabel?: string;
  headerCtaLabelB?: string;
  headerCtaHref?: string;
  ctaVariantBPercent?: string;
};

function isDisplay(value: unknown): value is HeaderCtaDisplay {
  return value === 'off' || value === 'icon' || value === 'label';
}

function isAction(value: unknown): value is HeaderCtaAction {
  return HEADER_CTA_ACTIONS.some((a) => a.id === value);
}

function isIcon(value: unknown): value is HeaderCtaIcon {
  return HEADER_CTA_ICONS.some((i) => i.id === value);
}

function isStyle(value: unknown): value is HeaderCtaStyle {
  return HEADER_CTA_STYLES.some((s) => s.id === value);
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return `c${Date.now().toString(36)}`;
}

function clampPercent(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function createHeaderCtaItem(partial?: Partial<HeaderCtaItem>): HeaderCtaItem {
  return {
    id: partial?.id?.trim() || newId(),
    label: partial?.label?.trim() || 'New action',
    action: isAction(partial?.action) ? partial.action : 'consultation',
    href: typeof partial?.href === 'string' ? partial.href : '',
    consultSubject: typeof partial?.consultSubject === 'string' ? partial.consultSubject : 'Request a Quote',
    icon: isIcon(partial?.icon) ? partial.icon : 'consult',
    style: isStyle(partial?.style) ? partial.style : 'consult',
    desktopDisplay: isDisplay(partial?.desktopDisplay) ? partial.desktopDisplay : 'label',
    mobileDisplay: isDisplay(partial?.mobileDisplay) ? partial.mobileDisplay : 'label',
    openInNewTab: Boolean(partial?.openInNewTab),
  };
}

export const DEFAULT_HEADER_CTA: HeaderCtaConfig = {
  buttonLabelA: 'Request Consultation',
  buttonLabelB: 'Get a Quote',
  variantBPercent: 50,
  action: 'consultation',
  href: '/contact#contact-form',
  consultSubject: 'Request a Quote',
  desktopDisplay: 'label',
  mobileDisplay: 'label',
  items: [],
};

function legacyDefaults(legacy?: HeaderCtaLegacy): HeaderCtaConfig {
  return {
    ...DEFAULT_HEADER_CTA,
    buttonLabelA: legacy?.headerCtaLabel?.trim() || DEFAULT_HEADER_CTA.buttonLabelA,
    buttonLabelB: legacy?.headerCtaLabelB?.trim() || DEFAULT_HEADER_CTA.buttonLabelB,
    variantBPercent: clampPercent(legacy?.ctaVariantBPercent, DEFAULT_HEADER_CTA.variantBPercent),
    href: legacy?.headerCtaHref?.trim() || DEFAULT_HEADER_CTA.href,
  };
}

function sanitizeItem(raw: unknown): HeaderCtaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  return createHeaderCtaItem({
    id: typeof row.id === 'string' ? row.id : undefined,
    label,
    action: isAction(row.action) ? row.action : 'consultation',
    href: typeof row.href === 'string' ? row.href : '',
    consultSubject: typeof row.consultSubject === 'string' ? row.consultSubject : 'Request a Quote',
    icon: isIcon(row.icon) ? row.icon : 'consult',
    style: isStyle(row.style) ? row.style : 'consult',
    desktopDisplay: isDisplay(row.desktopDisplay) ? row.desktopDisplay : 'label',
    mobileDisplay: isDisplay(row.mobileDisplay) ? row.mobileDisplay : 'label',
    openInNewTab: Boolean(row.openInNewTab),
  });
}

/** Parse + sanitize JSON from Site Settings `headerCtaJson`, with legacy flat-field fallback. */
export function parseHeaderCta(raw: unknown, legacy?: HeaderCtaLegacy): HeaderCtaConfig {
  const base = legacyDefaults(legacy);
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return base;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return base;
    }
  }
  if (!parsed || typeof parsed !== 'object') return base;
  const obj = parsed as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? obj.items.map(sanitizeItem).filter((x): x is HeaderCtaItem => Boolean(x))
    : [];

  return {
    buttonLabelA:
      typeof obj.buttonLabelA === 'string' && obj.buttonLabelA.trim()
        ? obj.buttonLabelA.trim()
        : base.buttonLabelA,
    buttonLabelB: typeof obj.buttonLabelB === 'string' ? obj.buttonLabelB.trim() : base.buttonLabelB,
    variantBPercent: clampPercent(obj.variantBPercent, base.variantBPercent),
    action: isAction(obj.action) ? obj.action : base.action,
    href: typeof obj.href === 'string' && obj.href.trim() ? obj.href.trim() : base.href,
    consultSubject:
      typeof obj.consultSubject === 'string' && obj.consultSubject.trim()
        ? obj.consultSubject.trim()
        : base.consultSubject,
    desktopDisplay: isDisplay(obj.desktopDisplay) ? obj.desktopDisplay : base.desktopDisplay,
    mobileDisplay: isDisplay(obj.mobileDisplay) ? obj.mobileDisplay : base.mobileDisplay,
    items,
  };
}

export function serializeHeaderCta(config: HeaderCtaConfig): string {
  return JSON.stringify(config);
}

/** Flat site-setting fields kept in sync for older readers / analytics. */
export function headerCtaLegacyPatch(config: HeaderCtaConfig): HeaderCtaLegacy {
  return {
    headerCtaLabel: config.buttonLabelA,
    headerCtaLabelB: config.buttonLabelB,
    headerCtaHref: config.href,
    ctaVariantBPercent: String(config.variantBPercent),
  };
}

export function ctaLabelFromConfig(config: HeaderCtaConfig, variant: 'A' | 'B'): string {
  return variant === 'B' && config.buttonLabelB.trim()
    ? config.buttonLabelB.trim()
    : config.buttonLabelA;
}
