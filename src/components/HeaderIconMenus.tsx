'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { DEFAULT_SITE_SETTINGS, telHref, type SiteSettings } from '@/lib/site-settings';
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

function MenuChip({
  className,
  href,
  title,
  icon,
  label,
  onClick,
  external,
  asButton,
}: {
  className: string;
  href?: string;
  title: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  external?: boolean;
  asButton?: boolean;
}) {
  const inner = (
    <>
      <span className="header-menu-chip-icon" aria-hidden>
        {icon}
      </span>
      <span className="header-menu-chip-label">{label}</span>
    </>
  );

  if (asButton) {
    return (
      <button type="button" className={`header-menu-chip ${className}`} title={title} onClick={onClick}>
        {inner}
      </button>
    );
  }

  if (href?.startsWith('/') && !external) {
    return (
      <Link href={href} className={`header-menu-chip ${className}`} title={title} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <a
      className={`header-menu-chip ${className}`}
      href={href}
      title={title}
      onClick={onClick}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
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

/** Single header utility: Talk to us (Call / WhatsApp / Callback / Finder / Emergency). */
export default function HeaderIconMenus({ site, onRequestCallback }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fineHover = useFineHover();

  const phone = site.phone || DEFAULT_SITE_SETTINGS.phone;
  const emergency = site.emergencyPhone || DEFAULT_SITE_SETTINGS.emergencyPhone;
  const wa = site.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp;
  const waUrl = whatsappHref(wa, 'Hi Zigma — I would like to speak with a power & energy engineer.');

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

  return (
    <div className="header-icon-menus" ref={rootRef}>
      <div
        className={`header-icon-menu${open ? ' is-open' : ''}`}
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
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Talk to us"
          title="Talk to us"
          onClick={() => {
            if (fineHover) return;
            setOpen((v) => !v);
          }}
          onFocus={() => {
            if (fineHover) openMenu();
          }}
        >
          <span className="pulse-dot" aria-hidden />
          <IconSupport />
          <span className="header-talk-btn-label">Talk to us</span>
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
            <MenuChip
              className="header-menu-chip--call"
              href={telHref(phone)}
              title="Call now"
              icon={<IconCall />}
              label="Call now"
              onClick={() => {
                trackEvent('cta_click', { channel: 'call', placement: 'header_support' });
                setOpen(false);
              }}
            />
            <MenuChip
              className="header-menu-chip--wa"
              href={waUrl}
              title="WhatsApp"
              icon={<IconWa />}
              label="WhatsApp"
              external
              onClick={() => {
                trackEvent('cta_click', { channel: 'whatsapp', placement: 'header_support' });
                setOpen(false);
              }}
            />
            <MenuChip
              className="header-menu-chip--callback"
              asButton
              title="Request callback"
              icon={<IconCallback />}
              label="Callback"
              onClick={() => {
                trackEvent('callback_open', { placement: 'header_support' });
                setOpen(false);
                onRequestCallback();
              }}
            />
            <MenuChip
              className="header-menu-chip--tool"
              href="/tools/solution-finder"
              title="Solution finder"
              icon={<IconFinder />}
              label="Solution finder"
              onClick={() => {
                trackEvent('cta_click', { channel: 'configurator', placement: 'header_support' });
                setOpen(false);
              }}
            />
            {emergency ? (
              <MenuChip
                className="header-menu-chip--emergency"
                href={telHref(emergency)}
                title={`Emergency ${emergency}`}
                icon={<IconEmergency />}
                label="Emergency"
                onClick={() => setOpen(false)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
