/** Hostinger KVM 2 — production setup from empty VPS + GitHub Actions (operator guide). */

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

/** Live PROD VPS inventory — fill secrets only in password manager / GitHub Secrets, never in git. */
export const PROD_SERVER = {
  provider: 'Hostinger',
  plan: 'KVM 2',
  location: 'India — Mumbai 2',
  os: 'Ubuntu 26.04 LTS',
  hostname: 'srv1954986.hstgr.cloud',
  ipv4: '200.234.45.106',
  sshRoot: 'root@200.234.45.106',
  sshDeploy: 'deploy@200.234.45.106',
  cpu: '2 cores',
  memory: '8 GB',
  disk: '100 GB',
  bandwidth: '8 TB',
  expires: '2028-09-04',
  renew: 'Auto-renewal On',
  githubRepo: 'https://github.com/JustXSystems/zigma-technologies',
  githubCloneSsh: 'git@github.com:JustXSystems/zigma-technologies.git',
  githubCloneHttps: 'https://github.com/JustXSystems/zigma-technologies.git',
  githubActions: 'https://github.com/JustXSystems/zigma-technologies/actions',
  appDir: '/var/www/zigma-technologies',
  pm2Name: 'zigma',
  domainApex: 'zigma-technologies.com',
  domainWww: 'www.zigma-technologies.com',
  publicUrl: 'https://zigma-technologies.com',
  adminUrl: 'https://zigma-technologies.com/admin/login',
};

export const PROD_STACK = {
  plan: 'Hostinger KVM 2 VPS (India — Mumbai 2)',
  specs: '2 vCPU · 8 GB RAM · 100 GB disk · 8 TB bandwidth',
  os: 'Ubuntu 26.04 LTS',
  runtime: 'Node.js 20 LTS',
  process: 'PM2',
  proxy: 'Nginx + Certbot (Let’s Encrypt)',
  database: 'MySQL 8 on the same VPS (localhost only)',
  source: 'GitHub JustXSystems/zigma-technologies + Actions auto-deploy',
  domain: 'zigma-technologies.com',
  appPort: '3000 (localhost only — Nginx terminates HTTPS)',
};

export const PROD_PREREQUISITES = [
  'Hostinger hPanel access for VPS srv1954986.hstgr.cloud (IPv4 200.234.45.106)',
  'Ability to SSH as root@200.234.45.106 (password or key from hPanel → VPS → SSH Access)',
  'GitHub org access to JustXSystems/zigma-technologies (Settings → Secrets, Deploy keys, Actions)',
  'Domain DNS access for zigma-technologies.com (A records for @ and www)',
  'Laptop with SSH client (Windows: PowerShell / Windows Terminal; macOS/Linux: Terminal)',
  'Password manager for PROD secrets (DB password, AUTH_SECRET, admin password, SMTP, Actions SSH key)',
  'Optional content export from DEV/UAT: npm run db:export -- --with-cms-media',
  'Local quality gates green before first go-live: npm run typecheck && npm run lint && npm run build',
];

export const PROD_ARCHITECTURE = [
  {
    label: 'Internet / DNS',
    items: [
      'HTTPS → https://zigma-technologies.com',
      'A records @ and www → 200.234.45.106',
    ],
  },
  {
    label: 'Hostinger KVM 2 (Mumbai 2)',
    items: [
      'Hostname srv1954986.hstgr.cloud',
      'Nginx :443 / :80 + Certbot',
      'PM2 → Next.js on 127.0.0.1:3000',
      'MySQL 8 on localhost:3306',
    ],
  },
  {
    label: 'Deploy path',
    items: [
      'SSH as deploy@200.234.45.106',
      'App at /var/www/zigma-technologies',
      'GitHub Actions push → SSH → scripts/deploy-prod.sh',
      '.env never in Git',
    ],
  },
];

