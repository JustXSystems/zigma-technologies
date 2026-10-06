'use client';

import { FormEvent, Fragment, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { FormField } from '@/lib/types';
import HoneypotField from '@/components/HoneypotField';
import TurnstileField from '@/components/TurnstileField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { isTurnstileClientEnabled } from '@/lib/turnstile';
import { appHref } from '@/lib/base-path';
import { heroHeightClass, heroScrollBarOn, heroVAlignClass } from '@/lib/hero-height';
import { heroPlacement } from '@/lib/hero-placement';
import HeroSlot from '@/components/HeroSlot';
import { CONTACT_SUBJECT_EVENT, focusContactSubject } from '@/lib/contact-subject';
import { focusApplyRole } from '@/lib/careers-apply';
import { AzCtas, AzEyebrow, AzIcon, AzImage, AzPills, AzText, vars } from '@/components/sections/AboutSections';
import { LzHeading, LzMedia, colVars, useStaggerReveal } from '@/components/sections/LifeSections';
import { LgHeader, LgScrollBar, LgShell, cardVars, useOkMedia, useSlides } from '@/components/sections/LegacySections';
import { elementCss, normalizeLinkItems, type ElementStyle } from '@/lib/about-sections';
import { visibleMedia, type LifeMediaItem } from '@/lib/life-sections';
import {
  withContactDefaults,
  type ContactAction,
  type ContactFormContent,
  type ContactHelpCard,
  type ContactHelpContent,
  type ContactHeroContent,
  type ContactIconStyle,
  type ContactLocation,
  type ContactLocationsContent,
  type ContactQuickContent,
} from '@/lib/contact-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };
/** Other page families render these blocks with their own content and anchor id. */
type SharedSectionProps = SectionProps & { defaultId?: string };

const t = (v: unknown) => String(v ?? '').trim();

export function iconVars(is?: ContactIconStyle) {
  return {
    '--ctc-ico-box': is?.boxSize,
    '--ctc-ico-size': is?.size,
    '--ctc-ico-radius': is?.radius,
    '--ctc-ico-bg': is?.background,
    '--ctc-ico-color': is?.color,
    '--ctc-ico-border': is?.border,
    '--ctc-ico-stroke': is?.strokeWidth,
  };
}

/** Role → careers application form; subject → contact form; otherwise a plain link (tel:, mailto:, page, URL). */
export function ContactActionLink({
  action,
  className,
  style,
  children,
}: {
  action: ContactAction;
  className: string;
  style?: ElementStyle;
  children: ReactNode;
}) {
  const role = t(action.role);
  const subject = t(action.subject);
  const href = t(action.href);
  const css = elementCss(style);
  if (role) {
    return (
      <button type="button" className={className} style={css} data-role={role} onClick={() => focusApplyRole(role)}>
        {children}
      </button>
    );
  }
  if (subject) {
    return (
      <button type="button" className={className} style={css} onClick={() => focusContactSubject(subject)}>
        {children}
      </button>
    );
  }
  if (href) {
    return (
      <a
        className={className}
        style={css}
        href={appHref(href)}
        target={action.newTab ? '_blank' : undefined}
        rel={action.newTab ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <span className={className} style={css}>
      {children}
    </span>
  );
}

/** Cross-fading image / video slides (one item = still). */
export function ContactSlides({
  items: raw,
  intervalSeconds,
  className,
  eager,
}: {
  items?: LifeMediaItem[];
  intervalSeconds?: number;
  className: string;
  eager?: boolean;
}) {
  const { items, markFailed } = useOkMedia(raw);
  const { index, go } = useSlides(items.length, (Number(intervalSeconds) || 5) * 1000);
  if (!items.length) return null;
  return (
    <div className={`ctc-slides ${className}`}>
      {items.map((item, i) => (
        <div key={`${item.src}-${i}`} className={`ctc-slide${i === index ? ' is-on' : ''}`} aria-hidden={i === index ? undefined : true}>
          <LzMedia
            item={item}
            className="ctc-slide-media"
            eager={eager && i === 0}
            onFail={markFailed}
            active={i === index}
            warm={i === (index + 1) % items.length}
          />
        </div>
      ))}
      {items.length > 1 ? (
        <div className="ctc-slide-dots">
          {items.map((item, i) => (
            <button
              key={`${item.src}-dot-${i}`}
              type="button"
              className={`ctc-slide-dot${i === index ? ' is-on' : ''}`}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function ContactHeroSection({ content, sectionKey, defaultId = 'contact-hero' }: SharedSectionProps) {
  const c = withContactDefaults<ContactHeroContent>('contact_hero', content);
  const crumbs = normalizeLinkItems(c.breadcrumb?.items);
  const { color: crumbColor, ...crumbRest } = c.breadcrumb?.style || {};
  const place = heroPlacement(c.placement);
  return (
    <LgShell
      box={c.section}
      bg={c.background}
      className={`az-hero ctc-hero ctc-hero--${c.align === 'center' ? 'center' : 'left'} ${heroHeightClass(c.heroHeight)} ${heroVAlignClass(
        c.vAlign
      )} ${place.rootClass}${c.entrance === false ? '' : ' lgy-enter'}`}
      id={sectionKey || defaultId}
    >
      {heroScrollBarOn(c.scrollBar) ? <LgScrollBar gradient={c.scrollBar?.gradient} /> : null}
      <HeroSlot place={place} name="text">
      <div className="az-hero-copy ctc-hero-copy" style={vars({ maxWidth: c.contentMaxWidth })}>
        {!c.breadcrumb?.hidden && crumbs.length ? (
          <nav
            aria-label="Breadcrumb"
            className="az-breadcrumb ctc-crumb"
            style={{
              ...elementCss(crumbRest),
              ...vars({
                '--az-crumb-color': crumbColor,
                '--az-crumb-hover': c.breadcrumb.hoverColor,
                '--ctc-crumb-current': c.breadcrumb.currentColor,
              }),
            }}
          >
            {crumbs.map((item, i) => (
              <Fragment key={`${item.label}-${i}`}>
                {i > 0 ? <span className="ctc-crumb-sep">{c.breadcrumb.separator || '/'}</span> : null}
                {item.href && i < crumbs.length - 1 ? (
                  <a href={appHref(item.href)}>{item.label}</a>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="ctc-crumb-current">
                    {item.label}
                  </span>
                )}
              </Fragment>
            ))}
          </nav>
        ) : null}
        <AzEyebrow el={c.eyebrow} scale="md" />
        <LzHeading el={c.title} role="pageHero" className="az-hero-title ctc-hero-title" highlight={c.highlight} />
        <AzText el={c.leadEmphasis} defaultTag="p" className="az-hero-lead ctc-lead ctc-lead--emphasis" style={c.leadStyle} />
        <AzText el={c.lead} defaultTag="p" className="az-hero-lead ctc-lead" style={c.leadStyle} />
        <AzText el={c.leadAccent} defaultTag="p" className="az-hero-lead ctc-lead ctc-lead--accent" style={c.leadStyle} />
        <AzPills pills={c.pills} />
        <AzCtas ctas={c.ctas} />
      </div>
      </HeroSlot>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Quick contact bar                                                   */
/* ------------------------------------------------------------------ */

export function ContactQuickSection({ content, sectionKey }: SectionProps) {
  const c = withContactDefaults<ContactQuickContent>('contact_quick', content);
  const items = (c.items || []).filter((it) => !it.hidden && (t(it.label) || t(it.value)));
  if (!items.length) return null;
  const em = c.emergency || {};
  return (
    <LgShell box={c.section} className="ctc-quick" id={sectionKey || 'quick-contact'}>
      <div
        className={`ctc-quick-grid ctc-quick-grid--${c.justify || 'center'}${c.dividers ? ' ctc-quick-dividers' : ''}`}
        style={vars({
          ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }),
          '--lz-gap': c.gap,
          ...cardVars(c.itemStyle || {}),
          ...iconVars(c.iconStyle),
          '--ctc-hover': c.hoverColor,
          '--ctc-divider': c.dividerColor,
          '--ctc-em-color': em.color,
          '--ctc-em-ico-bg': em.iconBackground,
          '--ctc-em-ico-color': em.iconColor,
        })}
      >
        {items.map((it, i) => (
          <div key={`${it.label}-${i}`} className={`ctc-qc${it.emergency ? ' is-emergency' : ''}`}>
            <AzIcon icon={it.icon} className="ctc-ico ctc-qc-ico" />
            <div className="ctc-qc-text">
              {t(it.label) ? (
                <span className="ctc-qc-label" style={elementCss(c.labelStyle)}>
                  {it.label}
                </span>
              ) : null}
              {t(it.value) ? (
                <ContactActionLink action={it} className="ctc-qc-value" style={c.valueStyle}>
                  {it.value}
                </ContactActionLink>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* How can we help (request cards)                                     */
/* ------------------------------------------------------------------ */

function HelpCard({ card, c }: { card: ContactHelpCard; c: ContactHelpContent }) {
  const variant = card.variant === 'green' || card.variant === 'emergency' ? card.variant : 'default';
  const hasMedia = visibleMedia(card.media).length > 0;
  const hasIcon = Boolean(card.icon && !card.icon.hidden && (t(card.icon.svg) || t(card.icon.src)));
  return (
    <article
      className={`ctc-help-card ctc-help-card--${variant}`}
      style={vars({ '--ctc-own-bg': card.background, '--ctc-own-border': card.border })}
    >
      {hasMedia ? (
        <ContactSlides items={card.media} intervalSeconds={c.cardStyle?.mediaIntervalSeconds} className="ctc-card-media" />
      ) : card.image && !card.image.hidden && t(card.image.src) ? (
        <AzImage image={card.image} className="ctc-card-img" />
      ) : null}
      {hasIcon ? (
        <AzIcon icon={card.icon} className="ctc-ico ctc-help-ico" />
      ) : t(card.badge) ? (
        <div aria-hidden="true" className="ctc-ico ctc-help-ico ctc-help-badge" style={vars({ color: card.badgeColor })}>
          {card.badge}
        </div>
      ) : null}
      <AzText el={card.title} defaultTag="h5" className="ctc-help-title" style={c.titleStyle} />
      <AzText el={card.body} defaultTag="p" className="ctc-help-body" style={c.bodyStyle} />
      {t(card.linkLabel) ? (
        <ContactActionLink action={card} className="ctc-help-link" style={c.linkStyle}>
          {card.linkLabel}
        </ContactActionLink>
      ) : null}
    </article>
  );
}

export function ContactHelpSection({ content, sectionKey, defaultId = 'how-we-help' }: SharedSectionProps) {
  const c = withContactDefaults<ContactHelpContent>('contact_help', content);
  const cards = (c.cards || []).filter((card) => !card.hidden);
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.ctc-help-card', c.reveal !== false, cards.length);
  const cs = c.cardStyle || {};
  const v = c.variants || {};
  return (
    <LgShell box={c.section} className="lgy-section ctc-help" id={sectionKey || defaultId}>
      <LgHeader header={c.header} />
      {cards.length ? (
        <div
          ref={gridRef}
          className={`lgy-grid ctc-help-grid${cs.hoverLift === false ? ' lgy-no-lift' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 4, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            ...cardVars(cs),
            '--ctc-media-h': cs.mediaHeight,
            '--ctc-green-bg': v.greenBackground,
            '--ctc-green-border': v.greenBorder,
            '--ctc-em-bg': v.emergencyBackground,
            '--ctc-em-border': v.emergencyBorder,
            '--ctc-em-ico-bg': v.emergencyIconBackground,
            '--ctc-em-ico-color': v.emergencyIconColor,
            ...iconVars(c.iconStyle),
            '--ctc-link-hover': c.linkHoverColor,
          })}
        >
          {cards.map((card, i) => (
            <HelpCard key={i} card={card} c={c} />
          ))}
        </div>
      ) : null}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Locations (office cards + map / media panel)                        */
/* ------------------------------------------------------------------ */

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function subscribeFinePointer(cb: () => void) {
  const mq = window.matchMedia?.(FINE_POINTER);
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
}

function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => Boolean(window.matchMedia?.(FINE_POINTER).matches),
    () => false
  );
}

const hasPanelContent = (l: ContactLocation) => Boolean(t(l.mapEmbedUrl) || visibleMedia(l.media).length);

export function ContactLocationsSection({ content, sectionKey }: SectionProps) {
  const c = withContactDefaults<ContactLocationsContent>('contact_locations', content);
  const locations = (c.locations || []).filter((l) => !l.hidden && (t(l.title) || t(l.address)));
  const fine = useFinePointer();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panel = c.panel || { mode: 'map', media: [] };
  const hoverMode = c.interaction !== 'click' && fine;

  const defaultLoc = locations.find((l) => l.isDefault && hasPanelContent(l)) || locations.find(hasPanelContent) || null;
  const picked = locations.find((l) => l.id === pickedId) || null;
  const hovered = hoverMode ? locations.find((l) => l.id === hoverId) || null : null;
  const active = hovered || picked || (hoverMode ? null : defaultLoc);

  const mapSrc = t(active?.mapEmbedUrl) || t(panel.embedUrl) || t(defaultLoc?.mapEmbedUrl);
  const mapTitle = t(active?.mapTitle) || t(active?.title) || t(panel.title) || t(defaultLoc?.mapTitle) || 'Office map';
  const mediaItems = [active?.media, panel.media, defaultLoc?.media].find((m) => visibleMedia(m).length) || [];
  const showMedia = panel.mode === 'media' ? mediaItems.length > 0 : !mapSrc && mediaItems.length > 0;
  const showMap = !showMedia && Boolean(mapSrc);
  const showPanel = !panel.hidden && (showMap || showMedia);

  const layout = c.layout || { panelSide: 'right' };
  const panelLeft = layout.panelSide === 'left';
  const cs = c.cardStyle || {};
  const tagStyle = c.tagStyle || {};
  const { border: tagBorder, color: tagColor, ...tagRest } = tagStyle;

  function pick(id: string) {
    setPickedId(id);
    const el = panelRef.current;
    if (!el || hoverMode) return;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight || r.bottom < 0) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const cards = (
    <div className="ctc-loc-list" style={vars({ gap: c.cardGap })}>
      {locations.map((loc) => {
        const interactive = hasPanelContent(loc);
        const isActive = active?.id === loc.id;
        const phone = t(loc.phone);
        const email = t(loc.email);
        return (
          <div
            key={loc.id}
            className={`ctc-loc${isActive ? ' is-active' : ''}${interactive ? ' is-interactive' : ''}`}
            onMouseEnter={() => {
              if (hoverMode && interactive) setHoverId(loc.id);
            }}
            onMouseLeave={() => {
              if (hoverMode) setHoverId(null);
            }}
            onClick={(e) => {
              if (!interactive || (e.target as HTMLElement | null)?.closest?.('a')) return;
              pick(loc.id);
            }}
            onKeyDown={(e) => {
              if (!interactive || (e.key !== 'Enter' && e.key !== ' ')) return;
              if ((e.target as HTMLElement | null)?.closest?.('a')) return;
              e.preventDefault();
              pick(loc.id);
            }}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? 'button' : undefined}
            aria-pressed={interactive ? isActive : undefined}
            aria-label={interactive ? `${loc.title}${loc.tag ? `, ${loc.tag}` : ''}. Show on map` : undefined}
          >
            <AzIcon icon={loc.icon} className="ctc-ico ctc-loc-ico" />
            <div className="ctc-loc-body">
              {t(loc.tag) ? (
                <span
                  className="ctc-loc-tag"
                  style={{ ...elementCss(tagRest), ...vars({ '--ctc-tag-color': tagColor, '--ctc-tag-border': tagBorder }) }}
                >
                  {loc.tag}
                </span>
              ) : null}
              {t(loc.title) ? (
                <h5 className="ctc-loc-title" style={elementCss(c.titleStyle)}>
                  {loc.title}
                </h5>
              ) : null}
              {t(loc.address) ? (
                <p className="ctc-loc-addr" style={elementCss(c.addressStyle)}>
                  {loc.address}
                </p>
              ) : null}
              {t(loc.hours) ? (
                <p className="ctc-loc-addr ctc-loc-hours" style={elementCss(c.addressStyle)}>
                  {loc.hours}
                </p>
              ) : null}
              {phone ? (
                <a className="ctc-loc-link" href={appHref(t(loc.phoneHref) || `tel:${phone.replace(/\s/g, '')}`)} style={elementCss(c.linkStyle)}>
                  {phone}
                </a>
              ) : null}
              {email ? (
                <a className="ctc-loc-link ctc-loc-link--block" href={`mailto:${email}`} style={elementCss(c.linkStyle)}>
                  {email}
                </a>
              ) : null}
              {t(loc.directionsUrl) ? (
                <a
                  className="ctc-loc-link ctc-loc-link--block"
                  href={loc.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={elementCss(c.linkStyle)}
                >
                  {t(loc.directionsLabel) || c.directionsLabel || 'Get Directions →'}
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  const panelNode = showPanel ? (
    <div
      ref={panelRef}
      className={`ctc-panel${panel.sticky ? ' ctc-panel--sticky' : ''}`}
      style={vars({
        '--ctc-panel-h': panel.minHeight,
        '--ctc-panel-h-t': panel.minHeightTablet,
        '--ctc-panel-h-m': panel.minHeightMobile,
        '--ctc-panel-radius': panel.radius,
        '--ctc-panel-border': panel.border,
        '--ctc-panel-shadow': panel.shadow,
        '--ctc-map-filter': panel.filter,
      })}
    >
      {showMap ? (
        <iframe key={mapSrc} src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={mapTitle} />
      ) : (
        <ContactSlides key={active?.id || 'default'} items={mediaItems} intervalSeconds={panel.intervalSeconds} className="ctc-panel-media" />
      )}
    </div>
  ) : null;

  return (
    <LgShell box={c.section} className="lgy-section ctc-locations" id={sectionKey || 'locations'}>
      <div
        className={`ctc-loc-split${showPanel ? '' : ' ctc-loc-split--single'}${panelLeft ? ' ctc-panel-left' : ''}${
          layout.mobilePanelFirst ? ' ctc-panel-first' : ''
        }`}
        style={vars({
          '--ctc-cols': showPanel ? t(layout.columns) || (panelLeft ? '9fr 11fr' : '11fr 9fr') : undefined,
          gap: layout.gap,
          alignItems: layout.alignItems,
          ...cardVars(cs),
          '--ctc-card-active-border': cs.activeBorderColor,
          '--ctc-card-active-bg': cs.activeBackground,
          ...iconVars(c.iconStyle),
          '--ctc-link-hover': c.linkHoverColor,
        })}
      >
        <div className={`ctc-loc-main${cs.hoverLift === false ? ' lgy-no-lift' : ''}`}>
          <LgHeader header={c.header} />
          {cards}
        </div>
        {panelNode}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */

function acceptsSubject(fields: FormField[], subject: string) {
  const f = fields.find((x) => x.field_name === 'subject');
  if (!f) return false;
  return f.field_type !== 'select' || (f.options_json || []).includes(subject);
}

export function ContactFormSection({ content, sectionKey }: SectionProps) {
  const c = withContactDefaults<ContactFormContent>('contact_form', content);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const fieldsRef = useRef<FormField[]>([]);
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    fetch('/api/public/forms/enquiry')
      .then(async (r) => {
        const data = await r.json();
        if (!alive || !r.ok) return;
        const list: FormField[] = data.form?.fields || [];
        fieldsRef.current = list;
        setFormId(data.form?.id ?? null);
        setFields(list);
        const subject = new URLSearchParams(window.location.search).get('subject');
        if (subject && acceptsSubject(list, subject)) setPayload((prev) => ({ ...prev, subject }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onSubject = (e: Event) => {
      const subject = t((e as CustomEvent<{ subject?: string }>).detail?.subject);
      if (subject && acceptsSubject(fieldsRef.current, subject)) setPayload((prev) => ({ ...prev, subject }));
    };
    window.addEventListener(CONTACT_SUBJECT_EVENT, onSubject);
    return () => window.removeEventListener(CONTACT_SUBJECT_EVENT, onSubject);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg('');
    try {
      if (isTurnstileClientEnabled() && !turnstileToken.trim()) {
        throw new Error('Please complete the captcha before submitting.');
      }
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const res = await fetch('/api/public/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_id: formId,
          item_id: null,
          item_type: 'general',
          payload,
          _hp: typeof hp === 'string' ? hp : '',
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      trackEvent('enquiry_submit', { source: 'contact_form', subject: payload.subject || '' });
      setPayload({});
      setTurnstileToken('');
      const redirect = t(c.form?.redirectUrl);
      if (!redirect) {
        setSuccess(true);
      } else if (redirect.startsWith('/')) {
        router.push(redirect);
      } else {
        window.location.assign(redirect);
      }
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const f = c.form;
  const two = f.fieldColumns !== 1;
  const textFields = fields.filter((x) => x.field_type !== 'textarea' && x.field_type !== 'select');
  const selectFields = fields.filter((x) => x.field_type === 'select');
  const areaFields = fields.filter((x) => x.field_type === 'textarea');
  const rows: FormField[][] = [];
  for (let i = 0; i < textFields.length; i += two ? 2 : 1) rows.push(textFields.slice(i, i + (two ? 2 : 1)));
  const labelCss = elementCss(c.fields?.labelStyle);
  const setValue = (name: string, value: string) => setPayload((prev) => ({ ...prev, [name]: value }));

  function renderField(field: FormField, full = false) {
    const id = `ctc-f-${field.field_name}`;
    const value = payload[field.field_name] || '';
    return (
      <div key={field.id} className={`ctc-field${full ? ' ctc-field--full' : ''}`}>
        <label htmlFor={id} style={labelCss}>
          {field.label}
          {field.required ? ' *' : ''}
        </label>
        {field.field_type === 'textarea' ? (
          <textarea
            id={id}
            name={field.field_name}
            required={!!field.required}
            rows={5}
            value={value}
            onChange={(e) => setValue(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        ) : field.field_type === 'select' ? (
          <select
            id={id}
            name={field.field_name}
            data-field={field.field_name}
            required={!!field.required}
            value={value}
            onChange={(e) => setValue(field.field_name, e.target.value)}
          >
            <option value="">{field.placeholder || 'Select…'}</option>
            {(field.options_json || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            name={field.field_name}
            type={
              field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'tel' ? 'tel' : 'text'
            }
            required={!!field.required}
            value={value}
            onChange={(e) => setValue(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )}
      </div>
    );
  }

  const side = c.side;
  const sideItems = (side.items || []).filter((it) => !it.hidden && (t(it.label) || t(it.value)));
  const hours = (side.hours || []).filter((h) => t(h.label) || t(h.value));
  const offices = (side.offices || []).filter((o) => t(o.title) || t(o.lines));
  const em = c.emergency;
  const showEm = Boolean(em && !em.hidden && (t(em.title) || t(em.body) || t(em.phone)));
  const hasSideMedia = visibleMedia(side.media).length > 0;
  const showSide =
    c.layout?.sidePosition !== 'none' && !side.hidden && Boolean(sideItems.length || hours.length || offices.length || showEm || hasSideMedia);
  const sideLeft = c.layout?.sidePosition === 'left';
  const headingCss = side.headingStyle;
  const media = hasSideMedia ? (
    <ContactSlides items={side.media} intervalSeconds={side.intervalSeconds} className="ctc-side-media" />
  ) : null;
  const divider = side.dividers !== false ? <div className="ctc-side-divider" /> : null;
  const blocks: ReactNode[] = [];
  if (sideItems.length) {
    blocks.push(
      <div className="ctc-side-block" key="items">
        <AzText el={side.title} defaultTag="h4" className="ctc-side-h" style={headingCss} />
        {sideItems.map((it, i) => (
          <div className="ctc-side-item" key={`${it.label}-${i}`}>
            <AzIcon icon={it.icon} className="ctc-ico ctc-side-ico" />
            <div>
              {t(it.label) ? (
                <div className="ctc-side-label" style={elementCss(side.labelStyle)}>
                  {it.label}
                </div>
              ) : null}
              <ContactActionLink action={it} className="ctc-side-value" style={side.valueStyle}>
                {it.value}
              </ContactActionLink>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (hours.length) {
    blocks.push(
      <div className="ctc-side-block" key="hours">
        <AzText el={side.hoursTitle} defaultTag="h4" className="ctc-side-h" style={headingCss} />
        <div className="ctc-hours">
          {hours.map((h, i) => (
            <div className="ctc-hours-row" key={`${h.label}-${i}`}>
              <span style={elementCss(side.hoursLabelStyle)}>{h.label}</span>
              <span style={elementCss(side.hoursValueStyle)}>{h.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (offices.length) {
    blocks.push(
      <div className="ctc-side-block" key="offices">
        <AzText el={side.officesTitle} defaultTag="h4" className="ctc-side-h" style={headingCss} />
        <ul className="ctc-offices">
          {offices.map((o, i) => (
            <li key={`${o.title}-${i}`}>
              {t(o.title) ? <strong>{o.title}</strong> : null}
              {t(o.lines) ? <span>{o.lines}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const sideNode = showSide ? (
    <aside
      className="ctc-side"
      style={vars({
        '--ctc-side-bg': side.background,
        '--ctc-side-pad': side.padding,
        '--ctc-side-gap': side.gap,
        '--ctc-side-color': side.color,
        '--ctc-side-media-h': side.mediaHeight,
        '--ctc-divider': side.dividerColor,
        '--ctc-link-hover': side.linkHoverColor,
        ...iconVars(side.iconStyle),
      })}
    >
      {side.mediaPosition !== 'bottom' ? media : null}
      {blocks.map((b, i) => (
        <Fragment key={i}>
          {i > 0 ? divider : null}
          {b}
        </Fragment>
      ))}
      {showEm ? (
        <div
          className="ctc-em-note"
          style={vars({
            '--ctc-em-note-bg': em.background,
            '--ctc-em-note-border': em.border,
            '--ctc-em-note-color': em.color,
            '--ctc-em-note-accent': em.accent,
            '--ctc-em-note-radius': em.radius,
          })}
        >
          {t(em.title) ? <strong>{em.title}</strong> : null}
          {t(em.body) ? <span>{em.body}</span> : null}
          {t(em.phone) ? <a href={appHref(t(em.phoneHref) || `tel:${t(em.phone).replace(/\s/g, '')}`)}>{em.phone}</a> : null}
        </div>
      ) : null}
      {side.mediaPosition === 'bottom' ? media : null}
    </aside>
  ) : null;

  const fc = c.fields || {};
  const formNode = (
    <div
      className="ctc-form"
      style={vars({
        '--ctc-form-bg': f.background,
        '--ctc-form-pad': f.padding,
        '--ctc-form-border': f.border,
        '--ctc-input-bg': fc.inputBackground,
        '--ctc-input-border': fc.inputBorder,
        '--ctc-input-color': fc.inputColor,
        '--ctc-input-radius': fc.inputRadius,
        '--ctc-input-pad': fc.inputPadding,
        '--ctc-input-size': fc.inputFontSize,
        '--ctc-focus': fc.focusColor,
        '--ctc-row-gap': fc.rowGap,
      })}
    >
      {success ? (
        <div className="ctc-success" role="status">
          <div className="ctc-success-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <AzText el={f.successTitle} defaultTag="h3" className="ctc-success-title" />
          <AzText el={f.successBody} defaultTag="p" className="ctc-success-body" />
        </div>
      ) : (
        <form onSubmit={onSubmit} className="ctc-form-el">
          <HoneypotField />
          <TurnstileField onToken={setTurnstileToken} />
          <AzText el={f.title} defaultTag="h3" className="ctc-form-title" />
          <AzText el={f.intro} defaultTag="p" className="ctc-form-intro" />
          {rows.map((row, idx) => (
            <div className={`ctc-row${two ? '' : ' ctc-row--single'}`} key={`row-${idx}`}>
              {row.map((field) => renderField(field))}
            </div>
          ))}
          {selectFields.map((field) => (
            <div className="ctc-row ctc-row--single" key={field.id}>
              {renderField(field, true)}
            </div>
          ))}
          {areaFields.map((field) => (
            <div className="ctc-row ctc-row--single" key={field.id}>
              {renderField(field, true)}
            </div>
          ))}
          <button
            type="submit"
            className={`btn btn-${f.buttonVariant || 'primary'} btn-hover-lift ctc-submit${f.buttonFullWidth === false ? '' : ' ctc-submit--full'}`}
            style={elementCss(f.buttonStyle)}
            disabled={submitting || !fields.length}
          >
            {submitting ? t(f.submittingLabel) || 'Sending…' : t(f.submitLabel) || 'Submit'}
          </button>
          <AzText el={f.privacyNote} defaultTag="p" className="ctc-note" />
          {submitMsg ? (
            <p className="ctc-error" role="alert">
              {submitMsg}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );

  const anchorId = sectionKey && sectionKey !== 'contact-form' ? 'contact-form' : undefined;
  return (
    <LgShell box={c.section} className="lgy-section ctc-form-section" id={sectionKey || 'contact-form'}>
      <LgHeader header={c.header} />
      <div
        id={anchorId}
        className={`ctc-cf-grid${showSide ? '' : ' ctc-cf-grid--single'}${sideLeft ? ' ctc-side-left' : ''}${
          c.layout?.mobileSideFirst ? ' ctc-side-first' : ''
        }`}
        style={vars({
          '--ctc-cols': showSide ? t(c.layout?.columns) || (sideLeft ? '0.8fr 1.2fr' : '1.2fr 0.8fr') : undefined,
          '--ctc-cf-radius': c.layout?.radius,
          '--ctc-cf-shadow': c.layout?.shadow,
        })}
      >
        {formNode}
        {sideNode}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function renderContactSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'contact_hero':
      return <ContactHeroSection key={key} {...rest} />;
    case 'contact_quick':
      return <ContactQuickSection key={key} {...rest} />;
    case 'contact_help':
      return <ContactHelpSection key={key} {...rest} />;
    case 'contact_locations':
      return <ContactLocationsSection key={key} {...rest} />;
    case 'contact_form':
      return <ContactFormSection key={key} {...rest} />;
    default:
      return null;
  }
}