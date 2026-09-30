'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  CtaListEditor,
  Field,
  IconEditor,
  ListEditor,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { ColumnsEditor, LifeGroup as Group, LifeGroupProvider, MediaItemsEditor, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { CardStyleFields, LegacyHeaderEditor, LegacyStatsEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { ActionFields, ContactHelpEditor, ContactHeroEditor, IconStyleFields } from '@/components/admin/contact/ContactSectionEditor';
import type { ContactSideItem } from '@/lib/contact-sections';
import {
  CAREERS_ALL_ICON_PRESETS,
  CAREERS_WHY_TINTS,
  withCareersDefaults,
  type CareersApplicationContent,
  type CareersCardsContent,
  type CareersFieldText,
  type CareersHeroContent,
  type CareersInternshipContent,
  type CareersJob,
  type CareersJobsContent,
  type CareersProgramPoint,
  type CareersSectionType,
  type CareersStatsContent,
  type CareersStep,
  type CareersWhyCard,
  type CareersWhyContent,
} from '@/lib/careers-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';
const presetSvg = (key: string) => CAREERS_ALL_ICON_PRESETS.find((p) => p.key === key)?.svg || '';

const BUTTON_VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary (orange)' },
  { value: 'ghost', label: 'Ghost (light outline)' },
  { value: 'ghost-dark', label: 'Ghost dark (dark outline)' },
] as const;

const ALIGN_ITEMS_OPTIONS = [
  { value: '', label: 'Default (center)' },
  { value: 'start', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'Bottom' },
  { value: 'stretch', label: 'Stretch (equal height)' },
] as const;

/** One entry per line; kept raw while typing, trimmed when rendered. */
const linesOf = (v?: string[]) => (v || []).join('\n');
const toLines = (v: string) => v.split('\n');

/* ------------------------------------------------------------------ */
/* Why join us                                                         */
/* ------------------------------------------------------------------ */

function CareersWhyEditor({ content: c, onChange }: EditorProps<CareersWhyContent>) {
  const set = (patch: Partial<CareersWhyContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<CareersWhyContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const o = c.outline || {};
  const setO = (patch: Partial<CareersWhyContent['outline']>) => set({ outline: { ...o, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Reason cards" open>
        <ListEditor<CareersWhyCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => {
            const n = (c.cards || []).length;
            return {
              index: String(n + 1).padStart(2, '0'),
              title: { text: 'New reason' },
              body: { text: 'Short description.' },
              background: CAREERS_WHY_TINTS[n % CAREERS_WHY_TINTS.length],
              media: [],
            };
          }}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.index ? `${card.index} · ` : ''}${card.title?.text || 'Card'}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!card.hidden} onChange={(on) => patch({ ...card, hidden: !on })} />
                </Field>
                <TextInput label="Number / index" value={card.index} onChange={(index) => patch({ ...card, index })} placeholder="01 (empty = hidden)" />
                <ColorInput label="Card tint" value={card.background} onChange={(background) => patch({ ...card, background })} fallback="#FFFFFF" />
                <ColorInput label="Outline color (this card)" value={card.accent} onChange={(accent) => patch({ ...card, accent })} fallback="var(--green)" />
              </div>
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Description" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <div className="admin-form-grid">
                <TextInput label="Link label (optional)" value={card.linkLabel} onChange={(linkLabel) => patch({ ...card, linkLabel })} />
                <ActionFields value={card} patch={patch} mode="role" />
              </div>
              <IconEditor
                label="Icon (optional)"
                value={card.icon || {}}
                onChange={(icon) => patch({ ...card, icon })}
                presets={CAREERS_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
              <MediaItemsEditor
                label="Card images / videos (slideshow at the top of the card)"
                items={card.media || []}
                onChange={(media) => patch({ ...card, media })}
                showLabel={false}
                showColor={false}
                hint="Optional. One item = still image, several = cross-fading slideshow."
              />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.7rem" />
          <Field label="Motion">
            <Toggle label="Staggered reveal on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Lift on hover" checked={Boolean(cs.hoverLift)} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
          <TextInput label="Card media height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="160px" />
          <NumberInput
            label="Seconds per card slide"
            value={cs.mediaIntervalSeconds}
            min={1}
            step={0.5}
            placeholder="4.5"
            onChange={(mediaIntervalSeconds) => setCs({ mediaIntervalSeconds })}
          />
        </div>
      </Group>
      <Group title="Animated outline" description="Thin border with a highlight that travels around each card">
        <div className="admin-form-grid">
          <Field label="Outline">
            <Toggle label="Show outline" checked={!o.hidden} onChange={(on) => setO({ hidden: !on })} />
            <Toggle label="Animate travelling highlight" checked={o.animate !== false} onChange={(animate) => setO({ animate })} />
          </Field>
          <ColorInput label="Outline color" value={o.color} onChange={(color) => setO({ color })} fallback="var(--green)" />
          <TextInput label="Resting opacity" value={o.baseOpacity} onChange={(baseOpacity) => setO({ baseOpacity })} placeholder="0.3" />
          <TextInput label="Highlight width" value={o.width} onChange={(width) => setO({ width })} placeholder="1.4" />
          <NumberInput label="Highlight length (1–100)" value={o.dash} min={1} max={100} placeholder="70" onChange={(dash) => setO({ dash })} />
          <NumberInput label="Seconds per loop" value={o.speedSeconds} min={1} step={0.5} placeholder="5.5" onChange={(speedSeconds) => setO({ speedSeconds })} />
          <NumberInput
            label="Delay between cards (s)"
            value={o.staggerSeconds}
            min={0}
            step={0.1}
            placeholder="0.6"
            onChange={(staggerSeconds) => setO({ staggerSeconds })}
          />
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: 'Card tint', border: 'none', radius: '10px', padding: '2.6rem 2.2rem', shadow: '0 6px 18px -8px rgba(10,22,40,0.18)' }}
        />
      </Group>
      <Group title="Card icon style">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '44px', size: '22px', radius: '9px', background: 'var(--navy-950)', color: 'var(--cyan)' }}
        />
      </Group>
      <Group title="Card text style">
        <StyleEditor title="Number style" value={c.indexStyle} onChange={(indexStyle) => set({ indexStyle })} allowHide={false} fontSizePlaceholder="1.5rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.28rem" />
        <ColorInput label="Title hover color" value={c.titleHoverColor} onChange={(titleHoverColor) => set({ titleHoverColor })} fallback="var(--green-dim)" />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="1.02rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
        <ColorInput label="Link hover color" value={c.linkHoverColor} onChange={(linkHoverColor) => set({ linkHoverColor })} fallback="var(--orange-dim)" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Current openings                                                    */