export const PROD_SERVER_FACTS: { label: string; value: string }[] = [
  { label: 'Plan', value: 'KVM 2 · Auto-renewal On · expires 2028-09-04' },
  { label: 'Location', value: 'India — Mumbai 2' },
  { label: 'OS', value: 'Ubuntu 26.04 LTS' },
  { label: 'Hostname', value: 'srv1954986.hstgr.cloud' },
  { label: 'IPv4', value: '200.234.45.106' },
  { label: 'First SSH', value: 'ssh root@200.234.45.106' },
  { label: 'App SSH', value: 'ssh deploy@200.234.45.106' },
  { label: 'Resources', value: '2 CPU · 8 GB RAM · 100 GB disk · 8 TB bandwidth' },
  { label: 'Repository', value: 'https://github.com/JustXSystems/zigma-technologies' },
  { label: 'Actions', value: 'https://github.com/JustXSystems/zigma-technologies/actions' },
  { label: 'Public site', value: 'https://zigma-technologies.com/' },
  { label: 'Admin', value: 'https://zigma-technologies.com/admin/login' },
];

export const PROD_PURCHASE_STEPS = [
  'VPS is already provisioned: open https://hpanel.hostinger.com → VPS → confirm srv1954986.hstgr.cloud is Active.',
  'Confirm location India — Mumbai 2, OS Ubuntu 26.04 LTS, plan KVM 2 (2 CPU / 8 GB / 100 GB / 8 TB).',
  'Record IPv4 200.234.45.106 — used for SSH, UFW allowlists, DNS A records, and GitHub Actions secret PROD_HOST.',
  'hPanel → VPS → SSH Access: set a strong root password and/or add your laptop SSH public key.',
  'From your laptop verify: ssh root@200.234.45.106',
  'Optional: enable Hostinger VPS automatic backups / snapshots before go-live.',
  'Keep domain registration where it is today; only change DNS A records in Step 11 (do not transfer the domain unless intentional).',
];

