'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import JobTextAutofill from '@/components/admin/hiring/JobTextAutofill';
import type { JobAutofillDraft } from '@/lib/careers-job-text';
import {
  buildCareersApplyUrl,
  buildWhatsAppShareUrl,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  validateJobForPublish,
} from '@/lib/career-job-publish';

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

const blankDraft = (): JobAutofillDraft & { durationDays: number } => ({
  title: '',
  department: '',
  location: 'Bengaluru',
  jobType: 'Full-Time',
  experience: '',
  education: '',
  badge: '',
  summary: '',
  durationDays: 30,
  vacancies: 1,
  responsibilities: '',
  requirements: '',
  benefits: '',
  facts: '',
});

function draftFromJob(job: CareerJob): JobAutofillDraft & { durationDays: number } {
  const left = daysLeft(job.closesAt);
  return {
    title: job.title,
    department: job.department,
    location: job.location || 'Bengaluru',
    jobType: job.jobType || 'Full-Time',
    experience: job.experience,
    education: job.education,
    badge: job.badge,
    summary: job.summary,
    durationDays: left && left > 0 ? left : 30,
    vacancies: job.vacancies || 1,
    responsibilities: (job.content.responsibilities || []).join('\n'),
    requirements: (job.content.requirements || []).join('\n'),
    benefits: (job.content.benefits || []).join('\n'),
    facts: (job.content.facts || []).join('\n'),
  };
}

const STAGE_FLOW: CandidateStage[] = ['applied', 'screening', 'interview', 'offer', 'hired'];

