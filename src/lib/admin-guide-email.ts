/** Email server migration — UrbanVendo CWP/Postfix/Roundcube → cloud mailbox, keep @zigma-technologies.com */

export type EmailProviderRow = {
  provider: string;
  plan: string;
  mailbox: string;
  perUserYear: string;
  cost70: string;
  cost150: string;
  reliability: string;
  migrateEase: string;
  recommended?: boolean;
  note: string;
};

export type EmailPhase = {
  id: string;
  phase: string;
  title: string;
  summary: string;
  days: string;
  effort: string;
  steps: string[];
  checklist?: string[];
  warning?: string;
};

export const EMAIL_CURRENT_STATE = {
  domain: 'zigma-technologies.com',
  addresses: '@zigma-technologies.com (unchanged)',
  provider: 'UrbanVendo — self-hosted mail on their own server (not Google, Zoho, Microsoft, or Hostinger)',
  operator: 'Exigo IT Inc (Bengaluru) — technical WHOIS contact for urbanvendo.com; likely who you pay/renew with',
  operatorPhone: '+91 98808 18777 (from urbanvendo.com WHOIS tech contact)',
  webmail: 'Roundcube at webmail.zigma-technologies.com and mail.zigma-technologies.com (UI only)',
  controlPanel: 'Control Web Panel (CWP) at cpanel.zigma-technologies.com — not cPanel LLC',
  mta: 'Postfix on hostname cwp.urbanvendo.com (SMTP banner: 220 cwp.urbanvendo.com ESMTP Postfix)',
  host: 'Same machine as the website: 14.195.24.149 (PTR urbanvendo.com)',
  isp: 'Tata Teleservices (AS45820) — network/IP owner only, not the mailbox vendor',
  mx: 'zigma-technologies.com (preference 0) — mail delivered to the web server itself',
  spf: 'v=spf1 +a +mx +ip4:14.195.24.149 ~all',
  dkim: 'Not published (none found on public DNS)',
  dmarc: 'Not published (none found on public DNS)',
  activeMailboxes: '60+',
  targetMailboxes: 'up to 150',
  renewal: 'UrbanVendo / Exigo hosting+email subscription renews around September 2026',
  urbanvendoSite: 'https://urbanvendo.com currently returns “Account Suspended” — a sign the host itself is unstable',
  note:
    'There is no separate cloud mailbox company. UrbanVendo runs Postfix + CWP + Roundcube on one server that also serves the website. Roundcube.com is not who you renew with — you renew with UrbanVendo / Exigo IT. Keep the domain at BigRock; only MX, SPF, DKIM, and DMARC change when you leave.',
};

/** How the current mail stack is layered — verified Aug 2026 via DNS, HTTP, and SMTP. */
export const EMAIL_PROVIDER_LAYERS: Array<{ role: string; who: string; evidence: string }> = [
  {
    role: 'Who you pay / renew with',
    who: 'UrbanVendo (hosting brand). Technical operator on WHOIS: Exigo IT Inc, Bengaluru, +91 98808 18777',
    evidence:
      'Nameservers ns1/ns2.urbanvendo.com; SMTP hostname cwp.urbanvendo.com; PTR 14.195.24.149 → urbanvendo.com',
  },
  {
    role: 'Where mailboxes live',
    who: 'That same UrbanVendo server (14.195.24.149) — website + DNS + mail on one box',
    evidence:
      'MX points at zigma-technologies.com, which A-records to 14.195.24.149. mail / smtp / imap / webmail / cpanel all resolve there.',
  },
  {
    role: 'Mail server software',
    who: 'Postfix (MTA) + Control Web Panel (CWP) for account admin',
    evidence:
      'SMTP greeting “220 cwp.urbanvendo.com ESMTP Postfix”. Login UI at cpanel.zigma-technologies.com uses /login/cwp_theme/ (CWP, not cPanel LLC).',
  },
  {
    role: 'Webmail UI staff open in a browser',
    who: 'Roundcube (open-source) — not a provider, not a company you have a contract with',
    evidence:
      'https://webmail.zigma-technologies.com title “Roundcube Webmail”; cookie roundcube_sessid; nginx/1.14.1',
  },
  {
    role: 'Domain registrar (not mail)',
    who: 'BigRock Solutions Ltd — zigma-technologies.com registration only',
    evidence: 'RDAP registrar IANA 1495. DNS is delegated to UrbanVendo nameservers.',
  },
  {
    role: 'Internet circuit (not mail)',
    who: 'Tata Teleservices AS45820 — they own the IP block',
    evidence: 'IP WHOIS. Tata does not operate @zigma-technologies.com inboxes.',
  },
];

