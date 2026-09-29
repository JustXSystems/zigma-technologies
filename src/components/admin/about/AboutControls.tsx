'use client';

import { useState, type ReactNode } from 'react';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  ABOUT_ICON_PRESETS,
  FONT_FAMILY_OPTIONS,
  svgMarkup,
  type CtaButton,
  type ElementStyle,
  type EyebrowEl,
  type HeadingTag,
  type IconEl,
  type ImageEl,
  type LinkItem,
  type Orb,
  type PillsEl,
  type SectionBox,
  type SectionHeader,
  type TextEl,
} from '@/lib/about-sections';

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export function Field({
  label,
  children,
  full,
  hint,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  hint?: string;
}) {
  return (
    <div className={`admin-field${full ? ' full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint ? <p className="az-admin-hint">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  full,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
  hint?: string;
}) {
  return (
    <Field label={label} full={full} hint={hint}>
      <input
        className="admin-input"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} full hint={hint}>
      <textarea
        className="admin-textarea"
        rows={rows}
        style={{ minHeight: rows * 22 }}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
  full,
}: {
  label: string;
  value?: T | '';
  options: ReadonlyArray<{ value: T | ''; label: string }>;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <Field label={label} full={full}>
      <select className="admin-select" value={value || ''} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value || 'default'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="az-admin-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Color picker + free text (accepts hex, rgba(), var(), gradients). */
export function ColorInput({
  label,
  value,
  onChange,
  fallback = '#000000',
  hint,
  full,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  fallback?: string;
  hint?: string;
  full?: boolean;
}) {
  const v = value || '';
  return (
    <Field label={label} hint={hint} full={full}>
      <div className="admin-color-field">
        <input
          type="color"
          aria-label={label}
          value={HEX6.test(v) ? v : HEX6.test(fallback) ? fallback : '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="admin-input"
          value={v}
          placeholder={fallback ? `default ${fallback}` : 'default'}
          onChange={(e) => onChange(e.target.value)}
        />
        {v ? (
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => onChange('')}>
            Clear
          </button>
        ) : null}
      </div>
    </Field>
  );
}

export function AlignButtons({
  label = 'Align',
  value,
  onChange,
  options = ['left', 'center', 'right'],
}: {
  label?: string;
  value?: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <Field label={label}>
      <div className="az-admin-seg">
        <button type="button" className={!value ? 'is-on' : ''} onClick={() => onChange('')}>
          Default
        </button>
        {options.map((o) => (
          <button key={o} type="button" className={value === o ? 'is-on' : ''} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </Field>
  );
}

/** Collapsible panel used for nested element groups. */
export function Panel({
  title,
  children,
  defaultOpen = false,
  actions,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`az-admin-panel${open ? ' is-open' : ''}`}>
      <div className="az-admin-panel-head">
        <button type="button" className="az-admin-panel-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="az-admin-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          {title}
        </button>
        {actions ? <div className="az-admin-panel-actions">{actions}</div> : null}
      </div>
      {open ? <div className="az-admin-panel-body">{children}</div> : null}
    </div>
  );
}

const WEIGHTS = [
  { value: '', label: 'Default' },
  { value: '300', label: '300 Light' },
  { value: '400', label: '400 Regular' },
  { value: '500', label: '500 Medium' },
  { value: '600', label: '600 Semi-bold' },
  { value: '700', label: '700 Bold' },
  { value: '800', label: '800 Extra-bold' },
] as const;

const TRANSFORMS = [
  { value: '', label: 'Default' },
  { value: 'none', label: 'None' },
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
] as const;

/** Every typography / box property for one element. Empty = design default. */
export function StyleEditor({
  value,
  onChange,
  title = 'Style',
  allowHide = true,
}: {
  value?: ElementStyle;
  onChange: (next: ElementStyle) => void;
  title?: string;
  allowHide?: boolean;
}) {
  const s = value || {};
  const set = (k: keyof ElementStyle, v: string | boolean) => onChange({ ...s, [k]: v === '' ? undefined : v });
  const count = Object.values(s).filter((v) => v !== undefined && v !== '' && v !== false).length;
  return (
    <Panel title={`${title}${count ? ` · ${count} override${count > 1 ? 's' : ''}` : ''}`}>
      <div className="admin-form-grid">
        {allowHide ? (
          <div className="full">
            <Toggle label="Hide this element" checked={Boolean(s.hidden)} onChange={(v) => set('hidden', v)} />
          </div>
        ) : null}
        <ColorInput label="Text color" value={s.color} onChange={(v) => set('color', v)} />
        <ColorInput
          label="Background"
          value={s.background}
          onChange={(v) => set('background', v)}
          fallback=""
          hint="Color, rgba() or gradient"
        />
        <SelectInput
          label="Font family"
          value={s.fontFamily || ''}
          options={FONT_FAMILY_OPTIONS}
          onChange={(v) => set('fontFamily', v)}
        />
        <TextInput label="Font size" value={s.fontSize} onChange={(v) => set('fontSize', v)} placeholder="e.g. 1.2rem, 18px, clamp(...)" />
        <TextInput
          label="Font size (phone)"
          value={s.fontSizeMobile}
          onChange={(v) => set('fontSizeMobile', v)}
          placeholder="≤760px, e.g. 1.6rem"
        />
        <SelectInput label="Font weight" value={s.fontWeight || ''} options={WEIGHTS} onChange={(v) => set('fontWeight', v)} />
        <SelectInput
          label="Font style"
          value={s.fontStyle || ''}
          options={[
            { value: '', label: 'Default' },
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ]}
          onChange={(v) => set('fontStyle', v)}
        />
        <SelectInput label="Text transform" value={s.textTransform || ''} options={TRANSFORMS} onChange={(v) => set('textTransform', v)} />
        <TextInput label="Letter spacing" value={s.letterSpacing} onChange={(v) => set('letterSpacing', v)} placeholder="e.g. 0.12em" />
        <TextInput label="Line height" value={s.lineHeight} onChange={(v) => set('lineHeight', v)} placeholder="e.g. 1.4" />
        <AlignButtons
          label="Text align"
          value={s.textAlign}
          onChange={(v) => set('textAlign', v)}
          options={['left', 'center', 'right', 'justify']}
        />
        <AlignButtons
          label="Text align (phone)"
          value={s.textAlignMobile}
          onChange={(v) => set('textAlignMobile', v)}
          options={['left', 'center', 'right']}
        />
        <TextInput label="Max width" value={s.maxWidth} onChange={(v) => set('maxWidth', v)} placeholder="e.g. 680px, none" />
        <TextInput label="Opacity" value={s.opacity} onChange={(v) => set('opacity', v)} placeholder="0 – 1" />
        <TextInput label="Margin top" value={s.marginTop} onChange={(v) => set('marginTop', v)} placeholder="e.g. 1rem" />
        <TextInput label="Margin bottom" value={s.marginBottom} onChange={(v) => set('marginBottom', v)} placeholder="e.g. 1rem" />
        <TextInput label="Padding" value={s.padding} onChange={(v) => set('padding', v)} placeholder="e.g. 0.5rem 1rem" />
        <TextInput label="Border" value={s.border} onChange={(v) => set('border', v)} placeholder="e.g. 1px solid #FF6B1A" />
        <TextInput label="Border radius" value={s.borderRadius} onChange={(v) => set('borderRadius', v)} placeholder="e.g. 8px" />
      </div>
      {count ? (
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" style={{ marginTop: '0.6rem' }} onClick={() => onChange({})}>
          Reset style to design default
        </button>
      ) : null}
    </Panel>
  );
}

const HEADING_TAGS: Array<{ value: HeadingTag | ''; label: string }> = [
  { value: '', label: 'Default' },
  { value: 'h1', label: 'H1' },
  { value: 'h2', label: 'H2' },
  { value: 'h3', label: 'H3' },
  { value: 'h4', label: 'H4' },
  { value: 'h5', label: 'H5' },
  { value: 'p', label: 'Paragraph' },
  { value: 'div', label: 'Div' },
];

export function TextElementEditor({
  label,
  value,
  onChange,
  multiline,
  headingTag,
  eyebrow,
  hint,
}: {
  label: string;
  value?: TextEl | EyebrowEl;
  onChange: (next: TextEl & { line?: boolean }) => void;
  multiline?: boolean;
  headingTag?: boolean;
  eyebrow?: boolean;
  hint?: string;
}) {
  const v = (value || { text: '' }) as EyebrowEl;
  return (
    <div className="az-admin-el">
      <div className="admin-form-grid">
        {multiline ? (
          <TextArea label={label} value={v.text} onChange={(text) => onChange({ ...v, text })} hint={hint || 'New line = line break'} />
        ) : (
          <TextInput label={label} value={v.text} onChange={(text) => onChange({ ...v, text })} full={!headingTag && !eyebrow} hint={hint} />
        )}
        {headingTag ? (
          <SelectInput
            label="HTML tag (SEO)"
            value={v.tag || ''}
            options={HEADING_TAGS}
            onChange={(tag) => onChange({ ...v, tag: (tag || undefined) as HeadingTag | undefined })}
          />
        ) : null}
        {eyebrow ? (
          <Field label="Accent line">
            <Toggle label="Show line before label" checked={v.line !== false} onChange={(line) => onChange({ ...v, line })} />
          </Field>
        ) : null}
      </div>
      <StyleEditor value={v.style} onChange={(style) => onChange({ ...v, style })} title={`${label} style`} />
    </div>
  );
}

/** Generic reorderable list wrapper. */
export function ListEditor<T>({
  label,
  items,
  onChange,
  create,
  renderItem,
  itemTitle,
  addLabel = 'Add',
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  create: () => T;
  renderItem: (item: T, patch: (next: T) => void, index: number) => ReactNode;
  itemTitle: (item: T, index: number) => string;
  addLabel?: string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="az-admin-list">
      <div className="az-admin-list-head">
        <strong>{label}</strong>
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => onChange([...items, create()])}>
          + {addLabel}
        </button>
      </div>
      {items.length === 0 ? <p className="az-admin-hint">Nothing here yet.</p> : null}
      {items.map((item, i) => (
        <Panel
          key={i}
          title={`#${i + 1} · ${itemTitle(item, i) || 'Untitled'}`}
          actions={
            <>
              <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary az-admin-mini"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary az-admin-mini"
                onClick={() => onChange([...items.slice(0, i + 1), structuredClone(item), ...items.slice(i + 1)])}
              >
                Copy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger az-admin-mini"
                onClick={() => onChange(items.filter((_, k) => k !== i))}
              >
                ✕
              </button>
            </>
          }
        >
          {renderItem(item, (next) => onChange(items.map((it, k) => (k === i ? next : it))), i)}
        </Panel>
      ))}
    </div>
  );
}

