'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_THEME_TOKENS } from '@/lib/homepage-seed';

export default function ThemeAdminPage() {
  const [tokens, setTokens] = useState<Record<string, string>>({ ...DEFAULT_THEME_TOKENS });
  const [cssText, setCssText] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Array<{ id: number; version: number; status: string; notes: string | null }>>([]);
  const [publishedId, setPublishedId] = useState<number | null>(null);

  async function load() {
    const res = await fetch('/api/admin/theme');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setTokens(data.tokens || DEFAULT_THEME_TOKENS);
    setCssText(data.draft?.css_text || data.published?.css_text || '');
    setHistory(data.history || []);
    setPublishedId(data.published?.id || null);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function saveTokens() {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Theme tokens saved. Public CSS refreshed at /api/public/theme.css');
  }

  async function saveDraft() {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ css_text: cssText, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage(`Draft saved (id ${data.draftId}).`);
    await load();
  }

  async function publishLatestDraft() {
    setError('');
    setMessage('');
    const draft = history.find((h) => h.status === 'draft');
    if (!draft) {
      // save then publish
      const saveRes = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css_text: cssText, notes: notes || 'publish' }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error || 'Save failed');
        return;
      }
      const pubRes = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: saveData.draftId }),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        setError(pubData.error || 'Publish failed');
        return;
      }
    } else {
      const pubRes = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css_text: cssText, publish_id: draft.id }),
      });
      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        setError(pubData.error || 'Publish failed');
        return;
      }
    }
    setMessage('CSS override published.');
    await load();
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Theme tokens</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          These CSS variables are served via <code>/api/public/theme.css</code> and override the site theme.
        </p>
        <div className="admin-form-grid">
          {Object.entries(tokens).map(([key, value]) => (
            <div className="admin-field" key={key}>
              <label>{key}</label>
              <input
                className="admin-input"
                value={value}
                onChange={(e) => setTokens({ ...tokens, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button type="button" className="admin-btn admin-btn-primary" onClick={saveTokens}>
            Save tokens
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>globals.css overrides</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Append custom CSS without editing the source file. Draft → publish with version history.
          {publishedId ? ` Published override id: ${publishedId}.` : ' No published override yet.'}
        </p>
        <div className="admin-field" style={{ marginBottom: '0.8rem' }}>
          <label>Notes</label>
          <input className="admin-input" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%' }} />
        </div>
        <textarea
          className="admin-textarea"
          style={{ minHeight: 260, fontFamily: 'var(--admin-mono)', width: '100%' }}
          value={cssText}
          onChange={(e) => setCssText(e.target.value)}
          placeholder={'.cta-band{padding:7rem 0;}\n.btn-primary{border-radius:4px;}'}
        />
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={saveDraft}>
            Save draft
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={publishLatestDraft}>
            Publish
          </button>
        </div>
      </div>

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Version</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="admin-empty">
                  No CSS versions yet.
                </td>
              </tr>
            ) : (
              history.map((row) => (
                <tr key={row.id}>
                  <td>v{row.version}</td>
                  <td>
                    <span className={`admin-badge ${row.status === 'published' ? 'published' : 'draft'}`}>{row.status}</span>
                  </td>
                  <td>{row.notes || '—'}</td>
                  <td>
                    {row.status !== 'published' ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={async () => {
                          await fetch('/api/admin/theme', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ publish_id: row.id }),
                          });
                          setMessage(`Published v${row.version}`);
                          await load();
                        }}
                      >
                        Publish
                      </button>
                    ) : (
                      'Live'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
