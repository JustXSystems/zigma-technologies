/** PreProd on JustXSystems VPS: https://justxsystems.com/zigma-technologies/ — subdirectory (basePath). */

import { GITHUB, PREPROD, PREPROD_VPS, PROD, PROD_VPS } from '@/lib/admin-guide-deploy-inventory';

export type JxPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  steps: string[];
  checklist?: string[];
  warning?: string;
  code?: string;
};

export const JX_TARGET = {
  publicUrl: PREPROD.publicUrl,
  publicUrlSlash: PREPROD.publicUrlSlash,
  adminUrl: PREPROD.adminUrl,
  basePath: PREPROD.basePath,
  domain: PREPROD.domain,
  appName: PREPROD.pm2Name,
  appPort: PREPROD.appPort,
  appDir: PREPROD.appDir,
  dbName: PREPROD.dbName,
  dbUser: PREPROD.dbUser,
  sshDeploy: PREPROD_VPS.sshDeploy,
  ipv4: PREPROD_VPS.ipv4,
  vpsLabel: PREPROD_VPS.label,
  workflow: PREPROD.workflow,
  script: PREPROD.script,
  githubRepo: GITHUB.repo,
  githubCloneSsh: GITHUB.cloneSsh,
};

export const JX_WHY = [
  'PreProd runs on the JustXSystems VPS (' +
    PREPROD_VPS.sshDeploy +
    ') — a different machine from Production (' +
    PROD_VPS.sshDeploy +
    ').',
  'It is a subdirectory (path) deploy under justxsystems.com: ' +
    PREPROD.publicUrlSlash +
    ' — not a DNS subdomain and not zigma-technologies.com.',
  'Next.js requires NEXT_PUBLIC_BASE_PATH=/zigma-technologies at build time.',
  'justxsystems.com keeps its existing homepage; only /zigma-technologies/* proxies to this Node app on port ' +
    PREPROD.appPort +
    '.',
  'Default GitHub Actions: every push to master deploys PreProd to the JustXSystems VPS only. Production is never touched by that workflow.',
];

export const JX_VALIDATED = {
  dateNote:
    'Validated in-repo: deploy.sh flag parsing; typecheck; two-VPS inventory (JustXSystems ≠ Zigma Technologies).',
  localQualityGates: `npm run typecheck
# Optional but recommended before push:
# npm run build`,
  stagingBuildProof: `# On JustXSystems VPS (${PREPROD_VPS.sshDeploy}), after .env has BASE_PATH:
cd ${PREPROD.appDir}
npm ci
npm run build
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Expect: /zigma-technologies`,
};

export const JX_PREREQS = [
  `SSH as ${PREPROD_VPS.sshDeploy} on JustXSystems VPS (${PREPROD_VPS.ipv4}) — NOT the Zigma Production VPS`,
  'GitHub clone access for JustXSystems/zigma-technologies',
  'Ability to edit Nginx for justxsystems.com without removing the existing root site',
  'MySQL on the JustXSystems VPS — dedicated PreProd DB',
  'GitHub Actions secrets: PREPROD_HOST, PREPROD_SSH_USER, PREPROD_SSH_KEY (separate from PROD_*)',
  'Laptop quality gates: npm run typecheck && npm run build',
];

export const JX_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Two-VPS architecture' },
  { id: 'validated', label: 'Validated gates' },
  { id: 'prereqs', label: 'Prerequisites' },
  { id: 'phases', label: 'Blind-follow steps' },
  { id: 'env', label: '.env (exact)' },
  { id: 'nginx', label: 'Nginx location' },
  { id: 'gha', label: 'GitHub Actions PreProd' },
  { id: 'verify', label: 'Verify URLs' },
  { id: 'updates', label: 'Updates' },
  { id: 'faq', label: 'FAQ' },
];

