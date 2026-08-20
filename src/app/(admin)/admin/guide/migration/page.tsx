'use client';

import Link from 'next/link';
import {
  MIGRATION_CURRENT_STATE,
  MIGRATION_DNS_RECORDS,
  MIGRATION_ENV_PROD,
  MIGRATION_FAQ,
  MIGRATION_NGINX_SNIPPET,
  MIGRATION_PHASES,
  MIGRATION_PLAN_COMPARISON,
  MIGRATION_PLAN_RECOMMENDATION,
  MIGRATION_PURCHASE_STEPS,
  MIGRATION_ROLLBACK,
  MIGRATION_TOC,
} from '@/lib/admin-guide-migration';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="admin-guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function AdminMigrationGuidePage() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-grid">
          <div>
            <div className="admin-guide-eyebrow">DevOps · Hostinger · DNS</div>
            <h2 className="admin-guide-title">Hostinger migration guide</h2>
            <p className="admin-guide-lead">
              Complete plan selection, purchase steps, and phased migration from BigRock / UrbanVendo (
              {MIGRATION_CURRENT_STATE.currentIp}) to Hostinger — keeping{' '}
              <strong>www.zigma-technologies.com</strong> as the live URL with all traffic routed to the new
              Next.js application.
            </p>
            <div className="admin-guide-hero-actions">
              <Link href="/admin/guide" className="admin-btn admin-btn-secondary">
                ← Admin guide
              </Link>
              <Link href="/admin/guide/hostinger-prod" className="admin-btn admin-btn-secondary">
                KVM 2 production
              </Link>
              <Link href="/admin/redirects" className="admin-btn admin-btn-primary">
                Redirects module
              </Link>
            </div>
          </div>
          <div className="admin-guide-hero-stats">
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Recommended</span>
              <span className="admin-guide-stat-value">KVM 2</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Phases</span>
              <span className="admin-guide-stat-value">6</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Registrar</span>
              <span className="admin-guide-stat-value">BigRock</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Target</span>
              <span className="admin-guide-stat-value">Hostinger</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="Migration guide sections">
          <div className="admin-guide-toc-inner">
            <div className="admin-guide-toc-title">Contents</div>
            <ul>
              {MIGRATION_TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="admin-guide-toc-divider" />
            <div className="admin-guide-toc-title">Phases</div>
            <ul className="admin-guide-toc-modules">
              {MIGRATION_PHASES.map((p) => (
                <li key={p.id}>
                  <a href={`#phase-${p.id}`}>{p.phase}</a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="admin-guide-main">
          <section id="overview" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Summary</div>
              <h3>What you are migrating</h3>
              <p>
                You are moving the <strong>application hosting</strong> from UrbanVendo to Hostinger. The domain{' '}
                <code>zigma-technologies.com</code> stays registered at BigRock; you update DNS so{' '}
                <code>www</code> and apex requests resolve to your Hostinger VPS IP instead of{' '}
                <code>{MIGRATION_CURRENT_STATE.currentIp}</code>.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Recommended path:</strong> Buy <strong>{MIGRATION_PLAN_RECOMMENDATION.primary}</strong> → deploy
              UAT at <code>uat.zigma-technologies.com</code> → QA sign-off → deploy PROD → update BigRock DNS →
              validate → decommission old host.
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Mail currently lives on the same UrbanVendo IP as the website (MX = the domain itself). Do not move 60–150
              mailboxes onto the Hostinger VPS. Complete{' '}
              <Link href="/admin/guide/email">email server migration</Link> (Google Workspace recommended; Zoho/Microsoft
              alternatives) on a different weekend from the www A-record cutover.
            </div>
            <div className="admin-guide-diagram">
              <p className="admin-guide-diagram-caption">Traffic flow after migration</p>
              <div className="admin-guide-diagram-stack">
                <div className="admin-guide-diagram-tier">
                  <div className="admin-guide-diagram-node">
                    <strong>Visitor → www.zigma-technologies.com</strong>
                    <p>DNS A record at BigRock points to Hostinger VPS IP</p>
                  </div>
                </div>
                <div className="admin-guide-diagram-connector" aria-hidden="true" />
                <div className="admin-guide-diagram-tier admin-guide-diagram-tier--split">
                  <div className="admin-guide-diagram-node">
                    <strong>Nginx (443/80)</strong>
                    <p>SSL termination, reverse proxy, 25 MB upload limit</p>
                  </div>
                  <div className="admin-guide-diagram-node">
                    <strong>PM2 → Next.js :3000</strong>
                    <p>App Router, admin portal, public API routes</p>
                  </div>
                </div>
                <div className="admin-guide-diagram-connector" aria-hidden="true" />
                <div className="admin-guide-diagram-tier">
                  <div className="admin-guide-diagram-node">
                    <strong>MySQL (zigmatech)</strong>
                    <p>CMS pages, catalog, enquiries, theme_settings</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="current-state" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">As-is</div>
              <h3>Current domain &amp; hosting setup</h3>
              <p>Verified via public DNS / WHOIS lookup. Use this when planning DNS changes.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Domain</th>
                    <td>
                      <code>{MIGRATION_CURRENT_STATE.domain}</code> /{' '}
                      <code>{MIGRATION_CURRENT_STATE.www}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Registrar</th>
                    <td>{MIGRATION_CURRENT_STATE.registrar}</td>
                  </tr>
                  <tr>
                    <th>Nameservers</th>
                    <td>
                      {MIGRATION_CURRENT_STATE.nameservers.map((ns) => (
                        <code key={ns} style={{ display: 'block' }}>
                          {ns}
                        </code>
                      ))}
                    </td>
                  </tr>
                  <tr>
                    <th>Current web IP</th>
                    <td>
                      <code>{MIGRATION_CURRENT_STATE.currentIp}</code> ({MIGRATION_CURRENT_STATE.currentHost})
                    </td>
                  </tr>
                  <tr>
                    <th>Target host</th>
                    <td>{MIGRATION_CURRENT_STATE.targetHost}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              {MIGRATION_CURRENT_STATE.note}
            </div>
          </section>

          <section id="plan-choice" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Plan selection</div>
              <h3>Which Hostinger plan fits this application?</h3>
              <p>{MIGRATION_PLAN_RECOMMENDATION.primaryReason}</p>
            </div>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card admin-guide-ref-card--highlight">
                <h4>Production (recommended)</h4>
                <p className="admin-guide-workflow-purpose">
                  <strong>{MIGRATION_PLAN_RECOMMENDATION.primary}</strong>
                </p>
                <ul>
                  <li>2 vCPU, 8 GB RAM — comfortable for Next.js build + runtime + MySQL</li>
                  <li>Full root access: PM2, Nginx, Certbot, custom firewall</li>
                  <li>Matches README Section 16 deployment method</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>UAT / staging</h4>
                <p className="admin-guide-workflow-purpose">{MIGRATION_PLAN_RECOMMENDATION.uatOption}</p>
                <ul>
                  <li>{MIGRATION_PLAN_RECOMMENDATION.uatReason}</li>
                  <li>Separate DB and AUTH_SECRET from production</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Avoid</h4>
                <p className="admin-guide-workflow-purpose">{MIGRATION_PLAN_RECOMMENDATION.avoid}</p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Specs</th>
                    <th>Best for</th>
                    <th>Pricing note</th>
                  </tr>
                </thead>
                <tbody>
                  {MIGRATION_PLAN_COMPARISON.map((row) => (
                    <tr key={row.plan} className={row.recommended ? 'admin-table-row--highlight' : undefined}>
                      <td>
                        {row.plan}
                        {row.recommended ? (
                          <span className="admin-guide-badge admin-guide-badge--editor" style={{ marginLeft: '0.5rem' }}>
                            Recommended
                          </span>
                        ) : null}
                      </td>
                      <td>{row.specs}</td>
                      <td>{row.bestFor}</td>
                      <td className="admin-table-muted">{row.promoNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-guide-section-footnote">
              Prices are indicative intro rates — always confirm current pricing and renewal at{' '}
              <a href="https://www.hostinger.com/vps-hosting" target="_blank" rel="noopener noreferrer">
                hostinger.com/vps-hosting
              </a>{' '}
              before purchase. Budget for renewal rates, not promotional first-term prices.
            </p>
          </section>

          <section id="purchase" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Purchase</div>
              <h3>How to buy Hostinger (step by step)</h3>
              <p>Follow this sequence once you have chosen KVM 2 for production (and optionally a UAT plan).</p>
            </div>
            <ol className="admin-guide-steps">
              {MIGRATION_PURCHASE_STEPS.map((step, i) => (
                <li key={step} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>hPanel:</strong> After purchase, all server management happens at{' '}
              <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener noreferrer">
                hpanel.hostinger.com
              </a>
              . Store credentials in your team password manager.
            </div>
          </section>

          <section id="phases" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Execution</div>
              <h3>Migration phases — complete walkthrough</h3>
              <p>Six phases from preparation through DNS cutover and decommissioning the old host.</p>
            </div>
            <div className="admin-guide-detail-list">
              {MIGRATION_PHASES.map((phase) => (
                <article key={phase.id} id={`phase-${phase.id}`} className="admin-guide-detail">
                  <div className="admin-guide-detail-head">
                    <div>
                      <span className="admin-guide-detail-label">{phase.phase}</span>
                      <h4>{phase.title}</h4>
                    </div>
                  </div>
                  <p className="admin-guide-flow-summary">{phase.summary}</p>
                  {phase.warning ? (
                    <div className="admin-guide-callout admin-guide-callout--warn">{phase.warning}</div>
                  ) : null}
                  <div className="admin-guide-detail-grid">
                    <div className="admin-guide-detail-block">
                      <span className="admin-guide-detail-label">Steps</span>
                      <ol>
                        {phase.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    {phase.checklist?.length ? (
                      <div className="admin-guide-detail-block">
                        <span className="admin-guide-detail-label">Checklist</span>
                        <ul className="admin-guide-checklist">
                          {phase.checklist.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="dns" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">DNS</div>
              <h3>Route www.zigma-technologies.com to Hostinger</h3>
              <p>
                Update records at BigRock (or UrbanVendo DNS panel). Do not change MX records unless migrating email.
              </p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Value</th>
                    <th>TTL</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {MIGRATION_DNS_RECORDS.map((r) => (
                    <tr key={`${r.type}-${r.name}`}>
                      <td>
                        <code>{r.type}</code>
                      </td>
                      <td>
                        <code>{r.name}</code>
                      </td>
                      <td>
                        <code>{r.value}</code>
                      </td>
                      <td>{r.ttl}</td>
                      <td>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card">
                <h4>BigRock DNS steps</h4>
                <ol className="admin-guide-detail-block">
                  <li>Log in at bigrock.com → My Domains → zigma-technologies.com</li>
                  <li>Open DNS Management / Manage DNS</li>
                  <li>Edit A record for @ → new Hostinger VPS IP</li>
                  <li>Edit A record for www → same IP (or CNAME to @)</li>
                  <li>Save; verify with nslookup www.zigma-technologies.com</li>
                </ol>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Legacy URL redirects</h4>
                <ul>
                  <li>
                    Add rules in <Link href="/admin/redirects">Redirects</Link> for old .html paths
                  </li>
                  <li>Hardcoded legacy paths also exist in src/proxy.ts</li>
                  <li>Submit updated sitemap after cutover</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="config" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Configuration</div>
              <h3>Production server snippets</h3>
              <p>
                Full commands in repository <code>README.md</code> Sections 16–17. Key templates below.
              </p>
            </div>
            <h4 className="admin-guide-subheading">Nginx reverse proxy</h4>
            <CodeBlock>{MIGRATION_NGINX_SNIPPET}</CodeBlock>
            <h4 className="admin-guide-subheading">Production .env (template)</h4>
            <CodeBlock>{MIGRATION_ENV_PROD}</CodeBlock>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card">
                <h4>Deploy commands</h4>
                <CodeBlock>{`cd /var/www/zigma-technologies
git pull origin master
npm install
npm run build
pm2 restart zigma`}</CodeBlock>
              </div>
              <div className="admin-guide-ref-card">
                <h4>Database import</h4>
                <CodeBlock>{`npm run db:export -- --with-cms-media   # on source
npm run db:import -- storage/exports/zigma-... --force   # on target`}</CodeBlock>
              </div>
            </div>
          </section>

          <section id="rollback" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Safety</div>
              <h3>Rollback procedure</h3>
              <p>If the new site fails after DNS cutover, revert DNS to the old IP quickly.</p>
            </div>
            <ul className="admin-guide-rollback-list">
              {MIGRATION_ROLLBACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="faq" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">FAQ</div>
              <h3>Common questions</h3>
            </div>
            <div className="admin-guide-faq-list">
              {MIGRATION_FAQ.map((item) => (
                <details key={item.q} className="admin-guide-faq">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
