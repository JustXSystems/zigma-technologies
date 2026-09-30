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
  TextArea,
  TextElementEditor,
  TextInput,
  ThemeColorDatalist,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { LifeGroup as Group, LifeGroupProvider, MediaItemsEditor, NapHint, NumberInput } from '@/components/admin/life/LifeControls';
import { BgMediaGroup, CardStyleFields, LegacyHeaderEditor, SectionBoxGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { ContactHeroEditor, IconStyleFields } from '@/components/admin/contact/ContactSectionEditor';
import { CertsCtaEditor } from '@/components/admin/certifications/CertificationsSectionEditor';
import {
  PRIVACY_ALL_ICON_PRESETS,
  privacyAnchor,
  withPrivacyDefaults,
  type PrivacyBlock,
  type PrivacyCtaContent,
  type PrivacyHeroContent,
  type PrivacyPolicyContent,
  type PrivacySectionType,
} from '@/lib/privacy-sections';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

const ICON_PREVIEW = 'lz-icon-preview';

const TOC_POSITIONS = [
  { value: 'left', label: 'Left of the text' },
  { value: 'right', label: 'Right of the text' },
] as const;

const HTML_HINT =
  'HTML: <p>, <h3>, <ul>/<ol> + <li>, <strong>, <a href="…">, <blockquote>, <table>. Site tokens like {{email}} and {{phone}} are replaced automatically.';

/* ------------------------------------------------------------------ */
/* Policy text                                                         */
/* ------------------------------------------------------------------ */

export function PrivacyPolicyEditor({ content: c, onChange }: EditorProps<PrivacyPolicyContent>) {
  const set = (patch: Partial<PrivacyPolicyContent>) => onChange({ ...c, ...patch });
  const toc = c.toc || { title: 'On this page' };
  const setToc = (patch: Partial<PrivacyPolicyContent['toc']>) => set({ toc: { ...toc, ...patch } });
  const layout = c.layout || {};
  const setLayout = (patch: Partial<PrivacyPolicyContent['layout']>) => set({ layout: { ...layout, ...patch } });
  const panel = c.panel || {};
  const titled = (c.blocks || []).filter((b) => !b.hidden && String(b.title?.text || '').trim()).length;
  return (
    <>
      <SectionBoxGroup value={c.section} onChange={(section) => set({ section })} />
      <BgMediaGroup value={c.background} onChange={(background) => set({ background })} title="Section background images / videos" />
      <Group title="Section heading" description="Optional eyebrow, heading (H2 by default) and intro above the policy">
        <LegacyHeaderEditor value={c.header} onChange={(header) => set({ header })} />
      </Group>
      <Group title="Last updated & intro" description="Both optional; empty = hidden">
        <TextElementEditor label="Last updated line" value={c.updated} onChange={(updated) => set({ updated })} hint="e.g. Last updated: 1 October 2026" />
        <TextElementEditor label="Intro paragraph" multiline value={c.intro} onChange={(intro) => set({ intro })} />
      </Group>
      <Group
        title="Policy blocks"
        open
        description="Each block is one part of the policy. Give blocks a title to build the table of contents; each can carry an icon and several images / videos."
      >
        <NapHint />
        <ListEditor<PrivacyBlock>
          label="Blocks"
          items={c.blocks || []}
          onChange={(blocks) => set({ blocks })}
          addLabel="Block"
          create={() => ({ title: { text: 'New section' }, html: '<p></p>', media: [] })}
          itemTitle={(b, i) => `${b.hidden ? '(hidden) ' : ''}${String(b.title?.text || '').trim() || `Block ${i + 1} (untitled)`}${b.media?.length ? ` · ${b.media.length} file${b.media.length > 1 ? 's' : ''}` : ''}`}
          renderItem={(b, patch) => (
            <>
              <div className="admin-form-grid">
                <Field label="Visibility">
                  <Toggle label="Show this block" checked={!b.hidden} onChange={(on) => patch({ ...b, hidden: !on })} />
                </Field>
                <TextInput
                  label="Link anchor (optional)"
                  value={b.anchor}
                  onChange={(anchor) => patch({ ...b, anchor })}
                  placeholder={privacyAnchor(String(b.title?.text || '')) || 'e.g. data-we-collect'}
                />
              </div>
              <TextElementEditor label="Block title" headingTag value={b.title} onChange={(title) => patch({ ...b, title })} hint="H2 by default; empty = no title (and not listed in the table of contents)" />
              <TextArea label="Block text (HTML)" rows={10} value={b.html} onChange={(html) => patch({ ...b, html })} hint={HTML_HINT} />
              <Field label="Icon" full>
                <Toggle label="Show an icon next to the title" checked={Boolean(b.icon && !b.icon.hidden)} onChange={(on) => patch({ ...b, icon: { ...b.icon, hidden: !on } })} />
              </Field>
              {b.icon && !b.icon.hidden ? (
                <IconEditor label="Block icon" value={b.icon} onChange={(icon) => patch({ ...b, icon })} presets={PRIVACY_ALL_ICON_PRESETS} previewClassName={ICON_PREVIEW} />
              ) : null}
              <MediaItemsEditor
                label="Images / videos under the text"
                items={b.media || []}
                onChange={(media) => patch({ ...b, media })}
                showLabel={false}
                showColor={false}
                hint="Several items cross-fade as a slideshow. Caption = alt text."
              />
            </>
          )}
        />
      </Group>
      <Group title="Table of contents" description={`Lists the titled blocks (currently ${titled}); shown when at least two blocks have a title`}>
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show table of contents" checked={!toc.hidden} onChange={(on) => setToc({ hidden: !on })} />
            <Toggle label="Stick while scrolling (desktop)" checked={toc.sticky !== false} onChange={(sticky) => setToc({ sticky })} />
          </Field>
          <TextInput label="Title" value={toc.title} onChange={(title) => setToc({ title })} placeholder="On this page" />
          <SelectInput label="Position" value={toc.position || 'left'} options={TOC_POSITIONS} onChange={(position) => setToc({ position })} />
          <TextInput label="Width" value={toc.width} onChange={(width) => setToc({ width })} placeholder="240px" />
          <TextInput label="Sticky offset from top" value={toc.stickyTop} onChange={(stickyTop) => setToc({ stickyTop })} placeholder="110px (clears the site header)" />
          <ColorInput label="Background" value={toc.background} onChange={(background) => setToc({ background })} fallback="var(--gray-100)" />
          <TextInput label="Border" value={toc.border} onChange={(border) => setToc({ border })} placeholder="1px solid var(--gray-200)" />
          <TextInput label="Radius" value={toc.radius} onChange={(radius) => setToc({ radius })} placeholder="12px" />
          <TextInput label="Padding" value={toc.padding} onChange={(padding) => setToc({ padding })} placeholder="1.3rem 1.2rem" />
          <ColorInput label="Active link color" value={toc.activeColor} onChange={(activeColor) => setToc({ activeColor })} fallback="var(--orange)" />
        </div>
        <StyleEditor title="Table of contents link style" value={toc.linkStyle} onChange={(linkStyle) => setToc({ linkStyle })} allowHide={false} fontSizePlaceholder="0.88rem" />
      </Group>
      <Group title="Layout & numbering">
        <div className="admin-form-grid">
          <TextInput label="Text column max width" value={layout.maxWidth} onChange={(maxWidth) => setLayout({ maxWidth })} placeholder="None (container width)" />
          <TextInput label="Gap next to table of contents" value={layout.gap} onChange={(gap) => setLayout({ gap })} placeholder="3.5rem" />
          <TextInput label="Space between blocks" value={layout.blockGap} onChange={(blockGap) => setLayout({ blockGap })} placeholder="2.4rem (phone 1.9rem)" />
          <Field label="Blocks">
            <Toggle label="Number block titles (01, 02…)" checked={Boolean(c.numbered)} onChange={(numbered) => set({ numbered })} />
            <Toggle label="Divider line between blocks" checked={Boolean(layout.dividers)} onChange={(dividers) => setLayout({ dividers })} />
          </Field>
          <ColorInput label="Divider color" value={layout.dividerColor} onChange={(dividerColor) => setLayout({ dividerColor })} fallback="var(--gray-200)" />
        </div>
      </Group>
      <Group title="Text & link style">
        <div className="admin-form-grid">
          <TextInput label="Paragraph spacing" value={c.paragraphGap} onChange={(paragraphGap) => set({ paragraphGap })} placeholder="1rem" />
          <ColorInput label="Link color" value={c.linkColor} onChange={(linkColor) => set({ linkColor })} fallback="var(--orange-dim)" />
          <ColorInput label="Link hover color" value={c.linkHoverColor} onChange={(linkHoverColor) => set({ linkHoverColor })} fallback="var(--orange)" />
          <ColorInput label="List bullet color" value={c.markerColor} onChange={(markerColor) => set({ markerColor })} fallback="var(--orange)" />
        </div>
        <StyleEditor title="Policy text style" value={c.bodyStyle} onChange={(bodyStyle) => set({ bodyStyle })} allowHide={false} fontSizePlaceholder="var(--text-base)" />
        <StyleEditor title="Block title style" value={c.blockTitleStyle} onChange={(blockTitleStyle) => set({ blockTitleStyle })} allowHide={false} fontSizePlaceholder="1.35rem" />
        <StyleEditor title="Last updated style" value={c.updatedStyle} onChange={(updatedStyle) => set({ updatedStyle })} allowHide={false} fontSizePlaceholder="0.76rem" />
        <StyleEditor title="Intro style" value={c.introStyle} onChange={(introStyle) => set({ introStyle })} allowHide={false} fontSizePlaceholder="var(--text-lead)" />
      </Group>
      <Group title="Content panel" description="Optional card around the policy text (empty = no card)">
        <CardStyleFields
          value={panel}
          onChange={(patch) => set({ panel: { ...panel, ...patch } })}
          placeholders={{ background: 'transparent', border: 'none', radius: '0', padding: '0', shadow: 'none' }}
        />
      </Group>
      <Group title="Block icons & media">
        <IconStyleFields
          value={c.iconStyle}
          onChange={(iconStyle) => set({ iconStyle })}
          placeholders={{ box: '40px', size: '20px', radius: '10px', background: 'rgba(255,107,26,0.1)', color: 'var(--orange-dim)' }}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <TextInput label="Image / video height" value={c.mediaHeight} onChange={(mediaHeight) => set({ mediaHeight })} placeholder="280px (phone 200px)" />
          <NumberInput
            label="Slideshow seconds per item"
            value={c.mediaIntervalSeconds}
            min={2}
            step={1}
            placeholder="5"
            onChange={(mediaIntervalSeconds) => set({ mediaIntervalSeconds })}
          />
        </div>
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function PrivacySectionEditor({
  type,
  content,
  onChange,
}: {
  type: PrivacySectionType;
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
      <div className="az-admin lz-admin lgy-admin ctc-admin pvc-admin">
        <ThemeColorDatalist />
        <LifeGroupProvider key={type}>
          {type === 'privacy_hero' ? (
            <ContactHeroEditor content={withPrivacyDefaults<PrivacyHeroContent>(type, content)} onChange={emit} />
          ) : type === 'privacy_policy' ? (
            <PrivacyPolicyEditor content={withPrivacyDefaults<PrivacyPolicyContent>(type, content)} onChange={emit} />
          ) : type === 'privacy_cta' ? (
            <CertsCtaEditor content={withPrivacyDefaults<PrivacyCtaContent>(type, content)} onChange={emit} />
          ) : null}
        </LifeGroupProvider>
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