export const PROD_PHASES: ProdPhase[] = [
  {
    id: 'buy',
    phase: 'Step 1',
    title: 'Confirm VPS access (empty Ubuntu server)',
    summary:
      'You start from a brand-new empty Ubuntu 26.04 box. Prove SSH works as root before installing anything.',
    steps: [
      'Open hPanel → VPS → confirm status Active for hostname srv1954986.hstgr.cloud.',
      'From your laptop run: ssh root@200.234.45.106',
      'On first password login, change root password: passwd',
      'Confirm identity: hostnamectl  (expect Ubuntu 26.04) and hostname (expect srv1954986.hstgr.cloud or similar).',
      'Confirm resources: df -h && free -h && nproc — expect ~100 GB disk, ~8 GB RAM, 2 CPUs.',
      'Confirm you are on a clean OS: which node || echo "node not installed yet"; which nginx || echo "nginx not installed yet"',
      'Store root credentials in the team password manager — never in Slack, email, or Git.',
    ],
    checklist: [
      'SSH root@200.234.45.106 succeeds',
      'Ubuntu 26.04 confirmed',
      'IPv4 200.234.45.106 recorded',
      'Credentials in password manager',
    ],
    code: `ssh root@200.234.45.106
hostnamectl
df -h && free -h && nproc
ip -4 addr show`,
  },
  {
    id: 'harden',
    phase: 'Step 2',
    title: 'Base OS update, deploy user, firewall',
    summary:
      'Patch the empty server, create the non-root deploy user used by humans and GitHub Actions, and lock the firewall.',
    steps: [
      'As root: apt update && apt upgrade -y',
      'Install base tools: apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common',
      'Create deploy user: adduser deploy   (set a strong password; save it)',
      'Grant sudo: usermod -aG sudo deploy',
      'While still on the VPS as root, switch user with: su - deploy   (do NOT run ssh-copy-id on the VPS — that command is for your laptop only, and root usually has no SSH key yet).',
      'As deploy, confirm sudo works: sudo -v  (enter the deploy password)',
      'Exit back to root with exit, then continue firewall setup below. Laptop key login can wait until you open a second terminal from your PC.',
      'From your laptop (not the VPS): if you have no key yet, run ssh-keygen -t ed25519 -C "your-email" -f ~/.ssh/id_ed25519 -N "" then ssh-copy-id deploy@200.234.45.106',
      'Windows PowerShell (no ssh-copy-id): type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"',
      'Verify from laptop: ssh deploy@200.234.45.106',
      'Configure UFW (as root or sudo): ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable',
      'Verify: ufw status verbose — only 22/80/443. Do NOT open MySQL 3306 to the internet.',
      'Optional hardening after key login works: disable root password SSH and PasswordAuthentication in /etc/ssh/sshd_config, then systemctl reload ssh',
    ],
    checklist: [
      'Packages updated',
      'deploy exists and can sudo (su - deploy works)',
      'UFW allows 22/80/443 only',
      'Port 3306 not publicly exposed',
      'Optional: laptop can ssh deploy@200.234.45.106 with a key',
    ],
    warning:
      'ssh-copy-id must run on your laptop (or any machine that already has an SSH private key). Running it as root on the VPS fails with “No identities found” because the server has no ~/.ssh/id_*.pub yet — keep working with su - deploy. Never expose MySQL to 0.0.0.0; GitHub Actions will SSH as deploy, not root.',
    code: `# As root@200.234.45.106 (you are already here)
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common
adduser deploy
usermod -aG sudo deploy

# Stay on the VPS — switch to deploy (password you just set). Do NOT ssh-copy-id here.
su - deploy
sudo -v
exit

# Firewall (still as root)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

# --- Later, FROM YOUR LAPTOP (new terminal) ---
# Create a key only if you do not already have one:
#   ssh-keygen -t ed25519 -C "dev@zigma" -f ~/.ssh/id_ed25519 -N ""
# Linux/macOS/Git Bash:
#   ssh-copy-id deploy@200.234.45.106
# Windows PowerShell:
#   type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
#   ssh deploy@200.234.45.106`,
  },
  {
    id: 'stack',
    phase: 'Step 3',
    title: 'Install Node.js 20, Nginx, PM2, Certbot',
    summary: 'Install the full application runtime on the empty VPS.',
    steps: [
      'Install Node.js 20 LTS via NodeSource (commands below).',
      'Confirm: node -v shows v20.x and npm -v works.',
      'Install PM2 globally: npm install -g pm2',
      'Install Nginx: apt install -y nginx && systemctl enable --now nginx',
      'Install Certbot: apt install -y certbot python3-certbot-nginx',
      'Create app parent dir owned by deploy: mkdir -p /var/www && chown deploy:deploy /var/www',
      'Quick check: curl -I http://127.0.0.1  — Nginx default page is OK for now.',
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
node -v && npm -v && pm2 -v
systemctl status nginx --no-pager`,
  },
  {
    id: 'mysql',
    phase: 'Step 4',
    title: 'Install & configure MySQL 8 (production database)',
    summary: 'Create a dedicated PROD database and least-privilege app user. MySQL stays on localhost only.',
    steps: [
      'apt install -y mysql-server',
      'systemctl enable --now mysql',
      'Run: mysql_secure_installation  (set root password, remove anonymous users, disallow remote root, remove test DB).',
      'Create database zigmatech_prod and user zigmatech_prod with a 32+ character random password.',
      'GRANT ALL PRIVILEGES ON zigmatech_prod.* TO the app user; FLUSH PRIVILEGES.',
      'Confirm bind-address is 127.0.0.1 in MySQL config (Ubuntu default for local packages).',
      'Test: mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'Record DB_HOST=localhost, DB_PORT=3306, DB_NAME=zigmatech_prod, DB_USER=zigmatech_prod, DB_PASSWORD in the password manager for .env.',
    ],
    checklist: [
      'mysql service running',
      'zigmatech_prod database exists',
      'App user can SELECT 1',
      'No public 3306 access',
      'Credentials stored securely',
    ],
    code: `sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation

sudo mysql -e "
CREATE DATABASE zigmatech_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zigmatech_prod'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON zigmatech_prod.* TO 'zigmatech_prod'@'localhost';
FLUSH PRIVILEGES;
"

mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"`,
    warning:
      'Never reuse DEV or UAT database passwords on PROD. Generate a new AUTH_SECRET and admin password for production.',
  },
  {
    id: 'github',
    phase: 'Step 5',
    title: 'Clone JustXSystems/zigma-technologies as deploy',
    summary:
      'Pull application source into /var/www/zigma-technologies. Prefer a read-only GitHub Deploy Key for private repos.',
    steps: [
      'Switch to deploy: ssh deploy@200.234.45.106  (or su - deploy)',
      'cd /var/www',
      'If the repo is private: ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""',
      'Show the public key: cat ~/.ssh/github_zigma_ro.pub',
      'GitHub → JustXSystems/zigma-technologies → Settings → Deploy keys → Add deploy key (read-only) → paste the public key.',
      'Configure SSH for GitHub: create ~/.ssh/config with Host github.com → IdentityFile ~/.ssh/github_zigma_ro',
      'chmod 600 ~/.ssh/config ~/.ssh/github_zigma_ro',
      'Test: ssh -T git@github.com  (expect a success / Hi JustXSystems message)',
      'Clone: git clone git@github.com:JustXSystems/zigma-technologies.git',
      'cd zigma-technologies && git checkout master && git rev-parse --short HEAD',
      'Confirm package.json exists at the repo root. Ownership must stay deploy:deploy.',
      'Public repo alternative: git clone https://github.com/JustXSystems/zigma-technologies.git',
    ],
    checklist: [
      'Repo at /var/www/zigma-technologies',
      'Branch master (or agreed prod branch)',
      'deploy owns the tree',
      'Deploy key or HTTPS remote works without interactive password',
    ],
    code: `# As deploy@200.234.45.106
cd /var/www
ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""
cat ~/.ssh/github_zigma_ro.pub
# → add that key in GitHub → Settings → Deploy keys (read-only)

cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_zigma_ro
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/github_zigma_ro

ssh -T git@github.com
git clone git@github.com:JustXSystems/zigma-technologies.git
cd zigma-technologies
git checkout master
git status
git rev-parse --short HEAD`,
  },
  {
    id: 'env',
    phase: 'Step 6',
    title: 'Create production .env (secrets)',
    summary: 'Copy .env.example, fill PROD-only values, lock permissions. Never commit .env.',
    steps: [
      'cd /var/www/zigma-technologies',
      'cp .env.example .env && chmod 600 .env',
      'Edit: nano .env — set NODE_ENV=production and all required keys (see .env template section).',
      'Generate AUTH_SECRET: openssl rand -hex 32',
      'Generate PREVIEW_SECRET: openssl rand -hex 32 (different value).',
      'Set NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'Do NOT set NEXT_PUBLIC_BASE_PATH for this deploy (domain root, not a subdirectory).',
      'Set MEDIA_BASE_URL=/assets',
      'Set SMTP_* if enquiry emails should send (Hostinger mailbox or Google Workspace App Password).',
      'Confirm DEV_BYPASS_AUTH is absent.',
      'Confirm .env is gitignored: git check-ignore -v .env',
    ],
    checklist: [
      '.env mode 600',
      'Unique AUTH_SECRET / PREVIEW_SECRET',
      'PROD DB credentials only',
      'NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'No BASE_PATH for apex domain',
    ],
    warning:
      'Do not paste local DEV passwords into production. Rotate ADMIN_PASSWORD after first seed login.',
  },
  {
    id: 'schema',
    phase: 'Step 7',
    title: 'Load MySQL schema (or import full CMS export)',
    summary:
      'Fresh install: run schema.sql once, then STOP — do not run migrate-*.sql. Migrations are only for upgrading older databases that were created before those columns existed.',
    steps: [
      'Option A — Fresh install (your case): mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql',
      'IMPORTANT: Use database name zigmatech_prod (not zigmatech). Match DB_NAME in .env.',
      'After a successful fresh schema.sql import, skip ALL scripts/migrate-*.sql files. schema.sql already includes those columns/tables — re-running migrations causes ERROR 1060 Duplicate column name (e.g. admin_notes).',
      'Option B — Promote content from UAT/DEV: scp the export folder to the server, then npm run db:import -- storage/exports/zigma-… --force (skip schema.sql / migrate if the export already has full schema).',
      'Option C — Upgrading an old PROD DB that was created months ago: only then run migrate-*.sql in README order, and skip any that error with Duplicate column / table already exists.',
      'Create upload dirs: mkdir -p public/assets/uploads/resumes public/assets/uploads/documents && chmod -R 755 public/assets',
      'Verify: mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"',
      'Optional ZTools tables (if you need the mobile portal and they are missing from SHOW TABLES): run migrate-ztools.sql / migrate-ztools-push.sql against zigmatech_prod — edit or override USE zigmatech inside those files first.',
    ],
    checklist: [
      'Tables present (pages, catalog_items, admin_users, …)',
      'Fresh install: migrations NOT applied (or skipped after Duplicate column)',
      'Upload directories writable',
      'DB_NAME in .env is zigmatech_prod',
    ],
    warning:
      'ERROR 1060 Duplicate column name after schema.sql means the migration is already baked into the schema — safe to ignore and continue. Wrong database name (zigmatech vs zigmatech_prod) will create/update the wrong schema.',
    code: `# Fresh schema ONLY — as deploy, from app dir
cd /var/www/zigma-technologies
mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql

# Do NOT run migrate-*.sql after a fresh schema.sql.
# Duplicate column errors (e.g. admin_notes) mean "already applied" — ignore and continue.

mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"`,
  },
  {
    id: 'build',
    phase: 'Step 8',
    title: 'Install dependencies & production build',
    summary: 'First production build must succeed on the VPS before PM2 or Actions deploys.',
    steps: [
      'cd /var/www/zigma-technologies',
      'npm ci',
      'npm run build',
      'Confirm .next/ was created: ls -la .next',
      'If build OOMs (rare on 8 GB): add 2 GB swap (commands in Troubleshooting) and retry.',
      'Make the deploy script executable: chmod +x scripts/deploy-prod.sh',
    ],
    checklist: [
      'npm ci completed',
      'npm run build exit 0',
      '.next present',
      'deploy-prod.sh executable',
    ],
    code: `cd /var/www/zigma-technologies
npm ci
npm run build
ls -la .next
chmod +x scripts/deploy-prod.sh`,
  },
  {
    id: 'pm2',
    phase: 'Step 9',
    title: 'Start Next.js with PM2',
    summary: 'Keep the Node process alive across SSH logout and reboots.',
    steps: [
      'cd /var/www/zigma-technologies',
      'pm2 start npm --name zigma -- start',
      'pm2 status — state should be online',
      'curl -I http://127.0.0.1:3000 — expect HTTP 200 or 307/308',
      'pm2 save',
      'pm2 startup systemd — copy/run the printed sudo command so the app starts on boot (run as deploy)',
      'pm2 logs zigma --lines 50 — check for DB connection errors',
    ],
    checklist: [
      'PM2 process zigma online',
      'Localhost :3000 responds',
      'Startup on boot configured',
      'No DB errors in logs',
    ],
    code: `cd /var/www/zigma-technologies
pm2 start npm --name zigma -- start
pm2 save
pm2 startup
# Run the sudo command that pm2 prints, then:
curl -I http://127.0.0.1:3000
pm2 logs zigma --lines 50`,
  },
  {
    id: 'nginx',
    phase: 'Step 10',
    title: 'Nginx reverse proxy + HTTPS',
    summary: 'Terminate SSL at Nginx and proxy to PM2. Prefer hosts-file test before public DNS cutover.',
    steps: [
      'As root/sudo: create /etc/nginx/sites-available/zigma with the Nginx snippet from this guide.',
      'ln -s /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/',
      'Remove default site if it conflicts: rm -f /etc/nginx/sites-enabled/default',
      'nginx -t && systemctl reload nginx',
      'Optional pre-DNS test on your laptop hosts file: 200.234.45.106 zigma-technologies.com www.zigma-technologies.com',
      'After DNS A records point to 200.234.45.106: certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com',
      'Confirm HTTPS redirect (Certbot usually adds it).',
      'client_max_body_size 25M is required for media / resume uploads.',
    ],
    checklist: [
      'nginx -t OK',
      'HTTP reaches Next via proxy',
      'HTTPS certificate valid for apex + www',
      'https://zigma-technologies.com loads',
    ],
    code: `sudo nano /etc/nginx/sites-available/zigma
# paste the Nginx config from this guide, then:
sudo ln -sf /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# After DNS points here:
sudo certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com`,
  },
  {
    id: 'dns',
    phase: 'Step 11',
    title: 'DNS cutover for zigma-technologies.com',
    summary: 'Point apex and www to 200.234.45.106. Leave MX records unchanged unless migrating email separately.',
    steps: [
      'Lower TTL on A records to 300s at least 24h before cutover if possible.',
      'Update A record @ (apex) → 200.234.45.106',
      'Update A record www → 200.234.45.106',
      'Do not change MX / SPF / DKIM unless email is intentionally moving (see Email migration guide).',
      'Verify from your laptop: nslookup zigma-technologies.com and nslookup www.zigma-technologies.com',
      'Open https://zigma-technologies.com/ and run the post-deploy checklist.',
      'Submit sitemap in Google Search Console after cutover.',
    ],
    checklist: [
      'Apex and www resolve to 200.234.45.106',
      'HTTPS padlock valid',
      'MX unchanged (if mail stays elsewhere)',
      'Post-deploy checklist passed',
    ],
    warning:
      'If email still uses another provider, changing only A records is correct — never delete MX during website cutover.',
  },
  {
    id: 'gha',
    phase: 'Step 12',
    title: 'GitHub Actions auto-deploy (deploy@200.234.45.106)',
    summary:
      'Wire https://github.com/JustXSystems/zigma-technologies/actions so every push to master SSHs in as deploy and runs scripts/deploy-prod.sh.',
    steps: [
      'On the VPS as deploy, generate a dedicated Actions key (separate from the read-only git clone key): ssh-keygen -t ed25519 -C "github-actions-zigma-prod" -f ~/.ssh/gha_zigma_prod -N ""',
      'Append the public key to authorized_keys: cat ~/.ssh/gha_zigma_prod.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys',
      'On your laptop, securely obtain the PRIVATE key contents from the server (or generate the keypair locally and only copy the public key to the server). Prefer generating on laptop and scp’ing the .pub to the server.',
      'GitHub → JustXSystems/zigma-technologies → Settings → Secrets and variables → Actions → New repository secret.',
      'Create secret PROD_HOST = 200.234.45.106',
      'Create secret PROD_SSH_USER = deploy',
      'Create secret PROD_SSH_KEY = full private key PEM (including BEGIN/END lines) for the Actions key.',
      'Optional: PROD_SSH_PORT = 22 if you changed SSH port.',
      'Confirm workflow file exists in the repo: .github/workflows/deploy-prod.yml (push it on master if missing).',
      'Confirm scripts/deploy-prod.sh is executable on the server and pulls origin/master, runs npm ci, build, pm2 restart.',
      'Trigger: GitHub → Actions → Deploy Production → Run workflow (workflow_dispatch), or push a commit to master.',
      'Watch the run at https://github.com/JustXSystems/zigma-technologies/actions — job must SSH successfully and finish green.',
      'On the server verify: pm2 status && curl -I http://127.0.0.1:3000 && git -C /var/www/zigma-technologies rev-parse --short HEAD',
    ],
    checklist: [
      'PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY secrets set',
      'deploy authorized_keys contains Actions public key',
      'Workflow file on master',
      'Manual “Run workflow” succeeds',
      'Site still healthy after Actions deploy',
    ],
    warning:
      'Never commit the private key. Never put PROD .env values into GitHub Secrets unless you intentionally sync env that way — this workflow only SSHs and runs the server-side deploy script; .env stays on the VPS.',
    code: `# --- Recommended: generate Actions key on your laptop ---
ssh-keygen -t ed25519 -C "github-actions-zigma-prod" -f ./gha_zigma_prod -N ""
type .\\gha_zigma_prod.pub   # Windows PowerShell — copy this line
# macOS/Linux: cat ./gha_zigma_prod.pub

# Install public key on the server
type .\\gha_zigma_prod.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

# Test exactly like Actions will:
ssh -i ./gha_zigma_prod deploy@200.234.45.106 "cd /var/www/zigma-technologies && ./scripts/deploy-prod.sh"

# Then paste private key file contents into GitHub secret PROD_SSH_KEY
# Delete the local private key from disk after storing in GitHub Secrets + password manager.`,
  },
  {
    id: 'admin',
    phase: 'Step 13',
    title: 'Admin bootstrap, security & content handoff',
    summary: 'Seed or log in, rotate passwords, verify forms and SMTP on the live domain.',
    steps: [
      'Open https://zigma-technologies.com/admin/login',
      'If fresh DB: use Seed default admin (ADMIN_EMAIL / ADMIN_PASSWORD from .env), then change password immediately under Account.',
      'If imported DB: log in with known UAT admin, then rotate all admin passwords on PROD.',
      'Dashboard → Bootstrap missing seeds only if content is incomplete.',
      'Site Settings → company contact, analytics (PROD only), enquiry notify email.',
      'Submit a test enquiry → Enquiries module + SMTP inbox.',
      'Confirm /api/public/theme.css loads and catalog pages render.',
      'Confirm GitHub Actions is the only ongoing deploy path (or document who may SSH manually).',
      'Revoke any temporary GitHub PATs used during setup if you migrated to deploy keys.',
    ],
    checklist: [
      'Admin login works over HTTPS',
      'Default passwords rotated',
      'Enquiry form + email OK',
      'Theme CSS OK',
      'No DEV secrets on server',
      'Actions deploy verified',
    ],
  },
];

export const PROD_GHA_SECRETS: { name: string; example: string; purpose: string }[] = [
  {
    name: 'PROD_HOST',
    example: '200.234.45.106',
    purpose: 'VPS IPv4 — SSH target for Actions',
  },
  {
    name: 'PROD_SSH_USER',
    example: 'deploy',
    purpose: 'Non-root OS user that owns /var/www/zigma-technologies and PM2',
  },
  {
    name: 'PROD_SSH_KEY',
    example: '-----BEGIN OPENSSH PRIVATE KEY----- …',
    purpose: 'Private key whose public half is in deploy’s authorized_keys',
  },
  {
    name: 'PROD_SSH_PORT',
    example: '22',
    purpose: 'Optional — only if SSH listens on a non-default port',
  },
];

export const PROD_GHA_STEPS = [
  'Merge/push .github/workflows/deploy-prod.yml and scripts/deploy-prod.sh to master if not already present.',
  'Create the three required repository secrets (PROD_HOST, PROD_SSH_USER, PROD_SSH_KEY) under Settings → Secrets and variables → Actions.',
  'Authorize the matching public key on deploy@200.234.45.106.',
  'Open https://github.com/JustXSystems/zigma-technologies/actions → Deploy Production → Run workflow.',
  'Confirm the job SSHs in, runs git pull + npm ci + npm run build + pm2 restart zigma, and exits 0.',
  'Thereafter: merge to master → Actions deploys automatically (see workflow on: push branches).',
];

export const PROD_ENV_TEMPLATE = `NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com

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
    server_name zigma-technologies.com www.zigma-technologies.com;

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

export const PROD_UPDATE_COMMANDS = `# Manual deploy (same steps Actions runs)
ssh deploy@200.234.45.106
cd /var/www/zigma-technologies
./scripts/deploy-prod.sh

# Or step-by-step:
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
    detail:
      'Git is the source of truth (JustXSystems/zigma-technologies). Tag releases: git tag -a vYYYY.MM.DD -m "prod" && git push --tags',
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
  'https://zigma-technologies.com/ loads over HTTPS',
  'www redirects or also serves correctly',
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
  'GitHub Actions Deploy Production run succeeded',
  'MX records unchanged (unless email migrated)',
];

