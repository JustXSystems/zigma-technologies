# Meridian automation — maximum hands-off loop

Production profile runs the full loop on **deploy**, **weekly cron**, and **Admin → Run autopilot**.

## Docs map

| Doc | Role |
| --- | --- |
| [`SEO-GUIDE.md`](../../SEO-GUIDE.md) | Live status + ops (canon + ledger auto-synced) |
| **This file** | Phase pipeline, forever commands, badge meanings |
| [`SETUP.md`](./SETUP.md) | Connector secrets (first-time OAuth / GA4 / Bing) |
| [`README.md`](./README.md) | Package quick start |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Design |
| [`docs/archive/SEO-GUIDE-phases-walkthrough.md`](../../docs/archive/SEO-GUIDE-phases-walkthrough.md) | Historical Day-1 phase walkthrough (do not re-run) |

**Primary forever command:** `npm run meridian:observe` (alias: `meridian:steward`, `meridian:guard`, Phase **32** Catalog Continuum).

## Autopilot pipeline

1. Scan + connectors  
1b. **Catalog Continuum** (Inventory / Media / Products / Services / Projects — meta · alt · OG · stale refresh · live probe · GSC queue)  
2. Auto-apply empty **meta** + **alt**  
3. **Meta polish** (Phase 3 length/brand — force-apply when `autoPolishMeta`)  
4. Sitemap **health** + orphan/thin graph  
5. **Form health**  
6. **Image weight** → **WebP optimize**  
7. **Orphan hub footers** (catalog)  
8. **Content briefs** → **FAQ content seed**  
9. **JSON-LD** + **hreflang** validate  
10. **NAP / GBP** + **keyword map**  
11. **Closed-loop** recheck  
12. Citations / city / backlink playbooks  
13. **Unlock readiness** + **Phase 0 wizard**  
14. **Indexing queue** (auto-inspect when OAuth set)  
15. **Phase 2 advance** (verified sameAs → Site Settings + NAP + Rich Results pack)  
16. **Phase 3 advance** (meta polish apply + alt + top-URL audit; hubs via `hub-seo.ts`)  
17. **Phase 5 advance** (GBP ops HTML copy-vault + citations CSV + review kit)  
18. **Phase 4 advance** (image optimize + PSI lab + TTFB probe + ops HTML)  
19. **Phase 6 advance** (city content briefs + locale decision + ops HTML)  
20. **Phase 7 advance** (keyword map + briefs + calendar ICS/CSV + ops HTML)  
21. **Phase 8 advance** (outreach mailto + CSV + progress + ops HTML)  
22. **OG share**  
23. PreProd removals  
24. Bing + GSC act (when secrets set)  
25. Weekly + monthly + quarterly digests + webhook  
26. **Ops cockpit** / Phase 9 command center  
27. **Phase 10 continuous unlock** (live connector probes, sameAs/meta recovery, Windows/VPS cron pack; GSC/Bing acts already run above)  
28. **Phase 11 live convergence** (seo:verify, deploy gate, cadence-collapsed checklist, refresh Phase 9, GBP draft)  
29. **Phase 12 score lift** (fill CMS meta, auto-publish calendar week, deploy one-command, rescan)  
30. **Phase 13 sovereign autoclose** (SSH apply LinkedIn into prod `theme_settings` + PM2 restart + clear deploy gate — no full redeploy required when code already has sameAs)  
31. **Phase 14 perpetual ops** (unlock 100% without optional webhook · live GSC/GA4 signal cache · monthly digest fill · sameAs self-heal · cron guardian)  
32. **Phase 15 sovereign fleet** (Actions `npm ci` audit · secret coverage · optional `gh` sync/dispatch · Phase 9/14 refresh · `phase15-ops.html`)  
33. **Phase 16 autonomous continuum** (score apex · authority evidence · GBP pulse ingest · meta chase · quarterly autoclose · `phase16-ops.html`)  
34. **Phase 17 mission archive** (guide briefs · deps audit · rich re-probe · continuum seal)  
35. **Phase 18 observatory** (post-archive epoch · GSC→GBP proxy · silent drift heal)  
36. **Phase 19 living canon** (auto-sync **`SEO-GUIDE.md`** status/next-actions)  
37. **Phase 20 autonomic desk** (one-click NAP/calendar/GBP/citations · human-debt · executive brief)  
38. **Phase 21 presence sentinel** (auto-detect/seal GBP · `ack-gbp`)  
39. **Phase 22 quiet throne** (park Google gate · Appendix F ledger · sovereign certificate · `hasMap` from NAP)  
40. **Phase 23 eternal horizon** (live `hasMap` probe · deploy gate · GSC growth radar)  
41. **Phase 24 deploy courier** (local build → SSH apply · never VPS `next build`)  
42. **Phase 25 growth closer** (FAQ publish + homepage proof + indexing)  
43. **Phase 26 conversion continuum** (form health · GA4 · enquiry yield · sitemap)  
44. **Phase 27 integrity lattice** (cross-stack seal · auto-heal)  
45. **Phase 28 sovereign continuity** (board charter · forever gates)  
46. **Phase 29 autonomic chronos** (temporal nexus · regression detect)  
47. **Phase 30 dominion apex** (eternal crown · automation complete)  
48. **Phase 31 silent steward** (meta · city draft staged · review link auto · growth)  
49. **Phase 32 content continuum** (Inventory / Media / Products / Services / Projects / Pages / Blog / Press)  
50. **Phase 33 SEO Command Brief** (GSC + Bing + GA4 + Meridian → one customizable HTML report — **primary forever ops surface**)  

