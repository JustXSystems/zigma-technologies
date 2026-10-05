'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { CatalogItemType } from '@/lib/types';
import type { PlannedRow, ResultRow, RowAction, TransferJob, TransferPlan } from '@/lib/catalog-transfer';
import { DEFAULT_TRANSFER_OPTIONS, SEO_DESCRIPTION_RANGE, SEO_TITLE_RANGE, type TransferOptions } from '@/lib/catalog-transfer-columns';
import { baseName, hasMediaExtension, mediaMatchKey } from '@/lib/media-naming';
import { formatMediaBytes } from '@/lib/media-upload-rules';

const TYPES: CatalogItemType[] = ['product', 'service', 'project'];
const TYPE_LABEL: Record<CatalogItemType, string> = { product: 'Products', service: 'Services', project: 'Projects' };
const WORKBOOK_RE = /\.(xlsx|xlsm|csv|xls)$/i;
const UPLOAD_CONCURRENCY = 3;
const PAGE_SIZE = 60;

type LocalFile = { file: File; rel: string };
type Phase = 'idle' | 'analysing' | 'uploading' | 'ready' | 'committing' | 'done';
type Filter = 'all' | 'changes' | 'create' | 'update' | 'issues' | 'unchanged' | 'skipped';
type Job = { jobId: number; fileName: string; plan: TransferPlan };
type Upload = { done: number; total: number; current: string; failed: Array<{ name: string; error: string }>; reused: number };

const ACTION_META: Record<RowAction, { label: string; tone: string }> = {
  create: { label: 'New', tone: 'create' },
  update: { label: 'Update', tone: 'update' },
  unchanged: { label: 'No change', tone: 'muted' },
  skip: { label: 'Skipped', tone: 'muted' },
  archive: { label: 'Archive', tone: 'warn' },
  delete: { label: 'Delete', tone: 'danger' },
  error: { label: 'Fix needed', tone: 'danger' },
};
const RESULT_META: Record<ResultRow['status'], { label: string; tone: string }> = {
  created: { label: 'Created', tone: 'create' },
  updated: { label: 'Updated', tone: 'update' },
  unchanged: { label: 'No change', tone: 'muted' },
  archived: { label: 'Archived', tone: 'warn' },
  deleted: { label: 'Deleted', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'muted' },
  failed: { label: 'Failed', tone: 'danger' },
};
const SOURCE_LABEL: Record<string, string> = {
  upload: 'uploaded now',
  'original-name': 'original file name',
  'file-name': 'stored file name',
  path: 'library path',
  'similar-name': 'similar name',
};

/* ---------------------------------------------------------------- helpers */

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => ({}) as { error?: string });
  return (data as { error?: string }).error || `${fallback} (${res.status})`;
}

async function downloadFrom(url: string, fallbackName: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(await readError(res, 'Download failed'));
  const blob = await res.blob();
  const name = res.headers.get('X-Export-Filename') || fallbackName;
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30_000);
  return { name, count: Number(res.headers.get('X-Export-Count') || 0) };
}

async function fetchJobs(): Promise<TransferJob[] | null> {
  const res = await fetch('/api/admin/catalog-transfer/jobs', { cache: 'no-store' }).catch(() => null);
  return res?.ok ? ((await res.json()) as { jobs: TransferJob[] }).jobs : null;
}

/** Downloads the import workbook: live data (optionally only `ids`) or a blank template. */
export function downloadCatalogWorkbook({ types, mode, ids }: { types: CatalogItemType[]; mode: 'data' | 'blank'; ids?: number[] }) {
  const qs = new URLSearchParams({ types: types.join(','), mode, examples: '1' });
  if (ids?.length) qs.set('ids', ids.join(','));
  return downloadFrom(`/api/admin/catalog-transfer/template?${qs}`, 'catalog-data.xlsx');
}

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: LocalFile[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    out.push({ file, rel: `${prefix}${file.name}` });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns batches (~100) until empty.
    for (let batch = await readEntries(reader); batch.length; batch = await readEntries(reader)) {
      for (const child of batch) await walkEntry(child, `${prefix}${entry.name}/`, out);
    }
  }
}

async function filesFromDrop(e: DragEvent): Promise<LocalFile[]> {
  const items = Array.from(e.dataTransfer.items || []);
  const entries = items.map((i) => i.webkitGetAsEntry?.()).filter((x): x is FileSystemEntry => !!x);
  if (!entries.length) return Array.from(e.dataTransfer.files).map((file) => ({ file, rel: file.name }));
  const out: LocalFile[] = [];
  for (const entry of entries) await walkEntry(entry, '', out);
  return out;
}

function fromInput(list: FileList | null): LocalFile[] {
  return Array.from(list || []).map((file) => ({ file, rel: file.webkitRelativePath || file.name }));
}

/** Local file that a spreadsheet reference points to — same order the server uses. */
function matchLocal(ref: string, files: LocalFile[]): LocalFile | undefined {
  const lower = ref.trim().toLowerCase().replace(/\\/g, '/');
  const base = baseName(lower);
  const key = mediaMatchKey(ref);
  return (
    files.find((f) => {
      const rel = f.rel.toLowerCase();
      return rel === lower || rel.endsWith(`/${lower}`);
    }) ??
    files.find((f) => f.file.name.toLowerCase() === base) ??
    files.find((f) => mediaMatchKey(f.file.name) === key)
  );
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) return 'muted';
  return score >= 80 ? 'good' : score >= 60 ? 'ok' : 'low';
}

