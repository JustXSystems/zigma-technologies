## Original requirements checklist

| Request | Status |
|---------|--------|
| Homepage styling parity with static CSS | Done — `src/app/globals.css` synced from `public/assets/css/globals.css`; hero icons + eco diagram restored |
| Independent `/admin` portal in same Next.js repo | Done — `(admin)` route group |
| MySQL (`mysql2`) | Done |
| Auth gate via `src/proxy.ts` | Done |
| Inventory (projects/products/services) | Done |
| Page CMS + seeds + preview | Done |
| Theme / CSS overrides | Done |
| Forms & enquiries | Done |
| Media library | Done |
| Navigation CMS → Header/Footer | Done |
| Site settings / highly configurable | Done |

Legacy `public/*.html` files redirect to App Router routes (`/index.html` → `/`, etc.).

---

Independent control plane for Zigma Technologies (`/admin`).

## Setup

1. Apply CMS tables:

```bash
mysql -u zigmatech -p zigmatech < scripts/schema.sql
```

On **PowerShell** (Windows), use:

```powershell
Get-Content scripts/schema.sql -Raw | mysql -u zigmatech -p zigmatech
```

If upgrading an existing DB:

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

PowerShell equivalents:

```powershell
Get-Content scripts/migrate-enquiry-notes.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-newsletter.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-redirects.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-enquiry-subject.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-catalog-hero.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-catalog-appearance.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-catalog-case-study.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-catalog-categories.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-resource-posts.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-testimonials.sql -Raw | mysql -u zigmatech -p zigmatech
Get-Content scripts/migrate-wave3.sql -Raw | mysql -u zigmatech -p zigmatech
```

