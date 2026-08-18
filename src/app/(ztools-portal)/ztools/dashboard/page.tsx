'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ZtoolsPortalBrand from '@/components/ztools/ZtoolsPortalBrand';
import ZtoolsShell from '@/components/ztools/ZtoolsShell';

type ToolCard = {
  slug: string;
  name: string;
  description: string | null;
  route_path?: string;
  url?: string;
  icon: string | null;
};

export default function ZtoolsDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; toolSlugs: string[] } | null>(null);
  const [tools, setTools] = useState<ToolCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ztools/auth')
      .then(async (r) => {
        if (!r.ok) throw new Error('unauth');
        const data = await r.json();
        setUser(data.user);
        const catalogRes = await fetch('/api/ztools/tools');
        const catalog = await catalogRes.json();
        const slugs = new Set(data.user.toolSlugs || []);
        const assigned = (catalog.tools || []).filter((t: ToolCard) => slugs.has(t.slug));
        setTools(assigned);
      })
      .catch(() => router.replace('/ztools/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <ZtoolsShell>
        <div className="container ztools-dashboard">
          <p>Loading your tools…</p>
        </div>
      </ZtoolsShell>
    );
  }

  return (
    <ZtoolsShell user={user} showNav>
      <div className="container ztools-dashboard">
        <div className="ztools-dashboard-hero">
          <ZtoolsPortalBrand layout="centered" />
          <div className="ztools-dashboard-head">
            <h1>Welcome, {user?.name}</h1>
            <p>Your approved tools open on the live Zigma website.</p>
          </div>
        </div>
        {tools.length === 0 ? (
          <div className="ztools-empty">
            <p>No tools assigned yet. Contact your Zigma administrator.</p>
          </div>
        ) : (
          <div className="ztools-tool-grid">
            {tools.map((tool) => {
              const href = tool.url || tool.route_path || `https://www.zigma-technologies.com/tools/${tool.slug}`;
              const external = /^https?:\/\//i.test(href);
              return (
                <Link
                  key={tool.slug}
                  href={href}
                  className="ztools-tool-card"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span className="ztools-tool-card-icon" aria-hidden>{toolIcon(tool.icon)}</span>
                  <h2>{tool.name}</h2>
                  {tool.description ? <p>{tool.description}</p> : null}
                  <span className="ztools-tool-card-cta">Open on zigma-technologies.com →</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ZtoolsShell>
  );
}

function toolIcon(icon: string | null) {
  const map: Record<string, string> = {
    quote: '📋',
    solar: '☀️',
    ups: '⚡',
    audit: '📊',
    battery: '🔋',
  };
  return map[icon || ''] || '🛠️';
}
