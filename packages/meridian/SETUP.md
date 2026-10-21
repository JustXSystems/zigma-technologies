# Meridian connectors — exact setup (first-timers)

This guide tells you **exactly** how to fill every Meridian configuration value.  
You do **not** need to understand code. Steps marked **[Developer]** need SSH / GitHub secrets / server `.env`. Steps marked **[You]** are done in a browser.

**After secrets are set:** day-to-day SEO ops live in [`SEO-GUIDE.md`](../../SEO-GUIDE.md) (`npm run meridian:observe`). Pipeline reference: [`AUTOMATION.md`](./AUTOMATION.md).

After secrets are set, Meridian can:

- Pull **Search Console** queries and sitemaps  
- Pull **GA4** organic sessions  
- Pull **Bing** crawl stats  
- Pull **PageSpeed / CrUX** lab scores  
- **Submit** the sitemap and **inspect** URLs in Search Console (Act buttons)

---

## Where secrets live (important)

| Place | Who | How |
| --- | --- | --- |
| Production VPS `.env` at `/var/www/zigma-technologies/.env` | **[Developer]** | Add lines, then `pm2 restart zigma --update-env` |
| GitHub Actions secrets (repo **JustXSystems/zigma-technologies**) | **[Developer]** | Settings → Secrets and variables → Actions → New repository secret |
| Your laptop (temporary, for OAuth setup only) | **[Developer]** | PowerShell `$env:NAME="value"` for one session |

**Never** commit secrets to Git. **Never** paste refresh tokens into tickets or chat.

Admin → **SEO → Meridian** shows a **Connectors readiness** checklist (set / missing). It never displays the secret values.

---

## Field reference (quick table)

| Field / env name | Required for | What it looks like | Where you get it |
| --- | --- | --- | --- |
| `MERIDIAN_GOOGLE_CLIENT_ID` | GSC + GA4 + Act | `123456789012-xxxx.apps.googleusercontent.com` | Google Cloud → Credentials → OAuth client |
| `MERIDIAN_GOOGLE_CLIENT_SECRET` | GSC + GA4 + Act | `GOCSPX-…` | Same OAuth client → Client secret |
| `MERIDIAN_GOOGLE_REFRESH_TOKEN` | GSC + GA4 + Act | Long string starting like `1//0…` | Run `google-oauth-setup.mjs` once |
| `MERIDIAN_GA4_PROPERTY_ID` | GA4 signals | Digits only, e.g. `123456789` | GA4 Admin → Property settings (**not** `G-…`) |
| `MERIDIAN_BING_API_KEY` | Bing signals | Long API key string | Bing Webmaster → Settings → API Access |
| `MERIDIAN_PSI_API_KEY` | PageSpeed (recommended) | `AIza…` | Google Cloud → Credentials → API key |
| Profile `connectors.gsc.siteUrl` | GSC | `sc-domain:zigma-technologies.com` | Already set in `zigma.prod.json` |
| Site Settings `ga4MeasurementId` | Website tag (already live) | `G-RFXQRYYX48` | GA4 Admin → Data streams — **different** from Property ID |

---

## Part A — Google Cloud project (one-time) **[Developer]** + **[You]**

You need a **company Google account** that already owns (or will own) Search Console and GA4 — for example `marketing@zigma-technologies.com`.

### A.1 Open Google Cloud

1. Open Chrome.
2. Go to: <https://console.cloud.google.com/>
3. Sign in with the **company** Google account (not a personal Gmail that will leave with an employee).

### A.2 Create or select a project

1. Top bar → project picker → **New Project**.
2. **Project name:** `Zigma Meridian` (or any clear name).
3. Click **Create**.
4. Wait until the top bar shows that project selected.

**Expect:** Project name visible in the top bar.

### A.3 Enable the two APIs

1. Left menu → **APIs & Services** → **Library**.
2. Search `Google Search Console API` → open it → **Enable**.
3. Search `Google Analytics Data API` → open it → **Enable**.
4. (Optional but recommended for PageSpeed) Search `PageSpeed Insights API` → **Enable**.

