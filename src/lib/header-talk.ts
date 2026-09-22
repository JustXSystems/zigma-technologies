/** Configurable header "Talk to us" trigger + submenu chips (Site Settings). */

export const HEADER_TALK_DISPLAY_MODES = [
  { id: 'off', label: 'Hidden' },
  { id: 'icon', label: 'Icon only' },
  { id: 'label', label: 'Icon + label' },
] as const;

export type HeaderTalkDisplay = (typeof HEADER_TALK_DISPLAY_MODES)[number]['id'];

export const HEADER_TALK_ACTIONS = [
  { id: 'call', label: 'Call (main phone)' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'callback', label: 'Request callback' },
  { id: 'emergency', label: 'Emergency call' },
  { id: 'solution_finder', label: 'Solution finder' },
  { id: 'link', label: 'Custom link' },
] as const;

export type HeaderTalkAction = (typeof HEADER_TALK_ACTIONS)[number]['id'];

export const HEADER_TALK_ICONS = [
  { id: 'support', label: 'Support / phone' },
  { id: 'call', label: 'Call' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'callback', label: 'Callback' },
  { id: 'finder', label: 'Finder' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'link', label: 'Link' },
  { id: 'cert', label: 'Certificate' },
  { id: 'case', label: 'Case study' },
  { id: 'sla', label: 'SLA' },
  { id: 'press', label: 'Press' },
] as const;

export type HeaderTalkIcon = (typeof HEADER_TALK_ICONS)[number]['id'];

export const HEADER_TALK_STYLES = [
  { id: 'call', label: 'Orange (call)' },
  { id: 'wa', label: 'Green (WhatsApp)' },
  { id: 'callback', label: 'Sky (callback)' },
  { id: 'tool', label: 'Cyan (tool)' },
  { id: 'emergency', label: 'Alert (emergency)' },
  { id: 'cert', label: 'Cert' },
  { id: 'case', label: 'Case' },
  { id: 'sla', label: 'SLA' },
  { id: 'press', label: 'Press' },
] as const;

export type HeaderTalkStyle = (typeof HEADER_TALK_STYLES)[number]['id'];

export type HeaderTalkItem = {
  id: string;
  label: string;
  action: HeaderTalkAction;
  /** Used when action is `link` (internal path or absolute URL). */
  href: string;
  icon: HeaderTalkIcon;
  style: HeaderTalkStyle;
  desktopDisplay: HeaderTalkDisplay;
  mobileDisplay: HeaderTalkDisplay;
  openInNewTab: boolean;
};

export type HeaderTalkConfig = {
  buttonLabel: string;
  showPulse: boolean;
  desktopDisplay: HeaderTalkDisplay;
  mobileDisplay: HeaderTalkDisplay;
  items: HeaderTalkItem[];
};

function isDisplay(value: unknown): value is HeaderTalkDisplay {
  return value === 'off' || value === 'icon' || value === 'label';
}

function isAction(value: unknown): value is HeaderTalkAction {
  return HEADER_TALK_ACTIONS.some((a) => a.id === value);
}

function isIcon(value: unknown): value is HeaderTalkIcon {
  return HEADER_TALK_ICONS.some((i) => i.id === value);
}

function isStyle(value: unknown): value is HeaderTalkStyle {
  return HEADER_TALK_STYLES.some((s) => s.id === value);
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  return `t${Date.now().toString(36)}`;
}

export function createHeaderTalkItem(partial?: Partial<HeaderTalkItem>): HeaderTalkItem {
  return {
    id: partial?.id?.trim() || newId(),
    label: partial?.label?.trim() || 'New action',
    action: isAction(partial?.action) ? partial.action : 'link',
    href: typeof partial?.href === 'string' ? partial.href : '',
    icon: isIcon(partial?.icon) ? partial.icon : 'link',
    style: isStyle(partial?.style) ? partial.style : 'tool',
    desktopDisplay: isDisplay(partial?.desktopDisplay) ? partial.desktopDisplay : 'label',
    mobileDisplay: isDisplay(partial?.mobileDisplay) ? partial.mobileDisplay : 'label',
    openInNewTab: Boolean(partial?.openInNewTab),
  };
}

