'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import MediaPicker from '@/components/admin/MediaPicker';
import {
  ColorInput,
  Field,
  ListEditor,
  Panel,
  SectionHeaderEditor,
  SelectInput,
  TextInput,
  Toggle,
} from '@/components/admin/about/AboutControls';
import { isImageMediaPath, isVideoMediaPath, publicMediaUrl, toStorageMediaPath } from '@/lib/media-url';
import { MEDIA_UPLOAD_ACCEPT, validateMediaUploadFile } from '@/lib/media-upload-rules';
import {
  lifeMediaKind,
  type LifeColumns,
  type LifeHighlight,
  type LifeMediaItem,
  type LifeSectionHeader,
} from '@/lib/life-sections';

/* ------------------------------------------------------------------ */
/* Collapsible groups with Expand all / Collapse all                   */
/* ------------------------------------------------------------------ */

type GroupState = { all: boolean | null; overrides: Record<string, boolean> };

const LifeGroupContext = createContext<{
  state: GroupState;
  setOpen: (title: string, open: boolean) => void;
} | null>(null);

/** Owns open/closed state for every LifeGroup below it (titles must be unique per editor). */
export function LifeGroupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GroupState>({ all: null, overrides: {} });
  const setOpen = (title: string, open: boolean) =>
    setState((s) => ({ ...s, overrides: { ...s.overrides, [title]: open } }));
  return (
    <LifeGroupContext.Provider value={{ state, setOpen }}>
      <div className="lz-admin-toolbar">
        <span className="az-admin-hint" style={{ margin: 0 }}>
          Every field is optional: empty = design default / Site Settings value.
        </span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary az-admin-mini"
            onClick={() => setState({ all: true, overrides: {} })}
          >
            Expand all
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary az-admin-mini"
            onClick={() => setState({ all: false, overrides: {} })}
          >
            Collapse all
          </button>
        </div>
      </div>
      {children}
    </LifeGroupContext.Provider>
  );
}

export function LifeGroup({
  title,
  description,
  open: defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  open?: boolean;
  children: ReactNode;
}) {
  const ctx = useContext(LifeGroupContext);
  const open = ctx ? (ctx.state.overrides[title] ?? ctx.state.all ?? defaultOpen) : undefined;
  return (
    <AdminCollapsible
      title={title}
      description={description}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={ctx ? (next) => ctx.setOpen(title, next) : undefined}
      className="az-admin-group"
    >
      {children}
    </AdminCollapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Small inputs                                                        */
/* ------------------------------------------------------------------ */

export function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        className="admin-input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          const n = Number(raw);
          onChange(raw === '' || !Number.isFinite(n) ? undefined : n);
        }}
      />
    </Field>
  );
}

export function ColumnsEditor({
  label = 'Columns',
  value,
  onChange,
  defaults,
}: {
  label?: string;
  value?: LifeColumns;
  onChange: (next: LifeColumns) => void;
  defaults: Required<LifeColumns>;
}) {
  const v = value || {};
  const set = (patch: Partial<LifeColumns>) => onChange({ ...v, ...patch });
  return (
    <>
      <NumberInput
        label={`${label} · desktop`}
        value={v.desktop}
        min={1}
        max={8}
        placeholder={String(defaults.desktop)}
        onChange={(desktop) => set({ desktop })}
      />
      <NumberInput
        label={`${label} · tablet (≤1000px)`}
        value={v.tablet}
        min={1}
        max={8}
        placeholder={String(defaults.tablet)}
        onChange={(tablet) => set({ tablet })}
      />
      <NumberInput
        label={`${label} · phone (≤640px)`}
        value={v.mobile}
        min={1}
        max={4}
        placeholder={String(defaults.mobile)}
        onChange={(mobile) => set({ mobile })}
      />
    </>
  );
}

