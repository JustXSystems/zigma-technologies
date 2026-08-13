/** Industry grid icons (24×24 path markup) from public/index.html. */

const IND_ICONS: Record<string, string> = {
  'Data Centers & IT Parks':
    '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M5 9.5h14M5 15h14"/><circle cx="8" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none"/>',
  'Digital Infrastructure':
    '<circle cx="6" cy="18" r="1.4"/><circle cx="18" cy="18" r="1.4"/><path d="M3 8c5-4 13-4 18 0M6 12c3-2.4 9-2.4 12 0"/>',
  'Government & Public Sector':
    '<path d="M12 2l9 4.5v3L12 14 3 9.5v-3z"/><path d="M3 9.5V19l9 4 9-4V9.5"/>',
  Manufacturing: '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>',
  'Automotive Industry':
    '<path d="M5 17h14M5 17a2 2 0 01-2-2v-2l2-5h10l3 5v2a2 2 0 01-2 2M5 17v2m14-2v2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
  'Airport & Metro Infrastructure':
    '<path d="M22 3L11.5 13.5"/><path d="M22 3l-7 19-4.5-9L2 8z"/>',
  'Industrial Infrastructure':
    '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/><path d="M15 9h3v12"/>',
  'Hospitality & Hotels': '<path d="M3 21h18M6 21V8l6-5 6 5v13"/>',
  'MSMEs & Small-Scale Industries':
    '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>',
  'Telecom & Communication':
    '<path d="M5 12a7 7 0 0114 0M2 12a10 10 0 0120 0"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  'Smart Cities & Utilities':
    '<path d="M3 21h18"/><path d="M5 21V10l4-3v14"/><path d="M13 21V6l6-3v18"/>',
  'Special Economic Zones (SEZ)':
    '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  'Warehouse, Logistics & Fleet Operators':
    '<path d="M3 21V9l9-6 9 6v12H3z"/><path d="M9 21v-8h6v8"/>',
  'Power & Utility Infrastructure': '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  'Oil & Gas Refineries':
    '<path d="M12 2c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z"/>',
  'Healthcare & Hospitals':
    '<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6C19 16.65 12 21 12 21z"/><path d="M9 12h2l1-2 2 4 1-2h2"/>',
  'Educational Institutions':
    '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M21 7.5V14"/>',
  'Residential Communities':
    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  'Commercial Real Estate':
    '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/><path d="M10 22v-4h4v4"/>',
  'Corporate Campuses':
    '<rect x="4" y="8" width="16" height="13" rx="1"/><path d="M9 8V4h6v4"/><path d="M9 13h6M9 17h6"/>',
  'Banking & Financial Services':
    '<path d="M3 10l9-6 9 6"/><path d="M5 10v9M19 10v9M9 10v9M15 10v9"/><path d="M3 21h18"/>',
  'Engineering, Procurement & Construction (EPC)':
    '<path d="M14.7 6.3a4 4 0 01-5.6 5.6L4 17l3 3 5.1-5.1a4 4 0 015.6-5.6z"/>',
  'EV Charging Infrastructure': '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  'Renewable Energy Developers':
    '<rect x="2" y="8" width="18" height="8" rx="1.5"/><path d="M22 10v4"/><path d="M6 8v8M10 8v8"/>',
};

const IND_FALLBACK =
  '<path d="M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6"/>';

export function indIconFor(label: string) {
  return IND_ICONS[label.trim()] || IND_FALLBACK;
}
