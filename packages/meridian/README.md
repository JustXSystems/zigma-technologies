# @justx/meridian

**Meridian** — portable SEO command center: verify live sites, score pillars, attach GSC / GA4 / Bing / PageSpeed signals, emit boardroom reports.

Use on Zigma **or any other website** via a SiteProfile JSON.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Quick start

```bash
# From repo root
npm run meridian:run
npm run meridian:verify
npm run meridian:verify:preprod
```

Open the HTML report path printed at the end (`storage/meridian/.../report-latest.html`).  
Admin: **SEO → Meridian**.

## Other websites

```bash
node packages/meridian/bin/meridian.mjs init-profile --out ./acme.profile.json
# edit origin, brand, samplePaths…
node packages/meridian/bin/meridian.mjs run --profile ./acme.profile.json
```

## Connectors (M1)

Without credentials, Meridian still completes a full technical run and marks connectors `auth_required`.

| Variable | Connector |
| --- | --- |
| `MERIDIAN_GOOGLE_CLIENT_ID` | GSC + GA4 OAuth |
| `MERIDIAN_GOOGLE_CLIENT_SECRET` | GSC + GA4 OAuth |
| `MERIDIAN_GOOGLE_REFRESH_TOKEN` | GSC + GA4 OAuth |
| `MERIDIAN_GA4_PROPERTY_ID` | GA4 (numeric property id, **not** `G-…`) |
| `MERIDIAN_BING_API_KEY` | Bing Webmaster |
| `MERIDIAN_PSI_API_KEY` | PageSpeed Insights (recommended) |

### One-time Google OAuth

1. Google Cloud → enable **Search Console API** + **Google Analytics Data API**.
2. Create OAuth client type **Desktop**.
3. Run:

```powershell
$env:MERIDIAN_GOOGLE_CLIENT_ID="..."
$env:MERIDIAN_GOOGLE_CLIENT_SECRET="..."
node packages/meridian/scripts/google-oauth-setup.mjs
```

4. Put the printed refresh token in Production secrets / local env (never commit).
5. Set `MERIDIAN_GA4_PROPERTY_ID` from GA4 Admin → Property settings.
6. Re-run `npm run meridian:run` — GSC top queries + GA4 organic sessions appear under **Signals**.

### Bing

Bing Webmaster → Settings → API Access → create key → `MERIDIAN_BING_API_KEY`.

### PageSpeed

Google Cloud API key with PageSpeed Insights API → `MERIDIAN_PSI_API_KEY`.

## CI gate

```bash
npm run meridian:verify
# exit 1 if critical/high findings
```