export const EMAIL_RECOMMENDATION = {
  primary: 'Zoho Mail Lite (10 GB) + Mail Premium for heavy users',
  primaryWhy:
    'Best balance of reliability, India GST billing, dedicated migration assistance (50+ users), and cost for 70–150 mailboxes. Addresses stay name@zigma-technologies.com. IMAP migration copies existing Roundcube/CWP mail before MX cutover.',
  reliabilityPick: 'Google Workspace Business Starter',
  reliabilityWhy:
    'Choose this if deliverability and 99.9% SLA matter more than price. Gmail spam reputation is the strongest of the options. Roughly 3–4× Zoho Lite at 150 users.',
  microsoftPick: 'Microsoft 365 Business Basic',
  microsoftWhy:
    'Choose this if the team already lives in Outlook / Teams / Excel. Exchange Online 50 GB mailboxes, web Outlook instead of Roundcube.',
  avoid: [
    'Do not run 150 mailboxes on the Hostinger VPS that hosts Next.js — same availability risk you have today.',
    'Do not stay on UrbanVendo self-hosted Postfix/CWP/Roundcube for production mail.',
    'Hostinger Titan / cheap mailbox bundles are fine for 5–20 boxes, not a 150-seat company mail system.',
  ],
};

/** Indicative India list prices, annual commitment, exclusive of 18% GST. Confirm at checkout (Aug 2026). */
export const EMAIL_PROVIDER_COMPARISON: EmailProviderRow[] = [
  {
    provider: 'Zoho Mail',
    plan: 'Mail Lite 10 GB',
    mailbox: '10 GB · IMAP/POP · web + apps',
    perUserYear: '~₹708 (₹59/mo)',
    cost70: '~₹49,600 + GST',
    cost150: '~₹1.06 lakh + GST',
    reliability: 'High (cloud, India DC option)',
    migrateEase: 'IMAP tool + dedicated agent (50+ users)',
    recommended: true,
    note: 'Best economy. Mix Premium (50 GB) for directors / shared inboxes.',
  },
  {
    provider: 'Zoho Workplace',
    plan: 'Standard',
    mailbox: '30 GB mail + WorkDrive / Cliq / Writer',
    perUserYear: '~₹1,188 (₹99/mo)',
    cost70: '~₹83,200 + GST',
    cost150: '~₹1.78 lakh + GST',
    reliability: 'High',
    migrateEase: 'Same as Zoho Mail + migration agent',
    note: 'Choose if you also want chat, docs, and team files — still cheaper than Google.',
  },
  {
    provider: 'Google Workspace',
    plan: 'Business Starter',
    mailbox: 'Gmail · 30 GB pooled · Meet 100',
    perUserYear: '~₹3,240 (₹270/mo)',
    cost70: '~₹2.27 lakh + GST',
    cost150: '~₹4.86 lakh + GST',
    reliability: 'Highest (99.9% SLA, Gmail reputation)',
    migrateEase: 'Data Migration / GWMME from IMAP',
    note: 'Pay more for deliverability and familiar Gmail. Starter caps at 300 users.',
  },
  {
    provider: 'Microsoft 365',
    plan: 'Business Basic',
    mailbox: 'Exchange 50 GB · Outlook web · Teams · 1 TB OneDrive',
    perUserYear: '~₹2,040 (₹170/mo official)',
    cost70: '~₹1.43 lakh + GST',
    cost150: '~₹3.06 lakh + GST',
    reliability: 'Highest (Exchange Online SLA)',
    migrateEase: 'IMAP migration in Exchange admin',
    note: 'Best if staff already use Outlook desktop later (upgrade to Standard for desktop Office).',
  },
  {
    provider: 'Hostinger Mail (Titan)',
    plan: 'Per-mailbox promo',
    mailbox: '10–50 GB · Titan webmail',
    perUserYear: '~₹300–₹900 intro (renews higher)',
    cost70: 'Varies; renewals jump',
    cost150: 'Awkward at this scale',
    reliability: 'Medium (budget mailbox host)',
    migrateEase: 'Manual IMAP / Titan import',
    note: 'Cheap for a handful of boxes. Not recommended as the company mail platform for 150 IDs.',
  },
];

