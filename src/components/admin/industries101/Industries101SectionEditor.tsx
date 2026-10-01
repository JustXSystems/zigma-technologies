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
import { BgMediaGroup, CardStyleFields, SectionBoxGroup, VALIGN_OPTIONS } from '@/components/admin/legacy/LegacySectionEditor';
import { normalizeLinkItems, type ImageEl } from '@/lib/about-sections';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';
import HeroMotionFields from '@/components/admin/HeroMotionFields';
import {
  IND101_ALL_ICON_PRESETS,
  defaultInd101Card,
  defaultInd101CollageCells,
  withIndustries101Defaults,
  type Ind101Card,
  type Ind101CategoryContent,
  type Ind101CollageCell,
  type Ind101CtaContent,
  type Ind101HeroContent,
  type Ind101MediaMode,
  type Ind101StatItem,
  type Ind101StatsContent,
  type Ind101SubnavContent,
  type Ind101SubnavItem,
  type Ind101TagPosition,
  type Ind101Transition,
  type Ind101VAlign,
  type Industries101SectionType,
} from '@/lib/industries101-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const TRANSITION_OPTIONS: Array<{ value: Ind101Transition; label: string }> = [
  { value: 'slide', label: 'Slide (design)' },
  { value: 'fade', label: 'Cross-fade' },
];

const DIRECTION_OPTIONS = [
  { value: 'ltr', label: 'Left → right (design)' },
  { value: 'rtl', label: 'Right → left' },
] as const;

