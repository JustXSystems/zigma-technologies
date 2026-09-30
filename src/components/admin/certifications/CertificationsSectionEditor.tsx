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
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { ColumnsEditor, HighlightEditor, LifeGroup as Group, LifeGroupProvider, MediaItemsEditor, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { ContactHeroEditor } from '@/components/admin/contact/ContactSectionEditor';
import {
  CERTS_ALL_ICON_PRESETS,
  withCertsDefaults,
  type CertsCtaContent,
  type CertsGalleryContent,
  type CertsHeroContent,
  type CertsItem,
  type CertsSectionType,
} from '@/lib/certifications-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const LAYOUT_OPTIONS = [
  { value: 'marquee', label: 'Marquee (auto-scrolling row)' },
  { value: 'grid', label: 'Grid' },
] as const;

const DIRECTION_OPTIONS = [
  { value: 'right', label: 'Left → right' },
  { value: 'left', label: 'Right → left' },
] as const;

const START_OPTIONS = [
  { value: 'right', label: 'First certificate at the right edge' },
  { value: 'left', label: 'First certificate at the left edge' },
] as const;

const FIT_OPTIONS = [
  { value: 'contain', label: 'Contain (whole certificate visible)' },
  { value: 'cover', label: 'Cover (fill the box, may crop)' },
] as const;

/* ------------------------------------------------------------------ */
/* Certificate gallery                                                 */
/* ------------------------------------------------------------------ */

