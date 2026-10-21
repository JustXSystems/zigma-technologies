/**
 * Corporate ops alerts — Slack / Discord / Teams-compatible incoming webhooks.
 * Best-effort: never throws to callers.
 */

/**
 * @param {object} payload
 * @param {{
 *   text: string,
 *   severity?: 'info' | 'warning' | 'critical',
 *   event?: string,
 *   fields?: Record<string, string | number | boolean | null | undefined>,
 *   meridian?: object,
 * }} payload
 */
export async function postOpsWebhook(payload) {
  const url = (process.env.MERIDIAN_WEBHOOK_URL || '').trim();
  if (!url) return { ok: true, status: 'skipped', message: 'MERIDIAN_WEBHOOK_URL unset' };

  const severity = payload.severity || 'info';
  const always = process.env.MERIDIAN_WEBHOOK_ALWAYS === '1';
  if (!always && severity === 'info' && process.env.MERIDIAN_WEBHOOK_ALERTS_ONLY === '1') {
    return { ok: true, status: 'skipped', message: 'info skipped (alerts-only)' };
  }

  const text = String(payload.text || 'Meridian ops').slice(0, 3500);
  const body = {
    text,
    // Discord embed-friendly
    content: text,
    // Slack Block Kit light
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Meridian* · \`${severity}\`\n${text}` },
      },
    ],
    meridian: {
      event: payload.event || 'ops',
      severity,
      at: new Date().toISOString(),
      fields: payload.fields || {},
      ...(payload.meridian || {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return {
      ok: res.ok,
      status: res.ok ? 'ok' : 'error',
      message: res.ok ? 'webhook delivered' : `webhook HTTP ${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Alert after SEO Command Brief / live verify.
 * @param {{
 *   ok?: boolean,
 *   status?: string,
 *   message?: string,
 *   data?: {
 *     origin?: string,
 *     liveVerify?: { ok?: boolean, failed?: number, failures?: string[] },
 *     sources?: Record<string, string>,
 *     scorecard?: { overall?: number, grade?: string },
 *     insights?: { severity?: string, title?: string }[],
 *   },
 * }} report
 */
export async function alertSeoReport(report) {
  const liveFail = report?.data?.liveVerify?.ok === false;
  const authRequired = report?.status === 'auth_required';
  const highInsights = (report?.data?.insights || []).filter(
    (i) => i.severity === 'high' || i.severity === 'critical'
  );
  const always = process.env.MERIDIAN_WEBHOOK_ALWAYS === '1';

  if (!liveFail && !authRequired && !highInsights.length && !always && report?.ok) {
    return { ok: true, status: 'skipped', message: 'nominal — no alert' };
  }

  const severity = liveFail ? 'critical' : authRequired || highInsights.length ? 'warning' : 'info';
  const origin = report?.data?.origin || 'site';
  const score = report?.data?.scorecard?.overall;
  const grade = report?.data?.scorecard?.grade;
  const fails = (report?.data?.liveVerify?.failures || []).slice(0, 5);
  const lines = [
    `SEO report · ${origin}`,
    report?.message || '',
    score != null ? `Score ${score}${grade ? ` (${grade})` : ''}` : null,
    liveFail ? `Live verify FAIL · ${(report?.data?.liveVerify?.failed ?? fails.length) || '?'}` : null,
    ...fails.map((f) => `• ${f}`),
    authRequired ? 'Connectors auth_required — set GitHub Actions MERIDIAN_* secrets' : null,
    ...highInsights.slice(0, 3).map((i) => `• ${i.title || 'insight'}`),
  ].filter(Boolean);

  return postOpsWebhook({
    event: 'seo-report',
    severity,
    text: lines.join('\n'),
    fields: {
      status: report?.status,
      liveVerify: report?.data?.liveVerify?.ok !== false,
      gsc: report?.data?.sources?.gsc,
      bing: report?.data?.sources?.bing,
      ga4: report?.data?.sources?.ga4,
    },
    meridian: { score, grade, insights: highInsights.length },
  });
}

/**
 * Alert after autopilot when score regresses or hard fails.
 */
export async function alertAutopilot(autopilot, digest) {
  const hard = Number(autopilot?.hardFailCount || 0);
  const regressed = !!autopilot?.regressed || autopilot?.trend?.status === 'down';
  const humanLeft = digest?.data?.humanChecklist?.length ?? 0;
  const always = process.env.MERIDIAN_WEBHOOK_ALWAYS === '1';

  if (!hard && !regressed && !always) {
    // Keep legacy always-on summary when webhook set without ALERTS_ONLY
    if (process.env.MERIDIAN_WEBHOOK_ALERTS_ONLY === '1') {
      return { ok: true, status: 'skipped', message: 'nominal — no alert' };
    }
  }

  const severity = hard || regressed ? 'warning' : 'info';
  const name = autopilot?.profile?.displayName || autopilot?.profile?.id || 'site';
  const text = [
    `Autopilot ${name}: score ${autopilot?.scorecard?.overall} (${autopilot?.scorecard?.grade})`,
    autopilot?.trend?.message || '',
    hard ? `hard fails ${hard}` : null,
    regressed ? 'score regression detected' : null,
    `human tasks ${humanLeft}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return postOpsWebhook({
    event: 'autopilot',
    severity,
    text,
    meridian: {
      score: autopilot?.scorecard?.overall,
      grade: autopilot?.scorecard?.grade,
      trend: autopilot?.trend?.status,
      hardFails: hard,
      humanChecklist: digest?.data?.humanChecklist,
      actions: autopilot?.actions,
    },
  });
}
