'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isMegaLearnMoreLink } from '@/lib/nav-tree';
import type { NavItem } from '@/lib/nav-types';
import { ctaLabelForVariant, pickCtaVariant, logoAltText } from '@/lib/site-settings';
import SiteSearchForm from '@/components/SiteSearchForm';
import HeaderIconMenus from '@/components/HeaderIconMenus';
import { trackEvent } from '@/lib/analytics';
import CallbackRequestModal from '@/components/CallbackRequestModal';
import { useSiteCopy } from '@/lib/use-site-copy';
import { useSiteShell } from '@/components/SiteProviders';

const DEFAULT_NAV: NavItem[] = [
  {
    label: 'Who We Are',
    href: '/#why',
    mega: [
      {
        heading: 'About Us',
        headingHref: '/#why',
        links: [
          { label: 'About Zigma', href: '/#why' },
          { label: '20+ Years Legacy', href: '/#legacy' },
        ],
      },
      {
        heading: 'Standards & proof',
        headingHref: '/certifications',
        links: [
          { label: 'Certifications', href: '/certifications' },
          { label: 'Quality & Safety', href: '/certifications#industry-certs' },
          { label: 'Case studies', href: '/projects' },
          { label: 'Service levels', href: '/sla' },
          { label: 'Press', href: '/press' },
        ],
      },
      {
        heading: 'Company',
        headingHref: '/careers',
        links: [
          { label: 'Life at Zigma', href: '/careers#why-join-us' },
          { label: 'Careers', href: '/careers' },
        ],
      },
    ],
  },
  {
    label: 'What We Do',
    href: '/services',
    megaClass: 'mega-2x2',
    mega: [
      {
        heading: 'Generate',
        headingHref: '/#generate',
        links: [
          { label: 'Solar EPC Solutions', href: '/projects?category=solar-epc' },
          { label: 'Solar AMC - O&M', href: '/services?category=solar-om' },
          { label: 'Solar Inverters', href: '/products?category=solar-solutions' },
        ],
      },
      {
        heading: 'Protect',
        headingHref: '/#protect',
        links: [
          { label: 'UPS Solutions', href: '/products?category=ups-systems' },
          { label: 'ABB UPS', href: '/products?category=ups-systems&tag=ABB' },
          { label: 'APC / Schneider UPS', href: '/products?category=ups-systems&tag=APC' },
          { label: 'UPS AMC Services', href: '/services?category=ups-amc' },
          { label: 'Field Commissioning', href: '/services?category=field-services' },
        ],
      },
      {
        heading: 'BESS',
        headingHref: '/#bess',
        links: [
          { label: 'Utility-Scale BESS', href: '/products?category=bess' },
          { label: 'Peak Shaving & EMS', href: '/products?category=bess&tag=EMS' },
          { label: 'Hybrid Solar + BESS', href: '/products?category=studer-hybrid' },
          { label: 'Hybrid Projects', href: '/projects?category=hybrid-power' },
        ],
      },
      {
        heading: 'Maintain',
        headingHref: '/#maintain',
        links: [
          { label: 'Field Commissioning', href: '/services?category=field-services' },
          { label: 'UPS Repair Support', href: '/services?category=ups-repair' },
          { label: 'UPS Rental', href: '/services?category=ups-rental' },
          { label: 'Solar O&M', href: '/services?category=solar-om' },
        ],
      },
      {
        heading: 'EV Charging',
        headingHref: '/#ev-charging',
        links: [
          { label: 'EV Infrastructure', href: '/products?category=ev-charging' },
          { label: 'Smart Charging', href: '/products?category=ev-charging&tag=Smart' },
          { label: 'Solar + BESS + EV', href: '/products?category=ev-charging&tag=Solar' },
        ],
      },
      {
        heading: 'Engineering',
        headingHref: '/#engineering-design',
        links: [
          { label: 'Design & Development', href: '/services?category=engineering-design' },
          { label: 'Electrical Engineering', href: '/services?category=engineering-design&tag=EPLAN' },
          { label: 'Project Support', href: '/services?category=field-services' },
        ],
      },
    ],
  },
  { label: 'Industries', href: '/industries' },
  { label: 'Projects', href: '/projects' },
  { label: 'Products', href: '/products' },
  { label: 'Services', href: '/services' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact#contact-form' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings: site, headerNav: shellNav } = useSiteShell();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>(shellNav || DEFAULT_NAV);
  // Always start with A so SSR and the first client paint match. pickCtaVariant()
  // reads sessionStorage / Math.random() and must only run after mount.
  const [ctaVariant, setCtaVariant] = useState<'A' | 'B'>('A');
  const [callbackOpen, setCallbackOpen] = useState(false);
  const copy = useSiteCopy();

  const current =
    pathname === '/contact'
      ? 'contact'
      : pathname === '/careers'
        ? 'careers'
        : pathname === '/certifications'
          ? 'certifications'
          : pathname === '/projects'
            ? 'projects'
            : pathname === '/products'
              ? 'products'
              : pathname === '/services'
                ? 'services'
                : 'home';

  useEffect(() => {
    if (shellNav?.length) setNavItems(shellNav);
    setCtaVariant(pickCtaVariant(site));
    trackEvent('cta_variant_shown', { variant: pickCtaVariant(site), placement: 'header' });
  }, [shellNav, site]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const resolveHref = (item: { href?: string }) => item.href || '#';

  const isCurrentPage = (item: NavItem) => {
    if (!item.href) return false;
    const path = item.href.split('#')[0];
    if (path === '/contact' && current === 'contact') return true;
    if (path === '/certifications' && current === 'certifications') return true;
    if (path === '/careers' && current === 'careers') return true;
    if (path === '/projects' && current === 'projects') return true;
    if (path === '/products' && current === 'products') return true;
    if (path === '/services' && current === 'services') return true;
    return false;
  };

  const toggleMobile = () => {
    setMobileOpen(!mobileOpen);
    document.body.classList.toggle('nav-open', !mobileOpen);
  };

  const toggleMega = (label: string) => {
    if (window.innerWidth <= 760) {
      setOpenMega(openMega === label ? null : label);
    }
  };

  const openConsultation = (subject: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('consult', '1');
    url.searchParams.set('consult_subject', subject);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header id="siteHeader" className={scrolled ? 'scrolled' : ''}>
        <div className="container nav-wrap">
          <a href={current === 'home' ? '#home' : '/'} className="logo">
            <span className="logo-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.logoUrl || '/assets/images/zigma-technologies-logo.png'} alt={logoAltText(site)} />
            </span>
            <span className="logo-word">
              {site.companyName}
              <small>{site.tagline}</small>
            </span>
          </a>
          <nav className="primary-nav">
            <ul className={`nav-links ${mobileOpen ? 'is-open' : ''}`}>
              {navItems.map((item, idx) => (
                <li key={`${item.label}-${idx}`} className={openMega === item.label ? 'nav-item-open' : ''}>
                  {item.mega ? (
                    <>
                      <a
                        href={resolveHref(item)}
                        onClick={() => toggleMega(item.label)}
                        aria-expanded={openMega === item.label}
                        aria-haspopup="true"
                      >
                        {item.label} <span className="caret">▾</span>
                      </a>
                      <div className={`mega ${item.megaClass || ''}`}>
                        {item.mega.map((col, colIdx) => (
                          <div key={colIdx} className="mega-col">
                            {col.headingHref ? (
                              <h5>
                                <a href={col.headingHref}>{col.heading}</a>
                              </h5>
                            ) : (
                              <h5>{col.heading}</h5>
                            )}
                            {col.links.filter((link) => !isMegaLearnMoreLink(link)).map((link, linkIdx) => (
                              <a key={linkIdx} href={resolveHref(link)} className={link.className}>
                                {link.label}
                              </a>
                            ))}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <a href={resolveHref(item)} aria-current={isCurrentPage(item) ? 'page' : undefined}>
                      {item.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-right">
            <div className="header-search-slot">
              <SiteSearchForm compact />
            </div>
            <HeaderIconMenus site={site} onRequestCallback={() => setCallbackOpen(true)} />
            <button
              type="button"
              className="header-cta-icon"
              aria-label={ctaLabelForVariant(site, ctaVariant)}
              title={ctaLabelForVariant(site, ctaVariant)}
              onClick={() => {
                trackEvent('cta_click', { channel: 'consultation', placement: 'header', variant: ctaVariant });
                openConsultation('Request a Quote');
              }}
            >
              <span className="header-cta-icon-glyph" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
              </span>
              <span className="header-cta-icon-label">{ctaLabelForVariant(site, ctaVariant)}</span>
            </button>
            <button
              className={`menu-toggle ${mobileOpen ? 'is-active' : ''}`}
              aria-label={mobileOpen ? copy.a11y.close : copy.a11y.menuToggle}
              aria-expanded={mobileOpen}
              onClick={toggleMobile}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>
      {callbackOpen ? <CallbackRequestModal onClose={() => setCallbackOpen(false)} /> : null}
    </>
  );
}
