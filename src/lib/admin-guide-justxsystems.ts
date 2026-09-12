/**
 * PreProd on JustXSystems VPS: https://justxsystems.com/zigma-technologies/ — subdirectory (basePath).
 *
 * PAGE IMPORT NOTE: This file exports JX_HOWTO and JX_LAPTOP used by TOC ids `howto` / `laptop`.
 * The page at src/app/(admin)/admin/guide/justxsystems/page.tsx must import and render them
 * (sections id="howto" and id="laptop") — not only the original JX_* exports.
 */

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
  localQualityGates: `# On your laptop (PowerShell or Git Bash), from the cloned repo:
npm run typecheck
# Optional but recommended before push:
# npm run build`,
  stagingBuildProof: `# On JustXSystems VPS (${PREPROD_VPS.sshDeploy}), after .env has BASE_PATH:
cd ${PREPROD.appDir}
npm ci
npm run build
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Expect: /zigma-technologies`,
};

/** How to use this guide — copy-paste friendly for freshers. */
export const JX_HOWTO = [
  'Read Overview + Two-VPS architecture once so you know PreProd ≠ Production.',
  'Complete Laptop prep (Git, PowerShell OpenSSH, password manager) before any SSH.',
  'Work Blind-follow steps in order (Step 1 → last). Do not skip the hostname -I check.',
  'Every Commands block is meant to be pasted. Lines starting with # are comments — paste them too (the shell ignores them) or skip them; do not invent different IPs or paths.',
  'Lines that say "# Expect: …" tell you what good output looks like. If you see something else, stop and fix that step.',
  'Replace only placeholders like REPLACE_WITH_STRONG_PASSWORD or <generate-strong-password>. Never change 193.203.161.219 to the Production IP.',
  'Store every password and private key in a password manager. Do not commit .env or private keys to Git.',
  'When a step says “as root” vs “as deploy”, switch users first (su - deploy or a new ssh session).',
  'After the server is live, use Updates + FAQ for day-2 deploys and common mistakes (especially Nginx proxy_pass).',
];

/** Laptop prep before touching the JustXSystems VPS. */
export const JX_LAPTOP = {
  steps: [
    'Open Windows PowerShell (not Command Prompt). Confirm OpenSSH client: ssh -V.',
    'Install Git for Windows if missing: https://git-scm.com/download/win — then git --version.',
    'Optional but useful: clone the repo on the laptop for local typecheck before you push to master.',
    'Create or unlock a password manager vault (Bitwarden, 1Password, etc.) for root, deploy, MySQL, AUTH_SECRET, ADMIN_PASSWORD, and GHA private keys.',
    'Confirm you can open Hostinger hPanel for the JustXSystems VPS (SSH password / console if root key login fails).',
    'Confirm GitHub access to JustXSystems/zigma-technologies (org member or collaborator; ability to add Deploy keys and Actions secrets).',
    'Write down (in the password manager only): PreProd IP 193.203.161.219. Write a sticky note to yourself: DO NOT USE 200.234.45.106 (Production).',
    'On the laptop, run quality gates in the repo before the first master push that should deploy PreProd.',
  ],
  code: `# === Windows PowerShell — laptop only (not the VPS) ===

# Check OpenSSH client is installed
ssh -V
# Expect: OpenSSH_for_Windows_... (any recent version is fine)

# Check Git
git --version
# Expect: git version 2.x...

# Optional: clone on laptop for typecheck / reading scripts
cd $env:USERPROFILE\\Documents
git clone ${GITHUB.cloneHttps}
cd zigma-technologies
npm ci
npm run typecheck
# Expect: no TypeScript errors

# Memorize / store — PreProd ONLY:
#   SSH:  ${PREPROD_VPS.sshDeploy}
#   URL:  ${PREPROD.publicUrlSlash}
# DO NOT USE (Production — different VPS):
#   ${PROD_VPS.sshDeploy}`,
};

export const JX_PREREQS = [
  '1. Windows laptop with PowerShell 5+ (or Windows Terminal). Use PowerShell for all ssh / type / Get-Content commands in this guide.',
  '2. OpenSSH Client enabled (Settings → Apps → Optional features → OpenSSH Client, or ssh -V already works).',
  '3. Git for Windows installed (git --version). Needed for laptop clone and for understanding what the VPS will pull.',
  '4. Password manager ready — you will generate many secrets (MySQL, AUTH_SECRET, ADMIN_PASSWORD, SSH keys). Never paste them into Slack/email/git.',
  '5. Hostinger hPanel access for the JustXSystems VPS that owns IPv4 ' +
    PREPROD_VPS.ipv4 +
    ' (VPS → SSH Access / Console). You need the root password or console if first login fails.',
  '6. Ability to SSH eventually as ' +
    PREPROD_VPS.sshDeploy +
    ' on the JustXSystems VPS — NOT ' +
    PROD_VPS.sshDeploy +
    ' (Production; do not use).',
  '7. GitHub access to JustXSystems/zigma-technologies: clone private repo, add a Deploy key (optional), and write repository Secrets (Actions).',
  '8. Permission to edit Nginx for justxsystems.com on the JustXSystems VPS without deleting the existing root site (homepage must keep working).',
  '9. MySQL will run on the JustXSystems VPS only — dedicated PreProd DB ' +
    PREPROD.dbName +
    ' / user ' +
    PREPROD.dbUser +
    ' (never reuse Production DB credentials).',
  '10. GitHub Actions secrets you will create later: PREPROD_HOST, PREPROD_SSH_USER, PREPROD_SSH_KEY (separate from any PROD_* secrets).',
  '11. Laptop quality gates before relying on auto-deploy: npm run typecheck (and ideally npm run build) in a local clone.',
  '12. Browser access to https://justxsystems.com/ (existing site) so you can confirm it still works after adding the /zigma-technologies location.',
  '13. Time window: first-time setup is often 60–120 minutes if packages install cleanly; have the root password from hPanel before Step 2.',
  '14. Know the hard facts by heart: PreProd URL ' +
    PREPROD.publicUrlSlash +
    '; app dir ' +
    PREPROD.appDir +
    '; PM2 ' +
    PREPROD.pm2Name +
    ' on port ' +
    PREPROD.appPort +
    '; workflow “Deploy PreProd” on master push.',
];

