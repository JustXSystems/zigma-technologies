'use client';

import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { useSiteCopy } from '@/lib/use-site-copy';
import { useSiteShell } from '@/components/SiteProviders';

export default function FloatingWhatsApp() {
  const { settings: site } = useSiteShell();
  const copy = useSiteCopy();
  const phone = String(site.whatsapp || '').replace(/\D/g, '');
  if (!phone) return null;

  return (
    <a
      href={whatsappHref(site.whatsapp, copy.talk.whatsappPrefill)}
      target="_blank"
      rel="noopener noreferrer"
      className="float-wa"
      aria-label={`Chat on ${copy.talk.whatsapp}`}
      onClick={() => trackEvent('cta_click', { channel: 'whatsapp', placement: 'float' })}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden>
        <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.6 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.2 14.3c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9 0-1.4.7-2 1-2.3.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.7.8 2 1 .3.1.5.2.6.3.1.2.1.9-.1 1.5z" />
      </svg>
    </a>
  );
}
