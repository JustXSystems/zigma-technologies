'use client';

import { useState } from 'react';
import AdminCollapsible from '@/components/admin/AdminCollapsible';
import { applyParsedToDraft, filledDraftKeys, type JobAutofillDraft } from '@/lib/careers-job-text';

const KEY_LABELS: Record<string, string> = {
  title: 'Title',
  department: 'Department',
  location: 'Location',
  jobType: 'Job type',
  experience: 'Experience',
  education: 'Education',
  badge: 'Badge',
  summary: 'Summary',
  responsibilities: 'Responsibilities',
  requirements: 'Requirements',
  benefits: 'Benefits',
  facts: 'Facts',
  vacancies: 'Vacancies',
};

/**
 * Paste a WhatsApp / email / Word job ad → fills structured Hiring fields.
 * Shared by Admin → Hiring and Pages → Careers → Current openings.
 */
export default function JobTextAutofill({
  value,
  onFill,
  defaultOpen = false,
}: {
  value: JobAutofillDraft;
  onFill: (next: JobAutofillDraft) => void;
  defaultOpen?: boolean;
}) {
  const [text, setText] = useState('');
  const [filled, setFilled] = useState<string[]>([]);

  return (
    <AdminCollapsible
      title="Paste a full job description (auto-fill)"
      description="Copy from WhatsApp, email, Word or PDF — title, location, experience, education, responsibilities, requirements, benefits and more are sorted automatically"
      className="az-admin-group"
      defaultOpen={defaultOpen}
    >
      <label className="admin-field">
        <span>Job description text</span>
        <textarea
          className="admin-textarea"
          rows={9}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFilled([]);
          }}
          placeholder={
            'UPS Service Engineer – Bengaluru\n\n' +
            'Location: Bengaluru\nExperience: 2–4 years\nDepartment: Field Service\n\n' +
            'About the role…\n\nKey Responsibilities\n- …\n\nRequirements\n- …\n\nEducation\nDiploma / BE – EEE\n\nBenefits\n- …'
          }
        />
        <span className="az-admin-hint">
          Recognises headings (Responsibilities, Requirements, Education, Benefits), fact lines (Location:, Exp:, Vacancies:),
          WhatsApp bold/emoji bullets, and free-text cues like “Urgent / Hybrid / 2 positions”. “How to apply” is skipped.
        </span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="admin-btn admin-btn-primary az-admin-mini"
          disabled={!text.trim()}
          onClick={() => {
            const next = applyParsedToDraft(value, text);
            const keys = filledDraftKeys(value, next);
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
          {filled.map((k) => KEY_LABELS[k] || k).join(', ')}. Review, then Publish live.
        </p>
      ) : null}
    </AdminCollapsible>
  );
}
