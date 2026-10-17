'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import JobTextAutofill from '@/components/admin/hiring/JobTextAutofill';
import type { JobAutofillDraft } from '@/lib/careers-job-text';
import { STATUS_LABELS, type CareerJob, type JobStatus } from '@/lib/career-hiring-types';
import {
  buildCareersApplyUrl,
  buildWhatsAppShareUrl,
  validateJobForPublish,
} from '@/lib/career-job-publish';

type Stats = { open: number; draft: number; paused: number; archive: number; pipeline: number };

function daysLeft(closesAt: string | null) {
  if (!closesAt) return null;
  return Math.ceil((new Date(closesAt).getTime() - Date.now()) / 86400000);
}

const blankDraft = (): JobAutofillDraft & { durationDays: number } => ({
  title: '',
  department: '',
  location: 'Bengaluru',
  jobType: 'Full-Time',
  experience: '',
  education: '',
  badge: '',
  summary: '',
  responsibilities: '',
  requirements: '',
  benefits: '',
  facts: '',
  vacancies: 1,
  durationDays: 30,
});

/**
 * Live bridge: Careers page editor ↔ Hiring ATS.
 * Publish here (including WhatsApp/email paste autofill) → /careers + Pipeline.
 */
export default function CareersHiringJobsPanel() {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [draft, setDraft] = useState(blankDraft);
  const [allowDupTitle, setAllowDupTitle] = useState(false);

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

  async function copyApplyLink(job: CareerJob) {
    const url = buildCareersApplyUrl({ publicId: job.publicId, slug: job.slug });
    try {
      await navigator.clipboard.writeText(url);
      setMsg('Apply link copied');
    } catch {
      setMsg(url);
    }
  }

  function shareWhatsApp(job: CareerJob) {
    const applyUrl = buildCareersApplyUrl({ publicId: job.publicId, slug: job.slug });
    window.open(buildWhatsAppShareUrl({ title: job.title, location: job.location, applyUrl }), '_blank', 'noopener,noreferrer');
  }

  async function publish() {
    if (!draft.title.trim()) {
      setMsg('Job title is required — paste a description or type a title');
      return;
    }
    const gates = validateJobForPublish({
      title: draft.title,
      location: draft.location,
      summary: draft.summary,
      responsibilitiesText: draft.responsibilities,
      requirementsText: draft.requirements,
    });
    if (gates.length) {
      setMsg(gates.join(' · '));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
      const res = await fetch('/api/admin/hiring/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          department: draft.department,
          location: draft.location,
          jobType: draft.jobType || 'Full-Time',
          experience: draft.experience,
          education: draft.education,
          badge: draft.badge,
          summary: draft.summary,
          vacancies: draft.vacancies,
          durationDays: draft.durationDays,
          status: 'open',
          allowDuplicateTitle: allowDupTitle,
          content: {
            role: draft.title.trim(),
            responsibilities: lines(draft.responsibilities),
            requirements: lines(draft.requirements),
            benefits: lines(draft.benefits),
            facts: lines(draft.facts),
            chips: lines(draft.facts)
              .filter((f) => /^work mode:/i.test(f))
              .map((f) => f.replace(/^work mode:\s*/i, '')),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setDraft(blankDraft());
      setAllowDupTitle(false);
      setMsg(`Published “${draft.title.trim()}” — live on /careers and ready in Hiring → Pipeline.`);
      await refresh();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Publish failed';
      if (raw.startsWith('DUPLICATE_TITLE:')) {
        setAllowDupTitle(true);
        setMsg(raw.replace(/^DUPLICATE_TITLE:\s*/, '') + ' Click publish again to confirm.');
      } else {
        setMsg(raw);
      }
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
        body: JSON.stringify({ status, durationDays: status === 'open' ? draft.durationDays : undefined }),
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
            No roles in Hiring yet. Paste a WhatsApp/email job ad below and publish, or sync any legacy jobs still in this
            section&apos;s JSON.
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
                {j.status === 'open' || j.status === 'paused' ? (
                  <>
                    <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void copyApplyLink(j)}>
                      Copy link
                    </button>
                    <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => shareWhatsApp(j)}>
                      WhatsApp
                    </button>
                  </>
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
        <p className="az-admin-hint">
          Paste the full ad from WhatsApp or email first — fields fill automatically — then publish live on /careers.
        </p>
        <JobTextAutofill defaultOpen value={draft} onFill={(next) => setDraft((d) => ({ ...d, ...next }))} />
        <div className="admin-form-grid" style={{ marginTop: '0.75rem' }}>
          <label className="admin-field">
            <span>Job title</span>
            <input className="admin-input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="UPS Service Engineer" />
          </label>
          <label className="admin-field">
            <span>Department</span>
            <input className="admin-input" value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} placeholder="Field Service" />
          </label>
          <label className="admin-field">
            <span>Location</span>
            <input className="admin-input" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Job type</span>
            <input className="admin-input" value={draft.jobType} onChange={(e) => setDraft((d) => ({ ...d, jobType: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Experience</span>
            <input className="admin-input" value={draft.experience} onChange={(e) => setDraft((d) => ({ ...d, experience: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Education</span>
            <input className="admin-input" value={draft.education} onChange={(e) => setDraft((d) => ({ ...d, education: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Badge</span>
            <input className="admin-input" value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} placeholder="Urgent" />
          </label>
          <label className="admin-field">
            <span>Vacancies</span>
            <input
              className="admin-input"
              type="number"
              min={1}
              max={99}
              value={draft.vacancies}
              onChange={(e) => setDraft((d) => ({ ...d, vacancies: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
          <label className="admin-field">
            <span>Live for (days)</span>
            <input
              className="admin-input"
              type="number"
              min={1}
              max={365}
              value={draft.durationDays}
              onChange={(e) => setDraft((d) => ({ ...d, durationDays: Number(e.target.value) || 30 }))}
            />
          </label>
          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span>Short summary</span>
            <textarea className="admin-textarea" rows={2} value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} />
          </label>
          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span>Key responsibilities (one per line)</span>
            <textarea className="admin-textarea" rows={3} value={draft.responsibilities} onChange={(e) => setDraft((d) => ({ ...d, responsibilities: e.target.value }))} />
          </label>
          <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
            <span>Requirements (one per line)</span>
            <textarea className="admin-textarea" rows={3} value={draft.requirements} onChange={(e) => setDraft((d) => ({ ...d, requirements: e.target.value }))} />
          </label>
        </div>
        {allowDupTitle ? (
          <p className="az-admin-hint" style={{ marginTop: '0.5rem', color: 'var(--orange, #FF6B1A)' }}>
            Duplicate title acknowledged — next click publishes another open role with this title.
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void publish()}>
            {allowDupTitle ? 'Publish anyway' : 'Publish live on /careers'}
          </button>
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void syncLegacy()}>
            Sync legacy JSON
          </button>
          <Link href="/admin/hiring?tab=openings" className="admin-btn admin-btn-secondary az-admin-mini">
            Full editor in Hiring
          </Link>
        </div>
      </div>

      {msg ? (
        <p className="az-admin-hint" style={{ marginTop: '0.75rem' }}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