export const EMAIL_COST_SCENARIOS = [
  {
    name: 'Recommended mix (grow to 150)',
    detail: '120 × Zoho Mail Lite 10 GB + 30 × Mail Premium 50 GB',
    annualExGst: '~₹1.57 lakh',
    annualIncGst: '~₹1.85 lakh',
    notes: 'Most staff on Lite; info@, sales@, directors, legal on Premium.',
  },
  {
    name: 'All Lite — 70 seats (start now)',
    detail: '70 × Zoho Mail Lite 10 GB — cover current 60+ IDs with headroom',
    annualExGst: '~₹49,600',
    annualIncGst: '~₹58,500',
    notes: 'Add licences as you approach 150. Do not buy 150 on day one unless hiring is certain.',
  },
  {
    name: 'All Lite — 150 seats',
    detail: '150 × Zoho Mail Lite 10 GB',
    annualExGst: '~₹1.06 lakh',
    annualIncGst: '~₹1.25 lakh',
    notes: 'Lowest full-fleet cloud mail. Upgrade individuals who hit 10 GB.',
  },
  {
    name: 'Reliability — Google Starter 150',
    detail: '150 × Google Workspace Business Starter',
    annualExGst: '~₹4.86 lakh',
    annualIncGst: '~₹5.73 lakh',
    notes: 'If spam/deliverability incidents are costing sales, this is the safer spend.',
  },
  {
    name: 'Microsoft path 150',
    detail: '150 × Microsoft 365 Business Basic',
    annualExGst: '~₹3.06 lakh',
    annualIncGst: '~₹3.61 lakh',
    notes: 'Includes Teams + OneDrive. Desktop Word/Excel needs Business Standard (~₹860/user/mo).',
  },
];

export const EMAIL_TIMELINE = {
  window: 'Complete before September 2026 renewal — target MX cutover 7–10 days before old plan expires',
  totalCalendar: '3 weeks (accelerated) or 4–5 weeks (comfortable)',
  itEffort: '40–70 person-hours (IT/admin) + 15–20 minutes per staff member to reconfigure phone/Outlook',
  phases: [
    { week: 'Week 1', focus: 'Inventory, buy licences, verify domain (no MX change yet), create users & groups' },
    { week: 'Week 2', focus: 'IMAP copy of mailboxes in batches; dual-delivery / catch-all test; train power users' },
    { week: 'Week 3', focus: 'MX + SPF/DKIM/DMARC cutover; client reconfiguration; monitor bounce/spam' },
    { week: 'Week 4', focus: 'Delta sync leftovers, cancel Roundcube host, keep old IMAP 7 days as rollback' },
  ],
};

