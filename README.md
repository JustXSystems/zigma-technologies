# Zigma Technologies — Developer & Deployment Guide

Corporate-grade reference for engineers, QA, and DevOps operating the Zigma Technologies marketing platform.

| Item | Value |
|------|-------|
| **Application** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Database** | MySQL 8.x (`zigmatech` schema) |
| **Admin portal** | `/admin` |
| **Public site** | `/` |
| **Production host** | Hostinger (VPS or Node-enabled hosting) |
| **Operator docs** | [`ADMIN.md`](./ADMIN.md) · in-app guide at `/admin/guide` |

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Architecture overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Repository structure](#4-repository-structure)
5. [Local development setup](#5-local-development-setup-step-by-step)
6. [Database setup (local)](#6-database-setup-local)
7. [Environment variables](#7-environment-variables)
8. [First run & admin bootstrap](#8-first-run--admin-bootstrap)
9. [Day-to-day development workflow](#9-day-to-day-development-workflow)
10. [Quality gates before merge/deploy](#10-quality-gates-before-mergedeploy)
11. [Environment strategy (DEV → UAT → PROD)](#11-environment-strategy-dev--uat--prod)
12. [Hostinger: what you need before deploying](#12-hostinger-what-you-need-before-deploying)
13. [MySQL on Hostinger (detailed)](#13-mysql-on-hostinger-detailed)
14. [Deploy to UAT on Hostinger](#14-deploy-to-uat-on-hostinger)
15. [Deploy to PROD on Hostinger](#15-deploy-to-prod-on-hostinger)
16. [Deployment method A — VPS + PM2 + Nginx (recommended)](#16-deployment-method-a--vps--pm2--nginx-recommended)
17. [Deployment method B — hPanel Node.js Web App](#17-deployment-method-b--hpanel-nodejs-web-app)
18. [Database migration between environments](#18-database-migration-between-environments)
19. [SSL, domains & DNS](#19-ssl-domains--dns)
20. [Post-deployment checklist](#20-post-deployment-checklist)
21. [Rollback procedure](#21-rollback-procedure)
22. [Monitoring & maintenance](#22-monitoring--maintenance)
23. [Troubleshooting](#23-troubleshooting)
24. [Security checklist](#24-security-checklist)
25. [Related documentation](#25-related-documentation)
26. [Glossary](#26-glossary)

---

## 1. What this project is

Zigma Technologies is a **full-stack marketing CMS** for a B2B engineering company (Solar EPC, UPS, BESS, EV charging, industrial power).

| Surface | URL | Purpose |
|---------|-----|---------|
| **Public website** | `https://www.example.com/` | Marketing pages, catalog, resources, forms |
| **Admin control portal** | `https://www.example.com/admin` | Content editors & admins manage CMS data |
| **Partner portal** | `https://www.example.com/partner` | Optional dealer document portal |
| **API (public)** | `/api/public/*` | Read-only content + form submissions |
| **API (admin)** | `/api/admin/*` | Protected CRUD (JWT cookie required) |

**Important:** This is **not** a static HTML site anymore. The legacy files under `public/assets/uploads/index.html` are reference/archive material. The live site is rendered by Next.js from MySQL content.

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / CDN                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │   Next.js 16 App Router     │
              │   (Node.js process)         │
              ├─────────────────────────────┤
              │  (site)/*   Public pages    │
              │  (admin)/*  Admin portal    │
              │  /api/public/*  Forms/read  │
              │  /api/admin/*   Protected   │
              │  src/proxy.ts   Auth gate   │
              └──────────────┬──────────────┘
                             │ mysql2 pool
              ┌──────────────┴──────────────┐
              │   MySQL (zigmatech DB)      │
              │   pages, catalog, leads…    │
              └─────────────────────────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | React 19, CSS (`globals.css`), minimal Tailwind |
| Backend | Next.js Route Handlers (`src/app/api/**`) |
| Database | MySQL via `mysql2` (`src/lib/db.ts`) |
| Auth | JWT in httpOnly cookie `zigma_admin_session` (7 days) |
| Config store | `theme_settings` JSON + `css_overrides` (Theme Studio) |
| Email | Nodemailer (optional SMTP) |
| Edge middleware | `src/proxy.ts` — admin gate, redirects, upload blocking |

**Key design rule:** Marketing copy, navigation, catalog items, and theme tokens live in **MySQL**, not in React source code. Code deploys bring features; content deploys happen via admin or database import.

---

## 3. Prerequisites

Install these on your machine before starting.

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | **20 LTS** or **22 LTS** | Required. Check with `node -v` |
| **npm** | 10+ | Ships with Node |
| **Git** | Latest | Clone & branch workflow |
| **MySQL** | 8.0+ | Local: MySQL Server, Docker, or XAMPP/WAMP |
| **MySQL client** | Any | `mysql` CLI or MySQL Workbench |
| **Code editor** | VS Code / Cursor | Recommended |

### Optional but useful

- **MySQL Workbench** or **DBeaver** — visual DB management
- **Postman** — API testing
- **SSH client** — PuTTY (Windows) or built-in terminal — for Hostinger VPS

### Accounts & access (ask your team lead)

- Git repository read/write access
- Hostinger hPanel credentials (UAT and PROD separately)
- SSH key for VPS (if using VPS deployment)
- SMTP credentials (for enquiry email notifications)
- Cloudflare Turnstile keys (optional captcha)

---

## 4. Repository structure

```
zigma-technologies/
├── src/
│   ├── app/
│   │   ├── (site)/          # Public marketing routes
│   │   ├── (admin)/admin/   # Admin control portal
│   │   └── api/             # REST route handlers
│   ├── components/          # React UI (Header, Footer, modals…)
│   └── lib/                 # DB, auth, CMS helpers, seeds
├── public/
│   └── assets/
│       ├── images/          # Static & CMS media (committed)
│       ├── uploads/         # Visitor uploads (resumes, documents — NOT in git)
│       └── …
├── scripts/
│   ├── schema.sql           # Fresh database schema
│   ├── migrate-*.sql        # Incremental DB upgrades
│   ├── db-export.mjs        # Export DB + media for UAT/PROD
│   └── db-import.mjs        # Import snapshot to target DB
├── .env.example             # Template — copy to .env
├── ADMIN.md                 # Operator / module reference
├── package.json
└── README.md                # This file
```

| Path | Who touches it |
|------|----------------|
| `src/app/(site)/` | Frontend devs — new public pages |
| `src/app/(admin)/` | Full-stack devs — admin UI |
| `src/lib/*-seed.ts` | Devs — default content for seeds |
| `public/assets/images/` | Designers + admin Media library |
| `scripts/` | DevOps / senior devs — schema & migrations |
| `.env` | **Never commit.** Per-environment secrets |

---

## 5. Local development setup (step-by-step)

These steps assume **Windows, macOS, or Linux**. Commands use bash-style syntax; PowerShell alternatives are noted where different.

### Step 1 — Clone the repository

```bash
git clone <repository-url> zigma-technologies
cd zigma-technologies
```

### Step 2 — Install Node dependencies

```bash
npm install
```

This installs Next.js, React, `mysql2`, and all other packages listed in `package.json`.

### Step 3 — Create your local environment file

```bash
cp .env.example .env
```

Edit `.env` with your local MySQL credentials (see [Section 7](#7-environment-variables)).

### Step 4 — Create the local MySQL database

Connect to MySQL as root (or an admin user):

```sql
CREATE DATABASE IF NOT EXISTS zigmatech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'zigmatech'@'localhost' IDENTIFIED BY 'devpassword';
GRANT ALL PRIVILEGES ON zigmatech.* TO 'zigmatech'@'localhost';
FLUSH PRIVILEGES;
```

> Use strong passwords even locally if your machine is shared.

### Step 5 — Apply the database schema

**Linux / macOS / Git Bash:**

```bash
mysql -u zigmatech -p zigmatech < scripts/schema.sql
```

**Windows PowerShell:**

```powershell
Get-Content scripts/schema.sql -Raw | mysql -u zigmatech -p zigmatech
```

### Step 6 — Start the development server

```bash
npm run dev
```

Open:

| URL | Expected result |
|-----|-----------------|
| http://localhost:3000 | Public homepage (may show "Loading…" until CMS is seeded) |
| http://localhost:3000/admin/login | Admin login screen |

> **Port in use?** Next.js will offer port 3001 automatically. Update `NEXT_PUBLIC_SITE_URL` if you use a non-default port.

### Step 7 — Verify the site loads

Open http://localhost:3000 and confirm the homepage responds. If the CMS is empty, seed from `/admin` after logging in.

---

## 6. Database setup (local)

### Fresh install

Run `scripts/schema.sql` once on an empty database named `zigmatech`.

### Upgrading an existing database

If you pull new code and the team added migrations, run them **in this order** (skip any already applied):

```bash
mysql -u zigmatech -p zigmatech < scripts/migrate-enquiry-notes.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-newsletter.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-redirects.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-enquiry-subject.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-hero.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-appearance.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-case-study.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-catalog-categories.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-resource-posts.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-testimonials.sql
mysql -u zigmatech -p zigmatech < scripts/migrate-wave3.sql
```

When in doubt, ask a senior dev or check git history for new `scripts/migrate-*.sql` files.

---

## 7. Environment variables

Copy `.env.example` → `.env` locally. On Hostinger, set the same keys in hPanel **Environment Variables** or a server-side `.env` file (never commit it).

### Required

| Variable | Example | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | MySQL hostname |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `zigmatech` | MySQL username |
| `DB_PASSWORD` | *(secret)* | MySQL password |
| `DB_NAME` | `zigmatech` | Database name |
| `AUTH_SECRET` | *(long random string)* | Signs admin JWT cookies — **unique per environment** |
| `ADMIN_EMAIL` | `admin@company.com` | First admin account (seed) |
| `ADMIN_PASSWORD` | *(strong password)* | First admin password (seed only) |
| `ADMIN_NAME` | `Site Admin` | Display name for seeded admin |

### Strongly recommended

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.zigma-technologies.com` | Canonical URLs, sitemap, Open Graph |
| `PREVIEW_SECRET` | *(random string)* | Draft page preview tokens (defaults to `AUTH_SECRET`) |

### Optional — email notifications

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | Mail server hostname |
| `SMTP_PORT` | Usually `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address, e.g. `"Zigma <noreply@domain.com>"` |

### Optional — security & media

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile (public forms) |
| `TURNSTILE_SECRET_KEY` | Turnstile server verification |
| `MEDIA_BASE_URL` | Default `/assets` — rarely changed |

### Generate secrets (run locally)

```bash
# Linux / macOS / Git Bash
openssl rand -base64 32

# Node (all platforms)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use **different** `AUTH_SECRET` and `PREVIEW_SECRET` values for DEV, UAT, and PROD.

---

## 8. First run & admin bootstrap

After `npm run dev` and schema import:

### 1. Seed the default admin user

1. Go to **http://localhost:3000/admin/login**
2. Click **Seed default admin** (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`)
3. Sign in with those credentials

### 2. Bootstrap CMS content (admin role)

1. Open **http://localhost:3000/admin** (Dashboard)
2. Click **Bootstrap missing seeds** (runs all missing seeds in one pass)

Or seed individually from each module (Pages → Seed homepage, Navigation → Seed header/footer, Inventory → Seed per type, etc.).

### 3. Configure the site

| Step | Module | Action |
|------|--------|--------|
| 1 | **Site Settings** | Company name, phone, email, address, analytics IDs |
| 2 | **Site Copy** (admin) | Marketing strings, feature flags |
| 3 | **Navigation** | Seed header/footer, adjust menus |
| 4 | **Theme Studio** (admin) | Brand colours / publish theme CSS |
| 5 | **Media** | Upload logo, hero images if needed |

### 4. Smoke test

- [ ] Homepage loads with hero, stats, sections
- [ ] `/products`, `/projects`, `/services` show catalog items
- [ ] Contact form submits → appears in **Enquiries**
- [ ] `/admin` stats reflect content counts
- [ ] Change admin password under **Account**

Full module reference: [`ADMIN.md`](./ADMIN.md) or in-app **Guide** at `/admin/guide`.

---

## 9. Day-to-day development workflow

```bash
# Start dev server (Turbopack — default)
npm run dev

# Alternative: Webpack dev server (if debugging Turbopack HMR issues)
npm run dev:webpack

# Type check
npm run typecheck

# Lint
npm run lint

# Production build (always run before deploying)
npm run build
```

### Branch naming (recommended)

| Pattern | Use |
|---------|-----|
| `feature/short-description` | New features |
| `fix/issue-description` | Bug fixes |
| `chore/task-description` | Tooling, deps, docs |

### Typical feature flow

1. Pull latest `master` / `main`
2. Create branch
3. Develop locally with `.env` pointed at local MySQL
4. Run `npm run typecheck` and `npm run build`
5. Open PR → code review → merge
6. Deploy to UAT → QA sign-off → deploy to PROD

---

## 10. Quality gates before merge/deploy

Run these locally **before every deployment**:

```bash
npm run typecheck    # TypeScript — must pass
npm run lint         # ESLint — fix or document exceptions
npm run build        # Production build — must succeed
```

| Check | Pass criteria |
|-------|---------------|
| TypeScript | Zero errors |
| Build | Completes without failure |
| Manual smoke | Homepage, admin login, one form submission |
| Env vars | All required keys set on target server |
| DB migrations | Applied on target if schema changed |

---

## 11. Environment strategy (DEV → UAT → PROD)

| Environment | Purpose | URL example | Database |
|-------------|---------|-------------|----------|
| **DEV** | Local developer machines | `http://localhost:3000` | Local MySQL |
| **UAT / TEST** | QA, stakeholder review | `https://uat.zigma-technologies.com` | Hostinger MySQL (UAT DB) |
| **PROD** | Live public site | `https://www.zigma-technologies.com` | Hostinger MySQL (PROD DB) |

### Golden rules

1. **Never** point UAT/PROD at a developer's local database.
2. **Never** reuse `AUTH_SECRET`, admin passwords, or DB passwords across environments.
3. **Always** run QA on UAT before PROD deployment.
4. **Always** take a DB export before PROD schema/content changes.
5. Content can be promoted via `db:export` / `db:import` or manual admin edits — agree on process with your team.

---

## 12. Hostinger: what you need before deploying

This app is a **Node.js server** (not PHP/WordPress). You cannot deploy it as plain static files on basic shared hosting.

### Recommended Hostinger options

| Option | Best for | Notes |
|--------|----------|-------|
| **VPS (KVM)** | **PROD (recommended)** | Full control: Node 20, PM2, Nginx, MySQL on same VPS or remote |
| **Business / Cloud Web Hosting with Node.js** | UAT or small PROD | hPanel "Node.js" feature — simpler but less flexible |
| **Managed MySQL (any plan with DB)** | All environments | Create separate databases for UAT and PROD |

### Minimum server specs (PROD starting point)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 1 vCPU | 2 vCPU |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### What to prepare in Hostinger before Day 1 deploy

- [ ] Domain registered or DNS access
- [ ] VPS or Node-enabled hosting plan active
- [ ] hPanel login credentials stored in team password manager
- [ ] SSH access enabled (VPS → **SSH Access** in hPanel)
- [ ] Two MySQL databases created: `zigmatech_uat`, `zigmatech_prod` (names are examples)
- [ ] SSL certificate plan (Let's Encrypt via hPanel is free)
- [ ] `.env` values documented per environment (separate secrets)

---

## 13. MySQL on Hostinger (detailed)

These steps apply to **any** Hostinger plan that includes MySQL (Web Hosting, Cloud, or VPS with MySQL installed).

### Step 1 — Log in to hPanel

1. Go to [https://hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Sign in with your Hostinger account
3. Select the hosting plan / website for the target environment (UAT or PROD)

### Step 2 — Create a database

1. In hPanel, open **Websites** → select your site → **Databases** → **MySQL Databases**
2. Under **Create new database**:
   - Database name: e.g. `u123456789_zigmatech_uat` (Hostinger prefixes your account ID)
   - Click **Create**
3. Note the **full database name** — you will use it as `DB_NAME`

### Step 3 — Create a database user

1. On the same page, scroll to **MySQL Users** → **Create new user**
2. Username: e.g. `u123456789_zigma_app`
3. Password: generate a **strong** password (save in password manager)
4. Click **Create**

### Step 4 — Assign user to database

1. Scroll to **Add user to database**
2. Select the user and database you just created
3. Grant **All Privileges**
4. Click **Add**

### Step 5 — Note connection details

Record these for your `.env` on the server:

| Setting | Where to find it |
|---------|------------------|
| `DB_HOST` | Usually `localhost` if the Node app runs on the **same** Hostinger server as MySQL. For VPS → remote Hostinger MySQL, use the hostname shown under **Remote MySQL** (e.g. `srv123.hstgr.io`) |
| `DB_PORT` | `3306` |
| `DB_NAME` | Full prefixed name from Step 2 |
| `DB_USER` | Full prefixed username from Step 3 |
| `DB_PASSWORD` | Password from Step 3 |

### Step 6 — Import schema via phpMyAdmin

1. hPanel → **Databases** → **phpMyAdmin**
2. Select your database in the left sidebar
3. Click **Import** tab
4. Choose file: `scripts/schema.sql` from your laptop (export from git repo)
5. Click **Go** — wait for success message

> **Tip:** For large imports, use SSH + `mysql` CLI (see [Method A](#16-deployment-method-a--vps--pm2--nginx-recommended)).

### Step 7 — Run migrations (if not fresh install)

Import each `scripts/migrate-*.sql` file the same way, **in the order listed in [Section 6](#6-database-setup-local)**.

### Step 8 — Remote MySQL (VPS app + Hostinger shared DB)

If your **Node app runs on a VPS** but **MySQL stays on Hostinger web hosting**:

1. hPanel → **Databases** → **Remote MySQL**
2. Add your **VPS public IP address**
3. Use the remote hostname as `DB_HOST` (not `localhost`)
4. Ensure VPS outbound traffic to port 3306 is allowed

---

## 14. Deploy to UAT on Hostinger

**Goal:** A stable test URL (e.g. `uat.zigma-technologies.com`) mirroring production configuration.

### Pre-flight checklist

- [ ] UAT MySQL database created and schema imported ([Section 13](#13-mysql-on-hostinger-detailed))
- [ ] UAT `.env` prepared with UAT-specific secrets
- [ ] DNS A record: `uat` → server IP (or subdomain configured in hPanel)
- [ ] Latest code merged to deploy branch
- [ ] `npm run build` passes locally

### UAT deployment steps (high level)

1. **Provision server** (VPS or enable Node.js on web hosting)
2. **Upload / clone code** to server
3. **Install dependencies & build**
4. **Configure `.env`** with UAT values
5. **Import content** — bootstrap via admin or `db:import` from dev export
6. **Start app** (PM2 or hPanel Node.js)
7. **Configure Nginx / domain** → HTTPS
8. **Run post-deployment checklist** ([Section 20](#20-post-deployment-checklist))
9. **Hand off to QA**

Detailed server commands: [Section 16](#16-deployment-method-a--vps--pm2--nginx-recommended) or [Section 17](#17-deployment-method-b--hpanel-nodejs-web-app).

### UAT-specific environment values

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://uat.zigma-technologies.com
DB_HOST=localhost
DB_NAME=u123456789_zigmatech_uat
DB_USER=u123456789_zigma_uat
DB_PASSWORD=<uat-db-password>
AUTH_SECRET=<unique-uat-secret>
PREVIEW_SECRET=<unique-uat-preview-secret>
ADMIN_EMAIL=admin-uat@yourcompany.com
ADMIN_PASSWORD=<change-immediately-after-seed>
```

---

## 15. Deploy to PROD on Hostinger

**Goal:** Zero-downtime (or minimal-downtime) go-live at the production domain.

### Pre-flight checklist (PROD)

- [ ] UAT sign-off documented (QA checklist completed)
- [ ] PROD MySQL database created — **separate from UAT**
- [ ] PROD `.env` secrets generated — **never copied from UAT**
- [ ] DNS for `www` and apex domain planned
- [ ] SSL certificate ready
- [ ] Database backup / export taken from UAT (if promoting content)
- [ ] SMTP configured for live enquiry notifications
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] Admin passwords rotated — no default/dev passwords
- [ ] Rollback plan agreed ([Section 21](#21-rollback-procedure))

### PROD deployment sequence

| # | Action | Owner |
|---|--------|-------|
| 1 | Announce maintenance window (if needed) | PM / DevOps |
| 2 | Backup PROD database (if upgrading existing) | DevOps |
| 3 | Deploy application code | DevOps |
| 4 | Apply any new `migrate-*.sql` files | DevOps |
| 5 | Import UAT-approved content (optional) | DevOps |
| 6 | Verify `.env` on server | DevOps |
| 7 | `npm run build && pm2 restart` (or hPanel restart) | DevOps |
| 8 | Run post-deployment checklist | QA + DevOps |
| 9 | Monitor error logs for 30 minutes | DevOps |

### PROD environment values

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com
DB_HOST=localhost
DB_NAME=u123456789_zigmatech_prod
DB_USER=u123456789_zigma_prod
DB_PASSWORD=<prod-db-password>
AUTH_SECRET=<unique-prod-secret>
PREVIEW_SECRET=<unique-prod-preview-secret>
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<smtp-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"
```

> Hostinger email SMTP often uses `smtp.hostinger.com` with the mailbox credentials from hPanel → **Emails**.

---

## 16. Deployment method A — VPS + PM2 + Nginx (recommended)

Use this for **production-grade** deployments on Hostinger VPS.

### A.1 — Initial VPS setup (one time)

SSH into your VPS (hPanel → **VPS** → **SSH Access**):

```bash
ssh root@YOUR_VPS_IP
```

Update system and install dependencies:

```bash
apt update && apt upgrade -y
apt install -y curl git nginx mysql-client

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

node -v   # should print v20.x
npm -v
```

Install PM2 (process manager):

```bash
npm install -g pm2
```

### A.2 — Create deploy user (recommended)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### A.3 — Clone the application

```bash
cd /var/www
git clone <repository-url> zigma-technologies
cd zigma-technologies
npm install
```

### A.4 — Configure environment

```bash
cp .env.example .env
nano .env   # paste UAT or PROD values
```

Ensure `NODE_ENV=production` and all DB/auth variables are set.

### A.5 — Build the application

```bash
npm run build
```

Fix any build errors **before** proceeding. Build must complete on the server (not only on your laptop).

### A.6 — Create upload directories

Visitor form uploads must be writable:

```bash
mkdir -p public/assets/uploads/resumes public/assets/uploads/documents
chmod -R 755 public/assets
```

### A.7 — Import database

**Option 1 — From dev export (recommended for first deploy):**

On your laptop:

```bash
npm run db:export -- --with-cms-media
# Creates storage/exports/zigma-YYYYMMDD-HHMMSS/
```

Upload the export folder to the server (SCP / SFTP), then on server:

```bash
cd /var/www/zigma-technologies
npm run db:import -- storage/exports/zigma-YYYYMMDD-HHMMSS --force
```

**Option 2 — Fresh schema + admin bootstrap:**

Import `scripts/schema.sql` via phpMyAdmin, then seed via `/admin/login`.

### A.8 — Start with PM2

```bash
cd /var/www/zigma-technologies
pm2 start npm --name "zigma" -- start
pm2 save
pm2 startup   # follow printed instructions to enable boot restart
```

Verify:

```bash
pm2 status
curl -I http://127.0.0.1:3000
```

### A.9 — Configure Nginx reverse proxy

Create Nginx site config:

```bash
sudo nano /etc/nginx/sites-available/zigma
```

Paste (replace domain):

```nginx
server {
    listen 80;
    server_name uat.zigma-technologies.com;   # or www.zigma-technologies.com for PROD

    client_max_body_size 25M;   # form uploads / admin media

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
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### A.10 — Enable SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d uat.zigma-technologies.com
```

Certbot auto-renews. Verify HTTPS in browser.

### A.11 — Deploy updates (repeatable)

```bash
cd /var/www/zigma-technologies
git pull origin master
npm install
npm run build
pm2 restart zigma
```

If schema changed, apply migrations before restart.

---

## 17. Deployment method B — hPanel Node.js Web App

Use this on **Hostinger Business/Cloud** plans that include the **Node.js** selector. Good for **UAT** or lighter PROD workloads.

> Steps may vary slightly as hPanel UI updates. Names below match current Hostinger terminology.

### B.1 — Enable Node.js for your domain

1. hPanel → **Websites** → select site → **Advanced** → **Node.js**
2. Click **Create Node.js app** (or **Enable**)
3. Set:
   - **Node.js version:** 20.x
   - **Application mode:** Production
   - **Application root:** folder where code lives (e.g. `domains/uat.zigma-technologies.com/public_html`)
   - **Application startup file:** Hostinger may auto-detect — for Next.js set start command (see B.4)

### B.2 — Upload code

**Option A — Git (if available):** Connect repository in hPanel Git section.

**Option B — File Manager / FTP:**

1. hPanel → **Files** → **File Manager**
2. Upload project zip or use FTP (FileZilla)
3. Extract so `package.json` is at application root

**Do not upload `node_modules` or `.next`** — build on server.

### B.3 — Set environment variables

hPanel → Node.js app → **Environment variables**

Add every key from [Section 7](#7-environment-variables). Click **Save**.

### B.4 — Install & build via SSH or hPanel terminal

If SSH is enabled:

```bash
cd ~/domains/uat.zigma-technologies.com/public_html
npm install
npm run build
```

Set **Start command** in Node.js settings:

```
npm start
```

Or:

```
node node_modules/next/dist/bin/next start -p $PORT
```

Hostinger often injects `$PORT` automatically — if the app fails to bind, check hPanel docs for the assigned port.

### B.5 — Restart the Node.js app

hPanel → Node.js → **Restart**

Open your domain in browser.

### B.6 — Import MySQL

Follow [Section 13](#13-mysql-on-hostinger-detailed) — `DB_HOST` is typically `localhost` on this hosting type.

---

## 18. Database migration between environments

### Export from DEV (or UAT)

```bash
# Database + visitor uploads
npm run db:export

# Include CMS media (images referenced in DB)
npm run db:export -- --with-cms-media

# Database only (no upload files)
npm run db:export -- --no-uploads

# Custom output path
npm run db:export -- --out storage/exports/release-2026-08-13
```

Output: `storage/exports/zigma-YYYYMMDD-HHMMSS/` containing `database.sql`, `meta.json`, and optional media folders.

> `storage/exports/` is git-ignored — copy to secure shared storage for team handoff.

### Import to UAT / PROD

On the **target server** (with `.env` pointing at target DB):

```bash
npm run db:import -- storage/exports/zigma-YYYYMMDD-HHMMSS --force
```

| Flag | Effect |
|------|--------|
| `--force` | Required — confirms you want to replace target tables |
| `--skip-media` | Import SQL only, skip copying upload folders |

### After import — mandatory steps

1. **Change all admin passwords** (Account + Users modules)
2. Update **Site Settings** with environment-appropriate email/phone
3. Verify `NEXT_PUBLIC_SITE_URL` matches the environment domain
4. Test enquiry form → check **Enquiries** inbox (not production CRM on UAT)

---

## 19. SSL, domains & DNS

### Recommended DNS layout

| Record | Name | Value | Purpose |
|--------|------|-------|---------|
| A | `@` | VPS/server IP | Apex domain |
| A | `www` | VPS/server IP | www subdomain |
| A | `uat` | UAT server IP | UAT environment |
| CNAME | `www` → `@` | (alternative) | Some teams prefer CNAME |

Configure in hPanel → **Domains** → **DNS / Nameservers** or your external DNS provider.

### SSL

- **VPS:** Certbot + Nginx ([Section A.10](#a10--enable-ssl-lets-encrypt))
- **hPanel hosting:** **SSL** section → enable free SSL → force HTTPS redirect

### Force HTTPS in Nginx (after Certbot)

Certbot usually adds this automatically. Verify `http://` redirects to `https://`.

---

## 20. Post-deployment checklist

Run after **every** UAT and PROD deployment.

### Application

- [ ] Homepage loads (`/`)
- [ ] `/admin/login` loads
- [ ] Admin login works
- [ ] Dashboard stats show expected counts
- [ ] `/products`, `/projects`, `/services` list items
- [ ] At least one detail page (`/products/{slug}`) works
- [ ] Contact / enquiry form submits → row in Enquiries
- [ ] Theme CSS loads (`/api/public/theme.css`)
- [ ] Favicon and manifest load
- [ ] `/sitemap.xml` accessible
- [ ] 404 page renders for bad URLs

### Security

- [ ] HTTPS active, no mixed-content warnings
- [ ] Default/dev admin passwords changed
- [ ] `.env` not publicly accessible
- [ ] `/assets/uploads/resumes` returns 404 (blocked by proxy)
- [ ] Admin-only routes blocked for editor test account

### SEO & analytics

- [ ] `NEXT_PUBLIC_SITE_URL` correct → view page source canonical URLs
- [ ] Google Analytics / GTM ID set in Site Settings (PROD only)
- [ ] Open Graph preview checked (social share debugger)

### Email (PROD)

- [ ] Test enquiry triggers notification email
- [ ] SMTP credentials valid in hPanel mailboxes

---

## 21. Rollback procedure

### Application rollback (code)

```bash
cd /var/www/zigma-technologies
git log --oneline -5          # find last good commit
git checkout <good-commit-hash>
npm install
npm run build
pm2 restart zigma
```

Or restore previous release folder if you use dated deploy directories.

### Database rollback (content)

1. Restore from pre-deploy export:

   ```bash
   npm run db:import -- storage/exports/pre-deploy-backup --force
   ```

2. Or restore Hostinger **automatic MySQL backup** via hPanel → **Backups**.

> Always take `npm run db:export` before PROD content imports.

---

## 22. Monitoring & maintenance

| Task | Frequency | How |
|------|-----------|-----|
| PM2 process health | Daily | `pm2 status` / hPanel Node.js dashboard |
| Disk space (uploads) | Weekly | `df -h` — resumes/documents grow over time |
| MySQL backups | Daily (PROD) | hPanel backups or cron `mysqldump` |
| SSL expiry | Monthly | Certbot auto-renews — verify with `certbot certificates` |
| Dependency updates | Monthly | `npm outdated` — patch security fixes |
| Admin user audit | Quarterly | `/admin/users` — remove leavers |

### Log locations (VPS + PM2)

```bash
pm2 logs zigma
pm2 logs zigma --lines 200
```

Nginx error log: `/var/log/nginx/error.log`

---

## 23. Troubleshooting

### `Database connection failed` / 500 on all pages

| Cause | Fix |
|-------|-----|
| Wrong `DB_*` in `.env` | Verify hPanel MySQL credentials |
| MySQL not running | hPanel → MySQL status; VPS: `systemctl status mysql` |
| Remote MySQL blocked | Add VPS IP in hPanel → Remote MySQL |
| Schema not imported | Run `scripts/schema.sql` |

### Admin login redirects in a loop

| Cause | Fix |
|-------|-----|
| `AUTH_SECRET` changed after login | Clear cookies, log in again |
| Clock skew on server | Sync VPS time: `timedatectl` |
| Cookie not secure behind proxy | Ensure Nginx sends `X-Forwarded-Proto: https` |

### `npm run build` fails

| Cause | Fix |
|-------|-----|
| TypeScript errors | Run `npm run typecheck` locally, fix errors |
| Missing env at build time | Some routes need DB — ensure `.env` exists on server |
| Out of memory on VPS | Add swap or upgrade RAM; build locally and deploy `.next` (not ideal) |

### Images / media 404

| Cause | Fix |
|-------|-----|
| CMS media not deployed | Re-export with `--with-cms-media` and copy files |
| Wrong `MEDIA_BASE_URL` | Should be `/assets` unless intentionally changed |
| File not in `public/assets/images/` | Upload via admin Media module |

### Enquiry emails not sending

| Cause | Fix |
|-------|-----|
| SMTP not configured | Set `SMTP_*` in `.env` |
| Hostinger mailbox not created | hPanel → Emails → create mailbox |
| Enquiry notify disabled | Admin → Site Settings → notification toggle |

### Turbopack HMR error overlay (`undefined`) in local dev

| Cause | Fix |
|-------|-----|
| Stale service worker | Hard refresh; DevTools → Application → unregister SW |
| HMR glitch | Restart `npm run dev` or use `npm run dev:webpack` |

### Port already in use

```bash
# Find process (Linux)
ss -tlnp | grep 3000

# Or change port
PORT=3001 npm run start
```

---

## 24. Security checklist

- [ ] Unique `AUTH_SECRET` per environment (32+ random bytes)
- [ ] Strong admin passwords; rotate after first login
- [ ] `.env` never committed to git
- [ ] HTTPS enforced on UAT and PROD
- [ ] MySQL users have least privilege (app user only, no root in `.env`)
- [ ] Visitor uploads (`resumes`, `documents`) not directly URL-accessible
- [ ] Rate limiting active on public forms (built-in: 6 submissions / 15 min / IP)
- [ ] Turnstile enabled on PROD public forms (recommended)
- [ ] Keep Node.js and OS packages patched

---

## 25. Related documentation

| Document | Audience | Content |
|----------|----------|---------|
| [`ADMIN.md`](./ADMIN.md) | Editors, admins, operators | Module reference, API summary, seeds |
| `/admin/guide` | Admin users | In-app architecture & playbooks |
| [`.env.example`](./.env.example) | Developers | Environment variable template |
| `scripts/schema.sql` | DevOps | Database DDL |
| Next.js docs | Developers | https://nextjs.org/docs |

---

## 26. Glossary

| Term | Meaning |
|------|---------|
| **CMS** | Content Management System — pages, sections, catalog stored in MySQL |
| **Seed** | One-click insert of default/sample data via admin or API |
| **Bootstrap** | Dashboard action that runs all missing seeds |
| **UAT** | User Acceptance Testing — pre-production environment |
| **hPanel** | Hostinger web control panel |
| **PM2** | Node.js process manager — keeps app running after SSH logout |
| **Route group** | Next.js folder `(site)` / `(admin)` — organizes URLs without affecting paths |
| **theme_settings** | Key-value JSON table for site config, copy, and design tokens |
| **Case study** | Rich catalog detail page (`case_study_json` on catalog items) |

---

## Quick reference — common commands

```bash
# Local dev
npm run dev

# Quality
npm run typecheck && npm run lint && npm run build

# Database export / import
npm run db:export -- --with-cms-media
npm run db:import -- storage/exports/zigma-YYYYMMDD-HHMMSS --force

# Production (on server)
npm run build
npm start                    # or: pm2 restart zigma

# PM2
pm2 start npm --name zigma -- start
pm2 restart zigma
pm2 logs zigma
```

---

**Questions?** Ask your team lead or check `/admin/guide` after logging in. For module-specific “why / when / how”, see [`ADMIN.md`](./ADMIN.md).
