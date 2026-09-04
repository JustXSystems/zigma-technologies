/** Hostinger KVM 2 — production setup from empty VPS + BigRock DNS cutover + GitHub Actions. */

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

/** Live PROD VPS inventory — secrets only in password manager / GitHub Secrets, never in git. */
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
  registrar: 'BigRock (bigrock.com) — domain stays here; only DNS A records change',
  oldWebIp: '14.195.24.149',
  oldHostNote: 'Current live site / UrbanVendo (or BigRock-managed DNS) — keep until cutover is stable',
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
  domain: 'zigma-technologies.com (DNS at BigRock → VPS IP)',
  appPort: '3000 (localhost only — Nginx terminates HTTPS)',
};

export const PROD_CUTOVER = {
  title: 'How the domain moves from BigRock to this VPS',
  points: [
    'Domain registration stays at BigRock (bigrock.com). You do NOT transfer the domain to Hostinger unless you want one vendor.',
    'Today the website still points at the old host (historically ~14.195.24.149 / UrbanVendo). Visitors keep seeing the old site until you change DNS.',
    'On Hostinger you finish the full stack first (Steps 1–11): app reachable on the VPS via hosts-file test. There is no hPanel “Add website” step for a KVM VPS — Nginx on the VPS is the web server.',
    'When ready, at BigRock DNS change only A records for @ and www → 200.234.45.106 (Step 13). Leave MX / mail records untouched unless you are also moving email.',
    'After DNS propagates, run Certbot for HTTPS (Step 14). Then public traffic hits this Next.js app at https://zigma-technologies.com/.',
  ],
};

export const PROD_HOSTINGER_NOTES = [
  {
    title: 'VPS ≠ shared hosting',
    detail:
      'On KVM you manage Node, Nginx, MySQL, and SSL yourself over SSH. Do not look for “Node.js Web App” or “Add website” in hPanel for this production path — those are for shared/cloud web hosting.',
  },
  {
    title: 'Firewall layers',
    detail:
      'Enable UFW on the VPS (22/80/443 only). Also check hPanel → VPS → Firewall (if present) and allow the same ports. Never open MySQL 3306 publicly.',
  },
  {
    title: 'Backups',
    detail:
      'Turn on Hostinger VPS snapshots/backups in hPanel before DNS cutover. Also schedule mysqldump for zigmatech_prod.',
  },
  {
    title: 'Email stays separate',
    detail:
      'Changing website A records does not move email. Keep existing MX at BigRock/UrbanVendo unless you intentionally migrate mailboxes.',
  },
];

export const PROD_PREREQUISITES = [
  'Hostinger hPanel access for VPS srv1954986.hstgr.cloud (IPv4 200.234.45.106)',
  'Ability to SSH as root@200.234.45.106 (hPanel → VPS → SSH Access)',
  'BigRock login for zigma-technologies.com DNS (or whoever manages DNS if nameservers point elsewhere)',
  'GitHub org access to JustXSystems/zigma-technologies (Deploy keys, Actions secrets)',
  'Laptop with SSH (Windows PowerShell / Terminal)',
  'Password manager for PROD secrets (DB, AUTH_SECRET, admin, SMTP, Actions SSH key)',
  'Optional content export: npm run db:export -- --with-cms-media',
  'Local quality gates: npm run typecheck && npm run lint && npm run build',
];

export const PROD_ARCHITECTURE = [
  {
    label: 'DNS (BigRock)',
    items: [
      'Registrar: BigRock — domain stays registered there',
      'A @ and www → 200.234.45.106 (after cutover)',
      'MX unchanged (email stays on current provider)',
    ],
  },
  {
    label: 'Hostinger KVM 2 (Mumbai 2)',
    items: [
      'Hostname srv1954986.hstgr.cloud',
      'UFW + Nginx :80/:443 + Certbot',
      'PM2 → Next.js on 127.0.0.1:3000',
      'MySQL 8 on localhost:3306',
    ],
  },
  {
    label: 'Deploy path',
    items: [
      'SSH as deploy@200.234.45.106',
      'App at /var/www/zigma-technologies',
      'Actions → scripts/deploy-prod.sh (git reset --hard origin/master)',
      '.env never in Git',
    ],
  },
];