export const DEFAULT_HEADER_TALK: HeaderTalkConfig = {
  buttonLabel: 'Talk to us',
  showPulse: true,
  /** Matches legacy CSS: full label on desktop, icon-only under 900px. */
  desktopDisplay: 'label',
  mobileDisplay: 'icon',
  items: [
    createHeaderTalkItem({
      id: 'call',
      label: 'Call now',
      action: 'call',
      icon: 'call',
      style: 'call',
    }),
    createHeaderTalkItem({
      id: 'whatsapp',
      label: 'WhatsApp',
      action: 'whatsapp',
      icon: 'whatsapp',
      style: 'wa',
      openInNewTab: true,
    }),
    createHeaderTalkItem({
      id: 'callback',
      label: 'Callback',
      action: 'callback',
      icon: 'callback',
      style: 'callback',
    }),
    createHeaderTalkItem({
      id: 'solution_finder',
      label: 'Solution finder',
      action: 'solution_finder',
      href: '/tools/solution-finder',
      icon: 'finder',
      style: 'tool',
    }),
    createHeaderTalkItem({
      id: 'emergency',
      label: 'Emergency',
      action: 'emergency',
      icon: 'emergency',
      style: 'emergency',
    }),
  ],
};

function sanitizeItem(raw: unknown): HeaderTalkItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  if (!label) return null;
  return createHeaderTalkItem({
    id: typeof row.id === 'string' ? row.id : undefined,
    label,
    action: isAction(row.action) ? row.action : 'link',
    href: typeof row.href === 'string' ? row.href : '',
    icon: isIcon(row.icon) ? row.icon : 'link',
    style: isStyle(row.style) ? row.style : 'tool',
    desktopDisplay: isDisplay(row.desktopDisplay) ? row.desktopDisplay : 'label',
    mobileDisplay: isDisplay(row.mobileDisplay) ? row.mobileDisplay : 'label',
    openInNewTab: Boolean(row.openInNewTab),
  });
}

/** Parse + sanitize JSON from Site Settings `headerTalkJson`. */
export function parseHeaderTalk(raw: unknown): HeaderTalkConfig {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return structuredClone(DEFAULT_HEADER_TALK);
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return structuredClone(DEFAULT_HEADER_TALK);
    }
  }
  if (!parsed || typeof parsed !== 'object') return structuredClone(DEFAULT_HEADER_TALK);
  const obj = parsed as Record<string, unknown>;
  const items = Array.isArray(obj.items)
    ? obj.items.map(sanitizeItem).filter((x): x is HeaderTalkItem => Boolean(x))
    : structuredClone(DEFAULT_HEADER_TALK.items);
  return {
    buttonLabel:
      typeof obj.buttonLabel === 'string' && obj.buttonLabel.trim()
        ? obj.buttonLabel.trim()
        : DEFAULT_HEADER_TALK.buttonLabel,
    showPulse: obj.showPulse === undefined ? DEFAULT_HEADER_TALK.showPulse : Boolean(obj.showPulse),
    desktopDisplay: isDisplay(obj.desktopDisplay) ? obj.desktopDisplay : DEFAULT_HEADER_TALK.desktopDisplay,
    mobileDisplay: isDisplay(obj.mobileDisplay) ? obj.mobileDisplay : DEFAULT_HEADER_TALK.mobileDisplay,
    items,
  };
}

export function serializeHeaderTalk(config: HeaderTalkConfig): string {
  return JSON.stringify(config);
}

export function headerTalkVisibleOn(display: HeaderTalkDisplay): boolean {
  return display !== 'off';
}

export function headerTalkShowLabel(display: HeaderTalkDisplay): boolean {
  return display === 'label';
}
