'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  CtaListEditor,
  Field,
  IconEditor,
  ImageEditor,
  LinkListEditor,
  ListEditor,
  PillsEditor,
  SectionBoxEditor,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import {
  ColumnsEditor,
  HighlightEditor,
  LifeGroup as Group,
  LifeGroupProvider,
  LifeHeaderEditor,
  MediaItemsEditor,
  NapHint,
  NumberInput,
} from '@/components/admin/life/LifeControls';
import { normalizeLinkItems, type FloatCardPosition, type ImageEl, type SectionBox, type SplitLayout, type TextEl } from '@/lib/about-sections';
import {
  LEGACY_ALL_ICON_PRESETS,
  defaultLegacyMilestone,
  withLegacyDefaults,
  type LegacyBgMedia,
  type LegacyBgMotion,
  type LegacyCapCard,
  type LegacyCapsContent,
  type LegacyCardStyle,
  type LegacyCollageFrame,
  type LegacyCtaContent,
  type LegacyHeroContent,
  type LegacyJourneyContent,
  type LegacyKeepItem,
  type LegacyMarqueeContent,
  type LegacyMarqueeSeparator,
  type LegacyMilestone,
  type LegacyNextContent,
  type LegacyNextItem,
  type LegacySectionHeader,
  type LegacySectionType,
  type LegacyStatItem,
  type LegacyStatsContent,
  type LegacyStoryContent,
  type LegacyValueCard,
  type LegacyValuesContent,
} from '@/lib/legacy-sections';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

export const VALIGN_OPTIONS = [
  { value: '', label: 'Default (center)' },
  { value: 'start', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'Bottom' },
] as const;

const MOTION_OPTIONS: Array<{ value: LegacyBgMotion; label: string }> = [
  { value: 'none', label: 'None (still)' },
  { value: 'kenburns', label: 'Ken Burns (slow zoom per slide)' },
  { value: 'zoom', label: 'Zoom (slow zoom in / out loop)' },
  { value: 'pan', label: 'Pan (slow zoom + pan loop)' },
  { value: 'drift', label: 'Drift (side-to-side loop)' },
];

export function SectionBoxGroup({ value, onChange }: { value: SectionBox; onChange: (v: SectionBox) => void }) {
  return (
    <Group title="Section background & spacing" description="Colors, gradient, image or video background, pattern, glow orbs, padding">
      <SectionBoxEditor value={value} onChange={onChange} />
    </Group>
  );
}

/** Background images / videos with slideshow + motion (hero, values, next). */
export function BgMediaGroup({
  value,
  onChange,
  title = 'Background images / videos',
  withIndicators,
}: {
  value: LegacyBgMedia;
  onChange: (next: LegacyBgMedia) => void;
  title?: string;
  withIndicators?: boolean;
}) {
  const bg = value || { items: [] };
  const set = (patch: Partial<LegacyBgMedia>) => onChange({ ...bg, ...patch });
  return (
    <Group title={title} description="One item = still background, several = cross-fading slideshow; add as many as you like">
      <Toggle label="Show background media" checked={!bg.hidden} onChange={(v) => set({ hidden: !v })} />
      <MediaItemsEditor
        label="Background slides"
        items={bg.items || []}
        onChange={(items) => set({ items })}
        showLabel={false}
        showColor={false}
        hint="Caption = alt text. Videos play muted and looped."
      />
      <MediaItemsEditor
        label="Phone slides (optional, ≤760px)"
        items={bg.mobileItems || []}
        onChange={(mobileItems) => set({ mobileItems })}
        showLabel={false}
        showColor={false}
        hint="Leave empty to reuse the slides above on phones."
      />
      <div className="admin-form-grid">
        <NumberInput
          label="Seconds per slide"
          value={bg.intervalSeconds}
          min={1}
          step={0.5}
          placeholder="5.5"
          onChange={(intervalSeconds) => set({ intervalSeconds })}
        />
        <SelectInput
          label="Motion"
          value={bg.motion || 'none'}
          options={MOTION_OPTIONS}
          onChange={(motion) => set({ motion })}
        />
        <NumberInput
          label="Motion cycle (seconds)"
          value={bg.motionSeconds}
          min={1}
          step={1}
          placeholder="8"
          hint="Ken Burns: zoom length per slide. Pan / drift: one loop."
          onChange={(motionSeconds) => set({ motionSeconds })}
        />
        <TextInput label="Focus position" value={bg.position} onChange={(position) => set({ position })} placeholder="center, 50% 30%" />
        <TextInput
          label="Focus position (phone)"
          value={bg.positionMobile}
          onChange={(positionMobile) => set({ positionMobile })}
          placeholder="Empty = same as desktop"
        />
        <TextArea
          label="Overlay gradient (drawn over the media)"
          rows={2}
          value={bg.overlay}
          onChange={(overlay) => set({ overlay })}
          placeholder="linear-gradient(105deg,rgba(10,22,40,0.9) 0%,rgba(10,22,40,0.66) 48%,rgba(15,76,92,0.25) 100%)"
        />
        {withIndicators ? (
          <>
            <Field label="Slide indicators">
              <Toggle label="Show progress dots" checked={Boolean(bg.showDots)} onChange={(showDots) => set({ showDots })} />
              <Toggle label="Show counter (01 / 03)" checked={Boolean(bg.showCount)} onChange={(showCount) => set({ showCount })} />
            </Field>
            <ColorInput label="Active dot color" value={bg.dotColor} onChange={(dotColor) => set({ dotColor })} fallback="var(--orange)" />
          </>
        ) : null}
      </div>
    </Group>
  );
}

export function LegacyHeaderEditor({ value, onChange }: { value: LegacySectionHeader; onChange: (next: LegacySectionHeader) => void }) {
  const h = value || { eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } };
  const bar = h.bar || {};
  const setBar = (patch: Partial<NonNullable<LegacySectionHeader['bar']>>) => onChange({ ...h, bar: { ...bar, ...patch } });
  return (
    <>
      <LifeHeaderEditor value={h} onChange={(next) => onChange({ ...h, ...next })} />
      <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
        <Field label="Accent bar">
          <Toggle label="Show animated bar under heading" checked={!bar.hidden} onChange={(v) => setBar({ hidden: !v })} />
        </Field>
        <TextInput label="Bar width" value={bar.width} onChange={(width) => setBar({ width })} placeholder="64px" />
        <TextInput label="Bar height" value={bar.height} onChange={(height) => setBar({ height })} placeholder="4px" />
        <TextInput
          label="Bar color / gradient"
          value={bar.gradient}
          onChange={(gradient) => setBar({ gradient })}
          placeholder="linear-gradient(90deg,var(--orange),var(--yellow))"
          full
        />
      </div>
    </>
  );
}

