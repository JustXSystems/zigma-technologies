'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type ZtoolsTool = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  route_path: string;
  enabled: number;
  sort_order: number;
};

type ZtoolsUser = {
  id: number;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: 'pending_approval' | 'approved' | 'rejected' | 'disabled';
  source: 'registration' | 'admin';
  requested_tool_ids: number[];
  approved_tool_ids: number[];
  admin_notes: string | null;
  created_at: string;
};

type Tab = 'users' | 'tools';

export default function ZtoolsAdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<ZtoolsUser[]>([]);
  const [tools, setTools] = useState<ZtoolsTool[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    phone: '',
    toolIds: [] as number[],
    auto_approve: true,
  });

  const [toolForm, setToolForm] = useState({
    slug: '',
    name: '',
    description: '',
    route_path: '',
    sort_order: 0,
  });

  const load = useCallback(async () => {
    setError('');
    const res = await fetch('/api/admin/ztools/users');
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setUsers(data.users || []);
    setTools(data.tools || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  function toolName(id: number) {
    return tools.find((t) => t.id === id)?.name || `#${id}`;
  }

  async function approveUser(user: ZtoolsUser) {
    const toolIds =
      user.approved_tool_ids.length > 0 ? user.approved_tool_ids : user.requested_tool_ids;
    const res = await fetch('/api/admin/ztools/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        status: 'approved',
        approved_tool_ids: toolIds,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Approve failed');
      return;
    }
    setMessage('User approved');
    await load();
  }

  async function rejectUser(id: number) {
    const res = await fetch('/api/admin/ztools/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Reject failed');
      return;
    }
    setMessage('User rejected');
    await load();
  }

  async function updateUserTools(user: ZtoolsUser, toolIds: number[]) {
    const res = await fetch('/api/admin/ztools/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        approved_tool_ids: toolIds,
        status: user.status === 'pending_approval' ? 'approved' : user.status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed');
      return;
    }
    setMessage('Tools updated');
    await load();
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/ztools/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userForm,
        company: userForm.company || undefined,
        phone: userForm.phone || undefined,
        approved_tool_ids: userForm.toolIds,
        auto_approve: userForm.auto_approve,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setMessage(data.message || 'User created');
    setUserForm({
      name: '',
      email: '',
      password: '',
      company: '',
      phone: '',
      toolIds: [],
      auto_approve: true,
    });
    await load();
  }

  async function createTool(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/ztools/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...toolForm,
        route_path: toolForm.route_path || `/tools/${toolForm.slug}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Create failed');
      return;
    }
    setMessage('Tool added to inventory');
    setToolForm({ slug: '', name: '', description: '', route_path: '', sort_order: 0 });
    await load();
  }

  async function toggleToolEnabled(tool: ZtoolsTool) {
    await fetch('/api/admin/ztools/tools', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tool.id, enabled: !tool.enabled }),
    });
    await load();
  }

  if (forbidden) {
    return (
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>ZTools</h2>
        <p style={{ color: 'var(--admin-muted)' }}>You do not have access to manage ZTools.</p>
      </div>
    );
  }

  const pending = users.filter((u) => u.status === 'pending_approval');

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>ZTools portal</h2>
        <p style={{ color: 'var(--admin-muted)' }}>
          Manage the tool inventory at <code>/ztools</code>, approve self-registrations, and create users with
          pre-assigned tools (no public registration required).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`admin-btn ${tab === 'users' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setTab('users')}
          >
            Users ({users.length})
          </button>
          <button
            type="button"
            className={`admin-btn ${tab === 'tools' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
            onClick={() => setTab('tools')}
          >
            Tool inventory ({tools.length})
          </button>
        </div>
        {error ? <div className="admin-error">{error}</div> : null}
        {message ? <div className="admin-success">{message}</div> : null}
      </div>

      {tab === 'users' ? (
        <>
          {pending.length > 0 ? (
            <div className="admin-card">
              <h3 style={{ marginTop: 0 }}>Pending approval ({pending.length})</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Requested tools</th>
                      <th>Source</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <div style={{ fontSize: '0.88rem', color: 'var(--admin-muted)' }}>{u.email}</div>
                          {u.company ? <div style={{ fontSize: '0.85rem' }}>{u.company}</div> : null}
                        </td>
                        <td>{u.requested_tool_ids.map((id) => toolName(id)).join(', ')}</td>
                        <td>{u.source}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button type="button" className="admin-btn admin-btn-primary" onClick={() => approveUser(u)}>
                            Approve
                          </button>{' '}
                          <button type="button" className="admin-btn admin-btn-danger" onClick={() => rejectUser(u.id)}>
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="admin-card">
            <h3 style={{ marginTop: 0 }}>All ZTools users</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Approved tools</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.name}
                        <div style={{ fontSize: '0.88rem', color: 'var(--admin-muted)' }}>{u.email}</div>
                      </td>
                      <td>{u.status}</td>
                      <td>
                        <select
                          className="admin-input"
                          multiple
                          value={u.approved_tool_ids.map(String)}
                          onChange={(e) => {
                            const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                            void updateUserTools(u, ids);
                          }}
                          style={{ minHeight: 72, minWidth: 200 }}
                        >
                          {tools.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {u.status === 'pending_approval' ? (
                          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => approveUser(u)}>
                            Approve
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card" style={{ maxWidth: 640 }}>
            <h3 style={{ marginTop: 0 }}>Create user (admin)</h3>
            <p style={{ color: 'var(--admin-muted)', fontSize: '0.9rem' }}>
              User can sign in at /ztools immediately when &quot;Approve on create&quot; is checked.
            </p>
            <form onSubmit={createUser} className="admin-form-grid">
              <div className="admin-field">
                <label>Name</label>
                <input className="admin-input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Email</label>
                <input className="admin-input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
              </div>
              <div className="admin-field full">
                <label>Password</label>
                <input className="admin-input" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={10} />
              </div>
              <div className="admin-field">
                <label>Company</label>
                <input className="admin-input" value={userForm.company} onChange={(e) => setUserForm({ ...userForm, company: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Phone</label>
                <input className="admin-input" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
              </div>
              <div className="admin-field full">
                <label>Assign tools</label>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  {tools.map((t) => (
                    <label key={t.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={userForm.toolIds.includes(t.id)}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            toolIds: e.target.checked
                              ? [...userForm.toolIds, t.id]
                              : userForm.toolIds.filter((id) => id !== t.id),
                          })
                        }
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="admin-field full">
                <label>
                  <input
                    type="checkbox"
                    checked={userForm.auto_approve}
                    onChange={(e) => setUserForm({ ...userForm, auto_approve: e.target.checked })}
                  />
                  Approve on create (user can sign in immediately)
                </label>
              </div>
              <div className="full">
                <button type="submit" className="admin-btn admin-btn-primary">Create ZTools user</button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          <div className="admin-card">
            <h3 style={{ marginTop: 0 }}>Tool inventory</h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug / route</th>
                    <th>Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>
                        <code>{t.slug}</code>
                        <div style={{ fontSize: '0.85rem', color: 'var(--admin-muted)' }}>{t.route_path}</div>
                      </td>
                      <td>
                        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => toggleToolEnabled(t)}>
                          {t.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="admin-card" style={{ maxWidth: 560 }}>
            <h3 style={{ marginTop: 0 }}>Add tool</h3>
            <form onSubmit={createTool} className="admin-form-grid">
              <div className="admin-field">
                <label>Slug</label>
                <input className="admin-input" value={toolForm.slug} onChange={(e) => setToolForm({ ...toolForm, slug: e.target.value })} required />
              </div>
              <div className="admin-field">
                <label>Sort order</label>
                <input className="admin-input" type="number" value={toolForm.sort_order} onChange={(e) => setToolForm({ ...toolForm, sort_order: Number(e.target.value) })} />
              </div>
              <div className="admin-field full">
                <label>Name</label>
                <input className="admin-input" value={toolForm.name} onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })} required />
              </div>
              <div className="admin-field full">
                <label>Description</label>
                <input className="admin-input" value={toolForm.description} onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })} />
              </div>
              <div className="admin-field full">
                <label>Route path</label>
                <input
                  className="admin-input"
                  placeholder="/tools/solar-roi or https://www.zigma-technologies.com/tools/solar-roi"
                  value={toolForm.route_path}
                  onChange={(e) => setToolForm({ ...toolForm, route_path: e.target.value })}
                />
              </div>
              <div className="full">
                <button type="submit" className="admin-btn admin-btn-primary">Add tool</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
