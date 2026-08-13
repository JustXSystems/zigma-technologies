'use client';

import { FormEvent, useEffect, useState } from 'react';

type User = { id: number; email: string; name: string; company: string | null };
type Doc = { id: number; title: string; description: string | null; file_url: string; doc_type: string; enabled: number };

export default function PartnersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [userForm, setUserForm] = useState({ email: '', name: '', password: '', company: '' });
  const [docForm, setDocForm] = useState({ title: '', description: '', file_url: '', doc_type: 'price_list' });

  async function load() {
    const res = await fetch('/api/admin/partners');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    setUsers(data.users || []);
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await post({ action: 'create_user', ...userForm });
      setMessage('Partner user created');
      setUserForm({ email: '', name: '', password: '', company: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function createDoc(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await post({ action: 'create_doc', ...docForm });
      setMessage('Document added');
      setDocForm({ title: '', description: '', file_url: '', doc_type: 'price_list' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <button
          type="button"
          className="admin-btn"
          onClick={() =>
            post({ action: 'seed_docs' })
              .then((d) => setMessage(d.skipped ? 'Docs already present' : `Seeded ${d.inserted}`))
              .then(load)
              .catch((e) => setError(e.message))
          }
        >
          Seed sample docs
        </button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-success">{message}</p> : null}
      <div className="admin-split">
        <form className="admin-card" onSubmit={createUser}>
          <h2>Create partner user</h2>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label>Name</label>
              <input className="admin-input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label>Email</label>
              <input className="admin-input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label>Password</label>
              <input className="admin-input" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={8} />
            </div>
            <div className="admin-field">
              <label>Company</label>
              <input className="admin-input" value={userForm.company} onChange={(e) => setUserForm({ ...userForm, company: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="admin-btn">
            Create user
          </button>
          <ul className="admin-list" style={{ marginTop: '1rem' }}>
            {users.map((u) => (
              <li key={u.id}>
                {u.name} · {u.email}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    post({ action: 'delete_user', id: u.id })
                      .then(load)
                      .catch((e) => setError(e.message))
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </form>
        <form className="admin-card" onSubmit={createDoc}>
          <h2>Add document</h2>
          <div className="admin-form-grid">
            <div className="admin-field full">
              <label>Title</label>
              <input className="admin-input" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} required />
            </div>
            <div className="admin-field full">
              <label>File URL</label>
              <input className="admin-input" value={docForm.file_url} onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })} required />
            </div>
            <div className="admin-field full">
              <label>Description</label>
              <textarea className="admin-textarea" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="admin-btn">
            Add document
          </button>
          <ul className="admin-list" style={{ marginTop: '1rem' }}>
            {documents.map((d) => (
              <li key={d.id}>
                {d.title}
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  style={{ marginLeft: 8 }}
                  onClick={() =>
                    post({ action: 'delete_doc', id: d.id })
                      .then(load)
                      .catch((e) => setError(e.message))
                  }
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </form>
      </div>
    </div>
  );
}
