/** Staging deploy: https://justxsystems.com/zigma-technologies/ — blind-follow Hostinger guide. */

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
  publicUrl: 'https://justxsystems.com/zigma-technologies',
  publicUrlSlash: 'https://justxsystems.com/zigma-technologies/',
  adminUrl: 'https://justxsystems.com/zigma-technologies/admin/login',
  basePath: '/zigma-technologies',
  domain: 'justxsystems.com',
  appName: 'zigma-jx',
  appPort: '3001',
  appDir: '/var/www/zigma-technologies',
  dbName: 'zigmatech_jx',
  dbUser: 'zigmatech_jx',
};

export const JX_WHY = [
  'This is a subdirectory deploy (not the site root). Next.js requires NEXT_PUBLIC_BASE_PATH=/zigma-technologies at build time.',
  'justxsystems.com can keep serving its existing homepage; only /zigma-technologies/* is proxied to this Node app.',
  'Use a separate MySQL database (zigmatech_jx) so staging never touches production content.',
  'Use port 3001 by default so another app on :3000 (if any) is not disturbed.',
];

/** Commands verified on Windows/dev before documenting the Hostinger path. */
export const JX_VALIDATED = {
  dateNote: 'Validated in-repo: npm run typecheck (exit 0) and npm run build with NEXT_PUBLIC_BASE_PATH=/zigma-technologies (exit 0; .next basePath confirmed).',
  localQualityGates: `npm run typecheck
# Optional but recommended before push:
# npm run build`,
  stagingBuildProof: `# On the VPS, after .env contains NEXT_PUBLIC_BASE_PATH=/zigma-technologies:
npm ci
npm run build
# Confirm basePath is baked in:
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Expect: /zigma-technologies`,
};

export const JX_PREREQS = [
  'SSH access to the Hostinger VPS that serves justxsystems.com (or a KVM 2 VPS where you will point DNS / add the location).',
  'GitHub clone access for this repository (deploy key or HTTPS + PAT).',
  'Ability to edit Nginx for justxsystems.com (sites-available) without removing the existing root site.',
  'MySQL root or sudo mysql access on the VPS (or Hostinger MySQL if you use remote DB).',
  'Laptop with this repo building cleanly: npm run typecheck && npm run build',
  'Optional: npm run db:export -- --with-cms-media from your DEV machine for content seed.',
];

export const JX_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'validated', label: 'Validated gates' },
  { id: 'prereqs', label: 'Prerequisites' },
  { id: 'phases', label: 'Blind-follow steps' },
  { id: 'env', label: '.env (exact)' },
  { id: 'nginx', label: 'Nginx location' },
  { id: 'verify', label: 'Verify URLs' },
  { id: 'updates', label: 'Updates' },
  { id: 'faq', label: 'FAQ' },
];