export const EMAIL_PURCHASE_STEPS = [
  'Decide provider (default: Zoho Mail). Open zoho.com/mail → Sign up with a personal/admin Gmail or existing Zoho ID — this becomes the super-admin, not a @zigma mailbox yet.',
  'Add domain zigma-technologies.com. Zoho shows a TXT verification record — add it at BigRock / UrbanVendo DNS. Do not change MX yet.',
  'Pick Mail Lite 10 GB as the default licence. Add Mail Premium only for users who already have large Roundcube folders (export size > 8 GB).',
  'Buy seats for current active IDs + 10% buffer (e.g. 70 licences), not the full 150 until hiring is real. Annual billing, GST invoice via Zoho India.',
  'Optional: request Zoho migration assistance (included for orgs with more than 50 users) — you get a dedicated technical agent.',
  'If choosing Google instead: workspace.google.com → Business Starter annual → verify domain with TXT → skip MX until mail is copied.',
  'If choosing Microsoft: admin.microsoft.com → Business Basic → add domain → TXT verify → same MX-last rule.',
];

export const EMAIL_PHASES: EmailPhase[] = [
  {
    id: 'inventory',
    phase: 'Phase 0',
    title: 'Inventory & freeze list',
    summary: 'Know every mailbox, alias, forwarder, and mailing list before you buy licences.',
    days: '1–2 days',
    effort: '4–8 hours',
    steps: [
      'Export mailbox list from UrbanVendo CWP (cpanel.zigma-technologies.com → Email Accounts). Include quota used, last login, forwards, and autoresponders.',
      'Classify: active human, shared (info@, sales@, hr@, support@), alias-only, dormant (no login 90+ days).',
      'Do not migrate dormant IDs — convert to aliases or drop. Target paid seats ≈ active humans + shared inboxes.',
      'Record IMAP settings used today: typically mail.zigma-technologies.com or the server hostname, port 993 SSL, username = full address.',
      'Ask staff to empty Trash/Spam and note any PST/Outlook local archives that are not on the server.',
      'Lower TTL on MX and SPF TXT to 300 seconds at least 24 hours before cutover.',
      'Agree a Friday evening or Saturday morning MX window; announce “webmail URL will change; addresses stay the same”.',
    ],
    checklist: [
      'Spreadsheet of 60+ IDs with used GB and owner',
      'Shared mailboxes identified (info@, sales@, careers@, hr@)',
      'Dormant IDs marked skip/alias',
      'IMAP host/port confirmed',
      'TTL lowered on mail DNS',
    ],
  },
  {
    id: 'provision',
    phase: 'Phase 1',
    title: 'Buy cloud mail & verify domain (MX unchanged)',
    summary: 'Licences and domain ownership proof only. Incoming mail still hits Roundcube.',
    days: '1 day',
    effort: '2–4 hours',
    steps: [
      'Create Zoho org (or Google / Microsoft tenant) with a non-domain recovery email for the super-admin.',
      'Add zigma-technologies.com → copy TXT verification → BigRock DNS Management → Save. Wait 5–60 minutes.',
      'Confirm domain Verified in the admin console. Still do not publish MX / DKIM until Phase 3.',
      'Purchase licences (70 to start, or 150 if budgeted). Assign Lite vs Premium per the inventory spreadsheet.',
      'Create users in bulk (CSV import): email, display name, department. Temporary passwords go to managers, not email yet.',
      'Create groups: info@, sales@, support@, careers@ as group addresses with members — this replaces many Roundcube forwarders.',
      'Enable MFA for admins immediately.',
    ],
    checklist: [
      'Domain TXT verified',
      'Licences purchased with GST invoice',
      'Users imported',
      'Groups for shared addresses',
      'Admin MFA on',
    ],
    warning: 'Never point MX at the Hostinger VPS. Website A records and mail MX are independent DNS.',
  },
  {
    id: 'copy',
    phase: 'Phase 2',
    title: 'Copy existing mail (IMAP) while Roundcube still receives',
    summary: 'Server-side copy so history is in the new inbox before anyone changes MX.',
    days: '3–7 days (depends on mailbox size)',
    effort: '12–24 hours (mostly unattended sync)',
    steps: [
      'Zoho Admin Console → Data Migration → IMAP. Server: mail.zigma-technologies.com (or UrbanVendo hostname), port 993, SSL.',
      'Map each source address to the same destination address. Use mailbox passwords (or CWP IMAP login).',
      'Run in batches of 15–20 mailboxes. Start with a pilot: one director, one sales, one shared (info@).',
      'Google path: Admin console → Data migration → IMAP. Microsoft path: Exchange admin → Migration → IMAP.',
      'Verify folder counts (Inbox, Sent, custom folders). Large boxes may take overnight.',
      'Leave Roundcube live — new mail still arrives there. Plan a second “delta” sync the morning of MX cutover.',
      'Optional dual delivery: in CWP, forward a copy of incoming mail to the new Zoho address if the host allows an external forward during coexistence.',
    ],
    checklist: [
      'Pilot 3 mailboxes verified by owners',
      'Batch sync for all active humans',
      'Shared inboxes copied',
      'Delta-sync window booked for cutover morning',
    ],
    warning:
      'IMAP copy needs each mailbox password or CWP IMAP login. If passwords are unknown, reset them in CWP first and notify users.',
  },
  {
    id: 'cutover',
    phase: 'Phase 3',
    title: 'DNS cutover — MX, SPF, DKIM, DMARC',
    summary: 'This is the moment new mail starts arriving at Zoho/Google/Microsoft. Addresses do not change.',
    days: '2–4 hours + 24–48h watch',
    effort: '4–8 hours',
    steps: [
      'Publish DKIM TXT from the new provider (Zoho: mail.zoho.com selector; Google: google._domainkey; Microsoft: selector1/selector2 CNAME).',
      'Replace SPF TXT. Zoho: v=spf1 include:zoho.in ~all (or include:zoho.com). Google: include:_spf.google.com. Microsoft: include:spf.protection.outlook.com. Remove +ip4:14.195.24.149 once mail has left UrbanVendo.',
      'Add DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@zigma-technologies.com (create that mailbox or alias first). Start with p=none for 1 week if you want a cautious rollout, then p=quarantine.',
      'Change MX records to the provider values (remove MX pointing at zigma-technologies.com). Zoho typically: mx.zoho.in (10), mx2.zoho.in (20), mx3.zoho.in (50). Google: ASPMX.L.GOOGLE.COM etc. Microsoft: tenant.mail.protection.outlook.com.',
      'Do not delete old A records for www in this step — website DNS is a separate project.',
      'Run a delta IMAP sync so mail that arrived during copy is not missed.',
      'Send test messages from Gmail, Outlook.com, and a phone to info@ and a personal ID. Confirm receipt in new webmail.',
      'Update the website SMTP in Hostinger .env (SMTP_HOST to smtp.zoho.in / smtp.gmail.com / smtp.office365.com) so enquiry notifications keep sending after the old server is gone.',
    ],
    checklist: [
      'MX points to new provider (nslookup -type=MX)',
      'SPF updated; old IP removed',
      'DKIM pass on mail-tester.com / mxtoolbox',
      'DMARC published',
      'Test inbound + outbound',
      'Site SMTP_ env updated',
    ],
    warning:
      'If email currently uses @zigma-technologies.com, only MX/TXT change. If you also migrate the website the same week, do A records in a separate window so you can tell which change broke what.',
  },
  {
    id: 'clients',
    phase: 'Phase 4',
    title: 'Staff devices & Roundcube replacement',
    summary: 'Everyone keeps the same address; they open a new webmail URL and/or update IMAP/SMTP in Outlook/phones.',
    days: '2–3 days (overlap with Phase 3)',
    effort: '15–20 min per user; 8–16 hours IT helpdesk',
    steps: [
      'Circulate the new webmail URL: mail.zoho.com (or mail.google.com / outlook.office.com). Optional: CNAME mail → the provider so staff type mail.zigma-technologies.com.',
      'Outlook / Apple Mail / Android: IMAP host imap.zoho.in (or imap.gmail.com / outlook.office365.com), SMTP smtp.zoho.in port 587 STARTTLS, username = full email.',
      'Reset temporary passwords; require MFA for finance, HR, and directors.',
      'Recreate signatures, calendars, and shared “Send as” on groups.',
      'Train: Roundcube bookmarks will stop working after the old host is cancelled — pin the new URL.',
      'Keep old Roundcube read-only for 7 days so anyone who missed a folder can log in once more.',
    ],
    checklist: [
      'Helpdesk one-pager sent to all staff',
      'Directors and sales on MFA',
      'Phones and Outlook updated for critical users',
      'Old Roundcube still reachable as fallback',
    ],
  },
  {
    id: 'close',
    phase: 'Phase 5',
    title: 'Stabilise, then cancel old mail hosting',
    summary: 'Do not renew UrbanVendo/Roundcube mail in September if MX has been stable for a week.',
    days: '7–14 days after cutover',
    effort: '4 hours',
    steps: [
      'Watch bounce reports and Zoho/Google admin alerts daily for one week.',
      'Check that newsletters, printers, scanners, CCTV, and CRM “from” addresses still send (update SMTP there too).',
      'Confirm website contact forms still notify staff (Site Settings + SMTP_*).',
      'Export a final CWP/server backup (home directory + email) to cold storage, then cancel the UrbanVendo / Exigo hosting+email plan — do not renew in September.',
      'Document super-admin, DNS logins, and licence count in the password manager.',
      'Plan quarterly licence review — add seats toward 150 only when people join.',
    ],
    checklist: [
      '7 days with no MX rollback',
      'Scanners/CRM SMTP updated',
      'Form notifications working',
      'Old mail plan cancelled before Sep renewal',
      'Admin credentials stored',
    ],
  },
];

