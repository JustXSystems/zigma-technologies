# Zigma Technologies — Admin Control Plane

Independent control portal at **`/admin`** for the public marketing site. This document is the operator reference; the **in-app guide** at **`/admin/guide`** mirrors it with premium navigation, architecture diagrams, and module-by-module why/when/how cards.

---

## Quick links

| Resource | Location |
|----------|----------|
| **In-app guide** | [/admin/guide](/admin/guide) — architecture, flows, 21 module references, playbooks |
| **KVM 2 production setup** | [/admin/guide/hostinger-prod](/admin/guide/hostinger-prod) — empty Ubuntu VPS → MySQL → PM2/Nginx → GitHub Actions (`deploy@` Hostinger) |
| **justxsystems staging (subdir)** | [/admin/guide/justxsystems](/admin/guide/justxsystems) — `https://justxsystems.com/zigma-technologies/` |
| **Hostinger migration / DNS** | [/admin/guide/migration](/admin/guide/migration) |
| **Email migration** | [/admin/guide/email](/admin/guide/email) |
| **Dashboard** | `/admin` — stats, setup checklist, bootstrap |
| **Public site** | `/` |
| **Guide source** | `src/lib/admin-guide.ts`, `src/lib/admin-guide-modules.ts`, `src/lib/admin-guide-hostinger-prod.ts` |

---

## Architecture overview

### Stack

| Layer | Technology |
|-------|------------|
| App | Next.js App Router — `(admin)` + `(site)` route groups |
| Database | MySQL via `mysql2` |
| Auth | JWT in httpOnly cookie `zigma_admin_session` (7 days) |
| Edge | `src/proxy.ts` — admin gate, redirects, upload URL block |
| Config store | `theme_settings` key-value JSON + `css_overrides` |

### Route groups

```
src/app/(admin)/admin/*     → Control portal (sidebar, no public chrome)
src/app/(site)/*            → Public site (Header, Footer, SEO, consent)
src/app/api/admin/*         → Protected CRUD + seeds (cookie required)
src/app/api/public/*        → Read APIs + form submit (honeypot, rate limit)
src/app/api/partner/*       → Dealer portal (separate JWT cookie)
```

### Auth flow (`src/proxy.ts`)

1. Request to `/admin/*` or `/api/admin/*` (except login + seed)
2. Read `zigma_admin_session` cookie → verify JWT
3. Missing/invalid → redirect to `/admin/login` or 401 JSON
4. Editor role → UI hides admin-only nav; redirect if hitting admin-only route

### Data model split

**Relational tables** (content that has many rows):

| Domain | Tables |
|--------|--------|
| CMS | `pages`, `page_sections` |
| Catalog | `catalog_items`, `catalog_media`, `catalog_categories`, `catalog_page_settings` |
| Navigation | `nav_items` |
| Leads | `enquiries`, `form_definitions`, `form_fields`, `newsletter_subscribers` |
| Editorial | `resource_posts`, `press_posts`, `site_testimonials` |
| Platform | `admin_users`, `redirects`, `media_assets`, `css_overrides`, `partner_users`, `partner_documents` |

**Key-value config** (`theme_settings.setting_key`):

| Key | Admin module | Purpose |
|-----|--------------|---------|
| `site` | Site Settings | Company identity, contact, analytics, CRM, SLA, enquiry notify |
| `site_copy` | Site Copy | Marketing strings, feature flags, modal/hub copy |
| `industries` | Site Copy | `/industries/*` JSON content |
| `locations` | Site Copy | `/locations/*` JSON content |
| `tokens` | Theme Studio | Design tokens → `/api/public/theme.css` |

### Core data flows

**Enquiry:** Visitor form → `POST /api/public/enquiries` (or careers/callback) → `enquiries` row → optional SMTP notify + CRM webhook → admin triage at `/admin/enquiries`.

**CMS page:** Editor saves `pages` + `page_sections` → public `GET /api/public/pages/[slug]` → `SectionRenderer` → HTML. Preview: signed `?preview=1&token=…` (12h).

**Catalog:** Editor publishes `catalog_items` → listing via `GET /api/public/catalog/[type]` + `catalog_page_settings` → case study at `/{type}/{slug}` using `case_study_json` + gallery.

