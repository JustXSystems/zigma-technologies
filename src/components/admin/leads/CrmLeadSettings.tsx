'use client';

import { useState } from 'react';
import { ToggleCard } from '@/components/admin/form/controls';
import { CRM_LEAD_KINDS, parseCrmLeadKinds, serializeCrmLeadKinds, type CrmLeadKind } from '@/lib/crm-kinds';
import type { SiteSettings } from '@/lib/site-settings';

type Props = {
  settings: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
};

/** Which website submissions reach the CRM webhook, plus a test send using the values on screen. */
export default function CrmLeadSettings({ settings, onChange }: Props) {
  const enabled = parseCrmLeadKinds(settings.crmLeadKinds);
  const hasUrl = !!settings.crmWebhookUrl.trim();

  function setKind(kind: CrmLeadKind, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(kind);
    else next.delete(kind);
    onChange({ crmLeadKinds: serializeCrmLeadKinds(next) });
  }

  return (
    <div className="admin-page-stack" style={{ marginTop: '1.25rem' }}>
      <div>
        <h4 style={{ margin: '0 0 0.35rem' }}>Send to the CRM</h4>
        <p className="theme-help" style={{ marginTop: 0 }}>
          Each submission is saved here first, then forwarded in the background — a slow CRM never delays the visitor.
          {hasUrl ? '' : ' Nothing is sent until a webhook URL is set.'}
        </p>
        <div className="admin-footer-office-toggles">
          {CRM_LEAD_KINDS.map((kind) => (
            <ToggleCard
              key={kind.id}
              id={`crm-lead-kind-${kind.id}`}
              label={kind.label}
              hint={kind.hint}
              checked={enabled.has(kind.id)}
              onChange={(on) => setKind(kind.id, on)}
            />
          ))}
        </div>
      </div>
      <CrmTestSend settings={settings} />
    </div>
  );
}

function CrmTestSend({ settings }: { settings: SiteSettings }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/site-settings/crm-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crmWebhookUrl: settings.crmWebhookUrl,
          crmWebhookSecret: settings.crmWebhookSecret,
          crmProvider: settings.crmProvider,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setResult({ ok: res.ok, text: data.message || data.error || (res.ok ? 'Test lead delivered.' : 'Test failed.') });
    } catch {
      setResult({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        disabled={sending || !settings.crmWebhookUrl.trim()}
        onClick={() => void send()}
      >
        {sending ? 'Sending…' : 'Send a test lead'}
      </button>
      <p className="az-admin-hint" style={{ marginTop: '0.4rem' }}>
        Posts a sample enquiry marked <code>&quot;test&quot;: true</code> to the URL above — unsaved edits included.
      </p>
      {result ? (
        <div className={result.ok ? 'admin-success' : 'admin-error'} role="status">
          {result.text}
        </div>
      ) : null}
    </div>
  );
}
