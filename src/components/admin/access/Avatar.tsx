import type { CSSProperties } from 'react';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')).toUpperCase();
}

function hue(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Initials on a colour derived from the seed (email / role slug), so it stays stable. */
export default function Avatar({ name, seed = name, size = 'md' }: { name: string; seed?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`access-avatar access-avatar--${size}`} style={{ '--avatar-hue': hue(seed) } as CSSProperties} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
