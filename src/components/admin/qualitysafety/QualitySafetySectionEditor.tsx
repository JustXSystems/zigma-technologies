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
  LinkListEditor,
  ListEditor,
  PillsEditor,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { ColumnsEditor, HighlightEditor, LifeGroup as Group, LifeGroupProvider, MediaItemsEditor, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, SectionBoxGroup, VALIGN_OPTIONS } from '@/components/admin/legacy/LegacySectionEditor';
import { normalizeLinkItems, type ImageEl } from '@/lib/about-sections';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';
import { HERO_VALIGN_CHOICES } from '@/lib/hero-height';
import {
  QS_ALL_ICON_PRESETS,
  defaultQsCert,
  defaultQsCommitItem,
  defaultQsSafetyCard,
  defaultQsStep,
  defaultQsVerifyBox,
  withQsDefaults,
  type QsCert,
  type QsCertMeta,
  type QsCertsContent,
  type QsCommitContent,
  type QsCommitItem,
  type QsCtaContent,
  type QsHeroContent,
  type QsQualityContent,
  type QsSafetyCard,
  type QsSafetyContent,
  type QsSectionType,
  type QsStatItem,
  type QsStatsContent,
  type QsStep,
  type QsVerifyBox,
} from '@/lib/qualitysafety-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const FIT_OPTIONS = [
  { value: '', label: 'Default (cover)' },
  { value: 'cover', label: 'Cover (crop to fill)' },
  { value: 'contain', label: 'Contain (show whole)' },
  { value: 'fill', label: 'Stretch' },
] as const;

const STRETCH_OPTIONS = [
  { value: '', label: 'Default (equal height)' },
  { value: 'stretch', label: 'Equal height (design)' },
  { value: 'start', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'Bottom' },
] as const;

const CAPTION_POSITION_OPTIONS = [
  { value: 'bottom', label: 'Bottom (design)' },
  { value: 'top', label: 'Top' },
] as const;

