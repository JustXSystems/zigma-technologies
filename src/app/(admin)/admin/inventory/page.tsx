'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogItem, CatalogCategory, CatalogItemType, CatalogMedia } from '@/lib/types';
import { buildCaseStudyJson, caseStudyToEditor } from '@/lib/catalog-case-study';
import { getBrochureUrl, withBrochureUrl } from '@/lib/catalog-brochure';
import MediaPicker from '@/components/admin/MediaPicker';

const TYPES: CatalogItemType[] = ['product', 'project', 'service'];

type EditorState = {
  id?: number;
  title: string;
  slug: string;
  summary: string;
  description: string;
  category_id: string;
  tags: string;
  specs: string;
  price_label: string;
  availability_label: string;
  lead_time_label: string;
  brochure_url: string;
  status: 'draft' | 'published';
  featured: boolean;
  enabled: boolean;
  case_study_enabled: boolean;
  case_study_client: string;
  case_study_sector: string;
  case_study_location: string;
  case_study_year: string;
  case_study_challenge: string;
  case_study_solution: string;
  case_study_scope: string;
  case_study_outcomes: string;
  case_study_technologies: string;
  case_study_testimonial_quote: string;
  case_study_testimonial_author: string;
  case_study_testimonial_role: string;
  case_study_before_image: string;
  case_study_after_image: string;
  case_study_oem_badges: string;
  case_study_pdf_url: string;
  case_study_video_url: string;
  case_study_video_title: string;
};

const emptyEditor = (): EditorState => ({
  title: '',
  slug: '',
  summary: '',
  description: '',
  category_id: '',
  tags: '',
  specs: '',
  price_label: '',
  availability_label: '',
  lead_time_label: '',
  brochure_url: '',
  status: 'draft',
  featured: false,
  enabled: true,
  case_study_enabled: true,
  case_study_client: '',
  case_study_sector: '',
  case_study_location: '',
  case_study_year: '',
  case_study_challenge: '',
  case_study_solution: '',
  case_study_scope: '',
  case_study_outcomes: '',
  case_study_technologies: '',
  case_study_testimonial_quote: '',
  case_study_testimonial_author: '',
  case_study_testimonial_role: '',
  case_study_before_image: '',
  case_study_after_image: '',
  case_study_oem_badges: '',
  case_study_pdf_url: '',
  case_study_video_url: '',
  case_study_video_title: '',
});

