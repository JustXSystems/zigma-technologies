'use client';

import type { ReactNode } from 'react';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  ColorInput,
  createSectionFamilyEditor,
  CtaListEditor,
  Field,
  Group,
  ListEditor,
  NumberInput,
  SelectInput,
  StringListEditor,
  TextArea,
  TextElementEditor,
  TextInput,
  Toggle,
  type EditorProps,
} from '@/components/admin/section-kit';
import { svgMarkup, type CtaButton, type TextEl } from '@/lib/about-sections';
import {
  SOLAR_ALL_ICON_PRESETS,
  defaultSolarBannerContent,
  defaultSolarE2eContent,
  defaultSolarExpertiseCard,
  defaultSolarInverterCard,
  defaultSolarPillarCard,
  defaultSolarProcessStep,
  defaultSolarProject,
  defaultSolarService,
  defaultSolarTypeItem,
  withSolarDefaults,
  type SolarBannerContent,
  type SolarBox,
  type SolarCta,
  type SolarCtaContent,
  type SolarDeliveryContent,
  type SolarE2eContent,
  type SolarE2eStep,
  type SolarE2eVariant,
  type SolarExpertiseCard,
  type SolarExpertiseContent,
  type SolarEyebrow,
  type SolarEyebrowTone,
  type SolarHead,
  type SolarHeroContent,
  type SolarHeroNode,
  type SolarHeroSlide,
  type SolarHeroStat,
  type SolarIndustriesContent,
  type SolarIndustryPill,
  type SolarInverterCard,
  type SolarInverterService,
  type SolarInvertersContent,
  type SolarOrb,
  type SolarPerformanceContent,
  type SolarPillarCard,
  type SolarProcessContent,
  type SolarProcessStep,
  type SolarProject,
  type SolarProjectsContent,
  type SolarRoiModal,
  type SolarSectionType,
  type SolarService,
  type SolarTypeItem,
  type SolarTypesContent,
} from '@/lib/solar-sections';

const ICON_PREVIEW = 'lz-icon-preview';

/* ------------------------------------------------------------------ */
/* Shared controls                                                     */
/* ------------------------------------------------------------------ */

function ShowToggle({ hidden, onChange, label = 'Show this item' }: { hidden?: boolean; onChange: (hidden: boolean) => void; label?: string }) {
  return (
    <Field label="Visibility">
      <Toggle label={label} checked={!hidden} onChange={(v) => onChange(!v)} />
    </Field>
  );
}

function ImageField({ label, value, onChange, hint }: { label: string; value?: string; onChange: (v: string) => void; hint?: string }) {
  return <MediaPicker label={label} value={value || ''} onChange={onChange} kinds={['image']} allowUpload hint={hint} />;
}

/** Icon given as inner SVG shapes (24×24) or a full <svg>, with preset picker + live preview. */
function SvgIconField({ label = 'Icon', value, onChange }: { label?: string; value?: string; onChange: (v: string) => void }) {
  const preview = svgMarkup(value);
  const presetKey = SOLAR_ALL_ICON_PRESETS.find((p) => p.svg === (value || '').trim())?.key || '';
  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div className={`az-admin-icon-preview ${ICON_PREVIEW}`} style={{ color: '#FF6B1A' }} dangerouslySetInnerHTML={{ __html: preview }} />
        <div className="admin-form-grid" style={{ flex: 1 }}>
          <SelectInput
            label={`${label} preset`}
            value={presetKey}
            options={[{ value: '', label: presetKey ? 'Custom' : 'Custom SVG…' }, ...SOLAR_ALL_ICON_PRESETS.map((p) => ({ value: p.key, label: p.label }))]}
            onChange={(key) => {
              const preset = SOLAR_ALL_ICON_PRESETS.find((p) => p.key === key);
              if (preset) onChange(preset.svg);
            }}
          />
        </div>
      </div>
      <TextArea
        label={`${label} SVG markup`}
        rows={3}
        value={value}
        onChange={onChange}
        placeholder='<svg viewBox="0 0 24 24">…</svg> or inner <path d="…"/>'
        hint="Paste a full <svg> or just the shapes for a 24×24 box."
      />
    </div>
  );
}

const EYEBROW_TONES = [
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Green' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'none', label: 'Plain (inherit color)' },
] as const;

function EyebrowField({ label = 'Eyebrow', value, onChange }: { label?: string; value?: SolarEyebrow; onChange: (next: SolarEyebrow) => void }) {
  const v: SolarEyebrow = value || { text: '' };
  return (
    <>
      <TextElementEditor label={label} value={v} onChange={(next) => onChange({ ...v, ...next })} hint="Empty = hidden" />
      <div className="admin-form-grid">
        <SelectInput
          label="Eyebrow color"
          value={v.tone || 'orange'}
          options={EYEBROW_TONES}
          onChange={(tone) => onChange({ ...v, tone: tone as SolarEyebrowTone })}
        />
      </div>
    </>
  );
}