/* ------------------------------------------------------------------ */

function CareersJobsEditor({ content: c, onChange }: EditorProps<CareersJobsContent>) {
  const set = (patch: Partial<CareersJobsContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<CareersJobsContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const f = c.filter || { allLabel: 'All roles' };
  const setF = (patch: Partial<CareersJobsContent['filter']>) => set({ filter: { ...f, ...patch } });
  const ci = c.chipIcons;
  const setCi = (patch: Partial<CareersJobsContent['chipIcons']>) => set({ chipIcons: { ...ci, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Job openings" open description="Apply buttons scroll to the application form and preselect the role">
        <ListEditor<CareersJob>
          label="Jobs"
          items={c.jobs || []}
          onChange={(jobs) => set({ jobs })}
          addLabel="Job"
          create={() => ({ title: 'New role', department: 'Engineering', location: 'Bengaluru', type: 'Full-Time', chips: [] })}
          itemTitle={(j) => `${j.hidden ? '(hidden) ' : ''}${j.title || 'Job'}${j.location ? ` · ${j.location}` : ''}`}
          renderItem={(j, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this job" checked={!j.hidden} onChange={(on) => patch({ ...j, hidden: !on })} />
                </Field>
                <TextInput label="Job title" value={j.title} onChange={(title) => patch({ ...j, title })} />
                <TextInput label="Department" value={j.department} onChange={(department) => patch({ ...j, department })} />
                <TextInput label="Location" value={j.location} onChange={(location) => patch({ ...j, location })} />
                <TextInput label="Type" value={j.type} onChange={(type) => patch({ ...j, type })} placeholder="Full-Time" />
                <TextInput label="Badge (optional)" value={j.badge} onChange={(badge) => patch({ ...j, badge })} placeholder="New, Urgent…" />
                <ColorInput label="Card background" value={j.background} onChange={(background) => patch({ ...j, background })} fallback="#FFFFFF" />
              </div>
              <TextArea label="Extra chips (one per line)" rows={2} value={linesOf(j.chips)} onChange={(v) => patch({ ...j, chips: toLines(v) })} placeholder="2–4 yrs experience" />
              <TextArea label="Short description (optional)" rows={2} value={j.description} onChange={(description) => patch({ ...j, description })} />
              <div className="admin-form-grid">
                <TextInput label="Apply role" value={j.role} onChange={(role) => patch({ ...j, role })} placeholder="Empty = job title" />
                <TextInput label="Apply button label" value={j.applyLabel} onChange={(applyLabel) => patch({ ...j, applyLabel })} placeholder="Empty = section default" />
                <TextInput label="Details link (optional)" value={j.href} onChange={(href) => patch({ ...j, href })} placeholder="/careers/solar-design-engineer or PDF" />
                <TextInput label="Details link label" value={j.linkLabel} onChange={(linkLabel) => patch({ ...j, linkLabel })} placeholder="View details →" />
                <Field label="Details link">
                  <Toggle label="Open in a new tab" checked={Boolean(j.newTab)} onChange={(newTab) => patch({ ...j, newTab })} />
                </Field>
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Apply button">
        <div className="admin-form-grid">
          <TextInput label="Default label" value={c.applyLabel} onChange={(applyLabel) => set({ applyLabel })} placeholder="Apply Now →" />
          <SelectInput label="Button style" value={c.buttonVariant || 'primary'} options={BUTTON_VARIANT_OPTIONS} onChange={(buttonVariant) => set({ buttonVariant })} />
          <SelectInput
            label="Button size"
            value={c.buttonSize || 'sm'}
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Regular' },
            ]}
            onChange={(buttonSize) => set({ buttonSize })}
          />
          <Field label="Visibility">
            <Toggle label="Show apply buttons" checked={!c.hideApply} onChange={(on) => set({ hideApply: !on })} />
          </Field>
        </div>
        <StyleEditor title="Button text & colors" value={c.buttonStyle} onChange={(buttonStyle) => set({ buttonStyle })} allowHide={false} />
      </Group>
      <Group title="Layout & filter">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 1, tablet: 1, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.1rem" />
          <Field label="Motion">
            <Toggle label="Staggered reveal on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
          <Field label="Department filter" hint="Shown when jobs span two or more departments">
            <Toggle label="Show department filter tabs" checked={Boolean(f.enabled)} onChange={(enabled) => setF({ enabled })} />
          </Field>
          <TextInput label="'All' tab label" value={f.allLabel} onChange={(allLabel) => setF({ allLabel })} placeholder="All roles" />
          <ColorInput label="Active tab background" value={f.activeBackground} onChange={(activeBackground) => setF({ activeBackground })} fallback="var(--navy-950)" />
          <ColorInput label="Active tab text" value={f.activeColor} onChange={(activeColor) => setF({ activeColor })} fallback="#FFFFFF" />
        </div>
        <StyleEditor title="Filter tab style" value={f.style} onChange={(style) => setF({ style })} allowHide={false} fontSizePlaceholder="0.72rem" />
      </Group>
      <Group title="Chips & chip icons">
        <Toggle label="Show icons in department / location / type chips" checked={Boolean(ci?.enabled)} onChange={(enabled) => setCi({ enabled })} />
        <IconEditor label="Department icon" value={ci?.department || {}} onChange={(department) => setCi({ department })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
        <IconEditor label="Location icon" value={ci?.location || {}} onChange={(location) => setCi({ location })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
        <IconEditor label="Type icon" value={ci?.type || {}} onChange={(type) => setCi({ type })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
        <StyleEditor title="Chip style" value={c.chipStyle} onChange={(chipStyle) => set({ chipStyle })} allowHide={false} fontSizePlaceholder="0.68rem" />
        <StyleEditor title="Badge style" value={c.badgeStyle} onChange={(badgeStyle) => set({ badgeStyle })} allowHide={false} fontSizePlaceholder="0.62rem" />
      </Group>
      <Group title="Job card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '10px', padding: '1.6rem 1.8rem', shadow: '0 6px 18px -8px rgba(10,22,40,0.1)' }}
        />
      </Group>
      <Group title="Job card text">
        <StyleEditor title="Job title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.05rem" />
        <StyleEditor title="Description style" value={c.descriptionStyle} onChange={(descriptionStyle) => set({ descriptionStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
        <StyleEditor title="Details link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
      </Group>
      <Group title="No openings message">
        <TextElementEditor label="Shown when every job is hidden" multiline value={c.emptyText} onChange={(emptyText) => set({ emptyText })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Internship program                                                  */
/* ------------------------------------------------------------------ */

function CareersInternshipEditor({ content: c, onChange }: EditorProps<CareersInternshipContent>) {
  const set = (patch: Partial<CareersInternshipContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { cardSide: 'right' };
  const setLayout = (patch: Partial<CareersInternshipContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const card = c.card;
  const setCard = (patch: Partial<CareersInternshipContent['card']>) => set({ card: { ...card, ...patch } });
  const cs = c.cardStyle || {};
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Text column heading" description="Eyebrow, heading (H2 by default), highlight and description">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Text column images / videos">
        <MediaItemsEditor
          label="Media under the text"
          items={c.media || []}
          onChange={(media) => set({ media })}
          showLabel={false}
          showColor={false}
          hint="Optional. One item = still image, several = cross-fading slideshow."
        />
        <div className="admin-form-grid">
          <TextInput label="Height" value={c.mediaHeight} onChange={(mediaHeight) => set({ mediaHeight })} placeholder="260px" />
          <TextInput label="Corner radius" value={c.mediaRadius} onChange={(mediaRadius) => set({ mediaRadius })} placeholder="14px" />
          <NumberInput label="Seconds per slide" value={c.intervalSeconds} min={1} step={0.5} placeholder="5" onChange={(intervalSeconds) => set({ intervalSeconds })} />
        </div>
      </Group>
      <Group title="Text column buttons" description="Optional buttons under the text">
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Program card" open>
        <Toggle label="Show program card" checked={!card.hidden} onChange={(on) => setCard({ hidden: !on })} />
        <TextElementEditor label="Card title" headingTag value={card.title} onChange={(title) => setCard({ title })} />
        <TextElementEditor label="Card description" multiline value={card.body} onChange={(body) => setCard({ body })} />
        <ListEditor<CareersProgramPoint>
          label="Key facts"
          items={card.points || []}
          onChange={(points) => setCard({ points })}
          addLabel="Fact"
          create={() => ({ label: 'Label', value: 'Value' })}
          itemTitle={(p) => `${p.hidden ? '(hidden) ' : ''}${p.label} · ${p.value}`}
          renderItem={(p, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this fact" checked={!p.hidden} onChange={(on) => patch({ ...p, hidden: !on })} />
                </Field>
                <TextInput label="Label" value={p.label} onChange={(label) => patch({ ...p, label })} />
                <TextInput label="Value" value={p.value} onChange={(value) => patch({ ...p, value })} />
              </div>
              <IconEditor label="Icon (optional)" value={p.icon || {}} onChange={(icon) => patch({ ...p, icon })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
        <div className="admin-form-grid">
          <SelectInput
            label="Facts per row (desktop)"
            value={String(card.pointColumns === 1 ? 1 : 2) as '1' | '2'}
            options={[
              { value: '2', label: 'Two' },
              { value: '1', label: 'One' },
            ]}
            onChange={(v) => setCard({ pointColumns: v === '1' ? 1 : 2 })}
          />
          <TextInput label="Button label" value={card.ctaLabel} onChange={(ctaLabel) => setCard({ ctaLabel })} placeholder="Empty = no button" />
          <TextInput label="Apply role" value={card.role} onChange={(role) => setCard({ role })} placeholder="Internship Program" hint="Preselected in the application form." />
          <TextInput label="Button link instead" value={card.href} onChange={(href) => setCard({ href })} placeholder="Empty = scroll to the application form" />
          <SelectInput label="Button style" value={card.buttonVariant || 'primary'} options={BUTTON_VARIANT_OPTIONS} onChange={(buttonVariant) => setCard({ buttonVariant })} />
          <Field label="Button">
            <Toggle label="Full-width button" checked={card.buttonFullWidth !== false} onChange={(buttonFullWidth) => setCard({ buttonFullWidth })} />
          </Field>
        </div>
        <StyleEditor title="Button text & colors" value={card.buttonStyle} onChange={(buttonStyle) => setCard({ buttonStyle })} allowHide={false} />
        <MediaItemsEditor
          label="Card images / videos (top of the card)"
          items={card.media || []}
          onChange={(media) => setCard({ media })}
          showLabel={false}
          showColor={false}
          hint="Optional slideshow above the card title."
        />
        <TextInput label="Card media height" value={card.mediaHeight} onChange={(mediaHeight) => setCard({ mediaHeight })} placeholder="180px" />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons
            label="Program card position"
            value={layout.cardSide}
            options={['left', 'right']}
            onChange={(side) => setLayout({ cardSide: (side || 'right') as 'left' | 'right' })}
          />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={ALIGN_ITEMS_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as CareersInternshipContent['layout']['alignItems'] })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="11fr 9fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="2.25rem" />
          <Field label="Tablet / phone">
            <Toggle label="Show the program card above the text" checked={Boolean(layout.mobileCardFirst)} onChange={(mobileCardFirst) => setLayout({ mobileCardFirst })} />
          </Field>
        </div>
      </Group>
      <Group title="Program card style">
        <CardStyleFields
          value={cs}
          onChange={(patch) => set({ cardStyle: { ...cs, ...patch } })}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '14px', padding: '2.2rem 2.3rem', shadow: '0 6px 18px -8px rgba(10,22,40,0.12)' }}
        />
      </Group>
      <Group title="Key fact icons & text">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '34px', size: '17px', radius: '8px', background: 'var(--gray-100)', color: 'var(--orange-dim)' }}
        />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.66rem" />
        <StyleEditor title="Value style" value={c.valueStyle} onChange={(valueStyle) => set({ valueStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Application form                                                    */
/* ------------------------------------------------------------------ */

const SIDE_POSITION_OPTIONS = [
  { value: 'right', label: 'Right of the form' },
  { value: 'left', label: 'Left of the form' },
  { value: 'none', label: 'Hidden (form only)' },
] as const;

function FieldTextEditor({
  title,
  value,
  onChange,
  optional,
  hint,
  placeholder = true,
}: {
  title: string;
  value: CareersFieldText;
  onChange: (next: CareersFieldText) => void;
  optional?: boolean;
  hint?: boolean;
  placeholder?: boolean;
}) {
  return (
    <div className="admin-form-grid" style={{ marginBottom: '0.4rem' }}>
      <TextInput label={`${title} · label`} value={value.label} onChange={(label) => onChange({ ...value, label })} />
      {placeholder ? (
        <TextInput label={`${title} · placeholder`} value={value.placeholder} onChange={(p) => onChange({ ...value, placeholder: p })} />
      ) : null}
      {hint ? <TextInput label={`${title} · help text`} value={value.hint} onChange={(h) => onChange({ ...value, hint: h })} /> : null}
      {optional ? (
        <Field label={title}>
          <Toggle label="Show this field" checked={!value.hidden} onChange={(on) => onChange({ ...value, hidden: !on })} />
        </Field>
      ) : null}
    </div>
  );
}

function CareersApplicationEditor({ content: c, onChange }: EditorProps<CareersApplicationContent>) {
  const set = (patch: Partial<CareersApplicationContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { sidePosition: 'right' };
  const setLayout = (patch: Partial<CareersApplicationContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const f = c.form;
  const setForm = (patch: Partial<CareersApplicationContent['form']>) => set({ form: { ...f, ...patch } });
  const fc = c.fields || {};
  const setFields = (patch: Partial<CareersApplicationContent['fields']>) => set({ fields: { ...fc, ...patch } });
  const L = c.labels;
  const setL = <K extends keyof CareersApplicationContent['labels']>(key: K, next: CareersApplicationContent['labels'][K]) =>
    set({ labels: { ...L, [key]: next } });
  const side = c.side;
  const setSide = (patch: Partial<CareersApplicationContent['side']>) => set({ side: { ...side, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro above the form">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Form panel" open description="Applications arrive in Admin → Enquiries with the résumé attached">
        <TextElementEditor label="Form title" headingTag value={f.title} onChange={(title) => setForm({ title })} />
        <TextElementEditor label="Intro" multiline value={f.intro} onChange={(intro) => setForm({ intro })} />
        <div className="admin-form-grid">
          <TextInput label="Submit button label" value={f.submitLabel} onChange={(submitLabel) => setForm({ submitLabel })} placeholder="Submit Application →" />
          <TextInput label="Sending label" value={f.submittingLabel} onChange={(submittingLabel) => setForm({ submittingLabel })} placeholder="Submitting…" />
          <SelectInput label="Button style" value={f.buttonVariant || 'primary'} options={BUTTON_VARIANT_OPTIONS} onChange={(buttonVariant) => setForm({ buttonVariant })} />
          <SelectInput
            label="Short fields per row"
            value={String(f.fieldColumns === 1 ? 1 : 2) as '1' | '2'}
            options={[
              { value: '2', label: 'Two (desktop)' },
              { value: '1', label: 'One' },
            ]}
            onChange={(v) => setForm({ fieldColumns: v === '1' ? 1 : 2 })}
          />
          <Field label="Button">
            <Toggle label="Full-width button" checked={f.buttonFullWidth !== false} onChange={(buttonFullWidth) => setForm({ buttonFullWidth })} />
          </Field>
          <TextInput
            label="After submit, open"
            value={f.redirectUrl}
            onChange={(redirectUrl) => setForm({ redirectUrl })}
            placeholder="Empty = show the success message below"
            hint="e.g. /thank-you?intent=careers"
          />
        </div>
        <StyleEditor title="Button text & colors" value={f.buttonStyle} onChange={(buttonStyle) => setForm({ buttonStyle })} allowHide={false} />
        <TextElementEditor label="Privacy note" multiline value={f.privacyNote} onChange={(privacyNote) => setForm({ privacyNote })} />
        <TextElementEditor label="Success title" value={f.successTitle} onChange={(successTitle) => setForm({ successTitle })} />
        <TextElementEditor label="Success message" multiline value={f.successBody} onChange={(successBody) => setForm({ successBody })} />
        <div className="admin-form-grid">
          <TextInput label="Form panel background" value={f.background} onChange={(background) => setForm({ background })} placeholder="#FFFFFF" />
          <TextInput label="Form panel padding" value={f.padding} onChange={(padding) => setForm({ padding })} placeholder="3.2rem" />
          <TextInput label="Form panel border" value={f.border} onChange={(border) => setForm({ border })} placeholder="1px solid var(--gray-200)" />
        </div>
      </Group>
      <Group title="Form field labels" description="Name, email, phone, role and résumé are always required (checked by the server); experience and message are optional">
        <FieldTextEditor title="Full name" value={L.name} onChange={(v) => setL('name', v)} />
        <FieldTextEditor title="Email" value={L.email} onChange={(v) => setL('email', v)} />
        <FieldTextEditor title="Phone" value={L.phone} onChange={(v) => setL('phone', v)} />
        <FieldTextEditor title="Experience" value={L.experience} onChange={(v) => setL('experience', v)} optional />
        <FieldTextEditor title="Role select" value={L.role} onChange={(v) => setL('role', v)} />
        <FieldTextEditor title="Résumé upload" value={L.resume} onChange={(v) => setL('resume', v)} hint placeholder={false} />
        <FieldTextEditor title="Message" value={L.message} onChange={(v) => setL('message', { ...L.message, ...v })} optional />
        <NumberInput label="Message box rows" value={L.message.rows} min={2} max={14} placeholder="5" onChange={(rows) => setL('message', { ...L.message, rows })} />
      </Group>
      <Group title="Role options">
        <TextArea
          label="Roles in the dropdown (one per line)"
          rows={7}
          value={linesOf(c.roles)}
          onChange={(v) => set({ roles: toLines(v) })}
          hint="Apply buttons with a role that isn't listed add it automatically for that visitor."
        />
      </Group>
      <Group title="Field style">
        <div className="admin-form-grid">
          <TextInput label="Input background" value={fc.inputBackground} onChange={(inputBackground) => setFields({ inputBackground })} placeholder="#FFFFFF" />
          <TextInput label="Input border" value={fc.inputBorder} onChange={(inputBorder) => setFields({ inputBorder })} placeholder="1.5px solid var(--gray-200)" />
          <ColorInput label="Input text color" value={fc.inputColor} onChange={(inputColor) => setFields({ inputColor })} fallback="var(--graphite-800)" />
          <ColorInput label="Focus color" value={fc.focusColor} onChange={(focusColor) => setFields({ focusColor })} fallback="var(--orange)" />
          <TextInput label="Input radius" value={fc.inputRadius} onChange={(inputRadius) => setFields({ inputRadius })} placeholder="6px" />
          <TextInput label="Input padding" value={fc.inputPadding} onChange={(inputPadding) => setFields({ inputPadding })} placeholder="0.75rem 0.9rem" />
          <TextInput label="Input font size" value={fc.inputFontSize} onChange={(inputFontSize) => setFields({ inputFontSize })} placeholder="0.92rem (16px min on phones)" />
          <TextInput label="Gap between fields" value={fc.rowGap} onChange={(rowGap) => setFields({ rowGap })} placeholder="1.1rem" />
        </div>
        <StyleEditor title="Field label style" value={fc.labelStyle} onChange={(labelStyle) => setFields({ labelStyle })} allowHide={false} fontSizePlaceholder="0.8rem" />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <SelectInput label="Side panel position" value={layout.sidePosition || 'right'} options={SIDE_POSITION_OPTIONS} onChange={(sidePosition) => setLayout({ sidePosition })} />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="1.2fr 0.8fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Corner radius" value={layout.radius} onChange={(radius) => setLayout({ radius })} placeholder="16px" />
          <TextInput label="Shadow" value={layout.shadow} onChange={(shadow) => setLayout({ shadow })} placeholder="0 30px 60px -25px rgba(10,22,40,0.18)" />
          <Field label="Tablet / phone">
            <Toggle label="Show the side panel above the form" checked={Boolean(layout.mobileSideFirst)} onChange={(mobileSideFirst) => setLayout({ mobileSideFirst })} />
          </Field>
        </div>
      </Group>
      <Group title="Side panel look">
        <div className="admin-form-grid">
          <Field label="Panel">
            <Toggle label="Show side panel" checked={!side.hidden} onChange={(on) => setSide({ hidden: !on })} />
            <Toggle label="Divider lines between blocks" checked={side.dividers !== false} onChange={(dividers) => setSide({ dividers })} />
            <Toggle label="Spread blocks to fill the height" checked={side.spread !== false} onChange={(spread) => setSide({ spread })} />
          </Field>
          <TextInput label="Background" value={side.background} onChange={(background) => setSide({ background })} placeholder="linear-gradient(160deg,var(--navy-950),var(--navy-900))" />
          <ColorInput label="Text color" value={side.color} onChange={(color) => setSide({ color })} fallback="#FFFFFF" />
          <TextInput label="Padding" value={side.padding} onChange={(padding) => setSide({ padding })} placeholder="3.2rem 2.6rem" />
          <TextInput label="Gap between blocks" value={side.gap} onChange={(gap) => setSide({ gap })} placeholder="2.2rem" />
          <ColorInput label="Divider color" value={side.dividerColor} onChange={(dividerColor) => setSide({ dividerColor })} fallback="rgba(255,255,255,0.1)" />
          <ColorInput label="Link hover color" value={side.linkHoverColor} onChange={(linkHoverColor) => setSide({ linkHoverColor })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Block heading style" value={side.headingStyle} onChange={(headingStyle) => setSide({ headingStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
      </Group>
      <Group title="Next steps">
        <TextElementEditor label="Block title" value={side.stepsTitle} onChange={(stepsTitle) => setSide({ stepsTitle })} />
        <ListEditor<CareersStep>
          label="Steps"
          items={side.steps || []}
          onChange={(steps) => setSide({ steps })}
          addLabel="Step"
          create={() => ({ text: 'New step' })}
          itemTitle={(st) => `${st.hidden ? '(hidden) ' : ''}${st.text || 'Step'}`}
          renderItem={(st, patch) => (
            <>
              <Toggle label="Show this step" checked={!st.hidden} onChange={(on) => patch({ ...st, hidden: !on })} />
              <TextArea label="Text" rows={2} value={st.text} onChange={(text) => patch({ ...st, text })} />
            </>
          )}
        />
        <IconEditor label="Step icon" value={side.stepIcon || {}} onChange={(stepIcon) => setSide({ stepIcon })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
        <TextInput label="Gap between steps" value={side.stepGap} onChange={(stepGap) => setSide({ stepGap })} placeholder="2.4rem" />
        <StyleEditor title="Step text style" value={side.stepStyle} onChange={(stepStyle) => setSide({ stepStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
      </Group>
      <Group title="Contact items">
        <NapHint />
        <TextElementEditor label="Block title" value={side.title} onChange={(title) => setSide({ title })} />
        <ListEditor<ContactSideItem>
          label="Items"
          items={side.items || []}
          onChange={(items) => setSide({ items })}
          addLabel="Item"
          create={() => ({ label: 'Email', value: '{{email}}', href: 'mailto:{{email}}', icon: { svg: presetSvg('careers-mail') } })}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.label} · ${it.value}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this item" checked={!it.hidden} onChange={(on) => patch({ ...it, hidden: !on })} />
                  <Toggle label="Open link in a new tab" checked={Boolean(it.newTab)} onChange={(newTab) => patch({ ...it, newTab })} />
                </Field>
                <TextInput label="Label" value={it.label} onChange={(label) => patch({ ...it, label })} />
                <TextInput label="Value" value={it.value} onChange={(value) => patch({ ...it, value })} />
                <TextInput label="Link" value={it.href} onChange={(href) => patch({ ...it, href })} placeholder="mailto:…, tel:{{phone}}…" />
              </div>
              <IconEditor label="Icon" value={it.icon || {}} onChange={(icon) => patch({ ...it, icon })} presets={CAREERS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
        <IconStyleFields
          value={side.iconStyle}
          onChange={(iconStyle) => setSide({ iconStyle })}
          placeholders={{ box: '36px', size: '18px', radius: '8px', background: 'rgba(255,255,255,0.08)', color: 'var(--cyan)' }}
        />
        <StyleEditor title="Item label style" value={side.labelStyle} onChange={(labelStyle) => setSide({ labelStyle })} allowHide={false} fontSizePlaceholder="0.7rem" />
        <StyleEditor title="Item value style" value={side.valueStyle} onChange={(valueStyle) => setSide({ valueStyle })} allowHide={false} fontSizePlaceholder="0.95rem" />
      </Group>
      <Group title="Side panel images / videos">
        <MediaItemsEditor
          label="Panel media"
          items={side.media || []}
          onChange={(media) => setSide({ media })}
          showLabel={false}
          showColor={false}
          hint="Optional. One item = still image, several = cross-fading slideshow."
        />
        <div className="admin-form-grid">
          <SelectInput
            label="Position"
            value={side.mediaPosition || 'top'}
            options={[
              { value: 'top', label: 'Top of the panel' },
              { value: 'bottom', label: 'Bottom of the panel' },
            ]}
            onChange={(mediaPosition) => setSide({ mediaPosition })}
          />
          <TextInput label="Height" value={side.mediaHeight} onChange={(mediaHeight) => setSide({ mediaHeight })} placeholder="190px" />
          <NumberInput label="Seconds per slide" value={side.intervalSeconds} min={1} step={0.5} placeholder="5" onChange={(intervalSeconds) => setSide({ intervalSeconds })} />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function CareersSectionEditor({
  type,
  content,
  onChange,
}: {
  type: CareersSectionType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const emit = (next: object) => onChange(next as Record<string, unknown>);
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/site-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) setSite(mergeSiteSettings(data.settings));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AboutSiteSettingsContext.Provider value={site}>
      <div className="az-admin lz-admin lgy-admin ctc-admin crs-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'careers_hero' ? (
            <ContactHeroEditor content={withCareersDefaults<CareersHeroContent>(type, content)} onChange={emit} />
          ) : type === 'careers_stats' ? (
            <LegacyStatsEditor content={withCareersDefaults<CareersStatsContent>(type, content)} onChange={emit} />
          ) : type === 'careers_cards' ? (
            <ContactHelpEditor
              content={withCareersDefaults<CareersCardsContent>(type, content)}
              onChange={emit}
              presets={CAREERS_ALL_ICON_PRESETS}
              actionMode="role"
              cardsTitle="Cards"
            />
          ) : type === 'careers_why' ? (
            <CareersWhyEditor content={withCareersDefaults<CareersWhyContent>(type, content)} onChange={emit} />
          ) : type === 'careers_jobs' ? (
            <CareersJobsEditor content={withCareersDefaults<CareersJobsContent>(type, content)} onChange={emit} />
          ) : type === 'careers_internship' ? (
            <CareersInternshipEditor content={withCareersDefaults<CareersInternshipContent>(type, content)} onChange={emit} />
          ) : type === 'careers_application' ? (
            <CareersApplicationEditor content={withCareersDefaults<CareersApplicationContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
