# Meridian automation — what runs without a human

Once secrets are set (see [SETUP.md](./SETUP.md)), Meridian is designed so **weekly SEO ops happen without opening Search Console**.

## Automation layers

| Layer | What it does | Trigger |
| --- | --- | --- |
| **Autopilot** | Scan → CMS SEO gaps → **draft meta** → (optional **apply meta**) → (if OAuth) submit sitemap + inspect priority + **new sitemap URLs** → score trend → webhook | CLI / Admin / cron / CI |
| **Post-deploy** | Autopilot (or verify) after Production deploy | `scripts/deploy.sh` |
| **Weekly schedule** | GitHub Action cron (Mondays 03:30 UTC) | `.github/workflows/meridian-autopilot.yml` |
| **VPS cron** | Same autopilot on the server | `scripts/meridian-cron.sh` + crontab |
| **Score history** | `score-history.jsonl` (last 30 runs) + trend in report | Every scan |
| **Webhook** | POST summary to Slack/Teams/Discord-compatible URL | `MERIDIAN_WEBHOOK_URL` |

## Commands

```bash
# Full automation (Production) — drafts meta; does not write CMS unless apply flag/env
npm run meridian:autopilot

# Autopilot + write empty CMS meta fields from drafts
npm run meridian:autopilot:apply

# PreProd (scan + draft only — never touches Google)
npm run meridian:autopilot:preprod

# Meta only
npm run meridian:meta:draft
npm run meridian:meta:apply:dry
npm run meridian:meta:apply

# New sitemap URLs since last run → GSC URL Inspection
npm run meridian:act:delta

# Scan only
npm run meridian:run
npm run meridian:verify
```

## Autopilot behaviour (exact)

1. Load SiteProfile (`zigma.prod.json`).
2. Read previous `report-latest.json` for **trend**.
3. Technical crawl + connectors (GSC/GA4/Bing/PSI if secrets set).
4. **CMS SEO gaps** via `scripts/meridian-cms-gaps.mjs` (missing meta titles/descriptions).
5. Write JSON/HTML/MD report + append `score-history.jsonl`.
6. **Draft meta** via `scripts/meridian-meta-draft.mjs` → `storage/meridian/zigma-prod/meta-drafts.json` (Appendix B formulas; never invents fake specs).
7. **Apply meta** only if `MERIDIAN_AUTO_APPLY_META=1`, `--apply-meta`, Admin “Autopilot + apply meta”, or profile `autopilot.autoApplyMeta: true`. Fills **empty/short** fields only (never overwrites good copy unless `--force`).
8. If `indexable` **and** Google OAuth env complete **and** not `--skip-act`:
   - Submit sitemap to Search Console
   - Inspect up to 5 priority URLs
   - **Sitemap delta**: diff live `/sitemap.xml` vs `sitemap-locs-latest.json`; inspect up to 10 new URLs (first run baselines only)
9. Write `autopilot-latest.json`.
10. If `MERIDIAN_WEBHOOK_URL` set → POST summary.
11. Exit `1` if critical/high findings (always) or if `MERIDIAN_FAIL_ON_REGRESSION=1` and score dropped ≥3.

## Install VPS weekly cron **[Developer]**

```bash
ssh deploy@200.234.45.106
cd /var/www/zigma-technologies
chmod +x scripts/meridian-cron.sh
# Every Monday 03:30 UTC ≈ 09:00 IST
(crontab -l 2>/dev/null | grep -v meridian-cron; echo '30 3 * * 1 /var/www/zigma-technologies/scripts/meridian-cron.sh >> /var/www/zigma-technologies/storage/meridian/cron.log 2>&1') | crontab -
crontab -l | grep meridian
```

**Installed on Production 18 Oct 2026.** Also: GitHub Action **Meridian autopilot** schedule (needs repo secrets for GSC act).

To auto-apply meta on the weekly cron, add to server `.env`:

```bash
MERIDIAN_AUTO_APPLY_META=1
```

## Optional env

| Variable | Effect |
| --- | --- |
| `MERIDIAN_WEBHOOK_URL` | Notify after autopilot |
| `MERIDIAN_FAIL_ON_REGRESSION=1` | CI fails on score drop ≥3 |
| `MERIDIAN_CMS_GAPS_SCRIPT` | Override path to CMS gap script |
| `MERIDIAN_AUTO_APPLY_META=1` | Autopilot writes drafted meta into empty CMS fields |
| `MERIDIAN_META_DRAFT_SCRIPT` | Override draft script path |
| `MERIDIAN_META_APPLY_SCRIPT` | Override apply script path |

## What still cannot be automated

| Step | Why |
| --- | --- |
| Google OAuth consent (first time) | Human must approve company account |
| DNS TXT for GSC domain verify | Registrar UI |
| GBP postcard / video verify | Google physical verification |
| Hand-polished marketing copy | Quality judgment (auto-draft is a starting point) |
| Buying/asking for backlinks | Relationship work |

## Admin

**SEO → Meridian**

| Button | Effect |
| --- | --- |
| **Run autopilot** | Full loop; drafts meta; does not write CMS |
| **Autopilot + apply meta** | Same + fills empty SEO fields in DB |
| **Draft meta** / **Apply meta** | Isolated meta steps |
| **Inspect new URLs** | Sitemap delta → GSC inspection |

Readiness table shows which secrets are still missing.
