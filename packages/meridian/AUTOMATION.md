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
42. **Phase 25 growth closer** (FAQ publish + homepage proof + indexing · **primary forever ops**)  

## Highest-leverage human step

Usually **none** — observe auto-closes GSC opportunities. Forever: **`npm run meridian:observe`**. Drift: **`npm run meridian:prod:hasmap`**. Optional GBP: `ack-gbp`.

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
npm run meridian:guard               # alias of phase17 — full re-seal
npm run meridian:act:phase18         # observatory only (GBP proxy + drift heal)
npm run meridian:act:phase19         # observatory + SEO-GUIDE canon sync
npm run meridian:act:phase20         # autonomic desk (includes phase19)
npm run meridian:act:phase21         # presence sentinel (includes phase20)
npm run meridian:act:phase22         # quiet throne (includes phase21)
npm run meridian:act:phase23         # eternal horizon (includes phase22)
npm run meridian:act:phase24         # deploy courier (includes phase23)
npm run meridian:act:phase25         # growth closer / signal forge (includes phase24)
npm run meridian:observe             # alias of phase25 — primary forever ops
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

Ops HTML dashboards (open after each act):
- `phase5-ops.html` — GBP NAP copy vault  
- `phase4-ops.html` — speed / PSI  
- `phase6-ops.html` — city briefs + locale  
- `phase7-ops.html` — content calendar (+ `.ics`)  
- `phase8-ops.html` — outreach mailto  
- `phase9-ops.html` — master command center (+ `phase9-routine.ics`)  
- `phase10-ops.html` — continuous unlock (+ `phase10-schtasks.xml` / `meridian-cron.ps1`)  
- `phase11-ops.html` — live convergence (+ GBP draft)  
- `phase12-ops.html` — score lift + deploy pack  
- `phase13-ops.html` — sovereign autoclose / mission complete  
- `phase14-ops.html` — perpetual ops + signal board  
- `phase15-ops.html` — sovereign fleet (CI + secrets + last runs)  
- `phase16-ops.html` — autonomous continuum (score apex + GBP pulse)  
- `phase17-ops.html` — mission archive / full re-seal  
- `phase18-ops.html` — observatory (sensors + GBP proxy + heal)  
- `phase19-ops.html` — living canon (SEO-GUIDE sync)  
- `phase20-ops.html` — autonomic desk (NAP · calendar · citations · debt)  
- `phase21-ops.html` — presence sentinel (GBP evidence · seal · verify kit)  
- `phase22-ops.html` — quiet throne  
- `phase23-ops.html` — eternal horizon (live seal + growth)  
- `phase24-ops.html` — deploy courier (SSH hasMap ship)  
- `phase25-ops.html` — **primary** growth closer / signal forge  
- `sovereign-certificate.html` — board certificate of autonomic ops  
- `live-throne.md` / `growth-radar.md` / `growth-closer.md` / `signal-forge.json` — live seal + GSC autoclose  
- `presence-sentinel.json` / `presence-seal.json` — local presence state  
- `automation-ledger.md` — Appendix F Meridian ledger  
- `executive-brief.md` — board one-pager  
- Root `SEO-GUIDE.md` — **Current status** + Appendix F ledger auto-owned by Meridian  

