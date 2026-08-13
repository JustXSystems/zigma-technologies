'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_TOKENS,
  buildPreviewCss,
  mergeTokens,
  sanitizeCssOverride,
} from '@/lib/theme-tokens';
import TokenEditor from './TokenEditor';
import SiteCssEditor from './SiteCssEditor';
import ThemePreviewPane from './ThemePreviewPane';
import ThemeVersionHistory, { type ThemeHistoryRow } from './ThemeVersionHistory';

type Tab = 'tokens' | 'css';

export default function ThemeStudio() {
  const [tokens, setTokens] = useState<Record<string, string>>({ ...DEFAULT_THEME_TOKENS });
  const [cssText, setCssText] = useState('');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<Tab>('tokens');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ThemeHistoryRow[]>([]);
  const [publishedId, setPublishedId] = useState<number | null>(null);
  const [hasFullStylesheet, setHasFullStylesheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [debouncedCss, setDebouncedCss] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/theme');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setTokens(mergeTokens(data.tokens));
    setCssText(data.draft?.css_text || data.published?.css_text || '');
    setHistory(data.history || []);
    setPublishedId(data.published?.id || null);
    setHasFullStylesheet(Boolean(data.hasFullStylesheet));
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedCss(buildPreviewCss(tokens, cssText));
    }, 180);
    return () => window.clearTimeout(t);
  }, [tokens, cssText]);

  const previewCss = useMemo(
    () => debouncedCss || buildPreviewCss(tokens, cssText),
    [debouncedCss, tokens, cssText]
  );

  async function saveTokens() {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setTokens(mergeTokens(data.tokens));
      setMessage('Tokens saved. Live via /api/public/theme.css (cache ~30s).');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    setError('');
    setMessage('');
    const sanitized = sanitizeCssOverride(cssText);
    if (!sanitized.ok) {
      setError(sanitized.error);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css_text: sanitized.css, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(`Site CSS draft saved (id ${data.draftId}).`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    setError('');
    setMessage('');
    const sanitized = sanitizeCssOverride(cssText);
    if (!sanitized.ok) {
      setError(sanitized.error);
      return;
    }
    setSaving(true);
    try {
      const saveRes = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css_text: sanitized.css, notes: notes || 'full site CSS' }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Save failed');
      const pubRes = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: saveData.draftId, sync_files: true }),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) throw new Error(pubData.error || 'Publish failed');
      const sync = pubData.fileSync;
      const syncMsg = sync
        ? ` Disk sync: app=${sync.wroteApp ? 'yes' : 'no'}, public=${sync.wrotePublic ? 'yes' : 'no'}.`
        : '';
      setMessage(`Site CSS published.${syncMsg}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  async function publishId(id: number) {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: id, sync_files: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setMessage('Published selected stylesheet version.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  async function loadFromRepo() {
    setError('');
    setMessage('');
    if (cssText.trim().length > 500) {
      const ok = window.confirm(
        'Replace the editor with the current src/app/globals.css from the repo? Unsaved edits will be lost.'
      );
      if (!ok) return;
    }
    setLoadingRepo(true);
    try {
      const res = await fetch('/api/admin/theme/globals');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load globals.css');
      setCssText(data.css || '');
      setNotes('Loaded from src/app/globals.css');
      setTab('css');
      setMessage(
        `Loaded globals.css (${data.sections?.length || 0} sections, ${(data.bytes / 1024).toFixed(1)} KB). Save draft / publish when ready.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load globals.css');
    } finally {
      setLoadingRepo(false);
    }
  }

  function downloadCss() {
    const blob = new Blob([cssText], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zigma-globals-${new Date().toISOString().slice(0, 10)}.css`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="theme-studio">
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="theme-studio-intro admin-card">
        <div>
          <h2 style={{ margin: 0 }}>Theme Studio</h2>
          <p className="theme-help" style={{ marginBottom: 0 }}>
            Tokens for brand variables, plus the full site stylesheet (globals.css body) with section navigation,
            version history, and live preview.
            {hasFullStylesheet ? ' A full stylesheet is currently published.' : ' No full stylesheet published yet — Load from globals.css to start.'}
          </p>
        </div>
        <div className="theme-studio-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              setTokens({ ...DEFAULT_THEME_TOKENS });
              setMessage('Tokens reset to defaults (not saved yet).');
            }}
          >
            Reset tokens
          </button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={saveTokens}>
            Save tokens
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={saveDraft}>
            Save CSS draft
          </button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={publishDraft}>
            Publish CSS
          </button>
        </div>
      </div>

      <div className="theme-studio-grid theme-studio-grid--wide">
        <div className="theme-studio-controls">
          <div className="theme-tabs">
            <button
              type="button"
              className={tab === 'tokens' ? 'is-active' : ''}
              onClick={() => setTab('tokens')}
            >
              Tokens
            </button>
            <button type="button" className={tab === 'css' ? 'is-active' : ''} onClick={() => setTab('css')}>
              Site CSS (globals)
            </button>
          </div>

          <div className="admin-card theme-studio-panel theme-studio-panel--css">
            {tab === 'tokens' ? (
              <TokenEditor tokens={tokens} onChange={setTokens} />
            ) : (
              <SiteCssEditor
                value={cssText}
                notes={notes}
                onChange={setCssText}
                onNotesChange={setNotes}
                onLoadFromRepo={loadFromRepo}
                onDownload={downloadCss}
                loadingRepo={loadingRepo}
              />
            )}
          </div>

          <ThemeVersionHistory
            history={history}
            publishedId={publishedId}
            onPublish={publishId}
            onLoad={(row) => {
              if (typeof row.css_text === 'string') {
                setCssText(row.css_text);
                setNotes(row.notes || '');
                setTab('css');
                setMessage(`Loaded v${row.version} into editor.`);
              }
            }}
          />
        </div>

        <div className="theme-studio-preview-col admin-card">
          <h3 style={{ marginTop: 0 }}>Live preview</h3>
          <p className="theme-help">Draft stylesheet + tokens injected into the homepage iframe (not published yet).</p>
          <ThemePreviewPane previewCss={previewCss} path="/" />
        </div>
      </div>
    </div>
  );
}