export const JX_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Two-VPS architecture' },
  { id: 'howto', label: 'How to use this guide' },
  { id: 'laptop', label: 'Laptop prep' },
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
    id: 'confirm-vps',
    phase: 'Step 1',
    title: 'Confirm you are on the JustXSystems VPS (not Production)',
    summary:
      'Wrong VPS is the #1 beginner failure. Before installing anything, prove the machine’s IPv4 is 193.203.161.219. If you see 200.234.45.106, disconnect immediately — that is Production (do not use for this guide).',
    steps: [
      'What to do: From PowerShell, SSH to either root@193.203.161.219 or deploy@193.203.161.219 (whichever password/key you already have from hPanel).',
      'Why: Both VPS boxes may use the same app path /var/www/zigma-technologies. Path alone does not tell you which environment you are on — only the IP does.',
      'What success looks like: hostname -I includes 193.203.161.219 and does NOT show 200.234.45.106.',
      'Also check: ss/grep for ports 3000/3001 so you know what is already listening (PreProd should use 3001).',
      'If you cannot SSH yet: open hPanel → JustXSystems VPS → SSH Access / Browser terminal, then run hostname -I there before continuing.',
    ],
    checklist: [
      'hostname -I includes 193.203.161.219',
      'hostname -I does NOT include 200.234.45.106',
      'You know you will never SSH to deploy@200.234.45.106 for PreProd',
    ],
    warning: `Production is ${PROD_VPS.sshDeploy} — do not use. Same folder name on that box is Production, not PreProd.`,
    code: `# From Windows PowerShell — try deploy first if the user already exists
ssh ${PREPROD_VPS.sshDeploy}
# If that fails (user unknown / permission denied), try root instead:
# ssh ${PREPROD_VPS.sshRoot}

# On the VPS — prove identity
hostname -I
# Expect: output contains ${PREPROD_VPS.ipv4}
# If you see ${PROD_VPS.ipv4} → WRONG BOX — type exit immediately

whoami
# Expect: deploy  OR  root  (either is fine for this check)

ss -tlnp | grep -E ':3000|:3001' || true
# Expect: often empty on a fresh box; PreProd will use :3001 later
# :3000 on THIS box is unrelated to Zigma Production (Prod lives on another VPS)`,
  },
  {
    id: 'root-ssh',
    phase: 'Step 2',
    title: 'First root SSH from Windows PowerShell (password or key)',
    summary:
      'You need a working root session to create the deploy user, set the firewall, and install packages. Hostinger usually gives a root password in hPanel → VPS → SSH Access.',
    steps: [
      'What to do: In PowerShell run ssh root@193.203.161.219. Accept the host key fingerprint the first time (type yes).',
      'Why: deploy may not exist yet. Root is required for adduser, ufw, apt, and mysql-server.',
      'Password login: when prompted, paste the root password from hPanel (paste in PowerShell is often right-click). Characters will not echo — that is normal.',
      'What success looks like: prompt like root@…:~# and whoami prints root.',
      'If login fails: reset the root password in hPanel, or use the web console, then retry. Do not try Production IP.',
      'Optional hardening after login: run passwd to set a new root password and save it in the password manager.',
    ],
    checklist: [
      'ssh root@193.203.161.219 succeeds',
      'whoami → root',
      'Root password stored in password manager',
      'Still on IP 193.203.161.219 (re-check hostname -I)',
    ],
    warning:
      'Never enable password auth experiments on Production. Stay on 193.203.161.219. Do not disable SSH until deploy key login works.',
    code: `# Windows PowerShell
ssh ${PREPROD_VPS.sshRoot}
# First time — Expect: "Are you sure you want to continue connecting" → type: yes
# Then paste root password from hPanel (no characters shown while typing)

# On the VPS as root:
whoami
# Expect: root

hostname -I
# Expect: includes ${PREPROD_VPS.ipv4}

# Optional: rotate root password now and save in password manager
# passwd

# Quick OS sanity
hostnamectl | head -n 5
# Expect: Ubuntu (or similar Linux) — exact version may vary`,
  },
  {
    id: 'deploy-user',
    phase: 'Step 3',
    title: 'Create deploy user, sudo, and authorized_keys from your laptop',
    summary:
      'Humans and GitHub Actions should SSH as deploy, not root. Create the user on the VPS, grant sudo, then from your laptop install your public key into ~/.ssh/authorized_keys.',
    steps: [
      'What to do (as root on VPS): apt update; create user deploy with a strong password; usermod -aG sudo deploy; test sudo with su - deploy.',
      'Why: Least privilege. CI will use a separate key later (gha_zigma_preprod); your laptop key is for day-to-day SSH.',
      'What success looks like: su - deploy works; sudo -v asks for deploy’s password and succeeds; exit returns to root.',
      'From laptop (PowerShell): if you have no key yet, ssh-keygen an ed25519 key. Pipe the .pub file into deploy’s authorized_keys over SSH.',
      'Verify: ssh deploy@193.203.161.219 without typing a password (key auth). whoami → deploy.',
      'Do NOT run ssh-copy-id as root on the VPS — that looks for keys on the server and fails with “No identities found”. Always push the key FROM the laptop.',
    ],
    checklist: [
      'User deploy exists and is in group sudo',
      'su - deploy && sudo -v works',
      'Laptop public key in /home/deploy/.ssh/authorized_keys',
      'Passwordless ssh deploy@193.203.161.219 from PowerShell',
    ],
    warning:
      'ssh-copy-id / key install must run on your laptop targeting deploy@193.203.161.219. Never append keys while confused about which VPS you are on.',
    code: `# === AS ROOT on JustXSystems VPS ===
apt update && apt upgrade -y
# Expect: packages update without fatal errors

apt install -y curl ca-certificates gnupg ufw
# Expect: packages installed

# Create deploy (you will be prompted for full name — Enter is fine; set a strong password)
adduser deploy
usermod -aG sudo deploy

su - deploy
sudo -v
# Expect: asks for deploy password, then returns silently (success)
exit
# Back to root

# === FROM LAPTOP PowerShell (new window) — human SSH key ===
# Create a key only if you do not already have one:
# ssh-keygen -t ed25519 -C "laptop-zigma-preprod" -f $env:USERPROFILE\\.ssh\\id_ed25519_zigma_preprod -N '""'

# If using the default id_ed25519:
type $env:USERPROFILE\\.ssh\\id_ed25519.pub | ssh ${PREPROD_VPS.sshRoot} "mkdir -p /home/deploy/.ssh && chown deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys"
# Expect: password prompt for root once, then no errors

# Test key login as deploy
ssh ${PREPROD_VPS.sshDeploy}
whoami
# Expect: deploy
hostname -I
# Expect: includes ${PREPROD_VPS.ipv4}
exit`,
  },
  {
    id: 'ufw',
    phase: 'Step 4',
    title: 'UFW firewall — allow only 22, 80, 443',
    summary:
      'Lock the VPS so the public internet can reach SSH and HTTPS/HTTP only. MySQL (3306) and Node (3001) stay localhost-only behind Nginx.',
    steps: [
      'What to do (as root or deploy with sudo): allow OpenSSH, allow 80/tcp, allow 443/tcp, then enable UFW.',
      'Why: A fresh VPS may have no firewall. Opening only 22/80/443 reduces accidental exposure of MySQL or debug ports.',
      'What success looks like: ufw status verbose shows 22, 80, 443 allowed; 3306 is NOT listed as allowed.',
      'Also check hPanel → VPS → Firewall (if present) and allow TCP 22, 80, 443 there too — cloud firewall + UFW both matter.',
      'Keep your current SSH session open until you confirm a second SSH login still works after enable.',
    ],
    checklist: [
      'ufw status shows active',
      '22/80/443 allowed',
      '3306 not publicly allowed',
      'Second SSH session still connects',
    ],
    warning:
      'If you enable UFW without allowing OpenSSH first, you can lock yourself out. Always ufw allow OpenSSH before ufw --force enable.',
    code: `# As root OR: sudo -s  (from deploy)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
# Expect: Status: active
# Expect: 22/tcp (OpenSSH), 80/tcp, 443/tcp ALLOW
# Expect: NO 3306/tcp in the allow list

# Optional: confirm from a SECOND PowerShell window that SSH still works
# ssh ${PREPROD_VPS.sshDeploy}`,
  },
  {
    id: 'stack',
    phase: 'Step 5',
    title: 'Install Node 20, git, nginx, mysql-server, pm2 (skip if already present)',
    summary:
      'Install the runtime stack on the JustXSystems VPS only. Each command block checks whether the tool already exists so re-runs are safer.',
    steps: [
      'What to do: Install Node.js 20 via NodeSource if node is missing or older than 20; install git, nginx, mysql-server via apt; install pm2 globally with npm.',
      'Why: Next.js needs Node 20; Nginx terminates HTTPS for justxsystems.com; MySQL holds PreProd CMS data; PM2 keeps zigma-preprod running.',
      'What success looks like: node -v starts with v20; git --version works; nginx and mysql are active; pm2 -v prints a version.',
      'Ensure /var/www is owned by deploy so later git clone does not need root.',
      'Skip-if-exists: if a command already reports the right version, you can skip reinstalling that piece.',
    ],
    checklist: [
      'node -v → v20.x',
      'git available',
      'nginx active',
      'mysql active',
      'pm2 -v works',
      '/var/www owned by deploy:deploy',
    ],
    warning:
      'Install only on 193.203.161.219. Do not paste these into a Production SSH session (200.234.45.106 — do not use).',
    code: `# As root or sudo on JustXSystems VPS

# --- Node 20 (skip if already v20) ---
node -v 2>/dev/null || true
# If missing or not v20.x:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
# Expect: v20.x.x

# --- git, nginx, mysql (apt is idempotent) ---
apt install -y git nginx mysql-server
systemctl enable --now nginx mysql
systemctl is-active nginx
# Expect: active
systemctl is-active mysql
# Expect: active
git --version
# Expect: git version ...

# --- PM2 global ---
npm install -g pm2
pm2 -v
# Expect: a version number (e.g. 5.x)

# --- App parent directory ---
mkdir -p /var/www
chown deploy:deploy /var/www
ls -ld /var/www
# Expect: drwxr-xr-x ... deploy deploy ... /var/www`,
  },
  {
    id: 'mysql',
    phase: 'Step 6',
    title: 'Create MySQL database and user (zigmatech_preprod)',
    summary:
      'Generate a strong password with openssl, create database zigmatech_preprod and user zigmatech_preprod@localhost, grant privileges, and test SELECT 1. Save the password for .env.',
    steps: [
      'What to do: Run openssl rand -base64 32 (or similar) and store the result in your password manager as DB_PASSWORD.',
      'Why: PreProd must never share Production DB credentials. Localhost-only user reduces remote attack surface.',
      'What success looks like: CREATE statements succeed; mysql -u zigmatech_preprod -p … -e "SELECT 1;" returns 1.',
      'Optional: sudo mysql_secure_installation on a brand-new MySQL install (follow prompts; keep root auth working for admin).',
      'Confirm MySQL listens on 127.0.0.1 only (not public 3306).',
    ],
    checklist: [
      'DB zigmatech_preprod exists',
      'User zigmatech_preprod@localhost can SELECT 1',
      'DB password saved in password manager',
      '3306 not exposed publicly (UFW)',
    ],
    warning:
      'Never reuse Production (zigmatech_prod) passwords. Replace REPLACE_WITH_STRONG_PASSWORD with your generated secret before running CREATE USER.',
    code: `# Generate DB password (copy into password manager)
openssl rand -base64 32
# Expect: a long random string — that becomes DB_PASSWORD

# Create DB + user (paste YOUR password instead of REPLACE_WITH_STRONG_PASSWORD)
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS ${PREPROD.dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${PREPROD.dbUser}'@'localhost' IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON ${PREPROD.dbName}.* TO '${PREPROD.dbUser}'@'localhost';
FLUSH PRIVILEGES;
"
# Expect: no ERROR lines

# Test login (will prompt for the password you just set)
mysql -u ${PREPROD.dbUser} -p ${PREPROD.dbName} -e "SELECT 1 AS ok;"
# Expect: ok / 1

# Bind check (should be localhost / 127.0.0.1)
sudo ss -tlnp | grep 3306 || true
# Expect: 127.0.0.1:3306 or similar — NOT 0.0.0.0:3306 if you hardened bind-address`,
  },
  {
    id: 'clone',
    phase: 'Step 7',
    title: 'Clone JustXSystems/zigma-technologies into /var/www/zigma-technologies',
    summary:
      'As deploy, put the GitHub repo at /var/www/zigma-technologies. Prefer a read-only Deploy Key (SSH). HTTPS + Personal Access Token (PAT) is documented as the fallback.',
    steps: [
      'What to do (Option A — SSH deploy key): generate ~/.ssh/github_zigma_preprod_ro on the VPS, add the .pub as a GitHub Deploy key (read-only), configure SSH config, then git clone.',
      'What to do (Option B — HTTPS + PAT): git clone https://github.com/JustXSystems/zigma-technologies.git and when asked for password, paste a GitHub PAT with repo read access (not your GitHub account password).',
      'Why: The VPS needs source code for npm ci, build, and deploy-preprod.sh. Deploy keys avoid putting a powerful PAT on the server long-term.',
      'What success looks like: ${PREPROD.appDir} exists; git checkout master works; scripts/deploy-preprod.sh is present; deploy owns the tree.',
      'If the directory already exists from a partial attempt: do not clone into a non-empty folder — either finish pull there or move the old folder aside.',
    ],
    checklist: [
      `Repo at ${PREPROD.appDir}`,
      'Branch master',
      'scripts/deploy-preprod.sh present',
      'Owned by deploy',
    ],
    warning:
      'Deploy key is for GitHub → this VPS only. Do not put Production deploy keys here. Never commit the private key.',
    code: `# === AS deploy@${PREPROD_VPS.ipv4} ===
cd /var/www

# ---------- OPTION A: SSH Deploy Key (recommended) ----------
ssh-keygen -t ed25519 -C "zigma-preprod-git-readonly" -f ~/.ssh/github_zigma_preprod_ro -N ""
# Expect: created private + .pub files

cat ~/.ssh/github_zigma_preprod_ro.pub
# Expect: one line starting with ssh-ed25519
# → GitHub → JustXSystems/zigma-technologies → Settings → Deploy keys → Add deploy key
#    Title: justxsystems-preprod-ro | Allow write access: OFF | paste the .pub

cat >> ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_zigma_preprod_ro
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config ~/.ssh/github_zigma_preprod_ro

ssh -T git@github.com
# Expect: Hi JustXSystems/zigma-technologies! You've successfully authenticated... (or similar)
# Exit code may be 1 even on success — look for the "Hi ..." message

git clone ${GITHUB.cloneSsh} ${PREPROD.appDir}
# Expect: Cloning into '/var/www/zigma-technologies'...

# ---------- OPTION B: HTTPS + PAT (fallback) ----------
# git clone ${GITHUB.cloneHttps} ${PREPROD.appDir}
# Username: your GitHub username
# Password: paste a PAT (Settings → Developer settings → Personal access tokens) with repo read
# Prefer storing PAT in password manager; consider deploy key instead for long-term

cd ${PREPROD.appDir}
git checkout master
git rev-parse --short HEAD
# Expect: a short commit hash

ls -la package.json scripts/deploy-preprod.sh scripts/deploy.sh scripts/schema.sql
# Expect: all listed files exist`,
  },
  {
    id: 'env',
    phase: 'Step 8',
    title: 'Create .env with BASE_PATH (openssl secrets + chmod 600)',
    summary:
      'PreProd is a subdirectory deploy. NEXT_PUBLIC_BASE_PATH and NEXT_PUBLIC_SITE_URL must be exact and are baked in at build time. Generate AUTH_SECRET / PREVIEW_SECRET with openssl rand -hex 32.',
    steps: [
      'What to do: cd to the app dir, copy .env.example → .env, chmod 600 .env, then edit with nano (or paste the template from the .env section of this guide).',
      'Why: Without BASE_PATH=/zigma-technologies the app serves wrong asset URLs and the public site breaks under the path.',
      'What success looks like: grep shows NEXT_PUBLIC_BASE_PATH=/zigma-technologies (no trailing slash); SITE_URL is https://justxsystems.com/zigma-technologies; .env mode is -rw------- (600); git check-ignore sees .env.',
      'Generate two different secrets: openssl rand -hex 32 for AUTH_SECRET and again for PREVIEW_SECRET. Put DB_PASSWORD from Step 6.',
      'Set PORT=3001 to match PM2 / Nginx. ADMIN_* values are only for first-time admin seed — rotate after login.',
    ],
    checklist: [
      '.env mode 600',
      'NEXT_PUBLIC_BASE_PATH=/zigma-technologies',
      'NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies',
      'PORT=3001',
      'DB_NAME/DB_USER=zigmatech_preprod',
      'AUTH_SECRET and PREVIEW_SECRET are unique 64-hex strings',
    ],
    warning:
      'Changing BASE_PATH later requires a full rebuild (npm run build / deploy-preprod.sh). Never point SITE_URL at zigma-technologies.com for PreProd.',
    code: `# As deploy
cd ${PREPROD.appDir}
cp .env.example .env
chmod 600 .env

# Generate secrets (run twice — different values)
openssl rand -hex 32
# Expect: 64 hex chars → paste as AUTH_SECRET
openssl rand -hex 32
# Expect: different 64 hex chars → paste as PREVIEW_SECRET

# Edit the file (paste the exact template from the ".env (exact)" section of this guide)
nano .env
# Save in nano: Ctrl+O Enter, exit: Ctrl+X

# Proof checks
grep -E '^NEXT_PUBLIC_BASE_PATH=|^NEXT_PUBLIC_SITE_URL=|^PORT=|^DB_NAME=' .env
# Expect:
# NEXT_PUBLIC_BASE_PATH=/zigma-technologies
# NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies
# PORT=3001
# DB_NAME=zigmatech_preprod

stat -c '%a %n' .env
# Expect: 600 .env

git check-ignore -v .env
# Expect: a rule showing .env is ignored (not tracked)`,
  },
  {
    id: 'schema',
    phase: 'Step 9',
    title: 'Load schema.sql and create upload directories',
    summary:
      'Fresh PreProd DB: import scripts/schema.sql once. Do not run migrate-*.sql after a fresh schema (duplicate column errors). Create public upload dirs for resumes/documents.',
    steps: [
      'What to do: mysql … < scripts/schema.sql using the PreProd DB user; mkdir upload paths; chmod 755 on public/assets.',
      'Why: Without tables the app cannot log in or serve CMS content. Upload dirs must exist for form attachments.',
      'What success looks like: SHOW TABLES lists many tables; no fatal import errors (warnings about duplicates only if you re-ran schema).',
      'Alternative: if promoting content from another env, use npm run db:import -- <export-dir> --force instead of empty schema (advanced).',
      'Skip ALL scripts/migrate-*.sql on a brand-new schema.sql install.',
    ],
    checklist: [
      'schema.sql imported',
      'SHOW TABLES returns rows',
      'public/assets/uploads/resumes and documents exist',
      'migrate-*.sql NOT applied on fresh install',
    ],
    warning:
      'ERROR 1060 Duplicate column usually means schema already applied — stop re-running migrate scripts. Wrong DB name (zigmatech vs zigmatech_preprod) is a common mistake.',
    code: `cd ${PREPROD.appDir}

# Import schema (prompts for DB password)
mysql -u ${PREPROD.dbUser} -p ${PREPROD.dbName} < scripts/schema.sql
# Expect: no ERROR (empty output is OK)

# Do NOT run: mysql ... < scripts/migrate-*.sql   on a fresh schema.sql

mysql -u ${PREPROD.dbUser} -p ${PREPROD.dbName} -e "SHOW TABLES;"
# Expect: a list of tables (pages, users, etc.)

mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
ls -la public/assets/uploads
# Expect: resumes/ and documents/ directories

# Optional content import from laptop export (advanced):
# npm run db:import -- storage/exports/YOUR_EXPORT_DIR --force`,
  },
  {
    id: 'first-deploy',
    phase: 'Step 10',
    title: 'First deploy-preprod.sh + verify basePath in routes-manifest',
    summary:
      'Preferred path: chmod +x the deploy scripts and run ./scripts/deploy-preprod.sh (sync may no-op on first run if already on master; install + build + restart). Then prove basePath is baked into .next.',
    steps: [
      'What to do: From ${PREPROD.appDir}, make scripts executable and run deploy-preprod.sh. If PM2 is not started yet, the script starts/restarts zigma-preprod.',
      'Why: This is the same entrypoint GitHub Actions will call on every master push.',
      'What success looks like: build finishes; node -e routes-manifest prints /zigma-technologies; pm2 status shows zigma-preprod online.',
      'Manual fallback if the wrapper fails early: npm ci && npm run build, then verify basePath the same way.',
      'If build fails on missing env: re-open Step 8 and fix .env, then re-run.',
    ],
    checklist: [
      'deploy-preprod.sh completed (exit 0)',
      'basePath in routes-manifest is /zigma-technologies',
      `PM2 ${PREPROD.pm2Name} online (or ready to start in next step)`,
      'PORT 3001 listening on localhost',
    ],
    warning:
      'If routes-manifest basePath is "" or missing, BASE_PATH was wrong at build time — fix .env and rebuild before touching Nginx.',
    code: `cd ${PREPROD.appDir}
chmod +x scripts/deploy.sh scripts/deploy-preprod.sh

# Full PreProd deploy (same script Actions uses)
./scripts/deploy-preprod.sh
# Expect: sync/install/build/restart logs without ERROR
# Expect: healthcheck curl success against localhost path (script prints plan)

# Prove subdirectory basePath is baked into the build
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Expect: /zigma-technologies

# Manual fallback (only if you need to isolate build):
# npm ci
# npm run build
# node -e "console.log(require('./.next/routes-manifest.json').basePath)"

ss -tlnp | grep 3001 || true
# Expect: 127.0.0.1:3001 or *:3001 listening after PM2 start

pm2 status
# Expect: ${PREPROD.pm2Name}  | online`,
  },
  {
    id: 'pm2-boot',
    phase: 'Step 11',
    title: 'PM2 persist — save + startup (systemd)',
    summary:
      'Make zigma-preprod survive reboots. pm2 save snapshots the process list; pm2 startup prints a systemd command you must run with sudo.',
    steps: [
      'What to do: If the app is not running yet, pm2 start npm --name zigma-preprod -- start from the app dir. Then pm2 save and pm2 startup.',
      'Why: Without startup, a VPS reboot leaves PreProd down until someone SSHs in.',
      'What success looks like: pm2 status online; curl -I http://127.0.0.1:3001/zigma-technologies returns HTTP 200/307/308; after running the printed sudo env PATH=… command, systemd unit is installed.',
      'Copy the exact sudo command pm2 prints — do not invent a different one.',
      'Check logs for DB connection errors and fix .env if needed.',
    ],
    checklist: [
      'zigma-preprod online',
      'pm2 save done',
      'pm2 startup systemd command executed',
      'curl localhost:3001/zigma-technologies responds',
    ],
    warning:
      'Process name must be zigma-preprod (not zigma). Wrong name breaks Actions restarts and this guide’s health checks.',
    code: `cd ${PREPROD.appDir}

# Only if not already running:
# pm2 start npm --name ${PREPROD.pm2Name} -- start

pm2 status ${PREPROD.pm2Name}
# Expect: status online

curl -sI http://127.0.0.1:${PREPROD.appPort}/zigma-technologies | head -n 5
# Expect: HTTP/1.1 200  OR  307/308 (redirect) — not connection refused

pm2 save
# Expect: successfully saved

pm2 startup
# Expect: a line starting with: sudo env PATH=...
# COPY that entire sudo line and paste/run it now
# Expect: after sudo: Command successfully executed / startup script exists

pm2 logs ${PREPROD.pm2Name} --lines 40
# Expect: no repeated "ECONNREFUSED" / MySQL access denied
# Stop logs with Ctrl+C`,
  },
  {
    id: 'nginx',
    phase: 'Step 12',
    title: 'Nginx location /zigma-technologies (no trailing URI on proxy_pass)',
    summary:
      'Insert a location block into the existing justxsystems.com HTTPS server. Proxy to 127.0.0.1:3001 with NO path after the port. Keep the current homepage location / untouched.',
    steps: [
      'What to do: Find the active site file under sites-enabled (often a justxsystems.com config). Open it and insert the location block from this guide inside the server { } that listens on 443 for justxsystems.com.',
      'Why: Visitors hit https://justxsystems.com/zigma-technologies/; Nginx must forward that path to Node without stripping /zigma-technologies.',
      'Critical rule: proxy_pass http://127.0.0.1:3001;  — correct. proxy_pass http://127.0.0.1:3001/; — WRONG (trailing URI strips basePath → blank CSS / 404).',
      'What success looks like: nginx -t OK; systemctl reload nginx; justxsystems.com homepage still works; /zigma-technologies/ reaches the Next app.',
      'If multiple server blocks exist, edit the one that already serves the live HTTPS site (look for ssl_certificate and server_name justxsystems.com).',
    ],
    checklist: [
      'location /zigma-technologies present in HTTPS server',
      'proxy_pass has NO trailing path/URI',
      'nginx -t successful',
      'nginx reloaded',
      'https://justxsystems.com/ still shows existing JustX site',
    ],
    warning:
      'Trailing URI on proxy_pass is the classic PreProd break. Do not replace the entire server block — only ADD the location.',
    code: `# Find which config is enabled
ls -la /etc/nginx/sites-enabled/
# Expect: symlink(s) for justxsystems.com (name may vary)

# Search for the SSL server_name
sudo grep -R "server_name" /etc/nginx/sites-enabled/ -n
sudo grep -R "justxsystems.com" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ -n || true

# Edit the correct file (example name — use what you found):
# sudo nano /etc/nginx/sites-available/justxsystems.com

# Paste INSIDE server { ... } for justxsystems.com :443 — exact block also in "Nginx location" section:
#     # Serve CMS media from disk (runtime uploads). MUST be above the proxy location.
#     location ^~ /zigma-technologies/assets/ {
#         alias /var/www/zigma-technologies/public/assets/;
#         access_log off;
#         expires 7d;
#         add_header Cache-Control "public";
#     }
#     location /zigma-technologies {
#         proxy_pass http://127.0.0.1:3001;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#         client_max_body_size 25M;
#     }

# Prove there is no trailing slash URI on proxy_pass
sudo grep -n "proxy_pass http://127.0.0.1:3001" /etc/nginx/sites-enabled/* /etc/nginx/sites-available/* 2>/dev/null | head
# Expect: ...3001;   NOT  ...3001/;

sudo nginx -t
# Expect: syntax is ok / test is successful

sudo systemctl reload nginx
# Expect: no error output

curl -sI https://justxsystems.com/ | head -n 5
# Expect: HTTP 200/301/302 — existing site still up

curl -sI https://justxsystems.com/zigma-technologies/ | head -n 8
# Expect: HTTP 200 or 307/308 from the Next app (not 404 from old static site)`,
  },
  {
    id: 'smoke',
    phase: 'Step 13',
    title: 'Browser smoke tests + admin seed',
    summary:
      'Validate the public PreProd URL, theme CSS, admin login seed, and that the JustX homepage is untouched. Rotate the seeded admin password after first login.',
    steps: [
      'What to do: Open https://justxsystems.com/zigma-technologies/ in a browser — homepage should load (not a raw Nginx 404).',
      'Open /zigma-technologies/api/public/theme.css — should be text/css, not HTML error.',
      'Open /zigma-technologies/admin/login — Seed default admin (uses ADMIN_* from .env), log in, then change password under Account.',
      'On Dashboard (as admin): Bootstrap missing seeds if content is empty.',
      'Confirm https://justxsystems.com/ still shows the original JustXSystems site.',
      'What success looks like: PreProd app usable under the path; admin session works; root site unchanged.',
    ],
    checklist: [
      'PreProd homepage OK',
      'theme.css returns CSS',
      'Admin login + seed OK',
      'Admin password rotated',
      'justxsystems.com root site OK',
    ],
    warning:
      'If CSS 404s or the page looks unstyled, re-check BASE_PATH rebuild and Nginx proxy_pass (no trailing URI).',
    code: `# From laptop PowerShell — quick HTTP checks
curl.exe -sI ${PREPROD.publicUrlSlash}
# Expect: HTTP/1.1 200  or  308/307

curl.exe -sI ${PREPROD.publicUrl}/api/public/theme.css
# Expect: content-type: text/css (or similar) and HTTP 200

curl.exe -sI ${PREPROD.adminUrl}
# Expect: HTTP 200

curl.exe -sI https://justxsystems.com/
# Expect: HTTP 200 — existing JustX homepage

# Browser checklist (manual):
# 1) ${PREPROD.publicUrlSlash}
# 2) ${PREPROD.adminUrl}  → Seed default admin → login
# 3) Account → change password (save in password manager)
# 4) Dashboard → Bootstrap missing seeds (if empty CMS)
# 5) https://justxsystems.com/ unchanged`,
  },
  {
    id: 'gha',
    phase: 'Step 14',
    title: 'GitHub Actions — gha_zigma_preprod key + PREPROD_* secrets + Run workflow',
    summary:
      'Create a dedicated CI keypair on the laptop, authorize it for deploy on the JustXSystems VPS, add PREPROD_HOST / PREPROD_SSH_USER / PREPROD_SSH_KEY in GitHub, then run Deploy PreProd (or push master).',
    steps: [
      'PART A (laptop PowerShell): ssh-keygen -t ed25519 -f .\\gha_zigma_preprod — empty passphrase for Actions.',
      'PART B: pipe .pub into deploy@193.203.161.219 authorized_keys; verify ssh -i .\\gha_zigma_preprod … whoami → deploy and hostname -I includes 193.203.161.219.',
      'PART C (GitHub UI): Repo → Settings → Secrets and variables → Actions → New repository secret for each PREPROD_*.',
      'PREPROD_HOST = 193.203.161.219 ; PREPROD_SSH_USER = deploy ; PREPROD_SSH_KEY = full private key including BEGIN/END lines.',
      'PART D: Actions → Deploy PreProd → Run workflow (branch master). Or push a commit to master (auto-deploy).',
      'What success looks like: workflow green; SSH job reaches JustXSystems VPS; pm2 zigma-preprod still online afterward.',
      'Cleanup: store private key in password manager; delete local gha_zigma_preprod files when no longer needed on disk.',
    ],
    checklist: [
      'gha_zigma_preprod key works (whoami=deploy on 193.203.161.219)',
      'PREPROD_HOST / PREPROD_SSH_USER / PREPROD_SSH_KEY set',
      'Secrets are NOT copied into PROD_*',
      'Deploy PreProd workflow green',
    ],
    warning: `Workflow must refuse / you must never set PREPROD_HOST to ${PROD_VPS.ipv4} (Production). Keep gha_zigma_preprod separate from any Production key.`,
    code: `# === Laptop PowerShell — PreProd CI key ONLY ===
cd $env:USERPROFILE\\Downloads
ssh-keygen -t ed25519 -C "gha-zigma-preprod" -f .\\gha_zigma_preprod -N '""'
# Expect: two files: gha_zigma_preprod and gha_zigma_preprod.pub

type .\\gha_zigma_preprod.pub | ssh ${PREPROD_VPS.sshDeploy} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
# Expect: may ask for deploy password once if key auth not default yet

ssh -i .\\gha_zigma_preprod ${PREPROD_VPS.sshDeploy} "whoami && hostname -I"
# Expect: deploy
# Expect: hostname includes ${PREPROD_VPS.ipv4}  (NOT ${PROD_VPS.ipv4})

# Dry-run remote deploy script
ssh -i .\\gha_zigma_preprod ${PREPROD_VPS.sshDeploy} "cd ${PREPROD.appDir} && ./scripts/deploy-preprod.sh --dry-run"
# Expect: prints deploy plan and exits without mutating

# Copy private key to clipboard for GitHub secret
Get-Content .\\gha_zigma_preprod -Raw | Set-Clipboard

# === GitHub UI click path ===
# 1) Open ${GITHUB.repo}
# 2) Settings → Secrets and variables → Actions
# 3) New repository secret → Name: PREPROD_HOST → Secret: ${PREPROD_VPS.ipv4} → Add
# 4) New repository secret → Name: PREPROD_SSH_USER → Secret: deploy → Add
# 5) New repository secret → Name: PREPROD_SSH_KEY → paste clipboard (full private key) → Add
# 6) Actions → Deploy PreProd → Run workflow → Branch: master → Run workflow
# Expect: job green; remote deploy-preprod.sh runs

# Optional: trigger by push
# git push origin master
# Expect: Actions "Deploy PreProd" starts automatically`,
  },
  {
    id: 'day2',
    phase: 'Step 15',
    title: 'Day-2 updates — push master or SSH redeploy',
    summary:
      'After the first successful setup, most updates are: merge to master (Actions auto-deploys) or SSH and run deploy-preprod.sh. Use selective flags when you only need restart or migrations.',
    steps: [
      'Default path: merge to master → GitHub Actions builds a PreProd release tarball in CI → SCP → scripts/apply-release.sh (parameterized extract/restart/health/preserve-uploads).',
      'If Actions times out on dial tcp :22, Hostinger/UFW is blocking GitHub — open TCP 22 or use workflow Deploy PreProd (self-hosted).',
      'SSH path (laptop): still supported via scripts/deploy-preprod.sh for emergency git-based rebuilds on the box.',
      'Selective examples: workflow_dispatch toggles apply_release / restart_pm2 / preserve_uploads / db_backup / migrations.',
      'Always confirm hostname -I still shows 193.203.161.219 before running destructive git reset on a box.',
      'What success looks like: workflow green; smoke URL OK; pm2 zigma-preprod online; asset healthcheck 200.',
    ],
    checklist: [
      'Know push-to-master auto path',
      'Know SSH redeploy path',
      'Know where selective flags are documented (Updates section)',
      'Never run PreProd deploys on Production IP',
    ],
    code: `# Auto (laptop): push master
# git push origin master
# → Actions → Deploy PreProd → JustXSystems VPS only

# Manual SSH full redeploy
ssh ${PREPROD_VPS.sshDeploy}
hostname -I
# Expect: ${PREPROD_VPS.ipv4}
cd ${PREPROD.appDir}
./scripts/deploy-preprod.sh
pm2 status ${PREPROD.pm2Name}
# Expect: online

# See "Updates" section for full selective flag examples`,
  },
];

