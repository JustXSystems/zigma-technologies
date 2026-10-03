'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_THEME_TOKENS,
  TYPOGRAPHY_TOKEN_KEYS,
  buildPreviewCss,
  mergeTokens,
  pickTokens,
  sanitizeCssOverride,
  type ThemeTokenGroup,
} from '@/lib/theme-tokens';
import TokenEditor from './TokenEditor';
import SiteCssEditor from './SiteCssEditor';
import ThemePreviewPane from './ThemePreviewPane';
import ThemeVersionHistory, { type ThemeHistoryRow } from './ThemeVersionHistory';
import AdminFloatingActions from '@/components/admin/AdminFloatingActions';
import { useDirtyTracker } from '@/components/admin/unsaved-changes';

export type ThemeStudioView = 'tokens' | 'css';

/** The type scale is edited in Theme Studio → Typography. */
const COLOUR_GROUPS: readonly ThemeTokenGroup[] = ['brand', 'neutrals', 'layout'];

type Props = {
  view: ThemeStudioView;
  onViewChange: (view: ThemeStudioView) => void;
};

type ThemeData = {
  tokens?: unknown;
  draft?: { css_text?: string } | null;
  published?: { id?: number; css_text?: string } | null;
  history?: ThemeHistoryRow[];
  hasFullStylesheet?: boolean;
};

async function fetchTheme(): Promise<ThemeData> {
  const res = await fetch('/api/admin/theme');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load');
  return data;
}

/** Colour / layout tokens and the full site stylesheet, sharing one live preview. */
export default function ThemeStudio({ view, onViewChange }: Props) {
  const [tokens, setTokens] = useState<Record<string, string>>({ ...DEFAULT_THEME_TOKENS });
  const [cssText, setCssText] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<ThemeHistoryRow[]>([]);
  const [publishedId, setPublishedId] = useState<number | null>(null);
  const [hasFullStylesheet, setHasFullStylesheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [debouncedCss, setDebouncedCss] = useState('');
  const { markClean: markTokensClean } = useDirtyTracker(tokens);
  const { markClean: markCssClean } = useDirtyTracker(cssText);

  const apply = useCallback(
    (data: ThemeData) => {
      setTokens(mergeTokens(data.tokens));
      setCssText(data.draft?.css_text || data.published?.css_text || '');
      markTokensClean();
      markCssClean();
      setHistory(data.history || []);
      setPublishedId(data.published?.id || null);
      setHasFullStylesheet(Boolean(data.hasFullStylesheet));
    },
    [markTokensClean, markCssClean]
  );
  const load = useCallback(async () => apply(await fetchTheme()), [apply]);

  useEffect(() => {
    fetchTheme()
      .then(apply)
      .catch((e: Error) => setError(e.message));
  }, [apply]);

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
      const latest = await fetchTheme();
      const next = { ...tokens, ...pickTokens(mergeTokens(latest.tokens), TYPOGRAPHY_TOKEN_KEYS) };
      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setTokens(mergeTokens(data.tokens));
      markTokensClean();
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
      onViewChange('css');
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
    <div className="theme-studio admin-page-stack">
      <AdminFloatingActions status={message || (saving ? 'Saving…' : undefined)}>
        {view === 'tokens' ? (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => {
                setTokens((prev) => ({ ...DEFAULT_THEME_TOKENS, ...pickTokens(prev, TYPOGRAPHY_TOKEN_KEYS) }));
                setMessage('Colours and layout reset to defaults (not saved yet).');
              }}
            >
              Reset tokens
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void saveTokens()}>
              Save tokens
            </button>
          </>
        ) : (
          <>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={() => void saveDraft()}>
              Save CSS draft
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => void publishDraft()}>
              Publish CSS
            </button>
          </>
        )}
      </AdminFloatingActions>

      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="theme-studio-grid theme-studio-grid--wide">
        <div className="theme-studio-controls">
          <div className="admin-card theme-studio-panel theme-studio-panel--css">
            {view === 'tokens' ? (
              <TokenEditor tokens={tokens} onChange={setTokens} groups={COLOUR_GROUPS} />
            ) : (
              <>
                <p className="theme-help" style={{ marginTop: 0 }}>
                  {hasFullStylesheet
                    ? 'A full stylesheet is currently published.'
                    : 'No full stylesheet published yet — Load from globals.css to start.'}
                </p>
                <SiteCssEditor
                  value={cssText}
                  notes={notes}
                  onChange={setCssText}
                  onNotesChange={setNotes}
                  onLoadFromRepo={loadFromRepo}
                  onDownload={downloadCss}
                  loadingRepo={loadingRepo}
                />
              </>
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
                onViewChange('css');
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
