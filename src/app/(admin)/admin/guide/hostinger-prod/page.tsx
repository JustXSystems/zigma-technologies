'use client';

import Link from 'next/link';
import {
  PROD_ARCHITECTURE,
  PROD_BACKUP,
  PROD_CHECKLIST,
  PROD_ENV_TEMPLATE,
  PROD_FAQ,
  PROD_NGINX,
  PROD_PHASES,
  PROD_PREREQUISITES,
  PROD_PURCHASE_STEPS,
  PROD_STACK,
  PROD_TOC,
  PROD_TROUBLESHOOT,
  PROD_UPDATE_COMMANDS,
} from '@/lib/admin-guide-hostinger-prod';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="admin-guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function AdminHostingerProdGuidePage() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-grid">
          <div>
            <div className="admin-guide-eyebrow">DevOps · Production · Hostinger</div>
            <h2 className="admin-guide-title">Hostinger KVM 2 — production setup</h2>
            <p className="admin-guide-lead">
              Complete operator playbook to provision <strong>{PROD_STACK.plan}</strong>, install MySQL, clone this
              application from GitHub, and run Next.js behind Nginx + PM2 with HTTPS for{' '}
              <strong>{PROD_STACK.domain}</strong>.
            </p>
            <div className="admin-guide-hero-actions">
              <Link href="/admin/guide" className="admin-btn admin-btn-secondary">
                ← Admin guide
              </Link>
              <Link href="/admin/guide/migration" className="admin-btn admin-btn-secondary">
                DNS / migration
              </Link>
              <Link href="/admin/guide/justxsystems" className="admin-btn admin-btn-secondary">
                justxsystems staging
              </Link>
              <Link href="/admin/guide/email" className="admin-btn admin-btn-primary">
                Email guide
              </Link>
            </div>
          </div>
          <div className="admin-guide-hero-stats">
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Plan</span>
              <span className="admin-guide-stat-value">KVM 2</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">RAM</span>
              <span className="admin-guide-stat-value">8 GB</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Steps</span>
              <span className="admin-guide-stat-value">{PROD_PHASES.length}</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">DB</span>
              <span className="admin-guide-stat-value">MySQL 8</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="Production guide sections">
          <div className="admin-guide-toc-inner">
            <div className="admin-guide-toc-title">Contents</div>
            <ul>
              {PROD_TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="admin-guide-toc-divider" />
            <div className="admin-guide-toc-title">Setup steps</div>
            <ul className="admin-guide-toc-modules">
              {PROD_PHASES.map((p) => (
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
              <h3>What you are building</h3>
              <p>
                A single Hostinger VPS that runs the full stack: Nginx terminates HTTPS, PM2 keeps Next.js alive, and
                MySQL stores CMS content, catalog, enquiries, and theme settings. Source code is deployed from GitHub
                with <code>git pull</code> — not FTP of built files alone.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Recommended stack:</strong> {PROD_STACK.plan} ({PROD_STACK.specs}) · {PROD_STACK.os} ·{' '}
              {PROD_STACK.runtime} · {PROD_STACK.process} · {PROD_STACK.proxy} · {PROD_STACK.database}.
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Do <strong>not</strong> host 60–150 company mailboxes on this VPS. Keep website and mail separate — see the{' '}
              <Link href="/admin/guide/email">email migration guide</Link>. For DNS cutover from the old UrbanVendo IP,
              also use the <Link href="/admin/guide/migration">Hostinger migration guide</Link>.
            </div>
            <div className="admin-guide-diagram">
              <p className="admin-guide-diagram-caption">Production topology</p>
              <div className="admin-guide-diagram-stack">
                {PROD_ARCHITECTURE.map((layer, i) => (
                  <div key={layer.label}>
                    {i > 0 ? <div className="admin-guide-diagram-connector" aria-hidden="true" /> : null}
                    <div className="admin-guide-diagram-tier">
                      <div className="admin-guide-diagram-node">
                        <strong>{layer.label}</strong>
                        <ul>
                          {layer.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Plan</th>
                    <td>{PROD_STACK.plan}</td>
                  </tr>
                  <tr>
                    <th>Specs</th>
                    <td>{PROD_STACK.specs}</td>
                  </tr>
                  <tr>
                    <th>OS</th>
                    <td>{PROD_STACK.os}</td>
                  </tr>
                  <tr>
                    <th>App port</th>
                    <td>{PROD_STACK.appPort}</td>
                  </tr>
                  <tr>
                    <th>Source</th>
                    <td>{PROD_STACK.source}</td>
                  </tr>
                  <tr>
                    <th>Public URL</th>
                    <td>
                      <code>https://{PROD_STACK.domain}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="prereqs" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Before you start</div>
              <h3>Prerequisites checklist</h3>
              <p>Gather these before purchasing or SSHing into the VPS.</p>
            </div>
            <ul className="admin-guide-checklist">
              {PROD_PREREQUISITES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="purchase" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Purchase</div>
              <h3>How to buy Hostinger KVM 2</h3>
              <p>Follow this once. After payment, all ops happen in hPanel + SSH.</p>
            </div>
            <ol className="admin-guide-steps">
              {PROD_PURCHASE_STEPS.map((step, i) => (
                <li key={step} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="admin-guide-callout admin-guide-callout--info">
              Manage the server at{' '}
              <a href="https://hpanel.hostinger.com" target="_blank" rel="noopener noreferrer">
                hpanel.hostinger.com
              </a>
              . Confirm live pricing at{' '}
              <a href="https://www.hostinger.com/vps-hosting" target="_blank" rel="noopener noreferrer">
                hostinger.com/vps-hosting
              </a>
              — budget for renewal, not only the intro rate.
            </div>
          </section>

          <section id="phases" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Execution</div>
              <h3>Production setup — step by step</h3>
              <p>
                Twelve steps from first SSH login through admin handoff. Complete them in order. Copy/paste commands
                carefully and replace placeholders (<code>YOUR_VPS_IP</code>, org name, passwords).
              </p>
            </div>
            <div className="admin-guide-detail-list">
              {PROD_PHASES.map((phase) => (
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
                  {phase.code ? (
                    <>
                      <span className="admin-guide-detail-label">Commands</span>
                      <CodeBlock>{phase.code}</CodeBlock>
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section id="env" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Secrets</div>
              <h3>Production .env template</h3>
              <p>
                Create <code>/var/www/zigma-technologies/.env</code> from <code>.env.example</code>. Use{' '}
                <code>AUTH_SECRET</code> (not legacy JWT keys). File mode <code>600</code>. Never commit this file.
              </p>
            </div>
            <CodeBlock>{PROD_ENV_TEMPLATE}</CodeBlock>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Generate secrets on the server with <code>openssl rand -hex 32</code>. Never copy DEV laptop passwords into
              PROD.
            </div>
          </section>

          <section id="nginx" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Proxy</div>
              <h3>Nginx site config</h3>
              <p>
                Save as <code>/etc/nginx/sites-available/zigma</code>, enable the site, then run Certbot after DNS
                points to the VPS.
              </p>
            </div>
            <CodeBlock>{PROD_NGINX}</CodeBlock>
            <CodeBlock>{`sudo ln -s /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d www.zigma-technologies.com -d zigma-technologies.com`}</CodeBlock>
          </section>

          <section id="updates" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Operations</div>
              <h3>Deploy updates from GitHub (repeatable)</h3>
              <p>
                After the first go-live, every code release follows this path. Apply SQL migrations before restart when
                schema changes.
              </p>
            </div>
            <CodeBlock>{PROD_UPDATE_COMMANDS}</CodeBlock>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card">
                <h4>Before pull</h4>
                <ul>
                  <li>Merge to production branch on GitHub</li>
                  <li>Quality gates green locally</li>
                  <li>
                    Optional: <code>npm run db:export</code> backup
                  </li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>After restart</h4>
                <ul>
                  <li>Smoke-test homepage + /admin/login</li>
                  <li>
                    Watch <code>pm2 logs zigma</code>
                  </li>
                  <li>Rollback with <code>git checkout &lt;good-sha&gt;</code> + rebuild if needed</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="backups" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Resilience</div>
              <h3>Backup strategy</h3>
              <p>Code lives in Git. Content and media need scheduled backups off the laptop.</p>
            </div>
            <div className="admin-guide-ref-grid">
              {PROD_BACKUP.map((b) => (
                <div key={b.title} className="admin-guide-ref-card">
                  <h4>{b.title}</h4>
                  <p>{b.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="checklist" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Go-live</div>
              <h3>Post-deployment checklist</h3>
              <p>Run after every PROD deploy and after DNS cutover.</p>
            </div>
            <ul className="admin-guide-checklist">
              {PROD_CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="troubleshoot" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Support</div>
              <h3>Troubleshooting</h3>
            </div>
            <div className="admin-guide-detail-list">
              {PROD_TROUBLESHOOT.map((row) => (
                <article key={row.symptom} className="admin-guide-detail">
                  <h4>{row.symptom}</h4>
                  <ul>
                    {row.fixes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section id="faq" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">FAQ</div>
              <h3>Common questions</h3>
            </div>
            <div className="admin-guide-faq-list">
              {PROD_FAQ.map((item) => (
                <details key={item.q} className="admin-guide-faq">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              Related: <Link href="/admin/guide/migration">Migration &amp; DNS</Link> ·{' '}
              <Link href="/admin/guide/email">Email</Link> · repository <code>README.md</code> Sections 12–24 ·{' '}
              <code>ADMIN.md</code>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
