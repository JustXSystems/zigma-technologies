# Meridian automation — what runs without a human

Once secrets are set (see [SETUP.md](./SETUP.md)), Meridian is designed so **weekly SEO ops happen without opening Search Console**.

## Automation layers

| Layer | What it does | Trigger |
| --- | --- | --- |
| **Autopilot** | Scan → CMS SEO gaps → (if OAuth) submit sitemap + inspect top URLs → score trend → optional webhook | CLI / Admin / cron / CI |
| **Post-deploy** | Autopilot (or verify) after Production deploy | `scripts/deploy.sh` |
| **Weekly schedule** | GitHub Action cron (Mondays 03:30 UTC) | `.github/workflows/meridian-autopilot.yml` |
| **VPS cron** | Same autopilot on the server | `scripts/meridian-cron.sh` + crontab |
| **Score history** | `score-history.jsonl` (last 30 runs) + trend in report | Every scan |
| **Webhook** | POST summary to Slack/Teams/Discord-compatible URL | `MERIDIAN_WEBHOOK_URL` |

## Commands

```bash
# Full automation (Production)
npm run meridian:autopilot

# PreProd (scan only — never touches Google)
npm run meridian:autopilot:preprod

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
6. If `indexable` **and** Google OAuth env complete:
   - Submit sitemap to Search Console
   - Inspect up to 5 priority URLs
7. Write `autopilot-latest.json`.
8. If `MERIDIAN_WEBHOOK_URL` set → POST summary.
9. Exit `1` if critical/high findings (always) or if `MERIDIAN_FAIL_ON_REGRESSION=1` and score dropped ≥3.

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

## Optional env

| Variable | Effect |
| --- | --- |
| `MERIDIAN_WEBHOOK_URL` | Notify after autopilot |
| `MERIDIAN_FAIL_ON_REGRESSION=1` | CI fails on score drop ≥3 |
| `MERIDIAN_CMS_GAPS_SCRIPT` | Override path to CMS gap script |

## What still cannot be automated

| Step | Why |
| --- | --- |
| Google OAuth consent (first time) | Human must approve company account |
| DNS TXT for GSC domain verify | Registrar UI |
| GBP postcard / video verify | Google physical verification |
| Writing unique marketing copy | Quality judgment |
| Buying/asking for backlinks | Relationship work |

## Admin

**SEO → Meridian → Run autopilot** — one click. Readiness table shows which secrets are still missing.
