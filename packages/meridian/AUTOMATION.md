# Meridian automation — what runs without a human

Once secrets are set (see [SETUP.md](./SETUP.md)), Meridian runs the full SEO ops loop on cron/deploy/Admin.

## Autopilot (Production profile)

1. Technical scan + connectors  
2. **Draft + apply** empty meta titles/descriptions and image alt  
3. **Sitemap health** + orphan/thin **link graph**  
4. **Form health** (enquiry schema / contact / API)  
5. **Image weight** → **optimize to WebP** (sharp; `autoOptimizeImages`)  
6. **Orphan prescriptions** → append catalog hub footers (`autoApplyOrphans`)  
7. **Content briefs** for thin/orphan pages (`content-briefs.md`)  
8. **JSON-LD validate** on key pages (flags missing `sameAs`)  
9. Bing SubmitFeed + GSC submit/inspect/delta (when secrets set)  
10. Weekly + monthly digests + webhook  

## Commands

```bash
npm run meridian:autopilot
npm run meridian:act:optimize    # WebP compress heavy images
npm run meridian:act:orphans     # prescribe + apply catalog hub footers
npm run meridian:act:briefs      # Phase 7 content briefs
npm run meridian:act:schema      # Rich Results readiness lite
```

## Profile flags (zigma.prod.json)

| Flag | Default | Effect |
| --- | --- | --- |
| `autoApplyMeta` / `autoApplyAlt` | true | Fill empty CMS SEO fields |
| `autoOptimizeImages` | true | Write WebP + update `catalog_media.url` |
| `autoApplyOrphans` | true | Append Related hub footer on orphan catalog items |

## Still human

Google OAuth / Bing API key / DNS GSC / GBP / social profile URLs / polishing long-form copy from briefs.
