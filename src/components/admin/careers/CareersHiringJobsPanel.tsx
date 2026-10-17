'use client';

import Link from 'next/link';import { useCallback, useEffect, useState } from 'react';
import { STATUS_LABELS, type CareerJob, type JobStatus } from '@/lib/career-hiring-types';

type Stats = { open: number; draft: number; paused: number; archive: number; pipeline: number };

function daysLeft(closesAt: string | null) {
  if (!closesAt) return null;
  return Math.ceil((new Date(closesAt).getTime() - Date.now()) / 86400000);
}

/**
 * Live bridge: Careers page editor ↔ Hiring ATS.
 * Publish here and the role appears on /careers + Pipeline automatically.
 */
export default function CareersHiringJobsPanel() {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('Bengaluru');
  const [durationDays, setDurationDays] = useState(30);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hiring/jobs?status=active');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Hiring jobs');
      setJobs(data.jobs || []);
      setStats(data.stats || null);
      if (data.message) setMsg(data.message);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function publish() {
    if (!title.trim()) {
      setMsg('Job title is required');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/hiring/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          department,
          location,
          jobType: 'Full-Time',
          durationDays,
          status: 'open',
          content: { role: title.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setTitle('');
      setMsg(`Published — live on /careers and ready in Hiring → Pipeline.`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: number, status: JobStatus) {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/hiring/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, durationDays: status === 'open' ? durationDays : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMsg(status === 'open' ? 'Role is live on /careers' : `Marked ${STATUS_LABELS[status]}`);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function syncLegacy() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/hiring/import', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(data.message || 'Sync done');
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crs-hire-panel">
      <div className="crs-hire-stats">
        <span>
          <strong>{stats?.open ?? '—'}</strong> open on site
        </span>
        <span>
          <strong>{stats?.pipeline ?? '—'}</strong> in pipeline
        </span>
        <span>
          <strong>{stats?.draft ?? 0}</strong> draft
        </span>
        <Link href="/admin/hiring?tab=pipeline" className="crs-hire-link">
          Open Hiring hub →
        </Link>
      </div>

      {loading ? <p className="az-admin-hint">Loading live openings…</p> : null}

      {!loading && jobs.length === 0 ? (
        <div className="crs-hire-empty">
          <p>
            No roles in Hiring yet. Publish one below, or sync any legacy jobs still stored in this section&apos;s JSON.
          </p>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void syncLegacy()}>
            Sync legacy Careers jobs
          </button>
        </div>
      ) : null}

      <ul className="crs-hire-list">
        {jobs.map((j) => {
          const left = daysLeft(j.closesAt);
          return (
            <li key={j.id}>
              <div>
                <strong>{j.title}</strong>
                <div className="crs-hire-meta">
                  <span className={`hr-pill is-${j.status}`}>{STATUS_LABELS[j.status]}</span>
                  {j.department ? <span>{j.department}</span> : null}
                  {j.location ? <span>{j.location}</span> : null}
                  {left != null ? <span>{left > 0 ? `${left}d left` : 'ended'}</span> : null}
                  <span>{j.candidateCount ?? 0} applicants</span>
                </div>
              </div>
              <div className="crs-hire-actions">
                {j.status === 'draft' || j.status === 'paused' ? (
                  <button type="button" className="admin-btn admin-btn-primary az-admin-mini" disabled={busy} onClick={() => void setStatus(j.id, 'open')}>
                    Go live
                  </button>
                ) : null}
                {j.status === 'open' ? (
                  <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void setStatus(j.id, 'paused')}>
                    Pause
                  </button>
                ) : null}
                <Link href={`/admin/hiring?tab=pipeline&job=${j.id}`} className="admin-btn admin-btn-secondary az-admin-mini">
                  Pipeline
                </Link>
                <Link href={`/admin/hiring?tab=openings&job=${j.id}`} className="admin-btn admin-btn-secondary az-admin-mini">
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="crs-hire-publish">
        <h4>Publish a new role</h4>
        <p className="az-admin-hint">Goes live on /careers immediately and opens a pipeline for applicants.</p>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Job title</span>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="UPS Service Engineer" />
          </label>
          <label className="admin-field">
            <span>Department</span>
            <input className="admin-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Field Service" />
          </label>
          <label className="admin-field">
            <span>Location</span>
            <input className="admin-input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Live for (days)</span>
            <input
              className="admin-input"
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value) || 30)}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void publish()}>
            Publish live on /careers
          </button>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void syncLegacy()}>
            Sync legacy JSON
          </button>
        </div>
      </div>

      {msg ? <p className="az-admin-hint" style={{ marginTop: '0.75rem' }}>{msg}</p> : null}
    </div>
  );
}
