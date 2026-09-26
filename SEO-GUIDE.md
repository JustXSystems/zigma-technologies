# Zigma Technologies — SEO Implementation Guide

A step-by-step playbook for this codebase (Next.js 16.3 App Router, MySQL CMS, Hostinger VPS + nginx, PM2).
Every step says **what** to do, **why** it matters, **how** to do it (exact files and code), and **what to expect / how to verify**.

Follow the phases in order. Do not skip Phase 1 — it fixes bugs that are actively hurting indexing today, and every later phase depends on it.

---

## Table of contents

- [0. Read this first](#0-read-this-first)
- [1. Audit — where the site stands today](#1-audit--where-the-site-stands-today)
- [2. Architecture decisions (the "why" behind every step)](#2-architecture-decisions-the-why-behind-every-step)
- [Phase 0 — Baseline and tooling (Day 1)](#phase-0--baseline-and-tooling-day-1)
- [Phase 1 — Critical technical fixes (Week 1)](#phase-1--critical-technical-fixes-week-1)
- [Phase 2 — Structured data (JSON-LD) done right (Week 1–2)](#phase-2--structured-data-json-ld-done-right-week-12)
- [Phase 3 — CMS SEO fields for editors (Week 2)](#phase-3--cms-seo-fields-for-editors-week-2)
- [Phase 4 — Crawlability and Core Web Vitals (Week 2–3)](#phase-4--crawlability-and-core-web-vitals-week-23)
- [Phase 5 — Local SEO (start in parallel, highest ROI)](#phase-5--local-seo-start-in-parallel-highest-roi)
- [Phase 6 — Location, language and programmatic pages (Week 3–4)](#phase-6--location-language-and-programmatic-pages-week-34)
- [Phase 7 — Content strategy and keyword plan (ongoing)](#phase-7--content-strategy-and-keyword-plan-ongoing)
- [Phase 8 — Authority and off-page (ongoing)](#phase-8--authority-and-off-page-ongoing)
- [Phase 9 — Measurement, monitoring and maintenance (ongoing)](#phase-9--measurement-monitoring-and-maintenance-ongoing)
- [Appendix A — Route-by-route SEO matrix](#appendix-a--route-by-route-seo-matrix)
- [Appendix B — Title and description formulas](#appendix-b--title-and-description-formulas)
- [Appendix C — Verification commands](#appendix-c--verification-commands)
- [Appendix D — Things NOT to waste time on](#appendix-d--things-not-to-waste-time-on)

---

## 0. Read this first

### What SEO is made of (the mental model)

Search visibility rests on four pillars. Work on them in this order, because each one depends on the one before:

| Pillar | Question it answers | Where it lives in this project |
| --- | --- | --- |
| 1. **Technical** | Can Google crawl, render, and index the right URLs? | `src/app/layout.tsx`, `generateMetadata` in every page, `sitemap.ts`, `robots.ts`, `proxy.ts`, nginx |
| 2. **On-page / content** | Does each page clearly answer a search intent better than competitors? | CMS pages, catalog items, resources, location pages |
| 3. **Local** | Does Google trust you as a real business in Bengaluru / the cities you serve? | Google Business Profile, NAP consistency, `OrganizationJsonLd.tsx` |
| 4. **Authority** | Do other trusted sites vouch for you? | Backlinks, citations, PR, OEM partner listings |

Technical SEO is a **gate** — it cannot make you rank, but broken technical SEO stops everything else from counting. That is why Phase 1 comes first.

### What to expect (realistic timeline)

| When | What you should see |
| --- | --- |
| Days 1–7 | Phase 1 shipped. View-source shows correct canonical, title, description on every page. |
| Weeks 1–3 | Search Console "Pages" report starts moving: fewer "Duplicate, Google chose different canonical", more "Indexed". |
| Weeks 3–8 | Impressions rise for brand + long-tail queries ("UPS AMC Bangalore", project names). Rich results (breadcrumbs, organization logo) appear. |
| Months 3–6 | Non-brand commercial queries start ranking on page 1–2 if Phases 5–7 are executed consistently. Enquiries from organic become measurable. |
| Months 6–12 | Compounding growth from content + reviews + backlinks. |

SEO is compounding, not instant. Anyone promising page-1 rankings in two weeks is selling something.

### How to work through this guide

1. Create a branch per phase: `git checkout -b seo/phase-1-technical`.
2. Do the steps in order; after each step run the **Verify** block.
3. Deploy to PreProd first (it will be `noindex` after Phase 1, Step 1.6), check, then deploy to Prod.
4. After Prod deploy, do the Search Console actions listed at the end of each phase.

---

## 1. Audit — where the site stands today

I reviewed the codebase. There is solid groundwork (sitemap, robots, Organization JSON-LD, CMS meta fields, redirects table, location pages, Hindi/Kannada pages, GA4 with consent). But there are several bugs that are actively harming indexing.

### What is already good

- Server-rendered pages with `generateMetadata` on most routes.
- `sitemap.ts` covering CMS pages, catalog items, resources, press, industries, locations.
- `robots.ts` blocking `/admin/` and `/api/admin/`.
- Admin-managed 301 redirects (`src/lib/redirects.ts` + `proxy.ts`) — essential for slug changes.
- Organization / LocalBusiness JSON-LD with address, phone, `sameAs`.
- `pages` and `resource_posts` tables already have `meta_title` / `meta_description`.
- GA4 + Plausible loaded behind cookie consent (`CookieConsent.tsx`).
- `catalog_media.alt` column exists for image alt text.

### Problems found (ordered by severity)

| # | Severity | Problem | Where | Impact |
| --- | --- | --- | --- | --- |
| P1 | **Critical** | Root layout sets `alternates.canonical` to the homepage. Metadata merges shallowly, so **every page that does not set its own canonical tells Google "I am a duplicate of the homepage"**. That is ~all pages except CMS pages and city×service pages. | `src/app/layout.tsx` line 67 | Google may drop inner pages from the index or ignore them. |
| P2 | **Critical** | `SiteSeo` (client component in the site layout) overwrites `<meta name="description">` with the site-wide default on every page after hydration. Google renders JavaScript, so it can see the overwritten default description on every page. | `src/components/SiteSeo.tsx`, `src/app/(site)/layout.tsx` | Duplicate descriptions site-wide; page-specific descriptions are wasted. |
| P3 | **Critical** | PreProd (`https://justxsystems.com/zigma-technologies`) is a public, indexable full copy of the site. | Deploy workflows; no noindex gate | Duplicate content competing with production. |
| P4 | **High** | `www.zigma-technologies.com` and `zigma-technologies.com` both serve the site (the 301 in nginx is commented out). Code fallbacks use `www`, production env uses apex. | nginx config in `admin-guide-hostinger-prod.ts`; `siteOrigin()` copies in 6+ files | Split signals between two hosts. |
| P5 | **High** | Titles get the brand twice: root template `'%s \| Zigma Technologies'` + page titles that already end in `\| Zigma Technologies` → `Projects \| Zigma Technologies \| Zigma Technologies`. | Almost every `generateMetadata`, `cms-seo.ts` | Truncated, spammy-looking SERP titles. |
| P6 | **High** | Pages that set `openGraph` replace the root's `openGraph` entirely (shallow merge) → no `og:url`, `og:site_name`, often no image. | Catalog detail, resources, etc. | Poor social previews (LinkedIn/WhatsApp are key B2B channels). |
| P7 | **High** | No `<h1>` on pages: page-hero heading level defaults to `h3` (`headingPageHero: 'h3'`). | `SiteHeading.tsx`, `site-settings.ts` | Weaker topical signal and accessibility failure. |
| P8 | **High** | 36 city×service pages (`/locations/[city]/[service]`) are one sentence with the city name swapped. 10 of 12 Hindi/Kannada city pages show English fallback text. All are in the sitemap. | `location-services.ts`, `hi/`, `kn/` | Risk under Google's "scaled content abuse" / doorway-page policies; can drag down the whole site. |
| P9 | **Medium** | Utility pages are in the sitemap and indexable: `/thank-you`, `/search`, `/partner/login`. `/ztools/*` has no noindex. | `sitemap.ts`, missing robots metadata | Wasted crawl, junk in the index, and fake "conversions" from people landing on `/thank-you` from Google. |
| P10 | **Medium** | Self-serving review markup: `Organization` + `aggregateRating` built from your own testimonials. Google does not allow review rich results for a business reviewing itself; it can trigger a structured-data manual action. | `src/lib/testimonials.ts` `testimonialsJsonLd` | Risk of manual action; no benefit. |
| P11 | **Medium** | JSON-LD on catalog detail pages is injected with `next/script` (client-side). Next.js docs recommend a native `<script>` tag. JSON-LD strings are not escaped for `<`. | `projects/[slug]`, `products/[slug]`, `services/[slug]` | Structured data not in initial HTML; XSS hardening gap. |
| P12 | **Medium** | Projects/Products/Services listing pages load items in the browser (`useEffect` + `fetch`). The initial HTML has no item links. | `CatalogPageClient.tsx` | Weaker internal linking and slower discovery of detail pages. |
| P13 | **Medium** | Default OG image is the logo (not a 1200×630 image). | `site-settings.ts` `ogImage`, `layout.tsx` | Ugly/cropped share previews. |
| P14 | **Medium** | Google Fonts loaded via render-blocking `<link>`; whole public site is `force-dynamic` (MySQL hit on every request). | `src/app/layout.tsx`, `(site)/layout.tsx` | Slower LCP / TTFB (Core Web Vitals). |
| P15 | **Low** | `<html lang="en">` on Hindi/Kannada pages; hreflang has no `x-default` and no self-reference. | `layout.tsx`, `hi/*`, `kn/*`, `locations/[slug]` | Weaker language targeting. |
| P16 | **Low** | `catalog_items` has no SEO fields (meta title/description, OG image, noindex). | `scripts/schema.sql` | Editors cannot tune catalog SEO. |
| P17 | **Low** | `twitter.site: '@zigmatech'` — verify this handle exists; remove it if not. | `layout.tsx` | Minor. |

---

## 2. Architecture decisions (the "why" behind every step)

These are the patterns the rest of the guide implements. They follow the Next.js 16 metadata docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`, `.../02-guides/json-ld.md`) and Google Search Central guidance.

### D1. One SEO module, zero copies

Today `siteOrigin()` is copy-pasted in six files with two different fallbacks. **Decision:** create `src/lib/seo.ts` as the single source of truth for origin, indexability, and a `buildPageMetadata()` helper. Every page's `generateMetadata` calls that helper.

*Why:* shallow metadata merging means each page must set canonical, Open Graph, Twitter and robots together. Doing that by hand in 30 files guarantees drift. A helper makes the correct thing the easy thing.

### D2. Metadata is server-only

**Decision:** metadata comes only from `generateMetadata` / `metadata` exports. No client code touches `<head>` except inside admin preview.

*Why:* the Next.js docs are explicit that metadata must be resolved on the server so it is in the initial HTML. Client-side overrides create two versions of the page (raw HTML vs rendered DOM) and Google may pick the wrong one.

### D3. One canonical host: `https://zigma-technologies.com` (apex, HTTPS, no trailing slash)

**Decision:** apex is canonical (it is already `NEXT_PUBLIC_SITE_URL` in `deploy-prod.yml` and your hosting guide). nginx 301-redirects `www` and `http` to it.

*Why:* one URL per piece of content. Every duplicate host splits link equity and crawl budget.

### D4. Indexing is opt-in per environment

**Decision:** a build-time flag `NEXT_PUBLIC_SEO_INDEXABLE=true` is set **only** in `deploy-prod.yml`. Everywhere else (local, PreProd) the site sends `noindex` via both a `<meta name="robots">` tag and an `X-Robots-Tag` header.

*Why:* fail-safe. Forgetting a flag on PreProd leaves it hidden (safe); the only way to be indexed is to explicitly be production. It uses a `NEXT_PUBLIC_` variable because your workflows already configure the build that way (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`), and the value is baked into the release artifact so it cannot be lost on the server.

### D5. Quality over quantity for programmatic pages

**Decision:** a page is indexable only if it has substantial unique content. City×service and translated pages start `noindex, follow` and are promoted to indexable one by one as real content is written (allowlist).

*Why:* Google's March 2024 core update and spam policies target "scaled content abuse". A few thin templated pages can lower quality signals for the whole domain. `noindex, follow` keeps them useful for users and keeps link equity flowing without the risk.

### D6. Structured data describes only what is visible and true

**Decision:** JSON-LD rendered server-side with a single `<JsonLd>` component; one `@id`-linked graph (Organization ↔ WebSite ↔ page entities); no self-serving reviews; no fake offers.

*Why:* Google's structured-data policies penalise markup that does not match visible content. Linked `@id`s help Google (and AI answer engines) build a consistent entity for "Zigma Technologies".

### D7. CMS-first SEO controls

**Decision:** editors control meta title, description, OG image and noindex for CMS pages, catalog items and resources from the admin panel, with sensible automatic fallbacks.

*Why:* this project is CMS-driven. SEO that requires a developer for every title change will not get done.

---

## Phase 0 — Baseline and tooling (Day 1)

You cannot prove improvement without a baseline. Do this **before** changing code.

### 0.1 Verify Google Search Console (GSC) — Domain property

**What:** Add a *Domain* property for `zigma-technologies.com`.
**Why:** A Domain property covers apex, `www`, `http` and `https` in one report, so you can see the duplicate-host problem and its fix.
**How:**
1. Go to <https://search.google.com/search-console> → Add property → **Domain** → `zigma-technologies.com`.
2. Copy the TXT record Google shows.
3. Add it at your DNS provider (BigRock / UrbanVendo — whichever answers `nslookup -type=NS zigma-technologies.com`). Host `@`, type `TXT`. Do not touch MX records.
4. Wait 5–60 minutes → Verify.

**Expect:** Property verified. Data appears within 1–3 days (historical data is backfilled if the domain was ever verified before).

### 0.2 Bing Webmaster Tools

**How:** <https://www.bing.com/webmasters> → Sign in → **Import from Google Search Console**.
**Why:** Bing powers Bing, DuckDuckGo, Yahoo, and ChatGPT search results. Two minutes of work.

### 0.3 Confirm GA4 is collecting

**How:** Admin → Site Settings → confirm the GA4 Measurement ID is set (`ga4MeasurementId`). In GA4 → Admin → Data streams, confirm events arrive. Mark `enquiry_submit`, `callback_submit`, `brochure_download` as **Key events** (these are already fired by `src/lib/analytics.ts`).
**Link GA4 ↔ GSC:** GA4 Admin → Product links → Search Console links.
**Why:** Rankings are a means; enquiries are the goal. You need to attribute enquiries to organic search.

### 0.4 Record the baseline

Create a spreadsheet `SEO Baseline – <date>` with:

| Metric | Where | Value today |
| --- | --- | --- |
| Indexed pages | GSC → Indexing → Pages | |
| "Duplicate, Google chose different canonical" count | same | |
| Clicks / impressions (last 3 months) | GSC → Performance | |
| Top 20 queries and positions | same | |
| Organic sessions + key events | GA4 → Acquisition | |
| Lighthouse Performance / SEO / Accessibility (home, /projects, one project, one location) | `npm run lighthouse:home` or PageSpeed Insights | |
| LCP / INP / CLS field data | <https://pagespeed.web.dev> (CrUX section) | |
| `site:zigma-technologies.com` and `site:justxsystems.com/zigma-technologies` result counts | Google | |

### 0.5 Crawl the site

**How:** Install **Screaming Frog SEO Spider** (free up to 500 URLs). Crawl `https://zigma-technologies.com`. Export: Page titles, Meta descriptions, Canonicals, H1, Response codes, Images missing alt.
**Why:** You will re-crawl after Phase 1 to prove every page now has a self-canonical, a unique title, one H1, etc.

---

## Phase 1 — Critical technical fixes (Week 1)

Branch: `git checkout -b seo/phase-1-technical`

### Step 1.1 — Create the central SEO module

**What:** New file `src/lib/seo.ts`.
**Why:** Implements decisions D1, D2, D4. Every later step imports from here.

```ts
import type { Metadata } from 'next';

export const SITE_NAME = 'Zigma Technologies';
export const DEFAULT_LOCALE = 'en_IN';
/** 1200×630 share image. Overridden by Site Settings → OG image when set. */
export const DEFAULT_OG_IMAGE = '/assets/images/og-default.jpg';

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://zigma-technologies.com').replace(/\/$/, '');
}

/** Only builds made with NEXT_PUBLIC_SEO_INDEXABLE=true (production) may be indexed. */
export function isIndexable(): boolean {
  return process.env.NEXT_PUBLIC_SEO_INDEXABLE === 'true';
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteOrigin()}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function plainText(html: string | null | undefined): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function clampDescription(text: string, max = 160): string {
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/** Titles that already contain the brand bypass the root "%s | Zigma Technologies" template. */
export function pageTitle(raw: string): NonNullable<Metadata['title']> {
  const t = raw.trim();
  return t.toLowerCase().includes(SITE_NAME.toLowerCase()) ? { absolute: t } : t;
}

export type PageSeoInput = {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. `/projects/abc`. Becomes the canonical URL. */
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  noindex?: boolean;
  /** hreflang map, e.g. { 'en-IN': '/locations/pune', 'x-default': '/locations/pune' } */
  languages?: Record<string, string>;
};

export function buildPageMetadata(input: PageSeoInput): Metadata {
  const description = clampDescription(input.description);
  const image = input.image || DEFAULT_OG_IMAGE;
  const socialTitle = input.title.trim();
  const indexable = isIndexable() && !input.noindex;

  return {
    title: pageTitle(input.title),
    description,
    alternates: {
      canonical: input.path,
      ...(input.languages ? { languages: input.languages } : {}),
    },
    openGraph: {
      type: input.type || 'website',
      url: input.path,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      title: socialTitle,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: input.imageAlt || socialTitle }],
      ...(input.type === 'article'
        ? {
            ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
            ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
        }
      : { index: false, follow: true },
  };
}
```

Then replace every local `siteOrigin()` copy with the import. Find them with:

```powershell
rg "NEXT_PUBLIC_SITE_URL \|\|" src
```

Files to update: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/cms-seo.ts`, `src/components/OrganizationJsonLd.tsx`, `src/lib/catalog-case-study-page.tsx`, `src/app/(site)/resources/[slug]/page.tsx`, `src/app/layout.tsx`.

**Verify:** `npm run typecheck` passes; `rg "www.zigma-technologies.com" src --glob "!src/lib/admin-guide*"` returns nothing.

### Step 1.2 — Fix the root layout (removes the homepage canonical bug)

**What:** Edit `src/app/layout.tsx` `generateMetadata`.
**Why:** Fixes P1 (homepage canonical inherited everywhere), P13 (logo as OG image), P17, and adds verification tags.

Change it to:

```ts
import { DEFAULT_OG_IMAGE, SITE_NAME, isIndexable, siteOrigin } from '@/lib/seo';

const TITLE = 'Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India';
const DESCRIPTION = '…keep the existing description…';

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: TITLE, template: `%s | ${SITE_NAME}` },
    description: DESCRIPTION,
    applicationName: SITE_NAME,
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'Zigma', statusBarStyle: 'black-translucent' },
    authors: [{ name: SITE_NAME, url: siteOrigin() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: { telephone: false },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: SITE_NAME,
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
    robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: true },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
        : undefined,
    },
    // NOTE: no `alternates.canonical` here — each page sets its own.
  };
}
```

Key points:
- **Remove** `alternates: { canonical: SITE_URL }`. This single line is the most damaging bug on the site.
- Remove `keywords` (Google ignores it; see Appendix D). Harmless to keep, but it is noise.
- Remove `twitter.site` unless `@zigmatech` is a real, active account.
- Create the OG image: design a **1200×630 JPG** (brand colours, logo, tagline "Solar EPC · UPS · BESS · EV Charging", a real project photo). Upload it via **Admin → Media** so it lands at `/assets/images/og-default.jpg`, then also set it in **Admin → Site Settings → OG image**.

**Verify (local, `npm run dev`):** view-source of `/projects` must **not** contain `<link rel="canonical" href="https://zigma-technologies.com"/>`.

### Step 1.3 — Delete client-side meta overwriting

**What:** Stop `SiteSeo` and friends from rewriting `<head>`.
**Why:** Fixes P2 (decision D2).

1. `src/app/(site)/layout.tsx`: remove `import SiteSeo …` and `<SiteSeo />`.
2. `src/app/(site)/_components/CatalogPageClient.tsx`: delete the `useEffect` that fetches `/api/public/site-settings` and calls `applyDocumentSeo` (around line 666). Metadata for listing pages is set server-side in Step 1.5.
3. `src/components/CmsPageClient.tsx`: keep `applyDocumentSeo` **only** for the preview branch (when `isPreview` is true). For normal visits the server already sent correct metadata.
4. `src/components/SiteSeo.tsx`: delete the default `SiteSeo` component; keep `applyDocumentSeo` only if preview still uses it.

**Verify:** In Chrome, open `/projects`, DevTools → Elements → `<head>` → the description equals the one in view-source (not the site-wide default).

### Step 1.4 — Fix duplicated brand in titles

**What:** Page titles pass the *short* title; the root template appends the brand.
**Why:** Fixes P5. Google shows ~55–60 characters; wasting 22 of them on a duplicate brand hurts click-through rate.

Rule for every `generateMetadata` / `metadata`:
- ✅ `title: 'UPS AMC in Bengaluru'` → renders `UPS AMC in Bengaluru | Zigma Technologies`
- ❌ `title: 'UPS AMC in Bengaluru | Zigma Technologies'`
- For CMS/editor-entered titles use `pageTitle()` (it auto-detects the brand and uses `absolute`).

`buildPageMetadata()` already does this — Step 1.5 moves all pages onto it.

### Step 1.5 — Put every public page on `buildPageMetadata`

**What:** Rewrite each page's metadata to use the helper so each page gets: self-canonical, full Open Graph, Twitter, robots.
**Why:** Fixes P1, P5, P6 at the page level.

Work through this list (tick each off). Examples for the main patterns follow.

| File | Title (short) | Canonical path | Notes |
| --- | --- | --- | --- |
| `src/lib/cms-seo.ts` (home + all CMS pages) | `meta_title \|\| title` | `/` or `/${slug}` | Home: use `absolute` title from `meta_title` or the root default. |
| `projects/page.tsx`, `products/page.tsx`, `services/page.tsx` | e.g. `Solar, UPS & BESS Projects` | `/projects` etc. | Query-string variants (`?category=`, `?q=`) automatically canonicalise to the clean path. |
| `projects/[slug]`, `products/[slug]`, `services/[slug]` via `catalog-case-study-page.tsx` | `item.title` + label | `catalogPublicPath(type, slug)` | `type: 'article'` for projects. |
| `resources/page.tsx` | hub title | `/resources` | `noindex: Boolean(tag)` for `?tag=` views. |
| `resources/[slug]` | `meta_title \|\| title` | `/resources/${slug}` | `type: 'article'`, `publishedTime`, `modifiedTime`. |
| `press/page.tsx`, `press/[slug]` | | `/press`, `/press/${slug}` | article for detail. |
| `industries/page.tsx`, `industries/[slug]` | | `/industries`, `/industries/${slug}` | |
| `locations/page.tsx`, `locations/[slug]`, `locations/[slug]/[service]` | | own path | hreflang in Phase 6. |
| `hi/page.tsx`, `kn/page.tsx`, `hi/locations/[slug]`, `kn/locations/[slug]` | | own path | Phase 6 decides index/noindex. |
| `contact`, `careers`, `certifications`, `sla`, `cookies` | | own path | |
| `tools/solution-finder`, `tools/ups-calculator`, `tools/solar-roi` | | own path | Calculators are great link-bait; keep indexable. |
| `thank-you`, `search`, `partner`, `partner/login` | | own path | **`noindex: true`** |
| `(ztools-portal)/layout.tsx` | — | — | `export const metadata = { robots: { index: false, follow: false } }` |
| `(admin)/admin/layout.tsx` | — | — | same as ztools |

**Example — CMS pages (`src/lib/cms-seo.ts`):**

```ts
import type { Metadata } from 'next';
import { getPageBySlug, getThemeSettings } from '@/lib/cms';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '@/lib/site-settings';
import { buildPageMetadata } from '@/lib/seo';

export async function buildCmsMetadata(slug: string): Promise<Metadata> {
  const [page, theme] = await Promise.all([
    getPageBySlug(slug, false).catch(() => null),
    getThemeSettings().catch(() => ({}) as Awaited<ReturnType<typeof getThemeSettings>>),
  ]);
  const site = mergeSiteSettings(theme?.site);
  const isHome = slug === 'home';
  return buildPageMetadata({
    title: page?.meta_title || page?.title || (isHome ? site.companyName : slug),
    description: page?.meta_description || site.defaultMetaDescription || DEFAULT_SITE_SETTINGS.defaultMetaDescription,
    path: isHome ? '/' : `/${slug}`,
    image: site.ogImage || null,
  });
}
```

For the home page, write a `meta_title` in **Admin → Pages → Home** that contains the brand (e.g. `Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India`); `pageTitle()` will then render it verbatim without the template.

**Example — catalog detail (`src/lib/catalog-case-study-page.tsx`):**

```ts
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/lib/seo';

export async function buildCatalogCaseStudyMetadata(itemType: CatalogItemType, slug: string): Promise<Metadata> {
  const item = await getCatalogItemBySlug(itemType, slug);
  if (!item) notFound();
  const label = caseStudyLabel(itemType);
  return buildPageMetadata({
    title: `${item.title} — ${label}`,
    description: item.summary || item.description || `${label} by Zigma Technologies`,
    path: catalogPublicPath(itemType, item.slug),
    image: item.primary_image,
    imageAlt: item.title,
    type: itemType === 'project' ? 'article' : 'website',
    modifiedTime: item.updated_at,
  });
}
```

(`clampDescription` inside the helper strips HTML from `description`, so rich-text bodies are safe to pass.)

**Example — listing page (`src/app/(site)/projects/page.tsx`):**

```ts
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Solar, UPS & Battery Energy Projects',
  description:
    'Case studies of solar EPC, industrial UPS, BESS and EV charging projects delivered by Zigma Technologies across India — scope, capacity and outcomes.',
  path: '/projects',
});
```

**Example — noindex utility page (`src/app/(site)/thank-you/page.tsx`):**

```ts
export const metadata = buildPageMetadata({
  title: 'Thank you',
  description: 'Your enquiry has been received.',
  path: '/thank-you',
  noindex: true,
});
```

**Verify:** after the dev server is running, run the script in [Appendix C](#appendix-c--verification-commands). Every URL must print a canonical equal to its own URL, one title without a doubled brand, and a description.

### Step 1.6 — Hide PreProd and local from search engines

**What:** Environment gate (decision D4).
**Why:** Fixes P3.

1. **`.github/workflows/deploy-prod.yml`** — in the build step's `env:` (next to `NEXT_PUBLIC_SITE_URL: https://zigma-technologies.com`) add:

   ```yaml
   NEXT_PUBLIC_SEO_INDEXABLE: 'true'
   ```

   Do **not** add it to `deploy-preprod.yml` or `deploy-preprod-self-hosted.yml`.

2. **`next.config.ts`** — add an `X-Robots-Tag` header for non-production builds (inside `headers()`):

   ```ts
   async headers() {
     const noindex = process.env.NEXT_PUBLIC_SEO_INDEXABLE === 'true'
       ? []
       : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
     return [
       {
         source: '/(.*)',
         headers: [
           { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
           // …existing headers…
           ...noindex,
         ],
       },
     ];
   },
   ```

3. **`src/app/robots.ts`**:

   ```ts
   import type { MetadataRoute } from 'next';
   import { isIndexable, siteOrigin } from '@/lib/seo';

   export default function robots(): MetadataRoute.Robots {
     if (!isIndexable()) {
       return { rules: { userAgent: '*', disallow: '/' } };
     }
     return {
       rules: {
         userAgent: '*',
         allow: '/',
         disallow: ['/admin/', '/api/admin/', '/api/partner/', '/api/ztools/', '/ztools/', '/partner/'],
       },
       sitemap: `${siteOrigin()}/sitemap.xml`,
       host: siteOrigin(),
     };
   }
   ```

   Do **not** disallow `/api/public/` yet — the catalog listing pages fetch from it in the browser, and blocking it would stop Google rendering those lists. Revisit after Step 4.2.

4. If `site:justxsystems.com/zigma-technologies` returned results in Phase 0: verify `justxsystems.com` in GSC and use **Indexing → Removals → Temporary removal** with the prefix `https://justxsystems.com/zigma-technologies/`. The `noindex` header makes the removal permanent.

**Verify:**
```powershell
curl.exe -sI https://justxsystems.com/zigma-technologies/ | Select-String "x-robots-tag"   # → noindex, nofollow
curl.exe -sI https://zigma-technologies.com/ | Select-String "x-robots-tag"                   # → (nothing)
```

### Step 1.7 — One canonical host in nginx

**What:** 301 all variants to `https://zigma-technologies.com`.
**Why:** Fixes P4 (decision D3).

On the VPS, edit the site config (`/etc/nginx/sites-available/zigma-technologies` or wherever certbot wrote it). Split `www` into its own server block:

```nginx
# www → apex (HTTPS)
server {
    listen 443 ssl;
    http2 on;
    server_name www.zigma-technologies.com;
    ssl_certificate     /etc/letsencrypt/live/zigma-technologies.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zigma-technologies.com/privkey.pem;
    return 301 https://zigma-technologies.com$request_uri;
}

# any HTTP → apex HTTPS
server {
    listen 80;
    server_name zigma-technologies.com www.zigma-technologies.com;
    return 301 https://zigma-technologies.com$request_uri;
}

# canonical
server {
    listen 443 ssl;
    http2 on;
    server_name zigma-technologies.com;
    # …existing proxy_pass config…
}
```

If `nginx -v` is older than 1.25.1, replace `listen 443 ssl; http2 on;` with `listen 443 ssl http2;`. Keep whatever `ssl_*` lines certbot already manages.

Then:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Also update the corresponding snippet in `src/lib/admin-guide-hostinger-prod.ts` (the commented-out `return 301` block around line 1364) so the in-admin guide stays correct.

**Verify:**
```powershell
curl.exe -sI https://www.zigma-technologies.com/projects   # → 301, Location: https://zigma-technologies.com/projects
curl.exe -sI http://zigma-technologies.com/projects        # → 301, Location: https://zigma-technologies.com/projects
```

### Step 1.8 — Clean up the sitemap

**What:** Only canonical, indexable, 200-status URLs; add `lastModified`.
**Why:** Fixes P9. A sitemap is a promise to Google: "these are my best URLs". Listing noindex/utility pages erodes trust in it.

In `src/app/sitemap.ts`:
1. Import `siteOrigin` and `isIndexable` from `@/lib/seo`; return `[]` when `!isIndexable()`.
2. **Remove** `/thank-you`, `/search`, `/partner/login`.
3. Add `lastModified` from `updated_at` / `published_at` for catalog items, resources, press, and CMS pages (Google uses `lastModified` when it is accurate; it ignores `priority` and `changeFrequency`).
4. For `/hi/locations/*`, `/kn/locations/*`, and `/locations/*/*`, only include the allowlisted, indexable ones (Phase 6).

**Verify:** `curl.exe -s https://zigma-technologies.com/sitemap.xml` → no thank-you/search/partner URLs; every URL returns 200 and has a self-canonical.

### Step 1.9 — One `<h1>` per page

**What:** Page heroes always render an `<h1>`, while keeping the visual size editors picked.
**Why:** Fixes P7. The H1 is the page's primary topic signal and the main landmark for screen readers.

Decouple the tag from the size in `src/components/SiteHeading.tsx`:

```tsx
export default function SiteHeading({ role, children, className, id, style, as }: Props) {
  const { settings } = useSiteShell();
  const level = as ?? headingTagForRole(settings, role);
  const Tag = (role === 'pageHero' ? 'h1' : level) as ElementType;
  const sizeClass = role === 'pageHero' ? `heading-size-${level}` : '';
  return (
    <Tag className={[className, sizeClass].filter(Boolean).join(' ') || undefined} id={id} style={style}>
      {children}
    </Tag>
  );
}
```

And in `src/app/globals.css` (next to the existing `h1{font-size:var(--text-h1);}` rules):

```css
h1.heading-size-h2{font-size:var(--text-h2);}
h1.heading-size-h3{font-size:var(--text-h3);}
```

Then:
- **Home hero slider** (`SectionRenderer.tsx`): only the **first** slide's heading should be `pageHero` (`h1`); the other slides should use `role="section"` so the page has exactly one H1.
- Hard-coded `<h3>` page titles in `hi/locations/[slug]/page.tsx` and `kn/locations/[slug]/page.tsx` → `<h1>`.
- Grep for any hero-specific CSS that targets `h3` (e.g. `.page-hero h3`) and add the `h1` equivalent.

**Verify:** On every page type, DevTools console: `document.querySelectorAll('h1').length` → `1`. Visually compare before/after screenshots — sizes must be unchanged.

### Phase 1 — after deploying to Prod

1. GSC → **Sitemaps** → submit `https://zigma-technologies.com/sitemap.xml`.
2. GSC → **URL Inspection** → inspect home, `/projects`, one project, one location → **Request indexing** (max ~10/day; do the most important pages).
3. Re-crawl with Screaming Frog; compare with the Phase 0 export.
4. Update the baseline sheet with the date of this deploy (so you can correlate later changes).

**Expect:** Within 1–3 weeks, "Duplicate, Google chose different canonical than user" drops and "Indexed" rises in GSC → Pages.

---

## Phase 2 — Structured data (JSON-LD) done right (Week 1–2)

Branch: `seo/phase-2-schema`

### Step 2.1 — A single, safe JSON-LD component

**What:** `src/components/JsonLd.tsx`.
**Why:** Fixes P11. Native `<script>` in server HTML (Next.js recommendation) and escapes `<` to prevent script injection from CMS text.

```tsx
type Props = { data: Record<string, unknown> | Record<string, unknown>[] };

export default function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
```

Replace **all** existing JSON-LD `<script>` / `<Script>` usages with `<JsonLd data={…} />`:
`OrganizationJsonLd.tsx`, `projects/[slug]`, `products/[slug]`, `services/[slug]`, `resources/[slug]`, `IndustryLandingView.tsx`, `CatalogCaseStudyView.tsx` (VideoObject), `TestimonialsStrip.tsx`.

Optional: `npm i -D schema-dts` to type the objects (`WithContext<Organization>` etc.).

### Step 2.2 — Site-wide entity graph (Organization + WebSite)

**What:** Upgrade `OrganizationJsonLd.tsx` to output a `@graph` with stable `@id`s.
**Why:** Decision D6. Stable IDs let every page reference the same organization, which is how Google (and AI answer engines) consolidate your brand entity and show the knowledge panel / logo.

```ts
const org = {
  '@type': ['Organization', 'LocalBusiness'],
  '@id': `${base}/#organization`,
  name: site.companyName,
  alternateName: 'Zigma',
  url: `${base}/`,
  logo: { '@type': 'ImageObject', '@id': `${base}/#logo`, url: logoUrl, width: 512, height: 512 },
  image: { '@id': `${base}/#logo` },
  description: site.defaultMetaDescription,
  foundingDate: '2006',
  telephone: site.phone,
  email: site.email,
  address: { /* existing PostalAddress */ },
  geo: { '@type': 'GeoCoordinates', latitude: 12.97, longitude: 77.59 },   // exact office coordinates from Google Maps
  hasMap: 'https://maps.google.com/?cid=YOUR_GBP_CID',                    // after Phase 5
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '09:30', closes: '18:30',
  }],
  areaServed: { '@type': 'Country', name: 'India' },
  contactPoint: [ /* existing */ ],
  knowsAbout: [ /* existing */ ],
  sameAs,   // LinkedIn, YouTube, Facebook, GBP URL, IndiaMART profile…
};

const website = {
  '@type': 'WebSite',
  '@id': `${base}/#website`,
  url: `${base}/`,
  name: site.companyName,
  publisher: { '@id': `${base}/#organization` },
  inLanguage: 'en-IN',
};

return <JsonLd data={{ '@context': 'https://schema.org', '@graph': [org, website] }} />;
```

Fill `geo`, opening hours, and `hasMap` with **real** values only (they must match your Google Business Profile exactly).

### Step 2.3 — Remove self-serving review markup

**What:** In `src/lib/testimonials.ts`, stop emitting `aggregateRating` / `review` on your own `Organization`. Remove the JSON-LD from `TestimonialsStrip.tsx` entirely.
**Why:** Fixes P10. Google's review-snippet policy: reviews of a business published on that business's own site are "self-serving" and not eligible. Keeping them risks a manual action. The testimonials themselves (visible HTML) remain valuable for users and conversion — keep showing them.

Real star ratings in Google come from **Google Business Profile reviews** (Phase 5), not from markup.

### Step 2.4 — Page-level schema reference

Use this mapping. Every entity references the organization by `@id` instead of repeating it.

| Page | Schema types | Required fields to include |
| --- | --- | --- |
| All pages except home | `BreadcrumbList` | Absolute `item` URLs matching the visible breadcrumb |
| `/projects/[slug]` | `Article` (or `CreativeWork`) + `BreadcrumbList` (+ `VideoObject` if video) | `headline`, `image` (absolute), `datePublished`, `dateModified`, `author`/`publisher: {'@id': …#organization}` |
| `/services/[slug]` | `Service` + `BreadcrumbList` | `name`, `description`, `serviceType`, `provider: {'@id': …#organization}`, `areaServed` |
| `/products/[slug]` | `Product` + `BreadcrumbList` | `name`, `image`, `description`, `brand`. **Only** add `offers` if you show a real price (`price` + `priceCurrency`). Without price, omit `offers` — do not add empty offers. |
| `/resources/[slug]` | `Article` (or `TechArticle`) + `BreadcrumbList` | `headline`, `image`, `datePublished`, `dateModified`, `author` (a real **Person** with name + job title is best for E-E-A-T), `publisher` |
| `/press/[slug]` | `NewsArticle` + `BreadcrumbList` | same as Article |
| `/locations/[city]/[service]` | `Service` with `areaServed: { '@type': 'City', name }` + `BreadcrumbList` | |
| `/careers` (if open roles are listed) | `JobPosting` per role | `title`, `description`, `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`, `employmentType`. Google Jobs is free, high-intent traffic. |
| `/industries/[slug]` | `WebPage` + `BreadcrumbList`; keep `FAQPage` only if the FAQ is visible | Note: FAQ rich results are restricted to government/health sites since 2023 — FAQ markup still helps understanding but will not show stars/accordions. |

Fix in existing code while you are there:
- `resources/[slug]/page.tsx`: add `dateModified`, `publisher: { '@id': \`${origin}/#organization\` }`, `mainEntityOfPage`, and a `BreadcrumbList`.
- `catalog-case-study-page.tsx`: make `image` absolute with `absoluteUrl()`; Product `offers` only when a numeric price exists (today it emits an `Offer` with no `price`, which is invalid).

**Verify:** For each page type, paste the URL into the [Rich Results Test](https://search.google.com/test/rich-results) and the [Schema Markup Validator](https://validator.schema.org/). Zero errors. Warnings about optional fields are acceptable.

**Expect:** Breadcrumb trails in search results within 2–6 weeks; GSC → **Enhancements** shows Breadcrumbs / Products / Videos reports.

---

## Phase 3 — CMS SEO fields for editors (Week 2)

Branch: `seo/phase-3-cms-fields`

### Step 3.1 — Database migration

**What:** New file `scripts/migrate-seo-fields.sql` (same pattern as your other `migrate-*.sql` files), and add the columns to `scripts/schema.sql` for fresh installs. If `src/lib/schema-ensure.ts` auto-adds columns, register them there too.
**Why:** Fixes P16 and decision D7.

```sql
ALTER TABLE catalog_items
  ADD COLUMN meta_title VARCHAR(255) NULL AFTER description,
  ADD COLUMN meta_description VARCHAR(320) NULL AFTER meta_title,
  ADD COLUMN og_image_url VARCHAR(500) NULL AFTER meta_description,
  ADD COLUMN seo_noindex TINYINT(1) NOT NULL DEFAULT 0 AFTER og_image_url;

ALTER TABLE pages
  ADD COLUMN og_image_url VARCHAR(500) NULL AFTER meta_description,
  ADD COLUMN seo_noindex TINYINT(1) NOT NULL DEFAULT 0 AFTER og_image_url;

ALTER TABLE resource_posts
  ADD COLUMN seo_noindex TINYINT(1) NOT NULL DEFAULT 0;
```

Run on local → PreProd → Prod (`npm run db:push` or your usual migration path). Take a DB backup first (`npm run db:export`).

### Step 3.2 — Wire into types, queries, API and metadata

1. Add the fields to `CatalogItem` in `src/lib/types.ts`, the page type in `src/lib/cms-types.ts`, and the resource type in `src/lib/resources.ts`.
2. Include them in the SELECT/INSERT/UPDATE of `src/lib/catalog.ts`, `src/lib/cms.ts`, `src/lib/resources.ts`, and in the zod schemas of the admin routes (`api/admin/catalog/[id]`, `api/admin/pages/[id]`, `api/admin/resources/[id]`).
3. In the metadata builders: `title: item.meta_title || item.title`, `description: item.meta_description || item.summary || …`, `image: item.og_image_url || item.primary_image`, `noindex: Boolean(item.seo_noindex)`.
4. In `sitemap.ts`, skip rows with `seo_noindex = 1`.

### Step 3.3 — Admin UI: an "SEO" collapsible on every editor

Add a reusable `src/components/admin/SeoFieldsEditor.tsx` (use your existing `AdminCollapsible`) with:

- **Meta title** input + live counter (green ≤ 60, amber 61–65, red > 65).
- **Meta description** textarea + counter (green 120–160).
- **OG image** via the existing `MediaPicker` (hint: 1200×630).
- **Hide from search engines** checkbox → `seo_noindex`.
- **Google preview**: a small box rendering title (blue), URL (green), description (grey) the way a search result looks.

Place it in: Pages editor (`admin/pages/[id]`), Catalog item editor (`admin/inventory`), Resources editor, Press editor.

### Step 3.4 — Make image alt text part of the workflow

- In `MediaPicker` / catalog media editor, show the `alt` field prominently and warn when it is empty.
- Alt text rule: describe the image for someone who cannot see it, include the subject naturally — e.g. `500 kWp rooftop solar plant on a manufacturing unit in Hosur` — not `solar solar panels best solar company`.
- Decorative images keep `alt=""` (as `resources/page.tsx` already does for card thumbnails that sit next to a text title).

### Step 3.5 — Slug-change safety net

**What:** When an editor changes the slug of a published page, catalog item, resource or press post, automatically insert a 301 row into the `redirects` table (`old path → new path`).
**Why:** Changing a URL without a redirect throws away all its rankings and backlinks. Your redirects system exists; this just makes it automatic.

**Verify (whole phase):** Edit a catalog item's meta title in admin → view-source of its page shows the new title within one request (the public site is request-time rendered).

---

## Phase 4 — Crawlability and Core Web Vitals (Week 2–3)

Branch: `seo/phase-4-performance`

Core Web Vitals (LCP < 2.5 s, INP < 200 ms, CLS < 0.1 at the 75th percentile of real users) are a confirmed ranking signal and — more importantly — directly affect enquiry conversion on mobile.

### Step 4.1 — Self-host fonts with `next/font`

**What:** Replace the Google Fonts `<link>` in `src/app/layout.tsx`.
**Why:** The current `<link rel="stylesheet">` is render-blocking and fetched from a third party. `next/font` self-hosts, preloads, and sets `size-adjust` to eliminate layout shift. (Docs: `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`.)

```tsx
import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-plex-mono', display: 'swap' });

// <html lang="en" className={`${inter.variable} ${grotesk.variable} ${plexMono.variable}`} …>
```

Then point the CSS font-family tokens in `globals.css` / theme tokens at `var(--font-inter)` etc., remove the three `fonts.googleapis.com` / `fonts.gstatic.com` tags, and remove those hosts from the CSP in `next.config.ts`.

Note: `LogoFontPicker` may load other Google fonts dynamically for the logo — leave that path as is, or limit it to fonts you preload.

### Step 4.2 — Server-render the first page of catalog listings

**What:** `projects/page.tsx`, `products/page.tsx`, `services/page.tsx` fetch the initial items on the server (`listCatalogItems`) and pass them to `CatalogPageClient` as `initialItems` / `initialCategories`. The client only fetches when filters change.
**Why:** Fixes P12. Real `<a href="/projects/…">` links in the initial HTML = reliable discovery and internal link equity to every case study; also faster LCP (no fetch waterfall). This is the same pattern `CmsPageShell` → `CmsPageClient` already uses.

After this ships you may add `'/api/public/'` to `robots.ts` disallow (optional — only if no public page still depends on browser fetches from it for primary content).

### Step 4.3 — Images

- Use `SmartImage` / `next/image` for every content image above the fold; the LCP image (hero) gets `priority` and a correct `sizes` (e.g. `sizes="100vw"` for full-bleed heroes).
- Convert the remaining raw `<img>` tags on public pages (`LocationLandingView`, `IndustryLandingView`, `ResourceDetailView`, `resources/page.tsx`, `CatalogCaseStudyView`, `SocialProofStrip`, `CertMarquee`) to `SmartImage` where possible. `next/image` serves AVIF/WebP at the right size automatically.
- Every `<img>` must have `width`/`height` (or `fill` inside a sized container) to prevent CLS.
- Hero videos: add a `poster` image and `preload="none"` / `preload="metadata"`.
- Compress uploads: reject or warn on images > 500 KB in the media library (`media-upload-rules.ts`).

### Step 4.4 — Cache the CMS reads (reduce TTFB)

**What:** Measure first. If **TTFB > 600 ms** (PageSpeed Insights → "Server response time"), cache the hot MySQL reads.
**Why:** `(site)/layout.tsx` is `force-dynamic` and hits MySQL on every request. Crawlers and users both pay that cost.

Least-invasive approach, compatible with your current setup (no Cache Components migration required — see `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`):

```ts
import { unstable_cache } from 'next/cache';

export const getSiteCopyCached = unstable_cache(getSiteCopy, ['site-copy'], {
  tags: ['site-copy'],
  revalidate: 3600,
});
```

And in the admin API routes that save that data:

```ts
import { revalidateTag } from 'next/cache';
revalidateTag('site-copy', 'max');   // Next 16 requires the second argument
```

Apply the same to theme/site settings, nav, catalog lists, and resource lists, with one tag per data type. Extend `src/lib/revalidate-public-shell.ts` to call the relevant `revalidateTag`s.

### Step 4.5 — nginx compression and static caching

In the canonical server block:

```nginx
gzip on;
gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;
gzip_min_length 1024;

location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;   # your existing upstream
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

(Enable Brotli too if the Hostinger nginx build includes the module.)

**Verify (whole phase):** PageSpeed Insights mobile on home, `/projects`, one project page: Performance ≥ 85, LCP < 2.5 s, CLS < 0.1. `npm run lighthouse:home` passes `scripts/lighthouse-budget.json`. Field data (CrUX) updates over ~28 days.

---

## Phase 5 — Local SEO (start in parallel, highest ROI)

For a B2B power-engineering company headquartered in Bengaluru, **Google Business Profile (GBP) is usually the single biggest driver of enquiries** from searches like "UPS service near me", "solar EPC company Bangalore". This phase is mostly non-code — start it on Day 1 alongside Phase 1.

### Step 5.1 — Claim and complete Google Business Profile

1. <https://business.google.com> → claim/create "Zigma Technologies" at the **real** office address.
2. **Primary category:** pick the closest match to your main revenue line (e.g. *Solar energy company*, or *Electrical engineer* / *Power plant equipment supplier*). **Secondary categories:** UPS supplier, Battery store/wholesaler, Electric vehicle charging station contractor, Electrical installation service, etc. — only what you actually do.
3. Services: list each service (Solar EPC, UPS AMC, BESS, EV charging, field services) with a short description.
4. Service areas: Bengaluru + the cities you truly serve (max 20).
5. Hours, phone (same number as the website header), website URL `https://zigma-technologies.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp` (UTM lets GA4 separate GBP traffic).
6. Photos: 20+ real photos — team, office, installations, vehicles, certificates. Add new photos monthly.
7. Posts: one GBP post per week (a project completed, a guide published, an offer).

**Do not** create GBP listings for cities where you have no staffed office — that violates Google's guidelines and gets listings suspended. Use service areas instead.

### Step 5.2 — NAP consistency

**NAP = Name, Address, Phone.** It must be *character-for-character identical* on: the website footer, `OrganizationJsonLd`, GBP, and every directory.
- Decide the canonical format once (e.g. `Zigma Technologies Pvt. Ltd., No. X, Y Road, Z Area, Bengaluru, Karnataka 5600XX, +91 80 XXXX XXXX`).
- Store it in **Admin → Site Settings** (address fields feed both footer and JSON-LD already).

### Step 5.3 — Citations (business directories)

Create or clean up listings with identical NAP on: **IndiaMART, TradeIndia, Justdial, Sulekha, ExportersIndia**, Bing Places (import from GBP), Apple Business Connect, LinkedIn Company Page, Facebook Page, YouTube channel, and relevant associations (e.g. solar/electrical industry bodies, local chambers of commerce). Add each profile URL to `sameAs` (Site Settings → social links).

### Step 5.4 — Reviews engine

- After every completed project / AMC renewal, send the client a short GBP review link (GBP → "Ask for reviews" gives you the link). Add it to your project-closure email template (`src/lib/mail.ts` flows) and WhatsApp follow-up.
- Target: 2–4 genuine reviews per month. Reply to every review within 48 hours, mentioning the service and city naturally.
- Never buy or incentivise reviews.

**Expect:** Map-pack visibility for Bengaluru searches within 1–3 months; GBP → Performance shows calls, website clicks, direction requests.

---

## Phase 6 — Location, language and programmatic pages (Week 3–4)

Branch: `seo/phase-6-locations`

This phase fixes P8 and P15 and turns the location pages from a risk into an asset.

### Step 6.1 — Indexability allowlist for city×service pages

**What:** In `src/lib/location-services.ts` add an allowlist and a content map:

```ts
/** Only pairs with written, unique content are indexable. Add pairs as content is produced. */
export const INDEXABLE_CITY_SERVICES = new Set<string>([
  // 'bengaluru/ups-amc',
]);

export function isCityServiceIndexable(city: string, service: string) {
  return INDEXABLE_CITY_SERVICES.has(`${city}/${service}`);
}
```

- `locations/[slug]/[service]/page.tsx` metadata: `noindex: !isCityServiceIndexable(slug, serviceKey)`.
- `sitemap.ts`: include only indexable pairs.

**Why:** Decision D5. The pages keep working for users (and internal links still pass value via `follow`), but Google only indexes the ones that deserve it.

### Step 6.2 — What "unique content" means (the bar to enter the allowlist)

Before adding a pair, the page must have (store per-pair content in the CMS or a `CITY_SERVICE_CONTENT` map):

1. **300–600 words** written for that city + service (not a find-and-replace template).
2. **Local proof:** at least one real project/client in or near that city (link to the case study), with numbers (kVA, kWp, uptime, savings).
3. **Local specifics:** response time / SLA for that city, where the service team is based, local grid/DISCOM or industrial-area context (e.g. Peenya, Whitefield, Bommasandra for Bengaluru).
4. **Unique FAQ** (3–5 questions people in that city actually ask — use GSC queries and "People also ask").
5. Relevant catalog items (already rendered) + CTA.

Start with **Bengaluru × all 6 services** (your HQ — strongest real proof), then expand city by city where you have genuine projects.

### Step 6.3 — City hub pages (`/locations/[slug]`)

Keep indexed, but enrich each to the same bar: real projects in the city, service list linking to indexable city×service pages, service-area description, and a map only if you have an office there. Add `canonical` (the helper does it) and a `BreadcrumbList`.

### Step 6.4 — Hindi and Kannada pages

Current state: `/hi` and `/kn` home pages use locale copy from the CMS; only `bengaluru` has a Hindi city translation — the other city pages fall back to English.

Rules (Google's multilingual guidance):
- A page in `/hi/…` must be **fully in Hindi** (headings, body, CTAs). Machine-translated boilerplate = thin content.
- Indexable only when translated: in `hi/locations/[slug]` and `kn/locations/[slug]` metadata set `noindex: !HI[slug]` (resp. `!KN[slug]`), and exclude untranslated ones from the sitemap.
- **hreflang** must be reciprocal, self-referencing, include `x-default`, and only point at indexable pages. Helper:

```ts
export function localeAlternates(paths: { en: string; hi?: string | null; kn?: string | null }) {
  return {
    'en-IN': paths.en,
    ...(paths.hi ? { 'hi-IN': paths.hi } : {}),
    ...(paths.kn ? { 'kn-IN': paths.kn } : {}),
    'x-default': paths.en,
  };
}
```

  Pass `languages: localeAlternates({ en: '/locations/pune', hi: HI.pune ? '/hi/locations/pune' : null, kn: … })` on the English, Hindi and Kannada versions alike.
- **Language attribute:** wrap Hindi/Kannada page content in `<main lang="hi">` / `<main lang="kn">` (`LocaleLanding.tsx`, `hi/locations/[slug]`, `kn/locations/[slug]`). This is correct HTML, helps screen readers, and avoids restructuring root layouts. Set `openGraph.locale` to `hi_IN` / `kn_IN` on those pages.

**Business decision:** if you do not plan to invest in real Hindi/Kannada content, set `features.localesEnabled = false` in admin (the pages already redirect to `/` when disabled) and remove them from the sitemap. Fewer, better pages beat many thin ones.

**Verify:** view-source of `/locations/bengaluru` shows `hreflang="en-IN"`, `hreflang="hi-IN"` (if translated), `hreflang="x-default"`; the Hindi page shows the same set. GSC has no hreflang errors (check via Screaming Frog → Hreflang tab).

---

## Phase 7 — Content strategy and keyword plan (ongoing)

Technical fixes let Google see your pages; content is what makes them rank.

### Step 7.1 — Keyword research (half a day, once per quarter)

Tools (free first): GSC Performance (queries you already get impressions for), Google Keyword Planner (via a Google Ads account, no spend needed), Google autocomplete + "People also ask", competitor sites' page titles. Paid options: Ahrefs / Semrush / Ubersuggest.

Group keywords by **intent**:

| Intent | Example queries (validate volumes yourself) | Target page type |
| --- | --- | --- |
| Commercial-local | "UPS AMC Bangalore", "solar EPC company in Bangalore", "industrial UPS service Whitefield" | Service pages, city×service pages |
| Commercial-product | "online UPS 20 kVA", "lithium BESS for factory", "DC fast charger for office" | Product pages |
| Informational | "how to size UPS for server room", "solar ROI for factories Karnataka", "BESS vs DG set" | Resources (guides), tools |
| Navigational | "Zigma Technologies", "Zigma UPS" | Home, contact |

Build a sheet: keyword → intent → target URL → current position → priority. **One primary keyword cluster per URL** (avoid two pages competing for the same query).

### Step 7.2 — Topic-cluster architecture (hub and spoke)

For each business line (Solar EPC, UPS & power continuity, BESS, EV charging, AMC/field services):

```
Service hub (e.g. /services/ups-amc)           ← targets the head term
 ├── City×service pages (/locations/bengaluru/ups-amc)   ← local intent
 ├── Case studies (/projects/…)                  ← proof, long-tail
 ├── Products (/products/…)                      ← product intent
 └── Guides (/resources/…)                       ← informational, links back to hub
```

Internal-linking rules:
- Every guide links to its service hub and 1–2 relevant case studies with descriptive anchor text ("our UPS AMC plans in Bengaluru", not "click here").
- Every case study links to the service hub and the city page.
- Service hubs link to all their spokes.
- The main nav + footer (admin-managed) should expose each service hub and `/locations`.

### Step 7.3 — Page content standards (E-E-A-T)

Google rewards Experience, Expertise, Authoritativeness, Trust. For an engineering company that means:

- **Case studies with numbers**: client type, city, capacity (kWp / kVA / kWh), timeline, before/after, measured outcome (uptime %, ₹ saved/year, CO₂ avoided). Photos of real sites.
- **Named authors** on guides: engineer name, role, years of experience, certifications. Add an author box to `ResourceDetailView` and `author: { '@type': 'Person', … }` in JSON-LD.
- **Certifications and OEM partnerships** visible (`/certifications`, partner logos) with links to the OEM's partner listing where possible.
- **Clear contact and company info** on every page (footer NAP, GST/CIN in footer builds trust in India).
- **Freshness**: review key pages every 6 months; update `dateModified` only when content materially changes.

### Step 7.4 — Resource article template

Use this skeleton for every guide:

1. Title with the primary keyword (≤ 60 chars) + meta description with a benefit + call to action.
2. Intro (2–3 sentences) that answers the question directly — this is what Google and AI Overviews quote.
3. Table of contents for articles > 1,200 words.
4. H2 sections that match sub-questions (from "People also ask").
5. A table, checklist, or calculator embed (your UPS / Solar ROI tools are ideal).
6. "How Zigma can help" section linking to the service hub + a relevant case study.
7. Author box, published/updated date.
8. CTA (consultation modal / WhatsApp).

### Step 7.5 — Publishing cadence

- 2–4 quality guides per month beats 20 thin ones.
- 1 new case study per month (every completed project is a potential page).
- Refresh the top 10 pages by impressions every quarter (GSC → Pages → sort by impressions; improve the ones at positions 5–20 — they are closest to page-1 gains).

### Step 7.6 — Optimise for AI answers (AI Overviews, ChatGPT, Perplexity)

No special tricks are needed beyond good SEO: clear factual statements near the top of pages, consistent entity data (Organization graph from Phase 2), specific numbers, and being cited on third-party sites (Phase 8). Make sure Bing is verified (Phase 0) because ChatGPT search uses Bing's index. An `llms.txt` file is optional and has no confirmed effect on Google.

---

## Phase 8 — Authority and off-page (ongoing)

Links from relevant, trusted sites remain one of the strongest ranking factors. For a B2B engineering firm the best sources are relationships you already have:

| Source | Action |
| --- | --- |
| OEM partners (UPS, battery, inverter, charger brands) | Ask to be listed on their "authorised partner / service partner" pages with a link. |
| Clients | Ask for a case-study quote + link from their sustainability / news page for flagship projects. |
| Industry associations & chambers | Membership directories (solar associations, electrical contractors' associations, local chambers). |
| Trade media | Pitch project stories (large solar/BESS commissioning) to energy trade publications; publish on `/press`. |
| Events | Speaker / exhibitor pages at trade shows. |
| Tools | Promote the UPS calculator and Solar ROI calculator to facility-manager and IT communities — tools earn natural links. |
| Directories | Phase 5 citations. |

**Avoid:** buying links, link exchanges, PBNs, mass guest-post packages, "1000 backlinks for ₹999" offers. These trigger penalties that take months to recover from.

---

## Phase 9 — Measurement, monitoring and maintenance (ongoing)

### Weekly (15 minutes)

- GSC → **Pages**: any new "Not indexed" reasons spiking? Any 404s or 5xx?
- GSC → **Performance**: top queries/pages movement.
- GBP → reviews to reply to.

### Monthly (1 hour) — report these KPIs

| KPI | Source |
| --- | --- |
| Organic clicks, impressions, CTR, average position | GSC |
| Number of queries ranking top 3 / top 10 | GSC (export) |
| Organic sessions and **key events** (enquiries, callbacks, brochure downloads) | GA4 |
| Indexed pages vs sitemap URLs | GSC |
| Core Web Vitals status (Good / Needs improvement / Poor) | GSC → Core Web Vitals |
| GBP calls, website clicks, direction requests, new reviews | GBP |
| New referring domains | GSC → Links (or Ahrefs) |

### Quarterly

- Re-crawl with Screaming Frog; fix new issues.
- Refresh keyword research and the content calendar.
- Review which city×service pages have earned allowlist entry.

### Guardrails to add to the codebase

- **CI check (optional but recommended):** a small script run after `next build` on PreProd that fetches key URLs and asserts: status 200, exactly one `<h1>`, a self-referencing canonical, a non-empty description, no doubled brand in `<title>`. Fail the deploy if violated.
- **Redirect discipline:** never delete a page that has traffic or backlinks — 301 it to the closest relevant page via Admin → Redirects.
- **Release checklist item:** "Did this change add a new public route? → metadata via `buildPageMetadata`, added to `sitemap.ts`, added to Appendix A."

---

## Appendix A — Route-by-route SEO matrix

| Route | Indexable | Canonical | Primary schema | In sitemap |
| --- | --- | --- | --- | --- |
| `/` | Yes | `/` | Organization + WebSite (layout) | Yes |
| `/[slug]` (CMS) | Yes unless `seo_noindex` | `/${slug}` | WebPage + Breadcrumb | Yes |
| `/projects` | Yes | `/projects` (query strings → same) | CollectionPage + Breadcrumb | Yes |
| `/projects/[slug]` | Yes unless `seo_noindex` | self | Article + Breadcrumb (+ VideoObject) | Yes |
| `/products`, `/products/[slug]` | Yes | self | CollectionPage / Product + Breadcrumb | Yes |
| `/services`, `/services/[slug]` | Yes | self | CollectionPage / Service + Breadcrumb | Yes |
| `/resources` | Yes | `/resources` | CollectionPage | Yes |
| `/resources?tag=…` | **No** (noindex, follow) | `/resources` | — | No |
| `/resources/[slug]` | Yes | self | Article + Breadcrumb | Yes |
| `/press`, `/press/[slug]` | Yes | self | NewsArticle + Breadcrumb | Yes |
| `/industries`, `/industries/[slug]` | Yes (if feature enabled) | self | WebPage + Breadcrumb | Yes |
| `/locations`, `/locations/[slug]` | Yes | self | WebPage + Breadcrumb | Yes |
| `/locations/[slug]/[service]` | **Only allowlisted** | self | Service + Breadcrumb | Only allowlisted |
| `/hi`, `/kn` | Yes if locales enabled and translated | self | WebPage | Yes if indexable |
| `/hi/locations/[slug]`, `/kn/locations/[slug]` | **Only if translated** | self | WebPage | Only if translated |
| `/contact`, `/careers`, `/certifications`, `/sla`, `/cookies` | Yes | self | ContactPage / JobPosting / WebPage | Yes |
| `/tools/*` | Yes (if feature enabled) | self | WebApplication (optional) | Yes |
| `/search` | **No** | self | — | No |
| `/thank-you` | **No** | self | — | No |
| `/partner`, `/partner/login` | **No** | self | — | No |
| `/ztools/*` | **No** (+ robots disallow) | — | — | No |
| `/admin/*` | **No** (+ robots disallow) | — | — | No |

## Appendix B — Title and description formulas

**Title (≤ 60 characters before the brand suffix is added):**

| Page type | Formula | Example |
| --- | --- | --- |
| Service hub | `{Service} in {Region} — {Benefit}` | `UPS AMC in Bengaluru — 24×7 Support & 4-Hour Response` |
| City×service | `{Service} in {City}` + differentiator | `Solar EPC in Pune for Factories & Warehouses` |
| Project | `{Capacity} {Type} for {Client type}, {City}` | `500 kWp Rooftop Solar for an Auto-Parts Plant, Hosur` |
| Product | `{Model/Type} {Capacity} — {Key spec}` | `Online UPS 20 kVA — Double Conversion, Lithium Ready` |
| Guide | `{Question or How-to}` + year if timely | `How to Size a UPS for a Server Room (2026 Guide)` |

**Description (120–160 characters):** what the page offers + proof/specific + call to action.
Example: `Annual UPS maintenance for data centres, hospitals and factories in Bengaluru. OEM-trained engineers, 24×7 helpline, 4-hour response. Get a quote.`

Rules: unique per page; no keyword stuffing; write for the click, not the bot. Google rewrites ~60% of descriptions anyway — a good one still raises CTR when it is used.

## Appendix C — Verification commands

**Check title / description / canonical / robots / H1 count for a list of URLs (PowerShell):**

```powershell
$base = "http://localhost:3000"   # or https://zigma-technologies.com
$paths = "/", "/projects", "/products", "/services", "/resources", "/locations", "/locations/bengaluru", "/contact", "/thank-you"
foreach ($p in $paths) {
  $html = (Invoke-WebRequest -UseBasicParsing "$base$p").Content
  $title = [regex]::Match($html, '<title>(.*?)</title>').Groups[1].Value
  $canon = [regex]::Match($html, '<link rel="canonical" href="([^"]+)"').Groups[1].Value
  $robots = [regex]::Match($html, '<meta name="robots" content="([^"]+)"').Groups[1].Value
  $desc = [regex]::Match($html, '<meta name="description" content="([^"]+)"').Groups[1].Value
  $h1 = ([regex]::Matches($html, '<h1[\s>]')).Count
  "{0}`n  title : {1}`n  canon : {2}`n  robots: {3}`n  h1    : {4}`n  desc  : {5}`n" -f $p, $title, $canon, $robots, $h1, $desc
}
```

Pass criteria: `canon` equals the page's own URL; `title` has the brand once; `h1` = 1; `desc` is page-specific; `robots` is `noindex` only on utility pages (and everywhere on local/PreProd builds without `NEXT_PUBLIC_SEO_INDEXABLE=true`).

Note: with streaming metadata, Next.js may place metadata tags at the end of `<body>` for JavaScript-capable crawlers and in `<head>` for HTML-limited bots — both are fine. The regexes above search the whole document.

**Headers:**
```powershell
curl.exe -sI https://zigma-technologies.com/ | Select-String "x-robots-tag|content-type|cache-control"
curl.exe -sI https://www.zigma-technologies.com/ | Select-String "HTTP|location"
```

**Robots and sitemap:**
```powershell
curl.exe -s https://zigma-technologies.com/robots.txt
curl.exe -s https://zigma-technologies.com/sitemap.xml
```

**Structured data:** [Rich Results Test](https://search.google.com/test/rich-results), [Schema Markup Validator](https://validator.schema.org/).
**Social previews:** [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/), [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/).
**Performance:** [PageSpeed Insights](https://pagespeed.web.dev), `npm run lighthouse:home`.

## Appendix D — Things NOT to waste time on

- **`<meta name="keywords">`** — ignored by Google since 2009.
- **Sitemap `priority` / `changefreq`** — ignored by Google; `lastmod` is what matters (when accurate).
- **Sitelinks search box markup** — Google retired it in 2024.
- **HowTo rich results** — retired in 2023. **FAQ rich results** — limited to government/health sites since 2023.
- **Exact-match keyword density targets** — write naturally for the reader.
- **Mass-generated location pages** — see Phase 6; quality gate them.
- **Chasing a Lighthouse "SEO: 100"** — it checks basics only; it is not a ranking score.
- **Disavow files** — only needed if you receive a manual action for unnatural links.

---

### Summary checklist

- [ ] Phase 0 — GSC domain property, Bing, GA4 key events, baseline sheet, crawl
- [ ] 1.1 `src/lib/seo.ts` created; all `siteOrigin()` copies replaced
- [ ] 1.2 Root layout: canonical removed, OG image 1200×630, verification
- [ ] 1.3 `SiteSeo` / client `applyDocumentSeo` removed from public pages
- [ ] 1.4–1.5 Every page on `buildPageMetadata`; utility pages `noindex`
- [ ] 1.6 `NEXT_PUBLIC_SEO_INDEXABLE` only in prod; X-Robots-Tag on PreProd
- [ ] 1.7 nginx `www`/`http` → apex 301
- [ ] 1.8 Sitemap cleaned + `lastModified`
- [ ] 1.9 One `<h1>` per page
- [ ] Phase 2 — `JsonLd` component, entity graph, self-serving reviews removed, page schemas validated
- [ ] Phase 3 — SEO columns, admin SEO panel, alt text, auto-redirect on slug change
- [ ] Phase 4 — `next/font`, SSR catalog listings, images, caching, nginx gzip
- [ ] Phase 5 — GBP complete, NAP consistent, citations, review engine
- [ ] Phase 6 — City×service allowlist, hreflang with x-default, translated-only locale pages
- [ ] Phase 7 — Keyword map, topic clusters, content calendar running
- [ ] Phase 8 — Partner/association/client links
- [ ] Phase 9 — Weekly/monthly reporting rhythm
