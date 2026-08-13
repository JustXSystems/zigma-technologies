'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { telHref, DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings';

function ProofIcon({ variant }: { variant: 'legacy' | 'cert' | 'desk' | 'case' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  if (variant === 'legacy') {
    return (
      <svg {...common}>
        <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
        <path d="M9 12h6" />
      </svg>
    );
  }
  if (variant === 'cert') {
    return (
      <svg {...common}>
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-5" />
      </svg>
    );
  }
  if (variant === 'desk') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 15s1.5 2 4 2 4-2 4-2" />
        <path d="M9 9h.01M15 9h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 4h16v16H4z" />
      <path d="M8 12h8" />
      <path d="M8 9h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

export default function ProofBlocks() {
  const pathname = usePathname();
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  if (pathname === '/') return null;

  useEffect(() => {
    fetch('/api/public/site-settings')
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.settings) setSite(data.settings);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="proof-blocks-wrap" aria-label="Proof highlights">
      <div className="container proof-blocks">
        <a className="proof-card proof-card--legacy" href="/#legacy">
          <span className="proof-card-icon" aria-hidden>
            <ProofIcon variant="legacy" />
          </span>
          <span className="proof-card-text">
            <strong>20+ Years Legacy</strong>
            <span className="proof-card-sub">Trusted power & energy execution</span>
          </span>
        </a>

        <a className="proof-card proof-card--cert" href="/certifications">
          <span className="proof-card-icon" aria-hidden>
            <ProofIcon variant="cert" />
          </span>
          <span className="proof-card-text">
            <strong>Certified Standards</strong>
            <span className="proof-card-sub">OEM-aligned quality & compliance</span>
          </span>
        </a>

        <a className="proof-card proof-card--desk" href={telHref(site.emergencyPhone || site.phone)}>
          <span className="proof-card-icon" aria-hidden>
            <ProofIcon variant="desk" />
          </span>
          <span className="proof-card-text">
            <strong>24×7 Engineering Desk</strong>
            <span className="proof-card-sub">Emergency support whenever needed</span>
          </span>
        </a>

        <a className="proof-card proof-card--case" href="/projects">
          <span className="proof-card-icon" aria-hidden>
            <ProofIcon variant="case" />
          </span>
          <span className="proof-card-text">
            <strong>Proof-Driven Case Studies</strong>
            <span className="proof-card-sub">Outcomes, scope, and commercial clarity</span>
          </span>
        </a>
      </div>
    </section>
  );
}

