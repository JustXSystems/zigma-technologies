'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  ColorInput,
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
import { ColumnsEditor, LifeGroup as Group, LifeGroupProvider, MediaItemsEditor, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, LegacyStatsEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { ActionFields, ContactHeroEditor, IconStyleFields } from '@/components/admin/contact/ContactSectionEditor';
import { CertsCtaEditor } from '@/components/admin/certifications/CertificationsSectionEditor';
import {
  INDUSTRIES_ACCENT_PRESETS,
  INDUSTRIES_ALL_ICON_PRESETS,
  withIndustriesDefaults,
  type IndustriesCategoryCard,
  type IndustriesCategoryContent,
  type IndustriesCtaContent,
  type IndustriesHeroContent,
  type IndustriesHubCard,
  type IndustriesHubContent,
  type IndustriesSectionType,
  type IndustriesStatsContent,
} from '@/lib/industries-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const TAILOR_POSITIONS = [
  { value: 'above', label: 'Above the heading' },
  { value: 'below', label: 'Below the heading' },
] as const;

const NEW_CARD_ICON = INDUSTRIES_ALL_ICON_PRESETS.find((p) => p.key === 'ind-bolt')?.svg || '';

const mediaCount = (n?: number) => (n ? ` · ${n} file${n > 1 ? 's' : ''}` : '');

/* ------------------------------------------------------------------ */
/* Sector cards                                                        */
/* ------------------------------------------------------------------ */

