import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { googleEnvStatus } from './google-auth.mjs';

function envSet(k) {
  return !!(process.env[k] || '').trim();
}

/**
 * Score how close Meridian is to full unattended ops (secrets + human gates).
 * Never prints secret values — only set/missing.
 */
export async function assessUnlockReadiness(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  const google = googleEnvStatus();
  const ga4 = envSet('MERIDIAN_GA4_PROPERTY_ID');
  const bing = envSet('MERIDIAN_BING_API_KEY');
  const psi = envSet('MERIDIAN_PSI_API_KEY');
  const webhook = envSet('MERIDIAN_WEBHOOK_URL');

  let sameAsCount = 0;
  let napMissing = [];
  try {
    const nap = JSON.parse(await readFile(resolve(outDir, 'nap-audit.json'), 'utf8'));
    sameAsCount = nap.sameAsCount ?? nap.nap?.sameAs?.length ?? 0;
    napMissing = nap.missing || [];
  } catch {
    /* nap not run yet */
  }

  const secrets = [
    {
      id: 'google_oauth',
      label: 'Google OAuth (GSC + GA4 + Act)',
      weight: 30,
      ready: google.ok,
      missing: google.missing,
      unlocks: ['GSC sitemap submit', 'URL inspect', 'sitemap delta', 'GA4 signals'],
      howTo: 'SETUP.md Part A — Desktop OAuth client + google-oauth-setup.mjs',
    },
    {
      id: 'ga4_property',
      label: 'GA4 Property ID',
      weight: 10,
      ready: ga4,
      missing: ga4 ? [] : ['MERIDIAN_GA4_PROPERTY_ID'],
      unlocks: ['GA4 enquiry / traffic digests'],
      howTo: 'SETUP.md Part B — numeric Property ID (not G-…)',
    },
    {
      id: 'bing',
      label: 'Bing Webmaster API key',
      weight: 15,
      ready: bing,
      missing: bing ? [] : ['MERIDIAN_BING_API_KEY'],
      unlocks: ['Bing sitemap submit'],
      howTo: 'SETUP.md Part D — Bing Webmaster → API Access',
    },
    {
      id: 'psi',
      label: 'PageSpeed Insights API key',
      weight: 10,
      ready: psi,
      missing: psi ? [] : ['MERIDIAN_PSI_API_KEY'],
      unlocks: ['Lab CWV in Meridian scan'],
      howTo: 'SETUP.md Part E — enable PageSpeed Insights API',
    },
    {
      id: 'webhook',
      label: 'Ops webhook (optional)',
      weight: 5,
      ready: webhook,
      missing: webhook ? [] : ['MERIDIAN_WEBHOOK_URL'],
      unlocks: ['Slack/Teams autopilot summary'],
      howTo: 'Set MERIDIAN_WEBHOOK_URL to a chat incoming webhook',
      optional: true,
    },
  ];

  const humanGates = [
    {
      id: 'social_sameas',
      label: 'Social profile URLs in Site Settings',
      weight: 15,
      ready: sameAsCount > 0,
      unlocks: ['JSON-LD sameAs', 'SCHEMA_SAMEAS clear'],
      howTo: 'Admin → Site Settings → Social links (after citations LinkedIn/FB/YT)',
    },
    {
      id: 'nap_complete',
      label: 'NAP fields complete on live Org schema',
      weight: 10,
      ready: napMissing.length === 0,
      unlocks: ['GBP paste sheet accuracy'],
      howTo: napMissing.length ? `Fill missing: ${napMissing.join(', ')}` : 'OK — use gbp-checklist.md',
    },
    {
      id: 'gsc_property',
      label: 'Search Console property verified (manual)',
      weight: 5,
      ready: google.ok,
      unlocks: ['Indexing requests after Act secrets work'],
      howTo: 'SEO-GUIDE Phase 0.1 / 1.7 — domain property + sitemap submit once',
      note: 'Assumed ready when OAuth is set; confirm in GSC UI',
    },
  ];

  const all = [...secrets, ...humanGates];
  const totalWeight = all.reduce((s, g) => s + g.weight, 0);
  const earned = all.reduce((s, g) => s + (g.ready ? g.weight : 0), 0);
  const percent = totalWeight ? Math.round((earned / totalWeight) * 100) : 0;

  const nextUnlock = all
    .filter((g) => !g.ready)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((g) => ({
      id: g.id,
      label: g.label,
      weight: g.weight,
      howTo: g.howTo,
      missing: g.missing || [],
      unlocks: g.unlocks,
    }));

  const payload = {
    generatedAt: new Date().toISOString(),
    profile: { id: profile.id, displayName: profile.displayName, origin: profile.origin },
    percent,
    grade: percent >= 90 ? 'A' : percent >= 70 ? 'B' : percent >= 50 ? 'C' : percent >= 30 ? 'D' : 'F',
    secrets: secrets.map(({ id, label, ready, missing, unlocks, howTo, optional }) => ({
      id,
      label,
      ready,
      missing,
      unlocks,
      howTo,
      optional: !!optional,
    })),
    humanGates: humanGates.map(({ id, label, ready, unlocks, howTo, note }) => ({
      id,
      label,
      ready,
      unlocks,
      howTo,
      note: note || null,
    })),
    nextUnlock,
    sameAsCount,
  };

  const md = [
    `# Meridian unlock readiness — ${profile.displayName || profile.id}`,
    '',
    `**${percent}%** unlocked (${payload.grade}) · ${payload.generatedAt}`,
    '',
    '## Secrets',
    '',
    '| Gate | Ready | Unlocks | How |',
    '| --- | --- | --- | --- |',
    ...secrets.map(
      (s) =>
        `| ${s.label}${s.optional ? ' (opt)' : ''} | ${s.ready ? 'yes' : 'NO'} | ${s.unlocks.join('; ')} | ${s.howTo} |`
    ),
    '',
    '## Human gates',
    '',
    '| Gate | Ready | How |',
    '| --- | --- | --- |',
    ...humanGates.map((h) => `| ${h.label} | ${h.ready ? 'yes' : 'NO'} | ${h.howTo} |`),
    '',
    '## Do next (highest weight first)',
    '',
    ...nextUnlock.map((n, i) => `${i + 1}. **${n.label}** (+${n.weight}%) — ${n.howTo}`),
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'unlock-readiness.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'unlock-readiness.md'), md, 'utf8');

  const findings = nextUnlock.slice(0, 3).map((n) => ({
    code: `UNLOCK_${n.id.toUpperCase()}`,
    severity: n.weight >= 20 ? 'medium' : 'low',
    title: `Unlock gate: ${n.label}`,
    remediation: n.howTo,
    owner: n.id.startsWith('social') || n.id.startsWith('nap') || n.id.startsWith('gsc') ? 'marketing' : 'developer',
    pillar: 'technical',
  }));

  return {
    ok: true,
    status: percent >= 70 ? 'ok' : 'degraded',
    message: `Unlock readiness ${percent}% (${payload.grade}) · ${nextUnlock.length} gate(s) left`,
    data: { ...payload, paths: { md: resolve(outDir, 'unlock-readiness.md'), json: resolve(outDir, 'unlock-readiness.json') } },
    findings: percent < 100 ? findings : [],
  };
}
