import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditNap } from './nap-audit.mjs';
import { writeCitationsPlaybook } from './citations-playbook.mjs';
import { writeReviewKit } from './review-kit.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function clip(s, max) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.55 ? cut.slice(0, sp) : cut).trim()}…`;
}

function formatHoursSpec(hours) {
  if (!hours) return 'Mon–Sat 9:30–18:30';
  if (typeof hours === 'string') return hours.replace(/\s*IST\s*$/i, '').trim();
  if (hours.opens && hours.closes) {
    const days = Array.isArray(hours.dayOfWeek) ? hours.dayOfWeek : [];
    const label =
      days.length >= 6 ? 'Mon–Sat' : days.length === 5 ? 'Mon–Fri' : days.slice(0, 2).join('–') || 'Mon–Sat';
    return `${label} ${hours.opens}–${hours.closes}`;
  }
  return 'Mon–Sat 9:30–18:30';
}

function buildDescriptions(nap, profile, opts = {}) {
  const brand = nap.name || profile.brand?.name || 'Zigma Technologies';
  const city = nap.addressLocality || 'Bengaluru';
  const year = opts.foundingYear || profile.autopilot?.gbp?.foundingYear || '2006';
  const short = clip(
    opts.shortDescription ||
      profile.autopilot?.gbp?.shortDescription ||
      `${brand} — ${city}-based solar EPC, UPS, BESS and EV charging for industries, hospitals and campuses across India. 20+ years, 24×7 AMC.`,
    250
  );
  const long = clip(
    opts.longDescription ||
      profile.autopilot?.gbp?.longDescription ||
      `${brand} is a ${city}-based power and energy engineering company serving industries, hospitals, data centres and campuses across India since ${year}. We design, supply, install and maintain rooftop and ground-mount solar EPC projects, online UPS systems, battery energy storage (BESS) and EV charging infrastructure. Our in-house engineers provide 24×7 emergency support and annual maintenance contracts (AMC) for major UPS brands. Contact us for a free site survey and proposal.`,
    750
  );
  return { short, long };
}

/**
 * Phase 5 advance — NAP-locked GBP ops pack + citations + review kit + interactive HTML.
 * Human gates reduced to: verify GBP once, paste review link, claim directories (copy-paste).
 */