export const EMAIL_DNS_RECORDS = [
  {
    type: 'MX',
    name: '@',
    zoho: 'mx.zoho.in (10), mx2.zoho.in (20), mx3.zoho.in (50)',
    google: 'ASPMX.L.GOOGLE.COM (1) + alt Google MX',
    microsoft: '<tenant>.mail.protection.outlook.com (0)',
    notes: 'Replace current MX zigma-technologies.com',
  },
  {
    type: 'TXT',
    name: '@',
    zoho: 'v=spf1 include:zoho.in ~all',
    google: 'v=spf1 include:_spf.google.com ~all',
    microsoft: 'v=spf1 include:spf.protection.outlook.com ~all',
    notes: 'One SPF record only — merge if website sending stays elsewhere',
  },
  {
    type: 'TXT',
    name: 'DKIM selector',
    zoho: 'Provider-generated (often zoho._domainkey)',
    google: 'google._domainkey',
    microsoft: 'selector1/2 CNAME to Microsoft',
    notes: 'Copy exact value from admin console',
  },
  {
    type: 'TXT',
    name: '_dmarc',
    zoho: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@zigma-technologies.com',
    google: 'Same pattern',
    microsoft: 'Same pattern',
    notes: 'Start p=none for 7 days if you want a cautious policy',
  },
  {
    type: 'CNAME',
    name: 'mail',
    zoho: 'Optional → business.zoho.in (check Zoho docs)',
    google: 'Optional ghs.googlehosted.com for Gmail',
    microsoft: 'Optional autodiscover',
    notes: 'Convenience only — not required for mail delivery',
  },
];

