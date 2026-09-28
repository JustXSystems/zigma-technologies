'use client';

import { useState } from 'react';
import { NAP_TOKENS } from '@/lib/nap';
import type { NapLinkChange, NapLinkReport } from '@/lib/nap-link';

export default function NapLinkPanel() {
  const [changes, setChanges] = useState<NapLinkChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function run(method: 'GET' | 'POST') {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const res = await fetch('/api/admin/nap-link', { method });
      const data = (await res.json()) as NapLinkReport & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Request failed');
      if (data.applied) {
        setChanges(null);
        setStatus(`Linked ${data.changes.length} field(s). They now follow the values above.`);
      } else {
        setChanges(data.changes);
        setStatus(data.changes.length ? '' : 'Nothing to link: menus and pages already use these details.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-field full" style={{ marginTop: '1.25rem' }}>
      <label>Use these details everywhere</label>
      <p className="theme-help" style={{ margin: '0.25rem 0 0.5rem' }}>
        Menus (Navigation) and page sections (Pages) can show the details from this page instead of typed copies.
        Type a placeholder in any label, link or text there, e.g. <code>{'{{phone}}'}</code> as a label and{' '}
        <code>{'tel:{{phone}}'}</code> as its link. Save the details here first, then scan to replace typed copies of
        these phone numbers and emails, the head-office address and the contact-form hours.
      </p>
      <p className="theme-help" style={{ margin: '0 0 0.75rem' }}>
        Placeholders:{' '}
        {NAP_TOKENS.map((t, i) => (
          <span key={t.token}>
            {i ? ', ' : ''}
            <code>{`{{${t.token}}}`}</code> {t.label.toLowerCase()}
          </span>
        ))}
        .
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void run('GET')}>
          {busy ? 'Working…' : 'Scan menus & pages'}
        </button>
        {changes?.length ? (
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void run('POST')}>
            Link {changes.length} field(s)
          </button>
        ) : null}
      </div>
      {error ? <div className="admin-error" style={{ marginTop: '0.75rem' }}>{error}</div> : null}
      {status ? <div className="admin-success" style={{ marginTop: '0.75rem' }}>{status}</div> : null}
      {changes?.length ? (
        <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Where</th>
                <th>Now typed</th>
                <th>Becomes</th>
                <th>Visitors will see</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={`${c.target}-${c.field}-${i}`}>
                  <td>
                    {c.target}
                    <br />
                    <small style={{ color: 'var(--admin-muted)' }}>{c.field}</small>
                  </td>
                  <td>{c.before}</td>
                  <td>{c.after}</td>
                  <td>{c.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