export const JX_ENV = `# PreProd .env — save as ${PREPROD.appDir}/.env then: chmod 600 .env
# Generate secrets on the VPS:
#   openssl rand -hex 32   → AUTH_SECRET
#   openssl rand -hex 32   → PREVIEW_SECRET  (must be different)
#   openssl rand -base64 32 → DB_PASSWORD (or reuse the password from Step 6)

NODE_ENV=production
PORT=${PREPROD.appPort}

# REQUIRED for subdirectory hosting — no trailing slash on BASE_PATH
NEXT_PUBLIC_BASE_PATH=/zigma-technologies
NEXT_PUBLIC_SITE_URL=https://justxsystems.com/zigma-technologies

# MySQL on JustXSystems VPS (localhost only)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${PREPROD.dbName}
DB_USER=${PREPROD.dbUser}
DB_PASSWORD=<generate-strong-password>

# Auth (cookie name is fixed in code as zigma_admin_session — do not invent COOKIE_NAME)
AUTH_SECRET=<unique-preprod-secret-openssl-rand-hex-32>
PREVIEW_SECRET=<unique-preview-secret-openssl-rand-hex-32>

# First admin seed only — change password after first login at /admin
ADMIN_EMAIL=admin@justxsystems.com
ADMIN_PASSWORD=<strong-one-time-password>
ADMIN_NAME=PreProd Admin

# Media from /public/assets (with basePath the app prefixes correctly)
MEDIA_BASE_URL=/assets

# Optional enquiry email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Zigma PreProd <noreply@justxsystems.com>"

# Optional Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Do NOT copy Production DB_* or AUTH_SECRET here
# Do NOT set SITE_URL to https://zigma-technologies.com on this VPS`;

