'use client';

import type { ReactNode } from 'react';
import { AdminLink } from '@/components/admin/unsaved-changes';
import { DAY_MS, type AccessRole, type AccessUser } from './use-access-directory';

type Tab = 'users' | 'roles';

/** Header shared by Users and Roles: live team stats and the tabs between the two screens. */
export default function AccessShell({
  active,
  users,
  roles,
  loaded,
  actions,
  children,
}: {
  active: Tab;
  users: AccessUser[];
  roles: AccessRole[];
  loaded: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const admins = users.filter((u) => u.role === 'admin').length;
  // eslint-disable-next-line react-hooks/purity -- display-only "last 30 days" cut-off
  const since = Date.now() - 30 * DAY_MS;
  const active30 = users.filter((u) => u.last_login && new Date(u.last_login).getTime() >= since).length;
  const customRoles = roles.filter((r) => !r.is_system).length;
  const stats = [
    { label: 'Members', value: users.length, note: `${active30} active in 30 days` },
    { label: 'Full admins', value: admins, note: 'Every screen' },
    { label: 'Role-based', value: users.length - admins, note: 'Scoped by role' },
    { label: 'Roles', value: roles.length, note: `${customRoles} custom` },
  ];
  const tabs: { id: Tab; label: string; href: string; count: number }[] = [
    { id: 'users', label: 'Users', href: '/admin/users', count: users.length },
    { id: 'roles', label: 'Roles & permissions', href: '/admin/roles', count: roles.length },
  ];

  return (
    <div className="admin-page-stack access">
      <section className="access-hero" aria-label="Team and access">
        <div className="access-hero-top">
          <div className="access-hero-text">
            <span className="access-eyebrow">Team &amp; Access</span>
            <h2>{active === 'users' ? 'People with admin access' : 'Roles & permissions'}</h2>
            <p>
              {active === 'users'
                ? 'Invite teammates, choose what they can open, and remove access. Every change applies on their next click.'
                : 'A role is a set of screens. Assign roles on the Users tab; editing a role updates everyone who holds it.'}
            </p>
          </div>
          {actions ? <div className="access-hero-actions">{actions}</div> : null}
        </div>
        <dl className="access-stats">
          {stats.map((s) => (
            <div key={s.label} className="access-stat">
              <dt>{s.label}</dt>
              <dd>
                <strong>{loaded ? s.value : '–'}</strong>
                <span>{loaded ? s.note : ' '}</span>
              </dd>
            </div>
          ))}
        </dl>
        <nav className="access-tabs" aria-label="Team and access sections">
          {tabs.map((t) => (
            <AdminLink key={t.id} href={t.href} className={t.id === active ? 'is-active' : undefined} aria-current={t.id === active ? 'page' : undefined}>
              {t.label}
              <span className="access-tab-count">{loaded ? t.count : '·'}</span>
            </AdminLink>
          ))}
        </nav>
      </section>
      {children}
    </div>
  );
}
