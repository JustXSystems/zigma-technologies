# Meridian hosting

Canonical design: **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** (product plane vs control plane).

## Quick ops

| Goal | Do this |
| --- | --- |
| Keep site safe | **Deploy Production** never ships Meridian (default) |
| Weekly / on-demand report | GitHub → **Meridian SEO report** (artifact = Command Brief) |
| Optional Admin buttons on VPS | **Deploy Meridian** → `/var/www/zigma-meridian` + PM2 `MERIDIAN_HOME` |
| Local | `npm run seo:report` |

## Do not

- Bundle Meridian into `zigma-prod.tgz` (`SHIP_MERIDIAN=1` only for emergencies)
- Put SEO ops on the public apex as a second Next app
- Re-run Phase 0–33 human checklists — use Command Brief insights
