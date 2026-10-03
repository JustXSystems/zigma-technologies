'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { canOpenScreen, navGroupsFromScreens, screenKeyFromPath } from '@/lib/admin-screens';
import { AdminUserContext, type AdminUser } from '@/components/admin/admin-session';
import { AdminLink, UnsavedChangesProvider, useUnsavedChangesState } from '@/components/admin/unsaved-changes';
import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <UnsavedChangesProvider>
      <AdminShell>{children}</AdminShell>
    </UnsavedChangesProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [user, setUser] = useState<AdminUser | null>(null);
  const { confirmDiscard } = useUnsavedChangesState();
  /** Small screens: the sidebar is a drawer, open only on the page it was opened from. */
  const [navOpenOn, setNavOpenOn] = useState<string | null>(null);
  const navOpen = navOpenOn === pathname;

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpenOn(null);
    };
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

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
    if (!canOpenScreen(user.screens, key)) {
      void router.replace('/admin');
    }
  }, [user, pathname, router]);

  async function logout() {
    if (!confirmDiscard()) return;
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
        <aside id="admin-sidebar" className={`admin-sidebar${navOpen ? ' is-open' : ''}`}>
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
                      <AdminLink
                        key={item.href}
                        href={item.href}
                        className={active ? 'active' : ''}
                        onClick={() => setNavOpenOn(null)}
                      >
                        {item.label}
                      </AdminLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
          <div className="admin-sidebar-foot">
            <AdminLink href="/" className="admin-btn admin-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              View site
            </AdminLink>
          </div>
        </aside>
        {navOpen ? <div className="admin-nav-backdrop" aria-hidden="true" onClick={() => setNavOpenOn(null)} /> : null}
        <div className="admin-main">
          <header className="admin-topbar">
            <button
              type="button"
              className="admin-nav-toggle"
              aria-controls="admin-sidebar"
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpenOn(navOpen ? null : pathname)}
            >
              <span aria-hidden="true" />
            </button>
            <div className="admin-topbar-title">
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
          <div className="admin-content">
            <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
