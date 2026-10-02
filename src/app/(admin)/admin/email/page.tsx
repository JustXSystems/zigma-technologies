'use client';

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GUID_RE,
  MAIL_EVENTS,
  MAIL_VARIABLES,
  defaultMailTemplates,
  parseAddressList,
  secretDaysLeft,
  type MailConfig,
  type MailEventKey,
  type MailProvider,
  type MailRouteRule,
  type MailTemplate,
} from '@/lib/mail-config';
import {
  SAMPLE_PAYLOADS,
  bodyToHtml,
  buildMailVars,
  renderTemplate,
  wrapEmailHtml,
} from '@/lib/mail-template';

type SettingsView = {
  config: MailConfig;
  saved: boolean;
  updatedAt: string | null;
  secretsUnreadable: boolean;
  hasGraphSecret: boolean;
  hasSmtpPassword: boolean;
  activeProvider: MailProvider;
  legacyEnvSmtp: boolean;
  site: { companyName: string; phone: string; supportEmail: string; notifyEmails: string; siteUrl: string };
};

type LogRow = {
  id: number;
  event: string;
  provider: string;
  status: 'sent' | 'failed' | 'skipped';
  to_list: string | null;
  cc_list: string | null;
  subject: string | null;
  error: string | null;
  ref_id: number | null;
  attempts: number;
  created_at: string;
};

type Tab = 'overview' | 'connection' | 'templates' | 'log' | 'guide';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'connection', label: 'Connection' },
  { id: 'templates', label: 'Templates' },
  { id: 'log', label: 'Delivery log' },
  { id: 'guide', label: 'Microsoft 365 setup' },
];

const PROVIDERS: Array<{ id: MailProvider; title: string; badge?: string; text: string }> = [
  {
    id: 'graph',
    title: 'Microsoft 365 — Graph API',
    badge: 'Recommended',
    text: 'OAuth 2.0 app sends from a shared mailbox over HTTPS. No passwords, no SMTP ports, locked to one mailbox.',
  },
  {
    id: 'smtp',
    title: 'SMTP',
    text: 'Any SMTP server (Hostinger, Zoho, relay). Leave host blank to use SMTP_* from the server .env.',
  },
  { id: 'off', title: 'Off', text: 'Submissions are still saved in Admin → Enquiries; no email is sent.' },
];

const ROUTE_FIELDS = ['role', 'source', 'item_type', 'subject', 'company', 'message', 'preferred_time', 'email'];

const SETUP_SCRIPT = '.\\scripts\\m365\\setup-website-mailer.ps1 -SenderMailbox website@zigma-technologies.com';

