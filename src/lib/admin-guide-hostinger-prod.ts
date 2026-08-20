/** Hostinger KVM 2 — production setup from GitHub + MySQL (operator guide). */

export type ProdPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  steps: string[];
  checklist?: string[];
  warning?: string;
  code?: string;
};

export type ProdFaq = { q: string; a: string };

export const PROD_STACK = {
  plan: 'Hostinger KVM 2 VPS',
  specs: '2 vCPU · 8 GB RAM · 100 GB NVMe · 8 TB bandwidth',
  os: 'Ubuntu 24.04 LTS (or 22.04 LTS)',
  runtime: 'Node.js 20 LTS',
  process: 'PM2',
  proxy: 'Nginx + Certbot (Let’s Encrypt)',
  database: 'MySQL 8 on the same VPS',
  source: 'GitHub repository (git clone / git pull)',
  domain: 'www.zigma-technologies.com',
  appPort: '3000 (localhost only — Nginx terminates HTTPS)',
};

export const PROD_PREREQUISITES = [
  'Hostinger account with payment method ready for KVM 2 VPS',
  'GitHub repository access (clone URL + deploy key or personal access token for private repos)',
  'Domain DNS access at BigRock (or wherever DNS is managed) — A records for @ and www',
  'Laptop with SSH client (Windows: PowerShell / Windows Terminal; macOS/Linux: Terminal)',
  'Password manager for PROD secrets (DB password, AUTH_SECRET, admin password, SMTP)',
  'Approved content export from DEV/UAT: npm run db:export -- --with-cms-media',
  'Local quality gates green: npm run typecheck && npm run lint && npm run build',
];

export const PROD_ARCHITECTURE = [
  {
    label: 'Internet',
    items: ['HTTPS → www.zigma-technologies.com', 'DNS A records at BigRock → VPS IPv4'],
  },
  {
    label: 'Hostinger KVM 2',
    items: ['Nginx :443 / :80', 'Certbot SSL', 'PM2 → Next.js on 127.0.0.1:3000', 'MySQL 8 on localhost:3306'],
  },
  {
    label: 'Application',
    items: ['Git clone of this repo', '.env (never in Git)', 'public/assets uploads', '/admin control plane'],
  },
];

export const PROD_PURCHASE_STEPS = [
  'Open https://www.hostinger.com/vps-hosting → select **KVM 2**.',
  'Choose billing term (24-month intro is cheapest; note the **renewal** price in the cart).',
  'Pick a data centre close to your audience (India: Mumbai if offered; otherwise Singapore / nearest).',
  'Select OS template: **Ubuntu 24.04 LTS** (preferred) or **Ubuntu 22.04 LTS**.',
  'Complete checkout and open **hPanel** → **VPS**.',
  'Record the public **IPv4** address — you will use it for SSH and DNS.',
  'hPanel → VPS → **SSH Access**: set a strong root password **or** add your SSH public key (recommended).',
  'Optional: enable Hostinger automatic backups for the VPS (snapshots) before go-live.',
  'Do **not** transfer the domain unless you want one vendor — keep registration at BigRock and only change DNS later.',
];

