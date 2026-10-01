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
  MediaItemsEditor,
  NapHint,
  NumberInput,
} from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { normalizeLinkItems } from '@/lib/about-sections';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';
import HeroMotionFields from '@/components/admin/HeroMotionFields';
import { HERO_VALIGN_CHOICES } from '@/lib/hero-height';
import {
  CONTACT_ALL_ICON_PRESETS,
  createContactLocation,
  withContactDefaults,
  type ContactFormContent,
  type ContactHelpCard,
  type ContactHelpContent,
  type ContactHelpVariant,
  type ContactHeroContent,
  type ContactHoursRow,
  type ContactIconStyle,
  type ContactLocation,
  type ContactLocationsContent,
  type ContactOffice,
  type ContactQuickContent,
  type ContactQuickItem,
  type ContactSectionType,
  type ContactSideItem,
} from '@/lib/contact-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const SUBJECT_HINT = 'Scrolls to the contact form and preselects this subject (must match a Subject option in Admin → Forms → enquiry). Wins over the link.';

/** Accepts a pasted Google Maps <iframe> snippet and keeps only its src URL. */
function embedSrc(v: string) {
  const m = v.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return m ? m[1] : v;
}

const ROLE_HINT = 'Scrolls to the application form and preselects this role (added to the role list when missing). Wins over the link.';

export function IconStyleFields({
  value,
  onChange,
  placeholders,
}: {
  value?: ContactIconStyle;
  onChange: (next: ContactIconStyle) => void;
  placeholders: { box: string; size: string; radius: string; background: string; color: string };
}) {
  const is = value || {};
  const set = (patch: Partial<ContactIconStyle>) => onChange({ ...is, ...patch });
  return (
    <div className="admin-form-grid">
      <TextInput label="Icon box size" value={is.boxSize} onChange={(boxSize) => set({ boxSize })} placeholder={placeholders.box} />
      <TextInput label="Icon size" value={is.size} onChange={(size) => set({ size })} placeholder={placeholders.size} />
      <TextInput label="Box radius" value={is.radius} onChange={(radius) => set({ radius })} placeholder={placeholders.radius} />
      <TextInput label="Stroke width" value={is.strokeWidth} onChange={(strokeWidth) => set({ strokeWidth })} placeholder="1.6" />
      <ColorInput label="Box background" value={is.background} onChange={(background) => set({ background })} fallback={placeholders.background} />
      <ColorInput label="Icon color" value={is.color} onChange={(color) => set({ color })} fallback={placeholders.color} />
      <TextInput label="Box border" value={is.border} onChange={(border) => set({ border })} placeholder="none" />
    </div>
  );
}

