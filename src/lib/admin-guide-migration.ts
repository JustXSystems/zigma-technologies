/** Hostinger migration guide — plan selection, purchase, DNS cutover, and go-live. */

export type MigrationPlanRow = {
  plan: string;
  specs: string;
  bestFor: string;
  promoNote: string;
  recommended?: boolean;
};

export type MigrationPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  steps: string[];
  checklist?: string[];
  warning?: string;
};

export type MigrationDnsRecord = {
  type: string;
  name: string;
  value: string;
  ttl: string;
  notes: string;
};

export const MIGRATION_CURRENT_STATE = {
  domain: 'zigma-technologies.com',
  www: 'www.zigma-technologies.com',
  registrar: 'BigRock Solutions Ltd (bigrock.com)',
  nameservers: ['ns1.urbanvendo.com', 'ns2.urbanvendo.com'],
  currentIp: '14.195.24.149',
  currentHost: 'UrbanVendo / Tata Teleservices (India)',
  targetHost: 'Hostinger VPS or Node-enabled hosting',
  note:
    'The domain stays registered at BigRock unless you transfer it. You only change DNS to point www and apex traffic to your Hostinger server IP.',
};

export const MIGRATION_PLAN_RECOMMENDATION = {
  primary: 'Hostinger KVM 2 VPS',
  primaryReason:
    'This Next.js 16 app runs as a persistent Node.js process with MySQL, PM2, and Nginx. Shared PHP hosting cannot run it. KVM 2 (2 vCPU, 8 GB RAM, 100 GB NVMe) is the sweet spot for production: enough headroom for builds, MySQL on the same VPS, and traffic spikes without over-provisioning.',
  uatOption: 'Hostinger Business Web Hosting (Node.js) or a second KVM 1 VPS',
  uatReason:
    'Use a separate UAT environment at uat.zigma-technologies.com before cutting over production DNS. Business hosting with Node.js is simpler for UAT; KVM 1 is fine for a staging-only server.',
  avoid:
    'Premium / Starter shared hosting without Node.js — these plans serve static/PHP sites only and will not run this application.',
};

export const MIGRATION_PLAN_COMPARISON: MigrationPlanRow[] = [
  {
    plan: 'KVM 1 VPS',
    specs: '1 vCPU · 4 GB RAM · 50 GB NVMe · 4 TB bandwidth',
    bestFor: 'UAT / staging, dev test server, or very low-traffic prod',
    promoNote: 'From ~$6.49/mo intro (24-mo term); renews higher (~$12–15/mo). Confirm live price at checkout.',
  },
  {
    plan: 'KVM 2 VPS',
    specs: '2 vCPU · 8 GB RAM · 100 GB NVMe · 8 TB bandwidth',
    bestFor: 'Production — recommended starting tier for this app',
    promoNote: 'From ~$8.99/mo intro (24-mo term); renews ~$15/mo. Budget for renewal, not promo.',
    recommended: true,
  },
  {
    plan: 'KVM 4 VPS',
    specs: '4 vCPU · 16 GB RAM · 200 GB NVMe · 16 TB bandwidth',
    bestFor: 'High traffic, heavy media, or multiple services on one VPS',
    promoNote: 'From ~$12.99/mo intro; renews ~$29/mo.',
  },
  {
    plan: 'Managed Node.js Hosting',
    specs: 'Managed deploy, SSL, CDN — app-level control only',
    bestFor: 'Teams that want less server admin (GitHub deploy)',
    promoNote: 'From ~$3.79/mo intro. Good for simpler Node apps; less flexible than VPS for MySQL + custom Nginx.',
  },
  {
    plan: 'Business Web Hosting + Node.js',
    specs: 'hPanel Node.js app, MySQL included, shared resources',
    bestFor: 'UAT only — not recommended for production at scale',
    promoNote: 'From ~$3.99/mo intro. Easier setup but limited vs full VPS control.',
  },
];

