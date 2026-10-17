'use client';

import { useState } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import {
  applyParsedCandidateToDraft,
  filledCandidateKeys,
  type CandidateAutofillDraft,
} from '@/lib/careers-candidate-text';

const KEY_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  experience: 'Experience',
  source: 'Source',
  notes: 'Notes',
  jobId: 'Role',
};

type JobOpt = { id: number; title: string; content?: { role?: string }; slug?: string };

/**
 * Paste a referral / email / WhatsApp note → fills Add candidate fields.
 */
export default function CandidateTextAutofill({
  value,
  jobs,
  onFill,
  defaultOpen = true,
}: {
  value: CandidateAutofillDraft;
  jobs: JobOpt[];
  onFill: (next: CandidateAutofillDraft) => void;
  defaultOpen?: boolean;
}) {
  const [text, setText] = useState('');
  const [filled, setFilled] = useState<string[]>([]);

  return (
    <AdminCollapsible
      title="Paste referral / email / WhatsApp (auto-fill)"
      description="Copy the message that came with the CV — name, email, phone, experience, source and role are sorted automatically"
      className="az-admin-group"
      defaultOpen={defaultOpen}
    >
      <label className="admin-field">
        <span>Message text</span>
        <textarea
          className="admin-textarea"
          rows={7}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFilled([]);
          }}
          placeholder={
            'Hi, referring Rahul Sharma for UPS Service Engineer.\n\n' +
            'Email: rahul.sharma@example.com\nPhone: 98765 43210\nExperience: 3 years\n\n' +
            'Strong field service background. CV attached.'
          }
        />
        <span className="az-admin-hint">
          Works with labelled lines (Name:, Email:, Phone:, Exp:, Role:) or free text like “CV of Anita Menon — referred by
          Priya”. Role text is matched to an open posting when possible.
        </span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="admin-btn admin-btn-primary az-admin-mini"
          disabled={!text.trim()}
          onClick={() => {
            const next = applyParsedCandidateToDraft(value, text, jobs);
            const keys = filledCandidateKeys(value, next);
            onFill(next);
            setText('');
            setFilled(keys);
          }}
        >
          Fill in the boxes below
        </button>
        {text.trim() ? (
          <button
            type="button"
            className="admin-btn admin-btn-secondary az-admin-mini"
            onClick={() => {
              setText('');
              setFilled([]);
            }}
          >
            Clear paste
          </button>
        ) : null}
      </div>
      {filled.length ? (
        <p className="az-admin-hint" style={{ margin: '0.65rem 0 0' }}>
          Filled {filled.length} field{filled.length === 1 ? '' : 's'}:{' '}
          {filled.map((k) => KEY_LABELS[k] || k).join(', ')}. Attach the CV if you have it, then Add to pipeline.
        </p>
      ) : null}
    </AdminCollapsible>
  );
}