export function HighlightEditor({
  value,
  onChange,
  title = 'Heading highlight (gradient word)',
}: {
  value?: LifeHighlight;
  onChange: (next: LifeHighlight) => void;
  title?: string;
}) {
  const h = value || {};
  const set = (patch: Partial<LifeHighlight>) => onChange({ ...h, ...patch });
  return (
    <Panel title={`${title}${h.text?.trim() ? ` · “${h.text.trim()}”` : ''}`}>
      <div className="admin-form-grid">
        <TextInput
          label="Word / phrase to highlight"
          value={h.text}
          onChange={(text) => set({ text })}
          placeholder="e.g. beyond"
          hint="Must appear in the heading text exactly (case-sensitive). Empty = no highlight."
        />
        <Field label="Animation">
          <Toggle label="Animate gradient" checked={h.animate !== false} onChange={(animate) => set({ animate })} />
        </Field>
        <TextInput
          label="Gradient"
          value={h.gradient}
          onChange={(gradient) => set({ gradient })}
          placeholder="linear-gradient(90deg, var(--orange), var(--yellow), var(--cyan), var(--orange))"
          full
        />
        <ColorInput
          label="…or solid color"
          value={h.color}
          onChange={(color) => set({ color })}
          fallback=""
          hint="A solid color replaces the gradient."
        />
      </div>
    </Panel>
  );
}

export function LifeHeaderEditor({ value, onChange }: { value: LifeSectionHeader; onChange: (next: LifeSectionHeader) => void }) {
  const h = value || { eyebrow: { text: '' }, title: { text: '' }, subtitle: { text: '' } };
  return (
    <>
      <SectionHeaderEditor value={h} onChange={(next) => onChange({ ...h, ...next })} />
      <HighlightEditor value={h.highlight} onChange={(highlight) => onChange({ ...h, highlight })} />
    </>
  );
}

