/**
 * Deploy inventory — TWO separate Hostinger VPS boxes (never the same machine).
 *
 * PreProd  → JustXSystems VPS  (subdirectory under justxsystems.com)
 * Production → Zigma Technologies VPS (domain root zigma-technologies.com)
 *
 * Each environment has its own SSH secrets, MySQL, PM2, Nginx, and .env.
 * App path may be identical on both boxes (/var/www/zigma-technologies) because
 * hosts are isolated — identity comes from which VPS you SSH into.
 */

export const GITHUB = {
  repo: 'https://github.com/JustXSystems/zigma-technologies',
  cloneSsh: 'git@github.com:JustXSystems/zigma-technologies.git',
  cloneHttps: 'https://github.com/JustXSystems/zigma-technologies.git',
  actions: 'https://github.com/JustXSystems/zigma-technologies/actions',
} as const;

/** JustXSystems VPS — PreProd only. */
export const PREPROD_VPS = {
  label: 'JustXSystems VPS',
  provider: 'Hostinger',
  ipv4: '193.203.161.219',
  sshUser: 'deploy',
  sshDeploy: 'deploy@193.203.161.219',
  sshRoot: 'root@193.203.161.219',
  secrets: {
    host: 'PREPROD_HOST',
    user: 'PREPROD_SSH_USER',
    key: 'PREPROD_SSH_KEY',
  },
} as const;

/** Zigma Technologies VPS — Production only. */
export const PROD_VPS = {
  label: 'Zigma Technologies VPS',
  provider: 'Hostinger',
  plan: 'KVM 2',
  location: 'India — Mumbai 2',
  os: 'Ubuntu 26.04 LTS',
  hostname: 'srv1954986.hstgr.cloud',
  ipv4: '200.234.45.106',
  sshUser: 'deploy',
  sshDeploy: 'deploy@200.234.45.106',
  sshRoot: 'root@200.234.45.106',
  secrets: {
    host: 'PROD_HOST',
    user: 'PROD_SSH_USER',
    key: 'PROD_SSH_KEY',
  },
} as const;

/** PreProd — subdirectory under justxsystems.com (path deploy + Next.js basePath). */
export const PREPROD = {
  id: 'preprod',
  label: 'PreProd',
  deployKind: 'subdirectory',
  vps: PREPROD_VPS,
  publicUrl: 'https://justxsystems.com/zigma-technologies',
  publicUrlSlash: 'https://justxsystems.com/zigma-technologies/',
  adminUrl: 'https://justxsystems.com/zigma-technologies/admin/login',
  siteUrlEnv: 'https://justxsystems.com/zigma-technologies',
  basePath: '/zigma-technologies',
  domain: 'justxsystems.com',
  /** Sole Zigma checkout on the JustX VPS. */
  appDir: '/var/www/zigma-technologies',
  pm2Name: 'zigma-preprod',
  appPort: '3001',
  dbName: 'zigmatech_preprod',
  dbUser: 'zigmatech_preprod',
  legacyDbName: 'zigmatech_jx',
  workflow: '.github/workflows/deploy-preprod.yml',
  script: 'scripts/deploy-preprod.sh',
  ghaDefault: 'Push to master (and manual Run workflow) always deploys PreProd on the JustXSystems VPS.',
} as const;

/** Production — apex domain root (no basePath) on the Zigma VPS. */
export const PROD = {
  id: 'prod',
  label: 'Production',
  deployKind: 'domain-root',
  vps: PROD_VPS,
  publicUrl: 'https://zigma-technologies.com',
  publicUrlSlash: 'https://zigma-technologies.com/',
  adminUrl: 'https://zigma-technologies.com/admin/login',
  siteUrlEnv: 'https://zigma-technologies.com',
  basePath: '' as const,
  domain: 'zigma-technologies.com',
  domainWww: 'www.zigma-technologies.com',
  appDir: '/var/www/zigma-technologies',
  pm2Name: 'zigma',
  appPort: '3000',
  dbName: 'zigmatech_prod',
  dbUser: 'zigmatech_prod',
  workflow: '.github/workflows/deploy-prod.yml',
  script: 'scripts/deploy-prod.sh',
  ghaDefault:
    'Manual workflow_dispatch only on the Zigma Technologies VPS. Choose components — never auto-deploys on push.',
  confirmPhrase: 'DEPLOY_PROD',
} as const;

/** @deprecated Prefer PREPROD_VPS / PROD_VPS — kept for any stray imports during migration. */
export const DEPLOY_VPS = PREPROD_VPS;

export const DEPLOY_ARCHITECTURE_LAYERS = [
  {
    label: 'Two VPS (isolated)',
    items: [
      `PreProd SSH ${PREPROD_VPS.sshDeploy} (${PREPROD_VPS.label})`,
      `Prod SSH ${PROD_VPS.sshDeploy} (${PROD_VPS.label})`,
      'Never share .env, DB, or SSH keys across environments',
      'MySQL localhost-only on each box; UFW 22/80/443',
    ],
  },
  {
    label: 'PreProd (subdirectory)',
    items: [
      PREPROD.publicUrlSlash,
      `${PREPROD_VPS.label} · ${PREPROD.appDir}`,
      `PM2 ${PREPROD.pm2Name} → 127.0.0.1:${PREPROD.appPort}`,
      `NEXT_PUBLIC_BASE_PATH=${PREPROD.basePath}`,
      `DB ${PREPROD.dbName}`,
      `Secrets ${PREPROD_VPS.secrets.host} / ${PREPROD_VPS.secrets.user} / ${PREPROD_VPS.secrets.key}`,
    ],
  },
  {
    label: 'Production (domain root)',
    items: [
      PROD.publicUrlSlash,
      `${PROD_VPS.label} · ${PROD.appDir}`,
      `PM2 ${PROD.pm2Name} → 127.0.0.1:${PROD.appPort}`,
      'No NEXT_PUBLIC_BASE_PATH',
      `DB ${PROD.dbName}`,
      `Secrets ${PROD_VPS.secrets.host} / ${PROD_VPS.secrets.user} / ${PROD_VPS.secrets.key}`,
    ],
  },
  {
    label: 'GitHub Actions',
    items: [
      'master push → Deploy PreProd → JustXSystems VPS only',
      'Deploy Production → workflow_dispatch + selective components → Zigma VPS only',
      'Separate SSH keypairs recommended (blast-radius isolation)',
    ],
  },
] as const;