**Expect:** Each API page says **API enabled** / Manage.

**If it goes wrong:** If you see billing prompts, Google Cloud free tier is enough for Meridian read usage; attach a billing account only if Google requires it for your org.

### A.4 OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**.
2. If asked for User type:
   - Company Google Workspace → choose **Internal** (easiest).
   - Otherwise → **External** → **Create**.
3. Fill:
   - **App name:** `Meridian SEO`
   - **User support email:** your company Google address
   - **Developer contact:** same email
4. Click **Save and Continue**.
5. **Scopes** → **Add or Remove Scopes** → filter and tick:
   - `.../auth/webmasters` (Google Search Console API — **full**, not readonly)
   - `.../auth/analytics.readonly` (Google Analytics Data API)
6. **Save and Continue**.
7. **Test users** (External only): **Add Users** → add the same company Google account → **Save**.
8. **Save and Continue** → back to Dashboard.

**Expect:** Consent screen status **Testing** (External) or ready (Internal).

**Why full webmasters?** Meridian **Act** (submit sitemap / inspect URL) needs write. Readonly cannot submit.

### A.5 Create OAuth Desktop client → get Client ID + Secret

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**.
2. **Application type:** **Desktop app**.
3. **Name:** `Meridian Desktop`.
4. Click **Create**.
5. Copy:
   - **Client ID** → this is `MERIDIAN_GOOGLE_CLIENT_ID`
   - **Client secret** → this is `MERIDIAN_GOOGLE_CLIENT_SECRET`
6. Click **OK**. Later you can reopen: Credentials → click the client name → copy again.

**Expect:** Values look like the table above.  
**Wrong values:** Web application client IDs also work *only if* you add redirect `http://127.0.0.1:8765/callback` — Desktop is simpler; use Desktop.

### A.6 Get the refresh token (run the helper)

On a developer laptop that can open Chrome (not necessarily the VPS):

```powershell
cd C:\Users\iamsa\IdeaProjects\zigma-technologies
$env:MERIDIAN_GOOGLE_CLIENT_ID="paste-client-id-here"
$env:MERIDIAN_GOOGLE_CLIENT_SECRET="paste-client-secret-here"
node packages/meridian/scripts/google-oauth-setup.mjs
```

1. The terminal prints an **Authorized redirect URI**. In Google Cloud → your OAuth client → if it is a **Web** client, add that URI. Desktop clients usually need no redirect edit.
2. The terminal prints a long **Open this URL** link — open it in Chrome while signed into the **company** Google account.
3. Click **Continue** / **Allow** (you may see “Google hasn’t verified this app” → **Advanced** → **Go to Meridian SEO (unsafe)** while status is Testing — that is normal for internal tools).
4. Browser shows **Meridian connected**. Terminal prints:

```text
MERIDIAN_GOOGLE_CLIENT_ID=...
MERIDIAN_GOOGLE_CLIENT_SECRET=...
MERIDIAN_GOOGLE_REFRESH_TOKEN=1//0...
```

5. Copy the refresh token into Production `.env` and GitHub secrets (below).

**Expect:** A non-empty `MERIDIAN_GOOGLE_REFRESH_TOKEN`.  
**If it goes wrong:**

| Symptom | Fix |
| --- | --- |
| `refresh_token` missing / `(none)` | Revoke app access at <https://myaccount.google.com/permissions> → run setup again (script forces `prompt=consent`) |
| `redirect_uri_mismatch` | Add exactly `http://127.0.0.1:8765/callback` on the OAuth client |
| Access blocked | Add your Google account under Consent screen → Test users |
| Wrong Google account | Sign out of personal Gmail; use company account that owns GSC |

---

## Part B — Field: `MERIDIAN_GA4_PROPERTY_ID` **[You]** (+ Developer pastes)

**This is not the same as the website measurement ID.**

| Concept | Example | Used for |
| --- | --- | --- |
| Measurement ID | `G-RFXQRYYX48` | Tag in page HTML / Site Settings → Analytics |
| Property ID | `251234567` (digits only) | Meridian GA4 Data API |

### How to find the Property ID

