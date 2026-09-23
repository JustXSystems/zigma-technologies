'use client';

import { useMemo, type ReactNode } from 'react';
import {
  sanitizeFooterOfficeAlign,
  socialLinksFromSettings,
  type SocialNetworkId,
  type SiteSettings,
} from '@/lib/site-settings';
import { useSiteCopy } from '@/lib/use-site-copy';
import { trackEvent } from '@/lib/analytics';

type Props = {
  site: Pick<
    SiteSettings,
    'facebookUrl' | 'instagramUrl' | 'linkedinUrl' | 'xUrl' | 'youtubeUrl' | 'footerOfficeAlign'
  >;
};

const ICONS: Record<SocialNetworkId, ReactNode> = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.94-1.79-2.94-1.8 0-2.08 1.4-2.08 2.85V21H9z" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 3H21l-6.55 7.49L22 21h-6.19l-4.85-6.34L5.36 21H2.6l7.02-8.02L2 3h6.34l4.38 5.8L18.24 3zm-1.08 16.17h1.53L7.9 4.74H6.26l10.9 14.43z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.5 6.2a2.8 2.8 0 00-1.97-2C18.9 3.7 12 3.7 12 3.7s-6.9 0-8.53.5A2.8 2.8 0 001.5 6.2 29.3 29.3 0 001 12a29.3 29.3 0 00.5 5.8 2.8 2.8 0 001.97 2c1.63.5 8.53.5 8.53.5s6.9 0 8.53-.5a2.8 2.8 0 001.97-2A29.3 29.3 0 0023 12a29.3 29.3 0 00-.5-5.8zM9.8 15.5v-7l6 3.5z" />
    </svg>
  ),
};

/**
 * Footer social marks driven only by Admin → Site Settings → Social links.
 * Blank URLs are omitted; no hardcoded profiles.
 */
export default function FooterSocialLinks({ site }: Props) {
  const copy = useSiteCopy();
  const links = useMemo(() => socialLinksFromSettings(site), [site]);
  const align = sanitizeFooterOfficeAlign(site.footerOfficeAlign);

  if (!links.length) return null;

  const labels: Record<SocialNetworkId, string> = {
    facebook: copy.a11y.facebook,
    instagram: copy.a11y.instagram,
    linkedin: copy.a11y.linkedin,
    x: copy.a11y.x,
    youtube: copy.a11y.youtube,
  };

  return (
    <nav className={`social-links align-${align}`} aria-label="Social media">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          className={link.className}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={labels[link.id]}
          onClick={() => trackEvent('social_click', { network: link.id, placement: 'footer' })}
        >
          <span className="sl-ring" aria-hidden="true" />
          {ICONS[link.id]}
        </a>
      ))}
    </nav>
  );
}
