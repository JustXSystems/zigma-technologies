'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Optional status text shown left of actions (e.g. “Unsaved changes”) */
  status?: ReactNode;
  className?: string;
};

/**
 * Sticky/fixed floating action cluster — docked bottom-right so Save / Publish
 * stay reachable on long forms (site settings, catalog, theme, etc.).
 */
export default function AdminFloatingActions({ children, status, className = '' }: Props) {
  return (
    <div className={`admin-floating-actions${className ? ` ${className}` : ''}`} role="region" aria-label="Page actions">
      {status ? <div className="admin-floating-actions-status">{status}</div> : null}
      <div className="admin-floating-actions-btns">{children}</div>
    </div>
  );
}
