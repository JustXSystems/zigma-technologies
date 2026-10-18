# @justx/meridian

**Meridian** — portable SEO command center: verify live sites, score pillars, attach GSC / GA4 / Bing / PageSpeed signals, emit boardroom reports.

Use on Zigma **or any other website** via a SiteProfile JSON.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

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

**Exact field-by-field setup (first-timers):** [SETUP.md](./SETUP.md)  
Also mirrored in the site guide: `SEO-GUIDE.md` → **Appendix G**.

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

## Meta / alt / health / conversion (M4–M6)

```bash
npm run meridian:autopilot           # full loop (prod auto-applies empty meta/alt)
npm run meridian:act:health          # 4xx/noindex + orphans/thin → link-graph.json
npm run meridian:act:form            # enquiry form / contact / API probe
npm run meridian:act:images          # oversized images on key pages
npm run meridian:digest:monthly      # Phase 9.2 monthly report stub
npm run meridian:act:bing            # Bing SubmitFeed
npm run meridian:act:delta           # GSC inspect new sitemap URLs
```

Writes `weekly-digest.md`, `monthly-digest.md`, `form-health.json`, `image-weight.json`.

## CI gate

```bash
npm run meridian:verify
# exit 1 if critical/high findings
```

GitHub Actions: **Meridian live verify** workflow, and automatic after **Deploy Production** (when apply + healthcheck).
