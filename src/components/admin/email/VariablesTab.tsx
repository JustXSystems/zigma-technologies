'use client';

import { useMemo, useState } from 'react';
import {
  RESERVED_VARIABLE_KEYS,
  SYSTEM_VARIABLES,
  VARIABLE_KEY_RE,
  type MailConfig,
  type MailVariable,
} from '@/lib/mail-config';
import { resolveVariables } from '@/lib/mail-engine';
import { TEMPLATE_FILTERS, templateSyntaxIssues, wrapEmailHtml, type MailVars, type SubmissionKind } from '@/lib/mail-template';
import SamplePicker from './SamplePicker';
import {
  VARIABLE_PRESETS,
  VARIABLE_TYPE_META,
  blankVariable,
  variableUsage,
  type Discovery,
  type Usage,
} from './shared';

type Props = {
  config: MailConfig;
  update: (fn: (c: MailConfig) => MailConfig) => void;
  discovery: Discovery | null;
  discoveryError: string;
  onRefresh: () => void;
  kind: SubmissionKind;
  onKind: (k: SubmissionKind) => void;
  sampleId: number | null;
  onSample: (id: number | null) => void;
  sampleLoading: boolean;
  baseVars: MailVars;
  companyName: string;
  siteUrl: string;
  accent: string;
};

function useCopy() {
  const [copied, setCopied] = useState('');
  return {
    copied,
    copy(text: string) {
      void navigator.clipboard?.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied((c) => (c === text ? '' : c)), 1200);
    },
  };
}

function short(value: string, n = 90) {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}

function UsageBadge({ usage }: { usage?: Usage[] }) {
  if (!usage?.length) return <span className="em-usage em-usage--none">Not used</span>;
  return (
    <span className="em-usage" title={usage.map((u) => u.where).join('\n')}>
      Used in {usage.length} place{usage.length > 1 ? 's' : ''}
    </span>
  );
}