Admin saves auto-heal SEO (`catalog-seo-steward` + fleet). Manual SEO = `seo_meta_source=manual` (never overwritten). Meridian-owned duplicate titles auto-uniquified. Unpublish/delete → `seo_url_queue` + hub 301 + GSC inspect. Sitemap image entries for catalog/blog/press. Product JSON-LD SKU/MPN/GTIN + availability; case-study VideoObject when present.

**On-demand SEO report (each request):** **`npm run seo:report`** → authenticates Google OAuth + Bing API key → pulls GSC/Bing/GA4/PageSpeed → runs live `seo:verify` + Meridian crawl → writes `command-brief.html` / `seo-report-latest.html`. One-time Google login: **`npm run meridian:oauth`**. Admin → SEO → Meridian → **Generate SEO report**. Customize via `autopilot.commandBrief` (`theme`, `windowDays`, `topN`, `sections`).

## Highest-leverage human step

Usually **none** — human debt for automation is **0**. Forever: **`npm run meridian:observe`**.

| Still human (cannot code away) | Why |
| --- | --- |
| Optional GBP claim/verify | Google identity gate — parked; GSC proxy covers discovery |
| Promote a city draft to indexable | Needs unique photos/proof (spam risk if auto-published) |
| Send outreach / claim directories | Optional growth — packs + mailto already generated |

## Status words (what SEALED / LOCKED mean)

These are **health badges from live checks**, not locks that freeze the tool. Green badges mean “this layer’s invariants passed on the last `observe`.” Re-run `npm run meridian:observe` (or `meridian:guard`) anytime — seals refresh automatically.

| Badge | Meaning |
| --- | --- |
| **SEALED** | Layer invariants green (archive, lattice, deploy, live throne) |
| **LOCKED** | Continuity gates green (aliases, GH Action, lattice + yield) |
| **ARMED** | Chronos tracking deltas with no critical regressions |
| **CROWNED** | Dominion apex: all crown pillars green — automation complete |
| **NOMINAL** | Silent steward / content continuum: meta/city/review/growth/inventory/CMS stewards OK |
| **ONLINE / LIVE** | Continuum measuring yield · production emitting schema |
| **BRIDGED** | Auto-pack ready; optional human click (mailto / launchpad) |
| **PARKED** | Waiting on an external Google gate (GBP verify) — does **not** block forever ops |
| **MISSION COMPLETE** | Quiet throne: no open human debt for automation |

## Multi-site (M11)

```bash
npm run meridian:profiles
# Add a SiteProfile under packages/meridian/profiles/ and register it in profiles/index.json
```

## Commands

