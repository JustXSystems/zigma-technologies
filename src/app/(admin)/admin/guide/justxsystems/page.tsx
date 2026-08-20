'use client';

import Link from 'next/link';
import {
  JX_ENV,
  JX_FAQ,
  JX_NGINX,
  JX_PHASES,
  JX_PREREQS,
  JX_TARGET,
  JX_TOC,
  JX_UPDATE,
  JX_VALIDATED,
  JX_VERIFY,
  JX_WHY,
} from '@/lib/admin-guide-justxsystems';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="admin-guide-code">
      <code>{children}</code>
    </pre>
  );
}

export default function AdminJustxsystemsGuidePage() {
  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="admin-guide-hero-grid">
          <div>
            <div className="admin-guide-eyebrow">Staging · Hostinger · Subdirectory</div>
            <h2 className="admin-guide-title">Deploy to justxsystems.com/zigma-technologies</h2>
            <p className="admin-guide-lead">
              Blind-follow Hostinger setup for this Next.js app at{' '}
              <strong>{JX_TARGET.publicUrlSlash}</strong> — including MySQL, GitHub clone,{' '}
              <code>NEXT_PUBLIC_BASE_PATH</code>, PM2 on port {JX_TARGET.appPort}, and an Nginx location that leaves the
              existing JustX homepage intact.
            </p>
            <div className="admin-guide-hero-actions">
              <Link href="/admin/guide" className="admin-btn admin-btn-secondary">
                ← Admin guide
              </Link>
              <Link href="/admin/guide/hostinger-prod" className="admin-btn admin-btn-secondary">
                KVM 2 (domain root)
              </Link>
              <a href={JX_TARGET.publicUrlSlash} className="admin-btn admin-btn-primary" target="_blank" rel="noreferrer">
                Open staging URL
              </a>
            </div>
          </div>
          <div className="admin-guide-hero-stats">
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Path</span>
              <span className="admin-guide-stat-value">/zigma…</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Port</span>
              <span className="admin-guide-stat-value">{JX_TARGET.appPort}</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">Steps</span>
              <span className="admin-guide-stat-value">{JX_PHASES.length}</span>
            </div>
            <div className="admin-guide-stat">
              <span className="admin-guide-stat-label">DB</span>
              <span className="admin-guide-stat-value">MySQL</span>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="JustX staging guide sections">
          <div className="admin-guide-toc-inner">
            <div className="admin-guide-toc-title">Contents</div>
            <ul>
              {JX_TOC.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="admin-guide-toc-divider" />
            <div className="admin-guide-toc-title">Steps</div>
            <ul className="admin-guide-toc-modules">
              {JX_PHASES.map((p) => (
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
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Target</div>
              <h3>What you are deploying</h3>
              <p>
                Staging / test instance of Zigma Technologies under a path on an existing Hostinger domain — not the final
                production hostname.
              </p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th>Public URL</th>
                    <td>
                      <code>{JX_TARGET.publicUrlSlash}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Admin</th>
                    <td>
                      <code>{JX_TARGET.adminUrl}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>basePath</th>
                    <td>
                      <code>{JX_TARGET.basePath}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>App dir</th>
                    <td>
                      <code>{JX_TARGET.appDir}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>PM2 name / port</th>
                    <td>
                      <code>{JX_TARGET.appName}</code> · <code>{JX_TARGET.appPort}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>MySQL</th>
                    <td>
                      <code>{JX_TARGET.dbName}</code> / <code>{JX_TARGET.dbUser}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="admin-guide-checklist">
              {JX_WHY.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Local DEV should leave <code>NEXT_PUBLIC_BASE_PATH</code> unset. Only the JustX staging build uses{' '}
              <code>/zigma-technologies</code>. Changing basePath always requires a fresh <code>npm run build</code>.
            </div>
          </section>

          <section id="validated" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Verified</div>
              <h3>Quality gates (run before Hostinger)</h3>
              <p>{JX_VALIDATED.dateNote}</p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              Root <code>tsconfig.json</code> excludes <code>apps/**</code> so React Native&apos;s FormData types do not
              break <code>npm run typecheck</code> / <code>next build</code> for this web app.
            </div>
            <h4 className="admin-guide-subheading">On your laptop (before git push)</h4>
            <CodeBlock>{JX_VALIDATED.localQualityGates}</CodeBlock>
            <h4 className="admin-guide-subheading">On the VPS (proof basePath is baked in)</h4>
            <CodeBlock>{JX_VALIDATED.stagingBuildProof}</CodeBlock>
          </section>

          <section id="prereqs" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Before you start</div>
              <h3>Prerequisites</h3>
            </div>
            <ul className="admin-guide-checklist">
              {JX_PREREQS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="phases" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Execution</div>
              <h3>Blind-follow steps (1–{JX_PHASES.length})</h3>
              <p>Complete in order. Copy commands carefully; replace placeholders only where noted.</p>
            </div>
            <div className="admin-guide-detail-list">
              {JX_PHASES.map((phase) => (
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
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Secrets</div>
              <h3>.env for justxsystems (exact template)</h3>
              <p>
                Save as <code>{JX_TARGET.appDir}/.env</code> with mode <code>600</code>. Fill every{' '}
                <code>&lt;…&gt;</code> placeholder before building.
              </p>
            </div>
            <CodeBlock>{JX_ENV}</CodeBlock>
          </section>

          <section id="nginx" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Proxy</div>
              <h3>Nginx location block</h3>
              <p>
                Insert inside the existing <code>server_name justxsystems.com</code> SSL server block. Do not delete the
                root <code>location /</code> for the current JustX site.
              </p>
            </div>
            <CodeBlock>{JX_NGINX}</CodeBlock>
            <CodeBlock>{`sudo nginx -t && sudo systemctl reload nginx`}</CodeBlock>
          </section>

          <section id="verify" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">QA</div>
              <h3>Verify these URLs</h3>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Expect</th>
                  </tr>
                </thead>
                <tbody>
                  {JX_VERIFY.map((row) => (
                    <tr key={row.url}>
                      <td>
                        <code>{row.url}</code>
                      </td>
                      <td>{row.expect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="updates" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Operations</div>
              <h3>Deploy updates from GitHub</h3>
            </div>
            <CodeBlock>{JX_UPDATE}</CodeBlock>
          </section>

          <section id="faq" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">FAQ</div>
              <h3>Common issues</h3>
            </div>
            <div className="admin-guide-faq-list">
              {JX_FAQ.map((item) => (
                <details key={item.q} className="admin-guide-faq">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              Related: <Link href="/admin/guide/hostinger-prod">KVM 2 production (domain root)</Link> ·{' '}
              <Link href="/admin/guide/migration">DNS migration</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
