'use client';

import { useEffect, useState } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, type SiteSettings } from '@/lib/site-settings';
import {
  AboutSiteSettingsContext,
  AlignButtons,
  ColorInput,
  CtaListEditor,
  IconEditor,
  ImageEditor,
  LinkListEditor,
  ListEditor,
  PillsEditor,
  SectionBoxEditor,
  SectionHeaderEditor,
  SelectInput,
  StyleEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  Toggle,
} from '@/components/admin/about/AboutControls';
import {
  ABOUT_ICON_PRESETS,
  normalizeLinkItems,
  withAboutDefaults,
  type AboutHeroContent,
  type AboutSectionType,
  type FacilitiesContent,
  type FacilityStep,
  type FloatCardPosition,
  type FounderNoteContent,
  type FounderStat,
  type MarqueeSeparator,
  type PurposeCard,
  type PurposeContent,
  type ServicesMarqueeContent,
  type SplitLayout,
  type StoryContent,
  type TextEl,
} from '@/lib/about-sections';
import HeroHeightPicker from '@/components/admin/HeroHeightPicker';
import HeroPlacementEditor from '@/components/admin/HeroPlacementEditor';
import HeroMotionFields from '@/components/admin/HeroMotionFields';
import { BgMediaGroup } from '@/components/admin/legacy/LegacySectionEditor';
import { HighlightEditor } from '@/components/admin/life/LifeControls';

type EditorProps<T> = { content: T; onChange: (next: T) => void };

function Group({ title, description, children, open }: { title: string; description?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <AdminCollapsible title={title} description={description} defaultOpen={open} className="az-admin-group">
      {children}
    </AdminCollapsible>
  );
}

function SplitLayoutEditor({
  value,
  onChange,
  sideLabel = 'Image position',
  columnsPlaceholder,
}: {
  value: SplitLayout;
  onChange: (next: SplitLayout) => void;
  sideLabel?: string;
  columnsPlaceholder: string;
}) {
  const l = value || { imageSide: 'right' };
  return (
    <div className="admin-form-grid">
      <AlignButtons
        label={sideLabel}
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
        placeholder={columnsPlaceholder}
        hint="CSS grid columns in on-screen order. Empty = design default."
      />
      <TextInput label="Column gap" value={l.gap} onChange={(gap) => onChange({ ...l, gap })} placeholder="3.2rem" />
      <div className="full">
        <Toggle
          label="On tablet / phone (stacked), show the image above the text"
          checked={Boolean(l.mobileImageFirst)}
          onChange={(mobileImageFirst) => onChange({ ...l, mobileImageFirst })}
        />
      </div>
    </div>
  );
}

function ParagraphsEditor({
  items,
  onChange,
}: {
  items: TextEl[];
  onChange: (next: TextEl[]) => void;
}) {
  return (
    <ListEditor<TextEl>
      label="Paragraphs"
      items={items || []}
      onChange={onChange}
      addLabel="Paragraph"
      create={() => ({ text: 'New paragraph.' })}
      itemTitle={(p) => p.text.slice(0, 60)}
      renderItem={(p, patch) => <TextElementEditor label="Paragraph text" multiline value={p} onChange={patch} />}
    />
  );
}

/* ------------------------------------------------------------------ */

