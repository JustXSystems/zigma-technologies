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

## Highest-leverage human step

OAuth secrets in `unlock-secrets.json` / `.env` unlock GSC + GA4. Remaining: optional webhook, **prod deploy** for live sameAs, GBP verify.

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
npm run meridian:act:polish
npm run meridian:act:index-queue
npm run meridian:act:og
npm run meridian:act:locales
npm run meridian:act:cockpit
```

Ops HTML dashboards (open after each act):
- `phase5-ops.html` — GBP NAP copy vault  
- `phase4-ops.html` — speed / PSI  
- `phase6-ops.html` — city briefs + locale  
- `phase7-ops.html` — content calendar (+ `.ics`)  
- `phase8-ops.html` — outreach mailto  
- `phase9-ops.html` — master command center (+ `phase9-routine.ics`)  
- `phase10-ops.html` — continuous unlock (+ `phase10-schtasks.xml` / `meridian-cron.ps1`)  

