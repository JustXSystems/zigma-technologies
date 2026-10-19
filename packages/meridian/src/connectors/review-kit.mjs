import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditNap } from './nap-audit.mjs';

/**
 * Phase 5.6 — review request + reply templates.
 * Review URL auto from Place ID → live hasMap → Maps search (no paste ritual).
 */
export async function writeReviewKit(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  let nap = opts.nap || null;
  if (!nap) {
    try {
      nap = JSON.parse(await readFile(resolve(outDir, 'nap-audit.json'), 'utf8')).nap;
    } catch {
      const audited = await auditNap(profile, { outDir });
      nap = audited.data?.nap || {};
    }
  }

  const phone = nap.telephone || '[phone]';
  const brand = nap.name || profile.brand?.name || 'Zigma Technologies';
  let reviewLink = opts.reviewLink || process.env.MERIDIAN_GBP_REVIEW_LINK || '';
  if (!reviewLink.trim()) {
    // Auto from Place ID → official write-a-review URL (no human paste)
    const placeId = (process.env.MERIDIAN_GBP_PLACE_ID || '').trim();
    if (placeId) {
      reviewLink = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    }
  }
  if (!reviewLink.trim()) {
    try {
      const live = JSON.parse(await readFile(resolve(outDir, 'live-throne.json'), 'utf8'));
      if (live?.hasMapValue) reviewLink = String(live.hasMapValue);
    } catch {
      /* ignore */
    }
  }
  if (!reviewLink.trim() && nap.hasMap) reviewLink = String(nap.hasMap);
  if (!reviewLink.trim()) {
    const q = encodeURIComponent(`${brand}, Bengaluru`);
    reviewLink = `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  const templates = {
    whatsapp: `Hello [Name], thank you for choosing ${brand} for [project/service]. If you're happy with our work, would you share a short Google review? It takes one minute and helps other companies find us: ${reviewLink} Thank you! – [Your name], ${brand}`,
    emailSubject: 'How did we do on [project name]?',
    emailBody: `Dear [Name],

Thank you for trusting ${brand} with [project/service] at [site/city]. We hope everything is running well.

Would you take a minute to share your experience on Google? Your feedback helps us improve and helps other facility and plant managers make informed decisions.

Leave a review: ${reviewLink}

If anything was not up to your expectations, please reply to this email directly so we can fix it.

Warm regards,
[Name], [Role]
${brand} | ${phone}`,
    replyPositive: `Thank you, [Name]! It was a pleasure delivering the [project] for [company] in [city]. Our AMC team is always available on ${phone} if you need anything.`,
    replyNegative: `Dear [Name], we're sorry to hear about your experience with [issue]. This is not the standard we aim for. Our service manager [name] will call you today to resolve it; you can also reach us on ${phone}.`,
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '5.6',
    brand,
    phone,
    reviewLink,
    reviewLinkSet: true,
    reviewLinkSource: process.env.MERIDIAN_GBP_REVIEW_LINK
      ? 'env'
      : process.env.MERIDIAN_GBP_PLACE_ID
        ? 'place-id'
        : 'maps-proxy',
    rules: [
      'Ask all customers (no review gating)',
      'Never offer money/gifts for reviews',
      'Never write reviews yourself or ask employees',
      'One reminder after 7 days max; target 2–4 reviews/month',
      'Reply to every review within 2 days',
    ],
    templates,
  };

  const md = [
    `# Review request kit (Phase 5.6) — ${brand}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `**Review link:** ${reviewLink}`,
    '',
    `Source: **${payload.reviewLinkSource}** (auto — no paste ritual). Optional override: \`MERIDIAN_GBP_REVIEW_LINK\` or \`MERIDIAN_GBP_PLACE_ID\`.`,
    '',
    '## Rules',
    '',
    ...payload.rules.map((r) => `- ${r}`),
    '',
    '## WhatsApp / SMS',
    '',
    '```',
    templates.whatsapp,
    '```',
    '',
    '## Email',
    '',
    `**Subject:** ${templates.emailSubject}`,
    '',
    '```',
    templates.emailBody,
    '```',
    '',
    '## Reply templates',
    '',
    '**Positive:**',
    '',
    '```',
    templates.replyPositive,
    '```',
    '',
    '**Negative:**',
    '',
    '```',
    templates.replyNegative,
    '```',
    '',
  ].join('\n');

  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'review-kit.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'review-kit.md'), md, 'utf8');

  return {
    ok: true,
    status: payload.reviewLinkSet ? 'ok' : 'degraded',
    message: payload.reviewLinkSet
      ? 'Review kit ready with GBP review link'
      : 'Review kit ready — paste GBP review link (or set MERIDIAN_GBP_REVIEW_LINK)',
    data: { ...payload, paths: { md: resolve(outDir, 'review-kit.md') } },
    findings: [
      {
        code: 'REVIEW_KIT',
        severity: 'low',
        title: 'Phase 5.6 review templates generated',
        remediation: payload.reviewLinkSet
          ? 'Send review-kit.md after every completed job; reply within 2 days.'
          : 'Add GBP “Ask for reviews” link to MERIDIAN_GBP_REVIEW_LINK, then re-run.',
        owner: 'marketing',
        pillar: 'local',
      },
    ],
  };
}
