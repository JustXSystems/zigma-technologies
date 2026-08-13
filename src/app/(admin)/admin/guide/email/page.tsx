'use client';

import Link from 'next/link';
import {
  EMAIL_COST_SCENARIOS,
  EMAIL_CURRENT_STATE,
  EMAIL_DNS_RECORDS,
  EMAIL_FAQ,
  EMAIL_PHASES,
  EMAIL_PROVIDER_COMPARISON,
  EMAIL_PROVIDER_LAYERS,
  EMAIL_PURCHASE_STEPS,
  EMAIL_RECOMMENDATION,
  EMAIL_ROLLBACK,
  EMAIL_SMTP_SITE,
  EMAIL_TIMELINE,
  EMAIL_TOC,
} from '@/lib/admin-guide-email';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="admin-guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function AdminEmailMigrationGuidePage() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-grid">
          <div>
            <div className="admin-guide-eyebrow">IT · Mail · DNS</div>
            <h2 className="admin-guide-title">Email server migration guide</h2>
            <p className="admin-guide-lead">
              Move {EMAIL_CURRENT_STATE.activeMailboxes} mailboxes off{' '}
              <strong>UrbanVendo</strong> (self-hosted Postfix + CWP + Roundcube webmail) onto a cloud mailbox vendor —
              keeping every address as <strong>@zigma-technologies.com</strong>. Complete before the{' '}
              {EMAIL_CURRENT_STATE.renewal.toLowerCase()}.
            </p>
            <div className="admin-guide-hero-actions">
              <Link href="/admin/guide" className="admin-btn admin-btn-secondary">
                ← Admin guide
              </Link>
              <Link href="/admin/guide/migration" className="admin-btn admin-btn-secondary">
                Website (Hostinger)
              </Link>
              <Link href="/admin/site-settings" className="admin-btn admin-btn-primary">
                Site Settings
              </Link>
            </div>
          </div>
          <div className="admin-guide-hero-stats">
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Recommended</span>
              <span className="admin-guide-stat-value">Zoho</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Seats now</span>
              <span className="admin-guide-stat-value">60+</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Scale to</span>
              <span className="admin-guide-stat-value">150</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Cutover</span>
              <span className="admin-guide-stat-value">~3 wk</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="Email migration sections">
          <div className="admin-guide-toc-inner">
            <div className="admin-guide-toc-title">Contents</div>
            <ul>
              {EMAIL_TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="admin-guide-toc-divider" />
            <div className="admin-guide-toc-title">Phases</div>
            <ul className="admin-guide-toc-modules">
              {EMAIL_PHASES.map((p) => (
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
                You are changing the <strong>mail server</strong>, not the email addresses. Staff keep{' '}
                <code>name@zigma-technologies.com</code>. Today there is no Google/Zoho/Microsoft mailbox tenant —{' '}
                <strong>UrbanVendo</strong> stores the inboxes on the same machine as the website. Roundcube is only the
                browser screen; that is why outages hit both mail and the site.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Recommended:</strong> {EMAIL_RECOMMENDATION.primary}. Buy ~70 licences now, grow to 150 as people
              join. Do <strong>not</strong> host company mail on the Hostinger VPS. Migrate email <em>before</em> the
              website DNS cutover so you can tell which change caused a problem.
            </div>
            <div className="admin-guide-diagram">
              <p className="admin-guide-diagram-caption">After cutover — addresses unchanged</p>
              <div className="admin-guide-diagram-stack">
                <div className="admin-guide-diagram-tier">
                  <div className="admin-guide-diagram-node">
                    <strong>info@ / name@zigma-technologies.com</strong>
                    <p>MX at BigRock points to Zoho (or Google / Microsoft) — not 14.195.24.149</p>
                  </div>
                </div>
                <div className="admin-guide-diagram-connector" aria-hidden="true" />
                <div className="admin-guide-diagram-tier admin-guide-diagram-tier--split">
                  <div className="admin-guide-diagram-node">
                    <strong>Cloud mailbox</strong>
                    <p>Webmail + Outlook/phone IMAP · 99.9%-class uptime</p>
                  </div>
                  <div className="admin-guide-diagram-node">
                    <strong>Website (separate)</strong>
                    <p>www A record → Hostinger VPS · SMTP_* for form mail</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="provider" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Identity</div>
              <h3>Who is the email provider today?</h3>
              <p>
                Verified 13 Aug 2026 from public DNS, HTTPS, and SMTP. <strong>UrbanVendo is the mailbox host.</strong>{' '}
                Roundcube is not. Google / Zoho / Microsoft / Hostinger are not in the current mail path.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Provider:</strong> {EMAIL_CURRENT_STATE.provider}
              <br />
              <strong>Renew / support:</strong> {EMAIL_CURRENT_STATE.operator} · {EMAIL_CURRENT_STATE.operatorPhone}
              <br />
              <strong>Software:</strong> {EMAIL_CURRENT_STATE.mta} · {EMAIL_CURRENT_STATE.controlPanel}
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Layer</th>
                    <th>Who</th>
                    <th>How we know</th>
                  </tr>
                </thead>
                <tbody>
                  {EMAIL_PROVIDER_LAYERS.map((row) => (
                    <tr key={row.role}>
                      <td>
                        <strong>{row.role}</strong>
                      </td>
                      <td>{row.who}</td>
                      <td className="admin-table-muted">{row.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">{EMAIL_CURRENT_STATE.urbanvendoSite}</div>
          </section>

          <section id="current-state" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">As-is</div>
              <h3>Current mail setup (live DNS)</h3>
              <p>Public lookup as of the migration planning date. Confirm again the morning of cutover.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Addresses</th>
                    <td>
                      <code>{EMAIL_CURRENT_STATE.addresses}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Email provider</th>
                    <td>{EMAIL_CURRENT_STATE.provider}</td>
                  </tr>
                  <tr>
                    <th>Who to renew with</th>
                    <td>
                      {EMAIL_CURRENT_STATE.operator}
                      <br />
                      {EMAIL_CURRENT_STATE.operatorPhone}
                    </td>
                  </tr>
                  <tr>
                    <th>Webmail UI</th>
                    <td>{EMAIL_CURRENT_STATE.webmail}</td>
                  </tr>
                  <tr>
                    <th>Control panel</th>
                    <td>{EMAIL_CURRENT_STATE.controlPanel}</td>
                  </tr>
                  <tr>
                    <th>Mail software</th>
                    <td>{EMAIL_CURRENT_STATE.mta}</td>
                  </tr>
                  <tr>
                    <th>Mail host</th>
                    <td>{EMAIL_CURRENT_STATE.host}</td>
                  </tr>
                  <tr>
                    <th>ISP (IP only)</th>
                    <td>{EMAIL_CURRENT_STATE.isp}</td>
                  </tr>
                  <tr>
                    <th>MX</th>
                    <td>
                      <code>{EMAIL_CURRENT_STATE.mx}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>SPF</th>
                    <td>
                      <code>{EMAIL_CURRENT_STATE.spf}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>DKIM / DMARC</th>
                    <td>
                      {EMAIL_CURRENT_STATE.dkim} · {EMAIL_CURRENT_STATE.dmarc}
                    </td>
                  </tr>
                  <tr>
                    <th>Scale</th>
                    <td>
                      {EMAIL_CURRENT_STATE.activeMailboxes} active → {EMAIL_CURRENT_STATE.targetMailboxes}
                    </td>
                  </tr>
                  <tr>
                    <th>Deadline</th>
                    <td>{EMAIL_CURRENT_STATE.renewal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">{EMAIL_CURRENT_STATE.note}</div>
          </section>

          <section id="recommendation" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Choice</div>
              <h3>Which provider fits Zigma?</h3>
              <p>{EMAIL_RECOMMENDATION.primaryWhy}</p>
            </div>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card admin-guide-ref-card--highlight">
                <h4>Default — Zoho Mail</h4>
                <p className="admin-guide-workflow-purpose">
                  <strong>{EMAIL_RECOMMENDATION.primary}</strong>
                </p>
                <ul>
                  <li>India GST invoice, any team size, IMAP/POP on paid plans</li>
                  <li>Dedicated migration agent when you have more than 50 users</li>
                  <li>Start with ~70 seats; add up to 150 without changing addresses</li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>If reliability is #1</h4>
                <p className="admin-guide-workflow-purpose">
                  <strong>{EMAIL_RECOMMENDATION.reliabilityPick}</strong>
                </p>
                <p className="admin-guide-workflow-purpose">{EMAIL_RECOMMENDATION.reliabilityWhy}</p>
              </div>
              <div className="admin-guide-ref-card">
                <h4>If the team is on Microsoft</h4>
                <p className="admin-guide-workflow-purpose">
                  <strong>{EMAIL_RECOMMENDATION.microsoftPick}</strong>
                </p>
                <p className="admin-guide-workflow-purpose">{EMAIL_RECOMMENDATION.microsoftWhy}</p>
              </div>
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              <strong>Avoid:</strong>
              <ul className="admin-guide-rollback-list" style={{ marginTop: '0.5rem' }}>
                {EMAIL_RECOMMENDATION.avoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section id="comparison" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Market</div>
              <h3>Provider comparison (India, Aug 2026)</h3>
              <p>List prices, annual commitment, exclusive of 18% GST. Confirm at checkout — promo rates change.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Plan</th>
                    <th>Mailbox</th>
                    <th>Per user / year</th>
                    <th>~70 seats</th>
                    <th>~150 seats</th>
                    <th>Migrate</th>
                  </tr>
                </thead>
                <tbody>
                  {EMAIL_PROVIDER_COMPARISON.map((row) => (
                    <tr key={row.provider} className={row.recommended ? 'admin-table-row--highlight' : undefined}>
                      <td>
                        {row.provider}
                        {row.recommended ? (
                          <span className="admin-guide-badge admin-guide-badge--editor" style={{ marginLeft: '0.5rem' }}>
                            Recommended
                          </span>
                        ) : null}
                      </td>
                      <td>{row.plan}</td>
                      <td>{row.mailbox}</td>
                      <td>{row.perUserYear}</td>
                      <td>{row.cost70}</td>
                      <td>{row.cost150}</td>
                      <td className="admin-table-muted">{row.migrateEase}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-guide-section-footnote">
              Official references:{' '}
              <a href="https://www.zoho.com/en-in/mail/zohomail-pricing.html" target="_blank" rel="noopener noreferrer">
                Zoho Mail pricing
              </a>
              {' · '}
              <a href="https://workspace.google.com/intl/en_in/business/" target="_blank" rel="noopener noreferrer">
                Google Workspace India
              </a>
              {' · '}
              <a
                href="https://www.microsoft.com/en-in/microsoft-365/business/microsoft-365-business-basic"
                target="_blank"
                rel="noopener noreferrer"
              >
                Microsoft 365 Business Basic
              </a>
              . Hostinger Titan is listed only as a budget contrast — not the company platform.
            </p>
          </section>

          <section id="cost" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Budget</div>
              <h3>Annual cost scenarios</h3>
              <p>GST 18% applied on the indicative totals. Licence unused mailboxes only when people actually join.</p>
            </div>
            <div className="admin-guide-ref-grid">
              {EMAIL_COST_SCENARIOS.map((s) => (
                <div key={s.name} className="admin-guide-ref-card">
                  <h4>{s.name}</h4>
                  <p className="admin-guide-workflow-purpose">{s.detail}</p>
                  <ul>
                    <li>
                      Ex-GST: <strong>{s.annualExGst}</strong>
                    </li>
                    <li>
                      Incl. GST: <strong>{s.annualIncGst}</strong>
                    </li>
                    <li>{s.notes}</li>
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section id="timeline" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Plan</div>
              <h3>Timeline &amp; effort</h3>
              <p>
                {EMAIL_TIMELINE.window}. Calendar: <strong>{EMAIL_TIMELINE.totalCalendar}</strong>. Effort:{' '}
                {EMAIL_TIMELINE.itEffort}.
              </p>
            </div>
            <ol className="admin-guide-steps">
              {EMAIL_TIMELINE.phases.map((p, i) => (
                <li key={p.week} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <strong>{p.week}</strong>
                    <p>{p.focus}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="admin-guide-callout admin-guide-callout--info">
              Large IMAP copies (multi-GB mailboxes) dominate elapsed time, not the DNS change. Start Phase 2 as soon as
              licences exist — do not wait until the week of the September renewal.
            </div>
          </section>

          <section id="purchase" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Purchase</div>
              <h3>How to buy (Zoho default)</h3>
              <p>Google / Microsoft follow the same pattern: verify domain with TXT, buy seats, change MX last.</p>
            </div>
            <ol className="admin-guide-steps">
              {EMAIL_PURCHASE_STEPS.map((step, i) => (
                <li key={step} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="phases" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Execution</div>
              <h3>Migration phases — step by step</h3>
              <p>Six phases from inventory through cancelling the old Roundcube host.</p>
            </div>
            <div className="admin-guide-detail-list">
              {EMAIL_PHASES.map((phase) => (
                <article key={phase.id} id={`phase-${phase.id}`} className="admin-guide-detail">
                  <div className="admin-guide-detail-head">
                    <div>
                      <span className="admin-guide-detail-label">{phase.phase}</span>
                      <h4>{phase.title}</h4>
                      <p className="admin-guide-workflow-purpose" style={{ marginTop: '0.35rem' }}>
                        {phase.days} · {phase.effort}
                      </p>
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
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">DNS</div>
              <h3>Records to publish at BigRock / UrbanVendo</h3>
              <p>Copy exact DKIM values from the provider console. One SPF string only — never two TXT SPF records.</p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Zoho</th>
                    <th>Google</th>
                    <th>Microsoft</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {EMAIL_DNS_RECORDS.map((r) => (
                    <tr key={`${r.type}-${r.name}`}>
                      <td>
                        <code>{r.type}</code>
                      </td>
                      <td>
                        <code>{r.name}</code>
                      </td>
                      <td className="admin-table-muted">{r.zoho}</td>
                      <td className="admin-table-muted">{r.google}</td>
                      <td className="admin-table-muted">{r.microsoft}</td>
                      <td>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="smtp" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Website</div>
              <h3>Enquiry SMTP on Hostinger (after mail moves)</h3>
              <p>
                Create a dedicated <code>noreply@</code> mailbox or app password. Update production{' '}
                <code>.env</code> and restart PM2 so contact-form notifications do not die when Roundcube is cancelled.
              </p>
            </div>
            <CodeBlock>{EMAIL_SMTP_SITE}</CodeBlock>
            <p className="admin-guide-section-footnote">
              Then confirm <Link href="/admin/site-settings">Site Settings</Link> enquiry notify addresses still match
              live inboxes.
            </p>
          </section>

          <section id="rollback" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Safety</div>
              <h3>Rollback procedure</h3>
              <p>Mail rollback is DNS-only if the old Roundcube server is still running.</p>
            </div>
            <ul className="admin-guide-rollback-list">
              {EMAIL_ROLLBACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="faq" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">FAQ</div>
              <h3>Common questions</h3>
            </div>
            <div className="admin-guide-faq-list">
              {EMAIL_FAQ.map((item) => (
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
