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
import { normalizeLinkItems, type ImageEl, type SplitLayout } from '@/lib/about-sections';
import {
  LIFE_ALL_ICON_PRESETS,
  defaultLifeEventGroup,
  withLifeDefaults,
  type LifeAlbum,
  type LifeCard,
  type LifeCardsContent,
  type LifeCtaContent,
  type LifeEventGroup,
  type LifeEventLayout,
  type LifeEventsContent,
  type LifeGalleryContent,
  type LifeHeroContent,
  type LifeRole,
  type LifeRolesContent,
  type LifeSectionType,
  type LifeStatItem,
  type LifeStatsContent,
} from '@/lib/life-sections';
import { HERO_HEIGHT_OPTIONS, normalizeHeroHeight } from '@/lib/hero-height';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview lz-icons-anim';

function SectionBoxGroup({ value, onChange }: { value: LifeHeroContent['section']; onChange: (v: LifeHeroContent['section']) => void }) {
  return (
    <Group title="Section background & spacing" description="Colors, gradient, image or video background, pattern, glow orbs, padding">
      <SectionBoxEditor value={value} onChange={onChange} />
    </Group>
  );
}

function SplitLayoutEditor({ value, onChange }: { value: SplitLayout; onChange: (next: SplitLayout) => void }) {
  const l = value || { imageSide: 'right' };
  return (
    <div className="admin-form-grid">
      <AlignButtons
        label="Media position"
        value={l.imageSide}
        options={['left', 'right']}
        onChange={(v) => onChange({ ...l, imageSide: (v || 'right') as SplitLayout['imageSide'] })}
      />
      <SelectInput
        label="Vertical alignment"
        value={l.alignItems || ''}
        options={[
          { value: '', label: 'Default (center)' },
          { value: 'start', label: 'Top' },
          { value: 'center', label: 'Center' },
          { value: 'end', label: 'Bottom' },
          { value: 'stretch', label: 'Stretch' },
        ]}
        onChange={(v) => onChange({ ...l, alignItems: (v || undefined) as SplitLayout['alignItems'] })}
      />
      <TextInput
        label="Column widths"
        value={l.columns}
        onChange={(columns) => onChange({ ...l, columns })}
        placeholder="1.15fr 0.98fr"
        hint="CSS grid columns in on-screen order. Empty = design default."
      />
      <TextInput label="Column gap" value={l.gap} onChange={(gap) => onChange({ ...l, gap })} placeholder="3.2rem" />
      <div className="full">
        <Toggle
          label="On tablet / phone (stacked), show the media above the text"
          checked={Boolean(l.mobileImageFirst)}
          onChange={(mobileImageFirst) => onChange({ ...l, mobileImageFirst })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page hero                                                           */
/* ------------------------------------------------------------------ */

function LifeHeroEditor({ content: c, onChange }: EditorProps<LifeHeroContent>) {
  const set = (patch: Partial<LifeHeroContent>) => onChange({ ...c, ...patch });
  const media = c.media || { items: [], frame: {} };
  const setMedia = (patch: Partial<LifeHeroContent['media']>) => set({ media: { ...media, ...patch } });
  const frame = media.frame || {};
  const setFrame = (patch: Partial<LifeHeroContent['media']['frame']>) => setMedia({ frame: { ...frame, ...patch } });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Breadcrumb">
        <Toggle label="Show breadcrumb" checked={!bc.hidden} onChange={(v) => set({ breadcrumb: { ...bc, hidden: !v } })} />
        <LinkListEditor
          label="Crumbs (last one = current page, leave its link empty)"
          items={normalizeLinkItems(bc.items)}
          onChange={(items) => set({ breadcrumb: { ...bc, items } })}
        />
        <div className="admin-form-grid">
          <TextInput label="Separator" value={bc.separator} onChange={(separator) => set({ breadcrumb: { ...bc, separator } })} placeholder="/" />
          <ColorInput
            label="Link hover color"
            value={bc.hoverColor}
            onChange={(hoverColor) => set({ breadcrumb: { ...bc, hoverColor } })}
            fallback="var(--cyan)"
          />
        </div>
        <StyleEditor title="Breadcrumb style" value={bc.style} onChange={(style) => set({ breadcrumb: { ...bc, style } })} allowHide={false} />
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
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
      <Group title="Media slideshow (images / videos)" description="Optional; adds a cross-fading slideshow beside the copy">
        <Toggle label="Show media" checked={!media.hidden} onChange={(v) => setMedia({ hidden: !v })} />
        <MediaItemsEditor
          label="Slides"
          items={media.items || []}
          onChange={(items) => setMedia({ items })}
          showLabel={false}
          showColor={false}
          hint="Leave empty for the single-column hero from the design. Add one item for a still image or several for a slideshow."
        />
        <div className="admin-form-grid">
          <NumberInput
            label="Seconds per slide"
            value={media.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="4"
            onChange={(intervalSeconds) => setMedia({ intervalSeconds })}
          />
          <Field label="Dots">
            <Toggle label="Show slide dots" checked={media.showDots !== false} onChange={(showDots) => setMedia({ showDots })} />
          </Field>
        </div>
        <div className="admin-form-grid">
          <SelectInput
            label="Hero height"
            value={normalizeHeroHeight(c.heroHeight)}
            options={HERO_HEIGHT_OPTIONS}
            onChange={(v) => set({ heroHeight: normalizeHeroHeight(v) })}
          />
        </div>
        <SplitLayoutEditor value={c.layout} onChange={(layout) => set({ layout })} />
        <div className="admin-form-grid">
          <SelectInput
            label="Fit"
            value={frame.fit || ''}
            options={[
              { value: '', label: 'Default (cover)' },
              { value: 'cover', label: 'Cover (crop to fill)' },
              { value: 'contain', label: 'Contain (show whole)' },
              { value: 'fill', label: 'Stretch' },
            ]}
            onChange={(fit) => setFrame({ fit: (fit || undefined) as ImageEl['fit'] })}
          />
          <TextInput label="Focus position" value={frame.position} onChange={(position) => setFrame({ position })} placeholder="center, 50% 30%" />
          <TextInput label="Aspect ratio" value={frame.aspectRatio} onChange={(aspectRatio) => setFrame({ aspectRatio })} placeholder="1482/850" />
          <TextInput label="Corner radius" value={frame.radius} onChange={(radius) => setFrame({ radius })} placeholder="20px" />
          <TextInput label="Min height" value={frame.minHeight} onChange={(minHeight) => setFrame({ minHeight })} />
          <TextInput label="Max width" value={frame.maxWidth} onChange={(maxWidth) => setFrame({ maxWidth })} />
          <TextInput label="Border" value={frame.border} onChange={(border) => setFrame({ border })} placeholder="1px solid rgba(255,255,255,0.12)" />
          <TextInput label="Shadow" value={frame.shadow} onChange={(shadow) => setFrame({ shadow })} placeholder="0 30px 70px -25px rgba(0,0,0,0.55)" />
          <ColorInput label="Frame background" value={frame.background} onChange={(background) => setFrame({ background })} fallback="" />
          <TextInput
            label="Overlay gradient"
            value={frame.overlay}
            onChange={(overlay) => setFrame({ overlay })}
            placeholder="linear-gradient(180deg, transparent 40%, rgba(10,22,40,0.55))"
            full
          />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stat bar                                                            */
/* ------------------------------------------------------------------ */

function LifeStatsEditor({ content: c, onChange }: EditorProps<LifeStatsContent>) {
  const set = (patch: Partial<LifeStatsContent>) => onChange({ ...c, ...patch });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<LifeStatsContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Stats" description="Numbers count up when the bar scrolls into view" open>
        <ListEditor<LifeStatItem>
          label="Stats"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Stat"
          create={() => ({ value: '100', suffix: '+', label: 'New stat', icon: { ...(c.items?.[0]?.icon || {}) } })}
          itemTitle={(s) => `${s.prefix || ''}${s.value}${s.suffix || ''} ${s.label}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number" value={s.value} onChange={(value) => patch({ ...s, value })} hint="Digits animate; any other text shows as typed." />
                <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
                <TextInput label="Prefix" value={s.prefix} onChange={(prefix) => patch({ ...s, prefix })} placeholder="e.g. ₹" />
                <TextInput label="Suffix" value={s.suffix} onChange={(suffix) => patch({ ...s, suffix })} placeholder="+" />
              </div>
              <IconEditor value={s.icon} onChange={(icon) => patch({ ...s, icon })} presets={LIFE_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 4, mobile: 2 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="0" />
          <AlignButtons label="Align" value={c.align} onChange={(align) => set({ align: (align || undefined) as LifeStatsContent['align'] })} />
          <Field label="Count-up">
            <Toggle label="Animate numbers" checked={c.animateCount !== false} onChange={(animateCount) => set({ animateCount })} />
          </Field>
          <NumberInput
            label="Count-up duration (ms)"
            value={c.countDurationMs}
            min={200}
            step={100}
            placeholder="1400"
            onChange={(countDurationMs) => set({ countDurationMs })}
          />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={c.hoverLift !== false} onChange={(hoverLift) => set({ hoverLift })} />
          </Field>
        </div>
      </Group>
      <Group title="Number & label style">
        <ColorInput label="Prefix / suffix color" value={c.suffixColor} onChange={(suffixColor) => set({ suffixColor })} fallback="var(--orange)" />
        <StyleEditor title="Number style" value={c.numberStyle} onChange={(numberStyle) => set({ numberStyle })} allowHide={false} fontSizePlaceholder="clamp(0.95rem,1.4vw,1.15rem)" />
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.6rem" />
      </Group>
      <Group title="Icon style (all stats)" description="Per-stat icon settings override these">
        <Toggle label="Show icons" checked={!is.hidden} onChange={(v) => setIcon({ hidden: !v })} />
        <div className="admin-form-grid">
          <TextInput label="Circle size" value={is.boxSize} onChange={(boxSize) => setIcon({ boxSize })} placeholder="28px" />
          <TextInput label="Inner padding" value={is.padding} onChange={(padding) => setIcon({ padding })} placeholder="7px" />
          <ColorInput label="Icon color" value={is.color} onChange={(color) => setIcon({ color })} fallback="var(--cyan)" />
          <ColorInput label="Background" value={is.background} onChange={(background) => setIcon({ background })} fallback="" />
          <TextInput label="Border" value={is.border} onChange={(border) => setIcon({ border })} placeholder="1px solid rgba(0,212,255,0.25)" />
          <TextInput label="Radius" value={is.radius} onChange={(radius) => setIcon({ radius })} placeholder="50%" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="1.4" />
          <ColorInput label="Hover icon color" value={is.hoverColor} onChange={(hoverColor) => setIcon({ hoverColor })} fallback="var(--orange)" />
          <ColorInput label="Hover background" value={is.hoverBackground} onChange={(hoverBackground) => setIcon({ hoverBackground })} fallback="" />
          <ColorInput label="Hover border color" value={is.hoverBorderColor} onChange={(hoverBorderColor) => setIcon({ hoverBorderColor })} fallback="" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Culture cards                                                       */
/* ------------------------------------------------------------------ */

function LifeCardsEditor({ content: c, onChange }: EditorProps<LifeCardsContent>) {
  const set = (patch: Partial<LifeCardsContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCard = (patch: Partial<LifeCardsContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const bar = cs.accentBar || {};
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle">
        <LifeHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Cards" open>
        <ListEditor<LifeCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({
            num: String((c.cards?.length || 0) + 1).padStart(2, '0'),
            color: 'var(--orange)',
            title: { text: 'New card', tag: 'h3' },
            body: { text: 'Describe this point.' },
          })}
          itemTitle={(card) => `${card.num ? `${card.num} · ` : ''}${card.title?.text || ''}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Number / tag" value={card.num} onChange={(num) => patch({ ...card, num })} placeholder="01" />
                <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="var(--orange)" />
                <ColorInput
                  label="Card background"
                  value={card.background}
                  onChange={(background) => patch({ ...card, background })}
                  fallback=""
                  hint="Overrides the shared card background"
                />
              </div>
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Body" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <ImageEditor label="Card image (optional)" value={card.image || { src: '' }} onChange={(image) => patch({ ...card, image })} />
              <IconEditor
                label="Card icon (optional)"
                value={card.icon || {}}
                onChange={(icon) => patch({ ...card, icon })}
                presets={LIFE_ALL_ICON_PRESETS}
                previewClassName={ICON_PREVIEW}
              />
            </>
          )}
        />
      </Group>
      <Group title="Grid layout">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.4rem" />
          <Field label="Scroll animation">
            <Toggle label="Fade up on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <div className="admin-form-grid">
          <TextInput
            label="Background"
            value={cs.background}
            onChange={(background) => setCard({ background })}
            placeholder="linear-gradient(160deg,#18335F 0%,#0F1F3D 100%)"
            full
          />
          <TextInput label="Border" value={cs.border} onChange={(border) => setCard({ border })} placeholder="1px solid rgba(255,255,255,0.08)" />
          <TextInput label="Radius" value={cs.radius} onChange={(radius) => setCard({ radius })} placeholder="16px" />
          <TextInput label="Padding" value={cs.padding} onChange={(padding) => setCard({ padding })} placeholder="1.8rem 1.6rem" />
          <TextInput label="Shadow" value={cs.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 18px 36px -20px rgba(10,22,40,0.55)" />
          <AlignButtons
            label="Text align"
            value={cs.textAlign}
            onChange={(textAlign) => setCard({ textAlign: (textAlign || undefined) as LifeCardsContent['cardStyle']['textAlign'] })}
          />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
            <Toggle label="Accent border on hover" checked={cs.hoverBorder !== false} onChange={(hoverBorder) => setCard({ hoverBorder })} />
          </Field>
          <Field label="Accent bar">
            <Toggle label="Show accent bar" checked={!bar.hidden} onChange={(v) => setCard({ accentBar: { ...bar, hidden: !v } })} />
          </Field>
          <TextInput label="Accent bar width" value={bar.width} onChange={(width) => setCard({ accentBar: { ...bar, width } })} placeholder="2.4rem" />
          <TextInput label="Accent bar height" value={bar.height} onChange={(height) => setCard({ accentBar: { ...bar, height } })} placeholder="3px" />
        </div>
      </Group>
      <Group title="Text styles (all cards)" description="Per-card title / body styles override these">
        <StyleEditor title="Number style" value={c.numStyle} onChange={(numStyle) => set({ numStyle })} allowHide={false} fontSizePlaceholder="0.78rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.15rem" />
        <StyleEditor title="Body style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.92rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

function LifeRolesEditor({ content: c, onChange }: EditorProps<LifeRolesContent>) {
  const set = (patch: Partial<LifeRolesContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCard = (patch: Partial<LifeRolesContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIcon = (patch: Partial<LifeRolesContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle">
        <LifeHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Roles" open>
        <ListEditor<LifeRole>
          label="Roles"
          items={c.roles || []}
          onChange={(roles) => set({ roles })}
          addLabel="Role"
          create={() => ({
            color: 'var(--orange)',
            icon: { svg: LIFE_ALL_ICON_PRESETS[0].svg },
            title: { text: 'New role', tag: 'h3' },
            body: { text: 'What this team does.' },
          })}
          itemTitle={(r) => `${r.title?.text || ''}${r.wide ? ' · full width' : ''}`}
          renderItem={(r, patch) => (
            <>
              <div className="admin-form-grid">
                <ColorInput label="Accent color" value={r.color} onChange={(color) => patch({ ...r, color })} fallback="var(--orange)" />
                <Field label="Width">
                  <Toggle label="Full-width row (icon beside text)" checked={Boolean(r.wide)} onChange={(wide) => patch({ ...r, wide: wide || undefined })} />
                </Field>
              </div>
              <TextElementEditor label="Title" headingTag value={r.title} onChange={(title) => patch({ ...r, title })} />
              <TextElementEditor label="Description" multiline value={r.body} onChange={(body) => patch({ ...r, body })} />
              <IconEditor value={r.icon} onChange={(icon) => patch({ ...r, icon })} presets={LIFE_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
      </Group>
      <Group title="Grid & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.2rem" />
          <Field label="Icons">
            <Toggle label="Animate icons" checked={c.animateIcons !== false} onChange={(animateIcons) => set({ animateIcons })} />
          </Field>
          <Field label="Entrance">
            <Toggle label="Staggered fade-in on scroll" checked={c.staggerReveal !== false} onChange={(staggerReveal) => set({ staggerReveal })} />
          </Field>
        </div>
      </Group>
      <Group title="Card style">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={cs.background} onChange={(background) => setCard({ background })} fallback="" hint="Default: frosted white on light, glass on dark" />
          <ColorInput label="Hover background" value={cs.hoverBackground} onChange={(hoverBackground) => setCard({ hoverBackground })} fallback="#FFFFFF" />
          <TextInput label="Border" value={cs.border} onChange={(border) => setCard({ border })} placeholder="1px solid rgba(60,110,170,0.18)" />
          <TextInput label="Radius" value={cs.radius} onChange={(radius) => setCard({ radius })} placeholder="14px" />
          <TextInput label="Padding" value={cs.padding} onChange={(padding) => setCard({ padding })} placeholder="1.5rem" />
          <TextInput label="Shadow" value={cs.shadow} onChange={(shadow) => setCard({ shadow })} placeholder="0 14px 30px -22px rgba(30,70,120,0.35)" />
          <Field label="Hover">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCard({ hoverLift })} />
            <Toggle label="Accent line on hover" checked={cs.topBar !== false} onChange={(topBar) => setCard({ topBar })} />
          </Field>
        </div>
      </Group>
      <Group title="Icon box style (all roles)" description="Per-role icon settings override these">
        <div className="admin-form-grid">
          <TextInput label="Box size" value={is.boxSize} onChange={(boxSize) => setIcon({ boxSize })} placeholder="64px" />
          <TextInput label="Icon size" value={is.size} onChange={(size) => setIcon({ size })} placeholder="40px" />
          <TextInput label="Box radius" value={is.radius} onChange={(radius) => setIcon({ radius })} placeholder="16px" />
          <ColorInput label="Box background" value={is.background} onChange={(background) => setIcon({ background })} fallback="#FFFFFF" />
          <TextInput label="Box border" value={is.border} onChange={(border) => setIcon({ border })} placeholder="1px solid rgba(60,110,170,0.18)" />
          <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => setIcon({ strokeWidth })} placeholder="2.2" />
          <Field label="Glow">
            <Toggle label="Inner accent glow" checked={is.glow !== false} onChange={(glow) => setIcon({ glow })} />
          </Field>
        </div>
      </Group>
      <Group title="Text styles (all roles)">
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.05rem" />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Events & moments                                                    */
/* ------------------------------------------------------------------ */

const LAYOUT_OPTIONS: Array<{ value: LifeEventLayout; label: string }> = [
  { value: 'marquee', label: 'Scrolling row (marquee)' },
  { value: 'albums', label: 'Album cards (zigzag, auto-cycling)' },
  { value: 'grid', label: 'Photo grid' },
];

function EventGroupEditor({ g, patch }: { g: LifeEventGroup; patch: (next: LifeEventGroup) => void }) {
  const m = g.marquee || {};
  const setM = (p: Partial<LifeEventGroup['marquee']>) => patch({ ...g, marquee: { ...m, ...p } });
  const a = g.albumOptions || {};
  const setA = (p: Partial<LifeEventGroup['albumOptions']>) => patch({ ...g, albumOptions: { ...a, ...p } });
  const grid = g.grid || {};
  const setG = (p: Partial<LifeEventGroup['grid']>) => patch({ ...g, grid: { ...grid, ...p } });
  return (
    <>
      <div className="admin-form-grid">
        <div className="full">
          <Toggle label="Show this group" checked={!g.hidden} onChange={(v) => patch({ ...g, hidden: !v || undefined })} />
        </div>
        <TextInput label="Number" value={g.num} onChange={(num) => patch({ ...g, num })} placeholder="01" />
        <SelectInput label="Layout" value={g.layout} options={LAYOUT_OPTIONS} onChange={(layout) => patch({ ...g, layout })} />
        <TextArea
          label="Tags (one per line, optional)"
          rows={2}
          value={(g.tags || []).join('\n')}
          onChange={(text) => patch({ ...g, tags: text.split('\n') })}
        />
      </div>
      <TextElementEditor label="Group title" headingTag value={g.title} onChange={(title) => patch({ ...g, title })} />

      {g.layout === 'albums' ? (
        <>
          <ListEditor<LifeAlbum>
            label="Albums"
            items={g.albums || []}
            onChange={(albums) => patch({ ...g, albums })}
            addLabel="Album"
            create={() => ({ name: 'New album', caption: 'Album', color: 'var(--orange)', items: [] })}
            itemTitle={(al) => `${al.hidden ? '[hidden] ' : ''}${al.name} · ${(al.items || []).length} items`}
            renderItem={(al, patchAlbum) => (
              <>
                <div className="admin-form-grid">
                  <div className="full">
                    <Toggle label="Show this album" checked={!al.hidden} onChange={(v) => patchAlbum({ ...al, hidden: !v || undefined })} />
                  </div>
                  <TextInput label="Album name" value={al.name} onChange={(name) => patchAlbum({ ...al, name })} />
                  <TextInput label="Caption" value={al.caption} onChange={(caption) => patchAlbum({ ...al, caption })} placeholder="Album" />
                  <ColorInput label="Accent color" value={al.color} onChange={(color) => patchAlbum({ ...al, color })} fallback="var(--orange)" />
                </div>
                <MediaItemsEditor
                  label="Album photos / videos"
                  items={al.items || []}
                  onChange={(items) => patchAlbum({ ...al, items })}
                  showLabel={false}
                  showColor={false}
                />
              </>
            )}
          />
          <div className="admin-form-grid">
            <ColumnsEditor label="Albums per row" value={a.columns} onChange={(columns) => setA({ columns })} defaults={{ desktop: 5, tablet: 2, mobile: 2 }} />
            <NumberInput
              label="Seconds per photo"
              value={a.intervalSeconds}
              min={1}
              step={0.1}
              placeholder="2.8"
              onChange={(intervalSeconds) => setA({ intervalSeconds })}
            />
            <Field label="Look">
              <Toggle label="Zigzag tilt" checked={a.tilt !== false} onChange={(tilt) => setA({ tilt })} />
              <Toggle label="Dashed connector line (desktop)" checked={a.showConnector !== false} onChange={(showConnector) => setA({ showConnector })} />
              <Toggle label="Show photo count" checked={a.showCount !== false} onChange={(showCount) => setA({ showCount })} />
              <Toggle label="Pop-in on scroll" checked={a.reveal !== false} onChange={(reveal) => setA({ reveal })} />
            </Field>
          </div>
        </>
      ) : (
        <>
          <MediaItemsEditor
            label={g.layout === 'grid' ? 'Grid photos / videos' : 'Row photos / videos'}
            items={g.items || []}
            onChange={(items) => patch({ ...g, items })}
            allowBig={g.layout === 'grid'}
          />
          {g.layout === 'grid' ? (
            <div className="admin-form-grid">
              <ColumnsEditor value={grid.columns} onChange={(columns) => setG({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 2 }} />
              <TextInput label="Row height" value={grid.rowHeight} onChange={(rowHeight) => setG({ rowHeight })} placeholder="210px" />
              <TextInput label="Row height (phone)" value={grid.rowHeightMobile} onChange={(rowHeightMobile) => setG({ rowHeightMobile })} placeholder="150px" />
            </div>
          ) : (
            <div className="admin-form-grid">
              <NumberInput
                label="Loop duration (seconds)"
                value={m.speedSeconds}
                min={5}
                placeholder="45"
                hint="Higher = slower"
                onChange={(speedSeconds) => setM({ speedSeconds })}
              />
              <SelectInput
                label="Direction"
                value={m.direction || 'ltr'}
                options={[
                  { value: 'ltr', label: 'Left → right' },
                  { value: 'rtl', label: 'Right → left' },
                ]}
                onChange={(direction) => setM({ direction })}
              />
              <TextInput label="Tile width" value={m.tileWidth} onChange={(tileWidth) => setM({ tileWidth })} placeholder="300px" />
              <TextInput label="Tile height" value={m.tileHeight} onChange={(tileHeight) => setM({ tileHeight })} placeholder="210px" />
              <TextInput label="Tile width (phone)" value={m.tileWidthMobile} onChange={(tileWidthMobile) => setM({ tileWidthMobile })} placeholder="220px" />
              <TextInput label="Tile height (phone)" value={m.tileHeightMobile} onChange={(tileHeightMobile) => setM({ tileHeightMobile })} placeholder="165px" />
              <TextInput label="Gap" value={m.gap} onChange={(gap) => setM({ gap })} placeholder="1.2rem" />
              <Field label="Behaviour">
                <Toggle label="Pause on hover" checked={m.pauseOnHover !== false} onChange={(pauseOnHover) => setM({ pauseOnHover })} />
                <Toggle label="Fade edges" checked={m.fadeEdges !== false} onChange={(fadeEdges) => setM({ fadeEdges })} />
              </Field>
            </div>
          )}
        </>
      )}
    </>
  );
}

function LifeEventsEditor({ content: c, onChange }: EditorProps<LifeEventsContent>) {
  const set = (patch: Partial<LifeEventsContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading with gradient word, subtitle">
        <LifeHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Event groups" description="Each group is a scrolling row, album cards or a photo grid" open>
        <ListEditor<LifeEventGroup>
          label="Groups"
          items={c.groups || []}
          onChange={(groups) => set({ groups })}
          addLabel="Group"
          create={() => ({
            ...defaultLifeEventGroup('marquee'),
            num: String((c.groups?.length || 0) + 1).padStart(2, '0'),
          })}
          itemTitle={(g) =>
            `${g.hidden ? '[hidden] ' : ''}${g.num ? `${g.num} · ` : ''}${g.title?.text || ''} · ${
              LAYOUT_OPTIONS.find((o) => o.value === g.layout)?.label.split(' (')[0] || g.layout
            }`
          }
          renderItem={(g, patch) => <EventGroupEditor g={g} patch={patch} />}
        />
      </Group>
      <Group title="Tiles, captions & lightbox">
        <div className="admin-form-grid">
          <TextInput label="Tile corner radius" value={c.tileRadius} onChange={(tileRadius) => set({ tileRadius })} placeholder="16px" />
          <Field label="Click to enlarge">
            <Toggle label="Open photos in a lightbox" checked={c.lightbox !== false} onChange={(lightbox) => set({ lightbox })} />
          </Field>
        </div>
        <StyleEditor title="Caption style (tiles & album names)" value={c.captionStyle} onChange={(captionStyle) => set({ captionStyle })} allowHide={false} />
      </Group>
      <Group title="Group heading styles">
        <StyleEditor title="Group title style" value={c.groupTitleStyle} onChange={(groupTitleStyle) => set({ groupTitleStyle })} allowHide={false} fontSizePlaceholder="clamp(1.4rem,2.4vw,1.9rem)" />
        <StyleEditor title="Group number style" value={c.groupNumStyle} onChange={(groupNumStyle) => set({ groupNumStyle })} allowHide={false} fontSizePlaceholder="0.8rem" />
        <StyleEditor title="Tag chip style" value={c.tagStyle} onChange={(tagStyle) => set({ tagStyle })} allowHide={false} />
      </Group>
      <Group title="Footnote">
        <TextElementEditor label="Note" value={c.note} onChange={(note) => set({ note })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

function LifeGalleryEditor({ content: c, onChange }: EditorProps<LifeGalleryContent>) {
  const set = (patch: Partial<LifeGalleryContent>) => onChange({ ...c, ...patch });
  const s = c.slider || { enabled: true };
  const setS = (patch: Partial<LifeGalleryContent['slider']>) => set({ slider: { ...s, ...patch } });
  const h = c.hover || {};
  const setH = (patch: Partial<LifeGalleryContent['hover']>) => set({ hover: { ...h, ...patch } });
  const rh = c.rowHeight || {};
  const setRh = (patch: Partial<LifeGalleryContent['rowHeight']>) => set({ rowHeight: { ...rh, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section header" description="Eyebrow, heading (Site Settings level), subtitle">
        <LifeHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Photos & videos" open>
        <MediaItemsEditor
          label="Gallery items"
          items={c.items || []}
          onChange={(items) => set({ items })}
          allowBig
          hint="With the slider on, the big tile (or the first item) becomes an auto-sliding tile that cycles through every item."
        />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <SelectInput
            label="Layout"
            value={c.layout || 'mosaic'}
            options={[
              { value: 'mosaic', label: 'Mosaic (big tile spans 2 × 2)' },
              { value: 'grid', label: 'Even grid (4:3 tiles)' },
            ]}
            onChange={(layout) => set({ layout })}
          />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1rem" />
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 2 }} />
          <TextInput label="Row height · desktop (mosaic)" value={rh.desktop} onChange={(desktop) => setRh({ desktop })} placeholder="210px" />
          <TextInput label="Row height · tablet" value={rh.tablet} onChange={(tablet) => setRh({ tablet })} placeholder="170px" />
          <TextInput label="Row height · phone" value={rh.mobile} onChange={(mobile) => setRh({ mobile })} placeholder="150px" />
        </div>
      </Group>
      <Group title="Auto slider (big tile)">
        <div className="admin-form-grid">
          <Field label="Slider">
            <Toggle label="Enable auto slider" checked={s.enabled !== false} onChange={(enabled) => setS({ enabled })} />
            <Toggle label="Pause on hover" checked={s.pauseOnHover !== false} onChange={(pauseOnHover) => setS({ pauseOnHover })} />
            <Toggle label="Show dots" checked={s.showDots !== false} onChange={(showDots) => setS({ showDots })} />
          </Field>
          <NumberInput
            label="Seconds per slide"
            value={s.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="2"
            onChange={(intervalSeconds) => setS({ intervalSeconds })}
          />
        </div>
      </Group>
      <Group title="Tiles, hover & lightbox">
        <div className="admin-form-grid">
          <Field label="Hover effects">
            <Toggle label="Zoom icon" checked={h.zoomIcon !== false} onChange={(zoomIcon) => setH({ zoomIcon })} />
            <Toggle label="Light sweep" checked={h.shine !== false} onChange={(shine) => setH({ shine })} />
            <Toggle label="Lift + outline" checked={h.lift !== false} onChange={(lift) => setH({ lift })} />
          </Field>
          <ColorInput label="Hover accent" value={h.accent} onChange={(accent) => setH({ accent })} fallback="var(--orange)" />
          <TextInput label="Tile corner radius" value={c.tileRadius} onChange={(tileRadius) => set({ tileRadius })} placeholder="14px" />
          <TextInput label="Tile shadow" value={c.tileShadow} onChange={(tileShadow) => set({ tileShadow })} placeholder="0 14px 28px -18px rgba(10,22,40,0.4)" />
          <Field label="Captions & lightbox">
            <Toggle label="Show captions on tiles" checked={Boolean(c.captions)} onChange={(captions) => set({ captions })} />
            <Toggle label="Open photos in a lightbox" checked={c.lightbox !== false} onChange={(lightbox) => set({ lightbox })} />
          </Field>
        </div>
        <StyleEditor title="Caption style" value={c.captionStyle} onChange={(captionStyle) => set({ captionStyle })} allowHide={false} />
      </Group>
      <Group title="Footnote">
        <TextElementEditor label="Note" value={c.note} onChange={(note) => set({ note })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function LifeCtaEditor({ content: c, onChange }: EditorProps<LifeCtaContent>) {
  const set = (patch: Partial<LifeCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as LifeCtaContent['align'] })} />
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

export default function LifeSectionEditor({
  type,
  content,
  onChange,
}: {
  type: LifeSectionType;
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
      <div className="az-admin lz-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'life_hero' ? (
            <LifeHeroEditor content={withLifeDefaults<LifeHeroContent>(type, content)} onChange={emit} />
          ) : type === 'life_stats' ? (
            <LifeStatsEditor content={withLifeDefaults<LifeStatsContent>(type, content)} onChange={emit} />
          ) : type === 'life_cards' ? (
            <LifeCardsEditor content={withLifeDefaults<LifeCardsContent>(type, content)} onChange={emit} />
          ) : type === 'life_roles' ? (
            <LifeRolesEditor content={withLifeDefaults<LifeRolesContent>(type, content)} onChange={emit} />
          ) : type === 'life_events' ? (
            <LifeEventsEditor content={withLifeDefaults<LifeEventsContent>(type, content)} onChange={emit} />
          ) : type === 'life_gallery' ? (
            <LifeGalleryEditor content={withLifeDefaults<LifeGalleryContent>(type, content)} onChange={emit} />
          ) : type === 'life_cta' ? (
            <LifeCtaEditor content={withLifeDefaults<LifeCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
