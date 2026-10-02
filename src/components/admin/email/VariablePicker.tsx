'use client';

import { useMemo, useState } from 'react';
import { SYSTEM_VARIABLES, type MailVariable } from '@/lib/mail-config';
import { TEMPLATE_FILTERS, type SubmissionKind } from '@/lib/mail-template';
import { VARIABLE_TYPE_META, type DiscoveredField } from './shared';

type Item = { key: string; label: string; detail: string; group: string };

export default function VariablePicker({
  kind,
  custom,
  fields,
  target,
  onInsert,
}: {
  kind: SubmissionKind;
  custom: MailVariable[];
  fields: DiscoveredField[];
  /** Name of the field that will receive the token. */
  target: string;
  onInsert: (snippet: string) => void;
}) {
  const [q, setQ] = useState('');
  const [showSyntax, setShowSyntax] = useState(false);

  const groups = useMemo(() => {
    const items: Item[] = [
      ...custom.map((v) => ({
        key: v.key,
        label: v.label || v.key,
        detail: v.description || VARIABLE_TYPE_META[v.type].label,
        group: 'Custom',
      })),
      ...fields
        .filter((f) => !f.kinds.length || f.kinds.includes(kind))
        .map((f) => ({
          key: f.key,
          label: f.label,
          detail: f.forms.length ? `Form field · ${f.forms.join(', ')}` : 'Seen in submissions',
          group: 'Form fields',
        })),
      ...SYSTEM_VARIABLES.map((v) => ({ key: v.key, label: v.label, detail: v.description, group: v.group })),
    ];
    const term = q.trim().toLowerCase();
    const filtered = term
      ? items.filter((i) => `${i.key} ${i.label} ${i.detail}`.toLowerCase().includes(term))
      : items;
    const order = ['Custom', 'Form fields', 'Contact', 'Submission', 'Links', 'Company'];
    return order
      .map((g) => ({ group: g, items: filtered.filter((i) => i.group === g) }))
      .filter((g) => g.items.length);
  }, [custom, fields, kind, q]);

  return (
    <div className="em-picker">
      <div className="em-picker-head">
        <input
          className="admin-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search variables…"
          aria-label="Search variables"
        />
        <span className="em-picker-target">
          Inserts into <strong>{target}</strong>
        </span>
        <button type="button" className="em-link" onClick={() => setShowSyntax((s) => !s)}>
          {showSyntax ? 'Hide syntax' : 'Syntax'}
        </button>
      </div>
      {showSyntax ? (
        <div className="em-syntax">
          <div>
            <strong>Formatting</strong>
            {TEMPLATE_FILTERS.map((f) => (
              <button key={f.name} type="button" className="em-syntax-row" onClick={() => onInsert(f.usage)} title="Insert">
                <code>{f.usage}</code>
                <span>{f.description}</span>
              </button>
            ))}
          </div>
          <div>
            <strong>Conditions</strong>
            {[
              ['{{#if company}}…{{/if}}', 'Only when filled'],
              ['{{#if not email}}…{{/if}}', 'Only when empty'],
              ['{{#if source == "callback_request"}}…{{else}}…{{/if}}', 'Compare (==, !=)'],
              ['{{#if subject contains "quote"}}…{{/if}}', 'contains · starts_with · ends_with'],
            ].map(([usage, text]) => (
              <button key={usage} type="button" className="em-syntax-row" onClick={() => onInsert(usage)} title="Insert">
                <code>{usage}</code>
                <span>{text}</span>
              </button>
            ))}
            <p className="admin-hint">Blocks can be nested. Comparisons ignore upper/lower case.</p>
          </div>
        </div>
      ) : null}
      <div className="em-picker-groups">
        {groups.map((g) => (
          <div key={g.group} className="em-picker-group">
            <span className={`em-picker-label${g.group === 'Custom' ? ' is-custom' : ''}`}>{g.group}</span>
            <div className="em-tokens">
              {g.items.map((i) => (
                <button
                  key={`${g.group}:${i.key}`}
                  type="button"
                  className={`em-token${g.group === 'Custom' ? ' em-token--custom' : g.group === 'Form fields' ? ' em-token--field' : ''}`}
                  title={`${i.label} — ${i.detail}`}
                  onClick={() => onInsert(`{{${i.key}}}`)}
                >
                  {`{{${i.key}}}`}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!groups.length ? <p className="admin-hint">No variable matches “{q}”.</p> : null}
      </div>
    </div>
  );
}