/* ---------------------------------------------------------------- small pieces */

function Gauge({ value, label, size = 112 }: { value: number | null; label: string; size?: number }) {
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className={`ct-gauge ct-gauge--${scoreTone(value)}`} style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value ?? 'n/a'}`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ct-gauge-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ct-gauge-value"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>
        <strong>{value ?? '—'}</strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function ScoreChip({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <span className="ct-score ct-score--muted">—</span>;
  return (
    <span className={`ct-score ct-score--${scoreTone(score)}`} title="SEO readiness">
      {score}
    </span>
  );
}

function Toggle({ checked, onChange, title, hint, danger }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string; danger?: boolean }) {
  return (
    <label className={`ct-toggle${danger ? ' is-danger' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ct-switch" aria-hidden />
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return (
    <div className="ct-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Step({ n, title, active, done, children }: { n: number; title: string; active: boolean; done: boolean; children: ReactNode }) {
  return (
    <li className={`ct-step${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}>
      <span className="ct-step-n">{done ? '✓' : n}</span>
      <span>
        <strong>{title}</strong>
        <small>{children}</small>
      </span>
    </li>
  );
}

/* ---------------------------------------------------------------- row detail */

function RowDetail({ row, result }: { row: PlannedRow; result?: ResultRow }) {
  const errors = row.issues.filter((i) => i.level === 'error');
  const warnings = row.issues.filter((i) => i.level === 'warning');
  const notes = row.issues.filter((i) => i.level === 'info');
  return (
    <div className="ct-detail">
      <section>
        <h4>Changes {row.changes.length ? <em>{row.changes.length}</em> : null}</h4>
        {row.changes.length ? (
          <table className="ct-diff">
            <tbody>
              {row.changes.map((c, i) => (
                <tr key={`${c.field}-${i}`}>
                  <th>
                    {c.label}
                    {c.auto ? <span className="ct-auto" title="Filled in by SEO autopilot">auto</span> : null}
                  </th>
                  <td className="ct-before">{c.before}</td>
                  <td aria-hidden>→</td>
                  <td className="ct-after">{c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ct-quiet">{row.reason || 'Nothing to change.'}</p>
        )}
        {result?.status === 'failed' ? <p className="ct-issue ct-issue--error">{result.message}</p> : null}
      </section>
      <section>
        <h4>Checks</h4>
        {[...errors, ...warnings, ...notes].length ? (
          <ul className="ct-issues">
            {errors.map((i, k) => (
              <li key={`e${k}`} className="ct-issue ct-issue--error">
                {i.message}
              </li>
            ))}
            {warnings.map((i, k) => (
              <li key={`w${k}`} className="ct-issue ct-issue--warn">
                {i.message}
              </li>
            ))}
            {notes.map((i, k) => (
              <li key={`i${k}`} className="ct-issue ct-issue--info">
                {i.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="ct-quiet">No problems found.</p>
        )}
        {row.media.length ? (
          <>
            <h4>Media</h4>
            <ul className="ct-media-refs">
              {row.media.map((m, k) => (
                <li key={`${m.ref}-${k}`} className={`is-${m.status}`}>
                  <span className="ct-role">{m.role}</span>
                  <span className="ct-ref" title={m.path || m.ref}>
                    {m.ref}
                  </span>
                  <small>
                    {m.status === 'resolved'
                      ? `✓ ${SOURCE_LABEL[m.source || ''] || 'found'}${m.size ? ` · ${formatMediaBytes(m.size)}` : ''}`
                      : m.status === 'missing'
                        ? 'not found — add the file'
                        : m.note || 'cannot be used'}
                  </small>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <section>
        <h4>
          SEO readiness <ScoreChip score={row.seo?.score} />
        </h4>
        {row.seo ? (
          <ul className="ct-checks">
            {row.seo.checks.map((c) => (
              <li key={c.id} className={`is-${c.state}`} title={c.tip}>
                <span aria-hidden>{c.state === 'pass' ? '●' : c.state === 'warn' ? '◐' : '○'}</span>
                <span>
                  {c.label}
                  {c.state !== 'pass' && c.tip ? <small>{c.tip}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ct-quiet">Not scored.</p>
        )}
        {row.seo && !row.seo.indexable ? <p className="ct-quiet">Not visible to search engines yet (draft, hidden or noindex).</p> : null}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- main */

/**
 * Full-screen Excel import / export workspace opened from Inventory. It stays mounted while
 * hidden, so closing it by accident keeps the review in progress.
 */
export default function CatalogTransferStudio({
  open: visible,
  currentType,
  onClose,
  onPublished,
}: {
  open: boolean;
  currentType: CatalogItemType;
  onClose: () => void;
  onPublished?: () => void;
}) {
  const [types, setTypes] = useState<CatalogItemType[]>([currentType]);
  const [downloading, setDownloading] = useState<'' | 'data' | 'blank'>('');
  const [downloadNote, setDownloadNote] = useState('');

  const [workbook, setWorkbook] = useState<File | null>(null);
  const [localMedia, setLocalMedia] = useState<LocalFile[]>([]);
  const [ignored, setIgnored] = useState(0);
  const [dragging, setDragging] = useState(false);

  const [options, setOptions] = useState<TransferOptions>(DEFAULT_TRANSFER_OPTIONS);
  const [showRules, setShowRules] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [job, setJob] = useState<Job | null>(null);
  const [checkedOptions, setCheckedOptions] = useState<string>('');
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<Upload | null>(null);
  const [results, setResults] = useState<{ tally: Record<string, number>; rows: ResultRow[] } | null>(null);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [history, setHistory] = useState<TransferJob[]>([]);

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const [typesFor, setTypesFor] = useState(currentType);
  if (typesFor !== currentType) {
    setTypesFor(currentType);
    setTypes((prev) => (prev.length === 1 ? [currentType] : prev));
  }

  const loadHistory = useCallback(() => fetchJobs().then((jobs) => jobs && setHistory(jobs)), []);

  useEffect(() => {
    if (!visible) return;
    let live = true;
    fetchJobs().then((jobs) => {
      if (live && jobs) setHistory(jobs);
    });
    return () => {
      live = false;
    };
  }, [visible]);

  const busy = phase === 'analysing' || phase === 'uploading' || phase === 'committing';
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });
  const requestClose = useCallback(() => {
    if (busyRef.current && !window.confirm('Work is still running. Close anyway? It continues in the background.')) return;
    closeRef.current();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, requestClose]);

  // folder pickers need the non-standard attribute set imperatively
  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '');
    folderInput.current?.setAttribute('directory', '');
  }, []);

  const optionsKey = JSON.stringify(options);
  const stale = !!job && phase === 'ready' && checkedOptions !== optionsKey;
  const plan = job?.plan ?? null;
  const resultByKey = useMemo(() => new Map((results?.rows || []).map((r) => [r.key, r])), [results]);

  /* ---------- download */

  async function download(mode: 'data' | 'blank') {
    if (!types.length) return;
    setDownloading(mode);
    setDownloadNote('');
    setError('');
    try {
      const { name, count } = await downloadCatalogWorkbook({ types, mode });
      setDownloadNote(mode === 'data' ? `${name} · ${count} items ready to edit` : `${name} · blank template with sample rows`);
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloading('');
    }
  }

  /* ---------- intake */

  function intake(files: LocalFile[]) {
    if (!files.length) return;
    const book = files.find((f) => WORKBOOK_RE.test(f.file.name) && !f.file.name.startsWith('~$'));
    const media = files.filter((f) => hasMediaExtension(f.file.name));
    setIgnored((n) => n + files.length - media.length - (book ? 1 : 0));
    if (media.length) {
      setLocalMedia((prev) => {
        const seen = new Set(prev.map((f) => f.rel.toLowerCase()));
        return [...prev, ...media.filter((f) => !seen.has(f.rel.toLowerCase()))];
      });
    }
    if (book) {
      setWorkbook(book.file);
      setJob(null);
      setResults(null);
      setPhase('idle');
      setError('');
    } else if (job && phase === 'ready' && media.length) {
      void uploadAndRecheck(job, [...localMedia, ...media]);
    }
  }

  function resetAll() {
    setWorkbook(null);
    setLocalMedia([]);
    setIgnored(0);
    setJob(null);
    setResults(null);
    setUpload(null);
    setMediaMap({});
    setPhase('idle');
    setError('');
    setOpen(new Set());
    setFilter('all');
    setQuery('');
  }

  /* ---------- analyse / upload / commit */

  async function analyse(input: { file?: File; jobId?: number; map: Record<string, string> }): Promise<Job> {
    const fd = new FormData();
    if (input.file) fd.append('file', input.file);
    else fd.append('jobId', String(input.jobId));
    fd.append('options', JSON.stringify(options));
    fd.append('mediaMap', JSON.stringify(input.map));
    fd.append('fallbackType', currentType);
    const res = await fetch('/api/admin/catalog-transfer/analyse', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await readError(res, 'Analysis failed'));
    const data = (await res.json()) as Job;
    setCheckedOptions(JSON.stringify(options));
    return data;
  }

  async function uploadMatches(current: Job, files: LocalFile[], map: Record<string, string>) {
    const missing = current.plan.media.filter((m) => m.status === 'missing');
    const queue = new Map<LocalFile, string[]>();
    for (const m of missing) {
      const hit = matchLocal(m.ref, files);
      if (hit) queue.set(hit, [...(queue.get(hit) || []), m.ref]);
    }
    if (!queue.size) return { map, uploaded: 0 };

    const tasks = [...queue.entries()];
    const next = { ...map };
    const state: Upload = { done: 0, total: tasks.length, current: '', failed: [], reused: 0 };
    setUpload({ ...state });
    let cursor = 0;
    const worker = async () => {
      while (cursor < tasks.length) {
        const [local, refs] = tasks[cursor++];
        state.current = local.file.name;
        setUpload({ ...state });
        const fd = new FormData();
        fd.append('file', local.file);
        fd.append('original_name', local.file.name);
        fd.append('dedupe', '1');
        try {
          const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
          if (!res.ok) throw new Error(await readError(res, 'Upload failed'));
          const data = (await res.json()) as { path: string; reused?: boolean };
          if (data.reused) state.reused++;
          for (const ref of refs) next[ref.trim().toLowerCase().replace(/\\/g, '/')] = data.path;
          next[local.rel.toLowerCase()] = data.path;
          next[local.file.name.toLowerCase()] = data.path;
        } catch (e) {
          state.failed.push({ name: local.rel, error: e instanceof Error ? e.message : 'Upload failed' });
        }
        state.done++;
        setUpload({ ...state });
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, tasks.length) }, worker));
    setMediaMap(next);
    return { map: next, uploaded: tasks.length - state.failed.length };
  }

  async function uploadAndRecheck(current: Job, files: LocalFile[]) {
    setError('');
    setPhase('uploading');
    try {
      const { map, uploaded } = await uploadMatches(current, files, mediaMap);
      setPhase('analysing');
      setJob(uploaded ? await analyse({ jobId: current.jobId, map }) : current);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setPhase('ready');
    }
  }

  async function start() {
    if (!workbook) return;
    setError('');
    setResults(null);
    setOpen(new Set());
    setLimit(PAGE_SIZE);
    setPhase('analysing');
    try {
      let current = await analyse({ file: workbook, map: mediaMap });
      setJob(current);
      if (localMedia.length && current.plan.media.some((m) => m.status === 'missing')) {
        setPhase('uploading');
        const { map, uploaded } = await uploadMatches(current, localMedia, mediaMap);
        if (uploaded) {
          setPhase('analysing');
          current = await analyse({ jobId: current.jobId, map });
          setJob(current);
        }
      }
      setFilter(current.plan.summary.error ? 'issues' : 'all');
      setPhase('ready');
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setPhase(job ? 'ready' : 'idle');
    }
  }

  async function recheck() {
    if (!job) return;
    setError('');
    setPhase('analysing');
    try {
      setJob(await analyse({ jobId: job.jobId, map: mediaMap }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    }
    setPhase('ready');
  }

  async function publish() {
    if (!job || !plan) return;
    const { create, update, archive, delete: del } = plan.summary;
    if (del && !window.confirm(`${del} item${del === 1 ? '' : 's'} will be permanently deleted. Continue?`)) return;
    if (!window.confirm(`Publish ${create} new and ${update} updated item${create + update === 1 ? '' : 's'}${archive ? `, archive ${archive}` : ''}?`)) return;
    setError('');
    setPhase('committing');
    try {
      const res = await fetch('/api/admin/catalog-transfer/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.jobId, options, mediaMap }),
      });
      if (!res.ok) throw new Error(await readError(res, 'Publishing failed'));
      const data = (await res.json()) as { tally: Record<string, number>; results: ResultRow[]; plan: TransferPlan };
      setJob({ ...job, plan: data.plan });
      setResults({ tally: data.tally, rows: data.results });
      setFilter('all');
      setPhase('done');
      onPublished?.();
      void loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publishing failed');
      setPhase('ready');
    }
  }

  async function report(id: number) {
    setError('');
    try {
      await downloadFrom(`/api/admin/catalog-transfer/jobs/${id}/report`, `catalog-import-${id}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }

  /* ---------- derived */

  const rows = useMemo(() => {
    if (!plan) return [];
    const q = query.trim().toLowerCase();
    return plan.rows.filter((r) => {
      const res = resultByKey.get(r.key);
      const hasIssue = r.action === 'error' || r.issues.some((i) => i.level !== 'info') || res?.status === 'failed';
      const pass =
        filter === 'all' ||
        (filter === 'changes' && ['create', 'update', 'archive', 'delete'].includes(r.action)) ||
        (filter === 'create' && r.action === 'create') ||
        (filter === 'update' && r.action === 'update') ||
        (filter === 'issues' && hasIssue) ||
        (filter === 'unchanged' && r.action === 'unchanged') ||
        (filter === 'skipped' && r.action === 'skip');
      if (!pass) return false;
      return !q || r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || `${r.sheet} ${r.row}`.toLowerCase().includes(q);
    });
  }, [plan, filter, query, resultByKey]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, changes: 0, create: 0, update: 0, issues: 0, unchanged: 0, skipped: 0 };
    for (const r of plan?.rows || []) {
      c.all++;
      if (['create', 'update', 'archive', 'delete'].includes(r.action)) c.changes++;
      if (r.action === 'create') c.create++;
      if (r.action === 'update') c.update++;
      if (r.action === 'unchanged') c.unchanged++;
      if (r.action === 'skip') c.skipped++;
      if (r.action === 'error' || r.issues.some((i) => i.level !== 'info')) c.issues++;
    }
    return c;
  }, [plan]);

  const missingMedia = useMemo(() => (plan?.media || []).filter((m) => m.status !== 'resolved'), [plan]);
  const mediaSources = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of plan?.media || []) if (m.status === 'resolved' && m.source) out[m.source] = (out[m.source] || 0) + 1;
    return out;
  }, [plan]);
  const matchableMissing = useMemo(() => missingMedia.filter((m) => m.status === 'missing' && matchLocal(m.ref, localMedia)).length, [missingMedia, localMedia]);
  const pendingChanges = plan ? plan.summary.create + plan.summary.update + plan.summary.archive + plan.summary.delete : 0;
  const stepIndex = phase === 'done' ? 4 : plan ? 3 : workbook ? 2 : 1;

  const setOpt = <K extends keyof TransferOptions>(key: K, value: TransferOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  /* ---------- render */

  return (
    <div className="ct-shell" hidden={!visible} role="dialog" aria-modal="true" aria-label="Excel import and export">
      <div className="ct-shell-bar">
        <div>
          <strong>Excel import / export</strong>
          <span>Inventory · {TYPE_LABEL[currentType]}</span>
        </div>
        <button type="button" className="ct-shell-close" onClick={requestClose}>
          {phase === 'done' ? 'Close & view inventory' : 'Close'} <span aria-hidden>×</span>
        </button>
      </div>
      <div className="ct-shell-body">
    <div className="ct">
      <header className="ct-hero">
        <div className="ct-hero-copy">
          <span className="ct-eyebrow">Catalog data studio</span>
          <h3>Bulk import &amp; export</h3>
          <p>
            Hand a smart Excel workbook to sales and product owners, then upload it back. Every row is checked, matched to the live catalog and scored
            for SEO before anything is published. Media keep the file names your team knows.
          </p>
          <ol className="ct-steps">
            <Step n={1} title="Download" active={stepIndex === 1} done={stepIndex > 1}>
              Template or live data
            </Step>
            <Step n={2} title="Fill in Excel" active={stepIndex === 2} done={stepIndex > 2}>
              Dropdowns &amp; tips built in
            </Step>
            <Step n={3} title="Review" active={stepIndex === 3} done={stepIndex > 3}>
              Dry run, media &amp; SEO
            </Step>
            <Step n={4} title="Publish" active={stepIndex === 4} done={false}>
              With redirects &amp; report
            </Step>
          </ol>
        </div>
        <div className="ct-hero-stats">
          {plan ? (
            <>
              <Gauge value={plan.summary.seoAverage} label="SEO avg" />
              <dl>
                <div>
                  <dt>Rows</dt>
                  <dd>{plan.summary.total}</dd>
                </div>
                <div>
                  <dt>Media found</dt>
                  <dd>
                    {plan.summary.mediaResolved}
                    <small>/{plan.summary.mediaResolved + plan.summary.mediaMissing}</small>
                  </dd>
                </div>
                <div>
                  <dt>To fix</dt>
                  <dd className={plan.summary.error ? 'is-bad' : ''}>{plan.summary.error}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="ct-orbit" aria-hidden>
              <span>XLSX</span>
            </div>
          )}
        </div>
      </header>

      {error ? (
        <div className="ct-alert" role="alert">
          <strong>Something needs attention.</strong> {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      ) : null}

      <div className="ct-grid">
        {/* ---------------- export */}
        <section className="ct-card">
          <div className="ct-card-head">
            <span className="ct-badge">1</span>
            <div>
              <h4>Get the workbook</h4>
              <p>Updating items? Download them, edit in Excel, upload back. Adding new ones? Start from the blank template.</p>
            </div>
          </div>
          <div className="ct-label">Catalogs</div>
          <div className="ct-chips">
            {TYPES.map((t) => {
              const on = types.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`ct-chip${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setTypes((prev) => (on ? prev.filter((x) => x !== t) : TYPES.filter((x) => x === t || prev.includes(x))))}
                >
                  {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
          <div className="ct-tiles">
            <button type="button" className="ct-tile" disabled={!types.length || !!downloading} onClick={() => void download('data')}>
              <span className="ct-ext">XLSX</span>
              <span>
                <strong>{downloading === 'data' ? 'Preparing…' : `Download ${types.map((t) => TYPE_LABEL[t].toLowerCase()).join(' + ') || 'items'}`}</strong>
                <small>Current items with prices, media file names, SEO and case studies — ready to edit.</small>
              </span>
            </button>
            <button type="button" className="ct-tile ct-tile--ghost" disabled={!types.length || !!downloading} onClick={() => void download('blank')}>
              <span className="ct-ext">NEW</span>
              <span>
                <strong>{downloading === 'blank' ? 'Preparing…' : 'Blank template'}</strong>
                <small>Empty sheets with dropdowns, tips and a grey sample row to copy.</small>
              </span>
            </button>
          </div>
          {downloadNote ? <p className="ct-ok">✓ {downloadNote}</p> : null}
          <ul className="ct-points">
            <li>
              Only change what you need. Delete columns you are not touching, and blank cells keep their current value.
            </li>
            <li>
              To update just a few items, tick them in the Inventory list and choose <b>Export selected</b>.
            </li>
            <li>
              <b>Read me</b> sheet explains every column; headers are colour-coded (required, SEO, media, case study).
            </li>
            <li>
              SEO title {SEO_TITLE_RANGE[0]}–{SEO_TITLE_RANGE[1]} and description {SEO_DESCRIPTION_RANGE[0]}–{SEO_DESCRIPTION_RANGE[1]} characters turn amber
              in Excel when out of range.
            </li>
            <li>
              <b>Media</b> sheet lists files by their original names — rename them there or add alt text without touching the files.
            </li>
          </ul>
        </section>

        {/* ---------------- import */}
        <section className="ct-card ct-card--import">
          <div className="ct-card-head">
            <span className="ct-badge">2</span>
            <div>
              <h4>Upload &amp; review</h4>
              <p>Drop the workbook together with its image / video folder. Nothing is published until you confirm.</p>
            </div>
          </div>
          <div
            className={`ct-drop${dragging ? ' is-over' : ''}${workbook ? ' has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void filesFromDrop(e).then(intake);
            }}
          >
            <div className="ct-drop-icon" aria-hidden>
              ⇪
            </div>
            {workbook ? (
              <div className="ct-drop-file">
                <strong>{workbook.name}</strong>
                <small>
                  {formatMediaBytes(workbook.size)}
                  {localMedia.length ? ` · ${localMedia.length} media file${localMedia.length === 1 ? '' : 's'} ready to match` : ' · no media files added'}
                  {ignored ? ` · ${ignored} other file${ignored === 1 ? '' : 's'} ignored` : ''}
                </small>
              </div>
            ) : (
              <div className="ct-drop-file">
                <strong>Drop the Excel workbook and media here</strong>
                <small>.xlsx or .csv · images and videos are matched to the sheet by file name</small>
              </div>
            )}
            <div className="ct-drop-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
                Choose files
              </button>
              <button type="button" className="admin-btn admin-btn-secondary" disabled={busy} onClick={() => folderInput.current?.click()}>
                Add media folder
              </button>
              {workbook || localMedia.length ? (
                <button type="button" className="ct-link" disabled={busy} onClick={resetAll}>
                  Start over
                </button>
              ) : null}
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              accept=".xlsx,.xlsm,.csv,.xls,.jpg,.jpeg,.png,.webp,.gif,.svg,.mp4,.webm"
              onChange={(e) => {
                intake(fromInput(e.target.files));
                e.target.value = '';
              }}
            />
            <input
              ref={folderInput}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                intake(fromInput(e.target.files));
                e.target.value = '';
              }}
            />
          </div>

          <button type="button" className="ct-rules-toggle" aria-expanded={showRules} onClick={() => setShowRules((v) => !v)}>
            <span>Import rules</span>
            <small>
              {options.mode === 'upsert' ? 'Create & update' : options.mode === 'create' ? 'Only new items' : 'Only existing items'} · blanks{' '}
              {options.blankCells === 'keep' ? 'keep values' : 'clear values'} · new items as {options.defaultStatus}
              {options.allowDelete ? ' · deletes allowed' : ''}
            </small>
            <span aria-hidden>{showRules ? '−' : '+'}</span>
          </button>
          {showRules ? (
            <div className="ct-rules">
              <div className="ct-rule">
                <span>What to do</span>
                <Segmented
                  label="Import mode"
                  value={options.mode}
                  onChange={(v) => setOpt('mode', v)}
                  options={[
                    { value: 'upsert', label: 'Create & update' },
                    { value: 'create', label: 'Only new' },
                    { value: 'update', label: 'Only existing' },
                  ]}
                />
              </div>
              <div className="ct-rule">
                <span>Empty cells</span>
                <Segmented
                  label="Empty cells"
                  value={options.blankCells}
                  onChange={(v) => setOpt('blankCells', v)}
                  options={[
                    { value: 'keep', label: 'Keep current value' },
                    { value: 'clear', label: 'Clear the value' },
                  ]}
                />
              </div>
              <div className="ct-rule">
                <span>Gallery column</span>
                <Segmented
                  label="Gallery"
                  value={options.gallery}
                  onChange={(v) => setOpt('gallery', v)}
                  options={[
                    { value: 'sync', label: 'Is the full gallery' },
                    { value: 'append', label: 'Only adds files' },
                  ]}
                />
              </div>
              <div className="ct-rule">
                <span>New items without status</span>
                <Segmented
                  label="Default status"
                  value={options.defaultStatus}
                  onChange={(v) => setOpt('defaultStatus', v)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                  ]}
                />
              </div>
              <Toggle checked={options.seoAutopilot} onChange={(v) => setOpt('seoAutopilot', v)} title="SEO autopilot" hint="Fills missing SEO titles, descriptions and alt text from the item's own copy." />
              <Toggle checked={options.redirects} onChange={(v) => setOpt('redirects', v)} title="Keep old links working" hint="Adds 301 redirects when a live page's slug changes or it is deleted." />
              <Toggle checked={options.createCategories} onChange={(v) => setOpt('createCategories', v)} title="Create missing categories" hint="Unknown category names become new categories instead of errors." />
              <Toggle
                checked={options.allowDelete}
                onChange={(v) => setOpt('allowDelete', v)}
                title="Allow Delete action"
                hint="Rows marked Delete remove the item permanently. Off = they are reported but not deleted."
                danger
              />
              <p className="ct-quiet">
                Type <code>#clear</code> in a cell to empty one field while keeping other blanks untouched.
              </p>
            </div>
          ) : null}

          <div className="ct-go">
            {phase === 'analysing' || phase === 'uploading' ? (
              <div className="ct-progress" aria-live="polite">
                <div className="ct-progress-bar">
                  <span style={{ width: phase === 'uploading' && upload ? `${Math.round((upload.done / Math.max(1, upload.total)) * 100)}%` : '100%' }} />
                </div>
                <small>
                  {phase === 'uploading' && upload
                    ? `Uploading media ${upload.done}/${upload.total}${upload.current ? ` · ${upload.current}` : ''}`
                    : 'Reading the workbook, matching items and media, scoring SEO…'}
                </small>
              </div>
            ) : (
              <button type="button" className="admin-btn admin-btn-primary ct-go-btn" disabled={!workbook || busy} onClick={() => void start()}>
                {job ? 'Analyse again' : 'Analyse workbook'}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ---------------- review */}
      {plan ? (
        <section className="ct-review" aria-label="Import review">
          {stale ? (
            <div className="ct-stale">
              Import rules changed since this check.
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void recheck()} disabled={busy}>
                Re-check with new rules
              </button>
            </div>
          ) : null}

          <div className="ct-summary">
            {(
              [
                ['create', 'New items', plan.summary.create, 'create'],
                ['update', 'Updates', plan.summary.update, 'update'],
                ['unchanged', 'Unchanged', plan.summary.unchanged, 'muted'],
                ['issues', 'Need fixing', plan.summary.error, plan.summary.error ? 'danger' : 'muted'],
                ['issues', 'Warnings', plan.summary.warnings, plan.summary.warnings ? 'warn' : 'muted'],
              ] as Array<[Filter, string, number, string]>
            ).map(([f, label, value, tone]) => (
              <button key={label} type="button" className={`ct-stat ct-stat--${tone}`} onClick={() => setFilter(f)}>
                <strong>{value}</strong>
                <span>{label}</span>
              </button>
            ))}
            {plan.summary.archive || plan.summary.delete ? (
              <button type="button" className="ct-stat ct-stat--danger" onClick={() => setFilter('changes')}>
                <strong>{plan.summary.archive + plan.summary.delete}</strong>
                <span>Archive / delete</span>
              </button>
            ) : null}
          </div>

          <div className="ct-insights">
            <div className="ct-insight">
              <h5>Workbook</h5>
              <ul>
                {plan.sheets.map((s) => (
                  <li key={s.name}>
                    <span className={`ct-dot ct-dot--${s.kind === 'ignored' ? 'muted' : 'good'}`} />
                    <span>
                      <b>{s.name}</b> {s.kind === 'ignored' ? 'not imported' : s.kind === 'media' ? `· ${s.rows} media rows` : `· ${s.rows} ${s.kind} rows`}
                      {s.note ? <small>{s.note}</small> : null}
                      {s.unknownHeaders.length ? <small>Ignored columns: {s.unknownHeaders.slice(0, 6).join(', ')}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
              {plan.summary.newCategories.length ? (
                <p className="ct-quiet">
                  New categories: <b>{plan.summary.newCategories.join(', ')}</b>
                </p>
              ) : null}
            </div>

            <div className="ct-insight">
              <h5>Media matching</h5>
              <div className="ct-meter">
                <span style={{ width: `${plan.media.length ? (plan.summary.mediaResolved / plan.media.length) * 100 : 100}%` }} />
              </div>
              <p className="ct-quiet">
                {plan.summary.mediaResolved} of {plan.media.length} files found
                {Object.keys(mediaSources).length
                  ? ` — ${Object.entries(mediaSources)
                      .map(([s, n]) => `${n} by ${SOURCE_LABEL[s] || s}`)
                      .join(', ')}`
                  : ''}
                .
              </p>
              {upload && (upload.failed.length || upload.reused) ? (
                <p className="ct-quiet">
                  {upload.reused ? `${upload.reused} already in the library (reused). ` : ''}
                  {upload.failed.length ? `${upload.failed.length} failed: ${upload.failed.map((f) => `${f.name} (${f.error})`).join('; ')}` : ''}
                </p>
              ) : null}
              {missingMedia.length ? (
                <>
                  <ul className="ct-missing">
                    {missingMedia.slice(0, 8).map((m) => (
                      <li key={m.ref}>
                        <span title={m.note}>{m.ref}</span>
                        <small>{m.status === 'invalid' ? m.note || 'invalid' : matchLocal(m.ref, localMedia) ? 'in your folder' : `${m.uses}× · not found`}</small>
                      </li>
                    ))}
                    {missingMedia.length > 8 ? <li className="ct-quiet">+{missingMedia.length - 8} more</li> : null}
                  </ul>
                  <div className="ct-inline-actions">
                    {matchableMissing ? (
                      <button type="button" className="admin-btn admin-btn-secondary" disabled={busy || phase === 'done'} onClick={() => job && void uploadAndRecheck(job, localMedia)}>
                        Upload {matchableMissing} matching file{matchableMissing === 1 ? '' : 's'}
                      </button>
                    ) : null}
                    <button type="button" className="ct-link" disabled={busy || phase === 'done'} onClick={() => folderInput.current?.click()}>
                      Add media folder…
                    </button>
                  </div>
                  <p className="ct-quiet">Missing files never remove existing media — those slots are left as they are.</p>
                </>
              ) : (
                <p className="ct-ok">✓ Every referenced file is in the media library.</p>
              )}
            </div>

            <div className="ct-insight">
              <h5>Search readiness</h5>
              <Gauge value={plan.summary.seoAverage} label="average" size={88} />
              <p className="ct-quiet">
                Scores titles, descriptions, slugs, content depth, images, alt text, uniqueness and social previews for each item. Open a row to see what to
                improve.
              </p>
            </div>
          </div>

          <div className="ct-toolbar">
            <div className="ct-tabs" role="tablist" aria-label="Filter rows">
              {(
                [
                  ['all', 'All'],
                  ['changes', 'Changes'],
                  ['create', 'New'],
                  ['update', 'Updates'],
                  ['issues', 'Issues'],
                  ['unchanged', 'Unchanged'],
                  ['skipped', 'Skipped'],
                ] as Array<[Filter, string]>
              ).map(([f, label]) => (
                <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
                  {label}
                  <em>{counts[f]}</em>
                </button>
              ))}
            </div>
            <input className="admin-input ct-search" placeholder="Search title, slug or row…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {job ? (
              <button type="button" className="ct-link" onClick={() => void report(job.jobId)}>
                Download {results ? 'results' : 'review'} (.xlsx)
              </button>
            ) : null}
          </div>

          <div className="ct-rows">
            {rows.length === 0 ? <p className="ct-empty">No rows in this view.</p> : null}
            {rows.slice(0, limit).map((r) => {
              const res = resultByKey.get(r.key);
              const meta = res ? RESULT_META[res.status] : ACTION_META[r.action];
              const errors = r.issues.filter((i) => i.level === 'error').length;
              const warnings = r.issues.filter((i) => i.level === 'warning').length;
              const isOpen = open.has(r.key);
              const url = res?.url || r.url;
              return (
                <article key={r.key} className={`ct-row${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="ct-row-head"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpen((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.key)) next.delete(r.key);
                        else next.add(r.key);
                        return next;
                      })
                    }
                  >
                    <span className={`ct-pill ct-pill--${meta.tone}`}>{meta.label}</span>
                    <span className="ct-row-main">
                      <strong>{r.title || '(untitled)'}</strong>
                      <small>
                        {r.sheet} · row {r.row}
                        {url ? ` · ${url}` : ''}
                        {r.matchedBy ? ` · matched by ${r.matchedBy}` : ''}
                      </small>
                    </span>
                    <span className="ct-row-meta">
                      {r.changes.length ? <span className="ct-count">{r.changes.length} change{r.changes.length === 1 ? '' : 's'}</span> : null}
                      {errors ? <span className="ct-count ct-count--error">{errors} error{errors === 1 ? '' : 's'}</span> : null}
                      {warnings ? <span className="ct-count ct-count--warn">{warnings} warning{warnings === 1 ? '' : 's'}</span> : null}
                      <ScoreChip score={r.seo?.score} />
                    </span>
                    <span className="ct-chevron" aria-hidden>
                      ›
                    </span>
                  </button>
                  {isOpen ? (
                    <>
                      <RowDetail row={r} result={res} />
                      {res && url && res.status !== 'deleted' && res.status !== 'failed' ? (
                        <div className="ct-row-links">
                          <a href={url} target="_blank" rel="noreferrer">
                            Open page ↗
                          </a>
                          <a href={`/admin/inventory?type=${r.type}`}>Open {TYPE_LABEL[r.type].toLowerCase()} in Inventory</a>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              );
            })}
            {rows.length > limit ? (
              <button type="button" className="ct-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                Show {Math.min(PAGE_SIZE, rows.length - limit)} more of {rows.length - limit}
              </button>
            ) : null}
          </div>

          {phase === 'done' && results ? (
            <div className="ct-done">
              <strong>Published.</strong>
              <span>
                {Object.entries(results.tally)
                  .map(([k, n]) => `${n} ${RESULT_META[k as ResultRow['status']]?.label.toLowerCase() || k}`)
                  .join(' · ')}
              </span>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={resetAll}>
                Import another workbook
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
                Done — view inventory
              </button>
            </div>
          ) : (
            <div className="ct-publish">
              <div>
                <strong>
                  {pendingChanges} change{pendingChanges === 1 ? '' : 's'} ready
                </strong>
                <small>
                  {plan.summary.error ? `${plan.summary.error} row${plan.summary.error === 1 ? '' : 's'} with errors will be skipped. ` : ''}
                  Live data is re-checked at publish time.{options.redirects ? ' Changed URLs keep working through redirects.' : ''}
                </small>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-primary ct-go-btn"
                disabled={busy || stale || pendingChanges === 0}
                onClick={() => void publish()}
              >
                {phase === 'committing' ? 'Publishing…' : `Publish ${pendingChanges || ''} change${pendingChanges === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* ---------------- history */}
      {history.length ? (
        <section className="ct-history">
          <h5>Recent activity</h5>
          <ul>
            {history.map((h) => {
              const s = (h.summary || {}) as { total?: number; create?: number; update?: number; error?: number; counts?: Record<string, number>; results?: Record<string, number> };
              const detail =
                h.kind === 'export'
                  ? `${Object.values(s.counts || {}).reduce((a, b) => a + b, 0)} items exported`
                  : h.status === 'committed'
                    ? Object.entries(s.results || {})
                        .map(([k, n]) => `${n} ${k}`)
                        .join(' · ')
                    : `${s.total ?? 0} rows reviewed · ${s.create ?? 0} new · ${s.update ?? 0} updates${s.error ? ` · ${s.error} to fix` : ''}`;
              return (
                <li key={h.id}>
                  <span className={`ct-dot ct-dot--${h.kind === 'export' ? 'info' : h.status === 'committed' ? 'good' : 'warn'}`} />
                  <span className="ct-history-main">
                    <strong>
                      {h.kind === 'export' ? 'Downloaded' : h.status === 'committed' ? 'Published' : 'Reviewed'} · {h.file_name}
                    </strong>
                    <small>
                      {detail} · {h.actor.replace(/\s*<.*>$/, '')} · {timeAgo(h.committed_at || h.created_at)}
                    </small>
                  </span>
                  {h.kind === 'import' ? (
                    <button type="button" className="ct-link" onClick={() => void report(h.id)}>
                      Report
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
      </div>
    </div>
  );
}