export const JX_NGINX = `# Insert inside the existing HTTPS server { ... } for justxsystems.com
# Find file: ls /etc/nginx/sites-enabled/  then sudo nano <that-file>
# Do NOT delete location / for the current JustX homepage.
#
# CRITICAL: proxy_pass must be exactly http://127.0.0.1:${PREPROD.appPort}
#           with NO trailing slash and NO extra URI path.
# BAD:  proxy_pass http://127.0.0.1:${PREPROD.appPort}/;
# BAD:  proxy_pass http://127.0.0.1:${PREPROD.appPort}/zigma-technologies;

    # --- Zigma PreProd on JustXSystems VPS ---
    # Runtime CMS uploads: serve public/assets from disk (Next production may 404 new files).
    location ^~ /zigma-technologies/assets/ {
        alias /var/www/zigma-technologies/public/assets/;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

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
    }

# After saving:
#   sudo nginx -t && sudo systemctl reload nginx
# Prove homepage + PreProd:
#   curl -sI https://justxsystems.com/ | head -n 5
#   curl -sI https://justxsystems.com/zigma-technologies/ | head -n 8`;

export const JX_GHA_SECRETS: { name: string; example: string; purpose: string }[] = [
  {
    name: 'PREPROD_HOST',
    example: PREPROD_VPS.ipv4,
    purpose: 'JustXSystems VPS IPv4 only — never Production 200.234.45.106',
  },
  {
    name: 'PREPROD_SSH_USER',
    example: 'deploy',
    purpose: 'OS user on JustXSystems VPS (never root for Actions)',
  },
  {
    name: 'PREPROD_SSH_KEY',
    example: '-----BEGIN OPENSSH PRIVATE KEY----- …',
    purpose: 'Private half of gha_zigma_preprod; public half in deploy authorized_keys on JustXSystems VPS only',
  },
];

