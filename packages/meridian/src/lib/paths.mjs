/**
 * Artefact path resolution for monorepo vs sidecar (MERIDIAN_HOME) installs.
 *
 * Profiles use `../../storage/meridian/<id>` meaning "site/repo storage".
 * That is correct when Meridian lives at `packages/meridian`. When installed at
 * `/var/www/zigma-meridian`, the same relative path wrongly becomes `/var/storage`.
 */
import { isAbsolute, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {{ id?: string, outputDir?: string } | null | undefined} profile
 * @param {{ outDir?: string }} [opts]
 */
export function resolveMeridianOutDir(profile, opts = {}) {
  if (opts.outDir) return resolve(opts.outDir);

  const envOut = (process.env.MERIDIAN_OUTPUT_DIR || '').trim();
  if (envOut) return resolve(envOut);

  const siteRoot = (
    process.env.MERIDIAN_SITE_ROOT ||
    process.env.ZIGMA_APP_DIR ||
    ''
  ).trim();

  const id = profile?.id || 'site';
  const configured = (profile?.outputDir || '').trim();

  if (configured) {
    if (isAbsolute(configured)) return configured;
    // ../../storage/meridian/zigma-prod → storage/meridian/zigma-prod under site
    const underSite = configured.replace(/^(?:\.\.[/\\])+/, '');
    if (siteRoot) return resolve(siteRoot, underSite);
    // Heuristic: if package is not under …/packages/meridian (sidecar), prefer cwd
    const pkgNorm = PKG_ROOT.replace(/\\/g, '/');
    if (!pkgNorm.includes('/packages/meridian') && !pkgNorm.endsWith('/packages/meridian')) {
      return resolve(process.cwd(), underSite);
    }
    return resolve(PKG_ROOT, configured);
  }

  if (siteRoot) return resolve(siteRoot, 'storage', 'meridian', id);
  return resolve(PKG_ROOT, 'out', id);
}
