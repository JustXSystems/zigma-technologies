'use client';

import type { SubmissionKind } from '@/lib/mail-template';
import { relativeWhen, type RecentSubmission } from './shared';

export default function SamplePicker({
  kind,
  recent,
  value,
  loading,
  onChange,
}: {
  kind: SubmissionKind;
  recent: RecentSubmission[];
  value: number | null;
  loading: boolean;
  onChange: (id: number | null) => void;
}) {
  const options = recent.filter((r) => r.kind === kind);
  return (
    <label className="em-sample">
      <span>Data</span>
      <select
        className="admin-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        aria-label="Preview data"
      >
        <option value="">Sample {kind === 'careers' ? 'application' : 'enquiry'}</option>
        {options.length ? (
          <optgroup label="Recent submissions">
            {options.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} · {r.name || '—'} · {r.label} · {relativeWhen(r.createdAt)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {loading ? <span className="em-spinner" aria-label="Loading" /> : null}
    </label>
  );
}
