import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * Host DB readiness for Meridian CMS scripts (meta/alt/sameAs/keyword/seed).
 * GitHub Actions often has no DB secrets and must skip — not hard-fail.
 */

export function dbEnvReady() {
  const host = process.env.DB_HOST || process.env.MERIDIAN_DB_HOST;
  const user = process.env.DB_USER || process.env.MERIDIAN_DB_USER;
  const name = process.env.DB_NAME || process.env.MERIDIAN_DB_NAME;
  return Boolean(host && user && name);
}

export function mysqlPackageReady(cwd = process.cwd()) {
  try {
    const require = createRequire(resolve(cwd, 'package.json'));
    require.resolve('mysql2');
    return true;
  } catch {
    return false;
  }
}

export function dbReady(cwd = process.cwd()) {
  if (process.env.MERIDIAN_SKIP_DB === '1') return false;
  return dbEnvReady() && mysqlPackageReady(cwd);
}

/** @returns {string|null} human reason to skip, or null if ready */
export function dbSkipReason(cwd = process.cwd()) {
  if (process.env.MERIDIAN_SKIP_DB === '1') return 'MERIDIAN_SKIP_DB=1';
  if (!mysqlPackageReady(cwd)) return 'mysql2 not installed (run npm ci)';
  if (!dbEnvReady()) return 'DB_HOST/DB_USER/DB_NAME (or MERIDIAN_DB_*) not set';
  return null;
}
