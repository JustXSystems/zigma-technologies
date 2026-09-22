import type { FooterColumn } from '@/lib/nav-tree';
import type { SiteCopy } from '@/lib/site-copy';
import type { SiteSettings } from '@/lib/site-settings';
import { appHref } from '@/lib/base-path';

type Props = {
  columns: FooterColumn[];
  site: SiteSettings;
  copy: SiteCopy;
};

/** Server-rendered footer nav columns — same DB source as Admin → Navigation (footer). */
export default function FooterLinkColumns({ columns, site, copy }: Props) {
  return (
    <>
      {columns.map((col) => (
        <div key={col.heading} className="foot-col">
          <h6>{col.heading}</h6>
          {col.links.map((link) => (
            <a key={`${col.heading}-${link.label}`} href={appHref(link.href)} className={link.className}>
              {link.label}
            </a>
          ))}
          {col.heading.toLowerCase() === 'contact' ? (
            <>
              {site.addressLocality || site.officeHours ? (
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
                    <a
                      href={site.facebookUrl}
                      className="sl-fb"
                      aria-label={copy.a11y.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
                      </svg>
                    </a>
                  ) : null}
                  {site.linkedinUrl ? (
                    <a
                      href={site.linkedinUrl}
                      className="sl-li"
                      aria-label={copy.a11y.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
    </>
  );
}