export const PROD_SERVER_FACTS: { label: string; value: string }[] = [
  { label: 'Plan', value: 'KVM 2 · Auto-renewal On · expires 2028-09-04' },
  { label: 'Location', value: 'India — Mumbai 2' },
  { label: 'OS', value: 'Ubuntu 26.04 LTS' },
  { label: 'Hostname', value: 'srv1954986.hstgr.cloud' },
  { label: 'IPv4 (new web)', value: '200.234.45.106' },
  { label: 'Old web IP (pre-cutover)', value: '14.195.24.149 (UrbanVendo — do not delete until stable)' },
  { label: 'Domain registrar', value: 'BigRock — keep registration; change DNS A only' },
  { label: 'First SSH', value: 'ssh root@200.234.45.106' },
  { label: 'App SSH', value: 'ssh deploy@200.234.45.106' },
  { label: 'Resources', value: '2 CPU · 8 GB RAM · 100 GB disk · 8 TB bandwidth' },
  { label: 'Repository', value: 'https://github.com/JustXSystems/zigma-technologies' },
  { label: 'Actions', value: 'https://github.com/JustXSystems/zigma-technologies/actions' },
  { label: 'Public site (after cutover)', value: 'https://zigma-technologies.com/' },
  { label: 'Admin', value: 'https://zigma-technologies.com/admin/login' },
];

export const PROD_DNS_RECORDS: { type: string; name: string; value: string; notes: string }[] = [
  {
    type: 'A',
    name: '@',
    value: '200.234.45.106',
    notes: 'Apex zigma-technologies.com → Hostinger VPS',
  },
  {
    type: 'A',
    name: 'www',
    value: '200.234.45.106',
    notes: 'www → same VPS (Nginx can redirect www → apex)',
  },
  {
    type: 'MX',
    name: '@',
    value: '(leave unchanged)',
    notes: 'Do not edit MX/SPF/DKIM unless migrating email',
  },
];

export const PROD_PURCHASE_STEPS = [
  'VPS is already provisioned: https://hpanel.hostinger.com → VPS → confirm srv1954986.hstgr.cloud is Active.',
  'Confirm location India — Mumbai 2, OS Ubuntu 26.04 LTS, plan KVM 2 (2 CPU / 8 GB / 100 GB / 8 TB).',
  'Record IPv4 200.234.45.106 — SSH, UFW, BigRock A records, GitHub secret PROD_HOST.',
  'hPanel → VPS → SSH Access: strong root password and/or laptop SSH public key.',
  'Optional: hPanel → VPS → Firewall — allow TCP 22, 80, 443 (in addition to UFW on the OS).',
  'Optional: enable Hostinger VPS automatic backups / snapshots before DNS cutover.',
  'Domain stays at BigRock — do not transfer to Hostinger for go-live. Only A records change in Step 13.',
  'There is no “Add website” / “Node.js app” hPanel step for this KVM path — you configure Nginx on the VPS.',
];