function HeadFields({ value, onChange }: { value: SolarHead; onChange: (next: SolarHead) => void }) {
  const set = (patch: Partial<SolarHead>) => onChange({ ...value, ...patch });
  return (
    <>
      <div className="admin-form-grid">
        <Field label="Visibility">
          <Toggle label="Show the heading block" checked={!value.hidden} onChange={(v) => set({ hidden: !v })} />
        </Field>
        <SelectInput
          label="Alignment"
          value={value.align || 'center'}
          options={[
            { value: 'center', label: 'Centered' },
            { value: 'left', label: 'Left' },
          ]}
          onChange={(align) => set({ align: align as SolarHead['align'] })}
        />
      </div>
      <EyebrowField value={value.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
      <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={value.title} onChange={(title) => set({ title: title as TextEl })} />
      <TextElementEditor label="Subtitle" multiline value={value.subtitle} onChange={(subtitle) => set({ subtitle: subtitle as TextEl })} />
    </>
  );
}

function BoxGroup({ value, onChange }: { value: SolarBox; onChange: (next: SolarBox) => void }) {
  const box = value || {};
  const set = (patch: Partial<SolarBox>) => onChange({ ...box, ...patch });
  return (
    <Group title="Section look" description="Optional overrides: empty = the design&apos;s own colors and spacing">
      <div className="admin-form-grid">
        <ColorInput label="Background color" value={box.bgColor} onChange={(bgColor) => set({ bgColor })} fallback="" />
        <TextInput label="Background gradient" value={box.bgGradient} onChange={(bgGradient) => set({ bgGradient })} placeholder="linear-gradient(120deg,#040A14,#0A1628)" full />
        <ColorInput label="Text color" value={box.textColor} onChange={(textColor) => set({ textColor })} fallback="" />
        <TextInput label="Padding top" value={box.paddingTop} onChange={(paddingTop) => set({ paddingTop })} placeholder="e.g. 6rem" />
        <TextInput label="Padding bottom" value={box.paddingBottom} onChange={(paddingBottom) => set({ paddingBottom })} placeholder="e.g. 6rem" />
        <TextInput label="Border top" value={box.borderTop} onChange={(borderTop) => set({ borderTop })} placeholder="1px solid #E7EBF1" />
        <TextInput label="Border bottom" value={box.borderBottom} onChange={(borderBottom) => set({ borderBottom })} placeholder="1px solid #E7EBF1" />
      </div>
      <ImageField label="Background image" value={box.bgImage} onChange={(bgImage) => set({ bgImage })} />
    </Group>
  );
}

function OrbFields({ value, onChange }: { value: SolarOrb; onChange: (next: SolarOrb) => void }) {
  const orb = value || { tone: 'orange' as const };
  const set = (patch: Partial<SolarOrb>) => onChange({ ...orb, ...patch });
  return (
    <div className="admin-form-grid">
      <Field label="Visibility">
        <Toggle label="Show glow orb" checked={!orb.hidden} onChange={(v) => set({ hidden: !v })} />
      </Field>
      <SelectInput
        label="Color"
        value={orb.tone || 'orange'}
        options={[
          { value: 'orange', label: 'Orange' },
          { value: 'green', label: 'Green' },
          { value: 'cyan', label: 'Cyan' },
          { value: 'purple', label: 'Purple' },
        ]}
        onChange={(tone) => set({ tone: tone as SolarOrb['tone'] })}
      />
      <TextInput label="Size" value={orb.size} onChange={(size) => set({ size })} placeholder="420px" />
      <TextInput label="Opacity" value={orb.opacity} onChange={(opacity) => set({ opacity })} placeholder="0.28" />
      <TextInput label="Top" value={orb.top} onChange={(top) => set({ top })} placeholder="-180px" />
      <TextInput label="Right" value={orb.right} onChange={(right) => set({ right })} />
      <TextInput label="Bottom" value={orb.bottom} onChange={(bottom) => set({ bottom })} />
      <TextInput label="Left" value={orb.left} onChange={(left) => set({ left })} />
    </div>
  );
}

function ButtonsGroup({ title = 'Buttons', ctas, onChange }: { title?: string; ctas: CtaButton[]; onChange: (next: CtaButton[]) => void }) {
  return (
    <Group title={title} description="Optional call-to-action buttons">
      <CtaListEditor value={ctas || []} onChange={onChange} />
    </Group>
  );
}

const COLOR_HINT = 'e.g. var(--orange), #12B76A';

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

function HeroCtaList({ value, onChange }: { value: SolarCta[]; onChange: (next: SolarCta[]) => void }) {
  return (
    <ListEditor<SolarCta>
      label="Buttons"
      items={value || []}
      onChange={onChange}
      addLabel="Button"
      create={() => ({ label: 'Get a Solar Proposal →', href: '/contact#contact-form', variant: 'primary' })}
      itemTitle={(b) => b.label}
      renderItem={(b, patch) => (
        <div className="admin-form-grid">
          <TextInput label="Label" value={b.label} onChange={(label) => patch({ ...b, label })} />
          <TextInput label="Link" value={b.href} onChange={(href) => patch({ ...b, href })} placeholder="/contact or #epc" />
          <SelectInput
            label="Style"
            value={b.variant === 'ghost' || b.variant === 'ghost-dark' ? 'ghost' : 'primary'}
            options={[
              { value: 'primary', label: 'Primary (orange)' },
              { value: 'ghost', label: 'Ghost (glass outline)' },
            ]}
            onChange={(variant) => patch({ ...b, variant: variant as SolarCta['variant'] })}
          />
          <Field label="Play icon">
            <Toggle label="Show the outlined play icon (ghost style)" checked={Boolean(b.play)} onChange={(play) => patch({ ...b, play })} />
          </Field>
        </div>
      )}
    />
  );
}

function SolarHeroEditor({ content: c, onChange }: EditorProps<SolarHeroContent>) {
  const set = (patch: Partial<SolarHeroContent>) => onChange({ ...c, ...patch });
  const nodes = c.nodes || { ariaLabel: '', arc: '', items: [] };
  const setNodes = (patch: Partial<SolarHeroContent['nodes']>) => set({ nodes: { ...nodes, ...patch } });
  const stats = c.stats || { items: [] };
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Slides" open description="Full-bleed photo, heading, key words and buttons; the slider rotates automatically">
        <ListEditor<SolarHeroSlide>
          label="Slides"
          items={c.slides || []}
          onChange={(slides) => set({ slides })}
          addLabel="Slide"
          create={() => ({
            image: '',
            eyebrow: 'SOLAR ENERGY',
            title: { text: 'New slide heading', tag: 'h1' },
            words: ['One', 'Two', 'Three', 'Four'],
            lead: { text: 'Short supporting paragraph.' },
            ctas: [{ label: 'Get a Solar Proposal →', href: '/contact#contact-form', variant: 'primary' }],
          })}
          itemTitle={(s, i) => `${s.hidden ? '(hidden) ' : ''}${i + 1}. ${s.eyebrow || s.title?.text || 'Slide'}`}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this slide" />
              <ImageField label="Background photo" value={s.image} onChange={(image) => patch({ ...s, image })} />
              <div className="admin-form-grid">
                <TextInput label="Eyebrow" value={s.eyebrow} onChange={(eyebrow) => patch({ ...s, eyebrow })} />
              </div>
              <TextElementEditor label="Heading" multiline headingTag value={s.title} onChange={(title) => patch({ ...s, title: title as TextEl })} />
              <StringListEditor label="Key words (the last one is highlighted)" items={s.words || []} onChange={(words) => patch({ ...s, words })} />
              <TextElementEditor label="Lead paragraph" multiline value={s.lead} onChange={(lead) => patch({ ...s, lead: lead as TextEl })} />
              <HeroCtaList value={s.ctas} onChange={(ctas) => patch({ ...s, ctas })} />
            </>
          )}
        />
        <div className="admin-form-grid">
          <NumberInput label="Seconds per slide" value={c.intervalSeconds} min={2} step={0.5} placeholder="6.5" onChange={(intervalSeconds) => set({ intervalSeconds })} />
          <TextInput label="Word separator" value={c.wordSeparator} onChange={(wordSeparator) => set({ wordSeparator })} placeholder="·" />
          <Field label="Behaviour">
            <Toggle label="Show slide dots" checked={c.showDots !== false} onChange={(showDots) => set({ showDots })} />
          </Field>
          <TextInput label="Dark overlay (CSS gradient)" value={c.shade} onChange={(shade) => set({ shade })} placeholder="Empty = design default" full />
        </div>
      </Group>
      <Group title="Service cards on the arc" description="Glass cards connected to the glowing arc on the right">
        <div className="admin-form-grid">
          <Field label="Visibility">
            <Toggle label="Show the arc and cards" checked={!nodes.hidden} onChange={(v) => setNodes({ hidden: !v })} />
          </Field>
          <TextInput label="Accessible label" value={nodes.ariaLabel} onChange={(ariaLabel) => setNodes({ ariaLabel })} />
          <TextArea label="Arc path (SVG path on a 640 × 470 canvas)" value={nodes.arc} onChange={(arc) => setNodes({ arc })} rows={2} />
        </div>
        <ListEditor<SolarHeroNode>
          label="Cards"
          items={nodes.items || []}
          onChange={(items) => setNodes({ items })}
          addLabel="Card"
          create={() => ({ label: 'New\nService', icon: '', href: '#services', x: 320, cardY: 200, dotY: 260 })}
          itemTitle={(n) => `${n.hidden ? '(hidden) ' : ''}${(n.label || '').replace(/\n/g, ' ')}`}
          renderItem={(n, patch) => (
            <>
              <ShowToggle hidden={n.hidden} onChange={(hidden) => patch({ ...n, hidden })} label="Show this card" />
              <div className="admin-form-grid">
                <TextArea label="Label (new line = line break)" value={n.label} rows={2} onChange={(label) => patch({ ...n, label })} />
                <TextInput label="Link" value={n.href} onChange={(href) => patch({ ...n, href })} placeholder="#epc" />
                <NumberInput label="X position (0–640)" value={n.x} min={0} max={640} onChange={(x) => patch({ ...n, x: x ?? 0 })} />
                <NumberInput label="Card bottom Y (0–470)" value={n.cardY} min={0} max={470} onChange={(cardY) => patch({ ...n, cardY: cardY ?? 0 })} />
                <NumberInput label="Arc dot Y (0–470)" value={n.dotY} min={0} max={470} onChange={(dotY) => patch({ ...n, dotY: dotY ?? 0 })} />
              </div>
              <SvgIconField value={n.icon} onChange={(icon) => patch({ ...n, icon })} />
            </>
          )}
        />
      </Group>
      <Group title="Stats strip" description="Small highlights along the bottom of the hero">
        <Toggle label="Show the stats strip" checked={!stats.hidden} onChange={(v) => set({ stats: { ...stats, hidden: !v } })} />
        <ListEditor<SolarHeroStat>
          label="Stats"
          items={stats.items || []}
          onChange={(items) => set({ stats: { ...stats, items } })}
          addLabel="Stat"
          create={() => ({ icon: '', value: '100+', label: 'New stat' })}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.value} ${s.label}`.replace(/\n/g, ' ')}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this stat" />
              <div className="admin-form-grid">
                <TextInput label="Value" value={s.value} onChange={(value) => patch({ ...s, value })} />
                <TextArea label="Label (new line = line break)" value={s.label} rows={2} onChange={(label) => patch({ ...s, label })} />
              </div>
              <SvgIconField value={s.icon} onChange={(icon) => patch({ ...s, icon })} />
            </>
          )}
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* What we deliver                                                     */
/* ------------------------------------------------------------------ */

function SolarDeliveryEditor({ content: c, onChange }: EditorProps<SolarDeliveryContent>) {
  const set = (patch: Partial<SolarDeliveryContent>) => onChange({ ...c, ...patch });
  const note = c.note || { strong: '', text: '' };
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Background photo" description="Dark photo behind the cards">
        <ImageField label="Background image" value={c.bgImage} onChange={(bgImage) => set({ bgImage })} />
      </Group>
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Service cards" open>
        <ListEditor<SolarPillarCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={defaultSolarPillarCard}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.title}`}
          renderItem={(card, patch) => (
            <>
              <ShowToggle hidden={card.hidden} onChange={(hidden) => patch({ ...card, hidden })} label="Show this card" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={card.title} onChange={(title) => patch({ ...card, title })} />
                <TextInput label="Tag" value={card.tag} onChange={(tag) => patch({ ...card, tag })} placeholder="PART 1" />
                <TextInput label="Sub-title" value={card.sub} onChange={(sub) => patch({ ...card, sub })} full />
                <ColorInput label="Accent color" value={card.accent} onChange={(accent) => patch({ ...card, accent })} fallback="#FF6B1A" hint={COLOR_HINT} />
                <TextInput label="Link label" value={card.linkLabel} onChange={(linkLabel) => patch({ ...card, linkLabel })} placeholder="Explore Solar EPC" />
                <TextInput label="Link" value={card.linkHref} onChange={(linkHref) => patch({ ...card, linkHref })} placeholder="#epc" />
              </div>
              <StringListEditor label="Checklist" items={card.items || []} onChange={(items) => patch({ ...card, items })} />
              <SvgIconField value={card.icon} onChange={(icon) => patch({ ...card, icon })} />
              <ImageField label="Card background photo (optional)" value={card.bgImage} onChange={(bgImage) => patch({ ...card, bgImage })} />
            </>
          )}
        />
      </Group>
      <Group title="Note under the cards">
        <Toggle label="Show the note" checked={!note.hidden} onChange={(v) => set({ note: { ...note, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="Bold lead-in" value={note.strong} onChange={(strong) => set({ note: { ...note, strong } })} />
          <TextArea label="Text" value={note.text} onChange={(text) => set({ note: { ...note, text } })} rows={2} />
        </div>
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Part banner                                                         */
/* ------------------------------------------------------------------ */

function SolarBannerEditor({ content: c, onChange }: EditorProps<SolarBannerContent>) {
  const set = (patch: Partial<SolarBannerContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Banner look" open>
        <div className="admin-form-grid">
          <SelectInput
            label="Color set"
            value={c.tone}
            options={[
              { value: 'orange', label: 'Orange (part 1)' },
              { value: 'green', label: 'Green (part 2)' },
              { value: 'purple', label: 'Purple (part 3)' },
            ]}
            onChange={(tone) => set({ tone: tone as SolarBannerContent['tone'] })}
          />
          <ColorInput label="Custom accent" value={c.accent} onChange={(accent) => set({ accent })} fallback="" hint="Empty = the color set's accent" />
          <TextInput label="Big number" value={c.num} onChange={(num) => set({ num })} placeholder="01" />
          <TextInput label="Anchor id" value={c.anchorId} onChange={(anchorId) => set({ anchorId })} placeholder="Empty = the section key" hint="Links like #epc jump here" />
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary az-admin-mini"
          onClick={() => {
            const kind = c.tone === 'green' ? 'amc' : c.tone === 'purple' ? 'expertise' : 'epc';
            if (window.confirm('Replace this banner with the design defaults for its color set?')) onChange(defaultSolarBannerContent(kind));
          }}
        >
          Reset to design defaults
        </button>
      </Group>
      <Group title="Glow orb">
        <OrbFields value={c.orb} onChange={(orb) => set({ orb })} />
      </Group>
      <Group title="Text" open>
        <EyebrowField value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title: title as TextEl })} />
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body: body as TextEl })} />
        <StringListEditor label="Chips" items={c.chips || []} onChange={(chips) => set({ chips })} />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* End-to-end blocks                                                   */