/** Edit a string list with the link-list control (add, reorder, bulk paste). */
function StringListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (next: string[]) => void }) {
  return (
    <LinkListEditor
      label={label}
      items={(items || []).map((label) => ({ label }))}
      onChange={(next) => onChange(next.map((it) => it.label))}
      withHref={false}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

function QsHeroEditor({ content: c, onChange }: EditorProps<QsHeroContent>) {
  const set = (patch: Partial<QsHeroContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || {};
  const setLayout = (patch: Partial<QsHeroContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  const setBc = (patch: Partial<QsHeroContent['breadcrumb']>) => set({ breadcrumb: { ...bc, ...patch } });
  const scroll = c.scrollBar || {};
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background slideshow (images / videos)" withIndicators />
      <Group title="Layout, height & motion">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} fallback="auto" onChange={(heroHeight) => set({ heroHeight })} />
          <HeroPlacementEditor value={c.placement} onChange={(placement) => set({ placement })} />
          <AlignButtons label="Text align" value={layout.hAlign} onChange={(v) => setLayout({ hAlign: (v || undefined) as QsHeroContent['layout']['hAlign'] })} />
          <SelectInput
            label="Vertical position (full / custom height)"
            value={layout.vAlign || ''}
            options={HERO_VALIGN_CHOICES}
            onChange={(v) => setLayout({ vAlign: v || undefined })}
          />
          <TextInput label="Content max width" value={layout.maxWidth} onChange={(maxWidth) => setLayout({ maxWidth })} placeholder="820px" />
          <Field label="Behaviour">
            <Toggle label="Fade-up entrance animation" checked={c.entrance !== false} onChange={(entrance) => set({ entrance })} />
            <Toggle label="Scroll progress bar at the top of the page" checked={!scroll.hidden} onChange={(v) => set({ scrollBar: { ...scroll, hidden: !v } })} />
          </Field>
          <TextInput
            label="Scroll bar color / gradient"
            value={scroll.gradient}
            onChange={(gradient) => set({ scrollBar: { ...scroll, gradient } })}
            placeholder="linear-gradient(90deg,var(--orange),var(--yellow))"
          />
        </div>
        <p className="az-admin-hint">Spacing above / below the text is the section padding (defaults 11rem / 5rem, phones 8rem / 4rem).</p>
      </Group>
      <Group title="Breadcrumb">
        <Toggle label="Show breadcrumb" checked={!bc.hidden} onChange={(v) => setBc({ hidden: !v })} />
        <LinkListEditor label="Crumbs (last one = current page, leave its link empty)" items={normalizeLinkItems(bc.items)} onChange={(items) => setBc({ items })} />
        <div className="admin-form-grid">
          <TextInput label="Separator" value={bc.separator} onChange={(separator) => setBc({ separator })} placeholder="/" />
          <ColorInput label="Current page color" value={bc.currentColor} onChange={(currentColor) => setBc({ currentColor })} fallback="" hint="Empty = same as the links" />
          <ColorInput label="Link hover color" value={bc.hoverColor} onChange={(hoverColor) => setBc({ hoverColor })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Breadcrumb style (color, font, size…)" value={bc.style} onChange={(style) => setBc({ style })} allowHide={false} fontSizePlaceholder="0.78rem" />
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading (H1)" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="pageHero" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Lead paragraph">
        <TextElementEditor label="Lead" multiline value={c.lead} onChange={(lead) => set({ lead })} />
      </Group>
      <Group title="Chips" description="Short promise chips under the lead">
        <PillsEditor label="Chips" value={c.pills} onChange={(pills) => set({ pills })} />
      </Group>
      <Group title="Buttons" description="Optional call-to-action buttons under the chips">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Photo credit" description="Small text in the bottom-right corner">
        <TextElementEditor label="Credit" value={c.credit} onChange={(credit) => set({ credit })} hint="Empty = hidden" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

function QsStatsEditor({ content: c, onChange }: EditorProps<QsStatsContent>) {
  const set = (patch: Partial<QsStatsContent>) => onChange({ ...c, ...patch });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<QsStatsContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Stats" open description="Numbers count up when the bar scrolls into view">
        <ListEditor<QsStatItem>
          label="Stats"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Stat"
          create={() => ({ value: '100', suffix: '+', label: 'New stat' })}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.prefix || ''}${s.value}${s.suffix || ''} ${s.label}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number" value={s.value} onChange={(value) => patch({ ...s, value })} hint="Digits count up; other text shows as typed." />
                <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
                <TextInput label="Prefix" value={s.prefix} onChange={(prefix) => patch({ ...s, prefix })} placeholder="e.g. ₹" />
                <TextInput label="Suffix" value={s.suffix} onChange={(suffix) => patch({ ...s, suffix })} placeholder="+" />
                <ColorInput label="Number color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="#FFFFFF" hint="Empty = number style color" />
                <Field label="Visibility">
                  <Toggle label="Show this stat" checked={!s.hidden} onChange={(v) => patch({ ...s, hidden: !v })} />
                </Field>
              </div>
              <IconEditor label="Icon (optional, above the number)" value={s.icon || {}} onChange={(icon) => patch({ ...s, icon })} presets={QS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
      </Group>
      <Group title="Layout & animation">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 4, mobile: 2 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1rem" />
          <AlignButtons label="Text align" value={c.align} onChange={(v) => set({ align: (v || undefined) as QsStatsContent['align'] })} />
          <Field label="Behaviour">
            <Toggle label="Count numbers up when visible" checked={c.animateCount !== false} onChange={(animateCount) => set({ animateCount })} />
            <Toggle label="Lift on hover" checked={c.hoverLift !== false} onChange={(hoverLift) => set({ hoverLift })} />
            <Toggle label="Divider lines between stats" checked={Boolean(c.dividers)} onChange={(dividers) => set({ dividers })} />
          </Field>
          <NumberInput label="Count-up duration (ms)" value={c.countDurationMs} min={200} step={100} placeholder="1400" onChange={(countDurationMs) => set({ countDurationMs })} />
          <ColorInput label="Divider color" value={c.dividerColor} onChange={(dividerColor) => set({ dividerColor })} fallback="rgba(255,255,255,0.12)" />
        </div>
      </Group>
      <Group title="Number, label & icon style">
        <div className="admin-form-grid">
          <ColorInput label="Prefix / suffix color" value={c.suffixColor} onChange={(suffixColor) => set({ suffixColor })} fallback="var(--orange)" hint="Empty = same as the number" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIcon({ size })} placeholder="24px" />
          <ColorInput label="Icon color" value={is.color} onChange={(color) => setIcon({ color })} fallback="var(--orange)" />
          <TextInput label="Icon stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.8" />
        </div>
        <StyleEditor title="Number style" value={c.numberStyle} onChange={(numberStyle) => set({ numberStyle })} allowHide={false} fontSizePlaceholder="1.3rem (mono)" />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.7rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Quality approach                                                    */
/* ------------------------------------------------------------------ */

function QsQualityEditor({ content: c, onChange }: EditorProps<QsQualityContent>) {
  const set = (patch: Partial<QsQualityContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { mediaSide: 'left' };
  const setLayout = (patch: Partial<QsQualityContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const m = c.media;
  const setMedia = (patch: Partial<QsQualityContent['media']>) => set({ media: { ...m, ...patch } });
  const cap = m.caption || { title: { text: '' }, body: { text: '' } };
  const setCap = (patch: Partial<QsQualityContent['media']['caption']>) => setMedia({ caption: { ...cap, ...patch } });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<QsQualityContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIs = (patch: Partial<QsQualityContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Layout (photo + steps)">
        <div className="admin-form-grid">
          <AlignButtons label="Photo side" value={layout.mediaSide} options={['left', 'right']} onChange={(v) => setLayout({ mediaSide: (v || 'left') as 'left' | 'right' })} />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={STRETCH_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as QsQualityContent['layout']['alignItems'] })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="0.9fr 1.3fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="2.6rem (2.4rem stacked)" />
          <Field label="Tablet / phone (stacked)">
            <Toggle label="Show the photo above the steps" checked={layout.mobileMediaFirst !== false} onChange={(mobileMediaFirst) => setLayout({ mobileMediaFirst })} />
          </Field>
          <ColorInput label="Accent color" value={c.accentColor} onChange={(accentColor) => set({ accentColor })} fallback="var(--orange)" hint="Step numbers, icons and slide dots" />
        </div>
      </Group>
      <Group title="Photo / video panel" description="Add as many images / videos as you like; several cross-fade as a slideshow">
        <div className="admin-form-grid">
          <Field label="Panel">
            <Toggle label="Show the photo panel" checked={!m.hidden} onChange={(v) => setMedia({ hidden: !v })} />
            <Toggle label="Slow zoom-out when it scrolls into view" checked={m.zoomIn !== false} onChange={(zoomIn) => setMedia({ zoomIn })} />
            <Toggle label="Show slide dots" checked={m.showDots !== false} onChange={(showDots) => setMedia({ showDots })} />
            <Toggle label="Open full-screen on click (lightbox)" checked={m.lightbox !== false} onChange={(lightbox) => setMedia({ lightbox })} />
          </Field>
        </div>
        <MediaItemsEditor
          label="Panel images / videos"
          items={m.items || []}
          onChange={(items) => setMedia({ items })}
          showColor={false}
          hint="Title = alt text (and caption heading when “caption from each slide” is on); small label = caption text."
        />
        <div className="admin-form-grid">
          <NumberInput label="Seconds per slide" value={m.intervalSeconds} min={1} step={0.5} placeholder="4.5" onChange={(intervalSeconds) => setMedia({ intervalSeconds })} />
          <TextInput label="Min height" value={m.minHeight} onChange={(minHeight) => setMedia({ minHeight })} placeholder="420px" />
          <TextInput label="Min height (tablet / phone)" value={m.minHeightMobile} onChange={(minHeightMobile) => setMedia({ minHeightMobile })} placeholder="320px" />
          <TextInput label="Corner radius" value={m.radius} onChange={(radius) => setMedia({ radius })} placeholder="18px" />
          <TextInput label="Shadow" value={m.shadow} onChange={(shadow) => setMedia({ shadow })} placeholder="0 30px 60px -34px rgba(10,22,40,0.6)" />
          <TextInput label="Placeholder background" value={m.background} onChange={(background) => setMedia({ background })} placeholder="linear-gradient(135deg,var(--navy-900),#123058)" />
          <SelectInput label="Image fit" value={m.fit || ''} options={FIT_OPTIONS} onChange={(fit) => setMedia({ fit: (fit || undefined) as ImageEl['fit'] })} />
          <TextInput label="Focus position" value={m.position} onChange={(position) => setMedia({ position })} placeholder="center, 50% 30%" />
          <TextArea label="Overlay gradient" rows={2} value={m.overlay} onChange={(overlay) => setMedia({ overlay })} placeholder="linear-gradient(180deg,transparent 50%,rgba(10,22,40,0.45))" />
        </div>
      </Group>
      <Group title="Photo caption card">
        <div className="admin-form-grid">
          <Field label="Caption">
            <Toggle label="Show the caption card" checked={!cap.hidden} onChange={(v) => setCap({ hidden: !v })} />
            <Toggle label="Use each slide's title / small label instead" checked={Boolean(cap.fromItems)} onChange={(fromItems) => setCap({ fromItems })} />
            <Toggle label="Frosted glass blur" checked={cap.blur !== false} onChange={(blur) => setCap({ blur })} />
          </Field>
          <SelectInput label="Position" value={cap.position || 'bottom'} options={CAPTION_POSITION_OPTIONS} onChange={(position) => setCap({ position })} />
          <ColorInput label="Card background" value={cap.background} onChange={(background) => setCap({ background })} fallback="rgba(10,22,40,0.82)" />
          <TextInput label="Card radius" value={cap.radius} onChange={(radius) => setCap({ radius })} placeholder="12px" />
        </div>
        <TextElementEditor label="Caption title" value={cap.title} onChange={(title) => setCap({ title })} />
        <TextElementEditor label="Caption text" multiline value={cap.body} onChange={(body) => setCap({ body })} />
      </Group>
      <Group title="Process steps" open description="Number, title, text, optional icon and images / videos per step">
        <ListEditor<QsStep>
          label="Steps"
          items={c.steps || []}
          onChange={(steps) => set({ steps })}
          addLabel="Step"
          create={defaultQsStep}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.num ? `${s.num} · ` : ''}${s.title?.text || 'Step'}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number" value={s.num} onChange={(num) => patch({ ...s, num })} placeholder="01" />
                <ColorInput label="Accent color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="" hint="Empty = section accent" />
                <Field label="Visibility">
                  <Toggle label="Show this step" checked={!s.hidden} onChange={(v) => patch({ ...s, hidden: !v })} />
                </Field>
              </div>
              <TextElementEditor label="Title" headingTag value={s.title} onChange={(title) => patch({ ...s, title })} />
              <TextElementEditor label="Text" multiline value={s.body} onChange={(body) => patch({ ...s, body })} />
              <IconEditor label="Icon (optional, beside the number)" value={s.icon || {}} onChange={(icon) => patch({ ...s, icon })} presets={QS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              <MediaItemsEditor
                label="Step images / videos (optional, shown at the top)"
                items={s.media || []}
                onChange={(media) => patch({ ...s, media })}
                showLabel={false}
                showColor={false}
              />
            </>
          )}
        />
      </Group>
      <Group title="Step grid & card style">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 2, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <Field label="Animation">
            <Toggle label="Reveal steps on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '16px', padding: '1.8rem 1.5rem', shadow: '0 14px 30px -24px rgba(10,22,40,0.4)' }}
        >
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="0 24px 44px -26px rgba(10,22,40,0.55)" />
          <TextInput label="Card media height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="150px" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Step icon style" description="Only used by steps with an icon">
        <div className="admin-form-grid">
          <TextInput label="Box size" value={is.boxSize} onChange={(boxSize) => setIs({ boxSize })} placeholder="40px" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIs({ size })} placeholder="20px" />
          <TextInput label="Corner radius" value={is.radius} onChange={(radius) => setIs({ radius })} placeholder="10px" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIs({ strokeWidth })} placeholder="1.8" />
          <ColorInput label="Box background" value={is.background} onChange={(background) => setIs({ background })} fallback="" hint="Empty = light tint of the accent" />
        </div>
      </Group>
      <Group title="Step text styles">
        <StyleEditor title="Number style" value={c.numStyle} onChange={(numStyle) => set({ numStyle })} allowHide={false} fontSizePlaceholder="0.85rem (mono)" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.2rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Safety first                                                        */
/* ------------------------------------------------------------------ */

function QsSafetyEditor({ content: c, onChange }: EditorProps<QsSafetyContent>) {
  const set = (patch: Partial<QsSafetyContent>) => onChange({ ...c, ...patch });
  const g = c.gallery;
  const setG = (patch: Partial<QsSafetyContent['gallery']>) => set({ gallery: { ...g, ...patch } });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<QsSafetyContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIs = (patch: Partial<QsSafetyContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Photo gallery (images / videos)" description="Add as many as you like; each tile shows its caption and a small second line">
        <div className="admin-form-grid">
          <Field label="Gallery">
            <Toggle label="Show the gallery" checked={!g.hidden} onChange={(v) => setG({ hidden: !v })} />
            <Toggle label="Show captions" checked={g.captions !== false} onChange={(captions) => setG({ captions })} />
            <Toggle label="Lift and zoom on hover" checked={g.hoverZoom !== false} onChange={(hoverZoom) => setG({ hoverZoom })} />
            <Toggle label="Open full-screen on click (lightbox)" checked={g.lightbox !== false} onChange={(lightbox) => setG({ lightbox })} />
          </Field>
        </div>
        <MediaItemsEditor
          label="Gallery images / videos"
          items={g.items || []}
          onChange={(items) => setG({ items })}
          hint="Title = caption (also alt text); small label = second caption line; color = tile tint while loading."
        />
        <div className="admin-form-grid">
          <ColumnsEditor value={g.columns} onChange={(columns) => setG({ columns })} defaults={{ desktop: 3, tablet: 3, mobile: 1 }} />
          <TextInput label="Gap" value={g.gap} onChange={(gap) => setG({ gap })} placeholder="1.2rem" />
          <TextInput label="Tile aspect ratio" value={g.aspectRatio} onChange={(aspectRatio) => setG({ aspectRatio })} placeholder="4/3" />
          <TextInput label="Tile corner radius" value={g.radius} onChange={(radius) => setG({ radius })} placeholder="16px" />
          <TextInput label="Space below gallery" value={g.marginBottom} onChange={(marginBottom) => setG({ marginBottom })} placeholder="1.6rem" />
          <SelectInput label="Image fit" value={g.fit || ''} options={FIT_OPTIONS} onChange={(fit) => setG({ fit: (fit || undefined) as ImageEl['fit'] })} />
          <TextInput label="Focus position" value={g.position} onChange={(position) => setG({ position })} placeholder="center, 50% 30%" />
          <TextArea label="Overlay gradient" rows={2} value={g.overlay} onChange={(overlay) => setG({ overlay })} placeholder="linear-gradient(180deg,transparent 40%,rgba(10,22,40,0.3))" />
        </div>
        <StyleEditor title="Caption style" value={g.captionStyle} onChange={(captionStyle) => setG({ captionStyle })} allowHide={false} fontSizePlaceholder="1rem" />
        <StyleEditor title="Caption second line style" value={g.subCaptionStyle} onChange={(subCaptionStyle) => setG({ subCaptionStyle })} allowHide={false} fontSizePlaceholder="0.78rem" />
      </Group>
      <Group title="Safety habit cards" open description="Accent color drives the icon, hover border and glow">
        <ListEditor<QsSafetyCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={defaultQsSafetyCard}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.title?.text || 'Card'}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="var(--orange)" />
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!card.hidden} onChange={(v) => patch({ ...card, hidden: !v })} />
                </Field>
              </div>
              <IconEditor label="Icon" value={card.icon || {}} onChange={(icon) => patch({ ...card, icon })} presets={QS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Text" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <MediaItemsEditor
                label="Card images / videos (optional, shown at the top)"
                items={card.media || []}
                onChange={(media) => patch({ ...card, media })}
                showLabel={false}
                showColor={false}
              />
            </>
          )}
        />
      </Group>
      <Group title="Card grid & style">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <Field label="Animation">
            <Toggle label="Reveal gallery and cards on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(60,110,170,0.18)', radius: '16px', padding: '1.8rem 1.6rem' }}
        >
          <TextInput label="Card media height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="150px" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
            <Toggle label="Border turns the accent color" checked={cs.hoverBorder !== false} onChange={(hoverBorder) => setCs({ hoverBorder })} />
            <Toggle label="Glow in the accent color" checked={cs.hoverGlow !== false} onChange={(hoverGlow) => setCs({ hoverGlow })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Card icon style" description="Per-card icon settings override these">
        <div className="admin-form-grid">
          <TextInput label="Box size" value={is.boxSize} onChange={(boxSize) => setIs({ boxSize })} placeholder="52px" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIs({ size })} placeholder="26px" />
          <TextInput label="Corner radius" value={is.radius} onChange={(radius) => setIs({ radius })} placeholder="14px" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIs({ strokeWidth })} placeholder="1.8" />
          <ColorInput label="Box background" value={is.background} onChange={(background) => setIs({ background })} fallback="#FFFFFF" />
          <TextInput label="Box border" value={is.border} onChange={(border) => setIs({ border })} placeholder="1px solid rgba(60,110,170,0.18)" />
          <Field label="Hover">
            <Toggle label="Fill the box with the accent color" checked={Boolean(is.hoverFill)} onChange={(hoverFill) => setIs({ hoverFill })} />
          </Field>
        </div>
      </Group>
      <Group title="Card text styles">
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.15rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates & approvals                                            */
/* ------------------------------------------------------------------ */

function QsCertsEditor({ content: c, onChange }: EditorProps<QsCertsContent>) {
  const set = (patch: Partial<QsCertsContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<QsCertsContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const seal = c.seal || {};
  const setSeal = (patch: Partial<QsCertsContent['seal']>) => set({ seal: { ...seal, ...patch } });
  const v = c.verify;
  const setV = (patch: Partial<QsCertsContent['verify']>) => set({ verify: { ...v, ...patch } });
  const bs = v.boxStyle || {};
  const setBs = (patch: Partial<QsCertsContent['verify']['boxStyle']>) => setV({ boxStyle: { ...bs, ...patch } });
  const cta = c.cta;
  const setCta = (patch: Partial<QsCertsContent['cta']>) => set({ cta: { ...cta, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Certificates" open description="Seal icon, title, scope, detail rows and optional certificate scans / download link">
        <ListEditor<QsCert>
          label="Certificates"
          items={c.certs || []}
          onChange={(certs) => set({ certs })}
          addLabel="Certificate"
          create={defaultQsCert}
          itemTitle={(cert) => `${cert.hidden ? '(hidden) ' : ''}${cert.title?.text || 'Certificate'}`}
          renderItem={(cert, patch) => (
            <>
              <div className="admin-form-grid">
                <ColorInput label="Accent color (seal + links)" value={cert.color} onChange={(color) => patch({ ...cert, color })} fallback="var(--green)" />
                <Field label="Visibility">
                  <Toggle label="Show this certificate" checked={!cert.hidden} onChange={(val) => patch({ ...cert, hidden: !val })} />
                </Field>
              </div>
              <IconEditor label="Seal icon" value={cert.icon || {}} onChange={(icon) => patch({ ...cert, icon })} presets={QS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              <TextElementEditor label="Title" headingTag value={cert.title} onChange={(title) => patch({ ...cert, title })} />
              <TextElementEditor label="Scope" multiline value={cert.scope} onChange={(scope) => patch({ ...cert, scope })} />
              <ListEditor<QsCertMeta>
                label="Detail rows"
                items={cert.meta || []}
                onChange={(meta) => patch({ ...cert, meta })}
                addLabel="Row"
                create={() => ({ label: 'Issued by', value: '' })}
                itemTitle={(row) => `${row.label || 'Row'}: ${row.value || '—'}${row.pending ? ' (to add)' : ''}`}
                renderItem={(row, patchRow) => (
                  <div className="admin-form-grid">
                    <TextInput label="Label" value={row.label} onChange={(label) => patchRow({ ...row, label })} placeholder="Certificate no." />
                    <TextInput label="Value" value={row.value} onChange={(value) => patchRow({ ...row, value })} placeholder="e.g. QMS/12345 or 31 Mar 2027" />
                    <Field label="Status">
                      <Toggle label="Not filled in yet (amber highlight)" checked={Boolean(row.pending)} onChange={(pending) => patchRow({ ...row, pending })} />
                    </Field>
                  </div>
                )}
              />
              <MediaItemsEditor
                label="Certificate scans / photos (optional, open in a viewer)"
                items={cert.media || []}
                onChange={(media) => patch({ ...cert, media })}
                showLabel={false}
                showColor={false}
                hint="Adds a “View certificate” link; add several pages to browse them in the viewer."
              />
              <div className="admin-form-grid">
                <TextInput label="Download / detail link (optional)" value={cert.href} onChange={(href) => patch({ ...cert, href })} placeholder="/uploads/iso-9001.pdf" />
                <TextInput label="Link label" value={cert.linkLabel} onChange={(linkLabel) => patch({ ...cert, linkLabel })} placeholder="Download" />
                <Field label="Link">
                  <Toggle label="Open in a new tab" checked={Boolean(cert.newTab)} onChange={(newTab) => patch({ ...cert, newTab })} />
                </Field>
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Certificate grid & card style">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <TextInput label="“View certificate” label" value={c.viewLabel} onChange={(viewLabel) => set({ viewLabel })} placeholder="View certificate" />
          <Field label="Behaviour">
            <Toggle label="Reveal cards and boxes on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Open certificate scans in a viewer" checked={c.lightbox !== false} onChange={(lightbox) => set({ lightbox })} />
          </Field>
        </div>
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '16px', padding: '1.6rem 1.5rem 1.4rem', shadow: '0 14px 30px -26px rgba(10,22,40,0.5)' }}
        >
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="0 24px 44px -26px rgba(10,22,40,0.55)" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Seal (spinning badge)">
        <div className="admin-form-grid">
          <Field label="Seal">
            <Toggle label="Show the seal" checked={!seal.hidden} onChange={(val) => setSeal({ hidden: !val })} />
            <Toggle label="Spin animation" checked={seal.spin !== false} onChange={(spin) => setSeal({ spin })} />
            <Toggle label="Show the first certificate scan instead (when added)" checked={Boolean(seal.useImage)} onChange={(useImage) => setSeal({ useImage })} />
          </Field>
          <TextInput label="Seal size" value={seal.size} onChange={(size) => setSeal({ size })} placeholder="64px" />
          <TextInput label="Icon size" value={seal.iconSize} onChange={(iconSize) => setSeal({ iconSize })} placeholder="26px" />
          <ColorInput label="Inner color" value={seal.innerColor} onChange={(innerColor) => setSeal({ innerColor })} fallback="var(--navy-900)" />
          <NumberInput label="Seconds per turn" value={seal.spinSeconds} min={2} step={1} placeholder="14" onChange={(spinSeconds) => setSeal({ spinSeconds })} />
        </div>
      </Group>
      <Group title="Certificate text styles">
        <div className="admin-form-grid">
          <ColorInput label="“Not filled in yet” color" value={c.pendingColor} onChange={(pendingColor) => set({ pendingColor })} fallback="#B45309" />
        </div>
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.1rem" />
        <StyleEditor title="Scope style" value={c.scopeStyle} onChange={(scopeStyle) => set({ scopeStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
        <StyleEditor title="Detail label style" value={c.metaLabelStyle} onChange={(metaLabelStyle) => set({ metaLabelStyle })} allowHide={false} fontSizePlaceholder="0.8rem" />
        <StyleEditor title="Detail value style" value={c.metaValueStyle} onChange={(metaValueStyle) => set({ metaValueStyle })} allowHide={false} fontSizePlaceholder="0.76rem (mono)" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.74rem" />
      </Group>
      <Group title="Verification boxes" description="Checklist and chip boxes under the certificates">
        <Toggle label="Show verification boxes" checked={!v.hidden} onChange={(val) => setV({ hidden: !val })} />
        <ListEditor<QsVerifyBox>
          label="Boxes"
          items={v.boxes || []}
          onChange={(boxes) => setV({ boxes })}
          addLabel="Box"
          create={defaultQsVerifyBox}
          itemTitle={(b) => `${b.hidden ? '(hidden) ' : ''}${b.title?.text || 'Box'}`}
          renderItem={(b, patch) => (
            <>
              <Toggle label="Show this box" checked={!b.hidden} onChange={(val) => patch({ ...b, hidden: !val })} />
              <TextElementEditor label="Title" headingTag value={b.title} onChange={(title) => patch({ ...b, title })} />
              <StringListEditor label="Checklist rows" items={b.list} onChange={(list) => patch({ ...b, list })} />
              <StringListEditor label="Chips" items={b.chips} onChange={(chips) => patch({ ...b, chips })} />
              <TextElementEditor label="Note" multiline value={b.note} onChange={(note) => patch({ ...b, note })} hint="Optional; empty = hidden" />
            </>
          )}
        />
        <div className="admin-form-grid">
          <ColumnsEditor value={v.columns} onChange={(columns) => setV({ columns })} defaults={{ desktop: 2, tablet: 1, mobile: 1 }} />
          <TextInput label="Gap" value={v.gap} onChange={(gap) => setV({ gap })} placeholder="1.4rem" />
          <TextInput label="Space above" value={v.marginTop} onChange={(marginTop) => setV({ marginTop })} placeholder="3rem" />
          <ColorInput label="Check mark color" value={v.checkColor} onChange={(checkColor) => setV({ checkColor })} fallback="var(--green)" />
        </div>
      </Group>
      <Group title="Verification box style">
        <div className="admin-form-grid">
          <TextInput label="Background" value={bs.background} onChange={(background) => setBs({ background })} placeholder="#FFFFFF" />
          <TextInput label="Border" value={bs.border} onChange={(border) => setBs({ border })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Radius" value={bs.radius} onChange={(radius) => setBs({ radius })} placeholder="16px" />
          <TextInput label="Padding" value={bs.padding} onChange={(padding) => setBs({ padding })} placeholder="1.6rem" />
          <TextInput label="Shadow" value={bs.shadow} onChange={(shadow) => setBs({ shadow })} placeholder="none" />
        </div>
        <StyleEditor title="Box title style" value={v.titleStyle} onChange={(titleStyle) => setV({ titleStyle })} allowHide={false} fontSizePlaceholder="1.1rem" />
        <StyleEditor title="Checklist row style" value={v.itemStyle} onChange={(itemStyle) => setV({ itemStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
        <StyleEditor title="Chip style" value={v.chipStyle} onChange={(chipStyle) => setV({ chipStyle })} allowHide={false} fontSizePlaceholder="0.72rem (mono)" />
        <StyleEditor title="Note style" value={v.noteStyle} onChange={(noteStyle) => setV({ noteStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
      </Group>
      <Group title="Request-certificates bar" description="Dark call-to-action bar at the bottom of the section">
        <Toggle label="Show the bar" checked={!cta.hidden} onChange={(val) => setCta({ hidden: !val })} />
        <TextElementEditor label="Title" value={cta.title} onChange={(title) => setCta({ title })} />
        <TextElementEditor label="Text" multiline value={cta.body} onChange={(body) => setCta({ body })} />
        <NapHint />
        <CtaListEditor value={cta.ctas} onChange={(ctas) => setCta({ ctas })} />
        <div className="admin-form-grid">
          <TextInput label="Background" value={cta.background} onChange={(background) => setCta({ background })} placeholder="var(--navy-900)" />
          <TextInput label="Border" value={cta.border} onChange={(border) => setCta({ border })} placeholder="none" />
          <TextInput label="Radius" value={cta.radius} onChange={(radius) => setCta({ radius })} placeholder="16px" />
          <TextInput label="Padding" value={cta.padding} onChange={(padding) => setCta({ padding })} placeholder="1.5rem 1.8rem" />
          <TextInput label="Space above" value={cta.marginTop} onChange={(marginTop) => setCta({ marginTop })} placeholder="2rem" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Our commitment                                                      */
/* ------------------------------------------------------------------ */

function QsCommitEditor({ content: c, onChange }: EditorProps<QsCommitContent>) {
  const set = (patch: Partial<QsCommitContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { listSide: 'right' };
  const setLayout = (patch: Partial<QsCommitContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const st = c.itemStyle || {};
  const setSt = (patch: Partial<QsCommitContent['itemStyle']>) => set({ itemStyle: { ...st, ...patch } });
  const is = c.iconStyle || {};
  const setIs = (patch: Partial<QsCommitContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background photo / video" />
      <Group title="Layout (text + list)">
        <div className="admin-form-grid">
          <AlignButtons label="List side" value={layout.listSide} options={['left', 'right']} onChange={(val) => setLayout({ listSide: (val || 'right') as 'left' | 'right' })} />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={VALIGN_OPTIONS}
            onChange={(val) => setLayout({ alignItems: (val || undefined) as QsCommitContent['layout']['alignItems'] })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="1fr 1.1fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="3.5rem (2.4rem stacked)" />
          <Field label="Animation">
            <Toggle label="Reveal text and items on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Buttons" description="Optional buttons under the text">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Commitment items" open>
        <ListEditor<QsCommitItem>
          label="Items"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Item"
          create={defaultQsCommitItem}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.title?.text || 'Item'}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <ColorInput label="Icon color" value={it.color} onChange={(color) => patch({ ...it, color })} fallback="" hint="Empty = icon style color" />
                <Field label="Visibility">
                  <Toggle label="Show this item" checked={!it.hidden} onChange={(val) => patch({ ...it, hidden: !val })} />
                </Field>
              </div>
              <IconEditor label="Icon" value={it.icon || {}} onChange={(icon) => patch({ ...it, icon })} presets={QS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              <TextElementEditor label="Title" value={it.title} onChange={(title) => patch({ ...it, title })} />
              <TextElementEditor label="Text" multiline value={it.body} onChange={(body) => patch({ ...it, body })} />
            </>
          )}
        />
      </Group>
      <Group title="Item box style">
        <CardStyleFields
          value={st}
          onChange={setSt}
          placeholders={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', radius: '14px', padding: '1.2rem 1.3rem' }}
        >
          <TextInput label="Gap between items" value={st.gap} onChange={(gap) => setSt({ gap })} placeholder="1rem" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={Boolean(st.hoverLift)} onChange={(hoverLift) => setSt({ hoverLift })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Item icon & text styles">
        <div className="admin-form-grid">
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIs({ size })} placeholder="24px" />
          <ColorInput label="Icon color" value={is.color} onChange={(color) => setIs({ color })} fallback="var(--green)" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIs({ strokeWidth })} placeholder="1.8" />
        </div>
        <StyleEditor title="Item title style" value={c.itemTitleStyle} onChange={(itemTitleStyle) => set({ itemTitleStyle })} allowHide={false} fontSizePlaceholder="1.05rem" />
        <StyleEditor title="Item text style" value={c.itemBodyStyle} onChange={(itemBodyStyle) => set({ itemBodyStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function QsCtaEditor({ content: c, onChange }: EditorProps<QsCtaContent>) {
  const set = (patch: Partial<QsCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background images / videos" />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as QsCtaContent['align'] })} />
          <TextInput label="Content max width" value={c.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="780px" />
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} />
      </Group>
      <Group title="Buttons" open>
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function QualitySafetySectionEditor({
  type,
  content,
  onChange,
}: {
  type: QsSectionType;
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
      <div className="az-admin lz-admin lgy-admin qs-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'qs_hero' ? (
            <QsHeroEditor content={withQsDefaults<QsHeroContent>(type, content)} onChange={emit} />
          ) : type === 'qs_stats' ? (
            <QsStatsEditor content={withQsDefaults<QsStatsContent>(type, content)} onChange={emit} />
          ) : type === 'qs_quality' ? (
            <QsQualityEditor content={withQsDefaults<QsQualityContent>(type, content)} onChange={emit} />
          ) : type === 'qs_safety' ? (
            <QsSafetyEditor content={withQsDefaults<QsSafetyContent>(type, content)} onChange={emit} />
          ) : type === 'qs_certs' ? (
            <QsCertsEditor content={withQsDefaults<QsCertsContent>(type, content)} onChange={emit} />
          ) : type === 'qs_commit' ? (
            <QsCommitEditor content={withQsDefaults<QsCommitContent>(type, content)} onChange={emit} />
          ) : type === 'qs_cta' ? (
            <QsCtaEditor content={withQsDefaults<QsCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