export const PROD_PHASES: ProdPhase[] = [
  {
    id: 'buy',
    phase: 'Step 1',
    title: 'Purchase & access the KVM 2 VPS',
    summary: 'Activate the server and confirm SSH works before installing anything.',
    steps: [
      'Complete the purchase steps above and wait until the VPS status is Active in hPanel.',
      'From your laptop: ssh root@YOUR_VPS_IP (use the IP from hPanel).',
      'On first login, change the root password if you used password auth: passwd',
      'Confirm disk and memory: df -h && free -h — expect ~100 GB disk and ~8 GB RAM.',
      'Store root / deploy credentials in the team password manager — never in Slack or Git.',
    ],
    checklist: [
      'VPS Active in hPanel',
      'SSH login succeeds',
      'IPv4 recorded',
      'Credentials in password manager',
    ],
  },
  {
    id: 'harden',
    phase: 'Step 2',
    title: 'Base OS hardening & firewall',
    summary: 'Update packages, create a deploy user, and open only required ports.',
    steps: [
      'apt update && apt upgrade -y',
      'apt install -y curl git ufw fail2ban ca-certificates gnupg',
      'Create deploy user: adduser deploy && usermod -aG sudo deploy',
      'Copy your SSH key to deploy: ssh-copy-id deploy@YOUR_VPS_IP (from laptop)',
      'UFW: ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable',
      'Verify: ufw status — SSH, HTTP, HTTPS only. Do not open MySQL 3306 to the public internet.',
      'Optional: disable password SSH for root after deploy-key login works (sshd_config).',
    ],
    checklist: [
      'System packages updated',
      'deploy user can sudo',
      'UFW allows 22/80/443 only',
      'Port 3306 not publicly exposed',
    ],
    warning: 'Never expose MySQL to 0.0.0.0. The Next.js app connects via localhost on this VPS.',
  },
  {
    id: 'stack',
    phase: 'Step 3',
    title: 'Install Node.js 20, Nginx, PM2, Certbot',
    summary: 'Install the application runtime stack used in production.',
    steps: [
      'Install Node 20 LTS via NodeSource (or nvm). Confirm: node -v shows v20.x and npm -v works.',
      'npm install -g pm2',
      'apt install -y nginx',
      'systemctl enable --now nginx',
      'apt install -y certbot python3-certbot-nginx',
      'Create app directory: mkdir -p /var/www && chown deploy:deploy /var/www',
    ],
    checklist: [
      'node -v → v20.x',
      'pm2 -v works',
      'nginx is active',
      'certbot installed',
      '/var/www owned by deploy',
    ],
    code: `# As root (or sudo)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
npm install -g pm2
mkdir -p /var/www && chown deploy:deploy /var/www
node -v && npm -v && pm2 -v`,
  },
  {
    id: 'mysql',
    phase: 'Step 4',
    title: 'Install & configure MySQL 8 (production database)',
    summary: 'Create a dedicated PROD database and least-privilege app user. Keep MySQL bound to localhost.',
    steps: [
      'apt install -y mysql-server',
      'systemctl enable --now mysql',
      'Run mysql_secure_installation (set root password, remove anonymous users, disallow remote root).',
      'Create database zigmatech_prod and user zigmatech_prod with a strong password (32+ random chars).',
      'GRANT ALL PRIVILEGES ON zigmatech_prod.* TO the app user; FLUSH PRIVILEGES.',
      'Confirm bind-address is 127.0.0.1 in MySQL config (default on Ubuntu packages).',
      'Test login: mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'Record DB_HOST=localhost, DB_PORT=3306, DB_NAME, DB_USER, DB_PASSWORD in password manager for .env.',
    ],
    checklist: [
      'mysql service running',
      'zigmatech_prod database exists',
      'App user can SELECT 1',
      'No public 3306 access',
      'Credentials stored securely',
    ],
    code: `sudo mysql -e "
CREATE DATABASE zigmatech_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zigmatech_prod'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON zigmatech_prod.* TO 'zigmatech_prod'@'localhost';
FLUSH PRIVILEGES;
"`,
    warning:
      'Never reuse DEV or UAT database passwords on PROD. Generate a new AUTH_SECRET and admin password for production.',
  },
  {
    id: 'github',
    phase: 'Step 5',
    title: 'Clone the application from GitHub',
    summary: 'Deploy from this repository using HTTPS + token or a read-only deploy key (recommended for private repos).',
    steps: [
      'Switch to deploy user: su - deploy',
      'cd /var/www',
      'Private repo (recommended): create a GitHub Deploy Key (read-only) for this VPS, add the public key in GitHub → Settings → Deploy keys, then: git clone git@github.com:ORG/zigma-technologies.git',
      'Public repo or PAT: git clone https://github.com/ORG/zigma-technologies.git',
      'cd zigma-technologies && git checkout master (or your production branch)',
      'Confirm package.json exists at the repo root (this is the Next.js app root).',
      'Never clone as root into a world-writable path; keep ownership as deploy:deploy.',
    ],
    checklist: [
      'Repo cloned under /var/www/zigma-technologies',
      'Correct branch checked out',
      'deploy owns the tree',
      'GitHub credentials are deploy-key or PAT — not a personal password in shell history',
    ],
    code: `# As deploy user
cd /var/www
# Deploy key example (after ssh-keygen -t ed25519 -C "zigma-prod-deploy" and adding pubkey to GitHub)
git clone git@github.com:YOUR_ORG/zigma-technologies.git
cd zigma-technologies
git status
git rev-parse --short HEAD`,
  },
  {
    id: 'env',
    phase: 'Step 6',
    title: 'Create production .env (secrets)',
    summary: 'Copy .env.example, fill PROD-only values, and lock file permissions. Never commit .env.',
    steps: [
      'cd /var/www/zigma-technologies',
      'cp .env.example .env && chmod 600 .env',
      'Edit with nano .env — set NODE_ENV=production and all required keys (see template in this guide).',
      'Generate AUTH_SECRET: openssl rand -hex 32',
      'Generate PREVIEW_SECRET: openssl rand -hex 32 (separate from AUTH_SECRET).',
      'Set NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com',
      'Set MEDIA_BASE_URL=/assets (default — local uploads under public/assets).',
      'Set SMTP_* if enquiry emails should send (Hostinger mailbox or Google Workspace App Password).',
      'Confirm DEV_BYPASS_AUTH is absent or false — it must never bypass auth when NODE_ENV=production anyway, but do not rely on it.',
      'Double-check .env is listed in .gitignore and never appears in git status as a tracked file.',
    ],
    checklist: [
      '.env mode 600',
      'Unique AUTH_SECRET / PREVIEW_SECRET',
      'PROD DB credentials only',
      'NEXT_PUBLIC_SITE_URL is https://www…',
      'SMTP filled for live notifications',
    ],
    warning:
      'Do not paste local DEV passwords (e.g. from laptop .env) into production. Rotate ADMIN_PASSWORD after first seed login.',
  },
  {
    id: 'schema',
    phase: 'Step 7',
    title: 'Load MySQL schema (or import full CMS export)',
    summary: 'Choose fresh schema + admin bootstrap, or promote approved UAT/DEV content with db:import.',
    steps: [
      'Option A — Fresh install: mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql',
      'Then apply any pending scripts/migrate-*.sql files in the order documented in ADMIN.md / README.',
      'Option B — Promote content (recommended when UAT is signed off): upload storage/exports/zigma-… to the server, then npm run db:import -- storage/exports/zigma-… --force',
      'Create upload dirs: mkdir -p public/assets/uploads/resumes public/assets/uploads/documents && chmod -R 755 public/assets',
      'Verify tables exist: mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"',
    ],
    checklist: [
      'Tables present (pages, catalog_items, admin_users, …)',
      'Upload directories writable',
      'Import completed without SQL errors',
    ],
    code: `# Fresh schema
cd /var/www/zigma-technologies
mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql

# Or full content promote (after scp of export folder)
npm run db:import -- storage/exports/zigma-YYYYMMDD-HHMMSS --force`,
  },
  {
    id: 'build',
    phase: 'Step 8',
    title: 'Install dependencies & production build',
    summary: 'Build must succeed on the VPS. Fix TypeScript/build errors before starting PM2.',
    steps: [
      'cd /var/www/zigma-technologies',
      'npm ci   # or npm install if lockfile workflows differ',
      'npm run build',
      'Confirm .next/ directory was created.',
      'If build OOMs (rare on 8 GB): temporarily stop MySQL during build or add 2 GB swap — KVM 2 usually has enough RAM.',
    ],
    checklist: [
      'npm ci completed',
      'npm run build exit 0',
      '.next present',
    ],
    code: `cd /var/www/zigma-technologies
npm ci
npm run build`,
  },
  {
    id: 'pm2',
    phase: 'Step 9',
    title: 'Start Next.js with PM2',
    summary: 'Keep the Node process alive across SSH logout and reboots.',
    steps: [
      'pm2 start npm --name zigma -- start',
      'pm2 status — state should be online',
      'curl -I http://127.0.0.1:3000 — expect HTTP 200 or 307/308 redirect',
      'pm2 save',
      'pm2 startup systemd — run the printed sudo command so the app starts on boot',
      'pm2 logs zigma --lines 50 — check for DB connection errors',
    ],
    checklist: [
      'PM2 process online',
      'Localhost :3000 responds',
      'Startup on boot configured',
      'No DB errors in logs',
    ],
    code: `cd /var/www/zigma-technologies
pm2 start npm --name zigma -- start
pm2 save
pm2 startup
curl -I http://127.0.0.1:3000
pm2 logs zigma --lines 50`,
  },
  {
    id: 'nginx',
    phase: 'Step 10',
    title: 'Nginx reverse proxy + HTTPS',
    summary: 'Terminate SSL at Nginx and proxy to PM2. Point DNS only after this works via hosts-file test.',
    steps: [
      'Create /etc/nginx/sites-available/zigma with the Nginx snippet from this guide.',
      'ln -s /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/',
      'Remove default site if it conflicts: rm /etc/nginx/sites-enabled/default',
      'nginx -t && systemctl reload nginx',
      'Temporarily test with hosts file on laptop: YOUR_VPS_IP www.zigma-technologies.com',
      'Before public DNS: certbot needs DNS already pointing OR use certbot certonly --standalone briefly — preferred: set DNS A records when ready, then certbot --nginx -d www.zigma-technologies.com -d zigma-technologies.com',
      'Force HTTPS redirect (Certbot usually adds this automatically).',
      'client_max_body_size 25M for media / resume uploads.',
    ],
    checklist: [
      'nginx -t OK',
      'HTTP reaches Next via proxy',
      'HTTPS certificate valid',
      'Apex redirects to www (optional but recommended)',
    ],
  },
  {
    id: 'dns',
    phase: 'Step 11',
    title: 'DNS cutover (BigRock) & go-live',
    summary: 'Point apex and www to the VPS IP. Leave MX records unchanged unless migrating email separately.',
    steps: [
      'Lower TTL on A records to 300s at least 24h before cutover if possible.',
      'Update A record @ → VPS IP',
      'Update A record www → VPS IP',
      'Do not change MX / SPF / DKIM unless email is intentionally moving (see Email migration guide).',
      'Verify: nslookup www.zigma-technologies.com',
      'Open https://www.zigma-technologies.com and run the post-deploy checklist.',
      'Submit sitemap in Google Search Console after cutover.',
    ],
    checklist: [
      'www and apex resolve to Hostinger IP',
      'HTTPS padlock valid',
      'MX unchanged (if mail stays elsewhere)',
      'Post-deploy checklist passed',
    ],
    warning: 'If email still uses UrbanVendo, changing only A records is correct — never delete MX during website cutover.',
  },
  {
    id: 'admin',
    phase: 'Step 12',
    title: 'Admin bootstrap, security & content handoff',
    summary: 'Seed or log in, rotate passwords, verify forms and SMTP.',
    steps: [
      'Open https://www.zigma-technologies.com/admin/login',
      'If fresh DB: use Seed default admin (credentials from ADMIN_EMAIL / ADMIN_PASSWORD in .env), then change password immediately.',
      'If imported DB: log in with known UAT admin, then rotate all admin passwords on PROD.',
      'Dashboard → Bootstrap missing seeds only if content is incomplete.',
      'Site Settings → company contact, analytics (PROD only), enquiry notify email.',
      'Submit a test enquiry → Enquiries module + SMTP inbox.',
      'Confirm /api/public/theme.css loads and catalog pages render.',
      'Revoke any temporary GitHub PATs used during clone if you migrate to deploy keys.',
    ],
    checklist: [
      'Admin login works over HTTPS',
      'Default passwords rotated',
      'Enquiry form + email OK',
      'Theme CSS OK',
      'No DEV secrets on server',
    ],
  },
];