export function NapHint() {
  return (
    <p className="az-admin-hint">
      Company details come from Site Settings: use <code>{'{{emergencyPhone}}'}</code>, <code>{'{{phone}}'}</code>,{' '}
      <code>{'{{email}}'}</code> or <code>{'{{companyName}}'}</code> in labels, and <code>{'tel:{{emergencyPhone}}'}</code> /{' '}
      <code>{'mailto:{{email}}'}</code> in links. Typing a literal value overrides the site setting.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Media: many images / videos per section                             */
/* ------------------------------------------------------------------ */

type Asset = { id: number | null; path: string; mime: string | null; alt: string | null };

function mediaAllowed(path: string, mime: string | null, allowVideo: boolean) {
  if (allowVideo && isVideoMediaPath(path, mime)) return true;
  return isImageMediaPath(path, mime) || mime === 'image/svg+xml' || /\.svg(\?|$)/i.test(path);
}

function titleFromPath(path: string) {
  const file = path.split(/[/?#]/).filter(Boolean).pop() || '';
  return decodeURIComponent(file.replace(/\.[a-z0-9]+$/i, ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function LibraryModal({
  allowVideo,
  onPick,
  onClose,
}: {
  allowVideo: boolean;
  onPick: (paths: string[]) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/media')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Failed to load media');
        if (!cancelled) setAssets(data.assets || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load media');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const list = assets
    .map((a) => ({ ...a, storage: toStorageMediaPath(a.path) || a.path }))
    .filter((a) => mediaAllowed(a.storage, a.mime, allowVideo));
  const toggle = (p: string) => setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ width: 'min(920px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
          <h2 style={{ margin: 0 }}>Add from media library</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setPicked(picked.length === list.length ? [] : list.map((a) => a.storage))}
              disabled={!list.length}
            >
              {picked.length === list.length && list.length ? 'Select none' : 'Select all'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={!picked.length}
              onClick={() => {
                onPick(picked);
                onClose();
              }}
            >
              Add {picked.length || ''} selected
            </button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <p className="admin-hint" style={{ marginTop: 0 }}>
          Tick as many files as you like; they are added in the order you select them.
        </p>
        {error ? <div className="admin-error">{error}</div> : null}
        {loading ? <p style={{ color: 'var(--admin-muted)' }}>Loading…</p> : null}
        {!loading && !list.length ? <p className="admin-empty">No matching files in the media library yet.</p> : null}
        <div className="lz-admin-lib-grid">
          {list.map((a) => {
            const at = picked.indexOf(a.storage);
            const video = isVideoMediaPath(a.storage, a.mime);
            return (
              <button
                key={a.id ?? a.storage}
                type="button"
                className={`lz-admin-lib-item${at >= 0 ? ' is-on' : ''}`}
                onClick={() => toggle(a.storage)}
                aria-pressed={at >= 0}
              >
                {video ? (
                  <span className="lz-admin-thumb-video">VIDEO</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(a.storage)} alt={a.alt || ''} loading="lazy" />
                )}
                {at >= 0 ? <span className="lz-admin-lib-badge">{at + 1}</span> : null}
                <code>{a.storage}</code>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Bulk add: multi-file upload, media-library multi-select, or pasted URLs. */
function MediaBulkAdd({ allowVideo, onAdd }: { allowVideo: boolean; onAdd: (paths: string[]) => void }) {
  const [library, setLibrary] = useState(false);
  const [paste, setPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function upload(files: File[]) {
    setError('');
    const done: string[] = [];
    const problems: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBusy(`Uploading ${i + 1} / ${files.length}…`);
      const invalid = validateMediaUploadFile(file);
      if (invalid) {
        problems.push(`${file.name}: ${invalid.message}`);
        continue;
      }
      if (!mediaAllowed(file.name, file.type, allowVideo)) {
        problems.push(`${file.name}: file type not allowed here`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        done.push(toStorageMediaPath(String(data.path || '')));
      } catch (e) {
        problems.push(`${file.name}: ${e instanceof Error ? e.message : 'Upload failed'}`);
      }
    }
    setBusy('');
    if (done.length) onAdd(done.filter(Boolean));
    if (problems.length) setError(problems.join(' · '));
  }

  return (
    <div className="lz-admin-bulk">
      <div className="lz-admin-bulk-actions">
        <label className="admin-btn admin-btn-secondary az-admin-mini" style={{ cursor: busy ? 'wait' : 'pointer' }}>
          {busy || `Upload ${allowVideo ? 'images / videos' : 'images'}`}
          <input
            type="file"
            multiple
            accept={MEDIA_UPLOAD_ACCEPT}
            hidden
            disabled={Boolean(busy)}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length) void upload(files);
            }}
          />
        </label>
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setLibrary(true)}>
          Add from library
        </button>
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => setPaste(!paste)}>
          {paste ? 'Cancel paste' : 'Paste URLs'}
        </button>
      </div>
      {paste ? (
        <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
          <textarea
            className="admin-textarea"
            style={{ minHeight: 90, width: '100%' }}
            value={pasteText}
            placeholder={'One per line, e.g.\n/assets/images/team-1.jpg\nhttps://images.example.com/photo.jpg'}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div>
            <button
              type="button"
              className="admin-btn admin-btn-primary az-admin-mini"
              disabled={!pasteText.trim()}
              onClick={() => {
                const paths = pasteText
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((l) => toStorageMediaPath(l) || l);
                onAdd(paths);
                setPasteText('');
                setPaste(false);
              }}
            >
              Add URLs
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <div className="admin-error" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          {error}
        </div>
      ) : null}
      {library ? <LibraryModal allowVideo={allowVideo} onPick={onAdd} onClose={() => setLibrary(false)} /> : null}
    </div>
  );
}

function Thumb({ item }: { item: LifeMediaItem }) {
  const src = item.src ? publicMediaUrl(item.src) : '';
  if (!src) return <span className="lz-admin-thumb-empty">empty</span>;
  if (lifeMediaKind(item) === 'video') {
    return item.poster ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={publicMediaUrl(item.poster)} alt="" loading="lazy" />
    ) : (
      <span className="lz-admin-thumb-video">VIDEO</span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" />;
}

/** Manage any number of images / SVGs / videos: thumbnails, bulk add, reorder, per-item details. */
export function MediaItemsEditor({
  label,
  items,
  onChange,
  allowVideo = true,
  allowBig,
  showLabel = true,
  showColor = true,
  hint,
  defaults,
}: {
  label: string;
  items: LifeMediaItem[];
  onChange: (next: LifeMediaItem[]) => void;
  allowVideo?: boolean;
  allowBig?: boolean;
  showLabel?: boolean;
  showColor?: boolean;
  hint?: string;
  /** Pre-filled fields for newly added items (e.g. label / color) */
  defaults?: Partial<LifeMediaItem>;
}) {
  const list = items || [];
  const add = (paths: string[]) =>
    onChange([...list, ...paths.map((src) => ({ ...defaults, src, title: titleFromPath(src) }))]);
  const kinds = allowVideo ? (['image', 'svg', 'video'] as const) : (['image', 'svg'] as const);
  return (
    <div className="lz-admin-media">
      {hint ? <p className="az-admin-hint" style={{ marginTop: 0 }}>{hint}</p> : null}
      {list.length ? (
        <div className="lz-admin-thumbs" aria-label={`${label} overview`}>
          {list.map((item, i) => (
            <div
              key={i}
              className={`lz-admin-thumb${item.hidden ? ' is-hidden' : ''}${item.big ? ' is-big' : ''}`}
              title={`#${i + 1} ${item.title || item.src || ''}${item.hidden ? ' (hidden)' : ''}`}
            >
              <Thumb item={item} />
              <span className="lz-admin-thumb-no">{i + 1}</span>
            </div>
          ))}
        </div>
      ) : null}
      <MediaBulkAdd allowVideo={allowVideo} onAdd={add} />
      <ListEditor<LifeMediaItem>
        label={`${label} (${list.length})`}
        items={list}
        onChange={onChange}
        addLabel="Item"
        create={() => ({ ...defaults, src: '' })}
        itemTitle={(m) =>
          `${m.hidden ? '[hidden] ' : ''}${m.title || titleFromPath(m.src || '') || 'No file'}${
            lifeMediaKind(m) === 'video' ? ' · video' : ''
          }${m.big ? ' · big' : ''}`
        }
        renderItem={(m, patch) => (
          <div className="admin-form-grid">
            <div className="full">
              <Toggle label="Show this item" checked={!m.hidden} onChange={(v) => patch({ ...m, hidden: !v || undefined })} />
            </div>
            <div className="full">
              <MediaPicker
                label="File (image, SVG or video)"
                value={m.src || ''}
                onChange={(src) => patch({ ...m, src })}
                kinds={[...kinds]}
                allowUpload
              />
            </div>
            {allowVideo ? (
              <SelectInput
                label="Media type"
                value={m.type || ''}
                options={[
                  { value: '', label: 'Auto (from file extension)' },
                  { value: 'image', label: 'Image / SVG' },
                  { value: 'video', label: 'Video (muted loop)' },
                ]}
                onChange={(type) => patch({ ...m, type: (type || undefined) as LifeMediaItem['type'] })}
              />
            ) : null}
            <TextInput label="Title / caption (also alt text)" value={m.title} onChange={(title) => patch({ ...m, title })} />
            {showLabel ? (
              <TextInput label="Small label" value={m.label} onChange={(label) => patch({ ...m, label })} placeholder="e.g. Trainings" />
            ) : null}
            {showColor ? (
              <ColorInput
                label="Accent / placeholder color"
                value={m.color}
                onChange={(color) => patch({ ...m, color })}
                fallback=""
                hint="Hover outline and the tint shown while loading."
              />
            ) : null}
            {allowBig ? (
              <Field label="Mosaic size">
                <Toggle label="Big tile (2 × 2)" checked={Boolean(m.big)} onChange={(big) => patch({ ...m, big: big || undefined })} />
              </Field>
            ) : null}
            {allowVideo && lifeMediaKind(m) === 'video' ? (
              <div className="full">
                <MediaPicker
                  label="Video poster (optional)"
                  value={m.poster || ''}
                  onChange={(poster) => patch({ ...m, poster })}
                  kinds={['image']}
                  allowUpload
                  compact
                />
              </div>
            ) : null}
          </div>
        )}
      />
      {list.length > 1 ? (
        <button
          type="button"
          className="admin-btn admin-btn-danger az-admin-mini"
          style={{ justifySelf: 'start' }}
          onClick={() => {
            if (window.confirm(`Remove all ${list.length} items from “${label}”?`)) onChange([]);
          }}
        >
          Remove all
        </button>
      ) : null}
    </div>
  );
}
