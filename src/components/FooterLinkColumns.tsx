import type { FooterColumn } from '@/lib/nav-tree';
import type { SiteCopy } from '@/lib/site-copy';
import { appHref } from '@/lib/base-path';

type Props = {
  columns: FooterColumn[];
  copy: SiteCopy;
};

/**
 * Exact Admin → Navigation (footer) links only.
 * No address / hours / social injection — those are Site Settings, not footer nav rows.
 */
export default function FooterLinkColumns({ columns }: Props) {
  if (!columns.length) return null;

  return (
    <>
      {columns.map((col) => (
        <div key={col.id} className="foot-col">
          <h6>{col.heading}</h6>
          {col.links.map((link) => (
            <a key={link.id} href={appHref(link.href)} className={link.className}>
              {link.label}
            </a>
          ))}
        </div>
      ))}
    </>
  );
}
