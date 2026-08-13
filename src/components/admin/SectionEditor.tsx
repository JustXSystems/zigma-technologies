'use client';

import { FormEvent, useState } from 'react';
import type { CmsSection } from '@/lib/cms-types';
import MediaPicker from '@/components/admin/MediaPicker';

type Props = {
  section: CmsSection;
  onClose: () => void;
  onSaved: () => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function SectionEditor({ section, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(section.title || '');
  const [sectionKey, setSectionKey] = useState(section.section_key || '');
  const [content, setContent] = useState<Record<string, unknown>>({ ...(section.content_json || {}) });
  const [extraClass, setExtraClass] = useState(String((section.style_json as { className?: string })?.className || ''));
  const [customCss, setCustomCss] = useState(String((section.style_json as { css?: string })?.css || ''));
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(JSON.stringify(section.content_json || {}, null, 2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let content_json = content;
      if (jsonMode) {
        content_json = JSON.parse(jsonText || '{}');
      }
      const res = await fetch(`/api/admin/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          section_key: sectionKey || null,
          content_json,
          style_json: {
            className: extraClass || undefined,
            css: customCss || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const features = (content.features as Array<{ title: string; body: string; icon?: string }>) || [];
  const cards = (content.cards as Array<{ index: string; title: string; desc: string; tint: string }>) || [];
  const slides = (content.slides as Array<Record<string, unknown>>) || [];
  const ctaFields = content as Record<string, string>;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <form className="admin-modal" style={{ width: 'min(920px, 100%)' }} onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="admin-toolbar" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Edit · {section.type}</h2>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              if (!jsonMode) setJsonText(JSON.stringify(content, null, 2));
              else {
                try {
                  setContent(JSON.parse(jsonText || '{}'));
                } catch {
                  setError('Invalid JSON');
                  return;
                }
              }
              setJsonMode(!jsonMode);
            }}
          >
            {jsonMode ? 'Form mode' : 'JSON mode'}
          </button>
        </div>
        {error ? <div className="admin-error">{error}</div> : null}

        <div className="admin-form-grid">
          <Field label="Title">
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Section key (anchor id)">
            <input className="admin-input" value={sectionKey} onChange={(e) => setSectionKey(e.target.value)} />
          </Field>
          <Field label="Extra CSS class (style_json)">
            <input className="admin-input" value={extraClass} onChange={(e) => setExtraClass(e.target.value)} placeholder="e.g. my-section" />
          </Field>
          <Field label="Scoped CSS override">
            <input className="admin-input" value={customCss} onChange={(e) => setCustomCss(e.target.value)} placeholder=".my-section h2{color:red}" />
          </Field>
        </div>

        {jsonMode ? (
          <div className="admin-field" style={{ marginTop: '1rem' }}>
            <label>content_json</label>
            <textarea
              className="admin-textarea"
              style={{ minHeight: 320, fontFamily: 'var(--admin-mono)' }}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {(section.type === 'cta' ||
              section.type === 'eco' ||
              section.type === 'why' ||
              section.type === 'timeline' ||
              section.type === 'projects_teaser' ||
              section.type === 'industries' ||
              section.type === 'split' ||
              section.type === 'rich_text' ||
              section.type === 'enquiry_form' ||
              section.type === 'page_hero' ||
              section.type === 'cert_hero' ||
              section.type === 'cert_teaser' ||
              section.type === 'cert_cta' ||
              section.type === 'testimonials' ||
              section.type === 'partners' ||
              section.type === 'feature_grid' ||
              section.type === 'logo_marquee' ||
              section.type === 'locations' ||
              section.type === 'job_list' ||
              section.type === 'internship' ||
              section.type === 'careers_apply' ||
              section.type === 'comparison_table') && (
              <div className="admin-form-grid">
                {section.type !== 'cta' && section.type !== 'logo_marquee' && section.type !== 'cert_cta' ? (
                  <Field label="Eyebrow">
                    <input className="admin-input" value={String(content.eyebrow || '')} onChange={(e) => setField('eyebrow', e.target.value)} />
                  </Field>
                ) : null}
                {section.type !== 'logo_marquee' && section.type !== 'cert_cta' ? (
                  <Field label={section.type === 'cta' ? 'Headline' : 'Heading'}>
                    <input
                      className="admin-input"
                      value={String(content.title || '')}
                      onChange={(e) => setField('title', e.target.value)}
                    />
                  </Field>
                ) : null}
                {section.type !== 'logo_marquee' &&
                section.type !== 'testimonials' &&
                section.type !== 'cert_cta' ? (
                  <div className="admin-field full">
                    <label>
                      {section.type === 'page_hero' || section.type === 'cert_hero' ? 'Lead' : 'Body'}
                    </label>
                    <textarea
                      className="admin-textarea"
                      value={String(
                        section.type === 'page_hero' || section.type === 'cert_hero'
                          ? content.lead || content.body || ''
                          : content.body || ''
                      )}
                      onChange={(e) =>
                        setField(
                          section.type === 'page_hero' || section.type === 'cert_hero' ? 'lead' : 'body',
                          e.target.value
                        )
                      }
                    />
                  </div>
                ) : null}
              </div>
            )}

            {section.type === 'page_hero' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Breadcrumb label">
                  <input className="admin-input" value={String(content.breadcrumb || '')} onChange={(e) => setField('breadcrumb', e.target.value)} />
                </Field>
                <div className="full">
                  <MediaPicker value={String(content.image || '')} onChange={(path) => setField('image', path)} label="Background image" />
                </div>
                <Field label="Body class">
                  <input className="admin-input" value={String(content.bodyClass || '')} onChange={(e) => setField('bodyClass', e.target.value)} placeholder="contact-page" />
                </Field>
              </div>
            ) : null}

            {section.type === 'cert_hero' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Tagline">
                  <input className="admin-input" value={String(content.tagline || '')} onChange={(e) => setField('tagline', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'cert_teaser' || section.type === 'cert_cta' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="CTA label">
                  <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                </Field>
                <Field label="CTA href">
                  <input className="admin-input" value={String(content.ctaHref || '')} onChange={(e) => setField('ctaHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'cta' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Primary CTA label">
                  <input className="admin-input" value={ctaFields.primaryCta || ''} onChange={(e) => setField('primaryCta', e.target.value)} />
                </Field>
                <Field label="Primary CTA href">
                  <input className="admin-input" value={ctaFields.primaryHref || ''} onChange={(e) => setField('primaryHref', e.target.value)} />
                </Field>
                <Field label="Secondary CTA label">
                  <input className="admin-input" value={ctaFields.secondaryCta || ''} onChange={(e) => setField('secondaryCta', e.target.value)} />
                </Field>
                <Field label="Secondary CTA href">
                  <input className="admin-input" value={ctaFields.secondaryHref || ''} onChange={(e) => setField('secondaryHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'split' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <div className="full">
                  <MediaPicker value={String(content.image || '')} onChange={(path) => setField('image', path)} />
                </div>
                <Field label="Image position">
                  <select className="admin-select" value={String(content.imagePosition || 'left')} onChange={(e) => setField('imagePosition', e.target.value)}>
                    <option value="left">left</option>
                    <option value="right">right</option>
                  </select>
                </Field>
                <Field label="Tone">
                  <select className="admin-select" value={String(content.tone || 'light')} onChange={(e) => setField('tone', e.target.value)}>
                    <option value="light">light</option>
                    <option value="gray">gray</option>
                    <option value="ice">ice</option>
                  </select>
                </Field>
                <Field label="Eyebrow class">
                  <input className="admin-input" value={String(content.eyebrowClass || 'eyebrow-orange')} onChange={(e) => setField('eyebrowClass', e.target.value)} />
                </Field>
                <Field label="CTA label">
                  <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                </Field>
                <Field label="CTA href">
                  <input className="admin-input" value={String(content.ctaHref || '')} onChange={(e) => setField('ctaHref', e.target.value)} />
                </Field>
                <div className="admin-field full">
                  <label>Features (one per line: Title | Body)</label>
                  <textarea
                    className="admin-textarea"
                    value={features.map((f) => `${f.title} | ${f.body}`).join('\n')}
                    onChange={(e) =>
                      setField(
                        'features',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line, idx) => {
                            const [t, ...rest] = line.split('|');
                            const title = t.trim();
                            const body = rest.join('|').trim();
                            const prev =
                              features.find((f) => f.title === title) || features[idx];
                            return { title, body, icon: prev?.icon };
                          })
                      )
                    }
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>
                    Card icons come from seed/CMS JSON; editing titles preserves matching icons when possible.
                  </small>
                </div>
              </div>
            ) : null}

            {section.type === 'why' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Cards (one per line: Index | Title | Desc | tint-N)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 180 }}
                  value={cards.map((c) => `${c.index} | ${c.title} | ${c.desc} | ${c.tint}`).join('\n')}
                  onChange={(e) =>
                    setField(
                      'cards',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, i) => {
                          const parts = line.split('|').map((p) => p.trim());
                          return {
                            index: parts[0] || String(i + 1).padStart(2, '0'),
                            title: parts[1] || '',
                            desc: parts[2] || '',
                            tint: parts[3] || `tint-${(i % 6) + 1}`,
                          };
                        })
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'hero' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-toolbar" style={{ marginBottom: '0.6rem' }}>
                  <strong>Hero slides</strong>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setField('slides', [
                        ...slides,
                        {
                          theme: 'theme-legacy',
                          eyebrow: '',
                          title: 'New slide',
                          lead: '',
                          cta: 'Learn more →',
                          ctaHref: '#',
                          tags: [],
                          image: '/assets/images/zigma-technologies-engineers-monitoring-.jpg',
                        },
                      ])
                    }
                  >
                    Add slide
                  </button>
                </div>
                {slides.map((slide, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--admin-border, #e5e7eb)',
                      borderRadius: 8,
                      padding: '0.8rem',
                      marginBottom: '0.7rem',
                    }}
                  >
                    <div className="admin-toolbar" style={{ marginBottom: '0.5rem' }}>
                      <strong>Slide {idx + 1}</strong>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => setField('slides', slides.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="admin-form-grid">
                      <Field label="Theme">
                        <select
                          className="admin-select"
                          value={String(slide.theme || 'theme-legacy')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], theme: e.target.value };
                            setField('slides', next);
                          }}
                        >
                          {['theme-legacy', 'theme-ups', 'theme-solar', 'theme-eng', 'theme-future'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Eyebrow">
                        <input
                          className="admin-input"
                          value={String(slide.eyebrow || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], eyebrow: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="Title">
                        <input
                          className="admin-input"
                          value={String(slide.title || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="CTA label">
                        <input
                          className="admin-input"
                          value={String(slide.cta || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], cta: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="CTA href">
                        <input
                          className="admin-input"
                          value={String(slide.ctaHref || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], ctaHref: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <Field label="Numeral">
                        <input
                          className="admin-input"
                          value={String(slide.numeral || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], numeral: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </Field>
                      <div className="admin-field full">
                        <label>Lead</label>
                        <textarea
                          className="admin-textarea"
                          value={String(slide.lead || '')}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], lead: e.target.value };
                            setField('slides', next);
                          }}
                        />
                      </div>
                      <div className="full">
                        <MediaPicker
                          value={String(slide.image || '')}
                          onChange={(path) => {
                            const next = [...slides];
                            next[idx] = { ...next[idx], image: path };
                            setField('slides', next);
                          }}
                          label="Slide image"
                        />
                      </div>
                      <div className="admin-field full">
                        <label>Tags (comma separated)</label>
                        <input
                          className="admin-input"
                          value={Array.isArray(slide.tags) ? (slide.tags as string[]).join(', ') : ''}
                          onChange={(e) => {
                            const next = [...slides];
                            next[idx] = {
                              ...next[idx],
                              tags: e.target.value
                                .split(',')
                                .map((t) => t.trim())
                                .filter(Boolean),
                            };
                            setField('slides', next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {section.type === 'industries' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Industry labels (one per line)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 200 }}
                  value={((content.items as string[]) || []).join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'logo_marquee' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Certificates / brands (one per line: Name | Image URL)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 220 }}
                  value={((content.items as Array<string | { name: string; image?: string }>) || [])
                    .map((item) =>
                      typeof item === 'string'
                        ? item
                        : item.image
                          ? `${item.name} | ${item.image}`
                          : item.name
                    )
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [name, ...rest] = line.split('|').map((p) => p.trim());
                          const image = rest.join('|').trim();
                          return image ? { name, image } : { name };
                        })
                    )
                  }
                />
                <small style={{ color: 'var(--admin-muted)' }}>
                  Image URL enables click-to-enlarge lightbox on the public page.
                </small>
              </div>
            ) : null}

            {section.type === 'testimonials' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Testimonials (one per line: Quote | Name | Role)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 200 }}
                  value={((content.items as Array<{ quote: string; name: string; role?: string }>) || [])
                    .map((t) => `${t.quote} | ${t.name} | ${t.role || ''}`)
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const parts = line.split('|').map((p) => p.trim());
                          return { quote: parts[0] || '', name: parts[1] || '', role: parts[2] || '' };
                        })
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'partners' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-field full">
                  <label>Partner note</label>
                  <textarea
                    className="admin-textarea"
                    value={String(content.note || '')}
                    onChange={(e) => setField('note', e.target.value)}
                  />
                </div>
                <div className="admin-field full">
                  <label>Logos (one per line: /path | Alt text)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 180 }}
                    value={((content.logos as Array<{ src: string; alt?: string }>) || [])
                      .map((l) => `${l.src} | ${l.alt || ''}`)
                      .join('\n')}
                    onChange={(e) =>
                      setField(
                        'logos',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const [src, ...rest] = line.split('|');
                            return { src: src.trim(), alt: rest.join('|').trim() };
                          })
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'feature_grid' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Tone">
                    <select className="admin-select" value={String(content.tone || 'light')} onChange={(e) => setField('tone', e.target.value)}>
                      <option value="light">light</option>
                      <option value="gray">gray</option>
                      <option value="dark">dark</option>
                    </select>
                  </Field>
                  <Field label="Dark cards">
                    <select
                      className="admin-select"
                      value={content.darkCards ? '1' : '0'}
                      onChange={(e) => setField('darkCards', e.target.value === '1')}
                    >
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </Field>
                </div>
                <div className="admin-field full">
                  <label>Cards (one per line: Title | Body | optionalBadge)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 180 }}
                    value={((content.cards as Array<{ title: string; body: string; badge?: string }>) || [])
                      .map((c) => `${c.title} | ${c.body}${c.badge ? ` | ${c.badge}` : ''}`)
                      .join('\n')}
                    onChange={(e) =>
                      setField(
                        'cards',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return { title: parts[0] || '', body: parts[1] || '', badge: parts[2] || undefined };
                          })
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'rich_text' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>HTML</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 220, fontFamily: 'var(--admin-mono)' }}
                  value={String(content.html || '')}
                  onChange={(e) => setField('html', e.target.value)}
                />
              </div>
            ) : null}

            {section.type === 'comparison_table' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Feature column label">
                    <input
                      className="admin-input"
                      value={String(content.featureLabel || 'Capability')}
                      onChange={(e) => setField('featureLabel', e.target.value)}
                    />
                  </Field>
                  <Field label="Tone">
                    <select
                      className="admin-select"
                      value={String(content.tone || 'light')}
                      onChange={(e) => setField('tone', e.target.value)}
                    >
                      <option value="light">Light</option>
                      <option value="gray">Gray</option>
                      <option value="dark">Dark</option>
                    </select>
                  </Field>
                  <Field label="CTA label">
                    <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                  </Field>
                  <Field label="CTA link">
                    <input className="admin-input" value={String(content.ctaHref || '')} onChange={(e) => setField('ctaHref', e.target.value)} />
                  </Field>
                  <div className="admin-field full">
                    <label>CTA note (below button)</label>
                    <input className="admin-input" value={String(content.ctaNote || '')} onChange={(e) => setField('ctaNote', e.target.value)} />
                  </div>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Columns (one per line: Label | Sub-label | highlight?)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 120 }}
                    value={((content.columns as Array<{ label: string; sub?: string; highlight?: boolean }>) || [])
                      .map((c) => `${c.label} | ${c.sub || ''} | ${c.highlight ? 'highlight' : ''}`)
                      .join('\n')}
                    onChange={(e) => {
                      setField(
                        'columns',
                        e.target.value
                          .split('\n')
                          .filter((l) => l.trim())
                          .map((l) => {
                            const [label, sub, hl] = l.split('|').map((s) => s.trim());
                            return { label: label || '', sub: sub || undefined, highlight: hl?.toLowerCase().includes('highlight') };
                          })
                      );
                    }}
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>e.g. "UPS / Power | Protect | highlight"</small>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Rows (one per line: Group | Feature | val1 | val2 | …) — use "true" / "false" for ✓/✗, or text</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 240 }}
                    value={((content.rows as Array<{ group?: string; feature: string; values: unknown[] }>) || [])
                      .map((r) => `${r.group || ''} | ${r.feature} | ${(r.values || []).join(' | ')}`)
                      .join('\n')}
                    onChange={(e) => {
                      setField(
                        'rows',
                        e.target.value
                          .split('\n')
                          .filter((l) => l.trim())
                          .map((l) => {
                            const parts = l.split('|').map((s) => s.trim());
                            const group = parts[0] || undefined;
                            const feature = parts[1] || '';
                            const values = parts.slice(2).map((v) => {
                              if (v.toLowerCase() === 'true') return true;
                              if (v.toLowerCase() === 'false') return false;
                              return v || null;
                            });
                            return { group, feature, values };
                          })
                      );
                    }}
                  />
                  <small style={{ color: 'var(--admin-muted)' }}>e.g. "Delivery | Annual Maintenance | true | true | false | true | true"</small>
                </div>
              </div>
            ) : null}

            {section.type === 'projects_teaser' ? (
              <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                <Field label="Limit">
                  <input
                    className="admin-input"
                    type="number"
                    value={Number(content.limit || 3)}
                    onChange={(e) => setField('limit', Number(e.target.value))}
                  />
                </Field>
                <Field label="Featured only">
                  <select
                    className="admin-select"
                    value={content.featuredOnly === false ? '0' : '1'}
                    onChange={(e) => setField('featuredOnly', e.target.value === '1')}
                  >
                    <option value="1">Yes (fallback to latest)</option>
                    <option value="0">No — latest items</option>
                  </select>
                </Field>
                <Field label="CTA label">
                  <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                </Field>
                <Field label="CTA href">
                  <input className="admin-input" value={String(content.ctaHref || '/projects')} onChange={(e) => setField('ctaHref', e.target.value)} />
                </Field>
              </div>
            ) : null}

            {section.type === 'timeline' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Timeline items (one per line: Year | Title | Body | now?)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 180 }}
                  value={((content.items as Array<{ year: string; title: string; body: string; now?: boolean; next?: boolean }>) || [])
                    .map((i) => `${i.year} | ${i.title} | ${i.body}${i.now ? ' | now' : i.next ? ' | next' : ''}`)
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'items',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const parts = line.split('|').map((p) => p.trim());
                          const flag = (parts[3] || '').toLowerCase();
                          return {
                            year: parts[0] || '',
                            title: parts[1] || '',
                            body: parts[2] || '',
                            now: flag === 'now',
                            next: flag === 'next',
                          };
                        })
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'eco' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Capability groups (block per group: className|dot then items as bullet lines)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 200, fontFamily: 'var(--admin-mono)' }}
                  value={((content.groups as Array<{ className: string; items: string[]; dot: string }>) || [])
                    .map((g) => `${g.className}|${g.dot}\n${(g.items || []).map((i) => `- ${i}`).join('\n')}`)
                    .join('\n\n')}
                  onChange={(e) => {
                    const blocks = e.target.value.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
                    setField(
                      'groups',
                      blocks.map((block) => {
                        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
                        const [className, dot] = (lines[0] || 'cap-group-orange|dot-orange').split('|');
                        const items = lines
                          .slice(1)
                          .map((l) => l.replace(/^[-*]\s*/, '').trim())
                          .filter(Boolean);
                        return { className: className.trim(), dot: (dot || 'dot-orange').trim(), items };
                      })
                    );
                  }}
                />
              </div>
            ) : null}

            {section.type === 'quick_contact' || section.type === 'culture_stats' || section.type === 'stats' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>
                  {section.type === 'quick_contact'
                    ? 'Items (one per line: Label | Value | href | emergency?)'
                    : section.type === 'stats'
                      ? 'Stats (one per line: Value | Label | optionalSuffix)'
                      : 'Items (one per line: Value | Label)'}
                </label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 160 }}
                  value={
                    section.type === 'quick_contact'
                      ? ((content.items as Array<{ label: string; value: string; href?: string | null; emergency?: boolean }>) || [])
                          .map((i) => `${i.label} | ${i.value} | ${i.href || ''} | ${i.emergency ? 'emergency' : ''}`)
                          .join('\n')
                      : section.type === 'stats'
                        ? ((content.stats as Array<{ value: number | string; label: string; suffix?: string }>) || [])
                            .map((s) => `${s.value} | ${s.label} | ${s.suffix || ''}`)
                            .join('\n')
                        : ((content.items as Array<{ value?: string; label: string }>) || [])
                            .map((i) => `${i.value || ''} | ${i.label || ''}`)
                            .join('\n')
                  }
                  onChange={(e) => {
                    if (section.type === 'quick_contact') {
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return {
                              label: parts[0] || '',
                              value: parts[1] || '',
                              href: parts[2] || null,
                              emergency: (parts[3] || '').toLowerCase().includes('emergency'),
                            };
                          })
                      );
                    } else if (section.type === 'stats') {
                      setField(
                        'stats',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            const num = Number(parts[0]);
                            return {
                              value: Number.isFinite(num) ? num : parts[0] || 0,
                              label: parts[1] || '',
                              suffix: parts[2] || undefined,
                            };
                          })
                      );
                    } else {
                      setField(
                        'items',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return { value: parts[0] || '', label: parts[1] || '' };
                          })
                      );
                    }
                  }}
                />
              </div>
            ) : null}

            {section.type === 'locations' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Map embed URL">
                    <input
                      className="admin-input"
                      value={String(content.mapEmbedUrl || '')}
                      onChange={(e) => setField('mapEmbedUrl', e.target.value)}
                    />
                  </Field>
                  <Field label="Map title">
                    <input
                      className="admin-input"
                      value={String(content.mapTitle || '')}
                      onChange={(e) => setField('mapTitle', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                  <label>Locations (one per line: Tag | Title | Address | Phone | phoneHref | directionsUrl)</label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: 180 }}
                    value={((content.locations as Array<Record<string, string>>) || [])
                      .map(
                        (l) =>
                          `${l.tag || ''} | ${l.title || ''} | ${l.address || ''} | ${l.phone || ''} | ${l.phoneHref || ''} | ${l.directionsUrl || ''}`
                      )
                      .join('\n')}
                    onChange={(e) => {
                      const prev = (content.locations as Array<Record<string, string>>) || [];
                      setField(
                        'locations',
                        e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean)
                          .map((line, idx) => {
                            const parts = line.split('|').map((p) => p.trim());
                            return {
                              tag: parts[0] || '',
                              title: parts[1] || '',
                              address: parts[2] || '',
                              phone: parts[3] || '',
                              phoneHref: parts[4] || '',
                              directionsUrl: parts[5] || '',
                              icon: prev[idx]?.icon,
                            };
                          })
                      );
                    }}
                  />
                </div>
              </div>
            ) : null}

            {section.type === 'job_list' ? (
              <div className="admin-field full" style={{ marginTop: '0.8rem' }}>
                <label>Jobs (one per line: Title | Department | Location | Type)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 160 }}
                  value={((content.jobs as Array<Record<string, string>>) || [])
                    .map((j) => `${j.title || ''} | ${j.department || ''} | ${j.location || ''} | ${j.type || ''}`)
                    .join('\n')}
                  onChange={(e) =>
                    setField(
                      'jobs',
                      e.target.value
                        .split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const parts = line.split('|').map((p) => p.trim());
                          return {
                            title: parts[0] || '',
                            department: parts[1] || '',
                            location: parts[2] || '',
                            type: parts[3] || 'Full-Time',
                          };
                        })
                    )
                  }
                />
              </div>
            ) : null}

            {section.type === 'internship' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Card title">
                    <input
                      className="admin-input"
                      value={String(content.cardTitle || '')}
                      onChange={(e) => setField('cardTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="CTA label">
                    <input className="admin-input" value={String(content.cta || '')} onChange={(e) => setField('cta', e.target.value)} />
                  </Field>
                  <Field label="Apply role (prefill)">
                    <input
                      className="admin-input"
                      value={String(content.applyRole || '')}
                      onChange={(e) => setField('applyRole', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Card body</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.cardBody || '')}
                      onChange={(e) => setField('cardBody', e.target.value)}
                    />
                  </div>
                  <div className="admin-field full">
                    <label>Points (one per line: Label | Value)</label>
                    <textarea
                      className="admin-textarea"
                      value={((content.points as Array<{ label: string; value: string }>) || [])
                        .map((p) => `${p.label} | ${p.value}`)
                        .join('\n')}
                      onChange={(e) =>
                        setField(
                          'points',
                          e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line) => {
                              const parts = line.split('|').map((p) => p.trim());
                              return { label: parts[0] || '', value: parts[1] || '' };
                            })
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {section.type === 'careers_apply' || section.type === 'enquiry_form' ? (
              <div style={{ marginTop: '0.8rem' }}>
                <div className="admin-form-grid">
                  <Field label="Form title">
                    <input
                      className="admin-input"
                      value={String(content.formTitle || '')}
                      onChange={(e) => setField('formTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="Submit label">
                    <input
                      className="admin-input"
                      value={String(content.submitLabel || '')}
                      onChange={(e) => setField('submitLabel', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Form intro</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.formIntro || '')}
                      onChange={(e) => setField('formIntro', e.target.value)}
                    />
                  </div>
                  <div className="admin-field full">
                    <label>Privacy note</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.privacyNote || '')}
                      onChange={(e) => setField('privacyNote', e.target.value)}
                    />
                  </div>
                  <Field label="Success title">
                    <input
                      className="admin-input"
                      value={String(content.successTitle || '')}
                      onChange={(e) => setField('successTitle', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Success body</label>
                    <textarea
                      className="admin-textarea"
                      value={String(content.successBody || '')}
                      onChange={(e) => setField('successBody', e.target.value)}
                    />
                  </div>
                  <Field label="Side title">
                    <input
                      className="admin-input"
                      value={String(content.sideTitle || '')}
                      onChange={(e) => setField('sideTitle', e.target.value)}
                    />
                  </Field>
                  <div className="admin-field full">
                    <label>Side items (one per line: Label | Value | href)</label>
                    <textarea
                      className="admin-textarea"
                      value={((content.sideItems as Array<{ label: string; value: string; href?: string }>) || [])
                        .map((i) => `${i.label} | ${i.value} | ${i.href || ''}`)
                        .join('\n')}
                      onChange={(e) => {
                        const prev = (content.sideItems as Array<{ icon?: string }>) || [];
                        setField(
                          'sideItems',
                          e.target.value
                            .split('\n')
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line, idx) => {
                              const parts = line.split('|').map((p) => p.trim());
                              return {
                                label: parts[0] || '',
                                value: parts[1] || '',
                                href: parts[2] || undefined,
                                icon: prev[idx]?.icon,
                              };
                            })
                        );
                      }}
                    />
                  </div>
                </div>
                {section.type === 'careers_apply' ? (
                  <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                    <Field label="Next steps title">
                      <input
                        className="admin-input"
                        value={String(content.nextTitle || '')}
                        onChange={(e) => setField('nextTitle', e.target.value)}
                      />
                    </Field>
                    <div className="admin-field full">
                      <label>Next steps (one per line)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.nextSteps as Array<{ text: string }>) || []).map((s) => s.text).join('\n')}
                        onChange={(e) =>
                          setField(
                            'nextSteps',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((text) => ({ text }))
                          )
                        }
                      />
                    </div>
                    <div className="admin-field full">
                      <label>Role options (one per line)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.roles as string[]) || []).join('\n')}
                        onChange={(e) =>
                          setField(
                            'roles',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="admin-form-grid" style={{ marginTop: '0.8rem' }}>
                    <Field label="Hours title">
                      <input
                        className="admin-input"
                        value={String(content.hoursTitle || '')}
                        onChange={(e) => setField('hoursTitle', e.target.value)}
                      />
                    </Field>
                    <div className="admin-field full">
                      <label>Hours (one per line: Label | Value)</label>
                      <textarea
                        className="admin-textarea"
                        value={((content.hours as Array<{ label: string; value: string }>) || [])
                          .map((h) => `${h.label} | ${h.value}`)
                          .join('\n')}
                        onChange={(e) =>
                          setField(
                            'hours',
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((line) => {
                                const parts = line.split('|').map((p) => p.trim());
                                return { label: parts[0] || '', value: parts[1] || '' };
                              })
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      </form>
    </div>
  );
}