export function CardStyleFields<T extends LegacyCardStyle>({
  value,
  onChange,
  placeholders,
  children,
}: {
  value: T;
  onChange: (patch: Partial<T>) => void;
  placeholders: { background: string; border: string; radius: string; padding: string; shadow?: string };
  children?: ReactNode;
}) {
  const cs = value || ({} as T);
  return (
    <div className="admin-form-grid">
      <TextInput
        label="Background"
        value={cs.background}
        onChange={(background) => onChange({ background } as Partial<T>)}
        placeholder={placeholders.background}
      />
      <TextInput
        label="Hover background"
        value={cs.hoverBackground}
        onChange={(hoverBackground) => onChange({ hoverBackground } as Partial<T>)}
      />
      <TextInput label="Border" value={cs.border} onChange={(border) => onChange({ border } as Partial<T>)} placeholder={placeholders.border} />
      <TextInput label="Radius" value={cs.radius} onChange={(radius) => onChange({ radius } as Partial<T>)} placeholder={placeholders.radius} />
      <TextInput label="Padding" value={cs.padding} onChange={(padding) => onChange({ padding } as Partial<T>)} placeholder={placeholders.padding} />
      <TextInput label="Shadow" value={cs.shadow} onChange={(shadow) => onChange({ shadow } as Partial<T>)} placeholder={placeholders.shadow || 'none'} />
      {children}
    </div>
  );
}