export const PROD_TROUBLESHOOT = [
  {
    symptom: 'Cannot SSH to root@200.234.45.106',
    fixes: [
      'Confirm VPS is Active in hPanel',
      'Reset root password / re-add SSH key under VPS → SSH Access',
      'From laptop: ping 200.234.45.106 and ssh -v root@200.234.45.106',
      'Confirm your IP is not blocked by fail2ban: sudo fail2ban-client status sshd',
    ],
  },
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
      'Clear browser cookies for zigma-technologies.com and retry',
    ],
  },
  {
    symptom: 'npm run build fails / OOM',
    fixes: [
      'Run typecheck locally first',
      'Ensure .env exists on server before build',
      'Add swap: fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab',
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
    symptom: 'git pull denied on server',
    fixes: [
      'Confirm read-only deploy key is attached to JustXSystems/zigma-technologies',
      'ssh -T git@github.com as deploy user',
      'Check ~/.ssh/config IdentityFile path',
    ],
  },
  {
    symptom: 'GitHub Actions deploy fails on SSH',
    fixes: [
      'Confirm secrets PROD_HOST=200.234.45.106, PROD_SSH_USER=deploy, PROD_SSH_KEY is the private key',
      'Public key must be in /home/deploy/.ssh/authorized_keys',
      'UFW must allow SSH from GitHub-hosted runners (do not IP-restrict port 22 unless you use a self-hosted runner)',
      'Test locally: ssh -i gha_zigma_prod deploy@200.234.45.106 "whoami"',
      'Open the failed job log at https://github.com/JustXSystems/zigma-technologies/actions',
    ],
  },
  {
    symptom: 'Actions succeeds but site unchanged',
    fixes: [
      'Confirm workflow checked out/pulled master and pm2 restarted zigma',
      'git -C /var/www/zigma-technologies log -1 --oneline',
      'pm2 logs zigma --lines 100',
      'Hard-refresh browser / purge CDN if any',
    ],
  },
];

