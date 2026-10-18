#!/usr/bin/env node
/**
 * Post-build guard for PreProd / Prod SEO flags.
 *
 * Usage:
 *   node scripts/verify-seo-build.mjs --env preprod
 *   node scripts/verify-seo-build.mjs --env prod
 *
 * Exits non-zero when the baked build would index PreProd or leave Prod noindex.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const envIdx = args.indexOf('--env');
const envName = envIdx >= 0 ? args[envIdx + 1] : '';

if (envName !== 'preprod' && envName !== 'prod') {
  console.error('Usage: node scripts/verify-seo-build.mjs --env preprod|prod');
  process.exit(2);
}

const root = process.cwd();
const routesManifestPath = resolve(root, '.next/routes-manifest.json');
if (!existsSync(routesManifestPath)) {
  console.error('ERROR: .next/routes-manifest.json missing — run npm run build first');
  process.exit(1);
}

const routes = JSON.parse(readFileSync(routesManifestPath, 'utf8'));
const bakedBasePath = routes.basePath || '';

const flag = process.env.NEXT_PUBLIC_SEO_INDEXABLE;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

if (envName === 'preprod') {
  if (bakedBasePath !== '/zigma-technologies') {
    fail(`PreProd basePath must be /zigma-technologies (got '${bakedBasePath || '<empty>'}')`);
  }
  if (flag === 'true') {
    fail('NEXT_PUBLIC_SEO_INDEXABLE must NOT be true for PreProd builds');
  }
  if (siteUrl && !siteUrl.includes('justxsystems.com')) {
    console.warn(`WARNING: NEXT_PUBLIC_SITE_URL looks odd for PreProd: ${siteUrl}`);
  }
  console.log('OK PreProd SEO build: basePath set, SEO_INDEXABLE not true → noindex');
  process.exit(0);
}

// prod
if (bakedBasePath) {
  fail(`Production basePath must be empty (got '${bakedBasePath}')`);
}
if (flag !== 'true') {
  fail('NEXT_PUBLIC_SEO_INDEXABLE must be true for Production builds');
}
if (siteUrl && !siteUrl.includes('zigma-technologies.com')) {
  console.warn(`WARNING: NEXT_PUBLIC_SITE_URL looks odd for Production: ${siteUrl}`);
}
console.log('OK Production SEO build: no basePath, SEO_INDEXABLE=true → indexable');