function AboutHeroEditor({ content: c, onChange }: EditorProps<AboutHeroContent>) {
  const set = <K extends keyof AboutHeroContent>(k: K, v: AboutHeroContent[K]) => onChange({ ...c, [k]: v });
  const fc = c.floatCard;
  return (
    <>
      <Group title="Background, spacing & glow" description="Section color, gradient, image, grid pattern, orbs, padding">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
      <BgMediaGroup
        value={c.background || { items: [] }}
        onChange={(v) => set('background', v)}
        title="Background slideshow (images / videos)"
        withIndicators
      />
      <Group title="Layout, height & motion" description="Hero height, container position, image side, columns, entrance and scroll bar">
        <div className="admin-form-grid">
          <HeroHeightPicker value={c.heroHeight} onChange={(v) => set('heroHeight', v)} />
          <HeroPlacementEditor
            value={c.placement}
            onChange={(v) => set('placement', v)}
            slots={[
              { name: 'text', label: 'Text block' },
              { name: 'media', label: 'Image / video' },
            ]}
          />
        </div>
        <SplitLayoutEditor value={c.layout} onChange={(v) => set('layout', v)} columnsPlaceholder="1.15fr 0.98fr" />
        <HeroMotionFields
          entrance={Boolean(c.entrance)}
          onEntrance={(v) => set('entrance', v)}
          scrollBar={c.scrollBar}
          onScrollBar={(v) => set('scrollBar', v)}
        />
      </Group>
      <Group title="Breadcrumb">
        <div style={{ marginBottom: '0.6rem' }}>
          <Toggle label="Show breadcrumb" checked={!c.breadcrumb.hidden} onChange={(v) => set('breadcrumb', { ...c.breadcrumb, hidden: !v })} />
        </div>
        <LinkListEditor
          label="Crumbs (last item = current page)"
          items={normalizeLinkItems(c.breadcrumb.items)}
          onChange={(items) => set('breadcrumb', { ...c.breadcrumb, items })}
        />
        <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
          <TextInput label="Separator" value={c.breadcrumb.separator} onChange={(separator) => set('breadcrumb', { ...c.breadcrumb, separator })} placeholder="/" />
          <ColorInput label="Link hover color" value={c.breadcrumb.hoverColor} onChange={(hoverColor) => set('breadcrumb', { ...c.breadcrumb, hoverColor })} fallback="#00D4FF" />
        </div>
        <StyleEditor title="Breadcrumb style" value={c.breadcrumb.style} onChange={(style) => set('breadcrumb', { ...c.breadcrumb, style })} allowHide={false} />
      </Group>
      <Group title="Text content" description="Eyebrow, heading, lead" open>
        <TextElementEditor label="Eyebrow" eyebrow siteScale="md" value={c.eyebrow} onChange={(v) => set('eyebrow', v)} />
        <TextElementEditor label="Heading" headingTag siteRole="pageHero" multiline value={c.title} onChange={(v) => set('title', v)} />
        <HighlightEditor value={c.highlight} onChange={(v) => set('highlight', v)} />
        <TextElementEditor label="Lead" multiline value={c.lead} onChange={(v) => set('lead', v)} />
      </Group>
      <Group title="Pills" description="Value chips under the lead">
        <PillsEditor value={c.pills} onChange={(v) => set('pills', v)} />
      </Group>
      <Group title="Buttons" description="Optional call-to-action buttons">
        <CtaListEditor value={c.ctas} onChange={(v) => set('ctas', v)} />
      </Group>
      <Group title="Image">
        <ImageEditor value={c.image} onChange={(v) => set('image', v)} />
      </Group>
      <Group title="Floating stat card" description="The 20+ badge over the image">
        <div style={{ marginBottom: '0.6rem' }}>
          <Toggle label="Show floating card" checked={!fc.hidden} onChange={(v) => set('floatCard', { ...fc, hidden: !v })} />
        </div>
        <div className="admin-form-grid">
          <SelectInput
            label="Position"
            value={fc.position}
            options={[
              { value: 'bottom-left', label: 'Bottom left' },
              { value: 'bottom-right', label: 'Bottom right' },
              { value: 'top-left', label: 'Top left' },
              { value: 'top-right', label: 'Top right' },
            ]}
            onChange={(position) => set('floatCard', { ...fc, position: position as FloatCardPosition })}
          />
          <ColorInput label="Card background" value={fc.background} onChange={(background) => set('floatCard', { ...fc, background })} fallback="" />
          <TextInput label="Card border" value={fc.border} onChange={(border) => set('floatCard', { ...fc, border })} placeholder="1px solid rgba(255,255,255,0.14)" />
          <TextInput label="Card radius" value={fc.radius} onChange={(radius) => set('floatCard', { ...fc, radius })} placeholder="14px" />
        </div>
        <TextElementEditor label="Number" value={fc.number} onChange={(number) => set('floatCard', { ...fc, number })} />
        <TextElementEditor label="Label" multiline value={fc.label} onChange={(label) => set('floatCard', { ...fc, label })} />
      </Group>
    </>
  );
}