export const JX_PHASES: JxPhase[] = [
  {
    id: 'ssh',
    phase: 'Step 1',
    title: 'SSH into the Hostinger server for justxsystems.com',
    summary: 'Confirm you are on the machine that already (or will) terminate HTTPS for justxsystems.com.',
    steps: [
      'From hPanel → VPS → SSH Access, note the IPv4.',
      'ssh root@YOUR_VPS_IP   (or ssh deploy@YOUR_VPS_IP if you already created a deploy user).',
      'Confirm the domain is on this box: grep -R "justxsystems.com" /etc/nginx/sites-enabled/ || ls /etc/nginx/sites-enabled/',
      'If Nginx is not installed yet, follow the KVM 2 production guide first (Node, Nginx, Certbot, firewall), then return here.',
      'Note whether port 3000 is already used: ss -tlnp | grep -E \':3000|:3001\' — this guide uses ' +
        JX_TARGET.appPort +
        ' for Zigma.',
    ],
    checklist: [
      'SSH works',
      'Nginx config for justxsystems.com located',
      'Port ' + JX_TARGET.appPort + ' free (or chosen alternative recorded)',
    ],
  },
  {
    id: 'stack',
    phase: 'Step 2',
    title: 'Install Node 20, PM2, MySQL client/server (if missing)',
    summary: 'Skip packages that are already present. Zigma needs Node 20+ and a running MySQL.',
    steps: [
      'node -v  — if missing or < 20: install Node 20 LTS via NodeSource.',
      'npm install -g pm2',
      'systemctl status mysql || systemctl status mysqld — if inactive, apt install -y mysql-server && systemctl enable --now mysql',
      'apt install -y git nginx  (if missing)',
      'mkdir -p /var/www && chown deploy:deploy /var/www  (create deploy user if you have not)',
    ],
    code: `# Node 20 (run only if node -v is missing / too old)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git nginx mysql-server
npm install -g pm2
node -v && npm -v && pm2 -v
systemctl enable --now mysql nginx`,
    checklist: ['node ≥ 20', 'pm2 available', 'mysql running', '/var/www writable by deploy'],
  },
  {
    id: 'mysql',
    phase: 'Step 3',
    title: 'Create MySQL database + user for this staging app',
    summary: 'Dedicated DB — never reuse production zigmatech credentials.',
    steps: [
      'Generate a strong password and store it in your password manager (you will paste it into .env).',
      'Create database ' + JX_TARGET.dbName + ' and user ' + JX_TARGET.dbUser + '@localhost.',
      'Grant ALL on that database only.',
      'Test: mysql -u ' + JX_TARGET.dbUser + ' -p ' + JX_TARGET.dbName + ' -e "SELECT 1;"',
      'Leave MySQL bound to 127.0.0.1 — do not open 3306 on the public firewall.',
    ],
    code: `sudo mysql -e "
CREATE DATABASE ${JX_TARGET.dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${JX_TARGET.dbUser}'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON ${JX_TARGET.dbName}.* TO '${JX_TARGET.dbUser}'@'localhost';
FLUSH PRIVILEGES;
"
mysql -u ${JX_TARGET.dbUser} -p ${JX_TARGET.dbName} -e "SELECT 1;"`,
    checklist: [
      'Database exists',
      'App user can SELECT 1',
      'Password saved for .env',
    ],
    warning: 'Replace REPLACE_WITH_STRONG_PASSWORD before running. Do not use DEV laptop passwords.',
  },
  {
    id: 'clone',
    phase: 'Step 4',
    title: 'Clone this GitHub repository',
    summary: 'Code lives under ' + JX_TARGET.appDir + '.',
    steps: [
      'su - deploy  (or stay as the user that owns /var/www)',
      'cd /var/www',
      'git clone <YOUR_GITHUB_REPO_URL> zigma-technologies',
      'cd zigma-technologies && git status && git rev-parse --short HEAD',
      'If the folder already exists from a previous attempt: cd zigma-technologies && git pull',
    ],
    code: `su - deploy
cd /var/www
git clone git@github.com:YOUR_ORG/zigma-technologies.git
cd zigma-technologies
git checkout master
git rev-parse --short HEAD`,
    checklist: ['Repo at ' + JX_TARGET.appDir, 'Correct branch', 'package.json present'],
  },
  {
    id: 'env',
    phase: 'Step 5',
    title: 'Create .env for justxsystems subdirectory (critical)',
    summary:
      'NEXT_PUBLIC_BASE_PATH and NEXT_PUBLIC_SITE_URL must match the public URL. BASE_PATH is baked in at build time.',
    steps: [
      'cd ' + JX_TARGET.appDir,
      'cp .env.example .env && chmod 600 .env',
      'nano .env — paste the exact template from the “.env (exact)” section of this guide (fill secrets).',
      'Generate AUTH_SECRET: openssl rand -hex 32',
      'Generate PREVIEW_SECRET: openssl rand -hex 32',
      'Confirm NEXT_PUBLIC_BASE_PATH=/zigma-technologies (no trailing slash)',
      'Confirm NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies (no trailing slash)',
      'Confirm PORT=' + JX_TARGET.appPort + ' (or leave unset and start PM2 with -p)',
      'Omit MEDIA_BASE_URL or set MEDIA_BASE_URL=/zigma-technologies/assets — if omitted, the app derives {BASE_PATH}/assets automatically.',
    ],
    checklist: [
      'BASE_PATH set',
      'SITE_URL includes /zigma-technologies',
      'DB_* points at zigmatech_jx',
      'AUTH_SECRET unique',
      '.env mode 600',
    ],
    warning:
      'If you change NEXT_PUBLIC_BASE_PATH later, you MUST rebuild (npm run build). A restart alone is not enough.',
  },
  {
    id: 'schema',
    phase: 'Step 6',
    title: 'Load schema or import CMS export',
    summary: 'Fresh empty DB → schema.sql; or promote DEV/UAT content with db:import.',
    steps: [
      'Option A (fresh): mysql -u ' +
        JX_TARGET.dbUser +
        ' -p ' +
        JX_TARGET.dbName +
        ' < scripts/schema.sql',
      'Then apply any scripts/migrate-*.sql in the order listed in ADMIN.md / README if your branch expects them.',
      'Option B (content): On laptop run npm run db:export -- --with-cms-media, scp the export folder to the server, then npm run db:import -- storage/exports/zigma-… --force',
      'mkdir -p public/assets/uploads/resumes public/assets/uploads/documents && chmod -R 755 public/assets',
      'mysql -u ' + JX_TARGET.dbUser + ' -p ' + JX_TARGET.dbName + ' -e "SHOW TABLES;"',
    ],
    code: `cd ${JX_TARGET.appDir}
mysql -u ${JX_TARGET.dbUser} -p ${JX_TARGET.dbName} < scripts/schema.sql
mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
mysql -u ${JX_TARGET.dbUser} -p ${JX_TARGET.dbName} -e "SHOW TABLES;"`,
    checklist: ['Tables present', 'Upload dirs exist'],
  },
  {
    id: 'build',
    phase: 'Step 7',
    title: 'npm ci + production build (with basePath)',
    summary: '.env must already contain NEXT_PUBLIC_BASE_PATH before this step.',
    steps: [
      'cd ' + JX_TARGET.appDir,
      'Confirm: grep NEXT_PUBLIC_BASE_PATH .env',
      'npm ci',
      'npm run build',
      'Confirm build output mentions basePath or that .next exists.',
      'Quick check: grep -R "zigma-technologies" .next/BUILD_ID .next/required-server-files.json 2>/dev/null | head',
    ],
    code: `cd ${JX_TARGET.appDir}
grep NEXT_PUBLIC_BASE_PATH .env
grep NEXT_PUBLIC_SITE_URL .env
npm ci
npm run build
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Must print: /zigma-technologies`,
    checklist: ['Build exit 0', '.next directory created', 'BASE_PATH was present during build'],
  },
  {
    id: 'pm2',
    phase: 'Step 8',
    title: 'Start the app with PM2 on port ' + JX_TARGET.appPort,
    summary: 'App listens on localhost only; Nginx will expose /zigma-technologies publicly.',
    steps: [
      'cd ' + JX_TARGET.appDir,
      'Start: pm2 start npm --name ' +
        JX_TARGET.appName +
        ' -- start -- -p ' +
        JX_TARGET.appPort +
        ' (also set PORT=' +
        JX_TARGET.appPort +
        ' in .env)',
      'pm2 save && pm2 startup  (run the printed systemd command once)',
      'curl -I http://127.0.0.1:' + JX_TARGET.appPort + '/zigma-technologies  — expect 200/307/308 (not connection refused)',
      'pm2 logs ' + JX_TARGET.appName + ' --lines 40 — fix DB errors before continuing',
    ],
    code: `cd ${JX_TARGET.appDir}
PORT=${JX_TARGET.appPort} pm2 start npm --name ${JX_TARGET.appName} -- start -- -p ${JX_TARGET.appPort}
pm2 save
pm2 startup
curl -sI "http://127.0.0.1:${JX_TARGET.appPort}/zigma-technologies" | head -n 5
pm2 status`,
    checklist: [
      'PM2 process online',
      'Local curl to /zigma-technologies responds',
      'No DB connection errors in logs',
    ],
  },
  {
    id: 'nginx',
    phase: 'Step 9',
    title: 'Add Nginx location for /zigma-technologies (keep existing site)',
    summary: 'Do not replace the whole server block — insert a location inside the existing justxsystems.com HTTPS server.',
    steps: [
      'Find the active config: ls -l /etc/nginx/sites-enabled/',
      'sudo nano the justxsystems.com server block (the one with listen 443 ssl and server_name justxsystems.com).',
      'Paste the location /zigma-technologies { … } block from this guide INSIDE that server { } (before the closing brace).',
      'Important: proxy_pass must be http://127.0.0.1:' +
        JX_TARGET.appPort +
        '  with NO path suffix so /zigma-technologies is forwarded intact to Next.js.',
      'sudo nginx -t && sudo systemctl reload nginx',
      'If SSL is not yet on justxsystems.com: certbot --nginx -d justxsystems.com -d www.justxsystems.com',
    ],
    checklist: [
      'nginx -t OK',
      'Existing homepage at https://justxsystems.com still works',
      'Location block present for /zigma-technologies',
    ],
    warning:
      'Wrong proxy_pass with a trailing URI (e.g. proxy_pass http://127.0.0.1:3001/;) strips the basePath and causes Next.js 404s. Use proxy_pass http://127.0.0.1:3001; with no path.',
  },
  {
    id: 'smoke',
    phase: 'Step 10',
    title: 'Browser smoke test + admin bootstrap',
    summary: 'Validate the public URL and admin before handing to QA.',
    steps: [
      'Open ' + JX_TARGET.publicUrlSlash + ' — homepage must load (CSS/JS under /zigma-technologies/_next/…).',
      'Open ' + JX_TARGET.adminUrl,
      'Fresh DB: Seed default admin using ADMIN_EMAIL / ADMIN_PASSWORD from .env, then change the password immediately.',
      'Imported DB: log in with known admin, then rotate passwords on this staging host.',
      'Dashboard → Bootstrap missing seeds if content is empty.',
      'Submit a test enquiry on the staging site; confirm Enquiries module.',
      'Confirm theme: ' + JX_TARGET.publicUrl + '/api/public/theme.css returns CSS.',
      'Confirm main site https://justxsystems.com is unaffected.',
    ],
    checklist: [
      'Homepage OK under /zigma-technologies/',
      'Admin login OK',
      'Passwords rotated',
      'Enquiry test OK',
      'Root justxsystems.com OK',
    ],
  },
];

