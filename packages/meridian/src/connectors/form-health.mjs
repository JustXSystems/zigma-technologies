import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchManual } from '../lib/html.mjs';

/**
 * Phase 9.1 #5 — probe enquiry form endpoints without submitting spam.
 * GET form schema + contact page; confirm enquiry API rejects empty POST (alive).
 */
export async function probeFormHealth(profile, opts = {}) {
  const origin = profile.origin.replace(/\/$/, '');
  const formUrl = `${origin}/api/public/forms/enquiry`;
  const contactUrl = `${origin}/contact`;
  const enquiryUrl = `${origin}/api/public/enquiries`;
  const checks = [];
  const findings = [];

  try {
    const form = await fetchManual(formUrl, { forceBody: true });
    const ok = form.status >= 200 && form.status < 300;
    let fields = 0;
    try {
      const json = JSON.parse(form.body || '{}');
      fields = Array.isArray(json.fields) ? json.fields.length : Array.isArray(json) ? json.length : 0;
    } catch {
      fields = 0;
    }
    checks.push({ id: 'form-schema', url: formUrl, status: form.status, ok, fields });
    if (!ok) {
      findings.push({
        code: 'FORM_SCHEMA_DOWN',
        severity: 'high',
        title: `Enquiry form schema endpoint HTTP ${form.status}`,
        remediation: 'Fix /api/public/forms/enquiry — contact forms will fail.',
        owner: 'developer',
        pillar: 'technical',
      });
    }
  } catch (e) {
    checks.push({ id: 'form-schema', ok: false, error: String(e.message || e) });
    findings.push({
      code: 'FORM_SCHEMA_DOWN',
      severity: 'high',
      title: 'Enquiry form schema unreachable',
      detail: String(e.message || e),
      remediation: 'Check app health / PM2 / nginx for /api/public/forms/enquiry',
      owner: 'developer',
      pillar: 'technical',
    });
  }

  try {
    const contact = await fetchManual(contactUrl, { forceBody: true });
    const hasForm =
      /enquiry|contact.?form|name=["']email["']|api\/public\/enquiries/i.test(contact.body || '');
    checks.push({
      id: 'contact-page',
      url: contactUrl,
      status: contact.status,
      ok: contact.status >= 200 && contact.status < 300 && hasForm,
      hasForm,
    });
    if (contact.status >= 400 || !hasForm) {
      findings.push({
        code: 'CONTACT_FORM_MISSING',
        severity: 'high',
        title: 'Contact page missing or form markup not detected',
        remediation: 'Verify /contact renders the enquiry form.',
        owner: 'developer',
        pillar: 'technical',
      });
    }
  } catch (e) {
    checks.push({ id: 'contact-page', ok: false, error: String(e.message || e) });
  }

  // Alive check: empty POST should fail validation (4xx), not 5xx / network error
  try {
    const res = await fetch(enquiryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'MeridianSEO/0.1' },
      body: JSON.stringify({ meridianProbe: true }),
    });
    const alive = res.status >= 400 && res.status < 500;
    checks.push({ id: 'enquiry-api', url: enquiryUrl, status: res.status, ok: alive || res.status === 200 });
    if (res.status >= 500) {
      findings.push({
        code: 'ENQUIRY_API_5XX',
        severity: 'critical',
        title: `Enquiry API returned HTTP ${res.status}`,
        remediation: 'Check server logs — lead capture is broken.',
        owner: 'developer',
        pillar: 'technical',
      });
    }
  } catch (e) {
    checks.push({ id: 'enquiry-api', ok: false, error: String(e.message || e) });
    findings.push({
      code: 'ENQUIRY_API_DOWN',
      severity: 'critical',
      title: 'Enquiry API unreachable',
      detail: String(e.message || e),
      remediation: 'Restore /api/public/enquiries',
      owner: 'developer',
      pillar: 'technical',
    });
  }

  const ok = findings.filter((f) => f.severity === 'critical' || f.severity === 'high').length === 0;
  const payload = {
    generatedAt: new Date().toISOString(),
    checks,
    ok,
  };

  if (opts.outDir) {
    await mkdir(opts.outDir, { recursive: true });
    await writeFile(resolve(opts.outDir, 'form-health.json'), JSON.stringify(payload, null, 2), 'utf8');
  }

  return {
    ok,
    status: ok ? 'ok' : 'degraded',
    message: ok
      ? 'Enquiry form schema + contact page + API alive'
      : `Form health issues: ${findings.map((f) => f.code).join(', ')}`,
    data: payload,
    findings,
  };
}