export function ParagraphsEditor({ value, onChange }: { value: TextEl[]; onChange: (next: TextEl[]) => void }) {
  return (
    <ListEditor<TextEl>
      label="Paragraphs"
      items={value || []}
      onChange={onChange}
      addLabel="Paragraph"
      create={() => ({ text: 'New paragraph.' })}
      itemTitle={(p) => (p.text || '').slice(0, 70)}
      renderItem={(p, patch) => <TextElementEditor label="Paragraph" multiline value={p} onChange={(next) => patch(next)} />}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

function LegacyHeroEditor({ content: c, onChange }: EditorProps<LegacyHeroContent>) {
  const set = (patch: Partial<LegacyHeroContent>) => onChange({ ...c, ...patch });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  const layout = c.layout || { badgeSide: 'right' };
  const setLayout = (patch: Partial<LegacyHeroContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const b = c.badge;
  const setBadge = (patch: Partial<LegacyHeroContent['badge']>) => set({ badge: { ...b, ...patch } });
  const scroll = c.scrollBar || {};
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Background slideshow (images / videos)" withIndicators />
      <Group title="Layout, height & motion">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} onChange={(heroHeight) => set({ heroHeight })} />
          <HeroPlacementEditor
            value={c.placement}
            onChange={(placement) => set({ placement })}
            slots={[
              { name: 'text', label: 'Text block' },
              { name: 'media', label: 'Badge' },
            ]}
          />
          <AlignButtons
            label="Badge position"
            value={layout.badgeSide}
            options={['left', 'right']}
            onChange={(v) => setLayout({ badgeSide: (v || 'right') as 'left' | 'right' })}
          />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={VALIGN_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as LegacyHeroContent['layout']['alignItems'] })}
          />
          <TextInput
            label="Column widths"
            value={layout.columns}
            onChange={(columns) => setLayout({ columns })}
            placeholder="1.35fr 0.65fr"
            hint="CSS grid columns in on-screen order. Empty = design default."
          />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="3rem" />
          <Field label="Behaviour">
            <Toggle
              label="On tablet / phone, show the badge above the text"
              checked={Boolean(layout.mobileBadgeFirst)}
              onChange={(mobileBadgeFirst) => setLayout({ mobileBadgeFirst })}
            />
            <Toggle label="Fade-up entrance animation" checked={c.entrance !== false} onChange={(entrance) => set({ entrance })} />
            <Toggle
              label="Scroll progress bar at the top of the page"
              checked={!scroll.hidden}
              onChange={(v) => set({ scrollBar: { ...scroll, hidden: !v } })}
            />
          </Field>
          <TextInput
            label="Scroll bar color / gradient"
            value={scroll.gradient}
            onChange={(gradient) => set({ scrollBar: { ...scroll, gradient } })}
            placeholder="linear-gradient(90deg,var(--orange),var(--yellow))"
          />
        </div>
      </Group>
      <Group title="Breadcrumb">
        <Toggle label="Show breadcrumb" checked={!bc.hidden} onChange={(v) => set({ breadcrumb: { ...bc, hidden: !v } })} />
        <LinkListEditor
          label="Crumbs (last one = current page, leave its link empty)"
          items={normalizeLinkItems(bc.items)}
          onChange={(items) => set({ breadcrumb: { ...bc, items } })}
        />
        <div className="admin-form-grid">
          <TextInput label="Separator" value={bc.separator} onChange={(separator) => set({ breadcrumb: { ...bc, separator } })} placeholder="/" />
          <ColorInput label="Link hover color" value={bc.hoverColor} onChange={(hoverColor) => set({ breadcrumb: { ...bc, hoverColor } })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Breadcrumb style" value={bc.style} onChange={(style) => set({ breadcrumb: { ...bc, style } })} allowHide={false} />
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
      <Group title="Pills">
        <PillsEditor value={c.pills} onChange={(pills) => set({ pills })} />
      </Group>
      <Group title="Buttons" description="Optional call-to-action buttons under the pills">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="20 years badge (animated ring)">
        <Toggle label="Show badge" checked={!b.hidden} onChange={(v) => setBadge({ hidden: !v })} />
        <div className="admin-form-grid">
          <TextInput label="Number" value={b.value} onChange={(value) => setBadge({ value })} hint="Digits count up; other text shows as typed." />
          <TextInput label="Prefix" value={b.prefix} onChange={(prefix) => setBadge({ prefix })} />
          <TextInput label="Suffix" value={b.suffix} onChange={(suffix) => setBadge({ suffix })} placeholder="+" />
          <ColorInput label="Prefix / suffix color" value={b.suffixColor} onChange={(suffixColor) => setBadge({ suffixColor })} fallback="var(--orange)" />
          <Field label="Animation">
            <Toggle label="Count up the number" checked={b.countUp !== false} onChange={(countUp) => setBadge({ countUp })} />
            <Toggle label="Draw the ring" checked={b.animateRing !== false} onChange={(animateRing) => setBadge({ animateRing })} />
            <Toggle label="Frosted glass blur" checked={b.blur !== false} onChange={(blur) => setBadge({ blur })} />
          </Field>
          <NumberInput
            label="Count-up duration (ms)"
            value={b.countDurationMs}
            min={200}
            step={100}
            placeholder="1800"
            onChange={(countDurationMs) => setBadge({ countDurationMs })}
          />
        </div>
        <TextElementEditor label="Ring label" value={b.label} onChange={(label) => setBadge({ label })} />
        <TextElementEditor label="Year span" value={b.span} onChange={(span) => setBadge({ span })} />
        <StyleEditor title="Number style" value={b.numberStyle} onChange={(numberStyle) => setBadge({ numberStyle })} allowHide={false} fontSizePlaceholder="calc(ring size × 0.3)" />
        <div className="admin-form-grid">
          <ColorInput label="Ring gradient start" value={b.ringFrom} onChange={(ringFrom) => setBadge({ ringFrom })} fallback="var(--yellow)" />
          <ColorInput label="Ring gradient end" value={b.ringTo} onChange={(ringTo) => setBadge({ ringTo })} fallback="var(--orange)" />
          <ColorInput label="Ring track color" value={b.trackColor} onChange={(trackColor) => setBadge({ trackColor })} fallback="" />
          <TextInput label="Ring thickness" value={b.ringWidth} onChange={(ringWidth) => setBadge({ ringWidth })} placeholder="10" />
          <TextInput label="Ring size" value={b.size} onChange={(size) => setBadge({ size })} placeholder="184px" />
          <TextInput label="Ring size (phone)" value={b.sizeMobile} onChange={(sizeMobile) => setBadge({ sizeMobile })} placeholder="130px" />
          <TextInput label="Card background" value={b.background} onChange={(background) => setBadge({ background })} placeholder="rgba(255,255,255,0.07)" />
          <TextInput label="Card border" value={b.border} onChange={(border) => setBadge({ border })} placeholder="1px solid rgba(255,255,255,0.18)" />
          <TextInput label="Card radius" value={b.radius} onChange={(radius) => setBadge({ radius })} placeholder="24px" />
          <TextInput label="Card padding" value={b.padding} onChange={(padding) => setBadge({ padding })} placeholder="1.4rem 1.8rem 1.2rem" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

export function LegacyStatsEditor({ content: c, onChange }: EditorProps<LegacyStatsContent>) {
  const set = (patch: Partial<LegacyStatsContent>) => onChange({ ...c, ...patch });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<LegacyStatsContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Stats" description="Numbers count up when the bar scrolls into view" open>
        <ListEditor<LegacyStatItem>
          label="Stats"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Stat"
          create={() => ({ value: '100', suffix: '+', label: 'New stat' })}
          itemTitle={(s) => `${s.prefix || ''}${s.value}${s.suffix || ''} ${s.label}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number" value={s.value} onChange={(value) => patch({ ...s, value })} hint="Digits animate; any other text shows as typed." />
                <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
                <TextInput label="Prefix" value={s.prefix} onChange={(prefix) => patch({ ...s, prefix })} placeholder="e.g. ₹" />
                <TextInput label="Suffix" value={s.suffix} onChange={(suffix) => patch({ ...s, suffix })} placeholder="+" />
              </div>
              <IconEditor
                label="Icon (optional)"
                value={s.icon || {}}
                onChange={(icon) => patch({ ...s, icon })}
                presets={LEGACY_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 4, mobile: 2 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.5rem" />
          <AlignButtons label="Align" value={c.align} onChange={(align) => set({ align: (align || undefined) as LegacyStatsContent['align'] })} />
          <Field label="Count-up">
            <Toggle label="Animate numbers" checked={c.animateCount !== false} onChange={(animateCount) => set({ animateCount })} />
          </Field>
          <NumberInput
            label="Count-up duration (ms)"
            value={c.countDurationMs}
            min={200}
            step={100}
            placeholder="1800"
            onChange={(countDurationMs) => set({ countDurationMs })}
          />
          <Field label="Look">
            <Toggle label="Lift on hover" checked={c.hoverLift !== false} onChange={(hoverLift) => set({ hoverLift })} />
            <Toggle label="Divider lines between stats" checked={Boolean(c.dividers)} onChange={(dividers) => set({ dividers })} />
          </Field>
          <ColorInput label="Divider color" value={c.dividerColor} onChange={(dividerColor) => set({ dividerColor })} fallback="" />
        </div>
      </Group>
      <Group title="Number, label & icon style">
        <ColorInput label="Prefix / suffix color" value={c.suffixColor} onChange={(suffixColor) => set({ suffixColor })} fallback="var(--orange)" />
        <StyleEditor title="Number style" value={c.numberStyle} onChange={(numberStyle) => set({ numberStyle })} allowHide={false} fontSizePlaceholder="clamp(1.7rem,2.9vw,2.5rem)" />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.82rem" />
        <div className="admin-form-grid">
          <TextInput label="Icon size (all stats)" value={is.size} onChange={(size) => setIcon({ size })} placeholder="30px" />
          <ColorInput label="Icon color (all stats)" value={is.color} onChange={(color) => setIcon({ color })} fallback="var(--cyan)" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee                                                             */
/* ------------------------------------------------------------------ */

function LegacyMarqueeEditor({ content: c, onChange }: EditorProps<LegacyMarqueeContent>) {
  const set = (patch: Partial<LegacyMarqueeContent>) => onChange({ ...c, ...patch });
  const sep = c.separator || { type: 'symbol' };
  const setSep = (patch: Partial<LegacyMarqueeContent['separator']>) => set({ separator: { ...sep, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Scrolling items" description="Links are optional; short lists repeat automatically to fill the screen" open>
        <LinkListEditor label="Items" items={normalizeLinkItems(c.items)} onChange={(items) => set({ items })} />
      </Group>
      <Group title="Motion">
        <div className="admin-form-grid">
          <NumberInput
            label="Loop duration (seconds)"
            value={c.speedSeconds}
            min={5}
            placeholder="32"
            hint="Higher = slower"
            onChange={(speedSeconds) => set({ speedSeconds: speedSeconds ?? 32 })}
          />
          <SelectInput
            label="Direction"
            value={c.direction || 'rtl'}
            options={[
              { value: 'rtl', label: 'Right → left' },
              { value: 'ltr', label: 'Left → right' },
            ]}
            onChange={(direction) => set({ direction })}
          />
          <TextInput label="Space around separator" value={c.gap} onChange={(gap) => set({ gap })} placeholder="2.4rem" />
          <Field label="Behaviour">
            <Toggle label="Pause on hover" checked={Boolean(c.pauseOnHover)} onChange={(pauseOnHover) => set({ pauseOnHover })} />
            <Toggle label="Fade edges" checked={Boolean(c.fadeEdges)} onChange={(fadeEdges) => set({ fadeEdges })} />
          </Field>
        </div>
      </Group>
      <Group title="Item text style">
        <ColorInput label="Hover color (linked items)" value={c.hoverColor} onChange={(hoverColor) => set({ hoverColor })} fallback="" />
        <StyleEditor title="Item style" value={c.itemStyle} onChange={(itemStyle) => set({ itemStyle })} allowHide={false} fontSizePlaceholder="1.02rem" />
      </Group>
      <Group title="Separator">
        <div className="admin-form-grid">
          <SelectInput<LegacyMarqueeSeparator>
            label="Separator type"
            value={sep.type || 'symbol'}
            options={[
              { value: 'symbol', label: 'Text symbol (✦ • | …)' },
              { value: 'dot', label: 'Round dot' },
              { value: 'icon', label: 'Icon' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(type) => setSep({ type })}
          />
          {sep.type === 'symbol' || !sep.type ? (
            <TextInput label="Symbol" value={sep.symbol} onChange={(symbol) => setSep({ symbol })} placeholder="✦" />
          ) : null}
          <ColorInput label="Separator color" value={sep.color} onChange={(color) => setSep({ color })} fallback="#8CC0FF" />
          <TextInput label="Separator size" value={sep.size} onChange={(size) => setSep({ size })} placeholder="1em / 6px / 14px" />
        </div>
        {sep.type === 'icon' ? (
          <IconEditor
            label="Separator icon"
            value={sep.icon || {}}
            onChange={(icon) => setSep({ icon })}
            presets={LEGACY_ALL_ICON_PRESETS}
            previewClassName={ICON_PREVIEW}
          />
        ) : null}
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Story                                                               */
/* ------------------------------------------------------------------ */

function LegacyStoryEditor({ content: c, onChange }: EditorProps<LegacyStoryContent>) {
  const set = (patch: Partial<LegacyStoryContent>) => onChange({ ...c, ...patch });
  const l = c.layout || { imageSide: 'left' };
  const setLayout = (patch: Partial<SplitLayout>) => set({ layout: { ...l, ...patch } });
  const col = c.collage || { frames: [] };
  const setCollage = (patch: Partial<LegacyStoryContent['collage']>) => set({ collage: { ...col, ...patch } });
  const since = c.since;
  const setSince = (patch: Partial<LegacyStoryContent['since']>) => set({ since: { ...since, ...patch } });
  const k = c.keep || { items: [] };
  const setKeep = (patch: Partial<LegacyStoryContent['keep']>) => set({ keep: { ...k, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Layout & reveal">
        <div className="admin-form-grid">
          <AlignButtons
            label="Collage position"
            value={l.imageSide}
            options={['left', 'right']}
            onChange={(v) => setLayout({ imageSide: (v || 'left') as SplitLayout['imageSide'] })}
          />
          <SelectInput
            label="Vertical alignment"
            value={l.alignItems || ''}
            options={[...VALIGN_OPTIONS, { value: 'stretch', label: 'Stretch' }]}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as SplitLayout['alignItems'] })}
          />
          <TextInput
            label="Column widths"
            value={l.columns}
            onChange={(columns) => setLayout({ columns })}
            placeholder="0.95fr 1.05fr"
            hint="CSS grid columns in on-screen order. Empty = design default."
          />
          <TextInput label="Column gap" value={l.gap} onChange={(gap) => setLayout({ gap })} placeholder="4rem" />
          <Field label="Behaviour">
            <Toggle
              label="On tablet / phone, show the collage above the text"
              checked={l.mobileImageFirst !== false}
              onChange={(mobileImageFirst) => setLayout({ mobileImageFirst })}
            />
            <Toggle label="Fade up on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Photo collage (images / videos)" description="Each frame is positioned inside the collage and can cycle through many photos or videos">
        <div className="admin-form-grid">
          <Field label="Collage">
            <Toggle label="Show collage" checked={!col.hidden} onChange={(v) => setCollage({ hidden: !v })} />
            <Toggle label="Gentle zoom when scrolled into view" checked={col.zoomOnReveal !== false} onChange={(zoomOnReveal) => setCollage({ zoomOnReveal })} />
          </Field>
          <TextInput label="Collage height" value={col.minHeight} onChange={(minHeight) => setCollage({ minHeight })} placeholder="520px" />
          <TextInput label="Collage height (phone)" value={col.minHeightMobile} onChange={(minHeightMobile) => setCollage({ minHeightMobile })} placeholder="340px" />
        </div>
        <ListEditor<LegacyCollageFrame>
          label="Frames"
          items={col.frames || []}
          onChange={(frames) => setCollage({ frames })}
          addLabel="Frame"
          create={() => ({ items: [], intervalSeconds: 4, right: '6%', top: '8%', width: '40%', height: '40%' })}
          itemTitle={(f, i) => `${f.hidden ? '[hidden] ' : ''}Frame ${i + 1} · ${(f.items || []).length} item${(f.items || []).length === 1 ? '' : 's'}`}
          renderItem={(f, patch) => (
            <>
              <Toggle label="Show this frame" checked={!f.hidden} onChange={(v) => patch({ ...f, hidden: !v || undefined })} />
              <MediaItemsEditor
                label="Frame photos / videos"
                items={f.items || []}
                onChange={(items) => patch({ ...f, items })}
                showLabel={false}
                showColor={false}
                hint="Several items cross-fade in this frame."
              />
              <div className="admin-form-grid">
                <NumberInput
                  label="Seconds per photo"
                  value={f.intervalSeconds}
                  min={1}
                  step={0.5}
                  placeholder="4"
                  onChange={(intervalSeconds) => patch({ ...f, intervalSeconds })}
                />
                <TextInput label="Top" value={f.top} onChange={(top) => patch({ ...f, top })} placeholder="0" />
                <TextInput label="Right" value={f.right} onChange={(right) => patch({ ...f, right })} />
                <TextInput label="Bottom" value={f.bottom} onChange={(bottom) => patch({ ...f, bottom })} />
                <TextInput label="Left" value={f.left} onChange={(left) => patch({ ...f, left })} placeholder="0" />
                <TextInput label="Width" value={f.width} onChange={(width) => patch({ ...f, width })} placeholder="68%" />
                <TextInput label="Height" value={f.height} onChange={(height) => patch({ ...f, height })} placeholder="72%" />
                <TextInput label="Corner radius" value={f.radius} onChange={(radius) => patch({ ...f, radius })} placeholder="18px" />
                <TextInput label="Border" value={f.border} onChange={(border) => patch({ ...f, border })} placeholder="6px solid #FFFFFF" />
                <TextInput label="Shadow" value={f.shadow} onChange={(shadow) => patch({ ...f, shadow })} placeholder="0 30px 60px -32px rgba(10,22,40,0.65)" />
                <SelectInput
                  label="Fit"
                  value={f.fit || ''}
                  options={[
                    { value: '', label: 'Default (cover)' },
                    { value: 'cover', label: 'Cover (crop to fill)' },
                    { value: 'contain', label: 'Contain (show whole)' },
                    { value: 'fill', label: 'Stretch' },
                  ]}
                  onChange={(fit) => patch({ ...f, fit: (fit || undefined) as ImageEl['fit'] })}
                />
                <TextInput label="Focus position" value={f.position} onChange={(position) => patch({ ...f, position })} placeholder="center, 50% 30%" />
              </div>
            </>
          )}
        />
      </Group>
      <Group title="“Since” floating card">
        <Toggle label="Show card" checked={!since.hidden} onChange={(v) => setSince({ hidden: !v })} />
        <TextElementEditor label="Number" value={since.number} onChange={(number) => setSince({ number })} />
        <TextElementEditor label="Label" value={since.label} onChange={(label) => setSince({ label })} />
        <div className="admin-form-grid">
          <SelectInput<FloatCardPosition>
            label="Position"
            value={since.position || 'bottom-left'}
            options={[
              { value: 'bottom-left', label: 'Bottom left' },
              { value: 'bottom-right', label: 'Bottom right' },
              { value: 'top-left', label: 'Top left' },
              { value: 'top-right', label: 'Top right' },
            ]}
            onChange={(position) => setSince({ position })}
          />
          <ColorInput label="Background" value={since.background} onChange={(background) => setSince({ background })} fallback="var(--navy-900)" />
          <TextInput label="Border" value={since.border} onChange={(border) => setSince({ border })} />
          <TextInput label="Radius" value={since.radius} onChange={(radius) => setSince({ radius })} placeholder="16px" />
          <Field label="Motion">
            <Toggle label="Float up and down" checked={since.float !== false} onChange={(float) => setSince({ float })} />
          </Field>
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Paragraphs">
        <ParagraphsEditor value={c.paragraphs} onChange={(paragraphs) => set({ paragraphs })} />
        <StyleEditor title="Paragraph style (all)" value={c.paragraphStyle} onChange={(paragraphStyle) => set({ paragraphStyle })} allowHide={false} fontSizePlaceholder="1.04rem" />
      </Group>
      <Group title="What we keep (points)">
        <Toggle label="Show points" checked={!k.hidden} onChange={(v) => setKeep({ hidden: !v })} />
        <ListEditor<LegacyKeepItem>
          label="Points"
          items={k.items || []}
          onChange={(items) => setKeep({ items })}
          addLabel="Point"
          create={() => ({ title: 'New point', body: 'Describe it.' })}
          itemTitle={(it) => it.title}
          renderItem={(it, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Title" value={it.title} onChange={(title) => patch({ ...it, title })} />
              <ColorInput label="Dot color" value={it.color} onChange={(color) => patch({ ...it, color })} fallback="" hint="Empty = shared dot color" />
              <TextArea label="Text" rows={2} value={it.body} onChange={(body) => patch({ ...it, body })} />
            </div>
          )}
        />
        <div className="admin-form-grid">
          <ColorInput label="Dot color (all)" value={k.dotColor} onChange={(dotColor) => setKeep({ dotColor })} fallback="var(--orange)" />
          <ColorInput label="Background" value={k.background} onChange={(background) => setKeep({ background })} fallback="var(--gray-100)" />
          <TextInput label="Border" value={k.border} onChange={(border) => setKeep({ border })} />
          <TextInput label="Radius" value={k.radius} onChange={(radius) => setKeep({ radius })} placeholder="12px" />
        </div>
        <StyleEditor title="Point title style" value={k.titleStyle} onChange={(titleStyle) => setKeep({ titleStyle })} allowHide={false} />
        <StyleEditor title="Point text style" value={k.bodyStyle} onChange={(bodyStyle) => setKeep({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.94rem" />
      </Group>
      <Group title="Buttons" description="Optional">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Journey                                                             */
/* ------------------------------------------------------------------ */

function LegacyJourneyEditor({ content: c, onChange }: EditorProps<LegacyJourneyContent>) {
  const set = (patch: Partial<LegacyJourneyContent>) => onChange({ ...c, ...patch });
  const pv = c.perView || {};
  const stage = c.stage || {};
  const setStage = (patch: Partial<LegacyJourneyContent['stage']>) => set({ stage: { ...stage, ...patch } });
  const dot = c.dot || {};
  const setDot = (patch: Partial<LegacyJourneyContent['dot']>) => set({ dot: { ...dot, ...patch } });
  const card = c.card || {};
  const setCard = (patch: Partial<LegacyJourneyContent['card']>) => set({ card: { ...card, ...patch } });
  const ctrl = c.controls || {};
  const setCtrl = (patch: Partial<LegacyJourneyContent['controls']>) => set({ controls: { ...ctrl, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Milestones" description="Shown in order; cards alternate above / below the line" open>
        <ListEditor<LegacyMilestone>
          label="Milestones"
          items={c.milestones || []}
          onChange={(milestones) => set({ milestones })}
          addLabel="Milestone"
          create={defaultLegacyMilestone}
          itemTitle={(m) => `${m.hidden ? '[hidden] ' : ''}${m.from}${m.to ? `–${m.to}` : ''} · ${m.title}${m.highlight ? ' · today' : ''}`}
          renderItem={(m, patch) => (
            <>
              <div className="admin-form-grid">
                <div className="full">
                  <Toggle label="Show this milestone" checked={!m.hidden} onChange={(v) => patch({ ...m, hidden: !v || undefined })} />
                </div>
                <TextInput label="From year" value={m.from} onChange={(from) => patch({ ...m, from })} placeholder="2006" />
                <TextInput label="To year (optional)" value={m.to} onChange={(to) => patch({ ...m, to })} placeholder="2007" />
                <TextInput label="Title" value={m.title} onChange={(title) => patch({ ...m, title })} />
                <ColorInput label="Accent color" value={m.color} onChange={(color) => patch({ ...m, color })} fallback="var(--orange)" />
                <TextArea label="Description" rows={3} value={m.body} onChange={(body) => patch({ ...m, body })} />
                <TextArea
                  label="Tags (one per line)"
                  rows={2}
                  value={(m.tags || []).join('\n')}
                  onChange={(text) => patch({ ...m, tags: text.split('\n') })}
                />
                <Field label="Style">
                  <Toggle label="Highlight as “today” (blue card)" checked={Boolean(m.highlight)} onChange={(highlight) => patch({ ...m, highlight: highlight || undefined })} />
                </Field>
              </div>
              <MediaItemsEditor
                label="Card photos / videos (optional)"
                items={m.media || []}
                onChange={(media) => patch({ ...m, media })}
                showLabel={false}
                showColor={false}
                hint="Shown at the top of the card; several items cross-fade."
              />
            </>
          )}
        />
      </Group>
      <Group title="Playback">
        <div className="admin-form-grid">
          <NumberInput
            label="Milestones per view · desktop"
            value={pv.desktop}
            min={1}
            max={5}
            placeholder="3"
            onChange={(desktop) => set({ perView: { ...pv, desktop } })}
          />
          <NumberInput
            label="Milestones per view · phone (<860px)"
            value={pv.mobile}
            min={1}
            max={2}
            placeholder="1"
            onChange={(mobile) => set({ perView: { ...pv, mobile } })}
          />
          <NumberInput
            label="Seconds each set stays open"
            value={c.dwellSeconds}
            min={1.5}
            step={0.1}
            placeholder="5.6"
            onChange={(dwellSeconds) => set({ dwellSeconds })}
          />
          <Field label="Behaviour">
            <Toggle label="Autoplay" checked={c.autoplay !== false} onChange={(autoplay) => set({ autoplay })} />
            <Toggle label="Pause while hovering" checked={c.pauseOnHover !== false} onChange={(pauseOnHover) => set({ pauseOnHover })} />
          </Field>
        </div>
      </Group>
      <Group title="Stage (dark timeline panel)">
        <div className="admin-form-grid">
          <TextInput label="Height" value={stage.height} onChange={(height) => setStage({ height })} placeholder="740px" />
          <TextInput label="Height (phone)" value={stage.heightMobile} onChange={(heightMobile) => setStage({ heightMobile })} placeholder="780px" />
          <TextInput label="Radius" value={stage.radius} onChange={(radius) => setStage({ radius })} placeholder="26px" />
          <TextInput label="Border" value={stage.border} onChange={(border) => setStage({ border })} placeholder="1px solid #1E3358" />
          <TextInput label="Shadow" value={stage.shadow} onChange={(shadow) => setStage({ shadow })} placeholder="0 40px 70px -40px rgba(10,22,40,0.85)" />
          <NumberInput
            label="Max spacing between years (px)"
            value={stage.maxSpacing}
            min={180}
            step={10}
            placeholder="340"
            onChange={(maxSpacing) => setStage({ maxSpacing })}
          />
          <ColorInput label="Line color" value={stage.lineColor} onChange={(lineColor) => setStage({ lineColor })} fallback="#2C4370" />
          <ColorInput label="Centre glow color" value={stage.glowColor} onChange={(glowColor) => setStage({ glowColor })} fallback="" />
          <Field label="Look">
            <Toggle label="Grid pattern" checked={stage.grid !== false} onChange={(grid) => setStage({ grid })} />
            <Toggle label="Fade left / right edges" checked={stage.fadeEdges !== false} onChange={(fadeEdges) => setStage({ fadeEdges })} />
          </Field>
          <TextArea
            label="Background"
            rows={2}
            value={stage.background}
            onChange={(background) => setStage({ background })}
            placeholder="radial-gradient(ellipse at 50% 50%,#173463 0%,#0F2244 45%,#0A1628 100%)"
          />
        </div>
      </Group>
      <Group title="Year dots">
        <div className="admin-form-grid">
          <TextInput label="Dot size" value={dot.size} onChange={(size) => setDot({ size })} placeholder="92px (84px phone)" />
          <ColorInput label="Idle background" value={dot.background} onChange={(background) => setDot({ background })} fallback="#12274B" />
          <ColorInput label="Idle border color" value={dot.border} onChange={(border) => setDot({ border })} fallback="#35507F" />
          <ColorInput label="Idle year color" value={dot.color} onChange={(color) => setDot({ color })} fallback="#8FA3C4" />
          <ColorInput label="Active ring color" value={dot.activeColor} onChange={(activeColor) => setDot({ activeColor })} fallback="var(--orange)" />
          <ColorInput label="“Today” dot background" value={dot.nowColor} onChange={(nowColor) => setDot({ nowColor })} fallback="#0049A3" />
        </div>
      </Group>
      <Group title="Milestone cards">
        <div className="admin-form-grid">
          <NumberInput label="Max card width (px)" value={card.maxWidth} min={200} step={10} placeholder="480" onChange={(maxWidth) => setCard({ maxWidth })} />
          <TextInput label="Background" value={card.background} onChange={(background) => setCard({ background })} placeholder="#FFFFFF" />
          <TextInput label="Border" value={card.border} onChange={(border) => setCard({ border })} />
          <TextInput label="Radius" value={card.radius} onChange={(radius) => setCard({ radius })} placeholder="16px" />
          <TextInput label="Padding" value={card.padding} onChange={(padding) => setCard({ padding })} placeholder="1.6rem 1.9rem 1.5rem" />
          <TextInput label="Shadow" value={card.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 26px 50px -22px rgba(0,0,0,0.65)" />
          <TextInput
            label="“Today” card background"
            value={card.nowBackground}
            onChange={(nowBackground) => setCard({ nowBackground })}
            placeholder="linear-gradient(135deg,#0049A3,#2A78DB)"
          />
          <TextInput
            label="Connector stem color"
            value={card.stemColor}
            onChange={(stemColor) => setCard({ stemColor })}
            placeholder="linear-gradient(var(--orange),var(--yellow))"
          />
          <TextInput label="Card media height" value={card.mediaHeight} onChange={(mediaHeight) => setCard({ mediaHeight })} placeholder="120px" />
        </div>
      </Group>
      <Group title="Card text styles">
        <StyleEditor title="Year style" value={c.yearStyle} onChange={(yearStyle) => set({ yearStyle })} allowHide={false} fontSizePlaceholder="0.78rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.4rem" />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="1rem" />
        <StyleEditor title="Tag chip style" value={c.tagStyle} onChange={(tagStyle) => set({ tagStyle })} allowHide={false} fontSizePlaceholder="0.72rem" />
      </Group>
      <Group title="Controls (prev / play / next)">
        <div className="admin-form-grid">
          <Field label="Show">
            <Toggle label="Show controls" checked={!ctrl.hidden} onChange={(v) => setCtrl({ hidden: !v })} />
            <Toggle label="Show set pips" checked={ctrl.pips !== false} onChange={(pips) => setCtrl({ pips })} />
          </Field>
          <ColorInput label="Button color" value={ctrl.color} onChange={(color) => setCtrl({ color })} fallback="var(--graphite-800)" />
          <ColorInput label="Active / hover color" value={ctrl.activeColor} onChange={(activeColor) => setCtrl({ activeColor })} fallback="var(--orange)" />
        </div>
        <StyleEditor title="Year range style" value={ctrl.rangeStyle} onChange={(rangeStyle) => setCtrl({ rangeStyle })} allowHide={false} fontSizePlaceholder="0.95rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

function LegacyValuesEditor({ content: c, onChange }: EditorProps<LegacyValuesContent>) {
  const set = (patch: Partial<LegacyValuesContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCard = (patch: Partial<LegacyValuesContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<LegacyValuesContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Value cards" open>
        <ListEditor<LegacyValueCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({
            color: 'var(--orange)',
            icon: { svg: LEGACY_ALL_ICON_PRESETS[0].svg },
            title: { text: 'New value', tag: 'h4' },
            body: { text: 'Describe this value.' },
          })}
          itemTitle={(card) => card.title?.text || ''}
          renderItem={(card, patch) => {
            const link = card.link || { label: '', href: '' };
            return (
              <>
                <div className="admin-form-grid">
                  <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="var(--orange)" />
                  <TextInput label="Link label (optional)" value={link.label} onChange={(label) => patch({ ...card, link: { ...link, label } })} placeholder="See how we work →" />
                  <TextInput label="Link URL" value={link.href} onChange={(href) => patch({ ...card, link: { ...link, href } })} placeholder="/certifications" />
                </div>
                <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
                <TextElementEditor label="Text" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
                <IconEditor value={card.icon} onChange={(icon) => patch({ ...card, icon })} presets={LEGACY_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
                <ImageEditor label="Card image (optional)" value={card.image || { src: '' }} onChange={(image) => patch({ ...card, image })} />
              </>
            );
          }}
        />
      </Group>
      <Group title="Grid layout">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <Field label="Scroll animation">
            <Toggle label="Staggered fade up on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCard}
          placeholders={{
            background: cs.glass === false ? '#FFFFFF' : 'rgba(255,255,255,0.09)',
            border: cs.glass === false ? '1px solid var(--gray-200)' : '1px solid rgba(255,255,255,0.22)',
            radius: '16px',
            padding: '1.7rem 1.5rem',
          }}
        >
          <TextInput label="Top accent border width" value={cs.topBorderWidth} onChange={(topBorderWidth) => setCard({ topBorderWidth })} placeholder="4px" />
          <Field label="Look">
            <Toggle label="Frosted glass cards (over the background)" checked={cs.glass !== false} onChange={(glass) => setCard({ glass })} />
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Icon box style (all cards)" description="Per-card icon settings override these">
        <div className="admin-form-grid">
          <TextInput label="Box size" value={is.boxSize} onChange={(boxSize) => setIcon({ boxSize })} placeholder="52px" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIcon({ size })} placeholder="26px" />
          <TextInput label="Box radius" value={is.radius} onChange={(radius) => setIcon({ radius })} placeholder="14px" />
          <ColorInput label="Box background" value={is.background} onChange={(background) => setIcon({ background })} fallback="" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.8" />
        </div>
      </Group>
      <Group title="Text styles (all cards)" description="Per-card title / text styles override these">
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.12rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

function LegacyCapsEditor({ content: c, onChange }: EditorProps<LegacyCapsContent>) {
  const set = (patch: Partial<LegacyCapsContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCard = (patch: Partial<LegacyCapsContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle, accent bar">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Capability cards" description="A card with a link becomes fully clickable" open>
        <ListEditor<LegacyCapCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({
            num: String((c.cards?.length || 0) + 1).padStart(2, '0'),
            color: 'var(--orange)',
            title: { text: 'New capability', tag: 'h4' },
            body: { text: 'Describe it.' },
            href: '',
            linkLabel: 'Explore →',
          })}
          itemTitle={(card) => `${card.num ? `${card.num} · ` : ''}${card.title?.text || ''}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number / tag" value={card.num} onChange={(num) => patch({ ...card, num })} placeholder="01" />
                <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="var(--orange)" />
                <TextInput label="Link URL" value={card.href} onChange={(href) => patch({ ...card, href })} placeholder="/#generate" />
                <TextInput label="Link label" value={card.linkLabel} onChange={(linkLabel) => patch({ ...card, linkLabel })} placeholder="Explore →" />
                <Field label="Link">
                  <Toggle label="Open in a new tab" checked={Boolean(card.newTab)} onChange={(newTab) => patch({ ...card, newTab: newTab || undefined })} />
                </Field>
              </div>
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Text" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <IconEditor
                label="Card icon (optional)"
                value={card.icon || {}}
                onChange={(icon) => patch({ ...card, icon })}
                presets={LEGACY_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
              <ImageEditor label="Card image (optional)" value={card.image || { src: '' }} onChange={(image) => patch({ ...card, image })} />
            </>
          )}
        />
      </Group>
      <Group title="Grid layout">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <Field label="Scroll animation">
            <Toggle label="Staggered fade up on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCard}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '16px', padding: '1.6rem 1.5rem 1.5rem' }}
        >
          <TextInput label="Top bar height" value={cs.barHeight} onChange={(barHeight) => setCard({ barHeight })} placeholder="4px" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
            <Toggle label="Accent bar grows on hover" checked={cs.topBar !== false} onChange={(topBar) => setCard({ topBar })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Text styles (all cards)" description="Per-card title / text styles override these">
        <StyleEditor title="Number style" value={c.numStyle} onChange={(numStyle) => set({ numStyle })} allowHide={false} fontSizePlaceholder="0.74rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.15rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.86rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The next twenty years                                               */
/* ------------------------------------------------------------------ */

function LegacyNextEditor({ content: c, onChange }: EditorProps<LegacyNextContent>) {
  const set = (patch: Partial<LegacyNextContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { listSide: 'right' };
  const setLayout = (patch: Partial<LegacyNextContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const is = c.itemStyle || {};
  const setItem = (patch: Partial<LegacyNextContent['itemStyle']>) => set({ itemStyle: { ...is, ...patch } });
  const ks = c.keyStyle || {};
  const setKey = (patch: Partial<LegacyNextContent['keyStyle']>) => set({ keyStyle: { ...ks, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} />
      <Group title="Layout & reveal">
        <div className="admin-form-grid">
          <AlignButtons
            label="List position"
            value={layout.listSide}
            options={['left', 'right']}
            onChange={(v) => setLayout({ listSide: (v || 'right') as 'left' | 'right' })}
          />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems || ''}
            options={VALIGN_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || undefined) as LegacyNextContent['layout']['alignItems'] })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="1fr 1fr" />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="4rem" />
          <Field label="Scroll animation">
            <Toggle label="Fade up on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Paragraphs">
        <ParagraphsEditor value={c.paragraphs} onChange={(paragraphs) => set({ paragraphs })} />
        <StyleEditor title="Paragraph style (all)" value={c.paragraphStyle} onChange={(paragraphStyle) => set({ paragraphStyle })} allowHide={false} fontSizePlaceholder="1.05rem" />
      </Group>
      <Group title="Buttons">
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Roadmap items">
        <ListEditor<LegacyNextItem>
          label="Items"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Item"
          create={() => ({ key: String((c.items?.length || 0) + 1).padStart(2, '0'), title: 'New item', body: 'Describe it.' })}
          itemTitle={(it) => `${it.key ? `${it.key} · ` : ''}${it.title}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Badge text" value={it.key} onChange={(key) => patch({ ...it, key })} placeholder="01" />
                <TextInput label="Title" value={it.title} onChange={(title) => patch({ ...it, title })} />
                <TextInput label="Badge background" value={it.color} onChange={(color) => patch({ ...it, color })} placeholder="Empty = shared badge background" />
                <TextArea label="Text" rows={2} value={it.body} onChange={(body) => patch({ ...it, body })} />
              </div>
              <IconEditor
                label="Badge icon (optional, replaces the badge text)"
                value={it.icon || {}}
                onChange={(icon) => patch({ ...it, icon })}
                presets={LEGACY_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
            </>
          )}
        />
      </Group>
      <Group title="Item card style">
        <CardStyleFields
          value={is}
          onChange={setItem}
          placeholders={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', radius: '14px', padding: '1.2rem 1.3rem' }}
        >
          <Field label="Hover">
            <Toggle label="Slide right on hover" checked={is.hoverSlide !== false} onChange={(hoverSlide) => setItem({ hoverSlide })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Number badge style">
        <div className="admin-form-grid">
          <TextInput label="Size" value={ks.size} onChange={(size) => setKey({ size })} placeholder="40px" />
          <TextInput label="Background" value={ks.background} onChange={(background) => setKey({ background })} placeholder="linear-gradient(135deg,#0049A3,#2A78DB)" />
          <TextInput label="Border" value={ks.border} onChange={(border) => setKey({ border })} placeholder="2px solid #8CC0FF" />
          <ColorInput label="Text color" value={ks.color} onChange={(color) => setKey({ color })} fallback="#FFFFFF" />
          <TextInput label="Radius" value={ks.radius} onChange={(radius) => setKey({ radius })} placeholder="50%" />
          <Field label="Glow">
            <Toggle label="Soft blue glow" checked={ks.glow !== false} onChange={(glow) => setKey({ glow })} />
          </Field>
        </div>
      </Group>
      <Group title="Item text styles">
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.05rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function LegacyCtaEditor({ content: c, onChange }: EditorProps<LegacyCtaContent>) {
  const set = (patch: Partial<LegacyCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as LegacyCtaContent['align'] })} />
          <TextInput label="Content max width" value={c.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="780px" />
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
      <Group title="Buttons" open>
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function LegacySectionEditor({
  type,
  content,
  onChange,
}: {
  type: LegacySectionType;
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
      <div className="az-admin lz-admin lgy-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'legacy_hero' ? (
            <LegacyHeroEditor content={withLegacyDefaults<LegacyHeroContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_stats' ? (
            <LegacyStatsEditor content={withLegacyDefaults<LegacyStatsContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_marquee' ? (
            <LegacyMarqueeEditor content={withLegacyDefaults<LegacyMarqueeContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_story' ? (
            <LegacyStoryEditor content={withLegacyDefaults<LegacyStoryContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_journey' ? (
            <LegacyJourneyEditor content={withLegacyDefaults<LegacyJourneyContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_values' ? (
            <LegacyValuesEditor content={withLegacyDefaults<LegacyValuesContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_caps' ? (
            <LegacyCapsEditor content={withLegacyDefaults<LegacyCapsContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_next' ? (
            <LegacyNextEditor content={withLegacyDefaults<LegacyNextContent>(type, content)} onChange={emit} />
          ) : type === 'legacy_cta' ? (
            <LegacyCtaEditor content={withLegacyDefaults<LegacyCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
