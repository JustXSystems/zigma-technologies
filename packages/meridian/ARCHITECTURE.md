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
│  Thin UI: open last Command Brief · Generate report (GitHub)      │
│  Prefer artefacts + workflow_dispatch; spawn CLI only if needed   │
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
| Next `.next/standalone` | ~90–100 MiB | Cold deploy yes; **warm** deploys use delta rsync |
| `public/` + `.next/static` | ~10–20 MiB | Minor |
| `packages/meridian` | **~1 MiB** | **No** (separate sidecar) |

Meridian is isolated for **risk**, not size. Website hot path = **delta rsync** of the release stage (not full `.tgz` every time). Self-hosted runner is the next step if cold uploads are still painful.

---

## 3. Runtime contract

### Environment

| Variable | Plane | Purpose |
| --- | --- | --- |
| `MERIDIAN_HOME` | Control on VPS | Absolute path to CLI (`…/bin/meridian.mjs`) |
| `MERIDIAN_SITE_ROOT` | Control on VPS | Website app dir (artefacts → `$SITE/storage/meridian/…`; required when CLI is the sidecar) |
| `MERIDIAN_GOOGLE_*` | Control | GSC/GA4 OAuth |
| `MERIDIAN_BING_API_KEY` | Control | Bing Webmaster |
| `MERIDIAN_PSI_API_KEY` | Control | PageSpeed (optional) |
| `MERIDIAN_WEBHOOK_URL` | Control | Slack/Discord/Teams alerts (optional) |
| `MERIDIAN_GITHUB_TOKEN` | Observability (site `.env`) | Admin → Actions `workflow_dispatch` |
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

1. **Deploy Production** / **Deploy PreProd** (one button each) — product plane + **parallel** Meridian sidecar + post-deploy Command Brief.
2. **Deploy Meridian** — standalone control-plane ship (`plane: prod|preprod`; also `workflow_call` from both deploys).
3. **Meridian SEO report** — ad-hoc / weekly schedule without a site deploy (Production desk).
4. Never unpack Meridian into `/var/www/zigma-technologies` as part of the website tarball.

### One-button deploy (parallel tracks)

Same shape for **Production** (`DEPLOY_PROD`) and **PreProd** (manual or push to `master`):

```
Gate / confirm
        │
        ├──────────────┬────────────────────────────┐
        ▼              ▼                            │
  Build Next     Ship Meridian (~1 MiB)             │
  + package      → /var/www/zigma-meridian          │
        │            (prod or preprod VPS)          │
        ▼              │                            │
  Delta-rsync stage    │                            │
  → /tmp/zigma-release-stage → apply-release        │
  (+ best-effort MERIDIAN_HOME pin in same SSH)     │
        └──────┬───────┘                            │
               ▼                                    │
     SEO Command Brief (Actions artefact)  ◄────────┘
```

**Website upload:** rsync the release **folder** (only changed files). Do **not** SCP a full `.tgz` on every deploy. Optional `.tgz` stays as a GitHub Actions artifact for rollback.

| | Production | PreProd |
| --- | --- | --- |
| SSH secrets | `PROD_*` | `PREPROD_*` |
| PM2 | `zigma` | `zigma-preprod` |
| Profile | `zigma.prod.json` | `zigma.preprod.json` (GSC/Bing off) |
| Trigger | Manual + `DEPLOY_PROD` | Push `master` or manual |

Defaults: `ship_meridian=true`, `run_seo_report=true`, `post_deploy_autopilot=false`.

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
| On demand | You | Admin → **Generate report (GitHub)** (or Actions → Meridian SEO report) |
| Weekly / Sunday | Actions | Autopilot (Mon) · SEO report (Sun) · desk sync + webhook alerts |
| After site deploy | Auto | Product SEO live · Command Brief · desk rsync |
| Content growth | Auto + one click | **Growth Desk** + enquiry-close review mailto; **City promote** (runtime allowlist + unique-proof ack) |

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

## 6. Control-plane desk (shipped) + optional infra

| Capability | Status | How |
| --- | --- | --- |
| Admin → `workflow_dispatch` (no CLI on web node) | **Shipped** | GitHub App (preferred) or classic PAT · 403 → auto-open Actions |
| Zero-secret report trigger | **Shipped** | Admin **Open Actions (no token)** · Sunday cron · post-deploy brief |
| Command Brief → Admin desk sync | **Shipped** | Meridian SEO report + Deploy Production rsync via `scripts/sync-meridian-desk-to-vps.sh` |
| Ops webhooks (verify fail / auth / regression) | **Shipped** | Optional `MERIDIAN_WEBHOOK_URL` |
| Actions secret one-shot sync | **Shipped** | `npm run meridian:secrets:sync` |
| Self-hosted Actions runner | Optional | `scripts/install-github-runner-zigma.sh` · label `zigma-prod` |
| Extract Meridian → multi-tenant SaaS | Later | `JustXSystems/meridian` — not required for one brand |

### Admin desk env (Production `.env`)

| Variable | Purpose |
| --- | --- |
| `MERIDIAN_GITHUB_APP_ID` | Preferred org-safe dispatch |
| `MERIDIAN_GITHUB_APP_INSTALLATION_ID` | App install on the repo |
| `MERIDIAN_GITHUB_APP_PRIVATE_KEY` | PEM (`\n` escaped OK) |
| `MERIDIAN_GITHUB_TOKEN` | Fallback classic PAT (`ghp_…` · repo+workflow) |
| `MERIDIAN_GITHUB_REPO` | Optional (`JustXSystems/zigma-technologies`) |
| `MERIDIAN_HOME` | Optional sidecar CLI only |
| `MERIDIAN_WEBHOOK_URL` | Optional Slack/Discord/Teams alerts |

Without App/PAT, Admin still opens last Command Brief; **Generate report** opens Actions → Run workflow. Forever coverage = Sunday + post-deploy.

For a single brand on Hostinger, **same monorepo + two deploy workflows + Actions control plane** is the correct senior design.