export const MIGRATION_PURCHASE_STEPS = [
  'Go to hostinger.com → Hosting → VPS Hosting (for production) or Web Hosting → Business (for UAT).',
  'Select KVM 2 (production) or KVM 1 (UAT). Choose 24-month term for lowest intro price — note the renewal price shown in cart.',
  'Pick server location closest to your audience (India: Mumbai or Singapore data centre if offered).',
  'Choose Ubuntu 24.04 LTS (or 22.04 LTS) as the operating system template.',
  'Complete checkout — create a Hostinger account or sign in. Pay upfront for the selected term.',
  'After payment, open hPanel (hpanel.hostinger.com) → VPS → note your server public IPv4 address.',
  'Enable SSH access: hPanel → VPS → SSH Access → set root password or add your SSH public key.',
  'Optional: hPanel → Emails → create mailboxes (e.g. noreply@, info@) if moving email to Hostinger.',
  'Do not transfer the domain to Hostinger unless you want a single vendor — DNS changes at BigRock are sufficient.',
];

export const MIGRATION_PHASES: MigrationPhase[] = [
  {
    id: 'prepare',
    phase: 'Phase 0',
    title: 'Prepare — before you buy or deploy',
    summary: 'Gather access, export content, and agree on a maintenance window.',
    steps: [
      'Confirm BigRock / UrbanVendo login — you need DNS access for zigma-technologies.com.',
      'Export local or staging CMS: npm run db:export -- --with-cms-media (creates storage/exports/zigma-YYYYMMDD-HHMMSS/).',
      'Run quality gates locally: npm run typecheck && npm run lint && npm run build.',
      'Document current live URLs and inbound links (Google Search Console, ads, printed materials).',
      'Agree rollback plan: keep old site running until Hostinger UAT passes QA; lower DNS TTL to 300s 24h before cutover.',
      'Generate fresh PROD secrets: AUTH_SECRET, PREVIEW_SECRET, DB password, admin password (never reuse UAT values).',
    ],
    checklist: [
      'BigRock DNS access confirmed',
      'DB + media export completed',
      'Build passes locally',
      'Maintenance window communicated',
      'Rollback owner assigned',
    ],
  },
  {
    id: 'provision',
    phase: 'Phase 1',
    title: 'Buy Hostinger & provision server',
    summary: 'Purchase KVM 2 VPS for production; optional second plan for UAT.',
    steps: [
      'Purchase Hostinger KVM 2 VPS following the purchase steps in this guide.',
      'SSH into VPS: ssh root@YOUR_VPS_IP (from hPanel → SSH Access).',
      'Initial server setup: apt update && apt upgrade -y',
      'Install stack: curl Node 20 LTS, git, nginx, mysql-server (or use Hostinger remote MySQL), pm2 globally.',
      'Create deploy user: adduser deploy && usermod -aG sudo deploy.',
      'Configure firewall: allow 22 (SSH), 80 (HTTP), 443 (HTTPS).',
      'Create MySQL database zigmatech_prod, user, and grant privileges (see README Section 13).',
    ],
    checklist: [
      'VPS active in hPanel',
      'SSH login works',
      'Node 20 + PM2 + Nginx installed',
      'MySQL database created',
      'Public IPv4 recorded for DNS',
    ],
  },
  {
    id: 'uat',
    phase: 'Phase 2',
    title: 'Deploy to UAT (uat.zigma-technologies.com)',
    summary: 'Validate the full stack on Hostinger before touching production DNS.',
    steps: [
      'Clone repo on server: cd /var/www && git clone <repo-url> zigma-technologies && cd zigma-technologies',
      'Create .env with UAT values — NEXT_PUBLIC_SITE_URL=https://uat.zigma-technologies.com, unique AUTH_SECRET.',
      'npm install && npm run build — fix any server-side build errors before continuing.',
      'Import database: upload export folder, then npm run db:import -- storage/exports/zigma-... --force',
      'mkdir -p public/assets/uploads/resumes public/assets/uploads/documents && chmod -R 755 public/assets',
      'Start app: pm2 start npm --name zigma-uat -- start && pm2 save && pm2 startup',
      'Configure Nginx reverse proxy to 127.0.0.1:3000 for uat.zigma-technologies.com',
      'Add DNS A record: uat → VPS IP at BigRock (keep www pointing to old server until UAT sign-off).',
      'Enable SSL: certbot --nginx -d uat.zigma-technologies.com',
      'Run post-deployment checklist (homepage, admin login, forms, catalog, theme CSS).',
    ],
    checklist: [
      'UAT site loads over HTTPS',
      'Admin login works; passwords rotated from seed',
      'Enquiry form creates row in Enquiries',
      'Catalog pages and media load',
      'QA sign-off documented',
    ],
  },
  {
    id: 'prod-deploy',
    phase: 'Phase 3',
    title: 'Deploy production on Hostinger',
    summary: 'Deploy the same codebase to production paths with PROD-only secrets and database.',
    steps: [
      'Create separate PROD MySQL database (never share UAT DB credentials).',
      'Deploy code to /var/www/zigma-technologies (or use a prod branch / separate folder).',
      'Configure PROD .env: NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com, PROD DB_*, SMTP_*, unique AUTH_SECRET.',
      'Import UAT-approved content: npm run db:import -- <export-path> --force (or promote from UAT export).',
      'Apply any pending scripts/migrate-*.sql files in order.',
      'pm2 start/restart production process; configure Nginx for www.zigma-technologies.com and apex redirect.',
      'Install SSL for www and apex: certbot --nginx -d www.zigma-technologies.com -d zigma-technologies.com',
      'Test via hosts file or curl -H "Host: www.zigma-technologies.com" http://VPS_IP before DNS cutover.',
      'Add Redirects in admin for legacy .html paths if migrating from old static site.',
    ],
    checklist: [
      'PROD .env verified (no UAT secrets)',
      'SMTP tested — enquiry email received',
      'Admin passwords changed; no default credentials',
      'Site reachable via VPS IP + Host header test',
      'Database backup taken before DNS switch',
    ],
    warning: 'Do not point www DNS to Hostinger until UAT QA is complete and PROD smoke tests pass via IP/hosts file.',
  },
  {
    id: 'dns',
    phase: 'Phase 4',
    title: 'DNS cutover — route all traffic to Hostinger',
    summary: 'Update BigRock DNS so www.zigma-technologies.com and apex resolve to your Hostinger VPS.',
    steps: [
      'Log in to BigRock domain control panel (or UrbanVendo DNS manager if they manage DNS for you).',
      'Lower TTL on existing A records to 300 seconds at least 24 hours before cutover (if editable).',
      'Update or add A record: @ (apex) → YOUR_HOSTINGER_VPS_IP',
      'Update or add A record: www → YOUR_HOSTINGER_VPS_IP (or CNAME www → @ if your DNS provider supports apex ALIAS)',
      'Remove or update old A records pointing to 14.195.24.149 once new site is verified.',
      'Keep uat A record pointing to UAT server for ongoing QA.',
      'Wait for propagation (minutes to 48h; usually under 1h with low TTL). Verify: nslookup www.zigma-technologies.com',
      'Confirm HTTPS redirect: http://zigma-technologies.com → https://www.zigma-technologies.com (configure in Nginx).',
      'Submit updated sitemap in Google Search Console after cutover.',
    ],
    checklist: [
      'A records updated for @ and www',
      'SSL valid on both hostnames',
      'Old IP no longer returned by public DNS',
      'Email MX records unchanged (if mail stays at current provider)',
      'Search Console / analytics updated',
    ],
    warning:
      'If email uses @zigma-technologies.com on UrbanVendo/BigRock, do NOT delete MX records — only change A records for web traffic.',
  },
  {
    id: 'post',
    phase: 'Phase 5',
    title: 'Post-migration validation & handoff',
    summary: 'Final checks, monitoring, and decommission old hosting.',
    steps: [
      'Run full post-deployment checklist from README Section 20.',
      'Monitor pm2 logs and Nginx error log for 30–60 minutes: pm2 logs zigma --lines 100',
      'Submit test enquiries on live PROD; verify Enquiries module and email notifications.',
      'Verify /admin/login, theme CSS, sitemap.xml, robots.txt, favicon, PWA manifest.',
      'Keep old UrbanVendo site available (do not cancel) for 7–14 days as rollback fallback.',
      'After stable period: cancel old hosting plan; document Hostinger hPanel credentials in team password manager.',
      'Schedule weekly PM2 health check and Hostinger backup verification.',
    ],
    checklist: [
      'All post-deploy checks passed',
      'No critical errors in logs',
      'Team trained on /admin modules',
      'Old host decommission date scheduled',
      'Rollback procedure documented and tested on UAT',
    ],
  },
];

