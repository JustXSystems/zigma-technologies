'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  CtaListEditor,
  Field,
  ListEditor,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { ColumnsEditor, HighlightEditor, LifeGroup as Group, LifeGroupProvider, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  PJ101_DEFAULT_STEPS,
  PJ101_ILLUSTRATION_OPTIONS,
  defaultPj101Categories,
  defaultPj101OngoingItem,
  defaultPj101Project,
  defaultPj101Projects,
  withProjects101Defaults,
  type Pj101Category,
  type Pj101DateFormat,
  type Pj101Head,
  type Pj101Illustration,
  type Pj101OngoingContent,
  type Pj101OngoingItem,
  type Pj101Project,
  type Pj101ProjectsContent,
  type Pj101Source,
  type Projects101SectionType,
} from '@/lib/projects101-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const SOURCE_OPTIONS: Array<{ value: Pj101Source; label: string }> = [
  { value: 'manual', label: 'Projects typed below (design)' },
  { value: 'catalog', label: 'Inventory → Projects (live catalog)' },
];

const DATE_FORMAT_OPTIONS: Array<{ value: Pj101DateFormat; label: string }> = [
  { value: 'day-month-year', label: '20 Nov 2025 (design)' },
  { value: 'month-year', label: 'Nov 2025' },
  { value: 'year', label: '2025' },
  { value: 'iso', label: '2025-11-20' },
];

const DIRECTION_OPTIONS = [
  { value: 'ltr', label: 'Left → right (design)' },
  { value: 'rtl', label: 'Right → left' },
] as const;

/* ------------------------------------------------------------------ */
/* Shared head (eyebrow, heading, intro, count badge)                  */
/* ------------------------------------------------------------------ */

