'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CANDIDATE_STAGES,
  CLOSE_REASON_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  type CandidateStage,
  type CareerCandidate,
  type CareerEvent,
  type CareerJob,
  type CareerJobContent,
  type CloseReason,
  type JobStatus,
} from '@/lib/career-hiring-types';

type Stats = { open: number; draft: number; paused: number; archive: number; pipeline: number; hired: number };
type Tab = 'openings' | 'pipeline' | 'archive';

const PIPELINE_COLS: CandidateStage[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'on_hold', 'rejected'];

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function daysLeft(closesAt: string | null) {
  if (!closesAt) return null;
  const ms = new Date(closesAt).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function StatusPill({ status, reason }: { status: JobStatus; reason?: CloseReason | null }) {
  if (status === 'closed' && reason) {
    return <span className={`hr-pill is-${reason === 'filled' ? 'filled' : reason === 'expired' ? 'expired' : 'closed'}`}>{CLOSE_REASON_LABELS[reason]}</span>;
  }
  return <span className={`hr-pill is-${status}`}>{STATUS_LABELS[status]}</span>;
}

const emptyContent = (): CareerJobContent => ({
  chips: [],
  responsibilities: [],
  requirements: [],
  benefits: [],
  facts: [],
});

export default function HiringWorkspace({ tab, initialJobId }: { tab: Tab; initialJobId?: string }) {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [candidates, setCandidates] = useState<CareerCandidate[]>([]);
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(initialJobId ? Number(initialJobId) || null : null);
  const [candId, setCandId] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({
    title: '',
    department: '',
    location: 'Bengaluru',
    jobType: 'Full-Time',
    experience: '',
    education: '',
    badge: 'New',
    summary: '',
    durationDays: 30,
    vacancies: 1,
    responsibilities: '',
    requirements: '',
    benefits: '',
    facts: '',
  });

  const [closeForm, setCloseForm] = useState({ reason: 'filled' as CloseReason, notes: '', hiredIds: [] as number[], joinedAt: '' });
  const [note, setNote] = useState('');

  const loadJobs = useCallback(async () => {
    const status = tab === 'archive' ? 'archive' : tab === 'openings' ? 'active' : 'all';
    const res = await fetch(`/api/admin/hiring/jobs?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setJobs(data.jobs || []);
    setStats(data.stats || null);
    return data.jobs as CareerJob[];
  }, [tab, q]);

  const loadPipeline = useCallback(async (jobId?: number | null) => {
    const url = jobId ? `/api/admin/hiring/candidates?jobId=${jobId}` : '/api/admin/hiring/candidates';
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setCandidates(data.candidates || []);
  }, []);

  const loadJobDetail = useCallback(async (id: number) => {
    const res = await fetch(`/api/admin/hiring/jobs/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setEvents(data.events || []);
    setCandidates(data.candidates || []);
    return data.job as CareerJob;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
      const list = await loadJobs();
      if (tab === 'pipeline') {
        await loadPipeline(selectedId);
      } else if (selectedId) {
        await loadJobDetail(selectedId);
      } else if (list[0] && tab === 'archive') {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [loadJobs, loadPipeline, loadJobDetail, selectedId, tab]);

  useEffect(() => {
    let current = true;
    fetch(`/api/admin/hiring/jobs?status=${tab === 'archive' ? 'archive' : tab === 'openings' ? 'active' : 'all'}`)
      .then(async (res) => {
        const data = await res.json();
        if (!current) return;
        if (!res.ok) throw new Error(data.error || 'Load failed');
        setJobs(data.jobs || []);
        setStats(data.stats || null);
        setLoading(false);
        if (tab === 'pipeline') {
          const cres = await fetch('/api/admin/hiring/candidates');
          const cdata = await cres.json();
          if (!current || !cres.ok) return;
          setCandidates(cdata.candidates || []);
        }
      })
      .catch((e: Error) => {
        if (!current) return;
        setMsg(e.message || 'Load failed');
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [tab]);

  useEffect(() => {
    if (!selectedId || tab === 'pipeline') return;
    let current = true;
    void fetch(`/api/admin/hiring/jobs/${selectedId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!current || !res.ok) return;
        setEvents(data.events || []);
        setCandidates(data.candidates || []);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [selectedId, tab]);

  const selected = useMemo(() => jobs.find((j) => j.id === selectedId) || null, [jobs, selectedId]);
  const selectedCand = useMemo(() => candidates.find((c) => c.id === candId) || null, [candidates, candId]);

  async function importLegacy() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/hiring/import', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setMsg(data.message || 'Import done');
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  async function createJob(publish: boolean) {
    if (!draft.title.trim()) {
      setMsg('Job title is required');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const content: CareerJobContent = {
        ...emptyContent(),
        responsibilities: draft.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean),
        requirements: draft.requirements.split('\n').map((s) => s.trim()).filter(Boolean),
        benefits: draft.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
        facts: draft.facts.split('\n').map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch('/api/admin/hiring/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          department: draft.department,
          location: draft.location,
          jobType: draft.jobType,
          experience: draft.experience,
          education: draft.education,
          badge: draft.badge,
          summary: draft.summary,
          vacancies: draft.vacancies,
          durationDays: draft.durationDays,
          status: publish ? 'open' : 'draft',
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setMsg(publish ? 'Published on /careers' : 'Draft saved');
      setDraft((d) => ({ ...d, title: '', summary: '', responsibilities: '', requirements: '', benefits: '', facts: '', badge: '' }));
      await refresh();
      if (data.id) setSelectedId(data.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function patchJob(id: number, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMsg('Saved');
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function closeJob() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/jobs/${selectedId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: closeForm.reason,
          notes: closeForm.notes,
          hiredCandidateIds: closeForm.reason === 'filled' ? closeForm.hiredIds : [],
          joinedAt: closeForm.joinedAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Close failed');
      setMsg('Job archived');
      setSelectedId(null);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Close failed');
    } finally {
      setBusy(false);
    }
  }

  async function reopen(id: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen', durationDays: 30 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reopen failed');
      setMsg('Reopened for 30 days');
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Reopen failed');
    } finally {
      setBusy(false);
    }
  }

  async function moveStage(id: number, stage: CandidateStage) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await loadPipeline(selectedId);
      if (selectedId) await loadJobDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!candId || !note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/candidates/${candId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addNote: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Note failed');
      setNote('');
      await loadPipeline(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Note failed');
    } finally {
      setBusy(false);
    }
  }

  const jobCandidates = candidates.filter((c) => !selectedId || c.jobId === selectedId);

  return (
    <div>
      {stats ? (
        <div className="hr-stats">
          <div className="hr-stat">
            <strong>{stats.open}</strong>
            <span>Open</span>
          </div>
          <div className="hr-stat">
            <strong>{stats.pipeline}</strong>
            <span>In pipeline</span>
          </div>
          <div className="hr-stat">
            <strong>{stats.hired}</strong>
            <span>Hired</span>
          </div>
          <div className="hr-stat">
            <strong>{stats.archive}</strong>
            <span>Archived</span>
          </div>
        </div>
      ) : null}

      <div className="hr-callout">
        <strong>How it works.</strong> Publish a role with an end date — it appears on /careers until that date, then auto-archives.
        When you fill a role, close it with the hired people and notes. Everything stays here for audit; nothing closed is shown publicly.
      </div>

      <div className="hr-toolbar">
        <input className="admin-input" placeholder="Search roles…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void refresh()} />
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
        {tab === 'openings' ? (
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void importLegacy()} disabled={busy}>
            Import from Careers page
          </button>
        ) : null}
        {tab === 'pipeline' ? (
          <select
            className="admin-select"
            value={selectedId || ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setSelectedId(id);
              void loadPipeline(id);
            }}
          >
            <option value="">All open roles</option>
            {jobs
              .filter((j) => j.status === 'open' || j.status === 'paused')
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
          </select>
        ) : null}
        <span className="hr-toolbar-spacer" />
        {msg ? <span className="az-admin-hint" style={{ margin: 0 }}>{msg}</span> : null}
      </div>

      {loading ? <p className="hr-empty">Loading…</p> : null}

      {tab === 'openings' && !loading ? (
        <div className="hr-split">
          <div>
            <div className="hr-job-list">
              {jobs.length === 0 ? (
                <div className="hr-empty">
                  No active jobs yet. Create one on the right, or import existing Careers page roles.
                </div>
              ) : (
                jobs.map((j) => {
                  const left = daysLeft(j.closesAt);
                  return (
                    <article
                      key={j.id}
                      className={`hr-job-row${selectedId === j.id ? ' is-on' : ''}`}
                      onClick={() => setSelectedId(j.id)}
                    >
                      <div>
                        <h4 className="hr-job-title">{j.title}</h4>
                        <div className="hr-job-meta">
                          <StatusPill status={j.status} />
                          {j.department ? <span className="hr-pill">{j.department}</span> : null}
                          {j.location ? <span className="hr-pill">{j.location}</span> : null}
                          {j.status === 'open' && left != null ? (
                            <span className={`hr-pill${left <= 7 ? ' is-expired' : ''}`}>
                              {left < 0 ? 'Expired' : left === 0 ? 'Ends today' : `${left}d left`}
                            </span>
                          ) : null}
                          <span className="hr-pill">{j.candidateCount ?? 0} applicants</span>
                        </div>
                      </div>
                      <div className="hr-job-actions" onClick={(e) => e.stopPropagation()}>
                        {j.status === 'draft' ? (
                          <button type="button" className="admin-btn admin-btn-primary az-admin-mini" disabled={busy} onClick={() => void patchJob(j.id, { status: 'open', durationDays: 30 })}>
                            Publish
                          </button>
                        ) : null}
                        {j.status === 'open' ? (
                          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void patchJob(j.id, { status: 'paused' })}>
                            Pause
                          </button>
                        ) : null}
                        {j.status === 'paused' ? (
                          <button type="button" className="admin-btn admin-btn-primary az-admin-mini" disabled={busy} onClick={() => void patchJob(j.id, { status: 'open' })}>
                            Resume
                          </button>
                        ) : null}
                        {j.status !== 'closed' ? (
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary az-admin-mini"
                            onClick={() => {
                              setSelectedId(j.id);
                              setCloseForm({ reason: 'filled', notes: '', hiredIds: [], joinedAt: new Date().toISOString().slice(0, 10) });
                            }}
                          >
                            Close…
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {selected && selected.status !== 'closed' ? (
              <div className="admin-card" style={{ marginTop: '1.25rem' }}>
                <h3 style={{ marginTop: 0 }}>Close / archive “{selected.title}”</h3>
                <div className="hr-field-grid">
                  <label className="admin-field">
                    <span>Reason</span>
                    <select className="admin-select" value={closeForm.reason} onChange={(e) => setCloseForm((f) => ({ ...f, reason: e.target.value as CloseReason }))}>
                      {(Object.keys(CLOSE_REASON_LABELS) as CloseReason[]).map((r) => (
                        <option key={r} value={r}>
                          {CLOSE_REASON_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Join date (if filled)</span>
                    <input className="admin-input" type="date" value={closeForm.joinedAt} onChange={(e) => setCloseForm((f) => ({ ...f, joinedAt: e.target.value }))} />
                  </label>
                  <label className="admin-field full">
                    <span>Notes — how it closed, interview summary, etc.</span>
                    <textarea className="admin-textarea" rows={3} value={closeForm.notes} onChange={(e) => setCloseForm((f) => ({ ...f, notes: e.target.value }))} />
                  </label>
                  {closeForm.reason === 'filled' ? (
                    <div className="full">
                      <p className="az-admin-hint">Select who was hired (from this role&apos;s pipeline):</p>
                      <div className="hr-job-meta">
                        {jobCandidates.map((c) => (
                          <label key={c.id} className="hr-pill" style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={closeForm.hiredIds.includes(c.id)}
                              onChange={(e) =>
                                setCloseForm((f) => ({
                                  ...f,
                                  hiredIds: e.target.checked ? [...f.hiredIds, c.id] : f.hiredIds.filter((x) => x !== c.id),
                                }))
                              }
                            />
                            {c.name}
                          </label>
                        ))}
                        {!jobCandidates.length ? <span className="az-admin-hint">No candidates yet — you can still close with notes.</span> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void closeJob()}>
                    Archive job
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="hr-panel">
            <h3>New job posting</h3>
            <div className="hr-field-grid">
              <label className="admin-field full">
                <span>Job title</span>
                <input className="admin-input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Sales Executive – UPS" />
              </label>
              <label className="admin-field">
                <span>Department</span>
                <input className="admin-input" value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))} />
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
                <input className="admin-input" value={draft.experience} onChange={(e) => setDraft((d) => ({ ...d, experience: e.target.value }))} placeholder="1–2 years" />
              </label>
              <label className="admin-field">
                <span>Education</span>
                <input className="admin-input" value={draft.education} onChange={(e) => setDraft((d) => ({ ...d, education: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Badge</span>
                <input className="admin-input" value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} />
              </label>
              <label className="admin-field">
                <span>Posting days</span>
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  max={365}
                  value={draft.durationDays}
                  onChange={(e) => setDraft((d) => ({ ...d, durationDays: Number(e.target.value) || 30 }))}
                />
              </label>
              <label className="admin-field full">
                <span>Short summary</span>
                <textarea className="admin-textarea" rows={2} value={draft.summary} onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))} />
              </label>
              <label className="admin-field full">
                <span>Key responsibilities (one per line)</span>
                <textarea className="admin-textarea" rows={4} value={draft.responsibilities} onChange={(e) => setDraft((d) => ({ ...d, responsibilities: e.target.value }))} />
              </label>
              <label className="admin-field full">
                <span>Requirements (one per line)</span>
                <textarea className="admin-textarea" rows={4} value={draft.requirements} onChange={(e) => setDraft((d) => ({ ...d, requirements: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void createJob(true)}>
                Publish live
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void createJob(false)}>
                Save draft
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {tab === 'pipeline' && !loading ? (
        <div className="hr-split">
          <div className="hr-board">
            {PIPELINE_COLS.map((stage) => {
              const col = candidates.filter((c) => c.stage === stage);
              return (
                <div key={stage} className="hr-col">
                  <div className="hr-col-h">
                    <span>{STAGE_LABELS[stage]}</span>
                    <strong>{col.length}</strong>
                  </div>
                  {col.map((c) => (
                    <div key={c.id} className={`hr-card${candId === c.id ? ' is-on' : ''}`} onClick={() => setCandId(c.id)}>
                      <p className="hr-card-name">{c.name}</p>
                      <p className="hr-card-sub">{c.jobTitle || '—'}</p>
                      <p className="hr-card-sub">{c.email || c.phone || c.source}</p>
                    </div>
                  ))}
                  {!col.length ? <p className="hr-empty" style={{ padding: '0.75rem' }}>Empty</p> : null}
                </div>
              );
            })}
          </div>
          <aside className="hr-panel">
            <h3>Candidate</h3>
            {!selectedCand ? (
              <p className="hr-empty" style={{ padding: '1rem 0' }}>
                Select a card to update stage, interviewer, or notes.
              </p>
            ) : (
              <>
                <p className="hr-job-title">{selectedCand.name}</p>
                <div className="hr-job-meta" style={{ marginBottom: '0.85rem' }}>
                  <span className="hr-pill">{STAGE_LABELS[selectedCand.stage]}</span>
                  <span className="hr-pill">{selectedCand.jobTitle}</span>
                </div>
                <p className="az-admin-hint" style={{ marginTop: 0 }}>
                  {selectedCand.email}
                  {selectedCand.phone ? ` · ${selectedCand.phone}` : ''}
                  {selectedCand.experience ? ` · ${selectedCand.experience}` : ''}
                </p>
                {selectedCand.resumeFile ? (
                  <p>
                    <a href={`/api/admin/enquiries/${selectedCand.enquiryId}/resume`} target="_blank" rel="noopener noreferrer">
                      Open resume
                    </a>
                  </p>
                ) : null}
                <label className="admin-field">
                  <span>Move to stage</span>
                  <select className="admin-select" value={selectedCand.stage} onChange={(e) => void moveStage(selectedCand.id, e.target.value as CandidateStage)} disabled={busy}>
                    {CANDIDATE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Interviewer</span>
                  <input
                    className="admin-input"
                    defaultValue={selectedCand.interviewer}
                    key={`iv-${selectedCand.id}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== selectedCand.interviewer) {
                        void fetch(`/api/admin/hiring/candidates/${selectedCand.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ interviewer: v }),
                        }).then(() => loadPipeline(selectedId));
                      }
                    }}
                  />
                </label>
                <label className="admin-field">
                  <span>Add note</span>
                  <textarea className="admin-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Interview feedback, next steps…" />
                </label>
                <button type="button" className="admin-btn admin-btn-primary az-admin-mini" disabled={busy || !note.trim()} onClick={() => void saveNote()}>
                  Save note
                </button>
                {selectedCand.notes ? (
                  <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--admin-text-secondary)' }}>{selectedCand.notes}</pre>
                ) : null}
              </>
            )}
          </aside>
        </div>
      ) : null}

      {tab === 'archive' && !loading ? (
        <div className="hr-split">
          <div className="hr-job-list">
            {jobs.length === 0 ? (
              <div className="hr-empty">No archived jobs yet. Closed and expired postings appear here for audit.</div>
            ) : (
              jobs.map((j) => (
                <article key={j.id} className={`hr-job-row${selectedId === j.id ? ' is-on' : ''}`} onClick={() => setSelectedId(j.id)}>
                  <div>
                    <h4 className="hr-job-title">{j.title}</h4>
                    <div className="hr-job-meta">
                      <StatusPill status={j.status} reason={j.closeReason} />
                      <span className="hr-pill">Closed {fmtDate(j.closedAt)}</span>
                      {j.closedBy ? <span className="hr-pill">by {j.closedBy}</span> : null}
                      <span className="hr-pill">{j.hiredCount ?? 0} hired</span>
                    </div>
                  </div>
                  <div className="hr-job-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" disabled={busy} onClick={() => void reopen(j.id)}>
                      Reopen 30d
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
          <aside className="hr-panel">
            <h3>Archive record</h3>
            {!selected ? (
              <p className="hr-empty" style={{ padding: '1rem 0' }}>
                Select a closed job to see how it was closed and who was hired.
              </p>
            ) : (
              <>
                <p className="hr-job-title">{selected.title}</p>
                <div className="hr-job-meta" style={{ marginBottom: '0.75rem' }}>
                  <StatusPill status={selected.status} reason={selected.closeReason} />
                </div>
                <p className="az-admin-hint">
                  Live: {fmtDate(selected.publishedAt)} → {fmtDate(selected.closesAt || selected.closedAt)}
                  <br />
                  Closed: {fmtDate(selected.closedAt)}
                  {selected.closedBy ? ` · ${selected.closedBy}` : ''}
                </p>
                {selected.closeNotes ? (
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.55, margin: '0.75rem 0' }}>{selected.closeNotes}</p>
                ) : null}
                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.85rem' }}>Hired / candidates</h4>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem' }}>
                  {candidates.map((c) => (
                    <li key={c.id} style={{ marginBottom: '0.35rem' }}>
                      <strong>{c.name}</strong> — {STAGE_LABELS[c.stage]}
                      {c.interviewAt ? ` · interview ${fmtDate(c.interviewAt)}` : ''}
                      {c.joinedAt ? ` · joined ${fmtDate(c.joinedAt)}` : ''}
                      {c.interviewer ? ` · ${c.interviewer}` : ''}
                    </li>
                  ))}
                  {!candidates.length ? <li>No candidates recorded</li> : null}
                </ul>
                <h4 style={{ margin: '1.25rem 0 0.5rem', fontSize: '0.85rem' }}>Activity</h4>
                <ul className="hr-timeline">
                  {events.slice(0, 40).map((ev) => (
                    <li key={ev.id}>
                      <div>
                        <time>{fmtDate(ev.createdAt)}{ev.actor ? ` · ${ev.actor}` : ''}</time>
                        {ev.message || ev.eventType}
                      </div>
                    </li>
                  ))}
                  {!events.length ? <li><div>No events</div></li> : null}
                </ul>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
