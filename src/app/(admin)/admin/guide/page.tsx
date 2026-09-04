'use client';

import AdminGuideArchitectureDiagram from '@/components/admin/AdminGuideArchitectureDiagram';
import Link from 'next/link';
import {
  GUIDE_ARCHITECTURE,
  GUIDE_FLOWS,
  GUIDE_MODULE_DETAILS,
  GUIDE_QUICK_START,
  GUIDE_ROLES,
  GUIDE_SECTIONS,
  GUIDE_WORKFLOWS,
  modulesForSection,
} from '@/lib/admin-guide';

const TOC = [
  { id: 'justxsystems', label: 'justxsystems staging' },
  { id: 'hostinger-prod', label: 'KVM 2 production setup' },
  { id: 'migration', label: 'Hostinger migration' },
  { id: 'email', label: 'Email migration' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'flows', label: 'Data flows' },
  { id: 'start', label: 'Quick start' },
  ...GUIDE_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
  { id: 'modules', label: 'Module reference' },
  { id: 'workflows', label: 'Playbooks' },
  { id: 'roles', label: 'Roles & access' },
  { id: 'reference', label: 'Operations' },
];

function badgeClass(badge: string) {
  if (badge === 'Admin only') return 'admin-guide-badge admin-guide-badge--admin';
  if (badge === 'Public') return 'admin-guide-badge admin-guide-badge--public';
  return 'admin-guide-badge admin-guide-badge--editor';
}