export const JX_ENV = `NODE_ENV=production
PORT=${JX_TARGET.appPort}

# REQUIRED for subdirectory hosting — no trailing slash
NEXT_PUBLIC_BASE_PATH=/zigma-technologies
NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies

# MySQL (this VPS)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${JX_TARGET.dbName}
DB_USER=${JX_TARGET.dbUser}
DB_PASSWORD=<generate-strong-password>

# Auth (openssl rand -hex 32)
AUTH_SECRET=<unique-staging-secret>
PREVIEW_SECRET=<unique-preview-secret>

ADMIN_EMAIL=admin@justxsystems.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=Staging Admin

# Optional — omit to auto-use /zigma-technologies/assets
# MEDIA_BASE_URL=/zigma-technologies/assets

# Optional SMTP for enquiry tests
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Zigma Staging <noreply@justxsystems.com>"`;

export const JX_NGINX = `    # --- Zigma Technologies (Next.js) under /zigma-technologies ---
    # Place INSIDE the existing server { ... } for justxsystems.com (443).
    location /zigma-technologies {
        proxy_pass http://127.0.0.1:${JX_TARGET.appPort};
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

export const JX_VERIFY = [
  { url: JX_TARGET.publicUrlSlash, expect: 'Homepage HTML, branded Zigma content' },
  { url: `${JX_TARGET.publicUrl}/_next/static/`, expect: 'Static chunks (or 404 on bare folder is OK; page source must reference /zigma-technologies/_next/…)' },
  { url: `${JX_TARGET.publicUrl}/api/public/theme.css`, expect: 'text/css body' },
  { url: JX_TARGET.adminUrl, expect: 'Admin login form' },
  { url: 'https://justxsystems.com/', expect: 'Existing JustX site still loads' },
];

export const JX_UPDATE = `cd ${JX_TARGET.appDir}
git pull origin master
# Ensure .env still has NEXT_PUBLIC_BASE_PATH=/zigma-technologies
npm ci
# If schema changed: apply migrate-*.sql first
npm run build
pm2 restart ${JX_TARGET.appName}
pm2 logs ${JX_TARGET.appName} --lines 50`;

export const JX_FAQ = [
  {
    q: 'Links go to /projects instead of /zigma-technologies/projects',
    a: 'Plain <a href="/projects"> tags do not get Next.js basePath automatically. Rebuild with NEXT_PUBLIC_BASE_PATH=/zigma-technologies after pulling the latest code (Header/Footer/sections + BasePathBootstrap fix). Confirm .env has the basePath BEFORE npm run build, then pm2 restart.',
  },
  {
    q: 'Why is NEXT_PUBLIC_BASE_PATH required?',
    a: 'Next.js serves the app under /zigma-technologies only when basePath is set at build time. Without it, links, /_next assets, and APIs resolve to justxsystems.com/ instead of /zigma-technologies/.',
  },
  {
    q: 'Can I use Hostinger shared Node.js instead of VPS?',
    a: 'Possible only if that plan supports a custom start command, env vars, and reverse-proxy path routing. VPS + Nginx location (this guide) is the reliable path for subdirectory hosting.',
  },
  {
    q: 'Homepage is blank / CSS 404',
    a: 'Usually BASE_PATH missing at build, or Nginx proxy_pass stripping the path. Rebuild after setting NEXT_PUBLIC_BASE_PATH; use proxy_pass http://127.0.0.1:3001; with no trailing URI.',
  },
  {
    q: 'Admin login loops',
    a: 'Confirm X-Forwarded-Proto is set, AUTH_SECRET stable, and cookies are allowed for justxsystems.com. Cookie Path is scoped to /zigma-technologies when basePath is set.',
  },
  {
    q: 'How do I move later to www.zigma-technologies.com root?',
    a: 'Remove NEXT_PUBLIC_BASE_PATH (or set empty), set NEXT_PUBLIC_SITE_URL to the apex/www URL, rebuild, point DNS, and use a full-server Nginx server_name block as in the KVM 2 production guide.',
  },
];