---

## Setup

### 1. Apply CMS tables

```bash
mysql -u zigmatech -p zigmatech < scripts/schema.sql
```

PowerShell:

```powershell
Get-Content scripts/schema.sql -Raw | mysql -u zigmatech -p zigmatech
```

**Upgrading an existing DB** — run migrations:

```bash
mysql -u zigmatech -p zigmatech < scripts/migrate-enquiry-notes.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-newsletter.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-redirects.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-enquiry-subject.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-hero.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-appearance.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-case-study.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-categories.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-resource-posts.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-testimonials.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-wave3.sql
```

### 2. Environment variables

**Required:**

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `AUTH_SECRET` | JWT signing |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First admin seed |

**Recommended:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Sitemap, canonical URLs, OG |
| `PREVIEW_SECRET` | Draft preview tokens (falls back to `AUTH_SECRET`) |
| `SMTP_HOST`, `SMTP_FROM`, … | Enquiry email notifications |

**Optional:** Turnstile keys, `MEDIA_BASE_URL`, CRM webhook (also configurable in Site Settings).

### 3. First login

1. `npm run dev` → `/admin/login`
2. **Seed default admin** → sign in
3. **Dashboard** → **Bootstrap missing seeds** (admin) or seed individually
4. **Site Settings** → real company details
5. **Navigation** → seed header/footer
6. Verify public site + test enquiry

### 4. Clone to UAT / prod

**Export (source):**

```bash
npm run db:export
npm run db:export -- --with-cms-media
npm run db:export -- --no-uploads
```

**Import (target):**

```bash
npm run db:import -- storage/exports/zigma-YYYYMMDD-HHMMSS --force
npm run db:import -- path/to/database.sql --force --skip-media
```

Change admin passwords after import from shared environments.

---

## Roles & access

| Role | Scope |
|------|-------|
| **Editor** | Pages, inventory, catalog settings, resources, press, testimonials, enquiries, forms, nav, site settings, media, account |
| **Admin** | Everything + Site Copy (write), Theme Studio (publish), New Client, newsletter, redirects, partners, users, dashboard bootstrap |

Last admin cannot be deleted or demoted. Editors hitting admin-only routes are redirected to dashboard.

---

## Module reference

Each module: **Why** (business purpose), **When** (trigger), **How** (steps), **Public impact**, **Database**.

### Dashboard — `/admin`

| | |
|---|---|
| **Why** | Single health view and first-run checklist |
| **When** | First login; weekly checks; before go-live handoff |
| **How** | Review stat tiles → work checklist → Bootstrap missing seeds (admin) |
| **Public** | Indirect — seeds populate public content |
| **DB** | Reads counts across pages, catalog, enquiries, media, theme_settings |
| **Seed** | `POST /api/admin/setup/bootstrap` |

### Pages — `/admin/pages`

| | |
|---|---|
| **Why** | Marketing/legal content without code deploys |
| **When** | Homepage edits; contact/careers/legal; custom landings; preview drafts |
| **How** | Edit SEO/slug/status → add/reorder sections → media picker → Preview → Publish |
| **Public** | `/`, `/contact`, `/careers`, `/certifications`, `/privacy`, `/terms`, `/{slug}` |
| **DB** | `pages`, `page_sections` |
| **Seed** | Seed homepage; Seed inner pages; Seed industries |

**Preview:** Signed link 12h. Draft/disabled sections visible with orange banner.

**Reserved slugs:** `projects`, `products`, `services`, `admin`, etc. — see `src/lib/reserved-slugs.ts`.

### Inventory — `/admin/inventory`

| | |
|---|---|
| **Why** | Commercial core — listings, case studies, search, enquiry context |
| **When** | New product/project/service; case study; featured items; brochure/video |
| **How** | Tab → create/seed → case study block → Media modal (★ thumbnail) → Published |
| **Public** | `/projects`, `/products`, `/services` + `/{type}/{slug}` |
| **DB** | `catalog_items`, `catalog_media`, `catalog_categories` |
| **Seed** | Seed {type}s; Delete all {type}s before re-seed |

