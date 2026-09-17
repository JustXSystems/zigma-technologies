'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { withBasePath } from '@/lib/base-path';
import {
  DEFAULT_SITE_SETTINGS,
  logoAltText,
  sanitizeCssFontFamily,
  sanitizeCssFontStyle,
  sanitizeCssFontWeight,
  sanitizeCssLetterSpacing,
  sanitizeCssSize,
  sanitizeTaglineHtml,
  type SiteSettings,
} from '@/lib/site-settings';
import {
  ensureGoogleFontsLoaded,
  googleFamilyFromCss,
} from '@/lib/logo-fonts';

type Props = {
  settings: SiteSettings;
};

type Viewport = 'desktop' | 'mobile';
type Surface = 'header' | 'footer';

/**
 * Build the same CSS custom properties the public site injects via logoSizingCss,
 * but apply mobile sizes directly when the preview toggle is Mobile (admin viewport
 * is always wide, so @media (max-width:760px) never fires here).
 */
function previewLogoVars(settings: SiteSettings, viewport: Viewport): CSSProperties {
  const chip = sanitizeCssSize(settings.logoChipHeight, DEFAULT_SITE_SETTINGS.logoChipHeight);
  const chipMobile = sanitizeCssSize(settings.logoChipHeightMobile, DEFAULT_SITE_SETTINGS.logoChipHeightMobile);
  const word = sanitizeCssSize(settings.logoWordSize, DEFAULT_SITE_SETTINGS.logoWordSize);
  const wordMobile = sanitizeCssSize(settings.logoWordSizeMobile, DEFAULT_SITE_SETTINGS.logoWordSizeMobile);
  const tag = sanitizeCssSize(settings.logoTaglineSize, DEFAULT_SITE_SETTINGS.logoTaglineSize);
  const tagMobile = sanitizeCssSize(settings.logoTaglineSizeMobile, DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile);

  const activeChip = viewport === 'mobile' ? chipMobile : chip;
  const activeWord = viewport === 'mobile' ? wordMobile : word;
  const activeTag = viewport === 'mobile' ? tagMobile : tag;

  return {
    ['--logo-chip-h' as string]: activeChip,
    ['--logo-chip-h-mobile' as string]: chipMobile,
    ['--logo-word-size' as string]: activeWord,
    ['--logo-word-size-mobile' as string]: wordMobile,
    ['--logo-tagline-size' as string]: activeTag,
    ['--logo-tagline-size-mobile' as string]: tagMobile,
    ['--logo-word-font' as string]: sanitizeCssFontFamily(settings.logoWordFont, DEFAULT_SITE_SETTINGS.logoWordFont),
    ['--logo-word-weight' as string]: sanitizeCssFontWeight(settings.logoWordWeight, DEFAULT_SITE_SETTINGS.logoWordWeight),
    ['--logo-word-style' as string]: sanitizeCssFontStyle(settings.logoWordStyle, DEFAULT_SITE_SETTINGS.logoWordStyle),
    ['--logo-word-letter-spacing' as string]: sanitizeCssLetterSpacing(
      settings.logoWordLetterSpacing,
      DEFAULT_SITE_SETTINGS.logoWordLetterSpacing
    ),
    ['--logo-tagline-font' as string]: sanitizeCssFontFamily(settings.logoTaglineFont, DEFAULT_SITE_SETTINGS.logoTaglineFont),
    ['--logo-tagline-weight' as string]: sanitizeCssFontWeight(settings.logoTaglineWeight, DEFAULT_SITE_SETTINGS.logoTaglineWeight),
    ['--logo-tagline-style' as string]: sanitizeCssFontStyle(settings.logoTaglineStyle, DEFAULT_SITE_SETTINGS.logoTaglineStyle),
    ['--logo-tagline-letter-spacing' as string]: sanitizeCssLetterSpacing(
      settings.logoTaglineLetterSpacing,
      DEFAULT_SITE_SETTINGS.logoTaglineLetterSpacing
    ),
    ['--chrome-text' as string]: '1.125rem',
    ['--font-display' as string]: "'Space Grotesk', sans-serif",
    ['--font-body' as string]: "'Inter', sans-serif",
    ['--font-mono' as string]: "'IBM Plex Mono', monospace",
    ['--white' as string]: '#FFFFFF',
  } as CSSProperties;
}

function LogoMark({ settings, surface }: { settings: SiteSettings; surface: Surface }) {
  const logoSrc = withBasePath(settings.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl);
  const company = settings.companyName?.trim() || DEFAULT_SITE_SETTINGS.companyName;
  const tagHtml = sanitizeTaglineHtml(settings.tagline || DEFAULT_SITE_SETTINGS.tagline);

  return (
    <span className={surface === 'footer' ? 'logo footer-logo' : 'logo'}>
      <span className="logo-chip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={logoAltText(settings)} />
      </span>
      <span className="logo-word">
        {company}
        {tagHtml ? <small dangerouslySetInnerHTML={{ __html: tagHtml }} /> : null}
      </span>
    </span>
  );
}

export default function LogoBrandPreview({ settings }: Props) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [surface, setSurface] = useState<Surface>('header');

  useEffect(() => {
    ensureGoogleFontsLoaded([
      googleFamilyFromCss(settings.logoWordFont),
      googleFamilyFromCss(settings.logoTaglineFont),
      'Space Grotesk',
      'Inter',
      'IBM Plex Mono',
    ]);
  }, [settings.logoWordFont, settings.logoTaglineFont]);

  const frameStyle = useMemo(() => previewLogoVars(settings, viewport), [settings, viewport]);

  return (
    <div className="logo-brand-preview admin-card">
      <div className="logo-brand-preview-bar">
        <div>
          <strong>Logo preview</strong>
          <span>Uses the same markup and CSS as the live header/footer. Save to publish.</span>
        </div>
        <div className="logo-brand-preview-controls">
          <div className="logo-brand-preview-toggle" role="group" aria-label="Preview surface">
            <button
              type="button"
              className={surface === 'header' ? 'is-active' : undefined}
              onClick={() => setSurface('header')}
            >
              Header
            </button>
            <button
              type="button"
              className={surface === 'footer' ? 'is-active' : undefined}
              onClick={() => setSurface('footer')}
            >
              Footer
            </button>
          </div>
          <div className="logo-brand-preview-toggle" role="group" aria-label="Preview viewport">
            <button
              type="button"
              className={viewport === 'desktop' ? 'is-active' : undefined}
              onClick={() => setViewport('desktop')}
            >
              Desktop
            </button>
            <button
              type="button"
              className={viewport === 'mobile' ? 'is-active' : undefined}
              onClick={() => setViewport('mobile')}
            >
              Mobile
            </button>
          </div>
        </div>
      </div>

      <div
        className={`logo-preview-frame${viewport === 'mobile' ? ' is-mobile' : ''}${surface === 'footer' ? ' is-footer' : ''}`}
        style={frameStyle}
      >
        <div className="logo-preview-chrome">
          <LogoMark settings={settings} surface={surface} />
        </div>
      </div>
    </div>
  );
}
