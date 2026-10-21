# Zigma Technologies — SEO Guide

**Automation-first ops guide** for `https://zigma-technologies.com`.

Technical SEO, meta, schema, digests, and forever health checks are owned by **Meridian** (Phases 0–31). You do **not** re-run the old Phase 0–9 first-timer checklists.

| Role | Doc |
| --- | --- |
| **This file** | Live status (auto) · day-to-day ops · formulas · verify |
| [`packages/meridian/ARCHITECTURE.md`](packages/meridian/ARCHITECTURE.md) | **Control plane vs product plane** (how SEO is hosted) |
| [`packages/meridian/AUTOMATION.md`](packages/meridian/AUTOMATION.md) | Phase pipeline, commands, status badges |
| [`packages/meridian/SETUP.md`](packages/meridian/SETUP.md) | Connector secrets (GSC / GA4 / Bing / PSI) |
| [`packages/meridian/README.md`](packages/meridian/README.md) | Meridian package quick start |
| [`docs/archive/SEO-GUIDE-phases-walkthrough.md`](docs/archive/SEO-GUIDE-phases-walkthrough.md) | Archived Day-1 click-by-click phases (historical only) |

---

<!-- MERIDIAN:CANON:START -->
## Current status (live audit — Meridian canon)

_Re-checked 20 Oct 2026 (auto)._

> **Auto-maintained by Meridian Phase 31.** Re-run `npm run meridian:observe` after deploys. Do **not** hand-edit between the `MERIDIAN:CANON` markers.

### Command desk (measured)

| Metric | Live |
| --- | --- |
| Meridian score | **100 A** |
| Unlock readiness | **100%** |
| Mission archive | **SEALED** (Phase 17) |
| Observatory | **nominal** (Phase 18) |
| Living canon | **synced** (Phase 19) |
| Autonomic desk | **ONLINE** (Phase 20) |
| Presence sentinel | **PARKED** (Phase 21) |
| Quiet throne | **MISSION COMPLETE** (Phase 22) |
| Eternal horizon | **LIVE SEALED** (Phase 23) |
| Deploy courier | **SEALED** (Phase 24) |
| Growth closer | **BRIDGED** (Phase 25) |
| Conversion continuum | **ONLINE** (Phase 26) |
| Integrity lattice | **SEALED** (Phase 27) |
| Sovereign continuity | **LOCKED** (Phase 28) |
| Autonomic chronos | **ARMED** (Phase 29) |
| Dominion apex | **CROWNED** (Phase 30) |
| Silent steward | **NOMINAL** (Phase 31) |
| Human debt | **0** |
| Organization `sameAs` | **LIVE (LinkedIn)** |
| LocalBusiness `hasMap` (live) | **YES** |
| Growth radar opportunities | **1** (closed **1**) |
| Enquiries / yield (28d) | **40** / **48.2%** |
| Rich Results pack | **6/6 OK** |
| Monthly digest | **13/13 auto · 1 optional (reviews)** |
| GBP pulse source | **gsc-proxy** (Insights paste optional; GSC brand proxy fills clicks/discovery) |
| GSC clicks / GA4 organic (28d) | **76** / **83** |

### Status legend (badges ≠ frozen)

