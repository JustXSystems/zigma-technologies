'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ctaLabelFromConfig,
  parseHeaderCta,
  type HeaderCtaAction,
  type HeaderCtaDisplay,
  type HeaderCtaIcon,
  type HeaderCtaItem,
} from '@/lib/header-cta';
import { DEFAULT_SITE_SETTINGS, pickCtaVariant, telHref, type SiteSettings } from '@/lib/site-settings';
import { useSiteCopy } from '@/lib/use-site-copy';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';

type Props = {
  site: SiteSettings;
  onRequestCallback: () => void;
};

function IconConsult() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

function IconCall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z" />
    </svg>
  );
}

function IconWa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z" />
    </svg>
  );
}

function IconCallback() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L10 5.93" />
      <path d="M14 11a5 5 0 00-7.07 0L5.52 12.4a5 5 0 007.07 7.07L14 18.07" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  );
}

function ctaIcon(icon: HeaderCtaIcon, size: 'sm' | 'md' = 'sm'): ReactNode {
  const node =
    icon === 'call' ? (
      <IconCall />
    ) : icon === 'whatsapp' ? (
      <IconWa />
    ) : icon === 'callback' ? (
      <IconCallback />
    ) : icon === 'link' ? (
      <IconLink />
    ) : icon === 'quote' ? (
      <IconQuote />
    ) : (
      <IconConsult />
    );
  if (size === 'md') return node;
  return node;
}

function chipClass(style: string): string {
  if (style === 'consult') return 'header-menu-chip--call';
  if (style === 'link') return 'header-menu-chip--press';
  return `header-menu-chip--${style}`;
}

function MenuChip({
  className,
  href,
  title,
  icon,
  label,
  onClick,
  external,
  asButton,
  desktopDisplay,
  mobileDisplay,
}: {
  className: string;
  href?: string;
  title: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  external?: boolean;
  asButton?: boolean;
  desktopDisplay: HeaderCtaDisplay;
  mobileDisplay: HeaderCtaDisplay;
}) {
  if (desktopDisplay === 'off' && mobileDisplay === 'off') return null;

  const inner = (
    <>
      <span className="header-menu-chip-icon" aria-hidden>
        {icon}
      </span>
      <span className="header-menu-chip-label">{label}</span>
    </>
  );

  const props = {
    className: `header-menu-chip ${className}`,
    title,
    'data-desktop': desktopDisplay,
    'data-mobile': mobileDisplay,
    onClick,
  } as const;

  if (asButton) {
    return (
      <button type="button" {...props}>
        {inner}
      </button>
    );
  }

  if (href?.startsWith('/') && !external) {
    return (
      <Link href={href} {...props}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...props}>
      {inner}
    </a>
  );
}

function useFineHover() {
  const [fineHover, setFineHover] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFineHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return fineHover;
}

type Resolved = {
  href?: string;
  asButton?: boolean;
  external?: boolean;
  title: string;
  run: () => void;
};

function resolveAction(
  action: HeaderCtaAction,
  opts: {
    label: string;
    href: string;
    consultSubject: string;
    openInNewTab: boolean;
    phone: string;
    waUrl: string;
    openConsultation: (subject: string) => void;
    onRequestCallback: () => void;
    variant: 'A' | 'B';
    placement: string;
  }
): Resolved | null {
  switch (action) {
    case 'consultation':
      return {
        asButton: true,
        title: opts.label,
        run: () => {
          trackEvent('cta_click', { channel: 'consultation', placement: opts.placement, variant: opts.variant });
          opts.openConsultation(opts.consultSubject || 'Request a Quote');
        },
      };
    case 'link': {
      const href = opts.href?.trim();
      if (!href) return null;
      const external = opts.openInNewTab || /^https?:\/\//i.test(href);
      return {
        href,
        external,
        title: opts.label,
        run: () => {
          trackEvent('cta_click', { channel: 'header_cta_link', placement: opts.placement, variant: opts.variant });
        },
      };
    }
    case 'call':
      if (!opts.phone) return null;
      return {
        href: telHref(opts.phone),
        title: opts.label,
        run: () => trackEvent('cta_click', { channel: 'call', placement: opts.placement }),
      };
    case 'whatsapp':
      if (!opts.waUrl) return null;
      return {
        href: opts.waUrl,
        external: opts.openInNewTab,
        title: opts.label,
        run: () => trackEvent('cta_click', { channel: 'whatsapp', placement: opts.placement }),
      };
    case 'callback':
      return {
        asButton: true,
        title: opts.label,
        run: () => {
          trackEvent('callback_open', { placement: opts.placement });
          opts.onRequestCallback();
        },
      };
    default:
      return null;
  }
}

