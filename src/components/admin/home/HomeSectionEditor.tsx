'use client';

import { useEffect, useState, type ReactNode } from 'react';
import MediaPicker from '@/components/admin/MediaPicker';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  Field,
  IconEditor,
  ImageEditor,
  LinkListEditor,
  ListEditor,
  Panel,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import {
  HighlightEditor,
  LifeGroup as Group,
  LifeGroupProvider,
  MediaBulkAdd,
  MediaItemsEditor,
  NapHint,
  NumberInput,
  titleFromPath,
} from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, SectionBoxGroup, VALIGN_OPTIONS } from '@/components/admin/legacy/LegacySectionEditor';
import { normalizeLinkItems, type EyebrowScale, type ImageEl, type SplitLayout } from '@/lib/about-sections';
import type { LegacyBgMotion } from '@/lib/legacy-sections';
import { publicMediaUrl } from '@/lib/media-url';
import {
  HOME_ECO_GLYPHS,
  HOME_HERO_THEMES,
  HOME_ICON_PRESETS,
  defaultHomeEcoNodes,
  defaultHomeHeroSlide,
  withHomeDefaults,
  type HomeCertContent,
  type HomeColumns,
  type HomeCta,
  type HomeCtaContent,
  type HomeCtaVariant,
  type HomeEcoContent,
  type HomeEcoGroup,
  type HomeEcoNode,
  type HomeHeader,
  type HomeHeroContent,
  type HomeHeroSlide,
  type HomeIndustriesContent,
  type HomeIndustryItem,
  type HomeLogo,
  type HomeMarquee,
  type HomePartnersContent,
  type HomeProjectCard,
  type HomeProjectsContent,
  type HomeSectionType,
  type HomeSplitContent,
  type HomeSplitFeature,
  type HomeStatItem,
  type HomeStatsContent,
  type HomeTestimonial,
  type HomeTestimonialsContent,
  type HomeTimelineContent,
  type HomeTimelineItem,
  type HomeWhyCard,
  type HomeWhyContent,
} from '@/lib/home-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const MOTION_OPTIONS: Array<{ value: LegacyBgMotion; label: string }> = [
  { value: 'none', label: 'None (still)' },
  { value: 'kenburns', label: 'Ken Burns (slow zoom per slide)' },
  { value: 'zoom', label: 'Zoom (slow zoom in / out loop)' },
  { value: 'pan', label: 'Pan (slow zoom + pan loop)' },
  { value: 'drift', label: 'Drift (side-to-side loop)' },
];

const CTA_VARIANTS: Array<{ value: HomeCtaVariant; label: string }> = [
  { value: 'primary', label: 'Primary (orange)' },
  { value: 'ghost', label: 'Ghost (light outline)' },
  { value: 'ghost-dark', label: 'Ghost dark (dark outline)' },
  { value: 'accent', label: 'Hero accent (slide accent color)' },
  { value: 'outline-cyan', label: 'Rounded outline (cyan pill)' },
];

/* ------------------------------------------------------------------ */
/* Shared editors                                                      */
/* ------------------------------------------------------------------ */

function HomeCtaListEditor({
  value,
  onChange,
  slots,
  defaultVariant = 'primary',
}: {
  value: HomeCta[];
  onChange: (next: HomeCta[]) => void;
  /** Row places buttons in left / center / right slots */
  slots?: boolean;
  defaultVariant?: HomeCtaVariant;
}) {
  return (
    <>
      <NapHint />
      <ListEditor<HomeCta>
        label="Buttons"
        items={value || []}
        onChange={onChange}
        addLabel="Button"
        create={() => ({ label: 'Send an Inquiry →', href: '/contact', variant: defaultVariant })}
        itemTitle={(b) => `${b.hidden ? '[hidden] ' : ''}${b.label || 'Button'}`}
        renderItem={(b, patch) => (
          <>
            <div className="admin-form-grid">
              <div className="full">
                <Toggle label="Show this button" checked={!b.hidden} onChange={(v) => patch({ ...b, hidden: !v || undefined })} />
              </div>
              <TextInput label="Label" value={b.label} onChange={(label) => patch({ ...b, label })} />
              <TextInput label="Link" value={b.href} onChange={(href) => patch({ ...b, href })} placeholder="/contact, #why or tel:+91…" />
              <SelectInput
                label="Variant"
                value={b.variant || defaultVariant}
                options={CTA_VARIANTS}
                onChange={(variant) => patch({ ...b, variant })}
              />
              <SelectInput
                label="Size"
                value={b.size || ''}
                options={[
                  { value: '', label: 'Default' },
                  { value: 'sm', label: 'Small' },
                ]}
                onChange={(size) => patch({ ...b, size: (size || undefined) as HomeCta['size'] })}
              />
              {slots ? (
                <AlignButtons
                  label="Slot in the row"
                  value={b.position}
                  onChange={(position) => patch({ ...b, position: (position || undefined) as HomeCta['position'] })}
                />
              ) : null}
              <Field label="Behaviour">
                <Toggle label="Lift + glow on hover" checked={Boolean(b.lift)} onChange={(lift) => patch({ ...b, lift: lift || undefined })} />
                <Toggle label="Open in a new tab" checked={Boolean(b.newTab)} onChange={(newTab) => patch({ ...b, newTab: newTab || undefined })} />
              </Field>
            </div>
            <StyleEditor title="Button style" value={b.style} onChange={(style) => patch({ ...b, style })} allowHide={false} />
          </>
        )}
      />
    </>
  );
}

/** Desktop / tablet (≤1080px) / phone (≤760px) — the homepage breakpoints. */
function HomeColumnsEditor({
  label = 'Columns',
  value,
  onChange,
  defaults,
}: {
  label?: string;
  value?: HomeColumns;
  onChange: (next: HomeColumns) => void;
  defaults: Required<HomeColumns>;
}) {
  const v = value || {};
  const set = (patch: Partial<HomeColumns>) => onChange({ ...v, ...patch });
  return (
    <>
      <NumberInput label={`${label} · desktop`} value={v.desktop} min={1} max={8} placeholder={String(defaults.desktop)} onChange={(desktop) => set({ desktop })} />
      <NumberInput label={`${label} · tablet (≤1080px)`} value={v.tablet} min={1} max={8} placeholder={String(defaults.tablet)} onChange={(tablet) => set({ tablet })} />
      <NumberInput label={`${label} · phone (≤760px)`} value={v.mobile} min={1} max={4} placeholder={String(defaults.mobile)} onChange={(mobile) => set({ mobile })} />
    </>
  );
}