function InventoryInner() {
  const router = useRouter();
  const search = useSearchParams();
  const type = (search.get('type') as CatalogItemType) || 'product';
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor());
  const [saving, setSaving] = useState(false);
  const [uploadItemId, setUploadItemId] = useState<number | null>(null);
  const [mediaItem, setMediaItem] = useState<CatalogItem | null>(null);
  const [itemMedia, setItemMedia] = useState<CatalogMedia[]>([]);
  const [attachUrl, setAttachUrl] = useState('');
  const [mediaMsg, setMediaMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch(`/api/admin/catalog?type=${type}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
        fetch(`/api/admin/categories?type=${type}`),
      ]);
      const itemsData = await itemsRes.json();
      const catsData = await catsRes.json();
      if (!itemsRes.ok) throw new Error(itemsData.error || 'Failed to load items');
      if (!catsRes.ok) throw new Error(catsData.error || 'Failed to load categories');
      setItems(itemsData.items);
      setCategories(catsData.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [type, q]);

  useEffect(() => {
    load();
  }, [load]);

  function setType(next: CatalogItemType) {
    router.push(`/admin/inventory?type=${next}`);
  }

  function openCreate() {
    setEditor(emptyEditor());
    setEditorOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditor({
      id: item.id,
      title: item.title,
      slug: item.slug,
      summary: item.summary || '',
      description: item.description || '',
      category_id: item.category_id ? String(item.category_id) : '',
      tags: (item.tags_json || []).join(', '),
      specs: item.specs_json
        ? Object.entries(item.specs_json)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')
        : '',
      price_label: item.price_label || '',
      availability_label: item.availability_label || '',
      lead_time_label: item.lead_time_label || '',
      brochure_url: getBrochureUrl(item) || '',
      status: item.status,
      featured: !!item.featured,
      enabled: !!item.enabled,
      ...caseStudyToEditor(item.case_study_json),
    });
    setEditorOpen(true);
  }

  function parseSpecs(text: string) {
    const out: Record<string, string> = {};
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line) => {
        const idx = line.indexOf(':');
        if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
    return out;
  }

  async function saveItem(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        item_type: type,
        title: editor.title,
        slug: editor.slug || undefined,
        summary: editor.summary,
        description: editor.description,
        category_id: editor.category_id ? Number(editor.category_id) : null,
        tags_json: editor.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        specs_json: parseSpecs(editor.specs),
        price_label: editor.price_label || null,
        availability_label: editor.availability_label || null,
        lead_time_label: editor.lead_time_label || null,
        cta_config_json: withBrochureUrl(null, editor.brochure_url),
        status: editor.status,
        featured: editor.featured,
        enabled: editor.enabled,
        case_study_json: buildCaseStudyJson({
          enabled: editor.case_study_enabled,
          client_name: editor.case_study_client,
          client_sector: editor.case_study_sector,
          location: editor.case_study_location,
          delivery_year: editor.case_study_year,
          challenge: editor.case_study_challenge,
          solution: editor.case_study_solution,
          scope: editor.case_study_scope,
          outcomes: editor.case_study_outcomes,
          technologies: editor.case_study_technologies,
          testimonial_quote: editor.case_study_testimonial_quote,
          testimonial_author: editor.case_study_testimonial_author,
          testimonial_role: editor.case_study_testimonial_role,
          before_image_url: editor.case_study_before_image,
          after_image_url: editor.case_study_after_image,
          oem_badges: editor.case_study_oem_badges,
          case_study_pdf_url: editor.case_study_pdf_url,
          video_url: editor.case_study_video_url,
          video_title: editor.case_study_video_title,
        }),
      };

      const res = await fetch(editor.id ? `/api/admin/catalog/${editor.id}` : '/api/admin/catalog', {
        method: editor.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setEditorOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(item: CatalogItem) {
    await fetch(`/api/admin/catalog/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    await load();
  }

  async function removeItem(item: CatalogItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await fetch(`/api/admin/catalog/${item.id}`, { method: 'DELETE' });
    await load();
  }

  async function duplicateItem(item: CatalogItem) {
    setError('');
    const res = await fetch('/api/admin/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: type,
        title: `${item.title} (copy)`,
        slug: `${item.slug}-copy`,
        summary: item.summary,
        description: item.description,
        category_id: item.category_id,
        tags_json: item.tags_json || [],
        specs_json: item.specs_json || {},
        price_label: item.price_label,
        availability_label: item.availability_label,
        lead_time_label: item.lead_time_label,
        status: 'draft',
        featured: false,
        enabled: false,
        case_study_json: item.case_study_json,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Duplicate failed');
      return;
    }
    if (data.item?.id) {
      await fetch(`/api/admin/catalog/${data.item.id}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy_from', from_item_id: item.id }),
      });
    }
    await load();
  }

  async function seedSamples() {
    setError('');
    const res = await fetch('/api/admin/catalog/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Seed failed');
      return;
    }
    if (data.message) setError(''); // clear; show via alert briefly
    alert(data.message);
    await load();
  }

  async function deleteAllItems() {
    if (!items.length) {
      alert(`No ${type}s to delete.`);
      return;
    }
    if (
      !confirm(
        `Delete ALL ${items.length} ${type}${items.length === 1 ? '' : 's'}?\n\nThis cannot be undone. You can re-seed afterwards.`
      )
    ) {
      return;
    }
    setError('');
    const res = await fetch(`/api/admin/catalog?type=${encodeURIComponent(type)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Delete all failed');
      return;
    }
    alert(data.message || `Deleted ${data.deleted || 0} ${type}s.`);
    await load();
  }

  async function move(item: CatalogItem, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === item.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= items.length) return;
    const next = [...items];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
    await fetch('/api/admin/catalog/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: type, ordered_ids: next.map((i) => i.id) }),
    });
  }

  async function openMedia(item: CatalogItem) {
    setMediaItem(item);
    setMediaMsg('');
    setAttachUrl('');
    const res = await fetch(`/api/admin/catalog/${item.id}/media`);
    const data = await res.json();
    if (res.ok) setItemMedia(data.media || []);
    else setError(data.error || 'Failed to load media');
  }

  async function attachLibraryMedia(url: string, isPrimary = false) {
    if (!mediaItem || !url) return;
    setMediaMsg('');
    const res = await fetch(`/api/admin/catalog/${mediaItem.id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, is_primary: isPrimary || itemMedia.length === 0 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Attach failed');
      return;
    }
    setMediaMsg('Attached.');
    setAttachUrl('');
    await openMedia(mediaItem);
    await load();
  }

  async function setPrimaryMedia(mediaId: number) {
    if (!mediaItem) return;
    setMediaMsg('');
    const res = await fetch(`/api/admin/catalog/${mediaItem.id}/media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_primary', media_id: mediaId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not set thumbnail');
      return;
    }
    setItemMedia(data.media || []);
    setMediaMsg('Thumbnail updated.');
    await load();
  }

  async function moveMedia(mediaId: number, dir: -1 | 1) {
    if (!mediaItem) return;
    const idx = itemMedia.findIndex((m) => m.id === mediaId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= itemMedia.length) return;
    const next = [...itemMedia];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const res = await fetch(`/api/admin/catalog/${mediaItem.id}/media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', ordered_ids: next.map((m) => m.id) }),
    });
    const data = await res.json();
    if (res.ok) {
      setItemMedia(data.media || []);
      await load();
    }
  }

  async function removeMedia(mediaId: number) {
    if (!mediaItem) return;
    await fetch(`/api/admin/catalog/${mediaItem.id}/media?media_id=${mediaId}`, { method: 'DELETE' });
    await openMedia(mediaItem);
    await load();
  }

  async function uploadMedia(files: FileList | File[], itemId: number, makePrimary = false) {
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const fd = new FormData();
      fd.append('file', file);
      fd.append('item_id', String(itemId));
      if (makePrimary && i === 0) fd.append('is_primary', '1');
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
    }
    await load();
  }

  const typeLabel = useMemo(() => type.charAt(0).toUpperCase() + type.slice(1) + 's', [type]);

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      <div className="admin-toolbar">
        <div className="left">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`admin-btn ${type === t ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setType(t)}
            >
              {t}s
            </button>
          ))}
          <input
            className="admin-input"
            placeholder={`Search ${typeLabel.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="right" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={seedSamples}>
            Seed {type}s
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={deleteAllItems}
            disabled={!items.length || loading}
          >
            Delete all {type}s
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
            Add {type}
          </button>
        </div>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Status</th>
              <th>Enabled</th>
              <th>Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No {typeLabel.toLowerCase()} yet. Create the first one.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {item.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="admin-thumb" src={item.primary_image} alt="" />
                      ) : (
                        <div className="admin-thumb" />
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        <div style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>{item.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>{item.category_name || '—'}</td>
                  <td>
                    <span className={`admin-badge ${item.status}`}>{item.status}</span>
                  </td>
                  <td>{item.enabled ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(item, -1)}>
                      ↑
                    </button>{' '}
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => move(item, 1)}>
                      ↓
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => duplicateItem(item)}>
                        Duplicate
                      </button>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggleEnabled(item)}>
                        {item.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={() => openMedia(item)}>
                        Media
                      </button>
                      <label className="admin-btn admin-btn-secondary" style={{ cursor: 'pointer' }}>
                        Upload
                        <input
                          type="file"
                          accept="image/*,video/mp4,video/webm,.svg"
                          multiple
                          hidden
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files?.length) return;
                            setUploadItemId(item.id);
                            try {
                              await uploadMedia(files, item.id, !item.primary_image);
                              if (mediaItem?.id === item.id) await openMedia(item);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Upload failed');
                            } finally {
                              setUploadItemId(null);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                      {uploadItemId === item.id ? <span style={{ color: 'var(--admin-muted)' }}>…</span> : null}
                      <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeItem(item)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editorOpen ? (
        <div className="admin-modal-backdrop" onClick={() => setEditorOpen(false)}>
          <form
            className="admin-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveItem}
          >
            <h2>{editor.id ? `Edit ${type}` : `New ${type}`}</h2>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Title</label>
                <input className="admin-input" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Slug</label>
                <input className="admin-input" value={editor.slug} onChange={(e) => setEditor({ ...editor, slug: e.target.value })} placeholder="auto from title" />
              </div>
              <div className="admin-field full">
                <label>Summary</label>
                <textarea className="admin-textarea" value={editor.summary} onChange={(e) => setEditor({ ...editor, summary: e.target.value })} />
              </div>
              <div className="admin-field full">
                <label>Description</label>
                <textarea className="admin-textarea" value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Category</label>
                <select className="admin-select" value={editor.category_id} onChange={(e) => setEditor({ ...editor, category_id: e.target.value })}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label>Price label</label>
                <input className="admin-input" value={editor.price_label} onChange={(e) => setEditor({ ...editor, price_label: e.target.value })} placeholder="e.g. On request" />
              </div>
              <div className="admin-field">
                <label>Availability</label>
                <input
                  className="admin-input"
                  value={editor.availability_label}
                  onChange={(e) => setEditor({ ...editor, availability_label: e.target.value })}
                  placeholder="e.g. In stock / Made to order"
                />
              </div>
              <div className="admin-field">
                <label>Lead time</label>
                <input
                  className="admin-input"
                  value={editor.lead_time_label}
                  onChange={(e) => setEditor({ ...editor, lead_time_label: e.target.value })}
                  placeholder="e.g. 2–4 weeks"
                />
              </div>
              <div className="admin-field">
                <label>Brochure / PDF URL</label>
                <input
                  className="admin-input"
                  value={editor.brochure_url}
                  onChange={(e) => setEditor({ ...editor, brochure_url: e.target.value })}
                  placeholder="/assets/uploads/documents/… or https://…"
                />
              </div>
              <div className="admin-field">
                <label>Tags (comma separated)</label>
                <input className="admin-input" value={editor.tags} onChange={(e) => setEditor({ ...editor, tags: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Status</label>
                <select className="admin-select" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as 'draft' | 'published' })}>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>
              <div className="admin-field full">
                <label>Specs (one per line: Key: Value)</label>
                <textarea className="admin-textarea" value={editor.specs} onChange={(e) => setEditor({ ...editor, specs: e.target.value })} />
              </div>
              <div className="full" style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>Case study / profile</h3>
                <p style={{ color: 'var(--admin-muted)', marginTop: 0, fontSize: '0.88rem' }}>
                  Powers the premium public detail page at /{type}s/&lt;slug&gt; with challenge, solution, scope, outcomes, and testimonial.
                </p>
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={editor.case_study_enabled}
                        onChange={(e) => setEditor({ ...editor, case_study_enabled: e.target.checked })}
                      />{' '}
                      Enable case study page
                    </label>
                  </div>
                  <div className="admin-field">
                    <label>Client name</label>
                    <input className="admin-input" value={editor.case_study_client} onChange={(e) => setEditor({ ...editor, case_study_client: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Client sector</label>
                    <input className="admin-input" value={editor.case_study_sector} onChange={(e) => setEditor({ ...editor, case_study_sector: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Location</label>
                    <input className="admin-input" value={editor.case_study_location} onChange={(e) => setEditor({ ...editor, case_study_location: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Delivery year</label>
                    <input className="admin-input" value={editor.case_study_year} onChange={(e) => setEditor({ ...editor, case_study_year: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Challenge</label>
                    <textarea className="admin-textarea" value={editor.case_study_challenge} onChange={(e) => setEditor({ ...editor, case_study_challenge: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Solution</label>
                    <textarea className="admin-textarea" value={editor.case_study_solution} onChange={(e) => setEditor({ ...editor, case_study_solution: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Scope delivered</label>
                    <textarea className="admin-textarea" value={editor.case_study_scope} onChange={(e) => setEditor({ ...editor, case_study_scope: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Outcomes (one per line)</label>
                    <textarea className="admin-textarea" value={editor.case_study_outcomes} onChange={(e) => setEditor({ ...editor, case_study_outcomes: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Technologies (comma separated)</label>
                    <input className="admin-input" value={editor.case_study_technologies} onChange={(e) => setEditor({ ...editor, case_study_technologies: e.target.value })} />
                  </div>
                  <div className="admin-field full">
                    <label>Testimonial quote</label>
                    <textarea className="admin-textarea" value={editor.case_study_testimonial_quote} onChange={(e) => setEditor({ ...editor, case_study_testimonial_quote: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Testimonial author</label>
                    <input className="admin-input" value={editor.case_study_testimonial_author} onChange={(e) => setEditor({ ...editor, case_study_testimonial_author: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Testimonial role</label>
                    <input className="admin-input" value={editor.case_study_testimonial_role} onChange={(e) => setEditor({ ...editor, case_study_testimonial_role: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Before image URL</label>
                    <input className="admin-input" value={editor.case_study_before_image} onChange={(e) => setEditor({ ...editor, case_study_before_image: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>After image URL</label>
                    <input className="admin-input" value={editor.case_study_after_image} onChange={(e) => setEditor({ ...editor, case_study_after_image: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>OEM badges (comma)</label>
                    <input className="admin-input" value={editor.case_study_oem_badges} onChange={(e) => setEditor({ ...editor, case_study_oem_badges: e.target.value })} placeholder="ABB, Schneider" />
                  </div>
                  <div className="admin-field">
                    <label>Case study PDF URL</label>
                    <input className="admin-input" value={editor.case_study_pdf_url} onChange={(e) => setEditor({ ...editor, case_study_pdf_url: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label>Video URL</label>
                    <input
                      className="admin-input"
                      value={editor.case_study_video_url}
                      onChange={(e) => setEditor({ ...editor, case_study_video_url: e.target.value })}
                      placeholder="https://… or /assets/video/…"
                    />
                  </div>
                  <div className="admin-field">
                    <label>Video title</label>
                    <input
                      className="admin-input"
                      value={editor.case_study_video_title}
                      onChange={(e) => setEditor({ ...editor, case_study_video_title: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="admin-field">
                <label>
                  <input type="checkbox" checked={editor.featured} onChange={(e) => setEditor({ ...editor, featured: e.target.checked })} /> Featured
                </label>
              </div>
              <div className="admin-field">
                <label>
                  <input type="checkbox" checked={editor.enabled} onChange={(e) => setEditor({ ...editor, enabled: e.target.checked })} /> Enabled
                </label>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setEditorOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {mediaItem ? (
        <div className="admin-modal-backdrop" onClick={() => setMediaItem(null)}>
          <div className="admin-modal" style={{ width: 'min(860px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <h2>Media · {mediaItem.title}</h2>
            <p style={{ color: 'var(--admin-muted)', fontSize: '0.88rem', marginTop: 0 }}>
              Attach multiple images, SVG, or videos. Set one image/SVG as the <strong>card thumbnail</strong> (★). Videos appear in the detail gallery but are not used as list thumbnails.
            </p>
            {mediaMsg ? <div className="admin-success">{mediaMsg}</div> : null}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              <label className="admin-btn admin-btn-primary" style={{ cursor: 'pointer' }}>
                Upload files
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,.svg"
                  multiple
                  hidden
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files?.length || !mediaItem) return;
                    try {
                      await uploadMedia(files, mediaItem.id, itemMedia.length === 0);
                      await openMedia(mediaItem);
                      setMediaMsg(`Uploaded ${files.length} file(s).`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Upload failed');
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <MediaPicker value={attachUrl} onChange={setAttachUrl} label="Attach from library / URL" />
            <div style={{ margin: '0.7rem 0 1rem' }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                disabled={!attachUrl}
                onClick={() => attachLibraryMedia(attachUrl)}
              >
                Attach to item
              </button>
            </div>
            {itemMedia.length === 0 ? (
              <p className="admin-empty">No media attached yet. Upload or attach from the media library.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.8rem' }}>
                {itemMedia.map((m, idx) => (
                  <div
                    key={m.id}
                    style={{
                      border: m.is_primary ? '2px solid var(--orange, #FF6B1A)' : '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '0.55rem',
                      background: '#fff',
                    }}
                  >
                    {m.kind === 'video' ? (
                      <video src={m.url} muted style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.alt || ''} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6 }} />
                    )}
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="admin-badge" style={{ fontSize: '0.68rem' }}>{m.kind}</span>
                      {m.is_primary ? <span style={{ fontSize: '0.72rem', color: 'var(--orange, #FF6B1A)', fontWeight: 700 }}>★ Thumbnail</span> : null}
                    </div>
                    <code style={{ display: 'block', fontSize: '0.62rem', marginTop: 6, wordBreak: 'break-all' }}>{m.url}</code>
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {m.kind !== 'video' && !m.is_primary ? (
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPrimaryMedia(m.id)}>
                          Set thumbnail
                        </button>
                      ) : null}
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={idx === 0} onClick={() => moveMedia(m.id, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={idx === itemMedia.length - 1}
                        onClick={() => moveMedia(m.id, 1)}
                      >
                        ↓
                      </button>
                      <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeMedia(m.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setMediaItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="admin-empty">Loading inventory…</div>}>
      <InventoryInner />
    </Suspense>
  );
}