export default function HiringWorkspace({
  tab,
  initialJobId,
  initialCandidateId,
}: {
  tab: Tab;
  initialJobId?: string;
  initialCandidateId?: string;
}) {
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [candidates, setCandidates] = useState<CareerCandidate[]>([]);
  const [events, setEvents] = useState<CareerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [candQ, setCandQ] = useState('');
  const [candStage, setCandStage] = useState<CandidateStage | ''>('');
  const [selectedId, setSelectedId] = useState<number | null>(initialJobId ? Number(initialJobId) || null : null);
  const [candId, setCandId] = useState<number | null>(
    initialCandidateId ? Number(initialCandidateId) || null : null
  );
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingNew, setEditingNew] = useState(!initialJobId);
  const [allowDupTitle, setAllowDupTitle] = useState(false);
  const [interviewLocal, setInterviewLocal] = useState('');

  const [draft, setDraft] = useState(blankDraft);

  const [closeForm, setCloseForm] = useState({ reason: 'filled' as CloseReason, notes: '', hiredIds: [] as number[], joinedAt: '' });
  const [note, setNote] = useState('');

  const loadJobs = useCallback(async () => {
    const status = tab === 'archive' ? 'archive' : tab === 'openings' ? 'active' : 'all';
    const res = await fetch(`/api/admin/hiring/jobs?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setJobs(data.jobs || []);
    setStats(data.stats || null);
    if (data.message) setMsg(data.message);
    return data.jobs as CareerJob[];
  }, [tab, q]);

  const loadPipeline = useCallback(async (jobId?: number | null, search?: string, stage?: CandidateStage | '') => {
    const params = new URLSearchParams();
    if (jobId) params.set('jobId', String(jobId));
    const sq = (search ?? candQ).trim();
    if (sq) params.set('q', sq);
    const st = stage ?? candStage;
    if (st) params.set('stage', st);
    const qs = params.toString();
    const res = await fetch(`/api/admin/hiring/candidates${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Load failed');
    setCandidates(data.candidates || []);
  }, [candQ, candStage]);

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
    (async () => {
      try {
        if (tab === 'pipeline') {
          const syncRes = await fetch('/api/admin/hiring/sync-enquiries?mode=auto', { method: 'POST' });
          const syncData = await syncRes.json().catch(() => ({}));
          if (current && syncRes.ok && syncData.message && (syncData.created || syncData.linked || syncData.duplicates)) {
            setMsg(syncData.message);
          }
          const countRes = await fetch('/api/admin/hiring/sync-enquiries');
          const countData = await countRes.json().catch(() => ({}));
          if (current && countRes.ok) setUnmappedCount(Number(countData.unmapped) || 0);
        }
        const res = await fetch(
          `/api/admin/hiring/jobs?status=${tab === 'archive' ? 'archive' : tab === 'openings' ? 'active' : 'all'}`
        );
        const data = await res.json();
        if (!current) return;
        if (!res.ok) throw new Error(data.error || 'Load failed');
        setJobs(data.jobs || []);
        setStats(data.stats || null);
        setLoading(false);
        if (tab === 'pipeline') {
          await loadPipeline(selectedId);
          if (initialCandidateId) {
            const cid = Number(initialCandidateId);
            if (cid) setCandId(cid);
          }
        }
      } catch (e) {
        if (!current) return;
        setMsg(e instanceof Error ? e.message : 'Load failed');
        setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional tab mount reload
  }, [tab]);

  async function syncFromEnquiries() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/hiring/sync-enquiries', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMsg(data.message || 'Synced');
      setUnmappedCount(0);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  }

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

  useEffect(() => {
    if (tab !== 'openings') return;
    if (editingNew || !selected) return;
    setDraft(draftFromJob(selected));
    setAllowDupTitle(false);
  }, [selected, editingNew, tab]);

  useEffect(() => {
    setInterviewLocal(toDatetimeLocalValue(selectedCand?.interviewAt));
  }, [selectedCand?.id, selectedCand?.interviewAt]);

  function startNewJob() {
    setSelectedId(null);
    setEditingNew(true);
    setDraft(blankDraft());
    setMsg('');
  }

  function selectJob(id: number) {
    setSelectedId(id);
    setEditingNew(false);
    setCloseForm({ reason: 'filled', notes: '', hiredIds: [], joinedAt: '' });
  }

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

  function buildContent(): CareerJobContent {
    return {
      ...emptyContent(),
      role: draft.title.trim(),
      responsibilities: draft.responsibilities.split('\n').map((s) => s.trim()).filter(Boolean),
      requirements: draft.requirements.split('\n').map((s) => s.trim()).filter(Boolean),
      benefits: draft.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
      facts: draft.facts.split('\n').map((s) => s.trim()).filter(Boolean),
    };
  }

  function publishGateErrors(): string[] {
    return validateJobForPublish({
      title: draft.title,
      location: draft.location,
      summary: draft.summary,
      responsibilitiesText: draft.responsibilities,
      requirementsText: draft.requirements,
    });
  }

  function handleJobError(raw: string) {
    if (raw.startsWith('DUPLICATE_TITLE:')) {
      setAllowDupTitle(true);
      setMsg(raw.replace(/^DUPLICATE_TITLE:\s*/, '') + ' Click publish again to confirm.');
      return;
    }
    setMsg(raw);
  }

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

  async function createJob(publish: boolean) {
    if (!draft.title.trim()) {
      setMsg('Job title is required');
      return;
    }
    if (publish) {
      const gates = publishGateErrors();
      if (gates.length) {
        setMsg(gates.join(' · '));
        return;
      }
    }
    setBusy(true);
    setMsg('');
    try {
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
          content: buildContent(),
          allowDuplicateTitle: publish ? allowDupTitle : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setMsg(publish ? 'Published on /careers — applicants will land in Pipeline.' : 'Draft saved');
      setDraft(blankDraft());
      setEditingNew(false);
      setAllowDupTitle(false);
      await refresh();
      if (data.id) setSelectedId(data.id);
    } catch (e) {
      handleJobError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected(publish?: boolean) {
    if (!selectedId) return;
    if (!draft.title.trim()) {
      setMsg('Job title is required');
      return;
    }
    if (publish) {
      const gates = publishGateErrors();
      if (gates.length) {
        setMsg(gates.join(' · '));
        return;
      }
    }
    setBusy(true);
    setMsg('');
    try {
      const body: Record<string, unknown> = {
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
        content: buildContent(),
      };
      if (publish) {
        body.status = 'open';
        body.allowDuplicateTitle = allowDupTitle;
      }
      const res = await fetch(`/api/admin/hiring/jobs/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMsg(publish ? 'Saved and live on /careers' : 'Job updated');
      setAllowDupTitle(false);
      await refresh();
    } catch (e) {
      handleJobError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function patchJob(id: number, body: Record<string, unknown>) {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/hiring/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMsg('Saved');
      setAllowDupTitle(false);
      await refresh();
    } catch (e) {
      handleJobError(e instanceof Error ? e.message : 'Update failed');
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
    setMsg('');
    try {
      const body: Record<string, unknown> = { stage };
      if (stage === 'interview') {
        const iso = fromDatetimeLocalValue(interviewLocal);
        if (iso) body.interviewAt = iso;
      }
      const res = await fetch(`/api/admin/hiring/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMsg(
        stage === 'interview' && !fromDatetimeLocalValue(interviewLocal)
          ? `Moved to Interview — set a date below so the candidate email can include it.`
          : `Moved to ${STAGE_LABELS[stage]}`
      );
      setCandId(id);
      await loadPipeline(selectedId);
      if (tab !== 'pipeline' && selectedId) await loadJobDetail(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveInterviewSchedule() {
    if (!candId) return;
    const iso = fromDatetimeLocalValue(interviewLocal);
    if (!iso) {
      setMsg('Pick an interview date and time');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const body: Record<string, unknown> = { interviewAt: iso };
      if (selectedCand && selectedCand.stage !== 'interview') body.stage = 'interview';
      const res = await fetch(`/api/admin/hiring/candidates/${candId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Schedule failed');
      setMsg('Interview scheduled — applicant notified if email is on');
      await loadPipeline(selectedId);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Schedule failed');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (selectedId) params.set('jobId', String(selectedId));
    if (candQ.trim()) params.set('q', candQ.trim());
    if (candStage) params.set('stage', candStage);
    const qs = params.toString();
    window.location.href = `/api/admin/hiring/candidates/export${qs ? `?${qs}` : ''}`;
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
        Website applications land in Pipeline (matched by job id). When you fill a role, close it with hired people and notes for audit.
      </div>

      <div className="hr-toolbar">
        {tab !== 'pipeline' ? (
          <input className="admin-input" placeholder="Search roles…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void refresh()} />
        ) : (
          <input
            className="admin-input"
            placeholder="Search candidates (name, email, phone)…"
            value={candQ}
            onChange={(e) => setCandQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadPipeline(selectedId)}
          />
        )}
        <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void refresh()} disabled={loading}>
          Refresh
        </button>
        {tab === 'openings' ? (
          <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void importLegacy()} disabled={busy} title="Adds Careers-page roles that are not already in Hiring">
            Sync from Careers page
          </button>
        ) : null}
        {tab === 'pipeline' ? (
          <>
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
            <select
              className="admin-select"
              value={candStage}
              onChange={(e) => {
                const st = e.target.value as CandidateStage | '';
                setCandStage(st);
                void loadPipeline(selectedId, candQ, st);
              }}
            >
              <option value="">All stages</option>
              {PIPELINE_COLS.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void loadPipeline(selectedId)} disabled={loading}>
              Find
            </button>
            <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={exportCsv} title="Download CSV of the current filter">
              Export CSV
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary az-admin-mini"
              disabled={busy}
              onClick={() => void syncFromEnquiries()}
              title="Pull careers applications from Enquiries into this pipeline"
            >
              Sync Enquiries{unmappedCount ? ` (${unmappedCount})` : ''}
            </button>
          </>
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
                <div className="hr-empty hr-empty--cta">
                  <p>
                    <strong>No active openings yet.</strong> Create a role on the right, or sync roles still stored on the Careers page
                    (Pages → Careers → Current openings). Sync is safe to re-run — existing titles are skipped.
                  </p>
                  <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void importLegacy()}>
                    Sync from Careers page
                  </button>
                </div>
              ) : (
                jobs.map((j) => {
                  const left = daysLeft(j.closesAt);
                  return (
                    <article
                      key={j.id}
                      className={`hr-job-row${selectedId === j.id && !editingNew ? ' is-on' : ''}`}
                      onClick={() => selectJob(j.id)}
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
                        {j.status === 'draft' ? (
                          <button type="button" className="admin-btn admin-btn-primary az-admin-mini" disabled={busy} onClick={() => void patchJob(j.id, { status: 'open', durationDays: 30, allowDuplicateTitle: allowDupTitle })}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{editingNew || !selected ? 'New job posting' : 'Edit job'}</h3>
              {!editingNew ? (
                <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={startNewJob}>
                  + New
                </button>
              ) : null}
            </div>
            {!editingNew && selected ? (
              <div className="hr-job-meta" style={{ marginBottom: '0.85rem' }}>
                <StatusPill status={selected.status} />
                <span className="hr-pill">{selected.candidateCount ?? 0} applicants</span>
                {selected.closesAt ? <span className="hr-pill">Ends {fmtDate(selected.closesAt)}</span> : null}
                {selected.status === 'open' || selected.status === 'paused' ? (
                  <>
                    <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => void copyApplyLink(selected)}>
                      Copy apply link
                    </button>
                    <button type="button" className="admin-btn admin-btn-secondary az-admin-mini" onClick={() => shareWhatsApp(selected)}>
                      WhatsApp
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            <JobTextAutofill
              defaultOpen={editingNew || !selected}
              value={draft}
              onFill={(next) => setDraft((d) => ({ ...d, ...next }))}
            />
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
                <input className="admin-input" value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} placeholder="New / Urgent" />
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
              <label className="admin-field full">
                <span>Benefits (one per line)</span>
                <textarea className="admin-textarea" rows={3} value={draft.benefits} onChange={(e) => setDraft((d) => ({ ...d, benefits: e.target.value }))} />
              </label>
              <label className="admin-field full">
                <span>Facts — Label: value (one per line)</span>
                <textarea className="admin-textarea" rows={2} value={draft.facts} onChange={(e) => setDraft((d) => ({ ...d, facts: e.target.value }))} />
              </label>
            </div>
            {allowDupTitle ? (
              <p className="az-admin-hint" style={{ marginTop: '0.75rem', color: 'var(--orange, #FF6B1A)' }}>
                Duplicate title acknowledged — next Publish / Go live will create another open role with this title.
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {editingNew || !selected ? (
                <>
                  <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void createJob(true)}>
                    {allowDupTitle ? 'Publish anyway' : 'Publish live'}
                  </button>
                  <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void createJob(false)}>
                    Save draft
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={() => void saveSelected(false)}>
                    Save changes
                  </button>
                  {selected.status !== 'open' ? (
                    <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => void saveSelected(true)}>
                      {allowDupTitle ? 'Go live anyway' : 'Go live'}
                    </button>
                  ) : null}
                  <a className="admin-btn admin-btn-secondary az-admin-mini" href={`/admin/hiring?tab=pipeline&job=${selected.id}`}>
                    Pipeline
                  </a>
                </>
              )}
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
                      <p className="hr-card-sub">
                        {c.email || c.phone || c.source}
                        {c.enquiryId ? ` · #${c.enquiryId}` : ''}
                      </p>
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
                {selectedCand.resumeFile || selectedCand.enquiryId ? (
                  <div className="hr-resume">
                    <span className="hr-resume-label">
                      {selectedCand.resumeName || 'Resume / CV'}
                    </span>
                    <div className="hr-resume-actions">
                      <a
                        className="admin-btn admin-btn-secondary az-admin-mini"
                        href={`/api/admin/hiring/candidates/${selectedCand.id}/resume`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                      </a>
                      <a
                        className="admin-btn admin-btn-secondary az-admin-mini"
                        href={`/api/admin/hiring/candidates/${selectedCand.id}/resume?download=1`}
                      >
                        Download
                      </a>
                      {selectedCand.enquiryId ? (
                        <a
                          className="hr-resume-enquiry"
                          href={`/admin/enquiries?id=${selectedCand.enquiryId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Enquiry #{selectedCand.enquiryId}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="admin-field">
                  <span>Pipeline stage</span>
                  <div className="hr-stage-row" role="group" aria-label="Candidate stage">
                    {[...STAGE_FLOW, 'on_hold' as CandidateStage, 'rejected' as CandidateStage, 'withdrawn' as CandidateStage].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`hr-stage-btn${selectedCand.stage === s ? ' is-on' : ''}`}
                        disabled={busy || selectedCand.stage === s}
                        onClick={() => void moveStage(selectedCand.id, s)}
                      >
                        {STAGE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  {selectedCand.stage === 'hired' ? (
                    <p className="az-admin-hint" style={{ margin: '0 0 0.75rem' }}>
                      Hired — close the role under{' '}
                      <a href={`/admin/hiring?tab=openings&job=${selectedCand.jobId}`}>Openings → Archive</a> when the vacancy is filled.
                    </p>
                  ) : null}
                </div>
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
                  <span>Interview date &amp; time</span>
                  <input
                    className="admin-input"
                    type="datetime-local"
                    value={interviewLocal}
                    onChange={(e) => setInterviewLocal(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary az-admin-mini"
                  style={{ marginBottom: '0.85rem' }}
                  disabled={busy || !interviewLocal}
                  onClick={() => void saveInterviewSchedule()}
                >
                  Save schedule{selectedCand.stage !== 'interview' ? ' & move to Interview' : ''}
                </button>
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
