'use client';

import { useEffect, useRef, useState } from 'react';
import { AzIcon, AzText, vars } from '@/components/sections/AboutSections';
import { LgHeader, LgShell, cardVars } from '@/components/sections/LegacySections';
import { ContactHeroSection, ContactSlides, iconVars } from '@/components/sections/ContactSections';
import { CertsCtaSection } from '@/components/sections/CertificationsSections';
import { elementCss } from '@/lib/about-sections';
import { visibleMedia } from '@/lib/life-sections';
import { privacyAnchor, withPrivacyDefaults, type PrivacyPolicyContent } from '@/lib/privacy-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const t = (v: unknown) => String(v ?? '').trim();

/* ------------------------------------------------------------------ */
/* Hero + CTA band (shared renderers, privacy defaults)                */
/* ------------------------------------------------------------------ */

export function PrivacyHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withPrivacyDefaults('privacy_hero', content)} sectionKey={sectionKey} defaultId="privacy-hero" />;
}

export function PrivacyCtaSection({ content, sectionKey }: SectionProps) {
  return <CertsCtaSection content={withPrivacyDefaults('privacy_cta', content)} sectionKey={sectionKey} defaultId="privacy-cta" className="pvc-cta" />;
}

/* ------------------------------------------------------------------ */
/* Policy text (blocks + optional table of contents)                   */
/* ------------------------------------------------------------------ */

export function PrivacyPolicySection({ content, sectionKey, defaultId = 'privacy-body' }: SectionProps & { defaultId?: string }) {
  const c = withPrivacyDefaults<PrivacyPolicyContent>('privacy_policy', content);
  const blocks = (c.blocks || []).filter((b) => !b.hidden && (t(b.title?.text) || t(b.html) || visibleMedia(b.media).length));
  const used = new Set<string>();
  const items = blocks.map((b, i) => {
    const base = privacyAnchor(t(b.anchor) || t(b.title?.text)) || `policy-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return { b, id, label: t(b.title?.text) };
  });
  const tocItems = items.filter((x) => x.label);
  const toc = c.toc || { title: 'On this page' };
  const showToc = !toc.hidden && tocItems.length > 1;
  const tocKey = tocItems.map((x) => x.id).join('|');
  const [active, setActive] = useState('');
  const blocksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = blocksRef.current;
    if (!showToc || !root || typeof IntersectionObserver === 'undefined') return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-pvc-titled]'));
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [showToc, tocKey]);

  const layout = c.layout || {};
  const right = toc.position === 'right';
  const bodyCss = elementCss(c.bodyStyle);
  const tocNode = showToc ? (
    <nav
      className={`pvc-toc${toc.sticky === false ? '' : ' pvc-toc--sticky'}`}
      aria-label={t(toc.title) || 'On this page'}
      style={vars({
        '--pvc-toc-top': toc.stickyTop,
        '--pvc-toc-bg': toc.background,
        '--pvc-toc-border': toc.border,
        '--pvc-toc-radius': toc.radius,
        '--pvc-toc-pad': toc.padding,
        '--pvc-toc-active': toc.activeColor,
      })}
    >
      <details open>
        <summary className="pvc-toc-title">{t(toc.title) || 'On this page'}</summary>
        <ol className="pvc-toc-list">
          {tocItems.map((x, i) => (
            <li key={x.id}>
              <a href={`#${x.id}`} className={active === x.id ? 'is-on' : undefined} aria-current={active === x.id ? 'location' : undefined} style={elementCss(toc.linkStyle)}>
                {c.numbered ? <span className="pvc-toc-no">{String(i + 1).padStart(2, '0')}</span> : null}
                {x.label}
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  ) : null;

  return (
    <LgShell box={c.section} bg={c.background} className="lgy-section pvc-policy" id={sectionKey || defaultId}>
      <LgHeader header={c.header} />
      <div
        className={`pvc-layout${showToc ? ' pvc-layout--toc' : ''}${right ? ' pvc-toc-right' : ''}`}
        style={vars({ '--pvc-toc-w': toc.width, '--pvc-gap': layout.gap })}
      >
        {tocNode}
        <div className="pvc-main" style={vars({ maxWidth: layout.maxWidth })}>
          <div className="pvc-panel" style={vars(cardVars(c.panel || {}))}>
            <AzText el={c.updated} defaultTag="p" className="pvc-updated" style={c.updatedStyle} />
            <AzText el={c.intro} defaultTag="p" className="pvc-intro" style={c.introStyle} />
            <div
              ref={blocksRef}
              className={`pvc-blocks${c.numbered ? ' pvc-numbered' : ''}${layout.dividers ? ' pvc-dividers' : ''}`}
              style={vars({
                '--pvc-block-gap': layout.blockGap,
                '--pvc-divider': layout.dividerColor,
                '--pvc-para-gap': c.paragraphGap,
                '--pvc-link': c.linkColor,
                '--pvc-link-hover': c.linkHoverColor,
                '--pvc-marker': c.markerColor,
                '--pvc-media-h': c.mediaHeight,
                ...iconVars(c.iconStyle),
              })}
            >
              {items.map(({ b, id, label }) => (
                <div key={id} id={id} className="pvc-block" data-pvc-titled={label ? '' : undefined}>
                  {label || (b.icon && !b.icon.hidden) ? (
                    <div className="pvc-block-head">
                      {b.icon ? <AzIcon icon={b.icon} className="ctc-ico pvc-ico" /> : null}
                      <AzText el={b.title} defaultTag="h2" className="pvc-block-title" style={c.blockTitleStyle} />
                    </div>
                  ) : null}
                  {t(b.html) ? <div className="pvc-prose" style={bodyCss} dangerouslySetInnerHTML={{ __html: b.html }} /> : null}
                  {visibleMedia(b.media).length ? (
                    <ContactSlides items={b.media} intervalSeconds={c.mediaIntervalSeconds} className="pvc-media" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderPrivacySection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'privacy_hero':
      return <PrivacyHeroSection key={key} {...rest} />;
    case 'privacy_policy':
      return <PrivacyPolicySection key={key} {...rest} />;
    case 'privacy_cta':
      return <PrivacyCtaSection key={key} {...rest} />;
    default:
      return null;
  }
}
