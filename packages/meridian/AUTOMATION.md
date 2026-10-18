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
13. Bing + GSC act (when secrets set)  
14. Weekly + monthly digests + webhook  

## Artefacts (under `storage/meridian/zigma-prod/`)

| File | Purpose |
| --- | --- |
| `gbp-checklist.md` | Copy-paste NAP into Google Business Profile |
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
| Long-form unique copy beyond FAQ stubs | Quality judgment |

## Commands

```bash
npm run meridian:autopilot
npm run meridian:act:nap
npm run meridian:act:hreflang
npm run meridian:act:keywords
npm run meridian:act:seed
```