**Case study fields:** client, sector, location, challenge, solution, scope, outcomes, technologies, testimonial, before/after, video, brochure PDF, availability, lead time.

### Catalog Settings — `/admin/catalog-settings`

| | |
|---|---|
| **Why** | Presentation layer for listings without re-entering items |
| **When** | After inventory seed; rebrand preset; hero spotlight tuning |
| **How** | Select type → style preset → hero → layout/filters/appearance toggles → Save |
| **Public** | Listing chrome at `/projects`, `/products`, `/services` |
| **DB** | `catalog_page_settings` |

Presets: `classic`, `premium`, `glass`, `minimal`, `bold-corporate`. Hero falls back to featured items if none selected.

### Resources — `/admin/resources`

| | |
|---|---|
| **Why** | SEO guides and engineering credibility |
| **When** | Publish technical checklists; tag-filtered hub |
| **How** | Create/seed → HTML body (h2, lists) → cover, tags, meta → Publish |
| **Public** | `/resources`, `/resources/{slug}` + Article JSON-LD |
| **DB** | `resource_posts` |

### Press — `/admin/press`

| | |
|---|---|
| **Why** | Newsroom separate from long-form guides |
| **When** | Announcements, milestones |
| **How** | Create post → excerpt, body, source URL → Publish |
| **Public** | `/press`, `/press/{slug}` |
| **DB** | `press_posts` (wave3 migration) |

### Testimonials — `/admin/testimonials`

| | |
|---|---|
| **Why** | Social proof + AggregateRating JSON-LD |
| **When** | Post-project quotes; contact strip |
| **How** | Author, role, company, rating, quote → Publish/featured |
| **Public** | Contact strip; `GET /api/public/testimonials` |
| **DB** | `site_testimonials` |

### Site Settings — `/admin/site-settings`

| | |
|---|---|
| **Why** | Single source for identity, notifications, analytics, CRM |
| **When** | Launch; rebrand; enable email/CRM/analytics |
| **How** | Company, logo, phones, emails, WhatsApp, footer, social, notify emails, GA4, CRM webhook, SLA JSON |
| **Public** | Header, Footer, JSON-LD, mail, `/thank-you`, `/sla` |
| **DB** | `theme_settings.site` |

**Enquiry email:** Requires `SMTP_*` + notify enabled. Visitor auto-reply optional.

### Site Copy — `/admin/site-copy` *(admin write)*

| | |
|---|---|
| **Why** | White-label marketing strings without code changes |
| **When** | New client; toggle tools/locales/partners; edit wizard/calculator copy |
| **How** | Tabs: Chrome, Hubs, Consultation, Tools, Catalog, Locales, Features |
| **Public** | All chrome; `GET /api/public/site-copy` |
| **DB** | `site_copy`, `industries`, `locations` |

**Feature flags:**

| Flag | Effect |
|------|--------|
| `toolsEnabled` | `/tools/*`; Talk menu links |
| `localesEnabled` | `/hi`, `/kn` |
| `partnersEnabled` | Partner portal |

### Navigation — `/admin/nav`

| | |
|---|---|
| **Why** | Editable mega-menu and footer |
| **When** | Launch; new hub; rebrand; reset corrupted nav |
| **How** | Seed header/footer → nested columns/links → ↑↓ reorder → Clear+Seed to reset |
| **Public** | Header/Footer; `GET /api/public/nav` |
| **DB** | `nav_items` |

### Theme Studio — `/admin/theme` *(admin publish)*

| | |
|---|---|
| **Why** | Brand theming without editing globals.css |
| **When** | Rebrand; client CSS overrides |
| **How** | Tokens → Save; CSS draft → Publish; optional sync to disk |
| **Public** | `/api/public/theme.css` |
| **DB** | `tokens`, `css_overrides` |

### New Client — `/admin/new-client` *(admin)*

| | |
|---|---|
| **Why** | Fast white-label onboarding on cloned snapshot |
| **When** | After `db:import` on new environment |
| **How** | Brand wizard → reset Site Copy/tokens → optional demo seed → Theme + Site Copy |
| **DB** | `theme_settings`; optionally all seeded tables |