function CertsGalleryEditor({ content: c, onChange }: EditorProps<CertsGalleryContent>) {
  const set = (patch: Partial<CertsGalleryContent>) => onChange({ ...c, ...patch });
  const m = c.marquee || {};
  const setM = (patch: Partial<CertsGalleryContent['marquee']>) => set({ marquee: { ...m, ...patch } });
  const cs = c.card || {};
  const setCs = (patch: Partial<CertsGalleryContent['card']>) => set({ card: { ...cs, ...patch } });
  const lb = c.lightbox || {};
  const setLb = (patch: Partial<CertsGalleryContent['lightbox']>) => set({ lightbox: { ...lb, ...patch } });
  const grid = c.layout === 'grid';
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section heading" description="Optional eyebrow, heading (H2 by default) and intro above the certificates">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Certificates" open description="Each certificate can hold several images / videos — the first is the card picture, all of them open in the lightbox">
        <ListEditor<CertsItem>
          label="Certificates"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Certificate"
          create={() => ({ name: 'New certificate', media: [] })}
          itemTitle={(it) => `${it.hidden ? '(hidden) ' : ''}${it.name || 'Certificate'}${it.media?.length ? ` · ${it.media.length} file${it.media.length > 1 ? 's' : ''}` : ''}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this certificate" checked={!it.hidden} onChange={(on) => patch({ ...it, hidden: !on })} />
                </Field>
                <TextInput label="Name" value={it.name} onChange={(name) => patch({ ...it, name })} />
                <TextInput label="Issuer / detail line (optional)" value={it.meta} onChange={(meta) => patch({ ...it, meta })} placeholder="e.g. Valid till 2027" />
                <ColorInput label="Card background" value={it.background} onChange={(background) => patch({ ...it, background })} fallback="#FFFFFF" />
                <TextInput
                  label="Link instead of the lightbox (optional)"
                  value={it.href}
                  onChange={(href) => patch({ ...it, href })}
                  placeholder="/assets/docs/certificate.pdf or https://…"
                />
                <Field label="Link">
                  <Toggle label="Open in a new tab" checked={Boolean(it.newTab)} onChange={(newTab) => patch({ ...it, newTab })} />
                </Field>
              </div>
              <MediaItemsEditor
                label="Certificate images / videos"
                items={it.media || []}
                onChange={(media) => patch({ ...it, media })}
                showLabel={false}
                showColor={false}
                hint="First item = card picture. Caption = alt text and lightbox caption (empty = certificate name). SVG and video files work too."
              />
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <SelectInput label="Layout" value={c.layout || 'marquee'} options={LAYOUT_OPTIONS} onChange={(layout) => set({ layout })} />
          <TextInput label="Section min height" value={c.minHeight} onChange={(minHeight) => set({ minHeight })} placeholder="360px (0 = fit content)" />
          <TextInput label="Section min height (phone)" value={c.minHeightMobile} onChange={(minHeightMobile) => set({ minHeightMobile })} placeholder="Empty = same as desktop" />
          <Field label="Motion">
            <Toggle label={grid ? 'Staggered reveal on scroll' : 'Card entrance animation'} checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
          </Field>
        </div>
        {grid ? (
          <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
            <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 4, tablet: 3, mobile: 2 }} />
            <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.8rem" />
          </div>
        ) : (
          <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
            <SelectInput label="Scroll direction" value={m.direction || 'right'} options={DIRECTION_OPTIONS} onChange={(direction) => setM({ direction })} />
            <SelectInput label="Starting position" value={m.startFrom || 'left'} options={START_OPTIONS} onChange={(startFrom) => setM({ startFrom })} />
            <NumberInput
              label="Seconds per full set"
              value={m.speedSeconds}
              min={4}
              step={1}
              placeholder="28"
              hint="Lower = faster. Speed stays the same on wide screens."
              onChange={(speedSeconds) => setM({ speedSeconds })}
            />
            <TextInput label="Space between cards" value={m.gap} onChange={(gap) => setM({ gap })} placeholder="1.8rem" />
            <Field label="Behaviour">
              <Toggle label="Pause on hover" checked={m.pauseOnHover !== false} onChange={(pauseOnHover) => setM({ pauseOnHover })} />
              <Toggle label="Fade the left / right edges" checked={m.edgeFade !== false} onChange={(edgeFade) => setM({ edgeFade })} />
            </Field>
            <TextInput label="Edge fade width" value={m.fadeWidth} onChange={(fadeWidth) => setM({ fadeWidth })} placeholder="6%" />
          </div>
        )}
      </Group>
      <Group title="Lightbox & hints" description="Clicking a certificate opens it full size; arrows / swipe move through every certificate">
        <div className="admin-form-grid">
          <Field label="Lightbox">
            <Toggle label="Open certificates in a lightbox" checked={lb.enabled !== false} onChange={(enabled) => setLb({ enabled })} />
            <Toggle label="Show captions" checked={lb.captions !== false} onChange={(captions) => setLb({ captions })} />
            <Toggle label='Show "+2" counter on multi-file cards' checked={c.showCount !== false} onChange={(showCount) => set({ showCount })} />
          </Field>
        </div>
        <TextElementEditor label="Hint under clickable cards" value={c.hint} onChange={(hint) => set({ hint })} hint="Empty = hidden" />
      </Group>
      <Group title="Certificate card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '12px', padding: '0.7rem', shadow: '0 8px 22px rgba(10,22,40,0.08)' }}
        >
          <TextInput label="Card width (marquee)" value={cs.width} onChange={(width) => setCs({ width })} placeholder="230px" />
          <TextInput label="Card width (phone)" value={cs.widthMobile} onChange={(widthMobile) => setCs({ widthMobile })} placeholder="190px" />
          <ColorInput label="Hover border color" value={cs.hoverBorderColor} onChange={(hoverBorderColor) => setCs({ hoverBorderColor })} fallback="var(--orange)" />
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="0 16px 32px rgba(10,22,40,0.16)" />
          <Field label="Hover">
            <Toggle label="Lift card on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
            <Toggle label="Zoom picture on hover" checked={cs.zoomOnHover !== false} onChange={(zoomOnHover) => setCs({ zoomOnHover })} />
          </Field>
        </CardStyleFields>
      </Group>
      <Group title="Certificate picture box">
        <div className="admin-form-grid">
          <TextInput label="Height" value={cs.imageHeight} onChange={(imageHeight) => setCs({ imageHeight })} placeholder="190px" />
          <TextInput label="Height (phone)" value={cs.imageHeightMobile} onChange={(imageHeightMobile) => setCs({ imageHeightMobile })} placeholder="150px" />
          <SelectInput label="Picture fit" value={cs.imageFit || 'contain'} options={FIT_OPTIONS} onChange={(imageFit) => setCs({ imageFit })} />
          <ColorInput label="Box background" value={cs.imageBackground} onChange={(imageBackground) => setCs({ imageBackground })} fallback="#FFFFFF" />
          <TextInput label="Box border" value={cs.imageBorder} onChange={(imageBorder) => setCs({ imageBorder })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Box padding" value={cs.imagePadding} onChange={(imagePadding) => setCs({ imagePadding })} placeholder="0.4rem" />
          <TextInput label="Box radius" value={cs.imageRadius} onChange={(imageRadius) => setCs({ imageRadius })} placeholder="6px" />
        </div>
      </Group>
      <Group title="Certificate text">
        <StyleEditor title="Name style" value={c.nameStyle} onChange={(nameStyle) => set({ nameStyle })} allowHide={false} fontSizePlaceholder="0.66rem" />
        <StyleEditor title="Issuer / detail style" value={c.metaStyle} onChange={(metaStyle) => set({ metaStyle })} allowHide={false} fontSizePlaceholder="0.72rem" />
      </Group>
      <Group title="Corner badge icon" description="Optional icon in the top-right corner of every card (e.g. a verified shield)">
        <Toggle
          label="Show corner badge"
          checked={!c.badgeIcon?.hidden}
          onChange={(on) => set({ badgeIcon: { ...c.badgeIcon, hidden: !on } })}
        />
        <IconEditor label="Badge icon" value={c.badgeIcon || {}} onChange={(badgeIcon) => set({ badgeIcon })} presets={CERTS_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CTA band                                                            */
/* ------------------------------------------------------------------ */

function CertsCtaEditor({ content: c, onChange }: EditorProps<CertsCtaContent>) {
  const set = (patch: Partial<CertsCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="CTA background images / videos" />
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons label="Content align" value={c.align} onChange={(align) => set({ align: (align || 'center') as CertsCtaContent['align'] })} />
          <TextInput label="Content max width" value={c.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="780px" />
        </div>
      </Group>
      <Group title="Eyebrow">
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Heading">
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title })} hint="Optional; empty = hidden" />
        <HighlightEditor value={c.highlight} onChange={(highlight) => set({ highlight })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body })} hint="Optional; empty = hidden" />
      </Group>
      <Group title="Buttons" open>
        <NapHint />
        <CtaListEditor value={c.ctas} onChange={(ctas) => set({ ctas })} />
      </Group>
      <Group title="Note under the buttons">
        <TextElementEditor label="Note" multiline value={c.note} onChange={(note) => set({ note })} hint="Optional; empty = hidden" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function CertificationsSectionEditor({
  type,
  content,
  onChange,
}: {
  type: CertsSectionType;
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
      <div className="az-admin lz-admin lgy-admin ctc-admin cer-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'certs_hero' ? (
            <ContactHeroEditor content={withCertsDefaults<CertsHeroContent>(type, content)} onChange={emit} />
          ) : type === 'certs_gallery' ? (
            <CertsGalleryEditor content={withCertsDefaults<CertsGalleryContent>(type, content)} onChange={emit} />
          ) : type === 'certs_cta' ? (
            <CertsCtaEditor content={withCertsDefaults<CertsCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