function ServicesMarqueeEditor({ content: c, onChange }: EditorProps<ServicesMarqueeContent>) {
  const set = <K extends keyof ServicesMarqueeContent>(k: K, v: ServicesMarqueeContent[K]) => onChange({ ...c, [k]: v });
  const sep = c.separator || { type: 'dot' };
  return (
    <>
      <Group title="Items" description="Services scrolling in the strip (auto-duplicated for a seamless loop)" open>
        <LinkListEditor label="Marquee items" items={normalizeLinkItems(c.items)} onChange={(items) => set('items', items)} />
      </Group>
      <Group title="Motion">
        <div className="admin-form-grid">
          <TextInput
            label="Loop duration (seconds)"
            value={String(c.speedSeconds ?? '')}
            onChange={(v) => set('speedSeconds', Number(v) || 0)}
            placeholder="38"
            hint="Higher = slower"
          />
          <AlignButtons
            label="Direction"
            value={c.direction}
            options={['ltr', 'rtl']}
            onChange={(v) => set('direction', (v || 'ltr') as ServicesMarqueeContent['direction'])}
          />
          <div className="full">
            <Toggle label="Pause on hover" checked={c.pauseOnHover !== false} onChange={(v) => set('pauseOnHover', v)} />
          </div>
        </div>
      </Group>
      <Group title="Item style">
        <div className="admin-form-grid">
          <TextInput label="Space between items" value={c.itemGap} onChange={(v) => set('itemGap', v)} placeholder="1.8rem" />
          <ColorInput label="Hover text color" value={c.hoverColor} onChange={(v) => set('hoverColor', v)} fallback="" />
        </div>
        <StyleEditor title="Item text style" value={c.itemStyle} onChange={(v) => set('itemStyle', v)} allowHide={false} />
      </Group>
      <Group title="Separator" description="Dot / shape / SVG icon before each item">
        <div className="admin-form-grid">
          <SelectInput
            label="Separator"
            value={sep.type}
            options={[
              { value: 'dot', label: 'Dot' },
              { value: 'square', label: 'Square' },
              { value: 'diamond', label: 'Diamond' },
              { value: 'line', label: 'Dash' },
              { value: 'icon', label: 'SVG icon' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(type) => set('separator', { ...sep, type: type as MarqueeSeparator })}
          />
          <ColorInput label="Separator color" value={sep.color} onChange={(color) => set('separator', { ...sep, color })} fallback="#FF6B1A" />
          <TextInput label="Separator size" value={sep.size} onChange={(size) => set('separator', { ...sep, size })} placeholder="6px" />
        </div>
        {sep.type === 'icon' ? (
          <div style={{ marginTop: '0.6rem' }}>
            <IconEditor
              label="Separator icon"
              value={sep.icon || { svg: ABOUT_ICON_PRESETS.find((p) => p.key === 'bolt')?.svg }}
              onChange={(icon) => set('separator', { ...sep, icon })}
            />
          </div>
        ) : null}
      </Group>
      <Group title="Background & spacing">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
    </>
  );
}

function StoryEditor({ content: c, onChange }: EditorProps<StoryContent>) {
  const set = <K extends keyof StoryContent>(k: K, v: StoryContent[K]) => onChange({ ...c, [k]: v });
  return (
    <>
      <Group title="Text content" description="Eyebrow, heading, paragraphs" open>
        <TextElementEditor label="Eyebrow" eyebrow siteScale="lg" value={c.eyebrow} onChange={(v) => set('eyebrow', v)} />
        <TextElementEditor label="Heading" headingTag siteRole="section" multiline value={c.title} onChange={(v) => set('title', v)} />
        <ParagraphsEditor items={c.paragraphs} onChange={(v) => set('paragraphs', v)} />
        <StyleEditor title="Style for all paragraphs" value={c.paragraphStyle} onChange={(v) => set('paragraphStyle', v)} allowHide={false} />
      </Group>
      <Group title="Image">
        <ImageEditor value={c.image} onChange={(v) => set('image', v)} />
      </Group>
      <Group title="Layout">
        <SplitLayoutEditor value={c.layout} onChange={(v) => set('layout', v)} columnsPlaceholder="9fr 11fr" />
        <div style={{ marginTop: '0.6rem' }}>
          <Toggle label="Fade-in on scroll" checked={c.reveal !== false} onChange={(v) => set('reveal', v)} />
        </div>
      </Group>
      <Group title="Pills">
        <PillsEditor value={c.pills} onChange={(v) => set('pills', v)} />
      </Group>
      <Group title="Buttons">
        <CtaListEditor value={c.ctas} onChange={(v) => set('ctas', v)} />
      </Group>
      <Group title="Background & spacing">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
    </>
  );
}

function PurposeEditor({ content: c, onChange }: EditorProps<PurposeContent>) {
  const set = <K extends keyof PurposeContent>(k: K, v: PurposeContent[K]) => onChange({ ...c, [k]: v });
  const cs = c.cardStyle || {};
  const d = c.divider || { symbol: '&' };
  return (
    <>
      <Group title="Section header" description="Eyebrow, heading, subtitle and alignment" open>
        <SectionHeaderEditor value={c.header} onChange={(v) => set('header', v)} />
      </Group>
      <Group title="Cards" description="Mission / vision cards — add as many as you need" open>
        <ListEditor<PurposeCard>
          label="Cards"
          items={c.cards || []}
          onChange={(v) => set('cards', v)}
          addLabel="Card"
          create={() => ({
            watermark: 'N',
            accentColor: '#12B76A',
            icon: { svg: ABOUT_ICON_PRESETS.find((p) => p.key === 'check')?.svg },
            tag: { text: '03 — OUR VALUES' },
            title: { text: 'New card heading', tag: 'h3' },
            body: { text: 'Describe this pillar.' },
          })}
          itemTitle={(card) => card.tag?.text || card.title?.text}
          renderItem={(card, patch) => (
            <>
              <div className="admin-form-grid">
                <ColorInput label="Accent color" value={card.accentColor} onChange={(accentColor) => patch({ ...card, accentColor })} fallback="#FF6B1A" />
                <TextInput
                  label="Hover bar gradient"
                  value={card.accentBar}
                  onChange={(accentBar) => patch({ ...card, accentBar })}
                  placeholder="linear-gradient(90deg,#FF6B1A,#FFC93C)"
                />
                <TextInput label="Watermark letter" value={card.watermark} onChange={(watermark) => patch({ ...card, watermark })} />
                <ColorInput label="Watermark color" value={card.watermarkColor} onChange={(watermarkColor) => patch({ ...card, watermarkColor })} fallback="" />
                <ColorInput label="Card background" value={card.background} onChange={(background) => patch({ ...card, background })} fallback="" />
                <TextInput label="Card border" value={card.border} onChange={(border) => patch({ ...card, border })} placeholder="1px solid rgba(255,255,255,0.1)" />
              </div>
              <TextElementEditor label="Tag" value={card.tag} onChange={(tag) => patch({ ...card, tag })} />
              <TextElementEditor label="Heading" headingTag value={card.title} onChange={(title) => patch({ ...card, title })} />
              <TextElementEditor label="Body" multiline value={card.body} onChange={(body) => patch({ ...card, body })} />
              <div style={{ marginTop: '0.6rem' }}>
                <IconEditor value={card.icon || {}} onChange={(icon) => patch({ ...card, icon })} />
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Card style (all cards)">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={cs.background} onChange={(background) => set('cardStyle', { ...cs, background })} fallback="" />
          <TextInput label="Border" value={cs.border} onChange={(border) => set('cardStyle', { ...cs, border })} placeholder="1px solid rgba(255,255,255,0.1)" />
          <TextInput label="Radius" value={cs.radius} onChange={(radius) => set('cardStyle', { ...cs, radius })} placeholder="18px" />
          <TextInput label="Padding" value={cs.padding} onChange={(padding) => set('cardStyle', { ...cs, padding })} placeholder="3rem 2.6rem" />
          <TextInput
            label="Padding (phone)"
            value={cs.paddingMobile}
            onChange={(paddingMobile) => set('cardStyle', { ...cs, paddingMobile })}
            placeholder="2.2rem 1.5rem"
          />
          <ColorInput label="Hover background" value={cs.hoverBackground} onChange={(hoverBackground) => set('cardStyle', { ...cs, hoverBackground })} fallback="" />
          <ColorInput label="Hover border color" value={cs.hoverBorderColor} onChange={(hoverBorderColor) => set('cardStyle', { ...cs, hoverBorderColor })} fallback="" />
          <div className="full">
            <Toggle label="Lift card on hover" checked={cs.hoverLift !== false} onChange={(hoverLift) => set('cardStyle', { ...cs, hoverLift })} />
          </div>
        </div>
      </Group>
      <Group title="Divider between cards">
        <div style={{ marginBottom: '0.6rem' }}>
          <Toggle label="Show divider" checked={!d.hidden} onChange={(v) => set('divider', { ...d, hidden: !v })} />
        </div>
        <div className="admin-form-grid">
          <TextInput label="Symbol" value={d.symbol} onChange={(symbol) => set('divider', { ...d, symbol })} placeholder="&" />
          <ColorInput label="Symbol color" value={d.color} onChange={(color) => set('divider', { ...d, color })} fallback="" />
          <TextInput label="Symbol size" value={d.fontSize} onChange={(fontSize) => set('divider', { ...d, fontSize })} placeholder="1.6rem" />
          <ColorInput label="Line color" value={d.lineColor} onChange={(lineColor) => set('divider', { ...d, lineColor })} fallback="" />
        </div>
      </Group>
      <Group title="Background, spacing & glow">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
    </>
  );
}

function FounderNoteEditor({ content: c, onChange }: EditorProps<FounderNoteContent>) {
  const set = <K extends keyof FounderNoteContent>(k: K, v: FounderNoteContent[K]) => onChange({ ...c, [k]: v });
  const l = c.layout || { photoSide: 'left' };
  const q = c.quote;
  const sig = c.signature;
  const st = c.stats;
  return (
    <>
      <Group title="Section header" description="Eyebrow above the note">
        <SectionHeaderEditor value={c.header} onChange={(v) => set('header', v)} />
      </Group>
      <Group title="Note content" description="Heading, quote, paragraphs" open>
        <TextElementEditor label="Heading" headingTag multiline value={c.heading} onChange={(v) => set('heading', v)} />
        <div style={{ margin: '0.6rem 0' }}>
          <Toggle label="Show quote" checked={!q.hidden} onChange={(v) => set('quote', { ...q, hidden: !v })} />
        </div>
        <div className="admin-form-grid">
          <ColorInput label="Quote bar color" value={q.borderColor} onChange={(borderColor) => set('quote', { ...q, borderColor })} fallback="#FF6B1A" />
          <TextInput label="Quote bar width" value={q.borderWidth} onChange={(borderWidth) => set('quote', { ...q, borderWidth })} placeholder="4px" />
        </div>
        <TextElementEditor label="Quote" multiline value={q} onChange={(v) => set('quote', { ...q, ...v })} />
        <ParagraphsEditor items={c.paragraphs} onChange={(v) => set('paragraphs', v)} />
        <StyleEditor title="Style for all paragraphs" value={c.paragraphStyle} onChange={(v) => set('paragraphStyle', v)} allowHide={false} />
      </Group>
      <Group title="Signature">
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <Toggle label="Show signature" checked={!sig.hidden} onChange={(v) => set('signature', { ...sig, hidden: !v })} />
          <Toggle label="Divider line above" checked={sig.divider !== false} onChange={(v) => set('signature', { ...sig, divider: v })} />
        </div>
        <TextElementEditor label="Name" value={sig.name} onChange={(name) => set('signature', { ...sig, name })} />
        <TextElementEditor label="Role" value={sig.role} onChange={(role) => set('signature', { ...sig, role })} />
      </Group>
      <Group title="Stats row">
        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <Toggle label="Show stats" checked={!st.hidden} onChange={(v) => set('stats', { ...st, hidden: !v })} />
          <Toggle label="Divider line above" checked={st.divider !== false} onChange={(v) => set('stats', { ...st, divider: v })} />
          <Toggle
            label="Phones: labels only (hide text)"
            checked={st.hideTextOnMobile !== false}
            onChange={(v) => set('stats', { ...st, hideTextOnMobile: v })}
          />
        </div>
        <ListEditor<FounderStat>
          label="Stats"
          items={st.items || []}
          onChange={(items) => set('stats', { ...st, items })}
          addLabel="Stat"
          create={() => ({ label: 'New stat', text: 'Short supporting line.' })}
          itemTitle={(s) => s.label}
          renderItem={(s, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
              <TextArea label="Text" rows={2} value={s.text} onChange={(text) => patch({ ...s, text })} />
            </div>
          )}
        />
        <StyleEditor title="Stat label style" value={st.labelStyle} onChange={(labelStyle) => set('stats', { ...st, labelStyle })} allowHide={false} />
        <StyleEditor title="Stat text style" value={st.textStyle} onChange={(textStyle) => set('stats', { ...st, textStyle })} allowHide={false} />
      </Group>
      <Group title="Photo">
        <ImageEditor label="Photo" value={c.photo} onChange={(v) => set('photo', v)} />
      </Group>
      <Group title="Layout">
        <div className="admin-form-grid">
          <AlignButtons
            label="Photo position"
            value={l.photoSide}
            options={['left', 'right']}
            onChange={(v) => set('layout', { ...l, photoSide: (v || 'left') as FounderNoteContent['layout']['photoSide'] })}
          />
          <SelectInput
            label="Vertical alignment"
            value={l.alignItems || ''}
            options={[
              { value: '', label: 'Default (top)' },
              { value: 'start', label: 'Top' },
              { value: 'center', label: 'Center' },
              { value: 'end', label: 'Bottom' },
            ]}
            onChange={(v) => set('layout', { ...l, alignItems: (v || undefined) as FounderNoteContent['layout']['alignItems'] })}
          />
          <TextInput label="Photo column width" value={l.photoWidth} onChange={(photoWidth) => set('layout', { ...l, photoWidth })} placeholder="260px" />
          <TextInput label="Gap" value={l.gap} onChange={(gap) => set('layout', { ...l, gap })} placeholder="3.2rem" />
          <TextInput label="Max width" value={l.maxWidth} onChange={(maxWidth) => set('layout', { ...l, maxWidth })} placeholder="1180px" />
          <TextInput
            label="Photo width (phone)"
            value={l.photoWidthMobile}
            onChange={(photoWidthMobile) => set('layout', { ...l, photoWidthMobile })}
            placeholder="260px"
          />
          <div className="full">
            <Toggle
              label="On phones (stacked), show the photo above the note"
              checked={l.mobilePhotoFirst !== false}
              onChange={(mobilePhotoFirst) => set('layout', { ...l, mobilePhotoFirst })}
            />
          </div>
        </div>
      </Group>
      <Group title="Background & spacing">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
    </>
  );
}

function FacilitiesEditor({ content: c, onChange }: EditorProps<FacilitiesContent>) {
  const set = <K extends keyof FacilitiesContent>(k: K, v: FacilitiesContent[K]) => onChange({ ...c, [k]: v });
  const cs = c.cardStyle || {};
  const is = c.iconStyle || {};
  const track = c.track || {};
  return (
    <>
      <Group title="Section header" description="Eyebrow, heading, subtitle and alignment" open>
        <SectionHeaderEditor value={c.header} onChange={(v) => set('header', v)} />
      </Group>
      <Group title="Steps" description="Zigzag cards — each with its own color and SVG icon" open>
        <ListEditor<FacilityStep>
          label="Steps"
          items={c.steps || []}
          onChange={(v) => set('steps', v)}
          addLabel="Step"
          create={() => ({
            tag: `STEP ${String((c.steps?.length || 0) + 1).padStart(2, '0')}`,
            title: 'New step',
            body: 'Describe this stage.',
            color: '#FF6B1A',
            icon: { svg: ABOUT_ICON_PRESETS.find((p) => p.key === 'check')?.svg },
          })}
          itemTitle={(s) => `${s.tag} ${s.title}`}
          renderItem={(s, patch) => (
            <>
              <div className="admin-form-grid">
                <TextInput label="Tag" value={s.tag} onChange={(tag) => patch({ ...s, tag })} />
                <ColorInput label="Step color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="#FF6B1A" />
                <TextInput label="Title" value={s.title} onChange={(title) => patch({ ...s, title })} full />
                <TextArea label="Body" rows={3} value={s.body} onChange={(body) => patch({ ...s, body })} />
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <IconEditor value={s.icon || {}} onChange={(icon) => patch({ ...s, icon })} />
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Layout & motion">
        <div className="admin-form-grid">
          <AlignButtons
            label="First card side"
            value={c.startSide}
            options={['left', 'right']}
            onChange={(v) => set('startSide', (v || 'left') as FacilitiesContent['startSide'])}
          />
          <ColorInput label="Track line color" value={track.color} onChange={(color) => set('track', { ...track, color })} fallback="" />
          <div className="full" style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
            <Toggle label="Show center track" checked={!track.hidden} onChange={(v) => set('track', { ...track, hidden: !v })} />
            <Toggle label="Animate track fill" checked={track.animate !== false} onChange={(v) => set('track', { ...track, animate: v })} />
            <Toggle label="Slide cards in on scroll" checked={c.animateCards !== false} onChange={(v) => set('animateCards', v)} />
          </div>
        </div>
      </Group>
      <Group title="Card style (all steps)">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={cs.background} onChange={(background) => set('cardStyle', { ...cs, background })} fallback="#FFFFFF" />
          <TextInput label="Border" value={cs.border} onChange={(border) => set('cardStyle', { ...cs, border })} placeholder="1px solid rgba(10,22,40,0.05)" />
          <TextInput label="Radius" value={cs.radius} onChange={(radius) => set('cardStyle', { ...cs, radius })} placeholder="14px" />
          <TextInput label="Padding" value={cs.padding} onChange={(padding) => set('cardStyle', { ...cs, padding })} placeholder="1rem 1.6rem" />
          <TextInput label="Shadow" value={cs.shadow} onChange={(shadow) => set('cardStyle', { ...cs, shadow })} placeholder="0 14px 30px -16px rgba(10,22,40,0.22)" />
          <TextInput label="Max width" value={cs.maxWidth} onChange={(maxWidth) => set('cardStyle', { ...cs, maxWidth })} placeholder="520px" />
        </div>
        <StyleEditor title="Step tag style" value={c.tagStyle} onChange={(v) => set('tagStyle', v)} allowHide={false} />
        <StyleEditor title="Step title style" value={c.titleStyle} onChange={(v) => set('titleStyle', v)} allowHide={false} />
        <StyleEditor title="Step body style" value={c.bodyStyle} onChange={(v) => set('bodyStyle', v)} allowHide={false} />
      </Group>
      <Group title="Icon box style (all steps)">
        <div className="admin-form-grid">
          <ColorInput label="Background" value={is.background} onChange={(background) => set('iconStyle', { ...is, background })} fallback="#FFFFFF" />
          <TextInput label="Border" value={is.border} onChange={(border) => set('iconStyle', { ...is, border })} placeholder="1.5px solid rgba(10,22,40,0.1)" />
          <TextInput label="Radius" value={is.radius} onChange={(radius) => set('iconStyle', { ...is, radius })} placeholder="18px" />
          <TextInput label="Box size" value={is.size} onChange={(size) => set('iconStyle', { ...is, size })} placeholder="64px" />
        </div>
      </Group>
      <Group title="Background & spacing">
        <SectionBoxEditor value={c.section} onChange={(v) => set('section', v)} />
      </Group>
    </>
  );
}

export default function AboutSectionEditor({
  type,
  content,
  onChange,
}: {
  type: AboutSectionType;
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
      <div className="az-admin">
        {type === 'about_hero' ? (
          <AboutHeroEditor content={withAboutDefaults<AboutHeroContent>(type, content)} onChange={emit} />
        ) : type === 'services_marquee' ? (
          <ServicesMarqueeEditor content={withAboutDefaults<ServicesMarqueeContent>(type, content)} onChange={emit} />
        ) : type === 'story' ? (
          <StoryEditor content={withAboutDefaults<StoryContent>(type, content)} onChange={emit} />
        ) : type === 'purpose' ? (
          <PurposeEditor content={withAboutDefaults<PurposeContent>(type, content)} onChange={emit} />
        ) : type === 'founder_note' ? (
          <FounderNoteEditor content={withAboutDefaults<FounderNoteContent>(type, content)} onChange={emit} />
        ) : type === 'facilities' ? (
          <FacilitiesEditor content={withAboutDefaults<FacilitiesContent>(type, content)} onChange={emit} />
        ) : null}
      </div>
    </AboutSiteSettingsContext.Provider>
  );
}
