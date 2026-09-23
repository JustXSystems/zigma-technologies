import type { ReactNode } from 'react';
import type { FooterColumn } from '@/lib/nav-tree';
import { appHref } from '@/lib/base-path';

type Props = {
  columns: FooterColumn[];
  /** Injected after Contact column links (office block + social). */
  contactExtras?: ReactNode;
  /** Heading when Contact column is missing but extras exist. */
  contactFallbackHeading?: string;
};

function isContactColumn(heading: string) {
  return /^contact$/i.test(heading.trim());
}

/**
 * Renders Admin → Navigation → Footer columns.
 * Optional contactExtras (office address + social) attach after Contact links.
 */
export default function FooterLinkColumns({
  columns,
  contactExtras,
  contactFallbackHeading = 'Contact',
}: Props) {
  if (!columns.length && !contactExtras) return null;

  const hasContact = columns.some((col) => isContactColumn(col.heading));

  return (
    <>
      {columns.map((col) => {
        const isContact = isContactColumn(col.heading);
        return (
          <div key={col.id} className={`foot-col${isContact ? ' foot-col-contact' : ''}`}>
            <h6>{col.heading}</h6>
            {col.links.map((link) => (
              <a key={link.id} href={appHref(link.href)} className={link.className}>
                {link.label}
              </a>
            ))}
            {isContact ? contactExtras : null}
          </div>
        );
      })}
      {!hasContact && contactExtras ? (
        <div className="foot-col foot-col-contact">
          <h6>{contactFallbackHeading}</h6>
          {contactExtras}
        </div>
      ) : null}
    </>
  );
}