export async function advancePhase5(profile, opts = {}) {
  const outDir = opts.outDir || resolve(process.cwd(), 'storage', 'meridian', profile.id || 'site');
  await mkdir(outDir, { recursive: true });

  const napResult = await auditNap(profile, { outDir });
  const nap = napResult.data?.nap || {};
  const origin = String(profile.origin || '').replace(/\/$/, '');

  const cites = await writeCitationsPlaybook(profile, { outDir, nap });
  const reviews = await writeReviewKit(profile, {
    outDir,
    nap,
    reviewLink: opts.reviewLink || process.env.MERIDIAN_GBP_REVIEW_LINK,
  });

  const gbpCfg = profile.autopilot?.gbp || {};
  const { short, long } = buildDescriptions(nap, profile, gbpCfg);
  const hours = formatHoursSpec(nap.openingHours);
  const fullAddress = [nap.streetAddress, nap.addressLocality, nap.addressRegion, nap.postalCode]
    .filter(Boolean)
    .join(', ');

  const primaryCategory = gbpCfg.primaryCategory || 'Solar energy company';
  const categories = gbpCfg.categories || [
    'Solar energy company',
    'Solar energy system service',
    'Electrical installation service',
    'Energy equipment and solutions',
    'Battery wholesaler',
    'Electric vehicle charging station contractor',
  ];
  const services = gbpCfg.services || [
    'Solar EPC (rooftop and ground-mount)',
    'UPS supply and installation',
    'UPS AMC and repair',
    'Battery energy storage (BESS)',
    'EV charger installation',
    'Electrical field services and commissioning',
  ];
  const serviceAreas = gbpCfg.serviceAreas || [
    'Bengaluru',
    'Chennai',
    'Hyderabad',
    'Mumbai',
    'Pune',
    'Delhi',
  ];

  const mapsQuery = encodeURIComponent(
    `${nap.name || 'Zigma Technologies'} ${nap.addressLocality || 'Bengaluru'}`
  );
  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const gbpStartUrl = 'https://business.google.com/create';
  const bingPlacesUrl = 'https://www.bingplaces.com/';
  const appleBusinessUrl = 'https://businessconnect.apple.com/';

  const reviewLink = reviews.data?.reviewLink || '';
  const reviewReady = !!reviews.data?.reviewLinkSet;
  const waDigits = String(process.env.MERIDIAN_WHATSAPP_DIGITS || gbpCfg.whatsappDigits || '919590137666').replace(
    /\D/g,
    ''
  );
  const waReviewUrl = reviewReady
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        `Hello, thank you for choosing ${nap.name || 'Zigma Technologies'}. If you are happy with our work, please leave a short Google review: ${reviewLink}`
      )}`
    : null;
  const mailtoReview = reviewReady
    ? `mailto:?subject=${encodeURIComponent('How did we do?')}&body=${encodeURIComponent(
        reviews.data?.templates?.emailBody || `Please leave a review: ${reviewLink}`
      )}`
    : null;

  const copyFields = [
    { id: 'name', label: 'Business name', value: nap.name || '' },
    { id: 'phone', label: 'Primary phone', value: nap.telephone || '' },
    { id: 'email', label: 'Email', value: nap.email || '' },
    { id: 'street', label: 'Street', value: nap.streetAddress || '' },
    { id: 'city', label: 'City', value: nap.addressLocality || '' },
    { id: 'region', label: 'Region', value: nap.addressRegion || '' },
    { id: 'pin', label: 'PIN', value: nap.postalCode || '' },
    { id: 'address', label: 'Full address (one line)', value: fullAddress },
    { id: 'website', label: 'Website', value: origin },
    { id: 'hours', label: 'Hours', value: hours },
    { id: 'category', label: 'Primary category', value: primaryCategory },
    { id: 'short', label: 'Short description (≤250)', value: short },
    { id: 'long', label: 'Long description (≤750)', value: long },
    { id: 'services', label: 'Services (one per line)', value: services.join('\n') },
    { id: 'areas', label: 'Service areas', value: serviceAreas.join(', ') },
    ...(reviewReady ? [{ id: 'review', label: 'GBP review link', value: reviewLink }] : []),
  ];

  const csvHeader = 'directory,url,name,phone,street,city,region,pin,website,email,status';
  const csvRows = (cites.data?.directories || []).map((d) => {
    const p = d.paste || {};
    const cells = [
      d.name,
      d.url,
      p.name,
      p.phone,
      p.street,
      p.city,
      p.region,
      p.pin,
      p.website,
      p.email,
      d.status || 'todo',
    ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`);
    return cells.join(',');
  });
  const csv = [csvHeader, ...csvRows].join('\n');

  // Persist citation progress file if absent (human ticks later)
  let progress = { claimed: [], updatedAt: null };
  try {
    progress = JSON.parse(await readFile(resolve(outDir, 'citations-progress.json'), 'utf8'));
  } catch {
    /* first run */
  }
  if (!progress.updatedAt) {
    progress = { claimed: [], updatedAt: new Date().toISOString(), note: 'Mark directory ids when claimed' };
    await writeFile(resolve(outDir, 'citations-progress.json'), JSON.stringify(progress, null, 2), 'utf8');
  }

  const claimed = new Set(progress.claimed || []);
  const dirsLeft = (cites.data?.directories || []).filter((d) => !claimed.has(d.id)).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    phase: '5',
    nap,
    hours,
    descriptions: { short, long },
    primaryCategory,
    categories,
    services,
    serviceAreas,
    links: {
      mapsSearchUrl,
      gbpStartUrl,
      bingPlacesUrl,
      appleBusinessUrl,
      waReviewUrl,
      mailtoReview,
      reviewLink: reviewReady ? reviewLink : null,
    },
    citationsTodo: dirsLeft,
    reviewLinkSet: reviewReady,
    napComplete: (napResult.data?.missing || []).length === 0,
    sameAsCount: nap.sameAs?.length || 0,
  };

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="robots" content="noindex"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Phase 5 Local SEO Ops — ${esc(profile.displayName || profile.id)}</title>
<style>
:root{--bg:#0c1117;--card:#151c26;--line:#243041;--text:#e8eef5;--muted:#8b9aab;--accent:#3d9cf0;--ok:#3dd68c;--warn:#e6b84d}
*{box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,sans-serif;background:radial-gradient(1200px 600px at 10% -10%,#1a2a3d,transparent),var(--bg);color:var(--text);margin:0;padding:2rem 1.25rem;line-height:1.45}
.wrap{max-width:880px;margin:0 auto}
h1{font-size:1.55rem;margin:0 0 .25rem;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0 0 1.25rem}
.grid{display:grid;gap:.75rem}
@media(min-width:720px){.grid.two{grid-template-columns:1fr 1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1rem 1.1rem}
.card h2{font-size:.95rem;margin:0 0 .65rem;display:flex;align-items:center;gap:.5rem}
.badge{font-size:.68rem;font-weight:650;padding:.15rem .45rem;border-radius:999px;background:#243040;color:var(--muted)}
.badge.on{background:#163326;color:var(--ok)}.badge.off{background:#3a2a14;color:var(--warn)}
.row{display:flex;gap:.5rem;align-items:flex-start;margin:.45rem 0;padding:.4rem 0;border-top:1px solid #1e2836}
.row:first-of-type{border-top:0}
.label{flex:0 0 9.5rem;color:var(--muted);font-size:.78rem;padding-top:.35rem}
.val{flex:1;font-size:.86rem;word-break:break-word;background:#0f1620;border:1px solid var(--line);border-radius:8px;padding:.45rem .6rem;white-space:pre-wrap}
button.copy{flex:0 0 auto;border:0;border-radius:8px;background:var(--accent);color:#041018;font-weight:650;font-size:.75rem;padding:.45rem .7rem;cursor:pointer}
button.copy:active{transform:scale(.98)}
button.copy.done{background:var(--ok)}
.actions a{display:inline-block;margin:.2rem .35rem .2rem 0;padding:.45rem .75rem;border-radius:8px;background:#1e2c3d;color:var(--text);text-decoration:none;font-size:.82rem;border:1px solid var(--line)}
.actions a.primary{background:var(--accent);color:#041018;border-color:transparent;font-weight:650}
ul{margin:.35rem 0 0;padding-left:1.15rem;color:var(--muted);font-size:.86rem}
code{font-size:.8em;background:#243040;padding:.1rem .35rem;border-radius:3px}
.toast{position:fixed;bottom:1rem;right:1rem;background:var(--ok);color:#041018;padding:.55rem .85rem;border-radius:8px;font-weight:650;opacity:0;transition:.2s;pointer-events:none}
.toast.show{opacity:1}
</style></head><body>
<div class="wrap">
  <h1>Phase 5 — Local SEO command</h1>
  <p class="sub">${esc(origin)} · NAP ${payload.napComplete ? 'complete' : 'incomplete'} · sameAs ${payload.sameAsCount} · citations left ${dirsLeft} · reviews ${reviewReady ? 'link set' : 'awaiting GBP link'}</p>

  <div class="card actions" style="margin-bottom:1rem">
    <h2>Launch <span class="badge">one-time human</span></h2>
    <a class="primary" href="${esc(mapsSearchUrl)}" target="_blank" rel="noreferrer">1. Search Maps (claim if exists)</a>
    <a class="primary" href="${esc(gbpStartUrl)}" target="_blank" rel="noreferrer">2. Create / manage GBP</a>
    <a href="${esc(bingPlacesUrl)}" target="_blank" rel="noreferrer">Bing Places</a>
    <a href="${esc(appleBusinessUrl)}" target="_blank" rel="noreferrer">Apple Business Connect</a>
    ${waReviewUrl ? `<a href="${esc(waReviewUrl)}" target="_blank" rel="noreferrer">WhatsApp review ask</a>` : ''}
    ${mailtoReview ? `<a href="${esc(mailtoReview)}">Email review ask</a>` : ''}
    <ul>
      <li>Copy fields below into GBP — do not retype from memory.</li>
      <li>After GBP → Ask for reviews: set <code>MERIDIAN_GBP_REVIEW_LINK</code> and re-run Phase 5.</li>
      <li>Claim directories using <code>citations-playbook.csv</code> (NAP pre-filled).</li>
    </ul>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Copy vault <span class="badge on">NAP-locked</span></h2>
      ${copyFields
        .map(
          (f) => `<div class="row">
        <div class="label">${esc(f.label)}</div>
        <div class="val" id="v-${esc(f.id)}">${esc(f.value)}</div>
        <button type="button" class="copy" data-id="${esc(f.id)}">Copy</button>
      </div>`
        )
        .join('')}
    </div>
    <div class="grid two">
      <div class="card">
        <h2>Categories</h2>
        <ul>${categories.map((c) => `<li>${esc(c)}${c === primaryCategory ? ' <span class="badge on">primary</span>' : ''}</li>`).join('')}</ul>
      </div>
      <div class="card">
        <h2>Services</h2>
        <ul>${services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
  <p class="sub" style="margin-top:1.25rem">Artefacts: gbp-checklist.md · citations-playbook.md · citations-playbook.csv · review-kit.md · phase5-advance.json</p>
</div>
<div class="toast" id="toast">Copied</div>
<script>
const toast=document.getElementById('toast');
document.querySelectorAll('button.copy').forEach(btn=>{
  btn.addEventListener('click',async()=>{
    const id=btn.getAttribute('data-id');
    const el=document.getElementById('v-'+id);
    const text=el?el.textContent:'';
    try{await navigator.clipboard.writeText(text);btn.classList.add('done');btn.textContent='Copied';toast.classList.add('show');
      setTimeout(()=>{btn.classList.remove('done');btn.textContent='Copy';toast.classList.remove('show')},1200);
    }catch(e){btn.textContent='Select+CtrlC'}
  });
});
</script>
</body></html>`;

  const md = [
    `# Phase 5 advance — ${profile.displayName || profile.id}`,
    '',
    `Generated: ${payload.generatedAt}`,
    '',
    'Open **`phase5-ops.html`** for one-click copy into Google Business Profile.',
    '',
    `1. [Search Maps / claim](${mapsSearchUrl})`,
    `2. [GBP create/manage](${gbpStartUrl})`,
    `3. Bing Places · Apple Business Connect`,
    `4. Citations CSV: \`citations-playbook.csv\` (${dirsLeft} todo)`,
    reviewReady
      ? `5. Review asks ready (WhatsApp / mailto deep links in HTML)`
      : '5. After verify: GBP → Ask for reviews → set `MERIDIAN_GBP_REVIEW_LINK` → re-run Phase 5',
    '',
    '## NAP (locked)',
    '',
    ...copyFields.slice(0, 10).map((f) => `- **${f.label}:** ${f.value || '—'}`),
    '',
    '## Descriptions',
    '',
    `**Short:** ${short}`,
    '',
    `**Long:** ${long}`,
    '',
  ].join('\n');

  await writeFile(resolve(outDir, 'citations-playbook.csv'), csv, 'utf8');
  await writeFile(resolve(outDir, 'phase5-advance.json'), JSON.stringify(payload, null, 2), 'utf8');
  await writeFile(resolve(outDir, 'phase5-advance.md'), md, 'utf8');
  await writeFile(resolve(outDir, 'phase5-ops.html'), html, 'utf8');

  const findings = [
    {
      code: 'PHASE5_OPS',
      severity: 'low',
      title: 'Phase 5 local SEO ops pack ready',
      remediation:
        'Open phase5-ops.html → claim/create GBP with copied NAP → set MERIDIAN_GBP_REVIEW_LINK → tick citations CSV.',
      owner: 'marketing',
      pillar: 'local',
    },
  ];
  if (!payload.napComplete) {
    findings.unshift(...(napResult.findings || []).filter((f) => f.code === 'NAP_INCOMPLETE'));
  }

  return {
    ok: payload.napComplete,
    status: payload.napComplete ? (reviewReady ? 'ok' : 'degraded') : 'error',
    message: payload.napComplete
      ? `Phase 5 ops ready · citations todo ${dirsLeft} · review link ${reviewReady ? 'set' : 'pending'}`
      : 'Phase 5 blocked — NAP incomplete on live site',
    data: {
      ...payload,
      paths: {
        html: resolve(outDir, 'phase5-ops.html'),
        md: resolve(outDir, 'phase5-advance.md'),
        json: resolve(outDir, 'phase5-advance.json'),
        csv: resolve(outDir, 'citations-playbook.csv'),
      },
      nap: napResult.data,
      citations: cites.data,
      reviews: reviews.data,
    },
    findings,
  };
}
