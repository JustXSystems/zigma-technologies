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
  source:
    'GitHub JustXSystems/zigma-technologies — PreProd auto-deploys to JustXSystems VPS; Production is manual selective Actions to this Zigma VPS only',
  domain: 'zigma-technologies.com (DNS at BigRock → this VPS IP)',
  appPort: '3000 (localhost only — Nginx terminates HTTPS)',
  preprodNote:
    'PreProd is a DIFFERENT VPS: deploy@193.203.161.219 (JustXSystems) → https://justxsystems.com/zigma-technologies — see /admin/guide/justxsystems',
};

export const PROD_CUTOVER = {
  title: 'How the domain moves from BigRock to this VPS',
  points: [
    'Domain registration stays at BigRock (bigrock.com). You do NOT transfer the domain to Hostinger unless you want one vendor.',
    'Today the website still points at the old host (historically ~14.195.24.149 / UrbanVendo). Visitors keep seeing the old site until you change DNS.',
    'On Hostinger you finish the full stack first (Steps 1–11): app reachable on the VPS via hosts-file test. There is no hPanel “Add website” step for a KVM VPS — Nginx on the VPS is the web server.',
    'When ready, at BigRock DNS change only A records for @ and www → 200.234.45.106 (Step 12). Leave MX / mail records untouched unless you are also moving email.',
    'After DNS propagates, run Certbot for HTTPS (Step 13). Then public traffic hits this Next.js app at https://zigma-technologies.com/.',
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

/** How to use this guide — fresher rules (copy-paste, verify, never mix PreProd). */
export const PROD_HOWTO = [
  'Read top-to-bottom once, then execute Steps 1→14 in order. Do not skip ahead to BigRock DNS (Step 12) until hosts-file smoke test on the VPS succeeds.',
  'Production IP is ALWAYS 200.234.45.106 (Zigma Technologies VPS / srv1954986.hstgr.cloud). PreProd is a DIFFERENT machine: 193.203.161.219 — never SSH there for this guide, never put that IP in PROD_HOST.',
  'Commands marked “FROM LAPTOP (Windows PowerShell)” run on your PC. Everything else runs over SSH on the VPS as root or deploy.',
  'Copy one block at a time. After each block, read the # Expect: lines — if you do not see that result, stop and fix before continuing.',
  'Lines starting with # are comments — do not type them into the shell unless the comment itself is an instruction (e.g. “paste into GitHub”).',
  'Store every password and secret in a password manager the same day you create it. Never commit .env or private keys to git.',
  'Production URL is the domain root https://zigma-technologies.com/ — do NOT set NEXT_PUBLIC_BASE_PATH (that is PreProd-only on justxsystems.com).',
  'Production deploys are manual only: GitHub Actions → Deploy Production → confirm_production must be exactly DEPLOY_PROD. Pushing to master never deploys Production (it only updates PreProd).',
  'When stuck, jump to Troubleshooting / FAQ in this guide. Wrong-box SSH (193.203.161.219) is the most common beginner mistake.',
];

export const PROD_PREREQUISITES = [
  'LAPTOP — Windows 10/11 with PowerShell 5+ (or Windows Terminal). Open PowerShell as a normal user; you will elevate only when editing the hosts file.',
  'LAPTOP — OpenSSH client available: in PowerShell run ssh -V (expect OpenSSH_for_Windows…). If missing: Settings → Apps → Optional features → OpenSSH Client.',
  'LAPTOP — Optional but recommended: Git for Windows so you can inspect the repo locally (git --version).',
  'LAPTOP — Browser access to hPanel, BigRock, and GitHub; keep two tabs open for copy-paste of IPs and secrets.',
  'LAPTOP — Confirm you can reach the internet and that corporate VPN does not block outbound SSH (port 22) to 200.234.45.106.',
  'HPANEL — Login at https://hpanel.hostinger.com with the Hostinger account that owns VPS srv1954986.hstgr.cloud.',
  'HPANEL — VPS shows Active, location India — Mumbai 2, OS Ubuntu 26.04 LTS, plan KVM 2, IPv4 exactly 200.234.45.106.',
  'HPANEL — VPS → SSH Access: you know the root password OR you will set one / add a laptop SSH public key before Step 1.',
  'HPANEL — Optional: VPS → Firewall allow TCP 22, 80, 443. Optional: enable automatic backups/snapshots before DNS cutover.',
  'BIGROCK — Login at https://www.bigrock.com (or the DNS panel if nameservers are UrbanVendo — verify with nslookup -type=NS zigma-technologies.com).',
  'BIGROCK — Permission to edit DNS A records for zigma-technologies.com (@ and www). Registrar stays BigRock — you are NOT transferring the domain.',
  'BIGROCK — Note the current live web IP 14.195.24.149 for rollback; do not cancel old hosting until Production is stable 7–14 days.',
  'GITHUB — Access to org/repo JustXSystems/zigma-technologies (clone, Deploy keys, Settings → Secrets and variables → Actions).',
  'GITHUB — Permission to add repository secrets PROD_HOST, PROD_SSH_USER, PROD_SSH_KEY and to run workflow_dispatch “Deploy Production”.',
  'GITHUB — Know that PreProd uses separate PREPROD_* secrets → 193.203.161.219 — never overwrite those with Production values.',
  'PASSWORD MANAGER — Create a vault entry “Zigma Production” for: root password, deploy password, MySQL zigmatech_prod password, AUTH_SECRET, PREVIEW_SECRET, ADMIN_PASSWORD, SMTP_PASS, gha_zigma_prod private key.',
  'PASSWORD MANAGER — Never store Production secrets in Slack, email, or git. Paste from the manager into .env / GitHub Secrets only.',
  'OPTIONAL CONTENT — On a machine that already has PreProd/dev data: npm run db:export -- --with-cms-media (import later instead of empty schema).',
  'LOCAL QUALITY GATES (optional on laptop before cutover) — npm run typecheck && npm run lint && npm run build against master.',
  'TIME BOX — Plan a quiet window for DNS cutover (Step 12) after Steps 1–11 green; TLS (Step 13) only after nslookup shows 200.234.45.106.',
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
    label: 'Zigma Technologies VPS (this guide)',
    items: [
      'SSH deploy@200.234.45.106',
      'Hostname srv1954986.hstgr.cloud',
      'UFW + Nginx :80/:443 + Certbot',
      'PM2 zigma → 127.0.0.1:3000',
      'MySQL zigmatech_prod on localhost',
      'App /var/www/zigma-technologies (domain root, no BASE_PATH)',
    ],
  },
  {
    label: 'JustXSystems VPS (PreProd — separate machine)',
    items: [
      'SSH deploy@193.203.161.219',
      'https://justxsystems.com/zigma-technologies/',
      'App /var/www/zigma-technologies · PM2 zigma-preprod :3001',
      'NEXT_PUBLIC_BASE_PATH=/zigma-technologies',
      'Secrets PREPROD_* — never use PROD_* here',
      'Guide: /admin/guide/justxsystems',
    ],
  },
  {
    label: 'GitHub Actions',
    items: [
      'master push → Deploy PreProd → JustXSystems VPS only',
      'Deploy Production → workflow_dispatch + components → this VPS only',
      'PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY',
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
  'Domain stays at BigRock — do not transfer to Hostinger for go-live. Only A records change in Step 12.',
  'There is no “Add website” / “Node.js app” hPanel step for this KVM path — you configure Nginx on the VPS.',
];

export const PROD_PHASES: ProdPhase[] = [
  {
    id: 'buy',
    phase: 'Step 1',
    title: 'Confirm VPS access (empty Ubuntu server)',
    summary:
      'Brand-new empty Ubuntu 26.04. Prove SSH as root before installing anything. Public DNS still points at BigRock’s old host until Step 12.',
    steps: [
      'Open hPanel → VPS → confirm Active for srv1954986.hstgr.cloud and IPv4 200.234.45.106.',
      'FROM LAPTOP: open PowerShell and run ssh root@200.234.45.106 (accept host key fingerprint on first connect).',
      'On first password login as root: run passwd and store the new root password in the password manager.',
      'Confirm OS: hostnamectl — expect Ubuntu 26.04; hostname should mention srv1954986.',
      'Confirm resources: df -h && free -h && nproc — ~100 GB disk, ~8 GB RAM, 2 CPUs.',
      'Confirm clean OS: which node / which nginx should print “not installed” messages (empty server).',
      'Confirm you are NOT on PreProd: hostname -I must include 200.234.45.106 — if you see 193.203.161.219 you are on the wrong VPS.',
      'Store root credentials in the password manager under “Zigma Production”.',
    ],
    checklist: [
      'SSH root@200.234.45.106 succeeds',
      'Ubuntu 26.04 confirmed',
      'IPv4 200.234.45.106 recorded (not 193.203.161.219)',
      'Credentials in password manager',
    ],
    warning:
      'If ssh connects but hostname -I shows 193.203.161.219, you are on JustXSystems PreProd — disconnect immediately and use 200.234.45.106 only.',
    code: `# ============================================================
# FROM LAPTOP (Windows PowerShell) — first root login
# ============================================================
# what this does: opens an SSH session to the Zigma Production VPS as root
ssh root@200.234.45.106
# Expect: password prompt (or key auth), then a root shell prompt like root@srv1954986:~#

# Optional verbose debug if connection fails:
# ssh -v root@200.234.45.106
# Expect: connection to 200.234.45.106 port 22 (NOT 193.203.161.219)

# ============================================================
# ON VPS as root (after SSH succeeds)
# ============================================================
# what this does: set/change root password on first login — save it in password manager
passwd
# Expect: "password updated successfully"

# what this does: prove OS identity
hostnamectl
# Expect: Operating System: Ubuntu 26.04 LTS (or similar Ubuntu 26.04 line)

hostname
# Expect: srv1954986… (Hostinger hostname)

# what this does: prove this is the Production IP (wrong box check)
hostname -I
# Expect: includes 200.234.45.106
# WRONG: 193.203.161.219 = PreProd JustXSystems VPS — exit and reconnect to Production

ip -4 addr show
# Expect: inet 200.234.45.106 somewhere under the primary NIC

# what this does: confirm disk / RAM / CPU match KVM 2
df -h
free -h
nproc
# Expect: ~100G disk free-ish, ~7–8G Mem total, nproc = 2

# what this does: confirm empty stack (nothing installed yet)
which node || echo "node not installed"
which nginx || echo "nginx not installed"
which mysql || echo "mysql not installed"
# Expect: "not installed" (or empty which) for a brand-new VPS

# Leave this root session open for Step 2 (or exit and ssh again later).`,
  },
  {
    id: 'harden',
    phase: 'Step 2',
    title: 'Base OS update, deploy user, firewall',
    summary:
      'Patch the empty server, create deploy (used by humans + GitHub Actions), open only SSH/HTTP/HTTPS.',
    steps: [
      'As root: apt update && apt upgrade -y (reboot if the kernel asks — then SSH back in).',
      'apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common',
      'adduser deploy — choose a strong password; save it in the password manager.',
      'usermod -aG sudo deploy so deploy can run sudo.',
      'On the VPS use su - deploy — do NOT run ssh-copy-id on the VPS (no identities / wrong machine).',
      'As deploy: sudo -v then exit back to root.',
      'UFW: allow OpenSSH + 80/tcp + 443/tcp, then ufw --force enable.',
      'ufw status verbose — only 22/80/443. Never open 3306.',
      'If hPanel has a VPS Firewall, allow 22/80/443 there too.',
      'FROM LAPTOP (optional now): install your personal SSH public key for deploy (commands below).',
    ],
    checklist: [
      'Packages updated',
      'deploy can sudo (su - deploy)',
      'UFW allows 22/80/443 only',
      'Port 3306 not public',
    ],
    warning:
      'ssh-copy-id is for your laptop → deploy. Running it as root on the VPS fails with “No identities found”. Keep working with su - deploy until laptop key auth works.',
    code: `# ============================================================
# ON VPS as root@200.234.45.106
# ============================================================
# what this does: refresh package indexes and apply security/OS updates
apt update && apt upgrade -y
# Expect: packages upgrade without fatal errors; may prompt about services — accept defaults

# If a reboot is required:
# reboot
# Then FROM LAPTOP: ssh root@200.234.45.106 again

# what this does: install baseline tools (git, firewall, cert helpers)
apt install -y curl git ufw fail2ban ca-certificates gnupg unzip software-properties-common
# Expect: "done" / packages installed

# what this does: create the deploy OS user (human + GitHub Actions SSH target)
adduser deploy
# Expect: prompts for password — use a strong unique password; save in password manager
usermod -aG sudo deploy
# Expect: no output (success)

# what this does: prove deploy can use sudo WITHOUT leaving the VPS
su - deploy
sudo -v
# Expect: password prompt for deploy, then success (no "not in sudoers")
whoami
# Expect: deploy
exit
# Expect: back to root shell

# what this does: lock down the firewall to SSH + web only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
# Expect: Status: active; ALLOW for 22/tcp (OpenSSH), 80/tcp, 443/tcp
# Expect: NO rule for 3306

# ============================================================
# FROM LAPTOP (Windows PowerShell) — optional personal key for deploy
# ============================================================
# what this does: create a laptop ed25519 key if you do not already have one
# Skip if $env:USERPROFILE\\.ssh\\id_ed25519.pub already exists
if (-not (Test-Path "$env:USERPROFILE\\.ssh\\id_ed25519")) {
  ssh-keygen -t ed25519 -C "laptop-zigma-prod" -f "$env:USERPROFILE\\.ssh\\id_ed25519" -N '""'
}
# Expect: id_ed25519 and id_ed25519.pub created (or already present)

# what this does: append your public key to deploy authorized_keys on Production
type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
# Expect: password prompt for deploy once, then returns to PowerShell with no error

# what this does: prove passwordless SSH as deploy to the CORRECT box
ssh deploy@200.234.45.106 "whoami && hostname -I"
# Expect: deploy
# Expect: hostname -I includes 200.234.45.106 (NOT 193.203.161.219)`,
  },
  {
    id: 'stack',
    phase: 'Step 3',
    title: 'Install Node.js 20, Nginx, PM2, Certbot',
    summary:
      'Runtime stack on the empty VPS. Certbot is installed now; you run it only after DNS in Step 13. MySQL is Step 4.',
    steps: [
      'As root/sudo: install Node 20 LTS via NodeSource (commands below).',
      'node -v → v20.x ; npm -v works.',
      'npm install -g pm2',
      'apt install -y nginx && systemctl enable --now nginx',
      'apt install -y certbot python3-certbot-nginx',
      'mkdir -p /var/www && chown deploy:deploy /var/www',
      'curl -I http://127.0.0.1 — Nginx default page is OK for now.',
    ],
    checklist: [
      'node -v → v20.x',
      'pm2 -v works',
      'nginx active',
      'certbot installed',
      '/var/www owned by deploy',
    ],
    code: `# ============================================================
# ON VPS as root (or sudo)
# ============================================================
# what this does: add NodeSource repo for Node.js 20 LTS and install nodejs + nginx + certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx
# Expect: nodejs and nginx packages installed without errors

# what this does: install PM2 globally for process management
npm install -g pm2
# Expect: pm2 binary available

# what this does: give deploy ownership of the web apps parent directory
mkdir -p /var/www
chown deploy:deploy /var/www
# Expect: /var/www owned by deploy:deploy

# what this does: enable Nginx on boot and start it now
systemctl enable --now nginx
systemctl status nginx --no-pager
# Expect: Active: active (running)

# what this does: verify versions
node -v
npm -v
pm2 -v
certbot --version
# Expect: node v20.x.x ; npm 10.x ; pm2 version number ; certbot version number

# what this does: prove Nginx answers locally (default site is fine until Step 10)
curl -I http://127.0.0.1
# Expect: HTTP/1.1 200 OK (or 301/302 from default site) — connection refused = nginx not running

# Note: Do NOT run certbot --nginx yet. Public DNS still points at 14.195.24.149.`,
  },
  {
    id: 'mysql',
    phase: 'Step 4',
    title: 'Install & configure MySQL 8 (production database)',
    summary: 'Dedicated PROD DB on localhost only. App connects via DB_* in .env. Database and user are both zigmatech_prod.',
    steps: [
      'apt install -y mysql-server && systemctl enable --now mysql',
      'mysql_secure_installation (follow prompts; use a strong root DB password in password manager).',
      'Create DATABASE zigmatech_prod and USER zigmatech_prod@localhost with a 32+ char password.',
      'GRANT ALL ON zigmatech_prod.* ; FLUSH PRIVILEGES',
      'Confirm bind-address is 127.0.0.1 (MySQL not public).',
      'Test: mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'Save DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD for .env (Step 6).',
    ],
    checklist: [
      'mysql running',
      'zigmatech_prod database exists',
      'App user SELECT 1 works',
      '3306 not public (UFW has no 3306 rule)',
    ],
    warning: 'Never reuse DEV/UAT/PreProd DB passwords or AUTH_SECRET on PROD. DB name is zigmatech_prod (not zigmatech).',
    code: `# ============================================================
# ON VPS as root / sudo
# ============================================================
# what this does: install MySQL 8 and start it on boot
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo systemctl status mysql --no-pager
# Expect: Active: active (running)

# what this does: harden default MySQL install (root password, remove anon users, etc.)
sudo mysql_secure_installation
# Expect: interactive prompts — set a strong MySQL root password; save it in password manager
# Expect: disallow remote root login = Yes; remove test DB = Yes

# what this does: create Production database + app user (change the password!)
# Replace REPLACE_WITH_STRONG_PASSWORD with a unique 32+ char secret from your password manager
sudo mysql -e "
CREATE DATABASE zigmatech_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zigmatech_prod'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON zigmatech_prod.* TO 'zigmatech_prod'@'localhost';
FLUSH PRIVILEGES;
"
# Expect: no error output

# what this does: prove the app user can connect
mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1 AS ok;"
# Expect: password prompt, then a row with ok = 1

# what this does: confirm MySQL listens locally only
sudo grep -E '^bind-address|^mysqlx-bind-address' /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/my.cnf 2>/dev/null || true
ss -lntp | grep 3306 || true
# Expect: bind-address 127.0.0.1 (or similar localhost-only); not 0.0.0.0 for public exposure

# what this does: double-check UFW did not open MySQL
sudo ufw status | grep 3306 || echo "OK: 3306 not allowed in UFW"
# Expect: OK: 3306 not allowed in UFW`,
  },
  {
    id: 'github',
    phase: 'Step 5',
    title: 'Clone JustXSystems/zigma-technologies as deploy',
    summary:
      'Source at /var/www/zigma-technologies. Prefer a read-only GitHub Deploy Key for private repos. Work as deploy, not root.',
    steps: [
      'ssh deploy@200.234.45.106 (or su - deploy from root).',
      'cd /var/www',
      'Create read-only key: ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""',
      'cat ~/.ssh/github_zigma_ro.pub → copy → GitHub repo → Settings → Deploy keys → Add key (read-only, unchecked write).',
      'Configure ~/.ssh/config IdentityFile for github.com (see Commands).',
      'ssh -T git@github.com — expect a success greeting for JustXSystems/zigma-technologies or your GitHub user.',
      'git clone git@github.com:JustXSystems/zigma-technologies.git',
      'cd zigma-technologies && git checkout master && git rev-parse --short HEAD',
      'Confirm package.json and scripts/deploy-prod.sh exist at repo root.',
    ],
    checklist: [
      'Repo at /var/www/zigma-technologies',
      'Branch master',
      'deploy owns the tree',
      'scripts/deploy-prod.sh present (or pull latest master)',
    ],
    code: `# ============================================================
# ON VPS as deploy@200.234.45.106
# ============================================================
# From laptop if needed:
# ssh deploy@200.234.45.106

cd /var/www
# Expect: you are in /var/www and can write as deploy (owned by deploy from Step 3)

# what this does: create a read-only Deploy Key used ONLY for git clone/fetch on Production
ssh-keygen -t ed25519 -C "zigma-prod-git-readonly" -f ~/.ssh/github_zigma_ro -N ""
# Expect: two files: github_zigma_ro (private) and github_zigma_ro.pub (public)

cat ~/.ssh/github_zigma_ro.pub
# Expect: one line starting with ssh-ed25519
# ACTION: copy that line → GitHub → JustXSystems/zigma-technologies → Settings → Deploy keys
#          → Add deploy key → Title: zigma-prod-git-readonly → Allow write access: OFF → Add key

# what this does: force git@github.com to use this Deploy Key (not other laptop keys)
cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_zigma_ro
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/github_zigma_ro
# Expect: config file mode 600

# what this does: test GitHub SSH auth
ssh -T git@github.com
# Expect: "Hi …! You've successfully authenticated…" (exit code may be 1 — that is normal for GitHub)

# what this does: clone the application into the Production app directory
git clone git@github.com:JustXSystems/zigma-technologies.git
cd zigma-technologies
git checkout master
git rev-parse --short HEAD
pwd
# Expect: /var/www/zigma-technologies
# Expect: short commit hash printed; on branch master

ls -la package.json scripts/deploy-prod.sh scripts/deploy.sh scripts/schema.sql
# Expect: all listed files exist
# If deploy-prod.sh missing: git fetch origin && git reset --hard origin/master then ls again`,
  },
  {
    id: 'env',
    phase: 'Step 6',
    title: 'Create production .env (secrets)',
    summary:
      'Copy .env.example → .env. Cookie name is hardcoded in the app as zigma_admin_session — do not invent COOKIE_NAME. Canonical site URL is the apex domain. NO NEXT_PUBLIC_BASE_PATH.',
    steps: [
      'cd /var/www/zigma-technologies',
      'cp .env.example .env && chmod 600 .env',
      'Generate secrets: openssl rand -hex 32 twice (AUTH_SECRET and a different PREVIEW_SECRET).',
      'Edit .env with nano using the .env template in this guide (DB_NAME=zigmatech_prod, SITE_URL apex).',
      'NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'Do NOT set NEXT_PUBLIC_BASE_PATH (domain-root PROD — PreProd-only uses /zigma-technologies).',
      'MEDIA_BASE_URL=/assets',
      'SMTP_* if enquiry email should send (see Email guide).',
      'git check-ignore -v .env — must show ignored.',
    ],
    checklist: [
      '.env mode 600',
      'Unique AUTH_SECRET / PREVIEW_SECRET',
      'DB_NAME=zigmatech_prod',
      'NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com',
      'No NEXT_PUBLIC_BASE_PATH line',
    ],
    warning:
      'Never paste DEV laptop or PreProd passwords into PROD. Rotate ADMIN_PASSWORD after first seed login. Never commit .env.',
    code: `# ============================================================
# ON VPS as deploy@200.234.45.106
# ============================================================
cd /var/www/zigma-technologies

# what this does: create a private env file from the example template
cp .env.example .env
chmod 600 .env
ls -la .env
# Expect: -rw------- … .env  (mode 600)

# what this does: generate two independent secrets (save BOTH in password manager)
openssl rand -hex 32
# Expect: 64 hex chars → paste as AUTH_SECRET=
openssl rand -hex 32
# Expect: different 64 hex chars → paste as PREVIEW_SECRET=

# what this does: open the editor — fill values from the .env template section of this guide
nano .env
# Required highlights (do NOT invent BASE_PATH):
#   NODE_ENV=production
#   NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com
#   DB_HOST=localhost
#   DB_PORT=3306
#   DB_NAME=zigmatech_prod
#   DB_USER=zigmatech_prod
#   DB_PASSWORD=<same password from Step 4>
#   AUTH_SECRET=<openssl #1>
#   PREVIEW_SECRET=<openssl #2>
#   ADMIN_EMAIL=admin@zigma-technologies.com
#   ADMIN_PASSWORD=<strong one-time password>
#   MEDIA_BASE_URL=/assets
#   # Do NOT add: NEXT_PUBLIC_BASE_PATH=...
# Save in nano: Ctrl+O Enter, exit: Ctrl+X

# what this does: prove .env is gitignored
git check-ignore -v .env
# Expect: a rule from .gitignore matching .env

# what this does: sanity-check critical keys without printing secrets
grep -E '^(NODE_ENV|NEXT_PUBLIC_SITE_URL|DB_NAME|DB_USER|MEDIA_BASE_URL)=' .env
grep -E '^NEXT_PUBLIC_BASE_PATH=' .env && echo "FAIL: BASE_PATH must not be set on Production" || echo "OK: no BASE_PATH"
# Expect: SITE_URL=https://zigma-technologies.com ; DB_NAME=zigmatech_prod ; OK: no BASE_PATH`,
  },
  {
    id: 'schema',
    phase: 'Step 7',
    title: 'Load MySQL schema (fresh install)',
    summary:
      'Run schema.sql once against zigmatech_prod. Do NOT run migrate-*.sql after a fresh schema — they are already baked in (ERROR 1060 Duplicate column).',
    steps: [
      'cd /var/www/zigma-technologies',
      'mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql',
      'Skip ALL scripts/migrate-*.sql on a fresh install.',
      'Optional content promote: npm run db:import -- storage/exports/… --force instead of empty schema (after backing up).',
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
    code: `# ============================================================
# ON VPS as deploy@200.234.45.106
# ============================================================
cd /var/www/zigma-technologies

# what this does: create all tables from the canonical schema (fresh Production DB)
mysql -u zigmatech_prod -p zigmatech_prod < scripts/schema.sql
# Expect: password prompt, then return to shell with no SQL errors
# Do NOT run: mysql … < scripts/migrate-*.sql   (causes ERROR 1060 on fresh schema)

# what this does: list tables to confirm load
mysql -u zigmatech_prod -p zigmatech_prod -e "SHOW TABLES;"
# Expect: many table names (cms_*, admin_*, products, etc.) — empty list means wrong DB or failed import

# what this does: create upload directories used by the CMS / careers forms
mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
ls -la public/assets/uploads/
# Expect: resumes/ and documents/ directories exist

# OPTIONAL — import a PreProd/dev content export instead of empty schema:
# (Only after you have a gzip/sql export on the VPS; backup first.)
# npm ci   # if node_modules not installed yet
# npm run db:import -- storage/exports/YOUR_EXPORT --force
# Expect: import completes without fatal errors; spot-check SHOW TABLES / row counts`,
  },
  {
    id: 'build',
    phase: 'Step 8',
    title: 'Install dependencies & production build',
    summary: 'First build on the VPS before PM2. Matches what scripts/deploy-prod.sh runs later. Requires .env from Step 6.',
    steps: [
      'cd /var/www/zigma-technologies',
      'npm ci',
      'npm run build',
      'ls -la .next',
      'chmod +x scripts/deploy-prod.sh scripts/deploy.sh',
    ],
    checklist: ['npm ci OK', 'build exit 0', '.next present', 'deploy-prod.sh executable'],
    warning:
      'If the build is killed (OOM), add 2G swap (see Troubleshooting) and re-run npm run build. Ensure .env exists before build.',
    code: `# ============================================================
# ON VPS as deploy@200.234.45.106
# ============================================================
cd /var/www/zigma-technologies

# what this does: install exact dependencies from package-lock.json
npm ci
# Expect: added packages; exit code 0 (not ERESOLVE fatal)

# what this does: compile the Next.js production bundle (uses .env; domain root — no BASE_PATH)
npm run build
# Expect: "Compiled successfully" / exit code 0
# If killed / JavaScript heap OOM → see Troubleshooting “npm run build OOM”

# what this does: prove the build output exists
ls -la .next
# Expect: directory with BUILD_ID, server/, static/, etc.

# what this does: make deploy scripts executable for later Steps / Actions
chmod +x scripts/deploy-prod.sh scripts/deploy.sh
ls -la scripts/deploy-prod.sh scripts/deploy.sh
# Expect: -rwxr-xr-x (executable bit set)`,
  },
  {
    id: 'pm2',
    phase: 'Step 9',
    title: 'Start Next.js with PM2',
    summary: 'Process name zigma on port 3000 — same name Actions / deploy-prod.sh restarts. Bind stays localhost; Nginx is public.',
    steps: [
      'cd /var/www/zigma-technologies',
      'pm2 start npm --name zigma -- start',
      'pm2 status — online',
      'curl -I http://127.0.0.1:3000 — 200 or 307/308',
      'pm2 save && pm2 startup (run the printed sudo command as root/deploy with sudo)',
      'pm2 logs zigma --lines 50 — no DB connection errors',
    ],
    checklist: ['PM2 zigma online', ':3000 responds', 'startup on boot', 'no DB errors'],
    code: `# ============================================================
# ON VPS as deploy@200.234.45.106
# ============================================================
cd /var/www/zigma-technologies

# what this does: start the Next.js production server under PM2 name "zigma" (port 3000 from package start)
pm2 start npm --name zigma -- start
# Expect: process "zigma" status online

pm2 status
# Expect: zigma | online | … (not errored / stopped)

# what this does: hit the app directly (bypassing Nginx)
curl -I http://127.0.0.1:3000
# Expect: HTTP/1.1 200 OK or 307/308 redirect — connection refused means app not listening

# what this does: persist process list and enable start-on-boot
pm2 save
pm2 startup
# Expect: pm2 prints a sudo command like: sudo env PATH=… pm2 startup systemd -u deploy --hp /home/deploy
# ACTION: copy-paste and run that exact sudo command, then:
pm2 save
# Expect: [PM2] Successfully saved

# what this does: scan recent logs for MySQL / env mistakes
pm2 logs zigma --lines 50 --nostream
# Expect: Next.js ready on port 3000; NO "Access denied for user" / "ECONNREFUSED 3306"

# Quick health loop (optional):
# curl -s -o /dev/null -w "%{http_code}\\n" http://127.0.0.1:3000/
# Expect: 200 or 307/308`,
  },
  {
    id: 'nginx',
    phase: 'Step 10',
    title: 'Nginx reverse proxy + hosts-file smoke test (BEFORE public DNS)',
    summary:
      'Proxy port 80 → 127.0.0.1:3000. Do NOT run Certbot yet (DNS still points at BigRock’s old IP). Prove the new app with a laptop hosts-file override.',
    steps: [
      'As root/sudo: create /etc/nginx/sites-available/zigma with the HTTP server block (commands below).',
      'ln -sf …/zigma …/sites-enabled/ && rm -f …/sites-enabled/default',
      'nginx -t && systemctl reload nginx',
      'FROM VPS: curl -I -H "Host: zigma-technologies.com" http://127.0.0.1',
      'FROM LAPTOP: edit hosts file as Administrator — add 200.234.45.106 for apex and www.',
      'Browse http://zigma-technologies.com/ — you must see THIS app (not the old BigRock/UrbanVendo site).',
      'Remove hosts lines after testing (or leave them until Step 12 if you prefer).',
      'Leave Certbot for Step 13 after BigRock DNS points here.',
    ],
    checklist: [
      'nginx -t OK',
      'Hosts-file test shows new app (not old vendor site)',
      'PM2 still online',
      'Certbot NOT run yet (unless you already cut over DNS)',
    ],
    warning:
      'If you open https://zigma-technologies.com in a normal browser before Step 12, you still see the OLD BigRock/UrbanVendo site. That is expected. Use hosts-file or curl with Host header to test the VPS.',
    code: `# ============================================================
# ON VPS as root / sudo — write Nginx site (HTTP only)
# ============================================================
sudo tee /etc/nginx/sites-available/zigma >/dev/null <<'EOF'
# Production HTTP vhost — Certbot will add 443 later (Step 13)
server {
    listen 80;
    listen [::]:80;
    server_name zigma-technologies.com www.zigma-technologies.com;

    # Allow CMS / resume uploads
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Required for secure admin cookies once HTTPS is on
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# what this does: enable the site and disable the default welcome page
sudo ln -sf /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
# Expect: syntax is ok ; test is successful

sudo systemctl reload nginx
# Expect: no error

# what this does: prove Nginx → PM2 using the correct Host header (still on VPS)
curl -I -H "Host: zigma-technologies.com" http://127.0.0.1
# Expect: HTTP/1.1 200 or 307/308 from Next.js (not Nginx default welcome HTML)

# ============================================================
# FROM LAPTOP (Windows PowerShell) — hosts-file smoke test
# ============================================================
# what this does: open Notepad as Administrator to edit the hosts file
# 1) Start menu → type Notepad → right-click → Run as administrator
# 2) File → Open → C:\\Windows\\System32\\drivers\\etc\\hosts
#    (set filter to "All Files")
# 3) Add these TWO lines at the bottom (Production IP only):
#    200.234.45.106 zigma-technologies.com
#    200.234.45.106 www.zigma-technologies.com
# 4) Save

# Optional PowerShell one-liner (must Run as Administrator):
# Add-Content -Path "$env:SystemRoot\\System32\\drivers\\etc\\hosts" -Value "200.234.45.106 zigma-technologies.com"
# Add-Content -Path "$env:SystemRoot\\System32\\drivers\\etc\\hosts" -Value "200.234.45.106 www.zigma-technologies.com"

# what this does: flush local DNS cache so the hosts file takes effect
ipconfig /flushdns
# Expect: Successfully flushed the DNS Resolver Cache

# what this does: prove your laptop resolves the domain to Production (hosts override)
nslookup zigma-technologies.com
# Expect: Address: 200.234.45.106  (while hosts override is present)

# Browser: open http://zigma-technologies.com/
# Expect: the NEW Next.js site from this VPS (not the old UrbanVendo site)
# Optional: http://www.zigma-technologies.com/ should also hit the new app

# When finished testing (or after Step 12 DNS cutover), REMOVE the two hosts lines
# and run: ipconfig /flushdns
# Wrong IP in hosts (193.203.161.219) would send you to PreProd — never do that for this test.`,
  },
  {
    id: 'gha',
    phase: 'Step 11',
    title: 'GitHub Actions — selective Production deploy (deploy@200.234.45.106)',
    summary:
      'Production is NEVER auto-deployed on push. master push → Deploy PreProd to JustXSystems VPS (193.203.161.219) only. For Prod: Actions → Deploy Production → confirm_production=DEPLOY_PROD + component toggles → this Zigma VPS.',
    steps: [
      'PART A (laptop): ssh-keygen -t ed25519 -C "gha-zigma-prod" -f ./gha_zigma_prod -N "" (Production key — separate from PreProd gha_zigma_preprod).',
      'PART B: install .pub into deploy@200.234.45.106 authorized_keys; verify whoami → deploy and hostname -I includes 200.234.45.106.',
      'PART B0: ensure scripts/deploy.sh + deploy-prod.sh exist under /var/www/zigma-technologies on THIS VPS.',
      'PART B dry-run: ./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD --dry-run',
      'PART C secrets: PROD_HOST=200.234.45.106 , PROD_SSH_USER=deploy , PROD_SSH_KEY=private key (Set-Clipboard).',
      'Confirm deploy-prod.yml is workflow_dispatch only (no push trigger).',
      'PART D: Actions → Deploy Production → confirm_production=DEPLOY_PROD → choose components → Run workflow → green.',
      'Cleanup: password-manager the private key; delete local key files when done.',
    ],
    checklist: [
      'Actions SSH key works (whoami on 200.234.45.106)',
      'deploy.sh on Zigma VPS',
      'PROD_* secrets set (not PREPROD_*)',
      'Selective Run workflow green',
      'pm2 zigma online',
    ],
    warning:
      'confirm_production must be exactly DEPLOY_PROD. Workflow refuses if PROD_HOST is the JustXSystems IP (193.203.161.219). Never reuse the PreProd keypair.',
    code: `# ============================================================
# PART A — FROM LAPTOP (Windows PowerShell) — Production Actions key ONLY
# ============================================================
cd $env:USERPROFILE\\Downloads

# what this does: create a dedicated GitHub Actions SSH key for Production (do NOT reuse PreProd)
ssh-keygen -t ed25519 -C "gha-zigma-prod" -f .\\gha_zigma_prod -N '""'
# Expect: gha_zigma_prod (private) and gha_zigma_prod.pub (public) in Downloads
# Keep separate from gha_zigma_preprod (JustXSystems / 193.203.161.219)

# ============================================================
# PART B — install public key on Production deploy user
# ============================================================
# what this does: append the Actions public key to deploy authorized_keys on 200.234.45.106
type .\\gha_zigma_prod.pub | ssh deploy@200.234.45.106 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
# Expect: may ask for deploy password once; then silent success

# what this does: prove the key logs into the CORRECT VPS as deploy
ssh -i .\\gha_zigma_prod deploy@200.234.45.106 "whoami && hostname -I"
# Expect: deploy
# Expect: hostname -I includes 200.234.45.106
# WRONG: 193.203.161.219 means you authorized the key on PreProd — fix immediately

# ============================================================
# PART B0 + dry-run — sync scripts and print deploy plan (no changes)
# ============================================================
ssh -i .\\gha_zigma_prod deploy@200.234.45.106 "cd /var/www/zigma-technologies && git fetch origin && git reset --hard origin/master && chmod +x scripts/deploy.sh scripts/deploy-prod.sh && ./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD --dry-run"
# Expect: dry-run prints planned steps; no fatal "No such file" for deploy-prod.sh
# Expect: confirm phrase DEPLOY_PROD accepted

# ============================================================
# PART C — GitHub repository secrets (browser + clipboard)
# ============================================================
# what this does: copy the PRIVATE key into the Windows clipboard for pasting into GitHub
Get-Content .\\gha_zigma_prod -Raw | Set-Clipboard
# Expect: no error; clipboard now holds -----BEGIN OPENSSH PRIVATE KEY----- …

# Browser: https://github.com/JustXSystems/zigma-technologies/settings/secrets/actions
# Create/update:
#   PROD_HOST     = 200.234.45.106
#   PROD_SSH_USER = deploy
#   PROD_SSH_KEY  = paste clipboard (full private key including BEGIN/END lines)
# Do NOT put these into PREPROD_* (those target 193.203.161.219)

# Confirm workflow file is manual-only:
# .github/workflows/deploy-prod.yml → on: workflow_dispatch  (no push:)

# ============================================================
# PART D — selective Run workflow (browser)
# ============================================================
# Open: https://github.com/JustXSystems/zigma-technologies/actions
# → Deploy Production → Run workflow
#   confirm_production = DEPLOY_PROD     (required exact phrase)
#   branch             = master
# Component toggles (fresher cheat-sheet):
#   First full deploy / normal release:
#     sync_code=true  install_deps=true  clear_next=false  build=true
#     restart_pm2=true  db_backup=true  apply_migrations=false  healthcheck=true  dry_run=false
#   Restart-only (config/.env already fixed on server):
#     sync_code=false install_deps=false build=false restart_pm2=true healthcheck=true
#   Code change, node_modules already warm:
#     sync_code=true install_deps=false build=true restart_pm2=true
# Expect: workflow green; on VPS: pm2 status shows zigma online

# Cleanup on laptop after secrets are saved in password manager + GitHub:
# Remove-Item .\\gha_zigma_prod, .\\gha_zigma_prod.pub -ErrorAction SilentlyContinue`,
  },
  {
    id: 'dns',
    phase: 'Step 12',
    title: 'BigRock DNS cutover → 200.234.45.106',
    summary:
      'Point the live domain at Hostinger. Domain registration stays at BigRock. Only change website A records. Do this after hosts-file smoke tests pass (Step 10).',
    steps: [
      'Confirm the new site works via hosts file / VPS curl (Step 10) and PM2 is healthy.',
      'Optional 24h before: at BigRock lower TTL on @ and www A records to 300 seconds.',
      'Log in to https://www.bigrock.com (or the DNS panel if nameservers are UrbanVendo — use whoever answers nslookup -type=NS).',
      'Find DNS management for zigma-technologies.com.',
      'Set A record @ (apex / blank host) → 200.234.45.106',
      'Set A record www → 200.234.45.106',
      'Do NOT change MX, SPF, DKIM, or TXT mail records.',
      'Do NOT delete knowledge of the old A value — rollback IP is 14.195.24.149.',
      'FROM LAPTOP: nslookup via 8.8.8.8 — both apex and www must return 200.234.45.106.',
      'Remove any temporary hosts-file overrides so you see real public DNS.',
      'Proceed to Step 13 (Certbot) once A records resolve to the new IP.',
    ],
    checklist: [
      'A @ → 200.234.45.106',
      'A www → 200.234.45.106',
      'MX unchanged',
      'nslookup shows new IP (not 14.195.24.149)',
    ],
    warning:
      'Changing A records does not transfer the domain. If email uses @zigma-technologies.com, touching MX will break mail. Keep old hosting paid for 7–14 days for rollback to 14.195.24.149.',
    code: `# ============================================================
# BigRock DNS (browser) — records to set
# ============================================================
# Registrar stays BigRock. Only edit website A records:
#   Type A | Host @   (or blank) | Value 200.234.45.106 | TTL 300 (or default)
#   Type A | Host www            | Value 200.234.45.106 | TTL 300 (or default)
#   MX / SPF / DKIM / mail TXT   | LEAVE UNCHANGED
# Rollback (if needed within 7–14 days):
#   Type A | Host @   | Value 14.195.24.149
#   Type A | Host www | Value 14.195.24.149
# Never point Production DNS at PreProd IP 193.203.161.219

# ============================================================
# FROM LAPTOP (Windows PowerShell) — verify public DNS
# ============================================================
# what this does: remove hosts overrides so you test REAL public DNS (edit hosts as Admin)
# Delete any lines with zigma-technologies.com, save, then:
ipconfig /flushdns
# Expect: Successfully flushed the DNS Resolver Cache

# what this does: query Google DNS to bypass ISP cache
nslookup zigma-technologies.com 8.8.8.8
nslookup www.zigma-technologies.com 8.8.8.8
# Expect: Address: 200.234.45.106 for BOTH
# Still 14.195.24.149 → BigRock change not saved or not propagated yet (wait / re-check panel)
# 193.203.161.219 → WRONG (that is PreProd) — fix A records immediately

# Optional continuous check:
# while ($true) { nslookup zigma-technologies.com 8.8.8.8; Start-Sleep -Seconds 30 }

# Browser (after Expect IP is correct): http://zigma-technologies.com/
# Expect: NEW app from Hostinger VPS (HTTP). HTTPS comes in Step 13.`,
  },
  {
    id: 'ssl',
    phase: 'Step 13',
    title: 'HTTPS with Certbot (after DNS points here)',
    summary:
      'Let’s Encrypt needs public DNS for zigma-technologies.com → this VPS (200.234.45.106). Run only after Step 12 nslookup is correct.',
    steps: [
      'Confirm nslookup returns 200.234.45.106 for apex and www.',
      'As root: certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com',
      'Follow prompts (email, agree ToS). Certbot will modify Nginx for 443 and HTTP→HTTPS.',
      'Optional: add www → apex redirect in Nginx if Certbot did not (see Nginx section).',
      'curl -I https://zigma-technologies.com — expect 200/308 and valid cert.',
      'certbot renew --dry-run (renewal timer is installed by default).',
    ],
    checklist: [
      'HTTPS padlock on apex',
      'www also HTTPS',
      'HTTP redirects to HTTPS',
      'renew dry-run OK',
    ],
    code: `# ============================================================
# ON VPS as root / sudo — ONLY after nslookup → 200.234.45.106
# ============================================================
# what this does: last-chance DNS proof from the VPS itself
dig +short zigma-technologies.com @8.8.8.8 || nslookup zigma-technologies.com 8.8.8.8
# Expect: 200.234.45.106
# If still old IP 14.195.24.149 — STOP (Certbot will fail challenge)

# what this does: issue Let’s Encrypt certs and auto-configure Nginx 443
sudo certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com
# Expect: prompts for email + ToS; "Congratulations" / certificates saved
# Expect: Nginx reloaded with SSL

# what this does: prove HTTPS works on apex and www
curl -I https://zigma-technologies.com
curl -I https://www.zigma-technologies.com
# Expect: HTTP/2 200 or 301/308 ; certificate errors = DNS not pointing here or clock skew

# what this does: prove HTTP upgrades to HTTPS
curl -I http://zigma-technologies.com
# Expect: 301/302 Location: https://…

# what this does: prove renewals will work (timer usually already installed)
sudo certbot renew --dry-run
# Expect: dry run success / no renewal failures

# Browser: https://zigma-technologies.com/ — padlock OK
# Admin: https://zigma-technologies.com/admin/login`,
  },
  {
    id: 'admin',
    phase: 'Step 14',
    title: 'Admin bootstrap, security & go-live handoff',
    summary:
      'Seed/login on the live HTTPS URL, rotate passwords, verify forms, keep old host as rollback to 14.195.24.149.',
    steps: [
      'Open https://zigma-technologies.com/admin/login',
      'Fresh DB: Seed default admin from ADMIN_* in .env, then change password under Account.',
      'Imported DB: log in and rotate all admin passwords.',
      'Dashboard → Bootstrap missing seeds if content empty.',
      'Site Settings → contacts, analytics, enquiry notify email.',
      'Submit test enquiry → Enquiries + SMTP.',
      'Confirm /api/public/theme.css and catalog pages (/products, /projects, /services).',
      'Keep BigRock/old hosting active 7–14 days; rollback = restore A records to 14.195.24.149.',
      'After stable: cancel old web hosting only (not the BigRock domain registration).',
      'Confirm master push still only updates PreProd (193.203.161.219); Production stays manual DEPLOY_PROD.',
    ],
    checklist: [
      'Admin HTTPS login OK',
      'Passwords rotated',
      'Enquiry + email OK',
      'Actions deploy verified',
      'Old host retained for rollback window',
    ],
    code: `# ============================================================
# FROM LAPTOP (browser) — go-live checks
# ============================================================
# Open:
#   https://zigma-technologies.com/
#   https://zigma-technologies.com/admin/login
#   https://zigma-technologies.com/products
#   https://zigma-technologies.com/api/public/theme.css
# Expect: site loads over HTTPS; admin login page; theme CSS 200

# Fresh DB seed: use ADMIN_EMAIL / ADMIN_PASSWORD from Production .env once,
# then immediately change password in Admin → Account. Save new password in manager.

# ============================================================
# ON VPS as deploy — final health + process check
# ============================================================
ssh deploy@200.234.45.106
cd /var/www/zigma-technologies
pm2 status
# Expect: zigma online

curl -I https://127.0.0.1 -k -H "Host: zigma-technologies.com" 2>/dev/null || curl -I http://127.0.0.1 -H "Host: zigma-technologies.com"
# Expect: 200/301/308 from the app via Nginx

# what this does: optional DB backup now that go-live started
mkdir -p /var/backups/zigma
mysqldump -u zigmatech_prod -p zigmatech_prod | gzip > /var/backups/zigma/db-$(date +%F)-golive.sql.gz
ls -lh /var/backups/zigma/
# Expect: non-empty .sql.gz file

# ============================================================
# Rollback reminder (BigRock DNS) — only if Production is broken
# ============================================================
# A @   → 14.195.24.149
# A www → 14.195.24.149
# Do NOT point @ / www at PreProd 193.203.161.219
# Domain registration stays at BigRock either way.`,
  },
];

export const PROD_GHA_SECRETS: { name: string; example: string; purpose: string }[] = [
  {
    name: 'PROD_HOST',
    example: '200.234.45.106',
    purpose: 'Zigma Technologies VPS IPv4 only (never the JustXSystems PreProd IP 193.203.161.219)',
  },
  {
    name: 'PROD_SSH_USER',
    example: 'deploy',
    purpose: 'OS user on the Zigma Technologies VPS (never root)',
  },
  {
    name: 'PROD_SSH_KEY',
    example: '-----BEGIN OPENSSH PRIVATE KEY----- … -----END OPENSSH PRIVATE KEY-----',
    purpose: 'Private half of gha_zigma_prod; public half on deploy@200.234.45.106 only',
  },
];

export const PROD_GHA_INPUTS: { name: string; default: string; purpose: string }[] = [
  {
    name: 'confirm_production',
    default: '(required) DEPLOY_PROD',
    purpose:
      'Safety gate — type exactly DEPLOY_PROD every run. Turn this “on” by filling the box; blank or typo → workflow refuses. Protects against accidental Production deploys.',
  },
  {
    name: 'branch',
    default: 'master',
    purpose:
      'Git branch the VPS resets to. Leave master for normal releases. Change only when you intentionally deploy a hotfix branch that was already QA’d on PreProd.',
  },
  {
    name: 'sync_code',
    default: 'true',
    purpose:
      'Turn ON when you need new commits on the VPS (git fetch + checkout + reset --hard). Turn OFF for restart-only or DB-only runs so git is untouched.',
  },
  {
    name: 'install_deps',
    default: 'true',
    purpose:
      'Turn ON after package.json / package-lock.json changes (runs npm ci). Turn OFF when lockfile unchanged and node_modules on the server is already warm — saves several minutes.',
  },
  {
    name: 'clear_next',
    default: 'false',
    purpose:
      'Turn ON when a build is corrupt or you see stale chunks (rm -rf .next before build). Leave OFF for normal releases; clearing forces a full colder rebuild.',
  },
  {
    name: 'build',
    default: 'true',
    purpose:
      'Turn ON for any code, content-component, or dependency change (npm run build). Production .env must NOT set NEXT_PUBLIC_BASE_PATH. Turn OFF with restart-only.',
  },
  {
    name: 'restart_pm2',
    default: 'true',
    purpose:
      'Turn ON whenever the running app should pick up a new build or .env change (pm2 restart zigma). Turn OFF only for dry-run / backup / migration prep with no process bounce.',
  },
  {
    name: 'db_backup',
    default: 'true',
    purpose:
      'Turn ON before risky releases or any migration (mysqldump → /var/backups/zigma/*.sql.gz). Turn OFF only for trivial restart-only when you already have a fresh dump.',
  },
  {
    name: 'apply_migrations',
    default: 'false',
    purpose:
      'Turn ON only when you must apply listed scripts/*.sql on Production. Never leave ON “just in case” — it never applies all migrate-*.sql blindly; you must name files.',
  },
  {
    name: 'migration_files',
    default: '(empty)',
    purpose:
      'Comma-separated filenames when apply_migrations is ON, e.g. migrate-wave3.sql,migrate-newsletter.sql. Leave empty unless you intentionally migrate.',
  },
  {
    name: 'healthcheck',
    default: 'true',
    purpose:
      'Turn ON after restart to curl localhost:3000/ and fail the job if the app is down. Leave ON for almost every real deploy; OFF only for dry-run experiments.',
  },
  {
    name: 'dry_run',
    default: 'false',
    purpose:
      'Turn ON to print the plan on the VPS with zero changes (safe rehearsal). Turn OFF for the real deploy. Still requires confirm_production=DEPLOY_PROD.',
  },
];

export const PROD_GHA_HOW_IT_WORKS = [
  'QA first on PreProd (https://justxsystems.com/zigma-technologies on deploy@193.203.161.219) — auto-deployed on master push.',
  'Operator opens Actions → Deploy Production → Run workflow (never triggered by push).',
  'Types confirm_production = DEPLOY_PROD and toggles only the components needed for this release.',
  'GitHub SSHs to deploy@200.234.45.106 using PROD_* secrets (separate from PREPROD_*).',
  'Runner executes scripts/deploy.sh --env prod with the selected flags on the Zigma Technologies VPS.',
  '.env and untracked uploads stay on that server (never uploaded by Actions).',
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
    title: 'Part A — Create Production Actions SSH keypair',
    detail:
      'ssh-keygen … -f ./gha_zigma_prod. Keep separate from gha_zigma_preprod (JustXSystems VPS).',
  },
  {
    id: 'b',
    where: 'Laptop → Zigma VPS',
    title: 'Part B — Authorize public key on 200.234.45.106',
    detail:
      'Install .pub into deploy authorized_keys. whoami must return deploy; hostname -I includes 200.234.45.106.',
  },
  {
    id: 'b0',
    where: 'Zigma VPS git sync',
    title: 'Part B0 — Ensure deploy.sh exists',
    detail:
      'git fetch && git reset --hard origin/master. ls scripts/deploy.sh scripts/deploy-prod.sh must succeed.',
  },
  {
    id: 'c',
    where: 'GitHub website',
    title: 'Part C — PROD_* repository secrets',
    detail:
      'PROD_HOST=200.234.45.106, PROD_SSH_USER, PROD_SSH_KEY. Confirm deploy-prod.yml is workflow_dispatch only.',
  },
  {
    id: 'd',
    where: 'Actions',
    title: 'Part D — Selective Run workflow',
    detail:
      'confirm_production=DEPLOY_PROD. Example: restart-only → sync off, install off, build off, restart on.',
  },
];

export const PROD_GHA_STEPS = [
  'Part A: create gha_zigma_prod on the laptop (separate from PreProd key).',
  'Part B: install .pub on deploy@200.234.45.106; test whoami.',
  'Part B0: git reset --hard until deploy.sh exists.',
  'Part B dry-run: ./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD --dry-run',
  'Part C: PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY',
  'Part D: Run workflow with confirm_production=DEPLOY_PROD + component toggles → green',
];

export const PROD_ENV_TEMPLATE = `# ============================================================
# Production .env — /var/www/zigma-technologies/.env
# Domain root: https://zigma-technologies.com/  (NO BASE_PATH)
# chmod 600 .env  |  never commit this file
# ============================================================

NODE_ENV=production

# Public canonical URL (apex). Used in sitemap, emails, absolute links.
NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com

# --- MySQL on THIS VPS only (localhost) ---
# DB name/user are BOTH zigmatech_prod (not zigmatech, not zigmatech_preprod)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zigmatech_prod
DB_USER=zigmatech_prod
DB_PASSWORD=<generate-strong-password>

# --- Auth ---
# Generate each with: openssl rand -hex 32
# Cookie name is FIXED in code as zigma_admin_session — do not set COOKIE_NAME
AUTH_SECRET=<unique-prod-secret-min-32-chars>
PREVIEW_SECRET=<unique-preview-secret>

# --- First admin seed only (fresh schema) ---
# Change password immediately after first login under Admin → Account
ADMIN_EMAIL=admin@zigma-technologies.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=Site Admin

# --- Media served from /public/assets ---
MEDIA_BASE_URL=/assets

# --- Enquiry notifications (optional) ---
# Hostinger mailbox, Google Workspace, or other SMTP — see /admin/guide/email
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<mailbox-or-app-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"

# --- Optional Cloudflare Turnstile (leave blank to disable) ---
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# ============================================================
# DO NOT SET on Production (PreProd-only on justxsystems.com):
# NEXT_PUBLIC_BASE_PATH=/zigma-technologies
# ============================================================
`;

export const PROD_NGINX = `# HTTP-only vhost for first bring-up (Step 10).
# Install as /etc/nginx/sites-available/zigma then symlink into sites-enabled.
# Run Certbot ONLY after BigRock A @ and www → 200.234.45.106 (Step 13).
# Certbot will add listen 443 ssl and usually redirect HTTP → HTTPS.

server {
    listen 80;
    listen [::]:80;
    server_name zigma-technologies.com www.zigma-technologies.com;

    # CMS / resume uploads
    client_max_body_size 25M;

    location / {
        # PM2 process name "zigma" listens on localhost:3000
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Required for secure admin session cookies behind TLS
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# After Certbot, optional www → apex redirect (only if not already present):
# server {
#     listen 443 ssl;
#     server_name www.zigma-technologies.com;
#     # ssl_certificate lines managed by Certbot
#     return 301 https://zigma-technologies.com$request_uri;
# }
`;

export const PROD_UPDATE_COMMANDS = `# ============================================================
# Production updates — run as deploy@200.234.45.106
# App: /var/www/zigma-technologies  |  PM2: zigma  |  Port: 3000
# Safety phrase: DEPLOY_PROD  |  Never use PreProd IP 193.203.161.219
# ============================================================

# --- SSH in ---
ssh deploy@200.234.45.106
# Expect: whoami → deploy ; hostname -I includes 200.234.45.106
cd /var/www/zigma-technologies

# ------------------------------------------------------------
# Full Production deploy (same as default Actions toggles)
# sync + npm ci + build + restart + healthcheck (+ DB backup via script defaults)
# ------------------------------------------------------------
./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD
# Expect: exit 0 ; pm2 zigma online

# ------------------------------------------------------------
# Dry-run only (print plan, change nothing) — safe rehearsal
# ------------------------------------------------------------
./scripts/deploy-prod.sh --confirm-prod DEPLOY_PROD --dry-run
# Expect: planned steps printed; no git reset / build performed

# ------------------------------------------------------------
# Restart-only (no git / npm / build) — after .env tweak or stuck process
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --no-sync --no-install --no-build --restart --healthcheck
# Expect: pm2 restart zigma ; healthcheck curl OK

# ------------------------------------------------------------
# Code + build + restart, skip npm ci (node_modules already warm)
# Turn ON when lockfile unchanged
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --sync --no-install --build --restart --healthcheck
# Expect: new commit checked out; build OK; zigma online

# ------------------------------------------------------------
# Sync + install + build + restart (classic release, no migration)
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --sync --install --build --restart --healthcheck --db-backup
# Expect: fresh node_modules; build OK; dump written under /var/backups/zigma

# ------------------------------------------------------------
# Clear .next then full rebuild (corrupt/stale build artifacts)
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --sync --install --clear-next --build --restart --healthcheck
# Expect: .next removed then rebuilt; site healthy

# ------------------------------------------------------------
# Backup DB + apply ONE named migration, then rebuild
# Turn apply_migrations ON only with explicit filenames
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --db-backup --migrations --migration-files migrate-wave3.sql \\
  --sync --install --build --restart --healthcheck
# Expect: .sql.gz backup created; migrate-wave3.sql applied once; app healthy

# ------------------------------------------------------------
# Two migrations in one release
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --db-backup --migrations \\
  --migration-files migrate-wave3.sql,migrate-newsletter.sql \\
  --sync --install --build --restart --healthcheck

# ------------------------------------------------------------
# DB backup only (no code sync) — before manual SQL experiments
# ------------------------------------------------------------
./scripts/deploy.sh --env prod --confirm-prod DEPLOY_PROD \\
  --no-sync --no-install --no-build --no-restart \\
  --db-backup --no-healthcheck
# Expect: /var/backups/zigma/db-*.sql.gz created

# ------------------------------------------------------------
# Manual git sync (when not using the wrapper)
# ------------------------------------------------------------
git fetch origin
git reset --hard origin/master
# Expect: HEAD matches origin/master ; never commit on the VPS

# ------------------------------------------------------------
# Logs & status
# ------------------------------------------------------------
pm2 status
pm2 logs zigma --lines 80
pm2 logs zigma --err --lines 80
curl -I http://127.0.0.1:3000/
# Expect: zigma online ; HTTP 200/307/308

# ------------------------------------------------------------
# GitHub Actions UI equivalents (confirm_production=DEPLOY_PROD always)
# ------------------------------------------------------------
# Full release:     sync=true  install=true  build=true  restart=true  db_backup=true  dry_run=false
# Restart-only:     sync=false install=false build=false restart=true  healthcheck=true
# Warm build:       sync=true  install=false build=true  restart=true
# Migration:        db_backup=true apply_migrations=true migration_files=migrate-….sql + sync/build/restart
# Rehearsal:        dry_run=true (still type DEPLOY_PROD)
`;

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
  'GitHub Actions Deploy Production green (manual selective run → 200.234.45.106)',
  'master push only updates PreProd on JustXSystems VPS (193.203.161.219) — verify that separately',
  'BigRock A @ and www → 200.234.45.106',
  'MX unchanged',
  'Old host 14.195.24.149 retained 7–14 days for rollback',
];

export const PROD_TROUBLESHOOT = [
  {
    symptom: 'Browser still shows the old BigRock/UrbanVendo website',
    fixes: [
      'DNS not cut over yet — expected until Step 12',
      'nslookup zigma-technologies.com 8.8.8.8 — if still 14.195.24.149, wait or fix BigRock A records',
      'Flush local DNS: ipconfig /flushdns ; remove hosts-file overrides',
      'Test VPS directly: curl -I -H "Host: zigma-technologies.com" http://200.234.45.106',
    ],
  },
  {
    symptom: 'SSH lands on the wrong server / PreProd by mistake',
    fixes: [
      'Production is ONLY 200.234.45.106 — PreProd is 193.203.161.219 (different VPS)',
      'Run hostname -I immediately after login; disconnect if you see 193.203.161.219',
      'Check PROD_HOST secret is 200.234.45.106 (not the PreProd IP)',
      'Never copy PreProd authorized_keys / PREPROD_* secrets into Production setup',
    ],
  },
  {
    symptom: 'Cannot SSH to root@200.234.45.106',
    fixes: [
      'VPS Active in hPanel',
      'Reset SSH password/key under VPS → SSH Access',
      'ssh -v root@200.234.45.106 — confirm you are dialing 200.234.45.106',
      'hPanel / UFW allow port 22; fail2ban-client status sshd if locked out',
    ],
  },
  {
    symptom: 'ssh-copy-id: No identities found (on the VPS)',
    fixes: [
      'You ran ssh-copy-id on the server — that is wrong. Keys are generated on the laptop.',
      'Use su - deploy on the VPS, or from PowerShell pipe type …pub | ssh deploy@200.234.45.106 "…authorized_keys…"',
      'See Step 2 / Step 11 laptop PowerShell blocks',
    ],
  },
  {
    symptom: 'Database connection failed / 500 everywhere',
    fixes: [
      'Check DB_* in /var/www/zigma-technologies/.env (DB_NAME=zigmatech_prod, not zigmatech)',
      'systemctl status mysql ; mysql -u zigmatech_prod -p zigmatech_prod -e "SELECT 1;"',
      'pm2 logs zigma --lines 80 — look for Access denied / ECONNREFUSED',
      'Confirm UFW did not open 3306 publicly (should stay localhost-only)',
    ],
  },
  {
    symptom: 'Admin login loop after HTTPS',
    fixes: [
      'Nginx must send X-Forwarded-Proto $scheme (required for secure cookies)',
      'AUTH_SECRET must be stable (do not regenerate after sessions exist unless intentional)',
      'Clear cookies for zigma-technologies.com',
      'Confirm NEXT_PUBLIC_SITE_URL=https://zigma-technologies.com and no BASE_PATH',
    ],
  },
  {
    symptom: 'Assets / links include /zigma-technologies prefix on Production',
    fixes: [
      'NEXT_PUBLIC_BASE_PATH must NOT be set in Production .env (that is PreProd-only)',
      'Remove the line, rebuild: npm run build && pm2 restart zigma',
      'Hard-refresh the browser; confirm you are not looking at justxsystems.com',
    ],
  },
  {
    symptom: 'Certbot fails / connection refused on challenge',
    fixes: [
      'DNS A records must already point to 200.234.45.106 (nslookup 8.8.8.8)',
      'UFW/hPanel firewall allow 80 and 443',
      'Nginx listening on 80; nginx -t ; systemctl status nginx',
      'Do not run Certbot while public DNS still shows 14.195.24.149',
    ],
  },
  {
    symptom: 'Hosts-file test still shows old site',
    fixes: [
      'Confirm hosts lines use 200.234.45.106 (not 14.195.24.149 or 193.203.161.219)',
      'Edit C:\\Windows\\System32\\drivers\\etc\\hosts as Administrator; ipconfig /flushdns',
      'Use http:// (not https://) before Certbot — HTTPS may still hit old CDN/cert',
      'curl -I -H "Host: zigma-technologies.com" http://200.234.45.106 from any machine',
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
      'Confirm file on GitHub master; ls /var/www/zigma-technologies/scripts/',
      'You must be on 200.234.45.106 under /var/www/zigma-technologies',
    ],
  },
  {
    symptom: 'GitHub Actions deploy fails on SSH',
    fixes: [
      'PROD_HOST=200.234.45.106 / PROD_SSH_USER=deploy / PROD_SSH_KEY (not PREPROD_*)',
      'Public key in deploy authorized_keys on the Zigma VPS',
      'ssh -i gha_zigma_prod deploy@200.234.45.106 "whoami" from laptop must work',
      'Do not IP-restrict port 22 against GitHub runners',
    ],
  },
  {
    symptom: 'Workflow refused: confirm_production / wrong host',
    fixes: [
      'Type exactly DEPLOY_PROD (case-sensitive, no extra spaces)',
      'PROD_HOST must be 200.234.45.106 — workflow rejects 193.203.161.219 (JustXSystems PreProd)',
      'Push to master never deploys Production — only PreProd to JustXSystems VPS',
      'Use Actions → Deploy Production → workflow_dispatch (manual Run workflow)',
    ],
  },
  {
    symptom: 'npm run build OOM / process killed',
    fixes: [
      'Add 2G swap: sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile',
      'Make swap permanent in /etc/fstab if needed; then re-run npm run build',
      'Ensure .env exists before build; free -h should show swap available',
    ],
  },
  {
    symptom: 'PM2 zigma keeps restarting / errored',
    fixes: [
      'pm2 logs zigma --lines 100 — fix DB credentials or missing .env',
      'cd /var/www/zigma-technologies && ls .next (must exist — run npm run build)',
      'pm2 delete zigma && pm2 start npm --name zigma -- start && pm2 save',
    ],
  },
  {
    symptom: 'Email / enquiry form does not send',
    fixes: [
      'Set SMTP_* in Production .env; pm2 restart zigma',
      'Do not change MX records when cutting over website A records',
      'See /admin/guide/email for mailbox setup',
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
    a: 'Only after BigRock A records point to 200.234.45.106 and Certbot has issued HTTPS (Steps 12–13). Until then the public domain still shows the old vendor site at 14.195.24.149.',
  },
  {
    q: 'Will changing DNS break email?',
    a: 'Not if you leave MX (and related TXT) unchanged. Only edit website A records for @ and www.',
  },
  {
    q: 'How does GitHub Actions deploy work for Production?',
    a: 'Manual only: Actions → Deploy Production → confirm_production=DEPLOY_PROD → toggle components. SSH target is deploy@200.234.45.106 via PROD_* secrets. Push to master deploys PreProd to JustXSystems VPS only.',
  },
  {
    q: 'Where is PreProd?',
    a: 'Different VPS: deploy@193.203.161.219 (JustXSystems). URL https://justxsystems.com/zigma-technologies/, app dir /var/www/zigma-technologies, PM2 zigma-preprod on :3001. Secrets PREPROD_*. See /admin/guide/justxsystems.',
  },
  {
    q: 'Do Production and PreProd share one VPS?',
    a: 'No. Production is Zigma Technologies VPS 200.234.45.106. PreProd is JustXSystems VPS 193.203.161.219. Separate SSH keys, secrets, databases, and PM2 process names.',
  },
  {
    q: 'Why is there no NEXT_PUBLIC_BASE_PATH in Production?',
    a: 'Production is served at the domain root https://zigma-technologies.com/. BASE_PATH=/zigma-technologies is only for PreProd under justxsystems.com. Setting it on Prod breaks asset URLs.',
  },
  {
    q: 'Why skip migrate-*.sql after schema.sql?',
    a: 'Fresh schema.sql already includes those columns. Re-running migrations causes ERROR 1060 Duplicate column (e.g. admin_notes). Use named migrations later only for incremental Production changes.',
  },
  {
    q: 'What about COOKIE_NAME in older docs?',
    a: 'The app hardcodes cookie zigma_admin_session in src/lib/auth.ts. Do not set COOKIE_NAME in .env.',
  },
  {
    q: 'What is the rollback if go-live fails?',
    a: 'At BigRock set A @ and www back to 14.195.24.149. Keep old hosting paid 7–14 days. Do not point the domain at PreProd (193.203.161.219).',
  },
  {
    q: 'Which GitHub secrets are Production vs PreProd?',
    a: 'Production: PROD_HOST=200.234.45.106, PROD_SSH_USER=deploy, PROD_SSH_KEY (gha_zigma_prod). PreProd: PREPROD_* → 193.203.161.219. Never mix them.',
  },
  {
    q: 'Can I test the new site before changing BigRock DNS?',
    a: 'Yes — Step 10 hosts-file override on your laptop: 200.234.45.106 zigma-technologies.com (and www). Use http:// until Certbot runs after public DNS cutover.',
  },
  {
    q: 'What PM2 process name and port does Production use?',
    a: 'PM2 name zigma on port 3000 (localhost). Nginx terminates public HTTP/HTTPS. PreProd uses zigma-preprod on :3001 on a different VPS.',
  },
];

export const PROD_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'howto', label: 'How to use this guide' },
  { id: 'laptop', label: 'Laptop setup' },
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
