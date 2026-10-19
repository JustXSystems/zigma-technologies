# Meridian automation — maximum hands-off loop

Production profile runs the full loop on **deploy**, **weekly cron**, and **Admin → Run autopilot**.

## Autopilot pipeline

1. Scan + connectors  
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
18. Content calendar  
19. Speed baseline + **OG share** + **locale decision**  
20. PreProd removals  
21. Bing + GSC act (when secrets set)  
22. Weekly + monthly + quarterly digests + webhook  
23. **Ops cockpit**  

## Highest-leverage human step

Open **`phase0-wizard.html`** (Admin → Phase 0 wizard) and set `MERIDIAN_GOOGLE_*` — that unlocks GSC sitemap submit, URL inspect, and indexing-queue automation.

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
npm run meridian:act:polish
npm run meridian:act:index-queue
npm run meridian:act:og
npm run meridian:act:locales
npm run meridian:act:cockpit
```

Open `storage/meridian/zigma-prod/phase5-ops.html` after Phase 5 — one-click NAP copy into Google Business Profile.