### Enquiries — `/admin/enquiries`

| | |
|---|---|
| **Why** | Unified lead inbox |
| **When** | Daily triage; resume download; CSV export |
| **How** | Filter status → notes → closed; careers resume via secure admin API |
| **Public** | Fed by contact, careers, catalog, callback APIs |
| **DB** | `enquiries` |

### Enquiry Forms — `/admin/forms`

| | |
|---|---|
| **Why** | Configurable form fields |
| **When** | Subject options; reorder; disable field |
| **How** | Edit `enquiry_default` → fields ↑↓, labels, required |
| **Public** | `GET /api/public/forms/enquiry` |
| **DB** | `form_definitions`, `form_fields` |

### Newsletter — `/admin/newsletter` *(admin)*

| | |
|---|---|
| **Why** | Footer subscribe list |
| **When** | Export for campaigns |
| **Public** | `POST /api/public/newsletter` |
| **DB** | `newsletter_subscribers` |

### Media — `/admin/media`

| | |
|---|---|
| **Why** | Upload once, reuse everywhere |
| **When** | Brand assets; section/inventory image pick |
| **How** | Upload → alt/tags → copy URL → Browse in editors |
| **Public** | `/assets/images/…`, `/assets/svg/…`, `/assets/video/…` |
| **DB** | `media_assets` + disk scan |

Visitor uploads (resumes) under `/assets/uploads/` — **not** in library; blocked from direct URLs.

### Redirects — `/admin/redirects` *(admin)*

| | |
|---|---|
| **Why** | SEO preservation on migration |
| **When** | Legacy HTML; slug changes |
| **How** | from_path → to_path, status, enabled |
| **Public** | Applied in `proxy.ts` (~30s cache) |
| **DB** | `redirects` |

### Partners — `/admin/partners` *(admin)*

| | |
|---|---|
| **Why** | Dealer document portal |
| **When** | Onboard distributor |
| **Public** | `/partner/login`, `/partner` |
| **DB** | `partner_users`, `partner_documents` |

### Users — `/admin/users` *(admin)*

| | |
|---|---|
| **Why** | Delegate editing without full admin access |
| **When** | Add team; rotate credentials |
| **DB** | `admin_users` |

### Account — `/admin/account`

| | |
|---|---|
| **Why** | Self-service password change |
| **When** | After seed login or db:import |

---

## Playbooks

### First-time go-live

1. schema.sql + migrations
2. Seed admin → sign in
3. Dashboard bootstrap
4. Site Settings (real details + notify emails)
5. Navigation seed
6. Inventory seed → publish → Catalog Settings
7. Test enquiry + SMTP

### Edit homepage

Pages → Home → sections → Preview → Publish.

### Publish case study

Inventory → case study + gallery → Published → verify `/{type}/{slug}`.

### Handle lead

Enquiries → New → notes → Closed → export CSV.

### White-label client

`db:export` → `db:import` → New Client → Theme → Site Copy → replace assets.

### Re-seed safely

**Always delete first:** Clear sections / Clear nav / Delete all {type}s → Seed.

---

## Public features (admin-adjacent)

These public routes are configured from admin modules:

| Feature | Admin config | Public route |
|---------|--------------|--------------|
| Calculators | Site Copy + `toolsEnabled` | `/tools/ups-calculator`, `/tools/solar-roi`, `/tools/solution-finder` |
| Locales | Site Copy + `localesEnabled` | `/hi`, `/kn` |
| Industries | Site Copy JSON + Pages seed | `/industries`, `/industries/{slug}` |
| Locations | Site Copy JSON | `/locations`, `/locations/{slug}`, city×service matrix |
| SLA dashboard | Site Settings `slaMetricsJson` | `/sla` |
| Search | — | `/search` |
| Cookie policy | Site Copy | `/cookies` |
| Careers | Pages seed + Forms | `/careers` (resume upload → enquiries) |

### Analytics & consent

Site Settings: GA4, Plausible, `analyticsConsentRequired`. Cookie banner gates scripts.

### Form protection

Honeypot + **6 submissions / 15 min / IP**. Optional Turnstile.

### SEO