export const JX_GHA_HOW = [
  'Create laptop keypair: ssh-keygen -t ed25519 -C "gha-zigma-preprod" -f .\\gha_zigma_preprod -N \'""\' (PowerShell). Keep this key separate from any Production gha_zigma_prod key.',
  'Install the .pub into deploy@193.203.161.219 authorized_keys (type .\\gha_zigma_preprod.pub | ssh deploy@193.203.161.219 "… cat >> ~/.ssh/authorized_keys …").',
  'Verify: ssh -i .\\gha_zigma_preprod deploy@193.203.161.219 "whoami && hostname -I" → deploy and 193.203.161.219 (not 200.234.45.106).',
  'GitHub → JustXSystems/zigma-technologies → Settings → Secrets and variables → Actions → New repository secret:',
  '  PREPROD_HOST = 193.203.161.219',
  '  PREPROD_SSH_USER = deploy',
  '  PREPROD_SSH_KEY = entire private key file (BEGIN…END), pasted from Get-Content .\\gha_zigma_preprod -Raw',
  'Do NOT put these values into PROD_HOST / PROD_SSH_USER / PROD_SSH_KEY.',
  'Actions → Deploy PreProd → Run workflow (branch master), or push any commit to master (auto-deploy).',
  'Remote job SSHs as deploy to the JustXSystems VPS and runs scripts/deploy-preprod.sh inside /var/www/zigma-technologies.',
  'Manual Run workflow can toggle sync / install / build / restart / clear .next / healthcheck. Push events use the full default set.',
  'Production workflow and Zigma VPS (200.234.45.106) are never invoked by Deploy PreProd.',
];

