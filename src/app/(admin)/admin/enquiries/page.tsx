'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import EnquiryExportCentre, { type ExportScope } from '@/components/admin/EnquiryExportCentre';
import type { EnquiryPipelineLink } from '@/lib/career-enquiry-bridge';
import type { CareerJob } from '@/lib/career-hiring-types';
import type { Enquiry } from '@/lib/types';

type EnquiryKind = 'enquiry' | 'careers' | 'callback' | 'brochure';

type EnquiryRow = Enquiry & { pipeline?: EnquiryPipelineLink | null };

const KIND_LABEL: Record<EnquiryKind, string> = {
  enquiry: 'Enquiry',
  careers: 'Careers',
  callback: 'Callback',
  brochure: 'Brochure',
};

function enquiryKind(e: Enquiry): EnquiryKind {
  switch (String(e.payload_json?.source || '')) {
    case 'careers_apply':
      return 'careers';
    case 'callback_request':
      return 'callback';
    case 'brochure_download':
      return 'brochure';
    default:
      return 'enquiry';
  }
}

function hasAttachment(e: Enquiry) {
  return Object.entries(e.payload_json || {}).some(
    ([k, v]) => (/_file$/.test(k) || k === 'resume_url') && typeof v === 'string' && v !== ''
  );
}

function pipeClass(link: EnquiryPipelineLink | null | undefined) {
  if (!link) return 'is-unmatched';
  if (link.holding) return 'is-holding';
  if (link.stage === 'hired') return 'is-hired';
  if (link.stage === 'rejected' || link.stage === 'withdrawn') return 'is-closed';
  if (link.stage === 'interview' || link.stage === 'offer') return 'is-hot';
  return 'is-linked';
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<EnquiryRow | null>(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Enquiry['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | EnquiryKind>('all');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [exportScope, setExportScope] = useState<ExportScope | null>(null);
  const [exportIds, setExportIds] = useState<number[]>([]);
  const [jobs, setJobs] = useState<CareerJob[]>([]);
  const [assignJobId, setAssignJobId] = useState('');
  const [pipeBusy, setPipeBusy] = useState(false);
  const deepLinked = useRef(false);

  async function load(status = statusFilter) {
    const res = await fetch(`/api/admin/enquiries?status=${status}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    setEnquiries(data.enquiries);
    if (data.pipelineSync) setMessage(data.pipelineSync);
    if (!deepLinked.current) {
      deepLinked.current = true;
      const id = Number(new URLSearchParams(window.location.search).get('id'));
      const hit = id ? (data.enquiries as EnquiryRow[]).find((e) => e.id === id) : undefined;
      if (hit) {
        setSelected(hit);
        setNotes(hit.admin_notes || '');
      }
    } else if (selected) {
      const next = (data.enquiries as EnquiryRow[]).find((e) => e.id === selected.id);
      if (next) setSelected(next);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (!selected || enquiryKind(selected) !== 'careers') return;
    void fetch('/api/admin/hiring/jobs?status=active')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.jobs)) setJobs(d.jobs);
      })
      .catch(() => undefined);
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (typeFilter !== 'all' && enquiryKind(e) !== typeFilter) return false;
      if (!term) return true;
      const blob = JSON.stringify(e.payload_json).toLowerCase();
      const pipe = e.pipeline ? `${e.pipeline.stageLabel} ${e.pipeline.jobTitle}`.toLowerCase() : '';
      return (
        blob.includes(term) ||
        pipe.includes(term) ||
        String(e.item_title || '').toLowerCase().includes(term) ||
        String(e.admin_notes || '').toLowerCase().includes(term)
      );
    });
  }, [enquiries, q, typeFilter]);

  const pickedIds = useMemo(() => filtered.filter((e) => picked.has(e.id)).map((e) => e.id), [filtered, picked]);
  const allPicked = filtered.length > 0 && pickedIds.length === filtered.length;
  const careersUnmapped = useMemo(
    () => enquiries.filter((e) => enquiryKind(e) === 'careers' && !e.pipeline).length,
    [enquiries]
  );

  function togglePick(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openExport(scope: ExportScope, ids: number[] = pickedIds) {
    setExportIds(ids);
    setExportScope(scope);
  }

  const viewLabel = [
    statusFilter === 'all' ? 'Any status' : statusFilter.replace('_', ' '),
    typeFilter === 'all' ? 'all types' : KIND_LABEL[typeFilter].toLowerCase(),
    q.trim() ? `“${q.trim()}”` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  async function setStatus(id: number, status: Enquiry['status']) {
    const res = await fetch(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error || 'Update failed');
      return;
    }
    await load();
    if (selected?.id === id) {
      const outreach = (data as { reviewOutreach?: Record<string, unknown> }).reviewOutreach;
      setSelected({
        ...selected,
        status,
        payload_json: outreach
          ? { ...selected.payload_json, reviewOutreach: outreach }
          : selected.payload_json,
      });
      if (outreach && status === 'closed') {
        setMessage(
          'Review request drafted — email app opens now (nothing is sent until you click Send).'
        );
        const mailto = typeof outreach.mailto === 'string' ? outreach.mailto : '';
        if (mailto.startsWith('mailto:')) {
          window.setTimeout(() => {
            window.location.href = mailto;
          }, 250);
        }
      }
    }
  }

  async function draftReviewForSelected() {
    if (!selected) return;
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/enquiries/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftReview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((data as { error?: string }).error || 'Draft failed');
      return;
    }
    const outreach = (data as { reviewOutreach?: Record<string, unknown> }).reviewOutreach;
    if (!outreach) {
      setError('No review draft (careers leads are skipped, or enquiry is not closed).');
      return;
    }
    setSelected({
      ...selected,
      payload_json: { ...selected.payload_json, reviewOutreach: outreach },
    });
    setMessage('Review mailto drafted.');
    const mailto = typeof outreach.mailto === 'string' ? outreach.mailto : '';
    if (mailto.startsWith('mailto:')) {
      window.setTimeout(() => {
        window.location.href = mailto;
      }, 250);
    }
  }

  async function saveNotes() {
    if (!selected) return;
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/enquiries/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Save notes failed');
      return;
    }
    setMessage('Notes saved.');
    setSelected({ ...selected, admin_notes: notes });
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this enquiry permanently?')) return;
    const res = await fetch(`/api/admin/enquiries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Delete failed');
      return;
    }
    setSelected(null);
    await load();
  }

  async function syncAllCareers() {
    setPipeBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/hiring/sync-enquiries', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setMessage(data.message || 'Pipeline sync complete');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setPipeBusy(false);
    }
  }

  async function addToPipeline(enquiryId: number, jobId?: number) {
    setPipeBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/hiring/from-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enquiryId, jobId: jobId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add to pipeline');
      setMessage(jobId ? 'Assigned to role in Hiring pipeline' : 'Added to Hiring pipeline');
      setAssignJobId('');
      await load();
      if (data.hiringUrl) {
        /* keep modal open with refreshed pipeline link */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pipeline update failed');
    } finally {
      setPipeBusy(false);
    }
  }

  return (
    <div>
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <div className="admin-toolbar">
        <div className="left" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['all', 'new', 'in_progress', 'closed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`admin-btn ${statusFilter === s ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
          <select
            className="admin-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | EnquiryKind)}
            aria-label="Type"
          >
            <option value="all">All types</option>
            <option value="enquiry">Enquiries</option>
            <option value="careers">Careers</option>
            <option value="callback">Callbacks</option>
            <option value="brochure">Brochure requests</option>
          </select>
          <input
            className="admin-input"
            placeholder="Search payload or pipeline…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {careersUnmapped > 0 || typeFilter === 'careers' ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              disabled={pipeBusy}
              onClick={() => void syncAllCareers()}
              title="Pull every careers application into Hiring (matched role or General Applications queue)"
            >
              Sync to Hiring{careersUnmapped ? ` (${careersUnmapped})` : ''}
            </button>
          ) : null}
        </div>
        <button type="button" className="admin-btn admin-btn-primary enq-export-btn" onClick={() => openExport('view')}>
          <span aria-hidden>⇩</span> Export…
        </button>
      </div>

      {pickedIds.length ? (
        <div className="enq-selbar">
          <strong>{pickedIds.length} selected</strong>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => openExport('selected')}>
            Export selected with attachments
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setPicked(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <div className="admin-table-wrap admin-card" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="enq-check">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(filtered.map((e) => e.id)))}
                />
              </th>
              <th>When</th>
              <th>Item</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No enquiries match.
                </td>
              </tr>
            ) : (
              filtered.map((enq) => (
                <tr key={enq.id} className={picked.has(enq.id) ? 'admin-table-row--highlight' : undefined}>
                  <td className="enq-check">
                    <input
                      type="checkbox"
                      aria-label={`Select enquiry ${enq.id}`}
                      checked={picked.has(enq.id)}
                      onChange={() => togglePick(enq.id)}
                    />
                  </td>
                  <td>{new Date(enq.created_at).toLocaleString()}</td>
                  <td>
                    {enq.item_title || enq.item_type || 'General'}
                    {enquiryKind(enq) !== 'enquiry' && enquiryKind(enq) !== 'careers' ? (
                      <div className="enq-kind">{KIND_LABEL[enquiryKind(enq)]}</div>
                    ) : null}
                  </td>
                  <td>
                    {String(enq.payload_json.name || '—')}
                    {hasAttachment(enq) ? (
                      <span className="enq-clip" title="Has attachment">
                        📎
                      </span>
                    ) : null}
                    <div style={{ color: 'var(--admin-muted)', fontSize: '0.8rem' }}>
                      {String(enq.payload_json.email || '')}
                    </div>
                    {enq.payload_json.source === 'careers_apply' ? (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span className="admin-badge draft">Careers</span>
                        {enq.payload_json.role ? (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.78rem' }}>
                            {String(enq.payload_json.role)}
                          </span>
                        ) : null}
                        {enq.pipeline ? (
                          <a
                            className={`enq-pipe ${pipeClass(enq.pipeline)}`}
                            href={enq.pipeline.hiringUrl}
                            title="Open in Hiring pipeline"
                          >
                            {enq.pipeline.stageLabel}
                            <span className="enq-pipe-job">{enq.pipeline.jobTitle}</span>
                          </a>
                        ) : (
                          <span className={`enq-pipe ${pipeClass(null)}`}>Not in pipeline</span>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${enq.status === 'new' ? 'new' : enq.status === 'closed' ? 'closed' : 'draft'}`}
                    >
                      {enq.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      onClick={() => {
                        setSelected(enq);
                        setNotes(enq.admin_notes || '');
                        setMessage('');
                        setAssignJobId('');
                      }}
                    >
                      View
                    </button>{' '}
                    <select
                      className="admin-select"
                      value={enq.status}
                      onChange={(e) => setStatus(enq.id, e.target.value as Enquiry['status'])}
                    >
                      <option value="new">new</option>
                      <option value="in_progress">in_progress</option>
                      <option value="closed">closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="admin-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Enquiry #{selected.id}</h2>
            <p style={{ color: 'var(--admin-muted)', marginTop: 0 }}>
              {selected.item_title || selected.item_type || 'General'} · {new Date(selected.created_at).toLocaleString()}
            </p>

            {enquiryKind(selected) === 'careers' ? (
              <div className="enq-pipe-panel">
                <h3>Hiring pipeline</h3>
                {selected.pipeline ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                      <strong>{selected.pipeline.stageLabel}</strong>
                      {selected.pipeline.holding
                        ? ' — website apply that still needs a role; pick one below'
                        : ` · ${selected.pipeline.jobTitle}`}
                    </p>
                    <div className="enq-pipe-actions">
                      <a className="admin-btn admin-btn-primary az-admin-mini" href={selected.pipeline.hiringUrl}>
                        Open in Hiring →
                      </a>
                      {selected.pipeline.holding || selected.pipeline.jobTitle === 'General Applications' ? (
                        <>
                          <select
                            className="admin-select"
                            value={assignJobId}
                            onChange={(e) => setAssignJobId(e.target.value)}
                            aria-label="Assign to role"
                          >
                            <option value="">Assign to a live role…</option>
                            {jobs
                              .filter((j) => j.slug !== 'general-applications')
                              .map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.title} ({j.status})
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary az-admin-mini"
                            disabled={pipeBusy || !assignJobId}
                            onClick={() => void addToPipeline(selected.id, Number(assignJobId))}
                          >
                            Reassign
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                      Not in Hiring yet. Sync will match an open role, or place them in the General Applications queue.
                    </p>
                    <div className="enq-pipe-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary az-admin-mini"
                        disabled={pipeBusy}
                        onClick={() => void addToPipeline(selected.id)}
                      >
                        Add to pipeline
                      </button>
                      <select
                        className="admin-select"
                        value={assignJobId}
                        onChange={(e) => setAssignJobId(e.target.value)}
                        aria-label="Force assign role"
                      >
                        <option value="">Or pick a role…</option>
                        {jobs
                          .filter((j) => j.slug !== 'general-applications')
                          .map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.title} ({j.status})
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary az-admin-mini"
                        disabled={pipeBusy || !assignJobId}
                        onClick={() => void addToPipeline(selected.id, Number(assignJobId))}
                      >
                        Assign role
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {selected.status === 'closed' && enquiryKind(selected) !== 'careers' ? (
              <div className="enq-pipe-panel" style={{ marginBottom: '1rem' }}>
                <h3>Growth · Google review</h3>
                <p style={{ margin: '0 0 0.65rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  One-click mailto after a won job — Meridian never sends on your behalf.
                </p>
                {selected.payload_json?.reviewOutreach &&
                typeof selected.payload_json.reviewOutreach === 'object' &&
                'mailto' in (selected.payload_json.reviewOutreach as object) ? (
                  <a
                    className="admin-btn admin-btn-primary az-admin-mini"
                    href={String((selected.payload_json.reviewOutreach as { mailto: string }).mailto)}
                  >
                    Ask for Google review
                  </a>
                ) : (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary az-admin-mini"
                    onClick={() => void draftReviewForSelected()}
                  >
                    Draft review request
                  </button>
                )}
              </div>
            ) : null}

            <div className="admin-form-grid" style={{ marginBottom: '1rem' }}>
              {Object.entries(selected.payload_json || {}).map(([key, value]) => {
                if (
                  key === 'resume_file' ||
                  key === 'reviewOutreach' ||
                  key === 'resume_mime' ||
                  key === 'resume_url' ||
                  key === 'hiring_url' ||
                  key === 'pipeline_matched' ||
                  key === 'pipeline_duplicate' ||
                  key === 'pipeline_holding' ||
                  key === 'candidate_id'
                ) {
                  return null;
                }
                if (key === 'resume_name') {
                  if (!(selected.payload_json.resume_file || selected.payload_json.resume_url)) return null;
                  return (
                    <div key={key} className="admin-field">
                      <label>resume</label>
                      <div style={{ fontSize: '0.92rem' }}>
                        <a href={`/api/admin/enquiries/${selected.id}/resume`} target="_blank" rel="noopener noreferrer">
                          Download {String(value || 'resume')}
                        </a>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={key} className="admin-field">
                    <label>{key}</label>
                    <div style={{ fontSize: '0.92rem' }}>{String(value ?? '—')}</div>
                  </div>
                );
              })}
              {!selected.payload_json.resume_name &&
              (selected.payload_json.resume_file || selected.payload_json.resume_url) ? (
                <div className="admin-field">
                  <label>resume</label>
                  <div style={{ fontSize: '0.92rem' }}>
                    <a href={`/api/admin/enquiries/${selected.id}/resume`} target="_blank" rel="noopener noreferrer">
                      Download resume
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="admin-field">
              <label>Admin notes</label>
              <textarea className="admin-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-danger" onClick={() => remove(selected.id)}>
                Delete
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  const id = selected.id;
                  setSelected(null);
                  openExport('selected', [id]);
                }}
              >
                Export this enquiry
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveNotes}>
                Save notes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {exportScope ? (
        <EnquiryExportCentre
          open
          initialScope={exportScope}
          view={{ status: statusFilter, type: typeFilter, q, label: viewLabel }}
          selectedIds={exportIds}
          onClose={() => setExportScope(null)}
          onExported={(marked) => {
            if (marked) load().catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}