export const JX_ARCHITECTURE = [
  {
    label: 'JustXSystems VPS (this guide)',
    items: [
      PREPROD_VPS.sshDeploy,
      PREPROD.publicUrlSlash,
      `${PREPROD.appDir} · PM2 ${PREPROD.pm2Name} :${PREPROD.appPort}`,
      `Secrets ${PREPROD_VPS.secrets.host} / ${PREPROD_VPS.secrets.user} / ${PREPROD_VPS.secrets.key}`,
    ],
  },
  {
    label: 'Zigma Technologies VPS (Production — separate)',
    items: [
      PROD_VPS.sshDeploy,
      PROD.publicUrlSlash,
      `${PROD.appDir} · PM2 ${PROD.pm2Name} :${PROD.appPort}`,
      `Secrets ${PROD_VPS.secrets.host} / ${PROD_VPS.secrets.user} / ${PROD_VPS.secrets.key}`,
      'See /admin/guide/hostinger-prod — never deploy Prod from this VPS',
    ],
  },
];

export const JX_PHASES: JxPhase[] = [
  {
    id: 'ssh',
    phase: 'Step 1',
    title: 'SSH into the JustXSystems VPS (PreProd only)',
    summary: `Confirm you are on ${PREPROD_VPS.ipv4} — not ${PROD_VPS.ipv4} (Production).`,
    steps: [
      `ssh ${PREPROD_VPS.sshRoot} or ssh ${PREPROD_VPS.sshDeploy}`,
      'Confirm justxsystems.com Nginx config exists',
      `Confirm port ${PREPROD.appPort} is free (or record your chosen port)`,
      `hostname -I should include ${PREPROD_VPS.ipv4}`,
    ],
    checklist: ['SSH works', 'On JustXSystems VPS', `Port ${PREPROD.appPort} free`],
    code: `ssh ${PREPROD_VPS.sshDeploy}
hostname -I
# Must show ${PREPROD_VPS.ipv4} — if you see ${PROD_VPS.ipv4} you are on the wrong box
ss -tlnp | grep -E ':3000|:3001' || true`,
    warning: `Wrong VPS is a common failure mode. Production is ${PROD_VPS.sshDeploy}.`,
  },
  {
    id: 'stack',
    phase: 'Step 2',
    title: 'Install Node 20, PM2, MySQL, Nginx (if missing)',
    summary: 'Only on the JustXSystems VPS. Production has its own stack on its own box.',
    steps: ['node -v ≥ 20', 'npm install -g pm2', 'MySQL + nginx running'],
    code: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs git nginx mysql-server
sudo npm install -g pm2
node -v && pm2 -v
sudo systemctl enable --now mysql nginx`,
    checklist: ['node ≥ 20', 'pm2', 'mysql', 'nginx'],
  },
  {
    id: 'mysql',
    phase: 'Step 3',
    title: 'Create PreProd MySQL database + user',
    summary: `Dedicated DB ${PREPROD.dbName} on JustXSystems VPS only.`,
    steps: [
      'Generate strong password',
      `CREATE DATABASE ${PREPROD.dbName} and user ${PREPROD.dbUser}@localhost`,
      'Do not open 3306 publicly',
    ],
    code: `sudo mysql -e "
CREATE DATABASE ${PREPROD.dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${PREPROD.dbUser}'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON ${PREPROD.dbName}.* TO '${PREPROD.dbUser}'@'localhost';
FLUSH PRIVILEGES;
"`,
    checklist: ['DB exists', 'SELECT 1 works'],
    warning: 'Never reuse Production DB credentials from the Zigma VPS.',
  },
  {
    id: 'clone',
    phase: 'Step 4',
    title: 'Clone repo on JustXSystems VPS',
    summary: `Code at ${PREPROD.appDir} on this VPS only.`,
    steps: [`ssh ${PREPROD_VPS.sshDeploy}`, `git clone into ${PREPROD.appDir}`, 'checkout master'],
    code: `ssh ${PREPROD_VPS.sshDeploy}
sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www
git clone ${GITHUB.cloneSsh} ${PREPROD.appDir}
cd ${PREPROD.appDir} && git checkout master && git rev-parse --short HEAD`,
    checklist: [`Repo at ${PREPROD.appDir}`, 'deploy-preprod.sh present'],
  },
  {
    id: 'env',
    phase: 'Step 5',
    title: 'Create PreProd .env (subdirectory — critical)',
    summary: 'BASE_PATH and SITE_URL must match the path URL. Baked in at build time.',
    steps: [
      `cd ${PREPROD.appDir}`,
      'cp .env.example .env && chmod 600 .env',
      `NEXT_PUBLIC_BASE_PATH=${PREPROD.basePath}`,
      `NEXT_PUBLIC_SITE_URL=${PREPROD.siteUrlEnv}`,
      `PORT=${PREPROD.appPort}`,
      `DB_* → ${PREPROD.dbName}`,
    ],
    checklist: ['BASE_PATH set', 'SITE_URL has /zigma-technologies', '.env mode 600'],
    warning: 'Changing BASE_PATH later requires a full rebuild.',
  },
  {
    id: 'schema',
    phase: 'Step 6',
    title: 'Load schema or import CMS export',
    summary: 'Fresh DB → schema.sql; or db:import from laptop export.',
    code: `cd ${PREPROD.appDir}
mysql -u ${PREPROD.dbUser} -p ${PREPROD.dbName} < scripts/schema.sql
mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets`,
    steps: ['Import schema or content', 'Create upload dirs'],
    checklist: ['Tables present'],
  },
  {
    id: 'build',
    phase: 'Step 7',
    title: 'First build + PM2 (or deploy-preprod.sh)',
    summary: 'Preferred: ./scripts/deploy-preprod.sh after .env exists.',
    code: `cd ${PREPROD.appDir}
chmod +x scripts/deploy.sh scripts/deploy-preprod.sh
./scripts/deploy-preprod.sh
pm2 status ${PREPROD.pm2Name}
node -e "console.log(require('./.next/routes-manifest.json').basePath)"`,
    steps: ['chmod +x scripts', 'run deploy-preprod.sh', 'confirm basePath'],
    checklist: ['Build OK', 'basePath=/zigma-technologies', `PM2 ${PREPROD.pm2Name} online`],
  },
  {
    id: 'nginx',
    phase: 'Step 8',
    title: 'Nginx location for /zigma-technologies',
    summary: 'Inside existing justxsystems.com HTTPS server on the JustXSystems VPS.',
    steps: [
      'Edit justxsystems.com server block',
      `proxy_pass http://127.0.0.1:${PREPROD.appPort}; with NO path suffix`,
      'nginx -t && reload',
    ],
    checklist: ['nginx -t OK', 'justxsystems.com homepage still works'],
    warning: 'Trailing URI on proxy_pass strips basePath → 404s.',
  },
  {
    id: 'gha-wire',
    phase: 'Step 9',
    title: 'Wire GitHub Actions → Deploy PreProd (JustXSystems VPS)',
    summary: 'Use a keypair dedicated to PreProd. Do not reuse the Production PROD_SSH_KEY.',
    steps: [
      'Create laptop keypair gha_zigma_preprod',
      `Install .pub on ${PREPROD_VPS.sshDeploy} authorized_keys`,
      'GitHub secrets: PREPROD_HOST, PREPROD_SSH_USER, PREPROD_SSH_KEY',
      'Actions → Deploy PreProd → Run workflow (or push to master)',
    ],
    code: `# Laptop PowerShell — PreProd key only
ssh-keygen -t ed25519 -f .\\gha_zigma_preprod -C "gha-zigma-preprod"
type .\\gha_zigma_preprod.pub | ssh ${PREPROD_VPS.sshDeploy} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh -i .\\gha_zigma_preprod ${PREPROD_VPS.sshDeploy} "whoami && hostname -I"

# GitHub → Settings → Secrets → Actions:
# PREPROD_HOST=${PREPROD_VPS.ipv4}
# PREPROD_SSH_USER=deploy
# PREPROD_SSH_KEY=<private key contents>
# Do NOT put these values into PROD_* secrets`,
    checklist: ['whoami=deploy', 'PREPROD_* secrets', 'Workflow green'],
    warning: `Workflow refuses if PREPROD_HOST is set to ${PROD_VPS.ipv4} (Production IP).`,
  },
  {
    id: 'smoke',
    phase: 'Step 10',
    title: 'Browser smoke test + admin bootstrap',
    summary: 'Validate PreProd URL before QA.',
    steps: [
      `Open ${PREPROD.publicUrlSlash}`,
      `Open ${PREPROD.adminUrl}`,
      'Seed/rotate admin',
      'Confirm https://justxsystems.com unaffected',
    ],
    checklist: ['Homepage OK', 'Admin OK'],
  },
];

export const JX_ENV = `NODE_ENV=production
PORT=${PREPROD.appPort}

# REQUIRED for subdirectory hosting — no trailing slash
NEXT_PUBLIC_BASE_PATH=/zigma-technologies
NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies

# MySQL on JustXSystems VPS (localhost)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${PREPROD.dbName}
DB_USER=${PREPROD.dbUser}
DB_PASSWORD=<generate-strong-password>

AUTH_SECRET=<unique-preprod-secret>
PREVIEW_SECRET=<unique-preview-secret>

ADMIN_EMAIL=admin@justxsystems.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=PreProd Admin

SMTP_FROM="Zigma PreProd <noreply@justxsystems.com>"`;

export const JX_NGINX = `    # --- Zigma PreProd on JustXSystems VPS ---
    # Inside server { ... } for justxsystems.com (443)
    location /zigma-technologies {
        proxy_pass http://127.0.0.1:${PREPROD.appPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }`;

export const JX_GHA_SECRETS: { name: string; example: string; purpose: string }[] = [
  { name: 'PREPROD_HOST', example: PREPROD_VPS.ipv4, purpose: 'JustXSystems VPS IPv4 only' },
  { name: 'PREPROD_SSH_USER', example: 'deploy', purpose: 'OS user on JustXSystems VPS' },
  {
    name: 'PREPROD_SSH_KEY',
    example: '-----BEGIN OPENSSH PRIVATE KEY----- …',
    purpose: 'Private key authorized on JustXSystems VPS (not Production)',
  },
];

export const JX_GHA_HOW = [
  'Push to master (or Actions → Deploy PreProd → Run workflow).',
  `GitHub SSHs to ${PREPROD_VPS.sshDeploy} using PREPROD_* secrets.`,
  `Remote runs scripts/deploy-preprod.sh in ${PREPROD.appDir}.`,
  'Production workflow / Zigma VPS is never invoked.',
];

export const JX_VERIFY = [
  { url: PREPROD.publicUrlSlash, expect: 'Homepage under /zigma-technologies/' },
  { url: `${PREPROD.publicUrl}/api/public/theme.css`, expect: 'text/css' },
  { url: PREPROD.adminUrl, expect: 'Admin login' },
  { url: 'https://justxsystems.com/', expect: 'Existing JustX site OK' },
  {
    url: PROD.publicUrlSlash,
    expect: `Served from different VPS (${PROD_VPS.ipv4}) — not this guide`,
  },
];

export const JX_UPDATE = `ssh ${PREPROD_VPS.sshDeploy}
cd ${PREPROD.appDir}
./scripts/deploy-preprod.sh
pm2 logs ${PREPROD.pm2Name} --lines 50`;

export const JX_FAQ = [
  {
    q: 'Is PreProd on the same VPS as Production?',
    a: `No. PreProd is ${PREPROD_VPS.sshDeploy} (JustXSystems). Production is ${PROD_VPS.sshDeploy} (Zigma Technologies). Separate secrets, DBs, and Nginx.`,
  },
  {
    q: 'Is PreProd a DNS subdomain?',
    a: 'No — it is a subdirectory path deploy: justxsystems.com/zigma-technologies with NEXT_PUBLIC_BASE_PATH.',
  },
  {
    q: 'What happens when I push to master?',
    a: 'Only Deploy PreProd runs — SSH to JustXSystems VPS. Production requires a separate manual workflow against the Zigma VPS.',
  },
  {
    q: 'Homepage blank / CSS 404',
    a: 'BASE_PATH missing at build, or Nginx proxy_pass stripping the path. Use proxy_pass http://127.0.0.1:3001; with no trailing URI.',
  },
  {
    q: 'How do I promote PreProd → Production?',
    a: `QA on PreProd, then Actions → Deploy Production on ${PROD_VPS.sshDeploy} with confirm_production=DEPLOY_PROD. Optionally db:export from PreProd and db:import on Prod after backup.`,
  },
];
