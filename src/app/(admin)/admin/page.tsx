'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { navGroupsFromScreens } from '@/lib/admin-screens';
import { useAdminUser } from '@/components/admin/admin-session';

type Counts = {
  items: number;
  newEnquiries: number;
  published: number;
  pages: number;
  media: number;
};

type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  action: string | null;
};

export default function AdminDashboardPage() {
  const user = useAdminUser();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [dashRes, setupRes] = await Promise.all([
      fetch('/api/admin/dashboard'),
      fetch('/api/admin/setup'),
    ]);
    const dash = await dashRes.json();
    const setup = await setupRes.json();
    if (!dashRes.ok) throw new Error(dash.error || 'Failed to load dashboard');
    if (!setupRes.ok) throw new Error(setup.error || 'Failed to load setup');
    setCounts(dash);
    setChecklist(setup.checklist || []);
    setComplete(!!setup.complete);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function runAction(action: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/setup/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      setMessage(data.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success" style={{ whiteSpace: 'pre-wrap' }}>{message}</div> : null}

      <div className="admin-grid-stats">
        <div className="admin-stat">
          <div className="label">Catalog items</div>
          <div className="value">{counts?.items ?? '—'}</div>
        </div>
        <div className="admin-stat">
          <div className="label">Published</div>
          <div className="value">{counts?.published ?? '—'}</div>
        </div>
        <div className="admin-stat">
          <div className="label">New enquiries</div>
          <div className="value">{counts?.newEnquiries ?? '—'}</div>
        </div>
        <div className="admin-stat">
          <div className="label">CMS pages</div>
          <div className="value">{counts?.pages ?? '—'}</div>
        </div>
        <div className="admin-stat">
          <div className="label">Media assets</div>
          <div className="value">{counts?.media ?? '—'}</div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Setup checklist</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
              {complete ? 'All core content seeds look complete.' : 'Seed missing pieces, or run bootstrap once.'}
            </p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={busy}
            onClick={() => runAction('bootstrap')}
          >
            {busy ? 'Working…' : 'Bootstrap missing seeds'}
          </button>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.55rem' }}>
          {checklist.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.8rem',
                padding: '0.65rem 0.8rem',
                borderRadius: 8,
                border: '1px solid var(--admin-border, #e5e7eb)',
                background: item.done ? 'var(--admin-success-soft)' : 'var(--admin-panel-2)',
              }}
            >
              <div>
                <strong style={{ marginRight: 8 }}>{item.done ? '✓' : '○'}</strong>
                {item.label}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Link className="admin-btn admin-btn-secondary" href={item.href}>
                  Open
                </Link>
                {!item.done && item.action ? (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    disabled={busy}
                    onClick={() => runAction(item.action!)}
                  >
                    Seed
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {user ? (
        <div className="admin-card">
          <h2 style={{ marginTop: 0, marginBottom: '0.25rem', fontSize: '1.05rem' }}>Where to edit what</h2>
          <p style={{ margin: '0 0 0.9rem', color: 'var(--admin-muted)', fontSize: '0.88rem' }}>
            Or press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere in the admin and type what you are looking for.
          </p>
          {navGroupsFromScreens(user.screens)
            .filter((g) => g.label !== 'Overview')
            .map((group) => (
              <section key={group.label} className="admin-shortcut-group">
                <h3>{group.label}</h3>
                <div className="admin-shortcuts">
                  {group.items.map((screen) => (
                    <Link key={screen.key} className="admin-shortcut" href={screen.href}>
                      <strong>{screen.label}</strong>
                      <span>{screen.summary}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      ) : null}
    </div>
  );
}