2. Ensure `.env` includes `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Optional: `PREVIEW_SECRET`, `NEXT_PUBLIC_SITE_URL` (used by sitemap/robots), and `SMTP_*` for enquiry email alerts. Optional Turnstile: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.

3. `npm run dev` → `/admin/login` → **Seed default admin** → sign in.

4. **Pages** → **Seed homepage** (and optionally contact / careers / certifications / privacy / terms)

5. **Navigation** → **Seed header tree** / **Seed footer tree**

6. Optional: **Site Settings**, **Inventory → Seed sample …**

## Modules

| Area | Path |
|------|------|
| Pages & sections | `/admin/pages` |
| Inventory | `/admin/inventory` |
| Catalog settings / categories | `/admin/catalog-settings` |
| Enquiries | `/admin/enquiries` |
| Enquiry forms | `/admin/forms` |
| Navigation (mega + footer) | `/admin/nav` |
| Site settings | `/admin/site-settings` |
| Media | `/admin/media` |
| Resources / Blog | `/admin/resources` |
| Press / newsroom | `/admin/press` |
| Partners (dealer portal) | `/admin/partners` |
| Testimonials | `/admin/testimonials` |
| Newsletter | `/admin/newsletter` |
| Redirects | `/admin/redirects` |
| Theme & CSS | `/admin/theme` |
| Users | `/admin/users` |
| Account | `/admin/account` |

### Preview mode
From **Pages**, click **Preview** to open a signed `?preview=1&token=…` link (12h). Draft pages and disabled sections are visible with an orange banner. Uses `PREVIEW_SECRET` or falls back to `AUTH_SECRET`.

### Dynamic CMS pages
Published pages with custom slugs (e.g. `/about`, `/privacy`) render via `/(site)/[slug]`. Reserved routes (`projects`, `products`, `services`, `admin`, …) cannot be used as custom page slugs. Sitemap includes published custom pages. Seed **privacy** / **terms** from Pages to populate legal content (footer links default to `/privacy` and `/terms`).

### Catalog listings
**Catalog Settings** controls public `/projects`, `/products`, `/services`: visual style preset (`classic`, `premium`, `glass`, `minimal`, `bold-corporate`), hero variant (`standard` / `spotlight`), curated appearance toggles (skeleton loading, reveal animation, premium borders), hero spotlight (enable/disable, eyebrow/title/lead, rotation timer, selected items), layout (grid/list), columns, filters (category/tags), search fields, card fields, and modal sections. If no hero items are selected, the public hero falls back to featured items automatically. Changes apply on the next public page load.

### Media library
Upload, browse, search, edit alt/tags, copy public URL, and delete CMS assets. Admin uploads are stored by type under `/public/assets/images`, `/public/assets/svg`, or `/public/assets/video` (public URLs `/assets/images/…`, etc.). The library **scans those folders on disk** and merges with `media_assets` DB rows — seeded static images appear automatically without re-uploading. Section editors can **Browse media** when picking images. Set `MEDIA_BASE_URL` in `.env` if you later point uploads at a CDN (default `/assets`).

**Visitor uploads** (careers resumes, future form attachments) live under `/public/assets/uploads/{category}` — e.g. `/assets/uploads/resumes`. These paths are **not** directly URL-accessible; download is via the admin Enquiries resume API only.

### Site settings
Global company name, logo URL, phones, emails, header CTA, WhatsApp, footer blurb, copyright, social/legal links, and enquiry notify emails — wired into Header/Footer / notifications.

### Enquiry email notifications
When `SMTP_HOST` + `SMTP_FROM` are set and **Site Settings → enquiry notify** is enabled (`true`), each public enquiry submission emails the configured addresses (comma-separated). Failures are logged and never block the visitor response.

When **Visitor auto-reply** is enabled (`true`, default), submitters receive a confirmation email on enquiry and careers applications (requires SMTP).

### Public form protection
Contact, catalog enquiry, careers apply, and newsletter endpoints include a hidden honeypot field and per-IP rate limiting (8 submissions per 15 minutes). Bots that fill the trap receive a fake success response; legitimate visitors see a rate-limit message if they exceed the cap.

### SEO metadata
CMS pages emit server `generateMetadata` (title/description/OG/canonical) from page SEO fields + site settings. Client `SiteSeo` still refreshes after load for SPA-style updates.
Site settings provide default meta description + OG image. Public `/sitemap.xml` and `/robots.txt` are generated automatically (`NEXT_PUBLIC_SITE_URL`).
Organization JSON-LD is emitted on public pages from site settings (name, logo, phone, email, social links).
Branded `/not-found` page for missing routes. Security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.) are set via `next.config.ts`.

### Resources / Blog
Manage guides at `/admin/resources` (seed sample UPS/Solar/BESS guides). Public listing `/resources` and detail `/resources/{slug}` with Article JSON-LD. Run `scripts/migrate-resource-posts.sql` once.

### Industries
Public landings at `/industries` and `/industries/{slug}` (healthcare, data-centres, manufacturing, banking, education, airports) with FAQ JSON-LD and related catalog pulls. Seed CMS stubs via `POST /api/admin/pages/seed-industries`. Homepage industry chips link into these pages.

### Analytics & consent
Site Settings: `ga4MeasurementId`, `plausibleDomain`, `analyticsConsentRequired`. Cookie banner loads scripts only after Accept (when required). Events: enquiry, careers, newsletter, CTA, catalog open, brochure download, search.

### Lead paths
Consultation wizard includes capacity / location / urgency. Case study pages support WhatsApp deep-links and gated brochure download (Inventory → Brochure / PDF URL). Site-wide search at `/search`.
Enquiry success redirects to `/thank-you` (booking URL + SLA from Site Settings). Header **Callback** opens a callback request modal (`/api/public/callback`). Solution finder at `/tools/solution-finder`.

### Locations
Public city pages at `/locations` and `/locations/{slug}` (Bengaluru, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR). Hindi/Kannada locale homes at `/hi` and `/kn` with hreflang; sample city pages under `/hi/locations/...` and `/kn/locations/...`.

### Testimonials
Manage reviews at `/admin/testimonials` (seed samples). Public strip + AggregateRating JSON-LD on contact. Run `scripts/migrate-testimonials.sql` once.

### Cookie policy & CSP
`/cookies` documents necessary / analytics / marketing categories. Consent banner supports category toggles. `Content-Security-Policy` is set in `next.config.ts`.

### A/B header CTA
Site Settings `headerCtaLabelB` + `ctaVariantBPercent` assign a session variant and emit `cta_variant_shown` / `cta_click` with `variant`.

### Wave 3 growth modules
- **CRM webhook:** Site Settings `crmWebhookUrl` (+ optional `crmWebhookSecret`) receives enquiry/callback leads with a simple lead score.
- **Calculators:** `/tools/ups-calculator` and `/tools/solar-roi` (print/PDF + quote handoff).
- **Partner portal:** `/partner/login` + `/partner` (JWT cookie). Manage users/docs at `/admin/partners` (admin-only). Run `scripts/migrate-wave3.sql`.
- **Availability / lead time:** Inventory fields shown on case study pages (requires wave3 migration).
- **City × service SEO:** `/locations/{city}/{service}` matrix (UPS AMC, Solar EPC, UPS, BESS, EV, Field) in sitemap.
- **Press/newsroom:** `/press` + `/admin/press` (seed samples).
- **Video case studies:** Inventory → video URL/title → player + `VideoObject` JSON-LD.
- **SLA dashboard:** `/sla` metrics from Site Settings `slaMetricsJson`.
- **Personalization / support / trust:** Header keeps **Search + Talk to us + Request consultation** only. Trust proof lives under **Who We Are → Standards & proof** (and footer). Tailor (“I’m looking for…”) sits on `/industries` and `/locations`, not the global header. Re-seed header/footer nav to pick up Standards & proof links.
- **PWA:** `manifest.webmanifest` + `/sw.js` offline contact card (`/offline.html`).
- **Turnstile:** optional captcha on public enquiry/callback when env keys are set; CSP allows Cloudflare challenges.
- **CWV budgets:** `scripts/lighthouse-budget.json` for Lighthouse `--budget-path`.
- **Form rate limit:** tightened to 6 submissions / 15 minutes per IP scope.
- **Header search:** compact icon expands on hover/click.

### Newsletter
Footer subscribe posts to `/api/public/newsletter`. Manage/export at `/admin/newsletter`.

### Redirects
Manage 301/302 (etc.) from `/admin/redirects`. Applied in `src/proxy.ts` for public paths (cached ~30s).

### Users
Admins can create/delete editors and additional admins, reset passwords, and change roles at `/admin/users`. Editors can manage content (pages, inventory, enquiries, nav, media, site settings) but cannot access Users, Theme, Redirects, Newsletter, or Bootstrap. The last admin cannot be demoted or deleted. Change your own password at `/admin/account`.

### Navigation
Nested tree: mega parents → columns → links (header), or columns → links (footer). Use ↑/↓ to reorder siblings. Deleting a parent cascades to children. **Clear** then **Seed** to reset. Header/Footer fall back to built-in defaults until CMS rows exist.

### Page manager
Edit SEO (meta title/description), slug, duplicate sections, **Clear sections** (for re-seed), delete pages, and open preview from the section screen.

### Featured projects
Homepage projects teaser prefers `featured` catalog items (`?featured=1`), with fallback to latest.

### Inventory
Seed projects/products/services from the live Zigma catalog (products hubs, project portfolio posts, and service pages). Images are stored under `/public/assets/images/seed-*` and attached as primary media on seed. Use **Delete all {type}s** to clear the current tab in one step, then **Seed {type}s** to reload. Duplicate items, reorder, attach additional media, publish/draft. Each item supports **multiple images/videos/SVG** via the **Media** modal: upload many files, attach from the media library, reorder (↑↓), and set a **card thumbnail** (★). Videos show in the public detail gallery but are not used as list thumbnails. Duplicating an item copies its media gallery. Run `scripts/migrate-catalog-categories.sql` once if categories are outdated.

**Case study pages:** Inventory editor includes a **Case study / profile** block (client, sector, location, challenge, solution, scope, outcomes, technologies, testimonial, before/after, OEM badges, PDF, video). Published items render at `/projects/{slug}`, `/products/{slug}`, and `/services/{slug}` with premium layout, gallery, related items, enquiry form, and SEO metadata. Catalog cards and the quick-view modal link through to the full page. Set **Availability** and **Lead time** for product readiness signals.

### Enquiries
Filter by status, search payload, admin notes, delete, and **Export CSV**.

### Enquiry forms
Reorder fields, edit label/placeholder/options/required, enable/disable.

### Section editing
Typed form editors for most section types, plus JSON mode. Supports `style_json` (extra class + scoped CSS) and media picker for image fields.

### Seed sections
- **Home:** hero, eco, stats, why, generate/protect/bess/maintain/ev/engineering, experts, timeline, projects teaser, industries, testimonials, partners, cert teaser, CTA
- **Contact:** page hero, quick contact, how-we-help cards, locations + map, enquiry form (with subject)
- **Careers:** page hero, culture stats, life-at-zigma, why cards, job list, internship, benefits, apply form (resume upload)
- **Certifications:** cert hero (+ `.sub`), OEM/certificate marquee (images + lightbox), cert CTA
- **Privacy / Terms:** page hero, rich text, CTA

### Careers applications
Public `/careers` apply form posts multipart data to `/api/public/careers/apply` (PDF/DOC/DOCX ≤5MB). Resumes are stored under `public/assets/uploads/resumes/` (blocked from direct public URLs; download via **Enquiries** admin resume endpoint only). Creates an enquiry with `source: careers_apply`. Role values accept any CMS-configured option (not a hardcoded whitelist). Job and internship **Apply** buttons scroll to `#apply` and prefill the role. On `/careers`, the sticky mobile CTA shows **Apply Now**.

### Theme
CSS variables + versioned globals overrides via `/api/public/theme.css`.

### Account
Change admin password at `/admin/account`. Manage team accounts at `/admin/users`.

### Dashboard setup
Checklist shows whether pages, nav, catalog, site settings, and the enquiry **subject** field are seeded. Use **Bootstrap missing seeds** or per-row **Seed** (including **Seed** on the subject row, which applies the same change as `scripts/migrate-enquiry-subject.sql`).

### Inventory media
Open **Media** on an item to attach library URLs, upload files, and remove attachments.

## Re-seed a page, nav, or catalog
Delete existing rows (sections / nav items / catalog items) first, then click the matching **Seed** button again. For inventory, use **Delete all {type}s** on the Inventory screen, then **Seed {type}s**.