export const JX_VERIFY = [
  { url: PREPROD.publicUrlSlash, expect: 'Homepage under /zigma-technologies/ (styled, not blank)' },
  { url: `${PREPROD.publicUrl}/api/public/theme.css`, expect: 'HTTP 200 · text/css' },
  { url: PREPROD.adminUrl, expect: 'Admin login · seed then rotate password' },
  { url: 'https://justxsystems.com/', expect: 'Existing JustX site still OK (untouched root)' },
  {
    url: PROD.publicUrlSlash,
    expect: `Served from different VPS (${PROD_VPS.ipv4}) — do not use for this guide`,
  },
];

export const JX_UPDATE = `# ============================================================
# Day-2 updates — JustXSystems PreProd ONLY
# Always confirm: hostname -I includes ${PREPROD_VPS.ipv4}
# Do NOT run these on ${PROD_VPS.sshDeploy} (Production)
# ============================================================

# --- A) Automatic (preferred) ---
# On laptop: merge/push to master
# git push origin master
# → GitHub Actions "Deploy PreProd" → SSH ${PREPROD_VPS.sshDeploy} → ${PREPROD.script}

# --- B) Full SSH redeploy (same defaults as Actions push) ---
ssh ${PREPROD_VPS.sshDeploy}
hostname -I
# Expect: ${PREPROD_VPS.ipv4}
cd ${PREPROD.appDir}
chmod +x scripts/deploy.sh scripts/deploy-preprod.sh
./scripts/deploy-preprod.sh
pm2 status ${PREPROD.pm2Name}
pm2 logs ${PREPROD.pm2Name} --lines 50

# --- C) Selective flags via deploy-preprod.sh (forwards to deploy.sh --env preprod) ---

# Dry-run — print plan only
./scripts/deploy-preprod.sh --dry-run

# Restart only (no git / npm / build) — e.g. after fixing something outside the bundle
./scripts/deploy-preprod.sh --no-sync --no-install --no-build --restart --healthcheck

# Pull code + rebuild + restart, skip npm ci (node_modules already warm)
./scripts/deploy-preprod.sh --sync --no-install --build --restart --healthcheck

# Pull + npm ci + rebuild + restart, wipe .next first (corrupt cache)
./scripts/deploy-preprod.sh --sync --install --clear-next --build --restart --healthcheck

# DB backup + apply one migration file, then full build
./scripts/deploy-preprod.sh \\
  --db-backup --migrations --migration-files migrate-wave3.sql \\
  --sync --install --build --restart --healthcheck

# Equivalent explicit form using deploy.sh directly
./scripts/deploy.sh --env preprod --sync --install --build --restart --healthcheck

# Help for all flags
./scripts/deploy.sh --help

# --- D) Quick health after any update ---
curl -sI http://127.0.0.1:${PREPROD.appPort}/zigma-technologies | head -n 5
curl -sI ${PREPROD.publicUrlSlash} | head -n 5
node -e "console.log(require('./.next/routes-manifest.json').basePath)"
# Expect: /zigma-technologies`;

