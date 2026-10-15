'use client';

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useRef, useState } from 'react';
import { publicMediaUrl } from '@/lib/media-url';
import { altFromFileName, imageFiles, uploadImage } from './upload';

export const FIGURE_SIZES = [
  { value: 'inset', label: 'Inset', hint: 'Narrower than the text — screenshots, diagrams, portraits' },
  { value: 'normal', label: 'Column', hint: 'As wide as the text' },
  { value: 'wide', label: 'Wide', hint: 'Breaks out of the column (Focus and Immersive layouts)' },
  { value: 'full', label: 'Full', hint: 'Edge to edge (Focus and Immersive layouts)' },
] as const;

/** Image block: pick a size, caption it, describe it — all in place. */
export function FigureView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { src, alt, caption, size } = node.attrs as { src: string; alt: string; caption: string; size: string };
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function replace(files: FileList | null) {
    const [file] = imageFiles(files);
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      updateAttributes({ src: await uploadImage(file), alt: alt || altFromFileName(file.name) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <NodeViewWrapper className={`abl-fig${selected ? ' is-selected' : ''}`} data-size={size} data-drag-handle="">
      <div className="abl-fig-media">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={publicMediaUrl(src)} alt={alt} draggable={false} />
        ) : (
          <div className="abl-fig-empty">No image</div>
        )}
        {busy ? <div className="abl-fig-busy">Uploading…</div> : null}
        <div className="abl-fig-tools" contentEditable={false}>
          <div className="abl-fig-sizes" role="radiogroup" aria-label="Image size">
            {FIGURE_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={size === s.value}
                title={s.hint}
                className={size === s.value ? 'is-on' : ''}
                onClick={() => updateAttributes({ size: s.value })}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} title="Upload a different image">
            Replace
          </button>
          <button type="button" className="is-danger" onClick={deleteNode} title="Remove the image">
            ✕
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void replace(e.target.files)} />
        </div>
      </div>
      <input
        className="abl-fig-caption"
        value={caption}
        placeholder="Add a caption (optional)"
        aria-label="Caption"
        onChange={(e) => updateAttributes({ caption: e.target.value })}
      />
      {selected || !alt.trim() ? (
        <label className={`abl-fig-alt${alt.trim() ? '' : ' is-missing'}`}>
          <span>Alt text</span>
          <input
            value={alt}
            placeholder="What the image shows — for screen readers and Google"
            onChange={(e) => updateAttributes({ alt: e.target.value })}
          />
        </label>
      ) : null}
      {error ? <p className="abl-fig-error">{error}</p> : null}
    </NodeViewWrapper>
  );
}

/** Call-to-action button block, edited in place. */
export function ButtonView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { href, label, variant } = node.attrs as { href: string; label: string; variant: string };
  return (
    <NodeViewWrapper className={`abl-btnblock${selected ? ' is-selected' : ''}`} data-drag-handle="">
      <span className="blg-btn" data-style={variant}>
        {label || 'Button label'}
      </span>
      {selected ? (
        <div className="abl-btnblock-form" contentEditable={false}>
          <input value={label} placeholder="Button label" aria-label="Button label" onChange={(e) => updateAttributes({ label: e.target.value })} />
          <input value={href} placeholder="/contact or https://…" aria-label="Button link" onChange={(e) => updateAttributes({ href: e.target.value })} />
          <div className="abl-fig-sizes" role="radiogroup" aria-label="Button style">
            {(['primary', 'secondary'] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={variant === v} className={variant === v ? 'is-on' : ''} onClick={() => updateAttributes({ variant: v })}>
                {v === 'primary' ? 'Filled' : 'Outline'}
              </button>
            ))}
          </div>
          <button type="button" className="is-danger" onClick={deleteNode} title="Remove the button">
            ✕
          </button>
        </div>
      ) : (
        <span className="abl-btnblock-hint">{href || 'No link yet'} · click to edit</span>
      )}
    </NodeViewWrapper>
  );
}
