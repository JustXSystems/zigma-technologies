# Meridian automation — maximum hands-off loop

Production profile runs the full loop on **deploy**, **weekly cron**, and **Admin → Run autopilot**.

## Autopilot pipeline

1. Scan + connectors  
2. Auto-apply empty **meta** + **alt**  
3. Sitemap **health** + orphan/thin graph  
4. **Form health**  
5. **Image weight** → **WebP optimize**  
6. **Orphan hub footers** (catalog)  
7. **Content briefs** → **FAQ content seed** on thin catalog pages  
8. **JSON-LD validate**  
9. **hreflang validate** (EN ↔ HI/KN Bengaluru)  
10. **NAP / GBP checklist** (`gbp-checklist.md`)  
11. **Keyword map** from CMS (`keyword-map.md`)  
12. **Closed-loop recheck** (heavy/orphans before→after)  
13. **Citations playbook** (Phase 5.5)  
14. **City × service readiness** (Phase 6)  
15. **Backlink outreach pack** (Phase 8)  
16. **Unlock readiness** (% secrets + human gates)  
17. **Rich Results pack** (Phase 2.2)  
18. **Top meta pack** (Phase 3)  
19. **Review kit** (Phase 5.6)  
20. **Content calendar** (Phase 7)  
21. **Speed baseline** (Phase 4 — PSI links; lab scores if `MERIDIAN_AUTO_PSI=1`)  
22. **PreProd removals** probe (Phase 1.8)  
23. Bing + GSC act (when secrets set)  
24. Weekly + monthly + **quarterly** digests + webhook  
25. **Ops cockpit** HTML (`ops-cockpit.html`)  

## Artefacts (under `storage/meridian/zigma-prod/`)

| File | Purpose |
| --- | --- |
| `ops-cockpit.html` | Single ops dashboard |
| `unlock-readiness.md` | What still blocks full unattended automation |
| `rich-results-pack.md` | One-click Google Rich Results Test URLs |
| `top20-meta-pack.md` | Priority titles/descriptions to hand-polish |
| `review-kit.md` | WhatsApp/email review + reply templates |
| `content-calendar.md` | 4-week publish plan from keyword map |
| `speed-baseline.md` | PageSpeed links (+ optional lab scores) |
| `preprod-removals.md` | Phase 1.8 Removals checklist + live noindex probe |
| `quarterly-digest.md` | Phase 9.3 quarterly checklist |
| `gbp-checklist.md` | Copy-paste NAP into Google Business Profile |
| `citations-playbook.md` | Directory claim order with live NAP |
| `city-pages-readiness.md` | Which city×service samples stay noindex |
| `backlink-outreach.md` | Client/OEM email drafts |
| `keyword-map.md` | Phase 7 content calendar seed |
| `content-briefs.md` | Expand thin/orphan pages |
| `closed-loop.json` | Remediation effectiveness delta |

## Still human (cannot automate)

| Task | Why |
| --- | --- |
| Google OAuth / Bing API key / DNS GSC | Account consent |
| Social profile URLs | Need real profile addresses |
| GBP postcard verify + reviews + posts | Google physical / relationships |
| Claiming directory listings | Login + CAPTCHA + photos |
| Sending outreach / review emails | Relationship judgment |
| Clicking Rich Results Test in Google UI | Google CAPTCHA / account |
| Long-form unique city copy beyond FAQ stubs | Quality judgment |

## Commands

```bash
npm run meridian:autopilot
npm run meridian:act:rich
npm run meridian:act:top-meta
npm run meridian:act:reviews
npm run meridian:act:calendar
npm run meridian:act:speed
npm run meridian:act:preprod
npm run meridian:act:quarterly
npm run meridian:act:citations
npm run meridian:act:unlock
npm run meridian:act:cockpit
```