function eventLabel(key: string) {
  const test = key.startsWith('test');
  const base = MAIL_EVENTS.find((e) => e.key === key.replace(/^test:?/, ''))?.label;
  return test ? `Test${base ? ` · ${base}` : ''}` : base || key;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function EmailSettingsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [view, setView] = useState<SettingsView | null>(null);
  const [config, setConfig] = useState<MailConfig | null>(null);
  const [graphSecret, setGraphSecret] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeEvent, setActiveEvent] = useState<MailEventKey>('enquiry_team');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [log, setLog] = useState<{ rows: LogRow[]; last7Days: Partial<Record<LogRow['status'], number>> } | null>(null);
  const [logFilter, setLogFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const applyView = useCallback((v: SettingsView) => {
    setView(v);
    setConfig(v.config);
    setGraphSecret('');
    setSmtpPassword('');
    setDirty(false);
  }, []);

  const loadLog = useCallback(async (status = '') => {
    const res = await fetch(`/api/admin/email/log${status ? `?status=${status}` : ''}`);
    const data = await res.json();
    if (res.ok) setLog(data);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/email/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load email settings');
      applyView(data);
      await loadLog();
    })().catch((e: Error) => setError(e.message));
  }, [applyView, loadLog]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = useCallback((fn: (c: MailConfig) => MailConfig) => {
    setConfig((c) => (c ? fn(c) : c));
    setDirty(true);
    setMessage('');
  }, []);

  const updateTemplate = useCallback(
    (key: MailEventKey, patch: Partial<MailTemplate>) =>
      update((c) => ({ ...c, templates: { ...c.templates, [key]: { ...c.templates[key], ...patch } } })),
    [update]
  );

  async function save(): Promise<SettingsView | null> {
    if (!config) return null;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/email/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          secrets: {
            graphClientSecret: graphSecret.trim() || undefined,
            smtpPassword: smtpPassword || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      applyView(data);
      setMessage('Email settings saved.');
      return data as SettingsView;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function runTest(action: 'connection' | 'send', event?: MailEventKey) {
    if (!config) return;
    if (dirty && !(await save())) return;
    const to = config.testRecipient.trim();
    if (action === 'send' && !parseAddressList(to).length) {
      setTestResult({ ok: false, message: 'Enter a valid test recipient in Connection → Test recipient.' });
      return;
    }
    setTesting(event ? `send:${event}` : action);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, to, event }),
      });
      const data = await res.json();
      setTestResult(res.ok ? data : { ok: false, message: data.error || 'Test failed' });
      if (action === 'send') await loadLog(logFilter);
    } finally {
      setTesting(null);
    }
  }

  async function retry(id: number) {
    setTesting(`retry:${id}`);
    try {
      const res = await fetch(`/api/admin/email/log/${id}/retry`, { method: 'POST' });
      const data = await res.json();
      setTestResult(res.ok ? data : { ok: false, message: data.error || 'Retry failed' });
      await loadLog(logFilter);
    } finally {
      setTesting(null);
    }
  }

  function importSetupJson() {
    try {
      const raw = JSON.parse(importText.trim()) as Record<string, string>;
      const tenantId = raw.tenantId || raw.TenantId || '';
      const clientId = raw.clientId || raw.ClientId || raw.appId || '';
      const senderMailbox = raw.senderMailbox || raw.SenderMailbox || '';
      if (!tenantId || !clientId) throw new Error('JSON must contain tenantId and clientId');
      update((c) => ({
        ...c,
        provider: 'graph',
        graph: {
          tenantId,
          clientId,
          senderMailbox: senderMailbox || c.graph.senderMailbox,
          secretExpiresOn: (raw.secretExpiresOn || c.graph.secretExpiresOn || '').slice(0, 10),
        },
      }));
      if (raw.clientSecret) setGraphSecret(raw.clientSecret);
      setImportText('');
      setMessage('Setup imported. Press Save, then Test connection.');
      setError('');
    } catch (e) {
      setError(`Could not import: ${e instanceof Error ? e.message : 'invalid JSON'}`);
    }
  }

  async function uploadAttachment(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !config) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/email/attachments', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const tpl = config.templates[activeEvent];
      updateTemplate(activeEvent, { attachments: [...tpl.attachments, data.attachment] });
      setMessage(`${file.name} attached. Press Save to keep it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function insertToken(token: string) {
    if (!config) return;
    const el = bodyRef.current;
    const tpl = config.templates[activeEvent];
    const snippet = `{{${token}}}`;
    if (!el) {
      updateTemplate(activeEvent, { body: tpl.body + snippet });
      return;
    }
    const start = el.selectionStart ?? tpl.body.length;
    const end = el.selectionEnd ?? start;
    updateTemplate(activeEvent, { body: tpl.body.slice(0, start) + snippet + tpl.body.slice(end) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  const activeMeta = MAIL_EVENTS.find((e) => e.key === activeEvent)!;

  const preview = useMemo(() => {
    if (!config || !view) return null;
    const tpl = config.templates[activeEvent];
    const vars = buildMailVars({
      kind: activeMeta.kind,
      id: 1024,
      itemType: activeMeta.kind === 'careers' ? 'careers' : 'product',
      payload: SAMPLE_PAYLOADS[activeMeta.kind],
      site: view.site,
    });
    const subject = renderTemplate(tpl.subject, vars, false);
    const bodyHtml = bodyToHtml(renderTemplate(tpl.body, vars, true), config.brandColor);
    const html = wrapEmailHtml({ bodyHtml, subject, companyName: view.site.companyName, siteUrl: view.site.siteUrl, accent: config.brandColor });
    const to = parseAddressList(renderTemplate(tpl.to, vars, false));
    const cc = parseAddressList(renderTemplate(tpl.cc, vars, false));
    return { subject, html, to, cc };
  }, [config, view, activeEvent, activeMeta]);

  if (!config || !view) {
    return error ? <div className="admin-error">{error}</div> : <div className="admin-card">Loading email settings…</div>;
  }

  const daysLeft = secretDaysLeft(config);
  const stats = log?.last7Days || {};
  const recentFailures = (log?.rows || []).filter((r) => r.status === 'failed').slice(0, 5);
  const tpl = config.templates[activeEvent];
  const graphIssues = [
    config.graph.tenantId && !GUID_RE.test(config.graph.tenantId) && !config.graph.tenantId.includes('.')
      ? 'Tenant ID should be a GUID or a domain like contoso.onmicrosoft.com'
      : '',
    config.graph.clientId && !GUID_RE.test(config.graph.clientId) ? 'Client ID should be a GUID' : '',
    config.graph.senderMailbox && !parseAddressList(config.graph.senderMailbox).length ? 'Sender mailbox must be an email address' : '',
  ].filter(Boolean);

  const providerName =
    view.activeProvider === 'graph' ? 'Microsoft 365 (Graph)' : view.activeProvider === 'smtp' ? 'SMTP' : 'Off';

  return (
    <div className="em">
      <div className="em-hero">
        <div>
          <div className="em-eyebrow">Configuration · Messaging</div>
          <h2 className="em-title">Email delivery</h2>
          <p className="em-lead">
            Notifications for enquiries, quotes, callbacks, brochure downloads and careers applications — routed, branded
            and delivered through your Microsoft 365 tenant.
          </p>
        </div>
        <div className="em-hero-status">
          <span className={`em-dot em-dot--${view.activeProvider === 'off' ? 'off' : 'on'}`} />
          <div>
            <strong>{providerName}</strong>
            <span>
              {view.activeProvider === 'graph'
                ? config.graph.senderMailbox || 'sender not set'
                : view.activeProvider === 'smtp'
                  ? config.smtp.host || (view.legacyEnvSmtp ? 'SMTP_* from .env' : 'host not set')
                  : 'No emails are sent'}
            </span>
          </div>
        </div>
      </div>

      {view.secretsUnreadable ? (
        <div className="admin-error">
          Saved credentials can’t be decrypted — the encryption key (MAIL_ENCRYPTION_KEY / AUTH_SECRET) changed. Re-enter
          the client secret or SMTP password and save.
        </div>
      ) : null}
      {error ? <div className="admin-error">{error}</div> : null}
      {message ? <div className="admin-success">{message}</div> : null}

      <nav className="em-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`em-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'log' && stats.failed ? <span className="em-tab-count">{stats.failed}</span> : null}
          </button>
        ))}
      </nav>

      {testResult ? (
        <div className={testResult.ok ? 'admin-success' : 'admin-error'} role="status">
          {testResult.message}
        </div>
      ) : null}

      {tab === 'overview' ? (
        <div className="em-grid">
          <section className="em-card">
            <h3>Health</h3>
            <div className="em-stats">
              <div className="em-stat">
                <span>Provider</span>
                <strong>{providerName}</strong>
              </div>
              <div className="em-stat em-stat--ok">
                <span>Sent · 7 days</span>
                <strong>{stats.sent || 0}</strong>
              </div>
              <div className={`em-stat${stats.failed ? ' em-stat--bad' : ''}`}>
                <span>Failed · 7 days</span>
                <strong>{stats.failed || 0}</strong>
              </div>
              <div className="em-stat">
                <span>Secret expires</span>
                <strong className={daysLeft !== null && daysLeft < 30 ? 'em-warn' : ''}>
                  {view.activeProvider !== 'graph' ? '—' : daysLeft === null ? 'Unknown' : daysLeft < 0 ? 'Expired' : `${daysLeft} days`}
                </strong>
              </div>
            </div>
            {view.activeProvider === 'graph' && daysLeft !== null && daysLeft < 30 ? (
              <div className="admin-error">
                The Microsoft 365 client secret {daysLeft < 0 ? 'has expired' : `expires in ${daysLeft} days`}. Re-run the
                setup script with <code>-RotateSecret</code> and import the new JSON.
              </div>
            ) : null}
            <div className="em-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={!!testing} onClick={() => runTest('connection')}>
                {testing === 'connection' ? 'Testing…' : 'Test connection'}
              </button>
              <button type="button" className="admin-btn admin-btn-primary" disabled={!!testing} onClick={() => runTest('send')}>
                {testing === 'send' ? 'Sending…' : `Send test to ${config.testRecipient || '…'}`}
              </button>
            </div>
          </section>

          <section className="em-card">
            <h3>Notification flows</h3>
            <ul className="em-flows">
              {MAIL_EVENTS.map((e) => {
                const t = config.templates[e.key];
                return (
                  <li key={e.key}>
                    <button
                      type="button"
                      className="em-flow"
                      onClick={() => {
                        setActiveEvent(e.key);
                        setTab('templates');
                      }}
                    >
                      <span className={`em-dot em-dot--${t.enabled && view.activeProvider !== 'off' ? 'on' : 'off'}`} />
                      <span className="em-flow-text">
                        <strong>{e.label}</strong>
                        <small>
                          {t.enabled ? `To ${t.to || '—'}${t.cc ? ` · CC ${t.cc}` : ''}` : 'Disabled'}
                          {t.routes.length ? ` · ${t.routes.length} routing rule${t.routes.length > 1 ? 's' : ''}` : ''}
                          {t.attachResume ? ' · CV attached' : ''}
                          {t.attachments.length ? ` · ${t.attachments.length} file(s)` : ''}
                        </small>
                      </span>
                      <span aria-hidden>→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="em-card em-card--wide">
            <h3>Architecture</h3>
            <div className="em-arch">
              <div className="em-arch-node">
                <strong>Website form</strong>
                <small>Enquiry · Careers · Callback · Brochure</small>
              </div>
              <span className="em-arch-link">saved first</span>
              <div className="em-arch-node">
                <strong>Next.js API</strong>
                <small>Templates · routing · log</small>
              </div>
              <span className="em-arch-link">OAuth 2.0 · HTTPS 443</span>
              <div className="em-arch-node em-arch-node--ms">
                <strong>Microsoft Graph</strong>
                <small>App-only · scoped by Exchange RBAC</small>
              </div>
              <span className="em-arch-link">sends as</span>
              <div className="em-arch-node em-arch-node--ms">
                <strong>{config.graph.senderMailbox || 'website@…'}</strong>
                <small>Shared mailbox · no licence · Sent Items audit</small>
              </div>
            </div>
            {recentFailures.length ? (
              <>
                <h4 className="em-subhead">Recent failures</h4>
                <ul className="em-failures">
                  {recentFailures.map((r) => (
                    <li key={r.id}>
                      <span>{formatWhen(r.created_at)}</span> <strong>{eventLabel(r.event)}</strong> — {r.error}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === 'connection' ? (
        <div className="em-stack">
          <section className="em-card">
            <h3>Delivery provider</h3>
            <div className="em-providers">
              {PROVIDERS.map((p) => (
                <label key={p.id} className={`em-provider${config.provider === p.id ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="provider"
                    checked={config.provider === p.id}
                    onChange={() => update((c) => ({ ...c, provider: p.id }))}
                  />
                  <span className="em-provider-title">
                    {p.title}
                    {p.badge ? <span className="em-badge">{p.badge}</span> : null}
                  </span>
                  <span className="em-provider-text">{p.text}</span>
                </label>
              ))}
            </div>
          </section>

          {config.provider === 'graph' ? (
            <section className="em-card">
              <h3>Microsoft 365 app registration</h3>
              <details className="em-import" open={!config.graph.clientId}>
                <summary>Import from setup script (fastest)</summary>
                <p className="admin-hint">
                  Run the setup script (see <button type="button" className="em-link" onClick={() => setTab('guide')}>Microsoft 365 setup</button>);
                  it copies a JSON block to your clipboard. Paste it here.
                </p>
                <textarea
                  className="admin-textarea em-mono"
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='{"tenantId":"…","clientId":"…","clientSecret":"…","senderMailbox":"website@zigma-technologies.com","secretExpiresOn":"2028-10-01"}'
                />
                <button type="button" className="admin-btn admin-btn-secondary" disabled={!importText.trim()} onClick={importSetupJson}>
                  Import
                </button>
              </details>
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Directory (tenant) ID</label>
                  <input
                    className="admin-input em-mono"
                    value={config.graph.tenantId}
                    onChange={(e) => update((c) => ({ ...c, graph: { ...c.graph, tenantId: e.target.value.trim() } }))}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>
                <div className="admin-field">
                  <label>Application (client) ID</label>
                  <input
                    className="admin-input em-mono"
                    value={config.graph.clientId}
                    onChange={(e) => update((c) => ({ ...c, graph: { ...c.graph, clientId: e.target.value.trim() } }))}
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </div>
                <div className="admin-field">
                  <label>Client secret {view.hasGraphSecret ? <span className="em-badge em-badge--ok">saved · encrypted</span> : null}</label>
                  <input
                    className="admin-input em-mono"
                    type="password"
                    autoComplete="new-password"
                    value={graphSecret}
                    onChange={(e) => {
                      setGraphSecret(e.target.value);
                      setDirty(true);
                    }}
                    placeholder={view.hasGraphSecret ? '•••••••• leave blank to keep' : 'Secret value (not the secret ID)'}
                  />
                </div>
                <div className="admin-field">
                  <label>Secret expires on</label>
                  <input
                    className="admin-input"
                    type="date"
                    value={config.graph.secretExpiresOn.slice(0, 10)}
                    onChange={(e) => update((c) => ({ ...c, graph: { ...c.graph, secretExpiresOn: e.target.value } }))}
                  />
                </div>
                <div className="admin-field">
                  <label>Sender mailbox</label>
                  <input
                    className="admin-input"
                    value={config.graph.senderMailbox}
                    onChange={(e) => update((c) => ({ ...c, graph: { ...c.graph, senderMailbox: e.target.value.trim() } }))}
                    placeholder="website@zigma-technologies.com"
                  />
                  <span className="admin-hint">A shared mailbox (free, no licence). The app can send only as this address.</span>
                </div>
                <div className="admin-field">
                  <label className="em-check">
                    <input
                      type="checkbox"
                      checked={config.saveToSentItems}
                      onChange={(e) => update((c) => ({ ...c, saveToSentItems: e.target.checked }))}
                    />
                    Keep a copy in the mailbox’s Sent Items (audit trail)
                  </label>
                </div>
              </div>
              {graphIssues.length ? (
                <ul className="em-issues">
                  {graphIssues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {config.provider === 'smtp' ? (
            <section className="em-card">
              <h3>SMTP server</h3>
              <div className="em-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => update((c) => ({ ...c, smtp: { ...c.smtp, host: 'smtp.office365.com', port: 587, security: 'starttls' } }))}
                >
                  Office 365 preset
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => update((c) => ({ ...c, smtp: { ...c.smtp, host: 'smtp.hostinger.com', port: 465, security: 'ssl' } }))}
                >
                  Hostinger preset
                </button>
              </div>
              {config.smtp.host === 'smtp.office365.com' ? (
                <div className="admin-error">
                  Microsoft is retiring Basic authentication for SMTP AUTH in Exchange Online. Prefer the Graph API
                  provider — it needs no mailbox password and survives the change.
                </div>
              ) : null}
              <div className="admin-form-grid">
                <div className="admin-field">
                  <label>Host</label>
                  <input
                    className="admin-input"
                    value={config.smtp.host}
                    onChange={(e) => update((c) => ({ ...c, smtp: { ...c.smtp, host: e.target.value.trim() } }))}
                    placeholder={view.legacyEnvSmtp ? 'Blank = use SMTP_HOST from .env' : 'smtp.example.com'}
                  />
                </div>
                <div className="admin-field">
                  <label>Port / security</label>
                  <div className="em-inline">
                    <input
                      className="admin-input"
                      type="number"
                      value={config.smtp.port}
                      onChange={(e) => update((c) => ({ ...c, smtp: { ...c.smtp, port: Number(e.target.value) || 587 } }))}
                    />
                    <select
                      className="admin-select"
                      value={config.smtp.security}
                      onChange={(e) =>
                        update((c) => ({ ...c, smtp: { ...c.smtp, security: e.target.value as MailConfig['smtp']['security'] } }))
                      }
                    >
                      <option value="auto">Auto (465 = SSL)</option>
                      <option value="ssl">SSL / TLS</option>
                      <option value="starttls">STARTTLS</option>
                    </select>
                  </div>
                </div>
                <div className="admin-field">
                  <label>Username</label>
                  <input
                    className="admin-input"
                    value={config.smtp.user}
                    autoComplete="off"
                    onChange={(e) => update((c) => ({ ...c, smtp: { ...c.smtp, user: e.target.value.trim() } }))}
                  />
                </div>
                <div className="admin-field">
                  <label>Password {view.hasSmtpPassword ? <span className="em-badge em-badge--ok">saved · encrypted</span> : null}</label>
                  <input
                    className="admin-input"
                    type="password"
                    autoComplete="new-password"
                    value={smtpPassword}
                    onChange={(e) => {
                      setSmtpPassword(e.target.value);
                      setDirty(true);
                    }}
                    placeholder={view.hasSmtpPassword ? '•••••••• leave blank to keep' : ''}
                  />
                </div>
                <div className="admin-field">
                  <label>From address</label>
                  <input
                    className="admin-input"
                    value={config.smtp.from}
                    onChange={(e) => update((c) => ({ ...c, smtp: { ...c.smtp, from: e.target.value.trim() } }))}
                    placeholder="website@zigma-technologies.com"
                  />
                </div>
              </div>
            </section>
          ) : null}

          <section className="em-card">
            <h3>Branding & testing</h3>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label>Sender display name</label>
                <input
                  className="admin-input"
                  value={config.fromName}
                  onChange={(e) => update((c) => ({ ...c, fromName: e.target.value }))}
                  placeholder={view.site.companyName}
                />
              </div>
              <div className="admin-field">
                <label>Accent colour</label>
                <div className="em-inline">
                  <input
                    type="color"
                    className="em-color"
                    value={config.brandColor}
                    onChange={(e) => update((c) => ({ ...c, brandColor: e.target.value }))}
                  />
                  <input
                    className="admin-input em-mono"
                    value={config.brandColor}
                    onChange={(e) => update((c) => ({ ...c, brandColor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-field">
                <label>Test recipient</label>
                <input
                  className="admin-input"
                  value={config.testRecipient}
                  onChange={(e) => update((c) => ({ ...c, testRecipient: e.target.value }))}
                  placeholder="you@zigma-technologies.com"
                />
              </div>
            </div>
            <div className="em-actions">
              <button type="button" className="admin-btn admin-btn-secondary" disabled={!!testing} onClick={() => runTest('connection')}>
                {testing === 'connection' ? 'Testing…' : 'Save & test connection'}
              </button>
              <button type="button" className="admin-btn admin-btn-primary" disabled={!!testing} onClick={() => runTest('send')}>
                {testing === 'send' ? 'Sending…' : 'Save & send test email'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {tab === 'templates' ? (
        <div className="em-templates">
          <aside className="em-events">
            {MAIL_EVENTS.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`em-event${activeEvent === e.key ? ' is-active' : ''}`}
                onClick={() => setActiveEvent(e.key)}
              >
                <span className={`em-dot em-dot--${config.templates[e.key].enabled ? 'on' : 'off'}`} />
                <span>
                  <strong>{e.label}</strong>
                  <small>{e.description}</small>
                </span>
              </button>
            ))}
          </aside>

          <div className="em-editor">
            <section className="em-card">
              <div className="em-card-head">
                <h3>{activeMeta.label}</h3>
                <label className="em-switch">
                  <input
                    type="checkbox"
                    checked={tpl.enabled}
                    onChange={(e) => updateTemplate(activeEvent, { enabled: e.target.checked })}
                  />
                  <span>{tpl.enabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="admin-form-grid">
                {(['to', 'cc', 'bcc', 'replyTo'] as const).map((field) => (
                  <div className="admin-field" key={field}>
                    <label>{field === 'replyTo' ? 'Reply-To' : field.toUpperCase()}</label>
                    <input
                      className="admin-input"
                      value={tpl[field]}
                      onChange={(e) => updateTemplate(activeEvent, { [field]: e.target.value })}
                      placeholder={field === 'to' ? 'hr@…, {{notify_emails}}' : field === 'replyTo' ? '{{email}}' : 'Comma-separated'}
                    />
                  </div>
                ))}
                <div className="admin-field full">
                  <label>Subject</label>
                  <input
                    className="admin-input"
                    value={tpl.subject}
                    onChange={(e) => updateTemplate(activeEvent, { subject: e.target.value })}
                  />
                </div>
              </div>
              <p className="admin-hint">
                Separate addresses with commas. <code>{'{{notify_emails}}'}</code> = Site Settings notify list (
                {view.site.notifyEmails || 'empty'}), <code>{'{{email}}'}</code> = the visitor.
              </p>

              <div className="em-body-head">
                <label htmlFor="em-body">Body</label>
                <button
                  type="button"
                  className="em-link"
                  onClick={() => {
                    if (confirm('Replace subject and body with the default template?')) {
                      const d = defaultMailTemplates()[activeEvent];
                      updateTemplate(activeEvent, { subject: d.subject, body: d.body });
                    }
                  }}
                >
                  Reset to default
                </button>
              </div>
              <div className="em-tokens">
                {MAIL_VARIABLES.filter((v) => !v.kinds || v.kinds.includes(activeMeta.kind)).map((v) => (
                  <button key={v.token} type="button" className="em-token" title={v.label} onClick={() => insertToken(v.token)}>
                    {`{{${v.token}}}`}
                  </button>
                ))}
              </div>
              <textarea
                id="em-body"
                ref={bodyRef}
                className="admin-textarea em-mono em-body"
                rows={12}
                value={tpl.body}
                onChange={(e) => updateTemplate(activeEvent, { body: e.target.value })}
              />
              <p className="admin-hint">
                Plain text or HTML. Conditionals: <code>{'{{#if company}}…{{else}}…{{/if}}'}</code>. Buttons:{' '}
                <code>{'<a class="btn" href="{{admin_url}}">Open</a>'}</code>.
              </p>
            </section>

            <section className="em-card">
              <h3>Attachments</h3>
              {activeMeta.kind === 'careers' ? (
                <label className="em-check">
                  <input
                    type="checkbox"
                    checked={tpl.attachResume}
                    onChange={(e) => updateTemplate(activeEvent, { attachResume: e.target.checked })}
                  />
                  Attach the applicant’s uploaded CV
                </label>
              ) : null}
              <ul className="em-files">
                {tpl.attachments.map((a) => (
                  <li key={a.id}>
                    <span>📎 {a.name}</span>
                    <small>{formatBytes(a.size)}</small>
                    <button
                      type="button"
                      className="em-link em-link--danger"
                      onClick={() => updateTemplate(activeEvent, { attachments: tpl.attachments.filter((x) => x.id !== a.id) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <label className="admin-btn admin-btn-secondary em-upload">
                {uploading ? 'Uploading…' : 'Add file (brochure, company profile…)'}
                <input type="file" hidden disabled={uploading} onChange={uploadAttachment} accept=".pdf,.doc,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.txt,.ics" />
              </label>
              <p className="admin-hint">PDF, Office, images, .ics · up to 10 MB each. Files over 3 MB use Graph upload sessions automatically.</p>
            </section>

            <section className="em-card">
              <div className="em-card-head">
                <h3>Smart routing</h3>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() =>
                    updateTemplate(activeEvent, {
                      routes: [...tpl.routes, { field: activeMeta.kind === 'careers' ? 'role' : 'source', op: 'contains', value: '', to: '', cc: '', mode: 'add' }],
                    })
                  }
                >
                  + Add rule
                </button>
              </div>
              <p className="admin-hint">
                Route by what was submitted — e.g. role contains “Engineer” → add engineering-hr@…, or source equals
                “callback_request” → replace with sales@….
              </p>
              <datalist id="em-route-fields">
                {ROUTE_FIELDS.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              {tpl.routes.map((r, i) => {
                const setRule = (patch: Partial<MailRouteRule>) =>
                  updateTemplate(activeEvent, { routes: tpl.routes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                return (
                  <div className="em-rule" key={i}>
                    <span className="em-rule-if">If</span>
                    <input className="admin-input" list="em-route-fields" value={r.field} onChange={(e) => setRule({ field: e.target.value })} placeholder="field" />
                    <select className="admin-select" value={r.op} onChange={(e) => setRule({ op: e.target.value as MailRouteRule['op'] })}>
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      <option value="not_empty">is filled</option>
                    </select>
                    <input
                      className="admin-input"
                      value={r.value}
                      disabled={r.op === 'not_empty'}
                      onChange={(e) => setRule({ value: e.target.value })}
                      placeholder="value"
                    />
                    <select className="admin-select" value={r.mode} onChange={(e) => setRule({ mode: e.target.value as MailRouteRule['mode'] })}>
                      <option value="add">add</option>
                      <option value="replace">send only to</option>
                    </select>
                    <input className="admin-input" value={r.to} onChange={(e) => setRule({ to: e.target.value })} placeholder="to@…" />
                    <input className="admin-input" value={r.cc} onChange={(e) => setRule({ cc: e.target.value })} placeholder="cc@… (optional)" />
                    <button
                      type="button"
                      className="em-link em-link--danger"
                      aria-label="Remove rule"
                      onClick={() => updateTemplate(activeEvent, { routes: tpl.routes.filter((_, j) => j !== i) })}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </section>
          </div>

          <aside className="em-preview">
            <div className="em-preview-head">
              <span className="em-eyebrow">Live preview · sample data</span>
              <div className="em-preview-meta">
                <div>
                  <b>To</b> {preview?.to.join(', ') || <em>no valid recipient</em>}
                </div>
                {preview?.cc.length ? (
                  <div>
                    <b>CC</b> {preview.cc.join(', ')}
                  </div>
                ) : null}
                <div>
                  <b>Subject</b> {preview?.subject}
                </div>
              </div>
            </div>
            <iframe title="Email preview" className="em-preview-frame" sandbox="" srcDoc={preview?.html || ''} />
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={!!testing}
              onClick={() => runTest('send', activeEvent)}
            >
              {testing === `send:${activeEvent}` ? 'Sending…' : `Save & send this template to ${config.testRecipient || 'test recipient'}`}
            </button>
          </aside>
        </div>
      ) : null}

      {tab === 'log' ? (
        <section className="em-card">
          <div className="em-card-head">
            <h3>Delivery log</h3>
            <div className="em-inline">
              <select
                className="admin-select"
                value={logFilter}
                onChange={(e) => {
                  setLogFilter(e.target.value);
                  void loadLog(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => loadLog(logFilter)}>
                Refresh
              </button>
            </div>
          </div>
          <p className="admin-hint">Last 180 days. Failed messages can be re-sent exactly as rendered (with attachments).</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Flow</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!log?.rows.length ? (
                  <tr>
                    <td colSpan={6} className="admin-empty">
                      No emails logged yet.
                    </td>
                  </tr>
                ) : (
                  log.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="em-nowrap">{formatWhen(r.created_at)}</td>
                      <td>
                        {eventLabel(r.event)}
                        {r.ref_id ? <small className="em-muted"> · #{r.ref_id}</small> : null}
                      </td>
                      <td className="em-break">
                        {r.to_list || '—'}
                        {r.cc_list ? <small className="em-muted"> · CC {r.cc_list}</small> : null}
                      </td>
                      <td>{r.subject}</td>
                      <td>
                        <span className={`em-status em-status--${r.status}`}>{r.status}</span>
                        {r.attempts > 1 ? <small className="em-muted"> ×{r.attempts}</small> : null}
                        {r.error ? <div className="em-error-text">{r.error}</div> : null}
                      </td>
                      <td>
                        {r.status === 'failed' ? (
                          <button type="button" className="admin-btn admin-btn-secondary" disabled={!!testing} onClick={() => retry(r.id)}>
                            {testing === `retry:${r.id}` ? '…' : 'Retry'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'guide' ? <SetupGuide senderMailbox={config.graph.senderMailbox} /> : null}

      {dirty ? (
        <div className="em-savebar">
          <span>Unsaved changes</span>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => applyView(view)} disabled={saving}>
            Discard
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save email settings'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SetupGuide({ senderMailbox }: { senderMailbox: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="em-stack">
      <section className="em-card">
        <h3>Recommended architecture</h3>
        <p>
          The website sends through <strong>Microsoft Graph</strong> using an <strong>Entra ID app registration</strong>{' '}
          (OAuth 2.0 client credentials) from a <strong>shared mailbox</strong> such as{' '}
          <code>{senderMailbox || 'website@zigma-technologies.com'}</code>. Access is limited to that one mailbox with{' '}
          <strong>Exchange Online RBAC for Applications</strong>, so the app can’t read or send as anyone else.
        </p>
        <ul className="em-bullets">
          <li><strong>No passwords or MFA exceptions.</strong> Basic auth for SMTP AUTH is being retired in Exchange Online, and Graph doesn’t use it.</li>
          <li><strong>Works on any host.</strong> Uses HTTPS 443, so blocked SMTP ports on Hostinger or a VPS don’t matter.</li>
          <li><strong>Least privilege.</strong> Mail.Send is scoped to one mailbox, not granted tenant-wide.</li>
          <li><strong>Deliverability.</strong> Mail leaves from Microsoft 365, so your existing SPF, DKIM and DMARC already align.</li>
          <li><strong>Free and auditable.</strong> Shared mailboxes need no licence, and every message is kept in Sent Items.</li>
        </ul>
      </section>

      <section className="em-card">
        <h3>One-time setup (about 10 minutes)</h3>
        <ol className="em-steps">
          <li>
            <strong>Run the setup script</strong> as a Global Administrator, or as an Application Administrator together with an Exchange Administrator, from the project folder, in Windows PowerShell 5.1 or PowerShell 7:
            <div className="em-code">
              <code>{SETUP_SCRIPT}</code>
              <button
                type="button"
                className="em-link"
                onClick={() => {
                  void navigator.clipboard.writeText(SETUP_SCRIPT);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            The script installs the modules it needs, then creates the shared mailbox, the app registration and its secret. It also scopes the app to that mailbox, verifies access, and copies a JSON block to your clipboard.
          </li>
          <li>
            <strong>Connection → Import from setup script</strong>: paste the JSON, then press <em>Save</em>.
          </li>
          <li>
            <strong>Test connection</strong>, then <strong>Send test email</strong>. A 403 error just after setup is normal, because Exchange permissions can take 30 minutes to 2 hours to apply.
          </li>
          <li>
            <strong>Templates</strong>: set the recipients (for example HR for careers and sales for enquiries), CC lists and routing rules, then send a test of each template.
          </li>
        </ol>
      </section>

      <section className="em-card">
        <h3>What’s automated</h3>
        <ul className="em-bullets">
          <li>Creating the app, service principal, secret, shared mailbox, mailbox scope and role assignment, plus the access test (setup script).</li>
          <li>Token caching, retries on throttling (429/5xx) and upload sessions for attachments over 3 MB.</li>
          <li>Plain-English error messages, a delivery log with one-click retry, and a secret-expiry countdown on Overview.</li>
          <li>Secret rotation: re-run the script with <code>-RotateSecret</code> and import the new JSON.</li>
        </ul>
        <p className="admin-hint">Still manual: one admin running the script, and waiting for permissions to apply. Microsoft requires a person to grant consent.</p>
      </section>

      <section className="em-card">
        <h3>Alternatives considered</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>When to use</th>
                <th>Trade-off</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Graph API + shared mailbox</strong></td>
                <td>Default, and the right choice for website notifications</td>
                <td>Needs one-time admin consent</td>
              </tr>
              <tr>
                <td>SMTP AUTH (smtp.office365.com)</td>
                <td>Legacy apps only</td>
                <td>Basic auth is being retired, needs a licensed mailbox password, and is often blocked by security defaults</td>
              </tr>
              <tr>
                <td>SMTP relay connector (port 25)</td>
                <td>Printers or scanners on a static IP</td>
                <td>Needs a static IP and connector upkeep; port 25 is usually blocked on hosting</td>
              </tr>
              <tr>
                <td>Azure Communication Services Email</td>
                <td>High-volume or marketing mail</td>
                <td>Separate Azure billing and domain verification</td>
              </tr>
              <tr>
                <td>Power Automate flow</td>
                <td>Business teams adding approvals or Teams posts</td>
                <td>Premium HTTP trigger licence, and a flow owner to maintain</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