function ModuleDetailCard({ mod }: { mod: (typeof GUIDE_MODULE_DETAILS)[number] }) {
  return (
    <article id={`module-${mod.id}`} className="admin-guide-detail">
      <div className="admin-guide-detail-head">
        <div>
          <h4>{mod.title}</h4>
          <code className="admin-guide-path">{mod.path}</code>
        </div>
        <span className={badgeClass(mod.badge)}>{mod.badge}</span>
      </div>

      <div className="admin-guide-detail-why">
        <span className="admin-guide-detail-label">Why</span>
        <p>{mod.why}</p>
      </div>

      <div className="admin-guide-detail-grid">
        <div className="admin-guide-detail-block">
          <span className="admin-guide-detail-label">When to use</span>
          <ul>
            {mod.when.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
        <div className="admin-guide-detail-block">
          <span className="admin-guide-detail-label">How to use</span>
          <ol>
            {mod.how.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="admin-guide-detail-meta">
        <div>
          <span className="admin-guide-detail-label">Public impact</span>
          <ul>
            {mod.publicRoutes.map((r) => (
              <li key={r}>
                <code>{r}</code>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="admin-guide-detail-label">Database</span>
          <ul>
            {mod.dbTables.map((t) => (
              <li key={t}>
                <code>{t}</code>
              </li>
            ))}
          </ul>
        </div>
        {mod.seeds?.length ? (
          <div>
            <span className="admin-guide-detail-label">Seeds / bootstrap</span>
            <ul>
              {mod.seeds.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Link href={mod.path} className="admin-guide-module-cta">
        Open {mod.title} →
      </Link>
    </article>
  );
}

export default function AdminGuidePage() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-grid">
          <div>
            <div className="admin-guide-eyebrow">Zigma control portal · v1</div>
            <h2 className="admin-guide-title">Administrator &amp; editor guide</h2>
            <p className="admin-guide-lead">
              Complete architecture, data flows, and module-by-module instructions for running the Zigma Technologies
              marketing site. Covers why each feature exists, when to use it, and how to operate it — for editors and
              platform administrators.
            </p>
            <div className="admin-guide-hero-actions">
              <Link href="/admin/guide/justxsystems" className="admin-btn admin-btn-primary">
                justxsystems staging →
              </Link>
              <Link href="/admin/guide/hostinger-prod" className="admin-btn admin-btn-secondary">
                KVM 2 production →
              </Link>
              <Link href="/admin/guide/migration" className="admin-btn admin-btn-secondary">
                DNS / migration →
              </Link>
              <Link href="/admin/guide/email" className="admin-btn admin-btn-secondary">
                Email migration →
              </Link>
              <Link href="/admin" className="admin-btn admin-btn-secondary">
                Dashboard
              </Link>
            </div>
          </div>
          <div className="admin-guide-hero-stats">
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Modules</span>
              <span className="admin-guide-stat-value">{GUIDE_MODULE_DETAILS.length}</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Roles</span>
              <span className="admin-guide-stat-value">2</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">DB tables</span>
              <span className="admin-guide-stat-value">20+</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Go-live</span>
              <span className="admin-guide-stat-value">~15 min</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="Guide sections">
          <div className="admin-guide-toc-inner">
            <div className="admin-guide-toc-title">Contents</div>
            <ul>
              {TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="admin-guide-toc-divider" />
            <div className="admin-guide-toc-title">Modules</div>
            <ul className="admin-guide-toc-modules">
              {GUIDE_MODULE_DETAILS.map((m) => (
                <li key={m.id}>
                  <a href={`#module-${m.id}`}>{m.title}</a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="admin-guide-main">
          <section id="justxsystems" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Staging test</div>
              <h3>justxsystems.com/zigma-technologies — Hostinger subdirectory deploy</h3>
              <p>
                Blind-follow playbook to bring this app up at{' '}
                <strong>https://justxsystems.com/zigma-technologies/</strong> on Hostinger: MySQL database, GitHub clone,{' '}
                <code>NEXT_PUBLIC_BASE_PATH=/zigma-technologies</code>, PM2 on port 3001, and an Nginx{' '}
                <code>location</code> that does not disturb the existing JustX homepage.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Use this for deployment testing.</strong> Final production on{' '}
              <code>www.zigma-technologies.com</code> (domain root) remains the{' '}
              <Link href="/admin/guide/hostinger-prod">KVM 2 production guide</Link>.
            </div>
            <Link href="/admin/guide/justxsystems" className="admin-guide-module admin-guide-module--link">
              <div className="admin-guide-module-top">
                <h4>Open justxsystems staging guide</h4>
                <span className="admin-guide-badge admin-guide-badge--admin">Admin / DevOps</span>
              </div>
              <p className="admin-guide-module-summary">
                SSH · MySQL zigmatech_jx · .env with basePath · build · PM2 :3001 · Nginx location · smoke tests ·
                git pull updates…
              </p>
              <span className="admin-guide-module-cta">Read staging guide →</span>
            </Link>
          </section>

          <section id="hostinger-prod" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Production</div>
              <h3>Hostinger KVM 2 — production setup from empty VPS</h3>
              <p>
                Blind-follow playbook for the live KVM 2 in Mumbai (<code>200.234.45.106</code> / Ubuntu 26.04): harden
                the empty OS, install MySQL 8, clone <code>JustXSystems/zigma-technologies</code>, configure{' '}
                <code>.env</code>, run under PM2 + Nginx, point <code>zigma-technologies.com</code>, then wire GitHub
                Actions auto-deploy as <code>deploy@200.234.45.106</code>.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Start here for greenfield PROD:</strong> VPS is already provisioned (KVM 2 · 8 GB · Mumbai 2). Use
              the migration guide only when cutting DNS over from an old host.
            </div>
            <Link href="/admin/guide/hostinger-prod" className="admin-guide-module admin-guide-module--link">
              <div className="admin-guide-module-top">
                <h4>Open KVM 2 production guide</h4>
                <span className="admin-guide-badge admin-guide-badge--admin">Admin / DevOps</span>
              </div>
              <p className="admin-guide-module-summary">
                Empty Ubuntu → firewall · Node/Nginx/PM2 · MySQL · GitHub clone · .env · SSL · DNS · Actions secrets ·
                deploy-prod.sh · go-live checklist…
              </p>
              <span className="admin-guide-module-cta">Read production guide →</span>
            </Link>
          </section>

          <section id="migration" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">DevOps</div>
              <h3>Hostinger migration — plan, purchase &amp; DNS cutover</h3>
              <p>
                Move <strong>www.zigma-technologies.com</strong> from BigRock / UrbanVendo hosting to Hostinger while
                keeping the domain registered at BigRock. Includes KVM plan recommendation, purchase steps, six-phase
                migration walkthrough, DNS records, Nginx templates, and rollback procedure.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Recommended production plan:</strong> Hostinger <strong>KVM 2 VPS</strong> (2 vCPU, 8 GB RAM) —
              required for Next.js 16 + MySQL + PM2 + Nginx. Deploy UAT first at{' '}
              <code>uat.zigma-technologies.com</code>, then cut over DNS. Full server install steps:{' '}
              <Link href="/admin/guide/hostinger-prod">KVM 2 production guide</Link>.
            </div>
            <Link href="/admin/guide/migration" className="admin-guide-module admin-guide-module--link">
              <div className="admin-guide-module-top">
                <h4>Open full migration guide</h4>
                <span className="admin-guide-badge admin-guide-badge--admin">Admin / DevOps</span>
              </div>
              <p className="admin-guide-module-summary">
                Plan comparison · How to buy Hostinger · Phase 0–5 checklist · BigRock DNS cutover · Production .env
                and Nginx snippets · Rollback FAQ…
              </p>
              <span className="admin-guide-module-cta">Read migration guide →</span>
            </Link>
          </section>

          <section id="email" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">IT · Mail</div>
              <h3>Email server migration — keep @zigma-technologies.com</h3>
              <p>
                Leave UrbanVendo self-hosted mail (60+ IDs, scale to 150) before the September 2026 renewal. The current
                provider is <strong>UrbanVendo / Exigo IT</strong> (Postfix + CWP); Roundcube is only the webmail UI.
                Addresses stay the same; only MX, SPF, DKIM, and DMARC change. Recommended next host:{' '}
                <strong>Google Workspace Business Starter</strong> (Zoho remains a budget alternative).
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Do not</strong> run 150 mailboxes on the Hostinger VPS. Migrate email first, website second.
              Indicative year-1 cost at 150 Google Starter seats: ~₹5.73 lakh incl. GST.
            </div>
            <Link href="/admin/guide/email" className="admin-guide-module admin-guide-module--link">
              <div className="admin-guide-module-top">
                <h4>Open email migration guide</h4>
                <span className="admin-guide-badge admin-guide-badge--admin">Admin / IT</span>
              </div>
              <p className="admin-guide-module-summary">
                Provider comparison · Annual cost scenarios · 3-week timeline · IMAP copy · DNS cutover · Website SMTP
                · Rollback…
              </p>
              <span className="admin-guide-module-cta">Read email guide →</span>
            </Link>
          </section>

          <section id="architecture" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">System design</div>
              <h3>Architecture overview</h3>
              <p>
                The admin portal and public site share one Next.js App Router codebase. Relational content lives in
                MySQL; global configuration lives in <code>theme_settings</code>.{' '}
                <code>src/proxy.ts</code> gates admin routes and applies redirects before public pages render.
              </p>
            </div>
            <div className="admin-guide-arch-stack">
              {GUIDE_ARCHITECTURE.map((layer, i) => (
                <div key={layer.label} className="admin-guide-arch-layer">
                  <div className="admin-guide-arch-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <strong>{layer.label}</strong>
                    <ul>
                      {layer.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <AdminGuideArchitectureDiagram />
          </section>

          <section id="flows" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">End-to-end</div>
              <h3>Core data flows</h3>
              <p>How content and leads move from admin edits to public delivery.</p>
            </div>
            <div className="admin-guide-flow-grid">
              {GUIDE_FLOWS.map((flow) => (
                <article key={flow.id} className="admin-guide-flow">
                  <h4>{flow.title}</h4>
                  <p className="admin-guide-flow-summary">{flow.summary}</p>
                  <ol>
                    {flow.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>

          <section id="start" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Getting started</div>
              <h3>Quick start — fresh install to go-live</h3>
              <p>Six steps from empty database to a reviewable public site with working lead capture.</p>
            </div>
            <ol className="admin-guide-steps">
              {GUIDE_QUICK_START.map((step, i) => (
                <li key={step.title} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.detail}</p>
                    {step.href ? (
                      <Link href={step.href} className="admin-guide-link">
                        Open module →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {GUIDE_SECTIONS.map((section) => {
            const mods = modulesForSection(section.id);
            if (!mods.length) return null;
            return (
              <section key={section.id} id={section.id} className="admin-guide-section">
                <div className="admin-guide-section-head">
                  <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">{section.eyebrow}</div>
                  <h3>{section.title}</h3>
                  <p>{section.lead}</p>
                </div>
                <div className="admin-guide-module-grid admin-guide-module-grid--compact">
                  {mods.map((mod) => (
                    <a key={mod.id} href={`#module-${mod.id}`} className="admin-guide-module admin-guide-module--link">
                      <div className="admin-guide-module-top">
                        <h4>{mod.title}</h4>
                        <span className={badgeClass(mod.badge)}>{mod.badge}</span>
                      </div>
                      <p className="admin-guide-module-summary">{mod.why.slice(0, 120)}…</p>
                      <span className="admin-guide-module-cta">Read guide →</span>
                    </a>
                  ))}
                </div>
              </section>
            );
          })}

          <section id="modules" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Reference</div>
              <h3>Module reference — why, when &amp; how</h3>
              <p>Detailed operating instructions for every admin feature.</p>
            </div>
            <div className="admin-guide-detail-list">
              {GUIDE_MODULE_DETAILS.map((mod) => (
                <ModuleDetailCard key={mod.id} mod={mod} />
              ))}
            </div>
          </section>

          <section id="workflows" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Playbooks</div>
              <h3>Common workflows</h3>
              <p>Repeatable sequences for go-live, content updates, leads, and environment cloning.</p>
            </div>
            <div className="admin-guide-workflow-grid">
              {GUIDE_WORKFLOWS.map((wf) => (
                <article key={wf.title} className="admin-guide-workflow">
                  <h4>{wf.title}</h4>
                  <p className="admin-guide-workflow-purpose">{wf.purpose}</p>
                  <ol>
                    {wf.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                  {wf.href ? (
                    <Link href={wf.href} className="admin-guide-link">
                      Go to module →
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section id="roles" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Security</div>
              <h3>Roles &amp; access control</h3>
              <p>
                <strong>Editors</strong> manage day-to-day content and leads. <strong>Admins</strong> additionally
                control theme, Site Copy, redirects, newsletter, partners, user accounts, and bootstrap actions. The
                last admin cannot be deleted or demoted.
              </p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Area</th>
                    <th>Editor</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {GUIDE_ROLES.map((row) => (
                    <tr key={row.area}>
                      <td>{row.area}</td>
                      <td>{row.editor ? '✓' : '—'}</td>
                      <td>{row.admin ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="reference" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Operations</div>
              <h3>Environment, deployment &amp; safety</h3>
              <p>
                Technical reference for operators. Full prose also in <code>ADMIN.md</code> at the repository root.
              </p>
            </div>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card">
                <h4>Database setup</h4>
                <ul>
                  <li>Fresh: <code>scripts/schema.sql</code></li>
                  <li>Upgrade: run all <code>scripts/migrate-*.sql</code> in ADMIN.md order</li>
                  <li>Clone: <code>npm run db:export</code> → <code>db:import --force</code></li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Required environment</h4>
                <ul>
                  <li><code>DB_HOST</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>DB_NAME</code></li>
                  <li><code>AUTH_SECRET</code>, <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD</code></li>
                  <li><code>NEXT_PUBLIC_SITE_URL</code> for sitemap/canonical</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Optional integrations</h4>
                <ul>
                  <li><code>SMTP_*</code> — enquiry notify + visitor auto-reply</li>
                  <li><code>PREVIEW_SECRET</code> — draft preview tokens</li>
                  <li>Turnstile keys — captcha on public forms</li>
                  <li>CRM webhook in Site Settings</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Re-seed safely</h4>
                <ul>
                  <li>Always delete existing rows before re-seeding</li>
                  <li>Inventory: Delete all {'{type}'}s → Seed</li>
                  <li>Nav: Clear → Seed header/footer</li>
                  <li>Pages: Clear sections → Seed homepage</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Public form protection</h4>
                <ul>
                  <li>Honeypot trap — bots get fake success</li>
                  <li>Rate limit: 6 submissions / 15 min per IP</li>
                  <li>Resumes stored under uploads — not URL-accessible</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Feature flags (Site Copy)</h4>
                <ul>
                  <li><code>toolsEnabled</code> — /tools/* routes</li>
                  <li><code>localesEnabled</code> — /hi, /kn landings</li>
                  <li><code>partnersEnabled</code> — partner portal</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