1. Open <https://analytics.google.com/>
2. Sign in with the company account.
3. Bottom-left → **Admin** (gear).
4. In the **Property** column → **Property settings**.
5. Copy **Property ID** (numeric).
6. That number is `MERIDIAN_GA4_PROPERTY_ID`.

**Expect:** Only digits, no `G-` prefix.  
**If it goes wrong:** If you paste `G-RFXQRYYX48`, Meridian GA4 connector fails — re-copy from Property settings.

### Confirm the measurement ID on the website (already done)

1. Admin → **Site Settings** → **Analytics & cookies** → **GA4 measurement ID** = `G-RFXQRYYX48`.
2. Or View page source on home → search `G-RFXQRYYX48`.

Meridian does **not** replace this field; it only uses the numeric Property ID for API reports.

---

## Part C — Field: Search Console `siteUrl` (profile) **[You]** + already set

File: `packages/meridian/profiles/zigma.prod.json` → `connectors.gsc.siteUrl`

**Current value:** `sc-domain:zigma-technologies.com`

### Which format to use

| If you verified in GSC as… | Use this `siteUrl` |
| --- | --- |
| **Domain** property (`zigma-technologies.com`) | `sc-domain:zigma-technologies.com` |
| **URL-prefix** `https://zigma-technologies.com/` | `https://zigma-technologies.com/` (trailing slash matters) |

### How to see which you have

1. Open <https://search.google.com/search-console>
2. Top-left property picker.
3. If the property shows as domain-only (no `https://`) → use `sc-domain:…`.
4. If it shows full `https://zigma-technologies.com/` → use that exact string including slash.

**Do not change the profile** unless GSC uses a different property type. Wrong `siteUrl` → Meridian GSC returns auth/permission errors even with a good token.

### First-time GSC property (if not verified yet) **[You]**

1. Search Console → **Add property** → prefer **Domain** → `zigma-technologies.com`.
2. Google shows a DNS TXT record.
3. BigRock (domain DNS) → add TXT exactly as shown → wait up to 48h → **Verify**.
4. After verify → **Sitemaps** → add `sitemap.xml` → **Submit**.  
   Or: Admin → SEO → Meridian → **Submit sitemap** (after OAuth secrets).

---

## Part D — Field: `MERIDIAN_BING_API_KEY` **[You]** + Developer pastes

1. Open <https://www.bing.com/webmasters>
2. Sign in (Microsoft account tied to the company).
3. Prefer **Import from Google Search Console** (fastest if GSC is done).
4. Left → **Settings** (gear) → **API Access** (wording may be **API Key**).
5. **Create** / **Generate** API key → copy once.
6. That string is `MERIDIAN_BING_API_KEY`.

**Expect:** Site listed as `https://zigma-technologies.com` (or apex you submitted).  
**If it goes wrong:** Key regenerates invalidate the old one — update `.env` and restart PM2.

---

## Part E — Field: `MERIDIAN_PSI_API_KEY` **[Developer]** (optional but recommended)

1. Google Cloud (same project as Part A) → **APIs & Services** → **Library** → enable **PageSpeed Insights API** if not already.
2. **Credentials** → **+ Create Credentials** → **API key**.
3. Copy the key → `MERIDIAN_PSI_API_KEY`.
4. (Recommended) Edit API key → **Restrict key** → API restriction → only **PageSpeed Insights API**.

Without this key, PageSpeed may still work briefly then show quota / `auth_required`.

---

## Part F — Put secrets on Production **[Developer]**

SSH:

```bash
ssh deploy@200.234.45.106
cd /var/www/zigma-technologies
nano .env   # or your editor
```

Add (paste real values; keep existing lines):