/** Header Request Consultation CTA — optional submenu chips, display modes from admin. */
export default function HeaderCtaMenus({ site, onRequestCallback }: Props) {
  const router = useRouter();
  const copy = useSiteCopy();
  const cta = parseHeaderCta(site.headerCtaJson, site);
  const [ctaVariant, setCtaVariant] = useState<'A' | 'B'>('A');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineHover = useFineHover();

  const phone = site.phone || DEFAULT_SITE_SETTINGS.phone;
  const wa = site.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp;
  const waUrl = whatsappHref(wa, copy.talk.whatsappPrefill);
  const label = ctaLabelFromConfig(cta, ctaVariant);
  const hasMenu = cta.items.some((item) => item.desktopDisplay !== 'off' || item.mobileDisplay !== 'off');

  function openConsultation(subject: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('consult', '1');
    url.searchParams.set('consult_subject', subject);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  }

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }

  useEffect(() => {
    const variant = pickCtaVariant(site);
    setCtaVariant(variant);
    trackEvent('cta_variant_shown', { variant, placement: 'header' });
  }, [site]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      clearCloseTimer();
    };
  }, []);

  if (cta.desktopDisplay === 'off' && cta.mobileDisplay === 'off') {
    return null;
  }

  const primary = resolveAction(cta.action, {
    label,
    href: cta.href,
    consultSubject: cta.consultSubject,
    openInNewTab: false,
    phone,
    waUrl,
    openConsultation,
    onRequestCallback,
    variant: ctaVariant,
    placement: 'header',
  });

  const visibleItems = cta.items
    .map((item) => {
      if (item.desktopDisplay === 'off' && item.mobileDisplay === 'off') return null;
      const resolved = resolveAction(item.action, {
        label: item.label,
        href: item.href,
        consultSubject: item.consultSubject,
        openInNewTab: item.openInNewTab,
        phone,
        waUrl,
        openConsultation,
        onRequestCallback,
        variant: ctaVariant,
        placement: 'header_cta_menu',
      });
      if (!resolved) return null;
      return { item, resolved };
    })
    .filter(Boolean) as Array<{ item: HeaderCtaItem; resolved: Resolved }>;

  function onPrimaryClick() {
    if (hasMenu && visibleItems.length) {
      if (fineHover) return;
      setOpen((v) => !v);
      return;
    }
    primary?.run();
  }

  const primaryIsLink = Boolean(primary?.href && !primary.asButton && !hasMenu);
  const triggerInner = (
    <>
      <span className="header-cta-icon-glyph" aria-hidden>
        {ctaIcon('consult', 'md')}
      </span>
      <span className="header-cta-icon-label">{label}</span>
    </>
  );

  const triggerProps = {
    className: 'header-cta-icon',
    'data-desktop': cta.desktopDisplay,
    'data-mobile': cta.mobileDisplay,
    'aria-label': label,
    title: label,
    ...(hasMenu && visibleItems.length
      ? { 'aria-expanded': open, 'aria-haspopup': true as const }
      : {}),
  };

  return (
    <div className="header-icon-menus header-cta-menus" ref={rootRef}>
      <div
        className={`header-icon-menu${open ? ' is-open' : ''}`}
        data-desktop={cta.desktopDisplay}
        data-mobile={cta.mobileDisplay}
        onMouseEnter={() => {
          if (fineHover && hasMenu && visibleItems.length) openMenu();
        }}
        onMouseLeave={() => {
          if (fineHover && hasMenu) scheduleClose();
        }}
      >
        {primaryIsLink && primary?.href ? (
          primary.href.startsWith('/') && !primary.external ? (
            <Link
              href={primary.href}
              {...triggerProps}
              onClick={() => {
                primary.run();
              }}
            >
              {triggerInner}
            </Link>
          ) : (
            <a
              href={primary.href}
              {...triggerProps}
              {...(primary.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={() => primary.run()}
            >
              {triggerInner}
            </a>
          )
        ) : (
          <button type="button" {...triggerProps} onClick={onPrimaryClick} onFocus={() => {
            if (fineHover && hasMenu && visibleItems.length) openMenu();
          }}>
            {triggerInner}
          </button>
        )}

        {hasMenu && visibleItems.length ? (
          <div
            className="header-icon-panel header-icon-panel--chips"
            role="menu"
            hidden={!open}
            onMouseEnter={() => {
              if (fineHover) openMenu();
            }}
          >
            <div className="header-menu-chip-rail">
              {visibleItems.map(({ item, resolved }) => (
                <MenuChip
                  key={item.id}
                  className={chipClass(item.style)}
                  href={resolved.href}
                  title={resolved.title}
                  icon={ctaIcon(item.icon)}
                  label={item.label}
                  asButton={resolved.asButton}
                  external={resolved.external}
                  desktopDisplay={item.desktopDisplay}
                  mobileDisplay={item.mobileDisplay}
                  onClick={() => {
                    resolved.run();
                    setOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
