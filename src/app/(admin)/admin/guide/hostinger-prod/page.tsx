'use client';

import Link from 'next/link';
import {
  PROD_ARCHITECTURE,
  PROD_BACKUP,
  PROD_CHECKLIST,
  PROD_CUTOVER,
  PROD_DNS_RECORDS,
  PROD_ENV_TEMPLATE,
  PROD_FAQ,
  PROD_GHA_HOW_IT_WORKS,
  PROD_GHA_PARTS,
  PROD_GHA_SECRETS,
  PROD_GHA_STEPS,
  PROD_HOSTINGER_NOTES,
  PROD_NGINX,
  PROD_PHASES,
  PROD_PREREQUISITES,
  PROD_PURCHASE_STEPS,
  PROD_SERVER,
  PROD_SERVER_FACTS,
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
              Blind-follow playbook: empty {PROD_STACK.os} VPS (<code>{PROD_SERVER.ipv4}</code>) → MySQL/Nginx/PM2 →
              clone{' '}
              <a href={PROD_SERVER.githubRepo} target="_blank" rel="noopener noreferrer">
                JustXSystems/zigma-technologies
              </a>{' '}
              as <code>{PROD_SERVER.sshDeploy}</code> → GitHub Actions → then BigRock DNS cutover so{' '}
              <strong>{PROD_SERVER.publicUrl}/</strong> serves this app (domain stays registered at BigRock).
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
                MySQL stores CMS content. Source code lives in GitHub; day-2+ deploys are automated by Actions SSHing as{' '}
                <code>deploy</code> and running <code>scripts/deploy-prod.sh</code>.
              </p>
            </div>
            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>Recommended stack:</strong> {PROD_STACK.plan} ({PROD_STACK.specs}) · {PROD_STACK.os} ·{' '}
              {PROD_STACK.runtime} · {PROD_STACK.process} · {PROD_STACK.proxy} · {PROD_STACK.database}.
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Until BigRock A records point here, the public domain still shows the <strong>old vendor site</strong>.
              Finish Steps 1–11 and hosts-file smoke tests first, then cut over DNS (Step 12) and Certbot (Step 13). Do{' '}
              <strong>not</strong> host company mailboxes on this VPS — see the{' '}
              <Link href="/admin/guide/email">email guide</Link>. Related:{' '}
              <Link href="/admin/guide/migration">migration / DNS guide</Link>.
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
                      <code>{PROD_SERVER.publicUrl}/</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="cutover" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">BigRock → Hostinger</div>
              <h3>{PROD_CUTOVER.title}</h3>
              <p>
                Domain registrar stays <strong>BigRock</strong>. Hostinger only receives web traffic after you change A
                records to <code>{PROD_SERVER.ipv4}</code>.
              </p>
            </div>
            <ol className="admin-guide-steps">
              {PROD_CUTOVER.points.map((point, i) => (
                <li key={point} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{point}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="admin-guide-ref-grid">
              {PROD_HOSTINGER_NOTES.map((n) => (
                <div key={n.title} className="admin-guide-ref-card">
                  <h4>{n.title}</h4>
                  <p>{n.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="server" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Inventory</div>
              <h3>This production VPS (filled in)</h3>
              <p>
                Use these exact values in SSH, DNS, Nginx, and GitHub Secrets. Do not invent a different IP or hostname.
              </p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <tbody>
                  {PROD_SERVER_FACTS.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>
                        <code>{row.value}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="prereqs" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Before you start</div>
              <h3>Prerequisites checklist</h3>
              <p>Gather these before SSHing into the empty server.</p>
            </div>
            <ul className="admin-guide-checklist">
              {PROD_PREREQUISITES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section id="purchase" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Access</div>
              <h3>Confirm Hostinger KVM 2 in hPanel</h3>
              <p>The VPS is already provisioned. Verify Active status, then all ops happen over SSH.</p>
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
              . Repository:{' '}
              <a href={PROD_SERVER.githubRepo} target="_blank" rel="noopener noreferrer">
                {PROD_SERVER.githubRepo}
              </a>
              . Actions:{' '}
              <a href={PROD_SERVER.githubActions} target="_blank" rel="noopener noreferrer">
                {PROD_SERVER.githubActions}
              </a>
              .
            </div>
          </section>

          <section id="phases" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--orange">Execution</div>
              <h3>Production setup — empty server to go-live</h3>
              <p>
                {PROD_PHASES.length} steps from first SSH as <code>root@{PROD_SERVER.ipv4}</code> through BigRock DNS
                cutover and HTTPS. Order matters: finish the VPS + hosts-file test before changing BigRock A records;
                run Certbot only after DNS points here. Commands use the live IP, repo, and domain.
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

          <section id="dns-table" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">BigRock</div>
              <h3>DNS records to set at cutover (Step 12)</h3>
              <p>
                Log in at{' '}
                <a href="https://www.bigrock.com" target="_blank" rel="noopener noreferrer">
                  bigrock.com
                </a>{' '}
                (or your DNS host if nameservers are not at BigRock). Change <strong>only</strong> website A records.
              </p>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Value</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {PROD_DNS_RECORDS.map((row) => (
                    <tr key={`${row.type}-${row.name}`}>
                      <td>
                        <code>{row.type}</code>
                      </td>
                      <td>
                        <code>{row.name}</code>
                      </td>
                      <td>
                        <code>{row.value}</code>
                      </td>
                      <td>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-guide-callout admin-guide-callout--warn">
              Rollback within the first days: set A @ and www back to <code>{PROD_SERVER.oldWebIp}</code> (old host). Keep
              old hosting billed until the new site is stable.
            </div>
          </section>

          <section id="gha" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">CI/CD</div>
              <h3>GitHub Actions — auto deploy (detailed)</h3>
              <p>
                Same procedure as <a href="#phase-gha">Step 11</a>. Target: <code>{PROD_SERVER.sshDeploy}</code>. Monitor
                runs at{' '}
                <a href={PROD_SERVER.githubActions} target="_blank" rel="noopener noreferrer">
                  {PROD_SERVER.githubActions}
                </a>
                . Actions does not need public DNS — you can finish this before BigRock cutover.
              </p>
            </div>

            <div className="admin-guide-callout admin-guide-callout--info">
              <strong>What “auto-deploy” means:</strong> GitHub SSHs into the VPS and runs{' '}
              <code>scripts/deploy-prod.sh</code> (<code>git reset --hard origin/master</code> → <code>npm ci</code> →
              build → <code>pm2 restart zigma</code>). Production <code>.env</code> never leaves the server.
            </div>

            <span className="admin-guide-detail-label">How it works</span>
            <ol className="admin-guide-steps">
              {PROD_GHA_HOW_IT_WORKS.map((step, i) => (
                <li key={step} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>

            <span className="admin-guide-detail-label">Setup — four parts</span>
            <div className="admin-guide-detail-list">
              {PROD_GHA_PARTS.map((part) => (
                <article key={part.id} className="admin-guide-detail">
                  <div className="admin-guide-detail-head">
                    <div>
                      <span className="admin-guide-detail-label">{part.where}</span>
                      <h4>{part.title}</h4>
                    </div>
                  </div>
                  <p className="admin-guide-flow-summary">{part.detail}</p>
                </article>
              ))}
            </div>

            <span className="admin-guide-detail-label">Quick checklist</span>
            <ol className="admin-guide-steps">
              {PROD_GHA_STEPS.map((step, i) => (
                <li key={step} className="admin-guide-step">
                  <div className="admin-guide-step-index">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>

            <span className="admin-guide-detail-label">Repository secrets (exact values)</span>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Secret name</th>
                    <th>Exact value</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {PROD_GHA_SECRETS.map((row) => (
                    <tr key={row.name}>
                      <td>
                        <code>{row.name}</code>
                      </td>
                      <td>
                        <code>{row.example}</code>
                      </td>
                      <td>{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-guide-callout admin-guide-callout--warn">
              Create secrets at{' '}
              <a
                href="https://github.com/JustXSystems/zigma-technologies/settings/secrets/actions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Settings → Secrets and variables → Actions
              </a>
              . Workflow file must exist on master:{' '}
              <a
                href="https://github.com/JustXSystems/zigma-technologies/blob/master/.github/workflows/deploy-prod.yml"
                target="_blank"
                rel="noopener noreferrer"
              >
                .github/workflows/deploy-prod.yml
              </a>
              . Full copy-paste commands are under <a href="#phase-gha">Step 12 → Commands</a>.
            </div>

            <CodeBlock>{`# PART A+B — Windows PowerShell (laptop)
cd $env:USERPROFILE\\Downloads
ssh-keygen -t ed25519 -C "github-actions-zigma-prod" -f ./gha_zigma_prod -N '""'
type .\\gha_zigma_prod.pub | ssh deploy@${PROD_SERVER.ipv4} "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh -i .\\gha_zigma_prod deploy@${PROD_SERVER.ipv4} "whoami"

# PART B0 — sync VPS to GitHub master (fixes missing deploy-prod.sh / dirty schema.sql)
ssh -i .\\gha_zigma_prod deploy@${PROD_SERVER.ipv4} "cd ${PROD_SERVER.appDir} && git fetch origin && git reset --hard origin/master && ls -la scripts/deploy-prod.sh"

# PART B dry-run
ssh -i .\\gha_zigma_prod deploy@${PROD_SERVER.ipv4} "cd ${PROD_SERVER.appDir} && chmod +x scripts/deploy-prod.sh && ./scripts/deploy-prod.sh"

# PART C — clipboard → GitHub secret PROD_SSH_KEY
Get-Content .\\gha_zigma_prod -Raw | Set-Clipboard

# PART D — browser
# ${PROD_SERVER.githubActions}
# → Deploy Production → Run workflow → master`}</CodeBlock>
          </section>

          <section id="env" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Secrets</div>
              <h3>Production .env template</h3>
              <p>
                Create <code>{PROD_SERVER.appDir}/.env</code> from <code>.env.example</code>. Use{' '}
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
                Save as <code>/etc/nginx/sites-available/zigma</code> in Step 10 (HTTP only). Run Certbot in Step 13{' '}
                <strong>after</strong> BigRock A records point to <code>{PROD_SERVER.ipv4}</code>.
              </p>
            </div>
            <CodeBlock>{PROD_NGINX}</CodeBlock>
            <CodeBlock>{`sudo ln -sf /etc/nginx/sites-available/zigma /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ONLY after BigRock DNS A @ and www → ${PROD_SERVER.ipv4}:
sudo certbot --nginx -d zigma-technologies.com -d www.zigma-technologies.com`}</CodeBlock>
          </section>

          <section id="updates" className="admin-guide-section">
            <div className="admin-guide-section-head">
              <div className="admin-guide-eyebrow admin-guide-eyebrow--cyan">Operations</div>
              <h3>Deploy updates (Actions or manual)</h3>
              <p>
                Prefer merging to <code>master</code> and letting Actions run. Use the manual path only for emergencies
                or first bootstrapping. Apply SQL migrations before restart when schema changes.
              </p>
            </div>
            <CodeBlock>{PROD_UPDATE_COMMANDS}</CodeBlock>
            <div className="admin-guide-ref-grid">
              <div className="admin-guide-ref-card">
                <h4>Before merge</h4>
                <ul>
                  <li>PR approved on GitHub</li>
                  <li>Quality gates green locally</li>
                  <li>
                    Optional: <code>npm run db:export</code> backup
                  </li>
                </ul>
              </div>
              <div className="admin-guide-ref-card">
                <h4>After deploy</h4>
                <ul>
                  <li>Smoke-test homepage + /admin/login</li>
                  <li>
                    Watch <code>pm2 logs zigma</code>
                  </li>
                  <li>Check the Actions run is green</li>
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
