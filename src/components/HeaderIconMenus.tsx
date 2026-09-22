'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { DEFAULT_SITE_SETTINGS, telHref, type SiteSettings } from '@/lib/site-settings';
import {
  parseHeaderTalk,
  type HeaderTalkDisplay,
  type HeaderTalkIcon,
  type HeaderTalkItem,
} from '@/lib/header-talk';
import { useSiteCopy } from '@/lib/use-site-copy';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';

type Props = {
  site: SiteSettings;
  onRequestCallback: () => void;
};

function IconSupport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z" />
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

function IconFinder() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6M11 8v6" />
    </svg>
  );
}

function IconEmergency() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
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

function IconCert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 13.5L7 22l5-2.5L17 22l-1.5-8.5" />
    </svg>
  );
}

function IconCase() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function IconSla() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconPress() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h12a2 2 0 012 2v14H6a2 2 0 01-2-2V4z" />
      <path d="M18 6h2a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
      <path d="M8 8h6M8 12h6M8 16h4" />
    </svg>
  );
}

function talkIcon(icon: HeaderTalkIcon): ReactNode {
  switch (icon) {
    case 'support':
      return <IconSupport />;
    case 'call':
      return <IconCall />;
    case 'whatsapp':
      return <IconWa />;
    case 'callback':
      return <IconCallback />;
    case 'finder':
      return <IconFinder />;
    case 'emergency':
      return <IconEmergency />;
    case 'cert':
      return <IconCert />;
    case 'case':
      return <IconCase />;
    case 'sla':
      return <IconSla />;
    case 'press':
      return <IconPress />;
    case 'link':
    default:
      return <IconLink />;
  }
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
  desktopDisplay: HeaderTalkDisplay;
  mobileDisplay: HeaderTalkDisplay;
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

function resolveItem(
  item: HeaderTalkItem,
  ctx: {
    phone: string;
    emergency: string;
    waUrl: string;
    solutionFinderEnabled: boolean;
  }
): {
  href?: string;
  asButton?: boolean;
  external?: boolean;
  title: string;
  track?: () => void;
  onAction?: () => void;
} | null {
  switch (item.action) {
    case 'call':
      if (!ctx.phone) return null;
      return {
        href: telHref(ctx.phone),
        title: item.label,
        track: () => trackEvent('cta_click', { channel: 'call', placement: 'header_support' }),
      };
    case 'whatsapp':
      if (!ctx.waUrl) return null;
      return {
        href: ctx.waUrl,
        title: item.label,
        external: item.openInNewTab,
        track: () => trackEvent('cta_click', { channel: 'whatsapp', placement: 'header_support' }),
      };
    case 'callback':
      return {
        asButton: true,
        title: item.label,
        onAction: () => trackEvent('callback_open', { placement: 'header_support' }),
      };
    case 'emergency':
      if (!ctx.emergency) return null;
      return {
        href: telHref(ctx.emergency),
        title: `${item.label} ${ctx.emergency}`,
      };
    case 'solution_finder':
      if (!ctx.solutionFinderEnabled) return null;
      return {
        href: item.href?.trim() || '/tools/solution-finder',
        title: item.label,
        track: () => trackEvent('cta_click', { channel: 'configurator', placement: 'header_support' }),
      };
    case 'link': {
      const href = item.href?.trim();
      if (!href) return null;
      const external = item.openInNewTab || /^https?:\/\//i.test(href);
      return {
        href,
        title: item.label,
        external,
        track: () => trackEvent('cta_click', { channel: 'header_talk_link', placement: 'header_support' }),
      };
    }
    default:
      return null;
  }
}

/** Single header utility: Talk to us (configurable submenu chips). */
export default function HeaderIconMenus({ site, onRequestCallback }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineHover = useFineHover();
  const copy = useSiteCopy();
  const talk = parseHeaderTalk(site.headerTalkJson);

  const phone = site.phone || DEFAULT_SITE_SETTINGS.phone;
  const emergency = site.emergencyPhone || DEFAULT_SITE_SETTINGS.emergencyPhone;
  const wa = site.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp;
  const waUrl = whatsappHref(wa, copy.talk.whatsappPrefill);

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

  if (talk.desktopDisplay === 'off' && talk.mobileDisplay === 'off') {
    return null;
  }

  const visibleItems = talk.items
    .map((item) => {
      if (item.desktopDisplay === 'off' && item.mobileDisplay === 'off') return null;
      const resolved = resolveItem(item, {
        phone,
        emergency,
        waUrl,
        solutionFinderEnabled: copy.features.solutionFinderEnabled,
      });
      if (!resolved) return null;
      return { item, resolved };
    })
    .filter(Boolean) as Array<{ item: HeaderTalkItem; resolved: NonNullable<ReturnType<typeof resolveItem>> }>;

  return (
    <div className="header-icon-menus" ref={rootRef}>
      <div
        className={`header-icon-menu${open ? ' is-open' : ''}`}
        data-desktop={talk.desktopDisplay}
        data-mobile={talk.mobileDisplay}
        onMouseEnter={() => {
          if (fineHover) openMenu();
        }}
        onMouseLeave={() => {
          if (fineHover) scheduleClose();
        }}
      >
        <button
          type="button"
          className="header-talk-btn"
          data-desktop={talk.desktopDisplay}
          data-mobile={talk.mobileDisplay}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={talk.buttonLabel}
          title={talk.buttonLabel}
          onClick={() => {
            if (fineHover) return;
            setOpen((v) => !v);
          }}
          onFocus={() => {
            if (fineHover) openMenu();
          }}
        >
          <span className="header-talk-btn-icon">
            {talk.showPulse ? <span className="pulse-dot" aria-hidden /> : null}
            <IconSupport />
          </span>
          <span className="header-talk-btn-label">{talk.buttonLabel}</span>
        </button>
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
                className={`header-menu-chip--${item.style}`}
                href={resolved.href}
                title={resolved.title}
                icon={talkIcon(item.icon)}
                label={item.label}
                asButton={resolved.asButton}
                external={resolved.external}
                desktopDisplay={item.desktopDisplay}
                mobileDisplay={item.mobileDisplay}
                onClick={() => {
                  resolved.track?.();
                  resolved.onAction?.();
                  setOpen(false);
                  if (item.action === 'callback') onRequestCallback();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
