# @justx/meridian

**Meridian** — portable SEO command center: verify live sites, score pillars, attach GSC / GA4 / Bing / PageSpeed signals, emit boardroom reports.

Use on Zigma **or any other website** via a SiteProfile JSON.

| Doc | Role |
| --- | --- |
| [`../../SEO-GUIDE.md`](../../SEO-GUIDE.md) | Site SEO ops + live status (Zigma) |
| [AUTOMATION.md](./AUTOMATION.md) | Forever commands + phase pipeline |
| [SETUP.md](./SETUP.md) | Connector secrets |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Design |

**Forever (Zigma):** `npm run meridian:observe`

## Quick start

```bash
# Maximum automation (recommended)
npm run meridian:autopilot

# From repo root
npm run meridian:run
npm run meridian:verify
npm run meridian:verify:preprod
```

Automation map: [AUTOMATION.md](./AUTOMATION.md).

Open the HTML report path printed at the end (`storage/meridian/.../report-latest.html`).  
Admin: **SEO → Meridian**.

## Other websites

```bash
node packages/meridian/bin/meridian.mjs init-profile --out ./acme.profile.json
# edit origin, brand, samplePaths…
node packages/meridian/bin/meridian.mjs run --profile ./acme.profile.json
```

## Connectors (M1)

**Exact field-by-field setup:** [SETUP.md](./SETUP.md)  
Short map: [`SEO-GUIDE.md`](../../SEO-GUIDE.md) → **Connectors and Site Settings**.

Without credentials, Meridian still completes a full technical run and marks connectors `auth_required`. Admin → **SEO → Meridian** shows **Connectors readiness** (set/missing only; secrets never displayed).

| Variable | Connector | Value tip |
| --- | --- | --- |
| `MERIDIAN_GOOGLE_CLIENT_ID` | GSC + GA4 + Act | `….apps.googleusercontent.com` |
| `MERIDIAN_GOOGLE_CLIENT_SECRET` | GSC + GA4 + Act | `GOCSPX-…` |
| `MERIDIAN_GOOGLE_REFRESH_TOKEN` | GSC + GA4 + Act | From `google-oauth-setup.mjs` |
| `MERIDIAN_GA4_PROPERTY_ID` | GA4 | Digits only — **not** `G-…` |
| `MERIDIAN_BING_API_KEY` | Bing | Bing Webmaster → API Access |
| `MERIDIAN_PSI_API_KEY` | PageSpeed | Google Cloud API key + PSI API |

### One-time Google OAuth (summary)

Follow SETUP.md Parts **A.1–A.6**. Short version:

```powershell
$env:MERIDIAN_GOOGLE_CLIENT_ID="..."
$env:MERIDIAN_GOOGLE_CLIENT_SECRET="..."
node packages/meridian/scripts/google-oauth-setup.mjs
```

Then put all printed values into Production `.env` and run `pm2 restart zigma --update-env`.

## Act (M2)

Requires Google OAuth with **webmasters** (full) scope — re-run `google-oauth-setup.mjs` if you previously used readonly.

```bash
npm run meridian:act:sitemap    # PUT sitemap into Search Console
npm run meridian:act:inspect    # Inspect home + sample paths
```

Admin → **SEO → Meridian**: **Submit sitemap** / **Inspect top URLs** (Production only).

## Automation (M4–M11)

```bash
npm run meridian:autopilot           # full closed-loop + Phase 0–9 + polish + cockpit
npm run meridian:act:phase0          # Phase 0 unlock wizard (GSC/OAuth/Bing/GA4)
npm run meridian:act:polish          # Phase 3 meta length/brand polish + apply
npm run meridian:act:index-queue     # Phase 1.7 indexing queue (+ inspect if OAuth)
npm run meridian:act:og              # Phase 2.4 OG / LinkedIn inspector pack
npm run meridian:act:locales         # Phase 6.3 HI/KN keep-or-off
npm run meridian:profiles            # Multi-site profile registry
npm run meridian:act:rich            # Phase 2.2 Rich Results Test pack
npm run meridian:act:top-meta        # Phase 3 priority title/description audit
npm run meridian:act:reviews         # Phase 5.6 review request kit
npm run meridian:act:calendar        # Phase 7 content calendar
npm run meridian:act:speed           # Phase 4 PageSpeed baseline links
npm run meridian:act:preprod         # Phase 1.8 PreProd removals probe
npm run meridian:act:quarterly       # Phase 9.3 quarterly checklist
npm run meridian:act:cockpit         # ops-cockpit.html
npm run meridian:digest:monthly
```

## CI gate

```bash
npm run meridian:verify
# exit 1 if critical/high findings
```

GitHub Actions: **Meridian live verify** workflow, and automatic after **Deploy Production** (when apply + healthcheck).
