import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { polishMeta } from './meta-polish.mjs';
import { applyAlt, draftAlt } from './meta-automation.mjs';
import { writeTop20MetaPack } from './top20-meta-pack.mjs';

/**
 * Phase 3 advance — polish CMS meta + alt, then re-audit top commercial URLs.
 * Hub listing titles are code-owned (`src/lib/hub-seo.ts`); CMS rows are auto-applied.
 */
export async function advancePhase3(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  const wantApply =
    opts.apply === true ||
    process.env.MERIDIAN_AUTO_POLISH_META === '1' ||
    profile.autopilot?.autoPolishMeta === true;

  const polish = await polishMeta(profile, { outDir, apply: wantApply });

  let altDraft = { ok: true, data: { count: 0 }, message: 'alt skipped' };
  let altApply = null;
  try {
    altDraft = await draftAlt(profile, { outDir });
    const altCount = Number(altDraft.data?.count || 0);
    const wantAlt =
      opts.applyAlt === true ||
      process.env.MERIDIAN_AUTO_APPLY_ALT === '1' ||
      profile.autopilot?.autoApplyAlt === true;
    if (wantAlt && altCount > 0) {
      altApply = await applyAlt(profile, { apply: true, force: !!opts.force });
    }
  } catch (e) {
    altDraft = { ok: true, status: 'skipped', message: String(e.message || e), data: { count: 0 } };
  }

  const top = await writeTop20MetaPack(profile, { outDir });
  const needs = Number(top.data?.needsPolish || 0);
  const polished = Number(polish.data?.count || 0);
  const altUpdated = Number(altApply?.data?.updated ?? 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '3',
    polish: { message: polish.message, count: polished, apply: polish.data?.apply },
    alt: { draft: altDraft.message, applied: altUpdated },
    topMeta: { checked: top.data?.checked, needsPolish: needs },
  };

  const md = [
    `# Phase 3 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    `- Meta polish: ${polish.message}`,
    `- Image alt: ${altDraft.message}${altUpdated ? ` · applied ${altUpdated}` : ''}`,
    `- Top meta audit: **${needs}** / ${top.data?.checked ?? '—'} still outside ideal length (brand suffix ignored)`,
    '',
    'Hub listing titles live in `src/lib/hub-seo.ts` (deploy to ship).',
    'CMS / inventory SEO is auto-applied when `autoPolishMeta` is on.',
    '',
    'Human (optional spot-check): open `top20-meta-pack.md` for any remaining `needsPolish` rows.',
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'phase3-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase3-advance.md'), md, 'utf8');

  const findings = [];
  if (needs > 0) {
    findings.push({
      code: 'PHASE3_META_REMAINING',
      severity: needs >= 8 ? 'medium' : 'low',
      title: `${needs} priority URL(s) still outside ideal SERP length`,
      remediation:
        'Most are fine after brand-strip scoring. Spot-check top20-meta-pack.md; hub titles ship via hub-seo.ts on deploy.',
      owner: 'marketing',
      pillar: 'onpage',
    });
  }

  return {
    ok: polish.ok !== false,
    status: needs > 5 ? 'degraded' : 'ok',
    message: `Phase 3 advance · polished ${polished} · alt ${altUpdated} · top gaps ${needs}`,
    data: {
      ...payload,
      paths: { md: resolve(outDir, 'phase3-advance.md'), json: resolve(outDir, 'phase3-advance.json') },
      top: top.data,
    },
    findings,
  };
}