export const PROD_ENV_TEMPLATE = `NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com

# MySQL on this VPS (localhost only)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zigmatech_prod
DB_USER=zigmatech_prod
DB_PASSWORD=<generate-strong-password>

# Auth (openssl rand -hex 32 for each)
AUTH_SECRET=<unique-prod-secret-min-32-chars>
PREVIEW_SECRET=<unique-preview-secret>
COOKIE_NAME=zigma_admin

# First admin seed only — change password after first login
ADMIN_EMAIL=admin@zigma-technologies.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=Site Admin

# Media served by Next.js from /public/assets
MEDIA_BASE_URL=/assets

# Enquiry notifications (Hostinger mailbox or Google Workspace)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<mailbox-or-app-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"

# Optional: Cloudflare Turnstile on public forms
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=`;

export const PROD_NGINX = `server {
    listen 80;
    server_name www.zigma-technologies.com zigma-technologies.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;

export const PROD_UPDATE_COMMANDS = `# On the VPS as deploy user
cd /var/www/zigma-technologies
git fetch origin
git checkout master
git pull origin master
npm ci
# If schema changed, apply migrate-*.sql BEFORE restart
npm run build
pm2 restart zigma
pm2 logs zigma --lines 80`;

export const PROD_BACKUP = [
  {
    title: 'Application code',
    detail: 'Git is the source of truth. Tag releases: git tag -a vYYYY.MM.DD -m "prod" && git push --tags',
  },
  {
    title: 'MySQL dump (daily)',
    detail:
      'mysqldump -u zigmatech_prod -p zigmatech_prod | gzip > /var/backups/zigma/db-$(date +%F).sql.gz — keep 14+ days; store off-server if possible.',
  },
  {
    title: 'CMS media & uploads',
    detail:
      'Include public/assets in backups (rsync or tar). Or use npm run db:export -- --with-cms-media before major changes.',
  },
  {
    title: 'Hostinger snapshots',
    detail: 'Enable VPS backups in hPanel for full-disk restore after catastrophic failure.',
  },
];

export const PROD_CHECKLIST = [
  'Homepage / loads over HTTPS',
  '/admin/login works; passwords rotated',
  'Dashboard stats look sane',
  '/products, /projects, /services list items',
  'One detail page + media load',
  'Enquiry form → Enquiries row + email',
  '/api/public/theme.css returns CSS',
  '/sitemap.xml accessible',
  'HTTPS only — no mixed content',
  '.env not web-accessible',
  '/assets/uploads/resumes blocked from direct URL',
  'pm2 status online; pm2 startup enabled',
  'UFW active; 3306 closed externally',
  'MX records unchanged (unless email migrated)',
];

export const PROD_TROUBLESHOOT = [
  {
    symptom: 'Database connection failed / 500 everywhere',
    fixes: [
      'Verify DB_* in /var/www/zigma-technologies/.env',
      'systemctl status mysql',
      'mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'Confirm schema imported',
    ],
  },
  {
    symptom: 'Admin login loop',
    fixes: [
      'AUTH_SECRET must be stable — changing it invalidates cookies',
      'Nginx must send X-Forwarded-Proto $scheme',
      'Clear browser cookies for the domain and retry',
    ],
  },
  {
    symptom: 'npm run build fails / OOM',
    fixes: [
      'Run typecheck locally first',
      'Ensure .env exists on server before build if routes hit DB',
      'Add swap: fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile',
    ],
  },
  {
    symptom: 'Images / media 404',
    fixes: [
      'Re-import with --with-cms-media',
      'MEDIA_BASE_URL=/assets',
      'Files under public/assets/…',
    ],
  },
  {
    symptom: 'Enquiry emails not sending',
    fixes: [
      'Check SMTP_* and Site Settings enquiry notify toggle',
      'Test mailbox login in Hostinger Emails or Google App Password',
      'pm2 logs for nodemailer errors',
    ],
  },
  {
    symptom: 'git pull denied',
    fixes: [
      'Confirm deploy key is attached to the correct GitHub repo',
      'ssh -T git@github.com as deploy user',
      'Or regenerate PAT / use HTTPS remote',
    ],
  },
];

export const PROD_FAQ: ProdFaq[] = [
  {
    q: 'Why KVM 2 and not shared hosting?',
    a: 'This app is Next.js 16 with a persistent Node process, API routes, and MySQL. Basic shared PHP hosting cannot run it. KVM 2 (2 vCPU / 8 GB) is the recommended production starting tier for build + runtime + MySQL on one box.',
  },
  {
    q: 'Can MySQL stay on Hostinger shared hosting while the app is on VPS?',
    a: 'Possible via Remote MySQL + VPS IP allowlist, but not recommended. Latency and firewall complexity increase. Prefer MySQL on the same KVM 2 with bind-address 127.0.0.1.',
  },
  {
    q: 'Should we use GitHub Actions for deploy?',
    a: 'Optional later. Day-1 production path is SSH + git pull + npm ci + build + pm2 restart (documented here). Automate only after the manual path is stable.',
  },
  {
    q: 'What about JWT_SECRET in older .env files?',
    a: 'The application signs admin sessions with AUTH_SECRET only. Prefer AUTH_SECRET from .env.example. Ignore legacy JWT_* keys unless you have custom code depending on them.',
  },
  {
    q: 'Is DEV_BYPASS_AUTH dangerous in production?',
    a: 'It has no effect when NODE_ENV=production. Still omit it from PROD .env to avoid confusion.',
  },
  {
    q: 'How do UAT and PROD coexist on one VPS?',
    a: 'Possible with two folders, two PM2 apps (different ports), two Nginx server_names, and two MySQL databases. Prefer a separate UAT host if budget allows.',
  },
];

export const PROD_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'prereqs', label: 'Prerequisites' },
  { id: 'purchase', label: 'Buy KVM 2' },
  { id: 'phases', label: 'Setup steps' },
  { id: 'env', label: '.env template' },
  { id: 'nginx', label: 'Nginx' },
  { id: 'updates', label: 'GitHub updates' },
  { id: 'backups', label: 'Backups' },
  { id: 'checklist', label: 'Go-live checklist' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
];