export const MIGRATION_DNS_RECORDS: MigrationDnsRecord[] = [
  {
    type: 'A',
    name: '@',
    value: '<HOSTINGER_VPS_IP>',
    ttl: '300–3600',
    notes: 'Apex domain zigma-technologies.com → Hostinger',
  },
  {
    type: 'A',
    name: 'www',
    value: '<HOSTINGER_VPS_IP>',
    ttl: '300–3600',
    notes: 'Primary public URL www.zigma-technologies.com',
  },
  {
    type: 'A',
    name: 'uat',
    value: '<UAT_VPS_IP or same VPS>',
    ttl: '3600',
    notes: 'QA environment — can share VPS with different Nginx server_name',
  },
  {
    type: 'MX',
    name: '@',
    value: '(keep existing)',
    ttl: '—',
    notes: 'Do not change unless migrating email to Hostinger mailboxes',
  },
];

export const MIGRATION_NGINX_SNIPPET = `server {
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

export const MIGRATION_ENV_PROD = `NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zigmatech_prod
DB_USER=zigmatech_prod
DB_PASSWORD=<strong-prod-password>
AUTH_SECRET=<unique-prod-secret>
PREVIEW_SECRET=<unique-prod-preview-secret>
ADMIN_EMAIL=admin@zigma-technologies.com
ADMIN_PASSWORD=<change-after-first-login>
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<mailbox-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"`;

