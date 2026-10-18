# Meridian automation — what runs without a human

Once secrets are set (see [SETUP.md](./SETUP.md)), Meridian is designed so **weekly SEO ops happen without opening Search Console**.

## Automation layers

| Layer | What it does | Trigger |
| --- | --- | --- |
| **Autopilot** | Scan → CMS gaps → **draft meta + alt** → (optional apply) → **sitemap health crawl** → **Bing sitemap** → (if OAuth) GSC submit + inspect priority + **new URLs** → **Phase 9 weekly digest** → score trend → webhook | CLI / Admin / cron / CI |
| **Post-deploy** | Autopilot after Production deploy | `scripts/deploy.sh` |
| **Weekly schedule** | GitHub Action cron (Mondays 03:30 UTC) | `.github/workflows/meridian-autopilot.yml` |
| **VPS cron** | Same autopilot on the server | `scripts/meridian-cron.sh` + crontab |
| **Score history** | `score-history.jsonl` + trend | Every scan |
| **Weekly digest history** | `weekly-digest-history.jsonl` (12 weeks) | Every autopilot |
| **Webhook** | POST summary + remaining human checklist | `MERIDIAN_WEBHOOK_URL` |

## Commands

```bash
# Full automation (Production)
npm run meridian:autopilot

# Autopilot + write empty CMS meta + image alt
npm run meridian:autopilot:apply

# PreProd (scan + drafts + health — never touches Google/Bing act)
npm run meridian:autopilot:preprod

# Meta / alt
npm run meridian:meta:draft && npm run meridian:meta:apply:dry
npm run meridian:alt:draft && npm run meridian:alt:apply:dry

# Sitemap health (no auth) + Bing submit + GSC delta
npm run meridian:act:health
npm run meridian:act:bing
npm run meridian:act:delta
```

## Autopilot behaviour (exact)

1. Load SiteProfile (`zigma.prod.json`).
2. Full technical crawl + connectors (GSC/GA4/Bing/PSI if secrets set).
3. CMS SEO gaps via `scripts/meridian-cms-gaps.mjs`.
4. Report + `score-history.jsonl`.
5. **Draft meta** → `meta-drafts.json` (Appendix B).
6. **Draft alt** → `alt-drafts.json` (Phase 3.6 title-based).
7. **Apply** meta/alt only if `MERIDIAN_AUTO_APPLY_META=1` / `MERIDIAN_AUTO_APPLY_ALT=1` / `--apply-meta` / Admin “Autopilot + apply”.
8. **Sitemap health**: crawl up to 120 sitemap URLs for 4xx/5xx, unexpected noindex, soft-404, canonical mismatch → `sitemap-health.json`.
9. **Bing** `SubmitFeed` if `MERIDIAN_BING_API_KEY` set (independent of Google).
10. If Google OAuth ready: submit GSC sitemap + inspect priority + **sitemap delta** new URLs.
11. **Weekly digest** (`weekly-digest.md` / `.json`) — automated rows + remaining human Phase 9.1 tasks.
12. `autopilot-latest.json` + optional webhook.
13. Exit `1` on critical/high findings (including health) or `MERIDIAN_FAIL_ON_REGRESSION=1` score drop ≥3.

## Optional env

| Variable | Effect |
| --- | --- |
| `MERIDIAN_WEBHOOK_URL` | Notify after autopilot (includes human checklist count) |
| `MERIDIAN_FAIL_ON_REGRESSION=1` | CI fails on score drop ≥3 |
| `MERIDIAN_AUTO_APPLY_META=1` | Write drafted meta (+ alt) into empty CMS fields |
| `MERIDIAN_AUTO_APPLY_ALT=1` | Write drafted image alt only |
| `MERIDIAN_BING_API_KEY` | Enables Bing sitemap submit in autopilot |

## What still cannot be automated

| Step | Why |
| --- | --- |
| Google OAuth consent (first time) | Human must approve company account |
| DNS TXT for GSC domain verify | Registrar UI |
| GBP postcard / reviews / posts | Google physical + relationship work |
| Hand-polished marketing copy & photo alt | Quality judgment (auto-draft is a starting point) |
| Buying/asking for backlinks | Relationship work |

## Admin

**SEO → Meridian** — Run autopilot, Draft/Apply meta & alt, Sitemap health, GSC/Bing sitemap, Inspect URLs. Phase 9 human checklist appears when digest finds remaining manual tasks.
