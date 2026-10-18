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
13. **Citations playbook** (Phase 5.5 — NAP pre-filled directories)  
14. **City × service readiness** (Phase 6 — sample noindex templates)  
15. **Backlink outreach pack** (Phase 8 — project/OEM drafts)  
16. **Unlock readiness** (% secrets + human gates)  
17. Bing + GSC act (when secrets set)  
18. Weekly + monthly digests + webhook  
19. **Ops cockpit** HTML (`ops-cockpit.html`)  

## Artefacts (under `storage/meridian/zigma-prod/`)

| File | Purpose |
| --- | --- |
| `ops-cockpit.html` | Single ops dashboard (score, unlock %, actions, playbooks) |
| `unlock-readiness.md` | What still blocks full unattended automation |
| `gbp-checklist.md` | Copy-paste NAP into Google Business Profile |
| `citations-playbook.md` | Directory claim order with live NAP |
| `city-pages-readiness.md` | Which city×service samples stay noindex |
| `backlink-outreach.md` | Client/OEM email drafts |
| `keyword-map.md` | Phase 7 content calendar seed |
| `content-briefs.md` | Expand thin/orphan pages |
| `closed-loop.json` | Remediation effectiveness delta |
| `orphan-prescriptions.md` | Internal link plan |

## Still human (cannot automate)

| Task | Why |
| --- | --- |
| Google OAuth / Bing API key / DNS GSC | Account consent |
| Social profile URLs | Need real profile addresses |
| GBP postcard verify + reviews + posts | Google physical / relationships |
| Claiming directory listings | Login + CAPTCHA + photos |
| Sending outreach emails | Relationship judgment |
| Long-form unique city copy beyond FAQ stubs | Quality judgment |

## Commands

```bash
npm run meridian:autopilot
npm run meridian:act:nap
npm run meridian:act:citations
npm run meridian:act:city-pages
npm run meridian:act:backlinks
npm run meridian:act:unlock
npm run meridian:act:cockpit
npm run meridian:act:hreflang
npm run meridian:act:keywords
npm run meridian:act:seed
```