```bash
MERIDIAN_GOOGLE_CLIENT_ID=.....apps.googleusercontent.com
MERIDIAN_GOOGLE_CLIENT_SECRET=GOCSPX-.....
MERIDIAN_GOOGLE_REFRESH_TOKEN=1//0.....
MERIDIAN_GA4_PROPERTY_ID=123456789
MERIDIAN_BING_API_KEY=.....
MERIDIAN_PSI_API_KEY=AIza.....
# Optional: autopilot writes drafted meta (+ alt) into empty CMS fields
# MERIDIAN_AUTO_APPLY_META=1
# MERIDIAN_AUTO_APPLY_ALT=1
# Optional: Slack/Discord/Teams webhook (verify fail · auth_required · score regression)
# MERIDIAN_WEBHOOK_URL=https://hooks.slack.com/services/...
# Admin one-click → GitHub Actions (no Meridian CLI on this node)
# Prefer classic PAT (ghp_…) with scopes: repo + workflow — fine-grained often 403s on orgs
# MERIDIAN_GITHUB_TOKEN=ghp_...
# MERIDIAN_GITHUB_REPO=JustXSystems/zigma-technologies
```

Save, then:

```bash
pm2 restart zigma --update-env
```

**Expect:** Admin → SEO → Meridian → Connectors readiness shows green **set** for each.  
Primary button: **Generate report (GitHub)** when `MERIDIAN_GITHUB_TOKEN` is set.

Also add the **same** `MERIDIAN_GOOGLE_*` / Bing / GA4 / PSI / webhook names as GitHub Actions secrets:

```bash
# From a laptop with gh auth login + unlock-secrets.json or env already set:
npm run meridian:secrets:sync
```

---

## Part F — Ops webhook + Admin GitHub dispatch (recommended)

### F.1 Webhook alerts

1. Create an incoming webhook in Slack, Discord, or Microsoft Teams.
2. Set `MERIDIAN_WEBHOOK_URL` in Production `.env` **and** as a GitHub Actions secret (same value).
3. Actions sets `MERIDIAN_WEBHOOK_ALERTS_ONLY=1` so you only get pings on live-verify fail, `auth_required`, or score regression — not every green run.
4. For verbose digests: unset alerts-only or set `MERIDIAN_WEBHOOK_ALWAYS=1`.

### F.2 Admin → GitHub (no CLI on Production)

**Use a classic PAT.** Fine-grained tokens (`github_pat_…`) often return  
`403 Resource not accessible by personal access token` on org repos when triggering Actions.

