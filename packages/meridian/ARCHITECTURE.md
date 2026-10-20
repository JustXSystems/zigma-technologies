# Meridian SEO architecture — control plane vs product plane

> **Goal:** Zigma Production stays a fast, boring website deploy. SEO *ops* (Search Console, Bing, reports, observe) never ride inside that blast radius. SEO *product* (canonicals, sitemap, schema, meta) stays in the Next.js app where Google sees it.

---

## 1. Two planes (non-negotiable)

```
┌──────────────────────────────────────────────────────────────────┐
│  PRODUCT PLANE — zigma-technologies.com (Next.js)                 │
│  What Googlebot fetches                                           │
│  • titles / descriptions / H1 / canonical / robots / sitemap      │
│  • JSON-LD · catalog SEO steward on Admin save                    │
│  • isIndexable() · www→apex · PreProd noindex                     │
│  Deploy: GitHub → Deploy Production → /var/www/zigma-technologies │
│  Tarball: Next standalone only — NEVER Meridian CLI               │
└──────────────────────────────────────────────────────────────────┘
                              ▲ HTTP probe only
                              │ (origin is a target, not a host for ops)
┌──────────────────────────────────────────────────────────────────┐
│  CONTROL PLANE — Meridian (Node CLI)                              │
│  What operators / CI run                                          │
│  • OAuth → GSC / GA4 · API key → Bing · PSI                       │
│  • seo:verify · seo:report · observe · Command Brief              │
│  • Artefacts → storage/meridian/* or GH Actions artifacts         │
│  Run: GitHub Actions (primary) · laptop · /var/www/zigma-meridian │
│  Deploy: Deploy Meridian (~1 MiB) — optional sidecar              │
└──────────────────────────────────────────────────────────────────┘
                              │ read artefacts / trigger jobs
┌──────────────────────────────────────────────────────────────────┐
│  OBSERVABILITY SURFACE — Admin → SEO → Command                    │
│  Thin UI: open last Command Brief · generate report · readiness   │
│  Prefer reading artefacts; spawn CLI only if MERIDIAN_HOME / tree │
└──────────────────────────────────────────────────────────────────┘
```

| Concern | Plane | Lives in | Ship with site? |
| --- | --- | --- | --- |
| Canonical / sitemap / schema | Product | `src/` Next routes | **Yes** |
| Catalog meta heal on save | Product | `catalog-seo-steward` | **Yes** |
| GSC/Bing pull + Command Brief | Control | `packages/meridian` | **No** |
| Phase packs / observe | Control | `packages/meridian` | **No** |
| Admin Meridian buttons | Observability | `MeridianPanel` + bridge | UI yes; CLI no |

---

## 2. Why the tarball was ~100 MiB

| Component | Size | Cause of slow SCP? |
| --- | --- | --- |
| Next `.next/standalone` | ~90–100 MiB | **Yes** — required for the site |
| `public/` + `.next/static` | ~10–20 MiB | Minor |
| `packages/meridian` | **~1 MiB** | **No** |

Meridian is isolated for **risk**, not because it bloated the upload. Standalone size is a separate Next deploy topic (rsync delta, self-hosted runner).

---

## 3. Runtime contract

### Environment

| Variable | Plane | Purpose |
| --- | --- | --- |
| `MERIDIAN_HOME` | Control on VPS | Absolute path to CLI (`…/bin/meridian.mjs`) |
| `MERIDIAN_GOOGLE_*` | Control | GSC/GA4 OAuth |
| `MERIDIAN_BING_API_KEY` | Control | Bing Webmaster |
| `MERIDIAN_PSI_API_KEY` | Control | PageSpeed (optional) |
| Site `.env` DB_* | Product | CMS / catalog steward |

**GitHub Actions secrets** (repo → Settings → Secrets → Actions) for **Meridian SEO report**:

| Secret | Required for |
| --- | --- |
| `MERIDIAN_GOOGLE_CLIENT_ID` | GSC + GA4 |
| `MERIDIAN_GOOGLE_CLIENT_SECRET` | GSC + GA4 |
| `MERIDIAN_GOOGLE_REFRESH_TOKEN` | GSC + GA4 (`npm run meridian:oauth` once) |
| `MERIDIAN_GA4_PROPERTY_ID` | GA4 (numeric property id) |
| `MERIDIAN_BING_API_KEY` | Bing |
| `MERIDIAN_PSI_API_KEY` | PageSpeed (optional) |

Without these, Actions still runs **live verify** (51 checks) and writes Command Brief; GSC/Bing sections stay `auth_required`. That is not a Production site failure.

### Artefacts (observability)

Primary desk file: `storage/meridian/zigma-prod/command-brief.html`  
Also: `seo-report.json`, `seo-live-verify.json`, `report-latest.json`

### Deploy rules

1. **Deploy Production** — product plane only (`SHIP_MERIDIAN` default off).
2. **Deploy Meridian** — control plane sidecar to `/var/www/zigma-meridian`.
3. **Meridian SEO report** (Actions) — control plane without touching the VPS app tree.
4. Never unpack Meridian into `/var/www/zigma-technologies` as part of site apply.

### VPS: do not run Meridian from the website tree

`npm run meridian:brief` under `/var/www/zigma-technologies` fails with **Unknown act action: command-brief** when an *old* `packages/meridian` is left on disk after website-only deploys (new `package.json` scripts, stale CLI).

| Do | Don’t |
| --- | --- |
| GitHub → **Meridian SEO report** | `cd /var/www/zigma-technologies && npm run meridian:*` against leftover CLI |
| GitHub → **Deploy Meridian**, then `export MERIDIAN_HOME=/var/www/zigma-meridian` and `npm run seo:report` (uses `scripts/meridian-run.mjs`) | Expect `command-brief` / `seo-report` from a CLI that never shipped those acts |
| `apply-release` clears stale `packages/meridian` and leaves a stub when Meridian is not in the tarball | Copy Meridian back into the site tree “to make npm work” |

---

## 4. Operating model (forever)

| Cadence | Who | Command |
| --- | --- | --- |
| On demand | You / Dev | Actions → **Meridian SEO report** or `npm run seo:report` |
| Weekly | Actions | Meridian autopilot (schedule) |
| After site deploy | Auto | Product SEO already live; optional observe from CI |
| Content growth | Marketing | City pages, titles, reviews — not new Meridian phases |

Phases 0–33 are **automation history**, not a weekly human checklist. The desk is: **verify → pull signals → one report → act on insights**.

---

## 5. Failure isolation

| Failure | Effect on live site |
| --- | --- |
| Meridian OAuth expired | Reports show `auth_required` — site still serves |
| Deploy Meridian fails | Site unchanged |
| Control plane bug | Cannot spoil Next build if not in tarball |
| Product SEO bug | Can affect SERP — still owned by website CI (`seo:verify`) |

---

## 6. Future (optional, not required for Zigma)

- Extract `packages/meridian` → `JustXSystems/meridian` multi-tenant SaaS later.
- Self-hosted Actions runner on VPS = near-instant site uploads (standalone size remains).
- Admin triggers `workflow_dispatch` via GitHub API instead of spawning CLI on the web node.

For a single brand on Hostinger, **same monorepo + two deploy workflows + Actions control plane** is the correct senior design.