```bash
npm run meridian:autopilot
npm run meridian:act:phase0
npm run meridian:act:phase2          # sameAs + Rich Results (DB on host)
npm run seo:phase2:sameas            # apply LinkedIn sameAs only
npm run meridian:act:phase3          # meta polish + alt + top audit
npm run meridian:act:phase5          # GBP ops HTML + citations CSV + review kit
npm run meridian:act:phase4          # PSI lab + TTFB + image optimize
npm run meridian:act:phase6          # city briefs + locale decision
npm run meridian:act:phase7          # content calendar ICS + keywords
npm run meridian:act:phase8          # backlink mailto ops
npm run meridian:act:phase9          # command center + digests + routine ICS
npm run meridian:act:phase10         # continuous unlock + GSC/Bing + score recovery
npm run meridian:act:phase10:gh      # same + push secrets to GitHub Actions (gh auth)
npm run meridian:act:phase11         # live convergence + refresh Phase 9 + collapsed checklist
npm run meridian:act:phase12         # score lift + calendar auto-publish + deploy pack
npm run meridian:act:phase13         # SSH sameAs autoclose + mission-complete dashboards
npm run meridian:act:phase14         # perpetual signals + unlock 100% + digest fill
npm run meridian:act:phase15         # sovereign fleet board (Actions audit + secret coverage)
npm run meridian:act:phase15:gh      # same + push Meridian secrets to GitHub Actions (gh auth)
npm run meridian:act:phase15:dispatch # trigger meridian-autopilot.yml once
npm run meridian:act:phase16         # continuum apex + GBP pulse + score chase
npm run meridian:act:phase17         # mission archive (guides + deps + rich + seal)
npm run meridian:guard               # alias of observe (Phase 31) — full re-seal
npm run meridian:act:phase17         # mission archive seal only (legacy pack)
npm run meridian:act:phase18         # observatory only (GBP proxy + drift heal)
npm run meridian:act:phase19         # observatory + SEO-GUIDE canon sync
npm run meridian:act:phase20         # autonomic desk (includes phase19)
npm run meridian:act:phase21         # presence sentinel (includes phase20)
npm run meridian:act:phase22         # quiet throne (includes phase21)
npm run meridian:act:phase23         # eternal horizon (includes phase22)
npm run meridian:act:phase24         # deploy courier (includes phase23)
npm run meridian:act:phase25         # growth closer / signal forge (includes phase24)
npm run meridian:act:phase26         # conversion continuum / yield apex (includes phase25)
npm run meridian:act:phase27         # integrity lattice / perpetual seal (includes phase26)
npm run meridian:act:phase28         # sovereign continuity / board charter (includes phase27)
npm run meridian:act:phase29         # autonomic chronos / temporal nexus (includes phase28)
npm run meridian:act:phase30         # dominion apex / eternal crown (includes phase29)
npm run meridian:act:phase31         # silent steward (includes phase30)
npm run meridian:act:phase32         # content continuum (includes phase31)
npm run meridian:catalog             # fleet catalog heal only
npm run meridian:observe             # alias of phase32 — primary forever ops
npm run meridian:steward             # alias of phase32
npm run meridian:dominion            # alias of phase30
npm run meridian:chronos             # alias of phase29
npm run meridian:continuity          # alias of phase28
npm run meridian:lattice             # alias of phase27
npm run meridian:yield               # alias of phase26
npm run meridian:forge               # alias of phase25
npm run meridian:courier             # alias of phase24
npm run meridian:horizon             # alias of phase23
npm run meridian:throne              # alias of phase22
npm run meridian:presence            # alias of phase21
npm run meridian:desk                # alias of phase20
npm run meridian:prod:hasmap         # local build → tarball → SSH apply (hasMap seal)
npm run meridian:ack-gbp             # seal GBP after browser verify
npm run meridian:canon               # SEO-GUIDE status sync only (no observe)
npm run meridian:prod:sameas         # SSH LinkedIn → prod theme_settings + pm2 restart
npm run meridian:deploy:prod         # optional full gh Deploy Production (needs gh auth)
npm run meridian:act:polish
npm run meridian:act:index-queue
npm run meridian:act:og
npm run meridian:act:locales
npm run meridian:act:cockpit
```

### Primary ops surfaces (`storage/meridian/zigma-prod/`)

| File | Use |
| --- | --- |
| `command-brief.html` | **Primary** one-spot GSC + Bing + Meridian SEO report |
| `phase33-ops.html` | Phase 33 Command Brief seal |
| `phase32-ops.html` | Content continuum / Inventory + CMS SEO |
| `phase31-ops.html` | Silent steward / zero-checklist |
| `catalog-continuum.md` · `catalog-steward.md` | Inventory heal briefs |
| `phase30-ops.html` | Dominion crown |
| `phase20-ops.html` | NAP · calendar · citations desk |
| `phase21-ops.html` | Optional GBP verify kit |
| `silent-steward.md` · `human-debt.md` · `city-draft.md` · `review-kit.md` | Steward briefs |
| `report-latest.html` · `executive-brief.md` | Board scan / one-pager |
| Root [`SEO-GUIDE.md`](../../SEO-GUIDE.md) | Canon status + Appendix F ledger (auto) |

Older `phase0`–`phase29` HTML packs remain on disk for forensics; day-to-day use **Command Brief** + observe.

