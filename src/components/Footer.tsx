'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { buildFooterColumns, type FlatNavRow, type FooterColumn } from '@/lib/nav-tree';
import { DEFAULT_SITE_SETTINGS, telHref, type SiteSettings } from '@/lib/site-settings';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Company',
    links: [
      { label: 'About Zigma', href: '/#why' },
      { label: '20-Year Legacy', href: '/#legacy' },
      { label: 'Careers', href: '/careers' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Case studies', href: '/projects' },
      { label: 'Industries', href: '/industries' },
      { label: 'Locations', href: '/locations' },
      { label: 'Resources', href: '/resources' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    heading: 'Capabilities',
    links: [
      { label: 'Solar Solutions', href: '/products?category=solar-solutions' },
      { label: 'UPS Solutions', href: '/products?category=ups-systems' },
      { label: 'BESS Systems', href: '/products?category=bess' },
      { label: 'EV Charging', href: '/products?category=ev-charging' },
      { label: 'AMC & O&M Support', href: '/services?category=ups-amc' },
      { label: 'Design & Engineering', href: '/services?category=engineering-design' },
      { label: 'Service levels', href: '/sla' },
      { label: 'Solution finder', href: '/tools/solution-finder' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: '+91 95901 37444', href: 'tel:+919590137444' },
      { label: 'info@zigma-technologies.com', href: 'mailto:info@zigma-technologies.com' },
      { label: 'Emergency Call: +91 9590137666 →', href: 'tel:+919590137666', className: 'foot-emergency' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [columns, setColumns] = useState<FooterColumn[]>(DEFAULT_COLUMNS);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const current =
    pathname === '/contact'
      ? 'contact'
      : pathname === '/careers'
        ? 'careers'
        : pathname === '/certifications'
          ? 'certifications'
          : 'home';

  useEffect(() => {
    fetch('/api/public/nav?location=footer')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.items?.length) return;
        const cols = buildFooterColumns(data.items as FlatNavRow[]);
        if (cols.length) setColumns(cols);
      })
      .catch(() => undefined);

    fetch('/api/public/site-settings')
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.settings) setSite(data.settings);
      })
      .catch(() => undefined);
  }, []);

  const openConsultation = (subject: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('consult', '1');
    url.searchParams.set('consult_subject', subject);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <>
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <a href={current === 'home' ? '#home' : '/'} className="logo footer-logo mb-1">
                <span className="logo-chip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={site.logoUrl || '/assets/images/zigma-technologies-logo.png'}
                    alt={site.companyName}
                  />
                </span>
                <span className="logo-word">
                  {site.companyName}
                  <small>{site.tagline}</small>
                </span>
              </a>
              <p className="footer-tagline">{site.footerBlurb}</p>
              <div className="newsletter-label">Stay informed</div>
              {!subscribed ? (
                <form className="newsletter-form" onSubmit={handleNewsletterSubmit} style={{ position: 'relative' }}>
                  <HoneypotField />
                  <input type="email" name="email" placeholder="Your work email" aria-label="Email for newsletter" required />
                  <button type="submit">Subscribe</button>
                </form>
              ) : (
                <span className="newsletter-success">Thanks — you&apos;re subscribed!</span>
              )}
              {newsletterError ? <div className="newsletter-error">{newsletterError}</div> : null}
            </div>
            {columns.map((col) => (
              <div key={col.heading} className="foot-col">
                <h6>{col.heading}</h6>
                {col.links.map((link) => (
                  <a key={`${col.heading}-${link.label}`} href={link.href} className={link.className}>
                    {link.label}
                  </a>
                ))}
                {col.heading.toLowerCase() === 'contact' ? (
                  <>
                    {(site.addressLocality || site.officeHours) ? (
                      <div className="foot-meta">
                        {site.addressLocality ? (
                          <span>
                            {[site.addressStreet, site.addressLocality, site.addressRegion]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        ) : null}
                        {site.officeHours ? <span className="foot-hours">{site.officeHours}</span> : null}
                      </div>
                    ) : null}
                    {site.facebookUrl || site.linkedinUrl ? (
                      <div className="social-links">
                        {site.facebookUrl ? (
                          <a href={site.facebookUrl} className="sl-fb" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
                            </svg>
                          </a>
                        ) : null}
                        {site.linkedinUrl ? (
                          <a href={site.linkedinUrl} className="sl-li" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.94-1.79-2.94-1.8 0-2.08 1.4-2.08 2.85V21H9z" />
                            </svg>
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <div className="foot-bottom">
            <span>{site.copyright}</span>
            <span className="foot-powered">
              Powered by{' '}
              <a href="https://www.justxsystems.com/" target="_blank" rel="noopener noreferrer">
                <strong>JustX Systems</strong>
              </a>
            </span>
            <span className="foot-legal">
              {site.privacyUrl ? <a href={site.privacyUrl}>Privacy Policy</a> : null}
              {site.cookiePolicyUrl ? <a href={site.cookiePolicyUrl}>Cookies</a> : <a href="/cookies">Cookies</a>}
              {site.termsUrl ? <a href={site.termsUrl}>Terms</a> : null}
            </span>
          </div>
        </div>
      </footer>

      <div className="sticky-mobile-cta">
        <a
          href={telHref(site.phone)}
          className="call"
          onClick={() => trackEvent('cta_click', { channel: 'call', placement: 'mobile_sticky' })}
        >
          Call
        </a>
        <a
          href={whatsappHref(site.whatsapp, 'Hi Zigma — I would like a quick quote.')}
          className="wa"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('cta_click', { channel: 'whatsapp', placement: 'mobile_sticky' })}
        >
          WhatsApp
        </a>
        {pathname === '/careers' ? (
          <a href="/careers#apply" className="quote">
            Apply Now
          </a>
        ) : (
          <button
            type="button"
            className="quote"
            onClick={() => {
              trackEvent('cta_click', { channel: 'consultation', placement: 'mobile_sticky' });
              openConsultation('Request a Quote');
            }}
          >
            Quote
          </button>
        )}
      </div>
    </>
  );
}