function HomeHeaderEditor({ value, onChange, scale }: { value: HomeHeader; onChange: (next: HomeHeader) => void; scale: EyebrowScale }) {
  const h = value || { eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } };
  const set = (patch: Partial<HomeHeader>) => onChange({ ...h, ...patch });
  return (
    <div>
      <div style={{ marginBottom: '0.6rem' }}>
        <Toggle label="Show section header" checked={!h.hidden} onChange={(v) => set({ hidden: !v })} />
      </div>
      <div className="admin-form-grid">
        <AlignButtons label="Header position" value={h.align} onChange={(align) => set({ align: (align || undefined) as HomeHeader['align'] })} />
        <TextInput label="Header max width" value={h.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="Design default" />
        <TextInput label="Space below header" value={h.marginBottom} onChange={(marginBottom) => set({ marginBottom })} placeholder="Design default" />
      </div>
      <TextElementEditor label="Eyebrow" eyebrow siteScale={scale} value={h.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Empty = hidden" />
      <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={h.title} onChange={(title) => set({ title })} />
      <HighlightEditor value={h.highlight} onChange={(highlight) => set({ highlight })} />
      <TextElementEditor label="Subtitle" multiline value={h.subtitle} onChange={(subtitle) => set({ subtitle })} hint="Empty = hidden" />
    </div>
  );
}

function SplitLayoutFields({
  value,
  onChange,
  columnsPlaceholder,
  gapPlaceholder,
  children,
}: {
  value: SplitLayout;
  onChange: (next: SplitLayout) => void;
  columnsPlaceholder: string;
  gapPlaceholder: string;
  children?: ReactNode;
}) {
  const l = value || { imageSide: 'left' };
  const set = (patch: Partial<SplitLayout>) => onChange({ ...l, ...patch });
  return (
    <div className="admin-form-grid">
      <AlignButtons
        label="Image / visual side"
        value={l.imageSide}
        options={['left', 'right']}
        onChange={(v) => set({ imageSide: (v || 'left') as SplitLayout['imageSide'] })}
      />
      <SelectInput
        label="Vertical alignment"
        value={l.alignItems || ''}
        options={[...VALIGN_OPTIONS, { value: 'stretch', label: 'Stretch' }]}
        onChange={(v) => set({ alignItems: (v || undefined) as SplitLayout['alignItems'] })}
      />
      <TextInput
        label="Column widths (desktop)"
        value={l.columns}
        onChange={(columns) => set({ columns })}
        placeholder={columnsPlaceholder}
        hint="CSS grid columns in on-screen order. Columns stack on tablet / phone."
      />
      <TextInput label="Column gap" value={l.gap} onChange={(gap) => set({ gap })} placeholder={gapPlaceholder} />
      <Field label="Tablet / phone">
        <Toggle
          label="Show the image above the text when stacked"
          checked={l.mobileImageFirst !== false}
          onChange={(mobileImageFirst) => set({ mobileImageFirst })}
        />
      </Field>
      {children}
    </div>
  );
}

type Frame = Omit<ImageEl, 'src' | 'alt' | 'hidden'>;

function FrameFields<T extends Frame>({ value, onChange, children }: { value: T; onChange: (next: T) => void; children?: ReactNode }) {
  const f = value || ({} as T);
  const set = (patch: Partial<Frame>) => onChange({ ...f, ...patch });
  return (
    <div className="admin-form-grid">
      <SelectInput
        label="Fit"
        value={f.fit || ''}
        options={[
          { value: '', label: 'Default (cover)' },
          { value: 'cover', label: 'Cover (crop to fill)' },
          { value: 'contain', label: 'Contain (show whole)' },
          { value: 'fill', label: 'Stretch' },
          { value: 'none', label: 'Original size' },
        ]}
        onChange={(fit) => set({ fit: (fit || undefined) as Frame['fit'] })}
      />
      <TextInput label="Focus position" value={f.position} onChange={(position) => set({ position })} placeholder="center, 50% 30%" />
      <TextInput label="Corner radius" value={f.radius} onChange={(radius) => set({ radius })} placeholder="Design default" />
      <TextInput label="Aspect ratio" value={f.aspectRatio} onChange={(aspectRatio) => set({ aspectRatio })} placeholder="e.g. 4/3, 16/9" />
      <TextInput label="Min height" value={f.minHeight} onChange={(minHeight) => set({ minHeight })} />
      <TextInput label="Max width" value={f.maxWidth} onChange={(maxWidth) => set({ maxWidth })} />
      <TextInput label="Border" value={f.border} onChange={(border) => set({ border })} placeholder="1px solid rgba(255,255,255,0.12)" />
      <TextInput label="Shadow" value={f.shadow} onChange={(shadow) => set({ shadow })} placeholder="0 30px 60px -25px rgba(0,0,0,0.3)" />
      <ColorInput label="Frame background" value={f.background} onChange={(background) => set({ background })} fallback="" />
      <TextInput
        label="Overlay gradient"
        value={f.overlay}
        onChange={(overlay) => set({ overlay })}
        placeholder="linear-gradient(180deg, transparent 40%, rgba(10,22,40,0.55))"
        full
      />
      {children}
    </div>
  );
}

function MarqueeFields({
  value,
  onChange,
  speedPlaceholder,
  directionDefault,
}: {
  value: HomeMarquee;
  onChange: (next: HomeMarquee) => void;
  speedPlaceholder: string;
  directionDefault: 'left' | 'right';
}) {
  const m = value || {};
  const set = (patch: Partial<HomeMarquee>) => onChange({ ...m, ...patch });
  return (
    <div className="admin-form-grid">
      <NumberInput
        label="Seconds per loop"
        value={m.speedSeconds}
        min={4}
        step={1}
        placeholder={speedPlaceholder}
        hint="Lower = faster."
        onChange={(speedSeconds) => set({ speedSeconds })}
      />
      <AlignButtons
        label="Scroll direction"
        value={m.direction}
        options={['left', 'right']}
        onChange={(direction) => set({ direction: (direction || undefined) as HomeMarquee['direction'] })}
      />
      <TextInput label="Gap between items" value={m.gap} onChange={(gap) => set({ gap })} placeholder="Design default" />
      <Field label="Behaviour" hint={`Empty direction = ${directionDefault}.`}>
        <Toggle label="Pause on hover" checked={m.pauseOnHover !== false} onChange={(pauseOnHover) => set({ pauseOnHover })} />
        <Toggle label="Fade the edges" checked={m.fadeEdges !== false} onChange={(fadeEdges) => set({ fadeEdges })} />
      </Field>
    </div>
  );
}

function LogosEditor({ items, onChange }: { items: HomeLogo[]; onChange: (next: HomeLogo[]) => void }) {
  const list = items || [];
  return (
    <div className="lz-admin-media">
      {list.length ? (
        <div className="lz-admin-thumbs" aria-label="Logos overview">
          {list.map((logo, i) => (
            <div key={i} className={`lz-admin-thumb${logo.hidden ? ' is-hidden' : ''}`} title={`#${i + 1} ${logo.alt || logo.src}`}>
              {logo.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={publicMediaUrl(logo.src)} alt="" loading="lazy" style={{ objectFit: 'contain', background: '#fff' }} />
              ) : (
                <span className="lz-admin-thumb-empty">empty</span>
              )}
              <span className="lz-admin-thumb-no">{i + 1}</span>
            </div>
          ))}
        </div>
      ) : null}
      <MediaBulkAdd allowVideo={false} onAdd={(paths) => onChange([...list, ...paths.map((src) => ({ src, alt: titleFromPath(src) }))])} />
      <ListEditor<HomeLogo>
        label={`Logos (${list.length})`}
        items={list}
        onChange={onChange}
        addLabel="Logo"
        create={() => ({ src: '', alt: '' })}
        itemTitle={(l) => `${l.hidden ? '[hidden] ' : ''}${l.alt || titleFromPath(l.src || '') || 'No file'}`}
        renderItem={(l, patch) => (
          <div className="admin-form-grid">
            <div className="full">
              <Toggle label="Show this logo" checked={!l.hidden} onChange={(v) => patch({ ...l, hidden: !v || undefined })} />
            </div>
            <div className="full">
              <MediaPicker label="Logo (image or SVG)" value={l.src || ''} onChange={(src) => patch({ ...l, src })} kinds={['image', 'svg']} allowUpload />
            </div>
            <TextInput label="Alt text (company name)" value={l.alt} onChange={(alt) => patch({ ...l, alt })} />
            <TextInput label="Link (optional)" value={l.href} onChange={(href) => patch({ ...l, href })} placeholder="https://…" />
          </div>
        )}
      />
    </div>
  );
}

function BlockLayoutGroup<T extends { align: 'left' | 'center' | 'right'; maxWidth?: string }>({
  c,
  set,
  maxWidthPlaceholder,
}: {
  c: T;
  set: (patch: Partial<T>) => void;
  maxWidthPlaceholder: string;
}) {
  return (
    <Group title="Content layout">
      <div className="admin-form-grid">
        <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as T['align'] } as Partial<T>)} />
        <TextInput label="Content max width" value={c.maxWidth} onChange={(maxWidth) => set({ maxWidth } as Partial<T>)} placeholder={maxWidthPlaceholder} />
      </div>
    </Group>
  );
}

/* ------------------------------------------------------------------ */
/* Hero slider                                                         */
/* ------------------------------------------------------------------ */

