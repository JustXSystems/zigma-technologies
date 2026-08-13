/** Default decorative SVG inner markup for homepage hero slides (matches public/index.html). */

export const HERO_SLIDE_ICONS: Record<string, { viewBox?: string; strokeWidth?: string; html: string }> = {
  'theme-legacy': {
    html: `<path d="M60 340V180l40-30 40 30v160" /><path d="M140 340V140l40-30 40 30v200"/><path d="M220 340V100l40-30 40 30v240"/><path d="M40 340h320"/><path d="M20 100l40 20M340 100l-40 20" stroke-dasharray="4 6"/>`,
  },
  'theme-ups': {
    html: `<rect x="120" y="60" width="160" height="280" rx="10"/><path d="M210 110l-40 70h50l-40 70" stroke-width="2"/><path d="M120 150h160M120 230h160"/><circle cx="145" cy="320" r="6"/><circle cx="255" cy="320" r="6"/>`,
  },
  'theme-solar': {
    html: `<circle cx="300" cy="90" r="30"/><path d="M300 30v16M300 134v16M240 90h16M344 90h16M258 48l12 12M330 120l12 12M258 132l12-12M330 60l12-12"/><path d="M40 220h100l20-30h100l20 30h80"/><path d="M40 260h320M40 300h320" stroke-dasharray="10 6"/><path d="M70 220v40M170 190v70M290 190v70M360 220v40"/>`,
  },
  'theme-eng': {
    html: `<rect x="50" y="50" width="300" height="300" stroke-dasharray="3 6"/><circle cx="200" cy="130" r="24"/><path d="M200 106v-30M200 154v30M176 130h-30M224 130h30" /><path d="M120 260l160-90M280 260l-160-90"/><circle cx="200" cy="215" r="4"/>`,
  },
  'theme-future': {
    strokeWidth: '1.4',
    html: `<path d="M200 40l90 45v90l-90 45-90-45v-90z"/><path d="M200 130l90-45M200 130l-90-45M200 130v90"/><circle cx="200" cy="130" r="8"/><circle cx="290" cy="85" r="5"/><circle cx="110" cy="85" r="5"/><circle cx="200" cy="220" r="5"/><path d="M200 220l70 40M200 220l-70 40" stroke-dasharray="3 5"/>`,
  },
};
