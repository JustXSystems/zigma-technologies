'use client';

import { FormEvent, Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/form-guard';
import { trackEvent } from '@/lib/analytics';
import { appHref } from '@/lib/base-path';
import { focusApplyRole } from '@/lib/careers-apply';
import { AzCtas, AzIcon, AzText, vars } from '@/components/sections/AboutSections';
import { colVars, useStaggerReveal } from '@/components/sections/LifeSections';
import { LegacyStatsSection, LgHeader, LgShell, cardVars } from '@/components/sections/LegacySections';
import { ContactActionLink, ContactHelpSection, ContactHeroSection, ContactSlides, iconVars } from '@/components/sections/ContactSections';
import { elementCss } from '@/lib/about-sections';
import { visibleMedia } from '@/lib/life-sections';
import {
  CAREERS_APPLY_ANCHOR,
  CAREERS_DEFAULT_ROLES,
  withCareersDefaults,
  type CareersApplicationContent,
  type CareersFieldText,
  type CareersInternshipContent,
  type CareersJob,
  type CareersJobsContent,
  type CareersWhyCard,
  type CareersWhyContent,
} from '@/lib/careers-sections';

type SectionProps = { content: Record<string, unknown>; sectionKey?: string | null };

const t = (v: unknown) => String(v ?? '').trim();
const ROLE_EVENT = 'careers:prefill-role';

/* ------------------------------------------------------------------ */
/* Hero, stat bar, icon cards (shared renderers, careers defaults)     */
/* ------------------------------------------------------------------ */

export function CareersHeroSection({ content, sectionKey }: SectionProps) {
  return <ContactHeroSection content={withCareersDefaults('careers_hero', content)} sectionKey={sectionKey} defaultId="careers-hero" />;
}

export function CareersStatsSection({ content, sectionKey }: SectionProps) {
  return <LegacyStatsSection content={withCareersDefaults('careers_stats', content)} sectionKey={sectionKey || 'culture'} />;
}

export function CareersCardsSection({ content, sectionKey }: SectionProps) {
  return <ContactHelpSection content={withCareersDefaults('careers_cards', content)} sectionKey={sectionKey} defaultId="life-at-zigma" />;
}

/* ------------------------------------------------------------------ */
/* Why join us (numbered tinted cards with a travelling outline)       */
/* ------------------------------------------------------------------ */

function WhyCard({ card, i, c }: { card: CareersWhyCard; i: number; c: CareersWhyContent }) {
  const o = c.outline || {};
  const rx = parseFloat(t(c.cardStyle?.radius)) || 10;
  const stagger = Number.isFinite(Number(o.staggerSeconds)) ? Number(o.staggerSeconds) : 0.6;
  const hasMedia = visibleMedia(card.media).length > 0;
  return (
    <article
      className={`crs-why-card${o.animate === false ? '' : ' is-animated'}`}
      style={vars({ '--crs-own-bg': card.background, '--crs-accent': card.accent, '--crs-delay': `${(i * stagger).toFixed(2)}s` })}
    >
      {!o.hidden ? (
        <svg className="crs-outline" width="100%" height="100%" aria-hidden="true">
          <rect className="crs-outline-base" x="0" y="0" width="100%" height="100%" rx={rx} pathLength={100} />
          <rect className="crs-outline-hi" x="0" y="0" width="100%" height="100%" rx={rx} pathLength={100} />
        </svg>
      ) : null}
      {hasMedia ? (
        <ContactSlides items={card.media} intervalSeconds={c.cardStyle?.mediaIntervalSeconds} className="crs-why-media" />
      ) : null}
      {card.icon ? <AzIcon icon={card.icon} className="ctc-ico crs-why-ico" /> : null}
      {t(card.index) ? (
        <div className="crs-why-index" style={elementCss(c.indexStyle)}>
          {card.index}
        </div>
      ) : null}
      <AzText el={card.title} defaultTag="h4" className="crs-why-title" style={c.titleStyle} />
      <AzText el={card.body} defaultTag="p" className="crs-why-body" style={c.bodyStyle} />
      {t(card.linkLabel) ? (
        <ContactActionLink action={card} className="ctc-help-link crs-why-link" style={c.linkStyle}>
          {card.linkLabel}
        </ContactActionLink>
      ) : null}
    </article>
  );
}

export function CareersWhySection({ content, sectionKey }: SectionProps) {
  const c = withCareersDefaults<CareersWhyContent>('careers_why', content);
  const cards = (c.cards || []).filter((card) => !card.hidden && (t(card.title?.text) || t(card.body?.text) || t(card.index)));
  const gridRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(gridRef, '.crs-why-card', c.reveal !== false, cards.length);
  const cs = c.cardStyle || {};
  const o = c.outline || {};
  const dash = Math.min(100, Math.max(1, Number(o.dash) || 70));
  return (
    <LgShell box={c.section} className="lgy-section crs-why" id={sectionKey || 'why-join-us'}>
      <LgHeader header={c.header} />
      {cards.length ? (
        <div
          ref={gridRef}
          className={`lgy-grid crs-why-grid${cs.hoverLift ? ' crs-lift' : ''}`}
          style={vars({
            ...colVars(c.columns, { desktop: 3, tablet: 2, mobile: 1 }),
            '--lz-gap': c.gap,
            ...cardVars(cs),
            '--crs-media-h': cs.mediaHeight,
            '--crs-outline': o.color,
            '--crs-outline-opacity': t(o.baseOpacity) || undefined,
            '--crs-outline-w': o.width,
            '--crs-dash': String(dash),
            '--crs-speed': o.speedSeconds ? `${o.speedSeconds}s` : undefined,
            '--crs-title-hover': c.titleHoverColor,
            ...iconVars(c.iconStyle),
            '--ctc-link-hover': c.linkHoverColor,
          })}
        >
          {cards.map((card, i) => (
            <WhyCard key={i} card={card} i={i} c={c} />
          ))}
        </div>
      ) : null}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Current openings                                                    */
/* ------------------------------------------------------------------ */

function JobCard({ job, c }: { job: CareersJob; c: CareersJobsContent }) {
  const ci = c.chipIcons;
  const chips: Array<{ text: string; icon?: typeof ci.department }> = [
    { text: t(job.department), icon: ci?.department },
    { text: t(job.location), icon: ci?.location },
    { text: t(job.type), icon: ci?.type },
    ...(job.chips || []).map((text) => ({ text: t(text) })),
  ].filter((chip) => chip.text);
  const role = t(job.role) || t(job.title);
  const label = t(job.applyLabel) || t(c.applyLabel) || 'Apply Now →';
  const href = t(job.href);
  return (
    <article className="crs-job" style={vars({ '--crs-own-bg': job.background })}>
      <div className="crs-job-main">
        <div className="crs-job-head">
          <h5 className="crs-job-title" style={elementCss(c.titleStyle)}>
            {job.title}
          </h5>
          {t(job.badge) ? (
            <span className="crs-job-badge" style={elementCss(c.badgeStyle)}>
              {job.badge}
            </span>
          ) : null}
        </div>
        {chips.length ? (
          <div className="crs-job-meta">
            {chips.map((chip, i) => (
              <span className="crs-job-chip" key={`${chip.text}-${i}`} style={elementCss(c.chipStyle)}>
                {ci?.enabled && chip.icon ? <AzIcon icon={chip.icon} className="crs-chip-ico" /> : null}
                {chip.text}
              </span>
            ))}
          </div>
        ) : null}
        {t(job.description) ? (
          <div className="crs-job-desc" style={elementCss(c.descriptionStyle)} dangerouslySetInnerHTML={{ __html: t(job.description) }} />
        ) : null}
      </div>
      {(href && t(job.linkLabel)) || !c.hideApply ? (
        <div className="crs-job-actions">
          {href && t(job.linkLabel) ? (
            <a
              className="crs-job-link"
              href={appHref(href)}
              target={job.newTab ? '_blank' : undefined}
              rel={job.newTab ? 'noopener noreferrer' : undefined}
              style={elementCss(c.linkStyle)}
            >
              {job.linkLabel}
            </a>
          ) : null}
          {!c.hideApply ? (
            <button
              type="button"
              className={`btn btn-${c.buttonVariant || 'primary'}${c.buttonSize === 'md' ? '' : ' btn-sm'} crs-job-apply`}
              style={elementCss(c.buttonStyle)}
              data-role={role}
              onClick={() => focusApplyRole(role)}
            >
              {label}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function CareersJobsSection({ content, sectionKey }: SectionProps) {
  const c = withCareersDefaults<CareersJobsContent>('careers_jobs', content);
  const jobs = (c.jobs || []).filter((j) => !j.hidden && t(j.title));
  const [dept, setDept] = useState('');
  const departments = Array.from(new Set(jobs.map((j) => t(j.department)).filter(Boolean)));
  const filterOn = Boolean(c.filter?.enabled) && departments.length > 1;
  const active = filterOn && departments.includes(dept) ? dept : '';
  const shown = active ? jobs.filter((j) => t(j.department) === active) : jobs;
  const listRef = useRef<HTMLDivElement>(null);
  useStaggerReveal(listRef, '.crs-job', c.reveal !== false, `${active}|${shown.length}`);
  const cs = c.cardStyle || {};
  const f = c.filter || { allLabel: 'All roles' };
  return (
    <LgShell box={c.section} className="lgy-section crs-jobs" id={sectionKey || 'current-openings'}>
      <LgHeader header={c.header} />
      {filterOn ? (
        <div
          className="crs-filter"
          role="group"
          aria-label="Filter roles by department"
          style={vars({ '--crs-filter-bg': f.activeBackground, '--crs-filter-color': f.activeColor })}
        >
          {['', ...departments].map((d) => (
            <button
              key={d || 'all'}
              type="button"
              className={`crs-filter-btn${active === d ? ' is-on' : ''}`}
              aria-pressed={active === d}
              style={elementCss(f.style)}
              onClick={() => setDept(d)}
            >
              {d || t(f.allLabel) || 'All roles'}
            </button>
          ))}
        </div>
      ) : null}
      {shown.length ? (
        <div
          ref={listRef}
          className={`crs-job-list${cs.hoverLift === false ? ' lgy-no-lift' : ''}`}
          style={vars({ ...colVars(c.columns, { desktop: 1, tablet: 1, mobile: 1 }), '--lz-gap': c.gap, ...cardVars(cs) })}
        >
          {shown.map((job, i) => (
            <JobCard key={`${job.title}-${i}`} job={job} c={c} />
          ))}
        </div>
      ) : (
        <AzText el={c.emptyText} defaultTag="p" className="crs-job-empty" />
      )}
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Internship program                                                  */
/* ------------------------------------------------------------------ */

export function CareersInternshipSection({ content, sectionKey }: SectionProps) {
  const c = withCareersDefaults<CareersInternshipContent>('careers_internship', content);
  const card = c.card;
  const layout = c.layout || { cardSide: 'right' };
  const left = layout.cardSide === 'left';
  const points = (card.points || []).filter((p) => !p.hidden && (t(p.label) || t(p.value)));
  const showCard =
    !card.hidden && Boolean(t(card.title?.text) || t(card.body?.text) || points.length || t(card.ctaLabel) || visibleMedia(card.media).length);
  const role = t(card.role) || 'Internship Program';
  const href = t(card.href);
  const btnClass = `btn btn-${card.buttonVariant || 'primary'} btn-hover-lift crs-program-btn${card.buttonFullWidth === false ? '' : ' btn-block'}`;

  const cardNode = showCard ? (
    <div className="crs-program" style={vars({ ...cardVars(c.cardStyle || {}), ...iconVars(c.iconStyle), '--crs-media-h': card.mediaHeight })}>
      {visibleMedia(card.media).length ? (
        <ContactSlides items={card.media} intervalSeconds={c.intervalSeconds} className="crs-program-media" />
      ) : null}
      <AzText el={card.title} defaultTag="h3" className="crs-program-title" />
      <AzText el={card.body} defaultTag="p" className="crs-program-body" />
      {points.length ? (
        <div className={`crs-program-grid${card.pointColumns === 1 ? ' crs-program-grid--one' : ''}`}>
          {points.map((p, i) => (
            <div className="crs-point" key={`${p.label}-${i}`}>
              {p.icon ? <AzIcon icon={p.icon} className="ctc-ico crs-point-ico" /> : null}
              <div>
                {t(p.label) ? (
                  <div className="crs-point-label" style={elementCss(c.labelStyle)}>
                    {p.label}
                  </div>
                ) : null}
                {t(p.value) ? (
                  <div className="crs-point-value" style={elementCss(c.valueStyle)}>
                    {p.value}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {t(card.ctaLabel) ? (
        href ? (
          <a className={btnClass} href={appHref(href)} style={elementCss(card.buttonStyle)}>
            {card.ctaLabel}
          </a>
        ) : (
          <button type="button" className={btnClass} style={elementCss(card.buttonStyle)} data-role={role} onClick={() => focusApplyRole(role)}>
            {card.ctaLabel}
          </button>
        )
      ) : null}
    </div>
  ) : null;

  return (
    <LgShell box={c.section} className="lgy-section crs-intern" id={sectionKey || 'internship-program'}>
      <div
        className={`crs-intern-split${cardNode ? '' : ' crs-intern-split--single'}${left ? ' crs-card-left' : ''}${
          layout.mobileCardFirst ? ' crs-card-first' : ''
        }`}
        style={vars({
          '--crs-cols': cardNode ? t(layout.columns) || (left ? '9fr 11fr' : '11fr 9fr') : undefined,
          gap: layout.gap,
          alignItems: layout.alignItems,
        })}
      >
        <div className="crs-intern-copy">
          <LgHeader header={c.header} />
          {visibleMedia(c.media).length ? (
            <div style={vars({ '--crs-intern-media-h': c.mediaHeight, '--crs-intern-media-r': c.mediaRadius })}>
              <ContactSlides items={c.media} intervalSeconds={c.intervalSeconds} className="crs-intern-media" />
            </div>
          ) : null}
          <AzCtas ctas={c.ctas} />
        </div>
        {cardNode}
      </div>
    </LgShell>
  );
}

/* ------------------------------------------------------------------ */
/* Application form                                                    */
/* ------------------------------------------------------------------ */

type ApplyValues = { name: string; email: string; phone: string; experience: string; role: string; message: string };
const EMPTY_VALUES: ApplyValues = { name: '', email: '', phone: '', experience: '', role: '', message: '' };
const RESUME_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function CareersApplicationSection({ content, sectionKey }: SectionProps) {
  const c = withCareersDefaults<CareersApplicationContent>('careers_application', content);
  const baseRoles = Array.from(new Set((c.roles || []).map(t).filter(Boolean)));
  const roleList = baseRoles.length ? baseRoles : CAREERS_DEFAULT_ROLES;
  const [extraRole, setExtraRole] = useState('');
  const roles = extraRole && !roleList.includes(extraRole) ? [...roleList, extraRole] : roleList;
  const [values, setValues] = useState<ApplyValues>(EMPTY_VALUES);
  const [resume, setResume] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pick = (raw: unknown) => {
      const role = t(raw).slice(0, 120);
      if (!role) return;
      setExtraRole(role);
      setValues((v) => ({ ...v, role }));
    };
    const fromUrl = window.setTimeout(() => pick(new URLSearchParams(window.location.search).get('role')), 0);
    const onPrefill = (e: Event) => pick((e as CustomEvent<{ role?: string }>).detail?.role);
    window.addEventListener(ROLE_EVENT, onPrefill);
    return () => {
      window.clearTimeout(fromUrl);
      window.removeEventListener(ROLE_EVENT, onPrefill);
    };
  }, []);

  const set = (key: keyof ApplyValues, value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!resume) throw new Error('Resume / CV is required');
      const hp = new FormData(e.currentTarget).get(HONEYPOT_FIELD);
      const body = new FormData();
      (Object.keys(values) as Array<keyof ApplyValues>).forEach((k) => body.set(k, values[k]));
      body.set('resume', resume);
      body.set(HONEYPOT_FIELD, typeof hp === 'string' ? hp : '');
      const res = await fetch('/api/public/careers/apply', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      trackEvent('careers_apply', { role: values.role });
      setValues(EMPTY_VALUES);
      setResume(null);
      setFileKey((k) => k + 1);
      const redirect = t(c.form?.redirectUrl);
      if (!redirect) {
        setSuccess(true);
      } else if (redirect.startsWith('/')) {
        router.push(redirect);
      } else {
        window.location.assign(redirect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  const f = c.form;
  const L = c.labels;
  const two = f.fieldColumns !== 1;
  const labelCss = elementCss(c.fields?.labelStyle);
  const label = (el: CareersFieldText, id: string, required: boolean) => (
    <label htmlFor={id} style={labelCss}>
      {el.label}
      {required ? ' *' : ''}
    </label>
  );
  const input = (key: 'name' | 'email' | 'phone' | 'experience', type: string, required: boolean) => {
    const el = L[key];
    if (!required && el.hidden) return null;
    const id = `crs-f-${key}`;
    return (
      <div className="ctc-field" key={key}>
        {label(el, id, required)}
        <input
          id={id}
          name={key}
          type={type}
          required={required}
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
          placeholder={el.placeholder || ''}
          autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : undefined}
        />
      </div>
    );
  };
  const shortFields = [input('name', 'text', true), input('email', 'email', true), input('phone', 'tel', true), input('experience', 'text', false)].filter(
    Boolean
  ) as ReactNode[];
  const rows: ReactNode[][] = [];
  for (let i = 0; i < shortFields.length; i += two ? 2 : 1) rows.push(shortFields.slice(i, i + (two ? 2 : 1)));

  const side = c.side;
  const steps = (side.steps || []).filter((s) => !s.hidden && t(s.text));
  const sideItems = (side.items || []).filter((it) => !it.hidden && (t(it.label) || t(it.value)));
  const hasSideMedia = visibleMedia(side.media).length > 0;
  const showSide = c.layout?.sidePosition !== 'none' && !side.hidden && Boolean(steps.length || sideItems.length || hasSideMedia);
  const sideLeft = c.layout?.sidePosition === 'left';
  const media = hasSideMedia ? <ContactSlides items={side.media} intervalSeconds={side.intervalSeconds} className="ctc-side-media" /> : null;
  const divider = side.dividers !== false ? <div className="ctc-side-divider" /> : null;
  const blocks: ReactNode[] = [];
  if (steps.length) {
    blocks.push(
      <div className="ctc-side-block" key="steps">
        <AzText el={side.stepsTitle} defaultTag="h4" className="ctc-side-h" style={side.headingStyle} />
        <ul className="crs-steps" style={vars({ gap: side.stepGap })}>
          {steps.map((step, i) => (
            <li key={`${step.text}-${i}`} style={elementCss(side.stepStyle)}>
              <AzIcon icon={side.stepIcon} className="crs-step-ico" />
              <span>{step.text}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (sideItems.length) {
    blocks.push(
      <div className="ctc-side-block" key="items">
        <AzText el={side.title} defaultTag="h4" className="ctc-side-h" style={side.headingStyle} />
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

  const sideNode = showSide ? (
    <aside
      className={`ctc-side${side.spread !== false ? ' crs-side--spread' : ''}`}
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
          <AzText el={f.title} defaultTag="h3" className="ctc-form-title" />
          <AzText el={f.intro} defaultTag="p" className="ctc-form-intro" />
          {rows.map((row, idx) => (
            <div className={`ctc-row${two && row.length > 1 ? '' : ' ctc-row--single'}`} key={`row-${idx}`}>
              {row}
            </div>
          ))}
          <div className="ctc-row ctc-row--single">
            <div className="ctc-field">
              {label(L.role, 'crs-f-role', true)}
              <select id="crs-f-role" name="role" required value={values.role} onChange={(e) => set('role', e.target.value)}>
                <option value="">{L.role.placeholder || 'Select a role'}</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ctc-row ctc-row--single">
            <div className="ctc-field">
              {label(L.resume, 'crs-f-resume', true)}
              <input
                key={fileKey}
                id="crs-f-resume"
                name="resume"
                type="file"
                accept={RESUME_ACCEPT}
                required
                className="crs-file"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
              />
              {t(L.resume.hint) ? <span className="crs-file-hint">{L.resume.hint}</span> : null}
            </div>
          </div>
          {!L.message.hidden ? (
            <div className="ctc-row ctc-row--single">
              <div className="ctc-field">
                {label(L.message, 'crs-f-message', false)}
                <textarea
                  id="crs-f-message"
                  name="message"
                  rows={Math.min(14, Math.max(2, Number(L.message.rows) || 5))}
                  value={values.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder={L.message.placeholder || ''}
                />
              </div>
            </div>
          ) : null}
          <button
            type="submit"
            className={`btn btn-${f.buttonVariant || 'primary'} btn-hover-lift ctc-submit${f.buttonFullWidth === false ? '' : ' ctc-submit--full'}`}
            style={elementCss(f.buttonStyle)}
            disabled={submitting}
          >
            {submitting ? t(f.submittingLabel) || 'Submitting…' : t(f.submitLabel) || 'Submit Application →'}
          </button>
          <AzText el={f.privacyNote} defaultTag="p" className="ctc-note" />
          {error ? (
            <p className="ctc-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );

  const anchorId = sectionKey && sectionKey !== CAREERS_APPLY_ANCHOR ? CAREERS_APPLY_ANCHOR : undefined;
  return (
    <LgShell box={c.section} className="lgy-section ctc-form-section crs-apply" id={sectionKey || CAREERS_APPLY_ANCHOR}>
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

export function renderCareersSection(type: string, props: SectionProps & { key?: number }) {
  const { key, ...rest } = props;
  switch (type) {
    case 'careers_hero':
      return <CareersHeroSection key={key} {...rest} />;
    case 'careers_stats':
      return <CareersStatsSection key={key} {...rest} />;
    case 'careers_cards':
      return <CareersCardsSection key={key} {...rest} />;
    case 'careers_why':
      return <CareersWhySection key={key} {...rest} />;
    case 'careers_jobs':
      return <CareersJobsSection key={key} {...rest} />;
    case 'careers_internship':
      return <CareersInternshipSection key={key} {...rest} />;
    case 'careers_application':
      return <CareersApplicationSection key={key} {...rest} />;
    default:
      return null;
  }
}