const HERO_VALIGN_OPTIONS: Array<{ value: Ind101VAlign; label: string }> = [
  { value: 'bottom', label: 'Bottom (design)' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
];

const MEDIA_MODE_OPTIONS: Array<{ value: Ind101MediaMode; label: string }> = [
  { value: 'collage', label: 'Floating collage (design)' },
  { value: 'slideshow', label: 'Slideshow (cross-fade)' },
  { value: 'grid', label: 'Tiled grid' },
];

const TAG_POSITION_OPTIONS: Array<{ value: Ind101TagPosition; label: string }> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

const FIT_OPTIONS = [
  { value: '', label: 'Default (cover)' },
  { value: 'cover', label: 'Cover (crop to fill)' },
  { value: 'contain', label: 'Contain (show whole)' },
  { value: 'fill', label: 'Stretch' },
] as const;

const STAT_LAYOUT_OPTIONS = [
  { value: 'row', label: 'Icon beside the number (design)' },
  { value: 'stacked', label: 'Icon above the number' },
] as const;

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

function Ind101HeroEditor({ content: c, onChange }: EditorProps<Ind101HeroContent>) {
  const set = (patch: Partial<Ind101HeroContent>) => onChange({ ...c, ...patch });
  const slider = c.slider || { transition: 'slide' };
  const setSlider = (patch: Partial<Ind101HeroContent['slider']>) => set({ slider: { ...slider, ...patch } });
  const dots = c.dots || {};
  const setDots = (patch: Partial<Ind101HeroContent['dots']>) => set({ dots: { ...dots, ...patch } });
  const layout = c.layout || {};
  const setLayout = (patch: Partial<Ind101HeroContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  const setBc = (patch: Partial<Ind101HeroContent['breadcrumb']>) => set({ breadcrumb: { ...bc, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background slideshow (images / videos)" withIndicators />
      <Group title="Slide transition & dots" description="How slides change and how the slide indicators look">
        <div className="admin-form-grid">
          <SelectInput label="Transition" value={slider.transition || 'slide'} options={TRANSITION_OPTIONS} onChange={(transition) => setSlider({ transition })} />
          <SelectInput label="Slide direction" value={slider.direction || 'ltr'} options={DIRECTION_OPTIONS} onChange={(direction) => setSlider({ direction })} />
          <NumberInput
            label="Transition length (ms)"
            value={slider.durationMs}
            min={200}
            step={50}
            placeholder="900"
            onChange={(durationMs) => setSlider({ durationMs })}
          />
          <AlignButtons label="Dots position" value={dots.position} onChange={(v) => setDots({ position: (v || undefined) as Ind101HeroContent['dots']['position'] })} />
          <ColorInput label="Dot color" value={dots.color} onChange={(color) => setDots({ color })} fallback="rgba(255,255,255,0.35)" />
          <TextInput label="Dot width" value={dots.width} onChange={(width) => setDots({ width })} placeholder="34px (24px on phones)" />
          <TextInput label="Active dot width" value={dots.activeWidth} onChange={(activeWidth) => setDots({ activeWidth })} placeholder="54px (40px on phones)" />
          <TextInput label="Dot thickness" value={dots.height} onChange={(height) => setDots({ height })} placeholder="4px" />
          <TextInput label="Distance from bottom" value={dots.bottom} onChange={(bottom) => setDots({ bottom })} placeholder="2.6rem (1.6rem on tablet / phone)" />
        </div>
        <p className="az-admin-hint">Turn the dots on / off and set the active dot color in the slideshow group above.</p>
      </Group>
      <Group title="Layout, height & motion">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} onChange={(heroHeight) => set({ heroHeight })} />
          <HeroPlacementEditor value={c.placement} onChange={(placement) => set({ placement })} />
          <SelectInput label="Vertical position (full height)" value={layout.vAlign || 'bottom'} options={HERO_VALIGN_OPTIONS} onChange={(vAlign) => setLayout({ vAlign })} />
          <AlignButtons label="Text align" value={layout.hAlign} onChange={(v) => setLayout({ hAlign: (v || undefined) as Ind101HeroContent['layout']['hAlign'] })} />
          <TextInput label="Content max width" value={layout.maxWidth} onChange={(maxWidth) => setLayout({ maxWidth })} placeholder="760px" />
        </div>
        <HeroMotionFields
          entrance={c.entrance !== false}
          onEntrance={(entrance) => set({ entrance })}
          scrollBar={c.scrollBar}
          onScrollBar={(scrollBar) => set({ scrollBar })}
        />
        <p className="az-admin-hint">Spacing above / below the text is the section padding (defaults 9rem / 7.4rem, phones 7rem / 4.75rem).</p>
      </Group>
      <Group title="Breadcrumb">
        <Toggle label="Show breadcrumb" checked={!bc.hidden} onChange={(v) => setBc({ hidden: !v })} />
        <LinkListEditor
          label="Crumbs (last one = current page, leave its link empty)"
          items={normalizeLinkItems(bc.items)}
          onChange={(items) => setBc({ items })}
        />
        <div className="admin-form-grid">
          <TextInput label="Separator" value={bc.separator} onChange={(separator) => setBc({ separator })} placeholder="/" />
          <ColorInput label="Current page color" value={bc.currentColor} onChange={(currentColor) => setBc({ currentColor })} fallback="var(--cyan)" />
          <ColorInput label="Link hover color" value={bc.hoverColor} onChange={(hoverColor) => setBc({ hoverColor })} fallback="#FFFFFF" />
        </div>
        <StyleEditor title="Breadcrumb style (links color, font, size…)" value={bc.style} onChange={(style) => setBc({ style })} allowHide={false} />
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading (H1)" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="pageHero" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Lead paragraph">
        <TextElementEditor label="Lead" multiline value={c.lead} onChange={(lead) => set({ lead })} />
      </Group>
      <Group title="Pills" description="Optional chips under the lead (hidden by default)">
        <PillsEditor value={c.pills} onChange={(pills) => set({ pills })} />
      </Group>
      <Group title="Buttons" description="Optional call-to-action buttons">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky category sub-nav                                             */
/* ------------------------------------------------------------------ */

function Ind101SubnavEditor({ content: c, onChange }: EditorProps<Ind101SubnavContent>) {
  const set = (patch: Partial<Ind101SubnavContent>) => onChange({ ...c, ...patch });
  const bar = c.bar || {};
  const setBar = (patch: Partial<Ind101SubnavContent['bar']>) => set({ bar: { ...bar, ...patch } });
  return (
    <>
      <Group title="Category pills" open description="Each pill scrolls to a section on this page and lights up while that section is on screen">
        <ListEditor<Ind101SubnavItem>
          label="Pills"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Pill"
          create={() => ({ label: 'New category', target: 'cat-new', color: 'var(--cyan)' })}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.label} → #${it.target || '—'}`}
          renderItem={(it, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={it.label} onChange={(label) => patch({ ...it, label })} />
              <TextInput
                label="Target section key"
                value={it.target}
                onChange={(target) => patch({ ...it, target: target.replace(/^#/, '') })}
                placeholder="cat-infra"
                hint="The section key (anchor) of a section on this page."
              />
              <ColorInput label="Accent color" value={it.color} onChange={(color) => patch({ ...it, color })} fallback="var(--cyan)" />
              <TextInput
                label="Link instead (optional)"
                value={it.href}
                onChange={(href) => patch({ ...it, href })}
                placeholder="/industries/data-centers"
                hint="Leave empty to scroll to the target section."
              />
              <Field label="Visibility">
                <Toggle label="Show this pill" checked={!it.hidden} onChange={(v) => patch({ ...it, hidden: !v })} />
              </Field>
            </div>
          )}
        />
      </Group>
      <Group title="Sticky & scroll behaviour">
        <div className="admin-form-grid">
          <Field label="Behaviour">
            <Toggle label="Stick under the site header while scrolling" checked={c.sticky !== false} onChange={(sticky) => set({ sticky })} />
            <Toggle label="Highlight the pill of the section on screen" checked={c.scrollSpy !== false} onChange={(scrollSpy) => set({ scrollSpy })} />
            <Toggle label="Fade the right edge on phones (scrollable row)" checked={c.fadeEdges !== false} onChange={(fadeEdges) => set({ fadeEdges })} />
          </Field>
          <TextInput
            label="Sticky top offset"
            value={c.stickyTop}
            onChange={(stickyTop) => set({ stickyTop })}
            placeholder="auto (right under the header)"
            hint="Empty follows the header height live. e.g. 0px, 78px."
          />
          <NumberInput
            label="Extra space above a section after a click (px)"
            value={c.scrollOffset}
            min={0}
            step={2}
            placeholder="16"
            onChange={(scrollOffset) => set({ scrollOffset })}
          />
          <AlignButtons label="Pills align" value={c.align} onChange={(v) => set({ align: (v || undefined) as Ind101SubnavContent['align'] })} />
          <TextInput label="Gap between pills" value={c.gap} onChange={(gap) => set({ gap })} placeholder="0.6rem" />
        </div>
      </Group>
      <Group title="Bar background & spacing">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={bar.background} onChange={(background) => setBar({ background })} fallback="rgba(255,255,255,0.92)" />
          <TextInput label="Background blur" value={bar.blur} onChange={(blur) => setBar({ blur })} placeholder="10px" />
          <TextInput label="Border top" value={bar.borderTop} onChange={(borderTop) => setBar({ borderTop })} placeholder="none" />
          <TextInput label="Border bottom" value={bar.borderBottom} onChange={(borderBottom) => setBar({ borderBottom })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Shadow" value={bar.shadow} onChange={(shadow) => setBar({ shadow })} placeholder="none" />
          <TextInput label="Content max width" value={bar.containerMaxWidth} onChange={(containerMaxWidth) => setBar({ containerMaxWidth })} placeholder="site container" />
          <TextInput label="Padding top" value={bar.paddingTop} onChange={(paddingTop) => setBar({ paddingTop })} placeholder="0.9rem" />
          <TextInput label="Padding bottom" value={bar.paddingBottom} onChange={(paddingBottom) => setBar({ paddingBottom })} placeholder="0.9rem" />
          <TextInput label="Padding top (phone)" value={bar.paddingTopMobile} onChange={(paddingTopMobile) => setBar({ paddingTopMobile })} placeholder="0.7rem" />
          <TextInput
            label="Padding bottom (phone)"
            value={bar.paddingBottomMobile}
            onChange={(paddingBottomMobile) => setBar({ paddingBottomMobile })}
            placeholder="0.7rem"
          />
        </div>
      </Group>
      <Group title="Pill style">
        <div className="admin-form-grid">
          <Field label="Dot">
            <Toggle label="Show color dot" checked={c.showDots !== false} onChange={(showDots) => set({ showDots })} />
          </Field>
          <TextInput label="Dot size" value={c.dotSize} onChange={(dotSize) => set({ dotSize })} placeholder="7px" />
          <ColorInput label="Hover text color" value={c.hoverColor} onChange={(hoverColor) => set({ hoverColor })} fallback="var(--graphite-800)" />
          <ColorInput label="Hover background" value={c.hoverBackground} onChange={(hoverBackground) => set({ hoverBackground })} fallback="" />
          <ColorInput label="Active text color" value={c.activeColor} onChange={(activeColor) => set({ activeColor })} fallback="#FFFFFF" />
          <ColorInput
            label="Active background"
            value={c.activeBackground}
            onChange={(activeBackground) => set({ activeBackground })}
            fallback=""
            hint="Empty = each pill's accent color"
          />
        </div>
        <StyleEditor
          title="Pill style (text color, background, border, font, size, padding, radius…)"
          value={c.pillStyle}
          onChange={(pillStyle) => set({ pillStyle })}
          allowHide={false}
          fontSizePlaceholder="0.74rem (0.7rem on phones)"
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Quick stat strip                                                    */
/* ------------------------------------------------------------------ */

function Ind101StatsEditor({ content: c, onChange }: EditorProps<Ind101StatsContent>) {
  const set = (patch: Partial<Ind101StatsContent>) => onChange({ ...c, ...patch });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<Ind101StatsContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Stats" open description="Number, label, accent color and icon for each stat">
        <ListEditor<Ind101StatItem>
          label="Stats"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Stat"
          create={() => ({ value: '100', suffix: '+', label: 'New stat', color: 'var(--cyan)', icon: { svg: IND101_ALL_ICON_PRESETS[0].svg } })}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.prefix || ''}${s.value}${s.suffix || ''} ${s.label}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number" value={s.value} onChange={(value) => patch({ ...s, value })} hint="Digits can count up; other text shows as typed." />
                <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
                <TextInput label="Prefix" value={s.prefix} onChange={(prefix) => patch({ ...s, prefix })} placeholder="e.g. ₹" />
                <TextInput label="Suffix" value={s.suffix} onChange={(suffix) => patch({ ...s, suffix })} placeholder="+" />
                <ColorInput label="Accent color (icon + number)" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="var(--cyan)" />
                <Field label="Visibility">
                  <Toggle label="Show this stat" checked={!s.hidden} onChange={(v) => patch({ ...s, hidden: !v })} />
                </Field>
              </div>
              <IconEditor
                label="Icon"
                value={s.icon || {}}
                onChange={(icon) => patch({ ...s, icon })}
                presets={IND101_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
            </>
          )}
        />
      </Group>
      <Group title="Layout & animation">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 2 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.5rem" />
          <SelectInput label="Item layout" value={c.layout || 'row'} options={STAT_LAYOUT_OPTIONS} onChange={(layout) => set({ layout })} />
          <AlignButtons label="Item align" value={c.justify} onChange={(v) => set({ justify: (v || undefined) as Ind101StatsContent['justify'] })} />
          <Field label="Behaviour">
            <Toggle label="Count numbers up when visible" checked={c.animateCount === true} onChange={(animateCount) => set({ animateCount })} />
            <Toggle label="Lift on hover" checked={Boolean(c.hoverLift)} onChange={(hoverLift) => set({ hoverLift })} />
            <Toggle label="Divider lines between stats (desktop)" checked={c.dividers !== false} onChange={(dividers) => set({ dividers })} />
          </Field>
          <NumberInput label="Count-up duration (ms)" value={c.countDurationMs} min={200} step={100} placeholder="1600" onChange={(countDurationMs) => set({ countDurationMs })} />
          <ColorInput label="Divider color" value={c.dividerColor} onChange={(dividerColor) => set({ dividerColor })} fallback="rgba(255,255,255,0.1)" />
          <TextInput label="Divider height" value={c.dividerHeight} onChange={(dividerHeight) => set({ dividerHeight })} placeholder="32px" />
        </div>
      </Group>
      <Group title="Number, label & icon style">
        <div className="admin-form-grid">
          <ColorInput label="Default accent color" value={c.defaultColor} onChange={(defaultColor) => set({ defaultColor })} fallback="var(--cyan)" hint="Used by stats without their own color" />
          <ColorInput label="Prefix / suffix color" value={c.suffixColor} onChange={(suffixColor) => set({ suffixColor })} fallback="" hint="Empty = same as the number" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIcon({ size })} placeholder="28px" />
          <TextInput label="Icon opacity" value={is.opacity} onChange={(opacity) => setIcon({ opacity })} placeholder="0.9" />
          <TextInput label="Icon stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.6" />
        </div>
        <StyleEditor title="Number style" value={c.numberStyle} onChange={(numberStyle) => set({ numberStyle })} allowHide={false} fontSizePlaceholder="2.1rem (1.6rem on phones)" />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.7rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Category block                                                      */
/* ------------------------------------------------------------------ */

function Ind101CategoryEditor({ content: c, onChange }: EditorProps<Ind101CategoryContent>) {
  const set = (patch: Partial<Ind101CategoryContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { mediaSide: 'right' };
  const setLayout = (patch: Partial<Ind101CategoryContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const bar = c.accentBar || {};
  const setBar = (patch: Partial<Ind101CategoryContent['accentBar']>) => set({ accentBar: { ...bar, ...patch } });
  const m = c.media;
  const setMedia = (patch: Partial<Ind101CategoryContent['media']>) => set({ media: { ...m, ...patch } });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<Ind101CategoryContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIs = (patch: Partial<Ind101CategoryContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  const mode = m.mode || 'collage';
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Category color & layout" description="Accent color drives the bar, count badge, card top bar, icons and hover glow">
        <div className="admin-form-grid">
          <ColorInput label="Category accent color" value={c.accentColor} onChange={(accentColor) => set({ accentColor })} fallback="var(--cyan)" />
          <AlignButtons
            label="Media panel side"
            value={layout.mediaSide}
            options={['left', 'right']}
            onChange={(v) => setLayout({ mediaSide: (v || 'right') as 'left' | 'right' })}
          />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={VALIGN_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as Ind101CategoryContent['layout']['alignItems'] })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="1fr 1fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="3.2rem (1.8rem stacked)" />
          <TextInput label="Space below heading row" value={layout.marginBottom} onChange={(marginBottom) => setLayout({ marginBottom })} placeholder="3rem" />
          <Field label="Tablet / phone">
            <Toggle label="Show the media panel above the heading" checked={Boolean(layout.mobileMediaFirst)} onChange={(mobileMediaFirst) => setLayout({ mobileMediaFirst })} />
          </Field>
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="base" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Intro text">
        <TextElementEditor label="Intro" multiline value={c.subtitle} onChange={(subtitle) => set({ subtitle })} />
      </Group>
      <Group title="Accent bar & count badge">
        <div className="admin-form-grid">
          <Field label="Accent bar">
            <Toggle label="Show the bar above the heading" checked={!bar.hidden} onChange={(v) => setBar({ hidden: !v })} />
          </Field>
          <ColorInput label="Bar color / gradient" value={bar.color} onChange={(color) => setBar({ color })} fallback="" hint="Empty = category accent color" />
          <TextInput label="Bar width" value={bar.width} onChange={(width) => setBar({ width })} placeholder="56px" />
          <TextInput label="Bar height" value={bar.height} onChange={(height) => setBar({ height })} placeholder="4px" />
        </div>
        <TextElementEditor label="Count badge" value={c.count} onChange={(count) => set({ count })} hint='e.g. "9 SECTORS". Empty = hidden. Style sets color, border, size…' />
      </Group>
      <Group title="Buttons" description="Optional buttons under the intro text">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Media panel (images / videos)" description="Add as many images / videos as you like; the collage shares them across its pictures and cross-fades">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the media panel" checked={!m.hidden} onChange={(v) => setMedia({ hidden: !v })} />
          </Field>
          <SelectInput label="Display" value={mode} options={MEDIA_MODE_OPTIONS} onChange={(v) => setMedia({ mode: v })} />
        </div>
        <MediaItemsEditor
          label="Images / videos"
          items={m.items || []}
          onChange={(items) => setMedia({ items })}
          showLabel={false}
          showColor={false}
          hint="Caption = alt text. Collage: with more files than pictures, each picture cycles through its share."
        />
        <div className="admin-form-grid">
          <NumberInput label="Seconds per change" value={m.intervalSeconds} min={1} step={0.5} placeholder="4.5" onChange={(intervalSeconds) => setMedia({ intervalSeconds })} />
          <Field label="Motion">
            <Toggle label="Gentle float / zoom animation" checked={m.float !== false} onChange={(float) => setMedia({ float })} />
            <Toggle label="Zoom picture on hover" checked={m.hoverZoom !== false} onChange={(hoverZoom) => setMedia({ hoverZoom })} />
          </Field>
          <NumberInput label="Float cycle (seconds)" value={m.floatSeconds} min={1} step={0.5} placeholder="5.5" onChange={(floatSeconds) => setMedia({ floatSeconds })} />
          <TextInput label="Aspect ratio" value={m.aspectRatio} onChange={(aspectRatio) => setMedia({ aspectRatio })} placeholder="5/4" hint="Collage / slideshow panel shape." />
          <TextInput label="Aspect ratio (tablet / phone)" value={m.aspectRatioMobile} onChange={(aspectRatioMobile) => setMedia({ aspectRatioMobile })} placeholder="same as desktop" />
          <SelectInput label="Image fit" value={m.fit || ''} options={FIT_OPTIONS} onChange={(fit) => setMedia({ fit: (fit || undefined) as ImageEl['fit'] })} />
          <TextInput label="Focus position" value={m.position} onChange={(position) => setMedia({ position })} placeholder="center, 50% 30%" />
          <TextInput label="Picture corner radius" value={m.cellRadius} onChange={(cellRadius) => setMedia({ cellRadius })} placeholder="6px (grid 8px)" />
          <TextInput label="Picture shadow" value={m.cellShadow} onChange={(cellShadow) => setMedia({ cellShadow })} placeholder="0 22px 38px -14px rgba(10,22,40,0.55)" />
          {mode === 'slideshow' ? (
            <>
              <TextInput label="Frame radius" value={m.radius} onChange={(radius) => setMedia({ radius })} placeholder="20px" />
              <TextInput label="Frame shadow" value={m.shadow} onChange={(shadow) => setMedia({ shadow })} placeholder="0 24px 50px -22px rgba(10,22,40,0.35)" />
              <ColorInput label="Frame background" value={m.background} onChange={(background) => setMedia({ background })} fallback="var(--navy-950)" />
              <TextArea label="Overlay gradient" rows={2} value={m.overlay} onChange={(overlay) => setMedia({ overlay })} placeholder="linear-gradient(180deg,transparent 50%,rgba(10,22,40,0.55))" />
            </>
          ) : null}
          {mode === 'grid' ? (
            <>
              <NumberInput label="Grid columns" value={m.gridColumns} min={1} max={6} placeholder="3" onChange={(gridColumns) => setMedia({ gridColumns })} />
              <TextInput label="Grid gap" value={m.gridGap} onChange={(gridGap) => setMedia({ gridGap })} placeholder="0.75rem" />
            </>
          ) : null}
        </div>
        <TextElementEditor label="Tag label" value={m.tag} onChange={(tag) => setMedia({ tag })} hint='e.g. "INFRASTRUCTURE VIEW". Empty = hidden. Style sets the color / gradient, border, font…' />
        <div className="admin-form-grid">
          <SelectInput label="Tag position" value={m.tagPosition || 'top-left'} options={TAG_POSITION_OPTIONS} onChange={(tagPosition) => setMedia({ tagPosition })} />
        </div>
      </Group>
      <Group title="Collage picture positions" description="Position and size of each collage picture, in % of the panel (collage display only)">
        <ListEditor<Ind101CollageCell>
          label="Pictures"
          items={m.cells || []}
          onChange={(cells) => setMedia({ cells })}
          addLabel="Picture"
          create={() => ({ left: '30%', top: '30%', width: '40%', height: '40%', zIndex: 4 })}
          itemTitle={(cell, i) => `${cell.hidden ? '(hidden) ' : ''}Picture ${i + 1} · ${cell.width || '?'} × ${cell.height || '?'} at ${cell.left || '0'}, ${cell.top || '0'}`}
          renderItem={(cell, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Left" value={cell.left} onChange={(left) => patch({ ...cell, left })} placeholder="0%" />
              <TextInput label="Top" value={cell.top} onChange={(top) => patch({ ...cell, top })} placeholder="0%" />
              <TextInput label="Width" value={cell.width} onChange={(width) => patch({ ...cell, width })} placeholder="30%" />
              <TextInput label="Height" value={cell.height} onChange={(height) => patch({ ...cell, height })} placeholder="30%" />
              <NumberInput label="Stacking order (z-index)" value={cell.zIndex} min={0} max={8} placeholder="2" onChange={(zIndex) => patch({ ...cell, zIndex })} />
              <TextInput label="Corner radius" value={cell.radius} onChange={(radius) => patch({ ...cell, radius })} placeholder="panel default" />
              <TextInput label="Float delay" value={cell.delay} onChange={(delay) => patch({ ...cell, delay })} placeholder="0.4s" />
              <Field label="Visibility">
                <Toggle label="Show this picture" checked={!cell.hidden} onChange={(v) => patch({ ...cell, hidden: !v })} />
              </Field>
            </div>
          )}
        />
        <div style={{ marginTop: '0.6rem' }}>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setMedia({ cells: defaultInd101CollageCells() })}>
            Reset to the design layout (5 pictures)
          </button>
        </div>
      </Group>
      <Group title="Sector cards" open description="Icon or image, title, text, optional link and images / videos per card">
        <ListEditor<Ind101Card>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={defaultInd101Card}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.title?.text || 'Card'}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!card.hidden} onChange={(v) => patch({ ...card, hidden: !v })} />
                </Field>
                <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="" hint="Empty = category accent color" />
              </div>
              <IconEditor
                label="Icon"
                value={card.icon || {}}
                onChange={(icon) => patch({ ...card, icon })}
                presets={IND101_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Text" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <div className="admin-form-grid">
                <TextInput label="Link (optional)" value={card.href} onChange={(href) => patch({ ...card, href })} placeholder="/industries/data-centers" />
                <TextInput label="Link label" value={card.linkLabel} onChange={(linkLabel) => patch({ ...card, linkLabel })} placeholder="Explore →" />
                <Field label="Link">
                  <Toggle label="Open in a new tab" checked={Boolean(card.newTab)} onChange={(newTab) => patch({ ...card, newTab })} />
                </Field>
              </div>
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
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.5rem" />
          <Field label="Animation">
            <Toggle label="Reveal heading and cards on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#DCEBFA', border: '1px solid #C3DBF5', radius: '12px', padding: '1.9rem', shadow: '0 8px 22px -10px rgba(60,110,170,0.25)' }}
        >
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="glow in the accent color" />
          <TextInput label="Hover border color" value={cs.hoverBorder} onChange={(hoverBorder) => setCs({ hoverBorder })} placeholder="transparent" />
          <TextInput label="Top bar height" value={cs.barHeight} onChange={(barHeight) => setCs({ barHeight })} placeholder="3px" />
          <TextInput label="Card media height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="160px" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
            <Toggle label="Accent bar grows across the top" checked={cs.topBar !== false} onChange={(topBar) => setCs({ topBar })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Card icon style">
        <div className="admin-form-grid">
          <TextInput label="Circle size" value={is.boxSize} onChange={(boxSize) => setIs({ boxSize })} placeholder="48px" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIs({ size })} placeholder="22px" />
          <TextInput label="Corner radius" value={is.radius} onChange={(radius) => setIs({ radius })} placeholder="50%" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIs({ strokeWidth })} placeholder="1.6" />
          <ColorInput label="Background" value={is.background} onChange={(background) => setIs({ background })} fallback="#FFFFFF" />
          <ColorInput label="Hover background" value={is.hoverBackground} onChange={(hoverBackground) => setIs({ hoverBackground })} fallback="" hint="Empty = accent color" />
          <ColorInput label="Hover icon color" value={is.hoverColor} onChange={(hoverColor) => setIs({ hoverColor })} fallback="#FFFFFF" />
          <Field label="Hover">
            <Toggle label="Pop and tilt the icon" checked={is.animate !== false} onChange={(animate) => setIs({ animate })} />
          </Field>
        </div>
      </Group>
      <Group title="Card text style">
        <div className="admin-form-grid">
          <ColorInput label="Title hover color" value={c.titleHoverColor} onChange={(titleHoverColor) => set({ titleHoverColor })} fallback="" hint="Empty = accent color" />
        </div>
        <StyleEditor title="Card title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.04rem" />
        <StyleEditor title="Card text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.86rem" />
        <StyleEditor title="Card link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function Ind101CtaEditor({ content: c, onChange }: EditorProps<Ind101CtaContent>) {
  const set = (patch: Partial<Ind101CtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background images / videos" />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as Ind101CtaContent['align'] })} />
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

export default function Industries101SectionEditor({
  type,
  content,
  onChange,
}: {
  type: Industries101SectionType;
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
      <div className="az-admin lz-admin lgy-admin i101-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'ind101_hero' ? (
            <Ind101HeroEditor content={withIndustries101Defaults<Ind101HeroContent>(type, content)} onChange={emit} />
          ) : type === 'ind101_subnav' ? (
            <Ind101SubnavEditor content={withIndustries101Defaults<Ind101SubnavContent>(type, content)} onChange={emit} />
          ) : type === 'ind101_stats' ? (
            <Ind101StatsEditor content={withIndustries101Defaults<Ind101StatsContent>(type, content)} onChange={emit} />
          ) : type === 'ind101_category' ? (
            <Ind101CategoryEditor content={withIndustries101Defaults<Ind101CategoryContent>(type, content)} onChange={emit} />
          ) : type === 'ind101_cta' ? (
            <Ind101CtaEditor content={withIndustries101Defaults<Ind101CtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
