'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  CatalogItem,
  CatalogCategory,
  CatalogItemType,
  CatalogMedia,
  CatalogShadowStyle,
} from '@/lib/types';
import {
  CATALOG_SHADOW_STYLE_OPTIONS,
  DEFAULT_DETAIL_GALLERY_SHADOW,
  DEFAULT_MEDIA_FIT_PERCENT,
  normalizeShadowStyle,
} from '@/lib/types';
import { buildCaseStudyJson, caseStudyToEditor } from '@/lib/catalog-case-study';
import { getBrochureUrl, withBrochureUrl } from '@/lib/catalog-brochure';
import MediaPicker from '@/components/admin/MediaPicker';
import CatalogMediaGallery from '@/components/CatalogMediaGallery';
import { publicMediaUrl } from '@/lib/media-url';

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
  const [attachFitToSpace, setAttachFitToSpace] = useState(true);
  const [attachFitPercent, setAttachFitPercent] = useState(DEFAULT_MEDIA_FIT_PERCENT);
  const [attachShadow, setAttachShadow] = useState<CatalogShadowStyle>('medium');
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [backgroundShading, setBackgroundShading] = useState<CatalogShadowStyle>('medium');
  const [backgroundFitToSpace, setBackgroundFitToSpace] = useState(false);
  const [backgroundFitPercent, setBackgroundFitPercent] = useState(100);
  const [mediaMsg, setMediaMsg] = useState('');
  const [savingBackground, setSavingBackground] = useState(false);
  const [savingMediaFitId, setSavingMediaFitId] = useState<number | null>(null);
  const [previewMediaBg, setPreviewMediaBg] = useState('#ffffff');
  const [previewDetailShadow, setPreviewDetailShadow] = useState<CatalogShadowStyle>(DEFAULT_DETAIL_GALLERY_SHADOW);
  const [previewSurface, setPreviewSurface] = useState<'detail' | 'card'>('detail');
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<'basics' | 'commerce' | 'case'>('basics');

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
    setEditorTab('basics');
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
    setEditorTab('basics');
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
        background_image_url: item.background_image_url,
        background_shading_style: item.background_shading_style,
        media_fit_to_space: item.media_fit_to_space,
        media_fit_percent: item.media_fit_percent,
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

  async function openMedia(item: CatalogItem, opts?: { resetBackground?: boolean }) {
    const switching = mediaItem?.id !== item.id;
    setMediaItem(item);
    setMediaMsg('');
    setAttachUrl('');
    setSelectedMediaId(null);
    if (opts?.resetBackground !== false && (switching || !mediaItem)) {
      setBackgroundUrl(item.background_image_url || '');
      setBackgroundShading(item.background_shading_style || 'medium');
      setBackgroundFitToSpace(item.background_fit_to_space === true);
      setBackgroundFitPercent(item.background_fit_percent || 100);
      setAttachFitToSpace(item.media_fit_to_space !== false);
      setAttachFitPercent(item.media_fit_percent || DEFAULT_MEDIA_FIT_PERCENT);
      setAttachShadow('medium');
    }
    const [mediaRes, settingsRes] = await Promise.all([
      fetch(`/api/admin/catalog/${item.id}/media`),
      fetch(`/api/admin/catalog-settings?type=${type}`),
    ]);
    const data = await mediaRes.json();
    if (mediaRes.ok) {
      const media = (data.media || []) as CatalogMedia[];
      setItemMedia(media);
      const primary =
        media.find((m) => m.is_primary && m.kind !== 'video') || media.find((m) => m.kind !== 'video');
      if (primary && opts?.resetBackground !== false && (switching || !mediaItem)) {
        setAttachUrl(primary.url);
        setAttachFitToSpace(primary.fit_to_space !== false);
        setAttachFitPercent(primary.fit_percent || DEFAULT_MEDIA_FIT_PERCENT);
        setAttachShadow(primary.shadow_style || 'medium');
        setSelectedMediaId(primary.id);
      }
    } else setError(data.error || 'Failed to load media');

    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      const s = settingsData.settings;
      setPreviewMediaBg(s?.card_media_bg_color || '#ffffff');
      setPreviewDetailShadow(normalizeShadowStyle(s?.detail_gallery_shadow ?? DEFAULT_DETAIL_GALLERY_SHADOW));
    }
  }

  function focusMedia(m: CatalogMedia) {
    setSelectedMediaId(m.id);
    setAttachUrl(m.url);
    if (m.kind !== 'video') {
      setAttachFitToSpace(m.fit_to_space !== false);
      setAttachFitPercent(m.fit_percent || DEFAULT_MEDIA_FIT_PERCENT);
      setAttachShadow(m.shadow_style || 'medium');
    }
  }

  function productPresentationDirty() {
    if (!selectedMediaId) return false;
    const m = itemMedia.find((x) => x.id === selectedMediaId);
    if (!m || m.kind === 'video') return false;
    return (
      attachFitToSpace !== (m.fit_to_space !== false) ||
      attachFitPercent !== (m.fit_percent || DEFAULT_MEDIA_FIT_PERCENT) ||
      attachShadow !== (m.shadow_style || 'medium')
    );
  }

  function mediaPresentationDirty(item: CatalogItem) {
    return (
      backgroundUrl !== (item.background_image_url || '') ||
      backgroundShading !== (item.background_shading_style || 'medium') ||
      backgroundFitToSpace !== (item.background_fit_to_space === true) ||
      backgroundFitPercent !== (item.background_fit_percent || 100)
    );
  }

  async function saveMediaPresentation(url: string | null) {
    if (!mediaItem) return;
    setSavingBackground(true);
    setMediaMsg('');
    try {
      const normalized = url ? url.trim() : null;
      const res = await fetch(`/api/admin/catalog/${mediaItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background_image_url: normalized,
          background_shading_style: backgroundShading,
          background_fit_to_space: backgroundFitToSpace,
          background_fit_percent: backgroundFitPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save media presentation');
      const nextUrl = data.item?.background_image_url || '';
      const nextShading = (data.item?.background_shading_style || backgroundShading) as CatalogShadowStyle;
      const nextBgFit = data.item?.background_fit_to_space === true;
      const nextBgPct = Number(data.item?.background_fit_percent) || backgroundFitPercent;
      setBackgroundUrl(nextUrl);
      setBackgroundShading(nextShading);
      setBackgroundFitToSpace(nextBgFit);
      setBackgroundFitPercent(nextBgPct);
      setMediaItem({
        ...mediaItem,
        background_image_url: nextUrl || null,
        background_shading_style: nextShading,
        background_fit_to_space: nextBgFit,
        background_fit_percent: nextBgPct,
      });
      setMediaMsg(nextUrl ? 'Background presentation saved.' : 'Background cleared; shadow & fit saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save media presentation');
    } finally {
      setSavingBackground(false);
    }
  }

  async function attachLibraryMedia(url: string, isPrimary = false) {
    if (!mediaItem || !url) return;
    setMediaMsg('');
    const res = await fetch(`/api/admin/catalog/${mediaItem.id}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        is_primary: isPrimary || itemMedia.length === 0,
        fit_to_space: attachFitToSpace,
        fit_percent: attachFitPercent,
        shadow_style: attachShadow,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Attach failed');
      return;
    }
    setMediaMsg('Attached with fit settings.');
    setAttachUrl('');
    await openMedia(mediaItem, { resetBackground: false });
    await load();
  }

  async function saveAttachedMediaFit(
    mediaId: number,
    fitToSpace: boolean,
    fitPercent: number,
    shadowStyle: CatalogShadowStyle
  ) {
    if (!mediaItem) return;
    setSavingMediaFitId(mediaId);
    setMediaMsg('');
    try {
      const res = await fetch(`/api/admin/catalog/${mediaItem.id}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_fit',
          media_id: mediaId,
          fit_to_space: fitToSpace,
          fit_percent: fitPercent,
          shadow_style: shadowStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save presentation');
      setItemMedia(data.media || []);
      setMediaMsg('Image shadow & fit saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save presentation');
    } finally {
      setSavingMediaFitId(null);
    }
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
    await openMedia(mediaItem, { resetBackground: false });
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
            className="admin-modal admin-modal--lg"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveItem}
          >
            <div className="admin-modal-header">
              <div className="admin-modal-header-text">
                <h2>{editor.id ? `Edit ${type}` : `New ${type}`}</h2>
                <p>Core fields, commerce details, and optional case-study page content.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setEditorOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="admin-modal-tabs" role="tablist">
              {(
                [
                  { id: 'basics', label: 'Basics' },
                  { id: 'commerce', label: 'Commerce' },
                  { id: 'case', label: 'Case study' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={`admin-modal-tab${editorTab === tab.id ? ' is-active' : ''}`}
                  aria-selected={editorTab === tab.id}
                  onClick={() => setEditorTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="admin-modal-body">
              {editorTab === 'basics' ? (
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
                    <label>Status</label>
                    <select className="admin-select" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as 'draft' | 'published' })}>
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                    </select>
                  </div>
                  <div className="admin-field">
                    <label>Tags (comma separated)</label>
                    <input className="admin-input" value={editor.tags} onChange={(e) => setEditor({ ...editor, tags: e.target.value })} />
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
                  <div className="admin-field full">
                    <label>Specs (one per line: Key: Value)</label>
                    <textarea className="admin-textarea" value={editor.specs} onChange={(e) => setEditor({ ...editor, specs: e.target.value })} />
                  </div>
                </div>
              ) : null}

              {editorTab === 'commerce' ? (
                <div className="admin-form-grid">
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
                </div>
              ) : null}

              {editorTab === 'case' ? (
                <div className="admin-form-grid">
                  <div className="admin-field full">
                    <label>
                      <input
                        type="checkbox"
                        checked={editor.case_study_enabled}
                        onChange={(e) => setEditor({ ...editor, case_study_enabled: e.target.checked })}
                      />{' '}
                      Enable case study page at /{type}s/&lt;slug&gt;
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
              ) : null}
            </div>
            <div className="admin-modal-footer">
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
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="admin-modal-header-text">
                <h2>Media · {mediaItem.title}</h2>
                <p>
                  Frame controls the listing card. Product controls the Quick view image. Preview updates live.
                </p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setMediaItem(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="admin-modal-body admin-modal-body--flush">
              {mediaMsg ? <div className="admin-success" style={{ margin: '0.85rem 1.15rem 0' }}>{mediaMsg}</div> : null}

              <div className="admin-media-studio">
                <div className="admin-media-controls">
                  <section className="admin-media-block">
                    <div className="admin-media-block-head">
                      <h3>Frame</h3>
                      <span>Listing card</span>
                    </div>
                    <MediaPicker value={backgroundUrl} onChange={setBackgroundUrl} label="Background image" compact />
                    <div className="admin-media-controls-grid">
                      <div className="admin-field">
                        <label htmlFor="bg-shadow">Shadow</label>
                        <select
                          id="bg-shadow"
                          className="admin-select"
                          value={backgroundShading}
                          onChange={(e) => setBackgroundShading(e.target.value as CatalogShadowStyle)}
                        >
                          {CATALOG_SHADOW_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="admin-field">
                        <label htmlFor="bg-fit-pct">Fit %</label>
                        <input
                          id="bg-fit-pct"
                          className="admin-input"
                          type="number"
                          min={20}
                          max={100}
                          step={1}
                          disabled={!backgroundFitToSpace}
                          value={backgroundFitPercent}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n)) return;
                            setBackgroundFitPercent(Math.min(100, Math.max(20, Math.round(n))));
                          }}
                        />
                      </div>
                    </div>
                    <div className="admin-media-fit-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={backgroundFitToSpace}
                          onChange={(e) => setBackgroundFitToSpace(e.target.checked)}
                        />
                        Fit to space
                      </label>
                    </div>
                    <div className="admin-media-block-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        disabled={savingBackground || !mediaPresentationDirty(mediaItem)}
                        onClick={() => saveMediaPresentation(backgroundUrl.trim() || null)}
                      >
                        {savingBackground ? 'Saving…' : 'Save frame'}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={savingBackground || (!backgroundUrl && !mediaItem.background_image_url)}
                        onClick={() => {
                          setBackgroundUrl('');
                          void saveMediaPresentation(null);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </section>

                  <section className="admin-media-block">
                    <div className="admin-media-block-head">
                      <h3>Product</h3>
                      <span>{selectedMediaId ? 'Editing selected' : 'Attach new'}</span>
                    </div>
                    <MediaPicker
                      value={attachUrl}
                      onChange={(url) => {
                        setAttachUrl(url);
                        const match = itemMedia.find((m) => m.url === url);
                        setSelectedMediaId(match?.id ?? null);
                        if (match && match.kind !== 'video') {
                          setAttachFitToSpace(match.fit_to_space !== false);
                          setAttachFitPercent(match.fit_percent || DEFAULT_MEDIA_FIT_PERCENT);
                          setAttachShadow(match.shadow_style || 'medium');
                        }
                      }}
                      label="Image or URL"
                      compact
                    />
                    <div className="admin-media-controls-grid">
                      <div className="admin-field">
                        <label htmlFor="attach-shadow">Shadow</label>
                        <select
                          id="attach-shadow"
                          className="admin-select"
                          value={attachShadow}
                          onChange={(e) => setAttachShadow(e.target.value as CatalogShadowStyle)}
                        >
                          {CATALOG_SHADOW_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="admin-field">
                        <label htmlFor="attach-fit-pct">Fit %</label>
                        <input
                          id="attach-fit-pct"
                          className="admin-input"
                          type="number"
                          min={20}
                          max={100}
                          step={1}
                          disabled={!attachFitToSpace}
                          value={attachFitPercent}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            if (!Number.isFinite(n)) return;
                            setAttachFitPercent(Math.min(100, Math.max(20, Math.round(n))));
                          }}
                        />
                      </div>
                    </div>
                    <div className="admin-media-fit-row">
                      <label>
                        <input
                          type="checkbox"
                          checked={attachFitToSpace}
                          onChange={(e) => setAttachFitToSpace(e.target.checked)}
                        />
                        Fit to space
                      </label>
                    </div>
                    <div className="admin-media-block-actions">
                      {selectedMediaId ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          disabled={!productPresentationDirty() || savingMediaFitId === selectedMediaId}
                          onClick={() =>
                            saveAttachedMediaFit(selectedMediaId, attachFitToSpace, attachFitPercent, attachShadow)
                          }
                        >
                          {savingMediaFitId === selectedMediaId ? 'Saving…' : 'Save product'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          disabled={!attachUrl}
                          onClick={() => attachLibraryMedia(attachUrl)}
                        >
                          Attach
                        </button>
                      )}
                      <label className="admin-btn admin-btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                        Upload
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
                              await openMedia(mediaItem, { resetBackground: false });
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
                  </section>
                </div>

                <div className="admin-media-preview-pane">
                  <MediaPresentationPreview
                    title={mediaItem.title}
                    surface={previewSurface}
                    onSurfaceChange={setPreviewSurface}
                    backgroundUrl={backgroundUrl}
                    backgroundShadow={backgroundShading}
                    backgroundFit={backgroundFitToSpace}
                    backgroundFitPercent={backgroundFitPercent}
                    productUrl={attachUrl}
                    productShadow={attachShadow}
                    productFit={attachFitToSpace}
                    productFitPercent={attachFitPercent}
                    mediaList={itemMedia}
                    mediaBgColor={previewMediaBg}
                    detailGalleryShadow={previewDetailShadow}
                    onSelectMedia={focusMedia}
                  />
                </div>
              </div>

              <div className="admin-media-assets">
                <div className="admin-media-assets-head">
                  <h3>Attached</h3>
                  <span>
                    {itemMedia.length === 0
                      ? 'None yet — upload or attach above'
                      : `${itemMedia.length} asset${itemMedia.length === 1 ? '' : 's'} · click to edit`}
                  </span>
                </div>
                {itemMedia.length === 0 ? null : (
                  <div className="admin-media-list">
                    {itemMedia.map((m, idx) => (
                      <AttachedMediaCard
                        key={m.id}
                        media={m}
                        index={idx}
                        total={itemMedia.length}
                        selected={selectedMediaId === m.id}
                        onSelect={() => focusMedia(m)}
                        onSetPrimary={() => setPrimaryMedia(m.id)}
                        onMove={(dir) => moveMedia(m.id, dir)}
                        onRemove={() => removeMedia(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setMediaItem(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaPresentationPreview({
  title,
  surface,
  onSurfaceChange,
  backgroundUrl,
  backgroundShadow,
  backgroundFit,
  backgroundFitPercent,
  productUrl,
  productShadow,
  productFit,
  productFitPercent,
  mediaList,
  mediaBgColor,
  detailGalleryShadow,
  onSelectMedia,
}: {
  title: string;
  surface: 'detail' | 'card';
  onSurfaceChange: (next: 'detail' | 'card') => void;
  backgroundUrl: string;
  backgroundShadow: CatalogShadowStyle;
  backgroundFit: boolean;
  backgroundFitPercent: number;
  productUrl: string;
  productShadow: CatalogShadowStyle;
  productFit: boolean;
  productFitPercent: number;
  mediaList: CatalogMedia[];
  mediaBgColor: string;
  detailGalleryShadow: CatalogShadowStyle;
  onSelectMedia: (m: CatalogMedia) => void;
}) {
  const bg = backgroundUrl.trim();
  const product = productUrl.trim();
  const bgPct = Math.min(100, Math.max(20, backgroundFitPercent || 100));
  const productPct = Math.min(100, Math.max(20, productFitPercent || DEFAULT_MEDIA_FIT_PERCENT));
  const frameShadow = normalizeShadowStyle(surface === 'detail' ? detailGalleryShadow : backgroundShadow);
  const bgLabel = CATALOG_SHADOW_STYLE_OPTIONS.find((o) => o.value === backgroundShadow)?.label || backgroundShadow;
  const productLabel = CATALOG_SHADOW_STYLE_OPTIONS.find((o) => o.value === productShadow)?.label || productShadow;
  const detailLabel =
    CATALOG_SHADOW_STYLE_OPTIONS.find((o) => o.value === detailGalleryShadow)?.label || detailGalleryShadow;
  const fill = mediaBgColor?.trim() || '#ffffff';

  const galleryMedia = useMemo(() => {
    const fromList = mediaList.map((m, idx) => {
      const isActive = product ? m.url === product : !!m.is_primary;
      return {
        ...m,
        is_primary: isActive ? 1 : 0,
        sort_order: isActive ? -1 : m.sort_order ?? idx,
        shadow_style: isActive ? productShadow : m.shadow_style || 'medium',
        fit_to_space: isActive ? productFit : m.fit_to_space !== false,
        fit_percent: isActive ? productPct : m.fit_percent || DEFAULT_MEDIA_FIT_PERCENT,
      } satisfies CatalogMedia;
    });

    if (product && !fromList.some((m) => m.url === product)) {
      fromList.unshift({
        id: -1,
        item_id: 0,
        kind: /\.(mp4|webm|mov)(\?|$)/i.test(product) ? 'video' : 'image',
        url: product,
        alt: title,
        sort_order: -1,
        is_primary: 1,
        shadow_style: productShadow,
        fit_to_space: productFit,
        fit_percent: productPct,
      });
    }

    if (!fromList.length && product) {
      return [
        {
          id: -1,
          item_id: 0,
          kind: 'image' as const,
          url: product,
          alt: title,
          sort_order: 0,
          is_primary: 1,
          shadow_style: productShadow,
          fit_to_space: productFit,
          fit_percent: productPct,
        },
      ];
    }

    return fromList.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order);
  }, [mediaList, product, productShadow, productFit, productPct, title]);

  const active = galleryMedia.find((m) => m.url === product) || galleryMedia[0];
  const cardBgCss = bg
    ? encodeURI(publicMediaUrl(bg)).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    : '';
  const useCardProductFit = productFit;

  return (
    <div className="admin-media-preview">
      <div className="admin-media-preview-label">
        <div className="admin-media-preview-tabs">
          <button
            type="button"
            className={surface === 'detail' ? 'is-active' : ''}
            onClick={() => onSurfaceChange('detail')}
          >
            Detail popup
          </button>
          <button
            type="button"
            className={surface === 'card' ? 'is-active' : ''}
            onClick={() => onSurfaceChange('card')}
          >
            Listing card
          </button>
        </div>
        <span className="admin-media-preview-meta">Live</span>
      </div>

      <div className="admin-media-preview-stats">
        <span>Frame {surface === 'detail' ? detailLabel : bgLabel}</span>
        <span>
          BG {bg ? (backgroundFit ? `${bgPct}%` : 'cover') : 'none'}
        </span>
        <span>
          Product {product ? `${productLabel} · ${productFit ? `${productPct}%` : 'cover'}` : 'none'}
        </span>
        <span>Fill {fill}</span>
      </div>

      <div
        className={`admin-media-preview-viewport admin-media-preview-viewport--${surface} admin-media-preview--bg-shade-${frameShadow}`}
        style={{ ['--catalog-card-media-bg']: fill } as CSSProperties}
      >
        {surface === 'detail' ? (
          <div className="admin-media-preview-detail">
            <CatalogMediaGallery
              media={galleryMedia}
              title={title}
              variant="detail"
              backgroundImageUrl={bg || null}
              backgroundShadingStyle={backgroundShadow}
              frameShadowStyle={detailGalleryShadow}
              backgroundFitToSpace={backgroundFit}
              backgroundFitPercent={bgPct}
              mediaFitToSpace={productFit}
              mediaFitPercent={productPct}
              mediaBgColor={fill}
              showThumbs={false}
            />
          </div>
        ) : (
          <div
            className={`admin-media-preview-card catalog-card-media${bg ? ' catalog-card-media--has-bg' : ''} catalog-card-media--bg-shade-${backgroundShadow}${
              bg ? (productFit ? ' catalog-card-media--product-fit' : ' catalog-card-media--product-cover') : ''
            }${productFit ? ` catalog-card-media--product-shade-${productShadow}` : ''}`}
            style={{
              backgroundColor: fill,
              ...(cardBgCss
                ? {
                    backgroundImage: `url("${cardBgCss}")`,
                    backgroundSize: backgroundFit ? `${bgPct}% auto` : 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : null),
              ...(useCardProductFit ? ({ ['--catalog-media-fit']: `${productPct}%` } as CSSProperties) : null),
            }}
          >
            {active ? (
              active.kind === 'video' ? (
                <video
                  src={publicMediaUrl(active.url)}
                  muted
                  playsInline
                  className="admin-media-preview-card-media"
                  style={{ backgroundColor: fill }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={publicMediaUrl(active.url)}
                  alt=""
                  className={`admin-media-preview-card-media${productFit ? ' is-fit' : ' is-cover'}`}
                  style={{
                    backgroundColor: fill,
                    ...(productFit ? { maxWidth: `${productPct}%`, maxHeight: `${productPct}%` } : null),
                  }}
                />
              )
            ) : (
              <div className="admin-media-preview-empty">
                {bg
                  ? 'Select or attach a product image to preview its shadow & fit.'
                  : 'Choose a background and/or product image — preview updates live.'}
              </div>
            )}
          </div>
        )}
      </div>

      {mediaList.length > 1 ? (
        <div className="admin-media-preview-thumbs" role="list">
          {mediaList.map((m) => {
            const selected = product ? m.url === product : !!m.is_primary;
            return (
              <button
                key={m.id}
                type="button"
                role="listitem"
                className={`admin-media-preview-thumb${selected ? ' is-active' : ''}`}
                onClick={() => onSelectMedia(m)}
                title={m.kind === 'video' ? 'Video' : m.alt || m.url}
              >
                {m.kind === 'video' ? (
                  <>
                    <video src={publicMediaUrl(m.url)} muted className="admin-media-preview-thumb-media" />
                    <span className="admin-media-preview-thumb-play">▶</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicMediaUrl(m.url)} alt="" className="admin-media-preview-thumb-media" />
                )}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AttachedMediaCard({
  media: m,
  index: idx,
  total,
  selected,
  onSelect,
  onSetPrimary,
  onMove,
  onRemove,
}: {
  media: CatalogMedia;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onSetPrimary: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`admin-media-card${m.is_primary ? ' is-primary' : ''}${selected ? ' is-selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {m.kind === 'video' ? (
        <video src={publicMediaUrl(m.url)} muted className="admin-media-card-thumb" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicMediaUrl(m.url)} alt={m.alt || ''} className="admin-media-card-thumb" />
      )}
      <div className="admin-media-card-meta">
        <strong>
          {m.kind === 'video' ? 'Video' : 'Image'}
          {m.is_primary ? ' · Thumbnail' : ''}
        </strong>
        <span>{selected ? 'Editing in Product panel' : 'Click to edit presentation'}</span>
      </div>
      <div className="admin-media-card-actions" onClick={(e) => e.stopPropagation()}>
        {m.kind !== 'video' && !m.is_primary ? (
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onSetPrimary} title="Set as thumbnail">
            ★
          </button>
        ) : null}
        <button type="button" className="admin-btn admin-btn-secondary" disabled={idx === 0} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          disabled={idx === total - 1}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button type="button" className="admin-btn admin-btn-danger" onClick={onRemove}>
          ✕
        </button>
      </div>
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
