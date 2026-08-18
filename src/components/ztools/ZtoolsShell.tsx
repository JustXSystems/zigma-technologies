'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import ZtoolsPortalBrand from '@/components/ztools/ZtoolsPortalBrand';

type ZtoolsShellProps = {
  children: ReactNode;
  user?: { name: string; email: string } | null;
  showNav?: boolean;
};

export default function ZtoolsShell({ children, user, showNav = false }: ZtoolsShellProps) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/ztools/auth', { method: 'DELETE' });
    router.replace('/ztools/login');
  }

  return (
    <div className="ztools-portal">
      <header className="ztools-portal-header">
        <div className="container ztools-portal-header-inner">
          <ZtoolsPortalBrand homeHref="/" />
          <nav className="ztools-portal-nav" aria-label="ZTools account">
            {showNav && user ? (
              <>
                <span className="ztools-portal-user" title={user.email}>
                  {user.name}
                </span>
                <Link href="/ztools/dashboard">My tools</Link>
                <button type="button" className="ztools-portal-link-btn" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/ztools/login">Sign in</Link>
                <Link href="/ztools/register" className="ztools-portal-cta">Register</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="ztools-portal-main">{children}</main>
    </div>
  );
}
