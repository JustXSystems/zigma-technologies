'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  hasScreenAccess,
  navGroupsFromScreens,
  screenKeyFromPath,
  type AdminScreenKey,
} from '@/lib/admin-screens';
import './admin.css';

type AdminUser = {
  name: string;
  email: string;
  role: 'admin' | 'editor';
  roleId: number | null;
  roleName: string | null;
  screens: AdminScreenKey[] | '*';
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [user, setUser] = useState<AdminUser | null>(null);

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
    if (!user) return navGroupsFromScreens([]);
    return navGroupsFromScreens(user.screens);
  }, [user]);

  const allNavItems = useMemo(() => navGroups.flatMap((g) => g.items), [navGroups]);

  useEffect(() => {
    if (!user || user.screens === '*') return;
    const key = screenKeyFromPath(pathname);
    if (!key) return;
    if (!hasScreenAccess(user.screens, key)) {
      void router.replace('/admin');
    }
  }, [user, pathname, router]);

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  if (isLogin) {
    return <div className="admin-body">{children}</div>;
  }

  const title =
    allNavItems.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)))?.label ||
    'Admin';

  const roleLabel =
    user?.role === 'admin' ? 'Full admin' : user?.roleName || user?.role || 'editor';

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
                  {roleLabel}
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