Per-page SEO fields; site-wide defaults; `/sitemap.xml`, `/robots.txt`; Organization JSON-LD.

### Wave 3 modules

CRM webhook, partner portal, video case studies, availability/lead time, press/newsroom, PWA, A/B header CTA, city×service SEO pages.

---

## API quick reference

### Admin (cookie auth)

| Path | Purpose |
|------|---------|
| `/api/admin/dashboard` | Stat counts |
| `/api/admin/setup`, `/setup/bootstrap` | Checklist + seeds |
| `/api/admin/pages`, `/pages/[id]/sections` | CMS |
| `/api/admin/catalog`, `/catalog/seed` | Inventory |
| `/api/admin/catalog-settings` | Listing config |
| `/api/admin/nav`, `/nav/seed` | Navigation |
| `/api/admin/site-settings` | Site identity |
| `/api/admin/site-copy` | Marketing copy (PUT admin) |
| `/api/admin/theme` | Tokens + CSS |
| `/api/admin/enquiries` | Lead inbox |
| `/api/admin/media` | Asset library |
| `/api/admin/resources`, `/press`, `/testimonials` | Editorial |
| `/api/admin/redirects`, `/newsletter`, `/partners`, `/users` | Platform (admin) |

### Public (no auth)

| Path | Purpose |
|------|---------|
| `GET /api/public/pages/[slug]` | CMS content |
| `GET /api/public/catalog/[type]`, `[type]/[slug]` | Catalog |
| `GET /api/public/nav`, `/site-settings`, `/site-copy` | Chrome |
| `GET /api/public/theme.css` | Theme |
| `POST /api/public/enquiries`, `/careers/apply`, `/callback`, `/newsletter` | Forms |

---

## Seed sections reference

| Page | Sections included |
|------|-------------------|
| **Home** | hero, eco, stats, why, capability bands, experts, timeline, projects teaser, industries, testimonials, partners, cert teaser, CTA |
| **Contact** | hero, quick contact, how-we-help, locations, enquiry form |
| **Careers** | hero, culture, life-at-zigma, why, jobs, internship, benefits, apply form |
| **Certifications** | hero, OEM marquee, CTA |
| **Privacy / Terms** | hero, rich text, CTA |

---

## File reference

| Concern | Path |
|---------|------|
| Auth proxy | `src/proxy.ts` |
| Admin shell | `src/app/(admin)/admin/layout.tsx` |
| In-app guide | `src/app/(admin)/admin/guide/page.tsx` |
| KVM 2 production guide | `src/app/(admin)/admin/guide/hostinger-prod/page.tsx` |
| justxsystems staging guide | `src/app/(admin)/admin/guide/justxsystems/page.tsx` |
| Guide data | `src/lib/admin-guide.ts`, `src/lib/admin-guide-modules.ts`, `src/lib/admin-guide-hostinger-prod.ts`, `src/lib/admin-guide-justxsystems.ts` |
| CMS | `src/lib/cms.ts`, `src/lib/cms-types.ts` |
| Catalog | `src/lib/catalog.ts`, `src/lib/catalog-case-study.ts` |
| Site settings | `src/lib/site-settings.ts` |
| Site copy | `src/lib/site-copy.ts` |
| Schema | `scripts/schema.sql` |
| DB transfer | `scripts/db-export.mjs`, `scripts/db-import.mjs` |

---

## Original requirements checklist

| Request | Status |
|---------|--------|
| Homepage styling parity with static CSS | Done |
| Independent `/admin` portal | Done |
| MySQL (`mysql2`) | Done |
| Auth gate via `src/proxy.ts` | Done |
| Inventory (projects/products/services) | Done |
| Page CMS + seeds + preview | Done |
| Theme / CSS overrides | Done |
| Forms & enquiries | Done |
| Media library | Done |
| Navigation CMS → Header/Footer | Done |
| Site settings / highly configurable | Done |
| In-app admin guide | Done — `/admin/guide` |
| Hostinger KVM 2 production playbook | Done — `/admin/guide/hostinger-prod` |

Legacy `public/*.html` redirect to App Router routes via `proxy.ts` and Redirects admin.