function HeadGroups({ head, onChange, countHint }: { head: Pj101Head; onChange: (next: Pj101Head) => void; countHint: string }) {
  const set = (patch: Partial<Pj101Head>) => onChange({ ...head, ...patch });
  const count = head.count;
  const setCount = (patch: Partial<Pj101Head['count']>) => set({ count: { ...count, ...patch } });
  return (
    <>
      <Group title="Heading row" open description="Eyebrow, heading, intro text and the count badge on the right">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the heading row" checked={!head.hidden} onChange={(v) => set({ hidden: !v })} />
          </Field>
          <TextInput label="Space below heading row" value={head.marginBottom} onChange={(marginBottom) => set({ marginBottom })} placeholder="3rem" />
        </div>
        <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={head.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={head.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={head.highlight} onChange={(highlight) => set({ highlight })} />
        <TextElementEditor label="Intro text" multiline value={head.subtitle} onChange={(subtitle) => set({ subtitle })} />
      </Group>
      <Group title="Count badge" description={countHint}>
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the count badge" checked={!count.hidden} onChange={(v) => setCount({ hidden: !v })} />
          </Field>
          <TextInput label="Text (many)" value={count.template} onChange={(template) => setCount({ template })} placeholder="{count} PROJECTS" hint="{count} = number of cards shown" />
          <TextInput label="Text (exactly one)" value={count.templateOne} onChange={(templateOne) => setCount({ templateOne })} placeholder="{count} PROJECT" />
        </div>
        <StyleEditor title="Badge style (color, border, background, font…)" value={count.style} onChange={(style) => setCount({ style })} allowHide={false} fontSizePlaceholder="0.72rem (mono)" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Recently done projects                                              */
/* ------------------------------------------------------------------ */

function categoryOptions(categories: Pj101Category[], current?: string) {
  const opts = categories.filter((c) => c.key).map((c) => ({ value: c.key, label: c.label || c.key }));
  if (current && !opts.some((o) => o.value === current)) opts.push({ value: current, label: `${current} (not in categories)` });
  return opts;
}

function Pj101ProjectsEditor({ content: c, onChange }: EditorProps<Pj101ProjectsContent>) {
  const set = (patch: Partial<Pj101ProjectsContent>) => onChange({ ...c, ...patch });
  const catalog = c.catalog || {};
  const setCatalog = (patch: Partial<Pj101ProjectsContent['catalog']>) => set({ catalog: { ...catalog, ...patch } });
  const filter = c.filter;
  const setFilter = (patch: Partial<Pj101ProjectsContent['filter']>) => set({ filter: { ...filter, ...patch } });
  const grid = c.grid;
  const setGrid = (patch: Partial<Pj101ProjectsContent['grid']>) => set({ grid: { ...grid, ...patch } });
  const card = c.card;
  const setCard = (patch: Partial<Pj101ProjectsContent['card']>) => set({ card: { ...card, ...patch } });
  const popup = c.popup;
  const setPopup = (patch: Partial<Pj101ProjectsContent['popup']>) => set({ popup: { ...popup, ...patch } });
  const labels = popup.labels;
  const setLabels = (patch: Partial<Pj101ProjectsContent['popup']['labels']>) => setPopup({ labels: { ...labels, ...patch } });
  const strip = c.strip || {};
  const setStrip = (patch: Partial<Pj101ProjectsContent['strip']>) => set({ strip: { ...strip, ...patch } });
  const categories = c.categories || [];
  const manual = c.source !== 'catalog';

  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <HeadGroups head={c.head} onChange={(head) => set({ head })} countHint='e.g. "9 PROJECTS"; follows the active filter' />
      <Group title="Project source" open description="Type the projects here, or show the live Inventory → Projects catalog">
        <div className="admin-form-grid">
          <SelectInput label="Where projects come from" value={c.source || 'manual'} options={SOURCE_OPTIONS} onChange={(source) => set({ source })} />
          {!manual ? (
            <>
              <TextInput
                label="Inventory category slug (optional)"
                value={catalog.category}
                onChange={(category) => setCatalog({ category })}
                placeholder="all project categories"
              />
              <NumberInput label="Max projects" value={catalog.limit} min={1} max={200} placeholder="60" onChange={(limit) => setCatalog({ limit })} />
              <Field label="Catalog">
                <Toggle label="Featured projects only" checked={Boolean(catalog.featuredOnly)} onChange={(featuredOnly) => setCatalog({ featuredOnly })} />
                <Toggle label="Popup links to the case study page" checked={catalog.linkToDetail !== false} onChange={(linkToDetail) => setCatalog({ linkToDetail })} />
              </Field>
            </>
          ) : null}
        </div>
        {!manual ? (
          <p className="az-admin-hint">
            Catalog mapping: Price label = capacity (text that does not start with a number shows as a project type), Case study location / year /
            scope / video, Summary = overview. Project categories are matched by their slug to the categories below (color, tag, illustration).
          </p>
        ) : null}
      </Group>
      <Group title="Categories" description="Tag label, accent color and placeholder artwork per category">
        <ListEditor<Pj101Category>
          label="Categories"
          items={categories}
          onChange={(next) => set({ categories: next })}
          addLabel="Category"
          create={() => ({ key: `cat-${categories.length + 1}`, label: 'New category', color: 'var(--blue)', illustration: 'epc' })}
          itemTitle={(cat) => `${cat.label || 'Category'} · ${cat.key || '—'}`}
          renderItem={(cat, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={cat.label} onChange={(label) => patch({ ...cat, label })} />
              <TextInput
                label="Key"
                value={cat.key}
                onChange={(key) => patch({ ...cat, key: key.trim().toLowerCase().replace(/\s+/g, '-') })}
                hint="Projects pick this key; for the catalog source use the Inventory category slug."
              />
              <ColorInput label="Accent color" value={cat.color} onChange={(color) => patch({ ...cat, color })} fallback="var(--orange)" />
              <SelectInput
                label="Placeholder artwork"
                value={cat.illustration || 'epc'}
                options={PJ101_ILLUSTRATION_OPTIONS}
                onChange={(illustration) => patch({ ...cat, illustration: illustration as Pj101Illustration })}
              />
              <Field label="Filter">
                <Toggle label="Hide this category's filter pill" checked={Boolean(cat.hideInFilter)} onChange={(hideInFilter) => patch({ ...cat, hideInFilter })} />
              </Field>
            </div>
          )}
        />
        <div style={{ marginTop: '0.6rem' }}>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => set({ categories: defaultPj101Categories() })}>
            Reset to the design categories
          </button>
        </div>
      </Group>
      {manual ? (
        <Group title="Projects" open description="Each project = one card, one popup slide and one running-strip thumbnail">
          <ListEditor<Pj101Project>
            label="Projects"
            items={c.projects || []}
            onChange={(projects) => set({ projects })}
            addLabel="Project"
            create={defaultPj101Project}
            itemTitle={(p) => `${p.hidden ? '(hidden) ' : ''}${p.title || 'Project'}${p.capacity ? ` · ${p.capacity}` : ''}`}
            renderItem={(p, patch) => (
              <>
                <div className="admin-form-grid">
                  <TextInput label="Title" value={p.title} onChange={(title) => patch({ ...p, title })} full />
                  <SelectInput label="Category" value={p.category} options={categoryOptions(categories, p.category)} onChange={(category) => patch({ ...p, category })} />
                  <TextInput label="Capacity" value={p.capacity} onChange={(capacity) => patch({ ...p, capacity })} placeholder="320 kW" />
                  <Field label="Capacity display">
                    <Toggle
                      label="Short text label instead of a big number"
                      checked={Boolean(p.capacityIsText)}
                      onChange={(capacityIsText) => patch({ ...p, capacityIsText })}
                    />
                  </Field>
                  <TextInput label="Location" value={p.location} onChange={(location) => patch({ ...p, location })} placeholder="Bangalore" />
                  <Field label="Date">
                    <input className="admin-input" type="date" value={p.date || ''} onChange={(e) => patch({ ...p, date: e.target.value })} />
                  </Field>
                  <TextInput label="Date text (optional)" value={p.dateLabel} onChange={(dateLabel) => patch({ ...p, dateLabel })} placeholder="e.g. Q3 2025" hint="Replaces the formatted date." />
                  <TextInput
                    label="Scope of work"
                    value={p.scope}
                    onChange={(scope) => patch({ ...p, scope })}
                    placeholder="Commercial Services, Panels Installation"
                    hint="Comma separated: card line + popup chips."
                    full
                  />
                  <TextInput label="Detail page link (optional)" value={p.href} onChange={(href) => patch({ ...p, href })} placeholder="/projects/my-project" />
                  <Field label="Visibility">
                    <Toggle label="Show this project" checked={!p.hidden} onChange={(v) => patch({ ...p, hidden: !v })} />
                  </Field>
                </div>
                <TextArea label="Overview (popup)" rows={3} value={p.description} onChange={(description) => patch({ ...p, description })} />
                <div className="admin-form-grid">
                  <div className="full">
                    <MediaPicker
                      label="Photo (empty = category artwork)"
                      value={p.image || ''}
                      onChange={(image) => patch({ ...p, image })}
                      kinds={['image', 'svg']}
                      allowUpload
                    />
                  </div>
                  <div className="full">
                    <MediaPicker
                      label="Video (file, or paste a YouTube / Vimeo link)"
                      value={p.video || ''}
                      onChange={(video) => patch({ ...p, video })}
                      kinds="video"
                      allowUpload
                    />
                  </div>
                </div>
              </>
            )}
          />
          <div style={{ marginTop: '0.6rem' }}>
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => set({ projects: defaultPj101Projects() })}>
              Reset to the 9 design projects
            </button>
          </div>
        </Group>
      ) : null}
      <Group title="Category filter" description="Pill row above the cards (hidden in the design)">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the category filter" checked={!filter.hidden} onChange={(v) => setFilter({ hidden: !v })} />
            <Toggle label="Color dot in each pill" checked={filter.showDots !== false} onChange={(showDots) => setFilter({ showDots })} />
          </Field>
          <TextInput label='"All" pill label' value={filter.allLabel} onChange={(allLabel) => setFilter({ allLabel })} placeholder="All projects" />
          <AlignButtons label="Pills align" value={filter.align} onChange={(v) => setFilter({ align: (v || undefined) as Pj101ProjectsContent['filter']['align'] })} />
          <TextInput label="Space below pills" value={filter.marginBottom} onChange={(marginBottom) => setFilter({ marginBottom })} placeholder="2.2rem" />
          <TextInput label="Empty category message" value={c.emptyText} onChange={(emptyText) => set({ emptyText })} placeholder="No projects in this category yet." full />
        </div>
      </Group>
      <Group title="Card grid">
        <div className="admin-form-grid">
          <ColumnsEditor value={grid.columns} onChange={(columns) => setGrid({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={grid.gap} onChange={(gap) => setGrid({ gap })} placeholder="1.8rem" />
          <Field label="Animation">
            <Toggle label="Reveal heading and cards on scroll" checked={grid.reveal !== false} onChange={(reveal) => setGrid({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card content" description="Choose which parts each card shows">
        <div className="admin-form-grid">
          <Field label="Show">
            <Toggle label="Photo / artwork on top" checked={card.showMedia !== false} onChange={(showMedia) => setCard({ showMedia })} />
            <Toggle label="Category tag" checked={card.showTag !== false} onChange={(showTag) => setCard({ showTag })} />
            <Toggle label="Capacity" checked={card.showCapacity !== false} onChange={(showCapacity) => setCard({ showCapacity })} />
            <Toggle label="Location chip" checked={card.showLocation !== false} onChange={(showLocation) => setCard({ showLocation })} />
            <Toggle label="Date chip" checked={card.showDate !== false} onChange={(showDate) => setCard({ showDate })} />
            <Toggle label="Scope line" checked={card.showScope !== false} onChange={(showScope) => setCard({ showScope })} />
            <Toggle label="Details link" checked={card.showLink !== false} onChange={(showLink) => setCard({ showLink })} />
          </Field>
          <SelectInput label="Date format" value={card.dateFormat || 'day-month-year'} options={DATE_FORMAT_OPTIONS} onChange={(dateFormat) => setCard({ dateFormat })} />
          <TextInput label="Details link label" value={card.linkLabel} onChange={(linkLabel) => setCard({ linkLabel })} placeholder="View project details →" />
        </div>
      </Group>
      <Group title="Card style">
        <div className="admin-form-grid">
          <TextInput label="Background" value={card.background} onChange={(background) => setCard({ background })} placeholder="#FFFFFF" />
          <TextInput label="Border" value={card.border} onChange={(border) => setCard({ border })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="18px" />
          <TextInput label="Padding top" value={card.paddingTop} onChange={(paddingTop) => setCard({ paddingTop })} placeholder="1.9rem" />
          <TextInput label="Padding left / right" value={card.paddingX} onChange={(paddingX) => setCard({ paddingX })} placeholder="1.8rem" />
          <TextInput label="Padding bottom" value={card.paddingBottom} onChange={(paddingBottom) => setCard({ paddingBottom })} placeholder="1.7rem" />
          <TextInput label="Space between rows" value={card.gap} onChange={(gap) => setCard({ gap })} placeholder="1rem" />
          <TextInput label="Shadow" value={card.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 10px 26px -14px rgba(15,31,61,0.25)" />
          <TextInput label="Hover shadow" value={card.hoverShadow} onChange={(hoverShadow) => setCard({ hoverShadow })} placeholder="0 26px 44px -18px rgba(15,31,61,0.38)" />
          <TextInput label="Top bar height (cards without photo)" value={card.barHeight} onChange={(barHeight) => setCard({ barHeight })} placeholder="5px" />
          <TextInput label="Photo aspect ratio" value={card.mediaAspect} onChange={(mediaAspect) => setCard({ mediaAspect })} placeholder="16/10" />
          <ColorInput label="Photo background" value={card.mediaBackground} onChange={(mediaBackground) => setCard({ mediaBackground })} fallback="var(--navy-900)" />
          <Field label="Hover">
            <Toggle label="Lift card on hover" checked={card.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
            <Toggle label="Zoom photo on hover" checked={card.mediaZoom !== false} onChange={(mediaZoom) => setCard({ mediaZoom })} />
          </Field>
        </div>
        <StyleEditor title="Category tag style" value={card.tagStyle} onChange={(tagStyle) => setCard({ tagStyle })} allowHide={false} fontSizePlaceholder="0.68rem (mono)" />
        <StyleEditor title="Capacity style" value={card.capacityStyle} onChange={(capacityStyle) => setCard({ capacityStyle })} allowHide={false} fontSizePlaceholder="2.1rem" />
        <StyleEditor title="Title style" value={card.titleStyle} onChange={(titleStyle) => setCard({ titleStyle })} allowHide={false} fontSizePlaceholder="1.28rem" />
        <StyleEditor title="Location / date chip style" value={card.chipStyle} onChange={(chipStyle) => setCard({ chipStyle })} allowHide={false} fontSizePlaceholder="0.8rem" />
        <StyleEditor title="Scope line style" value={card.scopeStyle} onChange={(scopeStyle) => setCard({ scopeStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
        <StyleEditor title="Details link style" value={card.linkStyle} onChange={(linkStyle) => setCard({ linkStyle })} allowHide={false} fontSizePlaceholder="0.76rem (mono)" />
      </Group>
      <Group title="Project popup" description="Opens when a card or strip thumbnail is clicked">
        <div className="admin-form-grid">
          <Field label="Popup">
            <Toggle label="Open a detail popup on click" checked={popup.enabled !== false} onChange={(enabled) => setPopup({ enabled })} />
            <Toggle label='Counter ("3 / 9")' checked={popup.showCounter !== false} onChange={(showCounter) => setPopup({ showCounter })} />
            <Toggle label="Previous / next buttons" checked={popup.showNav !== false} onChange={(showNav) => setPopup({ showNav })} />
            <Toggle label="Full screen button" checked={popup.showFullscreen !== false} onChange={(showFullscreen) => setPopup({ showFullscreen })} />
            <Toggle label="Link to the project's detail page" checked={popup.showDetailLink !== false} onChange={(showDetailLink) => setPopup({ showDetailLink })} />
          </Field>
          <TextInput label="Detail link label" value={popup.detailLinkLabel} onChange={(detailLinkLabel) => setPopup({ detailLinkLabel })} placeholder="View full case study →" />
          <TextInput label="Backdrop" value={popup.backdrop} onChange={(backdrop) => setPopup({ backdrop })} placeholder="rgba(5,10,20,0.82)" />
          <TextInput label="Max width" value={popup.maxWidth} onChange={(maxWidth) => setPopup({ maxWidth })} placeholder="1400px" />
          <TextInput label="Corner radius" value={popup.radius} onChange={(radius) => setPopup({ radius })} placeholder="20px" />
          <ColorInput label="Panel background" value={popup.background} onChange={(background) => setPopup({ background })} fallback="#FFFFFF" />
        </div>
      </Group>
      <Group title="Popup labels">
        <div className="admin-form-grid">
          <TextInput label="Under a capacity number" value={labels.installedCapacity} onChange={(installedCapacity) => setLabels({ installedCapacity })} placeholder="Installed capacity" />
          <TextInput label="Under a text capacity" value={labels.projectType} onChange={(projectType) => setLabels({ projectType })} placeholder="Project type" />
          <TextInput label="Location" value={labels.location} onChange={(location) => setLabels({ location })} placeholder="Location" />
          <TextInput label="Date" value={labels.date} onChange={(date) => setLabels({ date })} placeholder="Date" />
          <TextInput label="Category" value={labels.category} onChange={(category) => setLabels({ category })} placeholder="Category" />
          <TextInput label="Capacity" value={labels.capacity} onChange={(capacity) => setLabels({ capacity })} placeholder="Capacity" />
          <TextInput label="Scope heading" value={labels.scope} onChange={(scope) => setLabels({ scope })} placeholder="Scope of work" />
          <TextInput label="Overview heading" value={labels.overview} onChange={(overview) => setLabels({ overview })} placeholder="Overview" />
        </div>
      </Group>
      <Group title="Popup buttons">
        <NapHint />
        <CtaListEditor value={popup.ctas} onChange={(ctas) => setPopup({ ctas })} />
      </Group>
      <Group title="Running thumbnail strip" description="Endless row of every project under the cards">
        <div className="admin-form-grid">
          <Field label="Strip">
            <Toggle label="Show the running strip" checked={!strip.hidden} onChange={(v) => setStrip({ hidden: !v })} />
            <Toggle label="Pause on hover" checked={strip.pauseOnHover !== false} onChange={(pauseOnHover) => setStrip({ pauseOnHover })} />
            <Toggle label="Click opens the popup" checked={strip.clickOpensPopup !== false} onChange={(clickOpensPopup) => setStrip({ clickOpensPopup })} />
            <Toggle label="Caption on each thumbnail" checked={strip.showCaption !== false} onChange={(showCaption) => setStrip({ showCaption })} />
            <Toggle label="Start captions with the capacity" checked={strip.captionCapacity !== false} onChange={(captionCapacity) => setStrip({ captionCapacity })} />
          </Field>
          <NumberInput label="Seconds per loop" value={strip.speedSeconds} min={5} step={5} placeholder="50" onChange={(speedSeconds) => setStrip({ speedSeconds })} />
          <SelectInput label="Direction" value={strip.direction || 'ltr'} options={DIRECTION_OPTIONS} onChange={(direction) => setStrip({ direction })} />
          <NumberInput label="Caption max characters" value={strip.captionMaxChars} min={8} placeholder="30" onChange={(captionMaxChars) => setStrip({ captionMaxChars })} />
          <TextInput label="Thumbnail width" value={strip.itemWidth} onChange={(itemWidth) => setStrip({ itemWidth })} placeholder="176px (140px on phones)" />
          <TextInput label="Thumbnail height" value={strip.itemHeight} onChange={(itemHeight) => setStrip({ itemHeight })} placeholder="104px (84px on phones)" />
          <TextInput label="Thumbnail radius" value={strip.itemRadius} onChange={(itemRadius) => setStrip({ itemRadius })} placeholder="10px" />
          <TextInput label="Thumbnail border" value={strip.itemBorder} onChange={(itemBorder) => setStrip({ itemBorder })} placeholder="1.5px solid rgba(255,255,255,0.6)" />
          <TextInput label="Gap" value={strip.gap} onChange={(gap) => setStrip({ gap })} placeholder="1rem" />
          <TextInput label="Padding top / bottom" value={strip.paddingY} onChange={(paddingY) => setStrip({ paddingY })} placeholder="1.3rem" />
          <TextArea
            label="Background"
            rows={2}
            value={strip.background}
            onChange={(background) => setStrip({ background })}
            placeholder="linear-gradient(180deg,var(--navy-950),var(--navy-900))"
          />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ongoing projects                                                    */
/* ------------------------------------------------------------------ */

function Pj101OngoingEditor({ content: c, onChange }: EditorProps<Pj101OngoingContent>) {
  const set = (patch: Partial<Pj101OngoingContent>) => onChange({ ...c, ...patch });
  const theme = c.theme || {};
  const setTheme = (patch: Partial<Pj101OngoingContent['theme']>) => set({ theme: { ...theme, ...patch } });
  const card = c.card || {};
  const setCard = (patch: Partial<Pj101OngoingContent['card']>) => set({ card: { ...card, ...patch } });
  const steps = c.steps || [];
  const stepOptions = [...steps.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s || 'Step'} (in progress)` })), { value: String(steps.length), label: 'All steps done' }];

  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <HeadGroups head={c.head} onChange={(head) => set({ head })} countHint='e.g. "3 IN PROGRESS"' />
      <Group title="Ongoing projects" open description="Title, category, description, thumbnail and current stage per card">
        <ListEditor<Pj101OngoingItem>
          label="Projects"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Project"
          create={defaultPj101OngoingItem}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.title || 'Project'}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Title" value={it.title} onChange={(title) => patch({ ...it, title })} full />
                <TextInput label="Category pill" value={it.category} onChange={(category) => patch({ ...it, category })} placeholder="Solar EPC" />
                <SelectInput
                  label="Current stage"
                  value={String(Math.min(Math.max(0, Number(it.activeStep) || 0), steps.length))}
                  options={stepOptions}
                  onChange={(v) => patch({ ...it, activeStep: Number(v) })}
                />
                <TextInput label="Status text (optional)" value={it.status} onChange={(status) => patch({ ...it, status })} placeholder={c.statusLabel || 'In Progress'} />
                <TextInput label="Small tag (optional)" value={it.note} onChange={(note) => patch({ ...it, note })} placeholder="Sample · replace" hint="Empty = hidden." />
                <SelectInput
                  label="Thumbnail artwork (no photo)"
                  value={it.illustration || 'epc'}
                  options={PJ101_ILLUSTRATION_OPTIONS}
                  onChange={(illustration) => patch({ ...it, illustration: illustration as Pj101Illustration })}
                />
                <Field label="Visibility">
                  <Toggle label="Show this project" checked={!it.hidden} onChange={(v) => patch({ ...it, hidden: !v })} />
                </Field>
              </div>
              <TextArea label="Description" rows={3} value={it.description} onChange={(description) => patch({ ...it, description })} />
              <MediaPicker label="Thumbnail photo (empty = artwork)" value={it.image || ''} onChange={(image) => patch({ ...it, image })} kinds={['image', 'svg']} allowUpload />
            </>
          )}
        />
      </Group>
      <Group title="Stages & status" description="The stage tracker under every card">
        <ListEditor<{ label: string }>
          label="Stages"
          items={steps.map((label) => ({ label }))}
          onChange={(next) => set({ steps: next.map((s) => s.label) })}
          addLabel="Stage"
          create={() => ({ label: 'New stage' })}
          itemTitle={(s, i) => `${i + 1}. ${s.label || 'Stage'}`}
          renderItem={(s, patch) => <TextInput label="Stage name" value={s.label} onChange={(label) => patch({ label })} />}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <TextInput label="Status text" value={c.statusLabel} onChange={(statusLabel) => set({ statusLabel })} placeholder="In Progress" />
          <Field label="Animation">
            <Toggle label="Animate the current stage" checked={c.animateSteps !== false} onChange={(animateSteps) => set({ animateSteps })} />
          </Field>
          <div className="full">
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => set({ steps: [...PJ101_DEFAULT_STEPS] })}>
              Reset to Design / Supply / Installation / Commissioning
            </button>
          </div>
        </div>
      </Group>
      <Group title="Theme colors" description="The logo-blue gradient used by the left bar, category pill and stage fills">
        <div className="admin-form-grid">
          <TextArea
            label="Gradient"
            rows={2}
            value={theme.gradient}
            onChange={(gradient) => setTheme({ gradient })}
            placeholder="linear-gradient(90deg,#0A5BB8 0%,#1A8CFF 38%,#00C8F0 72%,#14C4A0 100%)"
          />
          <ColorInput label="Status dot color" value={theme.accent} onChange={(accent) => setTheme({ accent })} fallback="#1A8CFF" />
          <TextInput label="Left bar width" value={theme.barWidth} onChange={(barWidth) => setTheme({ barWidth })} placeholder="6px" />
        </div>
      </Group>
      <Group title="Card grid & content">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.8rem" />
          <Field label="Animation">
            <Toggle label="Reveal heading and cards on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
          <Field label="Show">
            <Toggle label="Status pill" checked={card.showStatus !== false} onChange={(showStatus) => setCard({ showStatus })} />
            <Toggle label="Small tag" checked={card.showNote !== false} onChange={(showNote) => setCard({ showNote })} />
            <Toggle label="Category pill" checked={card.showCategory !== false} onChange={(showCategory) => setCard({ showCategory })} />
            <Toggle label="Thumbnail" checked={card.showThumb !== false} onChange={(showThumb) => setCard({ showThumb })} />
            <Toggle label="Description" checked={card.showDescription !== false} onChange={(showDescription) => setCard({ showDescription })} />
            <Toggle label="Stage tracker" checked={card.showSteps !== false} onChange={(showSteps) => setCard({ showSteps })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <div className="admin-form-grid">
          <TextInput label="Background" value={card.background} onChange={(background) => setCard({ background })} placeholder="linear-gradient(180deg,#FFFFFF,var(--gray-100))" />
          <TextInput label="Border" value={card.border} onChange={(border) => setCard({ border })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="18px" />
          <TextInput label="Padding" value={card.padding} onChange={(padding) => setCard({ padding })} placeholder="1.8rem 1.8rem 2rem" />
          <TextInput label="Shadow" value={card.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 14px 30px -16px rgba(10,70,160,0.35)" />
          <TextInput label="Hover shadow" value={card.hoverShadow} onChange={(hoverShadow) => setCard({ hoverShadow })} placeholder="0 28px 46px -18px rgba(10,91,184,0.5)" />
          <TextInput label="Thumbnail width" value={card.thumbWidth} onChange={(thumbWidth) => setCard({ thumbWidth })} placeholder="96px" />
          <TextInput label="Thumbnail height" value={card.thumbHeight} onChange={(thumbHeight) => setCard({ thumbHeight })} placeholder="72px" />
          <Field label="Hover">
            <Toggle label="Lift card on hover" checked={card.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
          </Field>
        </div>
        <StyleEditor title="Status pill style" value={card.statusStyle} onChange={(statusStyle) => setCard({ statusStyle })} allowHide={false} fontSizePlaceholder="0.68rem (mono)" />
        <StyleEditor title="Category pill style" value={card.categoryStyle} onChange={(categoryStyle) => setCard({ categoryStyle })} allowHide={false} fontSizePlaceholder="0.68rem (mono)" />
        <StyleEditor title="Title style" value={card.titleStyle} onChange={(titleStyle) => setCard({ titleStyle })} allowHide={false} fontSizePlaceholder="1.35rem" />
        <StyleEditor title="Description style" value={card.bodyStyle} onChange={(bodyStyle) => setCard({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
        <StyleEditor title="Stage label style" value={card.stepStyle} onChange={(stepStyle) => setCard({ stepStyle })} allowHide={false} fontSizePlaceholder="0.62rem (mono)" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function Projects101SectionEditor({
  type,
  content,
  onChange,
}: {
  type: Projects101SectionType;
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
      <div className="az-admin lz-admin lgy-admin pj101-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'pj101_projects' ? (
            <Pj101ProjectsEditor content={withProjects101Defaults<Pj101ProjectsContent>(type, content)} onChange={emit} />
          ) : type === 'pj101_ongoing' ? (
            <Pj101OngoingEditor content={withProjects101Defaults<Pj101OngoingContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
