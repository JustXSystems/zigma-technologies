'use client';

import { useCallback, useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  DEFAULT_SITE_SETTINGS,
  footerLogoSrc,
  isSettingEnabled,
  logoAltText,
  sanitizeCssMaxWidth,
  sanitizeFooterLogoMode,
  sanitizeFooterOfficeAlign,
  sanitizeTaglineHtml,
  telHref,
} from '@/lib/site-settings';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { useSiteCopy } from '@/lib/use-site-copy';
import { useSiteShell } from '@/components/SiteProviders';
import FooterLinkColumns from '@/components/FooterLinkColumns';
import FooterOfficeBlock from '@/components/FooterOfficeBlock';
import FooterSocialLinks from '@/components/FooterSocialLinks';
import { appHref } from '@/lib/base-path';

/**
 * Site chrome footer. Link columns come ONLY from Admin → Navigation → Footer
 * (loaded into SiteProviders as footerColumns). Office address + social icons
 * attach after the Contact column (Admin → Site Settings). No hardcoded profiles.
 */
export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings: site, footerColumns } = useSiteShell();
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const copy = useSiteCopy();

  const current = useMemo(
    () =>
      pathname === '/contact'
        ? 'contact'
        : pathname === '/careers'
          ? 'careers'
          : pathname === '/certifications'
            ? 'certifications'
            : 'home',
    [pathname]
  );

  const openConsultation = useCallback(
    (subject: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('consult', '1');
      url.searchParams.set('consult_subject', subject);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    },
    [router]
  );

  const handleNewsletterSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterError('');
    const form = e.currentTarget;
    const email = new FormData(form).get('email');
    const hp = new FormData(form).get(HONEYPOT_FIELD);
    if (typeof email !== 'string' || !email.trim()) return;
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), _hp: typeof hp === 'string' ? hp : '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Subscribe failed');
      trackEvent('newsletter_subscribe', { placement: 'footer' });
      setSubscribed(true);
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : 'Subscribe failed');
    }
  }, []);

  const showLogo = isSettingEnabled(site.footerBrandShowLogo, true);
  const showName = isSettingEnabled(site.footerBrandShowName, true);
  const showTagline = isSettingEnabled(site.footerBrandShowTagline, true);
  const showBlurb = isSettingEnabled(site.footerBrandShowBlurb, true);
  const showNewsletter = isSettingEnabled(site.footerBrandShowNewsletter, true);
  const brandAlign = sanitizeFooterOfficeAlign(site.footerBrandAlign);
  const brandMaxWidth = sanitizeCssMaxWidth(site.footerBrandMaxWidth, '420px');
  const showLockup = showLogo || showName || (showTagline && site.tagline?.trim());
  const logoMode = sanitizeFooterLogoMode(site.footerLogoMode);

  return (
    <>
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div
              className={`foot-brand align-${brandAlign}`}
              style={{
                maxWidth: brandMaxWidth === 'none' ? 'none' : brandMaxWidth,
                textAlign: brandAlign === 'center' ? 'center' : brandAlign === 'end' ? 'right' : 'left',
              }}
            >
              {showLockup ? (
                <a
                  href={current === 'home' ? '#home' : appHref('/')}
                  className={`logo footer-logo mb-1${brandAlign !== 'start' ? ` is-${brandAlign}` : ''}`}
                  data-logo-mode={logoMode}
                >
                  {showLogo ? (
                    <span className="logo-chip">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={appHref(footerLogoSrc(site))} alt={logoAltText(site)} />
                    </span>
                  ) : null}
                  {showName || (showTagline && site.tagline?.trim()) ? (
                    <span className="logo-word">
                      {showName ? site.companyName : null}
                      {showTagline && site.tagline?.trim() ? (
                        <small dangerouslySetInnerHTML={{ __html: sanitizeTaglineHtml(site.tagline) }} />
                      ) : null}
                    </span>
                  ) : null}
                </a>
              ) : null}
              {showBlurb && site.footerBlurb?.trim() ? (
                <p className="footer-tagline">{site.footerBlurb}</p>
              ) : null}
              {showNewsletter ? (
                <>
                  <div className="newsletter-label">{copy.footer.newsletterLabel}</div>
                  {!subscribed ? (
                    <form className="newsletter-form newsletter-form-relative" onSubmit={handleNewsletterSubmit}>
                      <HoneypotField />
                      <input
                        type="email"
                        name="email"
                        placeholder={copy.footer.newsletterPlaceholder}
                        aria-label={copy.footer.newsletterPlaceholder}
                        required
                      />
                      <button type="submit">{copy.footer.subscribe}</button>
                    </form>
                  ) : (
                    <span className="newsletter-success">{copy.footer.subscribeSuccess}</span>
                  )}
                  {newsletterError ? <div className="newsletter-error">{newsletterError}</div> : null}
                </>
              ) : null}
            </div>
            <FooterLinkColumns
              columns={footerColumns}
              contactFallbackHeading={copy.footer.contactHeading}
              contactExtras={
                <div className="foot-contact-extras">
                  <FooterOfficeBlock site={site} />
                  <FooterSocialLinks site={site} />
                </div>
              }
            />
          </div>
          <div className="foot-bottom">
            <span>{site.copyright}</span>
            {site.poweredByEnabled === 'true' && site.poweredByName.trim() ? (
              <span className="foot-powered">
                {site.poweredByPrefix.trim() ? `${site.poweredByPrefix.trim()} ` : null}
                {site.poweredByUrl.trim() ? (
                  <a href={site.poweredByUrl.trim()} target="_blank" rel="noopener noreferrer">
                    <strong>{site.poweredByName.trim()}</strong>
                  </a>
                ) : (
                  <strong>{site.poweredByName.trim()}</strong>
                )}
              </span>
            ) : null}
            <span className="foot-legal">
              {site.privacyUrl ? <a href={appHref(site.privacyUrl)}>{copy.footer.privacy}</a> : null}
              {site.cookiePolicyUrl ? (
                <a href={appHref(site.cookiePolicyUrl)}>{copy.footer.cookies}</a>
              ) : null}
              {site.termsUrl ? <a href={appHref(site.termsUrl)}>{copy.footer.terms}</a> : null}
            </span>
          </div>
        </div>
      </footer>

      <FloatingWhatsApp />

      <div className="sticky-mobile-cta">
        <a
          href={telHref(site.phone)}
          className="call"
          onClick={useCallback(() => trackEvent('cta_click', { channel: 'call', placement: 'mobile_sticky' }), [])}
        >
          {copy.footer.stickyCall}
        </a>
        <a
          href={whatsappHref(site.whatsapp, copy.talk.whatsappPrefill)}
          className="wa"
          target="_blank"
          rel="noopener noreferrer"
          onClick={useCallback(() => trackEvent('cta_click', { channel: 'whatsapp', placement: 'mobile_sticky' }), [])}
        >
          {copy.footer.stickyWhatsapp}
        </a>
        {pathname === '/careers' ? (
          <a href={appHref('/careers#apply')} className="quote">
            Apply Now
          </a>
        ) : (
          <button
            type="button"
            className="quote"
            onClick={useCallback(() => {
              trackEvent('cta_click', { channel: 'consultation', placement: 'mobile_sticky' });
              openConsultation('Request a Quote');
            }, [openConsultation])}
          >
            {copy.footer.stickyQuote}
          </button>
        )}
      </div>
    </>
  );
}
