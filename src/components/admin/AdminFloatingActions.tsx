'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Optional status text shown left of actions (e.g. “Unsaved changes”) */
  status?: ReactNode;
  className?: string;
};

/**
 * Sticky floating action cluster — stays visible at the top-right of the admin content area
 * so Save / Publish remain reachable on long forms.
 */
export default function AdminFloatingActions({ children, status, className = '' }: Props) {
  return (
    <div className={`admin-floating-actions${className ? ` ${className}` : ''}`} role="region" aria-label="Page actions">
      {status ? <div className="admin-floating-actions-status">{status}</div> : null}
      <div className="admin-floating-actions-btns">{children}</div>
    </div>
  );
}
