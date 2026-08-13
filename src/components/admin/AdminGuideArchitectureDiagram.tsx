'use client';

import AdminGuideErDiagram from '@/components/admin/AdminGuideErDiagram';

/** Layered architecture diagram for the admin guide — semantic UI, not ASCII. */
export default function AdminGuideArchitectureDiagram() {
  return (
    <figure className="admin-guide-diagram" aria-label="Zigma admin and public site architecture">
      <figcaption className="admin-guide-diagram-caption">Request path overview</figcaption>

      <div className="admin-guide-diagram-stack">
        <div className="admin-guide-diagram-tier">
          <div className="admin-guide-diagram-node admin-guide-diagram-node--wide">
            <span className="admin-guide-diagram-kicker">Client</span>
            <strong>Browser</strong>
            <p>Editor or visitor session</p>
          </div>
        </div>

        <div className="admin-guide-diagram-bridge" aria-hidden="true">
          <span className="admin-guide-diagram-bridge-line" />
          <span className="admin-guide-diagram-bridge-chevron" />
        </div>

        <div className="admin-guide-diagram-tier admin-guide-diagram-tier--split">
          <div className="admin-guide-diagram-node admin-guide-diagram-node--admin">
            <span className="admin-guide-diagram-kicker admin-guide-diagram-kicker--orange">Control plane</span>
            <strong>/admin/*</strong>
            <p>Cookie-authenticated admin portal</p>
            <ul className="admin-guide-diagram-tags">
              <li>Dashboard</li>
              <li>CMS</li>
              <li>Inventory</li>
            </ul>
          </div>
          <div className="admin-guide-diagram-node admin-guide-diagram-node--public">
            <span className="admin-guide-diagram-kicker admin-guide-diagram-kicker--cyan">Public site</span>
            <strong>(site)/*</strong>
            <p>Marketing pages &amp; catalog</p>
            <ul className="admin-guide-diagram-tags">
              <li>Header / Footer</li>
              <li>CMS pages</li>
              <li>Catalog</li>
            </ul>
          </div>
        </div>

        <div className="admin-guide-diagram-bridge" aria-hidden="true">
          <span className="admin-guide-diagram-bridge-line" />
          <span className="admin-guide-diagram-bridge-chevron" />
        </div>

        <div className="admin-guide-diagram-tier">
          <div className="admin-guide-diagram-node admin-guide-diagram-node--wide admin-guide-diagram-node--edge">
            <span className="admin-guide-diagram-kicker">Edge</span>
            <strong>src/proxy.ts</strong>
            <p>Admin gate · URL redirects · upload path block</p>
          </div>
        </div>

        <div className="admin-guide-diagram-bridge" aria-hidden="true">
          <span className="admin-guide-diagram-bridge-line" />
          <span className="admin-guide-diagram-bridge-chevron" />
        </div>

        <div className="admin-guide-diagram-tier admin-guide-diagram-tier--split">
          <div className="admin-guide-diagram-node admin-guide-diagram-node--api admin-guide-diagram-node--admin">
            <span className="admin-guide-diagram-kicker admin-guide-diagram-kicker--orange">Protected</span>
            <strong>/api/admin/*</strong>
            <p>JWT session cookie required</p>
          </div>
          <div className="admin-guide-diagram-node admin-guide-diagram-node--api admin-guide-diagram-node--public">
            <span className="admin-guide-diagram-kicker admin-guide-diagram-kicker--cyan">Public API</span>
            <strong>/api/public/*</strong>
            <p>Read + form submit · honeypot · rate limit</p>
          </div>
        </div>

        <div className="admin-guide-diagram-bridge" aria-hidden="true">
          <span className="admin-guide-diagram-bridge-line" />
          <span className="admin-guide-diagram-bridge-chevron" />
        </div>

        <div className="admin-guide-diagram-tier">
          <div className="admin-guide-diagram-node admin-guide-diagram-node--wide admin-guide-diagram-node--data">
            <span className="admin-guide-diagram-kicker">Persistence</span>
            <strong>MySQL · zigmatech</strong>
            <p>Relational tables with declared foreign keys + JSON config in theme_settings</p>
            <AdminGuideErDiagram />
          </div>
        </div>
      </div>
    </figure>
  );
}
