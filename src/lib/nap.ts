import { formatStreetAddress, type SiteSettings } from '@/lib/site-settings';

/**
 * Company details (NAP) placeholders. Menus and page sections store `{{phone}}` etc.; the public site
 * fills them from Site Settings at render time, so Site Settings is the only place the values are typed.
 */
export const NAP_TOKENS = [
  { token: 'companyName', label: 'Company name' },
  { token: 'phone', label: 'Main phone' },
  { token: 'emergencyPhone', label: 'Emergency phone' },
  { token: 'email', label: 'Info email' },
  { token: 'supportEmail', label: 'Support email' },
  { token: 'address', label: 'Full address (one line)' },
  { token: 'street', label: 'Street lines' },
  { token: 'city', label: 'City' },
  { token: 'region', label: 'State' },
  { token: 'postalCode', label: 'PIN code' },
  { token: 'hours', label: 'Office hours' },
] as const;

export type NapToken = (typeof NAP_TOKENS)[number]['token'];

const TOKEN_RE = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;
const TEL_TOKEN_RE = /tel:\{\{\s*([a-zA-Z]+)\s*\}\}/g;

export function telDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function napValues(site: SiteSettings): Record<NapToken, string> {
  const street = formatStreetAddress(site);
  const city = site.addressLocality?.trim() || '';
  const region = site.addressRegion?.trim() || '';
  const postalCode = site.addressPostal?.trim() || '';
  const regionPostal = [region, postalCode].filter(Boolean).join(' ');
  return {
    companyName: site.companyName?.trim() || '',
    phone: site.phone?.trim() || '',
    emergencyPhone: site.emergencyPhone?.trim() || site.phone?.trim() || '',
    email: site.email?.trim() || '',
    supportEmail: site.supportEmail?.trim() || site.email?.trim() || '',
    address: [street, city, regionPostal].filter(Boolean).join(', '),
    street,
    city,
    region,
    postalCode,
    hours: site.officeHours?.trim() || '',
  };
}

function isNapToken(name: string, values: Record<NapToken, string>): name is NapToken {
  return Object.prototype.hasOwnProperty.call(values, name);
}

export function resolveNapText(text: string, values: Record<NapToken, string>): string {
  if (!text.includes('{{')) return text;
  return text
    .replace(TEL_TOKEN_RE, (match, name: string) => (isNapToken(name, values) ? `tel:${telDigits(values[name])}` : match))
    .replace(TOKEN_RE, (match, name: string) => (isNapToken(name, values) ? values[name] : match));
}

/** Deep-copies strings, arrays and plain objects with every NAP placeholder filled in. */
export function resolveNapDeep<T>(value: T, values: Record<NapToken, string>): T {
  if (typeof value === 'string') return resolveNapText(value, values) as T;
  if (Array.isArray(value)) return value.map((item) => resolveNapDeep(item, values)) as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = resolveNapDeep(item, values);
    return out as T;
  }
  return value;
}
