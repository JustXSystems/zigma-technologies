'use client';

import { FormEvent, useEffect, useState } from 'react';

type Item = {
  id: number;
  quote: string;
  author_name: string;
  author_role: string | null;
  company: string | null;
  rating: number | null;
  status: 'draft' | 'published';
  featured: number;
};

const empty = {
  quote: '',
  author_name: '',
  author_role: '',
  company: '',
  rating: '5',
  status: 'published' as 'draft' | 'published',
  featured: true,
};

export default function TestimonialsAdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [editor, setEditor] = useState({ ...empty, id: 0 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const res = await fetch('/api/admin/testimonials');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload = {
      quote: editor.quote,
      author_name: editor.author_name,
      author_role: editor.author_role || null,
      company: editor.company || null,
      rating: Number(editor.rating) || null,
      status: editor.status,
      featured: editor.featured,
      enabled: true,
    };
    const res = await fetch(editor.id ? `/api/admin/testimonials/${editor.id}` : '/api/admin/testimonials', {
      method: editor.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save failed');
      return;
    }
    setMessage('Saved');
    setEditor({ ...empty, id: 0 });
    await load();
  }

  async function seed() {
    const res = await fetch('/api/admin/testimonials/seed', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Seed failed');
      return;
    }
    setMessage(`Seeded ${data.created}`);
    await load();
  }

  return (
    <div className="admin-card">
      <div className="admin-toolbar" style={{ marginBottom: '0.8rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Testimonials</h2>
          <p style={{ color: 'var(--admin-muted)', margin: '0.35rem 0 0' }}>
            Public reviews with AggregateRating JSON-LD. Run <code>scripts/migrate-testimonials.sql</code> once.
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={seed}>
          Seed samples
        </button>
      </div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}
      <form className="admin-form-grid" onSubmit={save}>
        <div className="admin-field full">
          <label>Quote</label>
          <textarea className="admin-textarea" value={editor.quote} onChange={(e) => setEditor({ ...editor, quote: e.target.value })} required />
        </div>
        <div className="admin-field">
          <label>Author</label>
          <input className="admin-input" value={editor.author_name} onChange={(e) => setEditor({ ...editor, author_name: e.target.value })} required />
        </div>
        <div className="admin-field">
          <label>Role</label>
          <input className="admin-input" value={editor.author_role} onChange={(e) => setEditor({ ...editor, author_role: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Company</label>
          <input className="admin-input" value={editor.company} onChange={(e) => setEditor({ ...editor, company: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Rating 1–5</label>
          <input className="admin-input" value={editor.rating} onChange={(e) => setEditor({ ...editor, rating: e.target.value })} />
        </div>
        <div className="admin-field full">
          <button type="submit" className="admin-btn">
            {editor.id ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
      <div className="admin-table-wrap" style={{ marginTop: '1rem' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Author</th>
              <th>Quote</th>
              <th>Rating</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.author_name}</td>
                <td>{item.quote.slice(0, 80)}…</td>
                <td>{item.rating || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() =>
                      setEditor({
                        id: item.id,
                        quote: item.quote,
                        author_name: item.author_name,
                        author_role: item.author_role || '',
                        company: item.company || '',
                        rating: String(item.rating || 5),
                        status: item.status,
                        featured: !!item.featured,
                      })
                    }
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
