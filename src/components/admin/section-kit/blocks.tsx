'use client';

import type { ReactNode } from 'react';
import type { SectionBox, SplitLayout, TextEl } from '@/lib/about-sections';
import type { LegacyBgMedia, LegacyBgMotion, LegacyCardStyle, LegacySectionHeader } from '@/lib/legacy-sections';
import {
  AlignButtons,
  ColorInput,
  Field,
  ListEditor,
  NumberInput,
  SectionHeaderEditor,
  SectionBoxEditor,
  SelectInput,
  TextArea,
  TextElementEditor,
  TextInput,
  Toggle,
} from './controls';
import { Group } from './groups';
import { MediaItemsEditor } from './media';

/** Props of one section type's editor: its full content object and a setter. */
export type EditorProps<T> = { content: T; onChange: (next: T) => void };

export const VALIGN_OPTIONS = [
  { value: '', label: 'Default (center)' },
  { value: 'start', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'Bottom' },
] as const;

export const BG_MOTION_OPTIONS: Array<{ value: LegacyBgMotion; label: string }> = [
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

/** Background images / videos with slideshow + motion (heroes, CTA bands, …). */
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
        <SelectInput label="Motion" value={bg.motion || 'none'} options={BG_MOTION_OPTIONS} onChange={(motion) => set({ motion })} />
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

/** Section header with gradient highlight plus the animated accent bar under the heading. */
export function AccentHeaderEditor({ value, onChange }: { value: LegacySectionHeader; onChange: (next: LegacySectionHeader) => void }) {
  const h = value || { eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } };
  const bar = h.bar || {};
  const setBar = (patch: Partial<NonNullable<LegacySectionHeader['bar']>>) => onChange({ ...h, bar: { ...bar, ...patch } });
  return (
    <>
      <SectionHeaderEditor value={h} onChange={onChange} highlight />
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

/** Card box look: background, hover, border, radius, padding, shadow (+ extra fields as children). */
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
      renderItem={(p, patch) => <TextElementEditor label="Paragraph" multiline value={p} onChange={patch} />}
    />
  );
}

/** Two-column text + media layout: which side the media sits, alignment, widths and stacking order. */
export function SplitLayoutEditor({
  value,
  onChange,
  sideLabel = 'Image position',
  defaultSide = 'right',
  columnsPlaceholder,
  gapPlaceholder = '3.2rem',
  media = 'image',
  mediaFirstByDefault = false,
  children,
}: {
  value: SplitLayout;
  onChange: (next: SplitLayout) => void;
  sideLabel?: string;
  defaultSide?: SplitLayout['imageSide'];
  columnsPlaceholder: string;
  gapPlaceholder?: string;
  /** Word used for the visual column in labels. */
  media?: 'image' | 'media';
  /** Whether an unset `mobileImageFirst` means media-first on the public page. */
  mediaFirstByDefault?: boolean;
  children?: ReactNode;
}) {
  const l = value || { imageSide: defaultSide };
  const set = (patch: Partial<SplitLayout>) => onChange({ ...l, ...patch });
  return (
    <div className="admin-form-grid">
      <AlignButtons
        label={sideLabel}
        value={l.imageSide}
        options={['left', 'right']}
        onChange={(v) => set({ imageSide: (v || defaultSide) as SplitLayout['imageSide'] })}
      />
      <SelectInput
        label="Vertical alignment"
        value={l.alignItems || ''}
        options={[...VALIGN_OPTIONS, { value: 'stretch', label: 'Stretch' }]}
        onChange={(v) => set({ alignItems: (v || undefined) as SplitLayout['alignItems'] })}
      />
      <TextInput
        label="Column widths"
        value={l.columns}
        onChange={(columns) => set({ columns })}
        placeholder={columnsPlaceholder}
        hint="CSS grid columns in on-screen order. Columns stack on tablet / phone. Empty = design default."
      />
      <TextInput label="Column gap" value={l.gap} onChange={(gap) => set({ gap })} placeholder={gapPlaceholder} />
      <Field label="Tablet / phone">
        <Toggle
          label={`Show the ${media} above the text when stacked`}
          checked={mediaFirstByDefault ? l.mobileImageFirst !== false : Boolean(l.mobileImageFirst)}
          onChange={(mobileImageFirst) => set({ mobileImageFirst })}
        />
      </Field>
      {children}
    </div>
  );
}