export function ActionFields<T extends { href?: string; subject?: string; role?: string; newTab?: boolean }>({
  value,
  patch,
  hrefLabel = 'Link',
  mode = 'subject',
}: {
  value: T;
  patch: (next: T) => void;
  hrefLabel?: string;
  /** subject = contact form preset; role = careers application role */
  mode?: 'subject' | 'role';
}) {
  return (
    <>
      <TextInput
        label={hrefLabel}
        value={value.href}
        onChange={(href) => patch({ ...value, href })}
        placeholder="tel:{{phone}}, mailto:{{email}}, /page, https://…"
      />
      {mode === 'role' ? (
        <TextInput label="Apply role (optional)" value={value.role} onChange={(role) => patch({ ...value, role })} hint={ROLE_HINT} />
      ) : (
        <TextInput label="Form subject (optional)" value={value.subject} onChange={(subject) => patch({ ...value, subject })} hint={SUBJECT_HINT} />
      )}
      <Field label="Link behaviour">
        <Toggle label="Open link in a new tab" checked={Boolean(value.newTab)} onChange={(newTab) => patch({ ...value, newTab })} />
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function ContactHeroEditor({ content: c, onChange }: EditorProps<ContactHeroContent>) {
  const set = (patch: Partial<ContactHeroContent>) => onChange({ ...c, ...patch });
  const bc = c.breadcrumb || { items: [], separator: '/' };
  const setBc = (patch: Partial<ContactHeroContent['breadcrumb']>) => set({ breadcrumb: { ...bc, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup
        value={c.background}
        onChange={(background) => set({ background })}
        title="Background images / videos (slideshow)"
        withIndicators
      />
      <Group title="Layout, height & motion">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} onChange={(heroHeight) => set({ heroHeight })} />
          <HeroPlacementEditor value={c.placement} onChange={(placement) => set({ placement })} />
          <AlignButtons
            label="Content align"
            value={c.align}
            options={['left', 'center']}
            onChange={(v) => set({ align: (v || undefined) as ContactHeroContent['align'] })}
          />
          <SelectInput
            label="Vertical position (full / custom height)"
            value={c.vAlign || ''}
            options={HERO_VALIGN_CHOICES}
            onChange={(v) => set({ vAlign: v || undefined })}
          />
          <TextInput label="Content max width" value={c.contentMaxWidth} onChange={(contentMaxWidth) => set({ contentMaxWidth })} placeholder="900px" />
        </div>
        <HeroMotionFields
          entrance={c.entrance !== false}
          onEntrance={(entrance) => set({ entrance })}
          scrollBar={c.scrollBar}
          onScrollBar={(scrollBar) => set({ scrollBar })}
        />
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
          <ColorInput label="Link hover color" value={bc.hoverColor} onChange={(hoverColor) => setBc({ hoverColor })} fallback="#FFFFFF" />
          <ColorInput label="Current page color" value={bc.currentColor} onChange={(currentColor) => setBc({ currentColor })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Breadcrumb style" value={bc.style} onChange={(style) => setBc({ style })} allowHide={false} fontSizePlaceholder="0.86rem" />
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading (H1)" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="pageHero" value={c.title} onChange={(title) => set({ title })} />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Lead paragraphs" description="Bold first line, main lead and accent-coloured closing line; empty = hidden">
        <TextElementEditor label="Emphasis line (bold, white)" multiline value={c.leadEmphasis} onChange={(leadEmphasis) => set({ leadEmphasis })} />
        <TextElementEditor label="Lead" multiline value={c.lead} onChange={(lead) => set({ lead })} />
        <TextElementEditor label="Accent line (light blue)" multiline value={c.leadAccent} onChange={(leadAccent) => set({ leadAccent })} />
        <StyleEditor
          title="Shared lead style (all three lines)"
          value={c.leadStyle}
          onChange={(leadStyle) => set({ leadStyle })}
          allowHide={false}
          fontSizePlaceholder="var(--text-lead)"
        />
      </Group>
      <Group title="Pills">
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
/* Quick contact bar                                                   */
/* ------------------------------------------------------------------ */

function ContactQuickEditor({ content: c, onChange }: EditorProps<ContactQuickContent>) {
  const set = (patch: Partial<ContactQuickContent>) => onChange({ ...c, ...patch });
  const em = c.emergency || {};
  const setEm = (patch: Partial<ContactQuickContent['emergency']>) => set({ emergency: { ...em, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Contact items" open>
        <NapHint />
        <ListEditor<ContactQuickItem>
          label="Items"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Item"
          create={() => ({ label: 'New item', value: '{{phone}}', href: 'tel:{{phone}}', icon: { svg: CONTACT_ALL_ICON_PRESETS[0].svg } })}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.label} · ${it.value}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this item" checked={!it.hidden} onChange={(v) => patch({ ...it, hidden: !v })} />
                  <Toggle label="Emergency style (orange)" checked={Boolean(it.emergency)} onChange={(emergency) => patch({ ...it, emergency })} />
                </Field>
                <TextInput label="Label (small caps)" value={it.label} onChange={(label) => patch({ ...it, label })} />
                <TextInput label="Value" value={it.value} onChange={(value) => patch({ ...it, value })} placeholder="{{phone}}" />
                <ActionFields value={it} patch={patch} />
              </div>
              <IconEditor label="Icon" value={it.icon || {}} onChange={(icon) => patch({ ...it, icon })} presets={CONTACT_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
            </>
          )}
        />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.5rem" />
          <AlignButtons label="Item align" value={c.justify} onChange={(v) => set({ justify: (v || undefined) as ContactQuickContent['justify'] })} />
          <Field label="Dividers">
            <Toggle label="Divider lines between items" checked={Boolean(c.dividers)} onChange={(dividers) => set({ dividers })} />
          </Field>
          <ColorInput label="Divider color" value={c.dividerColor} onChange={(dividerColor) => set({ dividerColor })} fallback="rgba(255,255,255,0.1)" />
        </div>
      </Group>
      <Group title="Item box style" description="Optional box around each item (transparent by default)">
        <CardStyleFields
          value={c.itemStyle || {}}
          onChange={(patch) => set({ itemStyle: { ...c.itemStyle, ...patch } })}
          placeholders={{ background: 'transparent', border: 'none', radius: '0', padding: '0' }}
        />
      </Group>
      <Group title="Icon style">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '40px', size: '20px', radius: '8px', background: 'rgba(255,255,255,0.06)', color: 'var(--cyan)' }}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <ColorInput label="Emergency icon background" value={em.iconBackground} onChange={(iconBackground) => setEm({ iconBackground })} fallback="rgba(255,107,26,0.15)" />
          <ColorInput label="Emergency icon color" value={em.iconColor} onChange={(iconColor) => setEm({ iconColor })} fallback="var(--orange)" />
        </div>
      </Group>
      <Group title="Label & value text">
        <div className="admin-form-grid">
          <ColorInput label="Value hover color" value={c.hoverColor} onChange={(hoverColor) => set({ hoverColor })} fallback="var(--cyan)" />
          <ColorInput label="Emergency value color" value={em.color} onChange={(color) => setEm({ color })} fallback="var(--orange)" />
        </div>
        <StyleEditor title="Label style" value={c.labelStyle} onChange={(labelStyle) => set({ labelStyle })} allowHide={false} fontSizePlaceholder="0.66rem" />
        <StyleEditor title="Value style" value={c.valueStyle} onChange={(valueStyle) => set({ valueStyle })} allowHide={false} fontSizePlaceholder="0.98rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* How can we help                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_OPTIONS: Array<{ value: ContactHelpVariant; label: string }> = [
  { value: 'default', label: 'Default (card style color)' },
  { value: 'green', label: 'Green (pastel)' },
  { value: 'emergency', label: 'Emergency (orange)' },
];

type HelpEditorOptions = {
  presets?: Array<{ key: string; label: string; svg: string }>;
  actionMode?: 'subject' | 'role';
  cardsTitle?: string;
  /** Card style placeholders (design defaults) */
  cardPlaceholders?: { background: string; border: string; shadow: string };
};

export function ContactHelpEditor({
  content: c,
  onChange,
  presets = CONTACT_ALL_ICON_PRESETS,
  actionMode = 'subject',
  cardsTitle = 'Request cards',
  cardPlaceholders = { background: '#EAF2FC', border: '1px solid rgba(0,123,214,0.12)', shadow: '0 6px 18px -8px rgba(10,22,40,0.18)' },
}: EditorProps<ContactHelpContent> & HelpEditorOptions) {
  const set = (patch: Partial<ContactHelpContent>) => onChange({ ...c, ...patch });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<ContactHelpContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const v = c.variants || {};
  const setV = (patch: Partial<ContactHelpContent['variants']>) => set({ variants: { ...v, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title={cardsTitle} open>
        <NapHint />
        <ListEditor<ContactHelpCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({
            title: { text: actionMode === 'role' ? 'New card' : 'New request' },
            body: { text: 'Short description.' },
            icon: { svg: (presets[2] || presets[0])?.svg || '' },
            media: [],
            linkLabel: actionMode === 'role' ? '' : 'Start Request →',
            subject: '',
          })}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.title?.text || 'Card'}`}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!card.hidden} onChange={(on) => patch({ ...card, hidden: !on })} />
                </Field>
                <SelectInput
                  label="Color variant"
                  value={card.variant || 'default'}
                  options={VARIANT_OPTIONS}
                  onChange={(variant) => patch({ ...card, variant })}
                />
                <TextInput label="Background override" value={card.background} onChange={(background) => patch({ ...card, background })} placeholder="Empty = variant color" />
                <TextInput label="Border override" value={card.border} onChange={(border) => patch({ ...card, border })} placeholder="1px solid rgba(0,123,214,0.12)" />
              </div>
              <TextElementEditor label="Title" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Description" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <div className="admin-form-grid">
                <TextInput
                  label="Link label"
                  value={card.linkLabel}
                  onChange={(linkLabel) => patch({ ...card, linkLabel })}
                  placeholder={actionMode === 'role' ? 'Empty = no link, e.g. See open roles →' : 'Ask About Solar →'}
                />
                <ActionFields value={card} patch={patch} mode={actionMode} />
              </div>
              <IconEditor label="Icon" value={card.icon || {}} onChange={(icon) => patch({ ...card, icon })} presets={presets} previewClassName={ICON_PREVIEW} />
              <div className="admin-form-grid">
                <TextInput label="Badge text (when no icon)" value={card.badge} onChange={(badge) => patch({ ...card, badge })} placeholder="e.g. 24×7" />
                <ColorInput label="Badge color" value={card.badgeColor} onChange={(badgeColor) => patch({ ...card, badgeColor })} fallback="var(--cyan)" />
              </div>
              <MediaItemsEditor
                label="Card images / videos (slideshow at the top of the card)"
                items={card.media || []}
                onChange={(media) => patch({ ...card, media })}
                showLabel={false}
                showColor={false}
                hint="Optional. Several items cross-fade; takes priority over the single image below."
              />
              <ImageEditor label="Single image" value={card.image || { src: '', hidden: true }} onChange={(image) => patch({ ...card, image })} />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.6rem" />
          <Field label="Motion">
            <Toggle label="Staggered reveal on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
          <TextInput label="Card media height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="170px" />
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
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ ...cardPlaceholders, radius: '10px', padding: '1.9rem' }}
        />
      </Group>
      <Group title="Variant colors" description="Green and emergency card tints">
        <div className="admin-form-grid">
          <ColorInput label="Green background" value={v.greenBackground} onChange={(greenBackground) => setV({ greenBackground })} fallback="#EAF7EF" />
          <TextInput label="Green border" value={v.greenBorder} onChange={(greenBorder) => setV({ greenBorder })} placeholder="1px solid rgba(46,160,101,0.15)" />
          <ColorInput label="Emergency background" value={v.emergencyBackground} onChange={(emergencyBackground) => setV({ emergencyBackground })} fallback="#FFF7F2" />
          <TextInput label="Emergency border" value={v.emergencyBorder} onChange={(emergencyBorder) => setV({ emergencyBorder })} placeholder="1px solid rgba(255,107,26,0.25)" />
          <ColorInput
            label="Emergency icon background"
            value={v.emergencyIconBackground}
            onChange={(emergencyIconBackground) => setV({ emergencyIconBackground })}
            fallback="var(--orange)"
          />
          <ColorInput label="Emergency icon color" value={v.emergencyIconColor} onChange={(emergencyIconColor) => setV({ emergencyIconColor })} fallback="#FFFFFF" />
        </div>
      </Group>
      <Group title="Icon style">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '46px', size: '24px', radius: '9px', background: 'var(--navy-950)', color: 'var(--cyan)' }}
        />
      </Group>
      <Group title="Card text style">
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.12rem" />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.98rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
        <ColorInput label="Link hover color" value={c.linkHoverColor} onChange={(linkHoverColor) => set({ linkHoverColor })} fallback="var(--orange-dim)" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

const PANEL_MODE_OPTIONS = [
  { value: 'map', label: 'Google map (office media when a map is missing)' },
  { value: 'media', label: 'Images / videos (map when an office has no media)' },
] as const;

const INTERACTION_OPTIONS = [
  { value: 'hover', label: 'Hover previews on desktop, tap on touch' },
  { value: 'click', label: 'Click / tap only' },
] as const;

const PANEL_ALIGN_OPTIONS = [
  { value: '', label: 'Default (stretch to equal height)' },
  { value: 'start', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'Bottom' },
] as const;

function ContactLocationsEditor({ content: c, onChange }: EditorProps<ContactLocationsContent>) {
  const set = (patch: Partial<ContactLocationsContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { panelSide: 'right' };
  const setLayout = (patch: Partial<ContactLocationsContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const panel = c.panel || { mode: 'map', media: [] };
  const setPanel = (patch: Partial<ContactLocationsContent['panel']>) => set({ panel: { ...panel, ...patch } });
  const cs = c.cardStyle || {};
  const setCs = (patch: Partial<ContactLocationsContent['cardStyle']>) => set({ cardStyle: { ...cs, ...patch } });
  const setDefault = (id: string) => set({ locations: (c.locations || []).map((l) => ({ ...l, isDefault: l.id === id })) });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro above the office cards">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Offices" open>
        <NapHint />
        <ListEditor<ContactLocation>
          label="Offices"
          items={c.locations || []}
          onChange={(locations) => set({ locations })}
          addLabel="Office"
          create={() => createContactLocation({ icon: { svg: CONTACT_ALL_ICON_PRESETS[4].svg } })}
          itemTitle={(l) => `${l.hidden ? '(hidden) ' : ''}${l.isDefault ? '★ ' : ''}${l.title || 'Office'}`}
          renderItem={(l, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this office" checked={!l.hidden} onChange={(on) => patch({ ...l, hidden: !on })} />
                  <Toggle
                    label="Default office (its map / media shows first)"
                    checked={Boolean(l.isDefault)}
                    onChange={(on) => (on ? setDefault(l.id) : patch({ ...l, isDefault: false }))}
                  />
                </Field>
                <TextInput label="Tag" value={l.tag} onChange={(tag) => patch({ ...l, tag })} placeholder="Head Office" />
                <TextInput label="Title" value={l.title} onChange={(title) => patch({ ...l, title })} placeholder="Bengaluru, Karnataka" />
                <TextInput label="Opening hours (optional)" value={l.hours} onChange={(hours) => patch({ ...l, hours })} placeholder="{{hours}}" />
              </div>
              <TextArea label="Address" rows={2} value={l.address} onChange={(address) => patch({ ...l, address })} placeholder="{{address}}" />
              <div className="admin-form-grid">
                <TextInput label="Phone" value={l.phone} onChange={(phone) => patch({ ...l, phone })} placeholder="{{phone}}" />
                <TextInput label="Phone link" value={l.phoneHref} onChange={(phoneHref) => patch({ ...l, phoneHref })} placeholder="tel:{{phone}} (empty = from phone)" />
                <TextInput label="Email (optional)" value={l.email} onChange={(email) => patch({ ...l, email })} placeholder="{{email}}" />
                <TextInput label="Directions URL" value={l.directionsUrl} onChange={(directionsUrl) => patch({ ...l, directionsUrl })} placeholder="https://maps.app.goo.gl/…" />
                <TextInput
                  label="Directions label"
                  value={l.directionsLabel}
                  onChange={(directionsLabel) => patch({ ...l, directionsLabel })}
                  placeholder="Empty = section default"
                />
                <TextInput label="Map title (accessibility)" value={l.mapTitle} onChange={(mapTitle) => patch({ ...l, mapTitle })} />
                <TextInput
                  label="Google Maps embed URL"
                  value={l.mapEmbedUrl}
                  onChange={(mapEmbedUrl) => patch({ ...l, mapEmbedUrl: embedSrc(mapEmbedUrl) })}
                  placeholder="https://www.google.com/maps?q=12.87,77.61&z=16&output=embed"
                  hint="Google Maps → Share → Embed a map: paste the iframe or its src URL."
                  full
                />
              </div>
              <IconEditor label="Icon" value={l.icon || {}} onChange={(icon) => patch({ ...l, icon })} presets={CONTACT_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              <MediaItemsEditor
                label="Office photos / videos"
                items={l.media || []}
                onChange={(media) => patch({ ...l, media })}
                showLabel={false}
                showColor={false}
                hint="Shown in the side panel when this office is active (media mode, or when it has no map)."
              />
            </>
          )}
        />
      </Group>
      <Group title="Map / media panel">
        <div className="admin-form-grid">
          <Field label="Panel">
            <Toggle label="Show the map / media panel" checked={!panel.hidden} onChange={(on) => setPanel({ hidden: !on })} />
            <Toggle label="Stick panel while scrolling (desktop)" checked={Boolean(panel.sticky)} onChange={(sticky) => setPanel({ sticky })} />
          </Field>
          <SelectInput label="Panel shows" value={panel.mode || 'map'} options={PANEL_MODE_OPTIONS} onChange={(mode) => setPanel({ mode })} />
          <SelectInput
            label="Office card interaction"
            value={c.interaction || 'hover'}
            options={INTERACTION_OPTIONS}
            onChange={(interaction) => set({ interaction })}
          />
          <TextInput
            label="Default map embed URL"
            value={panel.embedUrl}
            onChange={(embedUrl) => setPanel({ embedUrl: embedSrc(embedUrl) })}
            placeholder="Empty = default office's map"
            full
          />
          <TextInput label="Default map title" value={panel.title} onChange={(title) => setPanel({ title })} />
          <NumberInput
            label="Seconds per slide"
            value={panel.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="5"
            onChange={(intervalSeconds) => setPanel({ intervalSeconds })}
          />
          <TextInput label="Min height (desktop)" value={panel.minHeight} onChange={(minHeight) => setPanel({ minHeight })} placeholder="460px" />
          <TextInput label="Min height (tablet)" value={panel.minHeightTablet} onChange={(minHeightTablet) => setPanel({ minHeightTablet })} placeholder="280px" />
          <TextInput label="Min height (phone)" value={panel.minHeightMobile} onChange={(minHeightMobile) => setPanel({ minHeightMobile })} placeholder="260px" />
          <TextInput label="Corner radius" value={panel.radius} onChange={(radius) => setPanel({ radius })} placeholder="16px" />
          <TextInput label="Border" value={panel.border} onChange={(border) => setPanel({ border })} placeholder="none" />
          <TextInput label="Shadow" value={panel.shadow} onChange={(shadow) => setPanel({ shadow })} placeholder="0 30px 60px -25px rgba(10,22,40,0.3)" />
          <TextInput label="Map filter" value={panel.filter} onChange={(filter) => setPanel({ filter })} placeholder="e.g. grayscale(0.3)" />
        </div>
        <MediaItemsEditor
          label="Default panel images / videos"
          items={panel.media || []}
          onChange={(media) => setPanel({ media })}
          showLabel={false}
          showColor={false}
          hint="Shown when no office is active (media mode) or when there is no map."
        />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons
            label="Panel position"
            value={layout.panelSide}
            options={['left', 'right']}
            onChange={(side) => setLayout({ panelSide: (side || 'right') as 'left' | 'right' })}
          />
          <SelectInput
            label="Vertical alignment"
            value={layout.alignItems && layout.alignItems !== 'stretch' ? layout.alignItems : ''}
            options={PANEL_ALIGN_OPTIONS}
            onChange={(v) => setLayout({ alignItems: (v || 'stretch') as ContactLocationsContent['layout']['alignItems'] })}
          />
          <TextInput
            label="Column widths"
            value={layout.columns}
            onChange={(columns) => setLayout({ columns })}
            placeholder="11fr 9fr"
            hint="CSS grid columns in on-screen order. Empty = design default."
          />
          <TextInput label="Column gap" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="2.25rem" />
          <TextInput label="Gap between office cards" value={c.cardGap} onChange={(cardGap) => set({ cardGap })} placeholder="1.25rem" />
          <Field label="Tablet / phone">
            <Toggle
              label="Show the panel above the office cards"
              checked={Boolean(layout.mobilePanelFirst)}
              onChange={(mobilePanelFirst) => setLayout({ mobilePanelFirst })}
            />
          </Field>
        </div>
      </Group>
      <Group title="Office card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '10px', padding: '1.6rem 1.7rem' }}
        >
          <ColorInput label="Active / hover border color" value={cs.activeBorderColor} onChange={(activeBorderColor) => setCs({ activeBorderColor })} fallback="var(--orange)" />
          <TextInput label="Active background" value={cs.activeBackground} onChange={(activeBackground) => setCs({ activeBackground })} placeholder="Same as background" />
          <Field label="Motion">
            <Toggle label="Lift on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Office icon style">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '40px', size: '20px', radius: '9px', background: 'var(--navy-950)', color: 'var(--cyan)' }}
        />
      </Group>
      <Group title="Office card text">
        <TextInput label="Default directions label" value={c.directionsLabel} onChange={(directionsLabel) => set({ directionsLabel })} placeholder="Get Directions →" />
        <StyleEditor title="Tag style (color, border…)" value={c.tagStyle} onChange={(tagStyle) => set({ tagStyle })} allowHide={false} fontSizePlaceholder="0.62rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.02rem" />
        <StyleEditor title="Address style" value={c.addressStyle} onChange={(addressStyle) => set({ addressStyle })} allowHide={false} fontSizePlaceholder="0.86rem" />
        <StyleEditor title="Phone / email / directions link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
        <ColorInput label="Link hover color" value={c.linkHoverColor} onChange={(linkHoverColor) => set({ linkHoverColor })} fallback="var(--orange-dim)" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */

const SIDE_POSITION_OPTIONS = [
  { value: 'right', label: 'Right of the form' },
  { value: 'left', label: 'Left of the form' },
  { value: 'none', label: 'Hidden (form only)' },
] as const;

const BUTTON_VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary (orange)' },
  { value: 'ghost', label: 'Ghost (light outline)' },
  { value: 'ghost-dark', label: 'Ghost dark (dark outline)' },
] as const;

function ContactFormEditor({ content: c, onChange }: EditorProps<ContactFormContent>) {
  const set = (patch: Partial<ContactFormContent>) => onChange({ ...c, ...patch });
  const layout = c.layout || { sidePosition: 'right' };
  const setLayout = (patch: Partial<ContactFormContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const f = c.form;
  const setForm = (patch: Partial<ContactFormContent['form']>) => set({ form: { ...f, ...patch } });
  const fc = c.fields || {};
  const setFields = (patch: Partial<ContactFormContent['fields']>) => set({ fields: { ...fc, ...patch } });
  const side = c.side;
  const setSide = (patch: Partial<ContactFormContent['side']>) => set({ side: { ...side, ...patch } });
  const em = c.emergency;
  const setEm = (patch: Partial<ContactFormContent['emergency']>) => set({ emergency: { ...em, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default), highlight and intro above the form">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Form panel" open description="Form fields and Subject options are managed in Admin → Forms → enquiry">
        <TextElementEditor label="Form title" headingTag value={f.title} onChange={(title) => setForm({ title })} />
        <TextElementEditor label="Intro" multiline value={f.intro} onChange={(intro) => setForm({ intro })} />
        <div className="admin-form-grid">
          <TextInput label="Submit button label" value={f.submitLabel} onChange={(submitLabel) => setForm({ submitLabel })} placeholder="Submit Request →" />
          <TextInput label="Sending label" value={f.submittingLabel} onChange={(submittingLabel) => setForm({ submittingLabel })} placeholder="Sending…" />
          <SelectInput
            label="Button style"
            value={f.buttonVariant || 'primary'}
            options={BUTTON_VARIANT_OPTIONS}
            onChange={(buttonVariant) => setForm({ buttonVariant })}
          />
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
            hint="Default /thank-you?intent=enquiry"
          />
        </div>
        <StyleEditor title="Button style" value={f.buttonStyle} onChange={(buttonStyle) => setForm({ buttonStyle })} allowHide={false} />
        <TextElementEditor label="Privacy note" multiline value={f.privacyNote} onChange={(privacyNote) => setForm({ privacyNote })} />
        <TextElementEditor label="Success title" value={f.successTitle} onChange={(successTitle) => setForm({ successTitle })} />
        <TextElementEditor label="Success message" multiline value={f.successBody} onChange={(successBody) => setForm({ successBody })} />
        <div className="admin-form-grid">
          <TextInput label="Form panel background" value={f.background} onChange={(background) => setForm({ background })} placeholder="#FFFFFF" />
          <TextInput label="Form panel padding" value={f.padding} onChange={(padding) => setForm({ padding })} placeholder="3.2rem" />
          <TextInput label="Form panel border" value={f.border} onChange={(border) => setForm({ border })} placeholder="1px solid var(--gray-200)" />
        </div>
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
          <SelectInput
            label="Contact panel position"
            value={layout.sidePosition || 'right'}
            options={SIDE_POSITION_OPTIONS}
            onChange={(sidePosition) => setLayout({ sidePosition })}
          />
          <TextInput label="Column widths" value={layout.columns} onChange={(columns) => setLayout({ columns })} placeholder="1.2fr 0.8fr" hint="CSS grid columns in on-screen order." />
          <TextInput label="Corner radius" value={layout.radius} onChange={(radius) => setLayout({ radius })} placeholder="16px" />
          <TextInput label="Shadow" value={layout.shadow} onChange={(shadow) => setLayout({ shadow })} placeholder="0 30px 60px -25px rgba(10,22,40,0.18)" />
          <Field label="Tablet / phone">
            <Toggle
              label="Show the contact panel above the form"
              checked={Boolean(layout.mobileSideFirst)}
              onChange={(mobileSideFirst) => setLayout({ mobileSideFirst })}
            />
          </Field>
        </div>
      </Group>
      <Group title="Contact panel look">
        <div className="admin-form-grid">
          <Field label="Panel">
            <Toggle label="Show contact panel" checked={!side.hidden} onChange={(on) => setSide({ hidden: !on })} />
            <Toggle label="Divider lines between blocks" checked={side.dividers !== false} onChange={(dividers) => setSide({ dividers })} />
          </Field>
          <TextInput
            label="Background"
            value={side.background}
            onChange={(background) => setSide({ background })}
            placeholder="linear-gradient(160deg,var(--navy-950),var(--navy-900))"
          />
          <ColorInput label="Text color" value={side.color} onChange={(color) => setSide({ color })} fallback="#FFFFFF" />
          <TextInput label="Padding" value={side.padding} onChange={(padding) => setSide({ padding })} placeholder="3.2rem 2.6rem" />
          <TextInput label="Gap between blocks" value={side.gap} onChange={(gap) => setSide({ gap })} placeholder="1.7rem" />
          <ColorInput label="Divider color" value={side.dividerColor} onChange={(dividerColor) => setSide({ dividerColor })} fallback="rgba(255,255,255,0.1)" />
          <ColorInput label="Link hover color" value={side.linkHoverColor} onChange={(linkHoverColor) => setSide({ linkHoverColor })} fallback="var(--cyan)" />
        </div>
        <StyleEditor title="Block heading style (Direct Contact, Business Hours…)" value={side.headingStyle} onChange={(headingStyle) => setSide({ headingStyle })} allowHide={false} fontSizePlaceholder="0.9rem" />
      </Group>
      <Group title="Direct contact items">
        <NapHint />
        <TextElementEditor label="Block title" value={side.title} onChange={(title) => setSide({ title })} />
        <ListEditor<ContactSideItem>
          label="Items"
          items={side.items || []}
          onChange={(items) => setSide({ items })}
          addLabel="Item"
          create={() => ({ label: 'Email', value: '{{email}}', href: 'mailto:{{email}}', icon: { svg: CONTACT_ALL_ICON_PRESETS[1].svg } })}
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
                <TextInput label="Link" value={it.href} onChange={(href) => patch({ ...it, href })} placeholder="tel:{{phone}}, mailto:{{email}}…" />
              </div>
              <IconEditor label="Icon" value={it.icon || {}} onChange={(icon) => patch({ ...it, icon })} presets={CONTACT_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
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
      <Group title="Business hours">
        <TextElementEditor label="Block title" value={side.hoursTitle} onChange={(hoursTitle) => setSide({ hoursTitle })} />
        <ListEditor<ContactHoursRow>
          label="Rows"
          items={side.hours || []}
          onChange={(hours) => setSide({ hours })}
          addLabel="Row"
          create={() => ({ label: 'Mon – Sat', value: '9:00 – 18:00' })}
          itemTitle={(h) => `${h.label} ${h.value}`.trim() || 'Row'}
          renderItem={(h, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Days / label" value={h.label} onChange={(label) => patch({ ...h, label })} placeholder="{{hours}}" />
              <TextInput label="Time (optional)" value={h.value} onChange={(value) => patch({ ...h, value })} />
            </div>
          )}
        />
        <StyleEditor title="Row label style" value={side.hoursLabelStyle} onChange={(hoursLabelStyle) => setSide({ hoursLabelStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
        <StyleEditor title="Row time style" value={side.hoursValueStyle} onChange={(hoursValueStyle) => setSide({ hoursValueStyle })} allowHide={false} fontSizePlaceholder="0.85rem" />
      </Group>
      <Group title="Offices list" description="Optional list of offices inside the contact panel">
        <TextElementEditor label="Block title" value={side.officesTitle} onChange={(officesTitle) => setSide({ officesTitle })} />
        <ListEditor<ContactOffice>
          label="Offices"
          items={side.offices || []}
          onChange={(offices) => setSide({ offices })}
          addLabel="Office"
          create={() => ({ title: 'New office', lines: '' })}
          itemTitle={(o) => o.title || 'Office'}
          renderItem={(o, patch) => (
            <>
              <TextInput label="Title" value={o.title} onChange={(title) => patch({ ...o, title })} full />
              <TextArea label="Lines (address, phone…)" rows={3} value={o.lines} onChange={(lines) => patch({ ...o, lines })} />
            </>
          )}
        />
      </Group>
      <Group title="Contact panel images / videos">
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
          <NumberInput
            label="Seconds per slide"
            value={side.intervalSeconds}
            min={1}
            step={0.5}
            placeholder="5"
            onChange={(intervalSeconds) => setSide({ intervalSeconds })}
          />
        </div>
      </Group>
      <Group title="Emergency note">
        <NapHint />
        <Toggle label="Show emergency note" checked={!em.hidden} onChange={(on) => setEm({ hidden: !on })} />
        <div className="admin-form-grid">
          <TextInput label="Title" value={em.title} onChange={(title) => setEm({ title })} />
          <TextInput label="Phone" value={em.phone} onChange={(phone) => setEm({ phone })} placeholder="{{emergencyPhone}}" />
          <TextInput label="Phone link" value={em.phoneHref} onChange={(phoneHref) => setEm({ phoneHref })} placeholder="Empty = from phone" />
        </div>
        <TextArea label="Message" rows={3} value={em.body} onChange={(body) => setEm({ body })} />
        <div className="admin-form-grid">
          <TextInput label="Background" value={em.background} onChange={(background) => setEm({ background })} placeholder="rgba(255,107,26,0.12)" />
          <TextInput label="Border" value={em.border} onChange={(border) => setEm({ border })} placeholder="1px solid rgba(255,107,26,0.3)" />
          <ColorInput label="Text color" value={em.color} onChange={(color) => setEm({ color })} fallback="#FFD7BB" />
          <ColorInput label="Title / phone color" value={em.accent} onChange={(accent) => setEm({ accent })} fallback="var(--orange)" />
          <TextInput label="Corner radius" value={em.radius} onChange={(radius) => setEm({ radius })} placeholder="8px" />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function ContactSectionEditor({
  type,
  content,
  onChange,
}: {
  type: ContactSectionType;
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
      <div className="az-admin lz-admin lgy-admin ctc-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'contact_hero' ? (
            <ContactHeroEditor content={withContactDefaults<ContactHeroContent>(type, content)} onChange={emit} />
          ) : type === 'contact_quick' ? (
            <ContactQuickEditor content={withContactDefaults<ContactQuickContent>(type, content)} onChange={emit} />
          ) : type === 'contact_help' ? (
            <ContactHelpEditor content={withContactDefaults<ContactHelpContent>(type, content)} onChange={emit} />
          ) : type === 'contact_locations' ? (
            <ContactLocationsEditor content={withContactDefaults<ContactLocationsContent>(type, content)} onChange={emit} />
          ) : type === 'contact_form' ? (
            <ContactFormEditor content={withContactDefaults<ContactFormContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