SEALED / LOCKED / ARMED / CROWNED / NOMINAL = **last observe passed** for that layer. Re-run `npm run meridian:observe` (alias: `meridian:guard`) to refresh. PARKED = optional Google gate only. See [`AUTOMATION.md`](packages/meridian/AUTOMATION.md#status-words-what-sealed--locked-mean).

### Technical SEO — Production

| Check | Result |
| --- | --- |
| Phase 1–31 automation | **Done** — see [`AUTOMATION.md`](packages/meridian/AUTOMATION.md) |
| Indexing / canonicals / H1 / brand | Verified by Meridian technical engine + `npm run seo:verify` |
| `/sitemap.xml` | Healthy (Meridian sitemap-health) |
| Org JSON-LD + `sameAs` | Live on Production |
| Org JSON-LD `hasMap` | **Live** (NAP Maps URL) |
| PreProd | `noindex` + empty sitemap (preprod-removals pack) |
| Share image | `/og.png` |

### Next actions (minimized — in order)

Phases **0–30 are complete** for automation. You are on **silent steward** (zero-checklist ops).

| # | Do this | Who | Notes |
| --- | --- | --- | --- |
| **1** | Run **`npm run meridian:observe`** (steward + dominion + chronos) | Auto / Dev | Primary forever command |
| **2** | None — zero human debt | — | GBP verify remains optional (parked) · forever observe |

**Do not** re-run obsolete checklists. Surfaces: **`phase31-ops.html`** (steward) · **`silent-steward.md`** · **`phase30-ops.html`**. Re-seal: `npm run meridian:guard`.

### Meridian map (developer)

- Architecture: [`packages/meridian/ARCHITECTURE.md`](packages/meridian/ARCHITECTURE.md) (product vs control plane)
- Control plane report: GitHub → **Meridian SEO report** · local `npm run seo:report`
- Forever heal (optional): `npm run meridian:observe` · Admin → **SEO → Meridian** → Command Brief
- Website app: `/var/www/zigma-technologies` · Meridian sidecar (optional): `/var/www/zigma-meridian` + `MERIDIAN_HOME`
- Artefacts: `storage/meridian/zigma-prod/command-brief.html`

### Code hardening (shipped)

- `isIndexable()` / `next.config.ts` refuse indexing when `NEXT_PUBLIC_BASE_PATH` is set.
- `scripts/verify-seo-build.mjs` in PreProd/Prod CI and `deploy.sh`.
- Live verifier: `npm run seo:verify` / `seo:verify:preprod`.
- Website tarball excludes Meridian; control plane via Actions or Deploy Meridian.
- `www` → apex redirect in `next.config.ts`; optional nginx one-hop scripts remain.
<!-- MERIDIAN:CANON:END -->

---

## How SEO works now

### Forever loop (required)

| When | What | Who |
| --- | --- | --- |
| On demand | Admin → **Generate report (GitHub)** | You (zero CLI) |
| After deploys / Sunday | Meridian SEO report (+ desk sync) | Auto |
| Monday | Meridian autopilot | GitHub Action |
| Drift (hasMap / schema) | Auto-heal, or `npm run meridian:prod:hasmap` | Dev |

Primary surfaces under `storage/meridian/zigma-prod/`:

- `command-brief.html` — **one-spot** GSC + Bing + verify
- `phase31-ops.html` — silent steward
- `silent-steward.md` · `human-debt.md` · `city-draft.md` · `review-kit.md`
- `phase20-ops.html` — NAP / calendar / citations desk
- `report-latest.html` — boardroom scan

### What is already done

- Apex-only indexing (`www` → apex), PreProd `noindex`, live sitemap
- Organization / LocalBusiness JSON-LD (`sameAs`, `hasMap`)
- Meta polish, alts, rich-results pack, form health, growth closer
- Digests (weekly / monthly / quarterly) when connectors are set
- **Human debt for automation = 0** (optional Google GBP verify stays parked)

### Growth (auto desk — minimal clicks)

| Action | Automation | Your click |
| --- | --- | --- |
| GSC opportunity briefs | Growth Desk + radar every SEO report / observe | Improve titles/FAQ in Admin when listed |
| City page drafts | Staged `city-draft.md` (stays noindex) | Unique photos → Admin → SEO → **City promote** (ack proof) |
| Google review asks | Closing enquiry drafts + opens mailto | Click **Send** in your email app (never auto-sent) |
| GBP verify | Optional Google gate | `phase21-ops.html` → `npm run meridian:ack-gbp` |

Surfaces: Admin → SEO → **Growth Desk** · **City promote** · `growth-desk.html`. Do **not** auto-index thin city templates.

---

## Key decisions (site shape)

1. **Official URL:** `https://zigma-technologies.com` (no `www`, always `https`).
2. **Only Production is indexable.** PreProd (`justxsystems.com/zigma-technologies`) is always `noindex`.
3. **Quality over quantity** for city × service pages — staged drafts only until unique content.
4. **NAP** (name, address, phone) identical in Site Settings, footer, and directories.
5. **No fake review stars** in schema — only real Google reviews.

---

## Glossary (short)

| Term | Meaning |
| --- | --- |
| **Canonical** | Official URL for a page (stops duplicate indexing). |
| **noindex** | Tell Google not to show the page. |
| **JSON-LD / schema** | Machine-readable company / product / breadcrumb facts. |
| **GSC** | Google Search Console — search performance + indexing. |
| **GA4** | Analytics — traffic and enquiry events. |
| **GBP** | Google Business Profile — Maps / local panel. |
| **NAP** | Name, Address, Phone — must match everywhere. |
| **Meridian** | In-repo SEO command center (scan → remediate → observe). |
| **Human debt** | Remaining manual items that block automation (target **0**). |

---

## Title and description formulas

**Title:** 50–60 characters. Do **not** type the brand; ` | Zigma Technologies` is added automatically.

| Page type | Formula | Example |
| --- | --- | --- |
| Home | `{Main services} Company in {Country/Region}` | `Solar EPC, UPS, BESS & EV Charging Company in India` |
| Service | `{Service} in {Region} – {Benefit}` | `UPS AMC in Bengaluru – 24×7 Support, 4-Hour Response` |
| City × service | `{Service} in {City} for {Customer type}` | `Solar EPC in Pune for Factories & Warehouses` |
| Project | `{Capacity} {Type} for {Client type}, {City}` | `500 kWp Rooftop Solar for Auto-Parts Plant, Hosur` |
| Product | `{Type} {Capacity} – {Key spec}` | `Online UPS 20 kVA – Double Conversion, Lithium Ready` |
| Guide | `{Question or How-to}` | `How to Size a UPS for a Server Room (2026 Guide)` |

**Description:** 120–160 characters = offer + proof + call to action. Every page unique.

Admin: **SEO** tabs on pages / inventory, or let Meridian meta polish fill empties on observe / autopilot.

---

## Verification

```powershell
npm run meridian:observe          # forever health + canon/ledger sync
npm run meridian:run              # full scan + report
npm run meridian:verify           # CI gate (fail on critical/high)
npm run seo:verify                # live Production smoke
npm run seo:verify:preprod        # PreProd must stay noindex
```

Reports: `storage/meridian/zigma-prod/report-latest.html`.

**Online tools:** [Rich Results Test](https://search.google.com/test/rich-results) · [PageSpeed Insights](https://pagespeed.web.dev) · GSC → URL inspection.

---

## Things not to waste time on

| Skip | Why |
| --- | --- |
| `<meta name="keywords">` | Ignored since 2009 |
| Hundreds of duplicate city pages | Doorway risk — use staged drafts only |
| Buying links / mass directories | Penalty risk |
| Fake or incentivised reviews | Against Google policy |
| Chasing Lighthouse “SEO 100” | Not rankings |
| Re-ticking obsolete Phase 0–9 boxes | Ledger + observe are authoritative |

---

## Technical reference (developers)

Metadata is server-built via `buildPageMetadata()` in `src/lib/seo.ts`. Indexing requires `NEXT_PUBLIC_SEO_INDEXABLE=true` **and** empty `NEXT_PUBLIC_BASE_PATH` (PreProd always has a base path → never indexable).

| File | Purpose |
| --- | --- |
| `src/lib/seo.ts` | Canonical, robots, OG, `isIndexable()` |
| `src/components/OrganizationJsonLd.tsx` | Org + LocalBusiness graph |
| `src/lib/cms-seo.ts` / `hub-seo.ts` | CMS + hub metadata |
| `src/lib/location-services.ts` | `INDEXABLE_CITY_SERVICES` allowlist |
| `src/app/sitemap.ts` / `robots.ts` | Live sitemap / robots |
| `scripts/verify-seo-build.mjs` | CI build guard |
| `scripts/verify-seo-live.mjs` | Live verify |
| `packages/meridian/` | Scan, remediate, observe, digests |

**Guardrails:** one H1 per page; no client-set `document.title`; no review markup for self-testimonials; never set `SEO_INDEXABLE=true` on PreProd. Next.js docs: `node_modules/next/dist/docs/`.

Full phase command list: [`AUTOMATION.md`](packages/meridian/AUTOMATION.md).

---

## Connectors and Site Settings

**Click-by-click secrets:** [`packages/meridian/SETUP.md`](packages/meridian/SETUP.md).

| Need | Where | Tip |
| --- | --- | --- |
| GSC + GA4 Act | Production `.env` + GH Actions secrets | `MERIDIAN_GOOGLE_*` + numeric `MERIDIAN_GA4_PROPERTY_ID` (not `G-…`) |
| GSC property | Profile `connectors.gsc.siteUrl` | `sc-domain:zigma-technologies.com` |
| Site tag | Admin → Site Settings → Analytics | `G-RFXQRYYX48` (measurement ID) |
| `sameAs` | Site Settings → Social links | Real LinkedIn/etc. URLs only |
| Share image | SEO defaults | `/og.png` |

After `.env` edit: `pm2 restart zigma --update-env`. Admin → **SEO → Meridian** → Connectors readiness = **set** (values never shown).

OAuth once: `node packages/meridian/scripts/google-oauth-setup.mjs` (company Google account, full `webmasters` scope).

---

## Appendix F — Master checklist

Authoritative status is the automation ledger below (synced by Meridian). Do **not** maintain a parallel hand-ticked Phase 0–9 list.

<!-- MERIDIAN:LEDGER:START -->
### Automation ledger (Meridian — authoritative)

_Re-checked 20 Oct 2026 (auto). Do **not** hand-edit between `MERIDIAN:LEDGER` markers. Obsolete Phase 0–9 checklists live only in `docs/archive/`._

| Area | Status |
| --- | --- |
| Technical Phase 1 + PreProd | **DONE** (live · pack restored) |
| Structured data / sameAs / Rich Results | **DONE** (Meridian Phases 2–3) |
| Meta / alt / calendar / speed packs | **DONE** (Phases 3–4, 7) |
| Local NAP + citation launchpad | **DONE** (desk Phase 20) |
| Authority outreach packs | **DONE** (Phase 8 packs) |
| Mission archive / observatory / canon | **DONE** (Phases 17–19) |
| Autonomic desk | **ONLINE** (Phase 20) |
| Presence sentinel | **STRONG** (Phase 21) |
| Quiet throne / mission | **COMPLETE** (Phase 22) |
| Eternal horizon / live throne | **SEALED** (Phase 23) |
| Deploy courier (SSH hasMap) | **SEALED** (Phase 24) |
| Growth closer / signal forge | **BRIDGED** (1/1) (Phase 25) |
| Conversion continuum / yield | **ONLINE** (enq 28d=40) (Phase 26) |
| Integrity lattice / perpetual seal | **SEALED** (7/7) (Phase 27) |
| Sovereign continuity / board charter | **LOCKED** (10/10) (Phase 28) |
| Autonomic chronos / temporal nexus | **ARMED** (5 pts) (Phase 29) |
| Dominion apex / eternal crown | **CROWNED** (11/11) (Phase 30) |
| Silent steward / zero-checklist | **NOMINAL** (8/8) (Phase 31) |
| Growth radar opportunities | **1** |
| Meridian score / unlock | **100 A** / **100%** |
| Archive | **SEALED** |
| Human debt | **0** |
| Google Business Profile | **PARKED** (Google gate — optional) |

Forever: `npm run meridian:observe` · Steward: `phase31-ops.html` · Dominion: `phase30-ops.html`
<!-- MERIDIAN:LEDGER:END -->

Optional growth (never blocks observe):

- [ ] GBP verified when ready → `npm run meridian:ack-gbp`
- [ ] City draft reviewed → Admin → SEO → **City promote** (unique proof ack)
- [ ] Directory claims / partner outreach when pursuing local/authority growth

---

## Archive

The original ~1,900-line first-timer Phase 0–9 walkthrough is preserved at:

[`docs/archive/SEO-GUIDE-phases-walkthrough.md`](docs/archive/SEO-GUIDE-phases-walkthrough.md)

Use it only for historical “how we set accounts up” detail. Day-to-day ops = **this guide** + **`npm run meridian:observe`**.