/** Quick list of label (+ optional link) rows, with bulk paste. */
export function LinkListEditor({
  label,
  items,
  onChange,
  withHref = true,
}: {
  label: string;
  items: LinkItem[];
  onChange: (next: LinkItem[]) => void;
  withHref?: boolean;
}) {
  const [bulk, setBulk] = useState(false);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="az-admin-list">
      <div className="az-admin-list-head">
        <strong>{label}</strong>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setBulk(!bulk)}>
            {bulk ? 'Row editor' : 'Bulk edit'}
          </button>
          {!bulk ? (
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => onChange([...items, { label: 'New item' }])}>
              + Add
            </button>
          ) : null}
        </div>
      </div>
      {bulk ? (
        <textarea
          className="admin-textarea"
          style={{ minHeight: 160, width: '100%' }}
          value={items.map((it) => (it.href ? `${it.label} | ${it.href}` : it.label)).join('\n')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [l, h] = line.split('|').map((p) => p.trim());
                  return h ? { label: l, href: h } : { label: l };
                })
            )
          }
        />
      ) : (
        items.map((item, i) => (
          <div className="az-admin-row" key={i}>
            <input
              className="admin-input"
              value={item.label}
              placeholder="Label"
              onChange={(e) => onChange(items.map((it, k) => (k === i ? { ...it, label: e.target.value } : it)))}
            />
            {withHref ? (
              <input
                className="admin-input"
                value={item.href || ''}
                placeholder="Link (optional)"
                onChange={(e) =>
                  onChange(items.map((it, k) => (k === i ? { ...it, href: e.target.value || undefined } : it)))
                }
              />
            ) : null}
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary az-admin-mini"
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button type="button" className="admin-btn admin-btn-danger az-admin-mini" onClick={() => onChange(items.filter((_, k) => k !== i))}>
              ✕
            </button>
          </div>
        ))
      )}
      {bulk ? <p className="az-admin-hint">One per line. Optional link: Label | /path</p> : null}
    </div>
  );
}

