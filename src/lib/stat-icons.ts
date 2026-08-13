/** Stat-bar icon SVGs (24×24) keyed by label, from public/index.html. */

const STAT_ICONS: Record<string, string> = {
  'Years Experience':
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  'Projects Delivered':
    '<rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18"/>',
  'Satisfied Clients':
    '<path d="M2 10.5v5M22 10.5v5"/><path d="M2 13h4l2.8-1.8a1.6 1.6 0 011.9.1L12 13l1.3-1.7a1.6 1.6 0 011.9-.1L18 13h4"/><path d="M9 13l1.3 1.5a1.3 1.3 0 001.9 0M15 13l-1.3 1.5a1.3 1.3 0 01-1.9 0"/>',
  'Industries We Serve':
    '<path d="M3 20V10l5 3.5V10l5 3.5V10l6-3.5V20z"/><path d="M3 20h18M7 14v2M12 14v2M17 12v2"/>',
  'Certified Engineers':
    '<path d="M7.5 9a4.5 4.5 0 019 0"/><path d="M6 9.3h12l-.7 1.7H6.7z"/><circle cx="12" cy="10.8" r="2.6"/><path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2"/>',
  'Client Satisfaction':
    '<path d="M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5-4.94-2.6-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z"/>',
};

const STAT_ICON_FALLBACKS = Object.values(STAT_ICONS);

export function statIconFor(label: string, index: number, icon?: string | null) {
  if (icon && icon.trim()) return icon.trim();
  const byLabel = STAT_ICONS[label.trim()];
  if (byLabel) return byLabel;
  return STAT_ICON_FALLBACKS[index % STAT_ICON_FALLBACKS.length];
}
