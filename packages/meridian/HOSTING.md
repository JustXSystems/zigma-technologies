# Meridian hosting

Canonical design: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** (product plane vs control plane).

## Quick ops

| Goal | Do this |
| --- | --- |
| Ship Production (site + Meridian + Command Brief) | GitHub → **Deploy Production** once (`DEPLOY_PROD`) |
| Ship PreProd (same parallel tracks) | Push `master` or GitHub → **Deploy PreProd** |
| Report without deploying the site | GitHub → **Meridian SEO report** (also Sunday cron) |
| Meridian CLI only (no site rebuild) | GitHub → **Deploy Meridian** (`plane`: prod or preprod) |
| Local | `npm run seo:report` |

**Deploy Production / Deploy PreProd** (defaults):

- Build the website and ship Meridian **in parallel** (correct VPS via `plane`)
- **Delta-rsync** the website release folder to `/tmp/zigma-release-stage` (warm deploys skip unchanged files); `.tgz` is artifact-only
- Pin `MERIDIAN_HOME=/var/www/zigma-meridian` on that site’s `.env` when needed
- Run live SEO verify + Command Brief (artifact) after the site is up
- Full autopilot is **off** unless you check `post_deploy_autopilot`

## Do not

- SCP a full website `.tgz` on every deploy (use stage rsync)
- Split into many parallel tarballs (same bytes, same pipe — no real win)
- Bundle Meridian into the website package (`SHIP_MERIDIAN=1` only for emergencies)
- Put SEO ops on the public apex as a second Next app
- Trigger Deploy Meridian + Meridian SEO report separately for a normal prod/preprod release
- Re-run Phase 0–33 human checklists — use Command Brief insights
