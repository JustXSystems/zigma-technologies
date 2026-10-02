'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ExportScope = 'view' | 'selected' | 'new' | 'range' | 'all';
type Format = 'zip' | 'xlsx' | 'csv' | 'json';

type Preview = {
  scopeLabel: string;
  count: number;
  capped: boolean;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  attachments: { total: number; present: number; missing: number; bytes: number };
  estimatedBytes: number;
  newestAt: string | null;
  oldestAt: string | null;
  newSinceLastExport: number;
  lastExportAt: string | null;
  history: Array<{
    id: number;
    actor: string;
    format: string;
    enquiry_count: number;
    attachment_count: number;
    bytes: number;
    status: string;
    created_at: string;
  }>;
};

type Progress =
  | { phase: 'idle' }
  | { phase: 'running'; received: number; total: number; startedAt: number }
  | { phase: 'done'; fileName: string; bytes: number; count: number; files: number; savedToDisk: boolean }
  | { phase: 'error'; message: string };

type SaveHandle = { createWritable: () => Promise<{ write: (d: Uint8Array) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }> };
type SavePickerWindow = Window & {
  showSaveFilePicker?: (opts: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveHandle>;
};

const TYPE_LABEL: Record<string, string> = {
  enquiry: 'Enquiries',
  careers: 'Job applications',
  callback: 'Callbacks',
  brochure: 'Brochure requests',
};
const STATUS_LABEL: Record<string, string> = { new: 'New', in_progress: 'In progress', closed: 'Closed' };

const FORMATS: Array<{ id: Format; title: string; text: string; badge?: string }> = [
  { id: 'zip', title: 'Complete package', text: 'Excel, CSV and JSON, plus an offline inbox and every attachment, in one .zip file', badge: 'Recommended' },
  { id: 'xlsx', title: 'Excel workbook', text: 'Enquiries and Summary sheets, with filters and real dates' },
  { id: 'csv', title: 'CSV', text: 'Imports into CRMs and Google Sheets' },
  { id: 'json', title: 'JSON', text: 'Structured data for developers and integrations' },
];

export function formatBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

function relativeTime(iso: string | null) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} day${d > 1 ? 's' : ''} ago` : new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EnquiryExportCentre({
  open,
  onClose,
  initialScope,
  view,
  selectedIds,
  onExported,
}: {
  open: boolean;
  onClose: () => void;
  initialScope: ExportScope;
  view: { status: string; type: string; q: string; label: string };
  selectedIds: number[];
  onExported: (markedInProgress: boolean) => void;
}) {
  const [scope, setScope] = useState<ExportScope>(initialScope);
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [format, setFormat] = useState<Format>('zip');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [markInProgress, setMarkInProgress] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress>({ phase: 'idle' });
  const [revision, setRevision] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const body = useCallback(
    (action: 'preview' | 'download') =>
      JSON.stringify({
        action,
        scope,
        status: view.status,
        type: view.type,
        q: view.q,
        from: scope === 'range' ? from : undefined,
        to: scope === 'range' ? to : undefined,
        ids: scope === 'selected' ? selectedIds : undefined,
        format,
        includeAttachments,
        markInProgress,
      }),
    [scope, view, from, to, selectedIds, format, includeAttachments, markInProgress]
  );

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/enquiries/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body('preview'),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Preview failed');
        setPreview(data);
        setPreviewError('');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setPreviewError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, body, revision]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && progress.phase !== 'running') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, progress.phase]);

  async function runExport() {
    if (!preview?.count) return;
    const ext = format;
    const suggestedName = `enquiries_${isoDay(new Date())}.${ext}`;
    let writable: Awaited<ReturnType<SaveHandle['createWritable']>> | null = null;
    const picker = (window as SavePickerWindow).showSaveFilePicker;
    if (picker && format === 'zip') {
      try {
        const handle = await picker({ suggestedName, types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }] });
        writable = await handle.createWritable();
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        writable = null;
      }
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const startedAt = Date.now();
    setProgress({ phase: 'running', received: 0, total: preview.estimatedBytes, startedAt });
    try {
      const res = await fetch('/api/admin/enquiries/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body('download'),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const fileName = res.headers.get('X-Export-Filename') || suggestedName;
      const count = Number(res.headers.get('X-Export-Count') || preview.count);
      const files = Number(res.headers.get('X-Export-Attachments') || 0);
      const total = Number(res.headers.get('Content-Length') || res.headers.get('X-Export-Estimated-Bytes') || preview.estimatedBytes);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      let lastPaint = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (writable) await writable.write(value);
        else chunks.push(value);
        if (Date.now() - lastPaint > 120) {
          lastPaint = Date.now();
          setProgress({ phase: 'running', received, total, startedAt });
        }
      }
      if (writable) {
        await writable.close();
      } else {
        const blob = new Blob(chunks as BlobPart[], { type: res.headers.get('Content-Type') || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
      setProgress({ phase: 'done', fileName, bytes: received, count, files, savedToDisk: Boolean(writable) });
      onExported(markInProgress);
      setRevision((r) => r + 1);
    } catch (e) {
      await writable?.abort().catch(() => undefined);
      const aborted = (e as Error).name === 'AbortError';
      setProgress(aborted ? { phase: 'idle' } : { phase: 'error', message: (e as Error).message });
    } finally {
      abortRef.current = null;
    }
  }

  if (!open) return null;

  const running = progress.phase === 'running';
  const pct = running ? Math.min(99, Math.round((progress.received / Math.max(1, progress.total)) * 100)) : 0;
  const elapsed = running ? (Date.now() - progress.startedAt) / 1000 : 0;
  const speed = running && elapsed > 0.5 ? progress.received / elapsed : 0;

  const scopes: Array<{ id: ExportScope; title: string; text: string; disabled?: boolean }> = [
    { id: 'view', title: 'Current view', text: view.label },
    {
      id: 'selected',
      title: 'Selected rows',
      text: selectedIds.length ? `${selectedIds.length} selected` : 'Tick rows in the table first',
      disabled: !selectedIds.length,
    },
    {
      id: 'new',
      title: 'New since last export',
      text: preview
        ? `${preview.newSinceLastExport} new · last export ${relativeTime(preview.lastExportAt)}`
        : 'Everything not yet exported',
    },
    { id: 'range', title: 'Date range', text: 'Choose dates or a preset' },
    { id: 'all', title: 'Everything', text: 'Full archive and backup' },
  ];

  const presets: Array<[string, () => void]> = [
    ['Today', () => { setFrom(isoDay(new Date())); setTo(isoDay(new Date())); }],
    ['Last 7 days', () => { setFrom(isoDay(new Date(Date.now() - 6 * 86_400_000))); setTo(isoDay(new Date())); }],
    ['This month', () => { const d = new Date(); setFrom(isoDay(new Date(d.getFullYear(), d.getMonth(), 1))); setTo(isoDay(d)); }],
    ['Last 30 days', () => { setFrom(isoDay(new Date(Date.now() - 29 * 86_400_000))); setTo(isoDay(new Date())); }],
    ['This year', () => { const d = new Date(); setFrom(`${d.getFullYear()}-01-01`); setTo(isoDay(d)); }],
  ];

  return createPortal(
    <div className="admin-modal-backdrop ex-backdrop" onClick={() => !running && onClose()}>
      <div className="ex" role="dialog" aria-modal="true" aria-labelledby="ex-title" onClick={(e) => e.stopPropagation()}>
        <div className="ex-head">
          <div>
            <div className="ex-eyebrow">Business continuity</div>
            <h2 id="ex-title">Export centre</h2>
            <p>Take every enquiry and its attachments offline, so you can keep working even when email isn’t set up.</p>
          </div>
          <button type="button" className="ex-close" onClick={onClose} disabled={running} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ex-body">
          <div className="ex-config">
            <section>
              <h3>1 · What to export</h3>
              <div className="ex-tiles">
                {scopes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ex-tile${scope === s.id ? ' is-active' : ''}`}
                    disabled={s.disabled || running}
                    onClick={() => setScope(s.id)}
                  >
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
              {scope === 'range' ? (
                <div className="ex-range">
                  <label>
                    From
                    <input type="date" className="admin-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label>
                    To
                    <input type="date" className="admin-input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                  </label>
                  <div className="ex-presets">
                    {presets.map(([label, fn]) => (
                      <button key={label} type="button" className="ex-chip" onClick={fn}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section>
              <h3>2 · Format</h3>
              <div className="ex-formats">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`ex-format${format === f.id ? ' is-active' : ''}`}
                    disabled={running}
                    onClick={() => setFormat(f.id)}
                  >
                    <span className="ex-ext">.{f.id}</span>
                    <span className="ex-format-text">
                      <strong>
                        {f.title} {f.badge ? <em>{f.badge}</em> : null}
                      </strong>
                      <span>{f.text}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3>3 · Options</h3>
              <label className={`ex-option${format !== 'zip' ? ' is-disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={format === 'zip' && includeAttachments}
                  disabled={format !== 'zip' || running}
                  onChange={(e) => setIncludeAttachments(e.target.checked)}
                />
                <span>
                  <strong>Include attachments</strong>
                  <small>CVs and uploaded files, one folder per enquiry, with links from Excel and the offline inbox.</small>
                </span>
              </label>
              <label className="ex-option">
                <input type="checkbox" checked={markInProgress} disabled={running} onChange={(e) => setMarkInProgress(e.target.checked)} />
                <span>
                  <strong>Mark exported “new” enquiries as In progress</strong>
                  <small>Useful when the export is handed to the sales or HR team to work on.</small>
                </span>
              </label>
            </section>
          </div>

          <aside className="ex-side">
            <div className={`ex-preview${loading ? ' is-loading' : ''}`}>
              <span className="ex-eyebrow">Preview</span>
              {previewError ? (
                <div className="admin-error">{previewError}</div>
              ) : preview ? (
                <>
                  <div className="ex-big">
                    <strong>{preview.count.toLocaleString('en-IN')}</strong>
                    <span>{preview.count === 1 ? 'enquiry' : 'enquiries'}</span>
                  </div>
                  <p className="ex-scope">{preview.scopeLabel}</p>
                  {preview.count ? (
                    <>
                      <div className="ex-breakdown">
                        {Object.entries(preview.byType).map(([k, v]) => (
                          <span key={k} className={`ex-pill ex-pill--${k}`}>
                            {TYPE_LABEL[k] || k} <b>{v}</b>
                          </span>
                        ))}
                      </div>
                      <div className="ex-breakdown">
                        {Object.entries(preview.byStatus).map(([k, v]) => (
                          <span key={k} className="ex-pill">
                            {STATUS_LABEL[k] || k} <b>{v}</b>
                          </span>
                        ))}
                      </div>
                      <dl className="ex-facts">
                        {format === 'zip' && includeAttachments ? (
                          <>
                            <dt>Attachments</dt>
                            <dd>
                              {preview.attachments.present} file{preview.attachments.present === 1 ? '' : 's'} · {formatBytes(preview.attachments.bytes)}
                            </dd>
                          </>
                        ) : null}
                        <dt>Estimated size</dt>
                        <dd>≈ {formatBytes(preview.estimatedBytes)}</dd>
                        {preview.oldestAt ? (
                          <>
                            <dt>Period</dt>
                            <dd>
                              {new Date(preview.oldestAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} –{' '}
                              {new Date(preview.newestAt || preview.oldestAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </dd>
                          </>
                        ) : null}
                      </dl>
                      {preview.attachments.missing ? (
                        <div className="ex-warn">
                          {preview.attachments.missing} attachment file{preview.attachments.missing === 1 ? ' is' : 's are'} missing on the server. They’ll be
                          flagged in the report.
                        </div>
                      ) : null}
                      {preview.capped ? <div className="ex-warn">Limited to the newest 10,000 records. Use a date range for older data.</div> : null}
                    </>
                  ) : (
                    <p className="ex-empty">Nothing matches this selection.</p>
                  )}
                </>
              ) : (
                <div className="ex-skeleton" />
              )}
            </div>

            {preview?.history.length ? (
              <div className="ex-history">
                <span className="ex-eyebrow">Recent exports</span>
                <ul>
                  {preview.history.map((h) => (
                    <li key={h.id}>
                      <span className={`ex-dot ex-dot--${h.status}`} title={h.status === 'started' ? 'Interrupted or still running' : h.status} />
                      <span>
                        <strong>
                          {h.enquiry_count} · .{h.format}
                          {h.attachment_count ? ` · ${h.attachment_count} files` : ''}
                        </strong>
                        <small>
                          {relativeTime(h.created_at)} · {h.actor.replace(/\s*<.*>$/, '')}
                          {h.bytes ? ` · ${formatBytes(h.bytes)}` : ''}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="ex-foot">
          {progress.phase === 'running' ? (
            <div className="ex-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="ex-progress-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <small>
                Packaging and downloading · {formatBytes(progress.received)}
                {speed ? ` · ${formatBytes(speed)}/s` : ''}
              </small>
            </div>
          ) : progress.phase === 'done' ? (
            <div className="ex-done">
              <strong>✓ {progress.fileName}</strong>
              <small>
                {progress.count} enquiries{progress.files ? ` · ${progress.files} attachments` : ''} · {formatBytes(progress.bytes)}
                {progress.savedToDisk ? ' · saved to the chosen folder' : ' · check your Downloads folder'}
              </small>
            </div>
          ) : progress.phase === 'error' ? (
            <div className="ex-error">{progress.message}</div>
          ) : (
            <small className="ex-note">Contains personal data. The export is logged; store it securely.</small>
          )}
          <div className="ex-actions">
            {running ? (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            ) : (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
                {progress.phase === 'done' ? 'Close' : 'Cancel'}
              </button>
            )}
            <button type="button" className="admin-btn admin-btn-primary ex-go" disabled={running || loading || !preview?.count} onClick={runExport}>
              {running
                ? `${pct}%`
                : preview?.count
                  ? `Export ${preview.count} ${preview.count === 1 ? 'enquiry' : 'enquiries'}${format === 'zip' && includeAttachments && preview.attachments.present ? ` + ${preview.attachments.present} files` : ''}`
                  : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