export const JX_FAQ = [
  {
    q: 'Is PreProd on the same VPS as Production?',
    a: `No. PreProd is ${PREPROD_VPS.sshDeploy} (JustXSystems). Production is ${PROD_VPS.sshDeploy} (Zigma Technologies) — do not use that IP for this guide. Separate secrets, DBs, Nginx, and PM2 names.`,
  },
  {
    q: 'How do I know I am on the right machine?',
    a: `Run hostname -I. You must see ${PREPROD_VPS.ipv4}. If you see ${PROD_VPS.ipv4}, type exit immediately — that is Production.`,
  },
  {
    q: 'Is PreProd a DNS subdomain?',
    a: 'No — it is a subdirectory path deploy: justxsystems.com/zigma-technologies with NEXT_PUBLIC_BASE_PATH=/zigma-technologies (no trailing slash). Not preprod.justxsystems.com.',
  },
  {
    q: 'What happens when I push to master?',
    a: 'Only “Deploy PreProd” runs — CI builds a standalone release with NEXT_PUBLIC_BASE_PATH=/zigma-technologies, SCPs the tarball, then apply-release.sh on the JustXSystems VPS (PREPROD_* secrets). Production is a separate manual workflow on the Zigma VPS.',
  },
  {
    q: 'Homepage blank / CSS 404 under /zigma-technologies',
    a: 'Usually (1) NEXT_PUBLIC_BASE_PATH missing at build time — fix .env and rebuild; prove with node -e "console.log(require(\'./.next/routes-manifest.json\').basePath)" expecting /zigma-technologies; or (2) Nginx proxy_pass has a trailing URI. Use proxy_pass http://127.0.0.1:3001; with no path after the port.',
  },
  {
    q: 'ssh-copy-id says No identities found',
    a: 'You ran it on the VPS. Generate/install keys from your laptop PowerShell and pipe the .pub into deploy’s authorized_keys (see Step 3).',
  },
  {
    q: 'Permission denied (publickey) for deploy@193.203.161.219',
    a: 'Confirm the public key is in /home/deploy/.ssh/authorized_keys, permissions are 700 on .ssh and 600 on authorized_keys, and you are using the matching private key (ssh -i …). Fallback: ssh root@193.203.161.219 from hPanel password and fix authorized_keys.',
  },
  {
    q: 'MySQL Access denied for user zigmatech_preprod',
    a: 'Re-check DB_PASSWORD in .env matches CREATE USER. Test: mysql -u zigmatech_preprod -p zigmatech_preprod -e "SELECT 1;". Ensure DB_HOST=localhost.',
  },
  {
    q: 'pm2 shows zigma instead of zigma-preprod',
    a: 'Wrong process name — stop/delete the wrong process and start with --name zigma-preprod (or re-run deploy-preprod.sh on the JustXSystems VPS). Production’s process name zigma belongs on the other VPS.',
  },
  {
    q: 'justxsystems.com homepage broke after Nginx edit',
    a: 'You likely overwrote location / or broke the SSL server block. Restore from backup/snapshot if needed; add only location /zigma-technologies and keep the original root location. nginx -t before every reload.',
  },
  {
    q: 'GitHub Actions dial tcp :22 i/o timeout / auto-deploy never finishes',
    a: 'GitHub’s cloud runners cannot open SSH to the VPS (Hostinger firewall / UFW allowlist). Opening TCP 22 from Anywhere (hPanel + ufw allow OpenSSH) fixes SCP of the CI release tarball. Alternative: install a self-hosted runner on the VPS and use “Deploy PreProd (self-hosted)”. Building in CI alone does not bypass a closed port 22.',
  },
  {
    q: 'GitHub Actions fails host check / wrong IP',
    a: `PREPROD_HOST must be ${PREPROD_VPS.ipv4}. If you pasted ${PROD_VPS.ipv4}, fix the secret. Also confirm PREPROD_SSH_KEY matches the public key on the JustXSystems deploy user.`,
  },
  {
    q: 'How do I promote PreProd → Production?',
    a: `QA on PreProd first. Production is a different VPS (${PROD_VPS.sshDeploy}). Use Actions → Deploy Production with confirm_production=DEPLOY_PROD (see /admin/guide/hostinger-prod). Optionally db:export from PreProd and db:import on Prod after backup — never point PreProd secrets at Prod.`,
  },
  {
    q: 'Do I need Certbot for PreProd?',
    a: 'Usually no separate Certbot step — justxsystems.com already has HTTPS. You only add a location block inside the existing SSL server. If HTTPS is missing for the whole domain, fix SSL for justxsystems.com first (out of scope of BASE_PATH), then add the location.',
  },
];
