import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KEYS = [
  'MERIDIAN_GOOGLE_CLIENT_ID',
  'MERIDIAN_GOOGLE_CLIENT_SECRET',
  'MERIDIAN_GOOGLE_REFRESH_TOKEN',
  'MERIDIAN_GA4_PROPERTY_ID',
  'MERIDIAN_BING_API_KEY',
  'MERIDIAN_PSI_API_KEY',
  'MERIDIAN_GBP_REVIEW_LINK',
  'MERIDIAN_WEBHOOK_URL',
];

/**
 * Fill missing MERIDIAN_* env from storage unlock-secrets.json (never overrides process.env).
 */
export function hydrateMeridianSecrets(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, 'storage/meridian/zigma-prod/unlock-secrets.json'),
    resolve(cwd, 'storage/meridian/unlock-secrets.json'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      for (const k of KEYS) {
        if (!process.env[k] && j[k]) process.env[k] = String(j[k]).trim();
      }
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}