export const PROD_PHASES: ProdPhase[] = [
  {
    id: 'buy',
    phase: 'Step 1',
    title: 'Confirm VPS access (empty Ubuntu server)',
    summary:
      'Brand-new empty Ubuntu 26.04. Prove SSH as root before installing anything. Public DNS still points at BigRock’s old host until Step 13.',
    steps: [
      'Open hPanel → VPS → confirm Active for srv1954986.hstgr.cloud.',
      'From laptop: ssh root@200.234.45.106',
      'On first password login: passwd',
      'Confirm: hostnamectl (Ubuntu 26.04) and hostname (srv1954986…).',
      'Confirm resources: df -h && free -h && nproc — ~100 GB disk, ~8 GB RAM, 2 CPUs.',
      'Confirm clean OS: which node || echo "node not installed"; which nginx || echo "nginx not installed"',
      'Store root credentials in the password manager.',
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
      'Patch the empty server, create deploy (used by humans + GitHub Actions), open only SSH/HTTP/HTTPS.',
    steps: [
      'As root: apt update && apt upgrade -y',
      'apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common',
      'adduser deploy  (strong password; save it) then usermod -aG sudo deploy',
      'On the VPS use su - deploy — do NOT run ssh-copy-id on the VPS (no identities / wrong machine).',
      'As deploy: sudo -v then exit back to root',
      'UFW: ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable',
      'ufw status verbose — only 22/80/443. Never open 3306.',
      'If hPanel has a VPS Firewall, allow 22/80/443 there too.',
      'From laptop (optional now): install your SSH public key for deploy (see Commands).',
    ],
    checklist: [
      'Packages updated',
      'deploy can sudo (su - deploy)',
      'UFW allows 22/80/443 only',
      'Port 3306 not public',
    ],
    warning:
      'ssh-copy-id is for your laptop → deploy. Running it as root on the VPS fails with “No identities found”. Keep working with su - deploy.',
    code: `# As root@200.234.45.106
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common
adduser deploy
usermod -aG sudo deploy
su - deploy
sudo -v
exit

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

# FROM LAPTOP (PowerShell) — optional human key for deploy:
# type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"`,
  },
  {
    id: 'stack',
    phase: 'Step 3',
    title: 'Install Node.js 20, Nginx, PM2, Certbot',
    summary: 'Runtime stack on the empty VPS. Certbot is installed now; you run it only after DNS in Step 14.',
    steps: [
      'Install Node 20 LTS via NodeSource (commands below).',
      'node -v → v20.x ; npm -v works',
      'npm install -g pm2',
      'apt install -y nginx && systemctl enable --now nginx',
      'apt install -y certbot python3-certbot-nginx',
      'mkdir -p /var/www && chown deploy:deploy /var/www',
      'curl -I http://127.0.0.1 — Nginx default page is OK for now',
    ],
    checklist: [
      'node -v → v20.x',
      'pm2 -v works',
      'nginx active',
      'certbot installed',
      '/var/www owned by deploy',
    ],
    code: `# As root / sudo
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
    summary: 'Dedicated PROD DB on localhost only. App connects via DB_* in .env.',
    steps: [
      'apt install -y mysql-server && systemctl enable --now mysql',
      'mysql_secure_installation',
      'Create DB zigmatech_prod and user zigmatech_prod (32+ char password)',
      'GRANT ALL ON zigmatech_prod.* ; FLUSH PRIVILEGES',
      'Confirm bind-address 127.0.0.1',
      'Test: mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'Save DB_* values for .env (Step 6)',
    ],
    checklist: [
      'mysql running',
      'zigmatech_prod exists',
      'App user SELECT 1 works',
      '3306 not public',
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
    warning: 'Never reuse DEV/UAT DB passwords or AUTH_SECRET on PROD.',
  },
  {
    id: 'github',
    phase: 'Step 5',
    title: 'Clone JustXSystems/zigma-technologies as deploy',
    summary: 'Source at /var/www/zigma-technologies. Prefer a read-only GitHub Deploy Key for private repos.',
    steps: [
      'ssh deploy@200.234.45.106 (or su - deploy)',
      'cd /var/www',
      'Create read-only key: ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""',
      'cat ~/.ssh/github_zigma_ro.pub → GitHub → Settings → Deploy keys → Add (read-only)',
      'Configure ~/.ssh/config IdentityFile for github.com (see Commands)',
      'ssh -T git@github.com',
      'git clone git@github.com:JustXSystems/zigma-technologies.git',
      'cd zigma-technologies && git checkout master && git rev-parse --short HEAD',
      'Confirm package.json and scripts/deploy-prod.sh exist at repo root',
    ],
    checklist: [
      'Repo at /var/www/zigma-technologies',
      'Branch master',
      'deploy owns the tree',
      'scripts/deploy-prod.sh present (or pull latest master)',
    ],
    code: `# As deploy@200.234.45.106
cd /var/www
ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""
cat ~/.ssh/github_zigma_ro.pub
# → GitHub Deploy keys (read-only)

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
ls -la package.json scripts/deploy-prod.sh`,
  },
  {
    id: 'env',
    phase: 'Step 6',
    title: 'Create production .env (secrets)',
    summary:
      'Copy .env.example → .env. Cookie name is hardcoded in the app as zigma_admin_session — do not invent COOKIE_NAME. Canonical site URL is the apex domain.',
    steps: [
      'cd /var/www/zigma-technologies',
      'cp .env.example .env && chmod 600 .env',
      'nano .env — use the .env template in this guide',
      'openssl rand -hex 32 for AUTH_SECRET and a different PREVIEW_SECRET',
      'NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'Do NOT set NEXT_PUBLIC_BASE_PATH (this is domain-root PROD, not justxsystems staging)',
      'DB_NAME=zigmatech_prod (not zigmatech)',
      'MEDIA_BASE_URL=/assets',
      'SMTP_* if enquiry email should send',
      'git check-ignore -v .env',
    ],
    checklist: [
      '.env mode 600',
      'Unique AUTH_SECRET / PREVIEW_SECRET',
      'DB_NAME=zigmatech_prod',
      'NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'No BASE_PATH',
    ],
    warning: 'Never paste DEV laptop passwords into PROD. Rotate ADMIN_PASSWORD after first seed login.',
  },
  {
    id: 'schema',
    phase: 'Step 7',
    title: 'Load MySQL schema (fresh install)',
    summary:
      'Run schema.sql once against zigmatech_prod. Do NOT run migrate-*.sql after a fresh schema — they are already baked in (ERROR 1060 Duplicate column).',
    steps: [
      'mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql',
      'Skip ALL scripts/migrate-*.sql on a fresh install',
      'Optional content promote: npm run db:import -- storage/exports/… --force instead of empty schema',
      'mkdir -p public/assets/uploads/resumes public/assets/uploads/documents && chmod -R 755 public/assets',
      'mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"',
    ],
    checklist: [
      'Tables present',
      'Migrations skipped (fresh install)',
      'Upload dirs writable',
    ],
    warning:
      'ERROR 1060 Duplicate column = already in schema.sql — ignore and continue. Wrong DB name zigmatech vs zigmatech_prod is a common mistake.',
    code: `cd /var/www/zigma-technologies
mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql
# Do NOT run migrate-*.sql after fresh schema.sql
mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"`,
  },
  {
    id: 'build',
    phase: 'Step 8',
    title: 'Install dependencies & production build',
    summary: 'First build on the VPS before PM2. Matches what scripts/deploy-prod.sh runs later.',
    steps: [
      'cd /var/www/zigma-technologies',
      'npm ci',
      'npm run build',
      'ls -la .next',
      'chmod +x scripts/deploy-prod.sh',
    ],
    checklist: ['npm ci OK', 'build exit 0', '.next present', 'deploy-prod.sh executable'],
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
    summary: 'Process name zigma — same name Actions / deploy-prod.sh restarts.',
    steps: [
      'cd /var/www/zigma-technologies',
      'pm2 start npm --name zigma -- start',
      'pm2 status — online',
      'curl -I http://127.0.0.1:3000 — 200 or 307/308',
      'pm2 save && pm2 startup (run the printed sudo command)',
      'pm2 logs zigma --lines 50 — no DB errors',
    ],
    checklist: ['PM2 zigma online', ':3000 responds', 'startup on boot', 'no DB errors'],
    code: `cd /var/www/zigma-technologies
pm2 start npm --name zigma -- start
pm2 save
pm2 startup
# run the sudo command pm2 prints
curl -I http://127.0.0.1:3000
pm2 logs zigma --lines 50`,
  },
  {
    id: 'nginx',
    phase: 'Step 10',
    title: 'Nginx reverse proxy (HTTP only — before public DNS)',
    summary:
      'Proxy port 80 → 127.0.0.1:3000. Do NOT run Certbot yet (DNS still points at BigRock’s old IP). Test with a hosts-file override on your laptop.',
    steps: [
      'As root: create /etc/nginx/sites-available/zigma with the HTTP Nginx snippet from this guide',
      'ln -sf …/zigma …/sites-enabled/ && rm -f …/sites-enabled/default',
      'nginx -t && systemctl reload nginx',
      'On your laptop hosts file add: 200.234.45.106 zigma-technologies.com www.zigma-technologies.com',
      'Windows hosts path: C:\\Windows\\System32\\drivers\\etc\\hosts (edit as Administrator)',
      'Browse http://zigma-technologies.com/ — you should hit THIS VPS (not the old BigRock site). Remove hosts lines after testing.',
      'curl -I -H "Host: zigma-technologies.com" http://127.0.0.1 from the VPS should reach Next via Nginx',
      'Leave Certbot for Step 14 after BigRock DNS points here',
    ],
    checklist: [
      'nginx -t OK',
      'Hosts-file test shows new app (not old vendor site)',
      'PM2 still online',
      'Certbot NOT run yet (unless you already cut over DNS)',
    ],
    warning:
      'If you open https://zigma-technologies.com in a normal browser before Step 13, you still see the OLD BigRock/UrbanVendo site. That is expected. Use hosts-file or curl with Host header to test the VPS.',
    code: `sudo tee /etc/nginx/sites-available/zigma >/dev/null <<'EOF'
server {
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
}
EOF
sudo ln -sf /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Laptop hosts-file test (Windows Admin notepad):
# 200.234.45.106 zigma-technologies.com www.zigma-technologies.com
# Then open http://zigma-technologies.com/ — remove hosts lines when done.`,
  },
  {
    id: 'gha',
    phase: 'Step 11',
    title: 'GitHub Actions auto-deploy (deploy@200.234.45.106)',
    summary:
      'Wire Actions before or after DNS — it only needs SSH to the VPS. Parts A→D on your laptop + GitHub UI. deploy-prod.sh does git reset --hard origin/master (discards local tracked edits; keeps .env).',
    steps: [
      'PART A (laptop Downloads): ssh-keygen -t ed25519 -C "github-actions-zigma-prod" -f ./gha_zigma_prod -N ""',
      'PART B: install .pub into deploy authorized_keys; verify ssh -i ./gha_zigma_prod deploy@200.234.45.106 "whoami" → deploy',
      'PART B0: on VPS, git fetch && git reset --hard origin/master (or discard dirty files then pull) until ls scripts/deploy-prod.sh works',
      'PART B dry-run: ssh -i ./gha_zigma_prod deploy@… "cd /var/www/zigma-technologies && chmod +x scripts/deploy-prod.sh && ./scripts/deploy-prod.sh"',
      'PART C GitHub secrets: PROD_HOST=200.234.45.106 , PROD_SSH_USER=deploy , PROD_SSH_KEY=private key contents',
      'Confirm https://github.com/JustXSystems/zigma-technologies/blob/master/.github/workflows/deploy-prod.yml exists',
      'PART D: Actions → Deploy Production → Run workflow → master → green',
      'Cleanup: password-manager the private key; delete local gha_zigma_prod files',
    ],
    checklist: [
      'Actions SSH key works (whoami)',
      'deploy-prod.sh on server',
      'Three secrets set',
      'Manual Run workflow green',
    ],
    warning:
      'Missing deploy-prod.sh = VPS behind GitHub — reset/pull master. Dirty schema.sql blocks pull — discard with git checkout -- scripts/schema.sql or use deploy-prod.sh reset --hard.',
    code: `# Laptop PowerShell
cd $env:USERPROFILE\\Downloads
ssh-keygen -t ed25519 -C "github-actions-zigma-prod" -f ./gha_zigma_prod -N '""'
type .\\gha_zigma_prod.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh -i .\\gha_zigma_prod deploy@200.234.45.106 "whoami && hostname"

# Sync code (discards local tracked edits on VPS — .env stays)
ssh -i .\\gha_zigma_prod deploy@200.234.45.106 "cd /var/www/zigma-technologies && git fetch origin && git reset --hard origin/master && ls -la scripts/deploy-prod.sh"

ssh -i .\\gha_zigma_prod deploy@200.234.45.106 "cd /var/www/zigma-technologies && chmod +x scripts/deploy-prod.sh && ./scripts/deploy-prod.sh"

Get-Content .\\gha_zigma_prod -Raw | Set-Clipboard
# Paste into GitHub → Settings → Secrets → Actions → PROD_SSH_KEY
# Also set PROD_HOST=200.234.45.106 and PROD_SSH_USER=deploy
# Then: https://github.com/JustXSystems/zigma-technologies/actions → Deploy Production → Run workflow`,
  },
  {
    id: 'dns',
    phase: 'Step 12',
    title: 'BigRock DNS cutover → 200.234.45.106',
    summary:
      'Point the live domain at Hostinger. Domain registration stays at BigRock. Only change website A records. Do this after hosts-file smoke tests pass (Step 10).',
    steps: [
      'Confirm the new site works via hosts file / VPS curl (Step 10) and PM2 is healthy',
      'Optional 24h before: at BigRock lower TTL on @ and www A records to 300 seconds',
      'Log in to https://www.bigrock.com (or the DNS panel if nameservers are UrbanVendo — use whoever answers nslookup NS)',
      'Find DNS management for zigma-technologies.com',
      'Set A record @ (apex / blank host) → 200.234.45.106',
      'Set A record www → 200.234.45.106',
      'Do NOT change MX, SPF, DKIM, or TXT mail records',
      'Do NOT delete the old A value until you can roll back if needed — overwrite/replace @ and www to the new IP',
      'From laptop: nslookup zigma-technologies.com and nslookup www.zigma-technologies.com — both must return 200.234.45.106',
      'Windows: nslookup zigma-technologies.com 8.8.8.8 to bypass local cache',
      'Remove any temporary hosts-file overrides so you see real public DNS',
      'Proceed to Step 13 (Certbot) once A records resolve to the new IP',
    ],
    checklist: [
      'A @ → 200.234.45.106',
      'A www → 200.234.45.106',
      'MX unchanged',
      'nslookup shows new IP (not 14.195.24.149)',
    ],
    warning:
      'Changing A records does not transfer the domain. If email uses @zigma-technologies.com, touching MX will break mail. Keep old hosting paid for 7–14 days for rollback.',
    code: `# Verify public DNS (laptop)
nslookup zigma-technologies.com 8.8.8.8
nslookup www.zigma-technologies.com 8.8.8.8
# Expect: 200.234.45.106

# BigRock DNS records to set:
#   Type A | Host @   | Value 200.234.45.106
#   Type A | Host www | Value 200.234.45.106
#   MX / mail TXT — leave as-is`,
  },
  {
    id: 'ssl',
    phase: 'Step 13',
    title: 'HTTPS with Certbot (after DNS points here)',
    summary:
      'Let’s Encrypt needs public DNS for zigma-technologies.com → this VPS. Run only after Step 12 nslookup is correct.',
    steps: [
      'Confirm nslookup returns 200.234.45.106 for apex and www',
      'As root: certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com',
      'Follow prompts (email, agree ToS). Certbot will modify Nginx for 443 and HTTP→HTTPS',
      'Optional: add www → apex redirect in Nginx if Certbot did not (see Nginx section)',
      'curl -I https://zigma-technologies.com — expect 200/308 and valid cert',
      'certbot renew --dry-run (renewal timer is installed by default)',
    ],
    checklist: [
      'HTTPS padlock on apex',
      'www also HTTPS',
      'HTTP redirects to HTTPS',
      'renew dry-run OK',
    ],
    code: `sudo certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com
curl -I https://zigma-technologies.com
curl -I https://www.zigma-technologies.com
sudo certbot renew --dry-run`,
  },
  {
    id: 'admin',
    phase: 'Step 14',
    title: 'Admin bootstrap, security & go-live handoff',
    summary: 'Seed/login on the live HTTPS URL, rotate passwords, verify forms, keep old host as rollback.',
    steps: [
      'Open https://zigma-technologies.com/admin/login',
      'Fresh DB: Seed default admin from ADMIN_* in .env, then change password under Account',
      'Imported DB: log in and rotate all admin passwords',
      'Dashboard → Bootstrap missing seeds if content empty',
      'Site Settings → contacts, analytics, enquiry notify email',
      'Submit test enquiry → Enquiries + SMTP',
      'Confirm /api/public/theme.css and catalog pages',
      'Keep BigRock/old hosting active 7–14 days; rollback = restore A records to old IP',
      'After stable: cancel old web hosting only (not the BigRock domain registration)',
    ],
    checklist: [
      'Admin HTTPS login OK',
      'Passwords rotated',
      'Enquiry + email OK',
      'Actions deploy verified',
      'Old host retained for rollback window',
    ],
  },
];

export const PROD_GHA_SECRETS: { name: string; example: string; purpose: string }[] = [
  {
    name: 'PROD_HOST',
    example: '200.234.45.106',
    purpose: 'VPS IPv4 — Actions SSH target',
  },
  {
    name: 'PROD_SSH_USER',
    example: 'deploy',
    purpose: 'OS user that owns the app + PM2 (never root)',
  },
  {
    name: 'PROD_SSH_KEY',
    example: '-----BEGIN OPENSSH PRIVATE KEY----- … -----END OPENSSH PRIVATE KEY-----',
    purpose: 'Private half of gha_zigma_prod; public half in /home/deploy/.ssh/authorized_keys',
  },
];

export const PROD_GHA_HOW_IT_WORKS = [
  'Developer merges to master (or clicks Run workflow).',
  'GitHub job “Deploy Production” SSHs to deploy@200.234.45.106 using PROD_* secrets.',
  'Runner executes scripts/deploy-prod.sh on the VPS.',
  'Script: git fetch + reset --hard origin/master → npm ci → npm run build → pm2 restart zigma.',
  '.env and untracked uploads stay on the server (never uploaded by Actions).',
];

export const PROD_GHA_PARTS: {
  id: string;
  where: string;
  title: string;
  detail: string;
}[] = [
  {
    id: 'a',
    where: 'Your laptop only',
    title: 'Part A — Create Actions SSH keypair',
    detail:
      'In Downloads: ssh-keygen … -f ./gha_zigma_prod. Do not create this key as root on the VPS.',
  },
  {
    id: 'b',
    where: 'Laptop → VPS',
    title: 'Part B — Authorize public key',
    detail:
      'Install .pub into deploy authorized_keys. ssh -i gha_zigma_prod … whoami must return deploy with no password.',
  },
  {
    id: 'b0',
    where: 'VPS git sync',
    title: 'Part B0 — Ensure deploy-prod.sh exists',
    detail:
      'git fetch && git reset --hard origin/master (or discard dirty tracked files). ls scripts/deploy-prod.sh must succeed before dry-run.',
  },
  {
    id: 'c',
    where: 'GitHub website',
    title: 'Part C — Three repository secrets',
    detail: 'PROD_HOST, PROD_SSH_USER, PROD_SSH_KEY. Confirm deploy-prod.yml on master.',
  },
  {
    id: 'd',
    where: 'Actions',
    title: 'Part D — Run workflow once',
    detail: 'Actions → Deploy Production → Run workflow. Confirm green + pm2 healthy.',
  },
];

export const PROD_GHA_STEPS = [
  'Part A: create gha_zigma_prod on the laptop.',
  'Part B: install .pub; test whoami.',
  'Part B0: git reset --hard origin/master until deploy-prod.sh exists.',
  'Part B dry-run: ./scripts/deploy-prod.sh',
  'Part C: PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY',
  'Part D: Run workflow → green',
];

export const PROD_ENV_TEMPLATE = `NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com

# MySQL on this VPS (localhost only)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zigmatech_prod
DB_USER=zigmatech_prod
DB_PASSWORD=<generate-strong-password>

# Auth (openssl rand -hex 32 for each) — cookie name is fixed in code as zigma_admin_session
AUTH_SECRET=<unique-prod-secret-min-32-chars>
PREVIEW_SECRET=<unique-preview-secret>

# First admin seed only — change password after first login
ADMIN_EMAIL=admin@zigma-technologies.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=Site Admin

# Media from /public/assets
MEDIA_BASE_URL=/assets

# Enquiry notifications (optional — Hostinger mailbox or Google Workspace)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<mailbox-or-app-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"

# Optional Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Do NOT set NEXT_PUBLIC_BASE_PATH on this domain-root PROD deploy`;

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

export const PROD_UPDATE_COMMANDS = `# Same path Actions uses
ssh deploy@200.234.45.106
cd /var/www/zigma-technologies
./scripts/deploy-prod.sh

# Manual equivalent:
cd /var/www/zigma-technologies
git fetch origin
git reset --hard origin/master
npm ci
# If schema changed on an OLD database, apply migrate-*.sql before restart
npm run build
pm2 restart zigma
pm2 logs zigma --lines 80`;

export const PROD_BACKUP = [
  {
    title: 'Application code',
    detail: 'Git (JustXSystems/zigma-technologies). Tag releases after go-live.',
  },
  {
    title: 'MySQL dump (daily)',
    detail:
      'mysqldump -u zigmatech_prod -p zigmatech_prod | gzip > /var/backups/zigma/db-$(date +%F).sql.gz',
  },
  {
    title: 'CMS media & uploads',
    detail: 'Backup public/assets (rsync/tar) or npm run db:export -- --with-cms-media',
  },
  {
    title: 'Hostinger snapshots',
    detail: 'Enable VPS backups in hPanel before BigRock DNS cutover.',
  },
];

export const PROD_CHECKLIST = [
  'Hosts-file (or post-DNS) https://zigma-technologies.com/ loads THIS app',
  'www works or redirects to apex',
  '/admin/login works; passwords rotated',
  '/products, /projects, /services OK',
  'Enquiry form → Enquiries + email',
  '/api/public/theme.css OK',
  '/sitemap.xml OK',
  'UFW 22/80/443; 3306 closed',
  'pm2 zigma online + startup enabled',
  'GitHub Actions Deploy Production green',
  'BigRock A @ and www → 200.234.45.106',
  'MX unchanged',
  'Old host retained 7–14 days for rollback',
];

export const PROD_TROUBLESHOOT = [
  {
    symptom: 'Browser still shows the old BigRock/UrbanVendo website',
    fixes: [
      'DNS not cut over yet — expected until Step 12',
      'nslookup zigma-technologies.com 8.8.8.8 — if still old IP, wait or fix BigRock A records',
      'Flush local DNS / remove hosts-file overrides',
      'Test VPS directly: curl -I -H "Host: zigma-technologies.com" http://200.234.45.106',
    ],
  },
  {
    symptom: 'Cannot SSH to root@200.234.45.106',
    fixes: [
      'VPS Active in hPanel',
      'Reset SSH password/key under VPS → SSH Access',
      'ssh -v root@200.234.45.106',
      'fail2ban-client status sshd',
    ],
  },
  {
    symptom: 'Database connection failed / 500 everywhere',
    fixes: [
      'Check DB_* in /var/www/zigma-technologies/.env (DB_NAME=zigmatech_prod)',
      'systemctl status mysql',
      'mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
    ],
  },
  {
    symptom: 'Admin login loop after HTTPS',
    fixes: [
      'Nginx must send X-Forwarded-Proto $scheme (required for secure cookies)',
      'AUTH_SECRET must be stable',
      'Clear cookies for zigma-technologies.com',
    ],
  },
  {
    symptom: 'Certbot fails / connection refused on challenge',
    fixes: [
      'DNS A records must already point to 200.234.45.106',
      'UFW/hPanel firewall allow 80 and 443',
      'Nginx listening on 80; no other process bound to 80',
    ],
  },
  {
    symptom: 'git pull: local changes would be overwritten',
    fixes: [
      'Prefer: git fetch origin && git reset --hard origin/master (deploy servers)',
      'Or: git checkout -- scripts/schema.sql then git pull',
      'Never commit on the VPS',
    ],
  },
  {
    symptom: 'chmod: deploy-prod.sh No such file',
    fixes: [
      'VPS clone behind GitHub — git fetch && git reset --hard origin/master',
      'Confirm file on GitHub master blob URL',
    ],
  },
  {
    symptom: 'GitHub Actions deploy fails on SSH',
    fixes: [
      'PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY secrets',
      'Public key in deploy authorized_keys',
      'Do not IP-restrict port 22 against GitHub runners',
    ],
  },
  {
    symptom: 'npm run build OOM',
    fixes: [
      'Add 2G swap: fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile',
      'Ensure .env exists before build',
    ],
  },
];

export const PROD_FAQ: ProdFaq[] = [
  {
    q: 'Do we transfer the domain from BigRock to Hostinger?',
    a: 'No for go-live. Keep registration at BigRock. Only change A records for @ and www to 200.234.45.106. Transfer is optional later for billing convenience.',
  },
  {
    q: 'Is there an “Add website” or “Enable Node.js” click in Hostinger hPanel?',
    a: 'Not for this KVM VPS path. You install Nginx/Node/PM2 over SSH. Shared-hosting “Node.js Web App” is a different product — do not mix the two.',
  },
  {
    q: 'When will visitors see the new app?',
    a: 'Only after BigRock A records point to 200.234.45.106 and Certbot has issued HTTPS (Steps 12–13). Until then the public domain still shows the old vendor site.',
  },
  {
    q: 'Will changing DNS break email?',
    a: 'Not if you leave MX (and related TXT) unchanged. Only edit website A records for @ and www.',
  },
  {
    q: 'How does GitHub Actions deploy work?',
    a: 'Push/manual run on master → SSH as deploy → scripts/deploy-prod.sh (reset --hard origin/master, npm ci, build, pm2 restart). .env stays on the VPS.',
  },
  {
    q: 'Why skip migrate-*.sql after schema.sql?',
    a: 'Fresh schema.sql already includes those columns. Re-running migrations causes ERROR 1060 Duplicate column (e.g. admin_notes).',
  },
  {
    q: 'What about COOKIE_NAME in older docs?',
    a: 'The app hardcodes cookie zigma_admin_session in src/lib/auth.ts. Do not set COOKIE_NAME in .env.',
  },
];

export const PROD_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'cutover', label: 'Domain cutover plan' },
  { id: 'server', label: 'This VPS' },
  { id: 'prereqs', label: 'Prerequisites' },
  { id: 'purchase', label: 'Confirm KVM 2' },
  { id: 'phases', label: 'Setup steps' },
  { id: 'dns-table', label: 'BigRock DNS records' },
  { id: 'gha', label: 'GitHub Actions' },
  { id: 'env', label: '.env template' },
  { id: 'nginx', label: 'Nginx' },
  { id: 'updates', label: 'Updates' },
  { id: 'backups', label: 'Backups' },
  { id: 'checklist', label: 'Go-live checklist' },
  { id: 'troubleshoot', label: 'Troubleshooting' },
  { id: 'faq', label: 'FAQ' },
];