/* ------------------------------------------------------------------ */

function SolarE2eEditor({ content: c, onChange }: EditorProps<SolarE2eContent>) {
  const set = (patch: Partial<SolarE2eContent>) => onChange({ ...c, ...patch });
  const promise = c.promise || { title: '', items: [] };
  const loop = c.loop || { ariaLabel: '', centerTop: '', centerTitle: '', centerSub: '' };
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Layout" open description="Timeline (6 steps in a row), loop (circular diagram) or stepper (auto-playing tabs)">
        <div className="admin-form-grid">
          <SelectInput
            label="Layout"
            value={c.variant}
            options={[
              { value: 'timeline', label: 'Timeline' },
              { value: 'loop', label: 'Loop diagram' },
              { value: 'stepper', label: 'Stepper (tabs)' },
            ]}
            onChange={(variant) => set({ variant: variant as SolarE2eVariant })}
          />
          <ColorInput label="Accent color" value={c.accent} onChange={(accent) => set({ accent })} fallback="" hint="Empty = layout default (orange / blue / purple)" />
          <TextInput label="Step prefix (timeline)" value={c.stepPrefix} onChange={(stepPrefix) => set({ stepPrefix })} placeholder="STEP" />
          <TextInput label="Panel label (stepper)" value={c.stepOfFormat} onChange={(stepOfFormat) => set({ stepOfFormat })} placeholder="STEP {n} OF {total}" hint="{n} and {total} are replaced" />
          <TextInput label="“You get” label (stepper)" value={c.youGetLabel} onChange={(youGetLabel) => set({ youGetLabel })} placeholder="You get:" />
          <NumberInput label="Loop seconds per step" value={loop.intervalSeconds} min={1} step={0.2} placeholder="2.6" onChange={(intervalSeconds) => set({ loop: { ...loop, intervalSeconds } })} />
          <NumberInput
            label="Stepper seconds per step"
            value={c.stepper?.intervalSeconds}
            min={1}
            step={0.2}
            placeholder="4.8"
            onChange={(intervalSeconds) => set({ stepper: { ...(c.stepper || {}), intervalSeconds } })}
          />
          <Field label="Behaviour">
            <Toggle label="Autoplay (loop and stepper)" checked={c.autoplay !== false} onChange={(autoplay) => set({ autoplay })} />
          </Field>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary az-admin-mini"
          onClick={() => {
            if (window.confirm('Replace steps, heading and labels with the design defaults for this layout?')) onChange(defaultSolarE2eContent(c.variant));
          }}
        >
          Reset to design defaults for this layout
        </button>
        <p className="az-admin-hint">
          The design paints this section&apos;s background by its section key: keep the key <code>epc-e2e</code> (orange), <code>amc-e2e</code> (blue) or <code>inv-e2e</code> (purple) to keep that look.
        </p>
      </Group>
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Steps" open>
        <ListEditor<SolarE2eStep>
          label="Steps"
          items={c.steps || []}
          onChange={(steps) => set({ steps })}
          addLabel="Step"
          create={() => ({ title: 'New step', body: 'What happens in this step.', icon: '', tabLabel: '', get: '' })}
          itemTitle={(s, i) => `${s.hidden ? '(hidden) ' : ''}${i + 1}. ${s.title}`}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this step" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={s.title} onChange={(title) => patch({ ...s, title })} />
                <TextInput label="Tab label (stepper)" value={s.tabLabel} onChange={(tabLabel) => patch({ ...s, tabLabel })} placeholder="Empty = title" />
                <TextArea label="Description" value={s.body} onChange={(body) => patch({ ...s, body })} rows={2} />
                <TextInput label="“You get” line (stepper)" value={s.get} onChange={(get) => patch({ ...s, get })} full />
              </div>
              <SvgIconField value={s.icon} onChange={(icon) => patch({ ...s, icon })} />
            </>
          )}
        />
      </Group>
      <Group title="Loop diagram centre text" description="Used by the loop layout">
        <div className="admin-form-grid">
          <TextInput label="Accessible label" value={loop.ariaLabel} onChange={(ariaLabel) => set({ loop: { ...loop, ariaLabel } })} full />
          <TextInput label="Top line" value={loop.centerTop} onChange={(centerTop) => set({ loop: { ...loop, centerTop } })} />
          <TextInput label="Title" value={loop.centerTitle} onChange={(centerTitle) => set({ loop: { ...loop, centerTitle } })} />
          <TextInput label="Sub line" value={loop.centerSub} onChange={(centerSub) => set({ loop: { ...loop, centerSub } })} />
        </div>
      </Group>
      <Group title="Promise list" description="Ticked points under the steps">
        <Toggle label="Show the promise list" checked={!promise.hidden} onChange={(v) => set({ promise: { ...promise, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="List title" value={promise.title} onChange={(title) => set({ promise: { ...promise, title } })} full />
        </div>
        <StringListEditor label="Points" items={promise.items || []} onChange={(items) => set({ promise: { ...promise, items } })} />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Solar system types                                                  */
/* ------------------------------------------------------------------ */

function SolarTypesEditor({ content: c, onChange }: EditorProps<SolarTypesContent>) {
  const set = (patch: Partial<SolarTypesContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Heading & behaviour" open>
        <EyebrowField value={c.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title: title as TextEl })} />
        <TextElementEditor label="Lead paragraph" multiline value={c.lead} onChange={(lead) => set({ lead: lead as TextEl })} />
        <div className="admin-form-grid">
          <TextInput label="“Best for” label" value={c.bestForLabel} onChange={(bestForLabel) => set({ bestForLabel })} placeholder="Best for" />
          <NumberInput label="Item open at start (0 = first, −1 = none)" value={c.openIndex} min={-1} step={1} placeholder="0" onChange={(openIndex) => set({ openIndex })} />
          <Field label="Illustration">
            <Toggle label="Show “01 / 06” caption under the illustration" checked={c.showCaption !== false} onChange={(showCaption) => set({ showCaption })} />
          </Field>
        </div>
      </Group>
      <Group title="System types" open description="Accordion items; the illustration beside the heading follows the open item">
        <ListEditor<SolarTypeItem>
          label="Types"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Type"
          create={defaultSolarTypeItem}
          itemTitle={(t, i) => `${t.hidden ? '(hidden) ' : ''}${i + 1}. ${t.title}`}
          renderItem={(t, patch) => (
            <>
              <ShowToggle hidden={t.hidden} onChange={(hidden) => patch({ ...t, hidden })} label="Show this type" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={t.title} onChange={(title) => patch({ ...t, title })} />
                <TextInput label="Best for" value={t.bestFor} onChange={(bestFor) => patch({ ...t, bestFor })} />
                <TextArea label="Description" value={t.body} onChange={(body) => patch({ ...t, body })} rows={3} />
                <TextInput label="Button label" value={t.ctaLabel} onChange={(ctaLabel) => patch({ ...t, ctaLabel })} />
                <TextInput label="Button link" value={t.ctaHref} onChange={(ctaHref) => patch({ ...t, ctaHref })} placeholder="/contact#contact-form" />
              </div>
              <StringListEditor label="Chips" items={t.chips || []} onChange={(chips) => patch({ ...t, chips })} />
              <TextArea
                label="Illustration SVG"
                value={t.illustrationSvg}
                rows={5}
                onChange={(illustrationSvg) => patch({ ...t, illustrationSvg })}
                hint="Full <svg> markup shown beside the accordion while this item is open."
              />
            </>
          )}
        />
      </Group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* EPC process                                                         */
/* ------------------------------------------------------------------ */

function SolarProcessEditor({ content: c, onChange }: EditorProps<SolarProcessContent>) {
  const set = (patch: Partial<SolarProcessContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Steps" open>
        <div className="admin-form-grid">
          <TextInput label="Step prefix" value={c.stepPrefix} onChange={(stepPrefix) => set({ stepPrefix })} placeholder="STEP" hint="Shown before the number: STEP 01" />
        </div>
        <ListEditor<SolarProcessStep>
          label="Steps"
          items={c.steps || []}
          onChange={(steps) => set({ steps })}
          addLabel="Step"
          create={defaultSolarProcessStep}
          itemTitle={(s, i) => `${s.hidden ? '(hidden) ' : ''}${i + 1}. ${s.title}`}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this step" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={s.title} onChange={(title) => patch({ ...s, title })} />
                <ColorInput label="Accent color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="#FF6B1A" hint={COLOR_HINT} />
                <TextArea label="Description" value={s.body} onChange={(body) => patch({ ...s, body })} rows={3} />
              </div>
              <SvgIconField value={s.icon} onChange={(icon) => patch({ ...s, icon })} />
            </>
          )}
        />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* O&M performance                                                     */
/* ------------------------------------------------------------------ */

const num = (v: number | undefined, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

function RoiModalFields({ value: m, onChange }: { value: SolarRoiModal; onChange: (next: SolarRoiModal) => void }) {
  const set = (patch: Partial<SolarRoiModal>) => onChange({ ...m, ...patch });
  const a = m.assumptions;
  const setA = (patch: Partial<SolarRoiModal['assumptions']>) => set({ assumptions: { ...a, ...patch } });
  return (
    <>
      <div className="admin-form-grid">
        <TextInput label="Badge" value={m.badge} onChange={(badge) => set({ badge })} />
        <TextInput label="Title" value={m.title} onChange={(title) => set({ title })} />
        <TextArea label="Sub-title" value={m.subtitle} onChange={(subtitle) => set({ subtitle })} rows={2} />
        <TextInput label="Close button label (accessibility)" value={m.closeLabel} onChange={(closeLabel) => set({ closeLabel })} />
        <TextInput label="Currency symbol" value={m.currency} onChange={(currency) => set({ currency })} placeholder="₹" />
        <TextInput label="Calculate button" value={m.calcLabel} onChange={(calcLabel) => set({ calcLabel })} />
        <TextInput label="Error message" value={m.errorText} onChange={(errorText) => set({ errorText })} full />
      </div>
      <div className="admin-form-grid">
        <TextInput label="Bill field label" value={m.billLabel} onChange={(billLabel) => set({ billLabel })} />
        <TextInput label="Bill unit text" value={m.billUnit} onChange={(billUnit) => set({ billUnit })} />
        <NumberInput label="Bill default" value={m.billDefault} min={0} onChange={(billDefault) => set({ billDefault: num(billDefault, 0) })} />
        <NumberInput label="Bill minimum" value={m.billMin} min={0} onChange={(billMin) => set({ billMin })} />
        <NumberInput label="Bill step" value={m.billStep} min={1} onChange={(billStep) => set({ billStep })} />
        <TextInput label="Tariff field label" value={m.tariffLabel} onChange={(tariffLabel) => set({ tariffLabel })} />
        <TextInput label="Tariff unit text" value={m.tariffUnit} onChange={(tariffUnit) => set({ tariffUnit })} />
        <NumberInput label="Tariff default" value={m.tariffDefault} min={0} step={0.1} onChange={(tariffDefault) => set({ tariffDefault: num(tariffDefault, 0) })} />
        <NumberInput label="Tariff minimum" value={m.tariffMin} min={0} step={0.1} onChange={(tariffMin) => set({ tariffMin })} />
        <NumberInput label="Tariff step" value={m.tariffStep} min={0.01} step={0.1} onChange={(tariffStep) => set({ tariffStep })} />
      </div>
      <div className="admin-form-grid">
        <TextInput label="Result: system size label" value={m.kpiSize} onChange={(kpiSize) => set({ kpiSize })} />
        <TextInput label="Result: investment label" value={m.kpiInvestment} onChange={(kpiInvestment) => set({ kpiInvestment })} />
        <TextInput label="Result: payback label" value={m.kpiPayback} onChange={(kpiPayback) => set({ kpiPayback })} />
        <TextInput label="Result: 25-year saving label" value={m.kpiNet} onChange={(kpiNet) => set({ kpiNet })} />
        <TextArea label="Summary sentence" value={m.summaryTemplate} onChange={(summaryTemplate) => set({ summaryTemplate })} rows={3} hint="{year1} = first-year saving, {co2} = tonnes of CO₂ per year" />
        <TextInput label="Proposal button label" value={m.ctaLabel} onChange={(ctaLabel) => set({ ctaLabel })} />
        <TextInput label="Proposal button link" value={m.ctaHref} onChange={(ctaHref) => set({ ctaHref })} placeholder="#contact" />
        <TextArea label="Assumptions note" value={m.assumptionsText} onChange={(assumptionsText) => set({ assumptionsText })} rows={3} />
      </div>
      <p className="az-admin-hint">Calculation assumptions (used for the estimate; the visitor never sees these numbers directly).</p>
      <div className="admin-form-grid">
        <NumberInput label="Share of bill offset (0.8 = 80%)" value={a.offset} min={0} max={1} step={0.05} onChange={(v) => setA({ offset: num(v, 0.8) })} />
        <NumberInput label="Install cost per kW" value={a.costPerKw} min={0} step={500} onChange={(v) => setA({ costPerKw: num(v, 45000) })} />
        <NumberInput label="Yield (kWh per kW per day)" value={a.yieldPerKwDay} min={0} step={0.1} onChange={(v) => setA({ yieldPerKwDay: num(v, 4.2) })} />
        <NumberInput label="Yearly tariff escalation (0.03 = 3%)" value={a.tariffEscalation} min={0} step={0.005} onChange={(v) => setA({ tariffEscalation: num(v, 0.03) })} />
        <NumberInput label="Yearly degradation (0.007 = 0.7%)" value={a.degradation} min={0} step={0.001} onChange={(v) => setA({ degradation: num(v, 0.007) })} />
        <NumberInput label="Yearly O&M (share of capex, 0.01 = 1%)" value={a.omPct} min={0} step={0.001} onChange={(v) => setA({ omPct: num(v, 0.01) })} />
        <NumberInput label="CO₂ factor (kg per kWh)" value={a.co2KgPerKwh} min={0} step={0.01} onChange={(v) => setA({ co2KgPerKwh: num(v, 0.82) })} />
      </div>
    </>
  );
}

function SolarPerformanceEditor({ content: c, onChange }: EditorProps<SolarPerformanceContent>) {
  const set = (patch: Partial<SolarPerformanceContent>) => onChange({ ...c, ...patch });
  const { intro, dashboard: d, roi, services } = c;
  const setIntro = (patch: Partial<SolarPerformanceContent['intro']>) => set({ intro: { ...intro, ...patch } });
  const setD = (patch: Partial<SolarPerformanceContent['dashboard']>) => set({ dashboard: { ...d, ...patch } });
  const setRoi = (patch: Partial<SolarPerformanceContent['roi']>) => set({ roi: { ...roi, ...patch } });
  const setServices = (patch: Partial<SolarPerformanceContent['services']>) => set({ services: { ...services, ...patch } });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />

      <Group title="Intro" open description="Heading, paragraphs and the checklist card">
        <Toggle label="Show the intro" checked={!intro.hidden} onChange={(v) => setIntro({ hidden: !v })} />
        <EyebrowField value={intro.eyebrow} onChange={(eyebrow) => setIntro({ eyebrow })} />
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={intro.title} onChange={(title) => setIntro({ title: title as TextEl })} />
        <StringListEditor label="Paragraphs" items={intro.paragraphs || []} onChange={(paragraphs) => setIntro({ paragraphs })} />
        <div className="admin-form-grid">
          <TextInput label="Card title" value={intro.card?.title} onChange={(title) => setIntro({ card: { ...intro.card, title } })} full />
        </div>
        <StringListEditor label="Card checklist" items={intro.card?.items || []} onChange={(items) => setIntro({ card: { ...intro.card, items } })} />
        <CtaListEditor value={intro.card?.ctas || []} onChange={(ctas) => setIntro({ card: { ...intro.card, ctas } })} />
      </Group>

      <Group title="Dashboard: heading & orbs" description="The dark panel with the monitoring and charts">
        <Toggle label="Show the dashboard" checked={!d.hidden} onChange={(v) => setD({ hidden: !v })} />
        <EyebrowField value={d.eyebrow} onChange={(eyebrow) => setD({ eyebrow })} />
        <TextElementEditor label="Heading" value={d.title} onChange={(title) => setD({ title: title as TextEl })} />
        <TextArea label="Chart footnote" value={d.note} onChange={(note) => setD({ note })} rows={2} />
        <ListEditor<SolarOrb>
          label="Glow orbs"
          items={d.orbs || []}
          onChange={(orbs) => setD({ orbs })}
          addLabel="Orb"
          create={() => ({ tone: 'orange', size: '360px', top: '-120px', right: '-100px', opacity: '0.22' })}
          itemTitle={(o, i) => `${o.hidden ? '(hidden) ' : ''}Orb ${i + 1} (${o.tone})`}
          renderItem={(o, patch) => <OrbFields value={o} onChange={patch} />}
        />
      </Group>

      <Group title="Dashboard: live monitoring card">
        <Toggle label="Show this card" checked={!d.monitor?.hidden} onChange={(v) => setD({ monitor: { ...d.monitor, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="Title" value={d.monitor?.title} onChange={(title) => setD({ monitor: { ...d.monitor, title } })} />
          <TextInput label="Live badge" value={d.monitor?.liveLabel} onChange={(liveLabel) => setD({ monitor: { ...d.monitor, liveLabel } })} placeholder="LIVE" />
          <TextArea label="Area path (420 × 200 canvas)" value={d.monitor?.areaPath} rows={2} onChange={(areaPath) => setD({ monitor: { ...d.monitor, areaPath } })} />
          <TextArea label="Line path (420 × 200 canvas)" value={d.monitor?.linePath} rows={2} onChange={(linePath) => setD({ monitor: { ...d.monitor, linePath } })} />
        </div>
        <ListEditor<{ value: string; label: string }>
          label="Metrics"
          items={d.monitor?.metrics || []}
          onChange={(metrics) => setD({ monitor: { ...d.monitor, metrics } })}
          addLabel="Metric"
          create={() => ({ value: '99%', label: 'Metric' })}
          itemTitle={(m) => `${m.value} ${m.label}`}
          renderItem={(m, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Value" value={m.value} onChange={(value) => patch({ ...m, value })} />
              <TextInput label="Label" value={m.label} onChange={(label) => patch({ ...m, label })} />
            </div>
          )}
        />
      </Group>

      <Group title="Dashboard: output chart" description="Bars compare output without vs with O&M (values 0–100)">
        <Toggle label="Show this chart" checked={!d.output?.hidden} onChange={(v) => setD({ output: { ...d.output, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="Title" value={d.output?.title} onChange={(title) => setD({ output: { ...d.output, title } })} />
          <TextInput label="Sub-title" value={d.output?.sub} onChange={(sub) => setD({ output: { ...d.output, sub } })} />
          <TextInput label="Legend: without" value={d.output?.withoutLabel} onChange={(withoutLabel) => setD({ output: { ...d.output, withoutLabel } })} />
          <TextInput label="Legend: with" value={d.output?.withLabel} onChange={(withLabel) => setD({ output: { ...d.output, withLabel } })} />
          <TextInput label="Gap label (last bar)" value={d.output?.gapLabel} onChange={(gapLabel) => setD({ output: { ...d.output, gapLabel } })} />
        </div>
        <ListEditor<{ label: string; without: number; with: number }>
          label="Bars"
          items={d.output?.bars || []}
          onChange={(bars) => setD({ output: { ...d.output, bars } })}
          addLabel="Bar pair"
          create={() => ({ label: 'Y1', without: 90, with: 98 })}
          itemTitle={(b) => `${b.label}: ${b.without} → ${b.with}`}
          renderItem={(b, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={b.label} onChange={(label) => patch({ ...b, label })} />
              <NumberInput label="Without O&M (0–100)" value={b.without} min={0} max={100} onChange={(v) => patch({ ...b, without: num(v, 0) })} />
              <NumberInput label="With O&M (0–100)" value={b.with} min={0} max={100} onChange={(v) => patch({ ...b, with: num(v, 0) })} />
            </div>
          )}
        />
      </Group>

      <Group title="Dashboard: loss donut" description="Segments are percentages of the whole (aim for a 100 total)">
        <Toggle label="Show this chart" checked={!d.losses?.hidden} onChange={(v) => setD({ losses: { ...d.losses, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="Title" value={d.losses?.title} onChange={(title) => setD({ losses: { ...d.losses, title } })} />
          <TextInput label="Sub-title" value={d.losses?.sub} onChange={(sub) => setD({ losses: { ...d.losses, sub } })} />
        </div>
        <ListEditor<{ label: string; value: number; color: string }>
          label="Segments"
          items={d.losses?.segments || []}
          onChange={(segments) => setD({ losses: { ...d.losses, segments } })}
          addLabel="Segment"
          create={() => ({ label: 'New cause', value: 10, color: '#FF6B1A' })}
          itemTitle={(s) => `${s.label} (${s.value}%)`}
          renderItem={(s, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={s.label} onChange={(label) => patch({ ...s, label })} />
              <NumberInput label="Share (%)" value={s.value} min={0} max={100} onChange={(v) => patch({ ...s, value: num(v, 0) })} />
              <ColorInput label="Color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="#FF6B1A" />
            </div>
          )}
        />
      </Group>

      <Group title="Dashboard: health gauge">
        <Toggle label="Show this chart" checked={!d.health?.hidden} onChange={(v) => setD({ health: { ...d.health, hidden: !v } })} />
        <div className="admin-form-grid">
          <TextInput label="Title" value={d.health?.title} onChange={(title) => setD({ health: { ...d.health, title } })} />
          <TextInput label="Sub-title" value={d.health?.sub} onChange={(sub) => setD({ health: { ...d.health, sub } })} />
          <NumberInput label="Value (0–100)" value={d.health?.value} min={0} max={100} onChange={(v) => setD({ health: { ...d.health, value: num(v, 0) } })} />
          <TextInput label="Gauge label" value={d.health?.label} onChange={(label) => setD({ health: { ...d.health, label } })} />
        </div>
        <ListEditor<{ label: string; color: string }>
          label="Legend"
          items={d.health?.legend || []}
          onChange={(legend) => setD({ health: { ...d.health, legend } })}
          addLabel="Legend item"
          create={() => ({ label: 'Legend', color: '#12B76A' })}
          itemTitle={(l) => l.label}
          renderItem={(l, patch) => (
            <div className="admin-form-grid">
              <TextInput label="Label" value={l.label} onChange={(label) => patch({ ...l, label })} />
              <ColorInput label="Color" value={l.color} onChange={(color) => patch({ ...l, color })} fallback="#12B76A" />
            </div>
          )}
        />
      </Group>

      <Group title="ROI calculator card" description="The dark card beside the dashboard that opens the calculator">
        <Toggle label="Show the ROI card and calculator" checked={!roi.hidden} onChange={(v) => setRoi({ hidden: !v })} />
        <div className="admin-form-grid">
          <TextInput label="Badge" value={roi.badge} onChange={(badge) => setRoi({ badge })} />
          <TextInput label="Title" value={roi.title} onChange={(title) => setRoi({ title })} />
          <TextArea label="Text" value={roi.body} onChange={(body) => setRoi({ body })} rows={3} />
          <TextInput label="Button label" value={roi.buttonLabel} onChange={(buttonLabel) => setRoi({ buttonLabel })} />
        </div>
        <StringListEditor label="Point chips" items={roi.points || []} onChange={(points) => setRoi({ points })} />
        <SvgIconField value={roi.icon} onChange={(icon) => setRoi({ icon })} />
        <OrbFields value={roi.orb} onChange={(orb) => setRoi({ orb })} />
      </Group>

      <Group title="ROI calculator pop-up" description="Texts, defaults and assumptions of the calculator">
        <RoiModalFields value={roi.modal} onChange={(modal) => setRoi({ modal })} />
      </Group>

      <Group title="Service cards" open>
        <Toggle label="Show the service cards" checked={!services.hidden} onChange={(v) => setServices({ hidden: !v })} />
        <EyebrowField value={services.eyebrow} onChange={(eyebrow) => setServices({ eyebrow })} />
        <TextElementEditor label="Heading" value={services.title} onChange={(title) => setServices({ title: title as TextEl })} />
        <ListEditor<SolarService>
          label="Services"
          items={services.items || []}
          onChange={(items) => setServices({ items })}
          addLabel="Service"
          create={defaultSolarService}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.title}`}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this service" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={s.title} onChange={(title) => patch({ ...s, title })} />
                <ColorInput label="Accent color" value={s.color} onChange={(color) => patch({ ...s, color })} fallback="#FF6B1A" hint={COLOR_HINT} />
                <TextArea label="Description" value={s.body} onChange={(body) => patch({ ...s, body })} rows={3} />
              </div>
              <SvgIconField value={s.icon} onChange={(icon) => patch({ ...s, icon })} />
            </>
          )}
        />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Expertise                                                           */
/* ------------------------------------------------------------------ */

function SolarExpertiseEditor({ content: c, onChange }: EditorProps<SolarExpertiseContent>) {
  const set = (patch: Partial<SolarExpertiseContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Background photo">
        <ImageField label="Background image" value={c.bgImage} onChange={(bgImage) => set({ bgImage })} />
      </Group>
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Expertise cards" open>
        <ListEditor<SolarExpertiseCard>
          label="Cards"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Card"
          create={defaultSolarExpertiseCard}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.num} ${card.title}`}
          renderItem={(card, patch) => (
            <>
              <ShowToggle hidden={card.hidden} onChange={(hidden) => patch({ ...card, hidden })} label="Show this card" />
              <div className="admin-form-grid">
                <TextInput label="Number" value={card.num} onChange={(num) => patch({ ...card, num })} placeholder="01" />
                <TextInput label="Title" value={card.title} onChange={(title) => patch({ ...card, title })} />
                <TextArea label="Description" value={card.body} onChange={(body) => patch({ ...card, body })} rows={3} />
              </div>
            </>
          )}
        />
      </Group>
      <Group title="Technology strip" description="Chips along the bottom">
        <StringListEditor label="Chips" items={c.strip || []} onChange={(strip) => set({ strip })} />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Inverters                                                           */
/* ------------------------------------------------------------------ */

function SolarInvertersEditor({ content: c, onChange }: EditorProps<SolarInvertersContent>) {
  const set = (patch: Partial<SolarInvertersContent>) => onChange({ ...c, ...patch });
  const flow = c.flow || { svg: '' };
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Power-flow diagram" description="Animated diagram between the heading and the cards">
        <Toggle label="Show the diagram" checked={!flow.hidden} onChange={(v) => set({ flow: { ...flow, hidden: !v } })} />
        <TextArea label="Diagram SVG" value={flow.svg} rows={8} onChange={(svg) => set({ flow: { ...flow, svg } })} hint="Full <svg> markup." />
      </Group>
      <Group title="Inverter types" open>
        <ListEditor<SolarInverterCard>
          label="Types"
          items={c.cards || []}
          onChange={(cards) => set({ cards })}
          addLabel="Type"
          create={defaultSolarInverterCard}
          itemTitle={(card) => `${card.hidden ? '(hidden) ' : ''}${card.title}`}
          renderItem={(card, patch) => (
            <>
              <ShowToggle hidden={card.hidden} onChange={(hidden) => patch({ ...card, hidden })} label="Show this card" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={card.title} onChange={(title) => patch({ ...card, title })} />
                <ColorInput label="Accent color" value={card.color} onChange={(color) => patch({ ...card, color })} fallback="#3B82F6" hint={COLOR_HINT} />
                <TextArea label="Description" value={card.body} onChange={(body) => patch({ ...card, body })} rows={3} />
                <TextInput label="Best for" value={card.best} onChange={(best) => patch({ ...card, best })} />
              </div>
              <SvgIconField value={card.icon} onChange={(icon) => patch({ ...card, icon })} />
            </>
          )}
        />
      </Group>
      <Group title="Inverter services" open>
        <div className="admin-form-grid">
          <TextInput label="Block title" value={c.servicesTitle} onChange={(servicesTitle) => set({ servicesTitle })} full />
        </div>
        <ListEditor<SolarInverterService>
          label="Services"
          items={c.services || []}
          onChange={(services) => set({ services })}
          addLabel="Service"
          create={() => ({ title: 'New service', body: 'What this service covers.' })}
          itemTitle={(s) => `${s.hidden ? '(hidden) ' : ''}${s.title}`}
          renderItem={(s, patch) => (
            <>
              <ShowToggle hidden={s.hidden} onChange={(hidden) => patch({ ...s, hidden })} label="Show this service" />
              <div className="admin-form-grid">
                <TextInput label="Title" value={s.title} onChange={(title) => patch({ ...s, title })} />
                <TextArea label="Description" value={s.body} onChange={(body) => patch({ ...s, body })} rows={3} />
              </div>
            </>
          )}
        />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Industries / projects marquees                                      */
/* ------------------------------------------------------------------ */

function MarqueeFields({
  duration,
  reverse,
  durationPlaceholder,
  onChange,
}: {
  duration?: number;
  reverse?: boolean;
  durationPlaceholder: string;
  onChange: (patch: { durationSeconds?: number; reverse?: boolean }) => void;
}): ReactNode {
  return (
    <div className="admin-form-grid">
      <NumberInput label="Seconds per loop (higher = slower)" value={duration} min={10} step={5} placeholder={durationPlaceholder} onChange={(durationSeconds) => onChange({ durationSeconds })} />
      <Field label="Direction">
        <Toggle label="Scroll left-to-right (reverse)" checked={Boolean(reverse)} onChange={(r) => onChange({ reverse: r })} />
      </Field>
    </div>
  );
}

function SolarIndustriesEditor({ content: c, onChange }: EditorProps<SolarIndustriesContent>) {
  const set = (patch: Partial<SolarIndustriesContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Industry pills" open description="Scrolling marquee of segments you serve">
        <MarqueeFields duration={c.durationSeconds} reverse={c.reverse} durationPlaceholder="80" onChange={(patch) => set(patch)} />
        <ListEditor<SolarIndustryPill>
          label="Pills"
          items={c.pills || []}
          onChange={(pills) => set({ pills })}
          addLabel="Pill"
          create={() => ({ label: 'New industry' })}
          itemTitle={(p) => `${p.hidden ? '(hidden) ' : ''}${p.label}`}
          renderItem={(p, patch) => (
            <>
              <ShowToggle hidden={p.hidden} onChange={(hidden) => patch({ ...p, hidden })} label="Show this pill" />
              <div className="admin-form-grid">
                <TextInput label="Label" value={p.label} onChange={(label) => patch({ ...p, label })} />
                <Field label="Dot color">
                  <Toggle label="Green dot (residential)" checked={Boolean(p.residential)} onChange={(residential) => patch({ ...p, residential })} />
                </Field>
              </div>
            </>
          )}
        />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

function SolarProjectsEditor({ content: c, onChange }: EditorProps<SolarProjectsContent>) {
  const set = (patch: Partial<SolarProjectsContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Heading" open>
        <HeadFields value={c.head} onChange={(head) => set({ head })} />
      </Group>
      <Group title="Project cards" open description="Scrolling marquee of recent projects">
        <MarqueeFields duration={c.durationSeconds} reverse={c.reverse !== false} durationPlaceholder="70" onChange={(patch) => set(patch)} />
        <ListEditor<SolarProject>
          label="Projects"
          items={c.items || []}
          onChange={(items) => set({ items })}
          addLabel="Project"
          create={defaultSolarProject}
          itemTitle={(p) => `${p.hidden ? '(hidden) ' : ''}${p.title}`}
          renderItem={(p, patch) => (
            <>
              <ShowToggle hidden={p.hidden} onChange={(hidden) => patch({ ...p, hidden })} label="Show this project" />
              <ImageField label="Photo" value={p.image} onChange={(image) => patch({ ...p, image })} />
              <div className="admin-form-grid">
                <TextInput label="Title" value={p.title} onChange={(title) => patch({ ...p, title })} />
                <TextInput label="Tag" value={p.tag} onChange={(tag) => patch({ ...p, tag })} placeholder="Commercial" />
                <TextArea label="Description" value={p.body} onChange={(body) => patch({ ...p, body })} rows={2} />
                <TextInput label="Photo focus" value={p.position} onChange={(position) => patch({ ...p, position })} placeholder="50% 40%" />
                <TextInput label="Link (optional)" value={p.href} onChange={(href) => patch({ ...p, href })} placeholder="/projects/…" />
              </div>
            </>
          )}
        />
      </Group>
      <ButtonsGroup ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Closing CTA band                                                    */
/* ------------------------------------------------------------------ */

function SolarCtaEditor({ content: c, onChange }: EditorProps<SolarCtaContent>) {
  const set = (patch: Partial<SolarCtaContent>) => onChange({ ...c, ...patch });
  return (
    <>
      <BoxGroup value={c.section} onChange={(section) => set({ section })} />
      <Group title="Glow orb">
        <OrbFields value={c.orb} onChange={(orb) => set({ orb })} />
      </Group>
      <Group title="Heading" open>
        <TextElementEditor label="Heading" multiline headingTag siteRole="section" value={c.title} onChange={(title) => set({ title: title as TextEl })} />
      </Group>
      <Group title="Body text">
        <TextElementEditor label="Body" multiline value={c.body} onChange={(body) => set({ body: body as TextEl })} />
      </Group>
      <ButtonsGroup title="Buttons" ctas={c.ctas} onChange={(ctas) => set({ ctas })} />
    </>
  );
}

/* ------------------------------------------------------------------ */

export default createSectionFamilyEditor<SolarSectionType>({
  withDefaults: withSolarDefaults,
  editors: {
    solar_hero: SolarHeroEditor,
    solar_delivery: SolarDeliveryEditor,
    solar_banner: SolarBannerEditor,
    solar_e2e: SolarE2eEditor,
    solar_types: SolarTypesEditor,
    solar_process: SolarProcessEditor,
    solar_performance: SolarPerformanceEditor,
    solar_expertise: SolarExpertiseEditor,
    solar_inverters: SolarInvertersEditor,
    solar_industries: SolarIndustriesEditor,
    solar_projects: SolarProjectsEditor,
    solar_cta: SolarCtaEditor,
  },
});