function HeroSlideEditor({ s, patch }: { s: HomeHeroSlide; patch: (next: HomeHeroSlide) => void }) {
  const icon = s.icon || {};
  const setIcon = (p: Partial<HomeHeroSlide['icon']>) => patch({ ...s, icon: { ...icon, ...p } });
  return (
    <>
      <div className="admin-form-grid">
        <div className="full">
          <Toggle label="Show this slide" checked={!s.hidden} onChange={(v) => patch({ ...s, hidden: !v || undefined })} />
        </div>
        <SelectInput
          label="Color theme"
          value={s.theme || ''}
          options={[{ value: '', label: 'Custom (accent / tint below)' }, ...HOME_HERO_THEMES.map((t) => ({ value: t.value, label: t.label }))]}
          onChange={(theme) => patch({ ...s, theme })}
        />
        <ColorInput label="Accent color (override)" value={s.accent} onChange={(accent) => patch({ ...s, accent })} fallback="" hint="Eyebrow, button and outline graphic." />
        <ColorInput label="Glow tint (override)" value={s.tint} onChange={(tint) => patch({ ...s, tint })} fallback="" />
        <NumberInput
          label="Slide duration (ms)"
          value={s.durationMs}
          min={2000}
          step={500}
          placeholder="6000"
          onChange={(durationMs) => patch({ ...s, durationMs })}
        />
        <TextInput label="Big numeral (optional)" value={s.numeral} onChange={(numeral) => patch({ ...s, numeral })} placeholder="e.g. 20" />
      </div>
      <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={s.eyebrow} onChange={(eyebrow) => patch({ ...s, eyebrow })} hint="Empty = hidden" />
      <TextElementEditor
        label="Heading"
        multiline
        headingTag
        siteRole="pageHero"
        value={s.title}
        onChange={(title) => patch({ ...s, title })}
        hint="Slide 1 uses the page hero level (H1); later slides render one level lower for SEO."
      />
      <HighlightEditor value={s.highlight} onChange={(highlight) => patch({ ...s, highlight })} />
      <TextElementEditor label="Lead paragraph" multiline value={s.lead} onChange={(lead) => patch({ ...s, lead })} />
      <Panel title={`Buttons (${(s.ctas || []).length})`}>
        <HomeCtaListEditor value={s.ctas} onChange={(ctas) => patch({ ...s, ctas })} defaultVariant="accent" />
      </Panel>
      <Panel title={`Tag pills (${(s.tags || []).length})`}>
        <LinkListEditor label="Tags (link optional)" items={normalizeLinkItems(s.tags)} onChange={(tags) => patch({ ...s, tags })} />
      </Panel>
      <Panel title={`Background images / videos (${(s.media || []).length})`}>
        <MediaItemsEditor
          label="Slide background"
          items={s.media || []}
          onChange={(media) => patch({ ...s, media })}
          showLabel={false}
          showColor={false}
          hint="One item = still background; several = cross-fading slideshow inside the slide. Videos play muted and looped."
        />
        <MediaItemsEditor
          label="Phone background (optional, ≤760px)"
          items={s.mobileMedia || []}
          onChange={(mobileMedia) => patch({ ...s, mobileMedia })}
          showLabel={false}
          showColor={false}
          hint="Leave empty to reuse the media above on phones."
        />
        <div className="admin-form-grid">
          <TextInput label="Focus position" value={s.position} onChange={(position) => patch({ ...s, position })} placeholder="center, 50% 30%" />
          <TextInput
            label="Focus position (phone)"
            value={s.positionMobile}
            onChange={(positionMobile) => patch({ ...s, positionMobile })}
            placeholder="Empty = same as desktop"
          />
          <TextArea
            label="Scrim gradient (this slide)"
            rows={2}
            value={s.scrim}
            onChange={(scrim) => patch({ ...s, scrim })}
            placeholder="Empty = hero default (Overlay & glow)"
          />
        </div>
      </Panel>
      <Panel title="Outline graphic (SVG)">
        <Toggle label="Show outline graphic" checked={!icon.hidden && Boolean(icon.svg?.trim())} onChange={(v) => setIcon({ hidden: !v })} />
        <div className="admin-form-grid">
          <TextArea
            label="SVG markup (inner shapes or full <svg>)"
            rows={5}
            value={icon.svg}
            onChange={(svg) => setIcon({ svg, hidden: svg.trim() ? icon.hidden : true })}
            placeholder='<path d="M80 320 L200 80 L320 320 Z"/>'
          />
          <TextInput label="viewBox" value={icon.viewBox} onChange={(viewBox) => setIcon({ viewBox })} placeholder="0 0 400 400" />
          <TextInput label="Stroke width" value={icon.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.6" />
          <ColorInput label="Stroke color" value={icon.color} onChange={(color) => setIcon({ color })} fallback="" hint="Empty = slide accent." />
          <TextInput label="Opacity" value={icon.opacity} onChange={(opacity) => setIcon({ opacity })} placeholder="Design default" />
          <TextInput label="Width" value={icon.width} onChange={(width) => setIcon({ width })} placeholder="Design default" />
        </div>
      </Panel>
    </>
  );
}

function HomeHeroEditor({ content: c, onChange }: EditorProps<HomeHeroContent>) {
  const set = (patch: Partial<HomeHeroContent>) => onChange({ ...c, ...patch });
  const height = c.height || {};
  const media = c.media || {};
  const ov = c.overlay || {};
  const dots = c.dots || {};
  const tags = c.tags || {};
  const layout = c.layout || {};
  return (
    <>
      <Group title="Slides" description="Each slide: theme, eyebrow, heading, lead, buttons, tags, background images / videos, outline graphic" open>
        <ListEditor<HomeHeroSlide>
          label="Slides"
          items={c.slides || []}
          onChange={(slides) => set({ slides })}
          addLabel="Slide"
          create={defaultHomeHeroSlide}
          itemTitle={(s, i) => `${s.hidden ? '[hidden] ' : ''}${i + 1}. ${s.title?.text || 'Untitled slide'}`}
          renderItem={(s, patch) => <HeroSlideEditor s={s} patch={patch} />}
        />
      </Group>
      <Group title="Height, timing & swipe">
        <div className="admin-form-grid">
          <TextInput label="Height (desktop)" value={height.desktop} onChange={(desktop) => set({ height: { ...height, desktop } })} placeholder="100vh" />
          <TextInput label="Min height (desktop)" value={height.minHeight} onChange={(minHeight) => set({ height: { ...height, minHeight } })} placeholder="640px" />
          <TextInput
            label="Min height (phone)"
            value={height.mobileMinHeight}
            onChange={(mobileMinHeight) => set({ height: { ...height, mobileMinHeight } })}
            placeholder="100dvh"
          />
          <NumberInput label="Cross-fade (ms)" value={c.fadeMs} min={0} step={100} placeholder="1100" onChange={(fadeMs) => set({ fadeMs })} />
          <Field label="Behaviour">
            <Toggle label="Autoplay slides" checked={c.autoplay !== false} onChange={(autoplay) => set({ autoplay })} />
            <Toggle label="Pause while hovered" checked={Boolean(c.pauseOnHover)} onChange={(pauseOnHover) => set({ pauseOnHover })} />
            <Toggle label="Swipe between slides on touch screens" checked={c.swipe !== false} onChange={(swipe) => set({ swipe })} />
          </Field>
          <NumberInput
            label="Seconds per background image"
            value={media.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="5"
            hint="When a slide has several background images / videos."
            onChange={(intervalSeconds) => set({ media: { ...media, intervalSeconds } })}
          />
          <SelectInput label="Background motion" value={media.motion || 'none'} options={MOTION_OPTIONS} onChange={(motion) => set({ media: { ...media, motion } })} />
          <NumberInput
            label="Motion cycle (seconds)"
            value={media.motionSeconds}
            min={1}
            step={1}
            placeholder="8"
            onChange={(motionSeconds) => set({ media: { ...media, motionSeconds } })}
          />
        </div>
      </Group>
      <Group title="Overlay & glow">
        <div className="admin-form-grid">
          <TextArea
            label="Scrim gradient (all slides)"
            rows={2}
            value={ov.scrim}
            onChange={(scrim) => set({ overlay: { ...ov, scrim } })}
            placeholder="Empty = design default (dark gradient behind the text)"
          />
          <Field label="Layers">
            <Toggle label="Blueprint grid overlay" checked={ov.grid !== false} onChange={(grid) => set({ overlay: { ...ov, grid } })} />
            <Toggle label="Colored glow tint" checked={ov.tint !== false} onChange={(tint) => set({ overlay: { ...ov, tint } })} />
          </Field>
          <ColorInput label="Grid line color" value={ov.gridColor} onChange={(gridColor) => set({ overlay: { ...ov, gridColor } })} fallback="" />
          <TextInput label="Glow opacity" value={ov.tintOpacity} onChange={(tintOpacity) => set({ overlay: { ...ov, tintOpacity } })} placeholder="Design default" />
        </div>
      </Group>
      <Group title="Slide dots">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show dots" checked={!dots.hidden} onChange={(v) => set({ dots: { ...dots, hidden: !v } })} />
            <Toggle label="Also show on phones" checked={Boolean(dots.showOnMobile)} onChange={(showOnMobile) => set({ dots: { ...dots, showOnMobile } })} />
          </Field>
          <SelectInput
            label="Position (desktop)"
            value={dots.position || 'right'}
            options={[
              { value: 'right', label: 'Right edge (vertical)' },
              { value: 'bottom', label: 'Bottom center' },
            ]}
            onChange={(position) => set({ dots: { ...dots, position } })}
          />
          <ColorInput label="Dot color" value={dots.color} onChange={(color) => set({ dots: { ...dots, color } })} fallback="" />
          <ColorInput label="Progress / active color" value={dots.activeColor} onChange={(activeColor) => set({ dots: { ...dots, activeColor } })} fallback="#FFFFFF" />
        </div>
      </Group>
      <Group title="Tag pills (all slides)">
        <div className="admin-form-grid">
          <Field label="Display">
            <Toggle label="Show tag pills" checked={!tags.hidden} onChange={(v) => set({ tags: { ...tags, hidden: !v } })} />
            <Toggle label="Keep on one line" checked={Boolean(tags.singleLine)} onChange={(singleLine) => set({ tags: { ...tags, singleLine } })} />
          </Field>
          <ColorInput label="Hover color" value={tags.hoverColor} onChange={(hoverColor) => set({ tags: { ...tags, hoverColor } })} fallback="" hint="Empty = slide accent." />
        </div>
        <StyleEditor title="Pill style (color, background, border, font…)" value={tags.style} onChange={(style) => set({ tags: { ...tags, style } })} allowHide={false} />
      </Group>
      <Group title="Content layout">
        <div className="admin-form-grid">
          <TextInput
            label="Columns (desktop)"
            value={layout.columns}
            onChange={(columns) => set({ layout: { ...layout, columns } })}
            placeholder="minmax(0,1.4fr) minmax(0,0.8fr)"
          />
          <TextInput label="Text max width" value={layout.contentMaxWidth} onChange={(contentMaxWidth) => set({ layout: { ...layout, contentMaxWidth } })} />
          <TextInput label="Space below text" value={layout.paddingBottom} onChange={(paddingBottom) => set({ layout: { ...layout, paddingBottom } })} placeholder="4.5rem" />
          <TextInput
            label="Space below text (phone)"
            value={layout.paddingBottomMobile}
            onChange={(paddingBottomMobile) => set({ layout: { ...layout, paddingBottomMobile } })}
          />
        </div>
      </Group>
      <Group title="Text styles (all slides)" description="Per-slide styles in each slide override these">
        <StyleEditor title="Eyebrow style" value={c.eyebrowStyle} onChange={(eyebrowStyle) => set({ eyebrowStyle })} allowHide={false} />
        <StyleEditor title="Heading style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="Site Settings heading size" />
        <StyleEditor title="Lead style" value={c.leadStyle} onChange={(leadStyle) => set({ leadStyle })} allowHide={false} />
        <StyleEditor title="Big numeral style" value={c.numeralStyle} onChange={(numeralStyle) => set({ numeralStyle })} />
      </Group>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ecosystem                                                           */
/* ------------------------------------------------------------------ */

function HomeEcoEditor({ content: c, onChange }: EditorProps<HomeEcoContent>) {
  const set = (patch: Partial<HomeEcoContent>) => onChange({ ...c, ...patch });
  const v = c.visual;
  const setVisual = (patch: Partial<HomeEcoContent['visual']>) => set({ visual: { ...v, ...patch } });
  const d = v.diagram;
  const setDiagram = (patch: Partial<HomeEcoContent['visual']['diagram']>) => setVisual({ diagram: { ...d, ...patch } });
  const ck = c.checklist || {};
  const setCk = (patch: Partial<HomeEcoContent['checklist']>) => set({ checklist: { ...ck, ...patch } });
  const trust = c.trust || { items: [] };
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Layout">
        <SplitLayoutFields value={c.layout} onChange={(layout) => set({ layout })} columnsPlaceholder="1fr 1.05fr" gapPlaceholder="4rem" />
      </Group>
      <Group title="Visual (diagram or images / videos)" description="Animated ecosystem diagram, or your own images / videos">
        <div className="admin-form-grid">
          <Field label="Display">
            <Toggle label="Show visual" checked={!v.hidden} onChange={(on) => setVisual({ hidden: !on })} />
            <Toggle label="Glow frame behind the visual" checked={v.frame !== false} onChange={(frame) => setVisual({ frame })} />
          </Field>
          <SelectInput
            label="Visual type"
            value={v.mode || 'diagram'}
            options={[
              { value: 'diagram', label: 'Ecosystem diagram (animated)' },
              { value: 'media', label: 'Images / videos' },
            ]}
            onChange={(mode) => setVisual({ mode })}
          />
          <TextInput label="Max width (desktop)" value={v.maxWidth} onChange={(maxWidth) => setVisual({ maxWidth })} placeholder="Design default" />
          <TextInput label="Max width (tablet / phone)" value={v.maxWidthMobile} onChange={(maxWidthMobile) => setVisual({ maxWidthMobile })} />
        </div>
        {v.mode === 'media' ? (
          <>
            <MediaItemsEditor
              label="Visual media"
              items={v.media || []}
              onChange={(media) => setVisual({ media })}
              showLabel={false}
              showColor={false}
              hint="One item = still image; several = cross-fading slideshow."
            />
            <div className="admin-form-grid">
              <NumberInput
                label="Seconds per image"
                value={v.intervalSeconds}
                min={1}
                step={0.5}
                placeholder="5"
                onChange={(intervalSeconds) => setVisual({ intervalSeconds })}
              />
              <Field label="Indicators">
                <Toggle label="Show dots" checked={v.showDots !== false} onChange={(showDots) => setVisual({ showDots })} />
              </Field>
            </div>
            <Panel title="Media frame">
              <FrameFields value={v.mediaFrame || {}} onChange={(mediaFrame) => setVisual({ mediaFrame })} />
            </Panel>
          </>
        ) : (
          <>
            <MediaPicker label="Hub logo" value={d.hubLogo || ''} onChange={(hubLogo) => setDiagram({ hubLogo })} kinds={['image', 'svg']} allowUpload />
            <div className="admin-form-grid">
              <TextInput label="Hub logo alt text" value={d.hubLogoAlt} onChange={(hubLogoAlt) => setDiagram({ hubLogoAlt })} placeholder="Site Settings logo alt" />
              <ColorInput label="Hub fill" value={d.hubFill} onChange={(hubFill) => setDiagram({ hubFill })} fallback="" />
              <ColorInput label="Ring / spoke color" value={d.ringColor} onChange={(ringColor) => setDiagram({ ringColor })} fallback="" />
              <ColorInput label="Node fill" value={d.nodeFill} onChange={(nodeFill) => setDiagram({ nodeFill })} fallback="" />
              <ColorInput label="Label color" value={d.labelColor} onChange={(labelColor) => setDiagram({ labelColor })} fallback="" />
              <Field label="Motion">
                <Toggle label="Animate (pulses, rotating rings)" checked={d.animate !== false} onChange={(animate) => setDiagram({ animate })} />
              </Field>
            </div>
            <ListEditor<HomeEcoNode>
              label="Diagram nodes"
              items={d.nodes || []}
              onChange={(nodes) => setDiagram({ nodes })}
              addLabel="Node"
              create={() => ({ label: 'New node', color: 'var(--cyan)', glyph: 'spark' })}
              itemTitle={(n) => `${n.hidden ? '[hidden] ' : ''}${n.label}`}
              renderItem={(n, patch) => (
                <div className="admin-form-grid">
                  <div className="full">
                    <Toggle label="Show this node" checked={!n.hidden} onChange={(on) => patch({ ...n, hidden: !on || undefined })} />
                  </div>
                  <TextInput label="Label" value={n.label} onChange={(label) => patch({ ...n, label })} />
                  <ColorInput label="Color" value={n.color} onChange={(color) => patch({ ...n, color })} fallback="var(--cyan)" />
                  <SelectInput
                    label="Glyph"
                    value={n.glyph || ''}
                    options={[{ value: '', label: 'None' }, ...HOME_ECO_GLYPHS.map((g) => ({ value: g.key, label: g.label }))]}
                    onChange={(glyph) => patch({ ...n, glyph })}
                  />
                  <TextArea
                    label="Custom icon (24×24 SVG shapes, replaces glyph)"
                    rows={2}
                    value={n.svg}
                    onChange={(svg) => patch({ ...n, svg })}
                    placeholder='<path d="M12 2v20M2 12h20"/>'
                  />
                </div>
              )}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary az-admin-mini"
                onClick={() => {
                  if (window.confirm('Replace the nodes with the original six?')) setDiagram({ nodes: defaultHomeEcoNodes() });
                }}
              >
                Reset nodes to design default
              </button>
            </div>
          </>
        )}
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Capability checklist" description="Colored groups of capabilities">
        <div className="admin-form-grid">
          <Field label="Display">
            <Toggle label="Show checklist" checked={!ck.hidden} onChange={(on) => setCk({ hidden: !on })} />
            <Toggle label="Item turns group color on hover" checked={ck.hoverColor !== false} onChange={(hoverColor) => setCk({ hoverColor })} />
          </Field>
          <NumberInput label="Columns · desktop / tablet" value={ck.columns} min={1} max={4} placeholder="2" onChange={(columns) => setCk({ columns })} />
          <NumberInput label="Columns · phone (≤760px)" value={ck.columnsMobile} min={1} max={3} placeholder="1" onChange={(columnsMobile) => setCk({ columnsMobile })} />
          <SelectInput
            label="Group order"
            value={ck.flow === 'row' ? 'row' : 'column'}
            options={[
              { value: 'column', label: 'Top-to-bottom, then next column' },
              { value: 'row', label: 'Left-to-right, then next row' },
            ]}
            onChange={(flow) => setCk({ flow })}
          />
          <TextInput label="Gap" value={ck.gap} onChange={(gap) => setCk({ gap })} placeholder="1.6rem 2.2rem" />
          <TextInput label="Dot size" value={ck.dotSize} onChange={(dotSize) => setCk({ dotSize })} placeholder="8px" />
        </div>
        <StyleEditor title="Item style" value={ck.itemStyle} onChange={(itemStyle) => setCk({ itemStyle })} allowHide={false} fontSizePlaceholder="1.1rem" />
        <ListEditor<HomeEcoGroup>
          label="Groups"
          items={c.groups || []}
          onChange={(groups) => set({ groups })}
          addLabel="Group"
          create={() => ({ color: 'var(--cyan)', items: ['New capability'] })}
          itemTitle={(g) =>
            `${g.hidden ? '[hidden] ' : ''}${(g.items || []).slice(0, 2).join(', ') || 'Empty group'}${
              Number.isFinite(g.order) ? ` · position ${g.order}` : ''
            }`
          }
          renderItem={(g, patch) => (
            <div className="admin-form-grid">
              <div className="full">
                <Toggle label="Show this group" checked={!g.hidden} onChange={(on) => patch({ ...g, hidden: !on || undefined })} />
              </div>
              <ColorInput label="Dot / hover color" value={g.color} onChange={(color) => patch({ ...g, color })} fallback="var(--cyan)" />
              <NumberInput
                label="Position on desktop / tablet"
                value={g.order}
                min={0}
                max={50}
                placeholder="List order"
                hint="Lower comes first. Phones always use the list order."
                onChange={(order) => patch({ ...g, order })}
              />
              <TextArea
                label="Items (one per line)"
                rows={4}
                value={(g.items || []).join('\n')}
                onChange={(text) => patch({ ...g, items: text.split('\n') })}
              />
            </div>
          )}
        />
      </Group>
      <Group title="Trust badges">
        <Toggle label="Show trust badges" checked={!trust.hidden} onChange={(on) => set({ trust: { ...trust, hidden: !on } })} />
        <ListEditor<HomeEcoContent['trust']['items'][number]>
          label="Badges"
          items={trust.items || []}
          onChange={(items) => set({ trust: { ...trust, items } })}
          addLabel="Badge"
          create={() => ({ badge: 'ISO', label: 'Certified' })}
          itemTitle={(t) => `${t.badge} ${t.label}`.trim()}
          renderItem={(t, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Badge text" value={t.badge} onChange={(badge) => patch({ ...t, badge })} />
              <TextInput label="Label" value={t.label} onChange={(label) => patch({ ...t, label })} />
              <ColorInput label="Badge color" value={t.color} onChange={(color) => patch({ ...t, color })} fallback="var(--green)" />
            </div>
          )}
        />
      </Group>
      <Group title="Buttons">
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

function HomeStatsEditor({ content: c, onChange }: EditorProps<HomeStatsContent>) {
  const set = (patch: Partial<HomeStatsContent>) => onChange({ ...c, ...patch });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<HomeStatsContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Stats" description="Numbers count up when the bar scrolls into view" open>
        <ListEditor<HomeStatItem>
          label="Stats"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Stat"
          create={() => ({ value: '100', suffix: '+', label: 'New stat', icon: {} })}
          itemTitle={(s) => `${s.hidden ? '[hidden] ' : ''}${s.prefix || ''}${s.value}${s.suffix || ''} ${s.label}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <div className="full">
                  <Toggle label="Show this stat" checked={!s.hidden} onChange={(on) => patch({ ...s, hidden: !on || undefined })} />
                </div>
                <TextInput label="Number" value={s.value} onChange={(value) => patch({ ...s, value })} hint="Digits animate; any other text shows as typed." />
                <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
                <TextInput label="Prefix" value={s.prefix} onChange={(prefix) => patch({ ...s, prefix })} placeholder="e.g. ₹" />
                <TextInput label="Suffix" value={s.suffix} onChange={(suffix) => patch({ ...s, suffix })} placeholder="+" />
              </div>
              <IconEditor label="Icon" value={s.icon || {}} onChange={(icon) => patch({ ...s, icon })} presets={HOME_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <HomeColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 6, tablet: 3, mobile: 2 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="Design default" />
          <Field label="Motion">
            <Toggle label="Count up the numbers" checked={c.animateCount !== false} onChange={(animateCount) => set({ animateCount })} />
            <Toggle label="Lift on hover" checked={c.hoverLift !== false} onChange={(hoverLift) => set({ hoverLift })} />
          </Field>
          <NumberInput
            label="Count-up duration (ms)"
            value={c.countDurationMs}
            min={200}
            step={100}
            placeholder="1400"
            onChange={(countDurationMs) => set({ countDurationMs })}
          />
        </div>
      </Group>
      <Group title="Number, label & icon style">
        <ColorInput label="Prefix / suffix color" value={c.suffixColor} onChange={(suffixColor) => set({ suffixColor })} fallback="var(--orange)" />
        <StyleEditor title="Number style" value={c.numberStyle} onChange={(numberStyle) => set({ numberStyle })} allowHide={false} fontSizePlaceholder="1.3rem (mono)" />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} />
        <div className="admin-form-grid">
          <Field label="Icons">
            <Toggle label="Show icons" checked={!is.hidden} onChange={(on) => setIcon({ hidden: !on })} />
          </Field>
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIcon({ size })} placeholder="26px" />
          <ColorInput label="Icon color" value={is.color} onChange={(color) => setIcon({ color })} fallback="var(--cyan)" />
          <ColorInput label="Icon hover color" value={is.hoverColor} onChange={(hoverColor) => setIcon({ hoverColor })} fallback="var(--orange)" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.4" />
          <TextInput label="Opacity" value={is.opacity} onChange={(opacity) => setIcon({ opacity })} placeholder="0.85" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Why Zigma                                                           */
/* ------------------------------------------------------------------ */

function HomeWhyEditor({ content: c, onChange }: EditorProps<HomeWhyContent>) {
  const set = (patch: Partial<HomeWhyContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const ol = c.outline || {};
  const setOl = (patch: Partial<HomeWhyContent['outline']>) => set({ outline: { ...ol, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="lg" />
      </Group>
      <Group title="Cards" open>
        <ListEditor<HomeWhyCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({ index: String((c.cards || []).length + 1).padStart(2, '0'), title: { text: 'New reason' }, body: { text: 'Short explanation.' } })}
          itemTitle={(card) => `${card.hidden ? '[hidden] ' : ''}${card.index} ${card.title?.text || ''}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <div className="full">
                  <Toggle label="Show this card" checked={!card.hidden} onChange={(on) => patch({ ...card, hidden: !on || undefined })} />
                </div>
                <TextInput label="Index label" value={card.index} onChange={(index) => patch({ ...card, index })} placeholder="01" />
                <ColorInput label="Card background" value={card.background} onChange={(background) => patch({ ...card, background })} fallback="" />
              </div>
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Body" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <Panel title="Icon (optional)">
                <IconEditor value={card.icon || {}} onChange={(icon) => patch({ ...card, icon })} presets={HOME_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              </Panel>
              <Panel title="Image (optional)">
                <ImageEditor value={card.image || { src: '' }} onChange={(image) => patch({ ...card, image })} />
              </Panel>
            </>
          )}
        />
      </Group>
      <Group title="Grid & reveal">
        <div className="admin-form-grid">
          <HomeColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="Design default" />
          <Field label="Motion">
            <Toggle label="Fade cards in on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={(patch) => set({ cardStyle: { ...cs, ...patch } })}
          placeholders={{ background: 'Design tint', border: 'Design default', radius: '10px', padding: 'Design default' }}
        >
          <ColorInput label="Title hover color" value={cs.hoverTitleColor} onChange={(hoverTitleColor) => set({ cardStyle: { ...cs, hoverTitleColor } })} fallback="" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={Boolean(cs.hoverLift)} onChange={(hoverLift) => set({ cardStyle: { ...cs, hoverLift } })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Animated outline">
        <div className="admin-form-grid">
          <Field label="Outline">
            <Toggle label="Show outline" checked={!ol.hidden} onChange={(on) => setOl({ hidden: !on })} />
            <Toggle label="Animate the highlight" checked={ol.animate !== false} onChange={(animate) => setOl({ animate })} />
          </Field>
          <ColorInput label="Outline color" value={ol.color} onChange={(color) => setOl({ color })} fallback="var(--green)" />
          <NumberInput label="Loop speed (seconds)" value={ol.speedSeconds} min={1} step={0.5} placeholder="5.5" onChange={(speedSeconds) => setOl({ speedSeconds })} />
        </div>
      </Group>
      <Group title="Text styles (all cards)">
        <StyleEditor title="Index style" value={c.indexStyle} onChange={(indexStyle) => set({ indexStyle })} />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} />
        <StyleEditor title="Body style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Split service section                                               */
/* ------------------------------------------------------------------ */

function HomeSplitEditor({ content: c, onChange }: EditorProps<HomeSplitContent>) {
  const set = (patch: Partial<HomeSplitContent>) => onChange({ ...c, ...patch });
  const m = c.media;
  const setMedia = (patch: Partial<HomeSplitContent['media']>) => set({ media: { ...m, ...patch } });
  const fi = c.featIconStyle || {};
  const setFi = (patch: Partial<HomeSplitContent['featIconStyle']>) => set({ featIconStyle: { ...fi, ...patch } });
  const fc = c.featCardStyle || {};
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Layout">
        <SplitLayoutFields value={c.layout} onChange={(layout) => set({ layout })} columnsPlaceholder="9fr 11fr" gapPlaceholder="2.25rem">
          <Field label="Motion">
            <Toggle label="Fade in on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </SplitLayoutFields>
      </Group>
      <Group title="Images / videos" description="Add as many as you like; several cross-fade">
        <Toggle label="Show media" checked={!m.hidden} onChange={(on) => setMedia({ hidden: !on })} />
        <MediaItemsEditor label="Media" items={m.items || []} onChange={(items) => setMedia({ items })} showLabel={false} showColor={false} />
        <div className="admin-form-grid">
          <NumberInput label="Seconds per image" value={m.intervalSeconds} min={1} step={0.5} placeholder="5" onChange={(intervalSeconds) => setMedia({ intervalSeconds })} />
          <Field label="Indicators">
            <Toggle label="Show dots" checked={m.showDots !== false} onChange={(showDots) => setMedia({ showDots })} />
          </Field>
        </div>
        <Panel title="Media frame">
          <FrameFields value={m.frame || {}} onChange={(frame) => setMedia({ frame })}>
            <TextInput
              label="Min height (tablet / phone)"
              value={m.frame?.minHeightMobile}
              onChange={(minHeightMobile) => setMedia({ frame: { ...m.frame, minHeightMobile } })}
            />
            <TextInput
              label="Max height (tablet / phone)"
              value={m.frame?.maxHeightMobile}
              onChange={(maxHeightMobile) => setMedia({ frame: { ...m.frame, maxHeightMobile } })}
            />
          </FrameFields>
        </Panel>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Feature cards">
        <ListEditor<HomeSplitFeature>
          label="Features"
          items={c.features || []}
          onChange={(features) => set({ features })}
          addLabel="Feature"
          create={() => ({ title: { text: 'New feature' }, body: { text: 'Short description.' }, icon: {} })}
          itemTitle={(f) => `${f.hidden ? '[hidden] ' : ''}${f.title?.text || ''}`}
          renderItem={(f, patch) => (
            <>
              <div className="admin-form-grid">
                <div className="full">
                  <Toggle label="Show this feature" checked={!f.hidden} onChange={(on) => patch({ ...f, hidden: !on || undefined })} />
                </div>
                <ColorInput label="Card background" value={f.background} onChange={(background) => patch({ ...f, background })} fallback="" />
              </div>
              <TextElementEditor label="Title" headingTag value={f.title} onChange={(title) => patch({ ...f, title })} />
              <TextElementEditor label="Body" multiline value={f.body} onChange={(body) => patch({ ...f, body })} />
              <IconEditor value={f.icon || {}} onChange={(icon) => patch({ ...f, icon })} presets={HOME_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <HomeColumnsEditor label="Feature columns" value={c.featColumns} onChange={(featColumns) => set({ featColumns })} defaults={{ desktop: 2, tablet: 2, mobile: 1 }} />
          <TextInput label="Feature gap" value={c.featGap} onChange={(featGap) => set({ featGap })} placeholder="Design default" />
        </div>
      </Group>
      <Group title="Feature card style">
        <CardStyleFields
          value={fc}
          onChange={(patch) => set({ featCardStyle: { ...fc, ...patch } })}
          placeholders={{ background: 'Design default', border: 'Design default', radius: 'Design default', padding: 'Design default' }}
        >
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={fc.hoverLift !== false} onChange={(hoverLift) => set({ featCardStyle: { ...fc, hoverLift } })} />
          </Field>
        </CardStyleFields>
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <Field label="Icons">
            <Toggle label="Show icons" checked={!fi.hidden} onChange={(on) => setFi({ hidden: !on })} />
          </Field>
          <TextInput label="Icon box size" value={fi.boxSize} onChange={(boxSize) => setFi({ boxSize })} placeholder="Design default" />
          <TextInput label="Icon size" value={fi.size} onChange={(size) => setFi({ size })} placeholder="Design default" />
          <ColorInput label="Icon color" value={fi.color} onChange={(color) => setFi({ color })} fallback="" />
          <ColorInput label="Icon box background" value={fi.background} onChange={(background) => setFi({ background })} fallback="" />
          <TextInput label="Icon box radius" value={fi.radius} onChange={(radius) => setFi({ radius })} placeholder="Design default" />
          <TextInput label="Stroke width" value={fi.strokeWidth} onChange={(strokeWidth) => setFi({ strokeWidth })} placeholder="1.6" />
        </div>
        <StyleEditor title="Feature title style" value={c.featTitleStyle} onChange={(featTitleStyle) => set({ featTitleStyle })} allowHide={false} />
        <StyleEditor title="Feature body style" value={c.featBodyStyle} onChange={(featBodyStyle) => set({ featBodyStyle })} allowHide={false} />
      </Group>
      <Group title="Buttons">
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} slots />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function HomeTimelineEditor({ content: c, onChange }: EditorProps<HomeTimelineContent>) {
  const set = (patch: Partial<HomeTimelineContent>) => onChange({ ...c, ...patch });
  const runner = c.runner || {};
  const setRunner = (patch: Partial<HomeTimelineContent['runner']>) => set({ runner: { ...runner, ...patch } });
  const colors = c.colors || {};
  const setColors = (patch: Partial<HomeTimelineContent['colors']>) => set({ colors: { ...colors, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="base" />
      </Group>
      <Group title="Milestones" open>
        <ListEditor<HomeTimelineItem>
          label="Milestones"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Milestone"
          create={() => ({ year: String(new Date().getFullYear()), title: 'New milestone', body: 'What happened.' })}
          itemTitle={(t) => `${t.hidden ? '[hidden] ' : ''}${t.year} · ${t.title}${t.now ? ' (now)' : ''}`}
          renderItem={(t, patch) => (
            <div className="admin-form-grid">
              <div className="full">
                <Toggle label="Show this milestone" checked={!t.hidden} onChange={(on) => patch({ ...t, hidden: !on || undefined })} />
              </div>
              <TextInput label="Year / label" value={t.year} onChange={(year) => patch({ ...t, year })} />
              <TextInput label="Title" value={t.title} onChange={(title) => patch({ ...t, title })} />
              <TextArea label="Description" rows={2} value={t.body} onChange={(body) => patch({ ...t, body })} />
              <Field label="Marker">
                <Toggle label="Current milestone (now)" checked={Boolean(t.now)} onChange={(now) => patch({ ...t, now: now || undefined })} />
                <Toggle label="Future milestone (next)" checked={Boolean(t.next)} onChange={(next) => patch({ ...t, next: next || undefined })} />
              </Field>
            </div>
          )}
        />
      </Group>
      <Group title="Runner, colors & sizing">
        <div className="admin-form-grid">
          <Field label="Runner">
            <Toggle label="Animated runner dot" checked={!runner.hidden} onChange={(on) => setRunner({ hidden: !on })} />
          </Field>
          <ColorInput label="Runner color" value={runner.color} onChange={(color) => setRunner({ color })} fallback="var(--cyan)" />
          <NumberInput label="Move time (ms)" value={runner.moveMs} min={200} step={100} placeholder="950" onChange={(moveMs) => setRunner({ moveMs })} />
          <NumberInput label="Hold time (ms)" value={runner.holdMs} min={200} step={100} placeholder="950" onChange={(holdMs) => setRunner({ holdMs })} />
          <ColorInput label="Line color" value={colors.line} onChange={(line) => setColors({ line })} fallback="var(--cyan)" />
          <ColorInput label="Dot color" value={colors.dot} onChange={(dot) => setColors({ dot })} fallback="var(--cyan)" />
          <ColorInput label="Current (now) color" value={colors.now} onChange={(now) => setColors({ now })} fallback="var(--orange)" />
          <ColorInput label="Active (runner) color" value={colors.active} onChange={(active) => setColors({ active })} fallback="var(--cyan)" />
          <ColorInput label="Year color" value={colors.year} onChange={(year) => setColors({ year })} fallback="var(--orange)" />
          <TextInput label="Item min width" value={c.itemMinWidth} onChange={(itemMinWidth) => set({ itemMinWidth })} placeholder="280px" />
          <TextInput label="Item min width (phone)" value={c.itemMinWidthMobile} onChange={(itemMinWidthMobile) => set({ itemMinWidthMobile })} placeholder="min(240px, 78vw)" />
        </div>
      </Group>
      <Group title="Text styles (all milestones)">
        <StyleEditor title="Year style" value={c.yearStyle} onChange={(yearStyle) => set({ yearStyle })} allowHide={false} />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} />
      </Group>
      <Group title="Buttons">
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} slots defaultVariant="ghost" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Projects teaser                                                     */
/* ------------------------------------------------------------------ */

function HomeProjectsEditor({ content: c, onChange }: EditorProps<HomeProjectsContent>) {
  const set = (patch: Partial<HomeProjectsContent>) => onChange({ ...c, ...patch });
  const card = c.card || {};
  const setCard = (patch: Partial<HomeProjectsContent['card']>) => set({ card: { ...card, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="base" />
      </Group>
      <Group title="Project cards" description="Pull from case studies / catalog, or write your own cards" open>
        <div className="admin-form-grid">
          <SelectInput
            label="Cards come from"
            value={c.source || 'case_studies'}
            options={[
              { value: 'case_studies', label: 'Published case studies' },
              { value: 'catalog', label: 'Project catalog' },
              { value: 'manual', label: 'Manual cards (below)' },
            ]}
            onChange={(source) => set({ source })}
          />
          <NumberInput label="How many cards" value={c.limit} min={1} max={12} placeholder="3" onChange={(limit) => set({ limit: limit ?? 3 })} />
          {c.source !== 'manual' ? (
            <Field label="Filter">
              <Toggle label="Featured only" checked={c.featuredOnly !== false} onChange={(featuredOnly) => set({ featuredOnly })} />
            </Field>
          ) : null}
          <TextInput label="Card link label" value={c.linkLabel} onChange={(linkLabel) => set({ linkLabel })} placeholder="View case study →" hint="Empty = hidden." />
        </div>
        {c.source === 'manual' ? (
          <ListEditor<HomeProjectCard>
            label="Manual cards"
            items={c.items || []}
            onChange={(items) => set({ items })}
            addLabel="Card"
            create={() => ({ title: 'New project', href: '/projects', media: [] })}
            itemTitle={(p) => `${p.hidden ? '[hidden] ' : ''}${p.title}`}
            renderItem={(p, patch) => (
              <>
                <div className="admin-form-grid">
                  <div className="full">
                    <Toggle label="Show this card" checked={!p.hidden} onChange={(on) => patch({ ...p, hidden: !on || undefined })} />
                  </div>
                  <TextInput label="Eyebrow" value={p.eyebrow} onChange={(eyebrow) => patch({ ...p, eyebrow })} placeholder="e.g. Solar · Pune" />
                  <TextInput label="Title" value={p.title} onChange={(title) => patch({ ...p, title })} />
                  <TextInput label="Stat" value={p.stat} onChange={(stat) => patch({ ...p, stat })} placeholder="e.g. 1.2 MW" />
                  <TextInput label="Link" value={p.href} onChange={(href) => patch({ ...p, href })} />
                  <TextArea label="Summary" rows={2} value={p.body} onChange={(body) => patch({ ...p, body })} />
                </div>
                <MediaItemsEditor
                  label="Card images / videos"
                  items={p.media || []}
                  onChange={(media) => patch({ ...p, media })}
                  showLabel={false}
                  showColor={false}
                  hint="Several images cross-fade inside the card."
                />
              </>
            )}
          />
        ) : null}
      </Group>
      <Group title="Grid & card style">
        <div className="admin-form-grid">
          <HomeColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="Design default" />
          <TextInput label="Card min height" value={card.minHeight} onChange={(minHeight) => setCard({ minHeight })} placeholder="Design default" />
          <TextInput label="Card min height (phone)" value={card.minHeightMobile} onChange={(minHeightMobile) => setCard({ minHeightMobile })} />
          <TextInput label="Radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="Design default" />
          <TextInput label="Border" value={card.border} onChange={(border) => setCard({ border })} placeholder="Design default" />
          <ColorInput label="Hover border color" value={card.hoverBorderColor} onChange={(hoverBorderColor) => setCard({ hoverBorderColor })} fallback="" />
          <ColorInput label="Background" value={card.background} onChange={(background) => setCard({ background })} fallback="" />
          <TextInput label="Shadow" value={card.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="Design default" />
          <NumberInput
            label="Seconds per card image"
            value={card.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="5"
            onChange={(intervalSeconds) => setCard({ intervalSeconds })}
          />
          <TextInput
            label="Image overlay gradient"
            value={card.overlay}
            onChange={(overlay) => setCard({ overlay })}
            placeholder="linear-gradient(180deg, transparent 30%, rgba(10,22,40,0.85))"
            full
          />
        </div>
      </Group>
      <Group title="Text styles (all cards)">
        <StyleEditor title="Eyebrow style" value={c.eyebrowStyle} onChange={(eyebrowStyle) => set({ eyebrowStyle })} />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} />
        <StyleEditor title="Stat style" value={c.statStyle} onChange={(statStyle) => set({ statStyle })} />
        <StyleEditor title="Summary style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} />
      </Group>
      <Group title="Buttons">
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} defaultVariant="ghost-dark" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Industries                                                          */
/* ------------------------------------------------------------------ */

function HomeIndustriesEditor({ content: c, onChange }: EditorProps<HomeIndustriesContent>) {
  const set = (patch: Partial<HomeIndustriesContent>) => onChange({ ...c, ...patch });
  const link = c.link || { label: '', href: '' };
  const setLink = (patch: Partial<HomeIndustriesContent['link']>) => set({ link: { ...link, ...patch } });
  const it = c.itemStyle || {};
  const setIt = (patch: Partial<HomeIndustriesContent['itemStyle']>) => set({ itemStyle: { ...it, ...patch } });
  const ic = c.iconStyle || {};
  const setIc = (patch: Partial<HomeIndustriesContent['iconStyle']>) => set({ iconStyle: { ...ic, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="base" />
      </Group>
      <Group title="Header link">
        <Toggle label="Show link next to the header" checked={!link.hidden} onChange={(on) => setLink({ hidden: !on })} />
        <div className="admin-form-grid">
          <TextInput label="Label" value={link.label} onChange={(label) => setLink({ label })} placeholder="All industries →" />
          <TextInput label="Link" value={link.href} onChange={(href) => setLink({ href })} placeholder="/industries" />
        </div>
        <StyleEditor title="Link style" value={link.style} onChange={(style) => setLink({ style })} allowHide={false} />
      </Group>
      <Group title="Industries" open>
        <div className="admin-form-grid">
          <SelectInput
            label="Display as"
            value={c.layout || 'marquee'}
            options={[
              { value: 'marquee', label: 'Scrolling marquee' },
              { value: 'grid', label: 'Grid' },
            ]}
            onChange={(layout) => set({ layout })}
          />
          <Field label="Links">
            <Toggle
              label="Link to /industries/… automatically (when the industries pages are enabled)"
              checked={c.autoLinks !== false}
              onChange={(autoLinks) => set({ autoLinks })}
            />
          </Field>
        </div>
        <ListEditor<HomeIndustryItem>
          label="Industries"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Industry"
          create={() => ({ label: 'New industry', icon: {} })}
          itemTitle={(i) => `${i.hidden ? '[hidden] ' : ''}${i.label}`}
          renderItem={(i, patch) => (
            <>
              <div className="admin-form-grid">
                <div className="full">
                  <Toggle label="Show this industry" checked={!i.hidden} onChange={(on) => patch({ ...i, hidden: !on || undefined })} />
                </div>
                <TextInput label="Label" value={i.label} onChange={(label) => patch({ ...i, label })} />
                <TextInput label="Link (optional)" value={i.href} onChange={(href) => patch({ ...i, href })} placeholder="Empty = automatic" />
              </div>
              <IconEditor
                label="Icon (empty = matched to the label)"
                value={i.icon || {}}
                onChange={(icon) => patch({ ...i, icon })}
                presets={HOME_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
            </>
          )}
        />
      </Group>
      <Group title={c.layout === 'grid' ? 'Grid columns' : 'Marquee motion'}>
        {c.layout === 'grid' ? (
          <div className="admin-form-grid">
            <HomeColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          </div>
        ) : (
          <MarqueeFields value={c.marquee} onChange={(marquee) => set({ marquee })} speedPlaceholder="Automatic" directionDefault="left" />
        )}
      </Group>
      <Group title="Item, icon & label style">
        <div className="admin-form-grid">
          <ColorInput label="Item background" value={it.background} onChange={(background) => setIt({ background })} fallback="" />
          <ColorInput label="Item border color" value={it.borderColor} onChange={(borderColor) => setIt({ borderColor })} fallback="" />
          <TextInput label="Border width" value={it.borderWidth} onChange={(borderWidth) => setIt({ borderWidth })} placeholder="1px" />
          <ColorInput label="Hover border color" value={it.hoverBorderColor} onChange={(hoverBorderColor) => setIt({ hoverBorderColor })} fallback="" />
          <TextInput label="Radius" value={it.radius} onChange={(radius) => setIt({ radius })} placeholder="10px" />
          <TextInput label="Padding" value={it.padding} onChange={(padding) => setIt({ padding })} placeholder="Design default" />
          <TextInput label="Min width (marquee)" value={it.minWidth} onChange={(minWidth) => setIt({ minWidth })} placeholder="11.5rem" />
          <TextInput label="Max width (marquee)" value={it.maxWidth} onChange={(maxWidth) => setIt({ maxWidth })} placeholder="16rem" />
          <Field label="Icons">
            <Toggle label="Show icons" checked={!ic.hidden} onChange={(on) => setIc({ hidden: !on })} />
          </Field>
          <TextInput label="Icon size" value={ic.size} onChange={(size) => setIc({ size })} placeholder="26px marquee / 32px grid" />
          <ColorInput label="Icon color" value={ic.color} onChange={(color) => setIc({ color })} fallback="" />
          <TextInput label="Icon stroke width" value={ic.strokeWidth} onChange={(strokeWidth) => setIc({ strokeWidth })} placeholder="1.6" />
        </div>
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials                                                        */
/* ------------------------------------------------------------------ */

function HomeTestimonialsEditor({ content: c, onChange }: EditorProps<HomeTestimonialsContent>) {
  const set = (patch: Partial<HomeTestimonialsContent>) => onChange({ ...c, ...patch });
  const card = c.card || {};
  const setCard = (patch: Partial<HomeTestimonialsContent['card']>) => set({ card: { ...card, ...patch } });
  const dots = c.dots || {};
  const setDots = (patch: Partial<HomeTestimonialsContent['dots']>) => set({ dots: { ...dots, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="base" />
      </Group>
      <Group title="Testimonials" open>
        <ListEditor<HomeTestimonial>
          label="Testimonials"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Testimonial"
          create={() => ({ quote: 'What the client said.', name: 'Client name', role: 'Role, Company' })}
          itemTitle={(t) => `${t.hidden ? '[hidden] ' : ''}${t.name}`}
          renderItem={(t, patch) => (
            <div className="admin-form-grid">
              <div className="full">
                <Toggle label="Show this testimonial" checked={!t.hidden} onChange={(on) => patch({ ...t, hidden: !on || undefined })} />
              </div>
              <TextArea label="Quote" rows={3} value={t.quote} onChange={(quote) => patch({ ...t, quote })} />
              <TextInput label="Name" value={t.name} onChange={(name) => patch({ ...t, name })} />
              <TextInput label="Role / company" value={t.role} onChange={(role) => patch({ ...t, role })} />
              <div className="full">
                <MediaPicker label="Photo (optional)" value={t.avatar || ''} onChange={(avatar) => patch({ ...t, avatar })} kinds={['image']} allowUpload compact />
              </div>
            </div>
          )}
        />
      </Group>
      <Group title="Rotation">
        <div className="admin-form-grid">
          <Field label="Behaviour">
            <Toggle label="Rotate automatically" checked={c.autoplay !== false} onChange={(autoplay) => set({ autoplay })} />
            <Toggle label="Pause while hovered" checked={Boolean(c.pauseOnHover)} onChange={(pauseOnHover) => set({ pauseOnHover })} />
            <Toggle label="Wrap quotes in quotation marks" checked={c.quoteMarks !== false} onChange={(quoteMarks) => set({ quoteMarks })} />
          </Field>
          <NumberInput label="Seconds per quote" value={c.intervalSeconds} min={2} step={0.5} placeholder="6" onChange={(intervalSeconds) => set({ intervalSeconds })} />
        </div>
      </Group>
      <Group title="Card, photo & dots">
        <div className="admin-form-grid">
          <ColorInput label="Card background" value={card.background} onChange={(background) => setCard({ background })} fallback="" />
          <TextInput label="Card border" value={card.border} onChange={(border) => setCard({ border })} placeholder="Design default" />
          <TextInput label="Card radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="Design default" />
          <TextInput label="Card padding" value={card.padding} onChange={(padding) => setCard({ padding })} placeholder="Design default" />
          <TextInput label="Card max width" value={card.maxWidth} onChange={(maxWidth) => setCard({ maxWidth })} placeholder="Design default" />
          <TextInput label="Photo size" value={c.avatarSize} onChange={(avatarSize) => set({ avatarSize })} placeholder="64px" />
          <Field label="Dots">
            <Toggle label="Show dots" checked={!dots.hidden} onChange={(on) => setDots({ hidden: !on })} />
          </Field>
          <ColorInput label="Dot color" value={dots.color} onChange={(color) => setDots({ color })} fallback="" />
          <ColorInput label="Active dot color" value={dots.activeColor} onChange={(activeColor) => setDots({ activeColor })} fallback="var(--orange)" />
        </div>
      </Group>
      <Group title="Text styles">
        <StyleEditor title="Quote style" value={c.quoteStyle} onChange={(quoteStyle) => set({ quoteStyle })} allowHide={false} />
        <StyleEditor title="Name style" value={c.nameStyle} onChange={(nameStyle) => set({ nameStyle })} allowHide={false} />
        <StyleEditor title="Role style" value={c.roleStyle} onChange={(roleStyle) => set({ roleStyle })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Partners                                                            */
/* ------------------------------------------------------------------ */

function HomePartnersEditor({ content: c, onChange }: EditorProps<HomePartnersContent>) {
  const set = (patch: Partial<HomePartnersContent>) => onChange({ ...c, ...patch });
  const card = c.card || {};
  const setCard = (patch: Partial<HomePartnersContent['card']>) => set({ card: { ...card, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" open>
        <HomeHeaderEditor value={c.header} onChange={(header) => set({ header })} scale="md" />
      </Group>
      <Group title="Logos" description="Upload or pick many at once; drag order with the arrows" open>
        <LogosEditor items={c.logos || []} onChange={(logos) => set({ logos })} />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <SelectInput
            label="Display as"
            value={c.layout || 'marquee'}
            options={[
              { value: 'marquee', label: 'Scrolling marquee' },
              { value: 'grid', label: 'Grid' },
            ]}
            onChange={(layout) => set({ layout })}
          />
          {c.layout === 'grid' ? (
            <HomeColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 6, tablet: 4, mobile: 2 }} />
          ) : null}
        </div>
        {c.layout !== 'grid' ? (
          <MarqueeFields value={c.marquee} onChange={(marquee) => set({ marquee })} speedPlaceholder="34" directionDefault="right" />
        ) : null}
      </Group>
      <Group title="Logo cards">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={card.background} onChange={(background) => setCard({ background })} fallback="#FFFFFF" />
          <TextInput label="Border" value={card.border} onChange={(border) => setCard({ border })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="10px" />
          <TextInput label="Padding" value={card.padding} onChange={(padding) => setCard({ padding })} placeholder="1.3rem 2.2rem" />
          <TextInput label="Shadow" value={card.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 2px 10px rgba(10,22,40,0.04)" />
          <TextInput label="Card height" value={card.height} onChange={(height) => setCard({ height })} placeholder="138px" />
          <TextInput label="Card height (phone)" value={card.heightMobile} onChange={(heightMobile) => setCard({ heightMobile })} placeholder="110px" />
          <TextInput label="Card min width (marquee)" value={card.minWidth} onChange={(minWidth) => setCard({ minWidth })} placeholder="370px" />
          <TextInput label="Card min width (phone)" value={card.minWidthMobile} onChange={(minWidthMobile) => setCard({ minWidthMobile })} placeholder="min(280px, 78vw)" />
          <TextInput label="Logo max height" value={card.logoMaxHeight} onChange={(logoMaxHeight) => setCard({ logoMaxHeight })} placeholder="92px" />
          <TextInput
            label="Logo max height (phone)"
            value={card.logoMaxHeightMobile}
            onChange={(logoMaxHeightMobile) => setCard({ logoMaxHeightMobile })}
            placeholder="72px"
          />
          <TextInput label="Logo max width" value={card.logoMaxWidth} onChange={(logoMaxWidth) => setCard({ logoMaxWidth })} placeholder="294px" />
          <Field label="Look">
            <Toggle label="Grayscale until hovered" checked={Boolean(card.grayscale)} onChange={(grayscale) => setCard({ grayscale })} />
          </Field>
        </div>
      </Group>
      <Group title="Note below logos">
        <TextElementEditor label="Note" multiline value={c.note} onChange={(note) => set({ note })} hint="Empty = hidden" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Certifications teaser                                               */
/* ------------------------------------------------------------------ */

function HomeCertEditor({ content: c, onChange }: EditorProps<HomeCertContent>) {
  const set = (patch: Partial<HomeCertContent>) => onChange({ ...c, ...patch });
  const b = c.badges || { items: [] };
  const setB = (patch: Partial<HomeCertContent['badges']>) => set({ badges: { ...b, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <BlockLayoutGroup c={c} set={set} maxWidthPlaceholder="Design default" />
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Certificate badges / logos" description="Optional row of certificate logos">
        <Toggle label="Show badges" checked={!b.hidden} onChange={(on) => setB({ hidden: !on })} />
        <MediaItemsEditor label="Badges" items={b.items || []} onChange={(items) => setB({ items })} allowVideo={false} showLabel={false} showColor={false} />
        <div className="admin-form-grid">
          <TextInput label="Badge height" value={b.height} onChange={(height) => setB({ height })} placeholder="56px" />
          <TextInput label="Badge height (phone)" value={b.heightMobile} onChange={(heightMobile) => setB({ heightMobile })} placeholder="44px" />
          <TextInput label="Gap" value={b.gap} onChange={(gap) => setB({ gap })} placeholder="1.2rem" />
          <Field label="Look">
            <Toggle label="Grayscale until hovered" checked={Boolean(b.grayscale)} onChange={(grayscale) => setB({ grayscale })} />
          </Field>
        </div>
      </Group>
      <Group title="Buttons">
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} defaultVariant="outline-cyan" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function HomeCtaEditor({ content: c, onChange }: EditorProps<HomeCtaContent>) {
  const set = (patch: Partial<HomeCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <BlockLayoutGroup c={c} set={set} maxWidthPlaceholder="Design default" />
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Buttons" open>
        <HomeCtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function HomeSectionEditor({
  type,
  content,
  onChange,
}: {
  type: HomeSectionType;
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
      <div className="az-admin lz-admin lgy-admin hm-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'home_hero' ? (
            <HomeHeroEditor content={withHomeDefaults<HomeHeroContent>(type, content)} onChange={emit} />
          ) : type === 'home_eco' ? (
            <HomeEcoEditor content={withHomeDefaults<HomeEcoContent>(type, content)} onChange={emit} />
          ) : type === 'home_stats' ? (
            <HomeStatsEditor content={withHomeDefaults<HomeStatsContent>(type, content)} onChange={emit} />
          ) : type === 'home_why' ? (
            <HomeWhyEditor content={withHomeDefaults<HomeWhyContent>(type, content)} onChange={emit} />
          ) : type === 'home_split' ? (
            <HomeSplitEditor content={withHomeDefaults<HomeSplitContent>(type, content)} onChange={emit} />
          ) : type === 'home_timeline' ? (
            <HomeTimelineEditor content={withHomeDefaults<HomeTimelineContent>(type, content)} onChange={emit} />
          ) : type === 'home_projects' ? (
            <HomeProjectsEditor content={withHomeDefaults<HomeProjectsContent>(type, content)} onChange={emit} />
          ) : type === 'home_industries' ? (
            <HomeIndustriesEditor content={withHomeDefaults<HomeIndustriesContent>(type, content)} onChange={emit} />
          ) : type === 'home_testimonials' ? (
            <HomeTestimonialsEditor content={withHomeDefaults<HomeTestimonialsContent>(type, content)} onChange={emit} />
          ) : type === 'home_partners' ? (
            <HomePartnersEditor content={withHomeDefaults<HomePartnersContent>(type, content)} onChange={emit} />
          ) : type === 'home_cert' ? (
            <HomeCertEditor content={withHomeDefaults<HomeCertContent>(type, content)} onChange={emit} />
          ) : type === 'home_cta' ? (
            <HomeCtaEditor content={withHomeDefaults<HomeCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
