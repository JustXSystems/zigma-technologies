import type { FooterColumn } from '@/lib/nav-tree';
import { appHref } from '@/lib/base-path';

type Props = {
  columns: FooterColumn[];
};

/** Renders Admin → Navigation → Footer columns only. No extras. */
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