export const EMAIL_SMTP_SITE = `NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://www.zigma-technologies.com
# Enquiry notifications — use the NEW provider, not the old Roundcube host
SMTP_HOST=smtp.zoho.in
SMTP_PORT=587
SMTP_USER=noreply@zigma-technologies.com
SMTP_PASS=<app-password>
SMTP_FROM="Zigma Technologies <noreply@zigma-technologies.com>"`;

export const EMAIL_ROLLBACK = [
  'If inbound mail fails after MX change, restore the old MX (zigma-technologies.com / UrbanVendo) within minutes — TTL 300s makes this fast.',
  'Leave Roundcube accounts enabled for 7–14 days; IMAP copy is one-way so old mail is still on the old server until you delete it.',
  'Do not cancel the old subscription until tests pass and the September renewal date is still in the future.',
  'SPF/DKIM mistakes cause outbound spam folders — revert SPF to include both old IP and new include: while debugging, then tighten.',
  'Website can stay on UrbanVendo or Hostinger independently; rolling back mail does not require rolling back the website.',
];

export const EMAIL_FAQ = [
  {
    q: 'Will our email addresses change?',
    a: 'No. Everyone keeps name@zigma-technologies.com. Only the server behind the address changes. Roundcube.com is not your domain — it is just the current webmail screen.',
  },
  {
    q: 'If Roundcube is only a UI, who is the email provider?',
    a: 'UrbanVendo. Mailboxes sit on their server 14.195.24.149 (hostname cwp.urbanvendo.com, Postfix + Control Web Panel). Exigo IT Inc (Bengaluru) is the WHOIS technical contact — that is who the September renewal is with. Roundcube.com has no contract with you. Tata Teleservices only provides the IP. BigRock only registers the domain.',
  },
  {
    q: 'Is Roundcube a mail host we can “renew”?',
    a: 'No. Roundcube is open-source webmail. UrbanVendo runs it on the same box as the website (CWP + Postfix). Availability problems come from that server — urbanvendo.com itself currently shows “Account Suspended”. Moving to Zoho/Google/Microsoft replaces the server and the webmail UI.',
  },
  {
    q: 'Can we put mail on the new Hostinger VPS?',
    a: 'Technically yes, practically no for 150 IDs. Mail on the same VPS as Next.js recreates today’s outages (disk, RAM, IP reputation). Keep mail on a specialist cloud provider; keep the website on Hostinger.',
  },
  {
    q: 'Zoho vs Google — which should we pick?',
    a: 'Default to Zoho Mail Lite for cost (about ₹1.25 lakh/year incl. GST at 150 Lite seats) plus a free migration agent above 50 users. Pick Google Workspace Starter if customers report mail in spam or you want Gmail/Meet as the daily suite (~₹5.7 lakh/year incl. GST at 150 seats).',
  },
  {
    q: 'Do we buy 150 licences on day one?',
    a: 'No. Licence the 60+ active IDs plus ~10% buffer (≈70). Add seats as people join. Cloud mail is billed per user; empty mailboxes waste budget.',
  },
  {
    q: 'What about aliases vs real mailboxes?',
    a: 'Use a real mailbox or a group for anything people send from (info@, sales@). Use aliases/forwards for name variants (s.kumar@ → sanjay@). Aliases are usually free and should not consume a paid seat.',
  },
  {
    q: 'Can website and email migrate on the same weekend?',
    a: 'Avoid it. Migrate email first (MX only) while the site still on UrbanVendo, stabilize a week, then point www A records to Hostinger. Two DNS changes on one night makes rollback guesswork.',
  },
];

export const EMAIL_TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'provider', label: 'Who provides mail' },
  { id: 'current-state', label: 'Current mail setup' },
  { id: 'recommendation', label: 'Recommendation' },
  { id: 'comparison', label: 'Provider comparison' },
  { id: 'cost', label: 'Annual cost' },
  { id: 'timeline', label: 'Timeline & effort' },
  { id: 'purchase', label: 'How to buy' },
  { id: 'phases', label: 'Migration phases' },
  { id: 'dns', label: 'DNS records' },
  { id: 'smtp', label: 'Website SMTP' },
  { id: 'rollback', label: 'Rollback' },
  { id: 'faq', label: 'FAQ' },
];