1. Open [Tokens (classic)](https://github.com/settings/tokens) → **Generate new token (classic)**.
2. Note: `zigma-meridian-admin` · Expiration: 90 days (or your policy).
3. Scopes (tick both):
   - **`repo`** (full control of private repositories)
   - **`workflow`** (update GitHub Action workflows — required for `workflow_dispatch`)
4. Generate → copy `ghp_…` once.
5. On Production VPS:
   ```bash
   # in /var/www/zigma-technologies/.env
   MERIDIAN_GITHUB_TOKEN=ghp_REPLACE
   MERIDIAN_GITHUB_REPO=JustXSystems/zigma-technologies
   pm2 restart zigma --update-env
   ```
6. Admin → SEO → Meridian → **Generate report (GitHub)**.

**If still 403:** org policy is blocking classic PATs, or your user cannot run Actions on that repo.  
Org admin → Settings → Personal access tokens / Third-party access → allow classic PATs for this org.  
Or run reports from GitHub → Actions → **Meridian SEO report** (no Admin token needed).

**Do not** use fine-grained (`github_pat_…`) unless an org admin has approved fine-grained PATs **and** Actions Write on this repo — classic is the reliable path.

---

## Part G — Verify it worked

### G.1 Admin

1. Open `https://zigma-technologies.com/admin/seo` → tab **Meridian**.
2. Environment **Production**.
3. Check **Connectors readiness** (every field set / missing).
4. Click **Run scan**.
5. **Expect:** Connectors `gsc` / `ga4` status `ok` (Bing/PSI if keys set).
6. **Signals** section shows queries / sessions / PageSpeed score.
7. Click **Submit sitemap** once.
8. Click **Inspect top URLs**.

### G.2 CLI on VPS or laptop

```bash
npm run meridian:verify
npm run meridian:act:sitemap
npm run meridian:act:inspect
```

### G.3 If still `auth_required`

| Connector | Check |
| --- | --- |
| gsc / ga4 | All three `MERIDIAN_GOOGLE_*` present after `pm2 restart … --update-env` |
| ga4 only | Property ID is numeric; OAuth user has access to that GA4 property |
| gsc only | `siteUrl` matches GSC property; OAuth user is owner/full user on that property |
| bing | Key valid; site added in Bing Webmaster |
| pagespeed | PSI API enabled; key not restricted away from PSI |

---

## Part H — Site Settings social URLs (sameAs) **[You]** / automated

Meridian finding `SCHEMA_SAMEAS` means Organization JSON-LD has no social profiles.

### Automated (preferred)

Zigma Production ships a **verified** LinkedIn company URL in `zigma.prod.json` → `autopilot.sameAsVerified`.

On the Production VPS (DB access):

```bash
npm run meridian:act:phase2
# or: npm run seo:phase2:sameas
```

That writes LinkedIn into Site Settings, rechecks NAP, and regenerates the Rich Results pack. Autopilot does the same when `autoApplySameAs` is true.

### Manual (extra networks)

1. Open `https://zigma-technologies.com/admin/site-settings`.
2. Section **Social links**.
3. Fill only real, public profile URLs (leave blank if you do not have one — do **not** invent):

| Field | Correct value looks like | How to get it |
| --- | --- | --- |
| **LinkedIn URL** | `https://www.linkedin.com/company/zigmatechnologiesind` | Already auto-applied when Phase 2 runs |
| **Facebook URL** | `https://www.facebook.com/YourPage` | Facebook Page → About / share → copy link |
| **YouTube URL** | `https://www.youtube.com/@YourHandle` or `/channel/UC…` | YouTube → your channel → copy URL |
| **Instagram URL** | `https://www.instagram.com/yourhandle/` | Instagram profile → copy link |
| **X (Twitter) URL** | `https://x.com/yourhandle` | Profile → copy link |

4. **Save**.
5. Open home → View page source → search `sameAs` — you should see those URLs in JSON-LD.
6. Re-run Meridian scan — `SCHEMA_SAMEAS` should clear.

**Wrong:** `#`, `https://#`, homepage URLs, or personal profiles when the business has a company page.

---

## Part I — Profile JSON fields (advanced / other websites)

For Zigma Production these are already correct. When copying Meridian to another site, edit a profile JSON:

| Field | Meaning | Example |
| --- | --- | --- |
| `id` | Short id for report folders | `acme-prod` |
| `displayName` | Human title on reports | `Acme Corp (Production)` |
| `origin` | Apex site URL, no trailing slash | `https://example.com` |
| `indexable` | `true` only for public production | `true` / `false` |
| `brand.name` | Exact brand string for title checks | `Acme Corp` |
| `samplePaths` | Paths Meridian crawls every run | `["/", "/contact"]` |
| `expectNoindex` | Paths that must be `noindex` | `["/thank-you"]` |
| `wwwHost` | Optional www URL to test redirect | `https://www.example.com` |
| `connectors.gsc.siteUrl` | GSC property string | see Part C |
| `connectors.ga4.measurementIdHint` | Optional HTML hint only | `G-XXXX` |
| `outputDir` | Where reports write | relative path under package |

Create a starter: `node packages/meridian/bin/meridian.mjs init-profile --out ./acme.profile.json`

---

## Checklist

- [ ] Google Cloud project + Search Console API + Analytics Data API (+ PSI)
- [ ] OAuth consent + Desktop client
- [ ] Refresh token from `google-oauth-setup.mjs`
- [ ] `MERIDIAN_GA4_PROPERTY_ID` (numeric)
- [ ] Secrets in Production `.env` + `pm2 restart zigma --update-env`
- [ ] Same secrets in GitHub Actions (optional but recommended)
- [ ] GSC property verified; `siteUrl` matches
- [ ] Bing API key (optional)
- [ ] PSI API key (optional)
- [ ] Social URLs in Site Settings
- [ ] Meridian scan shows connectors `ok` + Signals populated
- [ ] Submit sitemap + Inspect top URLs once

Full product design: [ARCHITECTURE.md](./ARCHITECTURE.md). Short CLI notes: [README.md](./README.md).
