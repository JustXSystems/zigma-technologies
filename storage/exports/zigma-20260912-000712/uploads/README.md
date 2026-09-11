# Zigma Technologies — Website

A clean, dependency-free rebuild of the 4 supplied pages (Home, Careers,
Certifications, Contact) into a proper reusable layout. No build step,
no framework — open any `.html` file behind a local server and it works.

## What changed from the originals

- **Images extracted.** All 100+ inline base64 images were pulled out into
  real files under `../images`, de-duplicated by content (the logo,
  for example, appeared 4× across pages as separate base64 blobs — now it's
  one file referenced 4×). This is why the pages went from ~12&nbsp;MB of
  inline HTML to a few KB of HTML + a shared 4&nbsp;MB image folder.
- **Header & footer extracted into reusable components** (see below) instead
  of being copy-pasted into all 4 files with tiny inconsistencies between them.
- **Fixed a few real bugs** found while unifying the pages: the mobile
  hamburger menu previously had no click handler at all (dead button on
  small screens) — it now opens a proper drawer; the homepage used a
  placeholder phone number in two CTAs while every other page used the
  real one; a couple of internal links pointed at stale filenames.

## Folder structure

```
/
├── index.html              → Home
├── careers.html            → Careers
├── certifications.html     → Certifications & Partners
├── contact.html            → Contact
└── assets/
    ├── css/
    │   └── globals.css     → single shared stylesheet (design tokens, all page styles)
    ├── js/
    │   ├── components/
    │   │   ├── site-header.js   → <site-header> custom element
    │   │   └── site-footer.js   → <site-footer> custom element
    │   ├── main.js          → shared behaviour (scroll-reveal animations)
    │   └── pages/
    │       ├── home.js            → hero slider, counters, testimonials, timeline
    │       ├── careers.js         → application form + role pre-fill
    │       ├── contact.js         → contact form + subject pre-fill
    │       └── certifications.js  → certificate lightbox
    └── images/              → every image used on the site, deduplicated
```

## How the reusable layout works

`site-header.js` and `site-footer.js` register native
[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
(`<site-header>`, `<site-footer>`). Every page includes them the same way:

```html
<site-header current="careers"></site-header>
...page content...
<site-footer current="careers" quote-href="#apply" quote-label="Apply Now"></site-footer>
```

- `current` tells the header which page it's on, so it can highlight the
  active nav item and correctly resolve links — same-page anchors like
  `#why` on the homepage automatically become `index.html#why` when the
  component renders on any other page. Add a link once in the `NAV_ITEMS`
  list in `site-header.js` and every page picks it up — no copy-pasting
  markup between files.
- `quote-href` / `quote-label` let each page point the sticky mobile CTA
  wherever makes sense (e.g. Careers → "Apply Now" scrolls to the
  application form; other pages → "Get Quote" goes to the contact form).
- No build tools, bundler, or server-side includes required — Web
  Components are native to every modern browser and the files can be
  served as plain static assets (e.g. Netlify, GitHub Pages, S3, nginx).
  They must be served over `http(s)://`, not opened directly as a
  `file://` URL, since the components fetch nothing external but modern
  browsers restrict some features on `file://`.

## Adding a 5th page

1. Create `new-page.html`, copy the `<head>` boilerplate from any existing
   page.
2. Drop in `<site-header current="new-page"></site-header>` and
   `<site-footer current="new-page" quote-href="..." quote-label="...">`.
3. Write your page's unique markup inside `<main id="main-content">…</main>`.
4. If it needs its own JS, add `assets/js/pages/new-page.js` and include it
   with `<script src="assets/js/pages/new-page.js" defer></script>`.
5. If it should appear in navigation, add one entry to `NAV_ITEMS` in
   `../js/components/site-header.js`.

## Known pre-existing gaps (not introduced by this refactor)

- `industries.html` and a couple of `Products` / `Innovation` nav items are
  linked but don't have pages yet (they didn't in the source files either).
- Contact/Careers form submissions are front-end only (no backend endpoint
  wired up) — same as the original files.