export function PillsEditor({ value, onChange, label = 'Pills' }: { value: PillsEl; onChange: (next: PillsEl) => void; label?: string }) {
  const p = value || { items: [] };
  const set = (patch: Partial<PillsEl>) => onChange({ ...p, ...patch });
  return (
    <div>
      <div style={{ marginBottom: '0.6rem', display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
        <Toggle label={`Show ${label.toLowerCase()}`} checked={!p.hidden} onChange={(v) => set({ hidden: !v })} />
        <Toggle label="Keep on one line" checked={Boolean(p.nowrap)} onChange={(v) => set({ nowrap: v })} />
      </div>
      <LinkListEditor label={label} items={p.items || []} onChange={(items) => set({ items })} />
      <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
        <SelectInput
          label="Position (row alignment)"
          value={p.justify || ''}
          options={[
            { value: '', label: 'Default (left)' },
            { value: 'flex-start', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'flex-end', label: 'Right' },
          ]}
          onChange={(v) => set({ justify: (v || undefined) as PillsEl['justify'] })}
        />
        <TextInput label="Gap between pills" value={p.gap} onChange={(v) => set({ gap: v })} placeholder="0.7rem" />
        <TextInput label="Space above row" value={p.marginTop} onChange={(v) => set({ marginTop: v })} placeholder="2.2rem" />
        <ColorInput label="Hover text color" value={p.hoverColor} onChange={(v) => set({ hoverColor: v })} fallback="#FF6B1A" />
        <ColorInput label="Hover background" value={p.hoverBackground} onChange={(v) => set({ hoverBackground: v })} fallback="" />
        <ColorInput label="Hover border color" value={p.hoverBorderColor} onChange={(v) => set({ hoverBorderColor: v })} fallback="" />
      </div>
      <StyleEditor
        title="Pill style (color, background, border, font, radius…)"
        value={p.style}
        onChange={(style) => set({ style })}
        allowHide={false}
      />
    </div>
  );
}

export function CtaListEditor({ value, onChange }: { value: CtaButton[]; onChange: (next: CtaButton[]) => void }) {
  return (
    <ListEditor<CtaButton>
      label="Buttons"
      items={value || []}
      onChange={onChange}
      addLabel="Button"
      create={() => ({ label: 'Send an Inquiry →', href: '/contact', variant: 'primary' })}
      itemTitle={(b) => b.label}
      renderItem={(b, patch) => (
        <>
          <div className="admin-form-grid">
            <TextInput label="Label" value={b.label} onChange={(label) => patch({ ...b, label })} />
            <TextInput label="Link" value={b.href} onChange={(href) => patch({ ...b, href })} placeholder="/contact or tel:+91…" />
            <SelectInput
              label="Variant"
              value={b.variant || 'primary'}
              options={[
                { value: 'primary', label: 'Primary (orange)' },
                { value: 'ghost', label: 'Ghost (light outline)' },
                { value: 'ghost-dark', label: 'Ghost dark (dark outline)' },
              ]}
              onChange={(variant) => patch({ ...b, variant: variant as CtaButton['variant'] })}
            />
          </div>
          <StyleEditor title="Button style" value={b.style} onChange={(style) => patch({ ...b, style })} allowHide={false} />
        </>
      )}
    />
  );
}

export function ImageEditor({ value, onChange, label = 'Image' }: { value: ImageEl; onChange: (next: ImageEl) => void; label?: string }) {
  const img = value || { src: '' };
  const set = (patch: Partial<ImageEl>) => onChange({ ...img, ...patch });
  return (
    <div>
      <div style={{ marginBottom: '0.6rem' }}>
        <Toggle label={`Show ${label.toLowerCase()}`} checked={!img.hidden} onChange={(v) => set({ hidden: !v })} />
      </div>
      <MediaPicker label={label} value={img.src || ''} onChange={(src) => set({ src })} kinds={['image', 'svg']} allowUpload />
      <div className="admin-form-grid" style={{ marginTop: '0.6rem' }}>
        <TextInput label="Alt text" value={img.alt} onChange={(alt) => set({ alt })} full />
        <SelectInput
          label="Fit"
          value={img.fit || ''}
          options={[
            { value: '', label: 'Default (cover)' },
            { value: 'cover', label: 'Cover (crop to fill)' },
            { value: 'contain', label: 'Contain (show whole)' },
            { value: 'fill', label: 'Stretch' },
            { value: 'none', label: 'Original size' },
          ]}
          onChange={(fit) => set({ fit: (fit || undefined) as ImageEl['fit'] })}
        />
        <TextInput label="Focus position" value={img.position} onChange={(position) => set({ position })} placeholder="center, center top, 50% 30%" />
        <TextInput label="Corner radius" value={img.radius} onChange={(radius) => set({ radius })} placeholder="e.g. 16px" />
        <TextInput label="Aspect ratio" value={img.aspectRatio} onChange={(aspectRatio) => set({ aspectRatio })} placeholder="e.g. 4/5, 16/9, auto" />
        <TextInput label="Min height" value={img.minHeight} onChange={(minHeight) => set({ minHeight })} placeholder="e.g. 420px" />
        <TextInput label="Width" value={img.width} onChange={(width) => set({ width })} placeholder="e.g. 100%, 260px" />
        <TextInput label="Max width" value={img.maxWidth} onChange={(maxWidth) => set({ maxWidth })} />
        <TextInput label="Border" value={img.border} onChange={(border) => set({ border })} placeholder="1px solid rgba(255,255,255,0.12)" />
        <TextInput label="Shadow" value={img.shadow} onChange={(shadow) => set({ shadow })} placeholder="0 30px 60px -25px rgba(0,0,0,0.3)" />
        <ColorInput label="Frame background" value={img.background} onChange={(background) => set({ background })} fallback="" />
        <TextInput
          label="Overlay gradient"
          value={img.overlay}
          onChange={(overlay) => set({ overlay })}
          placeholder="linear-gradient(180deg, transparent 40%, rgba(10,22,40,0.55))"
          full
        />
      </div>
    </div>
  );
}

export function IconEditor({ value, onChange, label = 'Icon' }: { value: IconEl; onChange: (next: IconEl) => void; label?: string }) {
  const icon = value || {};
  const set = (patch: Partial<IconEl>) => onChange({ ...icon, ...patch });
  const preview = svgMarkup(icon.svg);
  const presetKey = ABOUT_ICON_PRESETS.find((p) => p.svg === (icon.svg || '').trim())?.key || '';
  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        <div
          className="az-admin-icon-preview"
          style={{ color: icon.color || '#FF6B1A', background: icon.background || undefined }}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        <Toggle label={`Show ${label.toLowerCase()}`} checked={!icon.hidden} onChange={(v) => set({ hidden: !v })} />
      </div>
      <div className="admin-form-grid">
        <SelectInput
          label="Preset icon"
          value={presetKey}
          options={[{ value: '', label: presetKey ? 'Custom' : 'Custom SVG…' }, ...ABOUT_ICON_PRESETS.map((p) => ({ value: p.key, label: p.label }))]}
          onChange={(key) => {
            const preset = ABOUT_ICON_PRESETS.find((p) => p.key === key);
            if (preset) set({ svg: preset.svg });
          }}
        />
        <SelectInput
          label="Drawing mode"
          value={icon.mode || ''}
          options={[
            { value: '', label: 'Outline (stroke)' },
            { value: 'fill', label: 'Solid (fill)' },
          ]}
          onChange={(mode) => set({ mode: (mode || undefined) as IconEl['mode'] })}
        />
        <TextArea
          label="SVG markup"
          rows={3}
          value={icon.svg}
          onChange={(svg) => set({ svg })}
          placeholder='<svg viewBox="0 0 24 24">…</svg> or inner <path d="…"/>'
          hint="Paste a full <svg> or just shapes for a 24×24 box. Leave empty to use an uploaded file below."
        />
        <div className="full">
          <MediaPicker label="…or SVG / image file" value={icon.src || ''} onChange={(src) => set({ src })} kinds={['svg', 'image']} allowUpload compact />
        </div>
        <ColorInput label="Icon color" value={icon.color} onChange={(color) => set({ color })} />
        <ColorInput label="Icon background" value={icon.background} onChange={(background) => set({ background })} fallback="" />
        <TextInput label="Icon size" value={icon.size} onChange={(size) => set({ size })} placeholder="e.g. 28px" />
        <TextInput label="Box size" value={icon.boxSize} onChange={(boxSize) => set({ boxSize })} placeholder="e.g. 58px" />
        <TextInput label="Box radius" value={icon.radius} onChange={(radius) => set({ radius })} placeholder="e.g. 14px, 50%" />
        <TextInput label="Stroke width" value={icon.strokeWidth} onChange={(strokeWidth) => set({ strokeWidth })} placeholder="e.g. 1.6" />
        <TextInput label="Box border" value={icon.border} onChange={(border) => set({ border })} placeholder="1px solid …" full />
      </div>
    </div>
  );
}

export function SectionBoxEditor({ value, onChange }: { value: SectionBox; onChange: (next: SectionBox) => void }) {
  const b = value || {};
  const set = (patch: Partial<SectionBox>) => onChange({ ...b, ...patch });
  return (
    <div>
      <div className="admin-form-grid">
        <SelectInput
          label="Tone (muted text defaults)"
          value={b.tone || ''}
          options={[
            { value: '', label: 'Default' },
            { value: 'light', label: 'Light background' },
            { value: 'dark', label: 'Dark background' },
          ]}
          onChange={(tone) => set({ tone: (tone || undefined) as SectionBox['tone'] })}
        />
        <ColorInput label="Background color" value={b.bgColor} onChange={(bgColor) => set({ bgColor })} />
        <ColorInput label="Default text color" value={b.textColor} onChange={(textColor) => set({ textColor })} />
        <TextInput label="Container max width" value={b.containerMaxWidth} onChange={(containerMaxWidth) => set({ containerMaxWidth })} placeholder="1600px" />
        <TextArea
          label="Gradient overlay (above image)"
          rows={2}
          value={b.bgGradient}
          onChange={(bgGradient) => set({ bgGradient })}
          placeholder="linear-gradient(90deg, rgba(10,22,40,0.94), rgba(10,22,40,0.15))"
          hint="Comma-separate multiple gradients."
        />
        <div className="full">
          <MediaPicker label="Background image" value={b.bgImage || ''} onChange={(bgImage) => set({ bgImage })} kinds={['image', 'svg']} allowUpload />
        </div>
        <TextInput label="Image position" value={b.bgPosition} onChange={(bgPosition) => set({ bgPosition })} placeholder="center 30%" />
        <SelectInput
          label="Image size"
          value={b.bgSize || ''}
          options={[
            { value: '', label: 'Default (cover)' },
            { value: 'cover', label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: 'auto', label: 'Original' },
          ]}
          onChange={(bgSize) => set({ bgSize })}
        />
        <SelectInput
          label="Image repeat"
          value={b.bgRepeat || ''}
          options={[
            { value: '', label: 'Default (no-repeat)' },
            { value: 'no-repeat', label: 'No repeat' },
            { value: 'repeat', label: 'Repeat' },
            { value: 'repeat-x', label: 'Repeat X' },
            { value: 'repeat-y', label: 'Repeat Y' },
          ]}
          onChange={(bgRepeat) => set({ bgRepeat })}
        />
        <TextInput label="Padding top" value={b.paddingTop} onChange={(paddingTop) => set({ paddingTop })} placeholder="design default" />
        <TextInput label="Padding bottom" value={b.paddingBottom} onChange={(paddingBottom) => set({ paddingBottom })} placeholder="design default" />
        <TextInput
          label="Padding top (phone)"
          value={b.paddingTopMobile}
          onChange={(paddingTopMobile) => set({ paddingTopMobile })}
          placeholder="≤760px design default"
        />
        <TextInput
          label="Padding bottom (phone)"
          value={b.paddingBottomMobile}
          onChange={(paddingBottomMobile) => set({ paddingBottomMobile })}
          placeholder="≤760px design default"
        />
        <TextInput
          label="Image position (phone)"
          value={b.bgPositionMobile}
          onChange={(bgPositionMobile) => set({ bgPositionMobile })}
          placeholder="e.g. 70% center"
        />
        <TextInput label="Border top" value={b.borderTop} onChange={(borderTop) => set({ borderTop })} placeholder="1px solid rgba(255,255,255,0.06)" />
        <TextInput label="Border bottom" value={b.borderBottom} onChange={(borderBottom) => set({ borderBottom })} />
        <SelectInput
          label="Grid pattern"
          value={b.pattern || ''}
          options={[
            { value: '', label: 'None' },
            { value: 'grid', label: 'Grid lines' },
            { value: 'grid-fade', label: 'Grid lines (faded top-left)' },
          ]}
          onChange={(pattern) => set({ pattern: (pattern || undefined) as SectionBox['pattern'] })}
        />
        <ColorInput label="Pattern line color" value={b.patternColor} onChange={(patternColor) => set({ patternColor })} fallback="" />
        <TextInput label="Pattern cell size" value={b.patternSize} onChange={(patternSize) => set({ patternSize })} placeholder="64px" />
      </div>
      <div style={{ marginTop: '0.8rem' }}>
        <ListEditor<Orb>
          label="Glow orbs"
          items={b.orbs || []}
          onChange={(orbs) => set({ orbs })}
          addLabel="Orb"
          create={() => ({ color: '#FF6B1A', size: '400px', top: '-160px', right: '-100px', opacity: '0.22' })}
          itemTitle={(o) => `${o.color} · ${o.size}`}
          renderItem={(o, patch) => (
            <div className="admin-form-grid">
              <ColorInput label="Color" value={o.color} onChange={(color) => patch({ ...o, color })} />
              <TextInput label="Size" value={o.size} onChange={(size) => patch({ ...o, size })} placeholder="400px" />
              <TextInput label="Top" value={o.top} onChange={(top) => patch({ ...o, top })} placeholder="-160px" />
              <TextInput label="Right" value={o.right} onChange={(right) => patch({ ...o, right })} />
              <TextInput label="Bottom" value={o.bottom} onChange={(bottom) => patch({ ...o, bottom })} />
              <TextInput label="Left" value={o.left} onChange={(left) => patch({ ...o, left })} placeholder="8%" />
              <TextInput label="Opacity" value={o.opacity} onChange={(opacity) => patch({ ...o, opacity })} placeholder="0.28" />
              <TextInput label="Blur" value={o.blur} onChange={(blur) => patch({ ...o, blur })} placeholder="90px" />
            </div>
          )}
        />
      </div>
    </div>
  );
}

export function SectionHeaderEditor({ value, onChange }: { value: SectionHeader; onChange: (next: SectionHeader) => void }) {
  const h = value || { eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } };
  const set = (patch: Partial<SectionHeader>) => onChange({ ...h, ...patch });
  return (
    <div>
      <div style={{ marginBottom: '0.6rem' }}>
        <Toggle label="Show section header" checked={!h.hidden} onChange={(v) => set({ hidden: !v })} />
      </div>
      <div className="admin-form-grid">
        <AlignButtons label="Header position" value={h.align} onChange={(align) => set({ align: (align || undefined) as SectionHeader['align'] })} />
        <TextInput label="Header max width" value={h.maxWidth} onChange={(maxWidth) => set({ maxWidth })} placeholder="680px" />
        <TextInput label="Space below header" value={h.marginBottom} onChange={(marginBottom) => set({ marginBottom })} placeholder="4rem" />
      </div>
      <TextElementEditor label="Eyebrow" eyebrow value={h.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
      <TextElementEditor label="Heading" headingTag value={h.title} onChange={(title) => set({ title })} />
      <TextElementEditor label="Subtitle" multiline value={h.subtitle} onChange={(subtitle) => set({ subtitle })} />
    </div>
  );
}
