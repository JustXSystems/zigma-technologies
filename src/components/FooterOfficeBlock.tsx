'use client';

import { useMemo, type CSSProperties } from 'react';
import {
  formatOfficeAddressLines,
  isSettingEnabled,
  sanitizeCssSize,
  sanitizeFooterOfficeAlign,
  type SiteSettings,
} from '@/lib/site-settings';
import { useSiteCopy } from '@/lib/use-site-copy';

type Props = {
  site: SiteSettings;
  /** When true, render the section heading (used when Contact column is missing). */
  showHeading?: boolean;
};

/**
 * Footer office / address block from Admin → Site Settings → Address & office.
 * Placed after Contact links and before Social icons.
 */
export default function FooterOfficeBlock({ site, showHeading = false }: Props) {
  const copy = useSiteCopy();

  const visible = useMemo(() => {
    if (!isSettingEnabled(site.footerOfficeEnabled, true)) return null;
    const showAddress = isSettingEnabled(site.footerOfficeShowAddress, true);
    const showHours = isSettingEnabled(site.footerOfficeShowHours, true);
    const showSla = isSettingEnabled(site.footerOfficeShowSla, false);
    const lines = showAddress ? formatOfficeAddressLines(site) : [];
    const hours = showHours ? site.officeHours?.trim() : '';
    const sla = showSla ? site.responseSla?.trim() : '';
    if (!lines.length && !hours && !sla) return null;
    return { lines, hours, sla };
  }, [site]);

  if (!visible) return null;

  const align = sanitizeFooterOfficeAlign(site.footerOfficeAlign);
  const maxWidth = site.footerOfficeMaxWidth?.trim()
    ? sanitizeCssSize(site.footerOfficeMaxWidth, '')
    : '';
  const marginTop = sanitizeCssSize(site.footerOfficeMarginTop, '1.15rem');

  const style: CSSProperties = {
    textAlign: align === 'center' ? 'center' : align === 'end' ? 'right' : 'left',
    marginTop,
    ...(maxWidth
      ? {
          maxWidth: `min(${maxWidth}, 100%)`,
          ...(align === 'center' ? { marginInline: 'auto' as const } : {}),
          ...(align === 'end' ? { marginInlineStart: 'auto' as const } : {}),
        }
      : { maxWidth: '100%' }),
    ['--foot-office-align' as string]: align,
  };

  return (
    <div className={`foot-meta foot-office align-${align}`} style={style}>
      {showHeading && copy.footer.officeHeading ? <h6 className="foot-office-heading">{copy.footer.officeHeading}</h6> : null}
      {!showHeading && copy.footer.officeHeading ? (
        <div className="foot-office-label">{copy.footer.officeHeading}</div>
      ) : null}
      {visible.lines.length ? (
        <address className="foot-office-address">
          {visible.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
      ) : null}
      {visible.hours ? (
        <span className="foot-hours">
          <em>{copy.footer.officeHoursLabel}</em> {visible.hours}
        </span>
      ) : null}
      {visible.sla ? (
        <span className="foot-sla">
          <em>{copy.footer.officeSlaLabel}</em> {visible.sla}
        </span>
      ) : null}
    </div>
  );
}
