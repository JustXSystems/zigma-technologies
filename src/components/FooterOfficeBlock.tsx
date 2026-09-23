'use client';

import { useMemo, type CSSProperties } from 'react';
import { isSettingEnabled, sanitizeCssSize, sanitizeFooterOfficeAlign, type SiteSettings } from '@/lib/site-settings';
import { renderFooterOfficeLines } from '@/lib/footer-office-layout';
import { useSiteCopy } from '@/lib/use-site-copy';

type Props = {
  site: SiteSettings;
  /** When true, render the section heading (used when Contact column is missing). */
  showHeading?: boolean;
};

/**
 * Footer office / address block from Admin → Site Settings → Address & office.
 * Line order and field grouping come from footerOfficeLayoutJson.
 */
export default function FooterOfficeBlock({ site, showHeading = false }: Props) {
  const copy = useSiteCopy();

  const lines = useMemo(() => {
    if (!isSettingEnabled(site.footerOfficeEnabled, true)) return [];
    return renderFooterOfficeLines(site, site.footerOfficeLayoutJson);
  }, [site]);

  if (!lines.length) return null;

  const align = sanitizeFooterOfficeAlign(site.footerOfficeAlign);
  const maxWidth = site.footerOfficeMaxWidth?.trim()
    ? sanitizeCssSize(site.footerOfficeMaxWidth, '')
    : '';
  const marginTop = sanitizeCssSize(site.footerOfficeMarginTop, '1.15rem');

  /* Prefer CSS vars so mobile media queries can override max-width / margin. */
  const style: CSSProperties = {
    marginTop,
    ['--foot-office-align' as string]: align,
    ['--foot-office-max-width' as string]: maxWidth || '100%',
  };

  const addressLines = lines.filter((l) => l.kind === 'address' || l.kind === 'custom');
  const metaLines = lines.filter((l) => l.kind === 'hours' || l.kind === 'sla');

  return (
    <div className={`foot-meta foot-office align-${align}`} style={style}>
      {showHeading && copy.footer.officeHeading ? <h6 className="foot-office-heading">{copy.footer.officeHeading}</h6> : null}
      {!showHeading && copy.footer.officeHeading ? (
        <div className="foot-office-label">{copy.footer.officeHeading}</div>
      ) : null}
      {addressLines.length ? (
        <address className="foot-office-address">
          {addressLines.map((line) => (
            <span key={line.key} className="foot-office-line">
              {line.text}
            </span>
          ))}
        </address>
      ) : null}
      {metaLines.map((line) => (
        <span key={line.key} className={`foot-office-meta ${line.kind === 'sla' ? 'foot-sla' : 'foot-hours'}`}>
          {line.showLabel ? (
            <em>{line.kind === 'sla' ? copy.footer.officeSlaLabel : copy.footer.officeHoursLabel}</em>
          ) : null}
          <span className="foot-office-meta-text">{line.text}</span>
        </span>
      ))}
    </div>
  );
}
