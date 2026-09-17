'use client';

import { useEffect, useMemo, useState } from 'react';
import { withBasePath } from '@/lib/base-path';
import {
  DEFAULT_SITE_SETTINGS,
  logoAltText,
  sanitizeCssFontStyle,
  sanitizeCssFontWeight,
  sanitizeCssSize,
  sanitizeTaglineHtml,
  type SiteSettings,
} from '@/lib/site-settings';
import {
  ensureGoogleFontsLoaded,
  googleFamilyFromCss,
  resolveLogoFontCss,
} from '@/lib/logo-fonts';

type Props = {
  settings: SiteSettings;
};

export default function LogoBrandPreview({ settings }: Props) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    ensureGoogleFontsLoaded([
      googleFamilyFromCss(settings.logoWordFont),
      googleFamilyFromCss(settings.logoTaglineFont),
      'Space Grotesk',
      'Inter',
      'IBM Plex Mono',
    ]);
  }, [settings.logoWordFont, settings.logoTaglineFont]);

  const styles = useMemo(() => {
    const chip = sanitizeCssSize(
      viewport === 'mobile' ? settings.logoChipHeightMobile : settings.logoChipHeight,
      viewport === 'mobile' ? DEFAULT_SITE_SETTINGS.logoChipHeightMobile : DEFAULT_SITE_SETTINGS.logoChipHeight
    );
    const wordSize = sanitizeCssSize(
      viewport === 'mobile' ? settings.logoWordSizeMobile : settings.logoWordSize,
      viewport === 'mobile' ? DEFAULT_SITE_SETTINGS.logoWordSizeMobile : DEFAULT_SITE_SETTINGS.logoWordSize
    );
    const tagSize = sanitizeCssSize(
      viewport === 'mobile' ? settings.logoTaglineSizeMobile : settings.logoTaglineSize,
      viewport === 'mobile' ? DEFAULT_SITE_SETTINGS.logoTaglineSizeMobile : DEFAULT_SITE_SETTINGS.logoTaglineSize
    );
    return {
      chip,
      wordSize,
      tagSize,
      wordFont: resolveLogoFontCss(settings.logoWordFont, DEFAULT_SITE_SETTINGS.logoWordFont),
      tagFont: resolveLogoFontCss(settings.logoTaglineFont, DEFAULT_SITE_SETTINGS.logoTaglineFont),
      wordWeight: sanitizeCssFontWeight(settings.logoWordWeight, DEFAULT_SITE_SETTINGS.logoWordWeight),
      tagWeight: sanitizeCssFontWeight(settings.logoTaglineWeight, DEFAULT_SITE_SETTINGS.logoTaglineWeight),
      wordStyle: sanitizeCssFontStyle(settings.logoWordStyle, DEFAULT_SITE_SETTINGS.logoWordStyle),
      tagStyle: sanitizeCssFontStyle(settings.logoTaglineStyle, DEFAULT_SITE_SETTINGS.logoTaglineStyle),
    };
  }, [settings, viewport]);

  const logoSrc = withBasePath(settings.logoUrl || DEFAULT_SITE_SETTINGS.logoUrl);
  const company = settings.companyName?.trim() || DEFAULT_SITE_SETTINGS.companyName;
  const tagHtml = sanitizeTaglineHtml(settings.tagline || DEFAULT_SITE_SETTINGS.tagline);

  return (
    <div className="logo-brand-preview admin-card">
      <div className="logo-brand-preview-bar">
        <div>
          <strong>Logo preview</strong>
          <span>Live — updates as you edit. Save to publish on the site.</span>
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

      <div className={`logo-brand-preview-stage${viewport === 'mobile' ? ' is-mobile' : ''}`}>
        <div className="logo-brand-preview-chrome" aria-hidden={false}>
          <div
            className="logo-brand-preview-logo"
            style={{ fontSize: styles.wordSize }}
          >
            <span className="logo-brand-preview-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={logoAltText(settings)} style={{ height: styles.chip }} />
            </span>
            <span
              className="logo-brand-preview-word"
              style={{
                fontFamily: styles.wordFont,
                fontWeight: styles.wordWeight,
                fontStyle: styles.wordStyle,
              }}
            >
              {company}
              {tagHtml ? (
                <small
                  style={{
                    fontFamily: styles.tagFont,
                    fontSize: styles.tagSize,
                    fontWeight: styles.tagWeight,
                    fontStyle: styles.tagStyle,
                  }}
                  dangerouslySetInnerHTML={{ __html: tagHtml }}
                />
              ) : null}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
