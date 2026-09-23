'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { withBasePath } from '@/lib/base-path';
import {
  DEFAULT_SITE_SETTINGS,
  footerLogoSrc,
  logoAltText,
  resolveFooterLogoTokens,
  sanitizeCssFontFamily,
  sanitizeCssFontStyle,
  sanitizeCssFontWeight,
  sanitizeCssLetterSpacing,
  sanitizeCssSize,
  sanitizeFooterLogoMode,
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
function previewLogoVars(settings: SiteSettings, viewport: Viewport, surface: Surface): CSSProperties {
  const chip = sanitizeCssSize(settings.logoChipHeight, DEFAULT_SITE_SETTINGS.logoChipHeight);
  const chipMobile = sanitizeCssSize(settings.logoChipHeightMobile, DEFAULT_SITE_SETTINGS.logoChipHeightMobile);
  const word = sanitizeCssSize(settings.logoWordSize, DEFAULT_SITE_SETTINGS.logoWordSize);
  const wordMobile = sanitizeCssSize(settings.logoWordSizeMobile, DEFAULT_SITE_SETTINGS.logoWordSizeMobile);
  const tag = sanitizeCssSize(settings.logoTaglineSize, DEFAULT_SITE_SETTINGS.logoTaglineSize);
  const tagMobile = sanitizeCssSize(settings.logoTaglineSizeMobile, DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile);
  const footer = resolveFooterLogoTokens(settings);

  const activeChip = viewport === 'mobile' ? chipMobile : chip;
  const activeWord = viewport === 'mobile' ? wordMobile : word;
  const activeTag = viewport === 'mobile' ? tagMobile : tag;
  const activeFooterChip = viewport === 'mobile' ? footer.chipMobile : footer.chip;
  const activeFooterWord = viewport === 'mobile' ? footer.wordMobile : footer.word;
  const activeFooterTag = viewport === 'mobile' ? footer.tagMobile : footer.tag;

  const base: CSSProperties = {
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
    ['--footer-logo-chip-h' as string]: activeFooterChip,
    ['--footer-logo-chip-h-mobile' as string]: footer.chipMobile,
    ['--footer-logo-word-size' as string]: activeFooterWord,
    ['--footer-logo-word-size-mobile' as string]: footer.wordMobile,
    ['--footer-logo-tagline-size' as string]: activeFooterTag,
    ['--footer-logo-tagline-size-mobile' as string]: footer.tagMobile,
    ['--footer-logo-word-font' as string]: footer.wordFont,
    ['--footer-logo-word-weight' as string]: footer.wordWeight,
    ['--footer-logo-word-style' as string]: footer.wordStyle,
    ['--footer-logo-word-letter-spacing' as string]: footer.wordTracking,
    ['--footer-logo-tagline-font' as string]: footer.tagFont,
    ['--footer-logo-tagline-weight' as string]: footer.tagWeight,
    ['--footer-logo-tagline-style' as string]: footer.tagStyle,
    ['--footer-logo-tagline-letter-spacing' as string]: footer.tagTracking,
    ['--chrome-text' as string]: '1.125rem',
    ['--font-display' as string]: "'Space Grotesk', sans-serif",
    ['--font-body' as string]: "'Inter', sans-serif",
    ['--font-mono' as string]: "'IBM Plex Mono', monospace",
    ['--white' as string]: '#FFFFFF',
  };

  if (surface === 'footer') {
    return {
      ...base,
      ['--logo-word-font' as string]: footer.wordFont,
      ['--logo-word-weight' as string]: footer.wordWeight,
      ['--logo-word-style' as string]: footer.wordStyle,
      ['--logo-word-letter-spacing' as string]: footer.wordTracking,
      ['--logo-tagline-font' as string]: footer.tagFont,
      ['--logo-tagline-weight' as string]: footer.tagWeight,
      ['--logo-tagline-style' as string]: footer.tagStyle,
      ['--logo-tagline-letter-spacing' as string]: footer.tagTracking,
    };
  }

  return base;
}

function LogoMark({ settings, surface }: { settings: SiteSettings; surface: Surface }) {
  const logoSrc = withBasePath(
    surface === 'footer' ? footerLogoSrc(settings) : settings.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl
  );
  const company = settings.companyName?.trim() || DEFAULT_SITE_SETTINGS.companyName;
  const tagHtml = sanitizeTaglineHtml(settings.tagline || DEFAULT_SITE_SETTINGS.tagline);
  const logoMode = surface === 'footer' ? sanitizeFooterLogoMode(settings.footerLogoMode) : undefined;

  return (
    <span
      className={surface === 'footer' ? 'logo footer-logo' : 'logo'}
      {...(logoMode ? { 'data-logo-mode': logoMode } : {})}
    >
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
  const footer = useMemo(() => resolveFooterLogoTokens(settings), [settings]);

  useEffect(() => {
    /* Inherit mode exposes var(--logo-*) refs — load the real header families. */
    ensureGoogleFontsLoaded([
      googleFamilyFromCss(settings.logoWordFont),
      googleFamilyFromCss(settings.logoTaglineFont),
      googleFamilyFromCss(footer.wordFont.startsWith('var(') ? settings.logoWordFont : footer.wordFont),
      googleFamilyFromCss(footer.tagFont.startsWith('var(') ? settings.logoTaglineFont : footer.tagFont),
      'Space Grotesk',
      'Inter',
      'IBM Plex Mono',
    ]);
  }, [
    settings.logoWordFont,
    settings.logoTaglineFont,
    footer.wordFont,
    footer.tagFont,
  ]);

  const frameStyle = useMemo(
    () => previewLogoVars(settings, viewport, surface),
    [settings, viewport, surface]
  );

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