function IndustriesHubEditor({ content: c, onChange }: EditorProps<IndustriesHubContent>) {
  const set = (patch: Partial<IndustriesHubContent>) => onChange({ ...c, ...patch });
  const tailor = c.tailor || {};
  const setTailor = (patch: Partial<IndustriesHubContent['tailor']>) => set({ tailor: { ...tailor, ...patch } });
  const cs = c.card || {};
  const setCs = (patch: Partial<IndustriesHubContent['card']>) => set({ card: { ...cs, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section heading" description="Eyebrow, heading (H2 by default) and intro above the cards">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title={'"I\'m looking for…" picker'} description="Industry / city selector that sends visitors to the best matching page">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the picker" checked={!tailor.hidden} onChange={(on) => setTailor({ hidden: !on })} />
          </Field>
          <SelectInput label="Position" value={tailor.position || 'above'} options={TAILOR_POSITIONS} onChange={(position) => setTailor({ position })} />
          <TextInput label="Space to the heading" value={tailor.gap} onChange={(gap) => setTailor({ gap })} placeholder="2.25rem" />
        </div>
      </Group>
      <Group title="Sector cards" open description="Each card links to an industry page; several images / videos cross-fade as its background">
        <ListEditor<IndustriesHubCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({ eyebrow: { text: '' }, title: { text: 'New industry' }, body: { text: '' }, media: [], href: '/industries' })}
          itemTitle={(it, i) => `${it.hidden ? '(hidden) ' : ''}${it.title?.text || `Card ${i + 1}`}${mediaCount(it.media?.length)}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!it.hidden} onChange={(on) => patch({ ...it, hidden: !on })} />
                </Field>
                <TextInput label="Link" value={it.href} onChange={(href) => patch({ ...it, href })} placeholder="/industries/healthcare" />
                <TextInput label="Link label (optional)" value={it.linkLabel} onChange={(linkLabel) => patch({ ...it, linkLabel })} placeholder={c.linkLabel || 'Section default'} />
                <Field label="Link behaviour">
                  <Toggle label="Open in a new tab" checked={Boolean(it.newTab)} onChange={(newTab) => patch({ ...it, newTab })} />
                </Field>
              </div>
              <TextElementEditor label="Eyebrow" value={it.eyebrow} onChange={(eyebrow) => patch({ ...it, eyebrow })} hint="Empty = hidden" />
              <TextElementEditor label="Title" headingTag value={it.title} onChange={(title) => patch({ ...it, title })} hint="H3 by default" />
              <TextElementEditor label="Description" multiline value={it.body} onChange={(body) => patch({ ...it, body })} />
              <MediaItemsEditor
                label="Card images / videos"
                items={it.media || []}
                onChange={(media) => patch({ ...it, media })}
                showLabel={false}
                showColor={false}
                hint="Several items cross-fade. Caption = alt text."
              />
            </>
          )}
        />
      </Group>
      <Group title="Grid & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.25rem" />
          <Field label="Motion">
            <Toggle label="Staggered reveal on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Lift card on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
            <Toggle label="Zoom picture on hover" checked={cs.zoomOnHover !== false} onChange={(zoomOnHover) => setCs({ zoomOnHover })} />
          </Field>
          <NumberInput
            label="Slideshow seconds per item"
            value={cs.mediaIntervalSeconds}
            min={2}
            step={1}
            placeholder="5"
            onChange={(mediaIntervalSeconds) => setCs({ mediaIntervalSeconds })}
          />
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{
            background: '#0F1F3D',
            border: '1px solid rgba(255,255,255,0.1)',
            radius: '18px',
            padding: '1.35rem 1.35rem 1.45rem',
            shadow: '0 22px 48px -28px rgba(6,17,33,0.55)',
          }}
        >
          <TextInput label="Card height" value={cs.minHeight} onChange={(minHeight) => setCs({ minHeight })} placeholder="280px" />
          <TextInput label="Card height (phone)" value={cs.minHeightMobile} onChange={(minHeightMobile) => setCs({ minHeightMobile })} placeholder="220px" />
          <TextInput
            label="Picture overlay (gradient)"
            value={cs.overlay}
            onChange={(overlay) => setCs({ overlay })}
            placeholder="linear-gradient(180deg, rgba(6,17,33,0.15), rgba(6,17,33,0.92))"
          />
          <ColorInput label="Hover border color" value={cs.hoverBorderColor} onChange={(hoverBorderColor) => setCs({ hoverBorderColor })} fallback="#FF6B1A" />
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="0 28px 56px -24px rgba(6,17,33,0.65)" />
        </CardStyleFields>
      </Group>
      <Group title="Card text & link">
        <div className="admin-form-grid">
          <TextInput label="Link label (all cards)" value={c.linkLabel} onChange={(linkLabel) => set({ linkLabel })} placeholder="View industry page → (empty = hidden)" />
          <NumberInput
            label="Description max lines"
            value={cs.bodyLines}
            min={0}
            max={12}
            step={1}
            placeholder="3"
            hint="0 = no limit"
            onChange={(bodyLines) => setCs({ bodyLines })}
          />
          <ColorInput label="Link hover color" value={c.linkHoverColor} onChange={(linkHoverColor) => set({ linkHoverColor })} fallback="#FFFFFF" />
        </div>
        <StyleEditor title="Eyebrow style" value={c.eyebrowStyle} onChange={(eyebrowStyle) => set({ eyebrowStyle })} allowHide={false} fontSizePlaceholder="0.86rem" />
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="clamp(1.3rem,2vw,1.55rem)" />
        <StyleEditor title="Description style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="1.02rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.95rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Category grid                                                       */
/* ------------------------------------------------------------------ */

function IndustriesCategoryEditor({ content: c, onChange }: EditorProps<IndustriesCategoryContent>) {
  const set = (patch: Partial<IndustriesCategoryContent>) => onChange({ ...c, ...patch });
  const bar = c.accentBar || {};
  const setBar = (patch: Partial<IndustriesCategoryContent['accentBar']>) => set({ accentBar: { ...bar, ...patch } });
  const cs = c.card || {};
  const setCs = (patch: Partial<IndustriesCategoryContent['card']>) => set({ card: { ...cs, ...patch } });
  const is = c.iconStyle || {};
  const setIs = (patch: Partial<IndustriesCategoryContent['iconStyle']>) => set({ iconStyle: { ...is, ...patch } });
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Category colour & accent bar" description="The colour drives the icons, the hover line, the hover title and the bar above the heading">
        <div className="admin-form-grid">
          <ColorInput label="Category colour" value={c.accent} onChange={(accent) => set({ accent })} fallback="#00D4FF" />
          <Field label="Presets">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {INDUSTRIES_ACCENT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => set({ accent: p.value })}
                  style={{ borderLeft: `6px solid ${p.value}` }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Accent bar">
            <Toggle label="Show bar above the heading" checked={!bar.hidden} onChange={(on) => setBar({ hidden: !on })} />
          </Field>
          <TextInput label="Bar width" value={bar.width} onChange={(width) => setBar({ width })} placeholder="56px" />
          <TextInput label="Bar height" value={bar.height} onChange={(height) => setBar({ height })} placeholder="4px" />
          <ColorInput label="Bar color" value={bar.color} onChange={(color) => setBar({ color })} fallback={c.accent || '#00D4FF'} />
        </div>
      </Group>
      <Group title="Section heading" description="Eyebrow, heading (H2 by default) and intro">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Industry cards" open description="Icon, title and text per card; optional images / videos, link and own colour">
        <NapHint />
        <ListEditor<IndustriesCategoryCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={() => ({ title: { text: 'New industry' }, body: { text: 'Describe how you serve this industry.' }, icon: { svg: NEW_CARD_ICON }, media: [] })}
          itemTitle={(it, i) => `${it.hidden ? '(hidden) ' : ''}${it.title?.text || `Card ${i + 1}`}${mediaCount(it.media?.length)}`}
          renderItem={(it, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this card" checked={!it.hidden} onChange={(on) => patch({ ...it, hidden: !on })} />
                </Field>
                <ColorInput label="Card colour (optional)" value={it.accent} onChange={(accent) => patch({ ...it, accent })} fallback={c.accent || '#00D4FF'} />
              </div>
              <TextElementEditor label="Title" headingTag value={it.title} onChange={(title) => patch({ ...it, title })} hint="H5 by default" />
              <TextElementEditor label="Text" multiline value={it.body} onChange={(body) => patch({ ...it, body })} />
              <Field label="Icon" full>
                <Toggle label="Show icon" checked={Boolean(it.icon && !it.icon.hidden)} onChange={(on) => patch({ ...it, icon: { ...it.icon, hidden: !on } })} />
              </Field>
              {it.icon && !it.icon.hidden ? (
                <IconEditor label="Card icon" value={it.icon} onChange={(icon) => patch({ ...it, icon })} presets={INDUSTRIES_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              ) : null}
              <MediaItemsEditor
                label="Images / videos above the text"
                items={it.media || []}
                onChange={(media) => patch({ ...it, media })}
                showLabel={false}
                showColor={false}
                hint="Several items cross-fade as a slideshow. Caption = alt text."
              />
              <div className="admin-form-grid">
                <TextInput label="Link label (optional)" value={it.linkLabel} onChange={(linkLabel) => patch({ ...it, linkLabel })} placeholder="e.g. Explore →" hint="Empty = no link" />
                <ActionFields value={it} patch={patch} />
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Grid & motion">
        <div className="admin-form-grid">
          <ColumnsEditor value={c.columns} onChange={(columns) => set({ columns })} defaults={{ desktop: 3, tablet: 2, mobile: 1 }} />
          <TextInput label="Gap" value={c.gap} onChange={(gap) => set({ gap })} placeholder="1.5rem" />
          <Field label="Motion">
            <Toggle label="Staggered reveal on scroll" checked={c.reveal !== false} onChange={(reveal) => set({ reveal })} />
            <Toggle label="Lift card on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => setCs({ hoverLift })} />
            <Toggle label="Coloured line along the top on hover" checked={cs.topLine !== false} onChange={(topLine) => setCs({ topLine })} />
            <Toggle label="Whole card clickable (cards with a link)" checked={cs.stretchLink !== false} onChange={(stretchLink) => setCs({ stretchLink })} />
          </Field>
          <TextInput label="Top line height" value={cs.topLineHeight} onChange={(topLineHeight) => setCs({ topLineHeight })} placeholder="3px" />
        </div>
      </Group>
      <Group title="Card style">
        <CardStyleFields
          value={cs}
          onChange={setCs}
          placeholders={{ background: '#FFFFFF', border: '1px solid var(--gray-200)', radius: '12px', padding: '1.9rem', shadow: '0 8px 22px -10px rgba(10,22,40,0.14)' }}
        >
          <ColorInput label="Hover border color" value={cs.hoverBorderColor} onChange={(hoverBorderColor) => setCs({ hoverBorderColor })} fallback="#FFFFFF" />
          <TextInput label="Hover shadow" value={cs.hoverShadow} onChange={(hoverShadow) => setCs({ hoverShadow })} placeholder="0 22px 44px -12px rgba(10,22,40,0.22)" />
          <TextInput label="Image / video height" value={cs.mediaHeight} onChange={(mediaHeight) => setCs({ mediaHeight })} placeholder="170px (phone 150px)" />
          <NumberInput
            label="Slideshow seconds per item"
            value={cs.mediaIntervalSeconds}
            min={2}
            step={1}
            placeholder="5"
            onChange={(mediaIntervalSeconds) => setCs({ mediaIntervalSeconds })}
          />
        </CardStyleFields>
      </Group>
      <Group title="Icon style">
        <IconStyleFields
          value={is}
          onChange={(next) => setIs(next)}
          placeholders={{ box: '48px', size: '22px', radius: '50%', background: '#E0FAFF', color: c.accent || '#00D4FF' }}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <ColorInput label="Hover background" value={is.hoverBackground} onChange={(hoverBackground) => setIs({ hoverBackground })} fallback={c.accent || '#00D4FF'} />
          <ColorInput label="Hover icon color" value={is.hoverColor} onChange={(hoverColor) => setIs({ hoverColor })} fallback="#FFFFFF" />
          <Field label="Hover">
            <Toggle label="Scale and tilt on hover" checked={is.animate !== false} onChange={(animate) => setIs({ animate })} />
          </Field>
        </div>
      </Group>
      <Group title="Card text & link">
        <div className="admin-form-grid">
          <ColorInput label="Title hover color" value={c.titleHoverColor} onChange={(titleHoverColor) => set({ titleHoverColor })} fallback={c.accent || '#00D4FF'} />
        </div>
        <StyleEditor title="Title style" value={c.titleStyle} onChange={(titleStyle) => set({ titleStyle })} allowHide={false} fontSizePlaceholder="1.04rem" />
        <StyleEditor title="Text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="0.86rem" />
        <StyleEditor title="Link style" value={c.linkStyle} onChange={(linkStyle) => set({ linkStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function IndustriesSectionEditor({
  type,
  content,
  onChange,
}: {
  type: IndustriesSectionType;
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
      <div className="az-admin lz-admin lgy-admin ctc-admin ind-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'industries_hero' ? (
            <ContactHeroEditor content={withIndustriesDefaults<IndustriesHeroContent>(type, content)} onChange={emit} />
          ) : type === 'industries_stats' ? (
            <LegacyStatsEditor content={withIndustriesDefaults<IndustriesStatsContent>(type, content)} onChange={emit} />
          ) : type === 'industries_hub' ? (
            <IndustriesHubEditor content={withIndustriesDefaults<IndustriesHubContent>(type, content)} onChange={emit} />
          ) : type === 'industries_category' ? (
            <IndustriesCategoryEditor content={withIndustriesDefaults<IndustriesCategoryContent>(type, content)} onChange={emit} />
          ) : type === 'industries_cta' ? (
            <CertsCtaEditor content={withIndustriesDefaults<IndustriesCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