export default function VariablesTab(props: Props) {
  const { config, update, discovery, kind } = props;
  const { copied, copy } = useCopy();
  const [open, setOpen] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  const resolved = useMemo(() => resolveVariables(props.baseVars, config.variables), [props.baseVars, config.variables]);
  const usage = useMemo(() => variableUsage(config), [config]);
  const fields = useMemo(() => discovery?.fields || [], [discovery]);
  const fieldKeys = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);
  const allKeys = useMemo(
    () => [...new Set([...SYSTEM_VARIABLES.map((v) => v.key), ...fields.map((f) => f.key), ...config.variables.map((v) => v.key)])].sort(),
    [fields, config.variables]
  );

  const setVariables = (fn: (list: MailVariable[]) => MailVariable[]) => update((c) => ({ ...c, variables: fn(c.variables) }));

  function addVariable(v: MailVariable) {
    let key = v.key || 'new_variable';
    const taken = new Set(config.variables.map((x) => x.key));
    for (let i = 2; taken.has(key) || RESERVED_VARIABLE_KEYS.has(key); i++) key = `${v.key || 'new_variable'}_${i}`;
    setVariables((list) => [...list, { ...v, key }]);
    setOpen(key);
    setShowPresets(false);
  }

  function keyProblem(v: MailVariable, index: number): { error?: string; warning?: string } {
    if (!VARIABLE_KEY_RE.test(v.key)) return { error: 'Use lowercase letters, digits and _ (start with a letter).' };
    if (RESERVED_VARIABLE_KEYS.has(v.key)) return { error: `{{${v.key}}} is built in — choose another name.` };
    if (config.variables.some((x, j) => j !== index && x.key === v.key)) return { error: 'Another variable already uses this name.' };
    if (fieldKeys.has(v.key)) return { warning: `Overrides the form field {{${v.key}}} everywhere.` };
    return {};
  }

  const invalid = config.variables.filter((v, i) => keyProblem(v, i).error).length;

  return (
    <div className="em-stack em-vars">
      <section className="em-card em-vars-hero">
        <div>
          <h3>Variables</h3>
          <p className="admin-hint">
            Everything a template can use. Form fields appear automatically when you add them in Enquiry Forms; define your
            own below. Values update live with the data you pick.
          </p>
        </div>
        <div className="em-vars-controls">
          <div className="em-seg" role="tablist" aria-label="Submission type">
            {(['enquiry', 'careers'] as const).map((k) => (
              <button key={k} type="button" className={kind === k ? 'is-active' : ''} onClick={() => props.onKind(k)}>
                {k === 'enquiry' ? 'Enquiries' : 'Careers'}
              </button>
            ))}
          </div>
          <SamplePicker
            kind={kind}
            recent={discovery?.recent || []}
            value={props.sampleId}
            loading={props.sampleLoading}
            onChange={props.onSample}
          />
        </div>
      </section>

      <section className="em-card">
        <div className="em-card-head">
          <h3>
            Custom variables <span className="em-count">{config.variables.length}</span>
          </h3>
          <div className="em-new-var">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setShowPresets((s) => !s)} aria-expanded={showPresets}>
              + New variable
            </button>
            {showPresets ? (
              <div className="em-new-menu" role="menu">
                <span className="em-new-menu-label">Start blank</span>
                {(Object.keys(VARIABLE_TYPE_META) as MailVariable['type'][]).map((t) => (
                  <button key={t} type="button" role="menuitem" onClick={() => addVariable(blankVariable(t))}>
                    <strong>{VARIABLE_TYPE_META[t].label}</strong>
                    <small>{VARIABLE_TYPE_META[t].hint}</small>
                  </button>
                ))}
                <span className="em-new-menu-label">Or start from an example</span>
                {VARIABLE_PRESETS.map((p) => (
                  <button key={p.title} type="button" role="menuitem" onClick={() => addVariable(structuredClone(p.variable))}>
                    <strong>
                      {p.title} <em>{VARIABLE_TYPE_META[p.variable.type].label}</em>
                    </strong>
                    <small>{p.text}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <p className="admin-hint">
          Use them anywhere — subject, body, To/CC, routing, conditions — as <code>{'{{name}}'}</code>. Values can contain
          other variables, including custom ones defined higher in this list.
        </p>
        {invalid ? (
          <div className="admin-error">
            {invalid} variable{invalid > 1 ? 's have' : ' has'} an invalid name and won’t be saved until fixed.
          </div>
        ) : null}
        {!config.variables.length ? (
          <div className="em-empty">
            <strong>No custom variables yet</strong>
            <span>Try “Team CC list” to manage one CC list across every template, or “Email signature” for a branded footer.</span>
          </div>
        ) : null}
        <ul className="em-var-list">
          {config.variables.map((v, i) => {
            const problem = keyProblem(v, i);
            const value = resolved.vars[v.key] ?? '';
            const isOpen = open === v.key;
            const setVar = (patch: Partial<MailVariable>) => {
              setVariables((list) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              if (patch.key !== undefined && isOpen) setOpen(patch.key);
            };
            const move = (dir: -1 | 1) =>
              setVariables((list) => {
                const next = [...list];
                const j = i + dir;
                if (j < 0 || j >= next.length) return list;
                [next[i], next[j]] = [next[j], next[i]];
                return next;
              });
            const syntax = [v.value, ...v.cases.map((c) => c.value)].flatMap((t) => templateSyntaxIssues(t));
            return (
              <li key={i} className={`em-var${isOpen ? ' is-open' : ''}${problem.error ? ' is-invalid' : ''}`}>
                <div className="em-var-head">
                  <button type="button" className="em-var-toggle" onClick={() => setOpen(isOpen ? null : v.key)} aria-expanded={isOpen}>
                    <code className="em-var-key">{`{{${v.key || '…'}}}`}</code>
                    <span className={`em-type em-type--${v.type}`}>{VARIABLE_TYPE_META[v.type].label}</span>
                    <span className="em-var-label">{v.label}</span>
                    <span className="em-var-value" title={v.type === 'html' ? 'HTML snippet' : value}>
                      {v.type === 'html' ? (value ? 'HTML · ' + short(value.replace(/<[^>]+>/g, ' '), 50) : '—') : value ? short(value) : <em>empty</em>}
                    </span>
                  </button>
                  <UsageBadge usage={usage.get(v.key)} />
                  <div className="em-var-actions">
                    <button type="button" className="em-icon-btn" onClick={() => copy(`{{${v.key}}}`)} title="Copy token">
                      {copied === `{{${v.key}}}` ? '✓' : '⧉'}
                    </button>
                    <button type="button" className="em-icon-btn" onClick={() => move(-1)} disabled={i === 0} title="Move up">
                      ↑
                    </button>
                    <button type="button" className="em-icon-btn" onClick={() => move(1)} disabled={i === config.variables.length - 1} title="Move down">
                      ↓
                    </button>
                    <button
                      type="button"
                      className="em-icon-btn em-icon-btn--danger"
                      title="Delete"
                      onClick={() => {
                        const used = usage.get(v.key);
                        if (used?.length && !confirm(`{{${v.key}}} is used in:\n${used.map((u) => `• ${u.where}`).join('\n')}\n\nDelete anyway? Those places will render blank.`)) return;
                        setVariables((list) => list.filter((_, j) => j !== i));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {isOpen ? (
                  <div className="em-var-body">
                    <div className="admin-form-grid">
                      <div className="admin-field">
                        <label>Name (token)</label>
                        <input
                          className="admin-input em-mono"
                          value={v.key}
                          onChange={(e) => setVar({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40) })}
                          placeholder="team_cc"
                        />
                        {problem.error ? <span className="em-field-error">{problem.error}</span> : null}
                        {problem.warning ? <span className="em-field-warn">{problem.warning}</span> : null}
                      </div>
                      <div className="admin-field">
                        <label>Type</label>
                        <select className="admin-select" value={v.type} onChange={(e) => setVar({ type: e.target.value as MailVariable['type'] })}>
                          {(Object.keys(VARIABLE_TYPE_META) as MailVariable['type'][]).map((t) => (
                            <option key={t} value={t}>
                              {VARIABLE_TYPE_META[t].label}
                            </option>
                          ))}
                        </select>
                        <span className="admin-hint">{VARIABLE_TYPE_META[v.type].hint}</span>
                      </div>
                      <div className="admin-field">
                        <label>Label</label>
                        <input className="admin-input" value={v.label} onChange={(e) => setVar({ label: e.target.value })} placeholder="Shown in the picker" />
                      </div>
                      <div className="admin-field">
                        <label>Description</label>
                        <input className="admin-input" value={v.description} onChange={(e) => setVar({ description: e.target.value })} placeholder="Note for other admins" />
                      </div>
                    </div>

                    {v.type === 'constant' ? (
                      <div className="admin-field">
                        <label>Value</label>
                        <textarea className="admin-textarea" rows={3} value={v.value} onChange={(e) => setVar({ value: e.target.value })} placeholder="sales@…, director@…  ·  or any text, may include {{tokens}}" />
                      </div>
                    ) : null}

                    {v.type === 'html' ? (
                      <div className="em-var-html">
                        <div className="admin-field">
                          <label>HTML</label>
                          <textarea className="admin-textarea em-mono" rows={8} value={v.value} onChange={(e) => setVar({ value: e.target.value })} placeholder="<p>Warm regards,<br><strong>{{company_name}}</strong></p>" />
                          <span className="admin-hint">Inserted as HTML in the body (tokens inside are escaped). In subjects and address fields it becomes plain text.</span>
                        </div>
                        <iframe
                          title={`${v.key} preview`}
                          className="em-var-frame"
                          sandbox=""
                          srcDoc={wrapEmailHtml({ bodyHtml: value, subject: v.key, companyName: props.companyName, siteUrl: props.siteUrl, accent: props.accent })}
                        />
                      </div>
                    ) : null}

                    {v.type === 'fallback' ? (
                      <div className="admin-field">
                        <label>Use the first filled field</label>
                        <div className="em-chips">
                          {v.sources.map((s, j) => (
                            <span key={`${s}-${j}`} className="em-chip">
                              <span className="em-chip-n">{j + 1}</span>
                              {s}
                              <small>{short(resolved.vars[s] || props.baseVars[s] || '', 24) || 'empty'}</small>
                              <button type="button" aria-label={`Remove ${s}`} onClick={() => setVar({ sources: v.sources.filter((_, k) => k !== j) })}>
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            className="admin-input em-chip-input"
                            list="em-var-keys"
                            placeholder="+ field"
                            onKeyDown={(e) => {
                              const val = e.currentTarget.value.trim().toLowerCase();
                              if ((e.key === 'Enter' || e.key === ',') && /^\w+$/.test(val)) {
                                e.preventDefault();
                                if (!v.sources.includes(val)) setVar({ sources: [...v.sources, val] });
                                e.currentTarget.value = '';
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value.trim().toLowerCase();
                              if (allKeys.includes(val) && !v.sources.includes(val)) {
                                setVar({ sources: [...v.sources, val] });
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        <label>Otherwise</label>
                        <input className="admin-input" value={v.value} onChange={(e) => setVar({ value: e.target.value })} placeholder="Default (tokens allowed)" />
                      </div>
                    ) : null}

                    {v.type === 'lookup' ? (
                      <div className="em-lookup">
                        <div className="em-lookup-head">
                          <span>When</span>
                          <input className="admin-input em-mono" list="em-var-keys" value={v.source} onChange={(e) => setVar({ source: e.target.value.trim().toLowerCase() })} placeholder="field" />
                          <select className="admin-select" value={v.match} onChange={(e) => setVar({ match: e.target.value as MailVariable['match'] })}>
                            <option value="equals">is</option>
                            <option value="contains">contains</option>
                            <option value="starts_with">starts with</option>
                          </select>
                          <span className="em-muted">
                            now: <strong>{short(resolved.vars[v.source] || props.baseVars[v.source] || '', 40) || 'empty'}</strong>
                          </span>
                        </div>
                        <div className="em-cases">
                          {v.cases.map((c, j) => {
                            const setCase = (patch: Partial<MailVariable['cases'][number]>) =>
                              setVar({ cases: v.cases.map((x, k) => (k === j ? { ...x, ...patch } : x)) });
                            return (
                              <div key={j} className="em-case">
                                <input className="admin-input" value={c.when} onChange={(e) => setCase({ when: e.target.value })} placeholder="value (a|b for either)" />
                                <span aria-hidden>→</span>
                                <input className="admin-input" value={c.value} onChange={(e) => setCase({ value: e.target.value })} placeholder="result (tokens allowed)" />
                                <button type="button" className="em-icon-btn em-icon-btn--danger" aria-label="Remove case" onClick={() => setVar({ cases: v.cases.filter((_, k) => k !== j) })}>
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                          <button type="button" className="em-link" onClick={() => setVar({ cases: [...v.cases, { when: '', value: '' }] })}>
                            + Add case
                          </button>
                        </div>
                        <div className="em-case em-case--default">
                          <span>Otherwise</span>
                          <span aria-hidden>→</span>
                          <input className="admin-input" value={v.value} onChange={(e) => setVar({ value: e.target.value })} placeholder="default (tokens allowed)" />
                        </div>
                      </div>
                    ) : null}

                    {syntax.length ? (
                      <ul className="em-issues">
                        {syntax.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="em-var-result">
                      <span>Result now</span>
                      <code>{v.type === 'html' ? short(value, 240) : value || '(empty)'}</code>
                    </div>
                    {usage.get(v.key)?.length ? (
                      <div className="em-var-used">
                        Used in: {usage.get(v.key)!.map((u) => u.where).join(' · ')}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <datalist id="em-var-keys">
          {allKeys.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </section>

      <section className="em-card">
        <div className="em-card-head">
          <h3>
            Form fields <span className="em-count">{fields.length}</span>
          </h3>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={props.onRefresh}>
            Rescan
          </button>
        </div>
        <p className="admin-hint">
          Found in Enquiry Forms and the last {discovery?.scanned ?? '…'} submissions. Any field a form submits is available
          as a variable automatically — no code change.
        </p>
        {props.discoveryError ? <div className="admin-error">{props.discoveryError}</div> : null}
        <div className="admin-table-wrap">
          <table className="admin-table em-var-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Field</th>
                <th>Filled</th>
                <th>Recent values</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {!discovery ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    Scanning…
                  </td>
                </tr>
              ) : (
                fields.map((f) => (
                  <tr key={f.key} className={f.kinds.length && !f.kinds.includes(kind) ? 'is-dim' : ''}>
                    <td>
                      <button type="button" className="em-token em-token--field" onClick={() => copy(`{{${f.key}}}`)} title="Copy">
                        {copied === `{{${f.key}}}` ? 'Copied' : `{{${f.key}}}`}
                      </button>
                    </td>
                    <td>
                      <strong>{f.label}</strong>
                      <small className="em-muted">
                        {f.forms.length
                          ? f.forms.join(', ')
                          : `Seen in ${f.kinds.map((k) => (k === 'careers' ? 'careers' : 'enquiry')).join(' + ')} submissions`}
                      </small>
                    </td>
                    <td>
                      {f.fillRate === null ? (
                        <span className="em-muted">—</span>
                      ) : (
                        <span className="em-fill" title={`${f.seen} submissions`}>
                          <span style={{ width: `${Math.round(f.fillRate * 100)}%` }} />
                          <b>{Math.round(f.fillRate * 100)}%</b>
                        </span>
                      )}
                    </td>
                    <td className="em-samples">
                      {f.samples.length ? f.samples.map((s) => <span key={s}>{s}</span>) : <span className="em-muted">no data yet</span>}
                    </td>
                    <td>
                      <UsageBadge usage={usage.get(f.key)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="em-card">
        <h3>Built-in</h3>
        <div className="admin-table-wrap">
          <table className="admin-table em-var-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Meaning</th>
                <th>Value now</th>
                <th>Usage</th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_VARIABLES.map((s) => (
                <tr key={s.key}>
                  <td>
                    <button type="button" className="em-token" onClick={() => copy(`{{${s.key}}}`)} title="Copy">
                      {copied === `{{${s.key}}}` ? 'Copied' : `{{${s.key}}}`}
                    </button>
                  </td>
                  <td>
                    <strong>{s.label}</strong>
                    <small className="em-muted">
                      {s.group} · {s.description}
                    </small>
                  </td>
                  <td className="em-samples">
                    {s.html ? <span className="em-muted">HTML table</span> : <span>{short(props.baseVars[s.key] || '', 60) || '—'}</span>}
                  </td>
                  <td>
                    <UsageBadge usage={usage.get(s.key)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="em-card">
        <h3>Formatting & conditions</h3>
        <div className="em-cheats">
          {TEMPLATE_FILTERS.map((f) => (
            <div key={f.name}>
              <code>{f.usage}</code>
              <span>{f.description}</span>
            </div>
          ))}
          <div>
            <code>{'{{#if source == "callback_request"}}…{{else}}…{{/if}}'}</code>
            <span>Compare with ==, !=, contains, starts_with, ends_with; or test filled / not filled. Nestable.</span>
          </div>
          <div>
            <code>ups|solar</code>
            <span>In lookups, routing and “Send only when”: match either value.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
