# Zigma Technologies — SEO Guide (step by step, for first-timers)

This guide walks you through the complete SEO setup for `https://zigma-technologies.com`, from creating the Google accounts to publishing content and tracking enquiries. It is written for someone doing SEO **for the first time**. Every step tells you:

- **What** to do, and **why** it matters, in plain English.
- **Exactly how**: which website to open, which button to click, what to type.
- **What you should see** when it worked (**Expect**), and what to do when it does not (**If it goes wrong**).

You do not need to understand the code. Where a step needs someone with GitHub or server access, it is marked **[Developer]**. Everything marked **[You]** can be done in a web browser.

---

## Table of contents

- [How to use this guide](#how-to-use-this-guide)
- [The plan at a glance](#the-plan-at-a-glance)
- [Glossary — SEO words in plain English](#glossary--seo-words-in-plain-english)
- [Background — what SEO is and what was fixed](#background--what-seo-is-and-what-was-fixed)
- [Phase 0 — Accounts and baseline (Day 1)](#phase-0--accounts-and-baseline-day-1)
- [Phase 1 — Put the technical fixes live (Days 2–3)](#phase-1--put-the-technical-fixes-live-days-23)
- [Phase 2 — Structured data: feed it correct details and test it (Week 1)](#phase-2--structured-data-feed-it-correct-details-and-test-it-week-1)
- [Phase 3 — Write titles, descriptions and alt text in the admin panel (Week 1–2)](#phase-3--write-titles-descriptions-and-alt-text-in-the-admin-panel-week-12)
- [Phase 4 — Page speed (Week 2)](#phase-4--page-speed-week-2)
- [Phase 5 — Local SEO: Google Business Profile, directories, reviews (start Day 1)](#phase-5--local-seo-google-business-profile-directories-reviews-start-day-1)
- [Phase 6 — City and language pages (Weeks 3–6)](#phase-6--city-and-language-pages-weeks-36)
- [Phase 7 — Keywords and content (ongoing)](#phase-7--keywords-and-content-ongoing)
- [Phase 8 — Backlinks and authority (ongoing)](#phase-8--backlinks-and-authority-ongoing)
- [Phase 9 — Weekly, monthly and quarterly routine](#phase-9--weekly-monthly-and-quarterly-routine)
- [Appendix A — Which pages are indexed](#appendix-a--which-pages-are-indexed)
- [Appendix B — Title and description formulas](#appendix-b--title-and-description-formulas)
- [Appendix C — Verification commands](#appendix-c--verification-commands)
- [Appendix D — Things NOT to waste time on](#appendix-d--things-not-to-waste-time-on)
- [Appendix E — Technical reference for developers](#appendix-e--technical-reference-for-developers)
- [Appendix F — Master checklist](#appendix-f--master-checklist)

---

## How to use this guide

### Rules for following it

1. **Do the phases in order.** Phase 5 (Google Business Profile) is the exception: start it on Day 1 as well, because Google's verification can take days.
2. **Do each step completely**, including its **Expect** check, before moving to the next one. If what you see does not match **Expect**, use the **If it goes wrong** table in that step before continuing.
3. **Tick the boxes** in [Appendix F — Master checklist](#appendix-f--master-checklist) as you finish each step, so you always know where you stopped.
4. **Google changes button names from time to time.** If a label is slightly different, choose the closest match. The order of screens rarely changes.
5. **Never guess with DNS or server settings.** Those steps say exactly what to type. If something looks different from the guide, stop and ask your developer.

### What you need before starting

| Item | Why | Who usually has it |
| --- | --- | --- |
| A **company Google account** (for example `marketing@zigma-technologies.com` or a dedicated Gmail owned by the company) | Owns Search Console, Analytics and Business Profile. Do not use a personal account that could leave with an employee. | You |
| Login to the **domain provider** (BigRock, where `zigma-technologies.com` was bought) | To add one verification record for Google | Owner / IT |
| Login to the **production admin panel** `https://zigma-technologies.com/admin` | To enter titles, descriptions and analytics settings | You |
| **GitHub** access to `JustXSystems/zigma-technologies` with permission to run Actions | To deploy the code | Developer |
| **SSH** access to the production server `deploy@200.234.45.106` | One nginx change in Phase 1 | Developer |
| **Google Chrome** on a computer | All checks in this guide use Chrome | You |
| A **Google Sheets** (or Excel) file | To record the "before" numbers and track progress | You |

### Words used in steps

- **Click** a **Bold Label** means a button or menu item with that text.
- `Grey text like this` means type it exactly, or it is a file / web address.
- **View page source** means: open the page in Chrome, press **Ctrl + U** (a new tab opens with the page's HTML), then press **Ctrl + F** to search inside it.

---

## The plan at a glance

| When | Phase | Main outcome | Time needed |
| --- | --- | --- | --- |
| Day 1 | [Phase 0](#phase-0--accounts-and-baseline-day-1) | Search Console, Bing and GA4 set up; "before" numbers recorded | 3–4 hours (plus waiting for DNS) |
| Day 1 | [Phase 5.2](#52-create-and-verify-your-google-business-profile-you) | Google Business Profile created and verification started | 1 hour |
| Days 2–3 | [Phase 1](#phase-1--put-the-technical-fixes-live-days-23) | SEO code live on PreProd, then Production; sitemap submitted | 1 day (mostly waiting and checking) |
| Week 1 | [Phase 2](#phase-2--structured-data-feed-it-correct-details-and-test-it-week-1) | Company details correct; structured data tested | 1–2 hours |
| Weeks 1–2 | [Phase 3](#phase-3--write-titles-descriptions-and-alt-text-in-the-admin-panel-week-12) | Titles and descriptions written for the 20 most important pages | 15 minutes per page |
| Week 2 | [Phase 4](#phase-4--page-speed-week-2) | Speed measured, heavy images fixed | 2–4 hours |
| Weeks 2–4 | [Phase 5](#phase-5--local-seo-google-business-profile-directories-reviews-start-day-1) | Profile complete, 10+ directory listings, review requests going out | 1 hour per week |
| Weeks 3–6 | [Phase 6](#phase-6--city-and-language-pages-weeks-36) | First real city pages published; language decision made | 2–3 hours per page |
| Month 1 onwards | [Phase 7](#phase-7--keywords-and-content-ongoing) | Keyword list, 2–4 articles and 1 case study per month | 4–8 hours per month |
| Month 1 onwards | [Phase 8](#phase-8--backlinks-and-authority-ongoing) | Links from partners, clients and associations | 2 hours per month |
| Every week / month | [Phase 9](#phase-9--weekly-monthly-and-quarterly-routine) | Problems caught early; monthly report | 15 min weekly, 1 hour monthly |

### What results to expect, and when

| When | What you should see |
| --- | --- |
| Days 1–7 after Phase 1 | View page source shows the correct title, description and canonical on every page. |
| Weeks 1–3 | Search Console → Pages: more pages "Indexed", fewer "Duplicate, Google chose different canonical than user". |
| Weeks 3–8 | More impressions for your brand name and for specific searches such as project names or "UPS AMC Bangalore". Breadcrumbs and your logo start appearing in Google results. |
| Months 3–6 | Commercial searches ("solar EPC company Bangalore") reach page 1–2 if Phases 5–7 are done consistently. Enquiries from Google become measurable in GA4. |
| Months 6–12 | Growth compounds from content, reviews and backlinks. |

SEO is slow and compounding. Anyone promising page-1 rankings in two weeks is selling something.

---

## Glossary — SEO words in plain English

| Word | Meaning |
| --- | --- |
| **Crawl** | Google's robot ("Googlebot") visiting a page to read it. |
| **Index** | Google's database of pages it may show in results. A page that is "indexed" can appear in Google; a page that is not indexed cannot. |
| **SERP** | Search Engine Results Page — the page of results Google shows for a search. |
| **Meta title** (title tag) | The blue clickable headline of your page in Google results, and the text on the browser tab. About 50–60 characters are shown. |
| **Meta description** | The two grey lines under the title in Google results. About 150–160 characters are shown. Google sometimes writes its own. |
| **H1** | The main visible heading on a page. Each page should have exactly one. |
| **Canonical** | A hidden tag that says "this is the official address of this page". It stops Google treating copies (for example with `?sort=` in the address) as separate pages. |
| **noindex** | A hidden instruction that says "do not show this page in Google". Used for thank-you pages, search results, test sites. |
| **robots.txt** | A small file at `/robots.txt` telling search robots which areas not to visit (for example `/admin/`). |
| **Sitemap** | A file at `/sitemap.xml` listing every page you want Google to index. |
| **Structured data** / **schema** / **JSON-LD** | Hidden, machine-readable facts about the page (company, product, breadcrumb, article). They can earn extras in results such as breadcrumbs or your logo. |
| **Rich result** | A Google result with extras (breadcrumb path, logo, video thumbnail, star rating). |
| **Google Search Console (GSC)** | Free Google tool showing how your site performs in Google search and any problems Google finds. |
| **Google Analytics 4 (GA4)** | Free Google tool showing visitors and what they do on the site (for example submitting an enquiry). |
| **Google Business Profile (GBP)** | Your company's listing on Google Maps and in the right-hand panel of results. |
| **Key event** | A GA4 event you treat as success, such as an enquiry form submission (formerly "conversion"). |
| **Impression / click / CTR / position** | Impression: your page was shown in results. Click: someone clicked it. CTR: clicks ÷ impressions. Position: average ranking (1 = top). |
| **Backlink** | A link from another website to yours. Links from relevant, trusted sites help rankings. |
| **NAP** | Name, Address, Phone — must be identical everywhere your company is listed. |
| **Citation** | A listing of your company (with NAP) on a directory such as Justdial or IndiaMART. |
| **hreflang** | A hidden tag telling Google which pages are language versions of each other (English / Hindi / Kannada). |
| **Core Web Vitals** | Google's speed and stability scores measured from real visitors: LCP (loading), INP (responsiveness), CLS (layout jumping). |
| **301 redirect** | A permanent forwarding from an old address to a new one. It keeps the old page's Google value. |
| **Apex domain** | The domain without `www`: `zigma-technologies.com`. This is the official address of the site. |
| **PreProd** | The test copy of the website at `https://justxsystems.com/zigma-technologies`. It must never appear in Google. |

---

## Background — what SEO is and what was fixed

Read this section once. It explains why the steps are in this order.

### The four pillars of SEO

Search visibility rests on four pillars. Each depends on the one before it:

| Pillar | Question it answers | Where it is handled |
| --- | --- | --- |
| 1. **Technical** | Can Google find, read and index the right pages? | Website code (already fixed, Phase 1 puts it live), nginx server, Search Console |
| 2. **On-page / content** | Does each page answer what people search for better than competitors? | Admin panel: pages, inventory, resources (Phases 3, 6, 7) |
| 3. **Local** | Does Google trust you as a real business in Bengaluru and the cities you serve? | Google Business Profile, directories, reviews (Phase 5) |
| 4. **Authority** | Do other trusted websites vouch for you? | Backlinks from partners, clients, associations, media (Phase 8) |

Technical SEO is a gate: it cannot make you rank by itself, but when it is broken nothing else counts. That is why Phase 1 comes first.

### What was wrong with the website, and what is already fixed

The website code was audited. The problems below were found. **All code problems are already fixed** in the branch `seo/fix-technical-bugs`. They only need to be deployed (Phase 1). The last column tells you what is left for you.

| # | Problem found (plain English) | Status | Left for you |
| --- | --- | --- | --- |
| P1 | Every inner page told Google "I am a copy of the homepage" (wrong canonical). Inner pages could drop out of Google. | Fixed in code | Deploy (Phase 1) |
| P2 | A script replaced every page's description with the same default text after loading. | Fixed in code | Deploy |
| P3 | The PreProd test copy was open to Google, competing with the real site. | Fixed in code: every non-production build is hidden from search | Deploy; optionally remove old PreProd results (Phase 1.8) |
| P4 | Both `www.zigma-technologies.com` and `zigma-technologies.com` served the site, splitting Google's signals. | Code uses the apex everywhere | **[Developer]** nginx redirect (Phase 1.6) |
| P5 | Titles showed the brand twice ("Projects \| Zigma Technologies \| Zigma Technologies"). | Fixed in code | Write better titles over time (Phase 3) |
| P6 | Pages shared on LinkedIn/WhatsApp had no image or wrong details. | Fixed; a 1200×630 share image was added at `/og.png` | Nothing |
| P7 | Pages had no main heading (H1). | Fixed: every page hero is now an H1 (looks the same) | Nothing |
| P8 | 36 city × service pages were near-identical templates, which Google can treat as spam. | Fixed: they are hidden from Google until real content is written | Write real city pages (Phase 6) |
| P9 | Thank-you, search and partner login pages were in Google. | Fixed: hidden and removed from the sitemap | Nothing |
| P10 | Review stars were built from your own testimonials, which Google forbids. | Removed | Collect real reviews on Google (Phase 5.6) |
| P11 | Hidden product/project data was added in a way Google may miss. | Fixed | Test it (Phase 2) |
| P12 | Project/product/service lists loaded in the browser only, so Google saw no links to detail pages. | Fixed: lists and links are in the page from the start | Nothing |
| P13 | Default share image was the small logo. | Fixed | Nothing |
| P14 | Fonts and database reads slow the site down. | Partly: measured in Phase 4; deeper changes are an optional developer task | Measure (Phase 4) |
| P15 | Hindi/Kannada pages were not marked as Hindi/Kannada. | Fixed | Decide whether to keep them (Phase 6.2) |
| P16 | Products/projects/services had no SEO fields in the admin panel. | Added: an **SEO** tab in Admin → Inventory | Fill them in (Phase 3) |
| P17 | A Twitter handle that may not exist was referenced. | Removed | Nothing |

Extra fixes made while preparing this guide:
- The security settings were blocking Google Analytics from sending data. Fixed.
- `/sitemap.xml` was frozen at build time and would never list new projects. It is now generated live.
- Product prices written like "From ₹4.5 lakh" would have been sent to Google as ₹4.50. Now only a plain amount such as `₹1,25,000` is sent. Products with "On request" send no price and no product markup, which avoids Search Console errors.

### The key decisions (why the site is set up this way)

1. **One official address:** `https://zigma-technologies.com` — no `www`, always `https`. Every other form redirects to it.
2. **Only production is visible to Google.** PreProd and developer computers always tell Google "noindex", so test copies can never compete with the real site.
3. **Quality over quantity.** Pages without real, unique content (templated city pages, untranslated Hindi/Kannada pages) stay hidden until someone writes real content for them.
4. **Structured data only states true, visible facts.** No self-written reviews, no invented prices.
5. **You control SEO text from the admin panel.** Titles, descriptions, share images and "hide from Google" are editable without a developer.

---

## Phase 0 — Accounts and baseline (Day 1)

**Goal:** set up the free Google and Bing tools, and record the "before" numbers so you can prove improvement later. Do this **before** Phase 1 is deployed.

**Time:** 3–4 hours, plus up to a few hours of waiting for DNS in step 0.1.

### 0.1 Verify your domain in Google Search Console [You]

**What:** Prove to Google that you own `zigma-technologies.com`, so Search Console shows you all search data for the domain.

**Why:** Search Console is where Google tells you which pages are indexed, which searches show your site, and which problems it found. A **Domain** property (instead of a single address) covers `www`, non-`www`, `http` and `https` together, so you can watch the duplicate-address problem disappear after Phase 1.

**Time:** 20 minutes of work + 5 minutes to 24 hours waiting for DNS.

#### Part A — Start the property in Search Console

1. Open Chrome and sign in to the **company Google account** (top-right avatar in Chrome or at <https://accounts.google.com>).
2. Open <https://search.google.com/search-console>.
3. You will see one of two screens:
   - **First time:** a page titled **Welcome to Google Search Console** with two boxes side by side: **Domain** (left) and **URL prefix** (right).
   - **Already used Search Console:** click the property name dropdown at the top-left → **+ Add property**. The same two boxes appear.
4. In the **left** box (**Domain**), type `zigma-technologies.com`. Type it without `https://`, without `www`, and without a `/` at the end.
5. Click **Continue**.
6. A window titled **Verify domain ownership via DNS record** opens. It shows:
   - **Record type:** `TXT`
   - A long value starting with `google-site-verification=` followed by letters and numbers.
7. Click **Copy** next to that value. Paste it into a notes file so you do not lose it.
8. **Leave this browser tab open.** You come back to it in Part D.

#### Part B — Find out where your DNS is managed

DNS is the address book of your domain. The verification record must be added where the domain's DNS is managed. It is usually BigRock (where the domain was bought), but it could have been moved.

1. On your Windows computer, press the **Windows key**, type `PowerShell`, and press **Enter**. A blue or black window opens.
2. Type this and press **Enter**:

   ```powershell
   nslookup -type=NS zigma-technologies.com 8.8.8.8
   ```

3. Read the lines that contain `nameserver =`:

| If the nameservers contain | Your DNS is managed at | Go to |
| --- | --- | --- |
| `bigrock` or `dns.bigrock.in` / `ns1.bigrock.in` | BigRock | Part C1 |
| `hostinger` / `dns-parking` | Hostinger | Part C2 |
| `cloudflare` | Cloudflare | Part C3 |
| anything else | That company's control panel | Use the same idea: add a **TXT** record with host `@` (or empty) and the Google value |

#### Part C1 — Add the TXT record at BigRock

1. Open <https://www.bigrock.in> → click **Login** (top-right) → sign in.
2. Go to **Manage Orders** → **List / Search Orders** (older layout: **My Account** → **Domains**).
3. Click the domain name `zigma-technologies.com`.
4. Scroll to the section **DNS Management** and click **Manage DNS**. A new tab opens with DNS record tabs: **A Records**, **AAAA Records**, **MX Records**, **CNAME Records**, **NS Records**, **TXT Records**, **SRV Records**.
5. Click the **TXT Records** tab.
   - If you already see a TXT record starting with `v=spf1` — **do not change or delete it**. It is for email. You are only adding a new one.
6. Click **Add TXT Record**.
7. Fill in:
   - **Host Name:** leave **empty**. Empty means the domain itself; BigRock shows `.zigma-technologies.com` after the box.
   - **Value:** paste the full Google value, for example `google-site-verification=AbC123...`. No quotes, no spaces at the start or end.
   - **TTL:** leave the default (for example `28800`), or choose `3600` if offered.
8. Click **Add Record**. The new record appears in the TXT list.

**Never touch** the **A Records** (they point the website to the server) or **MX Records** (email). Only add the TXT record.

#### Part C2 — Add the TXT record at Hostinger (only if DNS is at Hostinger)

1. Open <https://hpanel.hostinger.com> → sign in → **Domains** → click `zigma-technologies.com` → **DNS / Nameservers** → **DNS records**.
2. Under **Manage DNS records**:
   - **Type:** `TXT`
   - **Name:** `@`
   - **TXT value:** paste the Google value
   - **TTL:** leave default (`14400`)
3. Click **Add Record**.

#### Part C3 — Add the TXT record at Cloudflare (only if DNS is at Cloudflare)

1. Open <https://dash.cloudflare.com> → sign in → click `zigma-technologies.com` → **DNS** → **Records** → **Add record**.
2. **Type:** `TXT`, **Name:** `@`, **Content:** paste the Google value, **TTL:** Auto → **Save**.

#### Part D — Confirm the record is visible, then verify

1. Wait 5 minutes. In PowerShell type and press **Enter**:

   ```powershell
   nslookup -type=TXT zigma-technologies.com 8.8.8.8
   ```

2. **Expect:** one of the text lines shows your `google-site-verification=...` value. If it does not appear yet, wait 15 minutes and try again. It can take up to 24 hours, but usually under 1 hour.
3. Go back to the Search Console tab from Part A and click **Verify**.
   - If you closed the tab: open Search Console → the property `zigma-technologies.com` shows as unverified → click it → **Verify**.
4. **Expect:** a green message **Ownership verified** → click **Go to property**.

#### Part E — Give your team access (optional)

1. In Search Console, left menu (bottom) → **Settings** → **Users and permissions** → **Add user**.
2. Type the colleague's email. Choose **Full** (can see everything and submit sitemaps) or **Restricted** (view only) → **Add**.

**Expect after 0.1:** the property `zigma-technologies.com` is verified. Reports may say **Processing data, please check again in a day or so**. That is normal: data appears within 1–3 days. If the domain was ever verified before by anyone, older data appears immediately.

**If it goes wrong:**

| Problem | Fix |
| --- | --- |
| "Verification failed — TXT record not found" | Wait longer (up to 24 h) and click Verify again. Check with the `nslookup -type=TXT` command that the value appears exactly. |
| The value appears twice or with quotes | Delete the record you added and add it again, pasting only the value without quotes. |
| BigRock shows no "Manage DNS" option | The domain probably uses other nameservers. Repeat Part B and use the matching Part C. |
| You cannot log in to BigRock | Ask whoever bought the domain. Do not use the "URL prefix" method as a shortcut; it only covers one address form. |

### 0.2 Set up Bing Webmaster Tools [You]

**What:** Add your site to Bing's equivalent of Search Console.

**Why:** Bing's index powers Bing, Yahoo, DuckDuckGo, and ChatGPT's web search. Setting it up takes 5 minutes because Bing can copy everything from Google Search Console.

**Do step 0.1 first**, because Bing imports the verified site from Search Console.

1. Open <https://www.bing.com/webmasters>.
2. Click **Sign in** and choose **Google**. Sign in with the **same company Google account** used for Search Console. (Microsoft or Facebook accounts also work, but Google is simplest.)
3. On the welcome screen you see two options: **Import your sites from GSC** and **Add your site manually**. Under **Import your sites from GSC**, click **Import**.
4. A notice explains what will be imported → click **Continue**.
5. A Google permission window opens → choose the company account → click **Allow** (it only asks to read Search Console data).
6. Bing lists your Search Console properties. Tick `zigma-technologies.com` → click **Import**.
7. **Expect:** "Site(s) imported successfully". The site appears in the Bing dashboard, already verified. Sitemaps from Search Console are imported too, if any were submitted.

**If Import is not possible** (for example Search Console not verified yet):
1. Choose **Add your site manually** → type `https://zigma-technologies.com` → **Add**.
2. Choose the **CNAME** verification option. Bing shows a host name and a value.
3. Add a **CNAME** record at your DNS provider (same place as step 0.1 Part C, but the **CNAME Records** tab): **Host Name** = the host Bing shows, **Value** = the value Bing shows.
4. Wait 15 minutes → back in Bing click **Verify**.

**Expect after 0.2:** `zigma-technologies.com` appears in Bing Webmaster Tools. Data appears within a few days.

### 0.3 Set up Google Analytics 4 (GA4) and confirm it is collecting

**What:** Create a GA4 account and property for the production site, connect it to the website through the Zigma admin panel, prove data is arriving, mark enquiries as **key events**, and link GA4 to Search Console.

**Why:** Rankings are only a means; enquiries are the goal. GA4 tells you how many visitors came from Google organic search and how many of them submitted an enquiry, requested a callback or downloaded a brochure. Without it you cannot prove SEO is working.

**How the website side already works (so you know what NOT to do):**

- The website already contains the GA4 code. You do **not** paste any Google snippet into the code or into a CMS page. You only type the **Measurement ID** (looks like `G-AB12CD34EF`) into the admin panel.
- GA4 loads only after a visitor accepts analytics cookies in the cookie banner (this is the "Require analytics consent" setting). Visitors who click **Decline optional** are not counted. This is expected and legally safer.
- The website already sends these events to GA4 (from `src/lib/analytics.ts`):

| Event name | Fired when | Mark as key event? |
| --- | --- | --- |
| `enquiry_submit` | Contact form, consultation wizard or case-study enquiry is submitted | **Yes** |
| `callback_submit` | "Request a callback" form is submitted | **Yes** |
| `brochure_download` | A brochure is downloaded through the brochure form | **Yes** |
| `calculator_quote` | "Get a quote" is clicked on the UPS or Solar ROI calculator | Optional |
| `newsletter_subscribe` | Footer newsletter form is submitted | Optional |
| `thank_you_view` | The thank-you page is shown | **No** (it follows an enquiry, so it would double count) |
| `cta_click`, `catalog_open`, `search`, `social_click`, etc. | Engagement clicks | No |

> **Before you start:**
> - Use the company Google account that will own analytics long term (not a personal Gmail that could leave with an employee). Use the **same** account you used for Search Console in step 0.1. The GA4 ↔ Search Console link in Part H needs one account that is an admin in both.
> - Do step 0.1 first.
> - The data check in Part F needs the production site to be running the version with the fixed Content-Security-Policy (`next.config.ts` allows `*.google-analytics.com`, `*.analytics.google.com` and `*.googletagmanager.com`). Older builds block GA4 in the browser. Deploy first, or do Parts A–E now and Part F after the deploy.
> - Google occasionally renames buttons. If a label differs slightly, pick the closest match. The order of screens stays the same.

---

#### Part A — Account creation (screen 1 of 5)

1. Open <https://analytics.google.com/> and sign in with the company Google account.
2. On the welcome page click **Start measuring**. (If you already have an account for something else, go to **Admin** (gear icon, bottom-left) → **+ Create** → **Account** instead.)
3. **Account name:** type `Zigma Technologies`.
   *Why:* an account is the company container. One account can hold several properties later, for example a separate one for the mobile app.
4. **Account data sharing settings:** leave the default ticks as they are. They only control what Google may use for benchmarking and support. They do not affect your reports.
5. Click **Next**.

**Expect:** the screen changes to "Property creation".

#### Part B — Property creation (screen 2 of 5)

1. **Property name:** type `zigma-technologies.com (Production)`.
   *Why:* a property is where the reports live. Naming it "Production" makes it obvious that PreProd traffic must never go here.
2. **Reporting time zone:** choose **India** → **(GMT+05:30) India Time**.
   *Why:* otherwise "today" and daily totals are cut at US midnight and never match your enquiry emails.
3. **Currency:** choose **Indian Rupee (₹)**.
4. Click **Next**.

**Expect:** the screen changes to "Business details".

#### Part C — Business details and business objectives (screens 3 and 4 of 5)

**Business details:**

1. **Industry category:** choose **Business & Industrial Markets**.
2. **Business size:** choose the option that matches your employee count, for example **Medium – 11 to 100 employees**. This only affects benchmarking.
3. Click **Next**.

**Business objectives:**

1. Tick **Generate leads**.
   *Why:* the website's goal is B2B enquiries. This choice makes GA4 add a "Leads" report collection to the left menu.
2. Optionally also tick **Examine user behavior**. Do not tick "Drive online sales": the site has no online checkout, and those reports would stay empty.
3. Click **Create**.
4. **Terms of Service** pop-up: set the country to **India**. Tick the data-processing checkbox if one is shown, then click **I Accept**.

**Expect:** the screen changes to "Data collection" ("Start collecting data").

#### Part D — Data collection: create the web data stream (screen 5 of 5)

1. **Choose a platform:** click **Web**.
2. **Set up your web stream:**
   - **Website URL:** leave the dropdown on `https://` and type `zigma-technologies.com`. No `www`, no `https://` in the text box, no trailing `/`.
     *Why:* this must match the canonical domain decided in D3.
   - **Stream name:** type `Zigma Website – Production`.
   - **Enhanced measurement:** leave it **ON**, then click the **gear icon** next to it and set:

| Setting | Set to | Why |
| --- | --- | --- |
| Page views → Show advanced settings → **Page changes based on browser history events** | **ON** | The site is a Next.js app; moving between pages does not reload the browser. This setting makes those page changes count as page views. |
| Scrolls | ON | Harmless engagement signal |
| Outbound clicks | ON | Shows clicks to OEM / partner sites |
| Site search | ON. Under "Show advanced settings", make sure the **Search term query parameter** list includes `q` | The site search uses `/search?q=…` |
| Form interactions | **OFF** | The site already sends its own precise `enquiry_submit` / `callback_submit`. Google's automatic form events would create confusing duplicates. |
| Video engagement | ON | For embedded YouTube videos |
| File downloads | ON | Counts PDF and brochure file clicks |

   Click **Save** (top-right of the gear panel).
3. Click **Create & continue** (or **Create stream**).
4. A panel called **Installation instructions** / **Set up a Google tag** opens. It shows "Install with a website builder" and "Install manually" with a code snippet. **Do not copy the code snippet.** Close this panel with the **X** in the top corner.
   *Why:* the website already loads this exact code itself (`src/components/CookieConsent.tsx`). Pasting it again would count every visit twice.
5. You are now on **Web stream details**. At the top-right you see **MEASUREMENT ID** with a value like `G-AB12CD34EF`. Click the copy icon next to it and paste it somewhere safe (notes file).

**Expect:** a banner saying "Data collection isn't active for your website" may appear. That is normal until Part E is done and the first visit is recorded. It can take up to 48 hours to disappear even after data is flowing.

#### Part E — Put the Measurement ID into the website (production only)

1. Open the **production** admin: `https://zigma-technologies.com/admin` and log in.
2. Left menu → **Site Settings** (`/admin/site-settings`).
3. Expand the section **Analytics & consent**.
4. **GA4 measurement ID:** paste the ID, for example `G-AB12CD34EF`. Uppercase `G-`, no spaces, no quotes.
5. **Require analytics consent (true/false):** type `true` (recommended; keeps the cookie banner in front of GA4).
6. Leave **Plausible domain** empty unless you also use Plausible.
7. Click **Save** and wait for the success message.

No redeploy is needed. The setting is read from the database on every page request, so it is live immediately.

> **Do NOT enter this ID on PreProd** (`https://justxsystems.com/zigma-technologies/admin`). PreProd has its own database. Leave the field empty there. Otherwise your own testing is mixed into real visitor numbers. If you ever want analytics on PreProd, create a second property called `PreProd` and use its ID there.

#### Part F — Prove data is arriving (about 10 minutes)

Use a browser **without ad blockers** (ad blockers and Brave block GA4). A Chrome **Incognito** window is ideal because it also has no saved cookie choice.

1. In one tab, open GA4 → left menu **Reports** → **Realtime overview** (on older layouts: **Reports → Realtime**).
2. In an Incognito window open `https://zigma-technologies.com/`.
3. The cookie banner appears at the bottom. Keep **Analytics (GA4 / Plausible)** ticked and click **Save choices**.
4. Click through 3–4 pages (Projects, a project, Contact).
5. **Browser check (optional but useful):** press **F12** → **Network** tab → type `collect` in the filter box → click another page on the site. You should see requests to `…google-analytics.com/g/collect…` with status **204**. Then open the **Console** tab: there must be **no** red "Refused to connect … Content Security Policy" message.
6. Back in the Realtime tab, within 1–2 minutes you should see **Active users in last 30 minutes: 1** (or more), your city on the map, and `page_view` in **Event count by Event name**.
7. **Test the enquiry event:** on the Contact page, submit the form with obvious test text (Name `SEO test – ignore`). Within 1–2 minutes `enquiry_submit` appears in Realtime under **Event count by Event name**. Tell the sales team to ignore that test enquiry.

**If Realtime stays at 0 after 5 minutes, check in this order:**

| Check | Fix |
| --- | --- |
| View page source (Ctrl+U) is not enough, because GA4 loads after consent. In DevTools → Network, search for `gtag/js?id=G-`. Missing? | The Measurement ID is not saved in **production** Site Settings, or you clicked "Decline optional". Clear site data (DevTools → Application → Storage → Clear site data) and accept again. |
| Console shows "Refused to connect … Content Security Policy" | Production is still on an old build. Deploy the current code (the `next.config.ts` CSP fix). |
| `gtag/js` loads but no `collect` requests | An ad blocker or privacy extension is active. Try a clean Incognito window or another browser. |
| Data only in Realtime, not in other reports | Normal. Standard reports update after 24–48 hours. |

#### Part G — Mark enquiries as key events and fix data retention

**Key events** (formerly "conversions") are what GA4 counts as a success, per traffic source.

1. GA4 → **Admin** (gear, bottom-left) → in the **Property** column → **Data display** → **Key events**.
2. Click **New key event** (blue button, top-right).
3. Type exactly `enquiry_submit` (lowercase, underscore) → **Save**.
4. Repeat for `callback_submit` and `brochure_download`. Optionally add `calculator_quote` and `newsletter_subscribe`.
   *Why this way:* custom events only appear in the **Events** list after GA4 has received them (up to 24 hours). Creating the key event by name works immediately, even before the first enquiry arrives.
5. After 24–48 hours, check **Admin → Data display → Events**: the same names appear with a filled star or a "Mark as key event" toggle switched on.

**Data retention** (default is only 2 months, too short to compare year over year):

1. **Admin** → **Property** column → **Data collection and modification** → **Data retention**.
2. **Event data retention:** choose **14 months** → **Save**.

**Optional — exclude your office traffic** (so staff browsing does not inflate numbers):

1. Find your office public IP: search Google for `what is my ip` from the office network.
2. **Admin** → **Data streams** → click **Zigma Website – Production** → **Configure tag settings** → **Show more** → **Define internal traffic** → **Create**.
3. Rule name `Office`, `traffic_type` value `internal`, match type **IP address equals**, paste the IP → **Create**.
4. **Admin** → **Data collection and modification** → **Data filters** → open **Internal Traffic** → change **Filter state** from *Testing* to **Active** → **Save**.

**Optional — see which form produced each enquiry:** the site sends a `source` value with each `enquiry_submit` (`contact_form`, `consultation`, `case_study`). To report on it: **Admin** → **Data display** → **Custom definitions** → **Create custom dimension**. Set Dimension name `Enquiry source`, Scope **Event**, Event parameter `source`, then **Save**. Repeat with `item_type` if you want project/product/service splits.

#### Part H — Link GA4 to Search Console

**Why:** this adds the actual Google search **queries** and landing pages to GA4, next to the enquiries they led to.

Requirements: your Google account is **Administrator** on the GA4 property and a **verified owner** of the Search Console property from step 0.1.

1. GA4 → **Admin** → **Property** column → **Product links** → **Search Console links**.
2. Click **Link**.
3. **Choose Search Console properties** → **Choose accounts** → tick `zigma-technologies.com` (shown as `sc-domain:zigma-technologies.com` for a Domain property) → **Confirm** → **Next**.
4. **Select web stream** → choose **Zigma Website – Production** → **Next**.
5. Review → **Submit**. You should see "Link created".
6. Make the Search Console reports visible in the left menu:
   - GA4 → **Reports** → at the bottom of the left menu click **Library**.
   - Find the **Search Console** collection card → click the **⋮** (three dots) → **Publish**.
7. The left menu now shows **Search Console** → **Queries** and **Google organic search traffic**. Data appears after 24–48 hours and covers the last 16 months that Search Console holds.

#### Part I — Where to read the numbers later (used in step 0.4 and Phase 9)

| Question | GA4 report |
| --- | --- |
| How many visits came from Google organic? | **Reports → Acquisition → Traffic acquisition** → row **Organic Search** |
| How many enquiries came from organic? | Same report → **Key events** column. Use the column's dropdown to pick `enquiry_submit`. |
| Which landing pages bring organic visitors? | **Reports → Engagement → Landing page**. Add the filter **Session default channel group = Organic Search**. |
| Which Google queries bring visitors? | **Reports → Search Console → Queries** (after Part H) |

**Expect when everything is done:**
- Realtime shows your own visit and `enquiry_submit` from the test.
- Within 48 hours, the "Data collection isn't active" banner disappears.
- Key events are listed.
- The Search Console collection appears in Reports.

**Give colleagues access:** **Admin** → **Account** column → **Account access management** → **+** → **Add users**. Enter their email and give them the **Viewer** role (or **Marketer** if they manage key events). Never share your password.


### 0.4 Record the "before" numbers (baseline) [You]

**What:** Write down today's numbers in a spreadsheet.

**Why:** In three months someone will ask "is SEO working?". Without the "before" numbers you cannot answer. This takes about an hour.

**Note:** if Search Console was verified for the first time today, its reports stay empty for 1–3 days. Fill in the other rows now and come back for the Search Console rows in 2–3 days. **Still deploy Phase 1 on schedule.** The PageSpeed and crawl rows are the most important "before" numbers.

#### Part A — Create the sheet

1. Open <https://sheets.google.com> → **Blank spreadsheet**.
2. Rename it (click "Untitled spreadsheet" top-left) to `SEO Baseline – ` followed by today's date, for example `SEO Baseline – 2026-09-27`.
3. In row 1 type these headings: `Metric` (A1), `Where it comes from` (B1), `Value today` (C1), `Notes` (D1).
4. Copy the rows of the table below into columns A and B.

| Metric | Where it comes from |
| --- | --- |
| Indexed pages | Search Console → Indexing → Pages |
| Not indexed pages | Search Console → Indexing → Pages |
| "Duplicate, Google chose different canonical than user" count | Search Console → Indexing → Pages → "Why pages aren't indexed" |
| Clicks (last 3 months) | Search Console → Performance → Search results |
| Impressions (last 3 months) | same |
| Average CTR | same |
| Average position | same |
| Top 20 queries | same → Queries tab (export) |
| Organic sessions (last 28 days) | GA4 → Reports → Acquisition → Traffic acquisition |
| Enquiries from organic (last 28 days) | same report, Key events column |
| Mobile Performance score — home | PageSpeed Insights |
| Mobile Performance score — /projects | PageSpeed Insights |
| Mobile Performance score — one project page | PageSpeed Insights |
| Mobile Performance score — /locations/bengaluru | PageSpeed Insights |
| LCP / CLS / INP (real users) | PageSpeed Insights → "Discover what your real users are experiencing" |
| Results for `site:zigma-technologies.com` | Google search |
| Results for `site:justxsystems.com/zigma-technologies` | Google search |
| Google Business Profile: reviews count and rating | Google Maps |

#### Part B — Search Console numbers

1. Open <https://search.google.com/search-console> → choose `zigma-technologies.com` in the top-left dropdown.
2. **Indexed / Not indexed:** left menu → **Indexing** → **Pages**. At the top you see two numbers: **Not indexed** (grey) and **Indexed** (green). Write both.
3. **Duplicate canonical:** on the same page scroll to **Why pages aren't indexed**. Find the row **Duplicate, Google chose different canonical than user** and write its **Pages** number (write `0` if the row is not there).
4. **Clicks, impressions, CTR, position:** left menu → **Performance** → **Search results**.
   - Click the date filter at the top (shows "Date: Last 3 months" by default). Keep **Last 3 months**.
   - Click all four boxes at the top so they are coloured: **Total clicks**, **Total impressions**, **Average CTR**, **Average position**. Write each number.
5. **Top queries:** on the same screen scroll to the table, make sure the **Queries** tab is selected, then click **Export** (top-right) → **Google Sheets**. A new sheet opens. Rename it `GSC queries – before`. Paste its link into the Notes column.

#### Part C — GA4 numbers (only if GA4 was already collecting data before today)

1. Open <https://analytics.google.com> → your property.
2. Left menu → **Reports** → **Acquisition** → **Traffic acquisition**.
3. Top-right date: choose **Last 28 days** → **Apply**.
4. In the table, find the row **Organic Search**. Write the **Sessions** number, and the number in the **Key events** column.
5. If GA4 was only set up today (step 0.3), write `not tracked yet`. Your baseline starts today.

#### Part D — PageSpeed numbers (do this now, before Phase 1)

1. Open <https://pagespeed.web.dev>.
2. Paste `https://zigma-technologies.com/` into the box → click **Analyze**. Wait about 30–60 seconds.
3. Make sure the **Mobile** tab is selected (top). Google ranks based on mobile.
4. **Real-user data:** the top section is **Discover what your real users are experiencing**. If it shows numbers, write LCP, INP and CLS. If it says **No Data**, write `no field data` (normal for sites with modest traffic).
5. **Lab scores:** scroll to **Diagnose performance issues**. Four circles show **Performance**, **Accessibility**, **Best Practices**, **SEO**. Write the **Performance** number in the sheet (and the other three in Notes).
6. Repeat for:
   - `https://zigma-technologies.com/projects`
   - one project page (open `/projects` in the browser, click any project, copy its address)
   - `https://zigma-technologies.com/locations/bengaluru`

#### Part E — `site:` searches

1. Open <https://www.google.com> and search exactly: `site:zigma-technologies.com`
2. Under the search box, click **Tools**. The text "About N results" appears. Write N. (It is rough, but useful as a trend.)
3. Search `site:justxsystems.com/zigma-technologies` and write N. This shows how many PreProd test pages Google has. After Phase 1 this should fall towards 0 over a few weeks.

**Expect after 0.4:** a sheet with most rows filled. Save it in a shared drive folder called `SEO`. You will copy this sheet every month in Phase 9.

### 0.5 Crawl the site with Screaming Frog [You]

**What:** Run a free tool that visits every page of your site, like Google does, and lists titles, descriptions, headings and broken links.

**Why:** It shows problems you cannot see by browsing, for example 40 pages with the same title. After Phase 1 you run it again to prove the fixes worked.

**Time:** 30 minutes.

1. Open <https://www.screamingfrog.co.uk/seo-spider/> → click **Download** → choose **Windows** → run the downloaded installer → **Next** until finished. The free version crawls up to 500 pages, which is enough for this site.
2. Open **Screaming Frog SEO Spider** from the Start menu. If asked about "Storage mode", keep the default.
3. In the box at the top that says **Enter URL to spider**, type `https://zigma-technologies.com/` → click **Start**.
4. Wait until the progress bar on the right reaches **100%** (usually 2–10 minutes).
5. Create a folder on your computer called `SEO Baseline <date>`.
6. Export these tabs. For each one, click the tab along the top, then click **Export** (top-left of the table) and save the CSV into the folder:
   - **Response Codes** (shows broken links: filter **Client Error (4xx)**)
   - **Page Titles** (filters **Missing**, **Duplicate**, **Over 60 Characters**)
   - **Meta Description** (filters **Missing**, **Duplicate**)
   - **H1** (filters **Missing**, **Multiple**)
   - **Canonicals** (filter **Canonicalised**)
   - **Images** (filter **Missing Alt Text**)
7. In your baseline sheet's Notes, add: number of **Duplicate** titles, number of **Missing** H1, number of **Missing Alt Text** images, number of **4xx** pages. The count is shown next to each filter in the right-hand **Overview** panel.

**Expect before Phase 1:** many pages show a canonical pointing to the homepage (the P1 bug), H1 **Missing** on most pages (P7), and duplicate descriptions (P2). These are exactly what Phase 1 fixes.

---

## Phase 1 — Put the technical fixes live (Days 2–3)

**Goal:** deploy the SEO code (already written and committed on the branch `seo/fix-technical-bugs`), first to PreProd, then to Production. Then make `www` redirect to the apex, and tell Google about the site.

**Who:** steps 1.1–1.2, 1.4 and 1.6 are **[Developer]**; steps 1.3, 1.5, 1.7 and 1.8 are **[You]**.

**Safety:** the changes only add things. No content is deleted, and the four new database columns are created automatically. If anything goes wrong, redeploying the previous version puts the site back as it was; the extra columns do no harm.

### 1.1 Make sure every change is committed and pushed [Developer]

1. Open a terminal in the project folder (`C:\Users\iamsa\IdeaProjects\zigma-technologies`).
2. Run:

   ```powershell
   git checkout seo/fix-technical-bugs
   git status
   ```

3. If `git status` lists changed files (for example `next.config.ts`, `SEO-GUIDE.md`, `src/lib/catalog-case-study-page.tsx`), commit them:

   ```powershell
   git add -A
   git commit -m "#34 SEO: GA4 CSP fix, product price markup fix, guide update"
   ```

4. Check that the project builds cleanly:

   ```powershell
   npm run typecheck
   npm run build
   ```

   **Expect:** both finish without `error`. (`npm run lint` reports older warnings that existed before this work; they do not block deployment.)
5. Push the branch:

   ```powershell
   git push -u origin seo/fix-technical-bugs
   ```

   **Expect:** the output ends with `branch 'seo/fix-technical-bugs' set up to track 'origin/seo/fix-technical-bugs'` or `Everything up-to-date`.

### 1.2 Deploy the branch to PreProd [Developer]

**Why PreProd first:** you check everything on the test copy before real visitors and Google see it.

1. Open <https://github.com/JustXSystems/zigma-technologies> → click the **Actions** tab (top).
2. In the left list, click **Deploy PreProd**.
3. On the right, click the grey **Run workflow** button. A small form opens:
   - **Use workflow from:** leave `Branch: master`.
   - **Git branch to build:** type `seo/fix-technical-bugs`.
   - Leave every other option at its default (apply release, restart, healthcheck and preserve uploads all ticked).
4. Click the green **Run workflow** button.
5. After a few seconds a new run appears at the top of the list with a yellow dot. Click it to watch. It takes about 5–10 minutes.
6. **Expect:** every job shows a green tick. If a job shows a red cross, click it, read the last red lines of the log, and fix the problem before continuing. The most common cause is a failed build; running `npm run build` locally shows the same error.

### 1.3 Check PreProd [You]

Open each address below in Chrome and tick it off. PreProd lives at `https://justxsystems.com/zigma-technologies`.

**A. Pages look and work the same as before**

| Open | Check |
| --- | --- |
| `https://justxsystems.com/zigma-technologies/` | Homepage looks normal; the hero slider works. |
| `…/projects`, `…/products`, `…/services` | Cards show. **Click a card: the quick-view pop-up opens as before.** |
| Click a card title with the **middle mouse button** (or Ctrl + click) | The full detail page opens in a new tab. (New: titles are real links now.) |
| One project detail page, one product detail page | Page looks normal. |
| `…/contact` | Form shows. (Do not submit on PreProd unless you want a test enquiry.) |

**B. PreProd is hidden from Google (correct for a test site)**

1. Open `https://justxsystems.com/zigma-technologies/` → press **Ctrl + U** → press **Ctrl + F** → search `name="robots"`.
2. **Expect:** `<meta name="robots" content="noindex, follow"/>`.
3. Open `https://justxsystems.com/zigma-technologies/sitemap.xml`.
4. **Expect:** an almost empty XML page with just `<urlset ...></urlset>`. That is correct: the test site lists nothing for Google.

**C. The new SEO tab works in the admin panel**

1. Open `https://justxsystems.com/zigma-technologies/admin` and log in.
2. Left menu → **Inventory** → **Products** tab → click **Edit** on any product.
3. In the editor, click the tab **SEO** (next to **Basics**, **Commerce**, **Case study**).
4. Type something in **Meta title**. The **Google preview** box underneath updates as you type.
5. Click **Save**.
6. **Expect:** a success message. Reopen the item: the SEO tab still shows your text. (You can clear it again afterwards.)

**D. [Developer] Database columns were created**

On the PreProd server run:

```bash
pm2 logs zigma-preprod --lines 300 --nostream | grep -i "schema"
```

**Expect:** lines like `[schema] added catalog_items.meta_title` (first start only), and **no** line saying `could not ensure catalog media presentation columns`. If that error appears, the database user lacks `ALTER` permission: run `scripts/migrate-catalog-seo.sql` as a database admin.

**If anything in A–D fails, stop here and fix it before Production.**

### 1.4 Deploy to Production [Developer]

**Important:** merge the branch into `master` first. The production workflow file on `master` is what switches Google indexing **on** for production. Running the old workflow would build a site that tells Google "noindex".

#### Part A — Merge the branch into master

1. Open <https://github.com/JustXSystems/zigma-technologies> → **Pull requests** tab → **New pull request**.
2. **base:** `master` ← **compare:** `seo/fix-technical-bugs`.
3. Click **Create pull request** → title `#34 SEO technical fixes` → **Create pull request**.
4. Review the list of changed files if you wish → click **Merge pull request** → **Confirm merge**.

#### Part B — Run the production workflow

1. **Actions** tab → left list → **Deploy Production** → **Run workflow**.
2. Fill in the form:

| Field | Value |
| --- | --- |
| Use workflow from | `Branch: master` |
| Type DEPLOY_PROD to confirm | `DEPLOY_PROD` |
| Git branch to build | `master` |
| Extract tarball on VPS | ticked |
| Restart PM2 zigma | ticked |
| Localhost + asset curl after restart | ticked |
| Keep runtime CMS/media uploads on VPS | ticked |
| mysqldump before apply | **ticked** (takes a database backup first) |
| Apply SQL migrations | ticked |
| Comma-separated scripts/*.sql | `migrate-catalog-seo.sql` |
| Print apply plan only | not ticked |

3. Click **Run workflow** and open the new run. Wait for all green ticks (about 10 minutes).

The migration is safe to run more than once: it only adds the four SEO columns if they are missing.

**If the server-side script is used instead of GitHub Actions** (`./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD` on the VPS): it now switches indexing on automatically for production builds, so nothing extra is needed.

### 1.5 Check Production [You]

Do these checks within an hour of the deploy.

**A. Pages work** — repeat checklist **A** from step 1.3 on `https://zigma-technologies.com`.

**B. Production is visible to Google**

1. Open `https://zigma-technologies.com/` → **Ctrl + U** → **Ctrl + F**:

| Search for | Expect |
| --- | --- |
| `name="robots"` | `content="index, follow"` (a second line `name="googlebot"` with extra Google settings is normal) |
| `rel="canonical"` | `href="https://zigma-technologies.com"` |
| `<title>` | `Zigma Technologies \| Solar EPC, UPS, BESS &amp; EV Charging in India` (or your own home meta title) |
| `og:image` | `https://zigma-technologies.com/og.png` |
| `application/ld+json` | at least one match (the company data) |

2. Open `https://zigma-technologies.com/projects` → **Ctrl + U** → search `rel="canonical"` → **Expect:** `https://zigma-technologies.com/projects` (its **own** address, not the homepage).
3. Open `https://zigma-technologies.com/robots.txt`. **Expect** these lines at the bottom:

   ```text
   Host: https://zigma-technologies.com
   Sitemap: https://zigma-technologies.com/sitemap.xml
   ```

4. Open `https://zigma-technologies.com/sitemap.xml`. **Expect:** a long list of `<loc>` addresses including your projects and products. It should **not** contain `/thank-you`, `/search` or `/partner/login`.
5. Open `https://zigma-technologies.com/og.png`. **Expect:** a dark blue image with "Zigma Technologies — Power & Energy Engineering Across India".
6. **Response header check:** open `https://zigma-technologies.com/` → press **F12** → **Network** tab → press **F5** to reload → click the first row (the page itself) → **Headers** → scroll to **Response Headers**. **Expect:** there is **no** `X-Robots-Tag` header. (If you see `X-Robots-Tag: noindex, nofollow`, production was built without the indexing flag. Tell your developer immediately: step 1.4 was run from the wrong branch.)

**C. [Developer] Automated check** — run the PowerShell script in [Appendix C](#appendix-c--verification-commands) with `$base = "https://zigma-technologies.com"`. Every page must show its own canonical, one H1, and `index, follow` (except thank-you and search, which show `noindex`).

### 1.6 Make `www` and `http` redirect to the official address (nginx) [Developer]

**What:** Change the web server so that `http://…`, `http://www…` and `https://www…` all send visitors (and Google) to `https://zigma-technologies.com` with one permanent (301) redirect.

**Why:** Google should see exactly one address per page. Today `www` also serves the full site, which splits signals (problem P4).

**Time:** 15 minutes. **Risk:** a typo can take the site down, so follow the backup and test steps exactly.

1. From your computer, connect to the production server:

   ```powershell
   ssh deploy@200.234.45.106
   ```

2. Check you are on the right server: `hostname -I` must include `200.234.45.106`. **Never do this on the PreProd server (193.203.161.219).**
3. Make a backup of the current nginx site file (copy exactly):

   ```bash
   sudo cp /etc/nginx/sites-available/zigma /root/zigma.nginx.bak-$(date +%F)
   ```

4. Check that the certificate files exist (they were created by Certbot):

   ```bash
   sudo ls /etc/letsencrypt/live/zigma-technologies.com/
   sudo ls /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/ssl-dhparams.pem
   ```

   **Expect:** the first command lists `fullchain.pem` and `privkey.pem`. If the second command says "No such file", remove the two lines `include /etc/letsencrypt/options-ssl-nginx.conf;` and `ssl_dhparam …;` from the configuration below before pasting it.
5. Open the file in the editor:

   ```bash
   sudo nano /etc/nginx/sites-available/zigma
   ```

6. Delete everything in the file: press **Ctrl + K** repeatedly until it is empty (or hold it down).
7. Paste this complete configuration (right-click pastes in most terminals):

   ```nginx
   # 1) Any http:// request (apex or www) -> https://zigma-technologies.com
   server {
       listen 80;
       listen [::]:80;
       server_name zigma-technologies.com www.zigma-technologies.com;
       return 301 https://zigma-technologies.com$request_uri;
   }

   # 2) https://www -> https://zigma-technologies.com
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name www.zigma-technologies.com;

       ssl_certificate /etc/letsencrypt/live/zigma-technologies.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/zigma-technologies.com/privkey.pem;
       include /etc/letsencrypt/options-ssl-nginx.conf;
       ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

       return 301 https://zigma-technologies.com$request_uri;
   }

   # 3) The real site
   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name zigma-technologies.com;

       ssl_certificate /etc/letsencrypt/live/zigma-technologies.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/zigma-technologies.com/privkey.pem;
       include /etc/letsencrypt/options-ssl-nginx.conf;
       ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

       # CMS / resume uploads (keep in sync with MEDIA_UPLOAD_MAX_MB)
       client_max_body_size 100M;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. Save and exit: press **Ctrl + O**, then **Enter** (save), then **Ctrl + X** (exit).
9. Test the configuration **before** applying it:

   ```bash
   sudo nginx -t
   ```

   **Expect:** `syntax is ok` and `test is successful`. **If you see any error, do not continue.** Restore the backup:

   ```bash
   sudo cp /root/zigma.nginx.bak-$(date +%F) /etc/nginx/sites-available/zigma
   sudo nginx -t
   ```

10. Apply it:

    ```bash
    sudo systemctl reload nginx
    ```

11. Test the redirects. Each command must show `301` and `location: https://zigma-technologies.com/projects`:

    ```bash
    curl -sI http://zigma-technologies.com/projects | grep -iE "^HTTP|^location"
    curl -sI http://www.zigma-technologies.com/projects | grep -iE "^HTTP|^location"
    curl -sI https://www.zigma-technologies.com/projects | grep -iE "^HTTP|^location"
    curl -sI https://zigma-technologies.com/projects | grep -iE "^HTTP"
    ```

    **Expect:** the first three show `HTTP/1.1 301` or `HTTP/2 301` plus the location line; the last one shows `HTTP/2 200`.
12. Check certificate renewal still works:

    ```bash
    sudo certbot renew --dry-run
    ```

    **Expect:** "Congratulations, all simulated renewals succeeded".
13. In Chrome, open `https://www.zigma-technologies.com/contact`. **Expect:** the address bar changes to `https://zigma-technologies.com/contact`.

**If the site goes down after reload:** restore the backup (step 9 commands), then `sudo systemctl reload nginx`. Then check the error with `sudo tail -n 50 /var/log/nginx/error.log`.

### 1.7 Tell Google and Bing about the site [You]

Do this after steps 1.5 and 1.6 are complete.

#### Part A — Submit the sitemap to Google

1. Open <https://search.google.com/search-console> → property `zigma-technologies.com`.
2. Left menu → **Indexing** → **Sitemaps**.
3. Under **Add a new sitemap**, type the full address `https://zigma-technologies.com/sitemap.xml` → click **Submit**.
4. **Expect:** "Sitemap submitted successfully" → **Got it**. In the **Submitted sitemaps** table the status becomes **Success** within a few minutes to a day, with a **Discovered pages** number (about 70+).

#### Part B — Ask Google to re-read your most important pages

Google has a daily limit (about 10 requests), so do the most important pages first. Do the rest the next day.

1. At the very top of Search Console, click the search bar **Inspect any URL in "zigma-technologies.com"**.
2. Paste `https://zigma-technologies.com/` → press **Enter**. Wait up to a minute.
3. Click **Test live URL** (top-right). Wait up to a minute.
4. **Expect:** **URL is available to Google**. Click **Request indexing**. Wait up to 2 minutes → **Indexing requested** → **Got it**.
5. Repeat for these addresses (one per request):
   - `https://zigma-technologies.com/projects`
   - `https://zigma-technologies.com/products`
   - `https://zigma-technologies.com/services`
   - `https://zigma-technologies.com/contact`
   - `https://zigma-technologies.com/locations`
   - your 4 most important project or product pages

**If Live test says "URL is not available to Google"**, click **View tested page** → **More info** to see why. Typical causes are a server error or a `noindex` (step 1.5 B failed). Tell your developer.

#### Part C — Submit the sitemap to Bing

1. Open <https://www.bing.com/webmasters> → choose the site → left menu **Sitemaps** → **Submit sitemap**.
2. Type `https://zigma-technologies.com/sitemap.xml` → **Submit**.
3. Optional: left menu **URL Submission** → paste up to 10 key addresses (one per line) → **Submit**.

#### Part D — Re-crawl with Screaming Frog

Repeat step 0.5 on `https://zigma-technologies.com/`. **Expect now:** the **Canonicals** tab shows each page pointing to itself, the **H1** tab shows no **Missing** and no **Multiple**, and the **Meta Description** tab shows far fewer **Duplicate** entries. Keep this export as the "after" snapshot.

### 1.8 Optional: remove old PreProd results from Google [You]

Only needed if the `site:justxsystems.com/zigma-technologies` search in step 0.4 found results.

- PreProd now tells Google "noindex", so Google drops those pages by itself over 2–8 weeks. **Doing nothing is fine.**
- To hide them faster, you need Search Console access for `justxsystems.com` (a different domain, owned by JustXSystems). Then:
  1. Verify `justxsystems.com` in Search Console (same method as step 0.1).
  2. Left menu → **Removals** → **Temporary removals** → **New request**.
  3. Choose **Remove all URLs with this prefix** → type `https://justxsystems.com/zigma-technologies/` → **Next** → **Submit request**.
  4. This hides the pages for about 6 months; the `noindex` makes it permanent.

### 1.9 What happens in Search Console over the next weeks

Open **Search Console → Indexing → Pages** once a week. Some "Not indexed" reasons are **expected** and correct:

| Reason in Search Console | Meaning | Action |
| --- | --- | --- |
| **Excluded by 'noindex' tag** | Thank-you, search, partner and untranslated/template city pages | None. This is on purpose. |
| **Page with redirect** | `www` and `http` addresses now redirect | None. On purpose. |
| **Alternate page with proper canonical tag** | Addresses with `?sort=` or `?q=` point to the main listing | None. On purpose. |
| **Blocked by robots.txt** | `/admin`, `/ztools`, `/partner` | None. On purpose. |
| **Duplicate, Google chose different canonical than user** | Google has not re-read the page yet since the fix | Should fall steadily over 2–6 weeks. If a specific page stays here after 6 weeks, inspect it (step 1.7 Part B). |
| **Crawled – currently not indexed** | Google read the page but decided it is not valuable enough yet | Improve that page's content (Phases 3 and 7). |
| **Discovered – currently not indexed** | Google knows the page but has not read it yet | Wait; for key pages use Request indexing. |
| **Not found (404)** | A link points to a page that does not exist | Add a redirect (Phase 3.7) or fix the link. |
| **Server error (5xx)** | The server failed when Google visited | Tell your developer the addresses listed. |

---

## Phase 2 — Structured data: feed it correct details and test it (Week 1)

**Goal:** make sure the hidden company, breadcrumb, product and article data the website sends to Google is correct, and that Google accepts it.

**Background:** the code that produces structured data is already done. It reads your company details from **Admin → Site Settings**. If those settings are wrong or empty, Google receives wrong or empty facts. So the work here is: fill in the settings once, then test.

### 2.1 Fill in the company details in Site Settings [You]

**Why:** the company data (name, logo, phone, address, social profiles) appears in hidden structured data on every page, in the footer, and in emails. Google compares it with your Google Business Profile and directory listings. It must be complete and identical everywhere (see NAP in Phase 5.1). **Decide the exact NAP text in Phase 5.1 first**, then enter it here.

> **Site Settings is the one place where company details are typed.** The footer menu (Admin → Navigation) and page sections such as the Contact page (Admin → Pages) follow it through placeholders like `{{phone}}`. After saving, run the one-time **Scan menus & pages → Link** in Contact details so older typed copies are replaced. See [Where NAP appears and how to update each place](#where-nap-appears-and-how-to-update-each-place) in 5.1.

> **The Example column below is placeholder text.** The address, phone numbers and URLs are made up to show the format. Do not copy them. Enter your own values from the NAP sheet (5.1).

1. Open `https://zigma-technologies.com/admin` → log in → left menu **Site Settings**.
2. Each section is collapsed. Click a section title to open it. Fill in:

| Section | Field | What to enter | Example (placeholder, format only) |
| --- | --- | --- | --- |
| **Brand & identity** | Company name | Legal/brand name exactly as on Google Business Profile | `Zigma Technologies` |
| **Brand & identity** | Logo image URL | Your logo image address (square or wide PNG/SVG, at least 112×112 pixels) | `/assets/images/zigma-technologies-logo.png` |
| **Contact details** | Main phone | Main number in international format | `+91 80 1234 5678` |
| **Contact details** | Emergency phone | 24×7 support number, if you have one (leave blank if not) | `+91 98765 43210` |
| **Contact details** | Info email | Public enquiry email | `info@zigma-technologies.com` |
| **Address & office** | Address street (line 1) | Building / plot / road. Lines 2–4 are optional and only split the address across footer lines. No comma at the end of a line: the site joins the lines with ", " itself (it also removes stray end commas automatically). | `No. 12, 3rd Cross, Peenya Industrial Area` |
| **Address & office** | Address city | City | `Bengaluru` |
| **Address & office** | Address region/state | State | `Karnataka` |
| **Address & office** | Postal code | PIN code, 6 digits, no spaces before or after | `560058` |
| **Address & office** | Country code | Two letters | `IN` |
| **Address & office** | Office hours | Same hours as your Google Business Profile | `Mon–Sat 9:30–18:30 IST` |
| **Social links** | LinkedIn URL / Facebook URL / YouTube URL / Instagram / X | Full profile addresses (starting with `https://`). Leave blank if you do not have one. Do not type `#` as a stand-in (the site ignores it, but a blank field is clearer). | `https://www.linkedin.com/company/zigma-technologies` |
| **SEO & social** | Default meta description | One sentence (120–160 characters) describing the company. Used when a page has no description of its own. | `Solar EPC, UPS, BESS and EV charging for industries, hospitals and campuses across India. 20+ years, 24×7 support.` |
| **SEO & social** | Default OG / social image URL | **Leave empty.** The site then uses the new 1200×630 share image `/og.png`. Only fill it if you have your own 1200×630 image. | *(empty)* |

3. Click **Save settings** (docked at the bottom-right of the screen). **Expect:** a success message.

**Check it:** open `https://zigma-technologies.com/` → **Ctrl + U** → **Ctrl + F** → search `"Organization","LocalBusiness"`. The text around it should show your company name, phone, address and social links exactly as entered.

### 2.2 Test the structured data with Google's Rich Results Test [You]

**What:** Google's free test tells you which rich results a page can get and whether there are errors.

1. Open <https://search.google.com/test/rich-results>.
2. Make sure the **URL** tab is selected. Paste `https://zigma-technologies.com/projects` → click **Test URL**. Wait up to a minute.
3. **Expect:** a message like **Page is eligible for rich results** (green tick) and a list of detected items. Click each item name to see details.
4. Test one page of each type and compare with this table:

| Page to test | Items you should see | Notes |
| --- | --- | --- |
| `https://zigma-technologies.com/` | **Organization** (or **Local businesses**) | Company data from step 2.1 |
| `/projects` | **Breadcrumbs** | |
| Any project page | **Breadcrumbs**, **Articles** | Plus **Videos** if the project has a video |
| Any product page | **Breadcrumbs**, plus **Product snippets** and **Merchant listings** only if the product has a plain price | See the note below |
| Any service page | **Breadcrumbs** | "Service" data is valid but Google shows no special result for it; that is normal |
| A resource article (if published) | **Breadcrumbs**, **Articles** | |
| An industry page with FAQs | **Breadcrumbs**, **FAQ** | FAQ rich results are only shown for government/health sites since 2023; the data is still valid |

**Colours in the report:**
- **Red (errors):** must be fixed. Note the page address and the error text and give them to your developer.
- **Orange (warnings, "non-critical issues"):** optional fields. You can ignore them.

**About product prices:** products show **Product snippets** only when the **Price label** (Admin → Inventory → product → **Commerce** tab) is a plain amount, for example `₹1,25,000` or `Rs. 125000/-`. Labels such as `On request` or `From ₹4.5 lakh` are fine for visitors, but Google then receives no product data and shows the page as a normal result. This is on purpose: showing Google an unclear price breaks its rules. For priced products, the **first tag** in **Basics → Tags** is sent to Google as the product's brand, so put the manufacturer name first (for example `Vertiv, UPS, Online`).

5. For a complete technical view, you can also paste a page into <https://validator.schema.org/> → **Run test**. It lists everything including items Google does not use. "0 errors" is the goal.

### 2.3 Watch the Enhancements reports in Search Console [You]

1. Wait 3–7 days after the Phase 1 deploy.
2. Search Console → left menu → section **Enhancements** (or **Shopping** / **Experience**, depending on the layout) → you should see reports such as **Breadcrumbs**, **Videos** and possibly **Product snippets**.
3. Open each. **Expect:** most items in **Valid**. If items appear under **Invalid**, click the issue name → click one example address → **Inspect URL** → fix the cause (usually missing information on that item) → back in the report click **Validate fix**.

Google also emails the Search Console owner when a new structured data problem appears. Do not ignore these emails; follow the same steps.

### 2.4 Check how links look when shared on LinkedIn and WhatsApp [You]

1. Open <https://www.linkedin.com/post-inspector/> (sign in to LinkedIn).
2. Paste `https://zigma-technologies.com/` → **Inspect**.
3. **Expect:** the preview shows the image (dark blue Zigma image or the project photo), the page title and the description.
4. Repeat with one project page. **Expect:** the project's own photo.
5. **WhatsApp** caches previews for a long time. If an old preview shows, share the link with `?v=2` added at the end once, for example `https://zigma-technologies.com/projects?v=2`. That forces a fresh preview.

---

## Phase 3 — Write titles, descriptions and alt text in the admin panel (Week 1–2)

**Goal:** give the most important pages a hand-written title and description that make people click in Google.

**Background:** every page already gets a sensible automatic title and description. The automatic ones are acceptable, but hand-written ones for your top 20 pages usually raise clicks noticeably.

### 3.1 How to write a good title and description (read first)

**Title (the blue headline in Google)**
- 50–60 characters, including spaces. Longer titles are cut off with "…".
- Put the most important words first: the service/product, then the place or benefit.
- **Do not type "| Zigma Technologies"**. The website adds the brand automatically; typing it gives the brand twice.
- Each page must have a different title.
- Write for people, not robots. No lists of keywords.

**Description (the two grey lines)**
- 120–160 characters.
- Formula: **what the page offers + a concrete proof point + a call to action**.
- Each page must have a different description.

**Examples:**

| Page | Title | Description |
| --- | --- | --- |
| Home | `Solar EPC, UPS, BESS & EV Charging Company in India` | `Power and energy engineering for factories, hospitals and campuses since 2006. Solar EPC, UPS, battery storage, EV charging, 24×7 AMC. Get a quote.` |
| Contact | `Contact Us – Solar, UPS & Energy Enquiries` | `Talk to our engineers about solar EPC, UPS, BESS or EV charging. Bengaluru office, pan-India projects, response within one working day.` |
| A project | `500 kWp Rooftop Solar for Auto-Parts Plant, Hosur` | `How we designed and commissioned a 500 kWp rooftop plant in 10 weeks, cutting the client's power bill by 38%. Read the case study.` |
| A product | `Online UPS 20 kVA – Double Conversion, Lithium Ready` | `20 kVA online double-conversion UPS for server rooms and labs. Lithium or VRLA batteries, on-site installation and AMC across India.` |
| A service | `UPS AMC in Bengaluru – 24×7 Support, 4-Hour Response` | `Annual maintenance for all major UPS brands. Preventive visits, emergency call-outs within 4 hours and a spare-parts guarantee. Request a quote.` |

More formulas are in [Appendix B](#appendix-b--title-and-description-formulas).

**Tip:** to check the length, paste your text into any character counter (search Google for "character counter"). The Inventory SEO tab shows a live counter and Google preview.

### 3.2 Home page and other CMS pages [You]

**Pages to do first:** Home, Contact, Careers, Certifications, Industries, and any custom landing pages.

1. Admin → left menu **Pages**.
2. In the table, find the page (the home page shows slug `/`) → click **Sections** in its row.
3. The first box, **Page details / SEO**, is open. Fill in:
   - **Meta title (SEO):** your title (rules in 3.1). For the home page, do **not** type only "Zigma Technologies". A brand-only title wastes the most valuable spot. If you leave it empty, the site uses `Zigma Technologies | Solar EPC, UPS, BESS & EV Charging in India`.
   - **Meta description:** your description.
4. Click **Save page details**.
5. **Check:** open the public page → **Ctrl + U** → search `<title>` and `name="description"`. **Expect:** your text (with ` | Zigma Technologies` added to the title automatically, except on the home page if your title already contains the brand).

### 3.3 Projects, products and services [You]

1. Admin → left menu **Inventory**.
2. Click the button **projects**, **products** or **services** at the top left.
3. In the row of the item, click **Edit**. A window opens with tabs **Basics**, **Commerce**, **Case study**, **SEO**.
4. First check the **Basics** tab:
   - **Title:** the visible heading. Make it descriptive, for example `500 kWp Rooftop Solar – Auto-Parts Plant, Hosur` rather than `Project 12`.
   - **Slug:** the web address part, for example `500-kwp-rooftop-solar-hosur`. Lowercase, words joined by `-`. **Do not change the slug of an item that is already live** unless you also add a redirect (step 3.7).
   - **Summary:** 1–2 sentences. It is used as the description when the SEO tab is empty.
5. Click the **SEO** tab:

| Field | What to do |
| --- | --- |
| **Meta title** | Your title (rules in 3.1). The grey placeholder shows what is used when you leave it empty. |
| **Meta description** | Your description. The counter turns orange/red when too long. |
| **Social share image** | Optional. Pick a landscape photo (ideally 1200×630) for LinkedIn/WhatsApp previews. If empty, the item's main photo is used. |
| **Hide from search engines (noindex) and the sitemap** | Tick **only** for items that should not be in Google, for example discontinued products or confidential client projects. The page still works for visitors with the link. |
| **Google preview** | Shows roughly how the result will look. |

6. Click **Save**.
7. **Check:** open the public page → **Ctrl + U** → search `<title>`.

**Order of work:** start with the items that bring business: your top 5 products, your top 5 projects (biggest, most recognisable clients), then all services.

### 3.4 Resource articles [You]

1. Admin → left menu **Resources**. The edit form is at the top; the list of articles is below it.
2. In the list, click **Edit** next to an article. Its fields load into the form at the top.
3. Fill in **Meta title** and **Meta description** (rules in 3.1). Also make sure **Excerpt** is a good 1–2 sentence summary.
4. Click **Update post**.

### 3.5 Press posts [You]

Press posts have no separate SEO fields. Google uses the post **Title** as the title and the **Excerpt** as the description. So write the excerpt as a 120–160 character description, and make the title descriptive (for example `Zigma Commissions 2 MWh Battery Storage System for Pune Data Centre`).

### 3.6 Image alt text [You]

**What:** alt text is a short description of an image, read by Google Images and by screen readers for blind users.

**Rules:**
- Describe what is in the image in 5–15 words: `Technician servicing a 40 kVA online UPS in a hospital server room`.
- Include the service or place naturally when it is true; do not stuff keywords.
- Decorative images (patterns, background textures) do not need alt text.

**How:**
1. Admin → left menu **Media**.
2. Under an image, click **Edit**. The **Edit media** window opens.
3. Type the description in **Alt text** → click **Save**.
4. Do this first for images used in page heroes, project photos, and product photos.

### 3.7 Changing a page address safely (redirects) [You]

**Why:** if a page's address changes (for example you rename a product's slug), Google and anyone who saved the old link land on an error page. A 301 redirect sends them to the new address and keeps the page's Google value.

**Whenever you change a slug, or delete a page that was live:**
1. Note the **old address** path, for example `/products/online-ups-20kva`.
2. Admin → left menu **Redirects** → in the **URL redirects** box fill in:
   - **From path:** `/products/online-ups-20kva` (starts with `/`, no domain)
   - **To path or URL:** `/products/online-ups-20-kva` (the new address, or the closest related page)
   - **Status:** **301 permanent**
3. Click **Add redirect**. Wait about 1 minute (redirects are cached for up to 30 seconds).
4. **Check:** open `https://zigma-technologies.com/products/online-ups-20kva`. **Expect:** the address changes to the new one.

**Never** delete a page that gets visitors or has links pointing to it without adding a redirect.

### 3.8 When to hide, unpublish, redirect or delete

| Situation | Do this |
| --- | --- |
| Product discontinued, but a replacement exists | Redirect (301) the old product to the replacement, then unpublish the old item |
| Product discontinued, no replacement | Redirect to the product category or `/products` |
| Confidential project that clients may still see via a direct link | Keep published, tick **Hide from search engines** in the SEO tab |
| Duplicate or test item | Unpublish and redirect to the real item (or to its listing page) |
| Page renamed | Change slug + add a 301 redirect (3.7) |

---

## Phase 4 — Page speed (Week 2)

**Goal:** make sure the site loads fast on mobile phones.

**Why:** speed is a Google ranking factor, and more importantly, slow pages lose enquiries: every extra second of loading reduces conversions. Google measures **Core Web Vitals** from real Chrome users: **LCP** (main content loaded, target under 2.5 seconds), **INP** (response to taps, under 200 ms), **CLS** (layout jumping, under 0.1).

### 4.1 Measure [You]

1. Repeat the PageSpeed Insights test from step 0.4 Part D for home, `/projects`, one project page, and `/locations/bengaluru`, on **Mobile**.
2. Write the numbers in your sheet (new column with today's date).
3. On each report scroll down to **Diagnostics**. Note the top 3 items. Common ones and what they mean:

| PageSpeed item | Plain meaning | Who fixes it |
| --- | --- | --- |
| **Largest Contentful Paint element** / **Properly size images** / **Serve images in next-gen formats** / **Efficiently encode images** | A photo is too large (file size or pixel size) | **You**: step 4.2 |
| **Reduce initial server response time** (over 600 ms) | The server is slow to start the reply | **Developer**: step 4.4 |
| **Eliminate render-blocking resources** (fonts.googleapis.com) | Web fonts delay the first paint | **Developer**: step 4.4 |
| **Reduce unused JavaScript** | Code shipped that the page does not use | Developer, low priority |
| **Avoid large layout shifts** | Things jump while loading | Developer, with the page address |

**Targets:** Mobile Performance **70+** is acceptable, **85+** is good. Desktop is usually much higher.

**Also check the real-user report once traffic builds up:** Search Console → left menu **Experience** → **Core Web Vitals** → **Mobile**. **Expect:** most addresses under **Good**. This report needs enough visitors and updates over a 28-day window.

### 4.2 Make images light before uploading [You]

Images are the most common reason for a slow site, and you control them.

**Rules for every image you upload in Admin → Media:**

| Image use | Maximum width | Target file size | Format |
| --- | --- | --- | --- |
| Full-width hero / slider background | 1920 px | under 300 KB | WebP (or JPG) |
| Project / product main photo | 1600 px | under 250 KB | WebP (or JPG) |
| Cards, thumbnails, gallery | 1200 px | under 150 KB | WebP (or JPG) |
| Logos, icons | as small as looks sharp | under 50 KB | SVG or PNG |

**How to shrink an image (free, in the browser):**
1. Open <https://squoosh.app>.
2. Drag the image onto the page.
3. On the right side:
   - **Resize:** switch on → set **Width** (for example `1600`); height adjusts automatically.
   - **Compress:** choose **WebP**, **Quality** `75`.
4. The bottom-right shows the new file size. Aim for the target in the table.
5. Click the **download** button (bottom-right).
6. Upload the new file in Admin → Media, then replace the old image where it is used.

**Videos:** keep hero videos under 5 MB, 10–20 seconds long, no sound track. Always set a poster (still image) if the editor offers it.

**Start with:** the homepage slider images, then `/projects` card images, then the photos on your top 10 detail pages.

### 4.3 Check the server is doing its part [Developer]

The Next.js server already compresses pages and marks build files for long browser caching, so no extra nginx settings are needed for that. Verify:

```bash
curl -sI -H "Accept-Encoding: gzip, br" https://zigma-technologies.com/ | grep -iE "content-encoding|cache-control"
curl -sI https://zigma-technologies.com/_next/static/chunks/$(curl -s https://zigma-technologies.com/ | grep -o '_next/static/chunks/[^"]*\.js' | head -1 | sed 's#_next/static/chunks/##') | grep -i cache-control
```

**Expect:** the first shows `content-encoding: gzip` (or `br`). The second shows `cache-control: public, max-age=31536000, immutable`.

**Server response time (TTFB):**

```bash
curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" https://zigma-technologies.com/
```

Run it 3 times from your computer (PowerShell: use `curl.exe`). **Expect:** under 0.6 seconds. If it is consistently over 0.8 s, see 4.4.

### 4.4 Deeper speed improvements (optional developer backlog)

Do these only if Mobile Performance stays below 70 **after** step 4.2. They need a developer and normal code review.

| Task | What it involves | Expected gain |
| --- | --- | --- |
| Cache CMS reads | Wrap site settings, site copy, navigation and catalog lists in `unstable_cache` with tags; call `revalidateTag(tag, 'max')` in the admin save routes (Next 16 requires the second argument). Details: `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`. | Faster server response (TTFB) |
| Self-host fonts with `next/font` | Replace the Google Fonts `<link>` in `src/app/layout.tsx`. Careful: the logo font picker and Theme Studio refer to font names, so test the header logo and theme after the change. | Removes render-blocking fonts |
| Convert remaining `<img>` to `next/image` | `LocationLandingView`, `IndustryLandingView`, `ResourceDetailView`, `resources/page.tsx`, `SocialProofStrip`, `CertMarquee`; set `sizes`, and `priority` on the hero image | Smaller images, less layout shift |
| Upload size warning | Warn in Admin → Media when an image is over 500 KB (`media-upload-rules.ts`) | Stops heavy images at the source |

---

## Phase 5 — Local SEO: Google Business Profile, directories, reviews (start Day 1)

**Goal:** appear in the Google Maps "3-pack" (the map with three companies) when someone nearby searches for things like "UPS AMC Bengaluru" or "solar EPC company near me".

**Why this matters for you:** for B2B service companies, many first contacts come from the map results, not the website results. The map ranking depends mostly on three things: a complete and verified **Google Business Profile**, **consistent company details** across the internet, and **real reviews**.

### 5.1 Decide your official company details (NAP) once [You]

**What:** NAP means **N**ame, **A**ddress, **P**hone. Google cross-checks these on your website, your Business Profile and directories. Any difference (for example "Zigma Technologies Pvt Ltd" in one place and "Zigma Tech" in another, or two different phone numbers) weakens trust.

1. Open your baseline sheet → add a tab **NAP**.
2. Write down the exact text you will use **everywhere, forever**.

> **The "Example" column is placeholder text, not your real details.** The address and phone number are made up to show the format. Replace every value with your own before you enter it anywhere.

| Item | Example (placeholder, replace) | Rules |
| --- | --- | --- |
| Name | `Zigma Technologies` | The real-world name on your signboard, invoices and GST certificate. No extra keywords ("Zigma Technologies – Best Solar Company" breaks Google's rules and can get the profile suspended). |
| Address | `No. 12, 3rd Cross, Peenya Industrial Area, Bengaluru, Karnataka 560058` | Exactly as Google Maps shows it for your pin. Same order, same abbreviations, same road names (if Maps includes a road such as "DLF City Road", include it everywhere; if not, leave it out everywhere). |
| Phone (main) | `+91 80 1234 5678` | One main landline or mobile that is answered in office hours. Use the same number everywhere, written the same way (pick one format, e.g. `+91 95901 12345`, and never mix it with `+91 9590112345`). |
| Phone (emergency) | `+91 98765 43210` | Only if you run a 24×7 line. Keep it separate from the main phone and always label it "Emergency". Do not use it as the main number. |
| Website | `https://zigma-technologies.com` | Always the apex address (without `www`). |
| Email | `info@zigma-technologies.com` | One public domain email, not Gmail. Use the same address in every place that shows "email us". |
| Hours | `Mon–Sat 9:30–18:30` | Match what you really do. The same hours must appear in the footer, on the Contact page and on Google Business Profile. |
| Short description (250 characters) | *(write one)* | Reused in directories. |
| Long description (750 characters) | *(write one; template in 5.2 under "Complete the profile")* | Reused in Business Profile and directories. |

3. Enter the details once in **Admin → Site Settings** and link the rest of the website to them (below).

#### Where NAP appears and how to update each place

**Site Settings is the one place where company details are typed.** Everything else on the website either reads Site Settings directly or shows a **placeholder** such as `{{phone}}` that the website replaces with the Site Settings value when the page is shown. Change the phone once in Site Settings and the header, footer, Contact page, Careers page, structured data and emails all change with it.

| Placeholder | Filled with (Site Settings field) |
| --- | --- |
| `{{companyName}}` | Brand & identity → Company name |
| `{{phone}}` | Contact details → Main phone |
| `{{emergencyPhone}}` | Contact details → Emergency phone |
| `{{email}}` | Contact details → Info email |
| `{{supportEmail}}` | Contact details → Support email |
| `{{address}}` | Address & office → street lines, city, state and PIN on one line |
| `{{street}}`, `{{city}}`, `{{region}}`, `{{postalCode}}` | The single address parts |
| `{{hours}}` | Address & office → Office hours |

For links, put the placeholder after `tel:` or `mailto:`: `tel:{{phone}}`, `mailto:{{email}}`. The website removes the spaces from phone links automatically.

**A. Admin → Site Settings** (`/admin/site-settings`): type the details here

| Section → field | What it controls on the website |
| --- | --- |
| **Brand & identity** → Company name, Logo image URL | Hidden structured data (Organization / LocalBusiness) on every page, header and footer brand name, auto-reply emails |
| **Contact details** → Main phone | Structured data `telephone`, header **Talk to us** menu, floating/sticky call button on mobile, thank-you page ("Call …"), auto-reply emails ("For urgent support, call …") |
| **Contact details** → Emergency phone | Structured data "technical support" contact (24×7), header **Talk to us** menu emergency chip |
| **Contact details** → Info email | Structured data `email` |
| **Contact details** → Support email | Careers auto-reply email ("email … or call …") |
| **Contact details** → WhatsApp | WhatsApp buttons in the header menu, mobile/floating buttons and thank-you page (digits only, with country code, e.g. `919590112345`) |
| **Address & office** → Street lines 1–4, City, Region/state, Postal code, Country code | Structured data `address`; footer **Office** block (each street line is one footer line) |
| **Address & office** → Office hours | Footer **Office** block hours, thank-you page, `/sla` page |
| **Social links** → LinkedIn / Facebook / YouTube / Instagram / X | Structured data `sameAs` (tells Google which profiles are yours), footer social icons |

How to update: open each section → change the field → **Save settings** (bottom-right). Changes are live immediately, including every placeholder in menus and pages.

**B. One-time: link menus and pages to Site Settings**

Older menus and page sections still contain typed copies of the phone numbers, emails, head-office address and hours. Replace them with placeholders once:

1. Fill in and **save** Site Settings first (step A). The tool uses the saved values.
2. In Site Settings, open **Contact details** → scroll to **Use these details everywhere** → click **Scan menus & pages**.
3. **Expect:** a table with every field that will change. **Now typed** is the current text, **Becomes** is the placeholder, **Visitors will see** is the result with your Site Settings values. Read the last column carefully: for example, if the Contact page address contains a road name that Site Settings does not, the road name disappears. Fix Site Settings, save, and scan again until the last column is right.
4. Click **Link N field(s)**. **Expect:** "Linked N field(s)". Scan again: it should say **Nothing to link**.

What the tool changes:
- Phone numbers that match the Site Settings phones (or appear in a `tel:` link) in the footer/header menus and in every page section. Items labelled **Emergency**, **urgent** or **24×7** get `{{emergencyPhone}}`; all others get `{{phone}}`.
- The Info email and Support email (other addresses such as `careers@` or `hr@` stay as typed).
- The **Head Office** address on the Contact page (only if Site Settings has a street) and "City, State" lines such as "Bengaluru, Karnataka".
- The **Business Hours** rows in the Contact Form section become one `{{hours}}` row.

What it leaves alone: regional hub addresses (Mumbai, Noida…) and hub phone numbers that differ from Site Settings, because those are genuinely different offices. Edit those in **Pages → contact → Locations**. Make sure each hub title matches its address (a Noida address should be titled "Noida, Uttar Pradesh" or "Delhi NCR", not "Delhi, Uttar Pradesh").

**C. When you add new text in Navigation or Pages**

Type the placeholder instead of the number, email or address, for example in **Navigation → Footer → Edit nav item**: Label `{{phone}}`, Href `tel:{{phone}}`; or Label `Emergency Call: {{emergencyPhone}} →`, Href `tel:{{emergencyPhone}}`. The Navigation and Pages screens show a reminder of the placeholders.

**D. Outside the website**

Google Business Profile (5.2), Bing Places and Apple Business Connect (5.4), and every directory and social profile in 5.5 (Justdial, IndiaMART, LinkedIn, Facebook, etc.). Copy the text from your NAP sheet each time; do not retype it from memory.

#### Check that everything matches

1. **Structured data:** open `https://zigma-technologies.com/` → **Ctrl + U** → **Ctrl + F** → search `"LocalBusiness"`. Compare `name`, `telephone`, `email`, `streetAddress`, `postalCode` and `sameAs` with your NAP sheet. (The website removes stray commas, spaces around the PIN code and `#` social links automatically.)
2. **Footer:** scroll to the bottom of any page. Phone, email, address and hours must match the sheet character for character.
3. **Contact page:** open `/contact` and check every phone, email, address and hours line (Quick Contact, the Emergency card, Locations, Contact Form side panel).
4. **Linking:** Site Settings → Contact details → **Scan menus & pages** must say **Nothing to link**. If it lists fields, someone typed a number or email again; click **Link**.
5. **Google Business Profile:** name, address, phone, website and hours must match the sheet.
6. Write the date of the check in your NAP sheet. Repeat after any change of phone, address or hours.

> **Known mismatches found on production (28 Sep 2026).** Entering the NAP in Site Settings and running **Scan menus & pages → Link** (B above) fixes all except the Noida hub title, which you edit in Pages → contact → Locations:
> - Main phone: structured data and footer show the emergency line; the Contact page shows a different head-office number.
> - Phone written two ways (`+91 95901 37666` and `+91 9590137666`).
> - Email: `info@` in the footer and structured data, `support@` on the Contact page.
> - Address: the Contact page includes "DLF City Road"; the footer and structured data do not. Structured data has `,,` and a trailing comma (street lines end with commas) and a leading space in the PIN code.
> - Hours: footer `Mon–Sat 9:30–18:30 IST`; Contact page `Mon–Sat 9:00 AM–7:00 PM, Sunday closed`.
> - Social links: all set to `#`, so Google receives four fake `https://#` profiles.
> - Locations: Noida hub titled "Delhi, Uttar Pradesh".

### 5.2 Create and verify your Google Business Profile [You]

**What:** the free listing that shows your company on Google Maps and on the right side of Google results.

**Before you start:**
- Use a Google account that the **company** controls (for example the same account as Search Console). Do not use a personal account of an employee who may leave.
- Have ready: NAP from 5.1, logo (square, 720×720 px), a cover photo (1080×608 px), 10+ real photos (office, team, installations), and proof of business (GST certificate, utility bill with the address, signboard photo). Proof may be needed for verification.
- **Check first whether a profile already exists.** Search Google for `Zigma Technologies Bengaluru`. If a map listing appears, click it → look for **Own this business?** or **Claim this business** → follow the prompts instead of creating a new one. Duplicate profiles hurt ranking.

**Create the profile:**
1. Open <https://business.google.com> → click **Manage now** (or **Get started**) → sign in with the company Google account.
2. **Business name:** type your official name exactly (5.1). If Google suggests an existing listing with the same name, select it and claim it rather than creating a duplicate. Click **Continue**.
3. **Business category:** type and choose the **primary category**, the one that best describes your main business. Start typing and pick from the list; only listed categories are allowed. Good candidates for you:
   - `Solar energy company` (if solar EPC is your biggest line of business)
   - `Electrical equipment supplier` or `Electrical engineer` (if UPS/power is the biggest)

   You add more categories later. Click **Continue**.
4. **Do you want to add a location customers can visit, like a store or office?**
   - Choose **Yes** only if the office is staffed during business hours and has signage (customers or suppliers can walk in). Then enter the address exactly as in 5.1 and confirm the pin position on the map (drag it onto your building).
   - Choose **No** if the address is only a registered office or home. You then become a "service-area business" and the address stays hidden.
5. **Service areas:** add the cities/regions you actually serve, for example `Bengaluru`, `Chennai`, `Hyderabad`, `Pune`, `Mumbai`, `Delhi`. Up to 20 are allowed. Click **Next**.
6. **Contact details:** phone number (from 5.1) and **Website**: `https://zigma-technologies.com`. Click **Next**.
7. **Stay in the know / updates:** choose **Yes** or **No** as you like. Click **Next**.
8. **Verification:** Google offers one or more methods. Which ones you see is decided by Google:

| Method | What to do | Time |
| --- | --- | --- |
| **Video recording** (most common now) | Record one continuous video on your phone, 30–60 seconds: start outside showing the street and nearby landmark, then the signboard with the company name, then walk inside showing the office / workshop / equipment, and finally show a document with the business name (GST certificate, invoice) or open the office door with a key. Upload in the Business Profile app or the web page. | Review in about 1–5 business days |
| **Phone or SMS** | Get a code on the business phone, type it in | Instant |
| **Email** | Get a code on the business email | Instant |
| **Postcard** | A postcard with a code is mailed to the address | 2–4 weeks |
| **Live video call** | Short call with a Google agent, show the same things as the recorded video | Scheduled |

**Expect:** after verification the profile shows **Your business is verified** (or a blue tick / **Verified** label) and becomes visible on Maps within a few days.

**If it goes wrong:**
- **Verification failed / rejected:** the most common causes are a business name with extra keywords, no signboard visible in the video, or an address that does not match your documents. Fix the cause and choose **Retry verification** (or **Get verified**) in the profile.
- **Profile suspended:** you receive an email. Do not create a new profile. Open the link in the email → **Request reinstatement** → upload proof (GST certificate, signboard photo, utility bill).
- **Stuck in "Pending review" for more than 2 weeks:** contact support from the profile: **Support** (the `?` icon) → **Contact us**.

**Complete the profile (do not skip; complete profiles rank better):**
1. On Google Search, search your company name while logged in. The profile editing panel appears at the top. (Alternatively go to <https://business.google.com>.) Click **Edit profile**.
2. **About / Business information:**
   - **Additional categories:** add 3–6 that match your real services, for example `Solar energy system service`, `Solar energy equipment supplier`, `Electrical installation service`, `Energy equipment and solutions`, `Battery wholesaler`, `Electric vehicle charging station contractor`. Only pick ones you actually do. If one is not in the list, skip it.
   - **Description** (750 characters maximum). Template:

     > Zigma Technologies is a Bengaluru-based power and energy engineering company serving industries, hospitals, data centres and campuses across India since [year]. We design, supply, install and maintain rooftop and ground-mount solar EPC projects, online UPS systems, battery energy storage (BESS) and EV charging infrastructure. Our in-house engineers provide 24×7 emergency support and annual maintenance contracts (AMC) for all major UPS brands. [Add 1 proof point: number of projects, MW installed, notable certifications or OEM partnerships.] Contact us for a free site survey and proposal.

     Do not put links, prices or promotional phrases ("best", "No.1") in the description.
   - **Opening date:** the year the company started.
3. **Contact:** phone, website. Leave **Appointment link** empty or use `https://zigma-technologies.com/contact`.
4. **Hours:** from 5.1. Add **More hours** → **Online service hours** or **Emergency** if you offer 24×7 support.
5. **Services** (under **Products** / **Services** or **Edit services**): add each service with a one-line description, for example:
   - `Solar EPC (rooftop and ground-mount)`
   - `UPS supply and installation`
   - `UPS AMC and repair`
   - `Battery energy storage (BESS)`
   - `EV charger installation`
   - `Electrical field services and commissioning`
6. **Products** (optional): add your top 5 products with a photo, a short description and a **Learn more** button linking to the product page on your website.
7. **Photos:** upload at least 10: logo, cover, office exterior (helps customers find you), team, 5+ installation photos with the city in the file name, for example `rooftop-solar-hosur.jpg`. Add a few new photos every month.
8. **Attributes** (if shown): tick what applies, for example **Online appointments**, **Onsite services**.

### 5.3 Post updates and set up your review link [You]

**Posts** keep the profile active and can show in the listing:
1. In the profile panel click **Add update** (or **Create post**).
2. Choose **Add update**. Add a photo from a real project, 100–300 words (what, where, result), and a button **Learn more** → link to the project page on your website.
3. Click **Publish**.
4. Do this **2–4 times per month**. Ideas: a completed project, a new product, a certification, a team event, a safety tip.

**Review link:**
1. In the profile panel click **Ask for reviews** (or **Get more reviews**).
2. Click **Copy link**. It looks like `https://g.page/r/...`.
3. Save it in your NAP sheet. You use it in 5.6.

### 5.4 List your company on Bing Places and Apple Business Connect [You]

**Bing Places** (feeds Bing, Microsoft Copilot and Windows Maps):
1. Open <https://www.bingplaces.com> → **Sign in** with a Microsoft account (or your Google account).
2. Choose **Import from Google Business Profile** → sign in to the same Google account → select your business → **Import**.
3. **Expect:** your listing is created with the same data, often verified automatically. If asked to verify, pick phone or email.

**Apple Business Connect** (feeds Apple Maps and Siri on iPhones, which many senior decision makers use):
1. Open <https://businessconnect.apple.com> → sign in with an Apple ID (create one with your company email if needed).
2. Click **Add a new location** (or search for your business and **Claim**).
3. Enter your NAP exactly as in 5.1 → choose a category → add hours and website.
4. Verify by phone call or by uploading documents.

### 5.5 Create consistent listings on business directories (citations) [You]

**What:** "citations" are mentions of your NAP on other websites. Consistent citations on trusted directories confirm to Google that you are real, and the directories themselves send B2B enquiries.

**Procedure for every directory:**
1. Search the directory for your company first. If a listing exists, claim it instead of creating a new one.
2. Copy Name, Address, Phone, Website **exactly** from your NAP sheet (5.1).
3. Use the long description from 5.1, adapted to the directory's length limit.
4. Add your logo and 5+ photos.
5. Choose the most accurate category.
6. Record the result in your sheet: directory, URL of your listing, login email, date.

**Where to list (in this order):**

| Directory | Address | Why | Notes |
| --- | --- | --- | --- |
| LinkedIn company page | <https://www.linkedin.com/company/setup/new/> | B2B trust, also used in Site Settings → Social links | Post each project here too |
| IndiaMART | <https://seller.indiamart.com> | Largest Indian B2B marketplace; direct leads | Free listing is enough to start; they will call you to sell paid plans |
| TradeIndia | <https://www.tradeindia.com> | B2B marketplace | Free listing |
| Justdial | <https://www.justdial.com/Free-Listing> | Strong local search presence | Free listing |
| Sulekha | <https://www.sulekha.com> | Local services | Free business listing |
| ExportersIndia | <https://www.exportersindia.com> | B2B | Free listing |
| Facebook page | <https://www.facebook.com/pages/create> | Citations, photos | Add NAP in the About section |
| YouTube channel | <https://www.youtube.com> → **Create a channel** | Project videos rank in Google too | Add website link in channel details |
| OEM partner dealer locators | the websites of brands you are an authorised partner of | Very strong, relevant links | Ask your OEM manager to list you with a link to your website |
| Industry associations | e.g. state solar/renewable associations, MSME/Udyam, local chamber of commerce | Trust and links | Membership often includes a directory listing |

**Do not** buy listings on hundreds of low-quality "directory submission" sites. They do not help and can look like spam.

### 5.6 Collect reviews every month [You]

**Why:** the number, recency and quality of Google reviews is one of the strongest map ranking factors, and prospects read them.

**Rules (Google policy; breaking them can remove reviews or suspend the profile):**
- Ask **all** customers, not only the happy ones (no "review gating").
- Never offer money, discounts or gifts for reviews.
- Never write reviews yourself or ask employees to review the company.
- Never copy reviews from elsewhere onto your website as "reviews" markup (the website already avoids this).

**Process:**
1. After every completed project, AMC renewal, or successful service call, send the review request (template below) within 3 days.
2. If no review after 7 days, send one polite reminder. Do not send more.
3. Target: **2–4 new reviews per month**. A steady flow is better than 20 in one week.

**WhatsApp / SMS template:**

> Hello [Name], thank you for choosing Zigma Technologies for [project/service]. If you're happy with our work, would you share a short Google review? It takes one minute and helps other companies find us: [your review link from 5.3]. Thank you! – [Your name], Zigma Technologies

**Email template:**

> Subject: How did we do on [project name]?
>
> Dear [Name],
>
> Thank you for trusting Zigma Technologies with [project/service] at [site/city]. We hope everything is running well.
>
> Would you take a minute to share your experience on Google? Your feedback helps us improve and helps other facility and plant managers make informed decisions.
>
> Leave a review: [your review link]
>
> If anything was not up to your expectations, please reply to this email directly so we can fix it.
>
> Warm regards,
> [Name], [Role]
> Zigma Technologies | [phone]

**Reply to every review within 2 days** (profile → **Reviews** → **Reply**):

- **Positive review template:** "Thank you, [Name]! It was a pleasure delivering the [500 kWp rooftop solar plant] for [company] in [city]. Our AMC team is always available on [phone] if you need anything."
- **Negative review template:** "Dear [Name], we're sorry to hear about your experience with [issue]. This is not the standard we aim for. Our service manager [name] will call you today to resolve it; you can also reach us on [phone]." Then actually call. Never argue in public.
- **Fake / spam review** (not a customer): profile → **Reviews** → the review's three dots → **Report review** → choose the reason. Google decides; it can take days.

---

## Phase 6 — City and language pages (Weeks 3–6)

**Goal:** get found for "service + city" searches without being penalised for thin, copy-paste pages.

### 6.1 What is live, and what is deliberately hidden

| Page type | Example | Count | Status | Why |
| --- | --- | --- | --- | --- |
| City hub | `/locations/bengaluru` | 6 (Bengaluru, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR) | **In Google** | Each has a unique introduction and highlights |
| City × service | `/locations/bengaluru/ups-amc` | 36 (6 cities × 6 services) | **Hidden** (noindex, not in sitemap) | The text is the same template with only the city name changed. Google calls such pages "doorway pages" and can demote the **whole site** for them. |
| Hindi / Kannada home | `/hi`, `/kn` | 2 | **Hidden until you switch them on** (6.3) | Redirect to the English home while switched off |
| Hindi / Kannada city | `/hi/locations/bengaluru` | 12 possible | Only Bengaluru has a translation; others are hidden | Untranslated pages would be duplicates of English |

Visitors can still open and use every hidden page; they are only kept out of Google.

### 6.2 Make the six city pages stronger [You]

The city pages get their text from **Admin → Site Copy → Locations JSON**. Each city has:
- `eyebrow`: the small line above the heading
- `lead`: the introduction under the heading (also used as the Google description, so keep it 120–160 characters)
- `highlights`: 3–6 bullet points under "Why teams in [city] work with Zigma"
- `serviceTags`: catalog tags used to choose the 6 projects/products shown on the page

**Step A — show local projects on each city page:**
1. Admin → **Inventory** → **projects** → **Edit** a project that was done in or near Bengaluru → **Basics** tab → **Tags (comma separated)** → add `Bengaluru` (exact spelling and capital letter, as the city name) → **Save**.
2. Repeat for all projects, using the city name that matches the city page (`Chennai`, `Hyderabad`, `Mumbai`, `Pune`, `Delhi NCR`).
3. In Step B, put the city name first in that city's `serviceTags`, so local projects show first.

**Step B — edit the city text:**
1. Admin → left menu **Site Copy** → tab **Locations JSON**.
2. **First make a backup:** click in the big text box → **Ctrl + A** → **Ctrl + C** → paste into a Notepad file and save it as `locations-backup-<date>.txt`.
3. Edit the text of one city. Only change the text between quotes. Example for Bengaluru:

```json
{
  "key": "bengaluru",
  "name": "Bengaluru",
  "state": "Karnataka",
  "eyebrow": "Head office and 24×7 service hub",
  "lead": "Solar EPC, online UPS, BESS and 24×7 AMC for Bengaluru factories, hospitals and tech parks. 150+ local projects, 4-hour emergency response.",
  "subject": "Bengaluru site enquiry",
  "highlights": [
    "Head office and spares warehouse in Peenya",
    "4-hour emergency response within city limits",
    "150+ projects in Bengaluru, Hosur and Tumakuru",
    "Rooftop solar experience on 40+ factory roofs"
  ],
  "serviceTags": ["Bengaluru", "UPS", "Solar EPC", "AMC"]
}
```

   Replace the numbers and facts with **your real ones**. Never invent numbers.

4. **Do not** change the `key` value, and keep all quotes `"`, commas `,` and brackets `[ ] { }`. A missing comma breaks the whole list.
5. Before saving, check the JSON: copy the whole box → open <https://jsonlint.com> → paste → **Validate JSON**. **Expect:** `Valid JSON`. If not, the message tells you the line with the mistake.
6. Click **Save site copy**. **Expect:** "Site copy saved."
7. Open `https://zigma-technologies.com/locations/bengaluru` → check the new text and that local projects appear.

**If it goes wrong:** if the page looks broken or the text box shows an error, paste your backup back into the box and click **Save site copy**.

**Good highlights are specific and true:** office or warehouse in the city, number of projects there, named industrial areas you serve, response time, local team size, well-known local clients (with permission).

### 6.3 Decide on the Hindi and Kannada pages [You]

**Recommendation:** leave them **switched off** unless you have a native speaker who can translate and maintain the content, and you know customers search in those languages. Most B2B buyers of solar/UPS search in English.

**To switch them on:**
1. Admin → left menu **Site Copy** → tab **Locales** → check and correct the Hindi (**HI**) and Kannada (**KN**) texts with a native speaker.
2. Tab **Features** → tick **Enable hi/kn locale landings**.
3. Click **Save site copy**.
4. **Expect:** `https://zigma-technologies.com/hi` shows the Hindi page (instead of redirecting to the English home). The sitemap gains `/hi`, `/kn`, `/hi/locations/bengaluru` and `/kn/locations/bengaluru`, and the English pages link to them with "hreflang" tags so Google shows the right language to each user.

**To translate more cities** (for example Chennai in Hindi) **[Developer]:** add an entry to `LOCALE_CITY_COPY` in `src/lib/locale-locations.ts` with a native-speaker `title` and `lead`, then deploy. Only translated cities become indexable; the others stay hidden automatically.

### 6.4 Publish a city × service page properly (only with real local content)

**When:** only when you have real, specific content for that city and service: local projects, local team, response times, local clients or testimonials, local regulations (for example BESCOM net-metering for solar in Bengaluru). Aim for at least 600 words of unique text. Start with your top 2–3 combinations, for example UPS AMC in Bengaluru and Solar EPC in Bengaluru.

**Content brief (fill in before writing):**

| Item | Your answer |
| --- | --- |
| Page | e.g. UPS AMC in Bengaluru |
| Target search | e.g. "UPS AMC Bengaluru", "UPS maintenance contract Bangalore" |
| Local proof | 3–5 local projects/clients, number of UPS under AMC in the city |
| Local team | Engineers based in the city, spares stock location |
| Response time | e.g. 4 hours within city limits |
| Local specifics | Areas covered (Peenya, Whitefield, Electronic City...), local utility/regulation notes |
| FAQs | 4–6 real questions customers ask |
| Call to action | Free site audit / AMC quote |

**Option A — no-code (recommended): a landing page in the page builder [You]**
1. Admin → **Pages** → **Create page** box → **Title:** `UPS AMC in Bengaluru` → **Slug:** `ups-amc-bengaluru` → click **Create**.
2. Click **Sections** in the new page's row → add sections (hero, text, projects, FAQ, call to action) with your unique content → fill **Page details / SEO** (Phase 3 rules) → **Save page details**.
3. Click **Publish** in the page list. The page is now `https://zigma-technologies.com/ups-amc-bengaluru` and is added to the sitemap automatically.
4. Admin → **Redirects** → **From path:** `/locations/bengaluru/ups-amc` → **To path or URL:** `/ups-amc-bengaluru` → **301 permanent** → **Add redirect**. Now the template page forwards to your real page and the "Services in Bengaluru" links on the city page lead to it.
5. Link to the new page from the relevant service page and the Bengaluru city page text.

**Option B — developer: switch on the built-in template page [Developer]**
Add the pair to the allowlist in `src/lib/location-services.ts`, for example `new Set<string>(['bengaluru/ups-amc'])`, and deploy. The page then becomes indexable and appears in the sitemap. Only do this after the template itself has been extended with the unique local content above; otherwise it is still a doorway page.

---

## Phase 7 — Keywords and content (ongoing)

**Goal:** create pages that answer what your buyers search for, and connect them so Google understands you are an expert.

**Why:** technical fixes make the site readable to Google. Content decides **which searches** you appear for. For B2B buyers the winning content is: detailed case studies, clear product/service pages, and practical guides (sizing, costs, comparisons, regulations).

### 7.1 Find what people search for (keyword research) [You]

You need a list of searches (keywords) to target. Use three free sources.

**Source A — your own Search Console data (best, once you have 4+ weeks of data):**
1. Search Console → **Performance** (left menu) → **Search results**.
2. At the top, click **Date: Last 3 months** → keep it, or choose **Last 6 months** when available.
3. Tick the boxes **Total impressions**, **Average CTR**, **Average position** (in addition to **Total clicks**).
4. Below the chart, stay on the **Queries** tab. Click **Export** (top right) → **Google Sheets**.
5. In the sheet, look for:
   - queries with many impressions but position 5–20: the "almost there" list; improve those pages first (7.6).
   - queries you did not expect: new page ideas.

**Source B — Google's own suggestions:**
1. Open Google in a private window (**Ctrl + Shift + N**).
2. Type a seed phrase slowly, for example `ups amc`, and note the suggestions that drop down (`ups amc bangalore`, `ups amc cost`...).
3. Press Enter. Note the questions in the **People also ask** box and the **Related searches** at the bottom.
4. Repeat for seeds: `solar epc`, `rooftop solar for factory`, `online ups`, `bess`, `battery energy storage`, `ev charger installation`, `ups rental`, `solar net metering karnataka`.

**Source C — Google Keyword Planner (search volumes, free):**
1. Open <https://ads.google.com> → sign in with the company Google account.
2. If asked to create a campaign, look for **Switch to Expert Mode** (small link at the bottom) → then **Create an account without a campaign** → confirm country **India**, time zone, currency **INR** → **Submit**. No payment is required.
3. Top menu **Tools** (wrench icon) → **Planning** → **Keyword Planner** → **Discover new keywords**.
4. Type 3–5 seeds (for example `ups amc`, `online ups`, `solar epc`) → set location **India** (or a specific city) → **Get results**.
5. **Expect:** a list with **Avg. monthly searches** (shown as a range, like 100–1K, without an active ads account). Click **Download keyword ideas** (top right) → **Google Sheets**.

**How to choose:**
- Prefer searches with clear buying intent: "amc", "price", "cost", "company", "contractor", "supplier", "installation", a city name.
- Low volume is fine for B2B. 50 searches a month from facility managers can be worth more than 5,000 from students.
- Group near-identical searches ("ups amc bangalore", "ups maintenance contract bengaluru") into one topic; one page serves all of them.

### 7.2 Map each topic to one page [You]

**Why:** one topic = one page. Two pages targeting the same search compete with each other ("cannibalisation").

Create a sheet tab **Keyword map** with these columns:

| Topic / main search | Other searches in the group | Page (address) | Page exists? | Action | Owner | Due |
| --- | --- | --- | --- | --- | --- | --- |
| online ups 20 kva | 20 kva online ups price, 20kva ups for server room | `/products/online-ups-20-kva` | Yes | Improve title/description + add specs | [name] | [date] |
| ups amc bengaluru | ups maintenance contract bangalore | `/ups-amc-bengaluru` | No | Create (6.4) | | |
| rooftop solar cost for factory | commercial solar price per kw india | `/resources/commercial-rooftop-solar-cost-india` | No | Write guide (7.4) | | |
| ups vs inverter for office | | `/resources/ups-vs-inverter-office` | No | Write guide | | |

**Which page type for which search:**

| Search looks like | Best page type |
| --- | --- |
| product name / capacity (`20 kva online ups`) | Product page |
| service + city (`ups amc bengaluru`) | City page or city × service landing page (6.4) |
| service (`solar epc company`) | Service page |
| question / "how", "cost", "vs", "guide" | Resource article |
| industry (`solar for hospitals`) | Industry page |
| proof ("solar plant for automobile factory") | Project case study |

### 7.3 Organise content into topic clusters and link them [You]

**What:** a cluster is one main page (the "pillar", for example the Solar EPC service page) plus supporting pages (projects, guides, products) that all link to it and to each other.

**Your main clusters:**
1. **Solar EPC** — pillar: Solar EPC service page. Supporting: solar projects, guides (cost, net metering, subsidy, rooftop vs ground-mount, O&M), industry pages.
2. **UPS systems & AMC** — pillar: UPS service page / UPS products listing. Supporting: UPS products, AMC service, UPS projects, guides (sizing, battery types, online vs line-interactive).
3. **BESS** — pillar: BESS page. Supporting: projects, guides (peak shaving, solar + storage, BESS cost).
4. **EV charging** — pillar: EV charging page. Supporting: projects, guides (AC vs DC chargers, fleet charging, approvals).

**Linking rules (do this every time you publish):**
- Every supporting page links to its pillar page in the first half of the text, using descriptive words ("our [solar EPC services](link)", not "click here").
- The pillar page links to its best 5–10 supporting pages.
- Each project links to the products used and the service delivered. Each product links to 1–3 projects that used it.
- Add 2–3 links to related pages at the end of every guide.

### 7.4 Publish a resource article [You]

1. Write the article in Google Docs first (checklist below).
2. Admin → left menu **Site Copy** → **Features** tab → make sure **Enable resources hub (/resources)** is ticked → **Save site copy**. (Only needed once.)
3. Admin → left menu **Resources**. Use the form at the top:
   - **Title:** the article headline, for example `Commercial Rooftop Solar Cost in India (2026 Guide)`.
   - **Slug:** `commercial-rooftop-solar-cost-india` (lowercase, hyphens, no year so the address stays valid when you update it).
   - **Excerpt:** 1–2 sentence summary (also the fallback description).
   - **Body HTML:** the article. Use `<h2>` for section headings, `<h3>` for sub-headings, `<p>` for paragraphs, `<ul><li>` for lists, `<a href="/services/solar-epc">` for links. (Ask your developer for a one-time template if you are not comfortable with HTML. Google Docs → **File** → **Download** → **Web page (.html)** also produces HTML you can paste after cleaning.)
   - **Cover URL:** upload a cover image in **Media** first (1600 px wide, WebP, under 250 KB) → **Copy URL** → paste here.
   - **Tags (comma):** e.g. `Solar, Cost, Guide`.
   - **Status:** `published`.
   - **Meta title** and **Meta description:** rules in 3.1.
4. Click **Create post**.
5. Open `https://zigma-technologies.com/resources/<slug>` and check it.
6. Search Console → **URL inspection** → paste the address → **Request indexing** (details in step 1.7 Part B).

**Article checklist:**
- Answers the main question in the first 2–3 sentences (good for Google and for AI answers).
- 1,000–2,000 words for guides; use real numbers from your projects (costs per kW, payback years, sizes).
- One `<h2>` per sub-question (use the "People also ask" questions).
- At least one table or checklist (easy to scan).
- Author name and role at the end, for example `Written by [Name], Senior Solar Design Engineer, 12 years' experience`. Google values visible expertise for technical and money topics.
- Links to the pillar page, 1–2 projects, and a call to action (contact/quote).
- No copied text. AI tools may help draft, but an engineer must check facts and add real experience; generic AI text rarely ranks.

### 7.5 Publish a project case study [You]

Case studies are your strongest content: unique, full of proof, and they match "who has done this before" searches.

1. Collect: client name (with permission) or an anonymous description ("Tier-1 auto-parts manufacturer"), location, year, capacity, challenge, solution, scope, measured results, 5–10 good photos, a client quote (with permission).
2. Admin → **Inventory** → **projects** → **Add project**.
3. **Basics** tab: **Title** (descriptive, see 3.3), **Slug**, **Summary** (2 sentences with the result), **Description**, **Category**, **Status** `published`, **Tags** (service + city, for example `Solar EPC, Bengaluru`).
4. **Case study** tab: fill **Client name**, **Client sector**, **Location**, **Delivery year**, **Challenge**, **Solution**, **Scope delivered**, **Outcomes (one per line)** with numbers, **Technologies**, **Testimonial quote / author / role** (only real quotes), and **Video URL** if you have a video.
5. **SEO** tab: meta title and description (3.3).
6. Click **Save**. Then click **Media** in the project's row → upload the photos → set the best one as the thumbnail.
7. Open the public project page → check text, photos and that the title is the page's main heading.
8. Link to it from the matching service page and product pages (7.3), and post it on LinkedIn and as a Google Business Profile update (5.3).

### 7.6 Improve pages that are "almost there" [You]

**Once a month**, this is the fastest way to gain traffic:
1. Search Console → **Performance** → **Search results** → date **Last 3 months** → tick all four boxes.
2. Click the **Pages** tab → click a page with many impressions → click the **Queries** tab. You now see the searches for that page.
3. For searches in **position 5–20**:
   - Is the exact search phrase in the page title or a heading? If not, add it naturally.
   - Does the page answer the question fully? Add a section, a table, an FAQ, a project example.
   - Add 2–3 links from other relevant pages of your site to this page.
4. For pages with good position (1–5) but low **CTR** (under 2%): rewrite the meta title and description to be more attractive (3.1).
5. Write the date and change in your sheet. Check the effect after 4–6 weeks.

### 7.7 Content calendar [You]

A realistic rhythm for a small team:

| Frequency | Content |
| --- | --- |
| Every week | 1 Google Business Profile post (5.3), 1 LinkedIn post |
| Every 2 weeks | 1 project case study (7.5) |
| Every month | 1–2 resource articles (7.4); refresh 2–3 "almost there" pages (7.6) |
| Every quarter | Update your top 5 guides (new prices, new rules); update the date in the text |

Consistency matters more than volume. Put the calendar in your sheet with owner and due date.

### 7.8 Appear in AI answers (Google AI Overviews, ChatGPT, Copilot, Perplexity) [You]

AI assistants mostly quote pages that already rank well and that state facts clearly. The same work helps both:
- Answer questions directly in the first sentences of a section ("A 100 kWp rooftop solar plant for a factory in India typically costs ₹X–₹Y lakh in 2026, depending on...").
- Use clear headings phrased as questions, tables with specifications, and real numbers.
- Keep company facts identical everywhere (NAP, services, founding year): AIs cross-check sources.
- Be mentioned on other trusted sites (Phase 8, directories in 5.5).
- Allow AI crawlers: the site's `robots.txt` does not block them; do not add blocks unless you decide to opt out.

---

## Phase 8 — Backlinks and authority (ongoing)

**Goal:** get other relevant, trusted websites to link to yours.

**Why:** links from other sites are like recommendations. A few links from relevant sources (OEM brands, clients, industry associations, news) are worth more than hundreds of random ones.

**Never** buy links, join "link exchange" schemes, or pay for "guest posts" on unrelated blogs. Google detects these and can penalise the site.

### 8.1 Easy links from people who already know you [You]

Make a list in your sheet (tab **Links**) with columns: Website, Contact person, Email, Date asked, Result, Link URL.

| Source | What to ask for |
| --- | --- |
| OEM brands you are authorised for | Listing on their "Find a partner / dealer" page with a link to your website |
| Clients | A link in their news/sustainability page for the project you delivered, or a joint case study |
| Suppliers and partners | Listing on their "Partners" or "Customers" page |
| Industry associations you belong to | Member directory listing with link |
| Certification bodies (ISO etc.) | Directory of certified companies |
| Your employees | Their LinkedIn profile "Experience" linking to the company page |

**Email template — OEM partner:**

> Subject: Partner listing for Zigma Technologies
>
> Hi [Name],
>
> As your authorised [brand] partner in [region], we've delivered [number] installations of [product line] this year, including [notable project].
>
> Could you add Zigma Technologies to your partner/dealer locator with a link to our website, https://zigma-technologies.com? Our details:
> [Name, Address, Phone from your NAP sheet]
>
> Happy to share project photos or a case study for your own marketing too.
>
> Thanks,
> [Name, Role, Phone]

**Email template — client joint case study:**

> Subject: Sharing the success of [project name]
>
> Hi [Name],
>
> The [capacity] [solar plant / UPS system] at [site] has now [result, e.g. generated 1.2 GWh / run 12 months without downtime]. We'd love to publish a short case study on our website and, if you agree, a line on your sustainability or news page linking to it.
>
> I'll send the draft for your approval before anything goes live, and we can keep your company name anonymous if you prefer.
>
> Best regards,
> [Name]

### 8.2 Earn links with useful content and news [You]

| Tactic | How |
| --- | --- |
| **Press releases for real news** | Big project commissioned, new certification, new facility, partnership. Send to trade media (for example energy/solar/electrical trade magazines and portals in India) and local business news. Also publish in **Admin → Press**. |
| **Expert quotes** | Offer journalists and trade portals comments on energy topics (tariffs, solar policy, battery costs). Include your website in your byline. |
| **Useful tools and guides** | Your UPS calculator and solar ROI tool (`/tools/...`) and in-depth cost guides are "linkable": share them on LinkedIn, in associations, with consultants. |
| **Events and talks** | Speaking at an industry event usually gets a speaker page with a link. |
| **Awards and memberships** | Apply for relevant industry awards; winners' pages link to companies. |

**Press release template:**

> **FOR IMMEDIATE RELEASE**
>
> **Zigma Technologies commissions [capacity] [project type] for [client/sector] in [city]**
>
> [City], [date] — Zigma Technologies, a Bengaluru-based power and energy engineering company, has commissioned [what] for [client/sector] at [location]. The system [key result: capacity, savings, CO₂ reduction].
>
> [2–3 sentences on the challenge and solution.]
>
> "[Quote from your MD/CEO about the significance]," said [Name], [Title], Zigma Technologies.
>
> "[Quote from the client, with permission]," said [Name], [Title], [Client].
>
> **About Zigma Technologies**
> [Short description from your NAP sheet.] More at https://zigma-technologies.com.
>
> **Media contact:** [Name], [email], [phone]

### 8.3 Check who links to you [You]

Once a month: Search Console → left menu **Links** → **Top linking sites**. **Expect:** the number grows slowly. Note new links in your **Links** sheet. If you see many links from spammy sites you do not recognise, do **not** panic; Google ignores most of them. Do not use the "Disavow" tool unless a developer/SEO expert confirms a manual penalty (Search Console → **Security & Manual Actions** → **Manual actions** shows "No issues detected" when all is fine).

---

## Phase 9 — Weekly, monthly and quarterly routine

**Goal:** keep results growing and catch problems early. Put these as recurring reminders in your calendar.

### 9.1 Every week (15 minutes) [You]

| # | Task | Where / how | What is normal | Act if |
| --- | --- | --- | --- | --- |
| 1 | Check Search Console emails | Your inbox | No emails, or "new" report notices | Any "issue detected" email: follow its link and the fix steps in 1.9 / 2.3 |
| 2 | Glance at clicks | Search Console → **Performance** → last 7 days vs previous 7 days (**Date** → **Compare**) | Small ups and downs | Drop of more than 30%: see the troubleshooting table in 9.4 |
| 3 | Reply to new Google reviews | Business Profile → **Reviews** | | Any unreplied review |
| 4 | Post one update | Business Profile → **Add update** (5.3) | | |
| 5 | Check enquiries count | Admin → **Enquiries**, or GA4 → **Reports** → **Engagement** → **Events** → `enquiry_submit` | Similar to last week | Big drop: test the contact form yourself |

### 9.2 Every month (1–2 hours) [You]

| # | Task | Where / how |
| --- | --- | --- |
| 1 | Fill in the monthly report (template below) | Search Console, GA4, Business Profile |
| 2 | Check indexing | Search Console → **Indexing** → **Pages** → compare **Indexed** count to last month; open **Why pages aren't indexed** and check no important page is listed |
| 3 | Check Core Web Vitals | Search Console → **Experience** → **Core Web Vitals** → Mobile and Desktop: "Poor" should be 0 |
| 4 | Check enhancements | Search Console → **Enhancements** reports: no new invalid items |
| 5 | Improve 2–3 "almost there" pages | Step 7.6 |
| 6 | Publish content from the calendar | Steps 7.4, 7.5 |
| 7 | Ask for reviews | Step 5.6 for every completed job |
| 8 | Check links | Step 8.3 |
| 9 | Test the contact form | Submit a test enquiry on the live site; confirm the email arrives |

**Monthly report template** (one row per month in your sheet):

| Metric | Where to find it | This month | Last month | Change |
| --- | --- | --- | --- | --- |
| Google clicks | Search Console → Performance → last 28 days | | | |
| Google impressions | same | | | |
| Average position | same | | | |
| Indexed pages | Search Console → Indexing → Pages | | | |
| Organic sessions | GA4 → **Reports** → **Acquisition** → **Traffic acquisition** → row **Organic Search** | | | |
| Leads from organic | GA4 → **Traffic acquisition** → scroll right to **Key events** (pick `enquiry_submit` in the column's dropdown) | | | |
| Business Profile calls / website clicks / direction requests | Business Profile → **Performance** | | | |
| New Google reviews / average rating | Business Profile → **Reviews** | | | |
| New linking sites | Search Console → Links | | | |
| Top 3 improved queries | Search Console → Performance → Compare | | | |
| Actions done this month | your notes | | | |
| Plan for next month | | | | |

### 9.3 Every quarter (half a day)

| # | Task | Who |
| --- | --- | --- |
| 1 | Run a Screaming Frog crawl (step 0.5) and fix new 404s, missing titles, duplicate titles | You + Developer |
| 2 | PageSpeed test for the 4 key pages (Phase 4) | You |
| 3 | Review the keyword map (7.2): new topics, pages to merge or improve | You |
| 4 | Update your top 5 guides with current prices and rules | You |
| 5 | Check NAP consistency on top directories (5.5) and Business Profile details | You |
| 6 | Check that the production build still has the indexing flag and the preprod site is still hidden: run the checks in [Appendix C](#appendix-c--verification-commands) | Developer |
| 7 | Update Next.js and dependencies with normal testing | Developer |
| 8 | Review access: remove users who left from Search Console, GA4, Business Profile (**Settings** → **Users and permissions** in each) | You |

### 9.4 Troubleshooting: when something looks wrong

| Symptom | Most likely cause | What to do |
| --- | --- | --- |
| Clicks dropped suddenly (more than 30% in a week) across the whole site | Site accidentally set to noindex, site down, or a Google update | 1. Open the home page → **Ctrl + U** → search `robots` → must be `index, follow`. 2. Run Appendix C checks. 3. Search Console → **Indexing** → **Pages**: sudden rise in "Excluded by 'noindex' tag"? Call the developer at once (production must be built with `NEXT_PUBLIC_SEO_INDEXABLE=true`). 4. If none of these, check <https://status.search.google.com> for a core update; wait 2 weeks before changing things. |
| One page dropped | Page changed, slug changed without redirect, competitor improved | Check the page still works; check its title/description; add a redirect if the slug changed (3.7); improve content (7.6) |
| "Page with redirect" in Indexing report | Normal for `www` and `http` addresses and for old slugs you redirected | Nothing to do |
| "Duplicate without user-selected canonical" | Two addresses show the same content | Send the addresses to the developer |
| "Crawled – currently not indexed" | Google saw the page but did not find it valuable enough yet | Improve content and add internal links; wait. Normal for thin pages |
| "Discovered – currently not indexed" | Google has not crawled it yet | Add internal links to it; request indexing once; wait |
| "Not found (404)" | Deleted page or broken link | Add a 301 redirect to the best matching page (3.7) |
| "Server error (5xx)" | Site or database was down | Tell the developer; check `pm2 logs zigma` on the server |
| "Excluded by 'noindex' tag" for pages you want in Google | Item has **Hide from search engines** ticked, or it is a hidden page type (6.1), or production built without the flag | Untick in the SEO tab; or see 6.1; or developer checks the build flag |
| Rich results disappeared | Structured data error, or Google chose not to show them (normal fluctuation) | Rich Results Test (2.2) on the page; check Enhancements reports |
| Business Profile suspended | Name with keywords, address issue, or suspicious edits | Follow the email → **Request reinstatement** with documents (5.2) |
| Business Profile not showing for searches | New profile, few reviews, far from searcher | Complete all fields, add photos weekly, collect reviews; takes 1–3 months |
| GA4 shows no data | Cookie banner not accepted, CSP blocking, wrong measurement ID | Follow GA4 troubleshooting in 0.3 |
| Preprod site appears in Google | Preprod built with the indexing flag | Developer: rebuild preprod without the flag; then Search Console → **Removals** for the preprod address (step 1.8) |

---

## Appendix A — Which pages are indexed

This is how the website behaves **in production** (built with `NEXT_PUBLIC_SEO_INDEXABLE=true`). On PreProd and local computers, **every** page is `noindex`, the sitemap is empty, and the server adds an `X-Robots-Tag: noindex, nofollow` header.

| Address | In Google? | In sitemap? | Structured data | Controlled by |
| --- | --- | --- | --- | --- |
| `/` | Yes | Yes | Organization + LocalBusiness, WebSite (on every page) | Admin → Pages → home; Site Settings |
| `/<slug>` (page-builder pages) | Yes when published | Yes | — | Admin → Pages |
| `/projects`, `/products`, `/services` | Yes | Yes | Breadcrumbs | Catalog Settings |
| `/projects/<slug>` | Yes, unless **Hide from search engines** is ticked | Yes (unless hidden) | Article, Breadcrumbs, Video (if a video URL is set) | Admin → Inventory |
| `/products/<slug>` | Same | Same | Breadcrumbs; Product + Offer **only** with a plain price label | Admin → Inventory |
| `/services/<slug>` | Same | Same | Service, Breadcrumbs | Admin → Inventory |
| `/resources` | Yes (if feature on) | Yes (if feature on) | Breadcrumbs | Site Copy → Features |
| `/resources?tag=…` | **No** (noindex, follow) | No | — | automatic |
| `/resources/<slug>` | Yes | Yes | Article, Breadcrumbs | Admin → Resources |
| `/press`, `/press/<slug>` | Yes | Yes | NewsArticle on posts | Admin → Press |
| `/industries`, `/industries/<key>` | Yes (if feature on) | Yes (if feature on) | Breadcrumbs, FAQ | Site Copy → Features / Industries JSON |
| `/locations`, `/locations/<city>` | Yes | Yes | Breadcrumbs | Site Copy → Locations JSON |
| `/locations/<city>/<service>` | **No**, unless allowlisted by a developer (6.4) | Only if allowlisted | Breadcrumbs | `src/lib/location-services.ts` |
| `/hi`, `/kn` | Only when **Enable hi/kn locale landings** is on (otherwise they redirect to `/`) | Only when on | — | Site Copy → Features |
| `/hi/locations/<city>`, `/kn/locations/<city>` | Only when locales are on **and** the city is translated (today: Bengaluru) | Same | Breadcrumbs | `src/lib/locale-locations.ts` |
| `/contact`, `/careers`, `/certifications`, `/sla`, `/cookies` | Yes | Yes | — | Admin → Pages / Site Settings |
| `/tools/ups-calculator`, `/tools/solar-roi`, `/tools/solution-finder` | Yes (if feature on) | Yes (if feature on) | — | Site Copy → Features |
| `/search` | **No** | No | — | automatic |
| `/thank-you` | **No** | No | — | automatic |
| `/partner`, `/partner/login` | **No** (noindex, nofollow) | No | — | automatic |
| `/admin/*`, `/ztools/*`, `/api/admin/*`, `/api/partner/*`, `/api/ztools/*` | **No** (blocked in robots.txt) | No | — | automatic |

Every indexable page has a **canonical** pointing to itself on `https://zigma-technologies.com` (without `www`, without tracking parameters) and exactly **one H1** heading.

---

## Appendix B — Title and description formulas

**Title:** 50–60 characters. Do not type the brand; ` | Zigma Technologies` is added automatically.

| Page type | Formula | Example |
| --- | --- | --- |
| Home | `{Main services} Company in {Country/Region}` | `Solar EPC, UPS, BESS & EV Charging Company in India` |
| Service | `{Service} in {Region} – {Benefit}` | `UPS AMC in Bengaluru – 24×7 Support, 4-Hour Response` |
| City × service landing | `{Service} in {City} for {Customer type}` | `Solar EPC in Pune for Factories & Warehouses` |
| City hub (automatic) | `Power & Energy Solutions in {City}` | `Power & Energy Solutions in Chennai` |
| Project | `{Capacity} {Type} for {Client type}, {City}` | `500 kWp Rooftop Solar for Auto-Parts Plant, Hosur` |
| Product | `{Type} {Capacity} – {Key spec}` | `Online UPS 20 kVA – Double Conversion, Lithium Ready` |
| Guide | `{Question or How-to}` + year if the topic changes yearly | `How to Size a UPS for a Server Room (2026 Guide)` |
| Industry | `{Solutions} for {Industry}` | `Solar & Backup Power for Hospitals` |
| Contact | `Contact Us – {Main services} Enquiries` | `Contact Us – Solar, UPS & Energy Enquiries` |

**Description:** 120–160 characters = what the page offers + a specific proof point + a call to action.

| Page type | Example |
| --- | --- |
| Service | `Annual UPS maintenance for data centres, hospitals and factories in Bengaluru. OEM-trained engineers, 24×7 helpline, 4-hour response. Get a quote.` |
| Project | `How we delivered a 500 kWp rooftop plant in 10 weeks and cut the client's power bill by 38%. Scope, equipment and results inside.` |
| Product | `20 kVA online double-conversion UPS for server rooms and labs. Lithium or VRLA batteries, on-site installation and AMC across India.` |
| Guide | `What a 100 kWp factory rooftop solar plant costs in India in 2026, what drives the price, payback period and subsidy rules. With real project data.` |

**Rules:** every page unique; no keyword lists; write for the person deciding whether to click. Google rewrites many descriptions, but a good one is still used often and raises clicks.

---

## Appendix C — Verification commands

Run these after every production deploy, or when something looks wrong. **Windows PowerShell** (on your computer):

**1. Page check — title, description, canonical, robots and H1 count for key pages:**

```powershell
$base = "https://zigma-technologies.com"   # use the PreProd address to check PreProd
$paths = "/", "/projects", "/products", "/services", "/locations", "/locations/bengaluru", "/contact", "/thank-you", "/search", "/locations/bengaluru/ups-amc"
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

**Pass criteria on production:**
- `canon` is the page's own address on `https://zigma-technologies.com`.
- `title` contains the brand only once.
- `h1` is `1`.
- `desc` is specific to the page.
- `robots` is `index, follow` for normal pages, and contains `noindex` for `/thank-you`, `/search` and `/locations/bengaluru/ups-amc`.

**On PreProd:** every page must show `noindex`.

**2. Headers and redirects:**

```powershell
curl.exe -sI https://zigma-technologies.com/ | Select-String "HTTP/|x-robots-tag|content-encoding"
curl.exe -sI https://www.zigma-technologies.com/ | Select-String "HTTP/|location"
curl.exe -sI http://zigma-technologies.com/ | Select-String "HTTP/|location"
curl.exe -sI http://www.zigma-technologies.com/ | Select-String "HTTP/|location"
```

**Expect:** the first shows `HTTP/1.1 200` (or `HTTP/2 200`) and **no** `x-robots-tag`. The other three show `301` and `location: https://zigma-technologies.com/`.

**3. robots.txt and sitemap:**

```powershell
curl.exe -s https://zigma-technologies.com/robots.txt
(curl.exe -s https://zigma-technologies.com/sitemap.xml | Select-String -AllMatches "<loc>").Matches.Count
```

**Expect:** robots.txt shows `Allow: /`, the `Disallow:` lines for admin/partner/ztools, `Host:` and `Sitemap: https://zigma-technologies.com/sitemap.xml`. The second command prints the number of addresses in the sitemap (about 70+, growing as you add content). `0` means production was built without the indexing flag: tell the developer immediately.

**4. PreProd must stay hidden:**

```powershell
curl.exe -sI https://justxsystems.com/zigma-technologies/ | Select-String "x-robots-tag"
```

**Expect:** `X-Robots-Tag: noindex, nofollow`.

**5. Online tools:**
- Structured data: [Rich Results Test](https://search.google.com/test/rich-results), [Schema Markup Validator](https://validator.schema.org/)
- Social previews: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/), [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Speed: [PageSpeed Insights](https://pagespeed.web.dev)
- Mobile rendering and indexing: Search Console → **URL inspection** → **Test live URL** → **View tested page**

---

## Appendix D — Things NOT to waste time on

| Myth / tactic | Why to skip it |
| --- | --- |
| `<meta name="keywords">` | Google has ignored it since 2009 |
| Sitemap "priority" and "change frequency" | Google ignores them; only accurate "last modified" dates matter (already automatic) |
| Keyword density targets ("use the keyword 2%") | Write naturally; Google understands synonyms |
| Hundreds of city pages with the same text | Doorway pages; risk a site-wide demotion (Phase 6) |
| Buying links, link exchanges, paid guest posts on unrelated blogs | Against Google rules; risk a penalty |
| Mass directory submission services | Low-quality directories do nothing; do the 10 good ones in 5.5 |
| Chasing a Lighthouse "SEO 100" score | It checks basics only, not rankings |
| FAQ and HowTo rich results | Google stopped showing HowTo (2023) and limits FAQ to government/health sites |
| Sitelinks search box markup | Retired by Google in 2024 |
| Disavowing links | Only needed after a manual action for unnatural links |
| Changing titles every week | Google needs weeks to react; change, then wait 4–6 weeks before judging |
| Publishing AI-generated articles without expert review | Generic content rarely ranks and can hurt trust in the whole site |
| Fake or incentivised reviews | Against Google policy; reviews removed or profile suspended |

---

## Appendix E — Technical reference for developers

**Architecture in one paragraph:** all metadata is built on the server with `buildPageMetadata()` from `src/lib/seo.ts` (canonical, Open Graph, Twitter, robots, hreflang). `isIndexable()` returns true only when `NEXT_PUBLIC_SEO_INDEXABLE === 'true'` at **build** time (it is a `NEXT_PUBLIC_` variable, so it is inlined into the build). The production GitHub workflow and `scripts/deploy.sh` (prod branch) set it; PreProd refuses to build with it. When false: every page is `noindex`, `next.config.ts` adds `X-Robots-Tag: noindex, nofollow`, `robots.ts` omits the sitemap, and `sitemap.ts` returns an empty list. The sitemap is `force-dynamic` because CI builds have no database.

**Key files:**

| File | Purpose |
| --- | --- |
| `src/lib/seo.ts` | `siteOrigin()`, `absoluteUrl()`, `isIndexable()`, `buildPageMetadata()`, `localeAlternates()`, `breadcrumbJsonLd()`, `organizationId()` / `websiteId()`, `toIsoDate()` |
| `src/components/JsonLd.tsx` | Safe JSON-LD script tag (escapes `<`) |
| `src/components/OrganizationJsonLd.tsx` | Site-wide `@graph`: Organization + LocalBusiness and WebSite, from Site Settings |
| `src/lib/nap.ts` | NAP placeholders (`{{phone}}` …) filled from Site Settings in nav (`loadSiteShell`) and page sections (`CmsPageShell` / `CmsPageClient`) |
| `src/lib/nap-link.ts`, `/api/admin/nap-link` | One-time scan/replace of typed NAP in `nav_items` and `page_sections` with placeholders (GET = dry run, POST = apply) |
| `src/lib/cms-seo.ts` | Metadata for page-builder pages; brand-only home title fallback; hreflang on home when locales are on |
| `src/lib/catalog-case-study-page.tsx` | Catalog detail metadata and JSON-LD; `parsePriceInr()` (plain amounts only → Offer) |
| `src/components/admin/SeoFieldsEditor.tsx` | Inventory SEO tab (meta title/description, share image, noindex, preview) |
| `scripts/migrate-catalog-seo.sql` | Adds `meta_title`, `meta_description`, `og_image_url`, `seo_noindex` to catalog items (also auto-ensured by `schema-ensure.ts`) |
| `src/app/robots.ts` | Private path disallows; sitemap + host only when indexable |
| `src/app/sitemap.ts` | Indexable URLs only, with `lastModified` from the database |
| `src/app/og.png/route.tsx` | Default 1200×630 share image |
| `src/lib/location-services.ts` | `INDEXABLE_CITY_SERVICES` allowlist for city × service pages |
| `src/lib/locale-locations.ts` | Hindi/Kannada city translations; only translated cities are indexable |
| `src/components/SiteHeading.tsx` | Page heroes always render `h1` (`secondary` → `h2` for extra slides); CMS level only changes the size class |
| `src/app/(site)/_components/CatalogPageClient.tsx` | Listing cards include a crawlable `<a>` to each detail page; server-rendered first page of items |
| `next.config.ts` | CSP (includes GA4 hosts), `X-Robots-Tag` when not indexable |
| `.github/workflows/deploy-prod.yml` | Builds with `NEXT_PUBLIC_SEO_INDEXABLE=true` and the verification variables |
| `scripts/deploy.sh` | Prod forces the flag; PreProd aborts if it is set |
| `src/lib/admin-guide-hostinger-prod.ts` | nginx reference config with the www → apex redirect |

**Environment variables (build time):**

| Variable | Production | PreProd / local |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://zigma-technologies.com` | PreProd/local address |
| `NEXT_PUBLIC_SEO_INDEXABLE` | `true` (set by the workflow) | **unset** |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | optional (GitHub variable `GOOGLE_SITE_VERIFICATION`); not needed with DNS verification | unset |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | optional (GitHub variable `BING_SITE_VERIFICATION`) | unset |

**Guardrails for future code:**
- New public page: export `generateMetadata` / `metadata` using `buildPageMetadata({ path, title, description, noindex? })`. Never set `alternates.canonical` in a layout.
- New indexable route family: add it to `sitemap.ts`, respecting `isIndexable()` and any `seo_noindex` flag.
- Never set `document.title` or meta tags from client components.
- Structured data must describe only what is visible on the page. No review/rating markup for your own company. Product markup needs a real offer (price).
- One `h1` per page: use `SiteHeading role="pageHero"`; pass `secondary` for additional hero slides.
- Never add `NEXT_PUBLIC_SEO_INDEXABLE=true` to PreProd or `.env` files.
- Next.js 16: read `node_modules/next/dist/docs/` before changing metadata, caching or routing APIs; `revalidateTag` needs a second argument.

---

## Appendix F — Master checklist

Print this or copy it into your sheet. Tick each box when the step and its **Expect** check are done.

**Phase 0 — Accounts and baseline**
- [ ] 0.1 Search Console domain property verified (DNS TXT record)
- [ ] 0.1 Team members added (optional)
- [ ] 0.2 Bing Webmaster Tools set up (imported from Search Console)
- [ ] 0.3 GA4 account, property and web stream created
- [ ] 0.3 Measurement ID entered in the admin panel; Realtime shows your visit
- [ ] 0.3 `enquiry_submit` and other lead events marked as key events; data retention set to 14 months
- [ ] 0.3 GA4 linked to Search Console
- [ ] 0.4 Baseline sheet filled in (Search Console, GA4, PageSpeed, `site:` counts)
- [ ] 0.5 Screaming Frog "before" crawl exported

**Phase 1 — Technical fixes live**
- [ ] 1.1 All changes committed and pushed
- [ ] 1.2 PreProd deployed
- [ ] 1.3 PreProd checks passed (noindex everywhere, pages work, one H1, share image)
- [ ] 1.4 Branch merged; production deployed (database backup + migration)
- [ ] 1.5 Production checks passed (index, follow; canonical; robots.txt; sitemap)
- [ ] 1.6 nginx `www`/`http` → apex redirect live; `curl` checks show 301
- [ ] 1.7 Sitemap submitted to Google and Bing; top pages requested for indexing
- [ ] 1.8 Old PreProd results removed (only if any appeared)
- [ ] 1.9 Search Console reports checked weekly for the first month

**Phase 2 — Structured data**
- [ ] 2.1 Site Settings complete (brand, contact, address, social, SEO & social)
- [ ] 2.2 Rich Results Test passed for home, listing, project, product, service pages
- [ ] 2.3 Search Console Enhancements reports show no invalid items
- [ ] 2.4 LinkedIn/WhatsApp previews show image, title and description

**Phase 3 — Titles, descriptions, alt text**
- [ ] 3.2 Home and main pages have hand-written meta title and description
- [ ] 3.3 Top 5 products, top 5 projects and all services have SEO tab filled
- [ ] 3.4 Resource articles have meta title and description
- [ ] 3.5 Press excerpts written as descriptions
- [ ] 3.6 Alt text on hero, project and product images
- [ ] 3.7 Redirect habit in place for every slug change

**Phase 4 — Speed**
- [ ] 4.1 PageSpeed measured for 4 key pages; numbers recorded
- [ ] 4.2 Homepage slider, listing and top-10 detail images compressed (under 300 KB)
- [ ] 4.3 Compression, caching and TTFB verified (developer)
- [ ] 4.4 Developer backlog items scheduled if Mobile Performance stays under 70

**Phase 5 — Local SEO**
- [ ] 5.1 NAP decided and written down; entered in Site Settings
- [ ] 5.1 Site Settings → Contact details → **Scan menus & pages** says "Nothing to link"; footer and Contact page show the NAP
- [ ] 5.2 Google Business Profile created/claimed
- [ ] 5.2 Profile verified
- [ ] 5.2 Profile complete (categories, description, services, hours, 10+ photos)
- [ ] 5.3 First post published; review link saved
- [ ] 5.4 Bing Places and Apple Business Connect listings live
- [ ] 5.5 LinkedIn, IndiaMART, TradeIndia, Justdial, Sulekha, ExportersIndia, Facebook, YouTube listings consistent
- [ ] 5.5 OEM partner and association listings requested
- [ ] 5.6 Review requests sent after every job; all reviews replied to

**Phase 6 — City and language pages**
- [ ] 6.2 Projects tagged with city names
- [ ] 6.2 Six city pages have real, specific lead and highlights
- [ ] 6.3 Hindi/Kannada decision made (on with native review, or off)
- [ ] 6.4 First 1–3 city × service landing pages published with 301 redirects (only with real local content)

**Phase 7 — Keywords and content**
- [ ] 7.1 Keyword list built (Search Console, Google suggestions, Keyword Planner)
- [ ] 7.2 Keyword map: one page per topic
- [ ] 7.3 Pillar pages link to supporting pages and back
- [ ] 7.4 First resource article published and indexing requested
- [ ] 7.5 First case study published with full Case study tab
- [ ] 7.6 Monthly "almost there" improvements scheduled
- [ ] 7.7 Content calendar with owners and dates

**Phase 8 — Backlinks**
- [ ] 8.1 Links sheet created; OEMs, clients, partners and associations contacted
- [ ] 8.2 Press release sent for the next real news item
- [ ] 8.3 Top linking sites checked monthly; Manual actions shows "No issues detected"

**Phase 9 — Routine**
- [ ] 9.1 Weekly 15-minute check in calendar
- [ ] 9.2 Monthly report template set up; first report done
- [ ] 9.3 Quarterly review in calendar