export const PROD_FAQ: ProdFaq[] = [
  {
    q: 'Why KVM 2 and not shared hosting?',
    a: 'This app is Next.js 16 with a persistent Node process, API routes, and MySQL. Basic shared PHP hosting cannot run it. KVM 2 (2 vCPU / 8 GB) is the recommended production tier for build + runtime + MySQL on one box in Mumbai.',
  },
  {
    q: 'Is this server already purchased?',
    a: 'Yes — Hostinger KVM 2 at 200.234.45.106 (srv1954986.hstgr.cloud, Ubuntu 26.04, Mumbai 2). The guide starts from that empty OS image through go-live on https://zigma-technologies.com/.',
  },
  {
    q: 'Can MySQL stay on Hostinger shared hosting while the app is on VPS?',
    a: 'Possible via Remote MySQL + VPS IP allowlist, but not recommended. Prefer MySQL on the same KVM 2 with bind-address 127.0.0.1.',
  },
  {
    q: 'How does GitHub Actions deploy work?',
    a: 'Push (or manual run) on master triggers .github/workflows/deploy-prod.yml. The runner SSHs as deploy@200.234.45.106 using PROD_SSH_KEY and executes scripts/deploy-prod.sh (git pull, npm ci, build, pm2 restart). Secrets never include the production .env.',
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
    a: 'Possible with two folders, two PM2 apps (different ports), two Nginx server_names, and two MySQL databases. Prefer a separate UAT host if budget allows. Staging subdirectory docs live at /admin/guide/justxsystems.',
  },
];

export const PROD_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'server', label: 'This VPS' },
  { id: 'prereqs', label: 'Prerequisites' },
  { id: 'purchase', label: 'Confirm KVM 2' },
  { id: 'phases', label: 'Setup steps' },
  { id: 'gha', label: 'GitHub Actions' },
  { id: 'env', label: '.env template' },
  { id: 'nginx', label: 'Nginx' },
  { id: 'updates', label: 'Updates' },
  { id: 'backups', label: 'Backups' },
  { id: 'checklist', label: 'Go-live checklist' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
];
