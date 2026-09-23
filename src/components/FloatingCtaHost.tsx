'use client';

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import CallbackRequestModal from '@/components/CallbackRequestModal';
import { useSiteCopy } from '@/lib/use-site-copy';
import { useSiteShell } from '@/components/SiteProviders';
import { trackEvent } from '@/lib/analytics';
import { appHref } from '@/lib/base-path';
import {
  floatingCtaStyleClass,
  floatingCtaVisibleOnPath,
  parseFloatingCta,
  type FloatingCtaItem,
} from '@/lib/floating-cta';
import { DEFAULT_SITE_SETTINGS, telHref } from '@/lib/site-settings';
import { whatsappHref } from '@/lib/whatsapp';

type Resolved = {
  item: FloatingCtaItem;
  className: string;
  title: string;
  href?: string;
  asButton?: boolean;
  external?: boolean;
  run: () => void;
};

function WhatsAppGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z" />
    </svg>
  );
}

function resolveItem(
  item: FloatingCtaItem,
  opts: {
    phone: string;
    waUrl: string;
    openConsultation: (subject: string) => void;
    openCallback: () => void;
    placement: string;
  }
): Resolved | null {
  const className = floatingCtaStyleClass(item.style, item.zone);
  const title = item.ariaLabel.trim() || item.label;

  switch (item.action) {
    case 'call': {
      if (!opts.phone) return null;
      return {
        item,
        className,
        title,
        href: telHref(opts.phone),
        run: () => trackEvent('cta_click', { channel: 'call', placement: opts.placement }),
      };
    }
    case 'whatsapp': {
      if (!opts.waUrl) return null;
      return {
        item,
        className,
        title,
        href: opts.waUrl,
        external: true,
        run: () => trackEvent('cta_click', { channel: 'whatsapp', placement: opts.placement }),
      };
    }
    case 'consultation':
      return {
        item,
        className,
        title,
        asButton: true,
        run: () => {
          trackEvent('cta_click', { channel: 'consultation', placement: opts.placement });
          opts.openConsultation(item.consultSubject || 'Request a Quote');
        },
      };
    case 'callback':
      return {
        item,
        className,
        title,
        asButton: true,
        run: () => {
          trackEvent('callback_open', { placement: opts.placement });
          opts.openCallback();
        },
      };
    case 'link': {
      const href = item.href?.trim();
      if (!href) return null;
      const external = item.openInNewTab || /^https?:\/\//i.test(href);
      return {
        item,
        className,
        title,
        href: external ? href : appHref(href),
        external,
        run: () => trackEvent('cta_click', { channel: 'floating_cta_link', placement: opts.placement }),
      };
    }
    default:
      return null;
  }
}

function renderControl(resolved: Resolved, opts: { iconOnly?: boolean }): ReactNode {
  const content = opts.iconOnly ? <WhatsAppGlyph /> : resolved.item.label;
  const common = {
    className: resolved.className,
    'aria-label': resolved.title,
    onClick: resolved.run,
  };

  if (resolved.asButton || !resolved.href) {
    return (
      <button key={resolved.item.id} type="button" {...common}>
        {content}
      </button>
    );
  }

  return (
    <a
      key={resolved.item.id}
      href={resolved.href}
      {...common}
      {...(resolved.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {content}
    </a>
  );
}

/** Sticky mobile CTA bar + floating action buttons — configured in Site Settings. */
export default function FloatingCtaHost() {
  const pathname = usePathname();
  const router = useRouter();
  const { settings: site } = useSiteShell();
  const copy = useSiteCopy();
  const [callbackOpen, setCallbackOpen] = useState(false);

  const config = useMemo(() => parseFloatingCta(site.floatingCtaJson), [site.floatingCtaJson]);
  const phone = site.phone || DEFAULT_SITE_SETTINGS.phone;
  const wa = site.whatsapp || DEFAULT_SITE_SETTINGS.whatsapp;
  const waUrl = whatsappHref(wa, copy.talk.whatsappPrefill);

  const openConsultation = useCallback(
    (subject: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('consult', '1');
      url.searchParams.set('consult_subject', subject);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`);
    },
    [router]
  );

  const openCallback = useCallback(() => setCallbackOpen(true), []);

  const stickyItems = useMemo(() => {
    if (!config.stickyEnabled) return [];
    return config.items
      .filter((item) => item.zone === 'sticky' && floatingCtaVisibleOnPath(item, pathname))
      .map((item) =>
        resolveItem(item, {
          phone,
          waUrl,
          openConsultation,
          openCallback,
          placement: 'mobile_sticky',
        })
      )
      .filter((x): x is Resolved => Boolean(x));
  }, [config, pathname, phone, waUrl, openConsultation, openCallback]);

  const floatItems = useMemo(() => {
    if (!config.floatEnabled) return [];
    return config.items
      .filter((item) => item.zone === 'float' && floatingCtaVisibleOnPath(item, pathname))
      .map((item) =>
        resolveItem(item, {
          phone,
          waUrl,
          openConsultation,
          openCallback,
          placement: 'float',
        })
      )
      .filter((x): x is Resolved => Boolean(x));
  }, [config, pathname, phone, waUrl, openConsultation, openCallback]);

  return (
    <>
      {floatItems.length ? (
        <div
          className={`float-cta-stack${stickyItems.length ? ' float-cta-stack--above-sticky' : ''}`}
          style={{ '--float-cta-count': floatItems.length } as CSSProperties}
        >
          {floatItems.map((resolved) => renderControl(resolved, { iconOnly: resolved.className === 'float-wa' }))}
        </div>
      ) : null}

      {stickyItems.length ? (
        <div
          className="sticky-mobile-cta"
          style={{ '--sticky-cta-count': stickyItems.length } as CSSProperties}
        >
          {stickyItems.map((resolved) => renderControl(resolved, { iconOnly: false }))}
        </div>
      ) : null}

      {callbackOpen ? <CallbackRequestModal onClose={() => setCallbackOpen(false)} /> : null}
    </>
  );
}