export const MIGRATION_ROLLBACK = [
  'If critical issues appear within 24–48h of DNS cutover, revert A records for @ and www to 14.195.24.149 (old UrbanVendo IP).',
  'TTL 300s makes rollback effective within minutes once old records are restored.',
  'Keep old hosting active until migration is declared stable.',
  'Fix forward on Hostinger UAT before attempting DNS cutover again.',
  'Database rollback: restore from pre-cutover mysqldump if bad import occurred (not needed for DNS-only rollback).',
];

export const MIGRATION_FAQ = [
  {
    q: 'Do I need to transfer the domain from BigRock to Hostinger?',
    a: 'No. Keep registration at BigRock and only update DNS A records to point to Hostinger. Transfer is optional if you want one billing account.',
  },
  {
    q: 'Why VPS instead of cheap shared hosting?',
    a: 'This app is Next.js 16 with server-side rendering, API routes, and MySQL — it requires a long-running Node.js process. Basic shared hosting serves PHP/static files only.',
  },
  {
    q: 'Can I use Managed Node.js Hosting instead of VPS?',
    a: 'Yes for simpler deployments, but VPS + PM2 + Nginx (README Section 16) is recommended for full control over MySQL, uploads, SSL, and Nginx tuning.',
  },
  {
    q: 'Will there be downtime during migration?',
    a: 'Minimal if you deploy and test on Hostinger first, then switch DNS. Expect 0–30 minutes of propagation variance. Use low TTL before cutover.',
  },
  {
    q: 'What about email on @zigma-technologies.com?',
    a: 'Web DNS (A records) and email (MX records) are independent. Only change A records unless you also migrate mailboxes to Hostinger Email.',
  },
];

export const MIGRATION_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'current-state', label: 'Current setup' },
  { id: 'plan-choice', label: 'Plan recommendation' },
  { id: 'purchase', label: 'How to buy' },
  { id: 'phases', label: 'Migration phases' },
  { id: 'dns', label: 'DNS cutover' },
  { id: 'config', label: 'Server config' },
  { id: 'rollback', label: 'Rollback' },
  { id: 'faq', label: 'FAQ' },
];
