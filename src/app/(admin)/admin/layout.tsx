'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import './admin.css';

type NavItem = { href: string; label: string; exact?: boolean; adminOnly?: boolean };

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', exact: true },
      { href: '/admin/guide', label: 'Guide' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/pages', label: 'Pages' },
      { href: '/admin/inventory', label: 'Inventory' },
      { href: '/admin/catalog-settings', label: 'Catalog Settings' },
      { href: '/admin/resources', label: 'Resources' },
      { href: '/admin/press', label: 'Press' },
      { href: '/admin/testimonials', label: 'Testimonials' },
    ],
  },
  {
    label: 'Leads',
    items: [
      { href: '/admin/enquiries', label: 'Enquiries' },
      { href: '/admin/forms', label: 'Enquiry Forms' },
      { href: '/admin/newsletter', label: 'Newsletter', adminOnly: true },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/admin/nav', label: 'Navigation' },
      { href: '/admin/site-settings', label: 'Site Settings' },
      { href: '/admin/site-copy', label: 'Site Copy', adminOnly: true },
      { href: '/admin/media', label: 'Media' },
      { href: '/admin/theme', label: 'Theme Studio', adminOnly: true },
      { href: '/admin/redirects', label: 'Redirects', adminOnly: true },
    ],
  },
  {
    label: 'Platform',
    items: [
      { href: '/admin/new-client', label: 'New Client', adminOnly: true },
      { href: '/admin/partners', label: 'Partners', adminOnly: true },
      { href: '/admin/users', label: 'Users', adminOnly: true },
      { href: '/admin/account', label: 'Account' },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [user, setUser] = useState<{ name: string; email: string; role: 'admin' | 'editor' } | null>(null);

  useEffect(() => {
    if (isLogin) return;
    fetch('/api/admin/auth/me')
      .then(async (r) => {
        if (!r.ok) throw new Error('unauth');
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        void router.replace('/admin/login');
      });
  }, [isLogin, router]);

  const navGroups = useMemo(() => {
    const filterItems = (items: NavItem[]) => {
      if (!user) return items.filter((n) => !n.adminOnly);
      if (user.role === 'admin') return items;
      return items.filter((n) => !n.adminOnly);
    };
    return NAV_GROUPS.map((g) => ({ ...g, items: filterItems(g.items) })).filter((g) => g.items.length > 0);
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    const hit = ALL_NAV.find(
      (n) => n.adminOnly && (pathname === n.href || pathname.startsWith(`${n.href}/`))
    );
    if (hit) void router.replace('/admin');
  }, [user, pathname, router]);

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  if (isLogin) {
    return <div className="admin-body">{children}</div>;
  }

  const title =
    ALL_NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)))?.label || 'Admin';

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-mark" aria-hidden="true">
              <span>Z</span>
            </div>
            <div className="admin-brand-copy">
              <strong>Zigma Admin</strong>
              <span>Control Portal</span>
            </div>
          </div>
          <div className="admin-nav-scroll">
            {navGroups.map((group) => (
              <div key={group.label} className="admin-nav-group">
                <span className="admin-nav-label">{group.label}</span>
                <nav className="admin-nav" aria-label={group.label}>
                  {group.items.map((item) => {
                    const active = item.exact
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
          <div className="admin-sidebar-foot">
            <Link href="/" className="admin-btn admin-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              View site
            </Link>
          </div>
        </aside>
        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <h1>{title}</h1>
              <div className="meta">
                {user ? `${user.name} · ${user.email}` : 'Loading…'}
              </div>
            </div>
            <div className="admin-topbar-actions">
              {user ? (
                <span className={`admin-role-badge${user.role === 'editor' ? ' admin-role-badge--editor' : ''}`}>
                  {user.role}
                </span>
              ) : null}
              <button type="button" className="admin-btn admin-btn-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          </header>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
