# Meridian automation — what runs without a human

Once secrets are set (see [SETUP.md](./SETUP.md)), Meridian is designed so **weekly SEO ops happen without opening Search Console**.

## Automation layers

| Layer | What it does | Trigger |
| --- | --- | --- |
| **Autopilot** | Scan → draft/apply meta+alt → **sitemap health + orphans/thin** → **form health** → **image weight** → Bing sitemap → GSC act → **weekly + monthly digests** → webhook | CLI / Admin / cron / CI |
| **Post-deploy** | Autopilot after Production deploy | `scripts/deploy.sh` |
| **Weekly schedule** | GitHub Action cron (Mondays 03:30 UTC) | `.github/workflows/meridian-autopilot.yml` |
| **VPS cron** | Same autopilot on the server | `scripts/meridian-cron.sh` |
| **Score / digest history** | `score-history.jsonl`, `weekly-digest-history.jsonl`, `monthly-digest-history.jsonl` | Every run |
| **Webhook** | POST summary + remaining human checklist | `MERIDIAN_WEBHOOK_URL` |

## Commands

```bash
npm run meridian:autopilot          # full loop (prod profile auto-applies meta/alt)
npm run meridian:autopilot:preprod  # scan + drafts + health (no search-engine act)

npm run meridian:act:health         # sitemap health + link-graph.json
npm run meridian:act:form           # enquiry form / contact / API probe
npm run meridian:act:images         # heavy images on key pages
npm run meridian:digest:monthly     # Phase 9.2 monthly report stub
```

## Autopilot behaviour (exact)

1. Technical crawl + connectors (GSC/GA4/Bing/PSI if secrets set).
2. CMS SEO gaps.
3. **Draft + apply** meta and image alt when `autoApplyMeta` / `autoApplyAlt` (Zigma prod profile: **on**) or env flags.
4. **Sitemap health** (4xx/5xx/noindex/soft-404/canonical) + **orphan / thin** link graph → `sitemap-health.json` + `link-graph.json`.
5. **Form health** — schema GET, `/contact` markup, enquiry API alive (empty POST → 4xx) → `form-health.json`.
6. **Image weight** — HEAD oversized images on sample paths → `image-weight.json`.
7. **Bing** SubmitFeed if `MERIDIAN_BING_API_KEY`.
8. **GSC** submit + inspect priority + sitemap delta if Google OAuth ready.
9. **Weekly digest** (Phase 9.1) + **monthly digest** (Phase 9.2 template, auto-fills connector metrics).
10. `autopilot-latest.json` + optional webhook.
11. Exit `1` on critical/high findings or score regression when `MERIDIAN_FAIL_ON_REGRESSION=1`.

## Optional env

| Variable | Effect |
| --- | --- |
| `MERIDIAN_WEBHOOK_URL` | Notify after autopilot |
| `MERIDIAN_FAIL_ON_REGRESSION=1` | CI fails on score drop ≥3 |
| `MERIDIAN_AUTO_APPLY_META=1` | Force apply meta (+ alt) even if profile flag off |
| `MERIDIAN_AUTO_APPLY_ALT=1` | Force apply alt only |
| `MERIDIAN_BING_API_KEY` | Bing sitemap submit |
| `MERIDIAN_GOOGLE_*` / `MERIDIAN_GA4_PROPERTY_ID` | GSC/GA4 signals + act |

## What still cannot be automated

| Step | Why |
| --- | --- |
| Google OAuth consent / DNS GSC verify | Human + registrar |
| GBP postcard, reviews, posts | Google physical + relationship |
| Polishing marketing copy & photo alt beyond drafts | Quality judgment |
| Buying/asking for backlinks | Relationship work |

## Admin

**SEO → Meridian** — Run autopilot, form/image/sitemap probes, draft/apply, GSC/Bing. Phase 9 human checklist + monthly metrics appear after autopilot.
