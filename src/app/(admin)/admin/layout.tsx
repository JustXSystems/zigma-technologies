'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import './admin.css';

const NAV: Array<{ href: string; label: string; exact?: boolean; adminOnly?: boolean }> = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/pages', label: 'Pages' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/catalog-settings', label: 'Catalog Settings' },
  { href: '/admin/resources', label: 'Resources' },
  { href: '/admin/press', label: 'Press' },
  { href: '/admin/testimonials', label: 'Testimonials' },
  { href: '/admin/partners', label: 'Partners', adminOnly: true },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/forms', label: 'Enquiry Forms' },
  { href: '/admin/nav', label: 'Navigation' },
  { href: '/admin/site-settings', label: 'Site Settings' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/newsletter', label: 'Newsletter', adminOnly: true },
  { href: '/admin/redirects', label: 'Redirects', adminOnly: true },
  { href: '/admin/theme', label: 'Theme & CSS', adminOnly: true },
  { href: '/admin/users', label: 'Users', adminOnly: true },
  { href: '/admin/account', label: 'Account' },
];

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
      .catch(() => router.replace('/admin/login'));
  }, [isLogin, router]);

  const navItems = useMemo(() => {
    if (!user) return NAV.filter((n) => !n.adminOnly);
    if (user.role === 'admin') return NAV;
    return NAV.filter((n) => !n.adminOnly);
  }, [user]);

  useEffect(() => {
    if (!user || user.role === 'admin') return;
    const hit = NAV.find((n) => n.adminOnly && (pathname === n.href || pathname.startsWith(`${n.href}/`)));
    if (hit) router.replace('/admin');
  }, [user, pathname, router]);

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  if (isLogin) {
    return <div className="admin-body">{children}</div>;
  }

  const title =
    navItems.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)))?.label ||
    'Admin';

  return (
    <div className="admin-body">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <strong>Zigma Admin</strong>
            <span>Control Portal</span>
          </div>
          <nav className="admin-nav">
            {navItems.map((item) => {
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
          <div style={{ marginTop: 'auto', padding: '0.6rem' }}>
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
                {user ? `${user.name} · ${user.email} · ${user.role}` : 'Loading…'}
              </div>
            </div>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={logout}>
              Sign out
            </button>
          </header>
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
