/** Feat-card SVG path markup (24×24 viewBox) for split sections. */

export const FEAT_ICON_FALLBACKS = [
  '<path d="M3 21h18M5 21V9l6-4 6 4v12" /><path d="M9 21v-6h6v6" />',
  '<path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" />',
  '<rect x="5" y="9" width="14" height="10" rx="1.5" /><path d="M9 9V6a3 3 0 016 0v3" />',
  '<circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />',
  '<rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" />',
  '<path d="M13 2L4 14h7l-1 8 9-12h-7z" />',
  '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
  '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>',
];

/** Title → icon paths from static homepage (+ common CMS title aliases). */
const FEAT_ICONS_BY_TITLE: Record<string, string> = {
  // Generate
  'Solar EPC Engineering': '<path d="M3 21h18M5 21V9l6-4 6 4v12" /><path d="M9 21v-6h6v6" />',
  'Solar EPC': '<path d="M3 21h18M5 21V9l6-4 6 4v12" /><path d="M9 21v-6h6v6" />',
  'Solar Design & Detailed Engineering': '<path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" />',
  'Solar AMC & O&M': '<path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" />',
  'Energy Storage & Hybrid Systems':
    '<rect x="5" y="9" width="14" height="10" rx="1.5" /><path d="M9 9V6a3 3 0 016 0v3" />',
  'Rooftop & Industrial':
    '<rect x="5" y="9" width="14" height="10" rx="1.5" /><path d="M9 9V6a3 3 0 016 0v3" />',
  'Solar AMC & O&M Support': '<circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />',
  'Green Energy Integration': '<circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" />',

  // Protect
  'UPS Systems & Critical Power':
    '<rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" />',
  'UPS Sales & AMC':
    '<rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" />',
  'Battery Backup Solutions':
    '<rect x="5" y="9" width="14" height="10" rx="1.5" /><path d="M9 9V6a3 3 0 016 0v3" />',
  'Battery Solutions': '<path d="M13 2L4 14h7l-1 8 9-12h-7z" />',
  'Electrical Distribution Systems':
    '<rect x="3" y="7" width="18" height="12" rx="1" /><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />',
  'Critical Power Design':
    '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
  'Power Quality & Monitoring': '<path d="M13 2L4 14h7l-1 8 9-12h-7z" />',
  'Power Quality': '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>',

  // BESS
  'Commercial & Industrial BESS':
    '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
  'Hybrid Solar + BESS Systems':
    '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>',
  'Hybrid Solar + BESS': '<path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" />',
  'Peak Shaving & Load Management': '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  'BMS, EMS & SCADA Integration':
    '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',

  // Maintain
  'Operations & Maintenance (O&M)':
    '<path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" />',
  'Annual Maintenance Contracts (AMC)':
    '<rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" />',
  'Remote Monitoring & Diagnostics':
    '<circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />',
  'Engineering Support Services':
    '<path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 015.6-5.6z" />',

  // EV
  'AC & DC Charging Stations': '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  'Commercial & Fleet Charging': '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>',
  'Solar + EV + BESS Integration':
    '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>',
  'Smart OCPP Charging & AMC':
    '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',

  // Engineering
  'Electrical Design & Detailed Engineering':
    '<path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>',
  'Electrical Design':
    '<rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" />',
  'Prototyping & Product Development':
    '<path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z"/>',
  'CAD & Documentation': '<path d="M13 2L4 14h7l-1 8 9-12h-7z" />',
  'Technical Drawings & Documentation':
    '<path d="M4 4h16v16H4z"/><path d="M8 4v16M4 9h4M4 15h4"/>',
  'Technical Consulting':
    '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
  'Testing, Commissioning & Validation':
    '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  'Outsourced Engineering':
    '<path d="M12 2C7 6 4 9.5 4 13.5A8 8 0 0020 13.5C20 9.5 17 6 12 2z"/>',

  // Experts
  'Rectifiers & Converters':
    '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 2v3M16 2v3M8 19v3M16 19v3M2 8h3M2 16h3M19 8h3M19 16h3"/>',
  'Drives & Motor Control': '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  'Power Electronics Consulting': '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  'Inverter Installation & Service':
    '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2"/>',
};

function normalizeTitle(title: string) {
  return title.replace(/\s+/g, ' ').trim().toLowerCase();
}

const FEAT_ICONS_NORMALIZED = Object.fromEntries(
  Object.entries(FEAT_ICONS_BY_TITLE).map(([k, v]) => [normalizeTitle(k), v])
);

export function featIconFor(index: number, icon?: string | null, title?: string | null) {
  if (icon && icon.trim()) return icon.trim();
  if (title) {
    const byTitle = FEAT_ICONS_NORMALIZED[normalizeTitle(title)];
    if (byTitle) return byTitle;
  }
  return FEAT_ICON_FALLBACKS[index % FEAT_ICON_FALLBACKS.length];
}
